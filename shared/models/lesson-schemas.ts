// @ts-nocheck
import mongoose from 'mongoose';
const { Schema } = mongoose;

// Base lesson options
const lessonOptions = {
  discriminatorKey: 'lessonType', // Determines subtype: "video", "quiz", or "assessment"
  _id: false,
  timestamps: true,
};

// Base Lesson Schema with common fields
export const baseLessonSchema = new Schema(
  {
    id: {
      type: String,
      required: [true, 'Lesson ID is required'],
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isPreview: {
      type: Boolean,
      default: false,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
    resources: [
      {
        id: { type: String, unique: true },
        title: {
          type: String,
          required: [true, 'Resource title is required'],
          trim: true,
        },
        url: {
          type: String,
          required: [true, 'Resource URL is required'],
          trim: true,
        },
        type: {
          type: String,
          enum: ['pdf', 'document', 'link', 'other'],
          required: [true, 'Resource type is required'],
        },
        description: {
          type: String,
          default: '',
          trim: true,
        },
      },
    ],
  },
  lessonOptions,
);

// Video Lesson Schema: additional fields for video URL and duration
export const videoLessonSchema = new Schema(
  {
    video_url: {
      type: String,
      required: [true, 'Video URL is required'],
      trim: true,
      validate: {
        validator: (v: string) => /^(http(s)?:\/\/)/.test(v),
        message: 'Video URL must be a valid URL',
      },
    },
    duration: {
      type: String,
      default: '',
      trim: true,
    },
  },
  lessonOptions,
);

// Quiz Lesson Schema: add a required quiz_id field referencing Quiz
export const quizLessonSchema = new Schema(
  {
    quiz_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz ID is required'],
    },
  },
  lessonOptions,
);

// Assessment Lesson Schema: add a required assignment_id field referencing Assignment
export const assessmentLessonSchema = new Schema(
  {
    assignment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment ID is required'],
    },
  },
  lessonOptions,
); 