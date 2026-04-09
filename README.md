<div align="center">

# Interview Coder

### A local-first desktop app that reads coding screenshots and turns them into solutions with Ollama

<p>
  <strong>Beautiful desktop workflow.</strong>
  <strong>Local AI.</strong>
  <strong>No API keys.</strong>
  <strong>No subscriptions.</strong>
</p>

<p>
  <a href="https://github.com/aadidevj007/Interview_coder">Repository</a>
  ·
  <a href="https://github.com/aadidevj007/Interview_coder/issues">Issues</a>
</p>

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Electron](https://img.shields.io/badge/Desktop-Electron-9feaf9.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/UI-React-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Code-TypeScript-3178c6.svg)](https://www.typescriptlang.org/)
[![Ollama](https://img.shields.io/badge/AI-Ollama-111111.svg)](https://ollama.com)

</div>

---

## Overview

Interview Coder is an Electron desktop application that helps users solve coding questions from screenshots or uploaded images.

Instead of sending your screenshots to a cloud service, the app connects to your local Ollama server and processes everything on your own machine.

This makes the app:

- easier to use
- private by default
- fast to iterate with
- understandable even for people who are not deeply technical

---

## Why This Project Exists

Many coding-assistant tools are:

- locked behind subscriptions
- dependent on API keys
- cloud-only
- overloaded with setup complexity

Interview Coder takes a simpler path:

- take a screenshot
- extract the coding question
- generate a solution
- validate the answer
- continue debugging if needed

All of that happens through a local desktop app with local Ollama models.

---

## What It Can Do

| Feature | Description |
| --- | --- |
| Screenshot capture | Capture coding questions directly from your screen |
| Image upload | Upload screenshots or saved images from disk |
| Queue multiple screenshots | Add several screenshots before running analysis |
| Vision-based extraction | Use a vision model such as `llava` or `llama3.2-vision` to read screenshots |
| Code generation | Use a coding model such as `qwen2.5-coder` to generate a solution |
| Validation pass | Run a second model pass to improve correctness |
| Debug workflow | Add more screenshots later to refine or debug the answer |
| Local config | Save settings in your machine's app-data folder |
| Overlay controls | Toggle visibility, opacity, invisibility mode, and mouse passthrough |

---

## How A Person Uses It

The workflow is intentionally simple:

1. Open the app.
2. Capture or upload a screenshot of the coding problem.
3. Let the app extract the problem text.
4. Let the app generate a code solution.
5. Let the app validate the generated solution.
6. Review the final output.
7. If needed, add extra screenshots of your code, errors, or failed tests and debug again.

---

## Quick Start

### Prerequisites

Install these first:

- `Node.js`
- `npm`
- `Ollama`

Ollama is available at [https://ollama.com](https://ollama.com).

### Start Ollama

```bash
ollama serve
```

### Pull recommended models

```bash
ollama pull llava
ollama pull qwen2.5-coder
```

Optional alternatives:

```bash
ollama pull llama3.2-vision
ollama pull deepseek-r1:1.5b
ollama pull mistral
```

Check installed models:

```bash
ollama list
```

### Clone the repository

```bash
git clone https://github.com/aadidevj007/Interview_coder.git
cd Interview_coder
```

### Install dependencies

```bash
npm install
```

### Run in development mode

```bash
npm run dev
```

### Build and run locally

```bash
npm run build
npm run run-prod
```

---

## Recommended Model Setup

Use this setup for the smoothest experience:

```json
{
  "extractionModel": "llava",
  "solutionModel": "qwen2.5-coder",
  "validationModel": "qwen2.5-coder"
}
```

Important:

- `extractionModel` must be a vision model
- `solutionModel` should be a coding model
- `validationModel` should be a coding model

If you use a coding-only model for screenshot extraction, image processing will fail.

---

## Keyboard Shortcuts

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| Toggle window visibility | `Ctrl + B` | `Cmd + B` |
| Toggle invisibility mode | `Ctrl + Shift + I` | `Cmd + Shift + I` |
| Toggle mouse passthrough | `Ctrl + Shift + P` | `Cmd + Shift + P` |
| Take screenshot | `Ctrl + H` | `Cmd + H` |
| Upload screenshot | `Ctrl + U` | `Cmd + U` |
| Delete last screenshot | `Ctrl + L` | `Cmd + L` |
| Process screenshots | `Ctrl + Enter` | `Cmd + Enter` |
| Reset app state | `Ctrl + R` | `Cmd + R` |
| Move window left | `Ctrl + Left` | `Cmd + Left` |
| Move window right | `Ctrl + Right` | `Cmd + Right` |
| Move window up | `Ctrl + Up` | `Cmd + Up` |
| Move window down | `Ctrl + Down` | `Cmd + Down` |
| Decrease opacity | `Ctrl + [` | `Cmd + [` |
| Increase opacity | `Ctrl + ]` | `Cmd + ]` |
| Quit application | `Ctrl + Q` | `Cmd + Q` |

---

## System Architecture

Interview Coder is built as a local-first desktop pipeline with four clearly separated layers.

This separation keeps the app easier to understand, easier to debug, and easier to extend.

**The flow is simple:**

- **User layer**: captures screenshots, uploads images, and reviews results
- **Renderer layer**: shows the interface and manages the app experience
- **Electron layer**: handles desktop capabilities, local files, settings, and orchestration
- **Ollama layer**: runs local AI models for extraction, generation, and validation

### Architecture at a glance

```text
User
  -> React interface
  -> Electron desktop engine
  -> Ollama local AI
```

### System architecture diagram

```text
┌──────────────────────────────────────────────────────────────────────┐
│  1. USER EXPERIENCE LAYER                                            │
│  Capture screenshots • Upload images • Review answers                │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                │ user actions
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  2. RENDERER LAYER (React)                                           │
│  Queue view • Solutions view • Debug view • Settings dialog          │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                │ secure bridge via preload + IPC
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  3. DESKTOP ORCHESTRATION LAYER (Electron Main)                      │
│  ConfigHelper • ScreenshotHelper • ProcessingHelper                  │
│  Window control • File access • Queue management • Workflow logic    │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                │ local HTTP requests
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  4. AI INFERENCE LAYER (Ollama)                                      │
│  Vision model for screenshot reading                                 │
│  Coding model for solution generation and validation                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Architecture in plain language

- The React UI handles what the user sees and clicks.
- Electron preload and IPC let the UI safely talk to the desktop layer.
- The Electron main process handles screenshots, local files, settings, and orchestration.
- Ollama provides the local AI models used for extraction, generation, and validation.

---

## Internal Architecture

### Main application flow

```text
Renderer UI
  -> preload bridge
  -> IPC handlers
  -> processing helpers
  -> Ollama HTTP API
```

### Core backend responsibilities

| File | Responsibility |
| --- | --- |
| `electron/main.ts` | App bootstrap, window creation, app lifecycle |
| `electron/preload.ts` | Safe bridge between renderer and Electron APIs |
| `electron/ipcHandlers.ts` | Exposes commands such as screenshot, upload, solve, reset |
| `electron/ConfigHelper.ts` | Loads and saves config, normalizes legacy settings |
| `electron/ScreenshotHelper.ts` | Captures screenshots, builds previews, manages queues |
| `electron/ProcessingHelper.ts` | Runs extraction, generation, validation, and debug flows |
| `electron/ollamaService.ts` | Sends requests to Ollama and parses model responses |

---

## Data Flow Diagram

This diagram shows what happens from screenshot to final solution.

```text
User action
  │
  ├─ Take screenshot
  │   or
  └─ Upload image
      │
      ▼
ScreenshotHelper
  │
  ├─ stores file locally
  ├─ creates preview
  └─ adds item to queue
      │
      ▼
ProcessingHelper
  │
  ├─ Stage 1: extraction
  │   -> send image to vision model
  │   -> return structured problem data
  │
  ├─ Stage 2: generation
  │   -> send extracted problem to coding model
  │   -> return initial code solution
  │
  └─ Stage 3: validation
      -> send candidate solution to validation model
      -> return improved final answer
          │
          ▼
Renderer UI
  │
  ├─ show problem statement
  ├─ show generated code
  ├─ show reasoning and complexity
  └─ allow extra screenshots for debugging
```

---

## Folder Structure

```text
Interview_coder/
├─ .github/                       # GitHub workflows and repo metadata
├─ assets/                        # Icons and packaging assets
├─ build/                         # Build-time resources and platform configs
├─ dist/                          # Built renderer output
├─ dist-electron/                 # Built Electron output
├─ electron/                      # Electron main-process code
│  ├─ main.ts                     # App entry point
│  ├─ preload.ts                  # Renderer-to-main bridge
│  ├─ ipcHandlers.ts              # IPC command handlers
│  ├─ ConfigHelper.ts             # Config loading and migrations
│  ├─ ScreenshotHelper.ts         # Screenshot and upload handling
│  ├─ ProcessingHelper.ts         # Main orchestration pipeline
│  ├─ ollamaService.ts            # Ollama API integration
│  └─ autoUpdater.ts              # Update logic
├─ renderer/                      # Additional renderer-side resources
├─ src/                           # React application source
│  ├─ _pages/                     # Top-level pages
│  │  ├─ Queue.tsx                # Screenshot queue screen
│  │  ├─ Solutions.tsx            # Solution/result screen
│  │  ├─ Debug.tsx                # Debug screen
│  │  └─ SubscribedApp.tsx        # App shell
│  ├─ components/                 # Reusable UI components
│  │  ├─ Queue/                   # Queue-related components
│  │  ├─ Solutions/               # Solution-related components
│  │  ├─ Settings/                # Settings UI
│  │  ├─ shared/                  # Shared UI elements
│  │  └─ ui/                      # Base UI primitives
│  ├─ contexts/                   # React context providers
│  ├─ types/                      # TypeScript shared types
│  ├─ App.tsx                     # Root app component
│  ├─ main.tsx                    # React entry point
│  └─ index.css                   # Global styles
├─ package.json                   # Scripts and dependencies
├─ vite.config.ts                 # Vite config
├─ tsconfig.json                  # TypeScript config
├─ .gitignore                     # Git ignore rules
└─ README.md                      # Project documentation
```

---

## Project Structure Summary

If you are new to the codebase, this is the easiest mental model:

- `src/` is the visible app
- `electron/` is the desktop brain
- `ollamaService.ts` is the AI connector
- `ProcessingHelper.ts` is the workflow engine
- `ConfigHelper.ts` is the settings manager
- `ScreenshotHelper.ts` is the image queue and screenshot manager

---

## Configuration

Settings are stored locally in your app-data folder.

### Config locations

| Platform | Path |
| --- | --- |
| Windows | `%APPDATA%\interview-coder-v1\config.json` |
| macOS | `~/Library/Application Support/interview-coder-v1/config.json` |
| Linux | `~/.config/interview-coder-v1/config.json` |

### Current config format

```json
{
  "modelProvider": "ollama",
  "extractionModel": "llava",
  "solutionModel": "qwen2.5-coder",
  "validationModel": "qwen2.5-coder",
  "language": "python",
  "opacity": 1,
  "invisibilityEnabled": false,
  "mousePassthroughEnabled": false
}
```

### What each setting means

| Key | Meaning |
| --- | --- |
| `modelProvider` | AI backend provider, currently Ollama |
| `extractionModel` | Vision model used to read screenshots |
| `solutionModel` | Coding model used for first-pass generation |
| `validationModel` | Coding model used for second-pass validation |
| `language` | Preferred output language |
| `opacity` | Window transparency |
| `invisibilityEnabled` | Whether invisibility mode is enabled |
| `mousePassthroughEnabled` | Whether clicks pass through the overlay |

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the app in development mode |
| `npm run start` | Start with the current dev-style startup flow |
| `npm run build` | Build renderer and Electron bundles |
| `npm run run-prod` | Run the built app locally |
| `npm run lint` | Run ESLint |
| `npm run package` | Build and package the app |
| `npm run package-win` | Package for Windows |
| `npm run package-mac` | Package for macOS |

---

## Troubleshooting

## 1. Screenshot upload fails

Check that your extraction model is a vision model:

```json
{
  "extractionModel": "llava"
}
```

Then verify Ollama:

```bash
ollama list
curl http://127.0.0.1:11434/api/tags
```

## 2. Model not found

Make sure the model name exactly matches `ollama list`.

Examples:

- `llava`
- `llama3.2-vision`
- `qwen2.5-coder`
- `deepseek-r1:1.5b`

## 3. The window seems invisible

Try:

- `Ctrl + B` or `Cmd + B`
- `Ctrl + ]` or `Cmd + ]`
- setting `"invisibilityEnabled": false` in the config file

## 4. Solution generation fails

Test the coding model directly:

```bash
ollama run qwen2.5-coder
```

If that fails, the issue is on the Ollama/model side rather than the UI.

## 5. Settings do not stick

Inspect the config file in the app-data folder. If needed, delete it and restart the app so a fresh config is created.

---

## Privacy

Interview Coder is built around local processing.

- no cloud inference by default
- no API key requirement
- no account required
- screenshots and prompts stay on your machine unless you choose otherwise

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop app | Electron |
| UI | React, TypeScript, Tailwind CSS |
| Data/state | React Query |
| AI backend | Ollama |
| Build tooling | Vite, Electron Builder |

---

## Contributing

Contributions are welcome.

### Typical contribution flow

1. Fork the repository.
2. Create a branch.
3. Make changes.
4. Run `npm run lint`.
5. Open a pull request.

When reporting a bug, please include:

- operating system
- Ollama version
- installed models from `ollama list`
- relevant config
- exact error message

Repository:

```text
https://github.com/aadidevj007/Interview_coder
```

---

## License

This project is licensed under `AGPL-3.0-or-later`.

See the repository license files for full details.

---

<div align="center">
  <strong>Interview Coder is designed to feel local, elegant, and easy to understand.</strong><br />
  If this project helps you, consider starring the repository.
</div>
