import axios from 'axios';
import { BaseProvider } from './BaseProvider';
import { Message } from '../../types';
import { logger } from '../../utils/logger';
import { CONFIG } from '../../config/constants';

export class OllamaProvider extends BaseProvider {
  private baseUrl: string;
  
  constructor(config: any) {
    super(config);
    this.baseUrl = CONFIG.OLLAMA_HOST;
  }

  async complete(messages: Message[], systemPrompt?: string): Promise<string> {
    try {
      const prompt = this.formatPrompt(messages, systemPrompt);
      
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.config.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: this.config.maxTokens || 1024
        }
      }, { timeout: 60000 });
      
      return response.data.response;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        logger.error(`Ollama not running at ${this.baseUrl}. Did you forget to start it?`);
        return 'Local AI is offline. It\'s probably taking a nap. Run: ollama serve';
      }
      logger.error(`Ollama error: ${error.message}`);
      throw error;
    }
  }

  async streamComplete(messages: Message[], onChunk: (chunk: string) => void, systemPrompt?: string): Promise<void> {
    try {
      const prompt = this.formatPrompt(messages, systemPrompt);
      
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.config.model,
        prompt: prompt,
        stream: true,
        options: { temperature: 0.7 }
      }, { 
        responseType: 'stream',
        timeout: 120000
      });
      
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              onChunk(json.response);
            }
          } catch (e) {
            // Ignore parse errors in stream
          }
        }
      });

      return new Promise((resolve, reject) => {
        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
    } catch (error) {
      logger.error(`Ollama streaming error: ${error.message}`);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  getTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model: 'nomic-embed-text',
        prompt: text
      });
      return response.data.embedding;
    } catch (error) {
      logger.error('Failed to generate embedding locally');
      throw error;
    }
  }

  private formatPrompt(messages: Message[], systemPrompt?: string): string {
    let prompt = '';
    
    if (systemPrompt) {
      prompt += `System: ${this.formatSystemPrompt(systemPrompt)}\n\n`;
    }
    
    for (const msg of messages) {
      const role = msg.role === 'assistant' ? 'Assistant' : 'User';
      prompt += `${role}: ${msg.content}\n`;
    }
    
    prompt += 'Assistant:';
    return prompt;
  }
}
