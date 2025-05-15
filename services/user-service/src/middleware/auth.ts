import { Request, Response, NextFunction } from 'express';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  // TODO: implement token verification
  next();
} 