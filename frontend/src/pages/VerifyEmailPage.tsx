import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { VoxelRedstone, VoxelEmerald } from '../components/common/MinecraftIcons';

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
      badgeText="SECURITY VERIFICATION"
    >
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

      {success ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-emerald-500/10 border-2 border-minecraft-grassBorder rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-voxel-sm shadow-minecraft-grassBorder">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
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
          )}

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider text-center mb-3 ${
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
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-2xl transition-all outline-none border-2 ${
                    isDark
                      ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-[0_3px_0_0_rgba(0,0,0,0.4)]'
                      : 'bg-white border-amber-900/15 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-[0_3px_0_0_rgba(184,92,0,0.08)]'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || digits.join('').length !== 6}
            className="w-full btn-voxel-green py-3.5 text-base rounded-2xl font-bold tracking-wide shadow-voxel shadow-minecraft-grassBorder active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <span>Hoàn Tất Xác Thực →</span>
            )}
          </button>

          <div className={`flex items-center justify-between text-xs pt-4 border-t-2 ${
            isDark ? 'border-minecraft-obsidianBorder text-slate-400' : 'border-amber-900/10 text-slate-500'
          }`}>
            <span>Chưa nhận được mã?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:text-slate-400 flex items-center gap-1.5 transition-colors"
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
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
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

