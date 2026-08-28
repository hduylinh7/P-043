import React from 'react';
import { BlockyRobotIcon } from './MinecraftIcons';

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
      {/* Outer Button with Warm Orange Gradient, White Border & 3D Voxel Bevel */}
      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#EA580C] via-[#F97316] to-[#FB923C] text-white border-2 border-white/80 shadow-[0_5px_0_#9a3412] hover:shadow-[0_7px_0_#9a3412] hover:-translate-y-1 active:translate-y-1.5 active:shadow-[0_1px_0_#9a3412] flex items-center justify-center transition-all duration-150 ring-4 ring-orange-500/20">
        
        {/* Subtle Top-Left Inner Glint */}
        <div className="absolute top-1 left-1 right-1 h-1 bg-white/25 rounded-t-xl pointer-events-none" />

        {/* Clean White Blocky Minecraft Robot Head */}
        <BlockyRobotIcon size={28} className="text-white transition-transform duration-200 group-hover:scale-110 drop-shadow-sm" />

        {/* Emerald Green Online Notification Indicator */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-sm"></span>
        </span>
      </div>
    </button>
  );
};

export default MinecraftAIFloatingButton;
