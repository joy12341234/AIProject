@echo off
cd /d "%~dp0"
set PYTHONHOME=
set PYTHONPATH=
if not exist backend\venv\Scripts\python.exe (
  echo [X] Run setup.bat first.
  pause
  exit /b 1
)
backend\venv\Scripts\python.exe -c "import dotenv, openai, fastapi, uvicorn" >nul 2>nul
if errorlevel 1 (
  echo Installing missing packages into venv...
  backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
)
start "Backend (FastAPI :8000)" /D "%~dp0backend" cmd /k "venv\Scripts\python.exe -m uvicorn app.main:app --reload --reload-dir app --port 8000"
start "Frontend (Vite :5173)" /D "%~dp0frontend" cmd /k "npm run dev"
timeout /t 5 >nul
start "" http://localhost:5173
