#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================================="
echo " Starting Personal OS & CRM Stack (Backend: 8000 | UI: 3000 | Engine: 3001)"
echo "=========================================================================="

cleanup() {
  echo ""
  echo "Stopping Personal OS services..."
  kill "$BACKEND_PID" "$FRONTEND_PID" "$ENGINE_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" "$ENGINE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$ROOT_DIR/backend"
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

cd "$ROOT_DIR/engines/dental-clinic-engine"
npm run dev -- -p 3001 &
ENGINE_PID=$!

wait
