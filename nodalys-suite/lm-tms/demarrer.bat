@echo off
rem Lance LM-TMS (necessite que LM-WMS tourne pour la connexion).
cd /d "%~dp0"
start "" http://localhost:8748/
node server.js
