import React, { useEffect, useState } from 'react';
import { ThunderboltOutlined, BookOutlined, CompassOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface KnowledgeLoadingOrbProps {
  isLoading: boolean;
  topicTitle?: string | null;
}

export const KnowledgeLoadingOrb: React.FC<KnowledgeLoadingOrbProps> = ({ isLoading, topicTitle }) => {
  const [percent, setPercent] = useState<number>(12);
  const [statusText, setStatusText] = useState<string>('Đang đọc và kết nối tài liệu bài học...');
  const [stepIndex, setStepIndex] = useState<number>(0);

  const steps = [
    { threshold: 0, text: 'Đang kết nối tài liệu bài học qua RAG...', icon: <BookOutlined className="text-emerald-400" /> },
    { threshold: 30, text: 'Đang phân tích và trích xuất khái niệm cốt lõi...', icon: <CompassOutlined className="text-cyan-400" /> },
    { threshold: 65, text: 'Đang tổng hợp kiến thức trọng tâm bài học...', icon: <ThunderboltOutlined className="text-amber-400" /> },
    { threshold: 88, text: 'Đang hoàn tất hướng dẫn & câu hỏi tự kiểm tra...', icon: <CheckCircleOutlined className="text-emerald-400" /> },
  ];

  useEffect(() => {
    if (!isLoading) {
      setPercent(100);
      return;
    }

    setPercent(8);
    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 94) {
          // Slow trickle near 94-96% while waiting for LLM
          return Math.min(prev + 0.2, 96);
        }
        if (prev < 40) {
          // Fast start
          return prev + Math.random() * 4 + 2;
        }
        if (prev < 75) {
          // Medium pace
          return prev + Math.random() * 2.5 + 1;
        }
        // Near end slow down
        return prev + Math.random() * 1.2 + 0.3;
      });
    }, 280);

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
    <div className="w-full max-w-xl mx-auto my-8 p-8 rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-b from-white/90 via-emerald-50/30 to-white/90 dark:from-minecraft-obsidianCard/90 dark:via-minecraft-obsidianCard dark:to-slate-900/90 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300">
      {/* Ambient background glow */}
      <div className="absolute -top-20 -left-20 w-48 h-48 bg-emerald-500/15 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-cyan-500/15 dark:bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Top Header Badge */}
      <div className="flex items-center gap-2 mb-6 z-10">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-sm">
          <ThunderboltOutlined className="animate-bounce" /> AI Study Companion
        </span>
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
          className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-400/40 dark:border-emerald-400/60 animate-spin"
          style={{ animationDuration: '14s' }}
        />

        {/* Counter-rotating Secondary Ring */}
        <div
          className="absolute inset-2 rounded-full border-2 border-dotted border-cyan-400/50 dark:border-cyan-300/50 animate-spin"
          style={{ animationDuration: '9s', animationDirection: 'reverse' }}
        />

        {/* Pulsing Outer Glow Aura */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-emerald-500/30 via-teal-400/25 to-cyan-400/30 blur-md animate-pulse" />

        {/* The 3D Glassmorphic Orb Ball */}
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 dark:from-emerald-500 dark:via-teal-600 dark:to-cyan-700 shadow-[0_0_40px_rgba(16,185,129,0.5)] border-2 border-white/60 dark:border-emerald-300/40 flex flex-col items-center justify-center text-white overflow-hidden">
          
          {/* Inner Light Reflection (Glossy sphere highlight) */}
          <div className="absolute top-1 left-2 w-14 h-8 bg-white/40 rounded-full blur-[1px] rotate-[-25deg] pointer-events-none" />
          <div className="absolute bottom-1 right-2 w-12 h-6 bg-cyan-200/30 rounded-full blur-[2px] pointer-events-none" />

          {/* Liquid Wave Animation Level inside Sphere */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-emerald-700/40 dark:bg-emerald-900/50 transition-all duration-300 backdrop-blur-[1px]"
            style={{ height: `${displayPercent}%` }}
          />

          {/* Floating Percentage Number */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-baseline">
              <span className="text-3xl font-black font-mono tracking-tight drop-shadow-md">
                {displayPercent}
              </span>
              <span className="text-base font-extrabold text-emerald-100 ml-0.5">%</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-100/90 mt-0.5">
              ĐANG TỔNG HỢP
            </span>
          </div>

          {/* Sparkle Particles inside Orb */}
          <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          <div className="absolute bottom-6 left-5 w-1 h-1 bg-white/80 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Dynamic Status Text */}
      <div className="mt-6 text-center space-y-2 z-10 w-full px-4">
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100 min-h-[24px]">
          <span className="text-base">{steps[stepIndex]?.icon}</span>
          <span className="animate-fade-in transition-all duration-300">{statusText}</span>
        </div>

        {/* Progress Bar with Glow */}
        <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-300/60 dark:border-slate-700 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(52,211,153,0.8)] relative"
            style={{ width: `${displayPercent}%` }}
          >
            {/* Shimmer light effect */}
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
                    ? 'w-6 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                    : idx < stepIndex
                    ? 'bg-emerald-400/80 dark:bg-emerald-500/80'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <p className="mt-4 mb-0 text-[11px] font-medium text-slate-400 dark:text-slate-500 text-center z-10">
        AI đang đọc tài liệu giáo trình và thiết kế lộ trình học cá nhân hóa cho bạn...
      </p>
    </div>
  );
};
