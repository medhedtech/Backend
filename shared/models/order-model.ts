import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  notes: Record<string, any>;
  receipt?: string;
  productInfo: Record<string, any>;
  status: 'created' | 'attempted' | 'paid' | 'failed' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    notes: { type: Schema.Types.Mixed, default: {} },
    receipt: { type: String },
    productInfo: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['created','attempted','paid','failed','refunded'], default: 'created' },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema); 