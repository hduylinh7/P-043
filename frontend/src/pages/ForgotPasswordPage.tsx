import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword, verifyResetCode, resetPassword } = useAuth();
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

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className={`w-8 h-2 rounded-full transition-all ${
              step >= 1 ? 'bg-indigo-500' : 'bg-slate-800'
            }`}
          ></div>
          <div
            className={`w-8 h-2 rounded-full transition-all ${
              step >= 2 ? 'bg-indigo-500' : 'bg-slate-800'
            }`}
          ></div>
          <div
            className={`w-8 h-2 rounded-full transition-all ${
              step >= 3 ? 'bg-indigo-500' : 'bg-slate-800'
            }`}
          ></div>
        </div>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {step === 1 && 'Quên mật khẩu?'}
            {step === 2 && 'Xác thực mã OTP'}
            {step === 3 && 'Tạo mật khẩu mới'}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {step === 1 && 'Bước 1/3: Nhập email tài khoản của bạn để nhận mã OTP.'}
            {step === 2 && `Bước 2/3: Nhập mã OTP 6 chữ số đã gửi tới ${email}.`}
            {step === 3 && 'Bước 3/3: Nhập mật khẩu mới an toàn cho tài khoản.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start gap-3 text-rose-200 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-start gap-3 text-emerald-200 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email tài khoản
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-11 pr-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang gửi mã OTP...</span>
                </>
              ) : (
                <span>Gửi mã OTP đặt lại</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
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
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Mã OTP (6 chữ số)
              </label>
              <div className="relative">
                <ShieldCheck className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-11 pr-4 py-2.5 text-slate-100 tracking-widest text-center text-lg font-bold placeholder-slate-600 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang xác thực OTP...</span>
                </>
              ) : (
                <span>Xác nhận mã OTP</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="hover:text-slate-200 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Nhập lại email</span>
              </button>
              <button
                type="button"
                onClick={handleStep1Submit}
                disabled={isLoading}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
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
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-11 pr-11 py-2.5 text-slate-100 text-sm placeholder-slate-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-11 pr-4 py-2.5 text-slate-100 text-sm placeholder-slate-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !newPassword || newPassword !== confirmPassword}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang đổi mật khẩu...</span>
                </>
              ) : (
                <span>Đổi mật khẩu & Đăng nhập</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
