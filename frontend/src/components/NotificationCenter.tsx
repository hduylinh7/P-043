import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
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
  const { user, isAuthenticated } = useAuth();
  const { themeMode } = useTheme();
  const navigate = useNavigate();

  const isInstructor = user?.roles?.some(r => ['instructor', 'admin', 'ta', 'teacher'].includes(r.toLowerCase())) || false;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isDark = themeMode === 'dark';

  const fetchNotifications = async () => {
    if (!isAuthenticated || isInstructor) return;
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || isInstructor) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [isAuthenticated, isInstructor]);

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
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
          label: 'LỊCH HỌC',
          actionText: 'Xem lịch học',
        };
      case 'AI_STUDY_SESSION':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
          label: 'PHIÊN HỌC AI',
          actionText: 'Vào phiên học',
        };
      case 'STUDENT_STUDY_SESSION':
      case 'STUDENT_SESSION':
        return {
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
          label: 'NHIỆM VỤ',
          actionText: 'Xem chi tiết',
        };
      case 'ASSIGNMENT_DEADLINE':
      case 'ASSIGNMENT_DUE':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
          label: 'HẠN NỘP BÀI TẬP',
          actionText: 'Xem bài tập',
        };
      default:
        return {
          bg: 'bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400',
          label: 'THÔNG BÁO',
          actionText: 'Xem chi tiết',
        };
    }
  };

  if (!isAuthenticated || isInstructor) return null;

  return (
    <div className="relative inline-block text-left" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all duration-200 focus:outline-none ${
          isOpen
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
            : isDark
            ? 'bg-minecraft-obsidianCard hover:bg-emerald-950/60 border-minecraft-obsidianBorder text-slate-300'
            : 'bg-white hover:bg-emerald-50 border-amber-900/15 text-slate-700 shadow-sm'
        }`}
        title="Thông báo"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border-2 shadow-xl z-50 overflow-hidden ${
              isDark
                ? 'bg-[#0F1710] border-minecraft-obsidianBorder text-slate-100'
                : 'bg-white border-amber-900/15 text-slate-900'
            }`}
          >
            {/* Panel Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between ${
              isDark ? 'border-minecraft-obsidianBorder bg-minecraft-obsidianCard' : 'border-slate-100 bg-slate-50/80'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Thông báo</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium"
                  >
                    Đọc tất cả
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleDeleteAllNotifications}
                    className="text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
                  >
                    Xóa hết
                  </button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <p className="text-xs font-medium m-0">Chưa có thông báo nào</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isRead = notif.payload?.is_read;
                  const badge = getNotificationBadge(notif.notification_type);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 transition-colors cursor-pointer group relative hover:bg-slate-50 dark:hover:bg-slate-900/50 ${
                        !isRead
                          ? isDark
                            ? 'bg-emerald-950/20'
                            : 'bg-emerald-50/50'
                          : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div className="min-w-0 pr-6">
                        {/* Top row: Type Badge + Timestamp */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatRelativeDate(notif.scheduled_at || notif.created_at || '')}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className={`text-sm font-bold leading-snug mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {notif.payload?.title || 'Thông báo'}
                        </h4>

                        {/* Message content */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2.5 m-0">
                          {notif.payload?.message}
                        </p>

                        {/* Action text */}
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                          <span>{badge.actionText} →</span>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          )}
                        </div>
                      </div>

                      {/* Single Notification Delete Button */}
                      <button
                        onClick={(e) => handleDeleteNotification(e, notif.id)}
                        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-500 text-slate-400 transition-all text-xs"
                        title="Xóa thông báo"
                      >
                        ✕
                      </button>
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

export default NotificationCenter;
