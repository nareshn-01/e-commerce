# Test the outfit checker with backend running

Write-Host "`n============================================================"
Write-Host "AI OUTFIT CHECKER - COMPREHENSIVE TEST"
Write-Host "============================================================`n"

# Check if backend is running
Write-Host "Checking if backend is running on http://localhost:8000..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend is running!`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is not running!" -ForegroundColor Red
    Write-Host "Starting backend server...`n"
    
    # Start backend in background
    $backendPath = Join-Path $PSScriptRoot "backend"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python -m uvicorn app.main:app --reload --port 8000" -WindowStyle Normal
    
    Write-Host "Waiting for backend to start..."
    Start-Sleep -Seconds 5
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ Backend started successfully!`n" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start backend. Please start it manually.`n" -ForegroundColor Red
        exit 1
    }
}

# Run the test
Write-Host "Running API test..."
Write-Host "------------------------------------------------------------`n"
python test_outfit_api.py

Write-Host "`n============================================================"
