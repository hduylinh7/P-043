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

const PRIORITY_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    badgeBg: string;
    borderLeft: string;
    dotColor: string;
  }
> = {
  urgent: {
    label: 'Khẩn cấp',
    color: 'red',
    badgeBg: 'bg-rose-500 text-white',
    borderLeft: 'border-l-4 border-l-rose-500',
    dotColor: 'bg-rose-500',
  },
  URGENT: {
    label: 'Khẩn cấp',
    color: 'red',
    badgeBg: 'bg-rose-500 text-white',
    borderLeft: 'border-l-4 border-l-rose-500',
    dotColor: 'bg-rose-500',
  },
  critical: {
    label: 'Khẩn cấp',
    color: 'red',
    badgeBg: 'bg-rose-500 text-white',
    borderLeft: 'border-l-4 border-l-rose-500',
    dotColor: 'bg-rose-500',
  },
  high: {
    label: 'Cao',
    color: 'orange',
    badgeBg: 'bg-amber-500 text-slate-950 font-bold',
    borderLeft: 'border-l-4 border-l-amber-500',
    dotColor: 'bg-amber-500',
  },
  HIGH: {
    label: 'Cao',
    color: 'orange',
    badgeBg: 'bg-amber-500 text-slate-950 font-bold',
    borderLeft: 'border-l-4 border-l-amber-500',
    dotColor: 'bg-amber-500',
  },
  medium: {
    label: 'Trung bình',
    color: 'blue',
    badgeBg: 'bg-sky-500 text-white',
    borderLeft: 'border-l-4 border-l-sky-500',
    dotColor: 'bg-sky-500',
  },
  MEDIUM: {
    label: 'Trung bình',
    color: 'blue',
    badgeBg: 'bg-sky-500 text-white',
    borderLeft: 'border-l-4 border-l-sky-500',
    dotColor: 'bg-sky-500',
  },
  low: {
    label: 'Thấp',
    color: 'green',
    badgeBg: 'bg-emerald-600 text-white',
    borderLeft: 'border-l-4 border-l-emerald-500',
    dotColor: 'bg-emerald-500',
  },
  LOW: {
    label: 'Thấp',
    color: 'green',
    badgeBg: 'bg-emerald-600 text-white',
    borderLeft: 'border-l-4 border-l-emerald-500',
    dotColor: 'bg-emerald-500',
  },
};

const getPriorityConfig = (priority?: string | null, isFixed?: boolean) => {
  if (priority && PRIORITY_CONFIG[priority]) {
    return PRIORITY_CONFIG[priority];
  }
  if (isFixed) {
    return PRIORITY_CONFIG['high'];
  }
  return PRIORITY_CONFIG['medium'];
};

export const LearningCalendarPage: React.FC = () => {
  const { themeMode } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDark = themeMode === 'dark';

  // Calculate dynamic card height & top offset based on time duration (e.g., 08:00 - 10:45 = 2.75 hours = ~239.5px)
  const getEventSpanStyles = (startTimeStr?: string, endTimeStr?: string) => {
    if (!startTimeStr || !endTimeStr) {
      return { isSpanned: false, style: {} };
    }

    try {
      const [sh, sm] = startTimeStr.split(':').map(Number);
      const [eh, em] = endTimeStr.split(':').map(Number);

      if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
        return { isSpanned: false, style: {} };
      }

      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      const durationMins = endMins - startMins;

      if (durationMins <= 0) {
        return { isSpanned: false, style: {} };
      }

      const minuteOffsetInHour = sm;
      const topPx = (minuteOffsetInHour / 60) * 90 + 4;
      const heightPx = Math.max(75, (durationMins / 60) * 90 - 8);

      return {
        isSpanned: true,
        style: {
          position: 'absolute' as const,
          top: `${topPx}px`,
          height: `${heightPx}px`,
          left: '6px',
          right: '6px',
          zIndex: 10,
        },
      };
    } catch (e) {
      return { isSpanned: false, style: {} };
    }
  };

  // Navigation Date (default current date)
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(() => dayjs());

  // Real-time Clock for Current Time Line Indicator
  const [currentTime, setCurrentTime] = useState<dayjs.Dayjs>(() => dayjs());

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState<boolean>(true);
  const [events, setEvents] = useState<UnifiedCalendarEvent[]>([]);

  // Legend & Priority Filter Toggles
  const [showFixedClass, setShowFixedClass] = useState<boolean>(true);
  const [showAIPlan, setShowAIPlan] = useState<boolean>(true);
  const [showStudentPlan, setShowStudentPlan] = useState<boolean>(true);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Selected Task Drawer State
  const [selectedTask, setSelectedTask] = useState<PlanTask | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState<boolean>(false);
  const [activeChecklist, setActiveChecklist] = useState<string[]>([]);

  // Create Task Modal State
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState<boolean>(false);
  const [creatingTask, setCreatingTask] = useState<boolean>(false);
  const [createTaskForm] = Form.useForm();

  // AI Planner Modal State
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [aiStep, setAiStep] = useState<'input' | 'preview'>('input');
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

  // Auto-open task modal if task_id query param is present in URL
  useEffect(() => {
    const targetTaskId = searchParams.get('task_id');
    if (targetTaskId && events.length > 0) {
      const match = events.find((ev) => ev.id === targetTaskId || (ev as any).source_id === targetTaskId);
      if (match) {
        setSelectedTask(match as any);
        setIsTaskDrawerOpen(true);
      }
    }
  }, [events, searchParams]);

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

  // Live timer interval to update current time line every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Calculate position of Current Time Line Indicator
  const currentTimePos = useMemo(() => {
    const hour = currentTime.hour();
    const minute = currentTime.minute();
    // Timeline grid starts at 07:00 and ends at 22:00 (15 hours = 900 minutes)
    const totalMinutesFromStart = (hour - 7) * 60 + minute;
    const totalGridMinutes = 15 * 60; // 900 minutes
    if (totalMinutesFromStart < 0 || totalMinutesFromStart > totalGridMinutes) {
      return null;
    }
    const percentage = (totalMinutesFromStart / totalGridMinutes) * 100;
    const dayOfWeek = currentTime.day(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0..Sun=6

    return {
      percentage,
      timeStr: currentTime.format('HH:mm'),
      todayIdx,
      isCurrentWeek: currentMonday.isSame(currentTime.startOf('isoWeek'), 'day'),
      isTodaySelected: selectedDate.isSame(currentTime, 'day'),
    };
  }, [currentTime, currentMonday, selectedDate]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (ev.type === 'FIXED_CLASS' && !showFixedClass) return false;
      if (ev.type === 'AI_STUDY' && !showAIPlan) return false;
      if (ev.type === 'STUDENT_STUDY' && !showStudentPlan) return false;

      if (priorityFilter !== 'ALL') {
        const p = (ev.priority || '').toLowerCase();
        if (priorityFilter === 'urgent' && !['urgent', 'critical'].includes(p)) return false;
        if (priorityFilter === 'high' && p !== 'high') return false;
        if (priorityFilter === 'medium' && p !== 'medium') return false;
        if (priorityFilter === 'low' && p !== 'low') return false;
      }
      return true;
    });
  }, [events, showFixedClass, showAIPlan, showStudentPlan, priorityFilter]);

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

  // Open Create Task Modal pre-filled for selected slot
  const handleOpenCreateTaskForSlot = (dateStr: string, slotTime: string) => {
    const scheduledDay = dayjs(dateStr);
    let endHourStr = '20:30';
    try {
      const [h, m] = slotTime.split(':').map(Number);
      const endH = h + 1 <= 23 ? h + 1 : 23;
      endHourStr = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    } catch (e) {
      endHourStr = slotTime;
    }

    createTaskForm.setFieldsValue({
      title: '',
      description: '',
      topic: '',
      scheduled_date: scheduledDay,
      start_time: slotTime,
      end_time: endHourStr,
      priority: 'medium',
      estimated_duration: 90,
    });
    setIsCreateTaskModalOpen(true);
  };

  // Delete Task Handler (AI Plan & MyPlan from DB)
  const handleDeleteTask = async (e: React.MouseEvent | undefined, taskId: string) => {
    if (e) e.stopPropagation();
    try {
      await weeklyPlanService.deleteTask(taskId);
      message.success('Đã xóa nhiệm vụ thành công khỏi cơ sở dữ liệu!');
      fetchCalendarData();
    } catch (err: any) {
      console.error('Delete task error:', err);
      message.error(err.response?.data?.detail || 'Không thể xóa nhiệm vụ.');
    }
  };

  const [applyingAI, setApplyingAI] = useState<boolean>(false);

  // AI Plan Generation Handler (Preview)
  const handleGenerateAIPlan = async () => {
    setGeneratingAI(true);
    try {
      const weekStartStr = currentMonday.format('YYYY-MM-DD');
      const promptText = aiPromptText.trim() || 'Lên kế hoạch học tập tự động cho tuần này.';
      const res = await weeklyPlanService.generateAIPlan({
        request: promptText,
        user_message: promptText,
        week_start: weekStartStr,
        assignment_id: selectedAssignmentId,
      });
      setAiResult(res);
      setAiStep('preview');
      message.success('AI đã lập xong dự thảo kế hoạch! Vui lòng đọc kiểm tra phân lịch và bấm "Chấp nhận" để lưu.');
    } catch (err: any) {
      console.error('AI plan error:', err);
      message.error(err.response?.data?.detail || 'Lỗi khi gọi AI Planner Agent.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Remove individual task from proposed AI plan
  const handleRemoveProposedTask = (originalIndex: number) => {
    if (!aiResult) return;
    const currentTasks = aiResult.proposed_tasks || (aiResult.created_tasks as any) || [];
    const updatedTasks = currentTasks.filter((_: any, idx: number) => idx !== originalIndex);
    setAiResult({
      ...aiResult,
      proposed_tasks: updatedTasks,
      created_tasks: updatedTasks as any,
    });
    message.info('Đã loại bỏ 1 buổi học khỏi dự thảo kế hoạch.');
  };

  // Group proposed tasks by scheduled date for timeline visualization
  const proposedTasksGroupedByDate = useMemo(() => {
    if (!aiResult) return [];
    const rawTasks = (aiResult.proposed_tasks || (aiResult.created_tasks as any) || []) as any[];

    const groups: Record<string, any[]> = {};
    rawTasks.forEach((task, idx) => {
      const dateKey = task.scheduled_date ? dayjs(task.scheduled_date).format('YYYY-MM-DD') : 'undated';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push({ ...task, _originalIndex: idx });
    });

    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (a === 'undated') return 1;
      if (b === 'undated') return -1;
      return a.localeCompare(b);
    });

    const vnDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    return sortedDates.map((dateKey) => {
      const dayTasks = groups[dateKey];
      dayTasks.sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'));

      let dayOfWeekName = 'Chưa xác định ngày';
      let formattedDate = 'Linh hoạt trong tuần';
      let dateBadge = '';

      if (dateKey !== 'undated') {
        const d = dayjs(dateKey);
        const dayIdx = d.day();
        dayOfWeekName = vnDays[dayIdx];
        formattedDate = `${vnDays[dayIdx]}, ${d.format('DD/MM/YYYY')}`;
        dateBadge = d.format('DD/MM');
      }

      return {
        dateKey,
        dayOfWeekName,
        formattedDate,
        dateBadge,
        tasks: dayTasks,
      };
    });
  }, [aiResult]);

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
      setAiStep('input');
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
                className="btn-voxel-green text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-voxel active:translate-y-1 transition-all cursor-pointer"
              >
                <RobotOutlined className="text-sm" />
                <span>Tạo Kế Hoạch AI</span>
              </button>

              <button
                onClick={() => setIsCreateTaskModalOpen(true)}
                className="btn-voxel-gold text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-voxel-gold active:translate-y-1 transition-all cursor-pointer"
              >
                <PlusOutlined className="text-sm font-bold" />
                <span>Thêm Nhiệm Vụ</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
          {/* Controls & Legend Bar */}
          <div className={`p-4 rounded-2xl border-2 shadow-sm space-y-4 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:translate-y-0.5 shadow-voxel-sm shadow-slate-300/40 dark:shadow-slate-950 font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                  title="Trước"
                >
                  <LeftOutlined />
                </button>
                <button
                  onClick={handleToday}
                  className="px-3.5 py-1.5 text-xs font-extrabold rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 active:translate-y-0.5 shadow-voxel-sm shadow-slate-300/40 dark:shadow-slate-950 transition-all cursor-pointer"
                >
                  Hôm nay
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:translate-y-0.5 shadow-voxel-sm shadow-slate-300/40 dark:shadow-slate-950 font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                  title="Sau"
                >
                  <RightOutlined />
                </button>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 ml-2 font-mono">
                  {headerDateText}
                </span>
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-950/80 p-1.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3.5 py-1 rounded-xl text-xs font-bold transition-all ${viewMode === 'day'
                      ? 'bg-white dark:bg-slate-800 border-2 border-minecraft-grassBorder text-emerald-800 dark:text-emerald-300 font-extrabold shadow-voxel-sm shadow-minecraft-grassBorder/40'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-2 border-transparent'
                    }`}
                >
                  Ngày
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3.5 py-1 rounded-xl text-xs font-bold transition-all ${viewMode === 'week'
                      ? 'bg-white dark:bg-slate-800 border-2 border-minecraft-grassBorder text-emerald-800 dark:text-emerald-300 font-extrabold shadow-voxel-sm shadow-minecraft-grassBorder/40'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-2 border-transparent'
                    }`}
                >
                  Tuần
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3.5 py-1 rounded-xl text-xs font-bold transition-all ${viewMode === 'month'
                      ? 'bg-white dark:bg-slate-800 border-2 border-minecraft-grassBorder text-emerald-800 dark:text-emerald-300 font-extrabold shadow-voxel-sm shadow-minecraft-grassBorder/40'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-2 border-transparent'
                    }`}
                >
                  Tháng
                </button>
              </div>
            </div>

            {/* Legend & Filter Toggles Area */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap text-xs">
              {/* Event Type Toggles */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                  Loại lịch:
                </span>

                <button
                  type="button"
                  onClick={() => setShowFixedClass(!showFixedClass)}
                  className={`font-bold select-none px-3.5 py-1.5 rounded-xl border-2 transition-all active:translate-y-0.5 cursor-pointer text-xs ${showFixedClass
                      ? 'border-minecraft-grassBorder bg-minecraft-grass/15 text-emerald-800 dark:text-emerald-300 shadow-voxel-sm shadow-minecraft-grassBorder/40 font-extrabold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-slate-400 opacity-60'
                    }`}
                >
                  Fixed Class
                </button>

                <button
                  type="button"
                  onClick={() => setShowAIPlan(!showAIPlan)}
                  className={`font-bold select-none px-3.5 py-1.5 rounded-xl border-2 transition-all active:translate-y-0.5 cursor-pointer text-xs ${showAIPlan
                      ? 'border-minecraft-skyBorder bg-minecraft-sky/15 text-sky-800 dark:text-sky-300 shadow-voxel-sm shadow-minecraft-skyBorder/40 font-extrabold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-slate-400 opacity-60'
                    }`}
                >
                  AI Planned
                </button>

                <button
                  type="button"
                  onClick={() => setShowStudentPlan(!showStudentPlan)}
                  className={`font-bold select-none px-3.5 py-1.5 rounded-xl border-2 transition-all active:translate-y-0.5 cursor-pointer text-xs ${showStudentPlan
                      ? 'border-minecraft-goldBorder bg-minecraft-gold/15 text-amber-800 dark:text-amber-300 shadow-voxel-sm shadow-minecraft-goldBorder/40 font-extrabold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-slate-400 opacity-60'
                    }`}
                >
                  My Plan
                </button>
              </div>

              {/* Priority Toggles & Legend */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                  Độ ưu tiên:
                </span>
                <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-950/80 p-1.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPriorityFilter('ALL')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${priorityFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-800 shadow-voxel-sm border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-2 border-transparent'
                      }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorityFilter('urgent')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${priorityFilter === 'urgent'
                        ? 'bg-rose-500 text-white shadow-voxel-sm border-2 border-rose-700 shadow-rose-900/40'
                        : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-2 border-transparent'
                      }`}
                  >
                    Khẩn cấp
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorityFilter('high')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${priorityFilter === 'high'
                        ? 'bg-amber-500 text-slate-950 shadow-voxel-sm border-2 border-amber-700 shadow-amber-900/40'
                        : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-2 border-transparent'
                      }`}
                  >
                    Cao
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorityFilter('medium')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${priorityFilter === 'medium'
                        ? 'bg-sky-500 text-white shadow-voxel-sm border-2 border-sky-700 shadow-sky-900/40'
                        : 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 border-2 border-transparent'
                      }`}
                  >
                    Trung bình
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorityFilter('low')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${priorityFilter === 'low'
                        ? 'bg-emerald-600 text-white shadow-voxel-sm border-2 border-emerald-800 shadow-emerald-900/40'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-500/10 border-2 border-transparent'
                      }`}
                  >
                    Thấp
                  </button>
                </div>
              </div>
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
                        className={`p-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${isToday ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                          }`}
                      >
                        <div className="uppercase tracking-wider">{DAY_LABELS[dayName]}</div>
                        <div className="text-base font-extrabold font-mono mt-0.5">{dayDate.format('DD/MM')}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Slot Rows */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 relative">
                  {/* Real-time Current Time Line Indicator */}
                  {currentTimePos && currentTimePos.isCurrentWeek && (
                    <div
                      className="absolute left-0 right-0 z-0 pointer-events-none flex items-center transition-all duration-500"
                      style={{ top: `${currentTimePos.percentage}%` }}
                    >
                      {/* Time Axis Badge (Google Calendar style) */}
                      <div className="w-[12.5%] pr-2 text-right flex justify-end items-center">
                        <span className="bg-emerald-600 dark:bg-emerald-500 text-white font-mono text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          {currentTimePos.timeStr}
                        </span>
                      </div>
                      {/* 2px Line Spanning Day Grid */}
                      <div className="w-[87.5%] h-[2px] bg-emerald-500 dark:bg-emerald-400 relative flex items-center">
                        {/* Concentric Dot Anchored on Today Column */}
                        <div
                          className="absolute -top-[5px] -ml-[6px] w-3 h-3 rounded-full bg-emerald-600 dark:bg-emerald-400 border-2 border-white dark:border-slate-900 shadow-md ring-4 ring-emerald-500/20"
                          style={{ left: `calc(${(currentTimePos.todayIdx / 7) * 100}%)` }}
                        />
                      </div>
                    </div>
                  )}

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
                            onClick={() => handleOpenCreateTaskForSlot(dayDateStr, slot)}
                            className="p-1.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0 space-y-1.5 relative z-1 group hover:bg-indigo-500/5 transition-colors cursor-pointer"
                          >
                            {cellEvents.map((ev) => {
                              const isFixed = ev.type === 'FIXED_CLASS';
                              const taskSource = (ev.task_data?.source_type || '').toUpperCase();
                              const taskTitle = ev.title || ev.task_data?.title || '';
                              const taskDesc = ev.task_data?.description || '';
                              const isAI =
                                ev.type === 'AI_STUDY' ||
                                ['AI', 'AI_PLAN', 'PLANNER', 'AI_PLANNER'].includes(taskSource) ||
                                taskTitle.includes('Ôn tập chuẩn bị:') ||
                                taskTitle.includes('Ôn tập nhẹ nhàng:') ||
                                taskTitle.startsWith('Ôn tập:') ||
                                taskDesc.includes('"what_to_study"') ||
                                taskDesc.includes('"material_id"') ||
                                !!ev.task_data?.material_id;
                              const prio = getPriorityConfig(ev.priority, isFixed);
                              const spanInfo = getEventSpanStyles(ev.start_time, ev.end_time);

                              return (
                                <motion.div
                                  key={ev.id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(ev);
                                  }}
                                  style={spanInfo.isSpanned ? spanInfo.style : undefined}
                                  className={`p-2 rounded-2xl border-2 text-xs cursor-pointer shadow-sm transition-all hover:scale-[1.02] overflow-hidden flex flex-col justify-between relative z-10 ${spanInfo.isSpanned ? '' : 'min-h-[76px]'
                                    } ${prio.borderLeft} ${isFixed
                                      ? 'bg-[#EBFBEE] dark:bg-[#092E1B] border-emerald-500/60 text-emerald-950 dark:text-emerald-100 hover:border-emerald-500'
                                      : isAI
                                        ? 'bg-[#EEF2FF] dark:bg-[#111827] border-indigo-500/60 text-indigo-950 dark:text-indigo-100 hover:border-indigo-500'
                                        : 'bg-[#FEF8E7] dark:bg-[#231908] border-amber-500/60 text-amber-950 dark:text-amber-100 hover:border-amber-500'
                                    }`}
                                >
                                  <div className="overflow-hidden min-w-0">
                                    {/* Badge Header */}
                                    <div className="flex items-center justify-between gap-1 mb-1 font-bold text-[10px] min-w-0">
                                      <span
                                        className={`px-1.5 py-0.5 rounded-md border font-bold uppercase tracking-wider text-[9px] truncate shrink-0 max-w-[65%] ${isFixed
                                            ? 'bg-emerald-600 text-white border-emerald-700'
                                            : isAI
                                              ? 'bg-indigo-600 text-white border-indigo-700'
                                              : 'bg-amber-500 text-slate-950 border-amber-600'
                                          }`}
                                      >
                                        {isFixed ? 'Fixed Class' : isAI ? 'AI Planned' : 'My Plan'}
                                      </span>

                                      {/* Compact Priority Badge */}
                                      <Tooltip title={`Độ ưu tiên: ${prio.label}`}>
                                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase shrink-0 ${prio.badgeBg}`}>
                                          {prio.label}
                                        </span>
                                      </Tooltip>
                                    </div>

                                    <div className={`font-extrabold ${spanInfo.isSpanned ? 'line-clamp-2' : 'line-clamp-1'} text-slate-900 dark:text-white leading-tight`}>
                                      {ev.title}
                                    </div>
                                  </div>

                                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-slate-300 border-t border-slate-200/50 dark:border-slate-700/50 pt-0.5 shrink-0 min-w-0">
                                    <span className="flex items-center gap-1 truncate">
                                      <ClockCircleOutlined className="text-[9px] shrink-0" />
                                      {ev.start_time} – {ev.end_time}
                                    </span>
                                    {isFixed && (
                                      <Tooltip title="Lịch học cố định giảng đường">
                                        <LockOutlined className="text-emerald-600 dark:text-emerald-400 shrink-0 text-[9px]" />
                                      </Tooltip>
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

              <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-3 relative">
                {/* Real-time Current Time Line Indicator in Day View */}
                {currentTimePos && currentTimePos.isTodaySelected && (
                  <div
                    className="absolute left-0 right-0 z-0 pointer-events-none flex items-center transition-all duration-500"
                    style={{ top: `${currentTimePos.percentage}%` }}
                  >
                    {/* Time Axis Badge (Google Calendar style) */}
                    <div className="w-20 pr-2 text-right flex justify-end items-center">
                      <span className="bg-emerald-600 dark:bg-emerald-500 text-white font-mono text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {currentTimePos.timeStr}
                      </span>
                    </div>
                    {/* 2px Line Spanning Day Content */}
                    <div className="flex-1 h-[2px] bg-emerald-500 dark:bg-emerald-400 relative flex items-center">
                      {/* Circle Dot at Start of Today */}
                      <div className="absolute -top-[5px] -left-[6px] w-3 h-3 rounded-full bg-emerald-600 dark:bg-emerald-400 border-2 border-white dark:border-slate-900 shadow-md ring-4 ring-emerald-500/20" />
                    </div>
                  </div>
                )}

                {TIME_SLOTS.map((slot) => {
                  const dayDateStr = selectedDate.format('YYYY-MM-DD');
                  const cellKey = `${dayDateStr}_${slot}`;
                  const slotEvents = eventMap[cellKey] || [];

                  return (
                    <div
                      key={slot}
                      onClick={() => handleOpenCreateTaskForSlot(selectedDate.format('YYYY-MM-DD'), slot)}
                      className="flex gap-4 pt-3 min-h-[70px] cursor-pointer hover:bg-indigo-500/5 p-2 rounded-2xl transition-colors group"
                    >
                      <div className="w-20 text-xs font-mono font-bold text-slate-400 pt-1 shrink-0">
                        {slot}
                      </div>

                      <div className="flex-1 space-y-2">
                        {slotEvents.length === 0 ? (
                          <div className="text-xs text-slate-400 dark:text-slate-600 italic pt-1 flex items-center gap-2 font-medium">
                            <span>— Trống —</span>
                            <span className="opacity-0 group-hover:opacity-100 text-indigo-600 dark:text-indigo-400 transition-opacity font-bold not-italic text-[11px]">
                              + Bấm để tạo nhiệm vụ MyPlan ({slot})
                            </span>
                          </div>
                        ) : (
                          slotEvents.map((ev) => {
                            const isFixed = ev.type === 'FIXED_CLASS';
                            const taskSource = (ev.task_data?.source_type || '').toUpperCase();
                            const taskTitle = ev.title || ev.task_data?.title || '';
                            const taskDesc = ev.task_data?.description || '';
                            const isAI =
                              ev.type === 'AI_STUDY' ||
                              ['AI', 'AI_PLAN', 'PLANNER', 'AI_PLANNER'].includes(taskSource) ||
                              taskTitle.includes('Ôn tập chuẩn bị:') ||
                              taskTitle.includes('Ôn tập nhẹ nhàng:') ||
                              taskTitle.startsWith('Ôn tập:') ||
                              taskDesc.includes('"what_to_study"') ||
                              taskDesc.includes('"material_id"') ||
                              !!ev.task_data?.material_id;
                            const prio = getPriorityConfig(ev.priority, isFixed);

                            return (
                              <motion.div
                                key={ev.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(ev);
                                }}
                                className="p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md relative z-10 bg-white dark:bg-slate-900"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${isFixed
                                          ? 'bg-emerald-600 text-white'
                                          : isAI
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-amber-500 text-slate-950'
                                        }`}
                                    >
                                      {isFixed ? 'Fixed Class' : isAI ? 'AI Planned' : 'My Plan'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-md text-xs font-extrabold uppercase shadow-2xs ${prio.badgeBg}`}>
                                      Ưu tiên {prio.label}
                                    </span>
                                    <h4 className="font-extrabold text-sm m-0 text-slate-900 dark:text-white ml-1">
                                      {ev.title}
                                    </h4>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-mono text-xs font-bold text-slate-500">
                                      <ClockCircleOutlined className="mr-1" />
                                      {ev.start_time} – {ev.end_time}
                                    </span>
                                  </div>
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
                      className={`min-h-[100px] p-2.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${!isCurrentMonth
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
                            {fixedCount} Lịch cố định
                          </div>
                        )}
                        {aiCount > 0 && (
                          <div className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 font-bold truncate">
                            {aiCount} Kế hoạch AI
                          </div>
                        )}
                        {studentCount > 0 && (
                          <div className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold truncate">
                            {studentCount} Tự học
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
        width={620}
        centered
        title={
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BookOutlined className="text-lg" />
            </span>
            <span className="font-extrabold text-base">Chi Tiết Buổi Học & Thực Hành</span>
          </div>
        }
        className="rounded-3xl overflow-hidden"
      >
        {selectedTask && (() => {
          let desc = selectedTask.description || '';
          let topic = selectedTask.topic || selectedTask.title;
          let whatToStudy: string[] = selectedTask.what_to_study || [];
          let whatToDo: string[] = selectedTask.what_to_do || [];

          if (desc && desc.startsWith('{') && desc.endsWith('}')) {
            try {
              const parsed = JSON.parse(desc);
              desc = parsed.description || '';
              topic = parsed.topic || topic;
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

          const st = (selectedTask.source_type || '').toUpperCase();
          const evType = (selectedTask as any).type;
          const isAITask =
            evType === 'AI_STUDY' ||
            ['AI', 'AI_PLAN', 'PLANNER', 'AI_PLANNER'].includes(st) ||
            selectedTask.title.includes('Ôn tập chuẩn bị:') ||
            selectedTask.title.includes('Ôn tập nhẹ nhàng:') ||
            selectedTask.title.startsWith('Ôn tập:') ||
            whatToStudy.length > 0 ||
            whatToDo.length > 0 ||
            !!selectedTask.material_id ||
            !!selectedTask.course_id;

          // Extract or construct meaningful learning objectives list
          let objectivesList = whatToStudy.length > 0 ? whatToStudy : whatToDo;
          if (objectivesList.length === 0 && isAITask) {
            objectivesList = [
              `Giải thích các khái niệm cốt lõi và phương pháp tiếp cận cho chủ đề ${topic}.`,
              `Phân biệt các đặc điểm chính và biết cách chọn phương pháp phân tích phù hợp.`,
              `Hiểu rõ quy trình phân tích và vận dụng kiến thức vào thực hành môn ${selectedTask.course_name || 'học'}.`,
            ];
          }

          const completedCount = objectivesList.filter((item) => activeChecklist.includes(item)).length;

          return (
            <div className="space-y-4 pt-2 text-xs">
              {/* Header info card */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/90 border-2 border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={st === 'ASSIGNMENT' ? 'badge-voxel-blue text-xs' : isAITask ? 'badge-voxel-purple text-xs' : 'badge-voxel-gold text-xs'}>
                      {st === 'ASSIGNMENT' ? '📝 Bài tập (Assignment)' : isAITask ? '🤖 Kế hoạch AI (AI Planned)' : '👤 Nhiệm vụ cá nhân'}
                    </span>
                    {selectedTask.priority && (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        Ưu tiên {PRIORITY_CONFIG[selectedTask.priority]?.label || selectedTask.priority}
                      </span>
                    )}
                  </div>

                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-300/50 dark:border-slate-700">
                    {selectedTask.status.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white m-0">
                  {selectedTask.title}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CalendarOutlined className="text-base" />
                    </span>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ngày học</div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                        {selectedTask.scheduled_date ? dayjs(selectedTask.scheduled_date).format('DD/MM/YYYY') : 'Hôm nay'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <ClockCircleOutlined className="text-base" />
                    </span>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Khung giờ</div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                        {selectedTask.start_time || '09:00'} – {selectedTask.end_time || '10:30'}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedTask.course_name && (
                  <div className="pt-1 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                    <BookOutlined /> Môn học: {selectedTask.course_name}
                  </div>
                )}
              </div>

              {/* LEARNING OBJECTIVES SECTION */}
              {objectivesList.length > 0 && (
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-extrabold text-xs uppercase tracking-wider">
                      <AimOutlined className="text-sm text-emerald-600 dark:text-emerald-400" />
                      <span>Mục Tiêu Bài Học (Learning Objectives)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {completedCount} / {objectivesList.length} hoàn thành
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 italic">
                    Sau khi hoàn thành buổi học này, bạn nên nắm vững và thực hiện được các mục tiêu sau:
                  </p>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 space-y-1">
                    {objectivesList.map((item, idx) => {
                      const isChecked = activeChecklist.includes(item);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleChecklist(item)}
                          className={`pt-2.5 pb-2 flex items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-all ${isChecked ? 'opacity-75' : ''
                            }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onChange={() => handleToggleChecklist(item)}
                            className="mt-0.5 scale-105"
                          />
                          <span className={`text-xs leading-relaxed flex-1 select-none ${isChecked
                              ? 'line-through text-slate-400 font-medium'
                              : 'font-semibold text-slate-800 dark:text-slate-200'
                            }`}>
                            {item}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Main Actions Bar */}
              <div className="pt-2 space-y-3">
                {isAITask && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Button 1: Vào bài học Workspace */}
                    <button
                      type="button"
                      onClick={() => handleStartSession(selectedTask.id)}
                      className="btn-voxel-green text-xs py-3.5 px-4 rounded-xl font-extrabold flex items-center justify-center gap-2 w-full shadow-voxel active:translate-y-1 transition-all cursor-pointer"
                    >
                      <PlayCircleOutlined className="text-base" />
                      <span>Vào Bài Học (Workspace)</span>
                    </button>

                    {/* Button 2: Kiến thức trọng tâm */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsTaskDrawerOpen(false);
                        navigate(`/study-session/${selectedTask.id}?view=knowledge`);
                      }}
                      className="btn-voxel-gold text-xs py-3.5 px-4 rounded-xl font-extrabold uppercase flex items-center justify-center gap-2 w-full shadow-voxel-gold active:translate-y-1 transition-all cursor-pointer"
                    >
                      <BookOutlined className="text-base" />
                      <span>Kiến Thức Trọng Tâm</span>
                    </button>
                  </div>
                )}

                {/* Sub row: Xóa nhiệm vụ & Tag hoàn thành */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  {(selectedTask.source_type as string) !== 'FIXED_CLASS' ? (
                    <Popconfirm
                      title="Xóa nhiệm vụ này?"
                      description="Nhiệm vụ này sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu vĩnh viễn."
                      onConfirm={async () => {
                        await handleDeleteTask(undefined, selectedTask.id);
                        setIsTaskDrawerOpen(false);
                      }}
                      okText="Xóa vĩnh viễn"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl border-2 border-rose-300 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 active:translate-y-0.5 transition-all cursor-pointer"
                      >
                        <DeleteOutlined />
                        <span>Xóa nhiệm vụ</span>
                      </button>
                    </Popconfirm>
                  ) : <div />}

                  {(selectedTask.status === 'completed' || selectedTask.status === 'COMPLETED') && (
                    <span className="badge-voxel-green text-xs">
                      <CheckCircleOutlined /> Đã hoàn thành
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Create Task Modal */}
      <Modal
        open={isCreateTaskModalOpen}
        onCancel={() => setIsCreateTaskModalOpen(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <PlusOutlined className="text-base font-bold" />
            </span>
            <span className="font-extrabold text-base">Thêm Nhiệm Vụ Học Tập Thường Quy</span>
          </div>
        }
        centered
        className="rounded-3xl overflow-hidden"
      >
        <Form form={createTaskForm} layout="vertical" onFinish={handleCreateTask} className="pt-3">
          <Form.Item name="title" label="Tên nhiệm vụ / Buổi học" rules={[{ required: true, message: 'Vui lòng nhập tên nhiệm vụ' }]}>
            <Input placeholder="Ví dụ: Ôn tập thuật toán Sắp xếp" className="rounded-xl py-2" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="scheduled_date" label="Ngày học">
              <DatePicker className="w-full rounded-xl py-2" format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item name="priority" label="Độ ưu tiên" initialValue="medium">
              <Select className="rounded-xl h-10" options={[
                { label: 'Khẩn cấp', value: 'urgent' },
                { label: 'Cao', value: 'high' },
                { label: 'Trung bình', value: 'medium' },
                { label: 'Thấp', value: 'low' },
              ]} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="start_time" label="Giờ bắt đầu (HH:MM)" rules={[{ required: true, message: 'Nhập giờ bắt đầu' }]}>
              <Input placeholder="19:00" className="rounded-xl py-2" />
            </Form.Item>

            <Form.Item name="end_time" label="Giờ kết thúc (HH:MM)" rules={[{ required: true, message: 'Nhập giờ kết thúc' }]}>
              <Input placeholder="20:30" className="rounded-xl py-2" />
            </Form.Item>
          </div>

          <Form.Item name="description" label="Mô tả / Ghi chú">
            <TextArea rows={3} placeholder="Nội dung cần chuẩn bị..." className="rounded-xl" />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(false)}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs active:translate-y-0.5 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creatingTask}
              className="btn-voxel-gold text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-voxel-gold active:translate-y-1 transition-all cursor-pointer"
            >
              {creatingTask ? <Spin size="small" /> : <PlusOutlined />}
              <span>Lưu Nhiệm Vụ</span>
            </button>
          </div>
        </Form>
      </Modal>

      {/* AI Plan Generator & Review Modal (2-Step Flow) */}
      <Modal
        open={isAIModalOpen}
        onCancel={() => {
          setIsAIModalOpen(false);
          setAiResult(null);
          setAiStep('input');
        }}
        footer={null}
        width={aiStep === 'preview' ? 860 : 680}
        title={
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {aiStep === 'preview' ? <RocketOutlined className="text-lg" /> : <RobotOutlined className="text-lg" />}
            </span>
            <span className="font-extrabold text-base">
              {aiStep === 'preview'
                ? 'Dự Thảo Phân Bổ Lịch Học AI — Đọc & Tùy Chỉnh Lịch'
                : 'Tạo Kế Hoạch Học Tập Tối Ưu Bằng AI'}
            </span>
          </div>
        }
        centered
        className="rounded-3xl overflow-hidden"
      >
        <div className="space-y-4 pt-2 text-xs">
          {/* Stepper Navigation Tab Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAiStep('input')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${aiStep === 'input'
                    ? 'border-2 border-minecraft-grassBorder bg-minecraft-grass/15 text-emerald-800 dark:text-emerald-300 shadow-voxel-sm font-extrabold'
                    : 'border-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Thiết Lập Yêu Cầu</span>
              </button>

              <span className="text-slate-300 dark:text-slate-700 font-bold">➔</span>

              <button
                type="button"
                disabled={!aiResult}
                onClick={() => aiResult && setAiStep('preview')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${aiStep === 'preview'
                    ? 'border-2 border-minecraft-grassBorder bg-minecraft-grass/15 text-emerald-800 dark:text-emerald-300 shadow-voxel-sm font-extrabold cursor-pointer'
                    : aiResult
                      ? 'border-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer'
                      : 'border-2 border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-slate-400 opacity-50 cursor-not-allowed'
                  }`}
              >
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Xem Phân Lịch & Duyệt</span>
              </button>
            </div>

            {aiStep === 'preview' && (
              <span className="badge-voxel-gold text-[11px] font-bold px-3 py-1">
                DỰ THẢO (CHƯA LƯU)
              </span>
            )}
          </div>

          {/* STEP 1: PROMPT & FOCUS CONFIGURATION */}
          {aiStep === 'input' && (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
                AI Companion sẽ tự động phân tích <strong>Lịch học cố định giảng đường</strong>, các <strong>Bài tập sắp tới</strong>, và <strong>Mục tiêu cá nhân</strong> của bạn để đề xuất khung giờ học tối ưu không bị trùng lặp.
              </p>

              {/* Focus Assignment Select */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Bài tập cần tập trung ưu tiên (Không bắt buộc / Focus Option):
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
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
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
                <div className="mt-3 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Gợi ý yêu cầu nhanh (Click để điền):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Tập trung hoàn thành bài tập ưu tiên trước hạn nộp',
                      'Chỉ xếp lịch học vào các buổi tối (19:00 - 22:00)',
                      'Dành 2 tiếng mỗi sáng thứ 3 và thứ 5 để học Tiếng Anh & Thuật toán',
                      'Ưu tiên xếp lịch nhẹ nhàng vào cuối tuần',
                      'Tự động xếp lịch ôn tập tổng hợp ngay sau các giờ học cố định',
                    ].map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setAiPromptText((prev) =>
                            prev ? `${prev}. ${sug}` : sug
                          )
                        }
                        className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all font-semibold text-left cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAIModalOpen(false);
                    setAiResult(null);
                    setAiStep('input');
                  }}
                  className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs active:translate-y-0.5 transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  disabled={generatingAI}
                  onClick={handleGenerateAIPlan}
                  className="btn-voxel-green text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-voxel active:translate-y-1 transition-all cursor-pointer"
                >
                  {generatingAI ? <Spin size="small" /> : <RocketOutlined />}
                  <span>{generatingAI ? 'Đang Tính Toán & Lập Lịch...' : 'Kích Hoạt AI Lập Lịch'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SCHEDULE DISTRIBUTION & PREVIEW SCREEN */}
          {aiStep === 'preview' && aiResult && (
            <div className="space-y-4">


              {/* SCHEDULE DISTRIBUTION LIST GROUPED BY DAY */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <CalendarOutlined className="text-emerald-600 dark:text-emerald-400" />
                    <span>Phân bổ lịch học theo ngày (Kiểm tra & Xóa nếu không thích):</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Nhấn nút xóa để loại bỏ buổi học không muốn xếp lịch
                  </span>
                </div>

                {proposedTasksGroupedByDate.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 m-0">
                      Không còn buổi học nào trong danh sách dự thảo.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAiStep('input')}
                      className="btn-voxel-gold text-xs px-4 py-2 rounded-xl font-bold inline-flex items-center gap-2 cursor-pointer"
                    >
                      <LeftOutlined />
                      <span>Quay lại tạo lại kế hoạch</span>
                    </button>
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto space-y-4 pr-1.5">
                    {proposedTasksGroupedByDate.map((group) => (
                      <div key={group.dateKey} className="space-y-2.5">
                        {/* Day Group Header Badge */}
                        <div className="flex items-center gap-2.5 sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xs py-1 z-10">
                          <span className="px-3 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-extrabold text-xs flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-xs">
                            <CalendarOutlined className="text-emerald-600 dark:text-emerald-400" />
                            <span>{group.formattedDate}</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            • {group.tasks.length} buổi học
                          </span>
                          <div className="flex-1 border-b border-slate-200 dark:border-slate-800" />
                        </div>

                        {/* List of Tasks in this Day */}
                        <div className="space-y-2.5 pl-2">
                          {group.tasks.map((task: any) => {
                            const pConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                            return (
                              <div
                                key={task.id || task._originalIndex}
                                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group relative"
                              >
                                {/* PROMINENT TIME BLOCK (Nổi bật khung giờ) */}
                                <div className="flex items-center sm:flex-col justify-center gap-1 p-2.5 sm:py-3 sm:px-4 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 dark:from-amber-500/25 dark:to-amber-500/10 border-2 border-amber-500/40 min-w-[130px] text-center shadow-voxel-sm shrink-0 w-full sm:w-auto">
                                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-extrabold text-xs">
                                    <ClockCircleOutlined className="text-amber-600 dark:text-amber-400" />
                                    <span>Khung giờ</span>
                                  </div>
                                  <div className="font-mono text-sm font-black text-amber-950 dark:text-amber-100 tracking-tight">
                                    {task.start_time || '09:00'} – {task.end_time || '10:30'}
                                  </div>
                                  <div className="text-[10px] font-bold text-amber-700/80 dark:text-amber-300/80 font-mono">
                                    {task.estimated_duration || 90} phút
                                  </div>
                                </div>

                                {/* Task Details & Objectives */}
                                <div className="flex-1 space-y-1.5 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                                      {task.title}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${pConfig.badgeBg}`}>
                                      {pConfig.label}
                                    </span>
                                    {task.course_name && (
                                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                        {task.course_name}
                                      </span>
                                    )}
                                  </div>

                                  {task.reason && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 m-0 font-medium leading-relaxed">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Mục tiêu:</span> {task.reason}
                                    </p>
                                  )}

                                  {task.what_to_study && Array.isArray(task.what_to_study) && task.what_to_study.length > 0 && (
                                    <div className="pt-0.5 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                      <span className="font-bold text-slate-700 dark:text-slate-300">Nội dung trọng tâm:</span>
                                      {task.what_to_study.map((item: string, iIdx: number) => (
                                        <span key={iIdx} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                          • {item}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Delete / Remove Button */}
                                <div className="shrink-0 self-end sm:self-center">
                                  <Tooltip title="Loại bỏ buổi học này khỏi dự thảo nếu không thích">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveProposedTask(task._originalIndex)}
                                      className="p-2 rounded-xl text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border-2 border-rose-200 dark:border-rose-800/80 transition-all active:translate-y-0.5 cursor-pointer flex items-center gap-1 text-xs font-bold"
                                    >
                                      <DeleteOutlined className="text-base" />
                                      <span className="sm:hidden">Xóa</span>
                                    </button>
                                  </Tooltip>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons Footer for Preview Screen */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAiStep('input')}
                  disabled={applyingAI}
                  className="px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <LeftOutlined />
                  <span>Quay Lại Chỉnh Sửa Yêu Cầu</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAIModalOpen(false);
                      setAiResult(null);
                      setAiStep('input');
                    }}
                    disabled={applyingAI}
                    className="px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>

                  <button
                    disabled={applyingAI || (aiResult.proposed_tasks || (aiResult.created_tasks as any) || []).length === 0}
                    onClick={handleAcceptAIPlan}
                    className="btn-voxel-green text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-voxel active:translate-y-1 transition-all cursor-pointer"
                  >
                    {applyingAI ? <Spin size="small" /> : <CheckCircleOutlined />}
                    <span>{applyingAI ? 'Đang Lưu Kế Hoạch...' : 'Chấp Nhận & Áp Dụng Kế Hoạch'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default LearningCalendarPage;
