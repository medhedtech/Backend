import { Request, Response, NextFunction } from 'express';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // TODO: Implement JWT or session authentication
  next();
}; 