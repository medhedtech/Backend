import mongoose, { Schema, Document, Model } from 'mongoose';

// Subdocument interfaces
type LessonStatus = 'not_started' | 'in_progress' | 'completed';
export interface ILessonProgress {
  lessonId: string;
  status: LessonStatus;
  completedAt?: Date;
  lastAccessed: Date;
  timeSpent: number;
  notes?: Array<{ content: string; timestamp?: Date; tags?: string[] }>;
  bookmarks?: Array<{ timestamp: number; title?: string; description?: string; tags?: string[] }>;
}

export interface IQuizProgress {
  quizId: string;
  attempts: Array<{
    attemptNumber: number;
    score: number;
    answers: Array<{ questionId: string; selectedAnswer: number; isCorrect: boolean }>;
    startedAt: Date;
    completedAt: Date;
  }>;
  bestScore: number;
  status: LessonStatus | 'failed';
}

export interface IAssignmentProgress {
  assignmentId: string;
  submissions: Array<{
    submissionNumber: number;
    content: string;
    files?: Array<{ filename: string; url: string; size: number; mimeType: string }>;
    submittedAt: Date;
    score?: number;
    feedback?: string;
    gradedBy?: mongoose.Types.ObjectId;
    gradedAt?: Date;
  }>;
  status: 'not_started' | 'submitted' | 'graded' | 'returned';
  bestScore: number;
}

// Main Progress document interface
export interface IProgress extends Document {
  course: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  enrollment: mongoose.Types.ObjectId;
  lessonProgress: ILessonProgress[];
  quizProgress: IQuizProgress[];
  assignmentProgress: IAssignmentProgress[];
  overallProgress: number;
  lastAccessed: Date;
  meta: {
    totalTimeSpent: number;
    averageQuizScore: number;
    averageAssignmentScore: number;
    completedLessons: number;
    completedQuizzes: number;
    completedAssignments: number;
  };
  updateLessonProgress(lessonId: string, status: LessonStatus, timeSpent?: number): Promise<void>;
  updateQuizProgress(quizId: string, attempt: any): Promise<void>;
  updateAssignmentProgress(assignmentId: string, submission: any): Promise<void>;
  calculateOverallProgress(): Promise<void>;
}

// Static model interface
export interface IProgressModel extends Model<IProgress> {
  getProgress(courseId: string, studentId: string): Promise<IProgress | null>;
}

// Sub-schemas
const lessonProgressSchema = new Schema<ILessonProgress>(
  {
    lessonId: { type: String, required: true },
    status: { type: String, enum: ['not_started','in_progress','completed'], default: 'not_started' },
    completedAt: Date,
    lastAccessed: { type: Date, default: Date.now },
    timeSpent: { type: Number, default: 0 },
    notes: [{ content: String, timestamp: Date, tags: [String] }],
    bookmarks: [{ timestamp: Number, title: String, description: String, tags: [String] }],
  },
  { _id: false }
);

const quizProgressSchema = new Schema<IQuizProgress>(
  {
    quizId: { type: String, required: true },
    attempts: [
      {
        attemptNumber: { type: Number, required: true },
        score: { type: Number, required: true },
        answers: [{ questionId: String, selectedAnswer: Number, isCorrect: Boolean }],
        startedAt: { type: Date, required: true },
        completedAt: { type: Date, required: true },
      },
    ],
    bestScore: { type: Number, default: 0 },
    status: { type: String, enum: ['not_started','in_progress','completed','failed'], default: 'not_started' },
  },
  { _id: false }
);

const assignmentProgressSchema = new Schema<IAssignmentProgress>(
  {
    assignmentId: { type: String, required: true },
    submissions: [
      {
        submissionNumber: { type: Number, required: true },
        content: { type: String, required: true },
        files: [{ filename: String, url: String, size: Number, mimeType: String }],
        submittedAt: { type: Date, required: true },
        score: Number,
        feedback: String,
        gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        gradedAt: Date,
      },
    ],
    status: { type: String, enum: ['not_started','submitted','graded','returned'], default: 'not_started' },
    bestScore: { type: Number, default: 0 },
  },
  { _id: false }
);

// Main schema
const progressSchema = new Schema<IProgress, IProgressModel>(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
    lessonProgress: [lessonProgressSchema],
    quizProgress: [quizProgressSchema],
    assignmentProgress: [assignmentProgressSchema],
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },
    lastAccessed: { type: Date, default: Date.now },
    meta: {
      totalTimeSpent: { type: Number, default: 0 },
      averageQuizScore: { type: Number, default: 0 },
      averageAssignmentScore: { type: Number, default: 0 },
      completedLessons: { type: Number, default: 0 },
      completedQuizzes: { type: Number, default: 0 },
      completedAssignments: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Indexes
progressSchema.index({ course: 1, student: 1 }, { unique: true });
progressSchema.index({ 'lessonProgress.lessonId': 1 });
progressSchema.index({ 'quizProgress.quizId': 1 });
progressSchema.index({ 'assignmentProgress.assignmentId': 1 });

// Methods
progressSchema.methods.updateLessonProgress = async function (
  this: IProgress,
  lessonId: string,
  status: LessonStatus,
  timeSpent = 0,
) {
  let lp = this.lessonProgress.find((p) => p.lessonId === lessonId);
  if (!lp) {
    this.lessonProgress.push({ lessonId, status, timeSpent, lastAccessed: new Date() });
  } else {
    lp.status = status;
    lp.timeSpent += timeSpent;
    lp.lastAccessed = new Date();
    if (status === 'completed') lp.completedAt = new Date();
  }
  await this.calculateOverallProgress();
  await this.save();
};

progressSchema.methods.updateQuizProgress = async function (
  this: IProgress,
  quizId: string,
  attempt: any,
) {
  let qp = this.quizProgress.find((p) => p.quizId === quizId);
  if (!qp) {
    this.quizProgress.push({ quizId, attempts: [attempt], bestScore: attempt.score, status: attempt.score >= attempt.passingScore ? 'completed' : 'failed' });
  } else {
    qp.attempts.push(attempt);
    qp.bestScore = Math.max(qp.bestScore, attempt.score);
    qp.status = attempt.score >= attempt.passingScore ? 'completed' : 'failed';
  }
  await this.calculateOverallProgress();
  await this.save();
};

progressSchema.methods.updateAssignmentProgress = async function (
  this: IProgress,
  assignmentId: string,
  submission: any,
) {
  let ap = this.assignmentProgress.find((p) => p.assignmentId === assignmentId);
  if (!ap) {
    this.assignmentProgress.push({ assignmentId, submissions: [submission], bestScore: submission.score || 0, status: submission.score ? 'graded' : 'submitted' });
  } else {
    ap.submissions.push(submission);
    if (submission.score) {
      ap.bestScore = Math.max(ap.bestScore, submission.score);
      ap.status = 'graded';
    }
  }
  await this.calculateOverallProgress();
  await this.save();
};

progressSchema.methods.calculateOverallProgress = async function (this: IProgress) {
  const totalLessons = this.lessonProgress.length;
  const completedLessons = this.lessonProgress.filter((p) => p.status === 'completed').length;
  const totalQuizzes = this.quizProgress.length;
  const completedQuizzes = this.quizProgress.filter((p) => p.status === 'completed').length;
  const totalAssignments = this.assignmentProgress.length;
  const completedAssignments = this.assignmentProgress.filter((p) => p.status === 'graded').length;

  const lessonWeight = 0.5;
  const quizWeight = 0.3;
  const assignmentWeight = 0.2;

  const lp = totalLessons ? (completedLessons / totalLessons) * 100 : 0;
  const qp = totalQuizzes ? (completedQuizzes / totalQuizzes) * 100 : 0;
  const ap = totalAssignments ? (completedAssignments / totalAssignments) * 100 : 0;

  this.overallProgress = Math.round(lp * lessonWeight + qp * quizWeight + ap * assignmentWeight);
  this.meta.completedLessons = completedLessons;
  this.meta.completedQuizzes = completedQuizzes;
  this.meta.completedAssignments = completedAssignments;

  this.meta.averageQuizScore = this.quizProgress.length
    ? this.quizProgress.reduce((sum, p) => sum + p.bestScore, 0) / this.quizProgress.length
    : 0;
  this.meta.averageAssignmentScore = this.assignmentProgress.length
    ? this.assignmentProgress.reduce((sum, p) => sum + p.bestScore, 0) / this.assignmentProgress.length
    : 0;
  this.meta.totalTimeSpent = this.lessonProgress.reduce((sum, p) => sum + p.timeSpent, 0);
};

// Static method
progressSchema.statics.getProgress = async function (
  this: IProgressModel,
  courseId: string,
  studentId: string,
) {
  return this.findOne({ course: courseId, student: studentId })
    .populate('course')
    .populate('student', 'name email')
    .populate('enrollment');
};

// Model export
const Progress = mongoose.model<IProgress, IProgressModel>('Progress', progressSchema);
export default Progress; 