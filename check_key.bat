@echo off
cd /d "%~dp0backend"
set PYTHONHOME=
set PYTHONPATH=
if not exist venv\Scripts\python.exe (
  echo [X] Run setup.bat first.
  pause
  exit /b 1
)
rem install packages into the venv if missing
venv\Scripts\python.exe -c "import dotenv, openai, fastapi" >nul 2>nul
if errorlevel 1 (
  echo Installing missing packages into venv...
  venv\Scripts\python.exe -m pip install -r requirements.txt
)
venv\Scripts\python.exe check_key.py
pause
