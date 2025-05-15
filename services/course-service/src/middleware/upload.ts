import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';

// Create uploads directory at service root
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage for disk uploads
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Allowed MIME types
const allowedTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'video/mp4',
  'video/webm',
];

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, GIF, PDF, MP4, and WEBM files are allowed.',
      ),
    );
  }
};

// Upload limits
const uploadLimits = { fileSize: 50 * 1024 * 1024, files: 1 };
const multipleUploadLimits = { fileSize: 50 * 1024 * 1024, files: 10 };

// Multer instances
export const upload = multer({ storage, fileFilter, limits: uploadLimits });
export const uploadMultiple = multer({ storage, fileFilter, limits: multipleUploadLimits });

// Error handling middleware
export const handleUploadError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      (req as any).fileError = `File size exceeds limit of ${uploadLimits.fileSize} bytes.`;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      (req as any).fileError = 'Too many files or invalid field name.';
    }
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
}; 