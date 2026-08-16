import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Tag, Empty, Button, Popconfirm, message, Tooltip } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  BookOutlined,
  UserOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import { Sidebar } from '../components/Sidebar';
import { courseService } from '../services/courseService';
import { TimetableEntry } from '../types/course';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DAY_LABELS: Record<string, string> = {
  Monday: 'Thứ Hai (Mon)',
  Tuesday: 'Thứ Ba (Tue)',
  Wednesday: 'Thứ Tư (Wed)',
  Thursday: 'Thứ Năm (Thu)',
  Friday: 'Thứ Sáu (Fri)',
  Saturday: 'Thứ Bảy (Sat)',
  Sunday: 'Chủ Nhật (Sun)',
};

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00',
];

const COURSE_COLOR_SCHEMES = [
  {
    bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200',
    tag: 'bg-emerald-500 text-white',
    badge: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  },
  {
    bg: 'bg-blue-500/15 border-blue-500/40 text-blue-900 dark:text-blue-200',
    tag: 'bg-blue-500 text-white',
    badge: 'border-blue-500/50 bg-blue-500/20 text-blue-700 dark:text-blue-300',
  },
  {
    bg: 'bg-purple-500/15 border-purple-500/40 text-purple-900 dark:text-purple-200',
    tag: 'bg-purple-500 text-white',
    badge: 'border-purple-500/50 bg-purple-500/20 text-purple-700 dark:text-purple-300',
  },
  {
    bg: 'bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200',
    tag: 'bg-amber-500 text-white',
    badge: 'border-amber-500/50 bg-amber-500/20 text-amber-700 dark:text-amber-300',
  },
  {
    bg: 'bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-200',
    tag: 'bg-rose-500 text-white',
    badge: 'border-rose-500/50 bg-rose-500/20 text-rose-700 dark:text-rose-300',
  },
  {
    bg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-900 dark:text-cyan-200',
    tag: 'bg-cyan-500 text-white',
    badge: 'border-cyan-500/50 bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
  },
];

export const TimetablePage: React.FC = () => {
  const { themeMode } = useTheme();
  const navigate = useNavigate();
  const isDark = themeMode === 'dark';

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const data = await courseService.getStudentTimetable();
      setTimetable(data);
    } catch (err: any) {
      console.error('Failed to fetch student timetable:', err);
      message.error('Không thể tải thời khóa biểu sinh viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const handleLeaveCourse = async (courseId: string) => {
    setLeavingId(courseId);
    try {
      await courseService.leaveCourse(courseId);
      message.success('Đã hủy đăng ký môn học.');
      fetchTimetable();
    } catch (err: any) {
      console.error('Failed to leave course:', err);
      message.error(err.response?.data?.detail || 'Không thể rời khóa học.');
    } finally {
      setLeavingId(null);
    }
  };

  // Assign distinct colors per unique course_id
  const uniqueCourseIds = Array.from(new Set(timetable.map((t) => t.course_id)));
  const courseColorMap: Record<string, typeof COURSE_COLOR_SCHEMES[0]> = {};
  uniqueCourseIds.forEach((id, idx) => {
    courseColorMap[id] = COURSE_COLOR_SCHEMES[idx % COURSE_COLOR_SCHEMES.length];
  });

  const parseMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-[#0F1710] text-[#F2F9F3]' : 'bg-[#FDFBF7] text-slate-900'}`}>
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <header className={`px-6 py-5 border-b sticky top-0 z-10 backdrop-blur-md flex items-center justify-between ${
          isDark ? 'bg-[#0F1710]/90 border-minecraft-obsidianBorder' : 'bg-[#FDFBF7]/90 border-amber-900/10'
        }`}>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight m-0">Thời Khóa Biểu Sinh Viên</h1>
              <span className="badge-voxel-green text-xs">
                Lịch Học Cố Định
              </span>
            </div>
            <p className={`text-xs mt-1.5 m-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Lịch học chính thức cố định trên lớp theo đăng ký môn học của bạn tại trường.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/courses')}
              className="btn-voxel-green text-xs px-4 py-2 flex items-center gap-2"
            >
              <CompassOutlined />
              <span>Đăng Ký Khóa Học</span>
            </button>
          </div>
        </header>

        <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Info Banner */}
          <div className={`card-voxel-3d p-4 flex items-start gap-3.5 text-xs ${
            isDark ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <InfoCircleOutlined className="text-lg text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold m-0 text-sm">Phân biệt Thời khóa biểu & Kế hoạch học tập (Study Plan)</p>
              <p className="m-0 leading-relaxed opacity-90">
                • <strong>Thời khóa biểu chính thức</strong>: Lịch học giảng đường cố định do trường xếp. Bạn phải đi học đúng khung giờ này.<br />
                • <strong>Study Plan (Kế hoạch học tập)</strong>: Các buổi tự học cá nhân linh hoạt được AI Learning Companion đề xuất riêng dựa trên thời gian rảnh của bạn.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <Spin size="large" />
              <p className="text-sm mt-3 text-slate-400">Đang tải thời khóa biểu...</p>
            </div>
          ) : timetable.length === 0 ? (
            <div className="py-16 bg-white dark:bg-minecraft-obsidianCard rounded-3xl border-2 border-minecraft-grassBorder/40 dark:border-minecraft-obsidianBorder text-center shadow-voxel-sm shadow-minecraft-grassBorder/20 space-y-4">
              <Empty
                description={
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                    Bạn chưa đăng ký môn học nào hoặc các môn học chưa có lịch học chính thức.
                  </span>
                }
              />
              <button
                onClick={() => navigate('/courses')}
                className="btn-voxel-green text-xs px-5 py-2.5 inline-flex items-center gap-2"
              >
                <BookOutlined />
                <span>Khám Phá Danh Sách Khóa Học</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Badges of Enrolled Courses */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Môn học đã đăng ký ({uniqueCourseIds.length}):
                </span>
                {Array.from(
                  new Map(timetable.map((item) => [item.course_id, item])).values()
                ).map((c) => {
                  const color = courseColorMap[c.course_id] || COURSE_COLOR_SCHEMES[0];
                  return (
                    <div
                      key={c.course_id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 font-bold text-xs shadow-voxel-sm ${color.badge}`}
                    >
                      <span>{c.course_code} — {c.course_name}</span>
                      <span className="text-[10px] opacity-80">({c.credits} tín chỉ)</span>
                      <Popconfirm
                        title="Hủy đăng ký môn học"
                        description={`Bạn có chắc chắn muốn rời khỏi môn ${c.course_code}?`}
                        onConfirm={() => handleLeaveCourse(c.course_id)}
                        okText="Hủy đăng ký"
                        cancelText="Quay lại"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Rời khóa học">
                          <button className="hover:text-rose-500 transition-colors ml-1">
                            <DeleteOutlined className="text-xs" />
                          </button>
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  );
                })}
              </div>

              {/* TIMETABLE WEEKLY GRID */}
              <div className="card-voxel-3d p-0 overflow-hidden">
                {/* Header Days of Week */}
                <div className={`grid grid-cols-8 border-b text-center font-bold text-xs tracking-wider uppercase sticky top-0 z-20 ${
                  isDark ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  <div className="py-3 px-2 border-r border-slate-700/30 flex items-center justify-center text-slate-400 font-mono">
                    Giờ
                  </div>
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="py-3 px-1 border-r border-slate-700/20 last:border-r-0 flex flex-col items-center justify-center"
                    >
                      <span>{DAY_LABELS[day]}</span>
                    </div>
                  ))}
                </div>

                {/* Grid Rows for Time Slots */}
                <div className="divide-y divide-slate-800/40 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {TIME_SLOTS.map((slot) => {
                    const slotMins = parseMins(slot);

                    return (
                      <div key={slot} className="grid grid-cols-8 h-[90px] transition-colors hover:bg-emerald-500/[0.02]">
                        {/* Time slot label */}
                        <div className={`p-2 text-xs font-mono border-r border-slate-700/20 flex items-start justify-center font-bold ${
                          isDark ? 'text-slate-400 bg-slate-950/40' : 'text-slate-500 bg-slate-50'
                        }`}>
                          {slot}
                        </div>

                        {/* Columns for days */}
                        {DAYS_OF_WEEK.map((day) => {
                          // Find entries matching this day and starting in this hour slot (slotMins <= start_time < slotMins + 60)
                          const dayEntries = timetable.filter((item) => {
                            if (item.day_of_week.toLowerCase() !== day.toLowerCase()) return false;
                            const startM = parseMins(item.start_time);
                            return startM >= slotMins && startM < slotMins + 60;
                          });

                          return (
                            <div
                              key={day}
                              className="p-1 border-r border-slate-700/20 last:border-r-0 relative group"
                            >
                              {dayEntries.map((entry) => {
                                const scheme = courseColorMap[entry.course_id] || COURSE_COLOR_SCHEMES[0];
                                const startM = parseMins(entry.start_time);
                                const endM = parseMins(entry.end_time);
                                const durationMins = endM - startM;
                                const offsetMins = startM - slotMins;

                                const topPx = (offsetMins / 60) * 90;
                                const heightPx = Math.max((durationMins / 60) * 90 - 4, 40);

                                return (
                                  <motion.div
                                    key={`${entry.course_id}-${entry.day_of_week}-${entry.start_time}`}
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    onClick={() => navigate(`/courses/${entry.course_id}`)}
                                    style={{
                                      top: `${topPx}px`,
                                      height: `${heightPx}px`,
                                    }}
                                    className={`absolute left-1 right-1 z-10 p-2.5 rounded-xl border-2 font-bold shadow-voxel-sm cursor-pointer hover:scale-[1.02] transition-transform overflow-hidden flex flex-col justify-between ${scheme.bg}`}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/20 text-white font-extrabold tracking-wider truncate">
                                          {entry.course_code}
                                        </span>
                                        <span className="text-[10px] font-mono font-bold opacity-90">
                                          {entry.start_time}–{entry.end_time}
                                        </span>
                                      </div>
                                      <h4 className="text-xs font-extrabold leading-snug line-clamp-1 m-0">
                                        {entry.course_name}
                                      </h4>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] opacity-90 mt-1 pt-1 border-t border-black/10">
                                      <span className="font-semibold truncate">
                                        📍 {entry.room || 'Phòng học TBA'}
                                      </span>
                                      <span className="font-mono font-bold shrink-0">
                                        {entry.credits} TC
                                      </span>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
