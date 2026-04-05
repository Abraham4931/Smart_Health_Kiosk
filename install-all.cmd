@echo off
REM Run install-all.ps1 without changing PowerShell execution policy.
REM Double-click this file or run: install-all.cmd
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-all.ps1"
pause
