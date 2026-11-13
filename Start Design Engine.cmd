@echo off
setlocal
title Accord Design Engine
rem  Runs the Accord Design Engine from this PC's local disk (npm cannot install into the Google Drive H: disk)
rem  while every project, image and render is still saved in this Design_Model folder in Drive.
rem  Each start copies the latest code from Design_Model\app to the local folder, so updates arrive automatically.

set "DM=%~dp0"
set "DM=%DM:~0,-1%"
set "LOCAL=%LOCALAPPDATA%\AccordDesignEngine"

where node >nul 2>nul || (echo Node.js is not installed. Install the LTS version from https://nodejs.org and run this again. & pause & exit /b 1)

echo Copying the latest code to "%LOCAL%" ...
robocopy "%DM%\app" "%LOCAL%" /MIR /XD node_modules dist /NFL /NDL /NJH /NJS /NP >nul
if %ERRORLEVEL% GEQ 8 (echo Could not copy the app folder. & pause & exit /b 1)

set "DESIGN_MODEL=%DM%"
cd /d "%LOCAL%"
echo Projects are saved in "%DESIGN_MODEL%"
echo.
call npm run dev
pause
