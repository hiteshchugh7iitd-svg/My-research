@echo off
rem Sketch Town launcher for Windows. Double-click to start.
rem Extra options are passed to the server, e.g.:
rem   start_windows.bat --watch "C:\Users\me\Pictures\ScanSnap"
cd /d "%~dp0"
if not exist .venv (
  echo First run: creating Python environment...
  py -3 -m venv .venv 2>nul || python -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
python -m pip install --quiet pywin32 2>nul
python server\server.py %*
pause
