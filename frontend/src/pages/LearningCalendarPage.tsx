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
  Badge,
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
  PlannerAssignmentContext,
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

  // Navigation Date (default current date)
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(() => dayjs());

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
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | undefined>(undefined);
  const [availableAssignments, setAvailableAssignments] = useState<PlannerAssignmentContext[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<PlannerAgentResponseResult | null>(null);

  // Current Monday calculated from selectedDate
  const currentMonday = useMemo(() => selectedDate.startOf('isoWeek'), [selectedDate]);

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

  // Fetch Planner Context Assignments when AI Modal Opens
  useEffect(() => {
    if (isAIModalOpen) {
      setLoadingAssignments(true);
      weeklyPlanService
        .getPlannerContext(currentMonday.format('YYYY-MM-DD'))
        .then((ctx) => {
          setAvailableAssignments(ctx.assignments || []);
        })
        .catch((err) => {
          console.warn('Could not fetch planner context for AI modal:', err);
        })
        .finally(() => {
          setLoadingAssignments(false);
        });
    }
  }, [isAIModalOpen, currentMonday]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (ev.type === 'FIXED_CLASS' && !showFixedClass) return false;
      if (ev.type === 'AI_STUDY' && !showAIPlan) return false;
      if (ev.type === 'STUDENT_STUDY' && !showStudentPlan) return false;
      return true;
    });
  }, [events, showFixedClass, showAIPlan, showStudentPlan]);

  // Map events by date (YYYY-MM-DD) and hour slot (HH:00)
  const eventMap = useMemo(() => {
    const map: Record<string, UnifiedCalendarEvent[]> = {};
    filteredEvents.forEach((ev) => {
      const dateKey = ev.scheduled_date ? dayjs(ev.scheduled_date).format('YYYY-MM-DD') : '';
      if (!dateKey) return;

      let hourNum = 9;
      if (ev.start_time) {
        const hourPart = ev.start_time.split(':')[0];
        hourNum = parseInt(hourPart, 10);
      }
      if (isNaN(hourNum)) hourNum = 9;
      const hourSlot = hourNum < 10 ? `0${hourNum}:00` : `${hourNum}:00`;
      const key = `${dateKey}_${hourSlot}`;

      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [filteredEvents]);

  // Handlers for Navigation based on View Mode
  const handlePrev = () => {
    if (viewMode === 'day') setSelectedDate((prev) => prev.subtract(1, 'day'));
    else if (viewMode === 'week') setSelectedDate((prev) => prev.subtract(1, 'week'));
    else if (viewMode === 'month') setSelectedDate((prev) => prev.subtract(1, 'month'));
  };

  const handleNext = () => {
    if (viewMode === 'day') setSelectedDate((prev) => prev.add(1, 'day'));
    else if (viewMode === 'week') setSelectedDate((prev) => prev.add(1, 'week'));
    else if (viewMode === 'month') setSelectedDate((prev) => prev.add(1, 'month'));
  };

  const handleToday = () => setSelectedDate(dayjs());

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
        scheduled_date: values.scheduled_date ? dayjs(values.scheduled_date).format('YYYY-MM-DD') : selectedDate.format('YYYY-MM-DD'),
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

  const [applyingAI, setApplyingAI] = useState<boolean>(false);

  // AI Plan Generation Handler (Preview)
  const handleGenerateAIPlan = async () => {
    setGeneratingAI(true);
    setAiResult(null);
    try {
      const weekStartStr = currentMonday.format('YYYY-MM-DD');
      const res = await weeklyPlanService.generateAIPlan({
        user_message: aiPromptText.trim() || 'Lên kế hoạch học tập tự động cho tuần này.',
        week_start: weekStartStr,
        assignment_id: selectedAssignmentId,
      });
      setAiResult(res);
      message.success('AI đã lập xong dự thảo kế hoạch! Vui lòng đọc kiểm tra và bấm "Chấp nhận" để lưu.');
    } catch (err: any) {
      console.error('AI plan error:', err);
      message.error(err.response?.data?.detail || 'Lỗi khi gọi AI Planner Agent.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Accept and save AI Plan from Calendar Page
  const handleAcceptAIPlan = async () => {
    if (!aiResult) return;
    const tasksToApply = aiResult.proposed_tasks || (aiResult.created_tasks as any) || [];
    if (tasksToApply.length === 0) {
      message.warning('Danh sách nhiệm vụ đề xuất trống.');
      return;
    }
    setApplyingAI(true);
    try {
      const applyPayload = {
        week_start: aiResult.week_start || currentMonday.format('YYYY-MM-DD'),
        week_end: aiResult.week_end,
        plan_title: aiResult.plan_title || `Kế hoạch học tập ${currentMonday.format('YYYY-MM-DD')}`,
        summary: aiResult.summary,
        tasks: tasksToApply,
      };
      await weeklyPlanService.applyAIPlan(applyPayload);
      message.success('Đã chấp nhận và lưu kế hoạch vào lịch thành công!');
      setIsAIModalOpen(false);
      setAiResult(null);
      await fetchCalendarData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể lưu Kế hoạch AI.');
    } finally {
      setApplyingAI(false);
    }
  };

  // Date Header Text adapt to viewMode
  const headerDateText = useMemo(() => {
    if (viewMode === 'day') {
      const dayIndex = selectedDate.day();
      const vnDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      return `${vnDays[dayIndex]}, Ngày ${selectedDate.format('DD/MM/YYYY')}`;
    } else if (viewMode === 'week') {
      const startStr = currentMonday.format('DD/MM/YYYY');
      const endStr = currentMonday.add(6, 'day').format('DD/MM/YYYY');
      return `${startStr} – ${endStr}`;
    } else {
      return `Tháng ${selectedDate.format('MM/YYYY')}`;
    }
  }, [viewMode, selectedDate, currentMonday]);

  // Days array for Month View
  const monthDays = useMemo(() => {
    if (viewMode !== 'month') return [];
    const startOfMonth = selectedDate.startOf('month');
    const endOfMonth = selectedDate.endOf('month');
    const startCalendar = startOfMonth.startOf('isoWeek');
    const endCalendar = endOfMonth.endOf('isoWeek');

    const days: dayjs.Dayjs[] = [];
    let curr = startCalendar;
    while (curr.isBefore(endCalendar) || curr.isSame(endCalendar, 'day')) {
      days.push(curr);
      curr = curr.add(1, 'day');
    }
    return days;
  }, [viewMode, selectedDate]);

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
              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                <Button icon={<LeftOutlined />} onClick={handlePrev} size="small" className="rounded-lg" />
                <button
                  onClick={handleToday}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Hôm nay
                </button>
                <Button icon={<RightOutlined />} onClick={handleNext} size="small" className="rounded-lg" />
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 ml-2 font-mono">
                  {headerDateText}
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

          {/* Calendar Views */}
          {loading ? (
            <div className="p-20 text-center">
              <Spin size="large" />
              <p className="text-xs text-slate-400 mt-3 font-semibold">Đang đồng bộ Lịch học và Kế hoạch học tập...</p>
            </div>
          ) : viewMode === 'week' ? (
            /* ===== WEEK VIEW ===== */
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
                      {DAY_NAMES.map((dayName, idx) => {
                        const dayDateStr = currentMonday.add(idx, 'day').format('YYYY-MM-DD');
                        const cellKey = `${dayDateStr}_${slot}`;
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
          ) : viewMode === 'day' ? (
            /* ===== DAY VIEW ===== */
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white m-0">
                    Lịch Học Chi Tiết Ngày {selectedDate.format('DD/MM/YYYY')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                    Các buổi học giảng đường cố định và kế hoạch ôn tập trong ngày
                  </p>
                </div>
                <Tag color="indigo" className="px-3 py-1 font-bold rounded-xl text-xs">
                  {filteredEvents.filter((ev) => dayjs(ev.scheduled_date).isSame(selectedDate, 'day')).length} sự kiện
                </Tag>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
                {TIME_SLOTS.map((slot) => {
                  const dayDateStr = selectedDate.format('YYYY-MM-DD');
                  const cellKey = `${dayDateStr}_${slot}`;
                  const slotEvents = eventMap[cellKey] || [];

                  return (
                    <div key={slot} className="flex gap-4 pt-3 min-h-[70px]">
                      <div className="w-20 text-xs font-mono font-bold text-slate-400 pt-1 shrink-0">
                        {slot}
                      </div>

                      <div className="flex-1 space-y-2">
                        {slotEvents.length === 0 ? (
                          <div className="text-xs text-slate-300 dark:text-slate-700 italic pt-1">
                            — Trống —
                          </div>
                        ) : (
                          slotEvents.map((ev) => {
                            const isFixed = ev.type === 'FIXED_CLASS';
                            const isAI = ev.type === 'AI_STUDY';

                            return (
                              <motion.div
                                key={ev.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => handleEventClick(ev)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                                  isFixed
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                                    : isAI
                                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-900 dark:text-indigo-200'
                                    : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                                        isFixed
                                          ? 'bg-emerald-500 text-white'
                                          : isAI
                                          ? 'bg-indigo-600 text-white'
                                          : 'bg-amber-500 text-white'
                                      }`}
                                    >
                                      {isFixed ? '🏫 Fixed Class' : isAI ? '🤖 AI Planned' : '👤 My Plan'}
                                    </span>
                                    <h4 className="font-extrabold text-sm m-0 text-slate-900 dark:text-white">
                                      {ev.title}
                                    </h4>
                                  </div>

                                  <span className="font-mono text-xs font-bold text-slate-500">
                                    <ClockCircleOutlined className="mr-1" />
                                    {ev.start_time} – {ev.end_time}
                                  </span>
                                </div>

                                {ev.description && (
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 m-0 leading-relaxed">
                                    {ev.description}
                                  </p>
                                )}

                                {ev.course_name && (
                                  <div className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                    <BookOutlined /> Môn học: {ev.course_name}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ===== MONTH VIEW ===== */
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4">
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 pb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                <div>Thứ 2</div>
                <div>Thứ 3</div>
                <div>Thứ 4</div>
                <div>Thứ 5</div>
                <div>Thứ 6</div>
                <div>Thứ 7</div>
                <div>Chủ Nhật</div>
              </div>

              {/* Month Grid Cells */}
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((d) => {
                  const dStr = d.format('YYYY-MM-DD');
                  const isCurrentMonth = d.month() === selectedDate.month();
                  const isToday = d.isSame(dayjs(), 'day');

                  const dayEvs = filteredEvents.filter((ev) =>
                    dayjs(ev.scheduled_date).isSame(d, 'day')
                  );
                  const fixedCount = dayEvs.filter((e) => e.type === 'FIXED_CLASS').length;
                  const aiCount = dayEvs.filter((e) => e.type === 'AI_STUDY').length;
                  const studentCount = dayEvs.filter((e) => e.type === 'STUDENT_STUDY').length;

                  return (
                    <div
                      key={dStr}
                      onClick={() => {
                        setSelectedDate(d);
                        setViewMode('day');
                      }}
                      className={`min-h-[100px] p-2.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${
                        !isCurrentMonth
                          ? 'opacity-40 bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-900'
                          : isToday
                          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-mono font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400 text-sm' : ''}`}>
                          {d.date()}
                        </span>
                        {dayEvs.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {dayEvs.length} bài
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1">
                        {fixedCount > 0 && (
                          <div className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-bold truncate">
                            🏫 {fixedCount} Lịch cố định
                          </div>
                        )}
                        {aiCount > 0 && (
                          <div className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 font-bold truncate">
                            🤖 {aiCount} Kế hoạch AI
                          </div>
                        )}
                        {studentCount > 0 && (
                          <div className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold truncate">
                            👤 {studentCount} Tự học
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Task Execution & Details Modal */}
      <Modal
        open={isTaskDrawerOpen}
        onCancel={() => setIsTaskDrawerOpen(false)}
        footer={null}
        width={650}
        centered
        title={
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <BookOutlined className="text-xl" />
            <span className="font-extrabold text-base">Chi Tiết Buổi Học & Thực Hành</span>
          </div>
        }
        className="rounded-3xl overflow-hidden"
      >
        {selectedTask && (
          <div className="space-y-5 pt-2 text-xs">
            {/* Header info card */}
            <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-slate-900 border border-indigo-500/20 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Tag color={selectedTask.source_type === 'MANUAL' ? 'gold' : 'indigo'} className="rounded-lg font-bold">
                    {selectedTask.source_type === 'MANUAL' ? '👤 My Plan' : '🤖 AI Planned'}
                  </Tag>
                  {selectedTask.priority && (
                    <Tag color={PRIORITY_CONFIG[selectedTask.priority]?.color || 'blue'} className="rounded-lg font-bold uppercase">
                      {PRIORITY_CONFIG[selectedTask.priority]?.label || selectedTask.priority}
                    </Tag>
                  )}
                </div>

                <Tag
                  color={
                    selectedTask.status === 'completed' || selectedTask.status === 'COMPLETED'
                      ? 'success'
                      : selectedTask.status === 'in_progress' || selectedTask.status === 'IN_PROGRESS'
                      ? 'processing'
                      : 'default'
                  }
                  className="rounded-lg font-bold uppercase"
                >
                  {selectedTask.status.toUpperCase()}
                </Tag>
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white m-0">
                {selectedTask.title}
              </h3>

              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 font-mono text-[11px] pt-1">
                <div>📅 Ngày: <strong className="text-slate-900 dark:text-white">{selectedTask.scheduled_date || 'Hôm nay'}</strong></div>
                <div>⏰ Giờ: <strong className="text-slate-900 dark:text-white">{selectedTask.start_time || '09:00'} – {selectedTask.end_time || '10:30'}</strong></div>
              </div>

              {selectedTask.course_name && (
                <div className="pt-1 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                  <BookOutlined /> Môn học: {selectedTask.course_name}
                </div>
              )}
            </div>

            {/* Description & Topics to study */}
            {selectedTask && (() => {
              let desc = selectedTask.description || '';
              let topic = selectedTask.topic || selectedTask.title;
              let reason = selectedTask.reason || '';
              let whatToStudy: string[] = selectedTask.what_to_study || [];
              let whatToDo: string[] = selectedTask.what_to_do || [];

              if (desc && desc.startsWith('{') && desc.endsWith('}')) {
                try {
                  const parsed = JSON.parse(desc);
                  desc = parsed.description || '';
                  topic = parsed.topic || topic;
                  reason = parsed.reason || reason;
                  if (parsed.what_to_study && Array.isArray(parsed.what_to_study)) {
                    whatToStudy = parsed.what_to_study;
                  }
                  if (parsed.what_to_do && Array.isArray(parsed.what_to_do)) {
                    whatToDo = parsed.what_to_do;
                  }
                } catch (e) {
                  // ignore
                }
              }

              const cleanDesc = desc === selectedTask.title ? '' : desc;

              return (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <h4 className="font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 m-0 flex items-center gap-2 text-xs">
                    <FileTextOutlined className="text-indigo-500 text-sm" /> Nội dung & Mục tiêu cần học
                  </h4>

                  {topic && (
                    <div className="text-xs">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">Chủ đề chính:</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">{topic}</span>
                    </div>
                  )}

                  {cleanDesc && (
                    <div className="text-xs">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">Mô tả & Chi tiết:</span>
                      <p className="text-slate-700 dark:text-slate-300 m-0 leading-relaxed font-medium">
                        {cleanDesc}
                      </p>
                    </div>
                  )}

                  {reason && (
                    <div className="text-xs p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 font-medium">
                      🎯 <strong>Lý do học:</strong> {reason}
                    </div>
                  )}

                  <div className="text-xs pt-1">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Cần ôn tập & Nắm vững:</span>
                    {whatToStudy && whatToStudy.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300 font-medium m-0">
                        {whatToStudy.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300 font-medium m-0">
                        <li>Ôn tập lý thuyết nền tảng và phương pháp triển khai cho chủ đề <strong>{topic}</strong>.</li>
                        <li>Đọc lại tài liệu liên quan và thực hành theo checklist hành động bên dưới.</li>
                      </ul>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Action Checklist */}
            {selectedTask.what_to_do && selectedTask.what_to_do.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 m-0 flex items-center gap-1.5">
                  <CheckCircleOutlined className="text-emerald-500" /> Checklist công việc cần hoàn thành
                </h4>
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
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-indigo-500/50'
                        }`}
                      >
                        <Checkbox checked={isChecked} disabled />
                        <span className={isChecked ? 'line-through text-slate-400 font-medium' : 'font-semibold text-slate-800 dark:text-slate-200'}>
                          {act}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions Bar */}
            <div className="pt-2 flex items-center justify-between gap-3 flex-wrap border-t border-slate-200 dark:border-slate-800">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleStartSession(selectedTask.id)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold px-4 h-10 flex items-center gap-1"
              >
                Vào Bài Học (Workspace) 🚀
              </Button>

              {selectedTask.status !== 'completed' && selectedTask.status !== 'COMPLETED' ? (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={async () => {
                    try {
                      const updated = await weeklyPlanService.completeStudySession(selectedTask.id);
                      setSelectedTask(updated);
                      message.success('Đã hoàn thành buổi học!');
                      fetchCalendarData();
                    } catch (e) {
                      message.error('Không thể cập nhật trạng thái.');
                    }
                  }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold px-4 h-10 flex items-center gap-1"
                >
                  Đánh Dấu Đã Học ✅
                </Button>
              ) : (
                <Tag color="success" className="px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 m-0">
                  <CheckCircleOutlined /> Đã hoàn thành
                </Tag>
              )}
            </div>

            {/* Reflection Form */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold uppercase tracking-wider text-slate-500 m-0 flex items-center gap-1.5">
                📝 Phản hồi & Ghi chú thu hoạch
              </h4>
              <Form
                form={reflectionForm}
                layout="vertical"
                initialValues={selectedTask.reflection_data || {}}
                onFinish={handleSaveReflection}
              >
                <Form.Item name="what_learned" label="Bạn đã tiếp thu và nắm chắc được những kiến thức gì?">
                  <TextArea rows={2} className="rounded-xl" placeholder="Tóm tắt ngắn gọn kiến thức đã nắm..." />
                </Form.Item>

                <Form.Item name="struggling_with" label="Điều gì bạn còn thắc mắc / cần trợ lý AI hỗ trợ thêm?">
                  <TextArea rows={2} className="rounded-xl" placeholder="Những chỗ thắc mắc hoặc cần giải đáp..." />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submittingReflection}
                  icon={<CheckOutlined />}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold w-full h-9"
                >
                  Lưu Ghi Chú Phản Hồi
                </Button>
              </Form>
            </div>
          </div>
        )}
      </Modal>

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
        onCancel={() => {
          setIsAIModalOpen(false);
          setAiResult(null);
        }}
        footer={null}
        width={680}
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

          {/* Focus Assignment Select */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              🎯 Bài tập cần tập trung ưu tiên (Không bắt buộc / Focus Option):
            </label>
            <Select
              allowClear
              loading={loadingAssignments}
              placeholder="-- Chọn bài tập cần AI ưu tiên lập kế hoạch --"
              className="w-full rounded-xl"
              value={selectedAssignmentId}
              onChange={(val) => setSelectedAssignmentId(val)}
              options={availableAssignments.map((a) => ({
                value: a.id,
                label: `${a.title} ${a.course_name ? `(${a.course_name})` : ''} — Hạn: ${a.due_date || 'Chưa định'}`,
              }))}
            />
          </div>

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

            {/* Quick Prompt Suggestions */}
            <div className="mt-2.5 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                ✨ Gợi ý yêu cầu nhanh (Click để điền):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🎯 Tập trung hoàn thành bài tập ưu tiên trước hạn nộp',
                  '🌙 Chỉ xếp lịch học vào các buổi tối (19:00 - 22:00)',
                  '⚡ Dành 2 tiếng mỗi sáng thứ 3 và thứ 5 để học Tiếng Anh & Thuật toán',
                  '☕ Ưu tiên xếp lịch nhẹ nhàng vào cuối tuần',
                  '📚 Tự động xếp lịch ôn tập tổng hợp ngay sau các giờ học cố định',
                ].map((sug, idx) => {
                  const cleanText = sug.replace(/^[^\s]+\s/, '');
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setAiPromptText((prev) =>
                          prev ? `${prev}. ${cleanText}` : cleanText
                        )
                      }
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all font-medium text-left shadow-2xs"
                    >
                      {sug}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={() => {
                setIsAIModalOpen(false);
                setAiResult(null);
              }}
              className="rounded-xl"
            >
              Đóng
            </Button>
            <button
              disabled={generatingAI}
              onClick={handleGenerateAIPlan}
              className="btn-voxel-green text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-2"
            >
              {generatingAI ? <Spin size="small" /> : <RocketOutlined />}
              <span>{generatingAI ? 'Đang Tính Toán...' : 'Kích Hoạt AI Lập Lịch'}</span>
            </button>
          </div>

          {/* AI Draft Schedule Results Preview */}
          {aiResult && (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-indigo-700 dark:text-indigo-300 text-sm flex items-center gap-2">
                  <RocketOutlined /> Dự thảo Kế hoạch AI đề xuất (Chưa lưu)
                </div>
                <Tag color="gold" className="rounded-lg font-bold">
                  {(aiResult.proposed_tasks || (aiResult.created_tasks as any) || []).length} Buổi học
                </Tag>
              </div>

              <p className="text-slate-700 dark:text-slate-300 m-0 leading-relaxed font-medium text-xs">
                {aiResult.summary}
              </p>

              {((aiResult.proposed_tasks || (aiResult.created_tasks as any) || []) as any[]).length > 0 && (
                <div className="space-y-2 pt-1 max-h-60 overflow-y-auto pr-1">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    📋 Danh sách các buổi học AI xếp lịch:
                  </div>
                  {((aiResult.proposed_tasks || (aiResult.created_tasks as any) || []) as any[]).map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-500/20 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{t.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          📅 {t.scheduled_date || 'Tuần này'} ({t.start_time || '09:00'} – {t.end_time || '10:30'})
                        </div>
                      </div>
                      <Tag color={PRIORITY_CONFIG[t.priority]?.color || 'blue'} className="rounded-lg font-bold uppercase text-[10px]">
                        {PRIORITY_CONFIG[t.priority]?.label || t.priority}
                      </Tag>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-indigo-500/20">
                <Button
                  onClick={() => setAiResult(null)}
                  disabled={applyingAI}
                  className="rounded-xl border-slate-300"
                >
                  Bỏ qua
                </Button>
                <button
                  disabled={applyingAI}
                  onClick={handleAcceptAIPlan}
                  className="btn-voxel-green text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-2"
                >
                  {applyingAI ? <Spin size="small" /> : <CheckCircleOutlined />}
                  <span>{applyingAI ? 'Đang lưu...' : 'Chấp Nhận & Áp Dụng Kế Hoạch 📅'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
