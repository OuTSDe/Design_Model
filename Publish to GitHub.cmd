@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Publish the Accord Design Engine to GitHub
rem  Copies the CODE of the Design Engine (never Projects, Library, Vendors or images) into a clean local repository,
rem  adds the GitHub Actions workflows, creates the GitHub repository (first time), turns on GitHub Pages and pushes.
rem  Run it again whenever you want to publish changes. Needs Git and the GitHub CLI (it offers to install them).

set "DM=%~dp0"
set "DM=%DM:~0,-1%"
set "REPO=%USERPROFILE%\AccordDesignEngine-repo"
set "NAME=accord-design-engine"

echo.
echo  Accord Design Engine  ^>  GitHub
echo  Code from:  %DM%
echo  Repository: %REPO%
echo.

where git >nul 2>nul || (
  echo Git is not installed.
  choice /M "Install Git now with winget"
  if errorlevel 2 (echo Install Git from https://git-scm.com and run this again. & pause & exit /b 1)
  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
  echo Close this window and run Publish to GitHub.cmd again so the new Git is found. & pause & exit /b 0
)
where gh >nul 2>nul || (
  echo The GitHub CLI ^(gh^) is not installed.
  choice /M "Install the GitHub CLI now with winget"
  if errorlevel 2 (echo Install it from https://cli.github.com and run this again. & pause & exit /b 1)
  winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
  echo Close this window and run Publish to GitHub.cmd again so gh is found. & pause & exit /b 0
)
gh auth status >nul 2>nul || (
  echo Sign in to GitHub ^(a browser window opens^):
  gh auth login --web --git-protocol https || (echo Sign-in did not finish. & pause & exit /b 1)
)

echo Copying the code ^(no client, vendor or image data^) ...
robocopy "%DM%" "%REPO%" /MIR /XD .git node_modules dist Projects Library Vendors .engine Meeting_Log github-workflows candidates render-ref moodboard-ref _removed /XF *.original.md sources.json concurrently "accord-design-engine@0.1.0" desktop.ini Thumbs.db *.log "Publish to GitHub.cmd" /NFL /NDL /NJH /NJS /NP >nul
if %ERRORLEVEL% GEQ 8 (echo Copy failed. & pause & exit /b 1)
if not exist "%REPO%\.github\workflows" mkdir "%REPO%\.github\workflows"
copy /Y "%DM%\github-workflows\*.yml" "%REPO%\.github\workflows\" >nul

cd /d "%REPO%"
if not exist .git (git init -b main >nul)
git config user.name >nul 2>nul || git config user.name "Accord Design Engine"
git config user.email >nul 2>nul || git config user.email "design-engine@users.noreply.github.com"
git add -A
git diff --cached --quiet && (echo Nothing new to publish.) || git commit -q -m "Design Engine update %DATE% %TIME:~0,5%"

for /f "usebackq delims=" %%u in (`gh api user --jq .login`) do set "OWNER=%%u"
if "%OWNER%"=="" (echo Could not read your GitHub account. & pause & exit /b 1)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo Creating the repository %OWNER%/%NAME% ...
  gh repo view "%OWNER%/%NAME%" >nul 2>nul || gh repo create "%NAME%" --public --description "Accord Design Engine (OuTSDe): brief to render with Codex. Code only; data stays in Google Drive." || (echo Could not create the repository. & pause & exit /b 1)
  git remote add origin "https://github.com/%OWNER%/%NAME%.git"
  echo Turning on GitHub Pages ^(built by GitHub Actions^) ...
  gh api -X POST "repos/%OWNER%/%NAME%/pages" -f build_type=workflow >nul 2>nul || gh api -X PUT "repos/%OWNER%/%NAME%/pages" -f build_type=workflow >nul 2>nul
)

echo Pushing ...
git push -u origin main || (echo Push failed. & pause & exit /b 1)

rem the published page may talk to the engine on this PC: add its address to allowedOrigins
set "ORIGIN=https://%OWNER%.github.io"
node -e "const f=process.argv[1],o=process.argv[2].toLowerCase(),fs=require('fs');const c=JSON.parse(fs.readFileSync(f,'utf8'));c.allowedOrigins=[...new Set([...(c.allowedOrigins||[]),o])];fs.writeFileSync(f,JSON.stringify(c,null,2));console.log('Engine will accept '+o)" "%DM%\app\engine\config.json" "%ORIGIN%"

echo.
echo  Done.
echo  Repository:  https://github.com/%OWNER%/%NAME%
echo  Actions:     https://github.com/%OWNER%/%NAME%/actions
echo  Page ^(in 1-3 minutes^):  %ORIGIN%/%NAME%/
echo.
echo  Then open the Design Engine on this PC: Engine and Codex ^> Update and restart,
echo  so the engine accepts the published page. Keep the engine running while you use the page.
echo.
pause
