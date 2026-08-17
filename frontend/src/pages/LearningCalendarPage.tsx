import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  message,
  Popconfirm,
  Spin,
  Tooltip,
  Checkbox,
  Drawer,
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  StarOutlined,
  BookOutlined,
  AimOutlined,
  UserOutlined,
  FlagOutlined,
  RobotOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  WarningOutlined,
  CheckOutlined,
  FilterOutlined,
  LockOutlined,
  AppstoreOutlined,
  BarsOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isoWeek from 'dayjs/plugin/isoWeek';
import { motion } from 'framer-motion';

dayjs.extend(isBetween);
dayjs.extend(isoWeek);

import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { weeklyPlanService } from '../services/weeklyPlanService';
import { courseService } from '../services/courseService';
import { assignmentService } from '../services/assignmentService';
import {
  CalendarEventType,
  PlanTask,
  PlannerAgentResponseResult,
  TaskPriority,
  TaskStatus,
  UnifiedCalendarEvent,
  WeeklyPlan,
} from '../types/weeklyPlan';

const { TextArea } = Input;

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00',
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_LABELS: Record<string, string> = {
  Monday: 'Thứ Hai (Mon)',
  Tuesday: 'Thứ Ba (Tue)',
  Wednesday: 'Thứ Tư (Wed)',
  Thursday: 'Thứ Năm (Thu)',
  Friday: 'Thứ Sáu (Fri)',
  Saturday: 'Thứ Bảy (Sat)',
  Sunday: 'Chủ Nhật (Sun)',
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Khẩn cấp', color: 'red' },
  URGENT: { label: 'Khẩn cấp', color: 'red' },
  critical: { label: 'Khẩn cấp', color: 'red' },
  high: { label: 'Cao', color: 'orange' },
  HIGH: { label: 'Cao', color: 'orange' },
  medium: { label: 'Trung bình', color: 'blue' },
  MEDIUM: { label: 'Trung bình', color: 'blue' },
  low: { label: 'Thấp', color: 'green' },
  LOW: { label: 'Thấp', color: 'green' },
};

export const LearningCalendarPage: React.FC = () => {
  const { themeMode } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDark = themeMode === 'dark';

  // Navigation Date (default current Monday)
  const [currentMonday, setCurrentMonday] = useState<dayjs.Dayjs>(() => {
    const today = dayjs();
    return today.startOf('isoWeek');
  });

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState<boolean>(true);
  const [events, setEvents] = useState<UnifiedCalendarEvent[]>([]);

  // Legend Filter Toggles
  const [showFixedClass, setShowFixedClass] = useState<boolean>(true);
  const [showAIPlan, setShowAIPlan] = useState<boolean>(true);
  const [showStudentPlan, setShowStudentPlan] = useState<boolean>(true);

  // Selected Task Drawer State
  const [selectedTask, setSelectedTask] = useState<PlanTask | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState<boolean>(false);
  const [activeChecklist, setActiveChecklist] = useState<string[]>([]);
  const [reflectionForm] = Form.useForm();
  const [submittingReflection, setSubmittingReflection] = useState<boolean>(false);

  // Create Task Modal State
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState<boolean>(false);
  const [creatingTask, setCreatingTask] = useState<boolean>(false);
  const [createTaskForm] = Form.useForm();

  // AI Planner Modal State
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [generatingAI, setGeneratingAI] = useState<boolean>(false);
  const [aiPromptText, setAiPromptText] = useState<string>('');
  const [aiResult, setAiResult] = useState<PlannerAgentResponseResult | null>(null);

  // Fetch Unified Calendar Data
  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const weekStartStr = currentMonday.format('YYYY-MM-DD');
      const data = await weeklyPlanService.getUnifiedCalendar(weekStartStr);
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to load unified calendar:', err);
      message.error('Không thể tải lịch học và kế hoạch.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonday]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (ev.type === 'FIXED_CLASS' && !showFixedClass) return false;
      if (ev.type === 'AI_STUDY' && !showAIPlan) return false;
      if (ev.type === 'STUDENT_STUDY' && !showStudentPlan) return false;
      return true;
    });
  }, [events, showFixedClass, showAIPlan, showStudentPlan]);

  // Map events by day and time slot
  const eventMap = useMemo(() => {
    const map: Record<string, UnifiedCalendarEvent[]> = {};
    filteredEvents.forEach((ev) => {
      const key = `${ev.day_of_week}_${ev.start_time.substring(0, 2)}:00`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [filteredEvents]);

  // Handlers for Week Navigation
  const handlePrevWeek = () => setCurrentMonday((prev) => prev.subtract(1, 'week'));
  const handleNextWeek = () => setCurrentMonday((prev) => prev.add(1, 'week'));
  const handleToday = () => setCurrentMonday(dayjs().startOf('isoWeek'));

  // Event Click Handler
  const handleEventClick = (event: UnifiedCalendarEvent) => {
    if (event.type === 'FIXED_CLASS' && event.course_id) {
      navigate(`/courses/${event.course_id}`);
    } else if (event.task_data) {
      setSelectedTask(event.task_data);
      setActiveChecklist(event.task_data.completed_activities || []);
      setIsTaskDrawerOpen(true);
    }
  };

  // Start Study Session Handler
  const handleStartSession = async (taskId: string) => {
    try {
      await weeklyPlanService.startStudySession(taskId);
    } catch (err: any) {
      console.warn('Start study session status update:', err);
    } finally {
      setIsTaskDrawerOpen(false);
      navigate(`/study-session/${taskId}`);
    }
  };

  // Toggle Activity Checklist Item
  const handleToggleChecklist = async (activity: string) => {
    if (!selectedTask) return;
    const isCompleted = activeChecklist.includes(activity);
    const newChecklist = isCompleted
      ? activeChecklist.filter((a) => a !== activity)
      : [...activeChecklist, activity];

    setActiveChecklist(newChecklist);
    try {
      const updated = await weeklyPlanService.updateTaskChecklist(selectedTask.id, newChecklist);
      setSelectedTask(updated);
    } catch (err: any) {
      console.error('Failed to update checklist:', err);
    }
  };

  // Submit Session Reflection
  const handleSaveReflection = async (values: any) => {
    if (!selectedTask) return;
    setSubmittingReflection(true);
    try {
      const updated = await weeklyPlanService.saveTaskReflection(selectedTask.id, values);
      setSelectedTask(updated);
      message.success('Đã hoàn thành và lưu phản hồi buổi học!');
      fetchCalendarData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể lưu phản hồi.');
    } finally {
      setSubmittingReflection(false);
    }
  };

  // Create Task Handler
  const handleCreateTask = async (values: any) => {
    setCreatingTask(true);
    try {
      const weekStartStr = currentMonday.format('YYYY-MM-DD');
      let currentPlan: WeeklyPlan | null = null;
      try {
        const plans = await weeklyPlanService.getWeeklyPlans();
        currentPlan = plans.find((p) => dayjs(p.week_start_date).format('YYYY-MM-DD') === weekStartStr) || null;
      } catch (e) {
        // plan not found
      }

      if (!currentPlan) {
        currentPlan = await weeklyPlanService.createWeeklyPlan({
          title: `Kế hoạch học tập (${weekStartStr})`,
          week_start_date: weekStartStr,
          status: 'ACTIVE',
        });
      }

      const payload = {
        title: values.title,
        description: values.description,
        topic: values.topic || values.title,
        scheduled_date: values.scheduled_date ? dayjs(values.scheduled_date).format('YYYY-MM-DD') : weekStartStr,
        start_time: values.start_time,
        end_time: values.end_time,
        priority: values.priority || 'medium',
        estimated_duration: values.estimated_duration || 60,
        source_type: 'MANUAL' as const,
      };

      await weeklyPlanService.createTask(currentPlan.id, payload);
      message.success('Tạo nhiệm vụ học tập thành công!');
      setIsCreateTaskModalOpen(false);
      createTaskForm.resetFields();
      fetchCalendarData();
    } catch (err: any) {
      console.error('Create task error:', err);
      message.error(err.response?.data?.detail || 'Không thể tạo nhiệm vụ.');
    } finally {
      setCreatingTask(false);
    }
  };

  // AI Plan Generation Handler
  const handleGenerateAIPlan = async () => {
    setGeneratingAI(true);
    setAiResult(null);
    try {
      const weekStartStr = currentMonday.format('YYYY-MM-DD');
      const res = await weeklyPlanService.generateAIPlan({
        user_message: aiPromptText.trim() || 'Lên kế hoạch học tập tự động cho tuần này.',
        week_start: weekStartStr,
      });
      setAiResult(res);
      message.success('AI đã tạo kế hoạch học tập tối ưu thành công!');
      fetchCalendarData();
    } catch (err: any) {
      console.error('AI plan error:', err);
      message.error(err.response?.data?.detail || 'Lỗi khi gọi AI Planner Agent.');
    } finally {
      setGeneratingAI(false);
    }
  };

  const weekEndStr = currentMonday.add(6, 'day').format('DD/MM/YYYY');
  const weekStartStrDisplay = currentMonday.format('DD/MM/YYYY');

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Bar Header */}
        <header className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 font-bold text-lg">
                  <CalendarOutlined />
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white m-0">
                  My Learning Calendar
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0">
                Thời khóa biểu giảng đường cố định & Kế hoạch học tập cá nhân hóa do AI đồng hành
              </p>
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setIsAIModalOpen(true)}
                className="btn-voxel-green text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm"
              >
                <RobotOutlined />
                <span>Tạo Kế Hoạch AI</span>
              </button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateTaskModalOpen(true)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold h-9"
              >
                Thêm Nhiệm Vụ
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
          {/* Controls & Legend Bar */}
          <div className={`p-4 rounded-2xl border shadow-sm space-y-4 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Week Navigation */}
              <div className="flex items-center gap-2">
                <Button icon={<LeftOutlined />} onClick={handlePrevWeek} size="small" className="rounded-lg" />
                <button
                  onClick={handleToday}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Hôm nay
                </button>
                <Button icon={<RightOutlined />} onClick={handleNextWeek} size="small" className="rounded-lg" />
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 ml-2 font-mono">
                  {weekStartStrDisplay} – {weekEndStr}
                </span>
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'day' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                  }`}
                >
                  Ngày
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'week' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                  }`}
                >
                  Tuần
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'month' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                  }`}
                >
                  Tháng
                </button>
              </div>
            </div>

            {/* Legend & Filter Toggles Area */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 flex-wrap text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FilterOutlined /> Chú thích & Lọc:
              </span>

              <label className="flex items-center gap-2 cursor-pointer font-bold select-none px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <Checkbox checked={showFixedClass} onChange={(e) => setShowFixedClass(e.target.checked)} />
                <span>🏫 Fixed Class (Giảng đường cố định)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold select-none px-3 py-1 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                <Checkbox checked={showAIPlan} onChange={(e) => setShowAIPlan(e.target.checked)} />
                <span>🤖 AI Planned (Kế hoạch AI đề xuất)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold select-none px-3 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Checkbox checked={showStudentPlan} onChange={(e) => setShowStudentPlan(e.target.checked)} />
                <span>👤 My Plan (Kế hoạch cá nhân tự xếp)</span>
              </label>
            </div>
          </div>

          {/* Calendar Grid View */}
          {loading ? (
            <div className="p-20 text-center">
              <Spin size="large" />
              <p className="text-xs text-slate-400 mt-3 font-semibold">Đang đồng bộ Lịch học và Kế hoạch học tập...</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-sm">
              <div className="min-w-[900px]">
                {/* Day Header Row */}
                <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 font-bold text-xs">
                  <div className="p-3 text-center text-slate-400 border-r border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                    Khung giờ
                  </div>
                  {DAY_NAMES.map((dayName, idx) => {
                    const dayDate = currentMonday.add(idx, 'day');
                    const isToday = dayDate.isSame(dayjs(), 'day');

                    return (
                      <div
                        key={dayName}
                        className={`p-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${
                          isToday ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="uppercase tracking-wider">{DAY_LABELS[dayName]}</div>
                        <div className="text-base font-extrabold font-mono mt-0.5">{dayDate.format('DD/MM')}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Slot Rows */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {TIME_SLOTS.map((slot) => (
                    <div key={slot} className="grid grid-cols-8 min-h-[90px]">
                      {/* Time Column */}
                      <div className="p-2 text-center text-xs font-mono font-bold text-slate-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30 flex items-start justify-center pt-3">
                        {slot}
                      </div>

                      {/* Day Columns */}
                      {DAY_NAMES.map((dayName) => {
                        const cellKey = `${dayName}_${slot}`;
                        const cellEvents = eventMap[cellKey] || [];

                        return (
                          <div
                            key={dayName}
                            className="p-1.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0 space-y-1.5 relative group hover:bg-slate-500/5 transition-colors"
                          >
                            {cellEvents.map((ev) => {
                              const isFixed = ev.type === 'FIXED_CLASS';
                              const isAI = ev.type === 'AI_STUDY';

                              return (
                                <motion.div
                                  key={ev.id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  onClick={() => handleEventClick(ev)}
                                  className={`p-2.5 rounded-2xl border text-xs cursor-pointer shadow-sm transition-all hover:scale-[1.02] ${
                                    isFixed
                                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 hover:border-emerald-500'
                                      : isAI
                                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-900 dark:text-indigo-200 hover:border-indigo-500'
                                      : 'bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200 hover:border-amber-500'
                                  }`}
                                >
                                  {/* Badge Header */}
                                  <div className="flex items-center justify-between gap-1 mb-1 font-bold text-[10px]">
                                    <span
                                      className={`px-2 py-0.5 rounded-lg border font-bold uppercase tracking-wider ${
                                        isFixed
                                          ? 'bg-emerald-500 text-white border-transparent'
                                          : isAI
                                          ? 'bg-indigo-600 text-white border-transparent'
                                          : 'bg-amber-500 text-white border-transparent'
                                      }`}
                                    >
                                      {isFixed ? '🏫 Fixed Class' : isAI ? '🤖 AI Planned' : '👤 My Plan'}
                                    </span>
                                    {isFixed && (
                                      <Tooltip title="Lịch học cố định giảng đường (Hard constraint - Không thể sửa/kéo)">
                                        <LockOutlined className="text-emerald-600 dark:text-emerald-400" />
                                      </Tooltip>
                                    )}
                                  </div>

                                  <div className="font-extrabold line-clamp-2 text-slate-900 dark:text-white leading-tight">
                                    {ev.title}
                                  </div>

                                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300">
                                    <span>{ev.start_time} – {ev.end_time}</span>
                                    {ev.priority && (
                                      <span className="font-bold text-[10px] uppercase">
                                        {PRIORITY_CONFIG[ev.priority]?.label || ev.priority}
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Task Execution & Reflection Drawer */}
      <Drawer
        open={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        width={560}
        title={
          <div className="flex items-center gap-2">
            <span className="text-indigo-500"><BookOutlined /></span>
            <span className="font-extrabold text-base">Chi Tiết Buổi Học & Thực Hành</span>
          </div>
        }
        className="dark:bg-slate-900 dark:text-slate-100"
      >
        {selectedTask && (
          <div className="space-y-6 text-xs">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <Tag color={selectedTask.source_type === 'MANUAL' ? 'gold' : 'indigo'} className="rounded-lg font-bold">
                  {selectedTask.source_type === 'MANUAL' ? '👤 My Plan' : '🤖 AI Planned'}
                </Tag>
                <Tag color={selectedTask.status === 'completed' ? 'success' : selectedTask.status === 'in_progress' ? 'processing' : 'default'}>
                  {selectedTask.status.toUpperCase()}
                </Tag>
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white m-0">
                {selectedTask.title}
              </h3>
              <p className="text-slate-500 m-0 leading-relaxed">
                {selectedTask.description || selectedTask.topic}
              </p>

              {selectedTask.course_name && (
                <div className="pt-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                  <BookOutlined /> Môn học: {selectedTask.course_name}
                </div>
              )}
            </div>

            {/* What to study & What to do */}
            {selectedTask.what_to_study && selectedTask.what_to_study.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-slate-400 m-0">📚 Nội dung cần ôn tập</h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                  {selectedTask.what_to_study.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Checklist */}
            {selectedTask.what_to_do && selectedTask.what_to_do.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-slate-400 m-0">✅ Checklist hành động cụ thể</h4>
                <div className="space-y-2">
                  {selectedTask.what_to_do.map((act, idx) => {
                    const isChecked = activeChecklist.includes(act);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleChecklist(act)}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <Checkbox checked={isChecked} disabled />
                        <span className={isChecked ? 'line-through text-slate-400' : ''}>{act}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Start / Complete buttons */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
              {selectedTask.status !== 'completed' && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleStartSession(selectedTask.id)}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                >
                  Bắt Đầu Buổi Học
                </Button>
              )}
            </div>

            {/* Reflection Form if completed or active */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold uppercase tracking-wider text-slate-400 m-0">📝 Phản hồi & Đánh giá buổi học</h4>
              <Form
                form={reflectionForm}
                layout="vertical"
                initialValues={selectedTask.reflection_data || {}}
                onFinish={handleSaveReflection}
              >
                <Form.Item name="what_learned" label="Bạn đã học và nắm được điều gì mới?">
                  <TextArea rows={2} className="rounded-xl" placeholder="Tóm tắt ngắn gọn điều tiếp thu được..." />
                </Form.Item>

                <Form.Item name="struggling_with" label="Điều gì bạn vẫn chưa hiểu rõ / cần hỗ trợ thêm?">
                  <TextArea rows={2} className="rounded-xl" placeholder="Những chỗ thắc mắc hoặc khó hiểu..." />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submittingReflection}
                  icon={<CheckOutlined />}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold w-full"
                >
                  Hoàn Thành Buổi Học & Lưu Phản Hồi
                </Button>
              </Form>
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Task Modal */}
      <Modal
        open={isCreateTaskModalOpen}
        onCancel={() => setIsCreateTaskModalOpen(false)}
        footer={null}
        title={<span className="font-extrabold text-base">➕ Thêm Nhiệm Vụ Học Tập Thường Quy</span>}
        centered
        className="rounded-2xl overflow-hidden"
      >
        <Form form={createTaskForm} layout="vertical" onFinish={handleCreateTask} className="pt-3">
          <Form.Item name="title" label="Tên nhiệm vụ / Buổi học" rules={[{ required: true, message: 'Vui lòng nhập tên nhiệm vụ' }]}>
            <Input placeholder="Ví dụ: Ôn tập thuật toán Sắp xếp" className="rounded-xl" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="scheduled_date" label="Ngày học">
              <DatePicker className="w-full rounded-xl" format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item name="priority" label="Độ ưu tiên" initialValue="medium">
              <Select className="rounded-xl" options={[
                { label: 'Khẩn cấp', value: 'urgent' },
                { label: 'Cao', value: 'high' },
                { label: 'Trung bình', value: 'medium' },
                { label: 'Thấp', value: 'low' },
              ]} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="start_time" label="Giờ bắt đầu (HH:MM)" rules={[{ required: true, message: 'Nhập giờ bắt đầu' }]}>
              <Input placeholder="19:00" className="rounded-xl" />
            </Form.Item>

            <Form.Item name="end_time" label="Giờ kết thúc (HH:MM)" rules={[{ required: true, message: 'Nhập giờ kết thúc' }]}>
              <Input placeholder="20:30" className="rounded-xl" />
            </Form.Item>
          </div>

          <Form.Item name="description" label="Mô tả / Ghi chú">
            <TextArea rows={2} placeholder="Nội dung cần chuẩn bị..." className="rounded-xl" />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-3">
            <Button onClick={() => setIsCreateTaskModalOpen(false)} className="rounded-xl">Hủy</Button>
            <Button type="primary" htmlType="submit" loading={creatingTask} className="rounded-xl bg-indigo-600">
              Lưu Nhiệm Vụ
            </Button>
          </div>
        </Form>
      </Modal>

      {/* AI Plan Generator Modal */}
      <Modal
        open={isAIModalOpen}
        onCancel={() => setIsAIModalOpen(false)}
        footer={null}
        width={600}
        title={
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <RobotOutlined className="text-xl" />
            <span className="font-extrabold text-base">Tạo Kế Hoạch Học Tập Tối Ưu Bằng AI</span>
          </div>
        }
        centered
      >
        <div className="space-y-4 pt-2 text-xs">
          <p className="text-slate-500 m-0 leading-relaxed">
            AI Companion sẽ tự động phân tích <strong>Lịch học cố định giảng đường</strong>, các <strong>Bài tập sắp tới</strong>, và <strong>Mục tiêu cá nhân</strong> của bạn để đề xuất khung giờ học tối ưu không bị trùng lặp.
          </p>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Yêu cầu hoặc định hướng riêng cho tuần này (Không bắt buộc):
            </label>
            <TextArea
              rows={3}
              value={aiPromptText}
              onChange={(e) => setAiPromptText(e.target.value)}
              placeholder="Ví dụ: Tập trung ôn tập môn Machine Learning vào tối thứ 3 và thứ 5..."
              className="rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setIsAIModalOpen(false)} className="rounded-xl">Đóng</Button>
            <button
              disabled={generatingAI}
              onClick={handleGenerateAIPlan}
              className="btn-voxel-green text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-2"
            >
              {generatingAI ? <Spin size="small" /> : <RocketOutlined />}
              <span>{generatingAI ? 'Đang Tính Toán...' : 'Kích Hoạt AI Lập Lịch'}</span>
            </button>
          </div>

          {aiResult && (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2 mt-4">
              <div className="font-extrabold text-indigo-700 dark:text-indigo-300 text-sm">
                🎉 Kế hoạch AI đề xuất
              </div>
              <p className="text-slate-700 dark:text-slate-300 m-0">{aiResult.summary}</p>
              <div className="text-slate-500 font-bold">Đã tạo {aiResult.created_tasks?.length || 0} buổi học mới!</div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
