@echo off
echo ============================================
echo   Deploying YLZ Workshop to Vercel...
echo ============================================
echo.

cd /d "%~dp0"

REM Create the npm global folder if it doesn't exist
if not exist "%APPDATA%\npm" (
    echo Creating npm folder...
    mkdir "%APPDATA%\npm"
)

echo Running: npx vercel deploy --prod --yes
echo This may take a minute...
echo.
call npx vercel deploy --prod --yes

echo.
echo ============================================
echo   Done! Press any key to close.
echo ============================================
pause >nul
