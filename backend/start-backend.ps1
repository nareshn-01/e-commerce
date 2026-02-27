# Start FastAPI backend (Windows PowerShell)
# Usage: Right-click Run, or run from repo root: pwsh ./backend/start-backend.ps1

Push-Location "$PSScriptRoot"
try {
    Write-Host "Starting FastAPI backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
    python -m uvicorn app.main:app --reload --port 8000
} finally {
    Pop-Location
}
