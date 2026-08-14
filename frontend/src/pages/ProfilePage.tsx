import React, { useState, useEffect } from 'react';
import { Input, message } from 'antd';
import {
  User,
  Crown,
  ShieldCheck,
  Check,
  Save,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const MINECRAFT_AVATARS = [
  { id: 'steve', label: 'Steve Hero 🟩', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Steve' },
  { id: 'alex', label: 'Alex Explorer 🟧', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Alex' },
  { id: 'king', label: 'Diamond King 👑', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=King' },
  { id: 'dragon', label: 'Ender Slayer 🐉', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Dragon' },
  { id: 'robot', label: 'Redstone AI 🤖', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Robot' },
  { id: 'wizard', label: 'Enchanter 🧙‍♂️', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Wizard' },
  { id: 'piglin', label: 'Piglin Warrior 🐷', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Piglin' },
  { id: 'zombie', label: 'Zombie Craft 🧟', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Zombie' },
];

const TIER_OPTIONS = [
  { id: 'PRO Student', label: '✨ PRO Student', desc: 'Dành cho Sinh viên năng động' },
  { id: 'VIP Master', label: '🏆 VIP Master', desc: 'Dành cho Cố vấn & Giảng viên' },
  { id: 'AI Scholar', label: '🤖 AI Scholar', desc: 'Chuyên gia nghiên cứu AI' },
  { id: 'Gold Member', label: '👑 Gold Member', desc: 'Thành viên Vàng cao cấp' },
];

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { themeMode } = useTheme();

  const isDark = themeMode === 'dark';
  const isStudent = user?.roles?.includes('student') || false;

  const [editName, setEditName] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>('');

  useEffect(() => {
    if (user) {
      setEditName(user.full_name || '');
      setSelectedAvatar(user.avatar_url || MINECRAFT_AVATARS[0].url);
      setSelectedTier(user.account_tier || (isStudent ? 'PRO Student' : 'VIP Master'));
    }
  }, [user]);

  const handleSave = () => {
    if (!editName.trim()) {
      message.error('Vui lòng nhập tên hiển thị!');
      return;
    }

    const finalAvatar = customAvatarUrl.trim() || selectedAvatar;

    updateProfile({
      full_name: editName.trim(),
      avatar_url: finalAvatar,
      account_tier: selectedTier,
    });

    message.success('Đã lưu thông tin hồ sơ cá nhân thành công!');
  };

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-[#0F1710] text-[#F2F9F3]' : 'bg-[#FDFBF7] text-slate-900'}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className={`p-6 border-b sticky top-0 z-30 backdrop-blur-md ${
          isDark ? 'bg-[#0F1710]/90 border-minecraft-obsidianBorder' : 'bg-[#FDFBF7]/90 border-amber-900/10'
        }`}>
          <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
            <div>
              <div className="flex items-center gap-2">
                <User className="w-7 h-7 text-emerald-500" />
                <h1 className={`text-2xl font-extrabold m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Hồ Sơ Cá Nhân & Cài Đặt
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1 m-0">
                Tùy chỉnh thông tin người dùng, chọn ảnh đại diện Minecraft và gói thành viên
              </p>
            </div>

            <button
              onClick={handleSave}
              className="btn-voxel-green text-xs px-6 py-2.5 rounded-xl font-extrabold flex items-center gap-2 shadow-voxel"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Thay Đổi</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
          {/* 1. Character & Avatar Section */}
          <div className="card-voxel-3d space-y-6">
            <div className="flex items-center gap-2 border-b-2 border-slate-200 dark:border-minecraft-obsidianBorder pb-3">
              <User className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-extrabold m-0 text-slate-900 dark:text-white">
                Thông Tin Nhân Vật & Avatar
              </h2>
            </div>

            {/* Live Character Preview */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-950/60 border-2 border-minecraft-grassBorder/40">
              <div className="w-20 h-20 rounded-2xl bg-minecraft-grass border-3 border-minecraft-grassBorder text-white font-black text-2xl flex items-center justify-center overflow-hidden shadow-voxel shrink-0">
                {customAvatarUrl || selectedAvatar ? (
                  <img src={customAvatarUrl || selectedAvatar} alt="Avatar Minecraft" className="w-full h-full object-cover" />
                ) : (
                  editName ? editName.charAt(0).toUpperCase() : 'M'
                )}
              </div>

              <div className="space-y-1.5 flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h3 className="text-xl font-extrabold m-0 text-slate-900 dark:text-white">
                    {editName || 'Tên Người Dùng'}
                  </h3>
                  <span className="badge-voxel-green text-xs font-extrabold px-3 py-0.5">
                    ✨ {selectedTier}
                  </span>
                </div>
                <p className="text-xs text-slate-400 m-0">
                  Email đăng ký: <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{user?.email}</span>
                </p>
              </div>
            </div>

            {/* Display Name Input */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                Tên Hiển Thị (Display Name):
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nhập tên hiển thị tùy ý..."
                size="large"
                className="rounded-xl border-2 font-bold text-sm p-3"
              />
            </div>

            {/* Minecraft Avatar Gallery */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Chọn Avatar Chuẩn Minecraft Skin:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MINECRAFT_AVATARS.map((avatar) => {
                  const isSelected = selectedAvatar === avatar.url && !customAvatarUrl;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(avatar.url);
                        setCustomAvatarUrl('');
                      }}
                      className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 text-left ${
                        isSelected
                          ? 'tab-voxel-active border-minecraft-grass'
                          : 'tab-voxel-inactive'
                      }`}
                    >
                      <img src={avatar.url} alt={avatar.label} className="w-10 h-10 rounded-xl shrink-0" />
                      <span className="text-xs font-bold truncate">{avatar.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Avatar URL Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Hoặc nhập Link URL ảnh tùy thích:
              </label>
              <Input
                value={customAvatarUrl}
                onChange={(e) => setCustomAvatarUrl(e.target.value)}
                placeholder="https://example.com/my-skin.png"
                className="rounded-xl border-2 text-xs"
              />
            </div>
          </div>

          {/* 2. Membership Tier & Privileges Card (Clear & High Contrast) */}
          <div className="card-voxel-3d space-y-5 bg-gradient-to-r from-emerald-950/20 via-white dark:via-minecraft-obsidianCard to-slate-50 dark:to-slate-900">
            <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-minecraft-obsidianBorder pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-500" />
                <h2 className="text-base font-extrabold m-0 text-slate-900 dark:text-white">
                  Gói Thành Viên LITA & Đặc Quyền
                </h2>
              </div>
              <span className="badge-voxel-green text-xs font-extrabold px-3 py-1">
                🟢 Lifetime Active
              </span>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Chọn danh hiệu gói tài khoản:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {TIER_OPTIONS.map((tier) => {
                  const isSelected = selectedTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedTier(tier.id)}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                        isSelected
                          ? 'tab-voxel-active'
                          : 'tab-voxel-inactive'
                      }`}
                    >
                      <div className="font-extrabold text-sm">{tier.label}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{tier.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* High Contrast Perks List */}
            <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-slate-900/90 border-2 border-minecraft-grassBorder text-slate-900 dark:text-slate-100 space-y-2.5 text-xs font-bold">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>RAG AI Tutor: Hỏi đáp không giới hạn từ bài giảng môn học</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>AI Planner: Tự động sắp xếp thời gian biểu kế hoạch tuần</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>ChromaDB Vector Search: Tìm kiếm ngữ nghĩa chuẩn xác theo từng trang slide</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Quản lý Khóa học & Bài tập thông minh không giới hạn</span>
              </div>
            </div>
          </div>

          {/* 3. System Security & Verification Info */}
          <div className="card-voxel-3d space-y-3">
            <div className="flex items-center gap-2 border-b-2 border-slate-200 dark:border-minecraft-obsidianBorder pb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-extrabold m-0 text-slate-900 dark:text-white">
                Bảo Mật & Trạng Thái Hệ Thống
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/70">
                <span className="text-slate-500">Email tài khoản:</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{user?.email}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/70">
                <span className="text-slate-500">Xác thực OTP Email:</span>
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-extrabold">
                  <ShieldCheck className="w-4 h-4" /> Đã xác thực ✓
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              className="btn-voxel-green text-sm px-8 py-3 rounded-xl font-extrabold flex items-center gap-2 shadow-voxel"
            >
              <Save className="w-5 h-5" />
              <span>Lưu Thay Đổi Hồ Sơ</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
