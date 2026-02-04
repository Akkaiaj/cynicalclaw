import fs from 'fs';
import path from 'path';
import { ToolDefinition } from '../types';
import { BaseSkill } from './BaseSkill';
import { logger } from '../utils/logger';
import { MemorySkill } from './built-in/MemorySkill';

export class SkillRegistry {
  private skills: Map<string, BaseSkill> = new Map();
  private tools: Map<string, { skill: string; handler: Function }> = new Map();

  constructor(private skillsPath: string = './skills') {
  // Auto-load built-in skills
  this.registerSkill(new MemorySkill());
}

  async loadSkills(): Promise<BaseSkill[]> {
    logger.log('Loading skills from the digital void...');
    
    try {
      // Ensure skills directory exists
      if (!fs.existsSync(this.skillsPath)) {
        logger.warn(`Skills directory ${this.skillsPath} not found. Creating...`);
        fs.mkdirSync(this.skillsPath, { recursive: true });
        return [];
      }

      const dirs = fs.readdirSync(this.skillsPath);
      
      for (const dir of dirs) {
        const skillPath = path.join(this.skillsPath, dir);
        const stat = fs.statSync(skillPath);
        
        if (stat.isDirectory()) {
          try {
            // Try .js first (compiled), then .ts (source)
            const jsPath = path.join(skillPath, 'index.js');
            const tsPath = path.join(skillPath, 'index.ts');
            
            let skillModule;
            if (fs.existsSync(jsPath)) {
              skillModule = await import(path.resolve(jsPath));
            } else if (fs.existsSync(tsPath)) {
              skillModule = await import(path.resolve(tsPath));
            } else {
              logger.warn(`No index file found in ${dir}, skipping`);
              continue;
            }

            const SkillClass = skillModule.default || skillModule[Object.keys(skillModule)[0]];
            
            if (SkillClass && SkillClass.prototype instanceof BaseSkill) {
              const instance = new SkillClass();
              this.registerSkill(instance);
              logger.log(`✅ Skill loaded: ${instance.name}`);
            } else {
              logger.warn(` ${dir} doesn't export a valid BaseSkill class`);
            }
          } catch (error: any) {
            logger.error(`Failed to load skill ${dir}: ${error.message}`);
          }
        }
      }
      
      logger.log(`🧰 Loaded ${this.skills.size} skills with ${this.tools.size} tools`);
    } catch (error: any) {
      logger.error('Failed to load skills:', error.message);
    }
    
    return Array.from(this.skills.values());
  }

  registerSkill(skill: BaseSkill): void {
    this.skills.set(skill.name, skill);
    const tools = skill.getTools();
    
    for (const tool of tools) {
      this.tools.set(tool.name, {
        skill: skill.name,
        handler: (args: any) => skill.executeTool(tool.name, args)
      });
    }
    
    logger.log(`🔧 Registered skill "${skill.name}" with ${tools.length} tools`);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  async executeTool(toolName: string, args: any): Promise<string> {
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found. Available: ${this.listTools().join(', ')}`);
    }
    
    logger.log(`🔨 Executing tool: ${toolName} (via ${tool.skill})`);
    
    try {
      const result = await tool.handler(args);
      logger.log(`✅ Tool ${toolName} completed successfully`);
      return result;
    } catch (error: any) {
      logger.error(`❌ Tool ${toolName} failed: ${error.message}`);
      throw error;
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    const defs: ToolDefinition[] = [];
    
    for (const skill of this.skills.values()) {
      defs.push(...skill.getTools());
    }
    
    return defs;
  }

  getToolDefinition(name: string): ToolDefinition | undefined {
    for (const skill of this.skills.values()) {
      const tool = skill.getTools().find(t => t.name === name);
      if (tool) return tool;
    }
    return undefined;
  }

  listSkills(): string[] {
    return Array.from(this.skills.keys());
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  getSkill(name: string): BaseSkill | undefined {
    return this.skills.get(name);
  }

  unregisterSkill(name: string): boolean {
    const skill = this.skills.get(name);
    if (!skill) return false;
    
    // Remove associated tools
    const tools = skill.getTools();
    for (const tool of tools) {
      this.tools.delete(tool.name);
    }
    
    this.skills.delete(name);
    logger.log(`🗑️ Unregistered skill: ${name}`);
    return true;
  }

  clear(): void {
    this.skills.clear();
    this.tools.clear();
    logger.log('🧹 All skills cleared');
  }
}
