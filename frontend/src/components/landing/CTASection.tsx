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
          className={`rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden border shadow-2xl ${
            themeMode === 'dark'
              ? 'bg-gradient-to-b from-indigo-950/80 via-slate-900 to-slate-950 border-indigo-800/50 shadow-indigo-950/50'
              : 'bg-gradient-to-b from-indigo-600 via-indigo-700 to-indigo-800 border-indigo-500 text-white shadow-indigo-500/20'
          }`}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Decorative glow circles */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className={`text-3xl sm:text-5xl font-extrabold tracking-tight mb-6 ${
              themeMode === 'dark' ? 'text-white' : 'text-white'
            }`}>
              Start Learning Smarter Today
            </h2>

            <p className={`text-lg sm:text-xl font-normal leading-relaxed mb-8 ${
              themeMode === 'dark' ? 'text-slate-300' : 'text-indigo-100'
            }`}>
              Join thousands of students leveraging AI to boost productivity, master difficult subjects, and achieve top grades.
            </p>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
              <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                onClick={() => navigate('/register')}
                className="h-14 px-10 text-lg font-bold bg-white text-indigo-700 hover:bg-slate-100 border-none shadow-xl rounded-xl flex items-center justify-center gap-2.5 mx-auto"
              >
                Get Started Free
              </Button>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
