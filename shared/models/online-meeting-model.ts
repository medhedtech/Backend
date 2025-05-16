import mongoose from "mongoose";

// Define the Schema
const onlineMeetingSchema = new mongoose.Schema(
  {
    course_name: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    students: {
      type: [String],
      default: [],
    },
    corporate_students: {
      type: [String],
      default: [],
    },
    meet_link: {
      type: String,
      trim: true,
    },
    meet_title: {
      type: String,
      trim: true,
    },
    meeting_tag: {
      type: String,
      enum: ["live", "demo", "recorded", "main"],
      default: "live",
    },
    time: {
      type: String,
    },
    date: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    course_id: {
      type: String,
    },
  },
  { timestamps: true },
);

const OnlineMeeting = mongoose.model("OnlineMeeting", onlineMeetingSchema);
export default OnlineMeeting; 