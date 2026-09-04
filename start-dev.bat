@echo off
echo ======================================
echo  Starting KamiCode (Without Docker)   
echo ======================================

echo [1/3] Starting Convex Local DB...
start "KamiCode Convex DB" cmd /k "cd /d %~dp0frontend && npx convex dev"

timeout /t 3 /nobreak >nul

echo [2/3] Starting FastAPI Backend on http://localhost:8000...
start "KamiCode Backend" cmd /k "cd /d %~dp0backend && .\venv\Scripts\activate && uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Next.js Frontend on http://localhost:3000...
start "KamiCode Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo All services started in separate terminal windows!
echo - Frontend:    http://localhost:3000
echo - Backend API: http://localhost:8000 (Docs: http://localhost:8000/docs)
echo - Convex DB:   http://127.0.0.1:3210
pause
