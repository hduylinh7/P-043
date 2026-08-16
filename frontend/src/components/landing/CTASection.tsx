import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export const CTASection: React.FC = () => {
  const navigate = useNavigate();
  const { themeMode } = useTheme();

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <motion.div
          className={`rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden border-2 shadow-2xl ${
            themeMode === 'dark'
              ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder shadow-emerald-950/50'
              : 'bg-gradient-to-br from-minecraft-grassDark via-emerald-600 to-green-700 border-minecraft-grassBorder text-white shadow-emerald-500/20'
          }`}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Decorative glow circles */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-6 text-white">
              Bắt Đầu Học Tập Thông Minh Ngay Hôm Nay
            </h2>

            <p className="text-lg sm:text-xl font-medium leading-relaxed mb-8 text-emerald-50">
              Gia nhập cộng đồng người học nâng cao hiệu suất cùng trợ lý AI cá nhân hóa đỉnh cao.
            </p>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
              <button
                onClick={() => navigate('/register')}
                className="btn-voxel-gold text-base px-10 py-4 shadow-xl"
              >
                <RocketOutlined />
                <span>Đăng Ký Miễn Phí</span>
              </button>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
