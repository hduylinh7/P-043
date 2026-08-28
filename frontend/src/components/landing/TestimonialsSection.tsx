import React from 'react';
import { Card, Avatar, Rate } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export const TestimonialsSection: React.FC = () => {
  const { themeMode } = useTheme();

  const testimonials = [
    {
      name: 'Nguyễn Hoàng Linh',
      role: 'Sinh viên Khoa học Máy tính',
      avatarBg: 'bg-emerald-600',
      initials: 'HL',
      content: 'Lita Learning đã thay đổi hoàn toàn cách mình ôn thi. Trợ lý AI giải thích các thuật toán phức tạp chỉ trong vài giây!',
      rating: 5,
    },
    {
      name: 'Trần Minh Quân',
      role: 'Sinh viên Khoa học Dữ liệu & AI',
      avatarBg: 'bg-amber-500',
      initials: 'MQ',
      content: 'Kế hoạch học tập thông minh giúp mình quản lý cùng lúc 5 môn học mà không bị quá tải. Điểm GPA của mình đã tăng từ 3.2 lên 3.8.',
      rating: 5,
    },
    {
      name: 'Lê Thu Hà',
      role: 'Sinh viên Quản trị Kinh doanh',
      avatarBg: 'bg-emerald-600',
      initials: 'TH',
      content: 'Mình rất thích tính năng theo dõi mục tiêu tuần và nhắc nhở bài tập. Các câu hỏi tương tác giúp mình ghi nhớ bài giảng sâu sắc hơn.',
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3 font-pixel">
            CÂU CHUYỆN THÀNH CÔNG
          </h2>
          <h3 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            themeMode === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Được Sinh Viên &amp; Người Học Tin Dùng
          </h3>
          <p className={`mt-4 text-base sm:text-lg ${
            themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Khám phá cách người học nâng cao thành tích học tập vượt trội cùng trợ lý AI.
          </p>
        </div>

        {/* 3 Testimonials Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              whileHover={{ y: -6 }}
            >
              <Card
                className={`h-full border rounded-2xl transition-all duration-300 ${
                  themeMode === 'dark'
                    ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/30'
                    : 'bg-white border-slate-200/80 shadow-md hover:shadow-xl'
                }`}
                bodyStyle={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}
              >
                <div>
                  <Rate disabled defaultValue={t.rating} className="text-amber-400 text-sm mb-4" />
                  <p className={`text-sm leading-relaxed italic mb-6 ${
                    themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    "{t.content}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Avatar size={44} className={`${t.avatarBg} font-bold text-white flex items-center justify-center`}>
                    {t.initials}
                  </Avatar>
                  <div>
                    <h5 className={`text-sm font-bold m-0 ${
                      themeMode === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {t.name}
                    </h5>
                    <p className="text-xs text-slate-500 m-0">
                      {t.role}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
