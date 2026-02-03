import { ToolDefinition } from '../types';

export abstract class BaseSkill {
  abstract readonly name: string;
  abstract readonly description: string;
  
  abstract getTools(): ToolDefinition[];
  abstract executeTool(toolName: string, args: any): Promise<string>;
  
  protected formatSuccess(result: string): string {
    return `✓ ${result}`;
  }
  
  protected formatError(error: string): string {
    return `✗ Error: ${error} (Don't panic, but maybe panic a little)`;
  }
}
