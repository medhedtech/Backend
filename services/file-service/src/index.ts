import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/v1/files/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'File Service is running',
    timestamp: new Date()
  });
});

// Placeholder route for file upload
app.post('/api/v1/files/upload', (req, res) => {
  // This is a placeholder - implement actual file upload functionality
  res.status(200).json({
    success: true,
    message: 'File upload placeholder - implement with multer',
    timestamp: new Date()
  });
});

// Static file serving (for local development)
app.use('/api/v1/files/public', express.static(path.join(__dirname, '../uploads')));

// Start server
const PORT = 3005;
app.listen(PORT, () => {
  console.log(`File service running on port ${PORT}`);
}); 