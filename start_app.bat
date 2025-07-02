@echo off
echo =======================================
echo    Creator GPT Application Launcher
echo =======================================
echo.

echo Checking if we're in the right directory...
if not exist "package.json" (
    echo Error: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

echo Installing dependencies...
echo.

echo Installing npm dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install npm dependencies!
    pause
    exit /b 1
)

echo Installing Python dependencies...
call pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install Python dependencies!
    pause
    exit /b 1
)

echo.
echo =======================================
echo    Starting Application Servers
echo =======================================
echo.
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.

echo Starting servers...
start /b "Backend Server" cmd /k "python run_api.py"
timeout /t 5 /nobreak >nul
start /b "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Press any key to exit this launcher...
pause >nul
