import { Request, Response } from 'express';
import catchAsync from '../../../../shared/utils/catchAsync';
import razorpayService from '../services/razorpay-service';
import { AppError } from '../../../../shared/utils/errorHandler';

export const getRazorpayKey = (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { key: process.env.RAZORPAY_KEY_ID } });
};

export const createOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { amount, currency = 'INR', receipt, notes, productInfo } = req.body;
  if (amount <= 0) throw new AppError('Invalid amount', 400);
  const { order, razorpayOrder } = await razorpayService.createOrder({
    amount,
    currency,
    receipt,
    notes,
    userId,
    productInfo,
  });
  res.status(201).json({
    success: true,
    data: {
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      productInfo: order.productInfo,
    },
  });
});

export const verifyPayment = catchAsync(async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const result = await razorpayService.verifyPayment({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature });
  res.status(200).json({ success: true, data: result });
});

export const getUserOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const orders = await razorpayService.getUserOrders(userId);
  res.status(200).json({ success: true, data: orders });
});

export const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const order = await razorpayService.getOrderById(req.params.orderId);
  res.status(200).json({ success: true, data: order });
}); 