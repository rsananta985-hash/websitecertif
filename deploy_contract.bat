@echo off
title CertyChain - Deploy Smart Contract
color 0B
echo ============================================
echo   CertyChain - Deploy Smart Contract
echo ============================================
echo.
echo Deploying CertificateRegistry to Hardhat localhost...
echo Make sure Hardhat node is running first (start_blockchain.bat)!
echo.
cd /d "e:\web_certif\blockchain"
npx hardhat run scripts/deploy.js --network localhost
echo.
echo ============================================
echo DONE! Update server/.env CONTRACT_ADDRESS
echo with the address shown above.
echo ============================================
pause
