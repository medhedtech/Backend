import mongoose, { Document, Schema } from 'mongoose';

export interface IEnrolledModule extends Document {
  student_id: mongoose.Types.ObjectId;
  course_id: mongoose.Types.ObjectId;
  enrollment_id: mongoose.Types.ObjectId;
  video_url?: string;
  is_watched: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const enrolledModuleSchema = new Schema<IEnrolledModule>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    enrollment_id: { type: Schema.Types.ObjectId, ref: 'EnrolledCourse', required: true },
    video_url: { type: String },
    is_watched: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IEnrolledModule>('EnrolledModule', enrolledModuleSchema); 