import OpenAI from 'openai';
import { BaseProvider } from './BaseProvider';
import { Message } from '../../types';
import { logger } from '../../utils/logger';

export class OpenAIProvider extends BaseProvider {
  private client: OpenAI;
  
  constructor(config: any) {
    super(config);
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found. Check your .env file, mortal.');
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async complete(messages: Message[], systemPrompt?: string): Promise<string> {
    try {
      const formattedMessages = this.formatMessages(messages, systemPrompt);
      
      const completion = await this.client.chat.completions.create({
        model: this.config.model,
        messages: formattedMessages as any,
        temperature: 0.7,
        max_tokens: this.config.maxTokens || 1024
      });
      
      return completion.choices[0]?.message?.content || 'OpenAI said nothing. Awkward.';
    } catch (error: any) {
      logger.error(`OpenAI error: ${error.message}`);
      if (error.status === 429) {
        return 'OpenAI is rate limiting us. Probably because you asked too many questions about the meaning of life.';
      }
      throw error;
    }
  }

  async streamComplete(messages: Message[], onChunk: (chunk: string) => void, systemPrompt?: string): Promise<void> {
    const formattedMessages = this.formatMessages(messages, systemPrompt);
    
    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: formattedMessages as any,
      temperature: 0.7,
      max_tokens: this.config.maxTokens || 1024,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  getTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private formatMessages(messages: Message[], systemPrompt?: string): any[] {
    const formatted = [];
    
    if (systemPrompt) {
      formatted.push({
        role: 'system',
        content: this.formatSystemPrompt(systemPrompt)
      });
    }
    
    for (const msg of messages) {
      formatted.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    return formatted;
  }
}
