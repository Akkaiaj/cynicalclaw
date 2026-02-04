import WebSocket from 'ws';
import { CynicalModelRouter } from '../models/Router';
import { SkillRegistry } from '../skills/SkillRegistry';
import { MoltBook } from '../memory/MoltBook';
import { AgentLoop } from '../agent/AgentLoop';
import { ToolRouter } from '../agent/ToolRouter';
import { PersonalityManager, PersonalityMode } from '../personality/PersonalityManager';
import { MemoryCompressor } from '../memory/MemoryCompressor';
import { WSMessage, WSResponse, Message } from '../types';
import { logger } from '../utils/logger';

interface ExtendedWSMessage extends WSMessage {
  sessionId?: string;
  mode?: string;
  userId?: string;
}

export class WebSocketHandler {
  private router: CynicalModelRouter;
  private skills: SkillRegistry;
  private moltbook: MoltBook;
  private agentLoop: AgentLoop;
  private toolRouter: ToolRouter;
  private personalityManager: PersonalityManager;
  private memoryCompressor: MemoryCompressor;
  private clients: Map<string, WebSocket> = new Map();
  private sessions: Map<string, Message[]> = new Map();
  private userSessions: Map<string, string> = new Map(); // userId -> sessionId

  constructor() {
    this.router = new CynicalModelRouter();
    this.skills = new SkillRegistry('./skills');
    this.moltbook = new MoltBook(this.router);
    
    // Initialize agent components
    this.agentLoop = new AgentLoop(this.router, this.skills, this.moltbook);
    this.toolRouter = new ToolRouter(this.router, this.skills);
    this.personalityManager = new PersonalityManager(this.router);
    this.memoryCompressor = new MemoryCompressor(this.router);

    // Load skills and start periodic compression
    this.skills.loadSkills().catch(err => {
      logger.error(`Failed to load skills: ${err.message}`);
    });

    // Periodic compression every 6 hours
    setInterval(() => {
      this.memoryCompressor.periodicCompression(7);
    }, 6 * 60 * 60 * 1000);

    logger.log('🧬 WebSocketHandler initialized with Agent Loop capabilities');
  }

  handleConnection(ws: WebSocket, clientId: string): void {
    this.clients.set(clientId, ws);
    this.sessions.set(clientId, []);
    
    // Send welcome with available modes
    this.send(ws, {
      type: 'connected',
      content: '🦇 CynicalClaw Agent initialized',
      timestamp: new Date().toISOString(),
      metadata: {
        clientId,
        availableModes: this.personalityManager.listModes(),
        commands: ['/mode <name>', '/compress', '/status']
      }
    });

    logger.log(`🧬 Agent-capable client connected: ${clientId}`);

    ws.on('message', async (data: string) => {
      try {
        const msg: ExtendedWSMessage = JSON.parse(data);
        await this.handleMessage(ws, clientId, msg);
      } catch (err) {
        this.sendError(ws, 'Invalid JSON format');
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      // Don't delete session immediately - allow reconnection
      setTimeout(() => {
        if (!this.clients.has(clientId)) {
          this.sessions.delete(clientId);
        }
      }, 5 * 60 * 1000); // 5 min grace period
      logger.log(`Client disconnected: ${clientId}`);
    });
  }

  private async handleMessage(
    ws: WebSocket, 
    clientId: string, 
    msg: ExtendedWSMessage
  ): Promise<void> {
    const session = this.sessions.get(clientId) || [];
    const userId = msg.userId || clientId;

    // Command handling
    if (typeof msg.content === 'string' && msg.content.startsWith('/')) {
      await this.handleCommand(ws, clientId, msg);
      return;
    }

    // Auto-route to check if tool needed
    this.send(ws, {
      type: 'thinking',
      content: 'Analyzing request...',
      timestamp: new Date().toISOString()
    });

    const routing = await this.toolRouter.route(msg.payload?.content || msg.content);
    
    let response: string;
    let usedAgentLoop = false;

    if (routing && routing.confidence > 0.6) {
      // High confidence tool use - run agent loop
      usedAgentLoop = true;
      this.send(ws, {
        type: 'tool_selected',
        content: `Selected tool: ${routing.tool}`,
        metadata: { reasoning: routing.reasoning, confidence: routing.confidence },
        timestamp: new Date().toISOString()
      });

      response = await this.agentLoop.run(msg.payload?.content || msg.content, {
        preselectedTool: routing.tool,
        preselectedArgs: routing.args,
        sessionId: msg.sessionId || clientId,
        userId
      });

    } else {
      // Direct response with personality
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        content: msg.payload?.content || msg.content,
        role: 'user',
        timestamp: new Date().toISOString()
      };
      session.push(userMessage);

      const effectiveMode = msg.mode 
        ? (msg.mode as PersonalityMode) 
        : this.personalityManager.getEffectiveMode(userId, clientId);

      response = await this.personalityManager.generateWithPersonality(
        session,
        effectiveMode,
        userId,
        clientId
      );
    }

    // Store and send response
    const assistantMessage: Message = {
      id: `resp-${Date.now()}`,
      content: response,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: { agentLoop: usedAgentLoop }
    };

    if (!usedAgentLoop) {
      session.push(assistantMessage);
      this.sessions.set(clientId, session);
    }

    this.send(ws, {
      type: 'response',
      content: response,
      timestamp: new Date().toISOString(),
      metadata: {
        mode: this.personalityManager.getEffectiveMode(userId, clientId),
        agentLoop: usedAgentLoop,
        sessionSize: session.length
      }
    });

    // Background memory storage
    try {
      await this.moltbook.remember?.(userId, msg.payload?.content || msg.content, response);
    } catch (err) {
      logger.error('Failed to store memory:', err);
    }
  }

  private async handleCommand(
    ws: WebSocket, 
    clientId: string, 
    msg: ExtendedWSMessage
  ): Promise<void> {
    const userId = msg.userId || clientId;
    const content = msg.payload?.content || msg.content;

    if (content.startsWith('/mode ')) {
      const { mode } = this.personalityManager.parseModeCommand(content);
      
      if (mode) {
        this.personalityManager.setUserMode(userId, mode);
        const config = this.personalityManager.getConfig(mode);
        
        this.send(ws, {
          type: 'mode_changed',
          content: `Switched to ${mode} mode ${config.icon}`,
          metadata: { 
            mode,
            description: config.systemPrompt.slice(0, 100) + '...'
          },
          timestamp: new Date().toISOString()
        });
      } else {
        this.sendError(ws, `Invalid mode. Available: ${this.personalityManager.listModes().map(m => m.id).join(', ')}`);
      }
      return;
    }

    if (content === '/compress') {
      this.send(ws, {
        type: 'status',
        content: 'Starting memory compression...',
        timestamp: new Date().toISOString()
      });

      const compressed = await this.memoryCompressor.compressSession(clientId, true);
      
      this.send(ws, {
        type: 'compression_complete',
        content: compressed 
          ? `Session compressed. Summary:\n${compressed.slice(0, 200)}...`
          : 'Nothing to compress',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (content === '/status') {
      const session = this.sessions.get(clientId) || [];
      const mode = this.personalityManager.getEffectiveMode(userId, clientId);
      
      this.send(ws, {
        type: 'status',
        content: `Status: ${mode} mode | Session: ${session.length} messages`,
        metadata: {
          mode,
          messageCount: session.length,
          tools: this.skills.getToolDefinitions().map(t => t.name)
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    this.sendError(ws, 'Unknown command');
  }

  private send(ws: WebSocket, data: WSResponse): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.send(ws, {
      type: 'error',
      content: message,
      timestamp: new Date().toISOString()
    });
  }

  // Public API methods
  async executeSkill(skillName: string, args: any): Promise<string> {
    return this.skills.executeTool(skillName, args);
  }

  getPersonalityModes() {
    return this.personalityManager.listModes();
  }

  getToolDefinitions() {
    return this.skills.getToolDefinitions();
  }
}
