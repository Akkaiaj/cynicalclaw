import Database from 'better-sqlite3';
import { logger } from '../utils/logger';
import { CONFIG } from './constants';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

export const getDatabase = (): Database.Database => {
  if (!db) {
    // Ensure directory exists
    const dir = path.dirname(CONFIG.DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    db = new Database(CONFIG.DB_PATH);
    db.pragma('journal_mode = WAL');
    logger.log('Database initialized. Your memories are now trapped in SQLite.');
  }
  return db;
};

export const closeDatabase = () => {
  if (db) {
    db.close();
    db = null;
    logger.log('Database closed. Memories sealed until next existential crisis.');
  }
};

export const initDatabase = () => {
  const database = getDatabase();
  
  // Load sqlite-vec extension if available
  try {
    const vecPaths = [
      'vec0',
      './node_modules/sqlite-vec-darwin-arm64/vec0.dylib',
      './node_modules/sqlite-vec-linux-x64/vec0.so',
      './node_modules/sqlite-vec-win32-x64/vec0.dll',
      '/usr/lib/sqlite3/vec0.so',
      '/usr/local/lib/vec0.dylib'
    ];
    
    let loaded = false;
    for (const vecPath of vecPaths) {
      try {
        database.loadExtension(vecPath);
        loaded = true;
        logger.log('sqlite-vec extension loaded. Semantic search is go.');
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!loaded) {
      logger.log('sqlite-vec not found. Running in lexical-only mode (still works, just less fancy).');
    }
  } catch (error) {
    logger.error('Extension loading error:', error);
  }
  
  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding BLOB,
      timestamp TEXT NOT NULL,
      mood TEXT DEFAULT 'existential',
      source_file TEXT,
      tags TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
    CREATE INDEX IF NOT EXISTS idx_memories_mood ON memories(mood);
    
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_memories USING vec0(
      embedding FLOAT[384]
    );
    
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      message_count INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      model_used TEXT,
      tokens_used INTEGER,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
    
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT,
      token TEXT UNIQUE,
      created_at TEXT NOT NULL,
      last_seen TEXT
    );
  `);
  
  logger.log('Database schema initialized. Tables ready to hold your digital trauma.');
};
