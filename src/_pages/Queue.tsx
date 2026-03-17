import React, { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import QueueCommands from "../components/Queue/QueueCommands"

import { useToast } from "../contexts/toast"
import { Screenshot } from "../types/screenshots"

async function fetchScreenshots(): Promise<Screenshot[]> {
  try {
    const existing = await window.electronAPI.getScreenshots()
    return existing
  } catch (error) {
    console.error("Error loading screenshots:", error)
    throw error
  }
}

interface QueueProps {
  setView: (view: "queue" | "solutions" | "debug") => void
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
}

const Queue: React.FC<QueueProps> = ({
  setView,
  credits,
  currentLanguage,
  setLanguage
}) => {
  const { showToast } = useToast()

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  const {
    data: screenshots = [],
    isLoading,
    refetch
  } = useQuery<Screenshot[]>({
    queryKey: ["screenshots"],
    queryFn: fetchScreenshots,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false
  })

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch() // Refetch screenshots instead of managing state directly
      } else {
        console.error("Failed to delete screenshot:", response.error)
        showToast("Error", "Failed to delete the screenshot file", "error")
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error)
    }
  }

  useEffect(() => {
    // Height update logic
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    // Initialize resize observer
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onDeleteLastScreenshot(async () => {
        if (screenshots.length > 0) {
          const lastScreenshot = screenshots[screenshots.length - 1];
          await handleDeleteScreenshot(screenshots.length - 1);
          // Toast removed as requested
        } else {
          showToast("No Screenshots", "There are no screenshots to delete", "neutral");
        }
      }),
      window.electronAPI.onSolutionError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your screenshots.",
          "error"
        )
        setView("queue") // Revert to queue if processing fails
        console.error("Processing error:", error)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no screenshots to process.",
          "neutral"
        )
      }),
      // Removed out of credits handler - unlimited credits in this version
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [isTooltipVisible, tooltipHeight, screenshots])
  const [textQuery, setTextQuery] = useState("")
  const [isProcessingText, setIsProcessingText] = useState(false)

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  const handleOpenSettings = () => {
    window.electronAPI.openSettingsPortal();
  };

  const handleTextSubmit = async () => {
    const query = textQuery.trim()
    if (!query) {
      showToast("Query Required", "Please type or dictate a question.", "neutral")
      return
    }

    setIsProcessingText(true)
    try {
      const result = await window.electronAPI.triggerProcessTextQuery(query)
      if (!result.success) {
        showToast("Error", "Failed to process question", "error")
        setIsProcessingText(false)
      }
      // If success, ProcessingHelper handles the rest and navigation to solutions.
    } catch (error) {
      console.error("Error processing text query:", error)
      showToast("Error", "Failed to process question", "error")
      setIsProcessingText(false)
    }
  }  
  return (
    <div ref={contentRef} className={`bg-transparent w-full md:w-1/2`}>
      <div className="px-4 py-3">
        <div className="space-y-3 w-fit">
          <ScreenshotQueue
            isLoading={false}
            screenshots={screenshots}
            onDeleteScreenshot={handleDeleteScreenshot}
          />

          <QueueCommands
            onTooltipVisibilityChange={handleTooltipVisibilityChange}
            screenshotCount={screenshots.length}
            credits={credits}
            currentLanguage={currentLanguage}
            setLanguage={setLanguage}
          />

          {screenshots.length === 0 && (
            <div className="mt-4 bg-black/60 rounded-md p-3 space-y-3 w-[min(calc(100vw-2rem),28rem)]">
              <p className="text-xs text-white/60">
                Or ask a question directly via text or voice.
              </p>
              <textarea
                value={textQuery}
                onChange={(event) => setTextQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    handleTextSubmit()
                  }
                }}
                placeholder="Example: How do you reverse a string?"
                className="w-full min-h-20 rounded-md bg-black/40 border border-white/10 text-white text-sm p-3 resize-y outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleTextSubmit}
                  disabled={isProcessingText}
                  className="px-3 py-2 rounded-md bg-white text-black text-xs font-medium hover:bg-white/90 disabled:opacity-60"
                >
                  {isProcessingText ? "Thinking..." : "Ask"}
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
