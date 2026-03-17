<div align="center">
  <h1>🚀 Interview Coder</h1>
  <p><strong>Open-source Electron desktop app for screenshot-based coding interview assistance and theory Q&A, powered entirely by a local AI model.</strong></p>
  <p><i>✨ No Paywalls • No Subscriptions • No API Keys • 100% Offline Inference ✨</i></p>
  
  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
  [![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-9feaf9.svg)](https://www.electronjs.org/)
  [![React](https://img.shields.io/badge/React-18.0-61dafb.svg)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)](https://www.typescriptlang.org/)
</div>

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 👻 **Invisible Always-on-Top Window** | Bypasses screen-sharing restrictions with a stealth UI (toggleable via `Ctrl+B`). Perfect for online interviews and coding practice. |
| 📸 **Intelligent Screenshot Queue** | Instantly capture problem statements, compile errors, and code snippets with `Ctrl+H` or upload image files directly. Queue up to 5 screenshots for batch processing. |
| 📤 **Screenshot Upload Support** | Upload image files directly (`Ctrl+U`) instead of just taking screenshots—perfect for question code or error messages. |
| 👨‍💻 **Smart Problem Detection** | Automatically distinguishes between practical algorithm challenges and theoretical definition questions, formatting output dynamically. |
| ⚙️ **100% Offline Processing** | All reasoning, problem extraction, and debugging rely on a local Ollama instance. Zero cloud dependency. Zero telemetry. |
| ⌨️ **Blazing-Fast Keyboard Shortcuts** | Fully keyboard-driven workflow—capture, process, and reset without ever moving your mouse. See [shortcuts table](#-global-keyboard-shortcuts) below. |
| 🎛️ **Per-Stage Model Tuning** | Select individual LLM models for Problem Extraction, Solution Generation, and Debugging directly from the app settings. |
| 💾 **Persistent Configuration** | All settings stored locally in your app data directory—no cloud sync, complete privacy.

---

## 🏗️ Application Architecture

The architecture follows a **three-layer model**: React frontend → Electron IPC layer → Local AI backend.

### 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER (React)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Queue View   │  │Solution View │  │ Settings UI  │       │
│  │ Screenshots  │  │ Code + Output│  │  Model Select│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────▼────────────────────┐
        │   ELECTRON IPC LAYER        │
        │ (preload.ts / ipcHandlers)  │
        │                             │
        │ • Screenshot capture        │
        │ • File dialog handling      │
        │ • Window management         │
        │ • Config I/O                │
        └────────┬────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│          ELECTRON MAIN PROCESS (Node.js)                 │
│                                                          │
│  ProcessingHelper.ts                                     │
│  └─ Orchestrates multi-stage inference                   │
│     • Stage 1: Problem extraction from images            │
│     • Stage 2: Solution generation                       │
│     • Stage 3: Debugging & follow-up Q&A                 │
│                                                          │
│  ScreenshotHelper.ts                                     │
│  └─ Manages screenshot queue & file operations           │
│     • Platform-specific capture (Windows/Mac/Linux)      │
│     • Image preview generation                           │
│     • File upload handling                               │
│                                                          │
│  ConfigHelper.ts                                         │
│  └─ Persistent configuration management                  │
│     • Model selections                                   │
│     • UI preferences & opacity settings                  │
│     • Keyboard shortcut configs                          │
│                                                          │
│  ShortcutsHelper.ts                                      │
│  └─ Global keyboard shortcut registration                │
│     • Cross-platform hotkey binding                      │
│     • Seamless window & file interactions                │
└────────────────┬─────────────────────────────────────────┘
                 │
        ┌────────▼────────────────────┐
        │  LOCAL AI BACKEND           │
        │  (Ollama HTTP Server)       │
        │  http://localhost:11434     │
        │                             │
        │ POST /api/chat/completions  │
        │ Models:                     │
        │ • qwen2.5-coder (default)   │
        │ • deepseek-r1               │
        │ • mistral / neural-chat     │
        └─────────────────────────────┘
```

### 📝 Component Code Architecture

```typescript
// src/App.tsx
// Root component providing React Query context and toast system
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SubscribedApp />
      </ToastProvider>
    </QueryClientProvider>
  )
}

// src/_pages/Queue.tsx - Main workflow view
// Handles screenshot capture, queuing, and processing initiation
const Queue = () => {
  // Fetch and manage screenshot queue
  const { data: screenshots } = useQuery({
    queryKey: ["screenshots"],
    queryFn: fetchScreenshots
  })
  // Handle user interactions (capture, upload, solve)
}

// src/_pages/Solutions.tsx - Results display view
// Shows extracted problem info, AI-generated solution, and Q&A

// electron/ProcessingHelper.ts
// THE CORE INFERENCE ORCHESTRATOR
// Manages the multi-stage pipeline:
// 1. Extract problem from screenshot(s)
// 2. Generate solution code
// 3. Handle follow-up debugging/Q&A

// electron/ScreenshotHelper.ts
// Platform-specific screenshot capturing & image management
// Handles: native capture, file upload, preview generation

// electron/ConfigHelper.ts
// JSON config file loader/saver (cross-platform)
// Defaults to environment variables if not found
```

### 🔄 **Data Flow: From Screenshot to Solution**

```
User presses Ctrl+H
    ↓
ScreenshotHelper.takeScreenshot()
    ↓
Platform-specific capture (Windows: PowerShell, Mac/Linux: native)
    ↓
Save to: ${userData}/screenshots/<uuid>.png
    ↓
Generate Base64 preview thumbnail
    ↓
Send "screenshot-taken" IPC event to Renderer
    ↓
React updates queue UI
    ↓
User presses Ctrl+Enter (Process Screenshots)
    ↓
ProcessingHelper.processScreenshots()
    ├─ Stage 1: Send images + extraction prompt to Ollama
    │  └ Response: { statement, constraints, io_examples }
    │
    ├─ Stage 2: Send extracted data + dynamic constraints to Ollama
    │  └ Response: { code, complexity, time, space, explanation }
    │
    └─ Stage 3 (Optional): Debug mode or follow-up Q&A
       └ Keep context, iteratively refine solution
    ↓
Display formatted solution in Solutions view
```

---

## 🛠️ Installation & Setup

### Prerequisites

Before you start, ensure you have the following installed:

- **Node.js** & **npm**
- A **locally running Ollama server** at `http://localhost:11434`
- You must pull **both** a text model and a vision model into Ollama for the app to function correctly:

```bash
# Start your local ollama daemon
ollama serve

# Open another terminal and pull the required models
ollama pull qwen2.5-coder
ollama pull llama3.2-vision

# Pull the primary reasoning model
ollama pull deepseek-r1
```

### Step 3: Clone & Install

```bash
# Clone the repository
git clone <repo-url>
cd interview-coder

# Install dependencies
npm install
```

### Step 4: Launch the Application

#### Stealth Mode (Hidden Console Window)

**Windows** - Uses hidden VBScript executor:
```bash
./stealth-run.bat
```

**macOS / Linux**:
```bash
chmod +x stealth-run.sh
./stealth-run.sh
```

#### Standard Development Mode

```bash
npm run dev
```

> **⚠️ Pro Tip:** If the window launches invisibly, press `Ctrl+B` (or `Cmd+B`) to toggle visibility. You can also use the tray icon.

---

## ⌨️ Keyboard Shortcuts Guide

Master the entire workflow with these global hotkeys. All shortcuts work even when the window is hidden or another app is focused.

| Action | Windows/Linux | macOS | Notes |
|--------|---------------|-------|-------|
| **Window Visibility** | `Ctrl` + `B` | `Cmd` + `B` | Toggle between hidden and visible states |
| **Toggle Invisibility** | `Ctrl` + `Shift` + `I` | `Cmd` + `Shift` + `I` | Enable stealth mode (for screen sharing) |
| **Toggle Mouse Passthrough** | `Ctrl` + `Shift` + `P` | `Cmd` + `Shift` + `P` | Click-through mode—clicks pass to apps behind |
| **Take Screenshot** | `Ctrl` + `H` | `Cmd` + `H` | Capture current screen instantly |
| **Upload Screenshot** | `Ctrl` + `U` | `Cmd` + `U` | Open file dialog to upload image file |
| **Delete Last Screenshot** | `Ctrl` + `L` | `Cmd` + `L` | Remove the most recent screenshot from queue |
| **Process All Screenshots** | `Ctrl` + `Enter` | `Cmd` + `Enter` | Send queued screenshots to AI for analysis |
| **Reset Everything** | `Ctrl` + `R` | `Cmd` + `R` | Clear queue, reset view, cancel ongoing requests |
| **Move Window Left** | `Ctrl` + `←` | `Cmd` + `←` | Shift window 10px to the left |
| **Move Window Right** | `Ctrl` + `→` | `Cmd` + `→` | Shift window 10px to the right |
| **Move Window Up** | `Ctrl` + `↑` | `Cmd` + `↑` | Shift window 10px upward |
| **Move Window Down** | `Ctrl` + `↓` | `Cmd` + `↓` | Shift window 10px downward |
| **Decrease Opacity** | `Ctrl` + `[` | `Cmd` + `[` | Make window more transparent (10% steps) |
| **Increase Opacity** | `Ctrl` + `]` | `Cmd` + `]` | Make window more opaque (10% steps) |
| **Open Settings** | N/A (UI button) | N/A (UI button) | Access model selection and preferences |
| **Quit Application** | `Ctrl` + `Q` | `Cmd` + `Q` | Exit Interview Coder completely |

> **Workflow Example:**
> 1. Press `Ctrl+H` to capture problem statement
> 2. Press `Ctrl+H` again to capture your error output (up to 5 screenshots)
> 3. Press `Ctrl+Enter` to send everything to AI
> 4. Review solution in Solutions view
> 5. Press `Ctrl+R` to reset and start over

---

## ⚙️ Configuration & Customization

### Configuration File Location

All settings are stored as JSON in your OS-specific app data directory:

| Platform | Path |
|----------|------|
| **Windows** | `%APPDATA%\interview-coder-v1\config.json` |
| **macOS** | `~/Library/Application Support/interview-coder-v1/config.json` |
| **Linux** | `~/.config/interview-coder-v1/config.json` |

### Configuration Options

```json
// config.json - Edit these settings directly or via UI
{
  "modelProvider": "ollama",           // AI provider: "ollama" (only option)
  "extractionModel": "qwen2.5-coder",  // Model for problem extraction
  "solutionModel": "qwen2.5-coder",    // Model for code generation
  "debuggingModel": "qwen2.5-coder",   // Model for debugging Q&A
  "language": "python",                // Programming language preference
  "opacity": 1.0,                      // Window opacity (0.1 - 1.0)
  "invisibilityEnabled": false,        // Start in stealth mode
  "mousePassthroughEnabled": false     // Enable click-through by default
}
```

### Changing Models

1. **Via Settings UI:**
   - Click the ⚙️ gear icon or press the settings button
   - Select different models from dropdowns
   - Settings save automatically

2. **Direct Edit:**
   - Stop the application
   - Open `config.json` in your text editor
   - Change model names (must match `ollama list` output)
   - Restart application

3. **Environment Variables (Alternative):**
   ```bash
   # Set these before launching the app
   export EXTRACTION_MODEL=deepseek-r1:1.5b
   export SOLUTION_MODEL=qwen2.5-coder
   export DEBUGGING_MODEL=mistral
   ```

---

## 🚀 Development Guide

### Project Structure

```
interview-coder/
├── electron/                 # Electron main process (Node.js)
│   ├── main.ts              # App entry point, window creation
│   ├── ipcHandlers.ts       # IPC channel implementations
│   ├── ProcessingHelper.ts  # Core AI inference orchestration
│   ├── ScreenshotHelper.ts  # Screenshot capture & file handling
│   ├── ConfigHelper.ts      # Config file I/O
│   ├── ShortcutsHelper.ts   # Global keyboard shortcuts
│   └── autoUpdater.ts       # Auto-update logic
│
├── src/                      # React frontend
│   ├── App.tsx              # Root React component
│   ├── main.tsx             # React entry point
│   ├── _pages/              # Page/view components
│   │   ├── Queue.tsx        # Screenshot queue & capture UI
│   │   ├── Solutions.tsx    # Formatted solution display
│   │   ├── Debug.tsx        # Debugging Q&A interface
│   │   └── SubscribedApp.tsx # Main app wrapper
│   ├── components/          # Reusable React components
│   │   ├── Queue/           # Screenshot queue components
│   │   ├── Solutions/       # Solution display components
│   │   ├── Settings/        # Settings dialog
│   │   └── ui/              # Shadcn UI components
│   ├── types/               # TypeScript interfaces
│   │   ├── electron.d.ts    # Electron IPC type definitions
│   │   └── screenshots.ts   # Data type interfaces
│   ├── lib/                 # Utilities & helpers
│   │   ├── supabase.ts      # (Not used in offline version)
│   │   └── utils.ts         # General utilities
│   └── contexts/            # React Context providers
│       └── toast.tsx        # Toast notification system
│
├── public/                   # Static assets
│   └── index.html
│
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite bundler config
├── tailwind.config.js       # Tailwind CSS config
└── electron-builder.yml     # Electron packaging config
```

### Running in Development Mode

```bash
# Terminal 1: Start the React dev server (Vite)
npm run dev

# Terminal 2: Start the Electron app
npm run electron-dev
```

The React app hot-reloads on `http://localhost:5173`.

### Building for Production

```bash
# Build everything (React + Electron)
npm run build

# Create installer packages
npm run package-win     # Windows .exe installer
npm run package-mac     # macOS .dmg installer
npm run package-linux   # Linux AppImage

# Output goes to: ./dist/
```

### Adding New IPC Channels

1.  **Define the handler in `electron/ipcHandlers.ts`:**
    ```typescript
    ipcMain.handle('my-new-handler', async (event, arg) => {
      // Your logic here
      return { success: true, data: 'result' }
    })
    ```

2.  **Add TypeScript type in `src/types/electron.d.ts`:**
    ```typescript
    interface ElectronAPI {
      myNewHandler: (arg: string) => Promise<{ success: boolean; data: string }>
    }
    ```

3.  **Use in React component:**
    ```typescript
    const result = await window.electronAPI.myNewHandler('parameter')
    ```

### Debugging

**Inspect Main Process:**
```bash
# In DevTools Console of main window or create a debug window in main.ts
mainWindow.webContents.openDevTools()
```

**View Application Logs:**
- **Windows:** `%APPDATA%\interview-coder-v1\`
- **macOS:** `~/Library/Logs/interview-coder-v1/`
- **Linux:** `~/.local/share/interview-coder-v1/logs/`

---

## 📖 API Documentation

### Core IPC Methods

#### Screenshot Management
```typescript
// Take a screenshot of current screen
triggerScreenshot(): Promise<{ success: boolean; error?: string }>

// Upload an image file from disk
uploadScreenshot(): Promise<{ success: boolean; error?: string }>

// Delete last screenshot from queue
deleteLastScreenshot(): Promise<{ success: boolean; error?: string }>

// Get current screenshot queue
getScreenshots(): Promise<Array<{ path: string; preview: string }>>

// Delete specific screenshot by path
deleteScreenshot(path: string): Promise<{ success: boolean; error?: string }>
```

#### Processing & AI
```typescript
// Send queued screenshots to AI for analysis
triggerProcessScreenshots(): Promise<{ success: boolean; error?: string }>

// Send text query for follow-up Q&A
triggerProcessTextQuery(query: string): Promise<{ success: boolean; error?: string }>

// Ask interviewer a specific question (for advanced debugging)
askInterviewerQuestion(payload: {
  question: string
  solutionCode?: string
  thoughts?: string[]
}): Promise<{ success: boolean; answer?: string; error?: string }>
```

#### Window Management
```typescript
// Toggle window visibility (hot key: Ctrl+B)
toggleMainWindow(): Promise<{ success: boolean; error?: string }>

// Update displayed content dimensions
updateContentDimensions(width: number, height: number): Promise<void>

// Move window (hot keys: Ctrl+Arrow Keys)
triggerMoveLeft/Right/Up/Down(): Promise<{ success: boolean; error?: string }>
```

#### Settings & Configuration
```typescript
// Get all current settings
getConfig(): Promise<{
  modelProvider: string
  extractionModel: string
  solutionModel: string
  debuggingModel: string
  language: string
  opacity: number
  invisibilityEnabled: boolean
  mousePassthroughEnabled: boolean
}>

// Update one or more settings
updateConfig(partial: Partial<Config>): Promise<unknown>

// Toggle invisibility mode (stealth UI)
toggleInvisibilityMode(): Promise<{ enabled: boolean }>

// Toggle mouse passthrough (click-through mode)
toggleMousePassthroughMode(): Promise<{ enabled: boolean }>
```

#### Event Listeners
```typescript
// Listen for screenshot capture events
onScreenshotTaken(callback: (data: { path: string; preview: string }) => void): () => void

// Listen for AI processing start
onSolutionStart(callback: () => void): () => void

// Listen for solution ready
onSolutionSuccess(callback: (data: any) => void): () => void

// Listen for processing errors
onSolutionError(callback: (error: string) => void): () => void

// Listen for debug mode start
onDebugStart(callback: () => void): () => void

// Listen for view reset
onResetView(callback: () => void): () => void

// Listen for credit updates (if using payment model)
onCreditsUpdated(callback: (credits: number) => void): () => void
```

---

## 🐞 Troubleshooting

- **Processing fails instantly:** Double check that `ollama serve` is actively running and reachable on port `11434`.
- **Image Extraction Fails:** Ensure you have pulled `llama3.2-vision` or `llava` and selected it under the **Problem Extraction** dropdown in Settings.
- **Model not found:** Check Settings to ensure the selected model exactly matches one you've downloaded (`ollama list`).
   - Case-sensitive! (`qwen2.5-coder` not `Qwen2.5-Coder`)
2. Check `config.json` manually:
   ```bash
   cat ~/.config/interview-coder-v1/config.json  # Linux/Mac
   type %APPDATA%\interview-coder-v1\config.json  # Windows
   ```
3. Try changing all three model names to same working model temporarily

---

#### ❌ "Window won't appear" or "stays invisible"
**Problem:** App launched but window is totally hidden.

**Solutions:**
1. **Spam the visibility toggle:**
   ```bash
   # Press repeatedly:
   Ctrl+B (or Cmd+B on Mac)
   ```

2. **Reset opacity to maximum:**
   ```bash
   # Hold down:
   Ctrl+] (or Cmd+])    # Repeat until fully opaque
   ```

3. **Clear invisibility setting:**
   - Delete `config.json` and restart—defaults will take effect
   - Or manually set: `"invisibilityEnabled": false` in config

4. **Check if window exists but off-screen:**
   - Delete config to reset window position
   - App will recenter on relaunch

---

#### ❌ "Screenshot capture fails or is blank"
**Problem:** `Ctrl+H` doesn't capture anything, or image is all black.

**Solutions:**
1. **Grant screen recording permissions** (macOS/Linux):
   - **macOS:** System Preferences → Security & Privacy → Screen Recording → Allow Interview Coder
   - **Linux:** Check compositor is running; Wayland may need extra config

2. **Windows PowerShell issue:**
   - App auto-falls back to multiple methods, but if all fail:
   ```powershell
   # Run as Administrator
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Multiple monitors:**
   - App captures all monitors—this is intentional
   - If blank, check if sharing the right monitor

---

#### ❌ "Settings changes not saving"
**Problem:** Changed model in Settings, but it reverts on restart.

**Solutions:**
1. Check app data directory is writable:
   ```bash
   # Linux/Mac
   ls -la ~/.config/interview-coder-v1/
   
   # Windows
   dir %APPDATA%\interview-coder-v1\
   ```

2. Verify `config.json` permissions are `644` (readable/writable)

3. Manually edit `config.json` if UI doesn't work:
   ```json
   { "solutionModel": "deepseek-r1:1.5b" }
   ```

---

#### ❌ "High CPU usage or slow processing"
**Problem:** App is freezing or consuming lots of CPU.

**Solutions:**
1. **Check Ollama memory usage:**
   - Smaller models use less memory: `Neural-chat` (4GB) vs `qwen2.5-coder` (8GB)
   - Try quantized versions: `qwen2.5-coder:7b`

2. **Reduce screenshot resolution:**
   - App automatically downscales, but you can clear cache:
   ```bash
   rm -rf ~/.config/interview-coder-v1/  # Clears all cached previews
   ```

3. **Close other apps** competing for system resources

---

## 🤝 Contributing

We welcome contributions! Whether it's bug reports, feature requests, or code improvements, please:

1. **Report Issues:** Open a GitHub issue with:
   - Your OS + version
   - Ollama version (`ollama --version`)
   - Steps to reproduce
   - Screenshot of error (if applicable)

2. **Submit Code:**
   - Fork the repository
   - Create a feature branch: `git checkout -b feature/your-feature`
   - Make changes, test thoroughly
   - Submit a pull request with clear description

3. **Feature Ideas:**
   - Real-time code syntax highlighting
   - Support for additional AI providers (Claude, GPT-4, etc.)
   - Enhanced debugging with variable inspection
   - Multi-language support for UI

---

## 📚 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Shadcn/ui, React Query |
| **IPC & Main** | Electron 27+, Node.js 18+ |
| **AI Inference** | Ollama local server, LLaMA-based models |
| **Build Tools** | Vite, Electron Builder |
| **Package Manager** | npm / bun |
| **Styling** | Tailwind CSS v3, CSS modules |

---

## 🔒 Privacy & Security

- ✅ **100% Offline** - No cloud calls, no telemetry, no analytics
- ✅ **Full Privacy** - Your code and questions never leave your computer
- ✅ **No API Keys** - Works entirely with local Ollama instance
- ✅ **Open Source** - Audit the code anytime
- ✅ **No User Tracking** - No accounts, no logins, no data collection
- ✅ **Local Storage Only** - All configs stored in your app data directory

---

## 📝 License

This project is licensed under the **GNU Affero General Public License v3.0**.

This means:
- ✅ Free to use for any purpose
- ✅ Can modify and redistribute
- ⚠️ Must provide source code if distributed
- ⚠️ Modifications must also be open source under AGPL-3.0

See [LICENSE](LICENSE) for full text.

---

## 🙏 Acknowledgments

- **Ollama** - For making local LLM inference accessible
- **Qwen Team** - For qwen2.5-coder and community contributions
- **DeepSeek** - For efficient reasoning models
- **Electron** - For cross-platform desktop framework
- **React** - For reactive UI framework
- **All Contributors** - For bug reports, features, and improvements

---

## 📞 Support & Community

- **GitHub Issues:** Report bugs and request features  
- **Discussions:** Ask questions and share tips  
- **Ollama Community:** [ollama.ai/community](https://ollama.ai)

---

<div align="center">
  <p><strong>Made with ❤️ by the Interview Coder Community</strong></p>
  <p><i>Your AI-powered coding interview companion</i></p>
  <p>⭐ If this project helps you, please consider starring on GitHub! ⭐</p>
</div>
