import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import logger from '../../../../shared/utils/logger';
import { ENV_VARS } from '../../../../shared/config/envVars';

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const { ALLOWED_ORIGINS, NODE_ENV } = ENV_VARS;

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin) || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      // Log rejected origins for debugging
      logger.warn(`CORS rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-access-token'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Create CORS middleware
const corsMiddleware = cors(corsOptions);

// Middleware to handle preflight requests for all routes
export default function handleCors(req: Request, res: Response, next: NextFunction) {
  // First, set basic CORS headers for all requests as a fallback
  const origin = req.headers.origin as string;
  if (origin && (ENV_VARS.ALLOWED_ORIGINS.includes(origin) || ENV_VARS.NODE_ENV === 'development')) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header(
      'Access-Control-Allow-Headers',
      'X-Requested-With, Content-Type, Authorization, Accept, x-access-token',
    );
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  // If this is a preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    // Log the preflight request
    logger.info('CORS Preflight Request', { url: req.originalUrl, origin });

    // Apply CORS headers and respond immediately
    return cors(corsOptions)(req, res, () => {
      res.status(204).end();
    });
  }

  // For non-OPTIONS requests, apply regular CORS middleware
  return corsMiddleware(req, res, next);
} 