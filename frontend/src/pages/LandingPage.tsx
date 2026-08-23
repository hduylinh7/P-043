import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { CTASection } from '../components/landing/CTASection';
import { LandingFooter } from '../components/landing/LandingFooter';
import { useTheme } from '../context/ThemeContext';

export const LandingPage: React.FC = () => {
  const { themeMode } = useTheme();

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${
        themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* 1. Sidebar Bên tay trái (Có tính năng Thu gọn / Mở rộng & Đổi màu Sáng/Tối) */}
      <Sidebar />

      {/* 2. Nội dung trang chính bên tay phải */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <LandingNavbar />
        <main className="flex-1">
          <HeroSection />
          <FeaturesSection />
          <HowItWorksSection />
          <CTASection />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
};

export default LandingPage;
