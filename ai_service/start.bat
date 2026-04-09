@echo off
echo ============================================
echo   CertyChain AI Service - Starting...
echo ============================================
cd /d %~dp0

IF NOT EXIST venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt -q

echo.
echo Starting AI Service on http://localhost:8001
echo Press Ctrl+C to stop.
echo.
python main.py
pause
