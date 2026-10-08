@echo off
REM Supervisor for the Interview Prep UI service (Scheduled Task entry point).
REM Serves the built dist/ bundle on port 8090.
REM The loop is deliberate: killing the python process must not take the UI down
REM until the next scheduled tick.
:loop
echo [%DATE% %TIME%] starting server >> "C:\OpenSource\Job Readiness Voice AI\logs\serve_ui.log"
"C:\Users\Administrator\AppData\Local\Programs\Python\Python313\python.exe" "C:\OpenSource\Job Readiness Voice AI\tools\serve_ui.py" --port 8090 >> "C:\OpenSource\Job Readiness Voice AI\logs\serve_ui.log" 2>&1
echo [%DATE% %TIME%] server exited, restarting in 5s >> "C:\OpenSource\Job Readiness Voice AI\logs\serve_ui.log"
timeout /t 5 /nobreak > nul
goto loop
