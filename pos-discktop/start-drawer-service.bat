@echo off
title ASN Cash Drawer Service
echo.
echo  Starting ASN Cash Drawer Service...
echo  ====================================
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed!
    echo  Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Run the service
cd /d "%~dp0"
node cash-drawer-service.js %1

pause
