import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import {
  BookOutlined,
  SunOutlined,
  MoonOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

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
        isDark ? 'bg-[#0b0d14] text-slate-100' : 'bg-[#f4f1eb] text-slate-900'
      }`}
    >
      {/* Bottom Right Decorative Yellow-Orange Wave Shape */}
      <div className="absolute -bottom-24 -right-24 w-96 h-96 sm:w-[500px] sm:h-[500px] bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 rounded-tl-[240px] pointer-events-none opacity-90" />

      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between relative z-20">
        <Link to="/" className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
            <BookOutlined className="text-lg" />
          </div>
          <span className={isDark ? 'text-white font-extrabold' : 'text-slate-900 font-extrabold'}>
            Lita <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Learning</span>
          </span>
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
            className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white'
                : 'border-slate-200/80 bg-white/80 text-slate-700 hover:text-amber-600 shadow-sm'
            }`}
          >
            <ArrowLeftOutlined /> Trang chủ
          </Link>
        </div>
      </header>

      {/* Main Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-20">
        <motion.div
          className="w-full max-w-[420px]"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div
            className={`rounded-[36px] border-0 p-8 sm:p-10 relative overflow-hidden shadow-2xl transition-all ${
              isDark
                ? 'bg-slate-900/95 shadow-black/60 border border-slate-800/60'
                : 'bg-white shadow-amber-900/10'
            }`}
          >
            {/* Top-Right Decorative Yellow-Orange Organic Blob */}
            <div className="absolute top-0 right-0 w-36 h-28 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 rounded-bl-[60px] rounded-tr-[36px] opacity-90 pointer-events-none" />

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

            {/* Header Text inside card - Left aligned */}
            <div className="text-left mb-8 relative z-10">
              <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
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
        © {new Date().getFullYear()} Lita Learning. Secure Authentication Session.
      </footer>
    </div>
  );
};
