import { Request, Response } from 'express';
import emailService from '../services/emailService';

class EmailController {
  /**
   * Check health status of the email service
   */
  healthCheck(req: Request, res: Response) {
    res.status(200).json({
      success: true,
      message: 'Email Service is running',
      timestamp: new Date()
    });
  }

  /**
   * Get email queue statistics
   */
  async getQueueStats(req: Request, res: Response) {
    try {
      const stats = await emailService.getQueueStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get email queue statistics',
        error: (error as Error).message
      });
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(req: Request, res: Response) {
    try {
      const { to, subject, html, text, cc, bcc } = req.body;
      
      if (!to || (!subject && !text && !html)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: to, and either subject, text, or html'
        });
      }

      const result = await emailService.sendEmail(
        {
          to,
          subject: subject || 'No subject',
          html,
          text,
          cc,
          bcc
        },
        {
          priority: req.body.priority,
          skipQueue: req.body.skipQueue
        }
      );

      res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: (error as Error).message
      });
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(req: Request, res: Response) {
    try {
      const { email, fullName, ...userData } = req.body;
      
      if (!email || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: email, fullName'
        });
      }

      const result = await emailService.sendWelcomeEmail(email, fullName, userData);

      res.status(200).json({
        success: true,
        message: 'Welcome email sent successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to send welcome email',
        error: (error as Error).message
      });
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(req: Request, res: Response) {
    try {
      const { email, name, resetToken } = req.body;
      
      if (!email || !name || !resetToken) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: email, name, resetToken'
        });
      }

      const result = await emailService.sendPasswordResetEmail(email, name, resetToken);

      res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to send password reset email',
        error: (error as Error).message
      });
    }
  }

  /**
   * Send verification email with OTP
   */
  async sendVerificationEmail(req: Request, res: Response) {
    try {
      const { email, name, otp } = req.body;
      
      if (!email || !name || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: email, name, otp'
        });
      }

      const result = await emailService.sendVerificationEmail(email, name, otp);

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email',
        error: (error as Error).message
      });
    }
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(req: Request, res: Response) {
    try {
      const { email, subject, message, ...data } = req.body;
      
      if (!email || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: email, subject, message'
        });
      }

      const result = await emailService.sendNotificationEmail(email, subject, message, data);

      res.status(200).json({
        success: true,
        message: 'Notification email sent successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to send notification email',
        error: (error as Error).message
      });
    }
  }
}

export default new EmailController(); 