import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Drawer, Tooltip } from 'antd';
import {
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  RocketOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { LitaLogo } from '../common/LitaLogo';

export const LandingNavbar: React.FC = () => {
  const { themeMode, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileDrawerOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinks = [
    { label: 'Tính năng', id: 'features' },
    { label: 'Cách hoạt động', id: 'how-it-works' },
    { label: 'Đánh giá', id: 'testimonials' },
    { label: 'Về chúng tôi', id: 'about' },
  ];

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md transition-colors duration-300 border-b ${
      themeMode === 'dark' 
        ? 'bg-[#0F1710]/90 border-minecraft-obsidianBorder text-slate-100' 
        : 'bg-[#FDFBF7]/90 border-amber-900/10 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5">
            <LitaLogo size="md" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className={`text-sm font-medium transition-colors hover:text-blue-500 ${
                  themeMode === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Actions & Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <Tooltip title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <Button
                type="text"
                shape="circle"
                icon={themeMode === 'dark' ? <SunOutlined className="text-blue-400 text-lg" /> : <MoonOutlined className="text-slate-700 text-lg" />}
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
              />
            </Tooltip>

            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-voxel-green text-sm"
              >
                <RocketOutlined />
                <span>Vào Bảng Điều Khiển</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${
                    themeMode === 'dark' ? 'text-slate-200 hover:text-emerald-400' : 'text-slate-800 hover:text-emerald-600'
                  }`}
                >
                  <LoginOutlined className="mr-1.5" />
                  Đăng nhập
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="btn-voxel-green text-sm"
                >
                  <RocketOutlined />
                  <span>Bắt đầu ngay</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              type="text"
              shape="circle"
              icon={themeMode === 'dark' ? <SunOutlined className="text-blue-400" /> : <MoonOutlined />}
              onClick={toggleTheme}
            />
            <Button
              type="text"
              icon={<MenuOutlined className="text-xl" />}
              onClick={() => setMobileDrawerOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer
        title="AI Learning Companion"
        placement="right"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        width={280}
      >
        <div className="flex flex-col gap-4 py-2">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className="text-left text-base font-medium py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {link.label}
            </button>
          ))}
          <hr className="my-2 border-slate-200 dark:border-slate-800" />
          {isAuthenticated ? (
            <Button
              type="primary"
              block
              size="large"
              onClick={() => {
                setMobileDrawerOpen(false);
                navigate('/');
              }}
            >
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button
                block
                size="large"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  navigate('/login');
                }}
              >
                Sign In
              </Button>
              <Button
                type="primary"
                block
                size="large"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  navigate('/register');
                }}
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </Drawer>
    </header>
  );
};
