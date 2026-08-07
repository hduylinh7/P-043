export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

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
  score?: number | null;
  grade?: string | null;
}

export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
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
  checklists?: Checklist[];
}

export interface AssignmentCreatePayload {
  title: string;
  description?: string;
  due_date?: string;
  estimated_hours?: number;
  status?: string;
  priority?: PriorityLevel;
}

export interface AssignmentUpdatePayload {
  title?: string;
  description?: string;
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
