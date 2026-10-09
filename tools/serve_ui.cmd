@echo off
REM Supervisor for the intake UI. Intended as a Windows Scheduled Task entry point.
REM Serves the built ui\dist bundle through tools\serve_ui.py and restarts it if it exits.
REM The loop is deliberate: killing the python process must not take the UI down
REM until the next scheduled tick.
REM
REM Every path is resolved relative to this script, so the repo can live anywhere.
REM Optional environment variables:
REM   UI_PORT   port to serve on (default 8090)
REM   PYTHON    full path to python.exe, if python is not on PATH for the account
REM             the task runs as (common when running as SYSTEM)
setlocal
set "REPO=%~dp0.."
if not defined UI_PORT set "UI_PORT=8090"
if not defined PYTHON set "PYTHON=python"
if not exist "%REPO%\logs" mkdir "%REPO%\logs"
set "LOG=%REPO%\logs\serve_ui.log"

:loop
echo [%DATE% %TIME%] starting server on port %UI_PORT% >> "%LOG%"
"%PYTHON%" "%REPO%\tools\serve_ui.py" --port %UI_PORT% >> "%LOG%" 2>&1
echo [%DATE% %TIME%] server exited, restarting in 5s >> "%LOG%"
timeout /t 5 /nobreak > nul
goto loop
