import React, { useEffect, useState, useMemo } from 'react';
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
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isBetween);
dayjs.extend(isoWeek);

import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { weeklyPlanService } from '../services/weeklyPlanService';
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
  high: { label: 'Cao', color: 'orange' },
  HIGH: { label: 'Cao', color: 'orange' },
  medium: { label: 'Trung bình', color: 'blue' },
  MEDIUM: { label: 'Trung bình', color: 'blue' },
  low: { label: 'Thấp', color: 'default' },
  LOW: { label: 'Thấp', color: 'default' },
};

export const WeeklyPlanPage: React.FC = () => {
  const { user } = useAuth();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

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
  const [aiPlanRequest, setAiPlanRequest] = useState<string>('');
  const [aiResultModalOpen, setAiResultModalOpen] = useState<boolean>(false);
  const [aiResultData, setAiResultData] = useState<PlannerAgentResponseResult | null>(null);

  // Active week date range
  const weekStart = useMemo(() => currentMonday.startOf('day'), [currentMonday]);
  const weekEnd = useMemo(() => currentMonday.add(6, 'day').endOf('day'), [currentMonday]);

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => currentMonday.add(i, 'day'));
  }, [currentMonday]);

  // Fetch Weekly Plans
  const fetchWeeklyPlans = async () => {
    try {
      setLoading(true);
      const plans = await weeklyPlanService.getWeeklyPlans();
      setWeeklyPlans(plans);

      // Find plan matching active week
      const currentPlan = plans.find((p) => {
        const pStart = dayjs(p.week_start_date);
        return pStart.isSame(weekStart, 'day') || (pStart.isAfter(weekStart.subtract(1, 'day')) && pStart.isBefore(weekEnd));
      });

      setActivePlan(currentPlan || null);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tải Kế hoạch tuần');
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
        title: values.title || `Kế hoạch tuần ${weekStart.format('DD/MM')} - ${weekEnd.format('DD/MM/YYYY')}`,
        description: values.description,
        week_start_date: weekStart.toISOString(),
        week_end_date: weekEnd.toISOString(),
        status: 'ACTIVE' as const,
      };

      const newPlan = await weeklyPlanService.createWeeklyPlan(payload);
      message.success('Tạo Kế hoạch tuần mới thành công!');
      setIsCreatePlanModalOpen(false);
      planForm.resetFields();
      fetchWeeklyPlans();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tạo Kế hoạch tuần');
    }
  };

  // Generate AI Plan
  const handleGenerateAIPlan = async () => {
    setIsGeneratingAI(true);
    try {
      const payload = {
        week_start: weekStart.format('YYYY-MM-DD'),
        request: aiPlanRequest.trim() || undefined,
      };
      const res = await weeklyPlanService.generateAIPlan(payload);
      message.success('Tạo Kế hoạch AI thành công!');
      setAiResultData(res);
      setIsAIModalOpen(false);
      setAiResultModalOpen(true);
      setAiPlanRequest('');
      fetchWeeklyPlans();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tạo Kế hoạch bằng AI. Vui lòng thử lại.');
    } finally {
      setIsGeneratingAI(false);
    }
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
      message.error(err.response?.data?.detail || 'Không thể lưu nhiệm vụ');
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
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-[#0b0914] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header Section */}
        <div className={`p-6 border-b backdrop-blur-md sticky top-0 z-30 transition-colors ${
          isDark ? 'bg-[#0f0d1b]/90 border-slate-800' : 'bg-white/90 border-slate-200'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarOutlined className="text-blue-500 text-2xl" />
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Weekly Plan (Kế hoạch tuần)
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Lên lịch biểu cá nhân, quản lý nhiệm vụ và thời gian biểu trong tuần
              </p>
            </div>

            {/* Week Navigation Header */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200 shadow-sm'
              }`}>
                <Button type="text" size="small" icon={<LeftOutlined />} onClick={handlePrevWeek} title="Tuần trước" />
                <span className="font-semibold text-sm px-2">
                  {weekStart.format('DD MMM')} - {weekEnd.format('DD MMM, YYYY')}
                </span>
                <Button type="text" size="small" icon={<RightOutlined />} onClick={handleNextWeek} title="Tuần sau" />
                <Button type="text" size="small" onClick={handleToday} className="ml-1 text-blue-500 font-medium">
                  Hôm nay
                </Button>
              </div>

              {/* View Mode Toggle Button */}
              <div className={`flex items-center p-1 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/60 border-slate-300'
              }`}>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarOutlined /> Calendar View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UnorderedListOutlined /> List View
                </button>
              </div>

              {/* AI Plan Button */}
              {isStudent && (
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={() => setIsAIModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold border-none shadow-md shadow-purple-500/20"
                >
                  AI Plan My Week
                </Button>
              )}

              {/* Add Task Button */}
              {activePlan && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openTaskModal()}
                  className="bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold border-none shadow-md shadow-blue-500/20"
                >
                  Thêm nhiệm vụ
                </Button>
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
            <div className={`flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed text-center max-w-xl mx-auto my-12 ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
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
                <div className={`rounded-2xl border overflow-hidden shadow-xl ${
                  isDark ? 'bg-[#0f0d1b] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  {/* Grid Header: Days of Week */}
                  <div className={`grid grid-cols-8 border-b text-center font-semibold text-xs tracking-wider uppercase sticky top-0 z-20 ${
                    isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <div className="py-3 px-2 border-r border-slate-700/30 flex items-center justify-center text-slate-400">
                      Time
                    </div>
                    {daysOfWeek.map((day, idx) => {
                      const isToday = day.isSame(dayjs(), 'day');
                      return (
                        <div
                          key={idx}
                          className={`py-3 px-1 border-r border-slate-700/20 last:border-r-0 flex flex-col items-center justify-center ${
                            isToday ? 'bg-blue-500/10 text-blue-400 font-bold' : ''
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
                        <div key={slot} className="grid grid-cols-8 min-h-[72px] transition-colors hover:bg-blue-500/[0.02]">
                          {/* Time label */}
                          <div className={`p-2 text-xs font-mono border-r border-slate-700/20 flex items-start justify-center ${
                            isDark ? 'text-slate-500 bg-slate-950/40' : 'text-slate-400 bg-slate-50'
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
                                className={`p-1.5 border-r border-slate-700/20 last:border-r-0 relative group cursor-pointer transition-colors ${
                                  isDark ? 'hover:bg-slate-900/50' : 'hover:bg-blue-50/50'
                                }`}
                              >
                                {slotTasks.map((task) => {
                                  const isCompleted = task.status === 'completed' || task.status === 'COMPLETED';
                                  const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                                  const sourceConf = SOURCE_CONFIG[task.source_type] || SOURCE_CONFIG.MANUAL;

                                  return (
                                    <div
                                      key={task.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailTask(task);
                                      }}
                                      className={`p-2 rounded-xl border text-xs shadow-md mb-1.5 cursor-pointer transition-all hover:scale-[1.02] ${
                                        isCompleted
                                          ? isDark
                                            ? 'bg-slate-900/80 border-slate-800 text-slate-500 line-through opacity-70'
                                            : 'bg-slate-100 border-slate-200 text-slate-400 line-through opacity-70'
                                          : isDark
                                          ? 'bg-slate-900/90 border-blue-500/30 text-white hover:border-blue-400 shadow-blue-500/5'
                                          : 'bg-white border-blue-200 text-slate-900 hover:border-blue-400 shadow-sm'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="font-bold truncate text-xs text-blue-400">
                                          {task.start_time || slot} {task.end_time ? `- ${task.end_time}` : ''}
                                        </span>
                                        <Tag color={priorityConf.color} style={{ marginRight: 0, fontSize: '10px', padding: '0 4px', lineHeight: '14px' }}>
                                          {priorityConf.label}
                                        </Tag>
                                      </div>

                                      <p className="font-semibold truncate text-xs leading-snug mb-1">{task.title}</p>

                                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800/40">
                                        <span className="flex items-center gap-1 truncate text-slate-400">
                                          {sourceConf.icon} {sourceConf.label.split(' ')[0]}
                                        </span>
                                        {task.estimated_duration && (
                                          <span className="font-mono text-slate-400">
                                            {task.estimated_duration}m
                                          </span>
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
                        className={`rounded-2xl border p-5 transition-all ${
                          isDark
                            ? 'bg-[#0f0d1b] border-slate-800'
                            : 'bg-white border-slate-200 shadow-sm'
                        } ${isToday ? 'ring-2 ring-blue-500/40' : ''}`}
                      >
                        {/* Day Section Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800/40 mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-base font-bold ${isToday ? 'text-blue-500' : isDark ? 'text-white' : 'text-slate-900'}`}>
                              {DAY_NAMES_FULL[dayIdx]}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              ({day.format('DD/MM/YYYY')})
                            </span>
                            {isToday && (
                              <Tag color="blue" className="rounded-full px-2 text-[10px]">Hôm nay</Tag>
                            )}
                          </div>

                          <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => openTaskModal(undefined, day)}
                            className="text-blue-500 hover:text-blue-400 text-xs font-semibold"
                          >
                            Thêm nhiệm vụ
                          </Button>
                        </div>

                        {/* Task List under this Day */}
                        {dayTasks.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-2">Chưa có nhiệm vụ nào cho ngày này.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dayTasks.map((task) => {
                              const isCompleted = task.status === 'completed' || task.status === 'COMPLETED';
                              const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                              const sourceConf = SOURCE_CONFIG[task.source_type] || SOURCE_CONFIG.MANUAL;

                              return (
                                <div
                                  key={task.id}
                                  onClick={() => setDetailTask(task)}
                                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                                    isCompleted
                                      ? isDark
                                        ? 'bg-slate-900/50 border-slate-800 opacity-60'
                                        : 'bg-slate-50 border-slate-200 opacity-70'
                                      : isDark
                                      ? 'bg-slate-900 border-slate-800 hover:border-blue-500/50'
                                      : 'bg-white border-slate-200 hover:border-blue-300'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<CheckCircleOutlined className={isCompleted ? 'text-emerald-500' : 'text-slate-400'} />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleTaskStatus(task);
                                        }}
                                      />
                                      <h3 className={`font-semibold text-sm truncate ${isCompleted ? 'line-through text-slate-500' : isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {task.title}
                                      </h3>
                                    </div>
                                    <Tag color={priorityConf.color} className="mr-0 text-[10px]">
                                      {priorityConf.label}
                                    </Tag>
                                  </div>

                                  {task.description && (
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 pl-8">
                                      {task.description}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/30 pl-8">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                      <ClockCircleOutlined />
                                      <span>
                                        {task.start_time || 'Chưa định thời gian'} {task.end_time ? `- ${task.end_time}` : ''}
                                      </span>
                                    </div>

                                    <Tag icon={sourceConf.icon} color={sourceConf.color} className="mr-0 text-[10px]">
                                      {sourceConf.label.split(' ')[0]}
                                    </Tag>
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
        title={editingTask ? 'Chỉnh sửa Nhiệm vụ' : 'Thêm Nhiệm vụ vào Kế hoạch'}
        open={isTaskModalOpen}
        onCancel={() => setIsTaskModalOpen(false)}
        onOk={() => taskForm.submit()}
        okText={editingTask ? 'Lưu thay đổi' : 'Thêm Nhiệm vụ'}
        cancelText="Hủy"
        width={560}
      >
        <Form form={taskForm} layout="vertical" onFinish={handleSaveTask} className="mt-4">
          <Form.Item
            name="title"
            label="Tên Nhiệm vụ"
            rules={[{ required: true, message: 'Vui lòng nhập tên nhiệm vụ' }]}
          >
            <Input placeholder="Ví dụ: Luyện đề TOEIC, Viết API RAG..." />
          </Form.Item>

          <Form.Item name="description" label="Mô tả chi tiết">
            <TextArea rows={2} placeholder="Nội dung cần thực hiện..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="scheduled_date"
              label="Ngày thực hiện"
              rules={[{ required: true, message: 'Chọn ngày' }]}
            >
              <DatePicker format="DD/MM/YYYY" className="w-full" />
            </Form.Item>

            <Form.Item name="source_type" label="Nguồn nhiệm vụ (Task Source)">
              <Select options={Object.entries(SOURCE_CONFIG).map(([key, val]) => ({ label: val.label, value: key }))} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Form.Item name="start_time" label="Giờ bắt đầu">
              <Select options={TIME_SLOTS.map((t) => ({ label: t, value: t }))} />
            </Form.Item>

            <Form.Item name="end_time" label="Giờ kết thúc">
              <Select options={TIME_SLOTS.map((t) => ({ label: t, value: t }))} />
            </Form.Item>

            <Form.Item name="estimated_duration" label="Thời lượng (Phút)">
              <InputNumber min={15} step={15} className="w-full" placeholder="60" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="priority" label="Độ ưu tiên">
              <Select
                options={[
                  { label: 'Thấp (Low)', value: 'low' },
                  { label: 'Trung bình (Medium)', value: 'medium' },
                  { label: 'Cao (High)', value: 'high' },
                  { label: 'Khẩn cấp (Urgent)', value: 'urgent' },
                ]}
              />
            </Form.Item>

            <Form.Item name="status" label="Trạng thái">
              <Select
                options={[
                  { label: 'Cần làm (Todo)', value: 'todo' },
                  { label: 'Đang làm (In Progress)', value: 'in_progress' },
                  { label: 'Hoàn thành (Completed)', value: 'completed' },
                  { label: 'Bỏ qua (Skipped)', value: 'skipped' },
                ]}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* TASK DETAIL MODAL */}
      {detailTask && (
        <Modal
          title={
            <div className="flex items-center gap-2">
              <Tag color={PRIORITY_CONFIG[detailTask.priority]?.color || 'blue'}>
                {PRIORITY_CONFIG[detailTask.priority]?.label || detailTask.priority}
              </Tag>
              <span className="font-bold text-base">{detailTask.title}</span>
            </div>
          }
          open={!!detailTask}
          onCancel={() => setDetailTask(null)}
          footer={[
            <Popconfirm
              key="delete"
              title="Xóa nhiệm vụ"
              description="Bạn có chắc chắn muốn xóa nhiệm vụ này khỏi kế hoạch?"
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
              key="toggle"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleToggleTaskStatus(detailTask)}
              className={detailTask.status === 'completed' || detailTask.status === 'COMPLETED' ? 'bg-amber-600' : 'bg-emerald-600'}
            >
              {detailTask.status === 'completed' || detailTask.status === 'COMPLETED' ? 'Đánh dấu Cần làm' : 'Đánh dấu Hoàn thành'}
            </Button>,
          ]}
        >
          <div className="space-y-4 py-3">
            {detailTask.description && (
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">Mô tả:</p>
                <p className="text-sm bg-slate-800/30 p-3 rounded-lg border border-slate-700/40">
                  {detailTask.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Thời gian scheduled:</p>
                <p className="font-semibold mt-0.5">
                  {detailTask.scheduled_date ? dayjs(detailTask.scheduled_date).format('DD/MM/YYYY') : 'Chưa định ngày'}{' '}
                  ({detailTask.start_time || '--:--'} - {detailTask.end_time || '--:--'})
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Thời lượng dự kiến:</p>
                <p className="font-semibold mt-0.5">{detailTask.estimated_duration || detailTask.estimated_minutes || 60} phút</p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Nguồn nhiệm vụ (Task Source):</p>
                <Tag color={SOURCE_CONFIG[detailTask.source_type]?.color || 'blue'} className="mt-1">
                  {SOURCE_CONFIG[detailTask.source_type]?.label || detailTask.source_type}
                </Tag>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Trạng thái:</p>
                <Tag color={detailTask.status === 'completed' || detailTask.status === 'COMPLETED' ? 'green' : 'gold'} className="mt-1">
                  {detailTask.status}
                </Tag>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* AI PLAN MY WEEK REQUEST MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-purple-500 font-bold text-lg">
            <RobotOutlined className="text-xl" />
            <span>AI Plan My Week (Tự động lập kế hoạch)</span>
          </div>
        }
        open={isAIModalOpen}
        onCancel={() => !isGeneratingAI && setIsAIModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
            <span className="font-semibold text-purple-400">Khoảng thời gian lên lịch: </span>
            <span className="font-bold text-slate-200">
              {weekStart.format('DD/MM/YYYY')} - {weekEnd.format('DD/MM/YYYY')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-300">
              Bạn muốn tập trung vào điều gì tuần này? (Tùy chọn)
            </label>
            <TextArea
              rows={4}
              value={aiPlanRequest}
              onChange={(e) => setAiPlanRequest(e.target.value)}
              placeholder="Ví dụ: Tuần này mình có bài tập môn Python sắp tới hạn, hãy ưu tiên giúp mình xếp lịch làm bài tập và chuẩn bị trước 2 ngày..."
              disabled={isGeneratingAI}
            />
          </div>

          {isGeneratingAI && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
              <Spin size="small" />
              <span className="text-xs font-medium text-blue-400">
                🤖 AI đang phân tích bài tập, mục tiêu và xếp lịch tự động cho bạn...
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setIsAIModalOpen(false)} disabled={isGeneratingAI}>
              Hủy
            </Button>
            <Button
              type="primary"
              loading={isGeneratingAI}
              onClick={handleGenerateAIPlan}
              className="bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold border-none"
            >
              Tạo Kế Hoạch AI
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI RESULT SUMMARY MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-lg">
            <CheckCircleOutlined className="text-xl" />
            <span>Kế hoạch AI đã sẵn sàng!</span>
          </div>
        }
        open={aiResultModalOpen}
        onOk={() => setAiResultModalOpen(false)}
        onCancel={() => setAiResultModalOpen(false)}
        okText="Đóng"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        {aiResultData && (
          <div className="space-y-4 py-2 text-xs">
            <p className="text-sm font-semibold text-slate-300">{aiResultData.summary}</p>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="block text-lg font-bold text-emerald-400">
                  {aiResultData.created_tasks?.length || 0}
                </span>
                <span className="text-slate-400">Nhiệm vụ được tạo</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <span className="block text-lg font-bold text-blue-400">
                  {aiResultData.skipped_items?.length || 0}
                </span>
                <span className="text-slate-400">Mục đã hoãn/bỏ qua</span>
              </div>
            </div>

            {aiResultData.warnings?.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <span className="font-bold text-amber-400">Lưu ý & Đánh đổi:</span>
                <ul className="list-disc list-inside text-slate-300">
                  {aiResultData.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WeeklyPlanPage;
