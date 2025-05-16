import axios, { AxiosRequestConfig } from 'axios';

// Configuration for service ports
const SERVICE_PORTS = {
  USER: process.env.USER_SERVICE_PORT || 3001,
  COURSE: process.env.COURSE_SERVICE_PORT || 3002,
  PAYMENT: process.env.PAYMENT_SERVICE_PORT || 3003,
  EMAIL: process.env.EMAIL_SERVICE_PORT || 3004,
  FILE: process.env.FILE_SERVICE_PORT || 3005,
  SEARCH: process.env.SEARCH_SERVICE_PORT || 3006,
  ANALYTICS: process.env.ANALYTICS_SERVICE_PORT || 3007,
  ADMIN: process.env.ADMIN_SERVICE_PORT || 3008
};

// Service URLs
const SERVICE_URLS = {
  USER: `http://localhost:${SERVICE_PORTS.USER}`,
  COURSE: `http://localhost:${SERVICE_PORTS.COURSE}`,
  PAYMENT: `http://localhost:${SERVICE_PORTS.PAYMENT}`,
  EMAIL: `http://localhost:${SERVICE_PORTS.EMAIL}`,
  FILE: `http://localhost:${SERVICE_PORTS.FILE}`,
  SEARCH: `http://localhost:${SERVICE_PORTS.SEARCH}`,
  ANALYTICS: `http://localhost:${SERVICE_PORTS.ANALYTICS}`,
  ADMIN: `http://localhost:${SERVICE_PORTS.ADMIN}`
};

type ServiceName = keyof typeof SERVICE_URLS;

/**
 * Client for making internal service-to-service API calls
 */
export class ServiceClient {
  /**
   * Make a request to another microservice
   * @param service The target service
   * @param path The API endpoint path
   * @param options Request options (method, data, etc.)
   * @param token Authentication token (optional)
   * @returns Promise with response data
   */
  static async request<T = any>(
    service: ServiceName,
    path: string,
    options: AxiosRequestConfig = {},
    token?: string
  ): Promise<T> {
    const url = `${SERVICE_URLS[service]}${path}`;
    
    // Set default headers
    const headers: Record<string, any> = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    // Add authorization token if provided
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Add internal service call header for tracking/auditing
    headers['X-Internal-Service-Call'] = 'true';
    
    try {
      const response = await axios({
        url,
        ...options,
        headers
      });
      
      return response.data;
    } catch (error: any) {
      // Enhance error with additional context
      if (error.response) {
        error.serviceDetails = {
          service,
          path,
          statusCode: error.response.status,
          statusMessage: error.response.statusText,
        };
      } else {
        error.serviceDetails = {
          service,
          path,
          error: 'Service connection failed'
        };
      }
      throw error;
    }
  }
  
  /**
   * Helper method for GET requests
   */
  static get<T = any>(service: ServiceName, path: string, options: AxiosRequestConfig = {}, token?: string): Promise<T> {
    return this.request<T>(service, path, { ...options, method: 'GET' }, token);
  }

  /**
   * Helper method for POST requests
   */
  static post<T = any>(service: ServiceName, path: string, data: any, options: AxiosRequestConfig = {}, token?: string): Promise<T> {
    return this.request<T>(service, path, { ...options, method: 'POST', data }, token);
  }

  /**
   * Helper method for PUT requests
   */
  static put<T = any>(service: ServiceName, path: string, data: any, options: AxiosRequestConfig = {}, token?: string): Promise<T> {
    return this.request<T>(service, path, { ...options, method: 'PUT', data }, token);
  }

  /**
   * Helper method for DELETE requests
   */
  static delete<T = any>(service: ServiceName, path: string, options: AxiosRequestConfig = {}, token?: string): Promise<T> {
    return this.request<T>(service, path, { ...options, method: 'DELETE' }, token);
  }
} 