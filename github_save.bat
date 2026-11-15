@echo off
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 goto :nogit
if not exist .git goto :norepo

rem test videos stay on this PC only (also removes them from GitHub if added before)
git rm -r --cached --quiet --ignore-unmatch sample_videos >nul 2>nul
git add .
git diff --cached --name-only | findstr /r /i "\.env$" >nul
if not errorlevel 1 goto :envleak

rem nothing new -> just push any saved commits
git diff --cached --quiet
if not errorlevel 1 goto :push

echo Changed files:
git --no-pager diff --cached --name-only
echo.
set "MSG="
set /p "MSG=What did you work on? (Enter = default message): "
if not defined MSG set "MSG=Update %date%"
git commit -m "%MSG%"
if errorlevel 1 goto :fail

:push
echo.
echo Uploading...
git push -u origin main
if errorlevel 1 goto :fail
echo.
echo Done! Saved to GitHub.
pause
exit /b 0

:nogit
echo [X] Git not found. Install it from https://git-scm.com/download/win
pause
exit /b 1

:norepo
echo [X] Run github_first_upload.bat first.
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
