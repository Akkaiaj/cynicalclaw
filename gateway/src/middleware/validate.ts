import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { logger } from '../utils/logger';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      logger.error(`Validation failed: ${error.errors.map((e: any) => e.message).join(', ')}`);
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
        hint: 'Check your input. Computers are picky about these things.'
      });
    }
  };
};
