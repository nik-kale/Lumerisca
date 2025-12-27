import { ModelCapabilities, MODEL_REGISTRY } from "./modelRouter.js";
import { logger } from "../utils/logger.js";
import { validateModel } from "../utils/validation.js";

const log = logger.scope("ModelRegistry");
const DEFAULT_REGISTRY_URL = "https://lumerisca.dev/api/models.json";

export interface ModelRegistryConfig {
  version: string;
  models: ModelCapabilities[];
  lastUpdated: number;
}

export class ModelRegistry {
  private config: ModelRegistryConfig = {
    version: '1.0',
    models: [...MODEL_REGISTRY],
    lastUpdated: Date.now()
  };

  async loadConfig(): Promise<void> {
    // @ts-ignore - Chrome types might not be available in core
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        // @ts-ignore
        const stored = await chrome.storage.local.get('modelRegistry');
        if (stored.modelRegistry) {
          this.config = stored.modelRegistry;
          log.info('Loaded model registry from storage', { count: this.config.models.length });
        }
      } catch (error) {
        log.error('Failed to load model registry', { error });
      }
    }
  }

  async addModel(model: ModelCapabilities): Promise<void> {
    this.validateModelCapabilities(model);
    this.config.models.push(model);
    await this.persist();
  }

  async updateFromRemote(url?: string): Promise<void> {
    try {
      const targetUrl = url || DEFAULT_REGISTRY_URL;
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error(`Failed to fetch registry: ${response.statusText}`);
      
      const remote = await response.json();
      
      // Merge with existing logic could be more complex, but here we replace
      this.config = { ...remote, lastUpdated: Date.now() };
      await this.persist();
      log.info('Updated model registry from remote', { url: targetUrl });
    } catch (error) {
      log.error('Failed to update from remote', { error });
      throw error;
    }
  }

  getModels(): ModelCapabilities[] {
    return this.config.models;
  }

  private async persist(): Promise<void> {
    // @ts-ignore
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      // @ts-ignore
      await chrome.storage.local.set({ modelRegistry: this.config });
    }
  }

  private validateModelCapabilities(model: ModelCapabilities): void {
    validateModel(model.model);
    if (!model.provider) throw new Error("Provider is required");
    if (!model.contextWindow || model.contextWindow <= 0) throw new Error("Invalid context window");
    if (model.costPer1kTokens < 0) throw new Error("Invalid cost");
  }
}

export const modelRegistry = new ModelRegistry();

