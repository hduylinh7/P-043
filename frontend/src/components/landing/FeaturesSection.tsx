import React from 'react';
import { Card } from 'antd';
import {
  RobotOutlined,
  CalendarOutlined,
  AimOutlined,
  FileDoneOutlined,
  MessageOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export const FeaturesSection: React.FC = () => {
  const { themeMode } = useTheme();

  const features = [
    {
      icon: <RobotOutlined className="text-3xl text-emerald-500" />,
      title: 'Gia Sư AI Cá Nhân Hóa',
      description: 'Nhận giải thích từng bước, phân tích khái niệm tức thì và gợi ý giải bài tập cá nhân hóa bất cứ lúc nào.',
    },
    {
      icon: <CalendarOutlined className="text-3xl text-amber-500" />,
      title: 'Lập Kế Hoạch Học Thông Minh',
      description: 'Tự động tạo lịch học cân bằng, tối ưu theo thời khóa biểu, lịch thi và mục tiêu cá nhân.',
    },
    {
      icon: <AimOutlined className="text-3xl text-emerald-500" />,
      title: 'Mục Tiêu Học Tập Tuần',
      description: 'Thiết lập các mốc mục tiêu khả thi mỗi tuần kèm theo dõi tiến độ thông minh và nhắc nhở đúng lúc.',
    },
    {
      icon: <FileDoneOutlined className="text-3xl text-sky-500" />,
      title: 'Theo Dõi Hạn Nộp Bài Tập',
      description: 'Chủ động trước mọi deadline với bảng quản lý bài nộp tập trung, phân loại ưu tiên và cảnh báo tự động.',
    },
    {
      icon: <MessageOutlined className="text-3xl text-sky-500" />,
      title: 'Trợ Lý Chat AI Đồng Hành',
      description: 'Trò chuyện tự nhiên với bạn học AI giúp giải đáp thắc mắc môn học và tóm tắt tài liệu chuyên sâu.',
    },
    {
      icon: <LineChartOutlined className="text-3xl text-amber-500" />,
      title: 'Phân Tích & Đánh Giá Tiến Bộ',
      description: 'Nắm bắt số liệu trực quan về thói quen học tập, thời gian phân bổ và hiệu suất học tập toàn diện.',
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="features" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-pixel font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">
            TÍNH NĂNG ĐỘT PHÁ
          </h2>
          <h3 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            themeMode === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Mọi Công Cụ Bạn Cần Để Bứt Phá Học Tập
          </h3>
          <p className={`mt-4 text-base sm:text-lg ${
            themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Tối ưu hóa quy trình học, nâng cao ghi nhớ thông tin và duy trì động lực bền bỉ.
          </p>
        </div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
            >
              <div
                className={`h-full border-2 transition-all duration-300 rounded-3xl p-8 ${
                  themeMode === 'dark'
                    ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder shadow-lg hover:border-emerald-500/50'
                    : 'bg-white border-amber-900/10 shadow-sm hover:shadow-xl hover:border-emerald-400'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-minecraft-grassBorder/30 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h4 className={`text-xl font-bold mb-3 ${
                  themeMode === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  {feature.title}
                </h4>
                <p className={`text-sm leading-relaxed m-0 ${
                  themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};
