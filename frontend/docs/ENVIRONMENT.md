# Environment Configuration

## Environment Variables

All frontend environment variables are managed and validated using Zod in `src/config/env.ts`. No other file in the codebase reads `process.env` directly.

| Variable | Type | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:8000` | Target FastAPI backend URL for API queries and Server-Sent Events |

## Setup Instructions

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Specify your backend instance:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```

3. Type Validation:
   The application validates environment variables at compile-time and run-time. Missing or malformed URLs will throw explicit error messages during build.
