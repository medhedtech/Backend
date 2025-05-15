import logger from './logger';

export const responseFormatter = {
  /**
   * Format a successful response with consistent structure and logging
   */
  success: (res: any, data: any, message: string = 'Operation successful', status: number = 200) => {
    const requestId = res.req?.requestId;
    const response = {
      success: true,
      message,
      data,
      ...(requestId && { requestId }),
    };
    logger.info(`Success Response: ${message}`, {
      status,
      message,
      requestId,
      responseType: 'success',
      dataSize: data ? JSON.stringify(data).length : 0,
    });
    return res.status(status).json(response);
  },

  /**
   * Format an error response with consistent structure and detailed error logging
   */
  error: (res: any, message: string = 'Operation failed', error: any = null, status: number = 500) => {
    const requestId = res.req?.requestId;
    const response: any = {
      success: false,
      message,
      ...(process.env.NODE_ENV !== 'production' && error && { error }),
      ...(requestId && { requestId }),
    };
    const errorForLogging =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
    if (status >= 500) {
      logger.error(`Server Error: ${message}`, {
        status,
        message,
        error: errorForLogging,
        requestId,
        category: 'API_ERROR',
      });
    } else {
      logger.warn(`Client Error: ${message}`, {
        status,
        message,
        error: errorForLogging,
        requestId,
        category: 'API_ERROR',
      });
    }
    return res.status(status).json(response);
  },

  /**
   * Format a validation error response
   */
  validationError: (res: any, errors: any, message: string = 'Validation failed') => {
    const requestId = res.req?.requestId;
    const formattedErrors = Array.isArray(errors) ? errors : [errors];
    logger.warn(`Validation Error: ${message}`, {
      message,
      errors: formattedErrors,
      requestId,
      category: 'VALIDATION_ERROR',
    });
    return res.status(422).json({
      success: false,
      message,
      errors: formattedErrors,
      ...(requestId && { requestId }),
    });
  },

  /**
   * Format a response for unauthorized access
   */
  unauthorized: (res: any, message: string = 'Unauthorized access') => {
    const requestId = res.req?.requestId;
    logger.warn(`Unauthorized: ${message}`, {
      message,
      requestId,
      ip: res.req?.ip,
      url: res.req?.originalUrl,
      method: res.req?.method,
      category: 'SECURITY',
    });
    return res.status(401).json({
      success: false,
      message,
      ...(requestId && { requestId }),
    });
  },

  /**
   * Format a response for forbidden access
   */
  forbidden: (res: any, message: string = 'Access forbidden') => {
    const requestId = res.req?.requestId;
    logger.warn(`Forbidden: ${message}`, {
      message,
      requestId,
      ip: res.req?.ip,
      url: res.req?.originalUrl,
      method: res.req?.method,
      userId: res.req?.user?._id,
      category: 'SECURITY',
    });
    return res.status(403).json({
      success: false,
      message,
      ...(requestId && { requestId }),
    });
  },

  /**
   * Format a not found response
   */
  notFound: (res: any, message: string = 'Resource not found') => {
    const requestId = res.req?.requestId;
    logger.info(`Not Found: ${message}`, {
      message,
      requestId,
      url: res.req?.originalUrl,
      method: res.req?.method,
      category: 'API_ERROR',
    });
    return res.status(404).json({
      success: false,
      message,
      ...(requestId && { requestId }),
    });
  },
}; 