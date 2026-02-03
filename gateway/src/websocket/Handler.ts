import WebSocket from 'ws';
import { CynicalModelRouter } from '../models/Router';
import { SkillRegistry } from '../skills/SkillRegistry';
import { MoltBook } from '../memory/MoltBook';
import { WSMessage, WSResponse, Message } from '../types';
import { logger } from '../utils/logger';
import { ChatMessageSchema, MemorySearchSchema } from '../schemas';

export class WebSocketHandler {
  private router: CynicalModelRouter;
  private skills: SkillRegistry;
  private moltbook: MoltBook;
  private clients: Map<string, WebSocket> = new Map();
  private sessions: Map<string, Message[]> = new Map();

  constructor() {
    this.router = new CynicalModelRouter();
    this.moltbook = new MoltBook(this.router);
    this.skills = new SkillRegistry();
    
    this.skills.loadSkills().catch(err => {
      logger.error(`Failed to load skills: ${err.message}`);
    });
    
    setInterval(() => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      for (const [sid, messages] of this.sessions) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && new Date(lastMsg.timestamp).getTime() < oneHourAgo) {
          this.sessions.delete(sid);
          logger.log(`Cleaned up expired session: ${sid}`);
        }
      }
    }, 60 * 60 * 1000);
  }

  handleConnection(ws: WebSocket, clientId: string) {
    this.clients.set(clientId, ws);
    logger.log(`Client ${clientId} connected. Welcome to the digital abyss.`);

    this.send(ws, {
      type: 'chat_response',
      id: this.generateId(),
      content: 'Connected to CynicalClaw. Abandon hope all ye who enter here. 🦞',
      timestamp: new Date().toISOString()
    });

    ws.on('message', async (data) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString());
        await this.handleMessage(ws, msg, clientId);
      } catch (error: any) {
        this.send(ws, {
          type: 'error',
          id: this.generateId(),
          error: 'Invalid message format. Did you send JSON or just mash the keyboard?',
          timestamp: new Date().toISOString()
        });
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      logger.log(`Client ${clientId} disconnected. They always leave.`);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for ${clientId}: ${error.message}`);
    });
  }

  private async handleMessage(ws: WebSocket, msg: WSMessage, clientId: string) {
    switch (msg.type) {
      case 'chat':
        await this.handleChat(ws, msg, clientId);
        break;
      case 'tool_call':
        await this.handleToolCall(ws, msg);
        break;
      case 'memory_search':
        await this.handleMemorySearch(ws, msg);
        break;
      case 'ping':
        this.send(ws, { type: 'pong', id: msg.id, timestamp: new Date().toISOString() });
        break;
      default:
        this.send(ws, {
          type: 'error',
          id: msg.id,
          error: `Unknown message type: ${msg.type}. Try 'chat' or 'tool_call'.`,
          timestamp: new Date().toISOString()
        });
    }
  }

  private async handleChat(ws: WebSocket, msg: WSMessage, clientId: string) {
    try {
      const validated = ChatMessageSchema.parse(msg.payload);
      const { content, complexity, budget, personality, sessionId, useTools } = validated;
      
      const sid = sessionId || this.generateId();
      let history = this.sessions.get(sid) || [];
      
      const userMsg: Message = {
        id: this.generateId(),
        content,
        role: 'user',
        timestamp: new Date().toISOString()
      };
      history.push(userMsg);
      
      this.send(ws, {
        type: 'chat_response',
        id: msg.id,
        content: 'Consulting the void...',
        metadata: { loading: true },
        timestamp: new Date().toISOString()
      });

      let responseContent = '';
      
      if (useTools) {
        const toolCall = this.detectToolCall(content);
        if (toolCall) {
          responseContent = await this.skills.executeTool(toolCall.tool, toolCall.args);
        } else {
          responseContent = await this.generateResponse(history, complexity, budget, personality, ws, msg.id);
        }
      } else {
        responseContent = await this.generateResponse(history, complexity, budget, personality, ws, msg.id);
      }
      
      const assistantMsg: Message = {
        id: this.generateId(),
        content: responseContent,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        metadata: {
          model: this.router.getCurrentModel().id,
          mood: personality || 'sarcastic'
        }
      };
      history.push(assistantMsg);
      this.sessions.set(sid, history);
      
      await this.moltbook.writeConversationSummary(content, responseContent);
      
      this.send(ws, {
        type: 'chat_response',
        id: msg.id,
        content: responseContent,
        metadata: {
          sessionId: sid,
          model: this.router.getCurrentModel().id,
          tokens: this.estimateTokens(content + responseContent)
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      this.send(ws, {
        type: 'error',
        id: msg.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async generateResponse(
    history: Message[], 
    complexity: string, 
    budget: string, 
    personality: string | undefined,
    ws: WebSocket,
    msgId: string
  ): Promise<string> {
    let fullResponse = '';
    
    await this.router.routeRequest(
      history,
      complexity as any,
      budget as any,
      personality as any,
      (chunk) => {
        fullResponse += chunk;
        this.send(ws, {
          type: 'chat_response',
          id: msgId,
          content: chunk,
          metadata: { streaming: true },
          timestamp: new Date().toISOString()
        });
      }
    );
    
    return fullResponse;
  }

  private async handleToolCall(ws: WebSocket, msg: WSMessage) {
    try {
      const { tool, args } = msg.payload;
      const result = await this.skills.executeTool(tool, args);
      
      this.send(ws, {
        type: 'tool_result',
        id: msg.id,
        content: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      this.send(ws, {
        type: 'error',
        id: msg.id,
        error: `Tool execution failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async handleMemorySearch(ws: WebSocket, msg: WSMessage) {
    try {
      const { query, mode, limit } = MemorySearchSchema.parse(msg.payload);
      const results = await this.moltbook.searchMemories(query, limit);
      
      this.send(ws, {
        type: 'memory_result',
        id: msg.id,
        content: results,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      this.send(ws, {
        type: 'error',
        id: msg.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private detectToolCall(content: string): { tool: string; args: any } | null {
    if (content.includes('read file')) {
      const match = content.match(/read file\s+(\S+)/);
      if (match) return { tool: 'read_file', args: { path: match[1] } };
    }
    if (content.includes('list directory')) {
      const match = content.match(/list directory\s+(\S+)/);
      if (match) return { tool: 'list_directory', args: { path: match[1] } };
    }
    return null;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  private send(ws: WebSocket, response: WSResponse) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }
  }
}
