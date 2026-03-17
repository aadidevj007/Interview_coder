import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog"
import { Button } from "../ui/button"
import { useToast } from "../../contexts/toast"

type AIModel = {
  id: string
  name: string
  description: string
}

type ModelCategory = {
  key: "extractionModel" | "solutionModel" | "debuggingModel"
  title: string
  description: string
}

type Config = {
  modelProvider?: string
  extractionModel?: string
  solutionModel?: string
  debuggingModel?: string
  invisibilityEnabled?: boolean
  mousePassthroughEnabled?: boolean
}

const MODELS: AIModel[] = [
  {
    id: "qwen2.5-coder",
    name: "qwen2.5-coder",
    description: "Default local coding model for the best overall balance."
  },
  {
    id: "deepseek-r1",
    name: "deepseek-r1",
    description: "Standard primary reasoning model (R1)."
  },
  {
    id: "deepseek-r1:8b",
    name: "deepseek-r1:8b",
    description: "Medium-sized reasoning model for strong execution."
  },
  {
    id: "deepseek-r1:1.5b",
    name: "deepseek-r1:1.5b",
    description: "Smaller alternative model for lightweight local runs."
  },
  {
    id: "llama3.2-vision",
    name: "llama3.2-vision",
    description: "Recommended vision model. Required for problem extraction."
  },
  {
    id: "llava",
    name: "llava",
    description: "Alternative vision model for screenshot analysis."
  }
]

const MODEL_CATEGORIES: ModelCategory[] = [
  {
    key: "extractionModel",
    title: "Problem Extraction",
    description: "Used to analyze screenshots and extract problem details."
  },
  {
    key: "solutionModel",
    title: "Solution Generation",
    description: "Used to generate the interview solution."
  },
  {
    key: "debuggingModel",
    title: "Debugging",
    description: "Used to debug and improve the generated solution."
  }
]

interface SettingsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SettingsDialog({
  open: externalOpen,
  onOpenChange
}: SettingsDialogProps) {
  const [open, setOpen] = useState(externalOpen || false)
  const [modelProvider, setModelProvider] = useState("ollama")
  const [extractionModel, setExtractionModel] = useState("qwen2.5-coder")
  const [solutionModel, setSolutionModel] = useState("qwen2.5-coder")
  const [debuggingModel, setDebuggingModel] = useState("qwen2.5-coder")
  const [invisibilityEnabled, setInvisibilityEnabled] = useState(true)
  const [mousePassthroughEnabled, setMousePassthroughEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen)
    }
  }, [externalOpen])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (onOpenChange && newOpen !== externalOpen) {
      onOpenChange(newOpen)
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }

    setIsLoading(true)
    window.electronAPI
      .getConfig()
      .then((config: Config) => {
        setModelProvider(config.modelProvider || "ollama")
        setExtractionModel(config.extractionModel || "qwen2.5-coder")
        setSolutionModel(config.solutionModel || "qwen2.5-coder")
        setDebuggingModel(config.debuggingModel || "qwen2.5-coder")
        setInvisibilityEnabled(config.invisibilityEnabled !== false)
        setMousePassthroughEnabled(config.mousePassthroughEnabled !== false)
      })
      .catch((error: unknown) => {
        console.error("Failed to load config:", error)
        showToast("Error", "Failed to load settings", "error")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [open, showToast])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await window.electronAPI.updateConfig({
        modelProvider: "ollama",
        extractionModel,
        solutionModel,
        debuggingModel,
        invisibilityEnabled,
        mousePassthroughEnabled
      })

      showToast("Success", "Settings saved successfully", "success")
      handleOpenChange(false)
    } catch (error) {
      console.error("Failed to save settings:", error)
      showToast("Error", "Failed to save settings", "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-black border border-white/10 text-white settings-dialog"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(450px, 90vw)",
          height: "auto",
          minHeight: "400px",
          maxHeight: "90vh",
          overflowY: "auto",
          zIndex: 9999,
          margin: 0,
          padding: "20px",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          animation: "fadeIn 0.25s ease forwards",
          opacity: 0.98
        }}
      >
        <DialogHeader>
          <DialogTitle>Model Settings</DialogTitle>
          <DialogDescription className="text-white/70">
            Interview Coder runs locally through Ollama at
            {" "}`http://localhost:11434`. No API key is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Provider</label>
            <div className="p-3 rounded-lg bg-white/10 border border-white/20">
              <p className="font-medium text-white text-sm">Ollama</p>
              <p className="text-xs text-white/60">
                Local provider running fully offline on your machine.
              </p>
              <p className="text-xs text-white/50 mt-2">
                Active provider: {modelProvider}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Invisibility Mode
            </label>
            <button
              type="button"
              onClick={() => setInvisibilityEnabled((value) => !value)}
              className={`w-full p-3 rounded-lg border text-left transition-colors ${
                invisibilityEnabled
                  ? "bg-white/10 border-white/20"
                  : "bg-black/30 border-white/5 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white text-sm">
                    {invisibilityEnabled ? "Enabled" : "Disabled"}
                  </p>
                  <p className="text-xs text-white/60">
                    Controls Electron content protection. Shortcut:
                    {" "}`Ctrl+Shift+I` / `Cmd+Shift+I`
                  </p>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    invisibilityEnabled ? "bg-emerald-400" : "bg-white/20"
                  }`}
                />
              </div>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Mouse Passthrough
            </label>
            <button
              type="button"
              onClick={() => setMousePassthroughEnabled((value) => !value)}
              className={`w-full p-3 rounded-lg border text-left transition-colors ${
                mousePassthroughEnabled
                  ? "bg-white/10 border-white/20"
                  : "bg-black/30 border-white/5 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white text-sm">
                    {mousePassthroughEnabled ? "Enabled" : "Disabled"}
                  </p>
                  <p className="text-xs text-white/60">
                    When enabled, clicks pass through the overlay to the app underneath.
                    Shortcut: {" "}`Ctrl+Shift+M` / `Cmd+Shift+M`
                  </p>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    mousePassthroughEnabled ? "bg-emerald-400" : "bg-white/20"
                  }`}
                />
              </div>
            </button>
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-white mb-2 block">
              Keyboard Shortcuts
            </label>
            <div className="bg-black/30 border border-white/10 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div className="text-white/70">Toggle Visibility</div>
                <div className="text-white/90 font-mono">Ctrl+B / Cmd+B</div>
                <div className="text-white/70">Take Screenshot</div>
                <div className="text-white/90 font-mono">Ctrl+H / Cmd+H</div>
                <div className="text-white/70">Process Screenshots</div>
                <div className="text-white/90 font-mono">Ctrl+Enter / Cmd+Enter</div>
                <div className="text-white/70">Delete Last Screenshot</div>
                <div className="text-white/90 font-mono">Ctrl+L / Cmd+L</div>
                <div className="text-white/70">Reset View</div>
                <div className="text-white/90 font-mono">Ctrl+R / Cmd+R</div>
                <div className="text-white/70">Quit Application</div>
                <div className="text-white/90 font-mono">Ctrl+Q / Cmd+Q</div>
                <div className="text-white/70">Toggle Invisibility</div>
                <div className="text-white/90 font-mono">Ctrl+Shift+I / Cmd+Shift+I</div>
                <div className="text-white/70">Toggle Mouse Passthrough</div>
                <div className="text-white/90 font-mono">Ctrl+Shift+M / Cmd+Shift+M</div>
                <div className="text-white/70">Move Window</div>
                <div className="text-white/90 font-mono">Ctrl+Arrow Keys</div>
                <div className="text-white/70">Decrease Opacity</div>
                <div className="text-white/90 font-mono">Ctrl+[ / Cmd+[</div>
                <div className="text-white/70">Increase Opacity</div>
                <div className="text-white/90 font-mono">Ctrl+] / Cmd+]</div>
                <div className="text-white/70">Zoom Out</div>
                <div className="text-white/90 font-mono">Ctrl+- / Cmd+-</div>
                <div className="text-white/70">Reset Zoom</div>
                <div className="text-white/90 font-mono">Ctrl+0 / Cmd+0</div>
                <div className="text-white/70">Zoom In</div>
                <div className="text-white/90 font-mono">Ctrl+= / Cmd+=</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mt-4">
            <label className="text-sm font-medium text-white">
              Ollama Model Selection
            </label>
            <p className="text-xs text-white/60 -mt-3 mb-2">
              Choose which local model powers each processing stage.
            </p>

            {MODEL_CATEGORIES.map((category) => {
              const currentValue =
                category.key === "extractionModel"
                  ? extractionModel
                  : category.key === "solutionModel"
                    ? solutionModel
                    : debuggingModel

              const setValue =
                category.key === "extractionModel"
                  ? setExtractionModel
                  : category.key === "solutionModel"
                    ? setSolutionModel
                    : setDebuggingModel

              return (
                <div key={category.key} className="mb-4">
                  <label className="text-sm font-medium text-white mb-1 block">
                    {category.title}
                  </label>
                  <p className="text-xs text-white/60 mb-2">
                    {category.description}
                  </p>

                  <div className="space-y-2">
                    {MODELS.map((model) => (
                      <div
                        key={model.id}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${
                          currentValue === model.id
                            ? "bg-white/10 border border-white/20"
                            : "bg-black/30 border border-white/5 hover:bg-white/5"
                        }`}
                        onClick={() => setValue(model.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              currentValue === model.id
                                ? "bg-white"
                                : "bg-white/20"
                            }`}
                          />
                          <div>
                            <p className="font-medium text-white text-xs">
                              {model.name}
                            </p>
                            <p className="text-xs text-white/60">
                              {model.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-white/10 hover:bg-white/5 text-white"
          >
            Cancel
          </Button>
          <Button
            className="px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
