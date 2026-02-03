import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../config/constants';

const limiter = new RateLimiterMemory({
  keyPrefix: 'cynical_claw',
  points: CONFIG.RATE_LIMIT_POINTS,
  duration: CONFIG.RATE_LIMIT_DURATION,
});

export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = (req as any).user?.deviceId || req.ip;
    await limiter.consume(key);
    next();
  } catch (rejRes: any) {
    res.status(429).json({
      error: 'Too many requests. Even I need a break from your existential questions.',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 60
    });
  }
};
