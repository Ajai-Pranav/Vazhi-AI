#!/bin/bash
# start.sh — Start both backend and frontend in one command

set -e  # Exit immediately if any command fails

echo "🚀 Starting VazhiAI..."

# ── Backend setup ─────────────────────────────────────────────────────────────
echo ""
echo "[1/3] Setting up backend environment..."
cd backend

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    python -m venv venv
fi

echo "[2/3] Installing backend dependencies..."
venv/bin/python -m pip install -r requirements.txt -q

echo "[3/3] Running database migrations..."
venv/bin/python migrate.py upgrade

cd ..

# ── Start backend in background ───────────────────────────────────────────────
echo ""
echo "→ Starting FastAPI backend on :8000"
cd backend
venv/bin/uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Give backend a moment to start
sleep 2

# ── Start frontend ────────────────────────────────────────────────────────────
echo "→ Starting Next.js frontend on :3000"
cd frontend
npm install -q
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✓ VazhiAI is running!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait and clean up on Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
