import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const { verifyEmail, resendVerificationCode } = useAuth();
  const { themeMode } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialEmail = searchParams.get('email') || '';
  const initialCode = searchParams.get('code') || '';

  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isDark = themeMode === 'dark';

  // Initialize from searchParams if present
  useEffect(() => {
    if (initialCode && initialCode.length === 6) {
      setDigits(initialCode.split(''));
      handleVerifyCode(initialEmail, initialCode);
    }
  }, [initialCode, initialEmail]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    // Handle paste
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (targetEmail: string, codeStr: string) => {
    setError(null);
    setMessage(null);

    if (!targetEmail) {
      setError('Vui lòng nhập email.');
      return;
    }

    if (codeStr.length !== 6) {
      setError('Mật mã OTP phải gồm 6 chữ số.');
      return;
    }

    setIsLoading(true);

    try {
      const msg = await verifyEmail({ email: targetEmail, code: codeStr });
      setMessage(msg);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { state: { message: 'Xác thực thành công! Vui lòng đăng nhập.' } });
      }, 1500);
    } catch (err: any) {
      console.error('Verify email error:', err);
      const msg =
        err.response?.data?.detail ||
        'Mã xác thực không chính xác hoặc đã hết hạn. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyCode(email, digits.join(''));
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setError(null);
    setMessage(null);

    if (!email) {
      setError('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    setIsResending(true);

    try {
      const msg = await resendVerificationCode({ email });
      setMessage(msg);
      setCooldown(60);
    } catch (err: any) {
      console.error('Resend code error:', err);
      const msg =
        err.response?.data?.detail || 'Không thể gửi lại mã vào lúc này. Vui lòng thử lại sau.';
      setError(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Xác thực tài khoản"
      subtitle={`Mã OTP 6 chữ số đã được gửi tới email ${email || 'của bạn'}`}
      badgeText="Security Verification"
    >
      {error && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 text-sm animate-fade-in ${
          isDark
            ? 'bg-rose-950/60 border-rose-800/80 text-rose-200'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 text-sm animate-fade-in ${
          isDark
            ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {success ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Tài khoản đã xác thực!
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Đang chuyển hướng sang Đăng nhập...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {!initialEmail && (
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Email tài khoản
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
          )}

          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider text-center mb-3 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Nhập mã OTP (6 chữ số)
            </label>
            <div className="flex justify-center gap-2 sm:gap-2.5">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl transition-all outline-none border ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || digits.join('').length !== 6}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <span>Hoàn tất xác thực</span>
            )}
          </button>

          <div className={`flex items-center justify-between text-xs pt-4 border-t ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
          }`}>
            <span>Chưa nhận được mã?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:text-slate-400 flex items-center gap-1.5 transition-colors"
            >
              {isResending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>
                {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : 'Gửi lại mã xác thực'}
              </span>
            </button>
          </div>

          <div className="text-center pt-1">
            <Link
              to="/login"
              className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại Đăng nhập</span>
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
