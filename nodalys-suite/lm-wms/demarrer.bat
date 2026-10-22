@echo off
rem Lance LM-WMS puis ouvre l'IHM superviseur dans le navigateur.
cd /d "%~dp0"
start "" http://localhost:8747/
node server.js
