import { Router } from 'express';
import { body } from 'express-validator';
import * as paymentController from '../controllers/payment-controller';
import { authenticateToken } from '../../../../shared/middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Public: Get Razorpay API key
router.get('/key', paymentController.getRazorpayKey);

// Private: Create a new order
router.post(
  '/create-order',
  authenticateToken as any,
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').optional().isString().withMessage('Currency must be a string'),
    body('receipt').optional().isString().withMessage('Receipt must be a string'),
    body('notes').optional().isObject().withMessage('Notes must be an object'),
  ],
  validateRequest,
  paymentController.createOrder as any,
);

// Private: Verify payment
router.post(
  '/verify-payment',
  authenticateToken as any,
  [
    body('razorpay_order_id').isString().withMessage('Order ID is required'),
    body('razorpay_payment_id').isString().withMessage('Payment ID is required'),
    body('razorpay_signature').isString().withMessage('Signature is required'),
  ],
  validateRequest,
  paymentController.verifyPayment as any,
);

// Private: Get all orders for user
router.get('/orders', authenticateToken as any, paymentController.getUserOrders as any);

// Private: Get order by ID
router.get('/:orderId', authenticateToken as any, paymentController.getOrderById as any);

export default router; 