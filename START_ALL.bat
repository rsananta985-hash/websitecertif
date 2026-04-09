@echo off
title CertyChain - Starting All Services
color 0F
echo ============================================
echo   CertyChain - Full Stack Startup
echo ============================================
echo.
echo This will open 4 terminal windows:
echo   [1] Hardhat Blockchain Node (port 8545)
echo   [2] Python AI Service      (port 8001)
echo   [3] Go Backend Server      (port 8080)
echo   [4] React Frontend         (port 5173)
echo.
echo IMPORTANT: Run in this order:
echo   Step 1 - Wait for Hardhat node to start
echo   Step 2 - Run deploy_contract.bat ONCE if first time
echo   Step 3 - Update server/.env CONTRACT_ADDRESS
echo   Step 4 - Restart Go server if contract was updated
echo.
pause

echo Starting Hardhat Blockchain Node...
start "Blockchain Node" cmd /k "e:\web_certif\start_blockchain.bat"
timeout /t 3 /nobreak >nul

echo Starting AI Service...
start "AI Service" cmd /k "e:\web_certif\start_ai.bat"
timeout /t 2 /nobreak >nul

echo Starting Go Backend...
start "Backend Server" cmd /k "e:\web_certif\start_server.bat"
timeout /t 2 /nobreak >nul

echo Starting React Frontend...
start "Frontend" cmd /k "e:\web_certif\start_frontend.bat"

echo.
echo ============================================
echo   All services started!
echo.
echo   Frontend UI  : http://localhost:5173
echo   Backend API  : http://localhost:8080/api/health
echo   AI Service   : http://localhost:8001/health
echo   Blockchain   : http://localhost:8545
echo.
echo   Admin Login  : admin@certychain.id
echo   Admin Pass   : admin123
echo ============================================
echo.
pause
