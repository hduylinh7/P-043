export type WeeklyPlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'skipped' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export type TaskSourceType = 'ASSIGNMENT' | 'PERSONAL_TASK' | 'GOAL' | 'MANUAL';

export interface PlanTask {
  id: string;
  weekly_goal_id: string;
  assignment_id?: string | null;
  title: string;
  description?: string | null;
  topic?: string | null;
  what_to_study?: string[] | null;
  what_to_do?: string[] | null;
  reason?: string | null;
  material_id?: string | null;
  material_title?: string | null;
  course_id?: string | null;
  course_name?: string | null;
  goal_id?: string | null;
  goal_title?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  scheduled_date?: string | null;
  start_time?: string | null; // e.g. "19:00"
  end_time?: string | null;   // e.g. "21:00"
  estimated_duration?: number | null; // minutes
  estimated_minutes?: number | null;
  source_type: TaskSourceType;
  source_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlan {
  id: string;
  student_id: string;
  title: string;
  description?: string | null;
  week_start_date: string;
  week_end_date?: string | null;
  status: WeeklyPlanStatus;
  generated_by_agent?: string | null;
  version: number;
  generated_at?: string | null;
  created_at: string;
  updated_at: string;
  tasks: PlanTask[];
}

export interface CreateWeeklyPlanPayload {
  title: string;
  description?: string;
  week_start_date: string;
  week_end_date?: string;
  status?: WeeklyPlanStatus;
}

export interface UpdateWeeklyPlanPayload {
  title?: string;
  description?: string;
  week_start_date?: string;
  week_end_date?: string;
  status?: WeeklyPlanStatus;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  topic?: string;
  what_to_study?: string[];
  what_to_do?: string[];
  reason?: string;
  material_id?: string;
  material_title?: string;
  course_id?: string;
  course_name?: string;
  goal_id?: string;
  goal_title?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  estimated_duration?: number;
  source_type?: TaskSourceType;
  source_id?: string;
  assignment_id?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  topic?: string;
  what_to_study?: string[];
  what_to_do?: string[];
  reason?: string;
  material_id?: string;
  material_title?: string;
  course_id?: string;
  course_name?: string;
  goal_id?: string;
  goal_title?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  estimated_duration?: number;
  source_type?: TaskSourceType;
  source_id?: string;
  assignment_id?: string;
}

export interface PlannerAgentRequestPayload {
  week_start?: string;
  start_date?: string;
  end_date?: string;
  days?: number;
  request?: string;
}

export interface PlannerAgentTaskResult {
  id: string;
  title: string;
  scheduled_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  priority: string;
  source_type: string;
  source_id?: string | null;
}

export interface PlannerAgentResponseResult {
  weekly_plan_id?: string | null;
  week_start: string;
  week_end: string;
  summary: string;
  created_tasks: PlannerAgentTaskResult[];
  updated_tasks: PlannerAgentTaskResult[];
  skipped_items: { title?: string; reason?: string }[];
  warnings: string[];
}

