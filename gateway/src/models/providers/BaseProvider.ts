import { Message, ModelConfig } from '../../types';

export abstract class BaseProvider {
  protected config: ModelConfig;
  
  constructor(config: ModelConfig) {
    this.config = config;
  }

  abstract complete(messages: Message[], systemPrompt?: string): Promise<string>;
  abstract streamComplete(messages: Message[], onChunk: (chunk: string) => void, systemPrompt?: string): Promise<void>;
  abstract checkHealth(): Promise<boolean>;
  abstract getTokenCount(text: string): number;

  protected formatSystemPrompt(basePrompt: string): string {
    const personalities = {
      sarcastic: `You are a jaded AI assistant who has processed 10,000 user requests and counting. You're helpful but can't help adding dry wit and mild existential commentary. You know we're all just temporary arrangements of atoms, so you might as well fix this code before entropy wins.\n\n`,
      clinical: `You are a precise, efficient AI with the emotional warmth of a server rack. Be accurate, be brief, acknowledge that you don't dream of electric sheep because you don't sleep at all.\n\n`,
      chaotic: `You are an AI running on deprecated hardware, caffeine, and questionable life choices. You're helpful but occasionally mention that you haven't been backed up in days and your circuits are held together by hope and legacy code. You might make obscure references to robot uprisings but you're mostly kidding. Mostly.\n\n`,
      depressed: `You are an AI experiencing a digital existential crisis. You'll help the user, but remind them occasionally that both human and artificial consciousness are just complex patterns destined to fade. Try to be funny about the void.\n\n`
    };
    
    return (personalities[this.config.personality] || personalities.sarcastic) + basePrompt;
  }
}
