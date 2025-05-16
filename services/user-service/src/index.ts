import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';

// Load environment variables
dotenv.config();

const app = express();

// Security headers
// @ts-ignore
app.use(helmet({ contentSecurityPolicy: false }));
// Body parser with size limit
app.use(express.json({ limit: '10kb' }));
// Data sanitization against NoSQL injection
app.use(mongoSanitize() as any);

// Health check / root API v1 endpoint
app.get('/api/v1', (req, res) => {
  res.status(200).json({ success: true, message: 'User Service API v1' });
});

// Mongoose strictQuery deprecation fix
mongoose.set('strictQuery', false);

// Configure mongoose globally to prevent buffering timeout issues
mongoose.set('bufferTimeoutMS', 30000); // Increase buffer timeout to 30 seconds

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
console.log('Connecting to MongoDB at:', mongoUri);

// This forces a direct connection without buffering commands
const connectWithRetry = async () => {
  try {
    await mongoose.connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 60000, // 60 seconds
      connectTimeoutMS: 60000, // 60 seconds
      socketTimeoutMS: 90000, // 90 seconds
      bufferCommands: false, // Disable buffering entirely
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

// Routes
app.use('/api/v1/auth', authRoutes);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});
