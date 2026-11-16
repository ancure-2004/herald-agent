#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
ENGINE_DIR="$ROOT_DIR/engines/dental-clinic-engine"

echo "=========================================================================="
echo " Starting Personal OS & CRM Stack (Backend: 8000 | UI: 3000 | Engine: 3001)"
echo "=========================================================================="

# 1. Clean up processes listening on 8000, 3000, 3001 before starting
kill_port() {
  local port="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k -n tcp "$port" >/dev/null 2>&1 || true
  elif command -v lsof >/dev/null 2>&1; then
    local pids
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}

echo "--> Checking and freeing ports 8000, 3000, 3001..."
kill_port 8000
kill_port 3000
kill_port 3001

# 2. Trap cleanup on exit
BACKEND_PID=""
FRONTEND_PID=""
ENGINE_PID=""

CLEANED_UP=0
cleanup() {
  if [ "$CLEANED_UP" -eq 1 ]; then
    return
  fi
  CLEANED_UP=1
  echo ""
  echo "--> Stopping Personal OS services..."
  if [ -n "$BACKEND_PID" ]; then kill -TERM "$BACKEND_PID" 2>/dev/null || true; fi
  if [ -n "$FRONTEND_PID" ]; then kill -TERM "$FRONTEND_PID" 2>/dev/null || true; fi
  if [ -n "$ENGINE_PID" ]; then kill -TERM "$ENGINE_PID" 2>/dev/null || true; fi
  
  sleep 1
  kill_port 8000
  kill_port 3000
  kill_port 3001
  echo "--> Personal OS services stopped."
}
trap cleanup EXIT INT TERM

# 3. Resolve Python & Virtualenv
PYTHON_BIN=""
UVICORN_BIN=""

# Check if .venv exists and is healthy
if [ -d "$BACKEND_DIR/.venv" ]; then
  if "$BACKEND_DIR/.venv/bin/python" --version >/dev/null 2>&1; then
    PYTHON_BIN="$BACKEND_DIR/.venv/bin/python"
    UVICORN_BIN="$BACKEND_DIR/.venv/bin/uvicorn"
  fi
fi

# Fallback: check fallback /tmp venv or system python
if [ -z "$PYTHON_BIN" ]; then
  if [ -x "/tmp/crm_backend_venv/bin/python" ]; then
    PYTHON_BIN="/tmp/crm_backend_venv/bin/python"
    UVICORN_BIN="/tmp/crm_backend_venv/bin/uvicorn"
  fi
fi

# Auto-create venv if neither is healthy
if [ -z "$PYTHON_BIN" ] || [ ! -x "$UVICORN_BIN" ]; then
  echo "--> Python venv missing or unhealthy. Setting up fresh backend venv..."
  if python3 -m venv "$BACKEND_DIR/.venv" 2>/dev/null; then
    PYTHON_BIN="$BACKEND_DIR/.venv/bin/python"
    UVICORN_BIN="$BACKEND_DIR/.venv/bin/uvicorn"
  else
    echo "--> Warning: Unable to create venv at $BACKEND_DIR/.venv (filesystem constraint). Creating at /tmp/crm_backend_venv..."
    python3 -m venv "/tmp/crm_backend_venv"
    PYTHON_BIN="/tmp/crm_backend_venv/bin/python"
    UVICORN_BIN="/tmp/crm_backend_venv/bin/uvicorn"
  fi

  echo "--> Installing backend dependencies..."
  "$PYTHON_BIN" -m pip install --quiet --upgrade pip
  "$PYTHON_BIN" -m pip install --quiet -r "$BACKEND_DIR/requirements.txt" pydantic-settings slowapi
fi

# Final sanity check for uvicorn
if [ ! -x "$UVICORN_BIN" ]; then
  echo "Error: uvicorn executable not found. Please ensure backend requirements are installed."
  exit 1
fi

echo "--> Using Python: $("$PYTHON_BIN" --version 2>&1) ($PYTHON_BIN)"

# 4. Start Backend
echo "--> Starting Backend on http://0.0.0.0:8000..."
(
  cd "$BACKEND_DIR"
  exec "$UVICORN_BIN" app.main:app --reload --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

# 5. Start Frontend
echo "--> Starting Frontend on http://localhost:3000..."
(
  cd "$FRONTEND_DIR"
  exec npm run dev
) &
FRONTEND_PID=$!

# 6. Start Engine (Optional Preview Engine on 3001)
if [ -d "$ENGINE_DIR" ] && [ -f "$ENGINE_DIR/package.json" ]; then
  echo "--> Starting Engine on http://localhost:3001..."
  (
    cd "$ENGINE_DIR"
    exec npm run dev -- -p 3001
  ) &
  ENGINE_PID=$!
else
  echo "--> Engine directory not found or unconfigured; skipping Engine (3001)."
fi

echo "=========================================================================="
echo " Personal OS Stack is running. Press Ctrl+C to terminate all services."
echo "=========================================================================="

wait
