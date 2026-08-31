import React, { useEffect, useState } from 'react';
import { ThunderboltOutlined, CalendarOutlined, SafetyCertificateOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface InlinePlanningLoadingOrbProps {
  isLoading: boolean;
  assignmentTitle?: string | null;
}

export const InlinePlanningLoadingOrb: React.FC<InlinePlanningLoadingOrbProps> = ({
  isLoading,
  assignmentTitle,
}) => {
  const [percent, setPercent] = useState<number>(10);
  const [statusText, setStatusText] = useState<string>('Đang đồng bộ Thời khóa biểu giảng đường & Hạn nộp bài tập...');
  const [stepIndex, setStepIndex] = useState<number>(0);

  const steps = [
    { threshold: 0, text: 'Đang quét Thời khóa biểu & Hạn nộp bài tập...', icon: <CalendarOutlined className="text-emerald-500 dark:text-emerald-400" /> },
    { threshold: 30, text: 'Đang tính toán khung giờ trống & kiểm tra chống trùng lịch...', icon: <SafetyCertificateOutlined className="text-cyan-500 dark:text-cyan-400" /> },
    { threshold: 65, text: 'Đang phân bổ buổi học tối ưu theo mục tiêu tuần...', icon: <ThunderboltOutlined className="text-amber-500 dark:text-amber-400" /> },
    { threshold: 88, text: 'Đang hoàn tất dự thảo phân lịch tuần...', icon: <CheckCircleOutlined className="text-emerald-500 dark:text-emerald-400" /> },
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
          return prev + Math.random() * 4 + 2;
        }
        if (prev < 75) {
          return prev + Math.random() * 2.5 + 1.2;
        }
        return prev + Math.random() * 1.2 + 0.4;
      });
    }, 250);

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
    <div className="p-4.5 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-cyan-50/80 dark:from-minecraft-obsidianCard dark:via-slate-900/90 dark:to-minecraft-obsidianCard shadow-voxel-sm shadow-emerald-500/20 backdrop-blur-sm transition-all duration-300 relative overflow-hidden animate-fade-in my-2">
      {/* Background glowing aura */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none animate-pulse" />
      <div className="absolute -left-8 -top-8 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none animate-pulse" />

      <div className="flex items-center gap-4 relative z-10">
        {/* 🔮 Glowing Mini Orb with Percentage */}
        <div className="relative w-18 h-18 shrink-0 flex items-center justify-center select-none">
          {/* Rotating Dashed Orbit Ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-400/60 dark:border-emerald-400/80 animate-spin"
            style={{ animationDuration: '8s' }}
          />

          {/* Glowing Aura */}
          <div className="absolute inset-1.5 rounded-full bg-emerald-500/30 blur-sm animate-pulse" />

          {/* 3D Sphere Body */}
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 shadow-[0_0_20px_rgba(16,185,129,0.5)] border-2 border-white/80 dark:border-emerald-300/60 flex flex-col items-center justify-center text-white overflow-hidden">
            {/* Glossy top highlight */}
            <div className="absolute top-0.5 left-1 w-6 h-3 bg-white/45 rounded-full blur-[0.5px] rotate-[-20deg]" />

            {/* Rising liquid wave */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-emerald-800/40 transition-all duration-300"
              style={{ height: `${displayPercent}%` }}
            />

            {/* Centered % Text */}
            <span className="relative z-10 text-xs font-black font-mono tracking-tight text-white drop-shadow">
              {displayPercent}%
            </span>
          </div>
        </div>

        {/* Status Text & Progress Bar */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
              <ThunderboltOutlined className="animate-bounce" /> AI Planner Đang Tính Toán
            </span>
            {assignmentTitle && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                Ưu tiên: {assignmentTitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 min-h-[20px]">
            <span className="text-sm shrink-0">{steps[stepIndex]?.icon}</span>
            <span className="truncate">{statusText}</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2 overflow-hidden p-0.5 border border-slate-300/60 dark:border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 rounded-full transition-all duration-300 relative shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              style={{ width: `${displayPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
