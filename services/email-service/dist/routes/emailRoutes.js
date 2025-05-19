"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controllers_1 = __importDefault(require("../controllers"));
const router = express_1.default.Router();
/**
 * @route GET /api/v1/emails/health
 * @desc Check health of email service
 * @access Public
 */
router.get('/health', controllers_1.default.healthCheck);
/**
 * @route GET /api/v1/emails/queue/stats
 * @desc Get email queue statistics
 * @access Private
 */
router.get('/queue/stats', controllers_1.default.getQueueStats);
/**
 * @route POST /api/v1/emails/send
 * @desc Send a general email
 * @access Private
 */
router.post('/send', controllers_1.default.sendEmail);
/**
 * @route POST /api/v1/emails/welcome
 * @desc Send welcome email
 * @access Private
 */
router.post('/welcome', controllers_1.default.sendWelcomeEmail);
/**
 * @route POST /api/v1/emails/password-reset
 * @desc Send password reset email
 * @access Private
 */
router.post('/password-reset', controllers_1.default.sendPasswordResetEmail);
/**
 * @route POST /api/v1/emails/verification
 * @desc Send email verification
 * @access Private
 */
router.post('/verification', controllers_1.default.sendVerificationEmail);
/**
 * @route POST /api/v1/emails/notification
 * @desc Send notification email
 * @access Private
 */
router.post('/notification', controllers_1.default.sendNotificationEmail);
exports.default = router;
