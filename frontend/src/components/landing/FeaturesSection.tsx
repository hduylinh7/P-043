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
      icon: <RobotOutlined className="text-3xl text-indigo-600 dark:text-indigo-400" />,
      title: 'AI Tutor',
      description: 'Receive step-by-step explanations, instant concept breakdowns, and personalized problem-solving hints anytime.',
    },
    {
      icon: <CalendarOutlined className="text-3xl text-purple-600 dark:text-purple-400" />,
      title: 'Smart Study Planner',
      description: 'Automatically generate balanced study schedules tailored around your university lectures, exams, and personal life.',
    },
    {
      icon: <AimOutlined className="text-3xl text-emerald-600 dark:text-emerald-400" />,
      title: 'Weekly Goals',
      description: 'Set manageable target milestones each week with intelligent progress tracking and adaptive push notifications.',
    },
    {
      icon: <FileDoneOutlined className="text-3xl text-amber-600 dark:text-amber-400" />,
      title: 'Assignment Tracking',
      description: 'Stay ahead of deadlines with centralized submission timelines, priority tags, and automated reminder alerts.',
    },
    {
      icon: <MessageOutlined className="text-3xl text-blue-600 dark:text-blue-400" />,
      title: 'AI Chat Assistant',
      description: 'Engage in natural conversations with an AI study buddy that answers course questions and summarizes dense documents.',
    },
    {
      icon: <LineChartOutlined className="text-3xl text-rose-600 dark:text-rose-400" />,
      title: 'Learning Analytics',
      description: 'Gain clear data insights into your study habits, retention metrics, time allocation, and academic performance.',
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
          <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
            POWERFUL FEATURES
          </h2>
          <h3 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            themeMode === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Everything You Need to Excel in Your Studies
          </h3>
          <p className={`mt-4 text-base sm:text-lg ${
            themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Engineered to streamline student workflows, boost information retention, and eliminate academic burn-out.
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
              <Card
                hoverable
                className={`h-full border transition-all duration-300 rounded-2xl ${
                  themeMode === 'dark'
                    ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/40 hover:border-slate-700'
                    : 'bg-white border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-100'
                }`}
                bodyStyle={{ padding: '2rem' }}
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
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
              </Card>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};
