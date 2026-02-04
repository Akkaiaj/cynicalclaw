import express from 'express';
import { createServer } from 'http';
import WebSocket from 'ws';
import { WebSocketHandler } from './websocket/Handler';
import { logger } from './utils/logger';

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

const handler = new WebSocketHandler();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    features: ['agent-loop', 'tool-routing', 'memory-compression', 'personality-modes']
  });
});

// Get available modes
app.get('/modes', (req, res) => {
  res.json(handler.getPersonalityModes());
});

// Get available tools
app.get('/tools', (req, res) => {
  res.json(handler.getToolDefinitions());
});

// WebSocket handling
wss.on('connection', (ws, req) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  handler.handleConnection(ws, clientId);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.log(`
🦇 CynicalClaw Agent Gateway
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Port: ${PORT}
Features:
  🧬 Agent Loop (Plan → Execute → Reflect)
  🔀 Auto Tool Routing
  🗜️ Memory Compression  
  🎭 Personality Modes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
