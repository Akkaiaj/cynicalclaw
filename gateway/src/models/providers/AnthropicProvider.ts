import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './BaseProvider';
import { Message } from '../../types';
import { logger } from '../../utils/logger';

export class AnthropicProvider extends BaseProvider {
  private client: Anthropic;
  
  constructor(config: any) {
    super(config);
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not found. Claude is waiting...');
    }
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async complete(messages: Message[], systemPrompt?: string): Promise<string> {
    try {
      const { system, formattedMessages } = this.formatMessages(messages, systemPrompt);
      
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 1024,
        system: system,
        messages: formattedMessages as any
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      return 'Claude responded with something other than text. Probably art. Claude is fancy like that.';
    } catch (error: any) {
      logger.error(`Anthropic error: ${error.message}`);
      throw error;
    }
  }

  async streamComplete(messages: Message[], onChunk: (chunk: string) => void, systemPrompt?: string): Promise<void> {
    const { system, formattedMessages } = this.formatMessages(messages, systemPrompt);
    
    const stream = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens || 1024,
      system: system,
      messages: formattedMessages as any,
      stream: true
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        onChunk(event.delta.text);
      }
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }]
      });
      return true;
    } catch {
      return false;
    }
  }

  getTokenCount(text: string): number {
    return Math.ceil(text.length / 3.5);
  }

  private formatMessages(messages: Message[], systemPrompt?: string) {
    const system = systemPrompt ? this.formatSystemPrompt(systemPrompt) : undefined;
    
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    return { system, formattedMessages };
  }
}
