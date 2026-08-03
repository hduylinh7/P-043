import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Key, Database, Cpu } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-8">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
            <UserCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Xin chào, {user?.full_name}!</h1>
            <p className="text-slate-400 text-sm">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/80 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span>Trạng thái Tài khoản</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">Đã kích hoạt</p>
            <p className="text-xs text-slate-500 mt-1">Xác thực người dùng active</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold mb-2">
              <Key className="w-5 h-5" />
              <span>Cơ chế Xác thực</span>
            </div>
            <p className="text-xl font-bold text-indigo-300">JWT + Bcrypt</p>
            <p className="text-xs text-slate-500 mt-1">Access Token (15m) + Refresh (7d)</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold mb-2">
              <Database className="w-5 h-5" />
              <span>Redis Caching</span>
            </div>
            <p className="text-xl font-bold text-amber-300">Redis TTL Store</p>
            <p className="text-xs text-slate-500 mt-1">Reset token (1h) & Profile cache</p>
          </div>
        </div>

        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span>Thông tin Phiên đăng nhập</span>
          </h2>
          <div className="space-y-2 text-sm text-slate-300 font-mono">
            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-500">User ID:</span>
              <span className="text-indigo-300">{user?.id}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-500">Email:</span>
              <span className="text-slate-200">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">FastAPI & React Integration:</span>
              <span className="text-emerald-400">Kết nối thành công</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
