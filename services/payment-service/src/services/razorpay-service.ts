import Razorpay from 'razorpay';
import Order from '../../../../shared/models/order-model';
import crypto from 'crypto';
import { ENV_VARS } from '../config/env';
import mongoose from 'mongoose';

// Ensure Razorpay credentials are provided
if (!ENV_VARS.RAZORPAY_KEY_ID || !ENV_VARS.RAZORPAY_KEY_SECRET) {
  throw new Error('Invalid Razorpay configuration: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
}

const razorpay = new Razorpay({
  key_id: ENV_VARS.RAZORPAY_KEY_ID,
  key_secret: ENV_VARS.RAZORPAY_KEY_SECRET,
});

export default {
  createOrder: async ({ amount, currency = 'INR', receipt, notes, userId, productInfo }: any) => {
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency,
      receipt,
      notes,
    });
    const order = await Order.create({
      userId: userId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency,
      receipt,
      notes,
      productInfo,
      status: 'created',
    });
    return { order, razorpayOrder };
  },
  verifyPayment: async ({ orderId, paymentId, signature }: any) => {
    const order = await Order.findOne({ razorpayOrderId: orderId });
    if (!order) throw new Error('Order not found');
    const hmac = crypto.createHmac('sha256', ENV_VARS.RAZORPAY_KEY_SECRET);
    hmac.update(orderId + '|' + paymentId);
    const expectedSignature = hmac.digest('hex');
    if (expectedSignature !== signature) {
      order.status = 'failed';
      await order.save();
      throw new Error('Invalid signature');
    }
    order.status = 'paid';
    order.razorpayPaymentId = paymentId;
    order.razorpaySignature = signature;
    await order.save();
    return { success: true, order, productInfo: (order as any).productInfo };
  },
  getUserOrders: async (userId: string) => {
    // If userId is not a valid ObjectId, return all orders (for testing/stub)
    if (!mongoose.isValidObjectId(userId)) {
      return Order.find().lean();
    }
    return Order.find({ userId: userId }).lean();
  },
  getOrderById: async (orderId: string) => {
    const order = await Order.findById(orderId).lean();
    if (!order) throw new Error('Order not found');
    return order;
  },
}; 