import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Eye, EyeOff, Lock, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { VoxelRedstone, VoxelEmerald, VoxelGold } from '../components/common/MinecraftIcons';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const { themeMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError(null);
    setSuccess(null);

    if (!credentialResponse.credential) {
      setError('Không nhận được thông tin xác thực từ Google.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithGoogle({ id_token: credentialResponse.credential });
      setSuccess('Đăng nhập thành công bằng Google! Đang chuyển hướng...');
      setTimeout(() => {
        if (!res.user.roles || res.user.roles.length === 0) {
          navigate('/onboarding/role-select', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }, 800);
    } catch (err: any) {
      console.error('Google Login error:', err);
      const msg =
        err.response?.data?.detail ||
        'Đăng nhập bằng Google thất bại. Vui lòng thử lại sau.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login({ email, password });
      setSuccess('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => {
        if (!res.user.roles || res.user.roles.length === 0) {
          navigate('/onboarding/role-select', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }, 800);

    } catch (err: any) {
      console.error('Login error:', err);
      const msg =
        err.response?.data?.detail ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại Email và Mật khẩu.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = themeMode === 'dark';

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Chào mừng nhà thám hiểm quay trở lại với Lita Learning!"
      badgeText="PLAYER AUTH"
    >
      {/* Error Alert Box */}
      {error && (
        <div className="mb-6 alert-voxel-red animate-fade-in">
          <VoxelRedstone className="shrink-0 mt-0.5" size={22} />
          <div className="flex-1">
            <p className="m-0 leading-relaxed font-bold">{error}</p>
            {error.toLowerCase().includes('chưa được xác thực') && (
              <button
                type="button"
                onClick={() => navigate(`/verify-email?email=${encodeURIComponent(email)}`)}
                className="mt-2 text-xs font-black text-rose-700 dark:text-rose-300 hover:underline block"
              >
                Xác thực email ngay bây giờ →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success Alert Box */}
      {success && (
        <div className="mb-6 alert-voxel-green animate-fade-in">
          <VoxelEmerald className="shrink-0 mt-0.5" size={22} />
          <span className="font-bold">{success}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
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
          <div className="flex items-center justify-between mb-2">
            <label className={`block text-xs font-bold uppercase tracking-wider ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Mật khẩu
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors tracking-wide"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-voxel-green text-base py-3.5 rounded-2xl shadow-voxel shadow-minecraft-grassBorder active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 font-bold tracking-wide"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Đang đăng nhập...</span>
            </>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>Đăng nhập</span>
              <span>→</span>
            </span>
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
            <span>HOẶC ĐĂNG NHẬP BẰNG</span>
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
          onError={() => setError('Đăng nhập bằng Google không thành công')}
          theme={isDark ? 'filled_black' : 'outline'}
          shape="pill"
          text="signin_with"
          useOneTap={false}
          use_fedcm_for_prompt={false}
        />
      </div>

      {/* Footer link to Register */}
      <div className={`mt-7 text-center border-t-2 pt-5 text-sm font-medium ${
        isDark ? 'border-minecraft-obsidianBorder text-slate-400' : 'border-amber-900/10 text-slate-600'
      }`}>
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline tracking-wide">
          Đăng ký ngay
        </Link>
      </div>
    </AuthLayout>
  );
};

