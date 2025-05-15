import mongoose, { Schema, Document, Model } from 'mongoose';

// Document interface
export interface IBookmark extends Document {
  course: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  lesson: string;
  timestamp: number;
  title: string;
  description: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  updateDetails(title: string, description: string, tags: string[]): Promise<IBookmark>;
}

// Model interface for statics
export interface IBookmarkModel extends Model<IBookmark> {
  getLessonBookmarks(courseId: string, studentId: string, lessonId: string): Promise<IBookmark[]>;
  getBookmarksByTags(courseId: string, studentId: string, tags: string[]): Promise<IBookmark[]>;
}

// Schema definition
const bookmarkSchema = new Schema<IBookmark, IBookmarkModel>(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    lesson: {
      type: String,
      required: [true, 'Lesson ID is required'],
    },
    timestamp: {
      type: Number,
      required: [true, 'Timestamp is required'],
    },
    title: {
      type: String,
      required: [true, 'Bookmark title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true },
);

// Compound index
bookmarkSchema.index(
  { course: 1, student: 1, lesson: 1, timestamp: 1 },
  { unique: true },
);

// Instance method
bookmarkSchema.methods.updateDetails = async function (
  this: IBookmark,
  title: string,
  description: string,
  tags: string[],
) {
  this.title = title;
  this.description = description;
  this.tags = tags;
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Static methods
bookmarkSchema.statics.getLessonBookmarks = async function (
  this: IBookmarkModel,
  courseId: string,
  studentId: string,
  lessonId: string,
) {
  return this.find({ course: courseId, student: studentId, lesson: lessonId }).sort(
    'timestamp',
  );
};

bookmarkSchema.statics.getBookmarksByTags = async function (
  this: IBookmarkModel,
  courseId: string,
  studentId: string,
  tags: string[],
) {
  return this.find({ course: courseId, student: studentId, tags: { $in: tags } }).sort(
    'timestamp',
  );
};

// Model export
const Bookmark = mongoose.model<IBookmark, IBookmarkModel>(
  'Bookmark',
  bookmarkSchema,
);
export default Bookmark; 