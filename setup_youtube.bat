@echo off
cd /d "%~dp0"
echo ==================================================
echo   YouTube upload setup - Google OAuth Client ID
echo ==================================================
echo.
echo Paste the Client ID from Google Cloud.
echo It ends with .apps.googleusercontent.com
echo (Do NOT paste the Client secret.)
echo.
set "CID="
set /p CID=Client ID: 
if "%CID%"=="" (
  echo [X] Nothing was entered.
  pause
  exit /b 1
)
echo %CID%| findstr /r /c:"\.apps\.googleusercontent\.com" >nul
if errorlevel 1 (
  echo [X] This does not look like a Client ID.
  echo     It must end with .apps.googleusercontent.com
  pause
  exit /b 1
)
> frontend\.env echo VITE_GOOGLE_CLIENT_ID=%CID%
echo.
echo [OK] Saved to frontend\.env  (this file is NOT uploaded to GitHub)
echo.
echo Next: close the "Frontend (Vite :5173)" window, then run run.bat again.
pause
