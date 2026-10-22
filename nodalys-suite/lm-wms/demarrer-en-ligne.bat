@echo off
rem Lance LM-WMS + le tunnel public Cloudflare.
rem L'URL publique (https://....trycloudflare.com) s'affiche dans la
rem fenetre du tunnel ; elle change a chaque relance.
cd /d "%~dp0"
start "LM-WMS serveur" cmd /k "node server.js"
timeout /t 3 >nul
start "LM-WMS tunnel public" outils\cloudflared.exe tunnel --url http://localhost:8747
