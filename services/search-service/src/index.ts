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
app.get('/api/v1/search/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Search Service is running',
    timestamp: new Date()
  });
});

app.get('/api/v1/search', (req, res) => {
  const { query, type } = req.query;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required'
    });
  }

  // This is a placeholder - implement actual search functionality
  res.status(200).json({
    success: true,
    message: 'Search placeholder',
    data: {
      query,
      type: type || 'all',
      results: []
    }
  });
});

// Start server
const PORT = 3006;
app.listen(PORT, () => {
  console.log(`Search service running on port ${PORT}`);
}); 