import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import {
  AuthTokens,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResendVerificationPayload,
  ResetPasswordPayload,
  User,
  VerifyEmailPayload,
  VerifyResetCodePayload,
} from '../types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthTokens>;
  register: (payload: RegisterPayload) => Promise<User>;
  verifyEmail: (payload: VerifyEmailPayload) => Promise<string>;
  resendVerificationCode: (payload: ResendVerificationPayload) => Promise<string>;
  logout: () => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<string>;
  verifyResetCode: (payload: VerifyResetCodePayload) => Promise<string>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const currentUser = await authService.getMe();
        setUser(currentUser);
      } catch (err) {
        console.error('Failed to restore auth session:', err);
        localStorage.clear();
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (payload: LoginPayload): Promise<AuthTokens> => {
    const data = await authService.login(payload);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
    return data;
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    const newUser = await authService.register(payload);
    return newUser;
  };

  const verifyEmail = async (payload: VerifyEmailPayload): Promise<string> => {
    const res = await authService.verifyEmail(payload);
    return res.message;
  };

  const resendVerificationCode = async (payload: ResendVerificationPayload): Promise<string> => {
    const res = await authService.resendVerificationCode(payload);
    return res.message;
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Logout API warning:', e);
    } finally {
      localStorage.clear();
      setUser(null);
    }
  };

  const forgotPassword = async (payload: ForgotPasswordPayload): Promise<string> => {
    const res = await authService.forgotPassword(payload);
    return res.message;
  };

  const verifyResetCode = async (payload: VerifyResetCodePayload): Promise<string> => {
    const res = await authService.verifyResetCode(payload);
    return res.details || res.message;
  };

  const resetPassword = async (payload: ResetPasswordPayload): Promise<string> => {
    const res = await authService.resetPassword(payload);
    return res.message;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        verifyEmail,
        resendVerificationCode,
        logout,
        forgotPassword,
        verifyResetCode,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
