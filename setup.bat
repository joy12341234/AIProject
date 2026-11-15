@echo off
cd /d "%~dp0"
set PYTHONHOME=
set PYTHONPATH=
echo ==================================================
echo  AI Video Director - first-time setup
echo ==================================================

where python >nul 2>nul
if errorlevel 1 (
  echo [X] Python not found. Install Python 3.10+ and check "Add python.exe to PATH".
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js not found. Install Node.js LTS from https://nodejs.org
  pause
  exit /b 1
)

echo.
echo [1/3] Backend: creating venv and installing packages...
cd /d "%~dp0backend"
if not exist venv\Scripts\python.exe python -m venv venv
if not exist venv\Scripts\python.exe (
  echo [X] Failed to create venv. Check your Python installation.
  pause
  exit /b 1
)
rem always use the venv python directly
venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
  echo [X] pip install failed.
  pause
  exit /b 1
)
if not exist .env copy .env.example .env >nul

echo.
echo [2/3] Frontend: installing packages...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 (
  echo [X] npm install failed.
  pause
  exit /b 1
)

echo.
echo [3/3] Done!
echo   Next 1: open backend\.env with Notepad, paste your API key, save.
echo   Next 2: double-click check_key.bat
pause
