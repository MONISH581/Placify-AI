@echo off
title Placify ML Service
echo ============================================================
echo   Placify AI — ML Microservice Launcher
echo ============================================================
echo.

cd /d "%~dp0"

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.9+
    pause
    exit /b 1
)

REM Check if requirements are installed
python -c "import fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing requirements...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install requirements.
        pause
        exit /b 1
    )
)

REM Check if models are trained
if not exist "saved_models\placement_model.pkl" (
    echo [INFO] Models not found. Running training pipeline...
    echo [INFO] This may take a few minutes on first run...
    python models\train_all.py
    if %errorlevel% neq 0 (
        echo [WARN] Training had some issues, starting server anyway...
    )
)

echo.
echo [INFO] Starting Placify ML API server on http://localhost:8000
echo [INFO] Press Ctrl+C to stop.
echo.

python main.py

pause
