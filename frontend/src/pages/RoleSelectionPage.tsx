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
      navigate('/courses', { replace: true });
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
      navigate('/courses', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Mã xác thực học viện không chính xác.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Chọn vai trò của bạn"
      subtitle="Để trải nghiệm lộ trình phù hợp nhất, vui lòng chọn vai trò bạn đảm nhận."
      badgeText="ONBOARDING ROLE"
    >
      <div className="space-y-4">
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="alert-voxel-red mb-2"
          >
            <span className="font-bold">{errorMsg}</span>
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
              ? 'border-minecraft-grass bg-emerald-50/70 dark:bg-emerald-950/60 shadow-voxel shadow-minecraft-grassBorder'
              : themeMode === 'dark'
              ? 'border-minecraft-obsidianBorder bg-minecraft-obsidianCard hover:border-emerald-500/50 shadow-voxel-sm shadow-black/30'
              : 'border-amber-900/15 bg-white hover:border-emerald-400 shadow-voxel-sm shadow-amber-900/10'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-minecraft-grass text-white flex items-center justify-center shrink-0 shadow-voxel-sm shadow-minecraft-grassBorder border-2 border-minecraft-grassBorder">
            <UserOutlined className="text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={`font-bold text-base ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Sinh Viên / Học Viên
              </h3>
              {loading && selectedRole === 'student' ? (
                <LoadingOutlined className="text-emerald-600" />
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
              ? 'border-minecraft-gold bg-amber-50/70 dark:bg-amber-950/60 shadow-voxel shadow-minecraft-goldBorder'
              : themeMode === 'dark'
              ? 'border-minecraft-obsidianBorder bg-minecraft-obsidianCard hover:border-amber-500/50 shadow-voxel-sm shadow-black/30'
              : 'border-amber-900/15 bg-white hover:border-amber-400 shadow-voxel-sm shadow-amber-900/10'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-minecraft-gold text-slate-900 flex items-center justify-center shrink-0 shadow-voxel-sm shadow-minecraft-goldBorder border-2 border-minecraft-goldBorder">
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
              className="mt-3 pt-3 border-t border-amber-900/10 dark:border-minecraft-obsidianBorder space-y-3"
            >
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Mã xác thực học viện (Institution Passcode):
                </label>
                <div className="relative">
                  <KeyOutlined className="text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ví dụ: VINUNI-2026-AI"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    className="input-voxel uppercase font-mono font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                  * Nhập mã do trường cấp (Dùng mã MVP: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">VINUNI-2026-AI</span>)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-voxel-gold py-3 text-sm rounded-2xl font-bold tracking-wide active:translate-y-1"
              >
                <CheckCircleOutlined />
                <span>Xác Thực & Tiếp Tục</span>
              </button>
            </motion.form>
          )}
        </motion.div>
      </div>
    </AuthLayout>
  );
};
