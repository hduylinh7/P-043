export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  term?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  instructor_id?: string | null;
  instructor_name?: string | null;
  created_at: string;
  student_count: number;
  is_enrolled?: boolean;
}

export interface CourseCreatePayload {
  name: string;
  code: string;
  description?: string;
  term?: string;
  start_date: string;
  end_date: string;
}

export interface CourseUpdatePayload {
  name?: string;
  code?: string;
  description?: string;
  term?: string;
  start_date?: string;
  end_date?: string;
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

