export type TaskCategory = 'STUDY' | 'CAREER' | 'PERSONAL' | 'HEALTH' | 'MEETING' | 'OTHER';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface PersonalTask {
  id: string;
  student_id: string;
  title: string;
  description?: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  estimated_hours?: number | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalTaskCreatePayload {
  title: string;
  description?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  status?: TaskStatus;
  estimated_hours?: number;
  due_date?: string;
}

export interface PersonalTaskUpdatePayload {
  title?: string;
  description?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  status?: TaskStatus;
  estimated_hours?: number;
  due_date?: string;
}

export interface PersonalTaskStatusUpdatePayload {
  status: TaskStatus;
}

export interface PersonalTaskFilterParams {
  status?: string;
  priority?: string;
  category?: string;
  sort_by?: string;
}
