import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user';
import userValidation from '../validations/userValidation';
import EmailService from '../services/emailService';
import jwt from 'jsonwebtoken';

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
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    try {
      // Find user by email and verify password
      const user = await User.findOne({ email });
      const isMatch = user && (await bcrypt.compare(password, user.password));
      if (!user || !isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }
      // Generate tokens
      const accessToken = jwt.sign(
        { id: user._id.toString(), type: 'access', role: user.role },
        process.env.JWT_SECRET_KEY!,
        { expiresIn: '1h' }
      );
      const refreshToken = jwt.sign(
        { id: user._id.toString(), type: 'refresh' },
        process.env.JWT_SECRET_KEY!,
        { expiresIn: '7d' }
      );
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
      console.error('Login error:', err);
      return res.status(500).json({ success: false, message: 'Server error', error: err.message });
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