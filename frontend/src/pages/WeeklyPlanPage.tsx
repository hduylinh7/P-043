import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  LeftOutlined,
  RightOutlined,
  StarOutlined,
  BookOutlined,
  AimOutlined,
  UserOutlined,
  FlagOutlined,
  RobotOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  LinkOutlined,
  QuestionCircleOutlined,
  PlayCircleOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isBetween);
dayjs.extend(isoWeek);

import { Sidebar } from '../components/Sidebar';
import { InlinePlanningLoadingOrb } from '../components/common/InlinePlanningLoadingOrb';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { weeklyPlanService } from '../services/weeklyPlanService';
import { courseService } from '../services/courseService';
import { assignmentService } from '../services/assignmentService';
import {
  PlanTask,
  PlannerAgentResponseResult,
  TaskPriority,
  TaskSourceType,
  TaskStatus,
  WeeklyPlan,
} from '../types/weeklyPlan';

const { TextArea } = Input;

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_NAMES_FULL = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

const SOURCE_CONFIG: Record<TaskSourceType, { label: string; color: string; icon: React.ReactNode }> = {
  ASSIGNMENT: { label: 'Bài tập (Assignment)', color: 'blue', icon: <BookOutlined /> },
  PERSONAL_TASK: { label: 'Nhiệm vụ cá nhân', color: 'emerald', icon: <UserOutlined /> },
  GOAL: { label: 'Mục tiêu (Goal)', color: 'purple', icon: <AimOutlined /> },
  MANUAL: { label: 'Thủ công (Manual)', color: 'amber', icon: <FlagOutlined /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Khẩn cấp', color: 'red' },
  URGENT: { label: 'Khẩn cấp', color: 'red' },
  critical: { label: 'Khẩn cấp', color: 'red' },
  CRITICAL: { label: 'Khẩn cấp', color: 'red' },
  high: { label: 'Cao', color: 'orange' },
  HIGH: { label: 'Cao', color: 'orange' },
  medium: { label: 'Trung bình', color: 'blue' },
  MEDIUM: { label: 'Trung bình', color: 'blue' },
  low: { label: 'Thấp', color: 'green' },
  LOW: { label: 'Thấp', color: 'green' },
};

const PRIORITY_THEME: Record<string, {
  label: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  accentBorder: string;
  cardBgLight: string;
  cardBgDark: string;
  borderLight: string;
  borderDark: string;
  glowHover: string;
}> = {
  urgent: {
    label: 'Khẩn cấp',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-300',
    accentBorder: 'bg-rose-500',
    cardBgLight: 'bg-rose-50/70 hover:bg-rose-50/90',
    cardBgDark: 'bg-[#1e131d]/90 hover:bg-[#251624]',
    borderLight: 'border-rose-200/80 hover:border-rose-300',
    borderDark: 'border-rose-500/30 hover:border-rose-500/50',
    glowHover: 'hover:shadow-rose-500/10',
  },
  critical: {
    label: 'Khẩn cấp',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-300',
    accentBorder: 'bg-rose-500',
    cardBgLight: 'bg-rose-50/70 hover:bg-rose-50/90',
    cardBgDark: 'bg-[#1e131d]/90 hover:bg-[#251624]',
    borderLight: 'border-rose-200/80 hover:border-rose-300',
    borderDark: 'border-rose-500/30 hover:border-rose-500/50',
    glowHover: 'hover:shadow-rose-500/10',
  },
  high: {
    label: 'Cao',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-300',
    accentBorder: 'bg-amber-500',
    cardBgLight: 'bg-amber-50/70 hover:bg-amber-50/90',
    cardBgDark: 'bg-[#1f1912]/90 hover:bg-[#282015]',
    borderLight: 'border-amber-200/80 hover:border-amber-300',
    borderDark: 'border-amber-500/30 hover:border-amber-500/50',
    glowHover: 'hover:shadow-amber-500/10',
  },
  medium: {
    label: 'Trung bình',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20',
    badgeText: 'text-blue-700 dark:text-blue-300',
    accentBorder: 'bg-blue-500',
    cardBgLight: 'bg-blue-50/60 hover:bg-blue-50/80',
    cardBgDark: 'bg-[#111927]/90 hover:bg-[#162032]',
    borderLight: 'border-blue-200/80 hover:border-blue-300',
    borderDark: 'border-blue-500/30 hover:border-blue-500/50',
    glowHover: 'hover:shadow-blue-500/10',
  },
  low: {
    label: 'Thấp',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    accentBorder: 'bg-emerald-500',
    cardBgLight: 'bg-emerald-50/60 hover:bg-emerald-50/80',
    cardBgDark: 'bg-[#101e19]/90 hover:bg-[#152720]',
    borderLight: 'border-emerald-200/80 hover:border-emerald-300',
    borderDark: 'border-emerald-500/30 hover:border-emerald-500/50',
    glowHover: 'hover:shadow-emerald-500/10',
  },
};

const getTaskTimeDetails = (task: PlanTask, slot: string) => {
  const slotHour = parseInt(slot.split(':')[0], 10);

  let startHour = slotHour;
  let startMinute = 0;

  if (task.start_time) {
    const parts = task.start_time.split(':');
    startHour = parseInt(parts[0], 10);
    startMinute = parseInt(parts[1], 10) || 0;
  }

  let durationMinutes = task.estimated_duration || task.estimated_minutes || 60;

  if (task.start_time && task.end_time) {
    const startParts = task.start_time.split(':');
    const endParts = task.end_time.split(':');
    const sH = parseInt(startParts[0], 10);
    const sM = parseInt(startParts[1], 10) || 0;
    const eH = parseInt(endParts[0], 10);
    const eM = parseInt(endParts[1], 10) || 0;

    const calcDur = (eH * 60 + eM) - (sH * 60 + sM);
    if (calcDur > 0) {
      durationMinutes = calcDur;
    }
  }

  const minuteOffset = (startHour - slotHour) * 60 + startMinute;
  const topPx = (minuteOffset / 60) * 80;
  const heightPx = Math.max(42, (durationMinutes / 60) * 80 - 6);

  return { topPx, heightPx, durationMinutes };
};

export const WeeklyPlanPage: React.FC = () => {
  const { user } = useAuth();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const navigate = useNavigate();

  const isStudent = useMemo(() => {
    return !user?.roles || user.roles.includes('student') || user.roles.includes('admin');
  }, [user]);

  // Navigation State
  const [currentMonday, setCurrentMonday] = useState<Dayjs>(dayjs().startOf('isoWeek'));
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<WeeklyPlan | null>(null);

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<PlanTask | null>(null);
  const [detailTask, setDetailTask] = useState<PlanTask | null>(null);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState<boolean>(false);
  const [taskForm] = Form.useForm();
  const [planForm] = Form.useForm();

  // AI Planning Agent State
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [isApplyingAI, setIsApplyingAI] = useState<boolean>(false);
  const [aiPlanRequest, setAiPlanRequest] = useState<string>('');
  const [aiResultModalOpen, setAiResultModalOpen] = useState<boolean>(false);
  const [aiResultData, setAiResultData] = useState<PlannerAgentResponseResult | null>(null);

  // Available Assignments for Roadmap Planning
  const [availableAssignments, setAvailableAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isAIModalOpen && isStudent) {
      const loadAssignments = async () => {
        try {
          const courses = await courseService.getStudentCourses();
          const allAssignments: any[] = [];
          for (const c of courses) {
            try {
              const list = await assignmentService.getCourseAssignments(c.id);
              list.forEach((a: any) => {
                allAssignments.push({
                  ...a,
                  course_name: c.name,
                });
              });
            } catch (err) {
              console.error(err);
            }
          }
          setAvailableAssignments(allAssignments);
        } catch (err) {
          console.error(err);
        }
      };
      loadAssignments();
    }
  }, [isAIModalOpen, isStudent]);

  const selectedAssignment = useMemo(() => {
    return availableAssignments.find((a) => a.id === selectedAssignmentId);
  }, [availableAssignments, selectedAssignmentId]);

  // Active week date range
  const weekStart = useMemo(() => currentMonday.startOf('day'), [currentMonday]);
  const weekEnd = useMemo(() => currentMonday.add(6, 'day').endOf('day'), [currentMonday]);

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => currentMonday.add(i, 'day'));
  }, [currentMonday]);

  // Fetch Weekly Plans
  const fetchWeeklyPlans = async (targetPlanId?: string) => {
    try {
      setLoading(true);
      const plans = await weeklyPlanService.getWeeklyPlans();
      setWeeklyPlans(plans);

      let matchedPlan: WeeklyPlan | undefined;
      if (targetPlanId) {
        matchedPlan = plans.find((p) => p.id === targetPlanId);
      }
      if (!matchedPlan) {
        matchedPlan = plans.find((p) => {
          const pStart = dayjs(p.week_start_date);
          return pStart.isSame(weekStart, 'day') || (pStart.isAfter(weekStart.subtract(1, 'day')) && pStart.isBefore(weekEnd));
        }) || plans[0];
      }

      if (matchedPlan && matchedPlan.week_start_date) {
        const pMonday = dayjs(matchedPlan.week_start_date).startOf('isoWeek');
        if (!pMonday.isSame(weekStart, 'day')) {
          setCurrentMonday(pMonday);
        }
      }

      setActivePlan(matchedPlan || null);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tải Kế hoạch học tập');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyPlans();
  }, [currentMonday]);

  // Handle Week Navigation
  const handlePrevWeek = () => setCurrentMonday(currentMonday.subtract(1, 'week'));
  const handleNextWeek = () => setCurrentMonday(currentMonday.add(1, 'week'));
  const handleToday = () => setCurrentMonday(dayjs().startOf('isoWeek'));

  // Create Weekly Plan
  const handleCreatePlan = async (values: any) => {
    try {
      const payload = {
        title: values.title || `Kế hoạch học tập ${weekStart.format('DD/MM')} - ${weekEnd.format('DD/MM/YYYY')}`,
        description: values.description,
        week_start_date: weekStart.toISOString(),
        week_end_date: weekEnd.toISOString(),
        status: 'ACTIVE' as const,
      };

      const newPlan = await weeklyPlanService.createWeeklyPlan(payload);
      message.success('Tạo Kế hoạch học tập mới thành công!');
      setIsCreatePlanModalOpen(false);
      planForm.resetFields();
      fetchWeeklyPlans(newPlan.id);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tạo Kế hoạch học tập');
    }
  };

  // Generate AI Plan Preview
  const handleGenerateAIPlan = async () => {
    setIsGeneratingAI(true);
    try {
      const payload: any = {
        week_start: weekStart.format('YYYY-MM-DD'),
        start_date: dayjs().format('YYYY-MM-DD'),
        assignment_id: selectedAssignmentId || undefined,
        request: aiPlanRequest.trim() || undefined,
      };
      const targetDueDate = selectedAssignment?.due_date || selectedAssignment?.due_at;
      if (targetDueDate) {
        payload.end_date = dayjs(targetDueDate).format('YYYY-MM-DD');
      }
      const res = await weeklyPlanService.generateAIPlan(payload);
      message.success('AI đã lập xong dự thảo kế hoạch! Vui lòng đọc kiểm tra và bấm "Chấp nhận" để lưu.');
      setAiResultData(res);
      setIsAIModalOpen(false);
      setAiResultModalOpen(true);
      setAiPlanRequest('');
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tạo Kế hoạch bằng AI. Vui lòng thử lại.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Remove individual proposed task from draft preview
  const handleRemoveProposedTask = (index: number) => {
    if (!aiResultData) return;
    const taskList = aiResultData.proposed_tasks || (aiResultData.created_tasks as any) || [];
    const updated = taskList.filter((_: any, idx: number) => idx !== index);
    setAiResultData({
      ...aiResultData,
      proposed_tasks: updated,
      created_tasks: updated as any,
    });
    message.info('Đã loại bỏ 1 buổi học khỏi dự thảo kế hoạch.');
  };

  // Group proposed tasks by scheduled date for timeline visualization
  const proposedTasksGroupedByDate = useMemo(() => {
    if (!aiResultData) return [];
    const rawTasks = (aiResultData.proposed_tasks || (aiResultData.created_tasks as any) || []) as any[];
    
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
  }, [aiResultData]);

  // Accept and save AI Plan to DB
  const handleAcceptAIPlan = async () => {
    if (!aiResultData) return;
    const tasksToApply = aiResultData.proposed_tasks || (aiResultData.created_tasks as any) || [];
    if (tasksToApply.length === 0) {
      message.warning('Danh sách nhiệm vụ đề xuất trống.');
      return;
    }
    setIsApplyingAI(true);
    try {
      const applyPayload = {
        week_start: aiResultData.week_start || weekStart.format('YYYY-MM-DD'),
        week_end: aiResultData.week_end,
        plan_title: aiResultData.plan_title || `Kế hoạch học tập ${weekStart.format('YYYY-MM-DD')}`,
        summary: aiResultData.summary,
        tasks: tasksToApply,
      };
      const res = await weeklyPlanService.applyAIPlan(applyPayload);
      message.success('Đã chấp nhận và lưu kế hoạch thành công!');
      setAiResultModalOpen(false);
      setAiResultData(null);
      await fetchWeeklyPlans(res.weekly_plan_id || undefined);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể lưu Kế hoạch AI.');
    } finally {
      setIsApplyingAI(false);
    }
  };

  // Reject / Cancel AI Plan draft
  const handleRejectAIPlan = () => {
    setAiResultModalOpen(false);
    setAiResultData(null);
    message.info('Đã hủy kế hoạch dự thảo.');
  };

  // Open Task Modal (Create / Edit)
  const openTaskModal = (task?: PlanTask, defaultDate?: Dayjs, defaultTime?: string) => {
    if (!activePlan) {
      message.warning('Vui lòng tạo Kế hoạch tuần trước khi thêm nhiệm vụ.');
      return;
    }

    if (task) {
      setEditingTask(task);
      taskForm.setFieldsValue({
        title: task.title,
        description: task.description,
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        scheduled_date: task.scheduled_date ? dayjs(task.scheduled_date) : weekStart,
        start_time: task.start_time || '09:00',
        end_time: task.end_time || '10:00',
        estimated_duration: task.estimated_duration || task.estimated_minutes || 60,
        source_type: task.source_type || 'MANUAL',
      });
    } else {
      setEditingTask(null);
      taskForm.setFieldsValue({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        scheduled_date: defaultDate || weekStart,
        start_time: defaultTime || '09:00',
        end_time: defaultTime ? dayjs(`2000-01-01 ${defaultTime}`).add(1, 'hour').format('HH:00') : '10:00',
        estimated_duration: 60,
        source_type: 'MANUAL',
      });
    }
    setIsTaskModalOpen(true);
  };

  // Save Task
  const handleSaveTask = async (values: any) => {
    if (!activePlan) return;

    const reqDateStr = values.scheduled_date ? values.scheduled_date.format('YYYY-MM-DD') : undefined;
    const reqStart = values.start_time;
    const reqEnd = values.end_time;

    // Validate start_time < end_time
    if (reqStart && reqEnd && reqStart >= reqEnd) {
      message.error(`Giờ bắt đầu (${reqStart}) phải trước giờ kết thúc (${reqEnd}).`);
      return;
    }

    // Client-side pre-check for schedule conflicts
    if (reqDateStr && reqStart && reqEnd && activePlan.tasks) {
      const conflictingTask = activePlan.tasks.find((t) => {
        if (editingTask && t.id === editingTask.id) return false;
        if (!t.scheduled_date || !t.start_time || !t.end_time) return false;
        const taskDateStr = dayjs(t.scheduled_date).format('YYYY-MM-DD');
        if (taskDateStr !== reqDateStr) return false;
        // Overlap condition: start1 < end2 && end1 > start2
        return reqStart < t.end_time && reqEnd > t.start_time;
      });

      if (conflictingTask) {
        message.error(`Trùng lịch! Khung giờ (${reqStart} - ${reqEnd}) bị trùng với nhiệm vụ "${conflictingTask.title}" (${conflictingTask.start_time} - ${conflictingTask.end_time}). Vui lòng chọn khung giờ khác.`);
        return;
      }
    }

    try {
      const payload = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        status: values.status,
        scheduled_date: values.scheduled_date ? values.scheduled_date.toISOString() : undefined,
        start_time: values.start_time,
        end_time: values.end_time,
        estimated_duration: values.estimated_duration,
        source_type: values.source_type,
      };

      if (editingTask) {
        await weeklyPlanService.updateTask(editingTask.id, payload);
        message.success('Cập nhật nhiệm vụ thành công!');
      } else {
        await weeklyPlanService.createTask(activePlan.id, payload);
        message.success('Thêm nhiệm vụ vào kế hoạch thành công!');
      }

      setIsTaskModalOpen(false);
      setDetailTask(null);
      fetchWeeklyPlans();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể lưu nhiệm vụ do trùng lịch hoặc lỗi hệ thống.');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await weeklyPlanService.deleteTask(taskId);
      message.success('Đã xóa nhiệm vụ');
      setDetailTask(null);
      fetchWeeklyPlans();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể xóa nhiệm vụ');
    }
  };

  // Quick Toggle Status
  const handleToggleTaskStatus = async (task: PlanTask) => {
    const nextStatus: TaskStatus = task.status === 'completed' || task.status === 'COMPLETED' ? 'todo' : 'completed';
    try {
      await weeklyPlanService.updateTaskStatus(task.id, nextStatus);
      message.success(nextStatus === 'completed' ? 'Đã hoàn thành nhiệm vụ!' : 'Đã chuyển về Cần làm');
      if (detailTask && detailTask.id === task.id) {
        setDetailTask({ ...detailTask, status: nextStatus });
      }
      fetchWeeklyPlans();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể cập nhật trạng thái');
    }
  };

  // Start / Continue Study Session
  const handleStartStudySession = async (task: PlanTask) => {
    try {
      if (task.status === 'todo' || task.status === 'TODO') {
        await weeklyPlanService.startStudySession(task.id);
      }
    } catch (err: any) {
      console.warn('Start study session status update:', err);
    } finally {
      setDetailTask(null);
      navigate(`/study-session/${task.id}`);
    }
  };

  // Map Tasks by Day and Time
  const tasksByDay = useMemo(() => {
    const map: Record<number, PlanTask[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    if (!activePlan || !activePlan.tasks) return map;

    activePlan.tasks.forEach((task) => {
      if (task.scheduled_date) {
        const taskDate = dayjs(task.scheduled_date);
        const dayIdx = daysOfWeek.findIndex((d) => d.isSame(taskDate, 'day'));
        if (dayIdx !== -1) {
          map[dayIdx].push(task);
        }
      } else {
        // Default to Monday if not specified
        map[0].push(task);
      }
    });

    return map;
  }, [activePlan, daysOfWeek]);

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-[#0F1710] text-[#F2F9F3]' : 'bg-[#FDFBF7] text-slate-800'}`}>
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header Section */}
        <div className={`p-6 border-b backdrop-blur-md sticky top-0 z-30 transition-colors ${isDark ? 'bg-[#0F1710]/90 border-minecraft-obsidianBorder' : 'bg-[#FDFBF7]/90 border-amber-900/10'
          }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarOutlined className="text-emerald-500 text-2xl" />
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Study Plan (Kế hoạch học tập)
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Lập kế hoạch học tập cá nhân hóa được cá nhân hóa từ Bài tập, Tài liệu môn học và Mục tiêu cá nhân
              </p>
            </div>

            {/* Week Navigation Header */}
            <div className="flex items-center gap-2 overflow-x-auto shrink-0 pb-1 max-w-full">
              <div className="card-voxel-3d flex items-center gap-1 py-1 px-2.5 shrink-0">
                <Button type="text" size="small" icon={<LeftOutlined />} onClick={handlePrevWeek} title="Khoảng trước" />
                <span className="font-extrabold text-xs sm:text-sm px-1.5 whitespace-nowrap">
                  {weekStart.format('DD MMM')} - {weekEnd.format('DD MMM, YYYY')}
                </span>
                <Button type="text" size="small" icon={<RightOutlined />} onClick={handleNextWeek} title="Khoảng sau" />
                <Button type="text" size="small" onClick={handleToday} className="ml-1 text-emerald-600 dark:text-emerald-400 font-extrabold">
                  Hôm nay
                </Button>
              </div>

              {/* View Mode Toggle Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={viewMode === 'calendar' ? 'tab-voxel-active text-xs py-1.5 px-3 shrink-0' : 'tab-voxel-inactive text-xs py-1.5 px-3 shrink-0'}
                >
                  <CalendarOutlined />
                  <span>Calendar View</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'tab-voxel-active text-xs py-1.5 px-3 shrink-0' : 'tab-voxel-inactive text-xs py-1.5 px-3 shrink-0'}
                >
                  <UnorderedListOutlined />
                  <span>List View</span>
                </button>
              </div>

              {/* AI Plan Button */}
              {isStudent && (
                <button
                  onClick={() => setIsAIModalOpen(true)}
                  className="btn-voxel-gold text-xs px-3.5 py-2 shrink-0 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RobotOutlined />
                  <span>AI Lập Study Plan</span>
                </button>
              )}

              {/* Add Task Button */}
              {activePlan && (
                <button
                  onClick={() => openTaskModal()}
                  className="btn-voxel-green text-xs px-3.5 py-2 shrink-0 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <PlusOutlined />
                  <span>Thêm nhiệm vụ</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-6">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <Spin size="large" tip="Đang tải kế hoạch tuần..." />
            </div>
          ) : !activePlan ? (
            /* Blank State when no plan exists for selected week */
            <div className={`flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed text-center max-w-xl mx-auto my-12 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
              }`}>
              <StarOutlined className="text-4xl text-blue-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">Chưa có Kế hoạch cho tuần này</h2>
              <p className="text-slate-400 text-sm mb-6 max-w-md">
                Tạo Kế hoạch tuần cho khoảng thời gian từ <span className="font-semibold text-blue-400">{weekStart.format('DD/MM')}</span> đến <span className="font-semibold text-blue-400">{weekEnd.format('DD/MM/YYYY')}</span> để quản lý lịch biểu và các bài tập/nhiệm vụ.
              </p>
              <div className="flex items-center gap-3">
                {isStudent && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<RobotOutlined />}
                    onClick={() => setIsAIModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold shadow-lg shadow-purple-500/25 border-none"
                  >
                    AI Plan My Week
                  </Button>
                )}
                <Button
                  type="default"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreatePlanModalOpen(true)}
                  className="rounded-xl font-semibold"
                >
                  Tạo kế hoạch thủ công
                </Button>
              </div>
            </div>
          ) : (
            /* Main Views */
            <div className="space-y-6">
              {/* CALENDAR VIEW */}
              {viewMode === 'calendar' && (
                <div className="space-y-3">
                  {/* Priority Legend Bar */}
                  <div className="card-voxel-3d p-3 px-5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-400 font-extrabold uppercase tracking-wider">
                      <FlagOutlined className="text-emerald-500" />
                      <span>Phân loại cấp độ ưu tiên:</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap font-bold">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/15 border-2 border-rose-500/30 text-rose-700 dark:text-rose-300 shadow-voxel-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm"></span>
                        <span>Khẩn cấp (Urgent)</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-700 dark:text-amber-300 shadow-voxel-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"></span>
                        <span>Cao (High)</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/15 border-2 border-blue-500/30 text-blue-700 dark:text-blue-300 shadow-voxel-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></span>
                        <span>Trung bình (Medium)</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-voxel-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
                        <span>Thấp (Low)</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-voxel-3d p-0 overflow-hidden">
                    {/* Grid Header: Days of Week */}
                    <div className={`grid grid-cols-8 border-b text-center font-semibold text-xs tracking-wider uppercase sticky top-0 z-20 ${isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                      <div className="py-3 px-2 border-r border-slate-700/30 flex items-center justify-center text-slate-400">
                        Time
                      </div>
                      {daysOfWeek.map((day, idx) => {
                        const isToday = day.isSame(dayjs(), 'day');
                        return (
                          <div
                            key={idx}
                            className={`py-3 px-1 border-r border-slate-700/20 last:border-r-0 flex flex-col items-center justify-center ${isToday ? 'bg-blue-500/10 text-blue-400 font-bold' : ''
                              }`}
                          >
                            <span>{DAY_NAMES[idx]}</span>
                            <span className={`text-sm mt-0.5 ${isToday ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center' : 'text-slate-400'}`}>
                              {day.format('DD')}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Calendar Grid Body */}
                    <div className="divide-y divide-slate-800/40 max-h-[calc(100vh-250px)] overflow-y-auto">
                      {TIME_SLOTS.map((slot) => {
                        const slotHour = parseInt(slot.split(':')[0], 10);

                        return (
                          <div key={slot} className="grid grid-cols-8 h-[80px] transition-colors hover:bg-blue-500/[0.02]">
                            {/* Time label */}
                            <div className={`p-2 text-xs font-mono border-r border-slate-700/20 flex items-start justify-center ${isDark ? 'text-slate-500 bg-slate-950/40' : 'text-slate-400 bg-slate-50'
                              }`}>
                              {slot}
                            </div>

                            {/* Day Columns for current time slot */}
                            {daysOfWeek.map((day, dayIdx) => {
                              const dayTasks = tasksByDay[dayIdx] || [];
                              // Find tasks matching slot hour
                              const slotTasks = dayTasks.filter((t) => {
                                if (!t.start_time) return false;
                                const taskHour = parseInt(t.start_time.split(':')[0], 10);
                                return taskHour === slotHour;
                              });

                              return (
                                <div
                                  key={dayIdx}
                                  onClick={(e) => {
                                    if (e.target === e.currentTarget) {
                                      openTaskModal(undefined, day, slot);
                                    }
                                  }}
                                  className={`p-1.5 border-r border-slate-700/20 last:border-r-0 relative group cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-900/50' : 'hover:bg-blue-50/50'
                                    }`}
                                >
                                  {slotTasks.map((task, taskIdx) => {
                                    const isCompleted = task.status === 'completed' || task.status === 'COMPLETED';
                                    const pKey = (task.priority || 'medium').toLowerCase();
                                    const theme = PRIORITY_THEME[pKey] || PRIORITY_THEME.medium;
                                    const sourceConf = SOURCE_CONFIG[task.source_type] || SOURCE_CONFIG.MANUAL;
                                    const { topPx, heightPx, durationMinutes } = getTaskTimeDetails(task, slot);

                                    const count = slotTasks.length;
                                    const widthPercent = 100 / count;
                                    const leftPercent = taskIdx * widthPercent;
                                    const isCompact = heightPx < 65;

                                    return (
                                      <div
                                        key={task.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDetailTask(task);
                                        }}
                                        style={{
                                          top: `${topPx + 3}px`,
                                          height: `${heightPx}px`,
                                          left: count === 1 ? '4px' : `calc(${leftPercent}% + 2px)`,
                                          width: count === 1 ? 'calc(100% - 8px)' : `calc(${widthPercent}% - 4px)`,
                                          zIndex: 10,
                                        }}
                                        className={`absolute rounded-xl border transition-all duration-200 ease-out cursor-pointer hover:z-30 hover:scale-[1.01] hover:shadow-lg flex flex-col justify-between overflow-hidden backdrop-blur-xs ${isCompleted
                                            ? isDark
                                              ? 'bg-slate-900/70 border-slate-800 text-slate-500 line-through opacity-65'
                                              : 'bg-slate-100/90 border-slate-200 text-slate-400 line-through opacity-65'
                                            : isDark
                                              ? `${theme.cardBgDark} ${theme.borderDark} text-slate-100 ${theme.glowHover}`
                                              : `${theme.cardBgLight} ${theme.borderLight} text-slate-900 ${theme.glowHover}`
                                          }`}
                                      >
                                        {/* Accent Bar */}
                                        <div className={`absolute top-0 bottom-0 left-0 w-1.5 rounded-l-xl ${isCompleted ? 'bg-slate-400/50' : theme.accentBorder}`} />

                                        {/* Main Content */}
                                        <div className={`pl-3 pr-2 py-1.5 flex flex-col justify-between h-full ${isCompact ? 'py-1' : ''}`}>
                                          <div>
                                            <div className="flex items-center justify-between gap-1 mb-1">
                                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 tracking-tight truncate">
                                                <ClockCircleOutlined className="text-[9px] opacity-70" />
                                                {task.start_time || slot} {task.end_time ? `- ${task.end_time}` : ''}
                                              </span>

                                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${theme.badgeBg} ${theme.badgeText}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                                                <span className="hidden sm:inline">{theme.label}</span>
                                              </span>
                                            </div>

                                            <h4 className={`font-bold text-xs leading-snug truncate ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                              {task.title}
                                            </h4>
                                          </div>

                                          {!isCompact && (
                                            <div className="flex items-center justify-between text-[10px] pt-1 mt-1 border-t border-black/5 dark:border-white/5 opacity-85">
                                              <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400 truncate">
                                                {sourceConf.icon}
                                                <span className="truncate">{sourceConf.label.split(' ')[0]}</span>
                                              </span>
                                              <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                                {durationMinutes}m
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Hover '+' button to add task */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                    <span className="text-xs text-blue-400 font-semibold bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 backdrop-blur-sm">
                                      + Thêm {slot}
                                    </span>
                                  </div>
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

              {/* LIST VIEW */}
              {viewMode === 'list' && (
                <div className="space-y-6">
                  {daysOfWeek.map((day, dayIdx) => {
                    const dayTasks = tasksByDay[dayIdx] || [];
                    const isToday = day.isSame(dayjs(), 'day');

                    return (
                      <div
                        key={dayIdx}
                        className={`card-voxel-3d space-y-4 ${
                          isToday ? 'border-minecraft-grass shadow-voxel' : ''
                        }`}
                      >
                        {/* Day Section Header */}
                        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200 dark:border-minecraft-obsidianBorder">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-base font-extrabold flex items-center gap-2 ${isToday ? 'text-emerald-600 dark:text-emerald-400' : isDark ? 'text-white' : 'text-slate-900'}`}>
                              📅 {DAY_NAMES_FULL[dayIdx]}
                            </span>
                            <span className="badge-voxel-green text-xs font-mono font-extrabold">
                              {day.format('DD/MM/YYYY')}
                            </span>
                            {isToday && (
                              <span className="badge-voxel-green text-xs font-extrabold bg-minecraft-grass text-white border-minecraft-grassBorder">
                                Hôm nay
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => openTaskModal(undefined, day)}
                            className="btn-voxel-green text-xs px-3.5 py-1.5 font-bold flex items-center gap-1.5"
                          >
                            <PlusOutlined />
                            <span>Thêm nhiệm vụ</span>
                          </button>
                        </div>

                        {/* Task List under this Day */}
                        {dayTasks.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400 font-medium italic">
                            Chưa có nhiệm vụ nào được lên lịch cho ngày này.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dayTasks.map((task) => {
                              const isCompleted = task.status === 'completed' || task.status === 'COMPLETED';
                              const pKey = (task.priority || 'medium').toLowerCase();
                              const theme = PRIORITY_THEME[pKey] || PRIORITY_THEME.medium;
                              const sourceConf = SOURCE_CONFIG[task.source_type] || SOURCE_CONFIG.MANUAL;

                              return (
                                <div
                                  key={task.id}
                                  onClick={() => setDetailTask(task)}
                                  className={`card-voxel-3d p-4 cursor-pointer transition-all hover:-translate-y-1 relative overflow-hidden ${
                                    isCompleted ? 'opacity-65 line-through' : ''
                                  }`}
                                >
                                  <div className={`absolute top-0 bottom-0 left-0 w-2 ${isCompleted ? 'bg-slate-400' : theme.accentBorder}`} />
                                  <div className="pl-2 space-y-2">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<CheckCircleOutlined className={isCompleted ? 'text-emerald-500 text-base' : 'text-slate-400 text-base'} />}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleTaskStatus(task);
                                          }}
                                        />
                                        <h3 className={`font-extrabold text-sm truncate m-0 ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                          {task.title}
                                        </h3>
                                      </div>

                                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-xl border-2 shrink-0 ${theme.badgeBg} ${theme.badgeText}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                                        {theme.label}
                                      </span>
                                    </div>

                                    {task.description && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 m-0 pl-7 font-medium">
                                        {task.description}
                                      </p>
                                    )}

                                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800 pl-7">
                                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] font-bold">
                                        <ClockCircleOutlined />
                                        <span>
                                          {task.start_time || 'Chưa định giờ'} {task.end_time ? `- ${task.end_time}` : ''}
                                        </span>
                                      </div>

                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                        {sourceConf.icon} {sourceConf.label.split(' ')[0]}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* CREATE WEEKLY PLAN MODAL */}
      <Modal
        title="Tạo Kế hoạch tuần mới"
        open={isCreatePlanModalOpen}
        onCancel={() => setIsCreatePlanModalOpen(false)}
        onOk={() => planForm.submit()}
        okText="Tạo Kế hoạch"
        cancelText="Hủy"
      >
        <Form form={planForm} layout="vertical" onFinish={handleCreatePlan}>
          <Form.Item
            name="title"
            label="Tên Kế hoạch"
            initialValue={`Kế hoạch tuần ${weekStart.format('DD/MM')} - ${weekEnd.format('DD/MM/YYYY')}`}
            rules={[{ required: true, message: 'Vui lòng nhập tên kế hoạch' }]}
          >
            <Input placeholder="Nhập tên kế hoạch..." />
          </Form.Item>

          <Form.Item name="description" label="Ghi chú / Mục tiêu chính">
            <TextArea rows={3} placeholder="Tập trung hoàn thành 3 bài tập lớn RAG, làm đề thi TOEIC..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* CREATE / EDIT TASK MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-base">
            <PlusOutlined className="text-emerald-500" />
            <span>{editingTask ? 'Chỉnh Sửa Nhiệm Vụ' : 'Thêm Nhiệm Vụ Vào Kế Hoạch'}</span>
          </div>
        }
        open={isTaskModalOpen}
        onCancel={() => setIsTaskModalOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width={580}
        className="rounded-2xl overflow-hidden"
      >
        <Form form={taskForm} layout="vertical" onFinish={handleSaveTask} className="mt-2 space-y-2">
          <Form.Item
            name="title"
            label={<span className="font-bold text-xs uppercase tracking-wider text-slate-500">Tên Nhiệm vụ</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên nhiệm vụ' }]}
          >
            <Input placeholder="Ví dụ: Luyện đề TOEIC, Viết API RAG..." className="rounded-xl border-2 p-2.5 font-medium text-sm" />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className="font-bold text-xs uppercase tracking-wider text-slate-500">Mô tả chi tiết</span>}
          >
            <TextArea rows={2} placeholder="Nội dung cần thực hiện..." className="rounded-xl border-2 p-2.5 font-medium text-sm" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="scheduled_date"
              label={<span className="font-bold text-xs uppercase tracking-wider text-slate-500">Ngày thực hiện</span>}
              rules={[{ required: true, message: 'Chọn ngày' }]}
            >
              <DatePicker format="DD/MM/YYYY" className="w-full rounded-xl border-2 p-2" />
            </Form.Item>

            <Form.Item
              name="source_type"
              label={<span className="font-bold text-xs uppercase tracking-wider text-slate-500">Nguồn nhiệm vụ (Source)</span>}
            >
              <Select options={Object.entries(SOURCE_CONFIG).map(([key, val]) => ({ label: val.label, value: key }))} size="large" className="rounded-xl" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Form.Item
              name="start_time"
              label={<span className="font-bold text-xs uppercase tracking-wider text-slate-500">Giờ bắt đầu</span>}
            >
              <Select options={TIME_SLOTS.map((t) => ({ label: t, value: t }))} size="large" />
            </Form.Item>

            <Form.Item
              name="end_time"
              label={<span className="font-bold text-xs uppercase tracking-wider text-slate-500">Giờ kết thúc</span>}
            >
              <Select options={TIME_SLOTS.map((t) => ({ label: t, value: t }))} size="large" />
            </Form.Item>

            <Form.Item
              name="estimated_duration"
              label={<span className="font-bold text-xs uppercase tracking-wider text-slate-500">Thời lượng (Phút)</span>}
            >
              <InputNumber min={15} step={15} className="w-full" size="large" placeholder="60" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="priority"
              label={<span className="font-bold text-xs uppercase tracking-wider text-slate-500">Độ ưu tiên</span>}
            >
              <Select
                size="large"
                options={[
                  { label: 'Thấp (Low)', value: 'low' },
                  { label: 'Trung bình (Medium)', value: 'medium' },
                  { label: 'Cao (High)', value: 'high' },
                  { label: 'Khẩn cấp (Urgent)', value: 'urgent' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="status"
              label={<span className="font-bold text-xs uppercase tracking-wider text-slate-500">Trạng thái</span>}
            >
              <Select
                size="large"
                options={[
                  { label: 'Cần làm (Todo)', value: 'todo' },
                  { label: 'Đang làm (In Progress)', value: 'in_progress' },
                  { label: 'Hoàn thành (Completed)', value: 'completed' },
                  { label: 'Bỏ qua (Skipped)', value: 'skipped' },
                ]}
              />
            </Form.Item>
          </div>

          {/* 3D Voxel Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => taskForm.submit()}
              className="btn-voxel-green text-xs px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
            >
              <PlusOutlined />
              <span>{editingTask ? 'Lưu Thay Đổi' : 'Thêm Nhiệm Vụ'}</span>
            </button>
          </div>
        </Form>
      </Modal>

      {/* STUDY SESSION DETAIL MODAL */}
      {detailTask && (
        <Modal
          title={
            <div className="flex items-center gap-2 pr-6">
              <Tag color={PRIORITY_CONFIG[detailTask.priority]?.color || 'blue'}>
                {PRIORITY_CONFIG[detailTask.priority]?.label || detailTask.priority}
              </Tag>
              <span className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                📖 {detailTask.topic || detailTask.title}
              </span>
            </div>
          }
          open={!!detailTask}
          onCancel={() => setDetailTask(null)}
          width={650}
          centered
          className="rounded-2xl overflow-hidden"
          footer={[
            <Popconfirm
              key="delete"
              title="Xóa buổi học này?"
              description="Bạn có chắc chắn muốn xóa buổi học này khỏi Study Plan?"
              onConfirm={() => handleDeleteTask(detailTask.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>,
            <Button key="edit" icon={<EditOutlined />} onClick={() => openTaskModal(detailTask)}>
              Chỉnh sửa
            </Button>,
            <Button
              key="start-workspace"
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartStudySession(detailTask)}
              className="bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder font-extrabold px-6 rounded-xl shadow-md text-white"
            >
              {detailTask.status === 'in_progress' || detailTask.status === 'IN_PROGRESS'
                ? '⚡ Tiếp tục Học tập (Workspace)'
                : detailTask.status === 'completed' || detailTask.status === 'COMPLETED'
                ? '🔍 Xem Workspace Buổi học'
                : '▶ Start Study Session (Bắt đầu học)'}
            </Button>,
            <Button
              key="toggle"
              type="default"
              icon={<CheckCircleOutlined />}
              onClick={() => handleToggleTaskStatus(detailTask)}
              className="rounded-xl font-bold"
            >
              {detailTask.status === 'completed' || detailTask.status === 'COMPLETED'
                ? 'Đánh dấu Chưa học'
                : 'Đánh dấu Hoàn thành'}
            </Button>,
          ]}
        >
          <div className="space-y-4 py-2 text-xs">
            {/* Header info bar */}
            <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-amber-50/70 border-amber-200/60'
            }`}>
              <div className="flex items-center gap-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                <ClockCircleOutlined className="text-emerald-500" />
                <span>
                  {detailTask.scheduled_date ? dayjs(detailTask.scheduled_date).format('DD/MM/YYYY') : 'Chưa xếp ngày'}
                  {' · '}
                  {detailTask.start_time || '--:--'} – {detailTask.end_time || '--:--'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Thời lượng dự kiến:</span>
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {detailTask.estimated_duration || detailTask.estimated_minutes || 60} phút
                </span>
              </div>
            </div>

            {/* Course & Topic */}
            {detailTask.course_name && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOutlined className="text-blue-500 text-base" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-400 block">Khóa học / Mon học:</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">{detailTask.course_name}</span>
                  </div>
                </div>
                {detailTask.course_id && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<FolderOpenOutlined />}
                    onClick={() => {
                      setDetailTask(null);
                      navigate(`/courses/${detailTask.course_id}`);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 font-semibold"
                  >
                    Xem Khóa học
                  </Button>
                )}
              </div>
            )}

            {/* What to study (Nội dung cần học) */}
            {detailTask.what_to_study && detailTask.what_to_study.length > 0 && (
              <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                  <BookOutlined />
                  <span>Nội dung cần học (What to study):</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700 dark:text-slate-300 font-medium">
                  {detailTask.what_to_study.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* What to do (Hoạt động cần làm) */}
            {detailTask.what_to_do && detailTask.what_to_do.length > 0 && (
              <div className="p-3.5 rounded-xl border bg-purple-500/5 border-purple-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-extrabold text-xs uppercase tracking-wider">
                  <FileTextOutlined />
                  <span>Hoạt động thực hiện (What to do):</span>
                </div>
                <div className="space-y-1 pl-1 text-slate-700 dark:text-slate-300 font-medium">
                  {detailTask.what_to_do.map((act, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-purple-500 font-bold shrink-0">{idx + 1}.</span>
                      <span>{act.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Material (Tài liệu học tập liên quan) */}
            <div className="p-3.5 rounded-xl border bg-slate-500/5 border-slate-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 font-extrabold text-xs uppercase tracking-wider">
                  <FileTextOutlined className="text-amber-500" />
                  <span>Tài liệu học tập (Course Material):</span>
                </div>
              </div>

              {detailTask.material_title && detailTask.material_title !== "No matching course material was found." ? (
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="font-extrabold text-amber-700 dark:text-amber-300 text-xs truncate">
                    📄 {detailTask.material_title}
                  </span>
                  <Button
                    type="primary"
                    size="small"
                    icon={<LinkOutlined />}
                    onClick={() => {
                      setDetailTask(null);
                      if (detailTask.course_id) {
                        navigate(`/courses/${detailTask.course_id}`);
                      } else {
                        navigate('/courses');
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-500 font-bold text-xs shrink-0"
                  >
                    Open Material
                  </Button>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-800/20 text-slate-400 italic text-xs">
                  No matching course material was found.
                </div>
              )}
            </div>

            {/* Related Assignment & Goal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detailTask.assignment_id && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-blue-400 block">Bài tập liên quan (Assignment):</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs truncate">
                      {detailTask.title}
                    </span>
                    <Button
                      type="default"
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => {
                        setDetailTask(null);
                        const cId = detailTask.course_id || 'all';
                        navigate(`/courses/${cId}?assignment=${detailTask.assignment_id}`);
                      }}
                      className="text-xs font-bold shrink-0"
                    >
                      Open Assignment
                    </Button>
                  </div>
                </div>
              )}

              {detailTask.goal_title && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-purple-400 block">Mục tiêu cá nhân (Personal Goal):</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs block truncate">
                    {detailTask.goal_title}
                  </span>
                </div>
              )}
            </div>

            {/* Reason / Explanation */}
            {detailTask.reason && (
              <div className="p-3.5 rounded-xl border bg-blue-500/5 border-blue-500/20 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-500 font-extrabold text-xs uppercase tracking-wider">
                  <QuestionCircleOutlined />
                  <span>Tại sao đề xuất buổi học này (Why recommended):</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-medium m-0 leading-relaxed">
                  {detailTask.reason}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* AI PLAN REQUEST MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-base">
            <RobotOutlined className="text-xl text-emerald-500" />
            <span>AI Lập Study Plan Tự Động</span>
          </div>
        }
        open={isAIModalOpen}
        onCancel={() => !isGeneratingAI && setIsAIModalOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width={540}
        className="rounded-2xl overflow-hidden"
      >
        <div className="space-y-4 py-2">
          {/* Assignment Selector for Focused Study Roadmap */}
          <div>
            <label className={`block text-xs font-extrabold mb-1.5 uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Chọn Bài tập để lập Lộ trình học tập (Tùy chọn):
            </label>
            <Select
              allowClear
              placeholder="Chọn bài tập cần lên lộ trình (Ví dụ: Assignment 2...)"
              size="large"
              value={selectedAssignmentId}
              onChange={(val) => setSelectedAssignmentId(val)}
              className="w-full"
              options={availableAssignments.map((a) => {
                const aDue = a.due_date || a.due_at;
                return {
                  label: `[${a.course_name || 'Môn học'}] ${a.title} ${aDue ? `(Deadline: ${dayjs(aDue).format('DD/MM/YYYY')})` : ''}`,
                  value: a.id,
                };
              })}
            />
          </div>

          <div className={`p-4 rounded-2xl border-2 space-y-1 ${
            isDark
              ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder text-slate-100'
              : 'bg-emerald-50/80 border-minecraft-grassBorder text-slate-900 shadow-sm'
          }`}>
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <span className="font-extrabold text-emerald-800 dark:text-emerald-300">Khoảng thời gian lập lộ trình:</span>
              <span className="badge-voxel-green text-xs font-extrabold px-3 py-1 font-mono">
                {selectedAssignment && (selectedAssignment.due_date || selectedAssignment.due_at)
                  ? `Hôm nay (${dayjs().format('DD/MM')}) ➔ Deadline (${dayjs(selectedAssignment.due_date || selectedAssignment.due_at).format('DD/MM/YYYY')})`
                  : `Tự động linh hoạt theo Hạn nộp Bài tập (Từ hôm nay ${dayjs().format('DD/MM')})`
                }
              </span>
            </div>
          </div>

          {/* Quick preset suggestions */}
          <div>
            <label className={`block text-xs font-extrabold mb-1.5 uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Gợi ý yêu cầu nhanh:
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'Chuẩn bị làm bài tập trong 5 ngày tới',
                'Lên kế hoạch học tập 2 tuần tới',
                'Tập trung ôn tập theo Mục tiêu cá nhân',
                'Lập lịch học chuẩn bị cho kỳ thi sắp tới',
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAiPlanRequest(preset)}
                  className="text-xs font-medium px-3 py-1 rounded-xl border bg-black/5 dark:bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-xs font-extrabold mb-1.5 uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Nhu cầu học tập của bạn (Tùy chỉnh):
            </label>
            <TextArea
              rows={4}
              value={aiPlanRequest}
              onChange={(e) => setAiPlanRequest(e.target.value)}
              placeholder="Ví dụ: Giúp mình chuẩn bị bài tập môn Machine Learning trong 5 ngày tới, đối chiếu bài giảng liên quan..."
              disabled={isGeneratingAI}
              className="rounded-2xl border-2 font-medium p-3 text-sm focus:border-minecraft-grassBorder shadow-sm"
            />
          </div>

          {isGeneratingAI && (
            <InlinePlanningLoadingOrb
              isLoading={isGeneratingAI}
              assignmentTitle={selectedAssignment?.title}
            />
          )}

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              onClick={() => setIsAIModalOpen(false)}
              disabled={isGeneratingAI}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isGeneratingAI}
              onClick={handleGenerateAIPlan}
              className="btn-voxel-gold text-xs px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer"
            >
              <RobotOutlined />
              <span>Tạo Study Plan AI</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* AI RESULT PREVIEW & ACCEPT MODAL */}
      <Modal
        title={
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-extrabold text-lg">
              <RocketOutlined className="text-xl text-emerald-600 dark:text-emerald-400" />
              <span>Dự Thảo Phân Bổ Lịch Học AI — Đọc & Tùy Chỉnh Lịch</span>
            </div>
            <span className="badge-voxel-gold text-xs font-bold px-3 py-1">
              DỰ THẢO (CHƯA LƯU)
            </span>
          </div>
        }
        open={aiResultModalOpen}
        onCancel={handleRejectAIPlan}
        footer={
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 flex-wrap gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Nhấn nút xóa để loại bỏ buổi học không muốn xếp lịch.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRejectAIPlan}
                disabled={isApplyingAI}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAcceptAIPlan}
                disabled={isApplyingAI || (aiResultData?.proposed_tasks || (aiResultData?.created_tasks as any) || []).length === 0}
                className="btn-voxel-green text-xs px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-voxel active:translate-y-1 transition-all cursor-pointer"
              >
                {isApplyingAI ? <Spin size="small" /> : <CheckCircleOutlined />}
                <span>{isApplyingAI ? 'Đang lưu kế hoạch...' : 'Chấp nhận & Lưu kế hoạch'}</span>
              </button>
            </div>
          </div>
        }
        destroyOnClose
        centered
        width={840}
        className="rounded-3xl overflow-hidden"
      >
        {aiResultData && (
          <div className="space-y-4 py-2 text-xs">


            {/* Proposed Tasks Interactive Review List Grouped by Day */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <CalendarOutlined className="text-emerald-600 dark:text-emerald-400" />
                  <span>Phân bổ lịch học theo ngày (Kiểm tra & Xóa nếu không thích):</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Nhấn nút xóa để loại bỏ buổi học
                </span>
              </div>

              {proposedTasksGroupedByDate.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 m-0">
                    Không còn buổi học nào trong danh sách dự thảo.
                  </p>
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
                          const priorityCfg = PRIORITY_CONFIG[task.priority?.toLowerCase()] || PRIORITY_CONFIG.medium;
                          return (
                            <div
                              key={task.id || task._originalIndex}
                              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group relative"
                            >
                              {/* PROMINENT TIME BLOCK */}
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

                              {/* Task Details */}
                              <div className="flex-1 space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                                    {task.title}
                                  </span>
                                  <Tag color={priorityCfg.color} className="rounded-md font-bold text-[10px] m-0">
                                    {priorityCfg.label}
                                  </Tag>
                                  {task.course_name && (
                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                      {task.course_name}
                                    </span>
                                  )}
                                </div>

                                {task.reason && (
                                  <p className="text-xs text-slate-600 dark:text-slate-400 m-0 font-medium leading-relaxed">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">Mục tiêu:</span> {task.reason}
                                  </p>
                                )}

                                {task.what_to_study && task.what_to_study.length > 0 && (
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

                              {/* Remove Task Button */}
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
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WeeklyPlanPage;
