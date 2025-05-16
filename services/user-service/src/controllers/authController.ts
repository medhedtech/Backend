import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../../../../shared/models/user';
import userValidation from '../validations/userValidation';
import EmailService from '../services/emailService';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Define interfaces for handling user properties safely
interface UserProperties {
  _id: mongoose.Types.ObjectId;
  email: string;
  full_name: string;
  role: string[];
  permissions?: string[];
  password?: string;
  last_login?: Date;
  login_count?: number;
}

class AuthController {
  async registerUser(req: Request, res: Response) {
    // Validate request body
    const { error, value } = userValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const { full_name, email, password, agree_terms, phone_numbers } = value;
    try {
      // Check for existing user
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }
      // Hash password
      const hashed = await bcrypt.hash(password, 10);
      // Create user
      const user = await User.create({ full_name, email, password: hashed, agree_terms, phone_numbers });
      // Send welcome email (stub)
      await new EmailService().sendWelcomeEmail(email, full_name, {});
      return res.status(201).json({ success: true, data: user });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  }

  async loginUser(req: Request, res: Response) {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    try {
      console.log('Attempting to find user in database...');
      
      // Use native MongoDB driver directly to avoid Mongoose buffering timeout issues
      const nativeConnection = mongoose.connection.db;
      
      // Check if connection is established
      if (!nativeConnection) {
        throw new Error('Database connection not established');
      }
      
      const usersCollection = nativeConnection.collection('users');
      
      // Set a timeout for the operation
      const user = await usersCollection.findOne(
        { email },
        { 
          maxTimeMS: 30000,
          projection: { password: 1, email: 1, full_name: 1, role: 1, permissions: 1, _id: 1 }
        }
      );
      
      if (!user) {
        console.log('User not found:', email);
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      
      console.log('User found. Verifying password...');
      
      // Get password from the document
      const userPassword = user.password || '';
      
      // Verify password
      const isMatch = await bcrypt.compare(password, String(userPassword));
      if (!isMatch) {
        console.log('Invalid password for:', email);
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      
      console.log('Password verified. Generating tokens...');
      
      // User is authenticated - generate JWT token
      const jwtSecret = process.env.JWT_SECRET_KEY || 'your-secret-key';
      
      // Generate tokens
      const accessToken = jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: '1h' }
      );
      
      const refreshToken = jwt.sign(
        { id: user._id.toString(), type: 'refresh' },
        jwtSecret,
        { expiresIn: '7d' }
      );
      
      // Update last login timestamp using direct update with native driver
      try {
        console.log('Updating last login timestamp...');
        
        await usersCollection.updateOne(
          { _id: user._id },
          { 
            $set: { last_login: new Date() },
            $inc: { login_count: 1 }
          },
          { maxTimeMS: 30000 }
        );
      } catch (updateError) {
        console.error('Error updating last login:', updateError);
        // Continue despite this error
      }
      
      console.log('Login successful for:', email);
      
      // Return successful response with tokens
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          id: user._id.toString(),
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          permissions: user.permissions || [],
          access_token: accessToken,
          refresh_token: refreshToken,
        },
      });
    } catch (err: any) {
      console.error('Login error details:', err);
      
      // Provide more specific error messages based on error type
      if (err.name === 'MongoServerSelectionError') {
        console.error('MongoDB connection error - server selection failed');
        return res.status(503).json({ 
          success: false, 
          message: 'Database connection error. Please try again later.',
          error: 'Connection to database failed'
        });
      }
      
      if (err.message && err.message.includes('timed out')) {
        return res.status(504).json({
          success: false,
          message: 'Database request timed out. Please try again later.',
          error: 'Request timeout'
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Server error during authentication', 
        error: err.message 
      });
    }
  }

  refreshToken(req: Request, res: Response) {
    res.status(501).json({ message: 'refreshToken not implemented' });
  }

  logout(req: Request, res: Response) {
    res.status(501).json({ message: 'logout not implemented' });
  }

  forgotPassword(req: Request, res: Response) {
    res.status(501).json({ message: 'forgotPassword not implemented' });
  }

  resetPassword(req: Request, res: Response) {
    res.status(501).json({ message: 'resetPassword not implemented' });
  }

  getAllUsers(req: Request, res: Response) {
    res.status(501).json({ message: 'getAllUsers not implemented' });
  }

  getAllStudents(req: Request, res: Response) {
    res.status(501).json({ message: 'getAllStudents not implemented' });
  }

  getUserById(req: Request, res: Response) {
    res.status(501).json({ message: 'getUserById not implemented' });
  }

  updateUser(req: Request, res: Response) {
    res.status(501).json({ message: 'updateUser not implemented' });
  }

  updateUserByEmail(req: Request, res: Response) {
    res.status(501).json({ message: 'updateUserByEmail not implemented' });
  }

  deleteUser(req: Request, res: Response) {
    res.status(501).json({ message: 'deleteUser not implemented' });
  }

  toggleUserStatus(req: Request, res: Response) {
    res.status(501).json({ message: 'toggleUserStatus not implemented' });
  }
}

export default new AuthController();