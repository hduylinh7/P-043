import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  Loader2,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { VoxelRedstone, VoxelEmerald, VoxelGold } from '../components/common/MinecraftIcons';

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle } = useAuth();
  const { themeMode } = useTheme();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const isDark = themeMode === 'dark';

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError(null);
    if (!credentialResponse.credential) {
      setError('Không nhận được thông tin xác thực từ Google.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithGoogle({ id_token: credentialResponse.credential });
      setTimeout(() => {
        if (!res.user.roles || res.user.roles.length === 0) {
          navigate('/onboarding/role-select', { replace: true });
        } else {
          navigate('/courses', { replace: true });
        }
      }, 500);
    } catch (err: any) {
      console.error('Google Register error:', err);
      const msg =
        err.response?.data?.detail ||
        'Đăng ký bằng Google thất bại. Vui lòng thử lại sau.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength logic
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-300 dark:bg-slate-700' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score, label: 'Yếu', color: 'bg-rose-500' };
    if (score <= 3) return { score, label: 'Trung bình', color: 'bg-amber-500' };
    return { score, label: 'Mạnh', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ các thông tin.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp với mật khẩu đã nhập.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        full_name: fullName,
        email,
        password,
      });
      setSuccess(true);
    } catch (err: any) {
      console.error('Register error:', err);
      const msg =
        err.response?.data?.detail ||
        'Đăng ký thất bại. Email có thể đã tồn tại trong hệ thống.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Đăng ký thành công!"
        subtitle="Vui lòng kiểm tra hộp thư email của bạn"
        badgeText="QUEST COMPLETED"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500/10 border-2 border-minecraft-grassBorder rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-voxel-sm shadow-minecraft-grassBorder">
            <Send className="w-8 h-8 text-emerald-500" />
          </div>

          <p className={`text-sm leading-relaxed mb-6 ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            Hệ thống đã gửi mã OTP xác thực 6 chữ số tới địa chỉ{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{email}</strong>. Vui lòng kiểm tra hộp thư để hoàn tất xác thực.
          </p>

          <div className={`p-4 rounded-2xl border-2 text-xs mb-6 flex items-center gap-2.5 ${
            isDark
              ? 'bg-slate-950 border-minecraft-obsidianBorder text-slate-400'
              : 'bg-amber-50/50 border-amber-900/15 text-slate-600'
          }`}>
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Mật khẩu của bạn đã được mã hóa an toàn bằng Bcrypt.</span>
          </div>

          <button
            onClick={() => navigate(`/verify-email?email=${encodeURIComponent(email)}`)}
            className="w-full btn-voxel-green py-3.5 text-base rounded-2xl font-bold tracking-wide"
          >
            Nhập mã OTP xác thực →
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Đăng ký tài khoản"
      subtitle="Bắt đầu hành trình thám hiểm tri thức cùng AI Companion"
      badgeText="NEW PLAYER"
    >
      {error && (
        <div className="mb-6 alert-voxel-red animate-fade-in">
          <VoxelRedstone className="shrink-0 mt-0.5" size={22} />
          <span className="font-bold">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Họ và tên
          </label>
          <div className="relative">
            <UserIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              className="input-voxel"
            />
          </div>
        </div>

        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Địa chỉ Email
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

        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {/* Password strength meter */}
          {password && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Độ mạnh mật khẩu:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{strength.label}</span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
                <div
                  className={`h-full ${strength.color} transition-all duration-300`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Xác nhận mật khẩu
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
              className="input-voxel"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-voxel-green text-base py-3.5 rounded-2xl shadow-voxel shadow-minecraft-grassBorder active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 font-bold tracking-wide"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Đang khởi tạo tài khoản...</span>
            </>
          ) : (
            <span>Đăng ký tài khoản</span>
          )}
        </button>
      </form>

      {/* Minecraft Voxel Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className={`w-full border-t-2 ${isDark ? 'border-minecraft-obsidianBorder' : 'border-amber-900/15'}`}></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className={`px-3 font-extrabold flex items-center gap-1.5 ${
            isDark ? 'bg-[#162218] text-slate-400' : 'bg-white text-slate-500'
          }`}>
            <VoxelGold size={14} />
            <span>HOẶC ĐĂNG KÝ BẰNG</span>
          </span>
        </div>
      </div>

      {/* Google Login Button Container */}
      <div className={`p-2 rounded-2xl border-2 transition-all flex justify-center ${
        isDark
          ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder shadow-voxel-sm shadow-black/30 hover:border-emerald-500/50'
          : 'bg-white border-amber-900/15 shadow-voxel-sm shadow-amber-900/10 hover:border-emerald-500/50'
      }`}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Đăng ký bằng Google không thành công')}
          theme={isDark ? 'filled_black' : 'outline'}
          shape="pill"
          text="signup_with"
          useOneTap={false}
          use_fedcm_for_prompt={false}
        />
      </div>

      {/* Footer link to Login */}
      <div className={`mt-7 text-center border-t-2 pt-5 text-sm font-medium ${
        isDark ? 'border-minecraft-obsidianBorder text-slate-400' : 'border-amber-900/10 text-slate-600'
      }`}>
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline tracking-wide">
          Đăng nhập
        </Link>
      </div>
    </AuthLayout>
  );
};

