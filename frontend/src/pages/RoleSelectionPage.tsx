import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Alert } from 'antd';
import {
  UserOutlined,
  ReadOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  RightOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthLayout } from '../components/auth/AuthLayout';

export const RoleSelectionPage: React.FC = () => {
  const { assignRole } = useAuth();
  const { themeMode } = useTheme();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<'student' | 'instructor' | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectStudent = async () => {
    setSelectedRole('student');
    setErrorMsg(null);
    setLoading(true);

    try {
      await assignRole({ role: 'student' });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Không thể gán vai trò Sinh viên. Vui lòng thử lại.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setErrorMsg('Vui lòng nhập mã xác thực học viện.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      await assignRole({
        role: 'instructor',
        verification_code: verificationCode.trim(),
      });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Mã xác thực học viện không chính xác.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Chọn Vai Trò Của Bạn"
      subtitle="Để trải nghiệm lộ trình phù hợp nhất, vui lòng chọn vai trò bạn đảm nhận."
      badgeText="Onboarding State"
    >
      <div className="space-y-4">
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert
              type="error"
              message={errorMsg}
              showIcon
              className="rounded-xl"
            />
          </motion.div>
        )}

        {/* Option 1: Student */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            if (!loading) {
              setSelectedRole('student');
              handleSelectStudent();
            }
          }}
          className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
            selectedRole === 'student'
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40'
              : themeMode === 'dark'
              ? 'border-slate-800 bg-slate-900/50 hover:border-indigo-500/50'
              : 'border-slate-200 bg-slate-50/60 hover:border-indigo-300'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
            <UserOutlined className="text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={`font-bold text-base ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Sinh Viên / Học Viên
              </h3>
              {loading && selectedRole === 'student' ? (
                <LoadingOutlined className="text-indigo-600" />
              ) : (
                <RightOutlined className="text-xs text-slate-400" />
              )}
            </div>
            <p className={`text-xs mt-1 leading-relaxed ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Lên kế hoạch học tập cá nhân hóa, theo dõi tiến độ, nhận gợi ý tài liệu AI & phiên tự phản hồi.
            </p>
          </div>
        </motion.div>

        {/* Option 2: Instructor */}
        <motion.div
          whileHover={{ scale: selectedRole === 'instructor' ? 1 : 1.01 }}
          onClick={() => {
            if (!loading) {
              setSelectedRole('instructor');
              setErrorMsg(null);
            }
          }}
          className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-3 ${
            selectedRole === 'instructor'
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40'
              : themeMode === 'dark'
              ? 'border-slate-800 bg-slate-900/50 hover:border-indigo-500/50'
              : 'border-slate-200 bg-slate-50/60 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
              <ReadOutlined className="text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className={`font-bold text-base ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Giảng Viên / Cố Vấn
                </h3>
                <RightOutlined className={`text-xs text-slate-400 transition-transform ${selectedRole === 'instructor' ? 'rotate-90' : ''}`} />
              </div>
              <p className={`text-xs mt-1 leading-relaxed ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Theo dõi tiến độ lớp học, xem phân tích học tập tổng quan & hỗ trợ định hướng cá nhân.
              </p>
            </div>
          </div>

          {/* Form verification code for instructor */}
          {selectedRole === 'instructor' && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              onSubmit={handleVerifyInstructor}
              className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div>
                <label className={`block text-xs font-semibold mb-1 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Mã xác thực học viện (Institution Passcode):
                </label>
                <Input
                  prefix={<KeyOutlined className="text-indigo-500" />}
                  placeholder="Ví dụ: VINUNI-2026-AI"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  size="large"
                  className="rounded-xl"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * Nhập mã do trường cấp (Dùng mã MVP: <span className="font-mono font-semibold text-indigo-500">VINUNI-2026-AI</span>)
                </p>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<CheckCircleOutlined />}
                block
                size="large"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
              >
                Xác Thực & Tiếp Tục
              </Button>
            </motion.form>
          )}
        </motion.div>
      </div>
    </AuthLayout>
  );
};
