import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Service ports
const SERVICE_PORTS = {
  USER: 3001,
  COURSE: 3002,
  PAYMENT: 3003,
  EMAIL: 3004,
  FILE: 3005,
  SEARCH: 3006,
  ANALYTICS: 3007,
  ADMIN: 3008
};

// Create Express server
const app = express();
const PORT = process.env.API_GATEWAY_PORT || 8080;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send({
    status: 'UP',
    message: 'API Gateway is running',
    timestamp: new Date()
  });
});

// Proxy middleware configuration
const createServiceProxy = (servicePort: string | number, pathRewrite = {}) => {
  return createProxyMiddleware({
    target: `http://localhost:${servicePort}`,
    changeOrigin: true,
    pathRewrite: pathRewrite,
    logLevel: 'silent',
    onProxyReq: (proxyReq, req, res) => {
      // Handle JSON request bodies
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        
        // Update content-length header
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.setHeader('Content-Type', 'application/json');
        
        // Write body data to the proxy request
        proxyReq.write(bodyData);
      }
    }
  });
};

// Service routes
app.use('/api/v1/users', createServiceProxy(SERVICE_PORTS.USER));
app.use('/api/v1/auth', createServiceProxy(SERVICE_PORTS.USER, { '^/api/v1/auth': '/api/v1/auth' }));
app.use('/api/v1/courses', createServiceProxy(SERVICE_PORTS.COURSE));
app.use('/api/v1/payments', createServiceProxy(SERVICE_PORTS.PAYMENT));
app.use('/api/v1/emails', createServiceProxy(SERVICE_PORTS.EMAIL));
app.use('/api/v1/files', createServiceProxy(SERVICE_PORTS.FILE));
app.use('/api/v1/search', createServiceProxy(SERVICE_PORTS.SEARCH));
app.use('/api/v1/analytics', createServiceProxy(SERVICE_PORTS.ANALYTICS));
app.use('/api/v1/admin', createServiceProxy(SERVICE_PORTS.ADMIN));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Gateway Error:', err);
  res.status(500).send({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred in the API Gateway'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Available routes:');
  console.log('- /api/v1/users -> User Service');
  console.log('- /api/v1/auth -> User Service (Auth Endpoints)');
  console.log('- /api/v1/courses -> Course Service');
  console.log('- /api/v1/payments -> Payment Service');
  console.log('- /api/v1/emails -> Email Service');
  console.log('- /api/v1/files -> File Service');
  console.log('- /api/v1/search -> Search Service');
  console.log('- /api/v1/analytics -> Analytics Service');
  console.log('- /api/v1/admin -> Admin Service');
}); 