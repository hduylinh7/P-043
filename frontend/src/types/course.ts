export interface CourseSchedule {
  id?: string;
  course_id?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room?: string | null;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  term?: string | null;
  credits?: number;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  instructor_id?: string | null;
  instructor_name?: string | null;
  created_at: string;
  student_count: number;
  is_enrolled?: boolean;
  schedules?: CourseSchedule[];
}

export interface CourseCreatePayload {
  name: string;
  code: string;
  description?: string;
  term?: string;
  credits?: number;
  start_date: string;
  end_date: string;
  schedules?: CourseSchedule[];
}

export interface CourseUpdatePayload {
  name?: string;
  code?: string;
  description?: string;
  term?: string;
  credits?: number;
  start_date?: string;
  end_date?: string;
  schedules?: CourseSchedule[];
}

export interface EnrolledStudent {
  id: string;
  full_name: string;
  email: string;
  joined_at: string;
  status: string;
}

export interface CourseDetail {
  course: Course;
  students: EnrolledStudent[];
}

export interface ScheduleConflictInfo {
  conflicting_course_id: string;
  conflicting_course_code: string;
  conflicting_course_name: string;
  day_of_week: string;
  existing_start_time: string;
  existing_end_time: string;
  new_start_time: string;
  new_end_time: string;
  overlap_start_time: string;
  overlap_end_time: string;
}

export interface TimetableEntry {
  course_id: string;
  course_code: string;
  course_name: string;
  credits: number;
  instructor_name?: string | null;
  start_date: string;
  end_date: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room?: string | null;
}
