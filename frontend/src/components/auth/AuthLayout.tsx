import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import {
  BookOutlined,
  SunOutlined,
  MoonOutlined,
  ArrowLeftOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  badgeText?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  badgeText = 'AI Learning Companion',
}) => {
  const { themeMode, toggleTheme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col justify-between relative overflow-hidden transition-colors duration-300 ${
      themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Background Decorative Gradients & Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-10 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight group">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <BookOutlined className="text-lg" />
          </div>
          <span className={themeMode === 'dark' ? 'text-white' : 'text-slate-900'}>
            AI Learning <span className="text-indigo-600">Companion</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Tooltip title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <Button
              type="text"
              shape="circle"
              icon={themeMode === 'dark' ? <SunOutlined className="text-amber-400 text-lg" /> : <MoonOutlined className="text-slate-700 text-lg" />}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="hover:bg-slate-200/50 dark:hover:bg-slate-800"
            />
          </Tooltip>
          <Link
            to="/"
            className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all ${
              themeMode === 'dark'
                ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-700'
                : 'border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm'
            }`}
          >
            <ArrowLeftOutlined /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className={`rounded-3xl border p-8 sm:p-10 shadow-2xl relative backdrop-blur-xl ${
            themeMode === 'dark'
              ? 'bg-slate-900/90 border-slate-800/80 shadow-slate-950/60'
              : 'bg-white/95 border-slate-200/80 shadow-slate-200/60'
          }`}>
            
            {/* Header Text inside card */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                <StarOutlined />
                <span>{badgeText}</span>
              </div>
              <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                themeMode === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {title}
              </h1>
              <p className={`text-sm mt-2 leading-relaxed ${
                themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {subtitle}
              </p>
            </div>

            {/* Form Content */}
            {children}
          </div>
        </motion.div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600 relative z-10">
        © {new Date().getFullYear()} AI Learning Companion. Secure 256-bit Encrypted Session.
      </footer>
    </div>
  );
};
