import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sidebar } from '../components/Sidebar';
import { ShieldCheck, UserCheck, Key, Database, Cpu, Sparkles } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* 1. Sidebar Bên tay trái */}
      <Sidebar />

      {/* 2. Nội dung chính của Dashboard bên tay phải */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
        {/* Header trên cùng */}
        <div className={`flex items-center justify-between pb-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span>Bảng điều khiển (Dashboard)</span>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Quản lý phiên làm việc, trạng thái hệ thống & trợ lý AI Agent.
            </p>
          </div>
        </div>

        {/* Khung Thông tin cá nhân & Trạng thái */}
        <div className={`border rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-8 ${
          isDark ? 'bg-[#0f0d14] border-slate-800/80' : 'bg-white border-slate-200 shadow-slate-200/50'
        }`}>
          <div className={`flex items-center gap-4 pb-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center">
              <UserCheck className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Xin chào, {user?.full_name || 'Khách truy cập'}!
              </h2>
              <p className="text-slate-400 text-sm">{user?.email || 'guest@example.com'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 text-amber-500 text-sm font-semibold mb-2">
                <ShieldCheck className="w-5 h-5" />
                <span>Trạng thái Tài khoản</span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">Đã kích hoạt</p>
              <p className="text-xs text-slate-400 mt-1">Xác thực người dùng active</p>
            </div>

            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 text-amber-500 text-sm font-semibold mb-2">
                <Key className="w-5 h-5" />
                <span>Cơ chế Xác thực</span>
              </div>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-300">JWT + Bcrypt</p>
              <p className="text-xs text-slate-400 mt-1">Access Token (15m) + Refresh (7d)</p>
            </div>

            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 text-indigo-500 text-sm font-semibold mb-2">
                <Database className="w-5 h-5" />
                <span>Redis Caching</span>
              </div>
              <p className="text-xl font-bold text-amber-500">Redis TTL Store</p>
              <p className="text-xs text-slate-400 mt-1">Reset token (1h) & Profile cache</p>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border space-y-4 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Cpu className="w-5 h-5 text-indigo-500" />
              <span>Thông tin Phiên đăng nhập</span>
            </h3>
            <div className="space-y-2 text-sm font-mono">
              <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                <span className="text-slate-400">User ID:</span>
                <span className="text-indigo-500 font-semibold">{user?.id || 'GUEST-MODE'}</span>
              </div>
              <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                <span className="text-slate-400">Email:</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{user?.email || 'guest@example.com'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">FastAPI & React Integration:</span>
                <span className="text-emerald-500 font-semibold">Kết nối thành công</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
