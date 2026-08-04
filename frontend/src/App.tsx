import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoleSelectionPage } from './pages/RoleSelectionPage';

const ProtectedDashboardRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-medium text-slate-500">Đang tải...</div>;
  }

  if (isAuthenticated && user && (!user.roles || user.roles.length === 0)) {
    return <Navigate to="/onboarding/role-select" replace />;
  }

  return <>{children}</>;
};

const OnboardingRoleRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-medium text-slate-500">Đang tải...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.roles && user.roles.length > 0) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* 1. Trang chủ chính */}
            <Route path="/" element={<LandingPage />} />
            
            {/* 2. Onboarding Chọn Vai Trò */}
            <Route
              path="/onboarding/role-select"
              element={
                <OnboardingRoleRoute>
                  <RoleSelectionPage />
                </OnboardingRoleRoute>
              }
            />

            {/* 3. Trang Dashboard cá nhân */}
            <Route
              path="/dashboard"
              element={
                <ProtectedDashboardRoute>
                  <DashboardPage />
                </ProtectedDashboardRoute>
              }
            />

            {/* 4. Trang Xác thực tài khoản */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;

