import { Router } from 'express';
import * as enrollmentController from '../controllers/enrolled-controller';
import { authenticateToken, authorize } from '../middleware/auth';
import { validateObjectId } from '../middleware/validation';
import { validateEnrollment } from '../middleware/validators/enrollmentValidator';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Create enrollment
router.post(
  '/create',
  authorize(['student']),
  validateEnrollment,
  enrollmentController.createEnrolledCourse,
);

// Get all enrollments with pagination and filters
router.get(
  '/get',
  authorize(['admin', 'instructor']),
  enrollmentController.getAllEnrolledCourses,
);

// Get enrollment by ID
router.get(
  '/get/:id',
  validateObjectId('id'),
  enrollmentController.getEnrolledCourseById,
);

// Get enrollment counts by student ID
router.get(
  '/getCount/:student_id',
  validateObjectId('student_id'),
  enrollmentController.getEnrollmentCountsByStudentId,
);

// Update enrollment
router.post(
  '/update/:id',
  authorize(['admin', 'instructor']),
  validateObjectId('id'),
  validateEnrollment,
  enrollmentController.updateEnrolledCourse,
);

// Delete enrollment
router.delete(
  '/delete/:id',
  authorize(['admin']),
  validateObjectId('id'),
  enrollmentController.deleteEnrolledCourse,
);

// Get enrollments by student ID
router.get(
  '/student/:student_id',
  validateObjectId('student_id'),
  enrollmentController.getEnrolledCourseByStudentId,
);

// Get enrolled students by course ID
router.get(
  '/course/:course_id',
  validateObjectId('course_id'),
  enrollmentController.getEnrolledStudentsByCourseId,
);

// Get upcoming meetings for student
router.get(
  '/get-upcoming-meetings/:student_id',
  validateObjectId('student_id'),
  enrollmentController.getUpcomingMeetingsForStudent,
);

// Mark course as completed
router.post(
  '/mark-completed',
  authorize(['admin', 'instructor']),
  enrollmentController.markCourseAsCompleted,
);

// Get all students with enrolled courses
router.get(
  '/get-enrolled-students',
  authorize(['admin', 'instructor']),
  enrollmentController.getAllStudentsWithEnrolledCourses,
);

// Mark video as watched
router.get(
  '/watch',
  validateObjectId('id'),
  enrollmentController.watchVideo,
);

// Save a course
router.post(
  '/save-course',
  authorize(['student']),
  enrollmentController.saveCourse,
);

// Remove a saved course
router.delete(
  '/save-course/:course_id',
  authorize(['student']),
  validateObjectId('course_id'),
  enrollmentController.removeSavedCourse,
);

// Get all saved courses for a student
router.get(
  '/saved-courses',
  authorize(['student']),
  enrollmentController.getSavedCourses,
);

// Convert a saved course to an enrollment
router.post(
  '/convert-saved/:course_id',
  authorize(['student']),
  validateObjectId('course_id'),
  enrollmentController.convertSavedCourseToEnrollment,
);

export default router; 