@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Placify-AI Launcher
cd /d "%~dp0"
set "PLACIFY_ROOT=%~dp0"

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

rem --- 5. Ports (PORT / ML_PORT from .env, defaults 3000 / 8000) must be free --
rem Nothing is ever stopped here: the user decides whether to close the other program or change the ports.
set "WEB_PORT=3000"
set "ML_PORT_NUM=8000"
if exist "%PLACIFY_ROOT%.env" (
    call :read_env PORT WEB_PORT
    call :read_env ML_PORT ML_PORT_NUM
)
set "PORT_BUSY="
call :check_port "%WEB_PORT%" PORT web
call :check_port "%ML_PORT_NUM%" ML_PORT ml
if defined PORT_BUSY goto :fail
echo [OK] Ports %WEB_PORT% ^(web^) and %ML_PORT_NUM% ^(ML service^) are free.

echo.
echo ============================================================
echo   Starting services:
echo     1. ML service ^(FastAPI^):  http://127.0.0.1:%ML_PORT_NUM%  ^(separate window^)
echo     2. Placify web ^& API:      http://127.0.0.1:%WEB_PORT%
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

:read_env
rem %1 = key in .env, %2 = variable that receives its value (unchanged when the key is missing or empty).
rem Quotes are removed and only the first word is used, so PORT="3100"  # comment also works.
set "ENV_RAW="
for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%PLACIFY_ROOT%.env") do if /i "%%A"=="%~1" set "ENV_RAW=%%B"
if not defined ENV_RAW exit /b 0
set "ENV_RAW=%ENV_RAW:"=%"
for /f "tokens=1" %%V in ("%ENV_RAW%") do set "%~2=%%V"
set "ENV_RAW="
exit /b 0

:check_port
rem %1 = port, %2 = .env key, %3 = web or ml. Sets PORT_BUSY when something already listens on the port.
set "CHECK_PORT=%~1"
echo %CHECK_PORT%| findstr /R /X "[0-9][0-9]*" >nul
if errorlevel 1 (
    echo [WARN] %~2=%CHECK_PORT% in .env is not a port number - skipping the port check.
    exit /b 0
)
set "PORT_PID="
rem Listening sockets have the foreign address 0.0.0.0:0 or [::]:0 (works on every Windows display language).
for /f "tokens=5" %%P in ('netstat -ano -p TCP ^| findstr /R /C:"^ *TCP  *[^ ]*:%CHECK_PORT%  *0\.0\.0\.0:0 "') do if not defined PORT_PID set "PORT_PID=%%P"
if not defined PORT_PID for /f "tokens=5" %%P in ('netstat -ano -p TCPv6 ^| findstr /R /C:"^ *TCP  *[^ ]*:%CHECK_PORT%  *\[::\]:0 "') do if not defined PORT_PID set "PORT_PID=%%P"
if not defined PORT_PID exit /b 0
set "PORT_PROC=an unknown program"
for /f "tokens=1,2 delims=," %%N in ('tasklist /FI "PID eq %PORT_PID%" /FO CSV /NH 2^>nul') do if "%%~O"=="%PORT_PID%" set "PORT_PROC=%%~N"
set "PORT_BUSY=1"
echo.
echo [ERROR] Port %CHECK_PORT% ^(%~2 in .env^) is already in use by %PORT_PROC% ^(PID %PORT_PID%^).
if /i "%~3"=="web" (
    echo         Choose a free port in .env: set PORT to it and update ALLOWED_ORIGINS to match,
    echo         e.g. PORT=3100 and ALLOWED_ORIGINS=http://localhost:3100
) else (
    echo         Choose a free port in .env: set ML_PORT to it and update ML_SERVICE_URL to match,
    echo         e.g. ML_PORT=8100 and ML_SERVICE_URL=http://127.0.0.1:8100
)
echo         Nothing was stopped. If it is an older Placify window, close that window and run start.bat again.
exit /b 0

:fail
echo.
if not defined PLACIFY_NO_PAUSE pause
exit /b 1
