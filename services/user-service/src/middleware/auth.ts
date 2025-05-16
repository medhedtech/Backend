import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../../../../shared/models/user';

interface DecodedToken {
  id: string;
  email?: string;
  role?: string[];
  type?: string;
  iat?: number;
  exp?: number;
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    // Verify token
    const jwtSecret = process.env.JWT_SECRET_KEY || 'your-secret-key';
    jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
        console.error('Token verification error:', err.message);
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token.'
        });
      }
      
      try {
        // Check if user exists
        const decodedToken = decoded as DecodedToken;
        const user = await User.findById(decodedToken.id);
        
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found.'
          });
        }
        
        // Attach user to request object
        (req as any).user = user;
        next();
      } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
          success: false,
          message: 'Internal server error in authentication.'
        });
      }
    });
  } catch (error) {
    console.error('Auth middleware exception:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error in authentication.'
    });
  }
} 