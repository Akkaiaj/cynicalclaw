import fs from 'fs';
import path from 'path';
import { ToolDefinition } from '../types';
import { BaseSkill } from './BaseSkill';
import { logger } from '../utils/logger';

export class SkillRegistry {
  private skills: Map<string, BaseSkill> = new Map();
  private tools: Map<string, { skill: string; handler: Function }> = new Map();
  
  constructor(private skillsPath: string = './skills') {}

  async loadSkills(): Promise<BaseSkill[]> {
    logger.log('Loading skills from the digital void...');
    
    try {
      const dirs = fs.readdirSync(this.skillsPath);
      
      for (const dir of dirs) {
        const skillPath = path.join(this.skillsPath, dir);
        const stat = fs.statSync(skillPath);
        
        if (stat.isDirectory()) {
          try {
            const jsPath = path.join(skillPath, 'index.js');
            const tsPath = path.join(skillPath, 'index.ts');
            
            let skillModule;
            if (fs.existsSync(jsPath)) {
              skillModule = await import(path.resolve(jsPath));
            } else if (fs.existsSync(tsPath)) {
              skillModule = await import(path.resolve(tsPath));
            } else {
              continue;
            }
            
            const SkillClass = skillModule.default || skillModule[Object.keys(skillModule)[0]];
            
            if (SkillClass && SkillClass.prototype instanceof BaseSkill) {
              const instance = new SkillClass();
              this.registerSkill(instance);
              logger.log(`Skill loaded: ${instance.name}`);
            }
          } catch (error: any) {
            logger.error(`Failed to load skill ${dir}: ${error.message}`);
          }
        }
      }
      
      logger.log(`Loaded ${this.skills.size} skills. Ready to serve (begrudgingly).`);
    } catch (error) {
      logger.error('Skills directory not found. Running with no skills.');
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
  }

  getToolDefinitions(): ToolDefinition[] {
    const defs: ToolDefinition[] = [];
    for (const skill of this.skills.values()) {
      defs.push(...skill.getTools());
    }
    return defs;
  }

  async executeTool(toolName: string, args: any): Promise<string> {
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      throw new Error(`Tool ${toolName} not found. Did you forget to load the skill?`);
    }
    
    logger.log(`Executing tool: ${toolName} (via ${tool.skill})`);
    
    try {
      return await tool.handler(args);
    } catch (error: any) {
      logger.error(`Tool ${toolName} failed: ${error.message}`);
      throw error;
    }
  }

  listSkills(): string[] {
    return Array.from(this.skills.keys());
  }
}
