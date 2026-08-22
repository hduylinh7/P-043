import { api } from './api';
import {
  Course,
  CourseCreatePayload,
  CourseDetail,
  CourseUpdatePayload,
  EnrolledStudent,
  TimetableEntry,
} from '../types/course';

export const courseService = {
  async createCourse(payload: CourseCreatePayload): Promise<Course> {
    const response = await api.post<Course>('/courses', payload);
    return response.data;
  },

  async updateCourse(courseId: string, payload: CourseUpdatePayload): Promise<Course> {
    const response = await api.put<Course>(`/courses/${courseId}`, payload);
    return response.data;
  },

  async deleteCourse(courseId: string): Promise<void> {
    await api.delete(`/courses/${courseId}`);
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

  async leaveCourse(courseId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/courses/${courseId}/leave`);
    return response.data;
  },

  async getStudentCourses(): Promise<Course[]> {
    const response = await api.get<Course[]>('/courses/student/my-courses');
    return response.data;
  },

  async getStudentTimetable(): Promise<TimetableEntry[]> {
    const response = await api.get<TimetableEntry[]>('/courses/student/timetable');
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
