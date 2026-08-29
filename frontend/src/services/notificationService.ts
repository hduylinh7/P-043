import { api } from './api';

export interface NotificationPayload {
  title: string;
  message: string;
  link: string;
  dedup_key: string;
  entity_type: string;
  entity_id: string;
  milestone?: string;
  is_read?: boolean;
}

export interface AppNotification {
  id: string;
  student_id: string;
  task_id?: string | null;
  notification_type: string;
  scheduled_at: string;
  is_sent: boolean;
  sent_at?: string | null;
  payload?: NotificationPayload | null;
  created_at?: string | null;
}

export const notificationService = {
  async getNotifications(limit = 50): Promise<AppNotification[]> {
    const res = await api.get<AppNotification[]>('/notifications', {
      params: { limit },
    });
    return res.data;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  },

  async deleteAllNotifications(): Promise<void> {
    await api.delete('/notifications');
  },
};
