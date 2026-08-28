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
import { CoursesPage } from './pages/CoursesPage';
import { TimetablePage } from './pages/TimetablePage';
import { LearningCalendarPage } from './pages/LearningCalendarPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { MaterialViewerPage } from './pages/MaterialViewerPage';
import { AIChatPage } from './pages/AIChatPage';
import { GoalsPage } from './pages/GoalsPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { AssignmentDetailPage } from './pages/AssignmentDetailPage';
import { WeeklyPlanPage } from './pages/WeeklyPlanPage';
import { StudySessionWorkspacePage } from './pages/StudySessionWorkspacePage';
import { ProfilePage } from './pages/ProfilePage';

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
    return <Navigate to="/courses" replace />;
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

            {/* 3. Chuyển hướng Dashboard sang Khóa học */}
            <Route
              path="/dashboard"
              element={<Navigate to="/courses" replace />}
            />

            {/* 4. Quản lý khóa học & Thời khóa biểu */}
            <Route
              path="/courses"
              element={
                <ProtectedDashboardRoute>
                  <CoursesPage />
                </ProtectedDashboardRoute>
              }
            />
            <Route
              path="/assignments"
              element={
                <ProtectedDashboardRoute>
                  <AssignmentsPage />
                </ProtectedDashboardRoute>
              }
            />
            <Route
              path="/assignments/:assignmentId"
              element={
                <ProtectedDashboardRoute>
                  <AssignmentDetailPage />
                </ProtectedDashboardRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedDashboardRoute>
                  <LearningCalendarPage />
                </ProtectedDashboardRoute>
              }
            />
            <Route path="/timetable" element={<Navigate to="/calendar" replace />} />
            <Route path="/weekly-plan" element={<Navigate to="/calendar" replace />} />
            <Route
              path="/courses/:courseId"
              element={
                <ProtectedDashboardRoute>
                  <CourseDetailPage />
                </ProtectedDashboardRoute>
              }
            />
            <Route
              path="/courses/:courseId/materials/:materialId"
              element={
                <ProtectedDashboardRoute>
                  <MaterialViewerPage />
                </ProtectedDashboardRoute>
              }
            />
            <Route
              path="/ai-chat"
              element={
                <ProtectedDashboardRoute>
                  <AIChatPage />
                </ProtectedDashboardRoute>
              }
            />
            <Route
              path="/weekly-plan"
              element={
                <ProtectedDashboardRoute>
                  <WeeklyPlanPage />
                </ProtectedDashboardRoute>
              }
            />
            <Route
              path="/study-session/:taskId"
              element={
                <ProtectedDashboardRoute>
                  <StudySessionWorkspacePage />
                </ProtectedDashboardRoute>
              }
            />

            <Route
              path="/goals"
              element={
                <ProtectedDashboardRoute>
                  <GoalsPage />
                </ProtectedDashboardRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedDashboardRoute>
                  <ProfilePage />
                </ProtectedDashboardRoute>
              }
            />

            {/* 5. Trang Xác thực tài khoản */}
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
