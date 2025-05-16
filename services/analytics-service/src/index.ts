import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/v1/analytics/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Analytics Service is running',
    timestamp: new Date()
  });
});

app.post('/api/v1/analytics/event', (req, res) => {
  const { eventType, userId, metadata } = req.body;
  
  if (!eventType) {
    return res.status(400).json({
      success: false,
      message: 'Event type is required'
    });
  }

  // This is a placeholder - implement actual event tracking
  res.status(200).json({
    success: true,
    message: 'Event logged successfully',
    data: {
      eventId: `evt_${Date.now()}`,
      eventType,
      userId: userId || 'anonymous',
      timestamp: new Date()
    }
  });
});

app.get('/api/v1/analytics/dashboard', (req, res) => {
  // This is a placeholder - implement actual analytics dashboard data
  res.status(200).json({
    success: true,
    message: 'Analytics dashboard data',
    data: {
      users: {
        total: 0,
        active: 0,
        new: 0
      },
      courses: {
        total: 0,
        popular: []
      },
      revenue: {
        total: 0,
        monthly: 0
      }
    }
  });
});

// Start server
const PORT = 3007;
app.listen(PORT, () => {
  console.log(`Analytics service running on port ${PORT}`);
}); 