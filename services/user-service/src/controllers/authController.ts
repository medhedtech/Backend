import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../../../../shared/models/user';
import userValidation from '../validations/userValidation';
import emailClientService from '../services/emailClientService';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';

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

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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
      
      // Send welcome email with fallback handling
      try {
        await emailClientService.sendEmailWithFallback(
          email, 
          {
            type: 'welcome',
            data: { fullName: full_name }
          },
          // Optional fallback function that runs if email service is down
          async () => {
            console.log(`Email service unavailable. Logging welcome email request for ${email} for later processing`);
            // Here you could log to database for retry later
          }
        );
      } catch (emailError) {
        // Log but don't fail registration if email fails
        console.error('Welcome email could not be sent, but user was created:', emailError);
      }
      
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

  async refreshToken(req: Request, res: Response) {
    try {
      const { refresh_token } = req.body;
      
      // Check if refresh token exists in request body
      if (!refresh_token) {
        return res.status(400).json({
          success: false, 
          message: "Refresh token is required"
        });
      }
      
      // Verify refresh token
      const jwtSecret = process.env.JWT_SECRET_KEY || 'your-secret-key';
      
      try {
        const decoded = jwt.verify(refresh_token, jwtSecret) as any;
        
        if (!decoded || !decoded.id || decoded.type !== 'refresh') {
          return res.status(401).json({
            success: false,
            message: "Invalid refresh token"
          });
        }
        
        // Find user
        const user = await User.findById(decoded.id);
        if (!user) {
          return res.status(401).json({
            success: false,
            message: "User not found"
          });
        }
        
        // Generate new tokens
        const accessToken = jwt.sign(
          { id: user._id.toString(), email: user.email, role: user.role },
          jwtSecret,
          { expiresIn: '1h' }
        );
        
        const newRefreshToken = jwt.sign(
          { id: user._id.toString(), type: 'refresh' },
          jwtSecret,
          { expiresIn: '7d' }
        );
        
        return res.status(200).json({
          success: true,
          message: "Token refreshed successfully",
          data: {
            access_token: accessToken,
            refresh_token: newRefreshToken
          }
        });
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired refresh token"
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Server error during token refresh",
        error: error.message
      });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      // In a more complete implementation, we would invalidate the refresh token
      // by adding it to a blacklist or removing it from storage
      
      // Since we don't have token storage implemented yet, we'll just
      // acknowledge the logout request
      
      return res.status(200).json({
        success: true,
        message: "Logout successful"
      });
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        message: "Server error during logout", 
        error: error.message 
      });
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required"
        });
      }
      
      // Find the user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(20).toString("hex");
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      
      // Set token expiry time (1 hour)
      const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      
      // Update user with reset token info
      await User.findByIdAndUpdate(user._id, {
        resetPasswordToken,
        resetPasswordExpires
      });
      
      // Create reset URL
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
      
      try {
        const emailResult = await emailClientService.sendEmailWithFallback(
          email, 
          {
            type: 'reset',
            data: { 
              name: user.full_name as string, 
              resetToken,
              resetUrl
            }
          },
          // Fallback function if email service is down
          async () => {
            console.log(`Email service unavailable. Logging password reset request for ${email}`);
            // Could log to database for retry later
          }
        );
        
        return res.status(200).json({
          success: true,
          message: "Password reset email sent",
          emailStatus: emailResult.success
        });
      } catch (emailError: any) {
        // If email service completely fails, reset the token
        await User.findByIdAndUpdate(user._id, {
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined
        });
        
        return res.status(500).json({
          success: false,
          message: "Failed to send password reset email",
          error: emailError.message
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Server error during password reset request",
        error: error.message
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;
      
      // Validate input
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: "Token and new password are required"
        });
      }
      
      // Basic password validation
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long"
        });
      }
      
      // Hash the token received from the request to compare with stored hash
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
      
      // Find user by hashed token and check expiry
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Password reset token is invalid or has expired"
        });
      }
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Update user with new password and clear reset token fields
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined
      });
      
      return res.status(200).json({
        success: true,
        message: "Password has been reset successfully"
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Server error during password reset",
        error: error.message
      });
    }
  }

  async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const role = req.query.role as string;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const sortOrder = req.query.sortOrder as string || "desc";
      
      // Build query
      const query: any = {};
      
      if (role) query.role = role;
      if (status) query.status = status;
      
      // Search by name or email
      if (search) {
        query.$or = [
          { full_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ];
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;
      
      // Execute query with pagination and sorting
      const users = await User.find(query)
        .select("-password")
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination
      const total = await User.countDocuments(query);
      
      return res.status(200).json({
        success: true,
        count: users.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: users
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }

  async getAllStudents(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || "createdAt";
      const sortOrder = req.query.sortOrder as string || "desc";
      
      // Build query for students only
      const query: any = { role: "student" }; // Assuming "student" is the role value
      
      if (status) query.status = status;
      
      // Search by name or email
      if (search) {
        query.$or = [
          { full_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ];
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;
      
      // Execute query with pagination and sorting
      const students = await User.find(query)
        .select("-password")
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination
      const total = await User.countDocuments(query);
      
      if (students.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No students found"
        });
      }
      
      return res.status(200).json({
        success: true,
        count: students.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: students
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      
      const user = await User.findById(userId).select("-password");
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      return res.status(200).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      
      // Prevent password update via this endpoint
      if (updateData.password) {
        delete updateData.password;
      }
      
      // Find user first to check if it exists
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      // Update user
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select("-password");
      
      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: user
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }

  async updateUserByEmail(req: Request, res: Response) {
    try {
      const email = req.params.email;
      const updateData = req.body;
      
      // Prevent password update via this endpoint
      if (updateData.password) {
        delete updateData.password;
      }
      
      // Find user first to check if it exists
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      // Update user
      const user = await User.findOneAndUpdate(
        { email },
        { $set: updateData },
        { new: true, runValidators: true }
      ).select("-password");
      
      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: user
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      
      const user = await User.findByIdAndDelete(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      return res.status(200).json({
        success: true,
        message: "User deleted successfully"
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }

  async toggleUserStatus(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      // Toggle status between "Active" and "Inactive"
      const newStatus = user.status === "Active" ? "Inactive" : "Active";
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { status: newStatus } },
        { new: true }
      ).select("-password");
      
      return res.status(200).json({
        success: true,
        message: `User status changed to ${newStatus}`,
        data: updatedUser
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }
}

export default new AuthController();