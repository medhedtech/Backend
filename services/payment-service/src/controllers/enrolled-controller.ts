import { Request, Response, NextFunction } from 'express';
import Course from '../../../../shared/models/course-model';
import EnrolledCourse from '../../../../shared/models/enrolled-courses-model';
import EnrolledModule from '../../../../shared/models/enrolled-modules.model';
import User from '../../../../shared/models/user';
import { errorHandler } from '../../../../shared/utils/errorHandler';
import logger from '../../../../shared/utils/logger';
import OnlineMeeting from '../../../../shared/models/online-meeting-model';
import Student from '../../../../shared/models/student-model';

// Create a new enrollment with EMI support
export const createEnrolledCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      student_id,
      course_id,
      expiry_date,
      is_self_paced,
      enrollment_type,
      payment_status,
      status,
      paymentResponse,
      currencyCode,
      activePricing,
      getFinalPrice,
      metadata,
      is_emi,
      emi_config,
    } = req.body;

    // Validate required fields
    if (!student_id || !course_id) {
      return res.status(400).json({ success: false, message: 'Student ID and Course ID are required' });
    }

    // Check if the student exists
    const student = await User.findById(student_id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check if the course exists
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Prevent duplicate enrollment
    const existing = await EnrolledCourse.findOne({ student_id, course_id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Student is already enrolled in this course' });
    }

    // Build enrollment data
    const enrollmentData: any = {
      student_id,
      course_id,
      is_self_paced: is_self_paced || false,
      enrollment_type,
      batch_size:
        enrollment_type === 'batch' && activePricing
          ? activePricing.min_batch_size
          : 1,
      payment_status: payment_status || 'completed',
      enrollment_date: new Date(),
      course_progress: 0,
      status: status || 'active',
      paymentType: is_emi ? 'emi' : 'full',
      metadata: {
        deviceInfo: req.headers['user-agent'],
        ipAddress: req.ip,
        enrollmentSource: req.headers.referer || 'direct',
        ...metadata,
      },
    };

    // Handle expiry date
    if (!enrollmentData.is_self_paced) {
      enrollmentData.expiry_date = expiry_date ?? (() => {
        const def = new Date(); def.setFullYear(def.getFullYear() + 1); return def;
      })();
    }

    // Payment details
    if (paymentResponse) {
      enrollmentData.payment_details = {
        payment_id: paymentResponse.razorpay_payment_id || '',
        payment_signature: paymentResponse.razorpay_signature || '',
        payment_order_id: paymentResponse.razorpay_order_id || '',
        payment_method: 'razorpay',
        amount: typeof getFinalPrice === 'function' ? getFinalPrice() : paymentResponse.amount || 0,
        currency: currencyCode || 'INR',
        payment_date: new Date(),
      };
    }

    // Create enrollment record
    const newEnrolled = new EnrolledCourse(enrollmentData);

    // Setup EMI schedule if needed
    if (is_emi && emi_config) {
      await newEnrolled.setupEmiSchedule({
        totalAmount: emi_config.totalAmount || newEnrolled.payment_details.amount,
        downPayment: emi_config.downPayment || 0,
        numberOfInstallments: emi_config.numberOfInstallments,
        startDate: emi_config.startDate || new Date(),
        interestRate: emi_config.interestRate || 0,
        processingFee: emi_config.processingFee || 0,
        gracePeriodDays: emi_config.gracePeriodDays || 5,
      });
    }

    await newEnrolled.save();

    // Create modules if course has videos
    if (course.course_videos?.length) {
      const modules = course.course_videos.map((url: string) => ({
        student_id,
        course_id,
        enrollment_id: newEnrolled._id,
        video_url: url,
      }));
      await EnrolledModule.insertMany(modules);
    }

    res.status(201).json({ success: true, message: 'Student enrolled successfully', data: newEnrolled });
  } catch (err) {
    errorHandler(err, req, res, next);
  }
};

export const getAllEnrolledCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page = 1, limit = 10, status, payment_status, enrollment_type, search } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (payment_status) query.payment_status = payment_status as string;
    if (enrollment_type) query.enrollment_type = enrollment_type as string;
    if (search) {
      query.$or = [
        { 'student_id.full_name': { $regex: search, $options: 'i' } },
        { 'course_id.course_title': { $regex: search, $options: 'i' } },
      ];
    }
    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: { enrollment_date: -1 },
      populate: [
        { path: 'student_id', select: 'full_name email role' },
        { path: 'course_id', select: 'course_title course_image session_duration' },
      ],
    };
    // @ts-ignore
    const enrollments = await EnrolledCourse.paginate(query, options);
    res.status(200).json({ success: true, data: enrollments });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

export const getEnrolledCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const enrollment = await EnrolledCourse.findById(id)
      .populate('student_id', 'full_name email role user_image')
      .populate('course_id', 'course_title course_image session_duration')
      .populate('certificate_id')
      .lean();
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }
    const stats = await (EnrolledCourse as any).getEnrollmentStats(enrollment.course_id);
    (enrollment as any).statistics = stats;
    res.status(200).json({ success: true, data: enrollment });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

export const getEnrollmentCountsByStudentId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { student_id } = req.params;
    if (!student_id) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }
    const enrollments = await EnrolledCourse.find({ student_id }).populate(
      'course_id',
      'course_title class_type description course_image session_duration',
    );
    const counts = {
      total: enrollments.length,
      active: enrollments.filter(e => e.status === 'active').length,
      completed: enrollments.filter(e => e.status === 'completed').length,
      pending: enrollments.filter(e => e.payment_status === 'pending').length,
      cancelled: enrollments.filter(e => e.status === 'cancelled').length,
      expired: enrollments.filter(e => e.status === 'expired').length,
    };
    res.status(200).json({ success: true, data: counts });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

export const updateEnrolledCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const enrollment = await EnrolledCourse.findById(id);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }
    if (updateData.student_id) {
      const student = await User.findById(updateData.student_id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
    }
    if (updateData.course_id) {
      const course = await Course.findById(updateData.course_id);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
    }
    Object.keys(updateData).forEach(key => {
      if (key !== 'student_id' && key !== 'course_id') {
        (enrollment as any)[key] = (updateData as any)[key];
      }
    });
    if (typeof updateData.is_completed !== 'undefined') {
      enrollment.is_completed = updateData.is_completed;
      enrollment.completed_on = updateData.is_completed ? new Date() : null;
      if (updateData.is_completed) enrollment.status = 'completed';
    }
    const updated = await enrollment.save();
    res.status(200).json({ success: true, message: 'Enrollment updated successfully', data: updated });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

export const deleteEnrolledCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const enrollment = await EnrolledCourse.findById(id);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }
    await EnrolledModule.deleteMany({ enrollment_id: id });
    await EnrolledCourse.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Enrollment deleted successfully' });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

export const getEnrolledCourseByStudentId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { student_id } = req.params;
    const { status, includeExpired = 'false' } = req.query;
    const query: any = { student_id };
    if (includeExpired !== 'true') query.status = { $ne: 'expired' };
    if (status) query.status = status as string;
    const enrollments = await EnrolledCourse.find(query)
      .populate({ path: 'course_id', populate: { path: 'assigned_instructor', model: 'AssignedInstructor' } })
      .sort({ enrollment_date: -1 });
    if (!enrollments.length) {
      return res.status(404).json({ success: false, message: 'No enrollments found' });
    }
    res.status(200).json({ success: true, data: enrollments });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

export const getEnrolledStudentsByCourseId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { course_id } = req.params;
    const { status, includeExpired = 'false' } = req.query;
    const query: any = { course_id };
    if (includeExpired !== 'true') query.status = { $ne: 'expired' };
    if (status) query.status = status as string;
    const studentsEnrolled = await EnrolledCourse.find(query)
      .populate('student_id', 'full_name email role user_image')
      .sort({ enrollment_date: -1 });
    if (!studentsEnrolled.length) {
      return res.status(404).json({ success: false, message: 'No students enrolled' });
    }
    res.status(200).json({ success: true, data: studentsEnrolled });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

export const getUpcomingMeetingsForStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { student_id } = req.params;
    const { limit = 10 } = req.query;
    const enrollments = await EnrolledCourse.find({ student_id, status: 'active' }).populate('course_id', 'course_title');
    if (!enrollments.length) {
      return res.status(404).json({ success: false, message: 'No active enrollments found' });
    }
    const courseNames = enrollments.map(e => e.course_id.course_title);
    const upcoming = await OnlineMeeting.find({ course_name: { $in: courseNames }, date: { $gte: new Date() } })
      .sort({ date: 1, time: 1 })
      .limit(Number(limit));
    if (!upcoming.length) {
      return res.status(404).json({ success: false, message: 'No upcoming meetings' });
    }
    res.status(200).json({ success: true, data: upcoming });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

export const markCourseAsCompleted = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { student_id, course_id } = req.body;
    if (!student_id || !course_id) {
      return res.status(400).json({ success: false, message: 'Student ID and Course ID required' });
    }
    const enrollment = await EnrolledCourse.findOne({ student_id, course_id });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }
    if (enrollment.is_completed) {
      return res.status(400).json({ success: false, message: 'Course already completed' });
    }
    enrollment.is_completed = true;
    enrollment.completed_on = new Date();
    enrollment.status = 'completed';
    await enrollment.save();
    res.status(200).json({ success: true, message: 'Course marked completed', data: enrollment });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

export const getAllStudentsWithEnrolledCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { status, includeExpired = 'false', page = 1, limit = 10, search } = req.query;
    const query: any = { course_id: { $exists: true } };
    if (includeExpired !== 'true') query.status = { $ne: 'expired' };
    if (status) query.status = status as string;
    if (search) {
      query.$or = [
        { 'student_id.full_name': { $regex: search, $options: 'i' } },
        { 'student_id.email': { $regex: search, $options: 'i' } },
        { 'course_id.course_title': { $regex: search, $options: 'i' } },
      ];
    }
    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: { enrollment_date: -1 },
      populate: [
        { path: 'student_id', select: 'full_name email role meta age_group user_image', match: { role: 'student' } },
        { path: 'course_id', select: 'course_title course_image' },
      ],
    };
    // @ts-ignore
    const enrollments = await EnrolledCourse.paginate(query, options);
    const filtered = enrollments.docs.filter((e: any) => e.student_id && e.course_id);
    if (!filtered.length) {
      return res.status(404).json({ success: false, message: 'No students found' });
    }
    const grouped = filtered.reduce((acc: any, e: any) => {
      const sid = e.student_id._id.toString();
      if (!acc[sid]) acc[sid] = { student: e.student_id, enrollments: [] };
      acc[sid].enrollments.push(e);
      return acc;
    }, {} as any);
    res.status(200).json({ success: true, data: Object.values(grouped), pagination: { totalDocs: enrollments.totalDocs, limit: enrollments.limit, totalPages: enrollments.totalPages, page: enrollments.page } });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

export const watchVideo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.query;
    const { student_id } = req.body;
    if (!id || !student_id) {
      return res.status(400).json({ success: false, message: 'Video ID and Student ID required' });
    }
    const module = await EnrolledModule.findById(id as string);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }
    if (module.student_id.toString() !== student_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    module.is_watched = true;
    await module.save();
    const course = await Course.findById(module.course_id);
    if (course.course_videos.length === (await EnrolledModule.countDocuments({ course_id: module.course_id, student_id, is_watched: true }))) {
      await EnrolledCourse.findOneAndUpdate({ course_id: module.course_id, student_id, is_completed: false }, { is_completed: true, completed_on: new Date(), status: 'completed' });
    }
    res.status(200).json({ success: true, message: 'Video watched' });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

export const saveCourse = (req: Request, res: Response) => {
  return res.status(501).json({ success: false, message: 'saveCourse not implemented' });
};

export const removeSavedCourse = (req: Request, res: Response) => {
  return res.status(501).json({ success: false, message: 'removeSavedCourse not implemented' });
};

export const getSavedCourses = (req: Request, res: Response) => {
  return res.status(501).json({ success: false, message: 'getSavedCourses not implemented' });
};

export const convertSavedCourseToEnrollment = (req: Request, res: Response) => {
  return res.status(501).json({ success: false, message: 'convertSavedCourseToEnrollment not implemented' });
}; 