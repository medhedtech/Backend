import express from 'express';
import emailController from '../controllers';

const router = express.Router();

/**
 * @route GET /api/v1/emails/health
 * @desc Check health of email service
 * @access Public
 */
router.get('/health', emailController.healthCheck);

/**
 * @route GET /api/v1/emails/queue/stats
 * @desc Get email queue statistics
 * @access Private
 */
router.get('/queue/stats', emailController.getQueueStats);

/**
 * @route POST /api/v1/emails/send
 * @desc Send a general email
 * @access Private
 */
router.post('/send', emailController.sendEmail);

/**
 * @route POST /api/v1/emails/welcome
 * @desc Send welcome email
 * @access Private
 */
router.post('/welcome', emailController.sendWelcomeEmail);

/**
 * @route POST /api/v1/emails/password-reset
 * @desc Send password reset email
 * @access Private
 */
router.post('/password-reset', emailController.sendPasswordResetEmail);

/**
 * @route POST /api/v1/emails/verification
 * @desc Send email verification
 * @access Private
 */
router.post('/verification', emailController.sendVerificationEmail);

/**
 * @route POST /api/v1/emails/notification
 * @desc Send notification email
 * @access Private
 */
router.post('/notification', emailController.sendNotificationEmail);

export default router; 