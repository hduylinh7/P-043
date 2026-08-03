import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

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
      await loginWithGoogle({ id_token: credentialResponse.credential });
      setSuccess('Đăng nhập thành công bằng Google! Đang chuyển hướng...');
      setTimeout(() => {
        navigate(from, { replace: true });
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
      await login({ email, password });
      setSuccess('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => {
        navigate(from, { replace: true });
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
      subtitle="Chào mừng quay trở lại với Lita Learning"
      badgeText="AI Powered Study Portal"
    >
      {/* Error Alert */}
      {error && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 text-sm animate-fade-in ${
          isDark
            ? 'bg-rose-950/60 border-rose-800/80 text-rose-200'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="m-0 leading-relaxed font-medium">{error}</p>
            {error.toLowerCase().includes('chưa được xác thực') && (
              <button
                type="button"
                onClick={() => navigate(`/verify-email?email=${encodeURIComponent(email)}`)}
                className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline block"
              >
                Xác thực email ngay bây giờ →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 text-sm animate-fade-in ${
          isDark
            ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Email
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className={`w-full rounded-xl pl-11 pr-4 py-3 text-sm font-medium transition-all outline-none border ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Mật khẩu
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full rounded-xl pl-11 pr-11 py-3 text-sm font-medium transition-all outline-none border ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
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
          className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <span>Đăng nhập</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className={`w-full border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className={`px-3 font-semibold ${
            isDark ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'
          }`}>
            Hoặc đăng nhập bằng
          </span>
        </div>
      </div>

      {/* Google Login Button */}
      <div className="flex justify-center w-full">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Đăng nhập bằng Google không thành công')}
          theme={isDark ? 'filled_black' : 'outline'}
          shape="pill"
          text="signin_with"
        />
      </div>

      <div className={`mt-8 text-center border-t pt-6 text-sm ${
        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
      }`}>
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
          Đăng ký ngay
        </Link>
      </div>
    </AuthLayout>
  );
};
