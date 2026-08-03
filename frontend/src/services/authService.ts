import { api } from './api';
import {
  ApiMessageResponse,
  AuthTokens,
  ForgotPasswordPayload,
  GoogleAuthPayload,
  LoginPayload,
  RegisterPayload,
  ResendVerificationPayload,
  ResetPasswordPayload,
  User,
  VerifyEmailPayload,
  VerifyResetCodePayload,
} from '../types/auth';

export const authService = {
  async loginWithGoogle(payload: GoogleAuthPayload): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>('/auth/google', payload);
    return response.data;
  },

  async register(payload: RegisterPayload): Promise<User> {
    const response = await api.post<User>('/auth/register', payload);
    return response.data;
  },

  async verifyEmail(payload: VerifyEmailPayload): Promise<ApiMessageResponse> {
    const response = await api.post<ApiMessageResponse>('/auth/verify-email', payload);
    return response.data;
  },

  async resendVerificationCode(payload: ResendVerificationPayload): Promise<ApiMessageResponse> {
    const response = await api.post<ApiMessageResponse>('/auth/resend-verification-code', payload);
    return response.data;
  },

  async login(payload: LoginPayload): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>('/auth/login', payload);
    return response.data;
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<ApiMessageResponse> {
    const response = await api.post<ApiMessageResponse>('/auth/forgot-password', payload);
    return response.data;
  },

  async verifyResetCode(payload: VerifyResetCodePayload): Promise<ApiMessageResponse> {
    const response = await api.post<ApiMessageResponse>('/auth/verify-reset-code', payload);
    return response.data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<ApiMessageResponse> {
    const response = await api.post<ApiMessageResponse>('/auth/reset-password', payload);
    return response.data;
  },

  async logout(): Promise<ApiMessageResponse> {
    const response = await api.post<ApiMessageResponse>('/auth/logout');
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};
