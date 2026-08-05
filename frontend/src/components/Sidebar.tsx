import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  MessageSquare,
  User,
  LogOut,
  ChevronLeft,
  Menu,
  Sparkles,
  Compass,
  Sun,
  Moon,
  BookOpen,
  LucideIcon
} from 'lucide-react';

interface NavItem {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { themeMode, toggleTheme } = useTheme();

  const navItems: NavItem[] = [
    {
      id: 'home',
      name: 'Trang chủ & Khám phá',
      path: '/',
      icon: Compass,
    },
    {
      id: 'dashboard',
      name: 'Bảng điều khiển',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'courses',
      name: 'Khóa học',
      path: '/courses',
      icon: BookOpen,
    },
    {
      id: 'chat',
      name: 'AI Chat Assistant',
      path: '/dashboard',
      icon: MessageSquare,
      badge: 'AI',
    },
  ];


  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isDark = themeMode === 'dark';

  return (
    <aside
      className={`relative flex flex-col h-screen transition-all duration-300 ease-in-out z-40 border-r ${
        isDark
          ? 'bg-[#0f0d14] border-slate-800/80 text-slate-200'
          : 'bg-white border-slate-200 text-slate-800 shadow-lg'
      } ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* 1. Sidebar Header (Sunset Amber Theme) */}
      <div className={`flex items-center justify-between h-16 px-4 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-blue-500">
            <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Menu Navigation</span>
          </div>
        )}

        {/* Nút Ẩn / Hiện */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-2 rounded-xl transition-colors ml-auto focus:outline-none ${
            isDark
              ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
          }`}
          title={isCollapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'}
        >
          {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* 2. User Info Briefing (Chỉ khi đã đăng nhập) */}
      {isAuthenticated && user && (
        <div className={`p-3 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <div className={`flex items-center gap-3 p-2 rounded-xl border ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-blue-50/50 border-blue-200/60'
          } ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold flex items-center justify-center shrink-0 shadow-md">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {user.full_name}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {!isCollapsed && (
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Danh mục
          </p>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group relative ${
                isActive
                  ? isDark
                    ? 'bg-gradient-to-r from-blue-500/15 to-indigo-500/15 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/5'
                    : 'bg-gradient-to-r from-blue-50 to-blue-50 text-blue-800 border border-blue-200 font-bold shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/60'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                isActive ? 'text-blue-500' : 'text-slate-400'
              }`} />

              {!isCollapsed && <span className="truncate">{item.name}</span>}

              {!isCollapsed && item.badge && (
                <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
                  {item.badge}
                </span>
              )}

              {/* Tooltip khi thu gọn */}
              {isCollapsed && (
                <div className={`absolute left-full ml-3 px-2.5 py-1.5 text-xs rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 ${
                  isDark ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'
                }`}>
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 4. Sidebar Footer */}
      <div className={`p-3 border-t space-y-1.5 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
        {/* Nút Đổi màu Sáng / Tối */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            isDark
              ? 'text-blue-400 hover:bg-blue-400/10'
              : 'text-blue-700 hover:bg-blue-50'
          } ${isCollapsed ? 'justify-center' : ''}`}
          title={isDark ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
        >
          {isDark ? (
            <Sun className="w-5 h-5 shrink-0 text-blue-400" />
          ) : (
            <Moon className="w-5 h-5 shrink-0 text-blue-600" />
          )}
          {!isCollapsed && (
            <span>{isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
          )}
        </button>

        {/* Nút Đăng xuất */}
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5 shrink-0 text-slate-400 hover:text-indigo-500" />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
