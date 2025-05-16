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
app.get('/api/v1/admin/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin Service is running',
    timestamp: new Date()
  });
});

app.get('/api/v1/admin/dashboard', (req, res) => {
  // This is a placeholder - implement actual admin dashboard
  res.status(200).json({
    success: true,
    message: 'Admin dashboard data',
    data: {
      stats: {
        users: 0,
        courses: 0,
        revenue: 0,
        orders: 0
      },
      recentActivities: []
    }
  });
});

// Start server
const PORT = 3008;
app.listen(PORT, () => {
  console.log(`Admin service running on port ${PORT}`);
}); 