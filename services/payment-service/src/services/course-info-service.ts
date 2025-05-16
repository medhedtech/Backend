import { ServiceClient } from '../../../../shared/utils/service-client';
import logger from '../../../../shared/utils/logger';

/**
 * Service for fetching course-related information from the course service
 */
export class CourseInfoService {
  /**
   * Get detailed course information by ID
   * @param courseId The course ID
   * @returns Course details
   */
  static async getCourseDetails(courseId: string) {
    try {
      const response = await ServiceClient.get('COURSE', `/api/courses/${courseId}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching course details from course service', { courseId, error });
      throw new Error(`Failed to fetch course details: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a course exists and is available for enrollment
   * @param courseId The course ID
   * @returns Boolean indicating if course is available
   */
  static async isCourseAvailable(courseId: string): Promise<boolean> {
    try {
      const response = await ServiceClient.get('COURSE', `/api/courses/${courseId}/availability`);
      return response.data?.available === true;
    } catch (error) {
      logger.error('Error checking course availability', { courseId, error });
      return false;
    }
  }

  /**
   * Get pricing information for a course
   * @param courseId The course ID
   * @returns Pricing details
   */
  static async getCoursePricing(courseId: string) {
    try {
      const response = await ServiceClient.get('COURSE', `/api/courses/${courseId}/pricing`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching course pricing', { courseId, error });
      throw new Error(`Failed to fetch course pricing: ${(error as Error).message}`);
    }
  }
} 