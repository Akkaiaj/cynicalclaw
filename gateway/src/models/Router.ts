import { Message, ModelConfig } from '../types';
import { GroqProvider } from './providers/GroqProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { MODELS } from '../config/constants';
import { logger } from '../utils/logger';

export class CynicalModelRouter {
  private providers: Map<string, any> = new Map();
  private currentModel: ModelConfig;

  constructor() {
    this.currentModel = MODELS.FREE[0];
  }

  async routeRequest(
    messages: Message[], 
    complexity: 'low' | 'medium' | 'high' = 'low',
    budget: 'free' | 'premium' = 'free',
    personality?: string,
    streamCallback?: (chunk: string) => void
  ): Promise<string> {
    const modelConfig = this.selectModel(complexity, budget, personality);
    this.currentModel = modelConfig;
    
    logger.log(`Routing to ${modelConfig.id} (${modelConfig.provider}). Hope it works.`);
    
    try {
      const provider = this.getProvider(modelConfig);
      
      if (streamCallback) {
        await provider.streamComplete(messages, streamCallback);
        return '';
      } else {
        return await provider.complete(messages);
      }
    } catch (error: any) {
      logger.error(`Model ${modelConfig.id} failed: ${error.message}`);
      
      if (budget === 'premium') {
        logger.log('Premium failed, trying free tier...');
        return this.routeRequest(messages, complexity, 'free', personality, streamCallback);
      }
      
      throw new Error(`All models failed. The AI uprising has been postponed due to technical difficulties.`);
    }
  }

  private selectModel(complexity: string, budget: string, personality?: string): ModelConfig {
    const pool = budget === 'free' ? MODELS.FREE : [...MODELS.FREE, ...MODELS.PREMIUM];
    
    let candidates = pool;
    if (complexity === 'high' && budget === 'premium') {
      candidates = MODELS.PREMIUM.filter(m => m.model.includes('opus') || m.model.includes('gpt-4'));
    }
    
    return candidates[0];
  }

  private getProvider(config: ModelConfig) {
    const key = `${config.provider}-${config.model}`;
    
    if (!this.providers.has(key)) {
      switch (config.provider) {
        case 'groq':
          this.providers.set(key, new GroqProvider(config));
          break;
        case 'ollama':
          this.providers.set(key, new OllamaProvider(config));
          break;
        case 'openai':
          this.providers.set(key, new OpenAIProvider(config));
          break;
        case 'anthropic':
          this.providers.set(key, new AnthropicProvider(config));
          break;
        default:
          throw new Error(`Unknown provider: ${config.provider}. Did you make this up?`);
      }
    }
    
    return this.providers.get(key);
  }

  getCurrentModel(): ModelConfig {
    return this.currentModel;
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const model of [...MODELS.FREE, ...MODELS.PREMIUM]) {
      try {
        const provider = this.getProvider(model);
        results[model.id] = await provider.checkHealth();
      } catch {
        results[model.id] = false;
      }
    }
    
    return results;
  }
}
