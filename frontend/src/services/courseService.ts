import { api } from './api';
import {
  Course,
  CourseCreatePayload,
  CourseDetail,
  EnrolledStudent,
} from '../types/course';

export const courseService = {
  async createCourse(payload: CourseCreatePayload): Promise<Course> {
    const response = await api.post<Course>('/courses', payload);
    return response.data;
  },

  async getInstructorCourses(): Promise<Course[]> {
    const response = await api.get<Course[]>('/courses/instructor/my-courses');
    return response.data;
  },

  async getAvailableCourses(): Promise<Course[]> {
    const response = await api.get<Course[]>('/courses/available');
    return response.data;
  },

  async joinCourse(courseId: string): Promise<Course> {
    const response = await api.post<Course>(`/courses/${courseId}/join`);
    return response.data;
  },

  async getStudentCourses(): Promise<Course[]> {
    const response = await api.get<Course[]>('/courses/student/my-courses');
    return response.data;
  },

  async getCourseDetail(courseId: string): Promise<CourseDetail> {
    const response = await api.get<CourseDetail>(`/courses/${courseId}`);
    return response.data;
  },

  async getEnrolledStudents(courseId: string): Promise<EnrolledStudent[]> {
    const response = await api.get<EnrolledStudent[]>(`/courses/${courseId}/students`);
    return response.data;
  },
};
