import { CynicalModelRouter } from '../models/Router';
import { getDatabase } from '../config/database';
import { logger } from '../utils/logger';

export class MemoryCompressor {
  private router: CynicalModelRouter;
  private compressionThreshold: number = 100; // Compress sessions with 100+ messages

  constructor(router: CynicalModelRouter) {
    this.router = router;
  }

  async compressSession(sessionId: string, force: boolean = false): Promise<string | null> {
    const db = getDatabase();
    
    const messages = db.prepare(`
      SELECT role, content, timestamp, metadata 
      FROM messages 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `).all(sessionId);

    if (messages.length === 0) return null;
    if (!force && messages.length < this.compressionThreshold) return null;

    const rawText = messages.map((m: any) => {
      const meta = m.metadata ? ` [${JSON.parse(m.metadata).mood || 'neutral'}]` : '';
      return `${m.role}${meta}: ${m.content}`;
    }).join('\n');

    const prompt = `Summarize this conversation into a compressed memory format. Extract:
1. Key facts discussed
2. User preferences revealed
3. Decisions made
4. Action items (if any)

Be concise but preserve important details.

Conversation:
${rawText.slice(0, 4000)}

Respond in this format:
SUMMARY:
[bullet points of key information]

CONTEXT:
[brief narrative of what happened]`;

    try {
      const summary = await this.router.routeRequest(
        [{ id: 'compress', content: prompt, role: 'user', timestamp: new Date().toISOString() }],
        'medium',
        'free',
        'clinical'
      );

      // Store summary as memory
      const summaryId = `summary-${sessionId}-${Date.now()}`;
      const compressedContent = `## Session Summary (${messages.length} messages)\n\n${summary}`;
      
      db.prepare(`
        INSERT INTO memories (id, content, timestamp, mood, tags, metadata)
        VALUES (?, ?, ?, 'compressed', ?, ?)
      `).run(
        summaryId,
        compressedContent,
        new Date().toISOString(),
        JSON.stringify(['summary', sessionId, 'auto-compressed']),
        JSON.stringify({ 
          originalMessageCount: messages.length, 
          compressedAt: new Date().toISOString(),
          dateRange: { 
            from: messages[0].timestamp, 
            to: messages[messages.length - 1].timestamp 
          }
        })
      );

      // Delete old messages to free space
      db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);

      logger.log(`🗜️ Compressed session ${sessionId}: ${messages.length} messages → summary`);
      
      return summary;

    } catch (error: any) {
      logger.error(`Failed to compress session ${sessionId}:`, error.message);
      return null;
    }
  }

  async periodicCompression(olderThanDays: number = 7): Promise<number> {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const oldSessions = db.prepare(`
      SELECT DISTINCT session_id, COUNT(*) as message_count
      FROM messages 
      WHERE timestamp < ?
      GROUP BY session_id
      HAVING message_count > 20
    `).all(cutoffDate.toISOString());

    let compressed = 0;
    
    for (const row of oldSessions) {
      const result = await this.compressSession((row as any).session_id);
      if (result) compressed++;
    }

    logger.log(`🗜️ Periodic compression: ${compressed} sessions compressed`);
    return compressed;
  }

  async getSessionSummary(sessionId: string): Promise<string | null> {
    const db = getDatabase();
    
    const summary = db.prepare(`
      SELECT content FROM memories 
      WHERE tags LIKE ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get(`%${sessionId}%`);

    return summary ? (summary as any).content : null;
  }
}
