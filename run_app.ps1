# CreatorGPT Application Startup Script
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "    Creator GPT Full Application    " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking dependencies..." -ForegroundColor Yellow
$setupResult = & python setup_dependencies.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "Dependency setup failed. Please check the error messages above." -ForegroundColor Red
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "Starting FastAPI Backend..." -ForegroundColor Yellow
Write-Host "Backend will be available at: http://localhost:8000" -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd /d `"$PSScriptRoot`" && python backend\run_api.py" -WindowStyle Normal

Write-Host ""
Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host "Starting Frontend Development Server..." -ForegroundColor Yellow
Write-Host "Frontend will be available at: http://localhost:8080" -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd /d `"$PSScriptRoot`" && npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "    Application Starting...        " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend UI: http://localhost:8080" -ForegroundColor Green
Write-Host ""
Write-Host "Both servers are starting in separate windows." -ForegroundColor Yellow
Write-Host "Press any key to exit this launcher..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
