@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Placify-AI Launcher
cd /d "%~dp0"

echo ============================================================
echo   PLACIFY-AI - Placement Preparation Platform
echo ============================================================
echo.

rem --- 1. Node.js 20+ ------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js 20+ is required but was not found in PATH.
    echo         Install it from https://nodejs.org/ and open a new terminal.
    goto :fail
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
    echo [ERROR] Node.js 20 or newer is required. Please upgrade from https://nodejs.org/
    goto :fail
)

rem --- 2. Python 3.10-3.12 (used by the ML service) -------------------------
set "PY_OK="
call :check_python python
if not defined PY_OK call :check_python py -3.12
if not defined PY_OK call :check_python py -3.11
if not defined PY_OK call :check_python py -3.10
if not defined PY_OK (
    echo [ERROR] Python 3.10, 3.11 or 3.12 is required for the ML service but was not found.
    echo         Install it from https://www.python.org/downloads/ ^(tick "Add python.exe to PATH"^).
    goto :fail
)
echo [OK] Node.js and Python runtimes detected.

rem --- 3. npm dependencies ---------------------------------------------------
if not exist "%~dp0node_modules\" (
    echo [INFO] Installing npm dependencies ^(first run^) ...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        goto :fail
    )
)

rem --- 4. .env, database schema and seed data --------------------------------
set "NEED_SETUP="
if not exist "%~dp0.env" set "NEED_SETUP=1"
if not exist "%~dp0prisma\dev.db" set "NEED_SETUP=1"
if defined NEED_SETUP (
    echo [INFO] Running first-time setup ^(.env, database schema, seed data^) ...
    call npm run setup
    if errorlevel 1 (
        echo [ERROR] npm run setup failed.
        goto :fail
    )
)

echo.
echo ============================================================
echo   Starting services:
echo     1. ML service ^(FastAPI^):  http://127.0.0.1:8000  ^(separate window^)
echo     2. Placify web ^& API:      http://127.0.0.1:3000
echo ============================================================
echo.

rem The ML window creates its own virtual environment, installs requirements and trains models on first run.
start "Placify ML" cmd /k call "%~dp0ml_service\start.bat"

call npm run dev
if errorlevel 1 goto :fail
exit /b 0

rem --- helpers ---------------------------------------------------------------
:check_python
%* -c "import sys; sys.exit(0 if (3, 10) <= sys.version_info[:2] <= (3, 12) else 1)" >nul 2>&1
if not errorlevel 1 set "PY_OK=1"
exit /b 0

:fail
echo.
if not defined PLACIFY_NO_PAUSE pause
exit /b 1
