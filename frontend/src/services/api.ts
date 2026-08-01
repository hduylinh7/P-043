import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatResponse {
  session_id: string;
  response: string;
  analysis: string;
}

export const api = {
  async sendMessage(message: string, sessionId?: string, userId: string = 'default_user'): Promise<ChatResponse> {
    const res = await axios.post<ChatResponse>(`${API_BASE_URL}/api/v1/chat`, {
      message,
      session_id: sessionId,
      user_id: userId,
    });
    return res.data;
  },

  async getSessions(userId: string = 'default_user'): Promise<ChatSession[]> {
    const res = await axios.get<ChatSession[]>(`${API_BASE_URL}/api/v1/sessions`, {
      params: { user_id: userId },
    });
    return res.data;
  },

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const res = await axios.get<ChatMessage[]>(`${API_BASE_URL}/api/v1/sessions/${sessionId}/messages`);
    return res.data;
  },

  async checkStatus(): Promise<{ status: string; agent: string; redis_connected: boolean }> {
    const res = await axios.get(`${API_BASE_URL}/api/v1/status`);
    return res.data;
  },
};
