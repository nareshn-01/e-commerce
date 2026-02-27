#!/bin/bash
# Admin Dashboard Quick Start Script
# Run this to start both frontend and backend servers

echo "🚀 Starting Admin Dashboard..."
echo ""

# Check if running on Windows (PowerShell)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    echo "📦 Starting Backend (FastAPI)..."
    cd backend
    .\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --host 0.0.0.0 &
    BACKEND_PID=$!
    
    cd ..
    echo "✅ Backend started on http://localhost:8000"
    echo ""
    
    echo "🎨 Starting Frontend (Next.js)..."
    pnpm dev &
    FRONTEND_PID=$!
    
    echo "✅ Frontend started on http://localhost:3000"
    echo ""
    
    echo "📊 Admin Dashboard: http://localhost:3000/admin"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    
    wait $BACKEND_PID $FRONTEND_PID
else
    echo "📦 Starting Backend (FastAPI)..."
    cd backend
    python -m uvicorn app.main:app --port 8000 --host 0.0.0.0 &
    BACKEND_PID=$!
    
    cd ..
    echo "✅ Backend started on http://localhost:8000"
    echo ""
    
    echo "🎨 Starting Frontend (Next.js)..."
    pnpm dev &
    FRONTEND_PID=$!
    
    echo "✅ Frontend started on http://localhost:3000"
    echo ""
    
    echo "📊 Admin Dashboard: http://localhost:3000/admin"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    
    wait $BACKEND_PID $FRONTEND_PID
fi
