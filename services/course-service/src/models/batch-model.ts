// @ts-nocheck
import mongoose from 'mongoose';
const { Schema } = mongoose;

/* ------------------------------ */
/* Batch Schema                   */
/* ------------------------------ */
const batchSchema = new Schema(
  {
    batch_name: { type: String, required: true, trim: true },
    batch_code: { type: String, unique: true, required: true, trim: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    status: {
      type: String,
      enum: ['Active','Upcoming','Completed','Cancelled'],
      default: 'Upcoming',
    },
    start_date: { type: Date, required: true },
    end_date: {
      type: Date,
      required: true,
      validate: {
        validator(v: Date) { return v > (this as any).start_date; },
        message: 'End date must be after start date',
      },
    },
    capacity: { type: Number, required: true, min: 1 },
    enrolled_students: { type: Number, default: 0, min: 0 },
    assigned_instructor: { type: Schema.Types.ObjectId, ref: 'Instructor', required: true },
    schedule: [
      {
        day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], required: true },
        start_time: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
        end_time: {
          type: String,
          required: true,
          match: /^([01]\d|2[0-3]):([0-5]\d)$/,
          validate: {
            validator(v: string) {
              const [h,m] = this.start_time.split(':').map(Number);
              const [h2,m2] = v.split(':').map(Number);
              return h2*60 + m2 > h*60 + m;
            },
            message: 'End time must be after start time',
          },
        },
      }
    ],
    batch_notes: { type: String, trim: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Batch = mongoose.model('Batch', batchSchema);
export default Batch; 