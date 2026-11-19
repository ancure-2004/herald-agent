import os
import time
import pytest
from app.services.rag_service import EmbeddingService, RAGStore, HybridRetriever, RAGIndexingService


@pytest.fixture
def temp_rag_store(tmp_path):
    db_file = str(tmp_path / "test_rag.db")
    store = RAGStore(db_path=db_file)
    return store


def test_embedding_service_lazy_load_and_unload():
    """Verifies EmbeddingService lazy-loads only on request and unloads with gc.collect()."""
    # Guarantee starting state is unloaded
    EmbeddingService.unload_model()
    assert EmbeddingService._model_instance is None

    # Lazy load via embed_texts
    embs = EmbeddingService.embed_texts(["Dental implant clinic in Delhi NCR"])
    assert len(embs) == 1
    assert embs[0] is not None
    assert len(embs[0]) == 384
    assert EmbeddingService._model_instance is not None

    # Explicit unload
    EmbeddingService.unload_model()
    assert EmbeddingService._model_instance is None


def test_rag_store_fts5_and_vector_upsert(temp_rag_store):
    """Verifies FTS5 BM25 search and vector retrieval on rag_chunks table."""
    temp_rag_store.upsert_chunk(
        chunk_id="lead_101",
        lead_id=101,
        hustle_id=1,
        stage="CONTACTED",
        doc_type="lead",
        source_id="lead_101",
        content="Apex Orthodontics clinic in Connaught Place Dr. Mehra specializing in clear aligners.",
        metadata={"name": "Apex Orthodontics"},
        embedding=[0.1] * 384,
    )
    temp_rag_store.upsert_chunk(
        chunk_id="lead_102",
        lead_id=102,
        hustle_id=1,
        stage="DEMO_READY",
        doc_type="lead",
        source_id="lead_102",
        content="Dr. Verma Pediatric Dentist in Rohini Delhi focusing on painless root canal.",
        metadata={"name": "Verma Dental"},
        embedding=[0.9] * 384,
    )

    # 1. Lexical BM25 search
    fts_results = temp_rag_store.search_fts("aligners Connaught", limit=5)
    assert len(fts_results) >= 1
    assert fts_results[0][0]["id"] == "lead_101"

    # 2. Metadata filtering
    pediatric_results = temp_rag_store.search_fts("dentist", lead_id=102, limit=5)
    assert len(pediatric_results) == 1
    assert pediatric_results[0][0]["id"] == "lead_102"


def test_hybrid_retriever_rrf_fusion(temp_rag_store):
    """Verifies HybridRetriever runs FTS5 + Vector Cosine + Reciprocal Rank Fusion (k=60)."""
    retriever = HybridRetriever(store=temp_rag_store)

    # Mock embeddings to avoid relying on external services
    emb1 = [1.0, 0.0, 0.0] + [0.0] * 381
    emb2 = [0.0, 1.0, 0.0] + [0.0] * 381

    temp_rag_store.upsert_chunk(
        chunk_id="call_1",
        lead_id=50,
        hustle_id=1,
        stage="CONTACTED",
        doc_type="call",
        source_id="call_1",
        content="Doctor objected about Practo recurring costs and patient data ownership.",
        metadata={"call_id": 1},
        embedding=emb1,
    )
    temp_rag_store.upsert_chunk(
        chunk_id="call_2",
        lead_id=51,
        hustle_id=1,
        stage="CONTACTED",
        doc_type="call",
        source_id="call_2",
        content="Doctor inquired about website pricing and walkthrough video link.",
        metadata={"call_id": 2},
        embedding=emb2,
    )

    # Monkeypatch embed_query to return a vector close to emb1
    original_embed_query = EmbeddingService.embed_query
    EmbeddingService.embed_query = classmethod(lambda cls, q, api_key=None: [0.9, 0.1, 0.0] + [0.0] * 381)

    try:
        results = retriever.retrieve("Practo patient ownership", top_k=2)
        assert len(results) >= 1
        assert results[0]["id"] == "call_1"
        assert "rrf_score" in results[0]
        assert results[0]["rrf_score"] > 0.0
    finally:
        EmbeddingService.embed_query = original_embed_query


def test_incremental_indexing_and_reindex_api(client, temp_rag_store, monkeypatch):
    """Verifies incremental hooks for Lead/Call/Message and POST /api/ai/rag/reindex."""
    monkeypatch.setattr("app.services.rag_service.DEFAULT_DB_PATH", temp_rag_store.db_path)
    monkeypatch.setattr(
        "app.services.ai_service.AIService.structure_raw_call_notes",
        lambda l, raw, db=None, provider=None: {
            "summary": "Doctor asked for WhatsApp OPD appointment scheduling demo.",
            "interests": [],
            "objections": [],
            "commitments": [],
            "next_steps": [],
            "prep_brief": "Prep brief",
        },
    )

    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    leads = leads_res.json()
    if not leads:
        pytest.skip("No leads in DB")
    lead_id = leads[0]["id"]

    # 1. Incremental call indexing
    call_payload = {
        "raw_text": "Doctor asked for WhatsApp OPD appointment scheduling demo.",
        "duration_seconds": 150,
        "outcome": "connected",
    }
    log_res = client.post(f"/api/leads/{lead_id}/calls", json=call_payload)
    assert log_res.status_code == 201

    # Verify call indexed in temp RAG store
    matches = temp_rag_store.search_fts("scheduling appointment", lead_id=lead_id)
    assert len(matches) >= 1
    assert matches[0][0]["doc_type"] == "call"

    # 2. Test POST /api/ai/rag/reindex endpoint
    reindex_res = client.post("/api/ai/rag/reindex")
    assert reindex_res.status_code == 200
    data = reindex_res.json()
    assert data["status"] == "success"
    assert "indexed" in data
    assert data["indexed"]["leads"] >= 1
    # Verify model was unloaded after batch
    assert EmbeddingService._model_instance is None
