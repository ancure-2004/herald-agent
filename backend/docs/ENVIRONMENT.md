# Environment Configuration Guide - Personal OS & CRM

## Overview

Configuration is managed via `pydantic-settings` in `app/core/config.py`. At startup, variables are validated with strict typing.

---

## Environment Variables Reference

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PROJECT_NAME` | `str` | `"Personal OS & CRM"` | Application name displayed in docs and logs |
| `ENVIRONMENT` | `str` | `"development"` | Options: `development`, `staging`, `production` |
| `DEBUG` | `bool` | `true` | Enables detailed debug logs and exception traces |
| `HOST` | `str` | `"0.0.0.0"` | Network interface to bind |
| `PORT` | `int` | `8000` | Port for the backend API |
| `API_V1_STR` | `str` | `"/api/v1"` | URL prefix for version 1 API |
| `SECRET_KEY` | `str` | `"dev-insecure-secret..."` | Secret key for cryptographic signing |
| `CORS_ORIGINS` | `list[str]` | `["http://localhost:3000", ...]` | Strict origin whitelist for browser requests |
| `ALLOWED_HOSTS` | `list[str]` | `["localhost", "127.0.0.1", ...]` | Host header allowlist for TrustedHostMiddleware |
| `MAX_REQUEST_BODY_SIZE`| `int` | `10485760` (10MB) | Maximum allowed payload size |
| `RATE_LIMIT_DEFAULT` | `str` | `"120/minute"` | Default rate limit per client IP |
| `RATE_LIMIT_EXPENSIVE`| `str` | `"20/minute"` | Stricter rate limit for write/agent runs |
| `DATABASE_URL` | `str` | `sqlite:///personal_os.db` | SQLAlchemy connection string |
| `DIRECT_URL` | `str` | `None` | Direct connection string for serverless pooled DB |
| `DEMO_ENGINE_BASE_URL` | `str` | `"http://localhost:3001"` | Base URL of the Dental Clinic Engine |
| `DEFAULT_DEAL_VALUE_INR`| `int` | `15000` | Default estimated value per deal |
| `GOOGLE_PLACES_API_KEY`| `str` | `None` | Google Places API key for lead discovery |
| `BRAVE_API_KEY` | `str` | `None` | Brave Search API key for website checks |
| `SERPER_API_KEY` | `str` | `None` | Serper API key for search fallback |
| `GEMINI_API_KEY` | `str` | `None` | Gemini API key for copilot & research |
| `GROQ_API_KEY` | `str` | `None` | Groq API key for fast inference |
| `TELEGRAM_BOT_TOKEN` | `str` | `None` | Telegram bot token for real-time mobile alerts |
| `TELEGRAM_CHAT_ID` | `str` | `None` | Telegram user/chat ID for alert dispatch |

---

## Production Setup Guidelines

1. **Set `ENVIRONMENT=production`**:
   - Automatically disables `/docs`, `/redoc`, and `/openapi.json`.
   - Activates `Strict-Transport-Security` (HSTS) headers.
2. **Generate a unique `SECRET_KEY`**:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
3. **Restrict `CORS_ORIGINS`**:
   Set `CORS_ORIGINS=https://crm.yourdomain.com,https://engine.yourdomain.com` without wildcards.
4. **Configure Production PostgreSQL**:
   Use `DATABASE_URL=postgresql+psycopg2://user:password@host:port/dbname?sslmode=require`.
