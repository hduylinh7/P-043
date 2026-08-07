import { api } from './api';
import {
  Goal,
  GoalCreatePayload,
  GoalFilterParams,
  GoalStatus,
  GoalUpdatePayload,
} from '../types/goal';

export const goalService = {
  async getGoals(params?: GoalFilterParams): Promise<Goal[]> {
    const response = await api.get<Goal[]>('/goals', { params });
    return response.data;
  },

  async createGoal(payload: GoalCreatePayload): Promise<Goal> {
    const response = await api.post<Goal>('/goals', payload);
    return response.data;
  },

  async getGoalDetail(id: string): Promise<Goal> {
    const response = await api.get<Goal>(`/goals/${id}`);
    return response.data;
  },

  async updateGoal(id: string, payload: GoalUpdatePayload): Promise<Goal> {
    const response = await api.put<Goal>(`/goals/${id}`, payload);
    return response.data;
  },

  async deleteGoal(id: string): Promise<void> {
    await api.delete(`/goals/${id}`);
  },

  async updateGoalStatus(id: string, status: GoalStatus): Promise<Goal> {
    const response = await api.patch<Goal>(`/goals/${id}/status`, { status });
    return response.data;
  },
};
