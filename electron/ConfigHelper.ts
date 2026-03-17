// ConfigHelper.ts
import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import { EventEmitter } from "events"

export const MODEL_PROVIDER = "ollama";

interface Config {
  modelProvider: string;
  extractionModel: string;
  solutionModel: string;
  debuggingModel: string;
  language: string;
  opacity: number;
  invisibilityEnabled: boolean;
  mousePassthroughEnabled: boolean;
}

export class ConfigHelper extends EventEmitter {
  private configPath: string;
  private defaultConfig: Config = {
    modelProvider: MODEL_PROVIDER,
    extractionModel: "qwen2.5-coder",
    solutionModel: "qwen2.5-coder",
    debuggingModel: "qwen2.5-coder",
    language: "python",
    opacity: 1.0,
    invisibilityEnabled: true,
    mousePassthroughEnabled: false
  };

  constructor() {
    super();
    // Use the app's user data directory to store the config
    try {
      this.configPath = path.join(app.getPath('userData'), 'config.json');
      console.log('Config path:', this.configPath);
    } catch (err) {
      console.warn('Could not access user data path, using fallback');
      this.configPath = path.join(process.cwd(), 'config.json');
    }
    
    // Ensure the initial config file exists
    this.ensureConfigExists();
  }

  /**
   * Ensure config file exists
   */
  private ensureConfigExists(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig(this.defaultConfig);
      }
    } catch (err) {
      console.error("Error ensuring config exists:", err);
    }
  }

  /**
   * Validate and sanitize model selection to ensure only allowed models are used
   */
  private sanitizeModelSelection(model: string): string {
    const allowedModels = ['qwen2.5-coder', 'deepseek-r1:1.5b'];
    if (!allowedModels.includes(model)) {
      console.warn(`Invalid model specified: ${model}. Using default model: ${this.defaultConfig.extractionModel}`);
      return this.defaultConfig.extractionModel;
    }
    return model;
  }

  public loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);

        // Apply defaults and sanitize
        const finalConfig = {
          ...this.defaultConfig,
          ...config,
          modelProvider: MODEL_PROVIDER
        } as Config;

        finalConfig.extractionModel = this.sanitizeModelSelection(finalConfig.extractionModel);
        finalConfig.solutionModel = this.sanitizeModelSelection(finalConfig.solutionModel);
        finalConfig.debuggingModel = this.sanitizeModelSelection(finalConfig.debuggingModel);

        return finalConfig;
      }

      // If no config exists, create a default one
      this.saveConfig(this.defaultConfig);
      return this.defaultConfig;
    } catch (err) {
      console.error("Error loading config:", err);
      return this.defaultConfig;
    }
  }

  /**
   * Save configuration to disk
   */
  public saveConfig(config: Config): void {
    try {
      // Ensure the directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      // Write the config file
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (err) {
      console.error("Error saving config:", err);
    }
  }

  /**
   * Update specific configuration values
   */
  public updateConfig(updates: Partial<Config>): Config {
    try {
      const currentConfig = this.loadConfig();

      const newConfig: Config = {
        ...currentConfig,
        ...updates,
        modelProvider: MODEL_PROVIDER
      };

      newConfig.extractionModel = this.sanitizeModelSelection(newConfig.extractionModel);
      newConfig.solutionModel = this.sanitizeModelSelection(newConfig.solutionModel);
      newConfig.debuggingModel = this.sanitizeModelSelection(newConfig.debuggingModel);

      this.saveConfig(newConfig);

      // Emit update event for meaningful changes
      if (
        updates.extractionModel !== undefined ||
        updates.solutionModel !== undefined ||
        updates.debuggingModel !== undefined ||
        updates.language !== undefined ||
        updates.opacity !== undefined ||
        updates.invisibilityEnabled !== undefined ||
        updates.mousePassthroughEnabled !== undefined
      ) {
        this.emit('config-updated', newConfig);
      }

      return newConfig;
    } catch (error) {
      console.error('Error updating config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Get the stored opacity value
   */
  public getOpacity(): number {
    const config = this.loadConfig();
    return config.opacity !== undefined ? config.opacity : 1.0;
  }

  /**
   * Set the window opacity value
   */
  public setOpacity(opacity: number): void {
    // Ensure opacity is between 0.1 and 1.0
    const validOpacity = Math.min(1.0, Math.max(0.1, opacity));
    this.updateConfig({ opacity: validOpacity });
  }  

  /**
   * Get the preferred programming language
   */
  public getLanguage(): string {
    const config = this.loadConfig();
    return config.language || "python";
  }

  /**
   * Set the preferred programming language
   */
  public setLanguage(language: string): void {
    this.updateConfig({ language });
  }

  public isInvisibilityEnabled(): boolean {
    const config = this.loadConfig();
    return config.invisibilityEnabled !== false;
  }

  public setInvisibilityEnabled(invisibilityEnabled: boolean): void {
    this.updateConfig({ invisibilityEnabled });
  }

  public isMousePassthroughEnabled(): boolean {
    const config = this.loadConfig();
    return config.mousePassthroughEnabled === true;
  }

  public setMousePassthroughEnabled(mousePassthroughEnabled: boolean): void {
    this.updateConfig({ mousePassthroughEnabled });
  }
}

// Export a singleton instance
export const configHelper = new ConfigHelper();
