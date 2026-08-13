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
  showBack = false,
  backTo = '/',
}) => {
  const { themeMode, toggleTheme } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col justify-between relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#0F1710] text-[#F2F9F3]' : 'bg-[#FDFBF7] text-slate-900'
      }`}
    >
      {/* Decorative Glow Shapes */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between relative z-20">
        <Link to="/" className="flex items-center gap-2">
          <LitaLogo size="md" />
        </Link>

        <div className="flex items-center gap-3">
          <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <Button
              type="text"
              shape="circle"
              icon={isDark ? <SunOutlined className="text-amber-400 text-lg" /> : <MoonOutlined className="text-slate-700 text-lg" />}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="hover:bg-slate-200/50 dark:hover:bg-slate-800"
            />
          </Tooltip>
          <Link
            to="/"
            className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              isDark
                ? 'border-minecraft-obsidianBorder bg-minecraft-obsidianCard text-slate-300 hover:text-white'
                : 'border-amber-900/15 bg-white text-slate-700 hover:text-emerald-600 shadow-sm'
            }`}
          >
            <ArrowLeftOutlined /> Trang chủ
          </Link>
        </div>
      </header>

      {/* Main Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-20">
        <motion.div
          className="w-full max-w-[440px]"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div
            className={`rounded-3xl p-8 sm:p-10 relative overflow-hidden transition-all ${
              isDark
                ? 'bg-minecraft-obsidianCard border-2 border-minecraft-obsidianBorder shadow-2xl'
                : 'bg-white border-2 border-amber-900/10 shadow-xl'
            }`}
          >
            {/* Back Button (if enabled) */}
            {showBack && (
              <Link
                to={backTo}
                className="inline-flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mb-4 transition-colors relative z-10"
                title="Quay lại"
              >
                <ArrowLeftOutlined className="text-base" />
              </Link>
            )}

            {/* Header Text inside card */}
            <div className="text-left mb-8 relative z-10">
              <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Form Content */}
            <div className="relative z-10">{children}</div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600 relative z-20">
        © {new Date().getFullYear()} Lita Learning. Gamified AI Education Platform.
      </footer>
    </div>
  );
};
