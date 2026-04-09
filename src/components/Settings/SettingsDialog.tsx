import { useEffect, useMemo, useState } from "react"
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

type ModelCategory = {
  key: "extractionModel" | "solutionModel" | "validationModel"
  title: string
  description: string
  options: Array<{
    id: string
    name: string
    description: string
  }>
}

type SettingsForm = {
  modelProvider: string
  extractionModel: string
  solutionModel: string
  validationModel: string
  invisibilityEnabled: boolean
  mousePassthroughEnabled: boolean
}

const MODEL_CATEGORIES: ModelCategory[] = [
  {
    key: "extractionModel",
    title: "Screenshot Extraction",
    description: "Vision model used to read the uploaded or captured problem screenshots.",
    options: [
      {
        id: "llava",
        name: "llava",
        description: "Default vision model for extracting coding problem details."
      },
      {
        id: "llama3.2-vision",
        name: "llama3.2-vision",
        description: "Alternative local vision model for screenshot understanding."
      }
    ]
  },
  {
    key: "solutionModel",
    title: "Code Generation",
    description: "Primary coding model for the first draft of the solution.",
    options: [
      {
        id: "qwen2.5-coder",
        name: "qwen2.5-coder",
        description: "Recommended primary model for coding-focused generation."
      }
    ]
  },
  {
    key: "validationModel",
    title: "Code Validation",
    description: "Second-pass coding model that checks and fixes the generated code.",
    options: [
      {
        id: "qwen2.5-coder",
        name: "qwen2.5-coder",
        description: "Use the same installed coding model for the validation pass."
      }
    ]
  }
]

interface SettingsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const DEFAULT_FORM: SettingsForm = {
  modelProvider: "ollama",
  extractionModel: "llava",
  solutionModel: "qwen2.5-coder",
  validationModel: "qwen2.5-coder",
  invisibilityEnabled: true,
  mousePassthroughEnabled: false
}

export function SettingsDialog({
  open = false,
  onOpenChange
}: SettingsDialogProps) {
  const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM)
  const [isLoading, setIsLoading] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    setIsLoading(true)

    window.electronAPI
      .getConfig()
      .then((config) => {
        if (cancelled) {
          return
        }

        setForm({
          modelProvider: config.modelProvider || "ollama",
          extractionModel: config.extractionModel || "llava",
          solutionModel: config.solutionModel || "qwen2.5-coder",
          validationModel: config.validationModel || "qwen2.5-coder",
          invisibilityEnabled: config.invisibilityEnabled !== false,
          mousePassthroughEnabled: config.mousePassthroughEnabled === true
        })
      })
      .catch((error) => {
        console.error("Failed to load config:", error)
        showToast("Error", "Failed to load settings", "error")
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, showToast])

  const modelDescriptions = useMemo(() => {
    const descriptions = new Map<string, string>()
    for (const category of MODEL_CATEGORIES) {
      for (const option of category.options) {
        descriptions.set(option.id, option.description)
      }
    }
    return descriptions
  }, [])

  const updateForm = <K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await window.electronAPI.updateConfig(form)
      showToast("Success", "Settings saved successfully", "success")
      onOpenChange?.(false)
    } catch (error) {
      console.error("Failed to save settings:", error)
      showToast("Error", "Failed to save settings", "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-white/10 bg-black text-white">
        <DialogHeader>
          <DialogTitle>Ollama Pipeline Settings</DialogTitle>
          <DialogDescription className="text-white/70">
            The app runs fully locally and uses a coding-only Ollama pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-medium text-white">Provider</p>
            <p className="mt-1 text-xs text-white/60">
              Active provider: {form.modelProvider}. No cloud API keys are used.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-white">
              Invisibility Mode
            </label>
            <button
              type="button"
              onClick={() =>
                updateForm("invisibilityEnabled", !form.invisibilityEnabled)
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-left"
            >
              <p className="text-xs text-white">
                {form.invisibilityEnabled ? "Enabled" : "Disabled"}
              </p>
              <p className="mt-1 text-[11px] text-white/60">
                Controls content protection for the overlay window.
              </p>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-white">
              Mouse Passthrough
            </label>
            <button
              type="button"
              onClick={() =>
                updateForm(
                  "mousePassthroughEnabled",
                  !form.mousePassthroughEnabled
                )
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-left"
            >
              <p className="text-xs text-white">
                {form.mousePassthroughEnabled ? "Enabled" : "Disabled"}
              </p>
              <p className="mt-1 text-[11px] text-white/60">
                Lets clicks pass through the overlay when needed.
              </p>
            </button>
          </div>

          {MODEL_CATEGORIES.map((category) => (
            <div key={category.key} className="space-y-2">
              <div>
                <label className="text-xs font-medium text-white">
                  {category.title}
                </label>
                <p className="mt-1 text-[11px] text-white/60">
                  {category.description}
                </p>
              </div>

              <select
                value={form[category.key]}
                onChange={(event) => updateForm(category.key, event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none"
              >
                {category.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white">Selected: {form[category.key]}</p>
                <p className="mt-1 text-[11px] text-white/60">
                  {modelDescriptions.get(form[category.key])}
                </p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="border-t border-white/10 pt-3">
          <Button
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5"
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-white text-black hover:bg-white/90"
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
