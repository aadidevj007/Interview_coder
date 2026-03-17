interface Window {
  __IS_INITIALIZED__: boolean
  __CREDITS__: number
  __LANGUAGE__: string
  __AUTH_TOKEN__: string | null
  supabase: any // Replace with proper Supabase client type if needed
  electron: any // Replace with proper Electron type if needed
  electronAPI: { // Replace with proper Electron API type if needed
    deleteScreenshot: (
      path: string
    ) => Promise<{ success: boolean; error?: string }>
    triggerProcessScreenshots: () => Promise<{
      success: boolean
      error?: string
    }>
    triggerProcessTextQuery: (
      query: string
    ) => Promise<{ success: boolean; error?: string }>
    triggerReset: () => Promise<{ success: boolean; error?: string }>
    askInterviewerQuestion: (payload: {
      question: string
      solutionCode?: string
    }) => Promise<{ success: boolean; error?: string }>
  }
}
