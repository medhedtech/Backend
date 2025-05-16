// API Gateway Configuration
export const config = {
  serviceRoutes: {
    USER: {
      path: '/api/users',
      description: 'User service handles user management, authentication, and authorization'
    },
    COURSE: {
      path: '/api/courses',
      description: 'Course service manages course creation, updates, and enrollment'
    },
    PAYMENT: {
      path: '/api/payments',
      description: 'Payment service handles all payment processing and order management'
    },
    EMAIL: {
      path: '/api/emails',
      description: 'Email service manages email templates and delivery'
    },
    FILE: {
      path: '/api/files',
      description: 'File service handles file uploads, storage, and retrieval'
    },
    SEARCH: {
      path: '/api/search',
      description: 'Search service provides full-text search capabilities'
    },
    ANALYTICS: {
      path: '/api/analytics',
      description: 'Analytics service collects and processes usage data'
    },
    ADMIN: {
      path: '/api/admin',
      description: 'Admin service provides administrative functions'
    }
  },
  
  // Default ports for services when not specified in environment variables
  defaultPorts: {
    USER: 3001,
    COURSE: 3002,
    PAYMENT: 3003,
    EMAIL: 3004,
    FILE: 3005,
    SEARCH: 3006,
    ANALYTICS: 3007,
    ADMIN: 3008,
    GATEWAY: 8080
  }
}; 