@echo off
cd /d "%~dp0"
echo ==================================================
echo  First upload to GitHub  (run only once)
echo ==================================================

where git >nul 2>nul
if errorlevel 1 goto :nogit
if exist .git goto :already

rem --- commit author: email must match your GitHub account to count as contributions ---
set "GNAME="
set "GMAIL="
for /f "delims=" %%a in ('git config --global user.name 2^>nul') do set "GNAME=%%a"
for /f "delims=" %%a in ('git config --global user.email 2^>nul') do set "GMAIL=%%a"
if not defined GNAME set /p "GNAME=GitHub username: "
if not defined GMAIL set /p "GMAIL=GitHub email (GitHub > Settings > Emails): "
git config --global user.name "%GNAME%"
git config --global user.email "%GMAIL%"
echo Commit author: %GNAME% / %GMAIL%

echo.
echo [1/4] Connecting this folder to GitHub...
git init -b main
git remote add origin https://github.com/joy12341234/AIProject.git
git pull origin main
if errorlevel 1 goto :pullfail

echo.
echo [2/4] Selecting files (.env, venv, node_modules are excluded)...
git add .
git diff --cached --name-only | findstr /r /i "\.env$" >nul
if not errorlevel 1 goto :envleak
git diff --cached --name-only

echo.
echo [3/4] Saving...
git commit -m "Add project code: AI plan, storyboard and image generation"
if errorlevel 1 goto :fail

echo.
echo [4/4] Uploading... (a GitHub login window may appear)
git push -u origin main
if errorlevel 1 goto :fail

echo.
echo Done! Check https://github.com/joy12341234/AIProject
pause
exit /b 0

:nogit
echo [X] Git not found. Install it from https://git-scm.com/download/win
echo     then close this window and run this file again.
pause
exit /b 1

:already
echo [!] This folder is already connected. Use github_save.bat instead.
pause
exit /b 0

:pullfail
echo [X] Could not download from GitHub. Check your internet and try again.
rmdir /s /q .git
pause
exit /b 1

:envleak
echo [X] .env (API key) was about to be uploaded. Stopped for safety.
git reset >nul
pause
exit /b 1

:fail
echo [X] Something went wrong. Take a screenshot of this window and send it.
pause
exit /b 1
