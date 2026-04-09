import React, { useEffect, useRef, useState } from "react"
import { useToast } from "../../contexts/toast"
import { LanguageSelector } from "../shared/LanguageSelector"
import { COMMAND_KEY } from "../../utils/platform"
import { Screenshot } from "../../types/screenshots"

export interface SolutionCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  isProcessing: boolean
  screenshots?: Screenshot[]
  extraScreenshots?: Screenshot[]
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
}

async function uploadFileWithFormData(file: File) {
  const formData = new FormData()
  formData.append("screenshot", file)
  const screenshotEntry = formData.get("screenshot")

  if (!(screenshotEntry instanceof File)) {
    throw new Error("Failed to prepare screenshot upload.")
  }

  const buffer = await screenshotEntry.arrayBuffer()
  return window.electronAPI.uploadScreenshotBuffer({
    data: new Uint8Array(buffer),
    name: screenshotEntry.name
  })
}

const SolutionCommands: React.FC<SolutionCommandsProps> = ({
  onTooltipVisibilityChange,
  isProcessing,
  extraScreenshots = [],
  currentLanguage,
  setLanguage
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    const tooltipHeight =
      isTooltipVisible && tooltipRef.current
        ? tooltipRef.current.offsetHeight + 10
        : 0

    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
  }, [isTooltipVisible, onTooltipVisibilityChange])

  const handleUploadFromInput = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    try {
      const result = await uploadFileWithFormData(file)
      if (!result.success) {
        showToast("Error", result.error || "Failed to upload screenshot", "error")
      }
    } catch (error) {
      console.error("Error uploading screenshot:", error)
      showToast("Error", "Failed to upload screenshot", "error")
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/bmp,image/gif,image/avif,.jfif"
        className="hidden"
        onChange={handleUploadFromInput}
      />

      <div className="pt-2 w-fit">
        <div className="flex items-center justify-center gap-4 rounded-lg bg-black/60 px-4 py-2 text-xs text-white/90 backdrop-blur-md">
          <div
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-white/10"
            onClick={async () => {
              try {
                const result = await window.electronAPI.toggleMainWindow()
                if (!result.success) {
                  showToast("Error", "Failed to toggle window", "error")
                }
              } catch {
                showToast("Error", "Failed to toggle window", "error")
              }
            }}
          >
            <span className="text-[11px] leading-none">Show/Hide</span>
            <div className="flex gap-1">
              <button className="rounded-md bg-white/10 px-1.5 py-1 text-[11px] leading-none text-white/70">
                {COMMAND_KEY}
              </button>
              <button className="rounded-md bg-white/10 px-1.5 py-1 text-[11px] leading-none text-white/70">
                B
              </button>
            </div>
          </div>

          {!isProcessing && (
            <>
              <div
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-white/10"
                onClick={async () => {
                  try {
                    const result = await window.electronAPI.triggerScreenshot()
                    if (!result.success) {
                      showToast("Error", "Failed to take screenshot", "error")
                    }
                  } catch {
                    showToast("Error", "Failed to take screenshot", "error")
                  }
                }}
              >
                <span className="text-[11px] leading-none">
                  {extraScreenshots.length === 0 ? "Screenshot your code" : "Screenshot"}
                </span>
                <div className="flex gap-1">
                  <button className="rounded-md bg-white/10 px-1.5 py-1 text-[11px] leading-none text-white/70">
                    {COMMAND_KEY}
                  </button>
                  <button className="rounded-md bg-white/10 px-1.5 py-1 text-[11px] leading-none text-white/70">
                    H
                  </button>
                </div>
              </div>

              <div
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-white/10"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-[11px] leading-none">Upload screenshot</span>
                <div className="flex gap-1">
                  <button className="rounded-md bg-white/10 px-1.5 py-1 text-[11px] leading-none text-white/70">
                    {COMMAND_KEY}
                  </button>
                  <button className="rounded-md bg-white/10 px-1.5 py-1 text-[11px] leading-none text-white/70">
                    U
                  </button>
                </div>
              </div>

              {extraScreenshots.length > 0 && (
                <div
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-white/10"
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI.triggerProcessScreenshots()
                      if (!result.success) {
                        showToast("Error", "Failed to process screenshots", "error")
                      }
                    } catch {
                      showToast("Error", "Failed to process screenshots", "error")
                    }
                  }}
                >
                  <span className="text-[11px] leading-none">Debug</span>
                  <div className="flex gap-1">
                    <button className="rounded-md bg-white/10 px-1.5 py-1 text-[11px] leading-none text-white/70">
                      {COMMAND_KEY}
                    </button>
                    <button className="rounded-md bg-white/10 px-1.5 py-1 text-[11px] leading-none text-white/70">
                      ↵
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-white/10"
            onClick={async () => {
              try {
                const result = await window.electronAPI.triggerReset()
                if (!result.success) {
                  showToast("Error", "Failed to reset", "error")
                }
              } catch {
                showToast("Error", "Failed to reset", "error")
              }
            }}
          >
            <span className="text-[11px] leading-none">Start Over</span>
            <div className="flex gap-1">
              <button className="rounded-md bg-white/10 px-1.5 py-1 text-[11px] leading-none text-white/70">
                {COMMAND_KEY}
              </button>
              <button className="rounded-md bg-white/10 px-1.5 py-1 text-[11px] leading-none text-white/70">
                R
              </button>
            </div>
          </div>

          <div className="mx-2 h-4 w-px bg-white/20" />

          <div
            className="relative inline-block"
            onMouseEnter={() => setIsTooltipVisible(true)}
            onMouseLeave={() => setIsTooltipVisible(false)}
          >
            <div className="flex h-4 w-4 cursor-pointer items-center justify-center text-white/70 transition-colors hover:text-white/90">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>

            {isTooltipVisible && (
              <div ref={tooltipRef} className="absolute top-full right-0 z-[100] mt-2 w-80">
                <div className="rounded-lg border border-white/10 bg-black/80 p-3 text-xs text-white/90 shadow-lg backdrop-blur-md">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[11px] text-white/70">Invisibility Mode</span>
                      <button
                        className="rounded bg-white/10 px-2 py-1 text-[11px]"
                        onClick={() => window.electronAPI.toggleInvisibilityMode()}
                      >
                        Toggle
                      </button>
                    </div>

                    <div className="flex items-center justify-between px-2">
                      <span className="text-[11px] text-white/70">Mouse Passthrough</span>
                      <button
                        className="rounded bg-white/10 px-2 py-1 text-[11px]"
                        onClick={() => window.electronAPI.toggleMousePassthroughMode()}
                      >
                        Toggle
                      </button>
                    </div>

                    <LanguageSelector
                      currentLanguage={currentLanguage}
                      setLanguage={setLanguage}
                    />

                    <div className="flex items-center justify-between px-2">
                      <span className="text-[11px] text-white/70">Ollama Settings</span>
                      <button
                        className="rounded bg-white/10 px-2 py-1 text-[11px]"
                        onClick={() => window.electronAPI.openSettingsPortal()}
                      >
                        Open
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        localStorage.clear()
                        sessionStorage.clear()
                        showToast("Success", "Local session cleared", "success")
                      }}
                      className="w-full px-2 text-left text-[11px] text-red-400 transition-colors hover:text-red-300"
                    >
                      Clear Local Session
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SolutionCommands
