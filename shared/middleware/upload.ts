import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

const storage = multer.memoryStorage();
export const upload = multer({ storage });
export const uploadMultiple = multer({ storage });

/**
 * Error handling middleware for file uploads
 */
export const handleUploadError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
}; 