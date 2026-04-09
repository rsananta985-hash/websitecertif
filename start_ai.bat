@echo off
title CertyChain - AI Service (Python FastAPI)
color 0D
echo ============================================
echo   CertyChain - AI Service (port 8001)
echo ============================================
echo.
cd /d "e:\web_certif\ai_service"

:: Check if pip packages are installed
python -c "import fastapi" 2>nul
if %errorlevel% neq 0 (
    echo Installing Python dependencies...
    pip install -r requirements.txt
    echo.
)

echo Starting AI Service on http://localhost:8001
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
