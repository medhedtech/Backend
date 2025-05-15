import express from 'express';
import authController from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { loginLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rateLimit';

const router = express.Router();

// Registration & Login
router.post('/register', registerLimiter, authController.registerUser.bind(authController));
router.post('/login', loginLimiter, authController.loginUser.bind(authController));
router.post('/refresh-token', authController.refreshToken.bind(authController));
router.post('/logout', authenticateToken, authController.logout.bind(authController));

// Password Reset
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword.bind(authController));
router.post('/reset-password', passwordResetLimiter, authController.resetPassword.bind(authController));

// User Management
router.get('/users', authenticateToken, authController.getAllUsers.bind(authController));
router.get('/get-all-students', authenticateToken, authController.getAllStudents.bind(authController));
router.get('/users/:id', authenticateToken, authController.getUserById.bind(authController));
router.put('/users/:id', authenticateToken, authController.updateUser.bind(authController));
router.put('/users/email/:email', authenticateToken, authController.updateUserByEmail.bind(authController));
router.delete('/users/:id', authenticateToken, authController.deleteUser.bind(authController));
router.put('/toggle-status/:id', authenticateToken, authController.toggleUserStatus.bind(authController));

export default router; 