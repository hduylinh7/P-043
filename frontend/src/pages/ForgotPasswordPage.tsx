import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { VoxelRedstone, VoxelEmerald } from '../components/common/MinecraftIcons';

export const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword, verifyResetCode, resetPassword } = useAuth();
  const { themeMode } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isDark = themeMode === 'dark';

  // Step 1: Submit email to request OTP
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email) {
      setError('Vui lòng nhập email.');
      return;
    }

    setIsLoading(true);

    try {
      const msg = await forgotPassword({ email });
      setMessage(msg);
      setStep(2);
    } catch (err: any) {
      console.error('Forgot password Step 1 error:', err);
      const msg =
        err.response?.data?.detail || 'Có lỗi xảy ra khi yêu cầu đặt lại mật khẩu.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP code
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!code || code.trim().length !== 6) {
      setError('Mật mã OTP phải gồm đúng 6 chữ số.');
      return;
    }

    setIsLoading(true);

    try {
      const tokenOrDetails = await verifyResetCode({ email, code: code.trim() });
      setResetToken(tokenOrDetails || code.trim());
      setMessage('Mã OTP hợp lệ. Vui lòng nhập mật khẩu mới.');
      setStep(3);
    } catch (err: any) {
      console.error('Forgot password Step 2 error:', err);
      const msg =
        err.response?.data?.detail || 'Mã OTP không hợp lệ hoặc đã hết hạn.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Set new password
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);

    try {
      const msg = await resetPassword({
        email,
        code: resetToken || code.trim(),
        new_password: newPassword,
      });
      setMessage(msg);
      setTimeout(() => {
        navigate('/login', { state: { message: 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.' } });
      }, 1500);
    } catch (err: any) {
      console.error('Forgot password Step 3 error:', err);
      const msg =
        err.response?.data?.detail || 'Không thể cập nhật mật khẩu. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const titles = {
    1: 'Quên mật khẩu?',
    2: 'Xác thực mã OTP',
    3: 'Tạo mật khẩu mới',
  };

  const subtitles = {
    1: 'Bước 1/3: Nhập email tài khoản của bạn để nhận mã OTP.',
    2: `Bước 2/3: Nhập mã OTP 6 chữ số đã gửi tới ${email}.`,
    3: 'Bước 3/3: Nhập mật khẩu mới an toàn cho tài khoản.',
  };

  return (
    <AuthLayout
      title={titles[step]}
      subtitle={subtitles[step]}
      badgeText={`RECOVERY • STEP ${step}/3`}
    >
      {/* Voxel Step Indicator Bar */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full border border-minecraft-grassBorder/40 transition-all duration-300 ${
              step >= s ? 'bg-minecraft-grass shadow-voxel-sm shadow-minecraft-grassBorder/30' : isDark ? 'bg-minecraft-obsidianBorder' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="mb-6 alert-voxel-red animate-fade-in">
          <VoxelRedstone className="shrink-0 mt-0.5" size={22} />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-6 alert-voxel-green animate-fade-in">
          <VoxelEmerald className="shrink-0 mt-0.5" size={22} />
          <span className="font-bold">{message}</span>
        </div>
      )}

      {/* STEP 1: Enter Email */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-5">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Email tài khoản
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="input-voxel"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-voxel-green py-3.5 text-base rounded-2xl font-bold tracking-wide shadow-voxel shadow-minecraft-grassBorder active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Đang gửi mã OTP...</span>
              </>
            ) : (
              <span>Gửi Mã OTP Đặt Lại →</span>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại Đăng nhập</span>
            </Link>
          </div>
        </form>
      )}

      {/* STEP 2: Enter OTP */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="space-y-5">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Mã OTP (6 chữ số)
            </label>
            <div className="relative">
              <ShieldCheck className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                className="input-voxel tracking-widest text-center text-xl font-bold font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full btn-voxel-green py-3.5 text-base rounded-2xl font-bold tracking-wide shadow-voxel shadow-minecraft-grassBorder active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Đang xác thực OTP...</span>
              </>
            ) : (
              <span>Xác Nhận Mã OTP →</span>
            )}
          </button>

          <div className="flex items-center justify-between text-xs pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Nhập lại email</span>
            </button>
            <button
              type="button"
              onClick={handleStep1Submit}
              disabled={isLoading}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
            >
              Gửi lại OTP
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Enter New Password */}
      {step === 3 && (
        <form onSubmit={handleStep3Submit} className="space-y-4">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Mật khẩu mới
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                required
                className="input-voxel pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                className="input-voxel"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !newPassword || newPassword !== confirmPassword}
            className="w-full btn-voxel-green py-3.5 text-base rounded-2xl font-bold tracking-wide shadow-voxel shadow-minecraft-grassBorder active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-3"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Đang đổi mật khẩu...</span>
              </>
            ) : (
              <span>Đổi Mật Khẩu & Đăng Nhập</span>
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
};

