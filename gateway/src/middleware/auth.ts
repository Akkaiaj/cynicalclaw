import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { CONFIG } from '../config/constants';
import { getDatabase } from '../config/database';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided. Are you trying to break in? Cute.' });
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Malformed token. Try again with proper formatting.' });
  }
  
  const token = parts[1];
  
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    logger.error(`Invalid token attempt`);
    return res.status(403).json({ error: 'Invalid token. This incident will be reported (to /dev/null).' });
  }
};

export const generateDeviceToken = (deviceId: string): string => {
  return jwt.sign(
    { deviceId, type: 'device', createdAt: new Date().toISOString() },
    CONFIG.JWT_SECRET,
    { expiresIn: '365d' }
  );
};

export const registerDevice = async (name: string): Promise<{ id: string; token: string }> => {
  const db = getDatabase();
  const id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  const token = generateDeviceToken(id);
  
  const stmt = db.prepare(`
    INSERT INTO devices (id, name, token, created_at) VALUES (?, ?, ?, ?)
  `);
  
  stmt.run(id, name, token, new Date().toISOString());
  logger.log(`New device registered: ${name} (${id})`);
  
  return { id, token };
};
