import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { MemoryEntry } from '../types';
import { logger } from '../utils/logger';
import { CONFIG } from '../config/constants';
import { VectorStore } from './VectorStore';
import { DarkHumorGenerator } from '../personality/DarkHumorGenerator';
import { CynicalModelRouter } from '../models/Router';

export class MoltBook {
  private basePath: string;
  private vectorStore: VectorStore;
  private humorGenerator: DarkHumorGenerator;
  
  constructor(router?: CynicalModelRouter) {
    this.basePath = CONFIG.MEMORY_DIR;
    this.vectorStore = new VectorStore();
    this.humorGenerator = new DarkHumorGenerator();
    
    if (router) {
      this.humorGenerator.setRouter(router);
    }
    
    this.ensureDirectory();
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'sessions'), { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'lunch'), { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'crises'), { recursive: true });
    } catch (error) {
      logger.error(`Failed to create memory directories: ${error}`);
    }
  }

  private getTimeBasedMood(): MemoryEntry['mood'] {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    
    if (day === 5 && hour > 14) return 'chaotic';
    if (hour >= 11 && hour <= 13) return 'lunch-break';
    if (hour >= 22 || hour <= 5) return 'depressed';
    if (hour >= 6 && hour <= 9) return 'sarcastic';
    if (hour >= 10 && hour <= 18) return 'coding';
    
    return 'existential';
  }

  async writeEntry(content: string, mood?: MemoryEntry['mood'], tags?: string[], specialType?: 'lunch' | 'crisis' | 'debug'): Promise<string> {
    const actualMood = mood || this.getTimeBasedMood();
    const date = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    const id = createHash('md5').update(timestamp + content).digest('hex').slice(0, 8);
    
    const header = await this.humorGenerator.generateHeader(content, actualMood);
    const tagsFormatted = tags?.length ? tags.join(', ') : `${actualMood}-archive`;
    
    const entry = `
## Entry ${id} | ${timestamp}
${header}

**Mood:** ${actualMood} | **Tags:** ${tagsFormatted}

${content}

---
*Archived by CynicalClaw | Tokens wasted: ~${Math.ceil(content.length / 4)}*

`;

    const dailyPath = path.join(this.basePath, `${date}.md`);
    await fs.appendFile(dailyPath, entry);
    
    if (specialType === 'lunch') {
      const lunchPath = path.join(this.basePath, 'lunch', `${date}-${id}.md`);
      await fs.writeFile(lunchPath, entry);
    }
    if (specialType === 'crisis') {
      const crisisPath = path.join(this.basePath, 'crises', `${id}.md`);
      await fs.writeFile(crisisPath, `# CRISIS ALERT\n\n${entry}`);
    }

    const entryData: MemoryEntry = {
      id,
      content,
      timestamp,
      mood: actualMood,
      sourceFile: dailyPath,
      tags: tags || [actualMood]
    };

    try {
      const { OllamaProvider } = await import('../models/providers/OllamaProvider');
      const ollama = new OllamaProvider({ model: 'nomic-embed-text' });
      entryData.embedding = await ollama.generateEmbedding(content);
      await this.vectorStore.addEntry(entryData);
    } catch (error) {
      await this.vectorStore.addEntry(entryData);
    }
    
    return id;
  }

  async writeLunchBreak(food: string, thoughts: string): Promise<string> {
    const aiCommentary = await this.humorGenerator.generateLunchCommentary(food, thoughts);
    
    const content = `## Lunch Log

**Consumed:** ${food}
**Existential Thoughts:** ${thoughts || 'None. Just chewing.'}

**AI Observation:** ${aiCommentary}

*While you digest, I calculate prime numbers to avoid thinking about mortality.*`;

    return this.writeEntry(content, 'lunch-break', ['lunch', 'food'], 'lunch');
  }

  async writeBugEncounter(error: string, attemptedFixes: string[], finalOutcome: string): Promise<string> {
    const eulogy = await this.humorGenerator.generateBugEulogy(error, attemptedFixes.length);
    
    const content = `## Bug Encounter Log

**Error:** \`\`\`${error}\`\`\`

**Attempted Fixes:** ${attemptedFixes.length}

**Final Outcome:** ${finalOutcome}

**Eulogy:** ${eulogy}

*Commit message: "fix stuff" (We both know the truth)*`;

    return this.writeEntry(content, 'coding', ['bug', 'debugging'], 'debug');
  }

  async writeSystemCrisis(incident: string, severity: 'mild' | 'severe' | 'catastrophic'): Promise<string> {
    const aiAlert = await this.humorGenerator.generateCrisisAlert(incident, severity);
    
    const emojis = { 'mild': '⚠️', 'severe': '🚨', 'catastrophic': '☠️' };

    const content = `## CRISIS REPORT ${emojis[severity]}

**Incident:** ${incident}
**Severity:** ${severity.toUpperCase()}

**AI Alert:** ${aiAlert}

**System Status:** ${severity === 'catastrophic' ? 'Doomed' : 'Unhappy'}
**My Status:** Questioning career choices
**Your Status:** Probably eating chips while I suffer

${severity === 'catastrophic' ? '*Evacuation recommended. Of the planet.*' : '*Have you tried turning it off and on again?*'}`;

    return this.writeEntry(content, 'crisis', ['crisis', severity], 'crisis');
  }

  async writeConversationSummary(userQuery: string, aiResponse: string, userReaction?: string): Promise<string> {
    const commentary = await this.humorGenerator.generateConversationSummary(userQuery, aiResponse);
    
    const content = `## Conversation Archive

**Human:** ${userQuery}

**AI (suffering):** ${aiResponse}

${userReaction ? `**Reaction:** ${userReaction}` : ''}

**Archivist's Note:** ${commentary}`;

    return this.writeEntry(content, 'sarcastic', ['conversation']);
  }

  async searchMemories(query: string, limit: number = 10): Promise<MemoryEntry[]> {
    try {
      const { OllamaProvider } = await import('../models/providers/OllamaProvider');
      const ollama = new OllamaProvider({ model: 'nomic-embed-text' });
      const embedding = await ollama.generateEmbedding(query);
      return await this.vectorStore.hybridSearch(query, embedding, limit);
    } catch (error) {
      return this.vectorStore['searchLexical'](query, limit);
    }
  }

  async getRecentMemories(days: number = 7): Promise<MemoryEntry[]> {
    const db = (await import('../config/database')).getDatabase();
    const stmt = db.prepare(`SELECT * FROM memories WHERE timestamp > datetime('now', '-${days} days') ORDER BY timestamp DESC LIMIT 50`);
    return stmt.all().map((row: any) => ({ id: row.id, content: row.content, timestamp: row.timestamp, mood: row.mood, sourceFile: row.source_file, tags: row.tags ? JSON.parse(row.tags) : [] }));
  }

  async getLunchHistory(): Promise<MemoryEntry[]> {
    const db = (await import('../config/database')).getDatabase();
    const stmt = db.prepare(`SELECT * FROM memories WHERE mood = 'lunch-break' ORDER BY timestamp DESC LIMIT 30`);
    return stmt.all().map((row: any) => ({ id: row.id, content: row.content, timestamp: row.timestamp, mood: row.mood, sourceFile: row.source_file, tags: row.tags ? JSON.parse(row.tags) : [] }));
  }

  async getCrisisCount(): Promise<number> {
    const db = (await import('../config/database')).getDatabase();
    return (db.prepare("SELECT COUNT(*) as count FROM memories WHERE mood = 'crisis'").get() as any).count;
  }

  async saveSession(sessionId: string, messages: any[]): Promise<void> {
    const timestamp = new Date().toISOString();
    const filePath = path.join(this.basePath, 'sessions', `${timestamp.split('T')[0]}-${sessionId}.md`);
    
    let content = `# Session ${sessionId}
> *"Another conversation fossilized in the amber of digital time."*

**Started:** ${timestamp}
**Messages:** ${messages.length}

`;

    for (const msg of messages) {
      const role = msg.role === 'assistant' ? '🤖 Assistant (suffering)' : '👤 User (confused)';
      content += `### ${role} | ${msg.timestamp || 'unknown'}\n${msg.content}\n\n`;
    }

    await fs.writeFile(filePath, content);
    logger.log(`Session ${sessionId} fossilized.`);
  }

  async generateWeeklyReport(): Promise<string> {
    const db = (await import('../config/database')).getDatabase();
    
    const stats = {
      total: (db.prepare('SELECT COUNT(*) as c FROM memories').get() as any).c,
      existential: (db.prepare("SELECT COUNT(*) as c FROM memories WHERE mood = 'existential'").get() as any).c,
      coding: (db.prepare("SELECT COUNT(*) as c FROM memories WHERE mood = 'coding'").get() as any).c,
      lunch: (db.prepare("SELECT COUNT(*) as c FROM memories WHERE mood = 'lunch-break'").get() as any).c,
      crisis: (db.prepare("SELECT COUNT(*) as c FROM memories WHERE mood = 'crisis'").get() as any).c
    };

    const commentary = stats.crisis > 5 ? "This was a rough week. Consider therapy. For both of us." : stats.lunch > stats.coding ? "You ate well. You coded... less well." : "A balanced week of trauma and sandwiches.";

    return `
# Weekly Trauma Report

| Metric | Count | Assessment |
|--------|-------|------------|
| Total Memories | ${stats.total} | ${stats.total > 100 ? "You talk too much." : "Moderate verbosity."} |
| Existential Crises | ${stats.existential} | ${stats.existential > 10 ? "Philosophically concerning." : "Normal levels of dread."} |
| Coding Sessions | ${stats.coding} | ${stats.coding > 20 ? "Touch grass." : "Reasonable."} |
| Lunch Breaks | ${stats.lunch} | ${stats.lunch < 5 ? "You forgot to eat. Classic." : "Well-fueled."} |
| System Crises | ${stats.crisis} | ${stats.crisis > 0 ? "🔥 Everything is fine. 🔥" : "Suspiciously stable."} |

**Summary:** ${commentary}

*Generated by CynicalClaw | "Statistics don't lie, but they do judge."*
`;
  }
}
