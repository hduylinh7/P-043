import React, { useEffect, useState } from 'react';
import {
  ThunderboltOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';

interface QuizLoadingOrbProps {
  isLoading: boolean;
  topicTitle?: string | null;
  courseName?: string | null;
}

export const QuizLoadingOrb: React.FC<QuizLoadingOrbProps> = ({
  isLoading,
  topicTitle,
  courseName,
}) => {
  const [percent, setPercent] = useState<number>(10);
  const [statusText, setStatusText] = useState<string>('Đang quét tài liệu bài giảng và mục tiêu học tập...');
  const [stepIndex, setStepIndex] = useState<number>(0);

  const steps = [
    {
      threshold: 0,
      text: 'Đang trích xuất nội dung bài giảng & mục tiêu học tập qua RAG...',
      icon: <BookOutlined className="text-purple-400" />,
    },
    {
      threshold: 28,
      text: 'Đang biên soạn 4 câu trắc nghiệm phân loại kiến thức sâu...',
      icon: <QuestionCircleOutlined className="text-indigo-400" />,
    },
    {
      threshold: 62,
      text: 'Đang thiết kế câu hỏi tự luận vận dụng & gợi ý suy luận...',
      icon: <EditOutlined className="text-pink-400" />,
    },
    {
      threshold: 88,
      text: 'Đang hoàn tất bộ 5 câu hỏi ôn tập chất lượng cao...',
      icon: <CheckCircleOutlined className="text-emerald-400" />,
    },
  ];

  useEffect(() => {
    if (!isLoading) {
      setPercent(100);
      return;
    }

    setPercent(8);
    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 95) {
          return Math.min(prev + 0.2, 97);
        }
        if (prev < 40) {
          return prev + Math.random() * 4 + 2.2;
        }
        if (prev < 75) {
          return prev + Math.random() * 2.8 + 1.2;
        }
        return prev + Math.random() * 1.2 + 0.4;
      });
    }, 260);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const currentStep = [...steps].reverse().find((s) => percent >= s.threshold) || steps[0];
    setStatusText(currentStep.text);
    const idx = steps.findIndex((s) => s.text === currentStep.text);
    if (idx !== -1) setStepIndex(idx);
  }, [percent]);

  if (!isLoading) return null;

  const displayPercent = Math.min(100, Math.floor(percent));

  return (
    <div className="w-full max-w-xl mx-auto my-6 p-8 rounded-3xl border-2 border-purple-500/30 bg-gradient-to-b from-white/95 via-purple-50/40 to-white/95 dark:from-slate-900/95 dark:via-purple-950/20 dark:to-slate-900/95 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300">
      {/* Ambient background glow */}
      <div className="absolute -top-20 -left-20 w-48 h-48 bg-purple-500/15 dark:bg-purple-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-indigo-500/15 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Top Header Badge */}
      <div className="flex items-center gap-2 mb-6 z-10 flex-wrap justify-center">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 shadow-sm">
          <ThunderboltOutlined className="animate-bounce" /> AI Quiz Generator
        </span>
        {courseName && (
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {courseName}
          </span>
        )}
        {topicTitle && (
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
            {topicTitle}
          </span>
        )}
      </div>

      {/* 🔮 3D Glowing Animated Orb Sphere */}
      <div className="relative w-44 h-44 my-2 flex items-center justify-center select-none z-10">
        {/* Outer Orbiting Ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-purple-400/50 dark:border-purple-400/60 animate-spin"
          style={{ animationDuration: '12s' }}
        />

        {/* Counter-rotating Secondary Ring */}
        <div
          className="absolute inset-2 rounded-full border-2 border-dotted border-indigo-400/60 dark:border-indigo-300/50 animate-spin"
          style={{ animationDuration: '8s', animationDirection: 'reverse' }}
        />

        {/* Pulsing Outer Glow Aura */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-purple-500/35 via-indigo-500/30 to-pink-500/35 blur-md animate-pulse" />

        {/* The 3D Glassmorphic Orb Ball */}
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 via-indigo-600 to-pink-600 dark:from-purple-600 dark:via-indigo-700 dark:to-pink-700 shadow-[0_0_40px_rgba(168,85,247,0.5)] border-2 border-white/60 dark:border-purple-300/40 flex flex-col items-center justify-center text-white overflow-hidden">
          {/* Inner Light Reflection */}
          <div className="absolute top-1 left-2 w-14 h-8 bg-white/40 rounded-full blur-[1px] rotate-[-25deg] pointer-events-none" />
          <div className="absolute bottom-1 right-2 w-12 h-6 bg-purple-200/30 rounded-full blur-[2px] pointer-events-none" />

          {/* Liquid Wave Level inside Sphere */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-purple-900/40 dark:bg-purple-950/50 transition-all duration-300 backdrop-blur-[1px]"
            style={{ height: `${displayPercent}%` }}
          />

          {/* Floating Percentage */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-baseline">
              <span className="text-3xl font-black font-mono tracking-tight drop-shadow-md">
                {displayPercent}
              </span>
              <span className="text-base font-extrabold text-purple-100 ml-0.5">%</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-100/90 mt-0.5">
              ĐANG BIÊN SOẠN
            </span>
          </div>

          {/* Sparkles */}
          <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          <div className="absolute bottom-6 left-5 w-1 h-1 bg-white/80 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Dynamic Status Text */}
      <div className="mt-6 text-center space-y-2 z-10 w-full px-4">
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100 min-h-[24px]">
          <span className="text-base">{steps[stepIndex]?.icon}</span>
          <span className="transition-all duration-300">{statusText}</span>
        </div>

        {/* Progress Bar with Glow */}
        <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-300/60 dark:border-slate-700 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-pink-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(168,85,247,0.8)] relative"
            style={{ width: `${displayPercent}%` }}
          >
            <div className="absolute inset-0 bg-white/25 animate-pulse rounded-full" />
          </div>
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === stepIndex
                    ? 'w-6 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)]'
                    : idx < stepIndex
                    ? 'bg-purple-400/80 dark:bg-purple-500/80'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
