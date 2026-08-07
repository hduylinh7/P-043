export type GoalCategory = 'LEARNING' | 'CAREER' | 'PERSONAL' | 'HEALTH' | 'OTHER';
export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface Goal {
  id: string;
  student_id: string;
  title: string;
  description?: string | null;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;
  target_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalCreatePayload {
  title: string;
  description?: string;
  category?: GoalCategory;
  priority?: GoalPriority;
  target_date?: string;
}

export interface GoalUpdatePayload {
  title?: string;
  description?: string;
  category?: GoalCategory;
  priority?: GoalPriority;
  status?: GoalStatus;
  target_date?: string;
}

export interface GoalStatusUpdatePayload {
  status: GoalStatus;
}

export interface GoalFilterParams {
  status?: string;
  priority?: string;
  category?: string;
  sort_by?: string;
}
