export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type QuestionType = 'MULTIPLE_CHOICE' | 'ESSAY' | 'SHORT_ANSWER';

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  display_order: number;
}

export interface QuestionOptionPayload {
  option_text: string;
  is_correct: boolean;
  display_order?: number;
}

export interface AssignmentQuestion {
  id: string;
  assignment_id: string;
  question_type: QuestionType;
  question_text: string;
  points: number;
  display_order: number;
  expected_answer?: string | null;
  options: QuestionOption[];
}

export interface AssignmentQuestionPayload {
  question_type: QuestionType;
  question_text: string;
  points: number;
  display_order?: number;
  expected_answer?: string | null;
  options?: QuestionOptionPayload[];
}

export interface AssignmentQuestionReorderItem {
  id: string;
  display_order: number;
}

export interface Checklist {
  id: string;
  assignment_id: string;
  title: string;
  description?: string | null;
  display_order: number;
  created_at: string;
  completed: boolean;
  completed_at?: string | null;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name?: string | null;
  student_email?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  has_file?: boolean;
  submission_text?: string | null;
  submitted_at?: string | null;
  status: string;
  student_status?: string;  // "Submitted", "Late", "Not Submitted"
  grading_status?: string;  // "Graded", "Pending", "-"
  is_late?: boolean;
  score?: number | null;
  grade?: string | null;
  feedback?: string | null;
}

export interface AssignmentSubmissionsOverview {
  assignment_id: string;
  assignment_title: string;
  course_title: string;
  available_from?: string | null;
  due_date?: string | null;
  question_count: number;
  total_points: number;
  total_students: number;
  submitted_count: number;
  not_submitted_count: number;
  late_count: number;
  graded_count: number;
  pending_count: number;
  submissions: Submission[];
}

export interface GradeSubmissionPayload {
  score: number;
  grade?: string;
  feedback?: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  available_from?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  status: string;
  priority: PriorityLevel;
  attachment_file_name?: string | null;
  attachment_file_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  progress_status?: ProgressStatus | null;
  checklist_count?: number;
  completed_checklist_count?: number;
  progress_percentage?: number;
  question_count?: number;
  total_points?: number;
  checklists?: Checklist[];
  questions?: AssignmentQuestion[];
}

export interface AssignmentCreatePayload {
  title: string;
  description?: string;
  available_from?: string;
  due_date?: string;
  estimated_hours?: number;
  status?: string;
  priority?: PriorityLevel;
  questions?: AssignmentQuestionPayload[];
}

export interface AssignmentUpdatePayload {
  title?: string;
  description?: string;
  available_from?: string;
  due_date?: string;
  estimated_hours?: number;
  status?: string;
  priority?: PriorityLevel;
}

export interface AssignmentProgressPayload {
  progress_status: ProgressStatus;
}

export interface ChecklistCreatePayload {
  title: string;
  description?: string;
  display_order?: number;
}

export interface ChecklistUpdatePayload {
  title?: string;
  description?: string;
  display_order?: number;
}

export interface ChecklistReorderItem {
  id: string;
  display_order: number;
}

export interface AssignmentAnalytics {
  assignment_id: string;
  total_enrolled_students: number;
  average_completion_percentage: number;
  completed_students_count: number;
  in_progress_students_count: number;
  not_started_students_count: number;
}

