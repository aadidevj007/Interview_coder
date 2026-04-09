import React, { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import QueueCommands from "../components/Queue/QueueCommands"
import { useToast } from "../contexts/toast"
import { Screenshot } from "../types/screenshots"

async function fetchScreenshots(): Promise<Screenshot[]> {
  return window.electronAPI.getScreenshots()
}

interface QueueProps {
  setView: (view: "queue" | "solutions" | "debug") => void
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
  isSettingsOpen: boolean
}

const Queue: React.FC<QueueProps> = ({
  setView,
  credits,
  currentLanguage,
  setLanguage,
  isSettingsOpen
}) => {
  const { showToast } = useToast()
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const [textQuery, setTextQuery] = useState("")
  const [isProcessingText, setIsProcessingText] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const contentRef = useRef<HTMLDivElement>(null)
  const screenshotCountRef = useRef(0)

  const { data: screenshots = [], refetch } = useQuery<Screenshot[]>({
    queryKey: ["screenshots"],
    queryFn: fetchScreenshots,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false
  })

  screenshotCountRef.current = screenshots.length

  useEffect(() => {
    if (isSettingsOpen) {
      return
    }

    const updateDimensions = () => {
      if (!contentRef.current) {
        return
      }

      let contentHeight = contentRef.current.scrollHeight
      if (isTooltipVisible) {
        contentHeight += tooltipHeight
      }

      window.electronAPI.updateContentDimensions({
        width: contentRef.current.scrollWidth,
        height: contentHeight
      })
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    return () => {
      resizeObserver.disconnect()
    }
  }, [isSettingsOpen, isTooltipVisible, tooltipHeight])

  useEffect(() => {
    const cleanups = [
      window.electronAPI.onScreenshotTaken(() => {
        void refetch()
      }),
      window.electronAPI.onResetView(() => {
        void refetch()
        setTextQuery("")
        setStatusMessage("")
        setIsProcessingText(false)
      }),
      window.electronAPI.onDeleteLastScreenshot(async () => {
        if (screenshotCountRef.current === 0) {
          showToast("No Screenshots", "There are no screenshots to delete", "neutral")
          return
        }

        await refetch()
      }),
      window.electronAPI.onSolutionError((error) => {
        setIsProcessingText(false)
        setStatusMessage("")
        showToast("Processing Failed", error, "error")
        setView("queue")
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        setIsProcessingText(false)
        setStatusMessage("")
        showToast("No Screenshots", "There are no screenshots to process.", "neutral")
      }),
      window.electronAPI.onProcessingStatus((data) => {
        setStatusMessage(data.message)
      }),
      window.electronAPI.onSolutionSuccess(() => {
        setIsProcessingText(false)
        setStatusMessage("")
      })
    ]

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [refetch, setView, showToast])

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]
    if (!screenshotToDelete) {
      return
    }

    try {
      const response = await window.electronAPI.deleteScreenshot(screenshotToDelete.path)
      if (response.success) {
        await refetch()
      } else {
        showToast("Error", "Failed to delete the screenshot file", "error")
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error)
      showToast("Error", "Failed to delete the screenshot file", "error")
    }
  }

  const handleTextSubmit = async () => {
    const query = textQuery.trim()
    if (!query) {
      showToast("Query Required", "Please type or dictate a question.", "neutral")
      return
    }

    setIsProcessingText(true)
    setStatusMessage("Processing...")

    try {
      const result = await window.electronAPI.triggerProcessTextQuery(query)
      if (!result.success) {
        setIsProcessingText(false)
        setStatusMessage("")
        showToast("Error", result.error || "Failed to process question", "error")
      }
    } catch (error) {
      console.error("Error processing text query:", error)
      setIsProcessingText(false)
      setStatusMessage("")
      showToast("Error", "Failed to process question", "error")
    }
  }

  return (
    <div ref={contentRef} className="w-full bg-transparent md:w-1/2">
      <div className="px-4 py-3">
        <div className="w-fit space-y-3">
          <ScreenshotQueue
            isLoading={isProcessingText}
            screenshots={screenshots}
            onDeleteScreenshot={handleDeleteScreenshot}
          />

          <QueueCommands
            onTooltipVisibilityChange={(visible, height) => {
              setIsTooltipVisible(visible)
              setTooltipHeight(height)
            }}
            screenshotCount={screenshots.length}
            credits={credits}
            currentLanguage={currentLanguage}
            setLanguage={setLanguage}
          />

          {(isProcessingText || statusMessage) && (
            <div className="rounded-md border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/70">
              {statusMessage || "Processing..."}
            </div>
          )}

          {screenshots.length === 0 && (
            <div className="mt-4 w-[min(calc(100vw-2rem),28rem)] space-y-3 rounded-md bg-black/60 p-3">
              <p className="text-xs text-white/60">
                Or ask a question directly via text.
              </p>
              <textarea
                value={textQuery}
                onChange={(event) => setTextQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void handleTextSubmit()
                  }
                }}
                placeholder="Example: Write a TypeScript binary search implementation."
                className="min-h-20 w-full resize-y rounded-md border border-white/10 bg-black/40 p-3 text-sm text-white outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleTextSubmit()}
                  disabled={isProcessingText}
                  className="rounded-md bg-white px-3 py-2 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-60"
                >
                  {isProcessingText ? "Generating code..." : "Ask"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Queue
