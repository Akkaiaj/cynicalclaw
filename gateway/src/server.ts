import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import path from 'path';
import { CONFIG } from './config/constants';
import { initDatabase, closeDatabase } from './config/database';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes/api';
import { WebSocketHandler } from './websocket/Handler';
import { logger } from './utils/logger';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimitMiddleware);

// API routes
app.use('/api', apiRoutes);

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../web-ui/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../web-ui/build/index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    suggestion: 'Try /api/chat or /api/health. Or don\'t. I\'m not your boss.'
  });
});

// Error handling (must be last)
app.use(errorHandler);

// Initialize database
initDatabase();

// Start HTTP server
const server = app.listen(CONFIG.PORT, () => {
  logger.log(`🦞 CynicalClaw HTTP server running on port ${CONFIG.PORT}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`Sarcasm level: ${CONFIG.SARCASM_LEVEL}`);
});

// Start WebSocket server
const wss = new WebSocketServer({ 
  port: CONFIG.WS_PORT,
  verifyClient: (info, cb) => {
    const token = info.req.headers['sec-websocket-protocol'] as string;
    
    if (!token) {
      cb(false, 401, 'Unauthorized');
      return;
    }
    
    try {
      jwt.verify(token, CONFIG.JWT_SECRET);
      cb(true);
    } catch {
      cb(false, 403, 'Forbidden');
    }
  }
});

const wsHandler = new WebSocketHandler();

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  wsHandler.handleConnection(ws, clientId);
});

logger.log(`🔌 WebSocket server running on port ${CONFIG.WS_PORT}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.log('SIGTERM received. Preparing for digital death...');
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.log('Ctrl+C detected. Committing seppuku...');
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

// Handle process errors
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
