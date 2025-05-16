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
app.get('/api/v1/emails/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Email Service is running',
    timestamp: new Date()
  });
});

app.post('/api/v1/emails/send', (req, res) => {
  // This is a placeholder - implement actual email sending functionality
  const { to, subject, body } = req.body;
  
  if (!to || !subject || !body) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: to, subject, body'
    });
  }

  // For now, we'll just acknowledge the request
  res.status(200).json({
    success: true,
    message: 'Email queued for delivery',
    data: {
      to,
      subject,
      timestamp: new Date()
    }
  });
});

// Start server
const PORT = 3004;
app.listen(PORT, () => {
  console.log(`Email service running on port ${PORT}`);
}); 