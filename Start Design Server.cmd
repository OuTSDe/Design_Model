@echo off
setlocal
title Accord Design Engine SERVER (keep this window open)
rem  Makes THIS laptop the Design Engine server for the team: Codex runs here, the data stays in this Drive folder,
rem  and the other laptops open the Team address shown below (same Wi-Fi / office network) with the access key.
rem  Use this INSTEAD of Start Design Engine.cmd on the server laptop.

set "DM=%~dp0"
set "DM=%DM:~0,-1%"
set "LOCAL=%LOCALAPPDATA%\AccordDesignEngine"

where node >nul 2>nul || (echo Node.js is not installed. Install the LTS version from https://nodejs.org and run this again. & pause & exit /b 1)
where codex >nul 2>nul || echo WARNING: Codex CLI not found on this laptop. Install it: npm i -g @openai/codex, then: codex login

echo Copying the latest code to "%LOCAL%" ...
robocopy "%DM%\app" "%LOCAL%" /MIR /XD node_modules dist /NFL /NDL /NJH /NJS /NP >nul
if %ERRORLEVEL% GEQ 8 (echo Could not copy the app folder. & pause & exit /b 1)

rem keep the laptop awake while plugged in, so Codex jobs and the team are not cut off
powercfg /change standby-timeout-ac 0 >nul 2>nul && echo Sleep on mains power: off ^(the laptop stays awake while plugged in^).

set "DESIGN_MODEL=%DM%"
cd /d "%LOCAL%"
echo.
echo  If Windows asks whether Node.js may use the network, choose "Private networks" and Allow.
echo  The Team address and the Access key appear below once the engine has started.
echo.
call npm run dev -- --server
pause
