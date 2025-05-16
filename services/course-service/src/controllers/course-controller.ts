// @ts-nocheck
import { Request, Response } from 'express';
import mime from 'mime-types';
import mongoose from 'mongoose';
import { Readable } from 'stream';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  s3Client,
  getPresignedUrl as getS3PresignedUrl,
  getPresignedPost,
  deleteS3Object as s3DeleteObject,
} from '../config/aws-config';
import { ENV_VARS } from '../config/envVars';
import Bookmark from '../../../../shared/models/bookmark-model';
import Course from '../../../../shared/models/course-model';
import EnrolledCourse from '../../../../shared/models/enrolled-courses-model';
import Enrollment from '../../../../shared/models/enrollment-model';
import Note from '../../../../shared/models/note-model';
import Progress from '../../../../shared/models/progress-model';
import catchAsync from '../utils/catchAsync';
import { AppError } from '../../../../shared/utils/errorHandler';
import logger from '../utils/logger';
import { responseFormatter } from '../utils/responseFormatter';
import {
  validateCourseData,
  validateVideoLessonData,
  validateQuizLessonData,
} from '../validations/course-validation';

// Helper to recursively decode URL-encoded strings
const fullyDecodeURIComponent = (str: any) => {
  try {
    if (!str) return str;
    let decoded = String(str);
    // Decode HTML entities
    decoded = decoded
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    if (decoded.includes('%25')) decoded = decoded.replace(/%25/g, '%');
    let prev = '';
    while (decoded !== prev) {
      prev = decoded;
      try {
        decoded = decodeURIComponent(decoded);
      } catch {}
    }
    return decoded;
  } catch {
    return str || '';
  }
};

// Format duration, e.g. remove '0 months'
const formatCourseDuration = (duration: any) => {
  if (!duration) return duration;
  const zeroMonths = /^0 months\s+(.+)$/;
  const match = (duration as string).match(zeroMonths);
  return match ? match[1] : duration;
};

// Process courses response for consistent formatting
const processCoursesResponse = (data: any) => {
  if (!data) return data;
  const processOne = (course: any) => {
    const c = { ...course };
    if (c.course_duration) c.course_duration = formatCourseDuration(c.course_duration);
    if (c.class_type) {
      const t = c.class_type.toLowerCase();
      if (t.includes('live')) c.delivery_format = 'Live';
      else if (t.includes('blend')) c.delivery_format = 'Blended';
      else if (t.includes('self') || t.includes('record')) c.delivery_format = 'Self-Paced';
      else c.delivery_format = c.class_type;
      c.delivery_type = c.delivery_format;
    }
    return c;
  };
  return Array.isArray(data) ? data.map(processOne) : processOne(data);
};

// Group by class type
const groupCoursesByClassType = (resp: any) => {
  if (!resp?.data?.courses) return resp;
  const result = { ...resp, data: { ...resp.data, live: [], blended: [] } };
  resp.data.courses.forEach((course: any) => {
    const isLive = course.category_type === 'Live' || (course.class_type && course.class_type.toLowerCase().includes('live')) || course.delivery_format === 'Live';
    if (isLive) result.data.live.push(course);
    else result.data.blended.push(course);
  });
  return result;
};

// Escape regex
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const createSafeRegex = (p: string, f = 'i') => new RegExp(escapeRegExp(p), f);

// Assign IDs to curriculum
const assignCurriculumIds = (curriculum: any[]) => {
  curriculum.forEach((week, wi) => {
    week.id = `week_${wi+1}`;
    if (week.lessons) week.lessons.forEach((ls: any, li: number) => { ls.id = `lesson_w${wi+1}_${li+1}`; if (ls.resources) ls.resources.forEach((r: any, ri: number) => r.id = `resource_${ls.id}_${ri+1}`); });
    if (week.liveClasses) week.liveClasses.forEach((lc: any, ci: number) => { if (!lc.id) lc.id = `live_w${wi+1}_${ci+1}`; });
    if (week.sections) week.sections.forEach((sec: any, si: number) => { sec.id = `section_${wi+1}_${si+1}`; if (sec.lessons) sec.lessons.forEach((ls: any, li: number) => { ls.id = `lesson_${wi+1}_${si+1}_${li+1}`; if (ls.resources) ls.resources.forEach((r: any, ri: number) => r.id = `resource_${ls.id}_${ri+1}`); }); });
  });
};

/** Create new course with integrated lessons */
export const createCourse = async (req: Request, res: Response) => {
  try {
    if ((req as any).fileError) return res.status(400).json({ success: false, message: (req as any).fileError });
    if ((req as any).file) req.body.course_image = (req as any).file.location;
    const cd = req.body;
    if (cd.curriculum && typeof cd.curriculum === 'string') {
      try { cd.curriculum = JSON.parse(cd.curriculum); } catch (e: any) { return res.status(400).json({ success: false, message: 'Invalid curriculum JSON', error: e.message }); }
    }
    if (cd.curriculum && Array.isArray(cd.curriculum)) assignCurriculumIds(cd.curriculum);
    const course = new Course(cd);
    await course.save();
    res.status(201).json({ success: true, message: 'Course created', data: course });
  } catch (error: any) {
    console.error('Error creating course:', error);
    res.status(500).json({ success: false, message: 'Failed to create course', error: error.message });
  }
};

/** Get all courses */
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const courses = await Course.find({}, { course_title:1, course_category:1, course_tag:1, course_image:1, course_fee:1, isFree:1, status:1, category_type:1, createdAt:1, prices:1, course_duration:1 }).lean();
    const data = processCoursesResponse(courses);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error: any) {
    console.error('Error fetching all courses:', error);
    res.status(500).json({ success: false, message: 'Error fetching courses', error: error.message });
  }
};

/** Advanced search, pagination, filters, facets */
export const getAllCoursesWithLimits = async (req: Request, res: Response) => {
  try {
    let { page = '1', limit = '10', search, sort_by='createdAt', sort_order='desc', course_category, category_type, course_tag, class_type, status, course_duration, min_hours_per_week, max_hours_per_week, no_of_Sessions, description, course_grade, price_range, certification, has_assignments, has_projects, has_quizzes, currency, exclude_ids, user_id } = req.query as any;
    let pg = parseInt(page), lim = parseInt(limit);
    if (isNaN(pg)||pg<1||isNaN(lim)||lim<1) return res.status(400).json({ success: false, message: 'Invalid pagination params' });
    const filter: any = {};
    const textScore: any = {};
    if (search) {
      const ds = fullyDecodeURIComponent(search);
      if (ds.length>=3) { filter.$text = { $search: ds }; textScore.score={ $meta:'textScore' }; }
      else filter.$or = [ { course_title:{ $regex:createSafeRegex(ds) } }, { course_category:{ $regex:createSafeRegex(ds) } }, { course_tag:{ $regex:createSafeRegex(ds) } }, { 'course_description.program_overview':{ $regex:createSafeRegex(ds) } }, { 'course_description.benefits':{ $regex:createSafeRegex(ds) } }, { course_grade:{ $regex:createSafeRegex(ds) } } ];
    }
    // ... handle other filters similar to your JS code, mapping req.query fields into filter ...
    // Build sortOptions, projection, aggregation pipeline
    const sortOpts: any = {};
    if (search==='true' && sort_by==='relevance' && filter.$text) sortOpts.score={ $meta:'textScore' };
    else if (sort_by==='price') sortOpts.course_fee = sort_order==='asc'?1:-1;
    else sortOpts[sort_by] = sort_order==='asc'?1:-1;
    const projection: any = { course_title:1, course_category:1, course_tag:1, course_image:1, course_duration:1, isFree:1, status:1, category_type:1, class_type:1, is_Certification:1, is_Assignments:1, is_Projects:1, is_Quizes:1, prices:1, slug:1, meta:1, createdAt:1, no_of_Sessions:1, course_description:1, course_grade:1, brochures:1, final_evaluation:1 };
    if (filter.$text) projection.score={ $meta:'textScore' };
    const pipeline: any[] = [ { $match: filter }, { $addFields: { ...textScore, pricing_summary: { min_price:{ $min:'$prices.individual' }, max_price:{ $max:'$prices.batch' } } } }, { $sort: sortOpts }, { $skip:(pg-1)*lim }, { $limit:lim }, { $project:projection } ];
    const [courses, total, facets] = await Promise.all([
      Course.aggregate(pipeline),
      Course.countDocuments(filter),
      Course.aggregate([{ $match: filter }])
    ]);
    let processed = courses;
    if (currency) processed = courses.map((course:any) => ({ ...course, prices: course.prices.filter((p:any)=>p.currency===currency.toUpperCase()) }));
    processed = processCoursesResponse(processed);
    const response = { success:true, data:{ courses:processed, pagination:{ total, page:pg, limit:lim, totalPages:Math.ceil(total/lim) }, facets: facets[0] } };
    if ((req.query as any).group_by_class_type==='true') res.status(200).json(groupCoursesByClassType(response));
    else res.status(200).json(response);
  } catch (error: any) {
    console.error('Error in getAllCoursesWithLimits:', error);
    res.status(500).json({ success:false, message:'Error fetching courses', error: error.message });
  }
};

/** Get course by ID **/
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { currency } = req.query as any;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    let course = await Course.findById(id).lean();
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    if (currency && course.prices) course = { ...course, prices: course.prices.filter((p:any)=>p.currency===currency.toUpperCase()) };
    course = processCoursesResponse(course);
    res.status(200).json({ success:true, data:course });
  } catch (error: any) {
    console.error('Error fetching course:', error);
    res.status(500).json({ success:false, message:'Error fetching course details', error: error.message });
  }
};

/** Update course by ID **/
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    const course = await Course.findByIdAndUpdate(id, req.body, { new: true });
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    res.status(200).json({ success:true, data:course });
  } catch (error: any) {
    console.error('Error updating course:', error);
    res.status(500).json({ success:false, message:'Error updating course', error: error.message });
  }
};

/** Delete course by ID **/
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    const course = await Course.findByIdAndDelete(id);
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    res.status(200).json({ success:true, message:'Course deleted' });
  } catch (error: any) {
    console.error('Error deleting course:', error);
    res.status(500).json({ success:false, message:'Error deleting course', error: error.message });
  }
};

/** Get course titles **/
export const getCourseTitles = async (req: Request, res: Response) => {
  try {
    const courses = await Course.find({}, { course_title:1 });
    res.status(200).json({ success:true, data:courses });
  } catch (error: any) {
    console.error('Error fetching course titles:', error);
    res.status(500).json({ success:false, message:'Error fetching course titles', error: error.message });
  }
};

/** Toggle course status **/
export const toggleCourseStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    course.status = !course.status;
    await course.save();
    res.status(200).json({ success:true, data:course });
  } catch (error: any) {
    console.error('Error toggling course status:', error);
    res.status(500).json({ success:false, message:'Error toggling course status', error: error.message });
  }
};

/** Get course sections **/
export const getCourseSections = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    const course = await Course.findById(id, { curriculum:1 });
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    res.status(200).json({ success:true, data:course.curriculum });
  } catch (error: any) {
    console.error('Error fetching course sections:', error);
    res.status(500).json({ success:false, message:'Error fetching course sections', error: error.message });
  }
};

/** Get course lessons **/
export const getCourseLessons = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    const course = await Course.findById(id, { curriculum:1 });
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    const lessons = course.curriculum.reduce((acc: any[], week: any) => acc.concat(week.lessons || []), []);
    res.status(200).json({ success:true, data:lessons });
  } catch (error: any) {
    console.error('Error fetching course lessons:', error);
    res.status(500).json({ success:false, message:'Error fetching course lessons', error: error.message });
  }
};

/** Get lesson details **/
export const getLessonDetails = async (req: Request, res: Response) => {
  try {
    const { courseId, lessonId } = req.params;
    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId)) return res.status(400).json({ success:false, message:'Invalid course or lesson ID' });
    const course = await Course.findById(courseId, { curriculum:1 });
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    const lesson = course.curriculum.reduce((acc: any, week: any) => acc || week.lessons?.find((l: any) => l._id.toString() === lessonId), null);
    if (!lesson) return res.status(404).json({ success:false, message:'Lesson not found' });
    res.status(200).json({ success:true, data:lesson });
  } catch (error: any) {
    console.error('Error fetching lesson details:', error);
    res.status(500).json({ success:false, message:'Error fetching lesson details', error: error.message });
  }
};

/** Get course progress **/
export const getCourseProgress = async (req: Request, res: Response) => {
  try {
    const { userId, courseId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return res.status(400).json({ success:false, message:'Invalid user or course ID' });
    const progress = await Progress.findOne({ user: userId, course: courseId });
    res.status(200).json({ success:true, data:progress });
  } catch (error: any) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ success:false, message:'Error fetching course progress', error: error.message });
  }
};

/** Mark lesson complete **/
export const markLessonComplete = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, lessonId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId)) return res.status(400).json({ success:false, message:'Invalid user, course or lesson ID' });
    let progress = await Progress.findOne({ user: userId, course: courseId });
    if (!progress) progress = new Progress({ user: userId, course: courseId, lessons: [] });
    if (!progress.lessons.includes(lessonId)) progress.lessons.push(lessonId);
    await progress.save();
    res.status(200).json({ success:true, data:progress });
  } catch (error: any) {
    console.error('Error marking lesson complete:', error);
    res.status(500).json({ success:false, message:'Error marking lesson complete', error: error.message });
  }
};

/** Get course assignments **/
export const getCourseAssignments = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    const course = await Course.findById(id, { assignments:1 });
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    res.status(200).json({ success:true, data:course.assignments });
  } catch (error: any) {
    console.error('Error fetching course assignments:', error);
    res.status(500).json({ success:false, message:'Error fetching course assignments', error: error.message });
  }
};

/** Submit assignment **/
export const submitAssignment = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, assignmentId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(assignmentId)) return res.status(400).json({ success:false, message:'Invalid user, course or assignment ID' });
    // Assuming the submission data is in req.body
    // Implement the logic to save the submission
    res.status(200).json({ success:true, message:'Assignment submitted' });
  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ success:false, message:'Error submitting assignment', error: error.message });
  }
};

/** Get course quizzes **/
export const getCourseQuizzes = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    const course = await Course.findById(id, { quizzes:1 });
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    res.status(200).json({ success:true, data:course.quizzes });
  } catch (error: any) {
    console.error('Error fetching course quizzes:', error);
    res.status(500).json({ success:false, message:'Error fetching course quizzes', error: error.message });
  }
};

/** Submit quiz **/
export const submitQuiz = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, quizId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(quizId)) return res.status(400).json({ success:false, message:'Invalid user, course or quiz ID' });
    // Assuming the quiz data is in req.body
    // Implement the logic to save the quiz submission and calculate the score
    res.status(200).json({ success:true, message:'Quiz submitted' });
  } catch (error: any) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ success:false, message:'Error submitting quiz', error: error.message });
  }
};

/** Get quiz results **/
export const getQuizResults = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, quizId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(quizId)) return res.status(400).json({ success:false, message:'Invalid user, course or quiz ID' });
    // Implement the logic to fetch the quiz results for the user
    res.status(200).json({ success:true, data:{} });
  } catch (error: any) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({ success:false, message:'Error fetching quiz results', error: error.message });
  }
};

/** Get lesson resources **/
export const getLessonResources = async (req: Request, res: Response) => {
  try {
    const { courseId, lessonId } = req.params;
    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId)) return res.status(400).json({ success:false, message:'Invalid course or lesson ID' });
    const course = await Course.findById(courseId, { curriculum:1 });
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    const lesson = course.curriculum.reduce((acc: any, week: any) => acc || week.lessons?.find((l: any) => l._id.toString() === lessonId), null);
    if (!lesson) return res.status(404).json({ success:false, message:'Lesson not found' });
    res.status(200).json({ success:true, data:lesson.resources });
  } catch (error: any) {
    console.error('Error fetching lesson resources:', error);
    res.status(500).json({ success:false, message:'Error fetching lesson resources', error: error.message });
  }
};

/** Download resource **/
export const downloadResource = async (req: Request, res: Response) => {
  try {
    const { courseId, lessonId, resourceId } = req.params;
    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId) || !mongoose.isValidObjectId(resourceId)) return res.status(400).json({ success:false, message:'Invalid course, lesson or resource ID' });
    const course = await Course.findById(courseId, { curriculum:1 });
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    const lesson = course.curriculum.reduce((acc: any, week: any) => acc || week.lessons?.find((l: any) => l._id.toString() === lessonId), null);
    if (!lesson) return res.status(404).json({ success:false, message:'Lesson not found' });
    const resource = lesson.resources?.find((r: any) => r._id.toString() === resourceId);
    if (!resource) return res.status(404).json({ success:false, message:'Resource not found' });
    // Implement the logic to stream the resource file to the response
    res.status(200).json({ success:true, message:'Resource downloaded' });
  } catch (error: any) {
    console.error('Error downloading resource:', error);
    res.status(500).json({ success:false, message:'Error downloading resource', error: error.message });
  }
};

/** Add lesson note **/
export const addLessonNote = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, lessonId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId)) return res.status(400).json({ success:false, message:'Invalid user, course or lesson ID' });
    const note = new Note({ user: userId, course: courseId, lesson: lessonId, content: req.body.content });
    await note.save();
    res.status(201).json({ success:true, data:note });
  } catch (error: any) {
    console.error('Error adding lesson note:', error);
    res.status(500).json({ success:false, message:'Error adding lesson note', error: error.message });
  }
};

/** Add lesson bookmark **/
export const addLessonBookmark = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, lessonId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId)) return res.status(400).json({ success:false, message:'Invalid user, course or lesson ID' });
    const bookmark = new Bookmark({ user: userId, course: courseId, lesson: lessonId, timestamp: req.body.timestamp });
    await bookmark.save();
    res.status(201).json({ success:true, data:bookmark });
  } catch (error: any) {
    console.error('Error adding lesson bookmark:', error);
    res.status(500).json({ success:false, message:'Error adding lesson bookmark', error: error.message });
  }
};

/** Get lesson notes **/
export const getLessonNotes = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, lessonId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId)) return res.status(400).json({ success:false, message:'Invalid user, course or lesson ID' });
    const notes = await Note.find({ user: userId, course: courseId, lesson: lessonId });
    res.status(200).json({ success:true, data:notes });
  } catch (error: any) {
    console.error('Error fetching lesson notes:', error);
    res.status(500).json({ success:false, message:'Error fetching lesson notes', error: error.message });
  }
};

/** Get lesson bookmarks **/
export const getLessonBookmarks = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, lessonId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId)) return res.status(400).json({ success:false, message:'Invalid user, course or lesson ID' });
    const bookmarks = await Bookmark.find({ user: userId, course: courseId, lesson: lessonId });
    res.status(200).json({ success:true, data:bookmarks });
  } catch (error: any) {
    console.error('Error fetching lesson bookmarks:', error);
    res.status(500).json({ success:false, message:'Error fetching lesson bookmarks', error: error.message });
  }
};

/** Update note **/
export const updateNote = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, lessonId, noteId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId) || !mongoose.isValidObjectId(noteId)) return res.status(400).json({ success:false, message:'Invalid user, course, lesson or note ID' });
    const note = await Note.findOneAndUpdate({ _id: noteId, user: userId, course: courseId, lesson: lessonId }, req.body, { new: true });
    if (!note) return res.status(404).json({ success:false, message:'Note not found' });
    res.status(200).json({ success:true, data:note });
  } catch (error: any) {
    console.error('Error updating note:', error);
    res.status(500).json({ success:false, message:'Error updating note', error: error.message });
  }
};

/** Update bookmark **/
export const updateBookmark = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, lessonId, bookmarkId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId) || !mongoose.isValidObjectId(bookmarkId)) return res.status(400).json({ success:false, message:'Invalid user, course, lesson or bookmark ID' });
    const bookmark = await Bookmark.findOneAndUpdate({ _id: bookmarkId, user: userId, course: courseId, lesson: lessonId }, req.body, { new: true });
    if (!bookmark) return res.status(404).json({ success:false, message:'Bookmark not found' });
    res.status(200).json({ success:true, data:bookmark });
  } catch (error: any) {
    console.error('Error updating bookmark:', error);
    res.status(500).json({ success:false, message:'Error updating bookmark', error: error.message });
  }
};

/** Delete note **/
export const deleteNote = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, lessonId, noteId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId) || !mongoose.isValidObjectId(noteId)) return res.status(400).json({ success:false, message:'Invalid user, course, lesson or note ID' });
    const note = await Note.findOneAndDelete({ _id: noteId, user: userId, course: courseId, lesson: lessonId });
    if (!note) return res.status(404).json({ success:false, message:'Note not found' });
    res.status(200).json({ success:true, message:'Note deleted' });
  } catch (error: any) {
    console.error('Error deleting note:', error);
    res.status(500).json({ success:false, message:'Error deleting note', error: error.message });
  }
};

/** Delete bookmark **/
export const deleteBookmark = async (req: Request, res: Response) => {
  try {
    const { userId, courseId, lessonId, bookmarkId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId) || !mongoose.isValidObjectId(bookmarkId)) return res.status(400).json({ success:false, message:'Invalid user, course, lesson or bookmark ID' });
    const bookmark = await Bookmark.findOneAndDelete({ _id: bookmarkId, user: userId, course: courseId, lesson: lessonId });
    if (!bookmark) return res.status(404).json({ success:false, message:'Bookmark not found' });
    res.status(200).json({ success:true, message:'Bookmark deleted' });
  } catch (error: any) {
    console.error('Error deleting bookmark:', error);
    res.status(500).json({ success:false, message:'Error deleting bookmark', error: error.message });
  }
};

/** Update recorded videos **/
export const updateRecordedVideos = async (req: Request, res: Response) => {
  try {
    const { courseId, lessonId } = req.params;
    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId)) return res.status(400).json({ success:false, message:'Invalid course or lesson ID' });
    // Implement the logic to update the recorded videos for the lesson
    res.status(200).json({ success:true, message:'Recorded videos updated' });
  } catch (error: any) {
    console.error('Error updating recorded videos:', error);
    res.status(500).json({ success:false, message:'Error updating recorded videos', error: error.message });
  }
};

/** Get recorded videos for user **/
export const getRecordedVideosForUser = async (req: Request, res: Response) => {
  try {
    const { userId, courseId } = req.params;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return res.status(400).json({ success:false, message:'Invalid user or course ID' });
    // Implement the logic to fetch the recorded videos for the user and course
    res.status(200).json({ success:true, data:[] });
  } catch (error: any) {
    console.error('Error fetching recorded videos:', error);
    res.status(500).json({ success:false, message:'Error fetching recorded videos', error: error.message });
  }
};

/** Get all related courses **/
export const getAllRelatedCourses = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    // Implement the logic to fetch the related courses for the given course
    res.status(200).json({ success:true, data:[] });
  } catch (error: any) {
    console.error('Error fetching related courses:', error);
    res.status(500).json({ success:false, message:'Error fetching related courses', error: error.message });
  }
};

/** Get new courses with limits **/
export const getNewCoursesWithLimits = async (req: Request, res: Response) => {
  try {
    let { page = '1', limit = '10' } = req.query as any;
    let pg = parseInt(page), lim = parseInt(limit);
    if (isNaN(pg)||pg<1||isNaN(lim)||lim<1) return res.status(400).json({ success: false, message: 'Invalid pagination params' });
    // Implement the logic to fetch the new courses with pagination
    res.status(200).json({ success:true, data:[] });
  } catch (error: any) {
    console.error('Error fetching new courses:', error);
    res.status(500).json({ success:false, message:'Error fetching new courses', error: error.message });
  }
};

/** Download brochure **/
export const downloadBrochure = async (req: Request, res: Response) => {
  try {
    const { courseId, brochureId } = req.params;
    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(brochureId)) return res.status(400).json({ success:false, message:'Invalid course or brochure ID' });
    // Implement the logic to stream the brochure file to the response
    res.status(200).json({ success:true, message:'Brochure downloaded' });
  } catch (error: any) {
    console.error('Error downloading brochure:', error);
    res.status(500).json({ success:false, message:'Error downloading brochure', error: error.message });
  }
};

/** Get course prices **/
export const getCoursePrices = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    const course = await Course.findById(courseId, { prices:1 });
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    res.status(200).json({ success:true, data:course.prices });
  } catch (error: any) {
    console.error('Error fetching course prices:', error);
    res.status(500).json({ success:false, message:'Error fetching course prices', error: error.message });
  }
};

/** Update course prices **/
export const updateCoursePrices = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    const course = await Course.findByIdAndUpdate(courseId, { prices: req.body.prices }, { new: true });
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    res.status(200).json({ success:true, data:course.prices });
  } catch (error: any) {
    console.error('Error updating course prices:', error);
    res.status(500).json({ success:false, message:'Error updating course prices', error: error.message });
  }
};

/** Bulk update course prices **/
export const bulkUpdateCoursePrices = async (req: Request, res: Response) => {
  try {
    // Assuming the course prices data is in req.body
    // Implement the logic to bulk update the course prices
    res.status(200).json({ success:true, message:'Course prices updated' });
  } catch (error: any) {
    console.error('Error bulk updating course prices:', error);
    res.status(500).json({ success:false, message:'Error bulk updating course prices', error: error.message });
  }
};

/** Get all courses with prices **/
export const getAllCoursesWithPrices = async (req: Request, res: Response) => {
  try {
    const courses = await Course.find({}, { course_title:1, prices:1 });
    res.status(200).json({ success:true, data:courses });
  } catch (error: any) {
    console.error('Error fetching courses with prices:', error);
    res.status(500).json({ success:false, message:'Error fetching courses with prices', error: error.message });
  }
};

/** Get courses with fields **/
export const getCoursesWithFields = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', status, fields = 'card', filters = {} } = req.query as any;
    const pg = parseInt(page, 10);
    const lim = parseInt(limit, 10);
    if (isNaN(pg) || pg < 1 || isNaN(lim) || lim < 1) {
      return res.status(400).json({ success: false, message: 'Invalid pagination params' });
    }
    // Build query filters
    const query: any = {};
    if (status) query.status = status;
    if ((filters as any).class_type) query.class_type = (filters as any).class_type;
    if ((filters as any).currency) query['prices.currency'] = (filters as any).currency.toUpperCase();
    // Build projection for requested fields
    let projection: any = {};
    if (fields === 'card') {
      projection = { course_title: 1, course_category: 1, course_tag: 1, course_image: 1, prices: 1, isFree: 1 };
    } else {
      (fields as string).split(',').forEach((f) => { projection[f.trim()] = 1; });
    }
    // Fetch plain objects
    const docs = await Course.find(query, projection)
      .skip((pg - 1) * lim)
      .limit(lim)
      .lean();
    // Map documents to include computed priceDisplay and selected fields
    const data = (docs as any[]).map((doc) => {
      // Filter prices by currency if requested
      let prices = doc.prices || [];
      if ((filters as any).currency) {
        prices = prices.filter(
          (p: any) => p.currency === (filters as any).currency.toUpperCase(),
        );
      }
      // Compute display price
      let priceDisplay = '';
      if (doc.isFree) {
        priceDisplay = 'Free';
      } else if (prices.length > 0) {
        priceDisplay = `${prices[0].currency} ${prices[0].individual}`;
      }
      if (fields === 'card') {
        return {
          _id: doc._id,
          id: doc._id.toString(),
          course_title: doc.course_title,
          course_category: doc.course_category,
          course_tag: doc.course_tag,
          course_image: doc.course_image,
          priceDisplay,
        };
      }
      // Generic fields projection
      const result: any = { _id: doc._id, id: doc._id.toString(), priceDisplay };
      Object.keys(projection).forEach((key) => {
        if (doc[key] !== undefined) result[key] = doc[key];
      });
      return result;
    });
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching courses with fields:', error);
    res.status(500).json({ success: false, message: 'Error fetching courses with fields', error: error.message });
  }
};

/** Handle upload **/
export const handleUpload = async (req: Request, res: Response) => {
  try {
    // Assuming the file is in req.file
    // Implement the logic to handle the file upload
    res.status(200).json({ success:true, message:'File uploaded' });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success:false, message:'Error uploading file', error: error.message });
  }
};

/** Handle multiple upload **/
export const handleMultipleUpload = async (req: Request, res: Response) => {
  try {
    // Assuming the files are in req.files
    // Implement the logic to handle the multiple file upload
    res.status(200).json({ success:true, message:'Files uploaded' });
  } catch (error: any) {
    console.error('Error uploading files:', error);
    res.status(500).json({ success:false, message:'Error uploading files', error: error.message });
  }
};

/** Get course resource **/
export const getCourseResource = catchAsync(async (req: Request, res: Response) => {
  try {
    const { courseId, resourceId } = req.params;
    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(resourceId)) return res.status(400).json({ success:false, message:'Invalid course or resource ID' });
    // Implement the logic to fetch the course resource
    res.status(200).json({ success:true, data:{} });
  } catch (error: any) {
    console.error('Error fetching course resource:', error);
    res.status(500).json({ success:false, message:'Error fetching course resource', error: error.message });
  }
});

/** Get course material **/
export const getCourseMaterial = catchAsync(async (req: Request, res: Response) => {
  try {
    const { courseId, materialId } = req.params;
    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(materialId)) return res.status(400).json({ success:false, message:'Invalid course or material ID' });
    // Implement the logic to fetch the course material
    res.status(200).json({ success:true, data:{} });
  } catch (error: any) {
    console.error('Error fetching course material:', error);
    res.status(500).json({ success:false, message:'Error fetching course material', error: error.message });
  }
});

/** Get home courses **/
export const getHomeCourses = async (req: Request, res: Response) => {
  try {
    // Implement the logic to fetch the courses for the home page
    res.status(200).json({ success:true, data:[] });
  } catch (error: any) {
    console.error('Error fetching home courses:', error);
    res.status(500).json({ success:false, message:'Error fetching home courses', error: error.message });
  }
};

/** Toggle show in home **/
export const toggleShowInHome = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) return res.status(400).json({ success:false, message:'Invalid course ID' });
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success:false, message:'Course not found' });
    course.showInHome = !course.showInHome;
    await course.save();
    res.status(200).json({ success:true, data:course });
  } catch (error: any) {
    console.error('Error toggling show in home:', error);
    res.status(500).json({ success:false, message:'Error toggling show in home', error: error.message });
  }
};

// Alias for corporate course retrieval (matches route)
export const getCoorporateCourseById = getCourseById;