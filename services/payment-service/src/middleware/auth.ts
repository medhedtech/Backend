import { Request, Response, NextFunction } from 'express';

/**
 * Stub authentication middleware: attaches a user ID and role from headers for testing
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Stub: read user ID and role from headers
  const uid = (req.headers['x-user-id'] as string) || 'anonymous';
  const role = (req.headers['x-user-role'] as string) || 'student';
  (req as any).user = { id: uid, role };
  next();
};

/**
 * Stub authorization middleware: verifies user role is in allowed list
 */
export const authorize = (allowedRoles: string[]) => (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = (req as any).user;
  if (!user || !allowedRoles.includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}; 