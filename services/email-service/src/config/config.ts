import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  server: {
    port: process.env.PORT || 3004
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'Medh Learning Platform <noreply@example.com>',
    companyName: process.env.COMPANY_NAME || 'Medh Learning Platform'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD
  },
  queue: {
    concurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '5', 10),
    retryAttempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '60000', 10),
    jobTimeout: parseInt(process.env.EMAIL_JOB_TIMEOUT || '30000', 10),
    keepFailedJobs: process.env.EMAIL_KEEP_FAILED_JOBS === 'true'
  },
  expiry: {
    passwordReset: parseInt(process.env.PASSWORD_RESET_EXPIRY_HOURS || '24', 10),
    otp: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10)
  }
};

export default config; 