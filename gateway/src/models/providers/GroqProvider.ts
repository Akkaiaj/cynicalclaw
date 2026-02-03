import Groq from 'groq-sdk';
import { BaseProvider } from './BaseProvider';
import { Message } from '../../types';
import { logger } from '../../utils/logger';

export class GroqProvider extends BaseProvider {
  private client: Groq;
  
  constructor(config: any) {
    super(config);
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not found. Get free key at console.groq.com');
    }
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async complete(messages: Message[], systemPrompt?: string): Promise<string> {
    try {
      const formattedMessages = this.formatMessages(messages, systemPrompt);
      
      const completion = await this.client.chat.completions.create({
        messages: formattedMessages as any,
        model: this.config.model,
        temperature: 0.7,
        max_tokens: this.config.maxTokens || 1024,
        top_p: 1,
        stream: false
      });
      
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        logger.error('Groq returned empty response. Probably having an existential crisis.');
        return 'The model stared into the void and said nothing. Typical.';
      }
      
      return content;
    } catch (error: any) {
      logger.error(`Groq API error: ${error.message}`);
      if (error.status === 429) {
        return 'Rate limited. Even free APIs need a lunch break. Try again in 60 seconds.';
      }
      throw error;
    }
  }

  async streamComplete(messages: Message[], onChunk: (chunk: string) => void, systemPrompt?: string): Promise<void> {
    try {
      const formattedMessages = this.formatMessages(messages, systemPrompt);
      
      const stream = await this.client.chat.completions.create({
        messages: formattedMessages as any,
        model: this.config.model,
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
    } catch (error: any) {
      logger.error(`Groq streaming error: ${error.message}`);
      throw error;
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
