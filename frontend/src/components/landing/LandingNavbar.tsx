import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Drawer, Tooltip } from 'antd';
import {
  BookOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  RocketOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

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
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Testimonials', id: 'testimonials' },
    { label: 'About', id: 'about' },
  ];

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md transition-colors duration-300 border-b ${
      themeMode === 'dark' 
        ? 'bg-slate-950/80 border-slate-800 text-slate-100' 
        : 'bg-white/80 border-slate-200 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight transition-transform hover:scale-105">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/25">
              <BookOutlined className="text-xl" />
            </div>
            <span className={themeMode === 'dark' ? 'text-white font-extrabold' : 'text-slate-900 font-extrabold'}>
              Lita <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-rose-500">Learning</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className={`text-sm font-medium transition-colors hover:text-amber-500 ${
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
                icon={themeMode === 'dark' ? <SunOutlined className="text-amber-400 text-lg" /> : <MoonOutlined className="text-slate-700 text-lg" />}
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
              />
            </Tooltip>

            {isAuthenticated ? (
              <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 shadow-md shadow-rose-500/25 border-none font-semibold"
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  type="text"
                  size="large"
                  icon={<LoginOutlined />}
                  onClick={() => navigate('/login')}
                  className={themeMode === 'dark' ? 'text-slate-200 hover:text-amber-400' : 'text-slate-700 hover:text-amber-600'}
                >
                  Sign In
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={() => navigate('/register')}
                  className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 shadow-md shadow-rose-500/25 border-none font-semibold"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              type="text"
              shape="circle"
              icon={themeMode === 'dark' ? <SunOutlined className="text-amber-400" /> : <MoonOutlined />}
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
