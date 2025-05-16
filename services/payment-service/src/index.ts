import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import cors from '../../../shared/middleware/cors';
import helmet from 'helmet';
import morgan from 'morgan';
import paymentRoutes from './routes/payment-routes';
import enrollmentRoutes from './routes/enrollment-routes';
import { connectDB } from './config/db';
import { errorHandler } from '../../../shared/utils/errorHandler';
import { authenticateToken } from '../../../shared/middleware/auth';
import dotenv from 'dotenv';

const app = express();
// Security
app.use(helmet());
// CORS
app.use(cors as any);
// JSON parsing
app.use(express.json());
// Handle JSON parse errors from body-parser
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }
  return next(err);
});
// Logging
app.use(morgan('combined'));

// Load environment variables
dotenv.config();
// Default NODE_ENV to development for detailed error logs
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Connect to MongoDB
connectDB().catch((err) => {
  console.error('Database connection failed:', err);
  process.exit(1);
});

// Routes
app.use('/api/v1/payments', paymentRoutes);
// Enrollment routes
app.use('/api/v1/enrollments', enrollmentRoutes);

// Error handler
app.use(errorHandler as any);

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Payment service listening on port ${PORT}`);
}); 