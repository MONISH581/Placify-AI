@echo off
title Placify-AI Master Launcher
echo ============================================================
echo   🚀 PLACIFY-AI -- FULL-STACK RECRUITMENT PLATFORM
echo ============================================================
echo.

cd /d "%~dp0"

REM 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python 3.10+ is required but not found in PATH.
    echo Please install Python and ensure it is added to your PATH.
    pause
    exit /b 1
)

REM 2. Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js 18+ is required but not found in PATH.
    echo Please install Node.js and ensure it is added to your PATH.
    pause
    exit /b 1
)

echo [OK] Python and Node.js runtimes detected.
echo.

REM 3. Check ML model artifacts
if not exist "ml_service\saved_models\placement_model.pkl" (
    echo [INFO] Training ML models (first-time run)...
    python ml_service\models\train_all.py
)

REM 4. Check SQLite Database
if not exist "prisma\dev.db" (
    echo [INFO] Initializing SQLite database...
    call npx prisma db push
    call npx tsx migrate.ts
)

echo.
echo ============================================================
echo   Starting Services:
echo   1. FastAPI ML Engine:  http://localhost:8000
echo   2. Placify Web & API:   http://localhost:3000
echo ============================================================
echo.

REM Start FastAPI ML Service in a background command window
start "Placify ML Engine (Port 8000)" cmd /k "cd /d %~dp0ml_service && python main.py"

REM Start Express Full-Stack Server in current window
call npm run dev

pause
