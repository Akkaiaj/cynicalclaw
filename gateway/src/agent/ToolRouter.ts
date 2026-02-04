import { CynicalModelRouter } from '../models/Router';
import { SkillRegistry } from '../skills/SkillRegistry';
import { logger } from '../utils/logger';

export interface ToolSelection {
  tool: string;
  args: Record<string, any>;
  reasoning: string;
  confidence: number;
}

export class ToolRouter {
  private router: CynicalModelRouter;
  private skills: SkillRegistry;

  constructor(router: CynicalModelRouter, skills: SkillRegistry) {
    this.router = router;
    this.skills = skills;
  }

  async route(userInput: string): Promise<ToolSelection | null> {
    const toolDefs = this.skills.getToolDefinitions();
    
    const prompt = `You are an AI tool router. Analyze the user input and decide if a tool is needed.

Available tools:
${toolDefs.map(t => `- ${t.name}: ${t.description}
  Parameters: ${JSON.stringify(t.parameters)}`).join('\n')}

User input: "${userInput}"

If NO tool is needed (just conversation, questions you can answer directly, greetings), respond exactly: NO_TOOL

If a tool IS needed, respond ONLY in this JSON format:
{
  "tool": "exact_tool_name",
  "args": { "param": "value" },
  "reasoning": "specific explanation of why this tool is needed",
  "confidence": 0.0-1.0
}

Rules:
- Only use tools for external data, code execution, or file operations
- "What is X" -> NO_TOOL (you know this)
- "What is the weather" -> search tool (external data)
- "Calculate 123*456" -> code_execute tool (calculation)
- "Read my file.txt" -> file_read tool (file access)`;

    try {
      const response = await this.router.routeRequest(
        [{ id: 'route', content: prompt, role: 'user', timestamp: new Date().toISOString() }],
        'medium',
        'free',
        'clinical'
      );

      if (response.includes('NO_TOOL')) {
        logger.log(`🔀 No tool routing needed for: "${userInput.slice(0, 30)}..."`);
        return null;
      }

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('Tool routing: No JSON found in response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.tool || !this.skills.hasTool?.(parsed.tool)) {
        logger.warn(`Tool routing: Invalid tool "${parsed.tool}"`);
        return null;
      }

      logger.log(`🔀 Auto-routed to: ${parsed.tool} (${parsed.reasoning}) [${parsed.confidence}]`);
      
      return {
        tool: parsed.tool,
        args: parsed.args || {},
        reasoning: parsed.reasoning,
        confidence: parsed.confidence || 0.5
      };

    } catch (error: any) {
      logger.error('Tool routing failed:', error.message);
      return null;
    }
  }
}
