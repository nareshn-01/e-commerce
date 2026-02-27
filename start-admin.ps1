# Admin Dashboard Quick Start Script (PowerShell)
# Run this to start both frontend and backend servers

Write-Host "🚀 Starting Admin Dashboard..." -ForegroundColor Green
Write-Host ""

Write-Host "📦 Starting Backend (FastAPI)..." -ForegroundColor Cyan
cd backend
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --host 0.0.0.0 | Out-Host &
$backendPID = $PID

cd ..
Write-Host "✅ Backend started on http://localhost:8000" -ForegroundColor Green
Write-Host ""

Write-Host "🎨 Starting Frontend (Next.js)..." -ForegroundColor Cyan
pnpm dev | Out-Host &
$frontendPID = $PID

Write-Host "✅ Frontend started on http://localhost:3000" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Admin Dashboard: http://localhost:3000/admin" -ForegroundColor Yellow
Write-Host "🔌 Backend API: http://localhost:8000/api/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Magenta

# Keep the script running
Read-Host "Press Enter to continue monitoring..."
