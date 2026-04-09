import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import { EventEmitter } from "events"

export const MODEL_PROVIDER = "ollama"

export const CODING_MODELS = ["qwen2.5-coder"] as const

export const VISION_MODELS = ["llava", "llama3.2-vision"] as const

const ALLOWED_MODELS = [...CODING_MODELS, ...VISION_MODELS] as const
const MODEL_MIGRATIONS: Record<string, string> = {
  "deepseek-coder": "qwen2.5-coder"
}

export interface AppConfig {
  modelProvider: string
  extractionModel: string
  solutionModel: string
  validationModel: string
  language: string
  opacity: number
  invisibilityEnabled: boolean
  mousePassthroughEnabled: boolean
}

type LegacyAppConfig = Partial<AppConfig> & {
  debuggingModel?: string
  isInvisible?: boolean
}

export class ConfigHelper extends EventEmitter {
  private configPath: string

  private defaultConfig: AppConfig = {
    modelProvider: MODEL_PROVIDER,
    extractionModel: "llava",
    solutionModel: "qwen2.5-coder",
    validationModel: "qwen2.5-coder",
    language: "python",
    opacity: 1,
    invisibilityEnabled: true,
    mousePassthroughEnabled: false
  }

  constructor() {
    super()

    try {
      this.configPath = path.join(app.getPath("userData"), "config.json")
    } catch (error) {
      console.warn("Could not access user data path, using project fallback", error)
      this.configPath = path.join(process.cwd(), "config.json")
    }

    this.ensureConfigExists()
  }

  private ensureConfigExists(): void {
    if (!fs.existsSync(this.configPath)) {
      this.saveConfig(this.defaultConfig)
    }
  }

  private sanitizeModelSelection(
    model: string | undefined,
    fallback: string
  ): string {
    const normalizedModel =
      model && MODEL_MIGRATIONS[model] ? MODEL_MIGRATIONS[model] : model

    if (
      normalizedModel &&
      ALLOWED_MODELS.includes(
        normalizedModel as (typeof ALLOWED_MODELS)[number]
      )
    ) {
      return normalizedModel
    }

    return fallback
  }

  public isVisionModel(model: string): boolean {
    return VISION_MODELS.includes(model as (typeof VISION_MODELS)[number])
  }

  public isCodingModel(model: string): boolean {
    return CODING_MODELS.includes(model as (typeof CODING_MODELS)[number])
  }

  private normalizeConfig(input: LegacyAppConfig): AppConfig {
    const config: AppConfig = {
      ...this.defaultConfig,
      ...input,
      modelProvider: MODEL_PROVIDER
    }

    if (!input.validationModel && input.debuggingModel) {
      config.validationModel = input.debuggingModel
    }

    if (typeof input.invisibilityEnabled !== "boolean" && typeof input.isInvisible === "boolean") {
      config.invisibilityEnabled = input.isInvisible
    }

    config.extractionModel = this.sanitizeModelSelection(
      config.extractionModel,
      this.defaultConfig.extractionModel
    )
    config.solutionModel = this.sanitizeModelSelection(
      config.solutionModel,
      this.defaultConfig.solutionModel
    )
    config.validationModel = this.sanitizeModelSelection(
      config.validationModel,
      this.defaultConfig.validationModel
    )

    if (!this.isVisionModel(config.extractionModel)) {
      config.extractionModel = this.defaultConfig.extractionModel
    }

    if (!this.isCodingModel(config.solutionModel)) {
      config.solutionModel = this.defaultConfig.solutionModel
    }

    if (!this.isCodingModel(config.validationModel)) {
      config.validationModel = this.defaultConfig.validationModel
    }

    return config
  }

  public loadConfig(): AppConfig {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig(this.defaultConfig)
        return this.defaultConfig
      }

      const rawConfig = fs.readFileSync(this.configPath, "utf8")
      const normalized = this.normalizeConfig(JSON.parse(rawConfig) as LegacyAppConfig)

      // Persist migrated configs so stale packaged/runtime builds stop reusing old keys.
      if (rawConfig !== JSON.stringify(normalized, null, 2)) {
        this.saveConfig(normalized)
      }

      return normalized
    } catch (error) {
      console.error("Error loading config:", error)
      return this.defaultConfig
    }
  }

  public saveConfig(config: AppConfig): void {
    try {
      const configDir = path.dirname(this.configPath)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2))
    } catch (error) {
      console.error("Error saving config:", error)
    }
  }

  public updateConfig(updates: Partial<AppConfig>): AppConfig {
    try {
      const nextConfig = this.normalizeConfig({
        ...this.loadConfig(),
        ...updates
      })

      this.saveConfig(nextConfig)
      this.emit("config-updated", nextConfig)
      return nextConfig
    } catch (error) {
      console.error("Error updating config:", error)
      return this.defaultConfig
    }
  }

  public getOpacity(): number {
    return this.loadConfig().opacity
  }

  public setOpacity(opacity: number): void {
    const validOpacity = Math.min(1, Math.max(0.1, opacity))
    this.updateConfig({ opacity: validOpacity })
  }

  public getLanguage(): string {
    return this.loadConfig().language
  }

  public setLanguage(language: string): void {
    this.updateConfig({ language })
  }

  public isInvisibilityEnabled(): boolean {
    return this.loadConfig().invisibilityEnabled !== false
  }

  public setInvisibilityEnabled(invisibilityEnabled: boolean): void {
    this.updateConfig({ invisibilityEnabled })
  }

  public isMousePassthroughEnabled(): boolean {
    return this.loadConfig().mousePassthroughEnabled === true
  }

  public setMousePassthroughEnabled(mousePassthroughEnabled: boolean): void {
    this.updateConfig({ mousePassthroughEnabled })
  }
}

export const configHelper = new ConfigHelper()
