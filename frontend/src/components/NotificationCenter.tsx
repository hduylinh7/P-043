import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Clock,
  BookOpen,
  Bot,
  User,
  FileText,
  ChevronRight,
  X,
  Trash2,
  Calendar,
} from 'lucide-react';
import { notificationService, AppNotification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const formatRelativeDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Hôm nay, ${timeStr}`;
  }
  if (isYesterday) {
    return `Hôm qua, ${timeStr}`;
  }
  if (date.getFullYear() === now.getFullYear()) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month} lúc ${timeStr}`;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

export const NotificationCenter: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { themeMode } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isDark = themeMode === 'dark';

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Click outside listener for closing popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.payload?.is_read).length;

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.payload?.is_read) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notif.id
              ? { ...item, payload: { ...(item.payload || {}), is_read: true } as any }
              : item
          )
        );
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    setIsOpen(false);
    if (notif.payload?.link) {
      navigate(notif.payload.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          payload: { ...(item.payload || {}), is_read: true } as any,
        }))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(notifId);
      setNotifications((prev) => prev.filter((item) => item.id !== notifId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await notificationService.deleteAllNotifications();
      setNotifications([]);
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'FIXED_CLASS':
        return {
          icon: BookOpen,
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
          label: '🏫 Lịch học cố định',
          actionText: 'Xem lịch học',
        };
      case 'AI_STUDY_SESSION':
        return {
          icon: Bot,
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
          label: '🤖 AI Study Session',
          actionText: 'Vào phiên học',
        };
      case 'STUDENT_STUDY_SESSION':
      case 'STUDENT_SESSION':
        return {
          icon: User,
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-500',
          label: '👤 Nhiệm vụ cá nhân',
          actionText: 'Xem chi tiết',
        };
      case 'ASSIGNMENT_DEADLINE':
      case 'ASSIGNMENT_DUE':
        return {
          icon: FileText,
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
          label: '📝 Hạn nộp bài tập',
          actionText: 'Xem bài tập',
        };
      default:
        return {
          icon: Bell,
          bg: 'bg-slate-500/10 border-slate-500/30 text-slate-500',
          label: '🔔 Thông báo',
          actionText: 'Xem chi tiết',
        };
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative inline-block text-left" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all duration-200 focus:outline-none ${
          isOpen
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
            : isDark
            ? 'bg-minecraft-obsidianCard hover:bg-emerald-950/60 border-minecraft-obsidianBorder text-slate-300'
            : 'bg-white hover:bg-emerald-50 border-amber-900/15 text-slate-700 shadow-sm'
        }`}
        title="Thông báo hệ thống"
      >
        <Bell className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>



      {/* Notifications Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border-2 shadow-2xl z-50 overflow-hidden ${
              isDark
                ? 'bg-[#0F1710] border-minecraft-obsidianBorder text-slate-100'
                : 'bg-[#FDFBF7] border-amber-900/15 text-slate-900'
            }`}
          >
            {/* Panel Header */}
            <div className={`p-3.5 border-b flex items-center justify-between ${isDark ? 'border-minecraft-obsidianBorder bg-minecraft-obsidianCard' : 'border-amber-900/10 bg-emerald-50/50'}`}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-500" />
                <h3 className="font-extrabold text-sm tracking-wide m-0">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-500 rounded-full border border-emerald-500/30">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-slate-400 hover:text-emerald-500 transition-colors flex items-center gap-1 font-medium"
                    title="Đánh dấu tất cả là đã đọc"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Đọc tất cả</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleDeleteAllNotifications}
                    className="text-xs text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 font-medium"
                    title="Xóa tất cả thông báo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa hết</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-500/10">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">Chưa có thông báo nào</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isRead = notif.payload?.is_read;
                  const badge = getNotificationBadge(notif.notification_type);
                  const Icon = badge.icon;

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 transition-colors cursor-pointer group relative hover:bg-emerald-500/10 ${
                        !isRead
                          ? isDark
                            ? 'bg-emerald-950/20 border-l-4 border-l-emerald-500'
                            : 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${badge.bg}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {badge.label}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" />
                              {formatRelativeDate(notif.scheduled_at || notif.created_at || '')}
                            </span>
                          </div>

                          <h4 className={`text-xs font-bold leading-tight mb-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {notif.payload?.title || 'Thông báo'}
                          </h4>

                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
                            {notif.payload?.message}
                          </p>

                          <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-emerald-500 group-hover:translate-x-0.5 transition-transform">
                            <span className="flex items-center gap-1">
                              {badge.actionText} <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            )}
                          </div>
                        </div>

                        {/* Single Notification Delete Button */}
                        <button
                          onClick={(e) => handleDeleteNotification(e, notif.id)}
                          className="absolute top-3.5 right-3 p-1 rounded-lg opacity-40 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-500 text-slate-400 transition-all"
                          title="Xóa thông báo này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
