import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  full_name?: string;
  age?: number;
  email?: string;
  course_name?: string;
  meta?: {
    createdBy?: string;
    updatedBy?: string;
    deletedAt?: Date;
  };
  status?: 'Active' | 'Inactive';
  upload_image?: string;
  is_subscribed?: boolean;
  subscription_end_date?: Date;
  membership_id?: mongoose.Types.ObjectId;
}

const studentSchema = new Schema<IStudent>(
  {
    full_name: {
      type: String,
    },
    age: {
      type: Number,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
    },
    course_name: {
      type: String,
    },
    meta: {
      createdBy: {
        type: String,
      },
      updatedBy: {
        type: String,
      },
      deletedAt: {
        type: Date,
      },
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    upload_image: {
      type: String,
    },
    is_subscribed: {
      type: Boolean,
      default: false,
    },
    subscription_end_date: {
      type: Date,
    },
    membership_id: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
    },
  },
  { timestamps: true },
);

const Student = mongoose.model<IStudent>('Student', studentSchema);
export default Student; 