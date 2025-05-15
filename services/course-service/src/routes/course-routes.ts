import express from 'express';
const router = express.Router();

import {
  createCourse,
  getAllCourses,
  getAllCoursesWithLimits,
  getNewCoursesWithLimits,
  getAllCoursesWithPrices,
  getCoursesWithFields,
  getHomeCourses,
  getCourseById,
  getCoorporateCourseById,
  getCourseTitles,
  getAllRelatedCourses,
  toggleCourseStatus,
  updateCourse,
  deleteCourse,
  updateRecordedVideos,
  getRecordedVideosForUser,
  getCourseSections,
  getCourseLessons,
  getLessonDetails,
  getCourseProgress,
  markLessonComplete,
  getCourseAssignments,
  submitAssignment,
  getCourseQuizzes,
  submitQuiz,
  getQuizResults,
  getLessonResources,
  downloadResource,
  getLessonNotes,
  addLessonNote,
  updateNote,
  deleteNote,
  getLessonBookmarks,
  addLessonBookmark,
  updateBookmark,
  deleteBookmark,
  downloadBrochure,
  getCoursePrices,
  updateCoursePrices,
  bulkUpdateCoursePrices,
  toggleShowInHome,
  handleUpload,
  handleMultipleUpload,
} from '../controllers/course-controller';
import { authenticateToken } from '../middleware/auth';
import { upload, uploadMultiple, handleUploadError } from '../middleware/upload';

// Public Routes
router.get('/get', getAllCourses);
router.get('/search', getAllCoursesWithLimits);
router.get('/new', getNewCoursesWithLimits);
router.get('/prices', getAllCoursesWithPrices);
router.get('/fields', getCoursesWithFields);
router.get('/home', getHomeCourses);
router.get('/coorporate/:id', getCoorporateCourseById);
router.get('/titles', getCourseTitles);
router.get('/related', getAllRelatedCourses);
router.get('/:id', getCourseById);

// Student Routes (Protected)
router.use(authenticateToken);
router.get('/:courseId/sections', getCourseSections);
router.get('/:courseId/lessons', getCourseLessons);
router.get('/:courseId/lessons/:lessonId', getLessonDetails);
router.get('/:courseId/progress', getCourseProgress);
router.post('/:courseId/lessons/:lessonId/complete', markLessonComplete);
router.get('/:courseId/assignments', getCourseAssignments);
router.post('/:courseId/assignments/:assignmentId/submit', submitAssignment);
router.get('/:courseId/quizzes', getCourseQuizzes);
router.post('/:courseId/quizzes/:quizId/submit', submitQuiz);
router.get('/:courseId/quizzes/:quizId/results', getQuizResults);
router.get('/:courseId/lessons/:lessonId/resources', getLessonResources);
router.get(
  '/:courseId/lessons/:lessonId/resources/:resourceId/download',
  downloadResource,
);
router.get('/:courseId/lessons/:lessonId/notes', getLessonNotes);
router.post('/:courseId/lessons/:lessonId/notes', addLessonNote);
router.put('/:courseId/lessons/:lessonId/notes/:noteId', updateNote);
router.delete('/:courseId/lessons/:lessonId/notes/:noteId', deleteNote);
router.get('/:courseId/lessons/:lessonId/bookmarks', getLessonBookmarks);
router.post('/:courseId/lessons/:lessonId/bookmarks', addLessonBookmark);
router.put(
  '/:courseId/lessons/:lessonId/bookmarks/:bookmarkId',
  updateBookmark,
);
router.delete(
  '/:courseId/lessons/:lessonId/bookmarks/:bookmarkId',
  deleteBookmark,
);
router.post('/broucher/download/:courseId', downloadBrochure);

// Admin Routes (Protected)
router.post(
  '/create',
  upload.single('course_image'),
  handleUploadError,
  createCourse,
);
router.put(
  '/:id',
  upload.single('course_image'),
  handleUploadError,
  updateCourse,
);
router.delete('/:id', deleteCourse);
router.patch('/:id/toggle-status', toggleCourseStatus);
router.post('/:id/recorded-videos', updateRecordedVideos);
router.get('/recorded-videos/:studentId', getRecordedVideosForUser);
router.get('/:id/prices', getCoursePrices);
router.put('/:id/prices', updateCoursePrices);
router.post('/prices/bulk-update', bulkUpdateCoursePrices);
router.patch(
  '/:id/toggle-home',
  authenticateToken,
  toggleShowInHome,
);

// File Upload Routes (Protected)
router.post('/upload', upload.single('file'), handleUploadError, handleUpload);
router.post(
  '/upload-multiple',
  uploadMultiple.array('files', 10),
  handleUploadError,
  handleMultipleUpload,
);

export default router; 