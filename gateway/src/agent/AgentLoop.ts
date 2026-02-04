import { CynicalModelRouter } from '../models/Router';
import { SkillRegistry } from '../skills/SkillRegistry';
import { MoltBook } from '../memory/MoltBook';
import { logger } from '../utils/logger';

export interface AgentStep {
  id: string;
  action: 'plan' | 'execute' | 'reflect' | 'respond';
  tool?: string;
  args?: any;
  result?: string;
  reflection?: string;
  timestamp: string;
}

export interface AgentContext {
  preselectedTool?: string;
  preselectedArgs?: any;
  sessionId?: string;
  userId?: string;
}

export class AgentLoop {
  private router: CynicalModelRouter;
  private skills: SkillRegistry;
  private moltbook: MoltBook;
  private maxIterations: number = 5;

  constructor(router: CynicalModelRouter, skills: SkillRegistry, moltbook: MoltBook) {
    this.router = router;
    this.skills = skills;
    this.moltbook = moltbook;
  }

  async run(userInput: string, context: AgentContext = {}): Promise<string> {
    const steps: AgentStep[] = [];
    let currentInput = userInput;
    let iteration = 0;

    logger.log(`🧬 Agent loop started for: "${userInput.slice(0, 50)}..."`);

    // Handle preselected tool from auto-router
    if (context.preselectedTool) {
      const step = await this.executePreselectedTool(context);
      steps.push(step);
      currentInput = `Tool ${context.preselectedTool} returned: ${step.result}. Original request: ${userInput}`;
    }

    while (iteration < this.maxIterations) {
      iteration++;
      
      // 1. PLANNER: Decide next action
      const plan = await this.plan(currentInput, steps, context);
      logger.log(`📋 Plan: ${plan.action}${plan.tool ? ` → ${plan.tool}` : ''}`);

      if (plan.action === 'respond') {
        return plan.result || 'I have no response. The void consumes all.';
      }

      // 2. EXECUTOR: Execute the plan
      const step = await this.executeStep(plan);
      steps.push(step);

      // 3. REFLECTOR: Evaluate result
      const reflection = await this.reflect(steps, userInput);
      step.reflection = reflection.decision;
      
      logger.log(`🤔 Reflection: ${reflection.decision}`);

      if (reflection.decision === 'complete') {
        return reflection.finalAnswer || this.synthesizeResponse(steps);
      }

      currentInput = reflection.nextInput || currentInput;
    }

    return this.synthesizeResponse(steps) + '\n\n*[Max iterations reached. I gave up.]*';
  }

  private async executePreselectedTool(context: AgentContext): Promise<AgentStep> {
    const step: AgentStep = {
      id: 'step-0',
      action: 'execute',
      tool: context.preselectedTool!,
      args: context.preselectedArgs,
      timestamp: new Date().toISOString()
    };

    try {
      step.result = await this.skills.executeTool(context.preselectedTool!, context.preselectedArgs);
      logger.log(`✅ Preselected ${context.preselectedTool}: ${step.result.slice(0, 100)}...`);
    } catch (error: any) {
      step.result = `Error: ${error.message}`;
      logger.error(`❌ Tool ${context.preselectedTool} failed: ${error.message}`);
    }

    return step;
  }

  private async executeStep(plan: any): Promise<AgentStep> {
    const step: AgentStep = {
      id: `step-${Date.now()}`,
      action: plan.action,
      tool: plan.tool,
      args: plan.args,
      timestamp: new Date().toISOString()
    };

    if (plan.tool && plan.action === 'execute') {
      try {
        step.result = await this.skills.executeTool(plan.tool, plan.args);
        logger.log(`✅ Executed ${plan.tool}: ${step.result.slice(0, 100)}...`);
      } catch (error: any) {
        step.result = `Error: ${error.message}`;
        logger.error(`❌ Tool ${plan.tool} failed: ${error.message}`);
      }
    }

    return step;
  }

  private async plan(input: string, previousSteps: AgentStep[], context: AgentContext): Promise<any> {
    const toolDefs = this.skills.getToolDefinitions();
    const toolList = toolDefs.map(t => `${t.name}: ${t.description}`).join('\n');

    const prompt = `You are an AI agent planner. Given user input and previous steps, decide the next action.

Available tools:
${toolList}

Previous steps: ${JSON.stringify(previousSteps.map(s => ({ 
  action: s.action, 
  tool: s.tool, 
  result: s.result?.slice(0, 200) 
})))}

User input: "${input}"

Respond in JSON:
{
  "action": "plan" | "execute" | "reflect" | "respond",
  "tool": "tool_name" | null,
  "args": {} | null,
  "reasoning": "why this action",
  "result": "if respond, the final answer"
}`;

    const response = await this.router.routeRequest(
      [{ id: 'plan', content: prompt, role: 'user', timestamp: new Date().toISOString() }],
      'high',
      'premium',
      'clinical'
    );

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { action: 'respond', result: response };
    } catch (e) {
      return { action: 'respond', result: response };
    }
  }

  private async reflect(steps: AgentStep[], originalInput: string): Promise<any> {
    const prompt = `You are an AI reflector. Evaluate if the task is complete or needs more steps.

Steps taken: ${JSON.stringify(steps.map(s => ({ 
  action: s.action, 
  tool: s.tool, 
  result: s.result?.slice(0, 200) 
})))}

Original input: "${originalInput}"

Respond in JSON:
{
  "decision": "continue" | "complete",
  "finalAnswer": "if complete, the comprehensive answer",
  "nextInput": "if continue, what to do next",
  "reasoning": "why"
}`;

    const response = await this.router.routeRequest(
      [{ id: 'reflect', content: prompt, role: 'user', timestamp: new Date().toISOString() }],
      'high',
      'premium',
      'clinical'
    );

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { decision: 'complete', finalAnswer: response };
    } catch (e) {
      return { decision: 'complete', finalAnswer: response };
    }
  }

  private synthesizeResponse(steps: AgentStep[]): string {
    const toolResults = steps
      .filter(s => s.action === 'execute' && s.result)
      .map(s => `[${s.tool}]: ${s.result}`)
      .join('\n\n');

    return toolResults 
      ? `I completed the following actions:\n\n${toolResults}`
      : 'I processed your request through my agent loop. The result is... nothing. How fitting.';
  }
}
