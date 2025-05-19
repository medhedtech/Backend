import axios, { AxiosRequestConfig, AxiosError } from 'axios';

// Configuration
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://localhost:3004/api/v1/emails';
const REQUEST_TIMEOUT = parseInt(process.env.EMAIL_REQUEST_TIMEOUT || '5000', 10); // 5 seconds
const MAX_RETRIES = parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10);
const RETRY_DELAY = parseInt(process.env.EMAIL_RETRY_DELAY || '1000', 10); // 1 second

// Response types for better type safety
interface EmailResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Client service for interacting with the email service API
 */
class EmailClientService {
  private healthCheckCache: { status: boolean; timestamp: number } | null = null;
  private healthCheckTtl = 60000; // 1 minute cache for health status

  /**
   * Make API request with retry logic
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @param data - Request data
   * @returns API response
   */
  private async makeRequest(method: 'get' | 'post', endpoint: string, data?: any): Promise<EmailResponse> {
    const url = `${EMAIL_SERVICE_URL}${endpoint}`;
    let attempts = 0;

    const config: AxiosRequestConfig = {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        // Add authentication if implemented
        // 'X-API-Key': process.env.EMAIL_SERVICE_API_KEY,
      }
    };

    while (attempts < MAX_RETRIES) {
      try {
        if (method === 'get') {
          const response = await axios.get(url, config);
          return response.data;
        } else {
          const response = await axios.post(url, data, config);
          return response.data;
        }
      } catch (error) {
        attempts++;
        
        const axiosError = error as AxiosError;
        const statusCode = axiosError.response?.status;
        
        // Don't retry for client errors except timeout or network errors
        if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 408) {
          console.error(`Email service ${method} request to ${endpoint} failed with status ${statusCode}:`, 
            axiosError.response?.data || axiosError.message);
          throw new Error(`Email service error: ${axiosError.message}`);
        }

        // Last attempt, throw the error
        if (attempts >= MAX_RETRIES) {
          console.error(`Email service ${method} request to ${endpoint} failed after ${MAX_RETRIES} attempts:`, 
            axiosError.message);
          throw new Error(`Failed to reach email service after ${MAX_RETRIES} attempts`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        console.warn(`Retrying email service request to ${endpoint} (attempt ${attempts + 1}/${MAX_RETRIES})`);
      }
    }

    throw new Error('Unexpected error in email client service');
  }

  /**
   * Send welcome email to a new user
   * @param email - User email address
   * @param fullName - User's full name
   * @param userData - Additional user data
   * @returns API response
   */
  async sendWelcomeEmail(email: string, fullName: string, userData: Record<string, any> = {}): Promise<EmailResponse> {
    try {
      return await this.makeRequest('post', '/welcome', {
        email,
        fullName,
        ...userData
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  /**
   * Send a password reset email
   * @param email - User email address
   * @param name - User's name
   * @param resetToken - Password reset token
   * @returns API response
   */
  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<EmailResponse> {
    try {
      return await this.makeRequest('post', '/password-reset', {
        email,
        name,
        resetToken
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  /**
   * Send a verification email with OTP
   * @param email - User email address
   * @param name - User's name
   * @param otp - One-time password or verification code
   * @returns API response
   */
  async sendVerificationEmail(email: string, name: string, otp: string): Promise<EmailResponse> {
    try {
      return await this.makeRequest('post', '/verification', {
        email,
        name,
        otp
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw error;
    }
  }

  /**
   * Send a notification email
   * @param email - User email address
   * @param subject - Email subject
   * @param message - Notification message
   * @param data - Additional data
   * @returns API response
   */
  async sendNotificationEmail(email: string, subject: string, message: string, data: Record<string, any> = {}): Promise<EmailResponse> {
    try {
      return await this.makeRequest('post', '/notification', {
        email,
        subject,
        message,
        ...data
      });
    } catch (error) {
      console.error('Failed to send notification email:', error);
      throw error;
    }
  }

  /**
   * Send a custom email with fallback
   * If the email service is down, returns a fallback result
   * @param email - User email address
   * @param options - Email options
   * @param fallbackAction - Optional function to call if email service fails
   */
  async sendEmailWithFallback(
    email: string,
    options: { 
      type: 'welcome' | 'reset' | 'verification' | 'notification';
      data: Record<string, any>;
    }, 
    fallbackAction?: () => Promise<any>
  ): Promise<EmailResponse> {
    try {
      // First check if email service is healthy
      const isHealthy = await this.isServiceHealthy();
      
      if (!isHealthy) {
        console.warn('Email service is down, using fallback for', options.type);
        if (fallbackAction) {
          await fallbackAction();
        }
        return { success: false, message: 'Email service unavailable, used fallback' };
      }
      
      // Service is healthy, send the email based on type
      switch (options.type) {
        case 'welcome':
          return this.sendWelcomeEmail(email, options.data.fullName, options.data);
        case 'reset':
          return this.sendPasswordResetEmail(email, options.data.name, options.data.resetToken);
        case 'verification':
          return this.sendVerificationEmail(email, options.data.name, options.data.otp);
        case 'notification':
          return this.sendNotificationEmail(email, options.data.subject, options.data.message, options.data);
        default:
          throw new Error('Invalid email type');
      }
    } catch (error) {
      console.error(`Failed to send ${options.type} email:`, error);
      if (fallbackAction) {
        await fallbackAction();
        return { success: false, message: 'Email service error, used fallback' };
      }
      throw error;
    }
  }

  /**
   * Check email service health with caching
   * @returns Health status
   */
  async checkHealth(): Promise<EmailResponse> {
    try {
      // Try to use cached health status if available and fresh
      if (this.healthCheckCache && 
          (Date.now() - this.healthCheckCache.timestamp < this.healthCheckTtl)) {
        return { 
          success: this.healthCheckCache.status, 
          message: this.healthCheckCache.status ? 'Email service is healthy (cached)' : 'Email service is unhealthy (cached)'
        };
      }

      // Make actual health check
      const response = await this.makeRequest('get', '/health');
      
      // Cache the result
      this.healthCheckCache = {
        status: response.success === true,
        timestamp: Date.now()
      };
      
      return response;
    } catch (error) {
      // Cache the failure too
      this.healthCheckCache = {
        status: false,
        timestamp: Date.now()
      };
      
      return { success: false, message: 'Email service unreachable' };
    }
  }
  
  /**
   * Check if email service is healthy
   * @returns True if service is healthy
   */
  async isServiceHealthy(): Promise<boolean> {
    const health = await this.checkHealth();
    return health.success === true;
  }
  
  /**
   * Clear health check cache to force fresh check
   */
  clearHealthCache(): void {
    this.healthCheckCache = null;
  }
}

export default new EmailClientService(); 