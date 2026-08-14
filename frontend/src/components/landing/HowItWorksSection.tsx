import React from 'react';
import { UserAddOutlined, SolutionOutlined, RocketOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export const HowItWorksSection: React.FC = () => {
  const { themeMode } = useTheme();

  const steps = [
    {
      number: '01',
      icon: <UserAddOutlined className="text-2xl text-emerald-600 dark:text-emerald-400" />,
      title: 'Create your account',
      description: 'Sign up in under 60 seconds with your email or Google account. Free for students.',
    },
    {
      number: '02',
      icon: <SolutionOutlined className="text-2xl text-amber-500 dark:text-amber-400" />,
      title: 'Set your learning goals',
      description: 'Input your courses, assignment deadlines, and desired GPA targets into your dashboard.',
    },
    {
      number: '03',
      icon: <RocketOutlined className="text-2xl text-emerald-600 dark:text-emerald-400" />,
      title: 'Let AI guide your journey',
      description: 'Receive personalized daily study plans, interactive tutoring, and automated reminders.',
    },
  ];

  return (
    <section id="how-it-works" className={`py-20 border-y ${
      themeMode === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/70 border-slate-200/60'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">
            SIMPLE WORKFLOW
          </h2>
          <h3 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            themeMode === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            How Lita Learning Works
          </h3>
          <p className={`mt-4 text-base sm:text-lg ${
            themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Get started in 3 quick steps and transform the way you study forever.
          </p>
        </div>

        {/* 3 Steps Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              className={`rounded-2xl p-8 border relative flex flex-col justify-between transition-all duration-300 ${
                themeMode === 'dark'
                  ? 'bg-slate-900 border-slate-800 shadow-lg'
                  : 'bg-white border-slate-200/80 shadow-md hover:shadow-xl'
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
            >
              <div>
                {/* Step Number & Icon */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="text-3xl font-black text-slate-300 dark:text-slate-700 tracking-tighter">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <h4 className={`text-xl font-bold mb-3 ${
                  themeMode === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  {step.title}
                </h4>
                <p className={`text-sm leading-relaxed m-0 ${
                  themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
