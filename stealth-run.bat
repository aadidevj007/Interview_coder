@echo off
echo === Interview Coder - Invisible Edition (No Paywall) ===
echo.
echo This build uses a local Ollama server for all AI processing.
echo Server: http://localhost:11434
echo Default Text model: qwen2.5-coder
echo Default Vision model: llama3.2-vision (for screenshots)
echo Alternative model: deepseek-r1:1.5b
echo.
echo IMPORTANT: This app is designed to be INVISIBLE by default!
echo Use the keyboard shortcuts to control it:
echo.
echo - Toggle Visibility: Ctrl+B (or Cmd+B on Mac)
echo - Toggle Invisibility Protection: Ctrl+Shift+I
echo - Take Screenshot: Ctrl+H
echo - Process Screenshots: Ctrl+Enter
echo - Move Window: Ctrl+Arrows (Left/Right/Up/Down)
echo - Adjust Opacity: Ctrl+[ (decrease) / Ctrl+] (increase)
echo - Reset View: Ctrl+R
echo - Quit App: Ctrl+Q
echo.
echo When you press Ctrl+B, the window will toggle between visible and invisible.
echo Use Ctrl+Shift+I to turn screen-capture protection on or off.
echo If movement shortcuts aren't working, try making the window visible first with Ctrl+B.
echo.
echo Questions ^& Q^&A:
echo - Queue: Ask questions directly using the text box or Voice Input button
echo - Solutions: Ask follow-up questions in the Interviewer Q^&A panel
echo - Keyboard: type a question and press Enter
echo - Voice: use the Voice Input button if speech recognition is available
echo.

cd /D "%~dp0"

echo === Step 1: Checking Ollama availability... ===
where curl >nul 2>nul
if errorlevel 1 (
  echo WARNING: curl was not found, so the Ollama connectivity check was skipped.
) else (
  curl -s http://localhost:11434/api/tags >nul 2>nul
  if errorlevel 1 (
    echo ERROR: Ollama is not reachable at http://localhost:11434
    echo Start Ollama first, for example:
    echo   ollama serve
    echo   ollama pull qwen2.5-coder
    echo   ollama pull llama3.2-vision
    echo   ollama pull deepseek-r1
    echo.
    exit /b 1
  )
)

echo === Step 2: Creating required directories... ===
mkdir "%APPDATA%\interview-coder-v1\temp" 2>nul
mkdir "%APPDATA%\interview-coder-v1\cache" 2>nul
mkdir "%APPDATA%\interview-coder-v1\screenshots" 2>nul
mkdir "%APPDATA%\interview-coder-v1\extra_screenshots" 2>nul

echo === Step 3: Checking local toolchain... ===
if not exist "node_modules" (
  echo ERROR: Project dependencies are not installed.
  echo Run this first:
  echo   npm install
  exit /b 1
)

echo === Step 4: Cleaning previous builds... ===
echo Removing old build files to ensure a fresh start...
rmdir /s /q dist dist-electron 2>nul

echo === Step 5: Building application... ===
echo This may take a moment...
call npm run build
if errorlevel 1 (
  echo Build failed. Make sure dependencies are installed with:
  echo   npm install
  exit /b 1
)

echo === Step 6: Launching in stealth mode... ===
echo Remember: Press Ctrl+B to make it visible, Ctrl+Shift+I to toggle invisibility, and Ctrl+[ / Ctrl+] to adjust opacity!
echo.
set ELECTRON_RUN_AS_NODE=
set NODE_ENV=production

echo Launching background process via VBScript...
wscript.exe "%~dp0invisible_launcher.vbs" "npx electron ./dist-electron/main.js"

echo App is now running invisibly! The terminal window will close automatically.
echo Press Ctrl+B to make the app visible.
echo If you encounter any issues:
echo 1. Make sure you've installed dependencies with 'npm install'
echo 2. Make sure Ollama is running locally on http://localhost:11434
echo 3. Pull models with 'ollama pull qwen2.5-coder', 'ollama pull llama3.2-vision', and 'ollama pull deepseek-r1'
echo 4. Press Ctrl+B multiple times to toggle visibility
echo 5. Press Ctrl+Shift+I to toggle invisibility protection
echo 6. Check Task Manager to verify the app is running
