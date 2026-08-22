import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import {
  SunOutlined,
  MoonOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { LitaLogo } from '../common/LitaLogo';
import {
  VoxelGrassBlock,
  VoxelEmerald,
  VoxelDiamond,
  VoxelGold,
} from '../common/MinecraftIcons';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  badgeText?: string;
  showBack?: boolean;
  backTo?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  badgeText = 'LEVEL 1 • AUTH',
  showBack = false,
  backTo = '/',
}) => {
  const { themeMode, toggleTheme } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col justify-between relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#0B120C] text-[#F2F9F3]' : 'bg-[#F9F6F0] text-slate-900'
      }`}
    >
      {/* Pixel Grid Pattern Background Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, ${isDark ? '#59B335' : '#2B6617'} 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Decorative Floating Minecraft Voxel Icons in Background */}
      <div className="absolute top-16 left-[5%] lg:left-[10%] hidden md:block pointer-events-none animate-float-voxel opacity-80">
        <VoxelGrassBlock size={48} />
      </div>
      <div className="absolute bottom-20 left-[8%] hidden md:block pointer-events-none animate-float-voxel-delayed opacity-75">
        <VoxelGold size={40} />
      </div>
      <div className="absolute top-24 right-[8%] lg:right-[12%] hidden md:block pointer-events-none animate-float-voxel-delayed opacity-85">
        <VoxelEmerald size={44} />
      </div>
      <div className="absolute bottom-24 right-[6%] hidden md:block pointer-events-none animate-float-voxel opacity-80">
        <VoxelDiamond size={42} />
      </div>

      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between relative z-20">
        <Link to="/" className="flex items-center gap-2 group">
          <LitaLogo size="md" />
        </Link>

        <div className="flex items-center gap-3">
          <Tooltip title={isDark ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}>
            <Button
              type="text"
              shape="circle"
              icon={isDark ? <SunOutlined className="text-amber-400 text-lg" /> : <MoonOutlined className="text-slate-700 text-lg" />}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="hover:bg-slate-200/60 dark:hover:bg-slate-800/80 border border-transparent hover:border-emerald-500/30"
            />
          </Tooltip>
          <Link
            to="/"
            className={`hidden sm:flex items-center gap-2 text-xs font-extrabold px-4 py-2.5 rounded-xl border-2 transition-all active:translate-y-0.5 ${
              isDark
                ? 'border-minecraft-obsidianBorder bg-minecraft-obsidianCard text-slate-300 hover:text-white hover:border-emerald-500/50 shadow-voxel-sm shadow-black/40'
                : 'border-amber-900/15 bg-white text-slate-800 hover:text-emerald-700 hover:border-emerald-500/50 shadow-voxel-sm shadow-amber-900/10'
            }`}
          >
            <ArrowLeftOutlined /> Trang chủ
          </Link>
        </div>
      </header>

      {/* Main Minecraft Voxel Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-20">
        <motion.div
          className="w-full max-w-[460px]"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div
            className={`relative rounded-3xl overflow-hidden transition-all duration-300 ${
              isDark
                ? 'bg-[#162218] border-3 sm:border-4 border-[#234A1F] shadow-[0_10px_0_0_#122714]'
                : 'bg-white border-3 sm:border-4 border-minecraft-grassBorder shadow-[0_10px_0_0_#2B6617]'
            }`}
          >
            {/* Minecraft Top Header Block Accent Bar */}
            <div
              className={`h-4.5 w-full border-b-2 flex items-center px-4 ${
                isDark
                  ? 'bg-gradient-to-r from-emerald-950 via-[#1C3619] to-emerald-950 border-[#2B5424]'
                  : 'bg-gradient-to-r from-minecraft-grassDark via-minecraft-grass to-minecraft-grassDark border-minecraft-grassBorder'
              }`}
            >
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-sm bg-amber-400 opacity-80" />
                <div className="w-2 h-2 rounded-sm bg-emerald-300 opacity-80" />
                <div className="w-2 h-2 rounded-sm bg-sky-300 opacity-80" />
              </div>
            </div>

            {/* Inner Content Padding Area */}
            <div className="p-7 sm:p-9 relative z-10">
              {/* Top Row: Back button & Voxel Badge */}
              <div className="flex items-center justify-between mb-5">
                {showBack ? (
                  <Link
                    to={backTo}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
                    title="Quay lại"
                  >
                    <ArrowLeftOutlined className="text-xs" /> Quay lại
                  </Link>
                ) : (
                  <div />
                )}
                {badgeText && (
                  <span className="font-extrabold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-lg border border-minecraft-grassBorder/40 bg-minecraft-grass/15 text-emerald-800 dark:text-emerald-300">
                    {badgeText}
                  </span>
                )}
              </div>

              {/* Header Title inside card */}
              <div className="text-left mb-7">
                <h1
                  className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5 ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Form Content */}
              <div>{children}</div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs font-medium text-slate-400 dark:text-slate-600 relative z-20 flex items-center justify-center gap-2">
        <VoxelGrassBlock size={16} />
        <span>© {new Date().getFullYear()} Lita Learning. Gamified AI Education Platform.</span>
      </footer>
    </div>
  );
};

