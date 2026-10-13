@echo off
chcp 65001 >nul
setlocal

rem Fix: never quote %~dp0 directly (trailing \ escapes the quote)
cd /d "%~dp0"
set "ROOT=%CD%"
set "NWAPP=%ROOT%\nwjs-dev"
set "PORT=5288"
set "URL=http://127.0.0.1:%PORT%"

rem Prefer NW_HOME, then edit DEFAULT_NW if needed
set "DEFAULT_NW=C:\nwjs\nw.exe"
set "NWEXE="
if defined NW_HOME (
  if exist "%NW_HOME%\nw.exe" set "NWEXE=%NW_HOME%\nw.exe"
)
if not defined NWEXE (
  if exist "%DEFAULT_NW%" set "NWEXE=%DEFAULT_NW%"
)
if not defined NWEXE (
  echo [ERROR] nw.exe not found.
  echo Set NW_HOME to your NW.js folder, or edit DEFAULT_NW in start-nw.bat
  echo Download: https://nwjs.io/downloads/
  pause
  exit /b 1
)

if not exist "%NWAPP%\package.json" (
  echo [ERROR] missing nwjs-dev\package.json
  pause
  exit /b 1
)

if not exist "%ROOT%\node_modules\" (
  echo [INFO] npm install ...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
  )
)

rem Detect if Vite already listening
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { (New-Object Net.Sockets.TcpClient('127.0.0.1',%PORT%)).Close(); exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo [INFO] starting Vite %URL%
  start "vite-mm-editor-vite" /D "%ROOT%" cmd /k "npm run dev"
) else (
  echo [INFO] Vite already up at %URL%
)

echo [INFO] waiting for %URL% ...
set /a TRIES=0
:WAIT
set /a TRIES+=1
if %TRIES% GTR 60 (
  echo [ERROR] timeout waiting for Vite
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto WAIT
)

echo [INFO] launching NW.js
start "" "%NWEXE%" "%NWAPP%"
echo [OK] done
endlocal
exit /b 0
