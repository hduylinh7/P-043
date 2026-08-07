import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export interface Citation {
  file_name: string;
  material_id: string;
  chunk_index: number;
  score: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  sources?: string[];
  analysis?: string;
}

export interface ChatSession {
  id: string;
  user_id?: string;
  course_id?: string;
  title: string;
  created_at?: string;
}

export interface ChatResponse {
  session_id: string;
  response: string;
  analysis?: string;
  citations?: Citation[];
  sources?: string[];
}

export interface SystemStatus {
  status: string;
  agent: string;
  redis_connected: boolean;
}

export interface ApiClientInstance extends AxiosInstance {
  checkStatus: () => Promise<SystemStatus>;
  getSessions: (userId?: string) => Promise<ChatSession[]>;
  getMessages: (sessionId: string) => Promise<ChatMessage[]>;
  sendMessage: (message: string, sessionId?: string, userId?: string, courseId?: string) => Promise<ChatResponse>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const instance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto Refresh Token on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return instance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: new_refresh_token } = response.data;

        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', new_refresh_token);

        instance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        processQueue(null, access_token);
        return instance(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const api = instance as ApiClientInstance;

// Attach chat helper methods to api instance
api.checkStatus = async () => {
  const res = await api.get<SystemStatus>('/status');
  return res.data;
};

api.getSessions = async (userId = 'default_user') => {
  const res = await api.get<ChatSession[]>('/sessions', { params: { user_id: userId } });
  return res.data;
};

api.getMessages = async (sessionId: string) => {
  const res = await api.get<ChatMessage[]>(`/sessions/${sessionId}/messages`);
  return res.data;
};

api.sendMessage = async (message: string, sessionId?: string, userId = 'default_user', courseId?: string) => {
  const res = await api.post<ChatResponse>('/chat', {
    message,
    session_id: sessionId,
    user_id: userId,
    course_id: courseId,
  });
  return res.data;
};

