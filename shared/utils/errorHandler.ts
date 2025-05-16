import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Treat any environment other than production as development mode
  if (process.env.NODE_ENV !== 'production') {
    logger.error('Error details:', {
      error: err,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
      user: (req as any).user ? (req as any).user.id : 'anonymous',
    });

    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // Production error response
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Programming or unknown errors
  logger.error('Unexpected error:', {
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: (req as any).user ? (req as any).user.id : 'anonymous',
  });

  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
}; 