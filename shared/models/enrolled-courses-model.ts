import mongoose, { Document, Schema, InferSchemaType } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// Sub-schemas
const paymentDetailsSchema = new Schema(
  {
    payment_id: String,
    payment_signature: String,
    payment_order_id: String,
    payment_method: String,
    amount: { type: Number, required: true, min: [0, 'Amount cannot be negative'] },
    currency: { type: String, default: 'INR' },
    payment_date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const noteSchema = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    content: { type: String, required: [true, 'Note content is required'], trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bookmarkSchema = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    timestamp: { type: Number, required: [true, 'Timestamp is required'], min: [0, 'Timestamp cannot be negative'] },
    note: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const assignmentSubmissionSchema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    submission: { type: String, required: [true, 'Submission content is required'] },
    submittedAt: { type: Date, default: Date.now },
    grade: { type: Number, min: [0, 'Grade cannot be negative'] },
    feedback: String,
    status: { type: String, enum: ['submitted','graded','returned'], default: 'submitted' },
  },
  { _id: false }
);

const quizAnswerSubSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    answer: { type: String, required: true },
  },
  { _id: false }
);

const quizSubmissionSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    answers: [quizAnswerSubSchema],
    score: { type: Number, required: true, min: [0, 'Score cannot be negative'] },
    percentage: { type: Number, required: true, min: [0, 'Percentage cannot be negative'], max: [100, 'Percentage cannot exceed 100'] },
    submittedAt: { type: Date, default: Date.now },
    timeSpent: { type: Number, required: true },
    attempts: { type: Number, default: 1 },
  },
  { _id: false }
);

export interface IEnrolledCourse extends Document {
  student_id: mongoose.Types.ObjectId;
  course_id: mongoose.Types.ObjectId;
  enrollment_type: 'individual' | 'batch';
  batch_size: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  enrollment_date: Date;
  expiry_date?: Date;
  is_self_paced: boolean;
  status: 'active' | 'completed' | 'expired' | 'cancelled' | 'suspended';
  is_completed: boolean;
  completed_on?: Date;
  membership_id?: string;
  is_certified: boolean;
  certificate_id?: mongoose.Types.ObjectId;
  payment_details: InferSchemaType<typeof paymentDetailsSchema>;
  completed_lessons: mongoose.Types.ObjectId[];
  completed_assignments: mongoose.Types.ObjectId[];
  completed_quizzes: mongoose.Types.ObjectId[];
  last_accessed: Date;
  progress: number;
  notes: InferSchemaType<typeof noteSchema>[];
  bookmarks: InferSchemaType<typeof bookmarkSchema>[];
  assignment_submissions: InferSchemaType<typeof assignmentSubmissionSchema>[];
  quiz_submissions: InferSchemaType<typeof quizSubmissionSchema>[];
  learning_path: 'sequential' | 'flexible';
  completion_criteria: {
    required_progress: number;
    required_assignments: boolean;
    required_quizzes: boolean;
  };
  remainingTime?: number;
  calculateProgress(): Promise<number>;
  isExpired(): boolean;
  canAccess(): boolean;
  getCompletionStatus(): string;
  isLessonCompleted(lessonId: mongoose.Types.ObjectId): boolean;
  isAssignmentCompleted(assignmentId: mongoose.Types.ObjectId): boolean;
  isQuizCompleted(quizId: mongoose.Types.ObjectId): boolean;
  getAssignmentSubmission(assignmentId: mongoose.Types.ObjectId): any;
  getQuizSubmission(quizId: mongoose.Types.ObjectId): any;
  addNote(lessonId: mongoose.Types.ObjectId, content: string): void;
  addBookmark(lessonId: mongoose.Types.ObjectId, timestamp: number, note?: string): void;
  setupEmiSchedule(config: {
    totalAmount: number;
    downPayment: number;
    numberOfInstallments: number;
    startDate: Date;
    interestRate: number;
    processingFee: number;
    gracePeriodDays: number;
  }): Promise<void>;
}

const enrolledCourseSchema = new Schema<IEnrolledCourse>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    enrollment_type: { type: String, enum: ['individual','batch'], default: 'individual', required: true },
    batch_size: { type: Number, default: 1, min: [1, 'Batch size must be at least 1'] },
    payment_status: { type: String, enum: ['pending','completed','failed','refunded'], default: 'pending', required: true },
    enrollment_date: { type: Date, default: Date.now, required: true },
    expiry_date: { type: Date, required: function(this: IEnrolledCourse) { return !this.is_self_paced; } },
    is_self_paced: { type: Boolean, default: false, required: true },
    status: { type: String, enum: ['active','completed','expired','cancelled','suspended'], default: 'active', required: true },
    is_completed: { type: Boolean, default: false, required: true },
    completed_on: { type: Date, default: null },
    membership_id: { type: String, sparse: true },
    is_certified: { type: Boolean, default: false, required: true },
    certificate_id: { type: Schema.Types.ObjectId, ref: 'Certificate', sparse: true },
    payment_details: paymentDetailsSchema,
    completed_lessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    completed_assignments: [{ type: Schema.Types.ObjectId, ref: 'Assignment' }],
    completed_quizzes: [{ type: Schema.Types.ObjectId, ref: 'Quiz' }],
    last_accessed: { type: Date, default: Date.now, required: true },
    progress: { type: Number, min: [0, 'Progress cannot be negative'], max: [100, 'Progress cannot exceed 100'], default: 0, required: true },
    notes: [noteSchema],
    bookmarks: [bookmarkSchema],
    assignment_submissions: [assignmentSubmissionSchema],
    quiz_submissions: [quizSubmissionSchema],
    learning_path: { type: String, enum: ['sequential','flexible'], default: 'sequential' },
    completion_criteria: {
      required_progress: { type: Number, default: 100 },
      required_assignments: { type: Boolean, default: true },
      required_quizzes: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
enrolledCourseSchema.index({ student_id: 1, course_id: 1 }, { unique: true });
// ... other indexes ...

// Virtual and methods omitted for brevity

enrolledCourseSchema.plugin(mongoosePaginate);

// Stub EMI schedule method to satisfy TypeScript
enrolledCourseSchema.methods.setupEmiSchedule = async function(
  cfg: {
    totalAmount: number;
    downPayment: number;
    numberOfInstallments: number;
    startDate: Date;
    interestRate: number;
    processingFee: number;
    gracePeriodDays: number;
  }
): Promise<void> {
  // Calculate principal and interest
  const principal = cfg.totalAmount - cfg.downPayment;
  const n = cfg.numberOfInstallments;
  const monthlyRate = cfg.interestRate / 100 / 12;
  // EMI formula or simple split if no interest
  const installmentAmount = monthlyRate
    ? principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
    : principal / n;
  // Build schedule
  const schedule: Array<{ installmentNumber: number; amount: number; dueDate: Date; status: string }> = [];
  for (let i = 0; i < n; i++) {
    const dueDate = new Date(cfg.startDate);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    schedule.push({
      installmentNumber: i + 1,
      amount: parseFloat(installmentAmount.toFixed(2)),
      dueDate,
      status: 'pending',
    });
  }
  // Attach EMI details to document
  const emiDetails = {
    totalAmount: cfg.totalAmount,
    downPayment: cfg.downPayment,
    numberOfInstallments: n,
    startDate: cfg.startDate,
    interestRate: cfg.interestRate,
    processingFee: cfg.processingFee,
    gracePeriodDays: cfg.gracePeriodDays,
    schedule,
    status: 'active',
    missedPayments: 0,
  };
  // @ts-ignore dynamic field
  this.emiDetails = emiDetails;
};

export default mongoose.model<IEnrolledCourse>('EnrolledCourse', enrolledCourseSchema);
