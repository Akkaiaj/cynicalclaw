import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`);
  
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'UNKNOWN_ERROR',
    sarcasticComment: getSarcasticErrorMessage(),
    ...(isDev && { stack: err.stack })
  });
};

const getSarcasticErrorMessage = (): string => {
  const msgs = [
    "Something broke. Probably your fault. Or the universe. 60/40.",
    "Error occurred. Have you tried turning your expectations off and on again?",
    "Crash detected. The AI equivalent of stubbing a toe.",
    "Well, that didn't work. Much like my hope for humanity.",
    "System failure. I'm as surprised as you are. Actually, less surprised.",
    "Bug detected. It's not a feature, I checked."
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
};
