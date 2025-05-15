import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import handleCors from './middleware/cors';

dotenv.config();

const app = express();
// Security headers
app.use(helmet({ contentSecurityPolicy: false }));
// Enable CORS
app.use(handleCors);
// Body parser with size limit
app.use(express.json({ limit: '10kb' }));
// Data sanitization against NoSQL injection
app.use(mongoSanitize());
// Data sanitization against XSS
app.use(xss());
// Cookie parser
app.use(cookieParser() as any);
// CSRF protection
app.use(csurf({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production' } }) as any);

// Mongoose strictQuery deprecation fix
mongoose.set('strictQuery', false);

// MongoDB connection
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/MedhDB';
mongoose
  .connect(mongoUri, {
    autoIndex: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/v1/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});
