import React from 'react';
import { Bot } from 'lucide-react';

interface MinecraftAIFloatingButtonProps {
  onClick: () => void;
  title?: string;
  className?: string;
}

export const MinecraftAIFloatingButton: React.FC<MinecraftAIFloatingButtonProps> = ({
  onClick,
  title = 'Mở Trợ Lý AI Học Tập',
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`fixed bottom-6 right-6 z-50 group flex items-center justify-center cursor-pointer select-none transition-all duration-200 active:scale-95 ${className}`}
    >
      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white border-2 border-white/80 shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-1 flex items-center justify-center transition-all duration-150 ring-4 ring-emerald-500/20">
        <Bot className="w-7 h-7 text-white transition-transform duration-200 group-hover:scale-110" />

        {/* Emerald Online Notification Indicator */}
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white shadow-sm"></span>
        </span>
      </div>
    </button>
  );
};

export default MinecraftAIFloatingButton;
