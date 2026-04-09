@echo off
setlocal enabledelayedexpansion
title Interview Coder Stealth Launcher

:: Navigate to project directory
cd /d "%~dp0"

echo ===================================
echo Interview Coder - Stealth Mode Launcher
echo ===================================

echo.
echo 1. Stopping any existing instances...
taskkill /F /IM "Interview Coder.exe" >nul 2>&1
taskkill /F /IM "electron.exe" >nul 2>&1

echo.
echo 2. Ensuring Ollama models are available...
echo Checking for qwen2.5-coder...
call ollama list | findstr "qwen2.5-coder" >nul
if errorlevel 1 (
    echo Downloading qwen2.5-coder... (this may take a while)
    call ollama run qwen2.5-coder "--version" >nul 2>&1
)

echo Checking for llama3.2-vision...
call ollama list | findstr "llama3.2-vision" >nul
if errorlevel 1 (
    echo Downloading llama3.2-vision... (this may take a while)
    call ollama run llama3.2-vision "--version" >nul 2>&1
)

echo Checking for deepseek-r1...
call ollama list | findstr "deepseek-r1" >nul
if errorlevel 1 (
    echo Downloading deepseek-r1... (this may take a while)
    call ollama run deepseek-r1 "--version" >nul 2>&1
)

echo.
echo 3. Starting Ollama Server...
start "" /B "ollama" serve >nul 2>&1

echo.
echo 4. Compiling application...
call npm run build
if errorlevel 1 (
    echo.
    echo Build failed, so the app was not launched.
    echo Fix the build error and run this launcher again.
    pause
    exit /b 1
)

if not exist "%~dp0dist-electron\main.js" (
    echo.
    echo Build finished without creating dist-electron\main.js.
    echo The app was not launched.
    pause
    exit /b 1
)

echo.
echo 5. Deploying application silently...
wscript.exe "%~dp0invisible_launcher.vbs"

echo.
echo ===================================
echo Application successfully deployed in stealth mode!
echo You can use the configured keyboard shortcuts.
echo The command prompt window will automatically close.
echo ===================================

:: Wait 3 seconds then exit cleanly
timeout /t 3 /nobreak >nul
exit
