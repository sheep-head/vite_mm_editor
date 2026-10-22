@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

set "ROOT=%CD%"
set "NWAPP=%ROOT%\nwjs-dev"
set "PORT=5288"

if not defined NW_HOME set "NW_HOME=C:\nwjs"
set "NWEXE=%NW_HOME%\nw.exe"
if not exist "%NWEXE%" (
  echo [ERROR] nw.exe not found: %NWEXE%
  echo Set user env NW_HOME to your nwjs folder.
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
  call npm install || (pause & exit /b 1)
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try{$c=New-Object Net.Sockets.TcpClient;$c.Connect('127.0.0.1',%PORT%);$c.Close();exit 0}catch{exit 1}"
if errorlevel 1 (
  echo [INFO] start Vite hidden on :%PORT%
  powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\start-vite-hidden.ps1"
  if errorlevel 1 (
    echo [ERROR] failed to start Vite
    pause
    exit /b 1
  )
) else (
  echo [INFO] Vite already on :%PORT%
)

echo [INFO] wait for :%PORT% ...
set /a TRIES=0
:WAIT
set /a TRIES+=1
if %TRIES% GTR 60 goto TIMEOUT
ping -n 2 127.0.0.1 >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "try{$c=New-Object Net.Sockets.TcpClient;$c.Connect('127.0.0.1',%PORT%);$c.Close();exit 0}catch{exit 1}"
if errorlevel 1 goto WAIT

echo [INFO] Vite OK, start NW
pushd "%NWAPP%"
start "mm-editor-nw" "%NWEXE%" . test
popd
echo [OK]
exit /b 0

:TIMEOUT
echo [ERROR] Vite not listening on :%PORT% after 60s
echo Check vite-dev.log / vite-dev.err.log
if exist "%ROOT%\vite-dev.log" type "%ROOT%\vite-dev.log"
if exist "%ROOT%\vite-dev.err.log" type "%ROOT%\vite-dev.err.log"
pause
exit /b 1
