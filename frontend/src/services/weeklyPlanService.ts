import { api } from './api';
import {
  CreateTaskPayload,
  CreateWeeklyPlanPayload,
  PlanTask,
  PlannerAgentRequestPayload,
  PlannerAgentResponseResult,
  TaskReflectionData,
  TaskStatus,
  UnifiedCalendarEvent,
  UpdateTaskPayload,
  UpdateWeeklyPlanPayload,
  WeeklyPlan,
} from '../types/weeklyPlan';

export const weeklyPlanService = {
  async getWeeklyPlans(): Promise<WeeklyPlan[]> {
    const response = await api.get<WeeklyPlan[]>('/weekly-plans');
    return response.data;
  },

  async getWeeklyPlanDetail(id: string): Promise<WeeklyPlan> {
    const response = await api.get<WeeklyPlan>(`/weekly-plans/${id}`);
    return response.data;
  },

  async createWeeklyPlan(payload: CreateWeeklyPlanPayload): Promise<WeeklyPlan> {
    const response = await api.post<WeeklyPlan>('/weekly-plans', payload);
    return response.data;
  },

  async updateWeeklyPlan(id: string, payload: UpdateWeeklyPlanPayload): Promise<WeeklyPlan> {
    const response = await api.put<WeeklyPlan>(`/weekly-plans/${id}`, payload);
    return response.data;
  },

  async deleteWeeklyPlan(id: string): Promise<void> {
    await api.delete(`/weekly-plans/${id}`);
  },

  async getWeeklyPlanTasks(planId: string): Promise<PlanTask[]> {
    const response = await api.get<PlanTask[]>(`/weekly-plans/${planId}/tasks`);
    return response.data;
  },

  async createTask(planId: string, payload: CreateTaskPayload): Promise<PlanTask> {
    const response = await api.post<PlanTask>(`/weekly-plans/${planId}/tasks`, payload);
    return response.data;
  },

  async getTaskById(taskId: string): Promise<PlanTask> {
    const response = await api.get<PlanTask>(`/tasks/${taskId}`);
    return response.data;
  },

  async updateTask(taskId: string, payload: UpdateTaskPayload): Promise<PlanTask> {
    const response = await api.put<PlanTask>(`/tasks/${taskId}`, payload);
    return response.data;
  },

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<PlanTask> {
    const response = await api.patch<PlanTask>(`/tasks/${taskId}/status`, { status });
    return response.data;
  },

  async startStudySession(taskId: string): Promise<PlanTask> {
    const response = await api.patch<PlanTask>(`/tasks/${taskId}/status`, { status: 'in_progress' });
    return response.data;
  },

  async completeStudySession(taskId: string, payload?: Partial<UpdateTaskPayload>): Promise<PlanTask> {
    const updatePayload: UpdateTaskPayload = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      ...payload,
    };
    const response = await api.put<PlanTask>(`/tasks/${taskId}`, updatePayload);
    return response.data;
  },

  async updateTaskChecklist(taskId: string, completedActivities: string[]): Promise<PlanTask> {
    const response = await api.put<PlanTask>(`/tasks/${taskId}`, {
      completed_activities: completedActivities,
    });
    return response.data;
  },

  async saveTaskReflection(taskId: string, reflectionData: TaskReflectionData): Promise<PlanTask> {
    const response = await api.post<PlanTask>(`/tasks/${taskId}/reflection`, reflectionData);
    return response.data;
  },

  async generateAIPlan(payload: PlannerAgentRequestPayload): Promise<PlannerAgentResponseResult> {
    const response = await api.post<PlannerAgentResponseResult>('/planner/generate', payload);
    return response.data;
  },

  async getUnifiedCalendar(weekStart?: string): Promise<UnifiedCalendarEvent[]> {
    const response = await api.get<UnifiedCalendarEvent[]>('/weekly-plans/unified-calendar', {
      params: { week_start: weekStart },
    });
    return response.data;
  },
};

