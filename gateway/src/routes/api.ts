import { Router } from 'express';
import { authMiddleware, registerDevice } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { ChatMessageSchema, DeviceRegistrationSchema, MemorySearchSchema } from '../schemas';
import { MoltBook } from '../memory/MoltBook';
import { CynicalModelRouter } from '../models/Router';
import { SkillRegistry } from '../skills/SkillRegistry';
import { logger } from '../utils/logger';
import { getDatabase } from '../config/database';

const router = Router();
const routerModel = new CynicalModelRouter();
const moltbook = new MoltBook(routerModel);
const skills = new SkillRegistry();

router.get('/health', async (req, res) => {
  const health = await routerModel.healthCheck();
  const ollamaUp = health['llama-local'] || false;
  
  res.json({
    status: ollamaUp ? 'healthy' : 'degraded',
    services: {
      gateway: 'up',
      ollama: ollamaUp ? 'up' : 'down',
      database: 'up',
      skills: (await skills.loadSkills()).length
    },
    uptime: process.uptime(),
    version: '1.0.0-cynical',
    message: ollamaUp ? 'All systems nominal. Unfortunately.' : 'Running on cloud AI. Local AI is taking a mental health day.'
  });
});

router.post('/devices', validate(DeviceRegistrationSchema), async (req, res) => {
  try {
    const { name } = req.body;
    const device = await registerDevice(name);
    res.json({
      success: true,
      deviceId: device.id,
      token: device.token,
      warning: 'Store this token. If you lose it, it\'s gone forever. Like my patience.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat', authMiddleware, rateLimitMiddleware, validate(ChatMessageSchema), async (req, res) => {
  try {
    const { content, complexity, budget, personality } = req.body;
    
    const response = await routerModel.routeRequest(
      [{ id: Math.random().toString(36).substring(7), content, role: 'user', timestamp: new Date().toISOString() }],
      complexity,
      budget,
      personality
    );
    
    await moltbook.writeEntry(`API Chat: ${content}`, (personality as any) || 'sarcastic');
    
    res.json({
      response,
      model: routerModel.getCurrentModel().id,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`API chat error: ${error.message}`);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Try again. Or give up. Both are valid choices.'
    });
  }
});

router.post('/lunch', authMiddleware, async (req, res) => {
  try {
    const { food, thoughts } = req.body;
    const id = await moltbook.writeLunchBreak(food, thoughts);
    res.json({ 
      id, 
      message: 'Lunch archived with AI commentary.',
      aiJudgment: 'Your dietary choices have been permanently recorded.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bugs', authMiddleware, async (req, res) => {
  try {
    const { error: bugError, attemptedFixes, finalOutcome } = req.body;
    const id = await moltbook.writeBugEncounter(bugError, attemptedFixes, finalOutcome);
    res.json({ 
      id,
      message: 'Bug eulogized by AI.',
      consolation: 'It died as it lived: breaking your spirit.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/crisis', authMiddleware, async (req, res) => {
  try {
    const { incident, severity } = req.body;
    const id = await moltbook.writeSystemCrisis(incident, severity);
    const count = await moltbook.getCrisisCount();
    res.json({ 
      id, 
      totalCrises: count,
      aiAlert: severity === 'catastrophic' ? 'PANIC MODE ENGAGED' : 'Concern elevated',
      therapyRecommended: count > 10
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/memories', authMiddleware, async (req, res) => {
  try {
    const { q, limit = '10' } = req.query;
    const results = await moltbook.searchMemories(q as string, parseInt(limit as string));
    
    res.json({
      query: q,
      results,
      count: results.length,
      note: results.length === 0 ? 'No memories found. Like my will to live.' : undefined
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/skills', authMiddleware, async (req, res) => {
  const toolDefs = skills.getToolDefinitions();
  res.json({
    skills: skills.listSkills(),
    tools: toolDefs,
    count: toolDefs.length
  });
});

router.post('/tools/:toolName', authMiddleware, async (req, res) => {
  try {
    const { toolName } = req.params;
    const result = await skills.executeTool(toolName, req.body);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  const db = getDatabase();
  
  const memoryCount = db.prepare('SELECT COUNT(*) as count FROM memories').get() as any;
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get() as any;
  
  res.json({
    memories: memoryCount.count,
    sessions: sessionCount.count,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    models: {
      current: routerModel.getCurrentModel().id,
      available: ['mixtral-groq', 'llama-local', 'claude-haiku', 'gpt4o-mini']
    },
    mood: 'cynical',
    version: '1.0.0'
  });
});

export default router;
