import { getDatabase } from '../config/database';
import { MemoryEntry } from '../types';
import { logger } from '../utils/logger';

export class VectorStore {
  private db = getDatabase();

  async addEntry(entry: MemoryEntry): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO memories (id, content, timestamp, mood, source_file, tags)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        entry.id,
        entry.content,
        entry.timestamp,
        entry.mood,
        entry.sourceFile || null,
        entry.tags ? JSON.stringify(entry.tags) : null
      );

      if (entry.embedding && entry.embedding.length === 384) {
        try {
          const vecStmt = this.db.prepare(`
            INSERT INTO vec_memories (rowid, embedding)
            VALUES ((SELECT rowid FROM memories WHERE id = ?), ?)
          `);
          
          const buffer = Buffer.from(new Float32Array(entry.embedding).buffer);
          vecStmt.run(entry.id, buffer);
        } catch (e) {
          // Vector table might not exist, continue without it
        }
      }
      
      logger.log(`Vectorized memory ${entry.id}. Another trauma digitized.`);
    } catch (error: any) {
      logger.error(`Failed to store vector: ${error.message}`);
      throw error;
    }
  }

  async searchSimilar(embedding: number[], limit: number = 5): Promise<MemoryEntry[]> {
    try {
      const buffer = Buffer.from(new Float32Array(embedding).buffer);
      
      const rows = this.db.prepare(`
        SELECT m.*, vec_distance_cosine(v.embedding, ?) as distance
        FROM memories m
        JOIN vec_memories v ON m.rowid = v.rowid
        ORDER BY distance
        LIMIT ?
      `).all(buffer, limit);
      
      return rows.map((row: any) => ({
        id: row.id,
        content: row.content,
        timestamp: row.timestamp,
        mood: row.mood,
        sourceFile: row.source_file,
        tags: row.tags ? JSON.parse(row.tags) : []
      }));
    } catch (error: any) {
      logger.error(`Vector search failed: ${error.message}`);
      return [];
    }
  }

  async hybridSearch(query: string, embedding: number[], limit: number = 5): Promise<MemoryEntry[]> {
    const lexicalResults = this.searchLexical(query, limit);
    const semanticResults = await this.searchSimilar(embedding, limit);
    
    const seen = new Set();
    const merged = [];
    
    for (const result of [...lexicalResults, ...semanticResults]) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        merged.push(result);
      }
    }
    
    return merged.slice(0, limit);
  }

  private searchLexical(query: string, limit: number): MemoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM memories 
      WHERE content LIKE ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(`%${query}%`, limit);
    
    return rows.map((row: any) => ({
      id: row.id,
      content: row.content,
      timestamp: row.timestamp,
      mood: row.mood,
      sourceFile: row.source_file,
      tags: row.tags ? JSON.parse(row.tags) : []
    }));
  }
}
