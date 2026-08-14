import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
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
  Target,
  Calendar,
  Settings,
  LucideIcon,
} from 'lucide-react';
import { LitaLogo } from './common/LitaLogo';

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

  const isStudent = user?.roles?.includes('student') || false;
  const isDark = themeMode === 'dark';
  const isHomePage = location.pathname === '/';

  const navItems: NavItem[] = [
    {
      id: 'home',
      name: 'Trang chủ & Khám phá',
      path: '/',
      icon: Compass,
    },
    {
      id: 'courses',
      name: 'Khóa học',
      path: '/courses',
      icon: BookOpen,
    },
    ...(isStudent
      ? [
          {
            id: 'weekly-plan',
            name: 'Study Plan (Kế hoạch học tập)',
            path: '/weekly-plan',
            icon: Calendar,
          },
          {
            id: 'goals',
            name: 'Mục tiêu cá nhân',
            path: '/goals',
            icon: Target,
          },
        ]
      : []),

    {
      id: 'chat',
      name: 'AI Chat Assistant',
      path: '/ai-chat',
      icon: MessageSquare,
      badge: 'RAG',
    },
    {
      id: 'profile',
      name: 'Hồ sơ cá nhân',
      path: '/profile',
      icon: User,
      badge: 'PRO',
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <aside
        className={`relative flex flex-col h-screen transition-all duration-300 ease-in-out z-40 border-r ${
          isDark
            ? 'bg-[#0F1710] border-minecraft-obsidianBorder text-slate-200'
            : 'bg-[#FDFBF7] border-amber-900/10 text-slate-800 shadow-md'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* 1. Sidebar Header (Ẩn Logo ở Trang Chủ, Hiện lại Lita Logo khi vào Khóa Học / trang con) */}
        <div className={`flex items-center justify-between h-16 px-4 border-b ${isDark ? 'border-minecraft-obsidianBorder' : 'border-amber-900/10'}`}>
          {!isHomePage ? (
            !isCollapsed ? (
              <Link to="/" className="flex items-center h-full overflow-hidden hover:opacity-90 transition-opacity">
                <LitaLogo size="sm" className="my-auto shrink-0" />
              </Link>
            ) : (
              <Link to="/" className="flex items-center justify-center h-full mx-auto hover:opacity-90 transition-opacity">
                <LitaLogo variant="icon" size="sm" className="my-auto shrink-0" />
              </Link>
            )
          ) : (
            <div />
          )}

          {/* Nút Ẩn / Hiện Sidebar */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-xl transition-colors focus:outline-none ${
              isDark
                ? 'bg-minecraft-obsidianCard hover:bg-emerald-950/60 text-slate-300 border border-minecraft-obsidianBorder'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60'
            }`}
            title={isCollapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'}
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* 2. Clickable User Profile Briefing -> Navigates to /profile */}
        {isAuthenticated && user && (
          <div className={`p-3 border-b ${isDark ? 'border-minecraft-obsidianBorder' : 'border-amber-900/10'}`}>
            <div
              onClick={() => navigate('/profile')}
              className={`flex items-center gap-3 p-2.5 rounded-2xl border-2 transition-all cursor-pointer group ${
                location.pathname === '/profile'
                  ? 'tab-voxel-active'
                  : isDark
                    ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder hover:border-minecraft-grassBorder shadow-sm'
                    : 'bg-white border-amber-900/10 hover:border-minecraft-grassBorder shadow-sm'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="Nhấp để mở trang Hồ Sơ Cá Nhân"
            >
              {/* Avatar Icon */}
              <div className="w-9 h-9 rounded-xl bg-minecraft-grass text-white font-extrabold flex items-center justify-center shrink-0 shadow-sm border border-minecraft-grassBorder overflow-hidden text-base">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : user.full_name ? (
                  user.full_name.charAt(0).toUpperCase()
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>

              {!isCollapsed && (
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-sm font-extrabold truncate m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {user.full_name}
                    </p>
                    <Settings className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-emerald-500 transition-all shrink-0" />
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-minecraft-grass/20 text-emerald-600 dark:text-emerald-400 border border-minecraft-grass/30 truncate">
                      ✨ {user.account_tier || (isStudent ? 'PRO Student' : 'VIP Instructor')}
                    </span>
                  </div>
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
                      ? 'bg-minecraft-obsidianCard text-emerald-400 border border-minecraft-grassBorder shadow-sm font-bold'
                      : 'bg-white text-emerald-800 border-2 border-minecraft-grassBorder font-bold shadow-voxel-sm shadow-minecraft-grassBorder'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-emerald-950/40'
                    : 'text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/60'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-emerald-500' : 'text-slate-400'
                }`} />

                {!isCollapsed && <span className="truncate">{item.name}</span>}

                {!isCollapsed && item.badge && (
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-minecraft-grass/20 text-emerald-600 dark:text-emerald-400 border border-minecraft-grass/40 rounded-full">
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
                ? 'text-amber-400 hover:bg-amber-400/10'
                : 'text-amber-700 hover:bg-amber-50'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isDark ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
          >
            {isDark ? (
              <Sun className="w-5 h-5 shrink-0 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 shrink-0 text-amber-600" />
            )}
            {!isCollapsed && (
              <span>{isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
            )}
          </button>

          {/* Nút Đăng xuất */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5 shrink-0 text-slate-400 hover:text-emerald-500" />
              {!isCollapsed && <span>Đăng xuất</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
