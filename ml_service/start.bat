@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Placify ML Service

rem ------------------------------------------------------------------------
rem  Placify ML microservice bootstrap
rem    start.bat                set up everything, then run the API
rem    start.bat --setup-only   create venv, install deps, train missing models; do not start the API
rem  Set PLACIFY_NO_PAUSE=1 to skip the pause after an error.
rem
rem  Steps: 1. find Python 3.10-3.12  2. create .venv if missing
rem         3. install requirements.txt when it changed (hash marker in .venv)
rem         4. train any missing/stale model  5. run main.py from the venv
rem ------------------------------------------------------------------------

cd /d "%~dp0"
set "VENV_DIR=%~dp0.venv"
set "VENV_PY=%~dp0.venv\Scripts\python.exe"
set "SETUP_ONLY="
if /i "%~1"=="--setup-only" set "SETUP_ONLY=1"

echo ============================================================
echo   Placify AI - ML Microservice
echo ============================================================

rem --- 1/2. Reuse a healthy venv, otherwise find Python and create one ------
if not exist "%VENV_PY%" goto :find_python
"%VENV_PY%" -c "import sys; sys.exit(0 if (3, 10) <= sys.version_info[:2] <= (3, 12) else 1)" >nul 2>&1
if not errorlevel 1 goto :deps
echo [WARN] The existing .venv is broken or uses an unsupported Python version - recreating it.
rmdir /s /q "%VENV_DIR%"

:find_python
set "PY_CMD="
call :try_python python
if not defined PY_CMD call :try_python py -3.12
if not defined PY_CMD call :try_python py -3.11
if not defined PY_CMD call :try_python py -3.10
if not defined PY_CMD (
    echo [ERROR] Python 3.10, 3.11 or 3.12 is required but was not found.
    echo         Install it from https://www.python.org/downloads/ ^(tick "Add python.exe to PATH"^).
    goto :fail
)
echo [INFO] Creating virtual environment in .venv using: %PY_CMD%
%PY_CMD% -m venv "%VENV_DIR%"
if errorlevel 1 (
    echo [ERROR] Could not create the virtual environment in "%VENV_DIR%".
    goto :fail
)

rem --- 3. Install dependencies only on first run or when requirements.txt changed ---
:deps
"%VENV_PY%" -c "import hashlib, pathlib, sys; h = hashlib.sha256(pathlib.Path('requirements.txt').read_bytes()).hexdigest(); m = pathlib.Path('.venv/.requirements.sha256'); sys.exit(0 if m.is_file() and m.read_text().strip() == h else 1)" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Python dependencies are up to date.
    goto :train
)
echo [INFO] Installing Python dependencies - the first run downloads several hundred MB ^(torch^) and can take a while ...
"%VENV_PY%" -m pip install --disable-pip-version-check --upgrade pip >nul 2>&1
"%VENV_PY%" -m pip install --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Dependency installation failed. Check your internet connection and run start.bat again.
    goto :fail
)
"%VENV_PY%" -c "import hashlib, pathlib; pathlib.Path('.venv/.requirements.sha256').write_text(hashlib.sha256(pathlib.Path('requirements.txt').read_bytes()).hexdigest())"

rem --- 4. Train whatever is missing or stale ---------------------------------
:train
echo [INFO] Checking trained models ^(placement, difficulty, recommender, RAG index^) ...
"%VENV_PY%" models\train_all.py --only-missing
if errorlevel 1 (
    echo [WARN] Some models could not be trained - the service will run in degraded mode.
    echo [WARN] If the problem bank is missing, run "npm run setup" in the project root ^& restart.
)

if defined SETUP_ONLY (
    echo [INFO] Setup finished ^(--setup-only^); not starting the API.
    exit /b 0
)

rem --- 5. Run the API ------------------------------------------------------------
echo [INFO] Starting the Placify ML API - press Ctrl+C to stop.
"%VENV_PY%" main.py
set "EXIT_CODE=%errorlevel%"
if not "%EXIT_CODE%"=="0" (
    echo [ERROR] The ML service exited with code %EXIT_CODE%.
    goto :fail
)
exit /b 0

rem --- helpers -------------------------------------------------------------------
:try_python
%* -c "import sys; sys.exit(0 if (3, 10) <= sys.version_info[:2] <= (3, 12) else 1)" >nul 2>&1
if not errorlevel 1 set "PY_CMD=%*"
exit /b 0

:fail
if not defined PLACIFY_NO_PAUSE pause
exit /b 1
