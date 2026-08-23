import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tag, Avatar } from 'antd';
import {
  RocketOutlined,
  LoginOutlined,
  StarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  ThunderboltFilled,
  RobotOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { themeMode } = useTheme();

  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Heading & CTAs */}
          <motion.div
            className="lg:col-span-7 flex flex-col items-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="px-4 py-1.5 text-xs font-bold rounded-full mb-6 border-2 border-minecraft-grassBorder bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 shadow-sm font-pixel tracking-wide">
              <StarOutlined className="text-amber-500 text-sm" />
              <span>NỀN TẢNG HỌC TẬP THÔNG MINH CÙNG AI</span>
            </div>

            {/* Large Heading */}
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] mb-6 ${
              themeMode === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              Chinh Phục Tri Thức Cùng{' '}
              <span className="bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500 bg-clip-text text-transparent">
                Lita Learning
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`text-lg sm:text-xl font-medium leading-relaxed max-w-2xl mb-8 ${
              themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Lập kế hoạch thông minh, học tập hiệu quả và chinh phục mục tiêu cá nhân cùng trợ lý AI linh hoạt. Trải nghiệm phương pháp học tập Gamified đầy hứng khởi.
            </p>

            {/* Key benefits list */}
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircleFilled className="text-emerald-500" />
                <span>Hoàn toàn miễn phí</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleFilled className="text-emerald-500" />
                <span>Dành cho học sinh - sinh viên</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleFilled className="text-emerald-500" />
                <span>Trợ lý AI hỗ trợ 24/7</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Interactive Illustration Mockup */}
          <motion.div
            className="lg:col-span-5 relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {/* Main Interactive Card */}
            <div className={`rounded-3xl border p-6 shadow-2xl relative backdrop-blur-xl ${
              themeMode === 'dark'
                ? 'bg-slate-900/90 border-slate-800 shadow-emerald-950/30'
                : 'bg-white/90 border-slate-200/80 shadow-slate-200'
            }`}>
              
              {/* Header inside mockup */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-minecraft-grass flex items-center justify-center text-white font-bold shadow-md">
                    <RobotOutlined className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm m-0">Gia Sư AI Học Tập</h4>
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      Đang hoạt động &amp; Phản hồi
                    </span>
                  </div>
                </div>
                <Tag color="green" className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  Trợ Lý AI Thông Minh
                </Tag>
              </div>

              {/* Chat simulation snippet */}
              <div className="space-y-4 text-xs font-sans mb-6">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl rounded-tl-none border border-emerald-100 dark:border-emerald-900/50">
                  <p className="text-emerald-950 dark:text-emerald-200 m-0 leading-relaxed font-medium">
                    👋 Chào bạn! Dựa trên bài tập môn Học máy (Machine Learning) sắp tới, tôi đã lập kế hoạch ôn tập 3 bước cho hôm nay.
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl rounded-tr-none ml-auto max-w-[85%]">
                  <p className="text-slate-800 dark:text-slate-200 m-0 leading-relaxed">
                    Tuyệt vời! Bạn có thể tóm tắt thuật toán lan truyền ngược (Backpropagation) trong Mạng nơ-ron giúp tôi không?
                  </p>
                </div>
              </div>

              {/* Progress Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Mục Tiêu Học Tập Tuần</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Đã hoàn thành 85%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-minecraft-grass h-full rounded-full w-[85%]" />
                </div>
              </div>
            </div>

            {/* Floating Badge 1: Stats */}
            <motion.div
              className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-lg"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <ThunderboltFilled className="text-xl text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500 m-0">Hiệu quả học tập</p>
                <p className="text-base font-extrabold text-slate-900 dark:text-white m-0">Nhanh hơn +3.4x</p>
              </div>
            </motion.div>

            {/* Floating Badge 2: Deadline */}
            <motion.div
              className="absolute -top-6 -right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-lg"
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ClockCircleOutlined className="text-lg text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500 m-0 font-medium">Nhắc nhở bài tập</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white m-0">Hạn nộp còn 2 ngày</p>
              </div>
            </motion.div>

          </motion.div>

        </div>
      </div>
    </section>
  );
};
