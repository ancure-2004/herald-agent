# Security Hardening

## Security Standards & Defenses

### 1. HTTP Security Headers
Configured in `next.config.ts`:
- `X-Content-Type-Options: nosniff` - Prevents MIME-type sniffing.
- `X-Frame-Options: SAMEORIGIN` - Mitigates clickjacking.
- `Referrer-Policy: strict-origin-when-cross-origin` - Protects sensitive referrer paths.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` - Restricts browser device access.
- `poweredByHeader: false` - Removes `X-Powered-By: Next.js` fingerprint header.

### 2. Dependency Hygiene
- Next.js upgraded to `16.4.4` to remediate upstream App Router cache poisoning / SSRF vulnerabilities.
- `npm audit` verified with **0 vulnerabilities**.

### 3. Client-Side Input Sanitization
- Form inputs validate required fields prior to submission.
- API client handles timeouts and catches invalid backend responses before parsing JSON.
