import gc
import json
import logging
import math
import os
import sqlite3
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.config import get_settings

logger = logging.getLogger("personal_os.rag")

settings = get_settings()

DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "rag_index.db",
)


class EmbeddingService:
    """Lazy-loaded, idle-unloading Embedding Service.
    Guarantees that embedding models (ONNX/fastembed) are ONLY resident in RAM
    when actively needed, releasing memory via gc.collect() after a 60s TTL or
    explicitly upon batch completion.
    """

    _lock = threading.RLock()
    _model_instance = None
    _last_accessed_at: float = 0.0
    _timer: Optional[threading.Timer] = None
    IDLE_TTL_SECONDS: float = 60.0

    @classmethod
    def _schedule_unload(cls):
        with cls._lock:
            if cls._timer:
                cls._timer.cancel()
            cls._timer = threading.Timer(cls.IDLE_TTL_SECONDS, cls._auto_unload_check)
            cls._timer.daemon = True
            cls._timer.start()

    @classmethod
    def _auto_unload_check(cls):
        with cls._lock:
            if cls._model_instance is not None:
                elapsed = time.time() - cls._last_accessed_at
                if elapsed >= cls.IDLE_TTL_SECONDS:
                    cls.unload_model()
                else:
                    remaining = max(1.0, cls.IDLE_TTL_SECONDS - elapsed)
                    cls._timer = threading.Timer(remaining, cls._auto_unload_check)
                    cls._timer.daemon = True
                    cls._timer.start()

    @classmethod
    def get_fastembed_model(cls):
        with cls._lock:
            cls._last_accessed_at = time.time()
            if cls._model_instance is None:
                try:
                    from fastembed import TextEmbedding

                    cls._model_instance = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
                    logger.info("Lazy-loaded BAAI/bge-small-en-v1.5 fastembed model into memory.")
                except Exception as e:
                    logger.warning(f"Failed to load fastembed model: {e}")
                    return None
            cls._schedule_unload()
            return cls._model_instance

    @classmethod
    def unload_model(cls):
        with cls._lock:
            if cls._model_instance is not None:
                cls._model_instance = None
                gc.collect()
                logger.info("Unloaded embedding model from memory and ran gc.collect().")
            if cls._timer:
                cls._timer.cancel()
                cls._timer = None

    @classmethod
    def embed_texts(cls, texts: List[str], api_key: Optional[str] = None) -> List[Optional[List[float]]]:
        if not texts:
            return []

        # 1. Try fastembed
        try:
            model = cls.get_fastembed_model()
            if model is not None:
                embeddings_gen = model.embed(texts)
                return [list(map(float, emb)) for emb in embeddings_gen]
        except Exception as e:
            logger.warning(f"fastembed generation failed, falling back: {e}")

        # 2. Try Gemini text-embedding-004 fallback
        key = api_key or os.getenv("GEMINI_API_KEY", "").strip()
        if key:
            try:
                gemini_res = cls._embed_gemini(texts, key)
                if gemini_res:
                    return gemini_res
            except Exception as e:
                logger.warning(f"Gemini text-embedding-004 failed: {e}")

        # 3. Graceful fallback: return None for vector embeddings (FTS5 BM25 only)
        return [None for _ in texts]

    @classmethod
    def embed_query(cls, query: str, api_key: Optional[str] = None) -> Optional[List[float]]:
        results = cls.embed_texts([query], api_key=api_key)
        return results[0] if results else None

    @classmethod
    def _embed_gemini(cls, texts: List[str], api_key: str) -> Optional[List[List[float]]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key={api_key}"
        requests = [{"model": "models/text-embedding-004", "content": {"parts": [{"text": t}]}} for t in texts]
        payload = {"requests": requests}
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                embeddings = []
                for item in data.get("embeddings", []):
                    embeddings.append(item.get("values", []))
                if len(embeddings) == len(texts):
                    return embeddings
        return None


class RAGStore:
    """Manages SQLite FTS5 table and rag_chunks metadata table."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or DEFAULT_DB_PATH
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS rag_chunks (
                    id TEXT PRIMARY KEY,
                    lead_id INTEGER,
                    hustle_id INTEGER,
                    stage TEXT,
                    doc_type TEXT,
                    source_id TEXT,
                    content TEXT NOT NULL,
                    metadata_json TEXT DEFAULT '{}',
                    embedding_json TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS ix_rag_lead_id ON rag_chunks (lead_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS ix_rag_doc_type ON rag_chunks (doc_type)")
            conn.execute("CREATE INDEX IF NOT EXISTS ix_rag_source_id ON rag_chunks (source_id)")

            # FTS5 Virtual Table
            conn.execute(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS rag_chunks_fts USING fts5(
                    chunk_id UNINDEXED,
                    content,
                    tokenize='porter unicode61'
                )
                """
            )
            conn.commit()

    def upsert_chunk(
        self,
        chunk_id: str,
        lead_id: Optional[int],
        hustle_id: Optional[int],
        stage: Optional[str],
        doc_type: str,
        source_id: str,
        content: str,
        metadata: Dict[str, Any],
        embedding: Optional[List[float]] = None,
    ):
        emb_json = json.dumps(embedding) if embedding else None
        meta_json = json.dumps(metadata) if metadata else "{}"

        with self._get_connection() as conn:
            # 1. Upsert metadata table
            conn.execute(
                """
                INSERT INTO rag_chunks (id, lead_id, hustle_id, stage, doc_type, source_id, content, metadata_json, embedding_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    lead_id=excluded.lead_id,
                    hustle_id=excluded.hustle_id,
                    stage=excluded.stage,
                    doc_type=excluded.doc_type,
                    source_id=excluded.source_id,
                    content=excluded.content,
                    metadata_json=excluded.metadata_json,
                    embedding_json=excluded.embedding_json,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (chunk_id, lead_id, hustle_id, stage, doc_type, source_id, content, meta_json, emb_json),
            )

            # 2. Update FTS5 table
            conn.execute("DELETE FROM rag_chunks_fts WHERE chunk_id = ?", (chunk_id,))
            conn.execute("INSERT INTO rag_chunks_fts (chunk_id, content) VALUES (?, ?)", (chunk_id, content))
            conn.commit()

    def delete_chunks_by_source(self, source_id: str):
        with self._get_connection() as conn:
            rows = conn.execute("SELECT id FROM rag_chunks WHERE source_id = ?", (source_id,)).fetchall()
            for r in rows:
                c_id = r["id"]
                conn.execute("DELETE FROM rag_chunks_fts WHERE chunk_id = ?", (c_id,))
            conn.execute("DELETE FROM rag_chunks WHERE source_id = ?", (source_id,))
            conn.commit()

    def delete_chunks_by_lead(self, lead_id: int):
        with self._get_connection() as conn:
            rows = conn.execute("SELECT id FROM rag_chunks WHERE lead_id = ?", (lead_id,)).fetchall()
            for r in rows:
                c_id = r["id"]
                conn.execute("DELETE FROM rag_chunks_fts WHERE chunk_id = ?", (c_id,))
            conn.execute("DELETE FROM rag_chunks WHERE lead_id = ?", (lead_id,))
            conn.commit()

    def search_fts(
        self,
        query: str,
        lead_id: Optional[int] = None,
        doc_type: Optional[str] = None,
        limit: int = 20,
    ) -> List[Tuple[Dict[str, Any], float]]:
        """Searches using SQLite FTS5 BM25 ranking."""
        clean_terms = [t.strip().replace('"', "") for t in query.split() if t.strip()]
        if not clean_terms:
            return []

        fts_query = " OR ".join(f'"{term}"*' for term in clean_terms)

        sql = """
            SELECT r.id, r.lead_id, r.hustle_id, r.stage, r.doc_type, r.source_id, r.content, r.metadata_json,
                   bm25(rag_chunks_fts) as rank
            FROM rag_chunks_fts f
            JOIN rag_chunks r ON f.chunk_id = r.id
            WHERE rag_chunks_fts MATCH ?
        """
        params: List[Any] = [fts_query]

        if lead_id is not None:
            sql += " AND r.lead_id = ?"
            params.append(lead_id)
        if doc_type is not None:
            sql += " AND r.doc_type = ?"
            params.append(doc_type)

        sql += " ORDER BY rank ASC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            try:
                rows = conn.execute(sql, params).fetchall()
                results = []
                for row in rows:
                    item = dict(row)
                    score = float(item.pop("rank", 0.0))
                    item["metadata"] = json.loads(item.get("metadata_json") or "{}")
                    results.append((item, score))
                return results
            except sqlite3.OperationalError as e:
                logger.warning(f"FTS5 query failed: {e}")
                return []

    def get_all_chunks_with_embeddings(
        self,
        lead_id: Optional[int] = None,
        doc_type: Optional[str] = None,
    ) -> List[Tuple[Dict[str, Any], List[float]]]:
        sql = "SELECT id, lead_id, hustle_id, stage, doc_type, source_id, content, metadata_json, embedding_json FROM rag_chunks WHERE embedding_json IS NOT NULL"
        params: List[Any] = []
        if lead_id is not None:
            sql += " AND lead_id = ?"
            params.append(lead_id)
        if doc_type is not None:
            sql += " AND doc_type = ?"
            params.append(doc_type)

        with self._get_connection() as conn:
            rows = conn.execute(sql, params).fetchall()
            results = []
            for r in rows:
                item = dict(r)
                emb_raw = item.pop("embedding_json", None)
                if emb_raw:
                    emb = json.loads(emb_raw)
                    item["metadata"] = json.loads(item.get("metadata_json") or "{}")
                    results.append((item, emb))
            return results


class HybridRetriever:
    """Combines SQLite FTS5 (BM25) and Vector Cosine Similarity via Reciprocal Rank Fusion (RRF, k=60)."""

    def __init__(self, store: Optional[RAGStore] = None):
        self.store = store or RAGStore()

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 <= 0.0 or norm2 <= 0.0:
            return 0.0
        return dot / (norm1 * norm2)

    def retrieve(
        self,
        query: str,
        lead_id: Optional[int] = None,
        doc_type: Optional[str] = None,
        top_k: int = 5,
        k_rrf: int = 60,
    ) -> List[Dict[str, Any]]:
        # 1. Lexical Retrieval (BM25 via FTS5)
        fts_matches = self.store.search_fts(query, lead_id=lead_id, doc_type=doc_type, limit=30)

        # 2. Vector Retrieval (Cosine Similarity)
        query_embedding = EmbeddingService.embed_query(query)
        vector_matches: List[Tuple[Dict[str, Any], float]] = []

        if query_embedding is not None:
            chunk_vectors = self.store.get_all_chunks_with_embeddings(lead_id=lead_id, doc_type=doc_type)
            for item, emb in chunk_vectors:
                sim = self.cosine_similarity(query_embedding, emb)
                vector_matches.append((item, sim))
            vector_matches.sort(key=lambda x: x[1], reverse=True)
            vector_matches = vector_matches[:30]

        # 3. Reciprocal Rank Fusion (RRF, k=60)
        rrf_scores: Dict[str, float] = {}
        item_map: Dict[str, Dict[str, Any]] = {}

        # BM25 ranks
        for rank, (item, _) in enumerate(fts_matches, start=1):
            c_id = item["id"]
            item_map[c_id] = item
            rrf_scores[c_id] = rrf_scores.get(c_id, 0.0) + (1.0 / (k_rrf + rank))

        # Vector ranks
        for rank, (item, _) in enumerate(vector_matches, start=1):
            c_id = item["id"]
            item_map[c_id] = item
            rrf_scores[c_id] = rrf_scores.get(c_id, 0.0) + (1.0 / (k_rrf + rank))

        sorted_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)

        final_results = []
        for cid in sorted_ids[:top_k]:
            doc = item_map[cid]
            doc["rrf_score"] = rrf_scores[cid]
            final_results.append(doc)

        return final_results


class RAGIndexingService:
    """Incremental indexing hooks and full database reindexing/backfill service."""

    @classmethod
    def index_lead(cls, lead: Any, store: Optional[RAGStore] = None):
        s = store or RAGStore()
        lead_id = getattr(lead, "id", None) or (lead.get("id") if isinstance(lead, dict) else 0)
        hustle_id = getattr(lead, "hustle_id", None) or (lead.get("hustle_id") if isinstance(lead, dict) else 1)
        name = getattr(lead, "name", "") or (lead.get("name") if isinstance(lead, dict) else "")
        doctor_name = getattr(lead, "doctor_name", "") or (lead.get("doctor_name") if isinstance(lead, dict) else "")
        locality = getattr(lead, "locality", "") or (lead.get("locality") if isinstance(lead, dict) else "")
        city = getattr(lead, "city", "") or (lead.get("city") if isinstance(lead, dict) else "")
        phone = getattr(lead, "primary_phone", "") or (lead.get("primary_phone") if isinstance(lead, dict) else "")
        stage = getattr(lead, "status", "") or (lead.get("status") if isinstance(lead, dict) else "STAGED")

        content = (
            f"Lead Profile: {name} located in {locality}, {city}.\n"
            f"Doctor / Contact: {doctor_name}. Phone: {phone}.\n"
            f"Current Pipeline Stage / Status: {stage}."
        )

        chunk_id = f"lead_{lead_id}"
        emb = EmbeddingService.embed_query(content)
        s.upsert_chunk(
            chunk_id=chunk_id,
            lead_id=lead_id,
            hustle_id=hustle_id,
            stage=stage,
            doc_type="lead",
            source_id=f"lead_{lead_id}",
            content=content,
            metadata={"name": name, "doctor_name": doctor_name, "locality": locality, "phone": phone},
            embedding=emb,
        )

    @classmethod
    def index_call(cls, call: Any, lead: Optional[Any] = None, store: Optional[RAGStore] = None):
        s = store or RAGStore()
        call_id = getattr(call, "id", None) or (call.get("id") if isinstance(call, dict) else 0)
        lead_id = getattr(call, "lead_id", None) or (call.get("lead_id") if isinstance(call, dict) else 0)
        hustle_id = getattr(lead, "hustle_id", 1) if lead else 1
        stage = getattr(lead, "status", "") if lead else ""
        summary = getattr(call, "summary", "") or (call.get("summary") if isinstance(call, dict) else "")
        outcome = getattr(call, "outcome", "") or (call.get("outcome") if isinstance(call, dict) else "")
        prep_brief = getattr(call, "prep_brief", "") or (call.get("prep_brief") if isinstance(call, dict) else "")
        raw_text = getattr(call, "raw_text", "") or (call.get("raw_text") if isinstance(call, dict) else "")

        content = (
            f"Call Record #{call_id} for Lead {lead_id} (Outcome: {outcome}).\n"
            f"Summary: {summary}\n"
            f"Next Prep Brief: {prep_brief}\n"
            f"Raw Transcript Excerpt: {raw_text[:500]}"
        )

        chunk_id = f"call_{call_id}"
        emb = EmbeddingService.embed_query(content)
        s.upsert_chunk(
            chunk_id=chunk_id,
            lead_id=lead_id,
            hustle_id=hustle_id,
            stage=stage,
            doc_type="call",
            source_id=f"call_{call_id}",
            content=content,
            metadata={"call_id": call_id, "outcome": outcome, "summary": summary},
            embedding=emb,
        )

    @classmethod
    def index_message(cls, message: Any, lead: Optional[Any] = None, store: Optional[RAGStore] = None):
        s = store or RAGStore()
        msg_id = getattr(message, "id", None) or (message.get("id") if isinstance(message, dict) else 0)
        lead_id = getattr(message, "lead_id", None) or (message.get("lead_id") if isinstance(message, dict) else 0)
        hustle_id = getattr(lead, "hustle_id", 1) if lead else 1
        stage = getattr(lead, "status", "") if lead else ""
        direction = getattr(message, "direction", "") or (message.get("direction") if isinstance(message, dict) else "")
        text = getattr(message, "text", "") or (message.get("text") if isinstance(message, dict) else "")

        content = f"Message #{msg_id} ({direction}) for Lead {lead_id}:\n{text}"

        chunk_id = f"msg_{msg_id}"
        emb = EmbeddingService.embed_query(content)
        s.upsert_chunk(
            chunk_id=chunk_id,
            lead_id=lead_id,
            hustle_id=hustle_id,
            stage=stage,
            doc_type="message",
            source_id=f"msg_{msg_id}",
            content=content,
            metadata={"msg_id": msg_id, "direction": direction},
            embedding=emb,
        )

    @classmethod
    def reindex_all(cls, db: Any, store: Optional[RAGStore] = None) -> Dict[str, int]:
        """Backfills and indexes all Leads, Calls, and Messages from CRM DB.
        Immediately unloads the embedding model when completed to preserve RAM.
        """
        from app.models.entities import Call, Lead, Message

        s = store or RAGStore()
        counts = {"leads": 0, "calls": 0, "messages": 0}

        try:
            leads = db.query(Lead).all()
            for l in leads:
                cls.index_lead(l, store=s)
                counts["leads"] += 1

            calls = db.query(Call).all()
            for c in calls:
                l = db.query(Lead).filter(Lead.id == c.lead_id).first()
                cls.index_call(c, lead=l, store=s)
                counts["calls"] += 1

            messages = db.query(Message).all()
            for m in messages:
                l = db.query(Lead).filter(Lead.id == m.lead_id).first()
                cls.index_message(m, lead=l, store=s)
                counts["messages"] += 1
        finally:
            # Guarantee memory unload immediately after batch processing
            EmbeddingService.unload_model()

        return counts
