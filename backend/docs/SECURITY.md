# Security Policy & Implementation - Personal OS & CRM

## Overview

The backend is hardened for secure production operation without relying on client-side trust or insecure defaults.

---

## 1. Credentials Flagged for Rotation

> [!WARNING]
> During codebase inspection, the following active external service credentials were found in the local environment file (`.env`):
> - **Neon Cloud PostgreSQL Connection String (`DATABASE_URL`)**: `ep-lively-waterfall-...neon.tech`
> - **Google Places API Key (`GOOGLE_PLACES_API_KEY`)**
> - **Brave Search API Key (`BRAVE_API_KEY`)**
> - **Serper Search API Key (`SERPER_API_KEY`)**
>
> **Action Required**: Even though `.env` is properly ignored by `.gitignore` and not checked into public Git, you should rotate these keys in their respective provider consoles before opening the CRM to multi-tenant or public deployment.

---

## 2. Hardened Security Controls

### Strict CORS Policy
Wildcard (`*`) origins are prohibited in production. `CORSMiddleware` validates incoming `Origin` headers against `CORS_ORIGINS` from the validated settings:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

### Host Header Protection
`TrustedHostMiddleware` guards against HTTP Host Header injection and DNS rebinding attacks using `ALLOWED_HOSTS`.

### Production Security Headers
`SecurityHeadersMiddleware` appends defensive headers to every HTTP response:
- `X-Content-Type-Options: nosniff`: Prevents MIME-type confusion attacks.
- `X-Frame-Options: DENY`: Prevents clickjacking by blocking iframe embedding.
- `X-XSS-Protection: 1; mode=block`: Enables legacy browser XSS filters.
- `Referrer-Policy: strict-origin-when-cross-origin`: Minimizes referrer leakage.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`: Restricts hardware APIs.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`: Enforced in production mode.
- Strips the `Server` header to prevent runtime version disclosure.

### Request Body Size Limiting
`RequestSizeLimitMiddleware` intercepts payloads exceeding `MAX_REQUEST_BODY_SIZE` (default 10MB) before they can allocate memory, mitigating Denial-of-Service (DoS) vectors.

### Rate Limiting
Configured via `slowapi` (`app/middleware/rate_limit.py`). IP-based rate limiting defaults to `120/minute` for read paths and `20/minute` for expensive automation or agent runs.

### Structured Logging with PII & Secret Redaction
`app/core/logging.py` implements regex filtering that scrubs API keys, bearer tokens, database passwords, and hex secrets from log output before streaming or writing to disk.

### Authentication Placeholder
`app/core/security.py` provides the standard `get_current_user` dependency placeholder for future JWT / OAuth2 integration without breaking route signatures.
