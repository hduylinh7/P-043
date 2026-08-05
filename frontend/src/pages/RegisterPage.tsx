import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  AlertCircle,
  Send,
  ShieldCheck,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
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

  // Password strength logic
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-300 dark:bg-slate-700' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score, label: 'Yếu', color: 'bg-indigo-500' };
    if (score <= 3) return { score, label: 'Trung bình', color: 'bg-blue-500' };
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
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
            <Send className="w-8 h-8" />
          </div>

          <p className={`text-sm leading-relaxed mb-6 ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            Hệ thống đã gửi mã OTP xác thực 6 chữ số tới địa chỉ{' '}
            <strong className="text-blue-500">{email}</strong>. Vui lòng kiểm tra hộp thư để hoàn tất xác thực.
          </p>

          <div className={`p-4 rounded-xl border text-xs mb-6 flex items-center gap-2.5 ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-slate-400'
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Mật khẩu của bạn đã được mã hóa an toàn bằng Bcrypt.</span>
          </div>

          <button
            onClick={() => navigate(`/verify-email?email=${encodeURIComponent(email)}`)}
            className="w-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-500 hover:from-blue-300 hover:to-blue-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all"
          >
            Nhập mã OTP xác thực
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Bắt đầu trải nghiệm học tập cùng AI Companion"
    >
      {error && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 text-sm animate-fade-in ${
          isDark
            ? 'bg-indigo-950/60 border-indigo-800/80 text-indigo-200'
            : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Họ và tên
          </label>
          <div className="relative">
            <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              className={`w-full rounded-xl pl-11 pr-4 py-3 text-sm font-medium transition-all outline-none border ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
              }`}
            />
          </div>
        </div>

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
                  ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
              }`}
            />
          </div>
        </div>

        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              required
              className={`w-full rounded-xl pl-11 pr-11 py-3 text-sm font-medium transition-all outline-none border ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
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

          {/* Password strength meter */}
          {password && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Độ mạnh mật khẩu:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{strength.label}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${strength.color} transition-all duration-300`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Xác nhận mật khẩu
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
              className={`w-full rounded-xl pl-11 pr-4 py-3 text-sm font-medium transition-all outline-none border ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
              }`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#eff6ff] hover:bg-[#dbeafe] active:scale-[0.99] text-blue-950 dark:text-blue-900 font-extrabold py-3.5 rounded-xl border border-[#bfdbfe] shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
              <span>Đang khởi tạo tài khoản...</span>
            </>
          ) : (
            <span>Đăng ký</span>
          )}
        </button>
      </form>

      <div className={`mt-8 text-center border-t pt-6 text-sm ${
        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
      }`}>
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-bold text-blue-700 dark:text-blue-400 hover:underline">
          Đăng nhập
        </Link>
      </div>
    </AuthLayout>
  );
};
