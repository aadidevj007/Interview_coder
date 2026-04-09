export interface ElectronAPI {
  // Original methods
  openSubscriptionPortal: (authData: {
    id: string
    email: string
  }) => Promise<{ success: boolean; error?: string }>
  updateContentDimensions: (dimensions: {
    width: number
    height: number
  }) => Promise<void>
  clearStore: () => Promise<{ success: boolean; error?: string }>
  getScreenshots: () => Promise<{
    path: string
    preview: string
  }[]>
  deleteScreenshot: (
    path: string
  ) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: any) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onProblemExtracted: (callback: (data: any) => void) => () => void
  onSolutionSuccess: (callback: (data: any) => void) => () => void
  onProcessingStatus: (
    callback: (data: { message: string; progress: number }) => void
  ) => () => void
  onUnauthorized: (callback: () => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  openExternal: (url: string) => void
  toggleMainWindow: () => Promise<{ success: boolean; error?: string }>
  triggerScreenshot: () => Promise<{ success: boolean; error?: string }>
  triggerProcessScreenshots: () => Promise<{ success: boolean; error?: string }>
  triggerProcessTextQuery: (query: string) => Promise<{ success: boolean; data?: any; error?: string }>
  uploadScreenshot: () => Promise<{ success: boolean; cancelled?: boolean; error?: string }>
  uploadScreenshotBuffer: (payload: {
    data: Uint8Array
    name?: string
  }) => Promise<{ success: boolean; path?: string; error?: string }>
  copyToClipboard: (text: string) => Promise<{ success: boolean; error?: string }>
  triggerReset: () => Promise<{ success: boolean; error?: string }>
  triggerMoveLeft: () => Promise<{ success: boolean; error?: string }>
  triggerMoveRight: () => Promise<{ success: boolean; error?: string }>
  triggerMoveUp: () => Promise<{ success: boolean; error?: string }>
  triggerMoveDown: () => Promise<{ success: boolean; error?: string }>
  onSubscriptionUpdated: (callback: () => void) => () => void
  onSubscriptionPortalClosed: (callback: () => void) => () => void
  startUpdate: () => Promise<{ success: boolean; error?: string }>
  installUpdate: () => void
  onUpdateAvailable: (callback: (info: any) => void) => () => void
  onUpdateDownloaded: (callback: (info: any) => void) => () => void

  decrementCredits: () => Promise<void>
  onCreditsUpdated: (callback: (credits: number) => void) => () => void
  onOutOfCredits: (callback: () => void) => () => void
  openSettingsPortal: () => Promise<void>
  getPlatform: () => string
  
  getConfig: () => Promise<{
    modelProvider: string
    extractionModel: string
    solutionModel: string
    validationModel: string
    language: string
    opacity: number
    invisibilityEnabled: boolean
    mousePassthroughEnabled: boolean
  }>
  updateConfig: (config: {
    modelProvider?: string
    extractionModel?: string
    solutionModel?: string
    validationModel?: string
    language?: string
    opacity?: number
    invisibilityEnabled?: boolean
    mousePassthroughEnabled?: boolean
  }) => Promise<unknown>
  openLink: (url: string) => void
  openExternal: (url: string) => void
  toggleInvisibilityMode: () => Promise<{ enabled: boolean }>
  getInvisibilityMode: () => Promise<{ enabled: boolean }>
  toggleMousePassthroughMode: () => Promise<{ enabled: boolean }>
  getMousePassthroughMode: () => Promise<{ enabled: boolean }>
  askInterviewerQuestion: (payload: {
    question: string
    solutionCode?: string
    thoughts?: string[]
  }) => Promise<{ success: boolean; answer?: string; error?: string } | undefined>
  removeListener: (eventName: string, callback: (...args: any[]) => void) => void
  onShowSettings: (callback: () => void) => () => void
  onDeleteLastScreenshot: (callback: () => void) => () => void
  onInvisibilityModeChanged: (callback: (enabled: boolean) => void) => () => void
  onMousePassthroughModeChanged: (callback: (enabled: boolean) => void) => () => void
  deleteLastScreenshot: () => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: any[]) => void) => void
        removeListener: (
          channel: string,
          func: (...args: any[]) => void
        ) => void
      }
    }
    __CREDITS__: number
    __LANGUAGE__: string
    __IS_INITIALIZED__: boolean
    __AUTH_TOKEN__?: string | null
  }
}
