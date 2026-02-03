import { BaseSkill } from '../../gateway/src/skills/BaseSkill';
import { ToolDefinition } from '../../gateway/src/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export default class SystemSkill extends BaseSkill {
  readonly name = 'system';
  readonly description = 'System commands and file operations';

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'execute_command',
        description: 'Execute a shell command in sandboxed environment',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
            timeout: { type: 'number', description: 'Timeout in milliseconds' }
          },
          required: ['command']
        }
      },
      {
        name: 'read_file',
        description: 'Read contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            content: { type: 'string', description: 'Content to write' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_directory',
        description: 'List files in directory',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path' }
          },
          required: ['path']
        }
      }
    ];
  }

  async executeTool(toolName: string, args: any): Promise<string> {
    switch (toolName) {
      case 'execute_command':
        return this.executeCommand(args.command, args.timeout);
      case 'read_file':
        return this.readFile(args.path);
      case 'write_file':
        return this.writeFile(args.path, args.content);
      case 'list_directory':
        return this.listDirectory(args.path);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async executeCommand(command: string, timeout: number = 30000): Promise<string> {
    const allowedCommands = ['ls', 'cat', 'pwd', 'echo', 'grep', 'find', 'head', 'tail', 'node', 'python3'];
    const cmdBase = command.split(' ')[0];
    
    if (!allowedCommands.includes(cmdBase)) {
      return this.formatError(`Command '${cmdBase}' not allowed. I'm paranoid, not stupid.`);
    }
    
    try {
      const { stdout, stderr } = await execAsync(command, { timeout });
      return this.formatSuccess(stdout || stderr || 'Command executed. The void remains silent.');
    } catch (error: any) {
      return this.formatError(error.message);
    }
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(process.cwd())) {
        return this.formatError('Access denied. Nice try, hacker.');
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.formatSuccess(`File contents:\n\`\`\`\n${content}\n\`\`\``);
    } catch (error: any) {
      return this.formatError(error.message);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<string> {
    try {
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(process.cwd())) {
        return this.formatError('Access denied. Try writing to your own disk.');
      }
      
      fs.writeFileSync(filePath, content);
      return this.formatSuccess(`File written: ${filePath}`);
    } catch (error: any) {
      return this.formatError(error.message);
    }
  }

  private async listDirectory(dirPath: string): Promise<string> {
    try {
      const files = fs.readdirSync(dirPath);
      return this.formatSuccess(`Directory contents:\n${files.join('\n')}`);
    } catch (error: any) {
      return this.formatError(error.message);
    }
  }
}
