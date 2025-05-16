import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { AppError } from '../../../../shared/utils/errorHandler';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extracted = errors.array().map(err => ({ field: err.param, message: err.msg }));
    return res.status(400).json({ success: false, errors: extracted });
  }
  next();
};

/**
 * Middleware to validate MongoDB ObjectId parameters
 */
export const validateObjectId = (paramName: string) => (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const value = req.params[paramName];
  if (!mongoose.isValidObjectId(value)) {
    return next(new AppError(`${paramName} must be a valid ID`, 400));
  }
  next();
}; 