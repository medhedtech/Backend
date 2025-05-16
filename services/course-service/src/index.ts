import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import handleCors from './middleware/cors';
import mongoSanitize from 'express-mongo-sanitize';
// @ts-ignore: no type definitions for xss-clean
import xss from 'xss-clean';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import mongoose from 'mongoose';

import courseRoutes from './routes/course-routes';

// Load environment variables
dotenv.config();

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));
// CORS
app.use(handleCors);
// Body parser
app.use(express.json({ limit: '10kb' }));
// Data sanitization
app.use(mongoSanitize());
app.use(xss());
// Cookies & CSRF
app.use(cookieParser());
// Apply CSRF protection only for non-safe methods
const csrfProtection = csurf({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production' } }) as any;
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// MongoDB connection
const mongoUri = process.env.MONGO_URI || 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
mongoose.set('strictQuery', false);

// Configure mongoose globally to prevent buffering timeout issues
mongoose.set('bufferTimeoutMS', 30000); // Increase buffer timeout to 30 seconds

mongoose.connect(mongoUri, { 
  autoIndex: true,
  serverSelectionTimeoutMS: 60000, // 60 seconds
  connectTimeoutMS: 60000, // 60 seconds
  socketTimeoutMS: 90000, // 90 seconds
  bufferCommands: true, // Enable buffering with extended timeout
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Health check / root API v1 endpoint
app.get('/api/v1', (req, res) => {
  res.status(200).json({ success: true, message: 'Course Service API v1' });
});

// Routes
app.use('/api/v1/courses', courseRoutes);

// Start server
const PORT = 3002;
app.listen(PORT, () => console.log(`Course Service running on port ${PORT}`)); 