@echo off
title FluencyForge - Plataforma de Ingles
cd /d "%~dp0"
echo Iniciando FluencyForge em http://localhost:3456 ...
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:3456"
node server.js
pause
