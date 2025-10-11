@echo off
echo Starting CreatorGPT Development Environment...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo Installing Python dependencies...
pip install -r backend\requirements.txt

echo.
echo Installing Node.js dependencies...
npm install

echo.
echo Starting API server...
start "CreatorGPT API" cmd /k "python backend\api.py"

echo Waiting for API to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting frontend development server...
start "CreatorGPT Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo CreatorGPT is starting up!
echo ========================================
echo API: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to open the application in your browser...
pause >nul

start http://localhost:5173

echo.
echo Both servers are running. Close this window to stop them.
pause
