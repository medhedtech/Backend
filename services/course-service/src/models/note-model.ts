import mongoose, { Schema, Document, Model } from 'mongoose';

// Document interface
export interface INote extends Document {
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  lesson: string;
  content: string;
  timestamp: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  updateContent(content: string, tags: string[]): Promise<INote>;
}

// Model interface for statics
export interface INoteModel extends Model<INote> {
  getLessonNotes(courseId: string, studentId: string, lessonId: string): Promise<INote[]>;
  getNotesByTags(courseId: string, studentId: string, tags: string[]): Promise<INote[]>;
}

// Schema definition
const noteSchema = new Schema<INote, INoteModel>(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
    },
    lesson: {
      type: String,
      required: [true, 'Lesson ID is required'],
    },
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
    },
    timestamp: {
      type: Number,
      default: 0,
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

// Compound index for unique notes per student per lesson
noteSchema.index(
  { course: 1, student: 1, lesson: 1, timestamp: 1 },
  { unique: true },
);

// Instance method to update note content
noteSchema.methods.updateContent = async function (
  this: INote,
  content: string,
  tags: string[],
) {
  this.content = content;
  this.tags = tags;
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Static method to get all notes for a lesson
noteSchema.statics.getLessonNotes = async function (
  this: INoteModel,
  courseId: string,
  studentId: string,
  lessonId: string,
) {
  return this.find({ course: courseId, student: studentId, lesson: lessonId }).sort(
    'timestamp',
  );
};

// Static method to get notes by tags
noteSchema.statics.getNotesByTags = async function (
  this: INoteModel,
  courseId: string,
  studentId: string,
  tags: string[],
) {
  return this.find({ course: courseId, student: studentId, tags: { $in: tags } }).sort(
    'timestamp',
  );
};

// Model export
const Note = mongoose.model<INote, INoteModel>('Note', noteSchema);
export default Note; 