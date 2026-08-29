import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { LitaLogo } from './common/LitaLogo';
import { NotificationCenter } from './NotificationCenter';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { themeMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className={`sticky top-0 z-50 backdrop-blur-md transition-colors duration-300 border-b ${
      themeMode === 'dark'
        ? 'bg-[#0F1710]/90 border-minecraft-obsidianBorder text-slate-100'
        : 'bg-[#FDFBF7]/90 border-amber-900/10 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2">
            <LitaLogo size="md" />
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={toggleTheme}
                  className={`p-2.5 rounded-xl border transition-all duration-200 focus:outline-none flex items-center justify-center ${
                    themeMode === 'dark'
                      ? 'bg-minecraft-obsidianCard hover:bg-amber-400/10 border-minecraft-obsidianBorder text-amber-400'
                      : 'bg-white hover:bg-amber-50 border-amber-900/15 text-amber-700 shadow-sm'
                  }`}
                  title={themeMode === 'dark' ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
                >
                  {themeMode === 'dark' ? (
                    <Sun className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
                  ) : (
                    <Moon className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
                  )}
                </button>
                <NotificationCenter />
                <div className={`flex items-center gap-2 text-sm px-3.5 py-1.5 rounded-xl border font-medium ${
                  themeMode === 'dark'
                    ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder text-emerald-400'
                    : 'bg-white border-amber-900/10 text-emerald-800 shadow-sm'
                }`}>
                  <UserIcon className="w-4 h-4 text-emerald-500" />
                  <span>{user.full_name}</span>
                  <span className="text-xs opacity-60">({user.email})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-voxel-gold text-xs px-3 py-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 px-3 py-2"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="btn-voxel-green text-xs"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
