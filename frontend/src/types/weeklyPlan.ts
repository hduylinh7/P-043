export type WeeklyPlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'skipped' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export type TaskSourceType = 'ASSIGNMENT' | 'PERSONAL_TASK' | 'GOAL' | 'MANUAL';

export type CalendarEventType = 'FIXED_CLASS' | 'AI_STUDY' | 'STUDENT_STUDY';

export interface UnifiedCalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  description?: string | null;
  course_id?: string | null;
  course_code?: string | null;
  course_name?: string | null;
  day_of_week: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  priority: string;
  status: string;
  task_data?: PlanTask | null;
}

export interface TaskReflectionData {
  what_learned?: string;
  understood_well?: string;
  struggling_with?: string;
  understanding_level?: 'not_understood' | 'partially' | 'mostly' | 'fully' | string;
  achieved_goal?: 'yes' | 'partially' | 'no' | string;
}

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
  started_at?: string | null;
  completed_at?: string | null;
  actual_duration?: number | null;
  completed_activities?: string[] | null;
  reflection_data?: TaskReflectionData | null;
  ai_insight?: string | null;
  suggested_next_focus?: string | null;
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
  started_at?: string;
  completed_at?: string;
  actual_duration?: number;
  completed_activities?: string[];
  reflection_data?: TaskReflectionData;
  ai_insight?: string;
  suggested_next_focus?: string;
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
  started_at?: string;
  completed_at?: string;
  actual_duration?: number;
  completed_activities?: string[];
  reflection_data?: TaskReflectionData;
  ai_insight?: string;
  suggested_next_focus?: string;
}

export interface PlannerAgentRequestPayload {
  week_start?: string;
  start_date?: string;
  end_date?: string;
  days?: number;
  assignment_id?: string;
  request?: string;
  user_message?: string;
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

export interface PlannerAssignmentContext {
  id: string;
  title: string;
  description?: string | null;
  course_id?: string | null;
  course_name?: string | null;
  due_date?: string | null;
  priority?: string | null;
  estimated_hours?: number | null;
  status?: string | null;
}

export interface PlannerContext {
  student: { id: string };
  planning_period: { week_start: string; week_end: string };
  goals: any[];
  assignments: PlannerAssignmentContext[];
  course_materials: any[];
  fixed_course_schedules: any[];
  current_weekly_plan?: WeeklyPlan | null;
}

