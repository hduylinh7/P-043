import { api } from './api';
import {
  PersonalTask,
  PersonalTaskCreatePayload,
  PersonalTaskFilterParams,
  PersonalTaskUpdatePayload,
  TaskStatus,
} from '../types/personalTask';

export const personalTaskService = {
  async getPersonalTasks(params?: PersonalTaskFilterParams): Promise<PersonalTask[]> {
    const response = await api.get<PersonalTask[]>('/personal-tasks', { params });
    return response.data;
  },

  async createPersonalTask(payload: PersonalTaskCreatePayload): Promise<PersonalTask> {
    const response = await api.post<PersonalTask>('/personal-tasks', payload);
    return response.data;
  },

  async getPersonalTaskDetail(id: string): Promise<PersonalTask> {
    const response = await api.get<PersonalTask>(`/personal-tasks/${id}`);
    return response.data;
  },

  async updatePersonalTask(id: string, payload: PersonalTaskUpdatePayload): Promise<PersonalTask> {
    const response = await api.put<PersonalTask>(`/personal-tasks/${id}`, payload);
    return response.data;
  },

  async deletePersonalTask(id: string): Promise<void> {
    await api.delete(`/personal-tasks/${id}`);
  },

  async updateTaskStatus(id: string, status: TaskStatus): Promise<PersonalTask> {
    const response = await api.patch<PersonalTask>(`/personal-tasks/${id}/status`, { status });
    return response.data;
  },
};
