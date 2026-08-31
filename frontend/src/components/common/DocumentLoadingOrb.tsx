import React, { useEffect, useState } from 'react';
import { FileTextOutlined, BookOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface DocumentLoadingOrbProps {
  isLoading?: boolean;
  documentTitle?: string | null;
  className?: string;
}

export const DocumentLoadingOrb: React.FC<DocumentLoadingOrbProps> = ({
  isLoading = true,
  documentTitle,
  className = '',
}) => {
  const [percent, setPercent] = useState<number>(15);
  const [statusText, setStatusText] = useState<string>('Đang kết nối tập tin tài liệu bài giảng...');
  const [stepIndex, setStepIndex] = useState<number>(0);

  const steps = [
    { threshold: 0, text: 'Đang kết nối tập tin tài liệu bài giảng...', icon: <BookOutlined className="text-sky-400" /> },
    { threshold: 35, text: 'Đang phân tích và xử lý nội dung văn bản...', icon: <FileTextOutlined className="text-teal-400" /> },
    { threshold: 75, text: 'Đang dựng giao diện hiển thị tài liệu...', icon: <EyeOutlined className="text-emerald-400" /> },
    { threshold: 92, text: 'Tài liệu đã sẵn sàng để đọc...', icon: <CheckCircleOutlined className="text-emerald-400" /> },
  ];

  useEffect(() => {
    if (!isLoading) {
      setPercent(100);
      return;
    }

    setPercent(12);
    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 94) {
          return Math.min(prev + 0.3, 96);
        }
        if (prev < 45) {
          return prev + Math.random() * 5 + 3;
        }
        if (prev < 80) {
          return prev + Math.random() * 3 + 1.5;
        }
        return prev + Math.random() * 1.5 + 0.5;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const currentStep = [...steps].reverse().find((s) => percent >= s.threshold) || steps[0];
    setStatusText(currentStep.text);
    const idx = steps.findIndex((s) => s.text === currentStep.text);
    if (idx !== -1) setStepIndex(idx);
  }, [percent]);

  const displayPercent = Math.min(100, Math.floor(percent));

  return (
    <div className={`w-full max-w-lg mx-auto p-8 rounded-3xl border-2 border-sky-500/30 bg-gradient-to-b from-white/95 via-sky-50/40 to-white/95 dark:from-minecraft-obsidianCard/95 dark:via-slate-900/90 dark:to-minecraft-obsidianCard/95 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${className}`}>
      {/* Background glowing aura */}
      <div className="absolute -top-16 -left-16 w-40 h-40 bg-sky-500/15 dark:bg-sky-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-teal-500/15 dark:bg-teal-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Top Header Badge */}
      <div className="flex items-center gap-2 mb-5 z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 shadow-xs">
          <BookOutlined className="animate-bounce" /> Trình Đọc Tài Liệu Bài Giảng
        </span>
        {documentTitle && (
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
            {documentTitle}
          </span>
        )}
      </div>

      {/* 🔮 3D Glowing Animated Document Orb Sphere */}
      <div className="relative w-36 h-36 my-2 flex items-center justify-center select-none z-10">
        {/* Outer Orbiting Ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-sky-400/50 dark:border-sky-400/70 animate-spin"
          style={{ animationDuration: '12s' }}
        />

        {/* Counter-rotating Secondary Ring */}
        <div
          className="absolute inset-2 rounded-full border-2 border-dotted border-teal-400/60 dark:border-teal-300/60 animate-spin"
          style={{ animationDuration: '8s', animationDirection: 'reverse' }}
        />

        {/* Pulsing Outer Glow Aura */}
        <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-sky-500/30 via-teal-400/25 to-cyan-400/30 blur-md animate-pulse" />

        {/* The 3D Glassmorphic Orb Ball */}
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-sky-400 via-teal-500 to-indigo-600 dark:from-sky-500 dark:via-teal-600 dark:to-indigo-700 shadow-[0_0_35px_rgba(14,165,233,0.5)] border-2 border-white/70 dark:border-sky-300/50 flex flex-col items-center justify-center text-white overflow-hidden">
          
          {/* Inner Light Reflection (Glossy sphere highlight) */}
          <div className="absolute top-1 left-2 w-12 h-6 bg-white/45 rounded-full blur-[1px] rotate-[-25deg] pointer-events-none" />
          <div className="absolute bottom-1 right-2 w-10 h-5 bg-teal-200/30 rounded-full blur-[2px] pointer-events-none" />

          {/* Liquid Wave Animation Level inside Sphere */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-sky-800/40 dark:bg-sky-950/60 transition-all duration-300"
            style={{ height: `${displayPercent}%` }}
          />

          {/* Floating Percentage Number */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-baseline">
              <span className="text-2xl font-black font-mono tracking-tight drop-shadow-md">
                {displayPercent}
              </span>
              <span className="text-sm font-extrabold text-sky-100 ml-0.5">%</span>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-sky-100/90 mt-0.5">
              ĐANG TẢI FILE
            </span>
          </div>

          {/* Sparkle Particles inside Orb */}
          <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          <div className="absolute bottom-4 left-4 w-1 h-1 bg-white/80 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Dynamic Status Text */}
      <div className="mt-5 text-center space-y-2 z-10 w-full px-4">
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 min-h-[22px]">
          <span className="text-base">{steps[stepIndex]?.icon}</span>
          <span className="transition-all duration-300">{statusText}</span>
        </div>

        {/* Progress Bar with Glow */}
        <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2 overflow-hidden p-0.5 border border-slate-300/60 dark:border-slate-700 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(56,189,248,0.8)] relative"
            style={{ width: `${displayPercent}%` }}
          >
            {/* Shimmer light effect */}
            <div className="absolute inset-0 bg-white/25 animate-pulse rounded-full" />
          </div>
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-2.5 pt-1.5">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === stepIndex
                    ? 'w-5 bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.7)]'
                    : idx < stepIndex
                    ? 'w-1.5 bg-sky-400/80 dark:bg-sky-500/80'
                    : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
