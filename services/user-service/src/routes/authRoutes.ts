import express from 'express';
import authController from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { loginLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rateLimit';

const router = express.Router();

// Public routes (no authentication required)
// Registration & Login
router.post('/register', registerLimiter, authController.registerUser);
router.post('/login', loginLimiter, authController.loginUser);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);

// Protected routes (authentication required)
router.post('/logout', authenticateToken, authController.logout);
router.get('/users', authenticateToken, authController.getAllUsers);
router.get('/get-all-students', authenticateToken, authController.getAllStudents);
router.get('/users/:id', authenticateToken, authController.getUserById);
router.put('/users/:id', authenticateToken, authController.updateUser);
router.put('/users/email/:email', authenticateToken, authController.updateUserByEmail);
router.delete('/users/:id', authenticateToken, authController.deleteUser);
router.put('/toggle-status/:id', authenticateToken, authController.toggleUserStatus);

export default router; 