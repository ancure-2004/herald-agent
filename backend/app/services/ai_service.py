import json
import logging
import os
import shutil
import subprocess
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.exceptions import AINotConfiguredError, AIProviderError
from app.models.entities import AppSetting

logger = logging.getLogger("personal_os.ai_service")

# Default models
GEMINI_DEFAULT_MODEL = "gemini-2.5-flash"
GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile"
LOCAL_CLI_DEFAULT_MODEL = "gemini-3.8-flash-low"


class LLMProvider(ABC):
    """Abstract base class for all LLM providers in PersonalOS & CRM."""

    @abstractmethod
    def generate_json(
        self,
        prompt: str,
        json_schema: Optional[Dict[str, Any]] = None,
        timeout_seconds: float = 30.0,
    ) -> Any:
        """Generates structured JSON data conforming to optional json_schema."""
        pass

    @abstractmethod
    def test_connection(self) -> Dict[str, Any]:
        """Runs a lightweight test query to verify provider availability and credentials."""
        pass


class LocalCLIProvider(LLMProvider):
    """Personal mode provider executing the authenticated `agy` CLI bridge with isolated HOME and cwd=/tmp."""

    def __init__(self, model: str = LOCAL_CLI_DEFAULT_MODEL):
        self.model = model

    @classmethod
    def is_available(cls) -> bool:
        return shutil.which("agy") is not None

    def _get_isolated_env(self) -> Dict[str, str]:
        env = os.environ.copy()
        sandbox_home = os.path.expanduser("~/.personalos-agy-sandbox")
        os.makedirs(sandbox_home, exist_ok=True)
        env["HOME"] = sandbox_home
        return env

    def generate_json(
        self,
        prompt: str,
        json_schema: Optional[Dict[str, Any]] = None,
        timeout_seconds: float = 45.0,
    ) -> Any:
        if not self.is_available():
            raise AINotConfiguredError(
                "Local CLI 'agy' is not available in PATH.",
                details={"provider": "local_cli"},
            )

        cmd = [
            "agy",
            "--model",
            self.model,
            "--effort",
            "low",
            "--disable-slash-commands",
            "--dangerously-skip-permissions",
            "--output-format",
            "json",
        ]
        if json_schema:
            cmd.extend(["--json-schema", json.dumps(json_schema)])
        cmd.append(f"--print={prompt}")

        env = self._get_isolated_env()

        try:
            res = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd="/tmp",
                env=env,
                timeout=timeout_seconds,
                check=False,
            )
        except subprocess.TimeoutExpired as e:
            raise AIProviderError(
                f"Local CLI 'agy' timed out after {timeout_seconds}s.",
                details={"provider": "local_cli", "timeout": timeout_seconds},
            ) from e
        except Exception as e:
            raise AIProviderError(
                f"Failed to invoke local CLI 'agy': {e}",
                details={"provider": "local_cli", "error": str(e)},
            ) from e

        if res.returncode != 0:
            err_msg = res.stderr.decode("utf-8", errors="replace").strip()
            raise AIProviderError(
                f"Local CLI 'agy' failed with exit code {res.returncode}: {err_msg}",
                details={"provider": "local_cli", "stderr": err_msg, "code": res.returncode},
            )

        stdout_text = res.stdout.decode("utf-8", errors="replace").strip()
        try:
            envelope = json.loads(stdout_text)
        except Exception as e:
            raise AIProviderError(
                f"Failed to parse outer JSON envelope from agy: {e}",
                details={"provider": "local_cli", "raw": stdout_text[:500]},
            ) from e

        if envelope.get("status") != "SUCCESS":
            raise AIProviderError(
                f"agy returned unsuccessful status: {envelope.get('status')}",
                details={"provider": "local_cli", "envelope": envelope},
            )

        # If --json-schema was passed, agy places the validated output in structured_output
        if "structured_output" in envelope and envelope["structured_output"] is not None:
            return envelope["structured_output"]

        # Otherwise parse from response field
        resp_text = envelope.get("response", "").strip()
        if "```json" in resp_text:
            resp_text = resp_text.split("```json")[1].split("```")[0].strip()
        elif "```" in resp_text:
            resp_text = resp_text.split("```")[1].split("```")[0].strip()

        try:
            return json.loads(resp_text)
        except Exception as e:
            raise AIProviderError(
                f"Failed to parse inner response JSON from agy: {e}",
                details={"provider": "local_cli", "response": resp_text[:500]},
            ) from e

    def test_connection(self) -> Dict[str, Any]:
        """Fast 0-token connection test checking CLI availability and running `agy --version`."""
        if not self.is_available():
            raise AINotConfiguredError("Local CLI 'agy' not found in PATH.", details={"provider": "local_cli"})

        env = self._get_isolated_env()
        try:
            res = subprocess.run(
                ["agy", "--version"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd="/tmp",
                env=env,
                timeout=5.0,
                check=False,
            )
            version_str = res.stdout.decode("utf-8", errors="replace").strip()
            if res.returncode != 0:
                err_msg = res.stderr.decode("utf-8", errors="replace").strip()
                raise AIProviderError(
                    f"agy check failed with exit code {res.returncode}: {err_msg}",
                    details={"provider": "local_cli", "stderr": err_msg},
                )
        except subprocess.TimeoutExpired as e:
            raise AIProviderError("agy --version check timed out.", details={"provider": "local_cli"}) from e
        except Exception as e:
            raise AIProviderError(f"Failed to run agy --version: {e}", details={"provider": "local_cli"}) from e

        return {
            "ok": True,
            "provider": "local_cli",
            "model": self.model,
            "message": f"Connected to local agy CLI bridge (v{version_str}).",
            "sample_response": {"version": version_str, "status": "ok"},
        }


class GeminiProvider(LLMProvider):
    """Google Gemini BYOK provider via direct REST API."""

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self, api_key: str, model: str = GEMINI_DEFAULT_MODEL):
        self.api_key = api_key.strip()
        self.model = model.strip() or GEMINI_DEFAULT_MODEL

    def generate_json(
        self,
        prompt: str,
        json_schema: Optional[Dict[str, Any]] = None,
        timeout_seconds: float = 30.0,
    ) -> Any:
        if not self.api_key:
            raise AINotConfiguredError(
                "Gemini API key is not configured.",
                details={"provider": "gemini"},
            )

        url = f"{self.BASE_URL}/{self.model}:generateContent?key={self.api_key}"
        gen_config: Dict[str, Any] = {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        }
        if json_schema:
            gen_config["responseSchema"] = json_schema

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": gen_config,
        }

        try:
            with httpx.Client(timeout=timeout_seconds) as client:
                resp = client.post(url, json=payload)
                if resp.status_code != 200:
                    err_body = resp.text
                    raise AIProviderError(
                        f"Gemini API error (status {resp.status_code}): {err_body}",
                        details={"provider": "gemini", "status_code": resp.status_code, "body": err_body[:500]},
                    )
                data = resp.json()
                candidates = data.get("candidates") or []
                if not candidates:
                    raise AIProviderError(
                        "Gemini returned empty candidates.",
                        details={"provider": "gemini", "response": data},
                    )
                parts = candidates[0].get("content", {}).get("parts") or []
                if not parts:
                    raise AIProviderError(
                        "Gemini returned no parts in response.",
                        details={"provider": "gemini", "response": data},
                    )
                text = parts[0].get("text", "").strip()
                return json.loads(text)
        except (AINotConfiguredError, AIProviderError):
            raise
        except json.JSONDecodeError as e:
            raise AIProviderError(
                f"Failed to parse Gemini response as JSON: {e}",
                details={"provider": "gemini"},
            ) from e
        except Exception as e:
            raise AIProviderError(
                f"Gemini API request failed: {e}",
                details={"provider": "gemini", "error": str(e)},
            ) from e

    def test_connection(self) -> Dict[str, Any]:
        if not self.api_key:
            raise AINotConfiguredError("Gemini API key is missing.", details={"provider": "gemini"})
        test_schema = {
            "type": "object",
            "properties": {"status": {"type": "string"}},
            "required": ["status"],
        }
        res = self.generate_json("Respond with JSON status ok", json_schema=test_schema, timeout_seconds=15.0)
        return {
            "ok": True,
            "provider": "gemini",
            "model": self.model,
            "message": "Successfully connected to Gemini API.",
            "sample_response": res,
        }


class GroqProvider(LLMProvider):
    """Groq BYOK provider via OpenAI-compatible REST API."""

    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, api_key: str, model: str = GROQ_DEFAULT_MODEL):
        self.api_key = api_key.strip()
        self.model = model.strip() or GROQ_DEFAULT_MODEL

    def generate_json(
        self,
        prompt: str,
        json_schema: Optional[Dict[str, Any]] = None,
        timeout_seconds: float = 30.0,
    ) -> Any:
        if not self.api_key:
            raise AINotConfiguredError(
                "Groq API key is not configured.",
                details={"provider": "groq"},
            )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        system_content = "You are an AI assistant that only outputs valid JSON."
        if json_schema:
            system_content += f" Output must strictly match this JSON schema: {json.dumps(json_schema)}"

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        try:
            with httpx.Client(timeout=timeout_seconds) as client:
                resp = client.post(self.BASE_URL, headers=headers, json=payload)
                if resp.status_code != 200:
                    err_body = resp.text
                    raise AIProviderError(
                        f"Groq API error (status {resp.status_code}): {err_body}",
                        details={"provider": "groq", "status_code": resp.status_code, "body": err_body[:500]},
                    )
                data = resp.json()
                choices = data.get("choices") or []
                if not choices:
                    raise AIProviderError("Groq returned empty choices.", details={"provider": "groq"})
                content = choices[0].get("message", {}).get("content", "").strip()
                return json.loads(content)
        except (AINotConfiguredError, AIProviderError):
            raise
        except json.JSONDecodeError as e:
            raise AIProviderError(
                f"Failed to parse Groq response as JSON: {e}",
                details={"provider": "groq"},
            ) from e
        except Exception as e:
            raise AIProviderError(
                f"Groq API request failed: {e}",
                details={"provider": "groq", "error": str(e)},
            ) from e

    def test_connection(self) -> Dict[str, Any]:
        if not self.api_key:
            raise AINotConfiguredError("Groq API key is missing.", details={"provider": "groq"})
        test_schema = {
            "type": "object",
            "properties": {"status": {"type": "string"}},
            "required": ["status"],
        }
        res = self.generate_json("Respond with JSON status ok", json_schema=test_schema, timeout_seconds=15.0)
        return {
            "ok": True,
            "provider": "groq",
            "model": self.model,
            "message": "Successfully connected to Groq API.",
            "sample_response": res,
        }


# ---------------------------------------------------------------------------
# High-Level AIService
# ---------------------------------------------------------------------------

class AIService:
    """Unified AI Service supporting local_cli, gemini, groq, and auto routing.

    Zero silent hardcoded fallbacks: when no provider is configured or an
    error occurs, structured exceptions (AINotConfiguredError, AIProviderError)
    are raised.
    """

    @classmethod
    def get_provider(cls, db: Optional[Any] = None, force_provider: Optional[str] = None) -> LLMProvider:
        """Resolves the active LLMProvider based on DB app_settings and environment variables."""
        settings_dict = cls.get_ai_settings(db)
        provider_mode = (force_provider or settings_dict.get("provider", "auto")).lower().strip()

        gemini_key = settings_dict.get("gemini_api_key") or os.getenv("GEMINI_API_KEY", "").strip()
        groq_key = settings_dict.get("groq_api_key") or os.getenv("GROQ_API_KEY", "").strip()

        if provider_mode == "local_cli":
            if not LocalCLIProvider.is_available():
                raise AINotConfiguredError(
                    "Local CLI 'agy' is not available in PATH.",
                    details={"provider": "local_cli"},
                )
            return LocalCLIProvider()

        elif provider_mode == "gemini":
            if not gemini_key:
                raise AINotConfiguredError(
                    "Gemini API key is not configured.",
                    details={"provider": "gemini"},
                )
            return GeminiProvider(api_key=gemini_key)

        elif provider_mode == "groq":
            if not groq_key:
                raise AINotConfiguredError(
                    "Groq API key is not configured.",
                    details={"provider": "groq"},
                )
            return GroqProvider(api_key=groq_key)

        elif provider_mode == "auto":
            # 1. Prefer Gemini BYOK if key exists
            if gemini_key:
                return GeminiProvider(api_key=gemini_key)
            # 2. Prefer Groq BYOK if key exists
            if groq_key:
                return GroqProvider(api_key=groq_key)
            # 3. Prefer Local CLI if agy exists
            if LocalCLIProvider.is_available():
                return LocalCLIProvider()
            # 4. Nothing configured
            raise AINotConfiguredError(
                "No AI provider or API key configured. Please configure an AI provider in Settings.",
                details={"provider": "auto"},
            )

        raise AINotConfiguredError(
            f"Unknown AI provider mode '{provider_mode}'.",
            details={"provider": provider_mode},
        )

    @classmethod
    def get_ai_settings(cls, db: Optional[Any] = None) -> Dict[str, Any]:
        """Loads AI settings from the app_settings table with env var defaults."""
        data: Dict[str, Any] = {
            "provider": "auto",
            "gemini_api_key": "",
            "groq_api_key": "",
        }
        if db is not None:
            try:
                rows = db.query(AppSetting).filter(AppSetting.key.like("ai.%")).all()
                for r in rows:
                    field = r.key[len("ai."):]
                    data[field] = r.value
            except Exception as e:
                logger.warning(f"Failed to query app_settings for ai.*: {e}")

        # Env var fallbacks for unconfigured keys
        if not data["gemini_api_key"]:
            data["gemini_api_key"] = os.getenv("GEMINI_API_KEY", "").strip()
        if not data["groq_api_key"]:
            data["groq_api_key"] = os.getenv("GROQ_API_KEY", "").strip()

        return data

    @classmethod
    def save_ai_settings(cls, db: Any, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Saves AI provider settings to app_settings table."""
        for field in ("provider", "gemini_api_key", "groq_api_key"):
            if field in updates and updates[field] is not None:
                val = str(updates[field]).strip()
                # If masked key was sent back, don't overwrite
                if "api_key" in field and val.startswith("••••") or val == "********":
                    continue
                key = f"ai.{field}"
                row = db.query(AppSetting).filter(AppSetting.key == key).first()
                if row:
                    row.value = val
                else:
                    db.add(AppSetting(key=key, value=val))
        db.commit()
        return cls.get_masked_ai_settings(db)

    @classmethod
    def mask_key(cls, key: str) -> str:
        if not key:
            return ""
        if len(key) <= 8:
            return "••••••••"
        return f"{key[:4]}••••••••{key[-4:]}"

    @classmethod
    def get_masked_ai_settings(cls, db: Optional[Any] = None) -> Dict[str, Any]:
        raw = cls.get_ai_settings(db)
        return {
            "provider": raw.get("provider", "auto"),
            "gemini_api_key": cls.mask_key(raw.get("gemini_api_key", "")),
            "groq_api_key": cls.mask_key(raw.get("groq_api_key", "")),
            "has_gemini_key": bool(raw.get("gemini_api_key")),
            "has_groq_key": bool(raw.get("groq_api_key")),
            "has_local_cli": LocalCLIProvider.is_available(),
        }

    @classmethod
    def test_connection(
        cls,
        db: Optional[Any] = None,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Runs test connection for a specific provider or current active settings."""
        settings_dict = cls.get_ai_settings(db)
        target_provider = (provider or settings_dict.get("provider", "auto")).lower().strip()

        if target_provider == "local_cli":
            p = LocalCLIProvider()
            return p.test_connection()

        elif target_provider == "gemini":
            key = api_key or settings_dict.get("gemini_api_key") or os.getenv("GEMINI_API_KEY", "").strip()
            if not key or key.startswith("••••"):
                key = settings_dict.get("gemini_api_key") or os.getenv("GEMINI_API_KEY", "").strip()
            p = GeminiProvider(api_key=key)
            return p.test_connection()

        elif target_provider == "groq":
            key = api_key or settings_dict.get("groq_api_key") or os.getenv("GROQ_API_KEY", "").strip()
            if not key or key.startswith("••••"):
                key = settings_dict.get("groq_api_key") or os.getenv("GROQ_API_KEY", "").strip()
            p = GroqProvider(api_key=key)
            return p.test_connection()

        elif target_provider == "auto":
            active_p = cls.get_provider(db)
            return active_p.test_connection()

        raise AINotConfiguredError(f"Unsupported provider: {target_provider}")

    # -----------------------------------------------------------------------
    # Application AI Features (Zero Fallbacks)
    # -----------------------------------------------------------------------

    @classmethod
    def generate_reply_suggestions(
        cls,
        lead: Any,
        messages: List[Any],
        db: Optional[Any] = None,
        provider: Optional[LLMProvider] = None,
    ) -> List[Dict[str, str]]:
        """Analyzes recent chronological message thread history and the last inbound reply to generate
        exactly 3 distinct reply options:
          1. Direct Answer
          2. Value Reframe
          3. Quick OPD Check-in

        Raises AINotConfiguredError or AIProviderError if AI is unavailable.
        """
        doctor_name = getattr(lead, "doctor_name", "") or (lead.get("doctor_name") if isinstance(lead, dict) else "")
        doctor_clean = doctor_name.replace("Dr.", "").strip() if doctor_name else "Doctor"
        clinic_name = getattr(lead, "name", "") or (lead.get("name") if isinstance(lead, dict) else "your clinic")
        locality = getattr(lead, "locality", "") or (lead.get("locality") if isinstance(lead, dict) else "Delhi NCR")

        # Sort messages chronologically by created_at
        def get_msg_time(m: Any) -> str:
            val = getattr(m, "created_at", None) or (m.get("created_at") if isinstance(m, dict) else None)
            return str(val or "")

        sorted_messages = sorted(messages or [], key=get_msg_time)
        recent_thread = sorted_messages[-20:]

        thread_lines = []
        last_inbound_text = ""
        for m in recent_thread:
            direction = getattr(m, "direction", None) or (m.get("direction") if isinstance(m, dict) else "")
            text = getattr(m, "text", None) or (m.get("text") if isinstance(m, dict) else "")
            role = "Lead/Doctor" if direction == "inbound" else "Firstmate/Outreach"
            t_str = get_msg_time(m)
            thread_lines.append(f"[{t_str}] {role}: {text}")
            if direction == "inbound":
                last_inbound_text = text

        thread_history_block = "\n".join(thread_lines) if thread_lines else "No previous messages."

        prompt = (
            f"You are Firstmate AI copilot for dental clinic outreach in Delhi NCR.\n"
            f"Lead Profile: {clinic_name} in {locality}. Doctor: Dr. {doctor_clean}.\n"
            f"Recent Conversation Thread (Chronological):\n{thread_history_block}\n\n"
            f"Latest Inbound Reply From Doctor: '{last_inbound_text}'\n\n"
            "Generate JSON with an object having key 'suggestions' containing exactly 3 suggestions with keys 'category', 'text', 'tone':\n"
            "1. 'Direct Answer' (professional, answers their question directly)\n"
            "2. 'Value Reframe' (consultative, patient trust, direct WhatsApp booking vs Practo)\n"
            "3. 'Quick OPD Check-in' (polite_brief, acknowledges OPD hours, offers quick 2-min video)\n"
            "Output JSON object with 'suggestions' key."
        )

        schema = {
            "type": "object",
            "properties": {
                "suggestions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "category": {"type": "string"},
                            "text": {"type": "string"},
                            "tone": {"type": "string"},
                        },
                        "required": ["category", "text", "tone"],
                    },
                }
            },
            "required": ["suggestions"],
        }

        active_provider = provider or cls.get_provider(db)
        result = active_provider.generate_json(prompt, json_schema=schema)

        # Standardize return format
        if isinstance(result, dict) and "suggestions" in result:
            result = result["suggestions"]
        elif isinstance(result, dict) and "reply" in result and isinstance(result["reply"], list):
            result = result["reply"]

        if isinstance(result, list) and len(result) >= 3:
            return [
                {
                    "category": str(item.get("category", "Direct Answer")),
                    "text": str(item.get("text", "")).strip(),
                    "tone": str(item.get("tone", "professional")).strip(),
                }
                for item in result[:3]
            ]

        raise AIProviderError(
            "AI provider returned an invalid reply suggestions format.",
            details={"raw_output": str(result)[:300]},
        )

    @classmethod
    def structure_raw_call_notes(
        cls,
        lead: Any,
        raw_text: str,
        db: Optional[Any] = None,
        provider: Optional[LLMProvider] = None,
    ) -> Dict[str, Any]:
        """Structures raw call transcript into 5 sections + prep brief.

        Raises AINotConfiguredError or AIProviderError if AI is unavailable.
        """
        doctor_name = getattr(lead, "doctor_name", "") or (lead.get("doctor_name") if isinstance(lead, dict) else "")
        doctor_clean = doctor_name.replace("Dr.", "").strip() if doctor_name else "Doctor"
        clinic_name = getattr(lead, "name", "") or (lead.get("name") if isinstance(lead, dict) else "clinic")
        locality = getattr(lead, "locality", "") or (lead.get("locality") if isinstance(lead, dict) else "Delhi NCR")

        prompt = (
            f"You are Firstmate AI structuring a phone call with Dr. {doctor_clean} of {clinic_name} in {locality}.\n"
            f"Raw Transcript:\n'''\n{raw_text[:2000]}\n'''\n\n"
            "Return a JSON object with exactly these keys:\n"
            "1. 'summary': string (2-3 sentences summary of the call)\n"
            "2. 'interests': array of strings (features or topics doctor was interested in)\n"
            "3. 'objections': array of strings (concerns or hesitation raised)\n"
            "4. 'commitments': array of objects { 'who_owes_it': 'us'|'them', 'what': string, 'due_phrase': string }\n"
            "5. 'next_steps': array of strings (clear concrete action items)\n"
            "6. 'prep_brief': string (brief bullet points for next touchpoint)\n"
            "Output JSON object only."
        )

        schema = {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "interests": {"type": "array", "items": {"type": "string"}},
                "objections": {"type": "array", "items": {"type": "string"}},
                "commitments": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "who_owes_it": {"type": "string"},
                            "what": {"type": "string"},
                            "due_phrase": {"type": "string"},
                        },
                        "required": ["who_owes_it", "what", "due_phrase"],
                    },
                },
                "next_steps": {"type": "array", "items": {"type": "string"}},
                "prep_brief": {"type": "string"},
            },
            "required": ["summary", "interests", "objections", "commitments", "next_steps", "prep_brief"],
        }

        active_provider = provider or cls.get_provider(db)
        parsed = active_provider.generate_json(prompt, json_schema=schema)

        if (
            isinstance(parsed, dict)
            and "summary" in parsed
            and "interests" in parsed
            and "objections" in parsed
            and "commitments" in parsed
            and "next_steps" in parsed
        ):
            return {
                "summary": str(parsed.get("summary", "")).strip(),
                "interests": list(parsed.get("interests", [])),
                "objections": list(parsed.get("objections", [])),
                "commitments": list(parsed.get("commitments", [])),
                "next_steps": list(parsed.get("next_steps", [])),
                "prep_brief": str(parsed.get("prep_brief", "")).strip(),
            }

        raise AIProviderError(
            "AI provider returned an invalid call structuring format.",
            details={"raw_output": str(parsed)[:300]},
        )

    @classmethod
    def generate_call_prep_brief(
        cls,
        lead: Any,
        calls: List[Any],
        messages: List[Any],
        db: Optional[Any] = None,
        provider: Optional[LLMProvider] = None,
    ) -> Dict[str, Any]:
        """Combines past call history and recent thread history into a concise 'what to talk about' brief
        for lead follow-up. If no past calls exist, generates a tailored first-time discovery call script.

        Raises AINotConfiguredError or AIProviderError if AI is unavailable.
        """
        lead_id = getattr(lead, "id", None) or (lead.get("id") if isinstance(lead, dict) else 0)
        doctor_name = getattr(lead, "doctor_name", "") or (lead.get("doctor_name") if isinstance(lead, dict) else "")
        doctor_clean = doctor_name.replace("Dr.", "").strip() if doctor_name else "Doctor"
        clinic_name = getattr(lead, "name", "") or (lead.get("name") if isinstance(lead, dict) else "clinic")
        locality = getattr(lead, "locality", "") or (lead.get("locality") if isinstance(lead, dict) else "Delhi NCR")

        # Sort calls chronologically by created_at
        def get_item_time(item: Any) -> str:
            val = getattr(item, "created_at", None) or (item.get("created_at") if isinstance(item, dict) else None)
            return str(val or "")

        sorted_calls = sorted(calls or [], key=get_item_time)

        past_commitments = []
        key_objections = []
        chronological_call_summaries = []

        for idx, c in enumerate(sorted_calls, start=1):
            c_date = get_item_time(c)
            c_brief = getattr(c, "prep_brief", "") or (c.get("prep_brief") if isinstance(c, dict) else "")
            c_summary = getattr(c, "summary", "") or (c.get("summary") if isinstance(c, dict) else "")
            c_outcome = getattr(c, "outcome", "") or (c.get("outcome") if isinstance(c, dict) else "")
            entry_text = f"Call #{idx} ({c_date}, outcome: {c_outcome}): {c_summary or c_brief}"
            chronological_call_summaries.append(entry_text)

            c_comms = getattr(c, "commitments", []) or (c.get("commitments") if isinstance(c, dict) else [])
            if isinstance(c_comms, list):
                past_commitments.extend(c_comms)
            c_objs = getattr(c, "objections", []) or (c.get("objections") if isinstance(c, dict) else [])
            if isinstance(c_objs, list):
                key_objections.extend(c_objs)

        # De-duplicate objections
        key_objections = list(dict.fromkeys(key_objections))

        if sorted_calls:
            prompt = (
                f"You are Firstmate AI generating an ongoing pre-call follow-up brief for Dr. {doctor_clean} of {clinic_name} in {locality}.\n"
                f"Past Calls History (Chronological):\n{chr(10).join(chronological_call_summaries)}\n\n"
                f"Known Doctor Objections Across Calls: {json.dumps(key_objections)}\n"
                f"Past Commitments Across Calls: {json.dumps(past_commitments)}\n\n"
                "Return JSON object with exactly these keys:\n"
                "1. 'prep_brief': string (clear bullet points outlining prior call continuity, key objections to address, commitments owed, and concrete talking points for what to discuss next)\n"
                "2. 'past_commitments': array of commitments\n"
                "3. 'key_objections': array of string objections\n"
                "Output JSON object only."
            )
        else:
            prompt = (
                f"You are Firstmate AI generating a tailored first-time discovery call script for Dr. {doctor_clean} of {clinic_name} in {locality}.\n"
                "There are no prior phone calls logged with this clinic yet.\n\n"
                "Return JSON object with exactly these keys:\n"
                "1. 'prep_brief': string (structured first-time discovery call script: 1) Warm doctor-centric opener acknowledging OPD hours, 2) Hook on patient acquisition & direct WhatsApp OPD booking vs Practo cuts, 3) 2-minute demo offer of the 3 custom clinic sites already built, 4) Closing question to confirm mutual fit)\n"
                "2. 'past_commitments': empty array []\n"
                "3. 'key_objections': array of likely first-call objections to anticipate (e.g. ['Already on Practo', 'Busy in OPD', 'Has an existing website'])\n"
                "Output JSON object only."
            )

        schema = {
            "type": "object",
            "properties": {
                "prep_brief": {"type": "string"},
                "past_commitments": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "who_owes_it": {"type": "string"},
                            "what": {"type": "string"},
                            "due_phrase": {"type": "string"},
                        },
                    },
                },
                "key_objections": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["prep_brief", "past_commitments", "key_objections"],
        }

        active_provider = provider or cls.get_provider(db)
        parsed = active_provider.generate_json(prompt, json_schema=schema)

        if isinstance(parsed, dict) and "prep_brief" in parsed:
            return {
                "lead_id": lead_id,
                "clinic_name": clinic_name,
                "doctor_name": doctor_name,
                "prep_brief": str(parsed.get("prep_brief", "")).strip(),
                "past_commitments": list(parsed.get("past_commitments", past_commitments)),
                "key_objections": list(parsed.get("key_objections", key_objections)),
            }

        raise AIProviderError(
            "AI provider returned an invalid call prep brief format.",
            details={"raw_output": str(parsed)[:300]},
        )
