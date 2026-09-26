@echo off
title ExamForge Launcher
echo ========================================================
echo           Starting ExamForge (All 3 Services)
echo ========================================================
echo.

echo [1/3] Starting Python Worker (FastAPI on Port 8000)...
start "ExamForge - Python Worker (Port 8000)" cmd /k "cd /d "%~dp0python-worker" && venv\Scripts\python.exe -m uvicorn App:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo [2/3] Starting Express Server (Node.js on Port 5000)...
start "ExamForge - Backend API (Port 5000)" cmd /k "cd /d "%~dp0server" && npm run dev"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Frontend (Vite React on Port 5173)...
start "ExamForge - Frontend (Port 5173)" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo ========================================================
echo All 3 services are launching in separate windows!
echo - Python Worker:  http://127.0.0.1:8000
echo - Backend API:    http://localhost:5000
echo - Frontend Web:   http://localhost:5173
echo ========================================================
echo You can close this window now.
pause
