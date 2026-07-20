@echo off
echo Starting VazhiAI...

echo.
echo [1/3] Setting up backend virtual environment...
cd backend
if not exist venv (
    python -m venv venv
)

echo [2/3] Installing backend dependencies...
venv\Scripts\python.exe -m pip install -r requirements.txt -q

echo [3/3] Running database migrations...
venv\Scripts\python.exe migrate.py upgrade
if %ERRORLEVEL% neq 0 (
    echo ERROR: Database migration failed. Please check your DATABASE_URL in .env
    pause
    exit /b 1
)
cd ..

echo.
echo Starting FastAPI backend on :8000
cd backend
start cmd /k "venv\Scripts\uvicorn.exe main:app --reload --port 8000"
cd ..

timeout /t 3 >nul

echo Starting Next.js frontend on :3000
cd frontend
start cmd /k "npm install && npm run dev"
cd ..

echo.
echo VazhiAI is starting up!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
pause
