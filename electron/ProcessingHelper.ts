import fs from "node:fs"
import { BrowserWindow } from "electron"
import { configHelper } from "./ConfigHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import {
  ollamaService,
  OllamaProblemExtraction,
  OllamaSolutionResult
} from "./ollamaService"

const NON_CODING_MESSAGE = "This system only supports coding-related queries."

type ScreenshotPayload = {
  path: string
  preview: string
  data: string
}

export class ProcessingHelper {
  private deps: IProcessingHelperDeps
  private screenshotHelper: ScreenshotHelper
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    const screenshotHelper = deps.getScreenshotHelper()
    if (!screenshotHelper) {
      throw new Error("Screenshot helper not initialized")
    }

    this.screenshotHelper = screenshotHelper
  }

  private async waitForInitialization(
    mainWindow: BrowserWindow
  ): Promise<void> {
    let attempts = 0

    while (attempts < 50) {
      const isInitialized = await mainWindow.webContents.executeJavaScript(
        "window.__IS_INITIALIZED__"
      )

      if (isInitialized) {
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts += 1
    }

    throw new Error("App failed to initialize after 5 seconds")
  }

  private async getLanguage(): Promise<string> {
    const config = configHelper.loadConfig()
    if (config.language) {
      return config.language
    }

    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) {
      return "python"
    }

    try {
      await this.waitForInitialization(mainWindow)
      const language = await mainWindow.webContents.executeJavaScript(
        "window.__LANGUAGE__"
      )
      return typeof language === "string" && language ? language : "python"
    } catch {
      return "python"
    }
  }

  private sendStatus(message: string, progress: number): void {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) {
      return
    }

    mainWindow.webContents.send("processing-status", { message, progress })
  }

  private buildCodingOnlyResponse(): OllamaSolutionResult {
    return {
      code: NON_CODING_MESSAGE,
      thoughts: ["The request was rejected because it is not programming-related."],
      time_complexity: "N/A",
      space_complexity: "N/A",
      raw: NON_CODING_MESSAGE,
      model: "local-guard"
    }
  }

  private async loadScreenshotPayloads(paths: string[]): Promise<ScreenshotPayload[]> {
    const screenshots = await Promise.all(
      paths.map(async (path) => {
        if (!fs.existsSync(path)) {
          return null
        }

        try {
          return {
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: fs.readFileSync(path).toString("base64")
          }
        } catch (error) {
          console.error(`Failed to load screenshot ${path}:`, error)
          return null
        }
      })
    )

    return screenshots.filter((item): item is ScreenshotPayload => item !== null)
  }

  private async runCodingPipeline(options: {
    query?: string
    screenshots?: ScreenshotPayload[]
    signal: AbortSignal
    additionalContext?: string
  }): Promise<{
    problem: OllamaProblemExtraction
    solution: OllamaSolutionResult
    validated: OllamaSolutionResult
  }> {
    const language = await this.getLanguage()
    const config = configHelper.loadConfig()

    if (options.query) {
      const classification = ollamaService.classifyInput(options.query)
      if (!classification.isCoding) {
        throw new Error(NON_CODING_MESSAGE)
      }
    }

    let problem: OllamaProblemExtraction
    if (options.screenshots && options.screenshots.length > 0) {
      this.sendStatus("Processing screenshots...", 20)
      problem = await ollamaService.extractProblem({
        model: config.extractionModel,
        images: options.screenshots.map((screenshot) => screenshot.data),
        preferredLanguage: language,
        signal: options.signal
      })

    } else if (options.query) {
      problem = {
        problem_statement: options.query,
        input_format: "",
        output_format: "",
        constraints: "Derived from direct user query.",
        example_input: "",
        example_output: ""
      }
    } else {
      throw new Error("No coding input was provided.")
    }

    this.sendStatus("Generating code...", 55)
    const solution = await ollamaService.generateCode({
      problem,
      userRequest: options.additionalContext || options.query,
      preferredLanguage: language,
      primaryModel: config.solutionModel,
      fallbackModel: config.validationModel,
      signal: options.signal
    })

    this.sendStatus("Validating code...", 80)
    let validated = solution
    try {
      validated = await ollamaService.validateCode({
        problem,
        candidate: solution,
        preferredLanguage: language,
        validationModel: config.validationModel,
        signal: options.signal
      })
    } catch (error) {
      console.warn("Validation pass failed, returning generated solution:", error)
    }

    return { problem, solution, validated }
  }

  public async processScreenshots(): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) {
      return
    }

    if (this.deps.getView() === "queue") {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)

      const screenshotQueue = this.screenshotHelper
        .getScreenshotQueue()
        .filter((path) => fs.existsSync(path))

      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      this.currentProcessingAbortController = new AbortController()

      try {
        const screenshots = await this.loadScreenshotPayloads(screenshotQueue)
        if (screenshots.length === 0) {
          throw new Error("No readable screenshots were found.")
        }

        const result = await this.runCodingPipeline({
          screenshots,
          signal: this.currentProcessingAbortController.signal
        })

        this.deps.setProblemInfo(result.problem)
        this.deps.setLatestSolution(result.validated)
        this.screenshotHelper.clearExtraScreenshotQueue()

        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
          result.problem
        )
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          result.validated
        )
        this.sendStatus("Done.", 100)
        this.deps.setView("solutions")
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to process screenshots."

        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
          message
        )
        this.deps.setView("queue")
      } finally {
        this.currentProcessingAbortController = null
      }

      return
    }

    const extraQueue = this.screenshotHelper
      .getExtraScreenshotQueue()
      .filter((path) => fs.existsSync(path))

    if (extraQueue.length === 0) {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
      return
    }

    this.currentExtraProcessingAbortController = new AbortController()
    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START)

    try {
      const allScreenshots = await this.loadScreenshotPayloads([
        ...this.screenshotHelper.getScreenshotQueue(),
        ...extraQueue
      ])

      const result = await this.runCodingPipeline({
        screenshots: allScreenshots,
        signal: this.currentExtraProcessingAbortController.signal,
        additionalContext:
          "These screenshots include additional code, failing cases, or debugging clues. Incorporate them into the fix."
      })

      const debugResponse = {
        ...result.validated,
        debug_analysis: result.validated.thoughts.join("\n"),
        source_model: result.validated.model
      }

      this.deps.setHasDebugged(true)
      this.deps.setLatestSolution(result.validated)
      mainWindow.webContents.send(
        this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS,
        debugResponse
      )
      this.sendStatus("Done.", 100)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process debug screenshots."

      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, message)
    } finally {
      this.currentExtraProcessingAbortController = null
    }
  }

  public cancelOngoingRequests(): void {
    this.currentProcessingAbortController?.abort()
    this.currentExtraProcessingAbortController?.abort()
    this.currentProcessingAbortController = null
    this.currentExtraProcessingAbortController = null

    this.deps.setHasDebugged(false)
    this.deps.setProblemInfo(null)
    this.deps.setLatestSolution(null)

    const mainWindow = this.deps.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
    }
  }

  public async answerInterviewQuestion(payload: {
    question: string
    solutionCode?: string
    thoughts?: string[]
  }): Promise<{ success: boolean; answer?: string; error?: string }> {
    try {
      const question = payload.question?.trim()
      if (!question) {
        return { success: false, error: "Question cannot be empty." }
      }

      const classification = ollamaService.classifyInput(question)
      if (!classification.isCoding) {
        return { success: true, answer: NON_CODING_MESSAGE }
      }

      const problemInfo = this.deps.getProblemInfo()
      if (!problemInfo) {
        return {
          success: false,
          error: "No active problem found. Generate a solution before asking follow-up questions."
        }
      }

      const latestSolution = this.deps.getLatestSolution()
      const language = await this.getLanguage()
      const config = configHelper.loadConfig()

      const prompt = `Answer the follow-up coding question based on the active problem and code.
Be concise and interview-ready.

Problem statement:
${problemInfo.problem_statement}

Constraints:
${problemInfo.constraints || "Not provided."}

Current code:
${payload.solutionCode || latestSolution?.code || "Not available."}

Current notes:
${(payload.thoughts || latestSolution?.thoughts || []).join("\n")}

Question:
${question}

Format:
### Direct Answer
### Talking Points
### If Asked For Code Changes`

      const answer = await ollamaService.chat({
        model: config.solutionModel,
        prompt
      })

      return { success: true, answer: answer.content }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to answer interviewer question."
      }
    }
  }

  public async processTextQuery(
    rawQuery: string
  ): Promise<{ success: boolean; data?: OllamaSolutionResult; error?: string }> {
    const query = rawQuery.trim()
    const mainWindow = this.deps.getMainWindow()

    if (!query) {
      return { success: false, error: "Question cannot be empty." }
    }

    try {
      mainWindow?.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)

      const classification = ollamaService.classifyInput(query)
      if (!classification.isCoding) {
        const response = this.buildCodingOnlyResponse()
        const problem = {
          problem_statement: query,
          input_format: "",
          output_format: "",
          constraints: "Rejected because the query is not coding-related.",
          example_input: "",
          example_output: ""
        }

        this.deps.setProblemInfo(problem)
        this.deps.setLatestSolution(response)
        mainWindow?.webContents.send(
          this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
          problem
        )
        mainWindow?.webContents.send(
          this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          response
        )
        this.deps.setView("solutions")
        return { success: true, data: response }
      }

      const controller = new AbortController()
      const result = await this.runCodingPipeline({
        query,
        signal: controller.signal
      })

      this.deps.setProblemInfo(result.problem)
      this.deps.setLatestSolution(result.validated)
      mainWindow?.webContents.send(
        this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
        result.problem
      )
      mainWindow?.webContents.send(
        this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
        result.validated
      )
      this.sendStatus("Done.", 100)
      this.deps.setView("solutions")

      return { success: true, data: result.validated }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process text query."

      mainWindow?.webContents.send(
        this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
        message
      )
      this.deps.setView("queue")
      return { success: false, error: message }
    }
  }
}
