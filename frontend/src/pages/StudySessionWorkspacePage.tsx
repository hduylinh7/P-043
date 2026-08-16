import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Tag,
  Spin,
  message,
  Modal,
  Form,
  Input,
  Select,
  Radio,
  Tabs,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BookOutlined,
  FileTextOutlined,
  LinkOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
  TrophyOutlined,
  DownloadOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  FilePdfOutlined,
  EyeOutlined,
  ExperimentOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

import { Sidebar } from '../components/Sidebar';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { weeklyPlanService } from '../services/weeklyPlanService';
import { materialService } from '../services/materialService';
import { api, ChatMessage } from '../services/api';
import { PlanTask, TaskReflectionData } from '../types/weeklyPlan';

const { TextArea } = Input;

export const StudySessionWorkspacePage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  // Task & Workspace State
  const [task, setTask] = useState<PlanTask | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('plan');
  const [completedActivities, setCompletedActivities] = useState<string[]>([]);
  const [extractedTextContent, setExtractedTextContent] = useState<string | null>(null);
  const [materialFileName, setMaterialFileName] = useState<string | null>(null);
  const [materialMimeType, setMaterialMimeType] = useState<string | null>(null);

  // Session Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Reflection Modal State
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState<boolean>(false);
  const [submittingReflection, setSubmittingReflection] = useState<boolean>(false);
  const [reflectionForm] = Form.useForm();

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Task Details
  const fetchTaskDetails = async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const fetchedTask = await weeklyPlanService.getTaskById(taskId);
      setCompletedActivities(fetchedTask.completed_activities || []);

      if (fetchedTask.course_id) {
        let matId = fetchedTask.material_id;
        if (!matId && fetchedTask.material_title && fetchedTask.material_title !== 'No matching course material was found.') {
          try {
            const courseMaterials = await materialService.getCourseMaterials(fetchedTask.course_id);
            const matched = courseMaterials.find((m) =>
              m.title.toLowerCase().includes(fetchedTask.material_title!.toLowerCase()) ||
              m.file_name.toLowerCase().includes(fetchedTask.material_title!.toLowerCase()) ||
              fetchedTask.material_title!.toLowerCase().includes(m.title.toLowerCase())
            );
            if (matched) {
              matId = matched.id;
              fetchedTask.material_id = matched.id;
            }
          } catch (e) {
            console.warn('Course material lookup failed:', e);
          }
        }

        if (matId) {
          try {
            const contentRes = await materialService.getMaterialContent(fetchedTask.course_id, matId);
            setExtractedTextContent(contentRes.content);
            if (contentRes.file_name) setMaterialFileName(contentRes.file_name);
            if (contentRes.mime_type) setMaterialMimeType(contentRes.mime_type);
          } catch (e) {
            console.warn('Extracted text fetch failed:', e);
          }
        }
      }

      setTask(fetchedTask);

      // Calculate initial elapsed time if started
      if (fetchedTask.started_at) {
        const startMs = new Date(fetchedTask.started_at).getTime();
        const endMs = fetchedTask.completed_at ? new Date(fetchedTask.completed_at).getTime() : Date.now();
        const seconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
        setElapsedSeconds(seconds);
      }
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tải thông tin buổi học.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  // Timer Tick Effect (only if session is in_progress)
  useEffect(() => {
    if (!task) return;
    const isCompleted = task.status === 'completed' || task.status === 'COMPLETED';
    if (isCompleted || !task.started_at) return;

    const interval = setInterval(() => {
      const startMs = new Date(task.started_at!).getTime();
      const seconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [task?.started_at, task?.status]);

  // Scroll Chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Toggle Activity Checklist Item
  const handleToggleActivity = async (activity: string) => {
    if (!task) return;
    const isChecked = completedActivities.includes(activity);
    const updated = isChecked
      ? completedActivities.filter((a) => a !== activity)
      : [...completedActivities, activity];

    setCompletedActivities(updated);
    try {
      const updatedTask = await weeklyPlanService.updateTaskChecklist(task.id, updated);
      setTask(updatedTask);
    } catch (err) {
      message.error('Không thể lưu trạng thái mục cần làm.');
    }
  };

  // Open Reflection Modal
  const handleStartCompletionFlow = () => {
    reflectionForm.resetFields();
    reflectionForm.setFieldsValue({
      what_learned: '',
      understood_well: '',
      struggling_with: '',
      understanding_level: 'mostly',
      achieved_goal: 'yes',
    });
    setIsReflectionModalOpen(true);
  };

  // Submit Reflection & Complete Session
  const handleSubmitReflection = async (values: any) => {
    if (!task) return;
    try {
      setSubmittingReflection(true);
      const reflectionPayload: TaskReflectionData = {
        what_learned: values.what_learned,
        understood_well: values.understood_well,
        struggling_with: values.struggling_with,
        understanding_level: values.understanding_level,
        achieved_goal: values.achieved_goal,
      };

      const updatedTask = await weeklyPlanService.saveTaskReflection(task.id, reflectionPayload);
      setTask(updatedTask);
      setIsReflectionModalOpen(false);
      message.success('Đã lưu Reflection và hoàn thành buổi học! 🎉');
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể lưu phản hồi Reflection.');
    } finally {
      setSubmittingReflection(false);
    }
  };

  // Chat Send Handler
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = (presetText || chatInput).trim();
    if (!textToSend || chatLoading || !task) return;

    if (!presetText) setChatInput('');
    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const contextPayload: Record<string, unknown> = {
        task_id: task.id,
        course_name: task.course_name,
        course_id: task.course_id,
        topic: task.topic || task.title,
        what_to_study: task.what_to_study,
        what_to_do: task.what_to_do,
        material_title: task.material_title,
        material_id: task.material_id,
        assignment_id: task.assignment_id,
        goal_title: task.goal_title,
        reason: task.reason,
      };

      const res = await api.sendMessage(
        textToSend,
        chatSessionId,
        user?.id,
        task.course_id || undefined,
        task.material_id || undefined,
        task.material_id ? 'material' : 'companion',
        contextPayload
      );

      if (!chatSessionId && res.session_id) {
        setChatSessionId(res.session_id);
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.response,
        citations: res.citations,
        sources: res.sources,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Không thể kết nối tới AI Learning Companion.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Format Timer
  const formattedTimer = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // Compute Material Stream URL
  const materialStreamUrl = useMemo(() => {
    if (!task?.course_id || !task?.material_id) return null;
    const token = localStorage.getItem('access_token');
    return `/api/v1/courses/${task.course_id}/materials/${task.material_id}/download?inline=true&token=${token}`;
  }, [task?.course_id, task?.material_id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <Spin size="large" tip="Đang khởi tạo không gian học tập..." />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <div className="text-center space-y-4">
          <p className="text-lg font-bold text-rose-400">Không tìm thấy thông tin buổi học.</p>
          <Button type="primary" onClick={() => navigate('/calendar')}>
            Quay lại My Learning Calendar
          </Button>
        </div>
      </div>
    );
  }

  const isCompleted = task.status === 'completed' || task.status === 'COMPLETED';
  const isInProgress = task.status === 'in_progress' || task.status === 'IN_PROGRESS';

  return (
    <div className={`flex h-screen font-sans ${isDark ? 'bg-[#0B1117] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR / NAVIGATION HEADER */}
        <header className={`h-16 px-6 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#121B26] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-4 min-w-0">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/calendar')}
              className="font-bold text-slate-400 hover:text-slate-200"
            >
              Quay lại Calendar
            </Button>
            <div className="h-5 w-px bg-slate-700" />
            <div className="truncate">
              <h1 className="font-extrabold text-base truncate m-0 flex items-center gap-2">
                <span>{task.title}</span>
                {isCompleted ? (
                  <Tag color="success" className="font-bold px-2.5 py-0.5 rounded-full">
                    ✓ COMPLETED
                  </Tag>
                ) : isInProgress ? (
                  <Tag color="processing" className="font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                    ⚡ IN PROGRESS
                  </Tag>
                ) : (
                  <Tag color="default" className="font-bold px-2.5 py-0.5 rounded-full">
                    NOT STARTED
                  </Tag>
                )}
              </h1>
            </div>
          </div>

          {/* TIMER & MAIN ACTION */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm ${
              isDark ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              <ClockCircleOutlined className={isInProgress ? 'text-emerald-500 animate-spin' : 'text-emerald-500'} />
              <span>{formattedTimer}</span>
              {task.estimated_duration && (
                <span className="text-xs text-slate-400 font-sans">
                  / {task.estimated_duration}m
                </span>
              )}
            </div>

            {!isCompleted ? (
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleStartCompletionFlow}
                className="bg-emerald-600 hover:bg-emerald-500 font-extrabold px-6 rounded-xl shadow-md"
              >
                Complete Study Session
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs">
                <TrophyOutlined className="text-amber-400 text-base" />
                <span>Buổi học đã hoàn thành!</span>
              </div>
            )}
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA (2-COLUMN LAYOUT) */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* LEFT COLUMN: WORKSPACE & EMBEDDED VIEWER */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* WORKSPACE TABS */}
            <div className={`px-6 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'bg-[#0E1621] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key)}
                className="font-bold border-b-0"
                items={[
                  {
                    key: 'plan',
                    label: (
                      <span className="flex items-center gap-2 px-2 py-1">
                        <FileTextOutlined />
                        <span>Kế hoạch & Checklist</span>
                      </span>
                    ),
                  },
                  {
                    key: 'material',
                    label: (
                      <span className="flex items-center gap-2 px-2 py-1">
                        <BookOutlined className="text-amber-500" />
                        <span>Đọc Tài Liệu {task.material_title ? `(${task.material_title})` : ''}</span>
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">
              {activeTab === 'plan' ? (
                <>
                  {/* COMPLETED SESSION STATE & AI INSIGHT */}
                  {isCompleted && (
                    <div className="p-6 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
                          <TrophyOutlined className="text-amber-400 text-2xl" />
                          <span>🎉 Study Session Completed (Buổi học đã hoàn thành)</span>
                        </div>
                        <Tag color="success" className="font-bold text-xs px-3 py-1 rounded-full">
                          ĐÃ HOÀN THÀNH
                        </Tag>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-700 dark:text-slate-200">
                        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                          <span className="text-slate-400 block uppercase font-bold text-[10px]">Thời lượng thực tế:</span>
                          <span className="font-mono font-bold text-emerald-500 text-sm">{task.actual_duration || 30} phút</span>
                        </div>
                        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                          <span className="text-slate-400 block uppercase font-bold text-[10px]">Thời điểm hoàn thành:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                            {task.completed_at ? dayjs(task.completed_at).format('HH:mm - DD/MM/YYYY') : 'Vừa xong'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                          <span className="text-slate-400 block uppercase font-bold text-[10px]">Đánh giá bản thân:</span>
                          <span className="font-bold text-purple-400 text-xs uppercase">
                            Mức độ: {task.reflection_data?.understanding_level || 'Chưa đánh giá'}
                          </span>
                        </div>
                      </div>

                      {/* AI LEARNING INSIGHT CARD */}
                      {task.ai_insight && (
                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300 font-extrabold text-xs uppercase tracking-wider">
                            <BulbOutlined className="text-amber-400 text-base" />
                            <span>AI Learning Insight (Nhận xét tự động từ AI):</span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-relaxed m-0">
                            {task.ai_insight}
                          </p>

                          {task.suggested_next_focus && (
                            <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between gap-3 flex-wrap">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-purple-400 block">Gợi ý trọng tâm tiếp theo:</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">{task.suggested_next_focus}</span>
                              </div>
                              {task.material_id && (
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<BookOutlined />}
                                  onClick={() => setActiveTab('material')}
                                  className="bg-purple-600 hover:bg-purple-500 font-bold text-xs shrink-0"
                                >
                                  Review Material
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* COURSE & TOPIC CARD */}
                  <div className={`p-5 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-[#121B26] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-blue-500 font-extrabold text-xs uppercase tracking-wider">
                        <BookOutlined />
                        <span>Khóa học: {task.course_name || 'Khóa học chưa phân loại'}</span>
                      </div>
                      {task.scheduled_date && (
                        <span className="text-xs text-slate-400 font-mono font-medium">
                          📅 {dayjs(task.scheduled_date).format('DD/MM/YYYY')} ({task.start_time || '--:--'} – {task.end_time || '--:--'})
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white m-0">
                        {task.topic || task.title}
                      </h2>
                      {task.description && (
                        <p className="text-slate-600 dark:text-slate-300 text-sm mt-1.5 m-0 leading-relaxed font-medium">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* WHAT TO STUDY SECTION */}
                  {task.what_to_study && task.what_to_study.length > 0 && (
                    <div className={`p-5 rounded-2xl border space-y-3 ${
                      isDark ? 'bg-[#121B26] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                        <BookOutlined />
                        <span>Nội dung cần học (What to study):</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                        {task.what_to_study.map((item, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CHECKLIST: WHAT TO DO */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${
                    isDark ? 'bg-[#121B26] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-extrabold text-xs uppercase tracking-wider">
                        <FileTextOutlined />
                        <span>Hoạt động & Checklist (What to do):</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {completedActivities.length} / {(task.what_to_do || []).length} hoàn thành
                      </span>
                    </div>

                    {task.what_to_do && task.what_to_do.length > 0 ? (
                      <div className="space-y-2.5">
                        {task.what_to_do.map((act, idx) => {
                          const cleanText = act.replace(/^\d+\.\s*/, '');
                          const isChecked = completedActivities.includes(cleanText) || completedActivities.includes(act);
                          return (
                            <div
                              key={idx}
                              onClick={() => handleToggleActivity(cleanText)}
                              className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? isDark
                                    ? 'bg-emerald-950/30 border-emerald-500/30 text-slate-400 line-through'
                                    : 'bg-emerald-50 border-emerald-200 text-slate-500 line-through'
                                  : isDark
                                  ? 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onChange={() => handleToggleActivity(cleanText)}
                                className="shrink-0 scale-110"
                              />
                              <span className="font-semibold text-sm select-none flex-1">
                                {cleanText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs italic">Chưa có checklist hoạt động nào.</div>
                    )}
                  </div>

                  {/* RESOURCE CARDS (MATERIAL & ASSIGNMENT) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* COURSE MATERIAL CARD */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isDark ? 'bg-[#121B26] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <div className="text-xs uppercase font-extrabold text-amber-500 tracking-wider flex items-center gap-1.5">
                        <FileTextOutlined />
                        <span>Tài liệu học tập (Course Material)</span>
                      </div>
                      {task.material_title && task.material_title !== 'No matching course material was found.' ? (
                        <div className="space-y-2">
                          <p className="font-bold text-sm truncate text-slate-800 dark:text-slate-100 m-0">
                            📄 {task.material_title}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              type="primary"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => setActiveTab('material')}
                              className="bg-amber-600 hover:bg-amber-500 font-bold text-xs"
                            >
                              Đọc trong Workspace
                            </Button>
                            {task.course_id && task.material_id && (
                              <Button
                                type="default"
                                size="small"
                                icon={<LinkOutlined />}
                                onClick={() => navigate(`/courses/${task.course_id}/materials/${task.material_id}`)}
                                className="font-bold text-xs"
                              >
                                Mở Trình xem Chi Tiết
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic m-0">Chưa gắn tài liệu học tập cụ thể.</p>
                      )}
                    </div>

                    {/* RELATED ASSIGNMENT CARD */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isDark ? 'bg-[#121B26] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <div className="text-xs uppercase font-extrabold text-blue-400 tracking-wider flex items-center gap-1.5">
                        <BookOutlined />
                        <span>Bài tập liên quan (Assignment)</span>
                      </div>
                      {task.assignment_id ? (
                        <div className="space-y-2">
                          <p className="font-bold text-sm truncate text-slate-800 dark:text-slate-100 m-0">
                            📝 {task.title}
                          </p>
                          <Button
                            type="default"
                            size="small"
                            icon={<LinkOutlined />}
                            onClick={() => {
                              const cId = task.course_id || 'all';
                              navigate(`/courses/${cId}?assignment=${task.assignment_id}`);
                            }}
                            className="font-bold text-xs"
                          >
                            Open Assignment
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic m-0">Không có bài tập đánh giá liên quan.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* TAB 2: COURSE MATERIAL EMBEDDED VIEWER */
                <div className="h-full flex flex-col space-y-4">
                  <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-4 rounded-2xl border flex-wrap gap-2">
                    <div>
                      <h3 className="font-extrabold text-base m-0 text-slate-900 dark:text-white flex items-center gap-2">
                        <FilePdfOutlined className="text-rose-500" />
                        <span>{task.material_title || 'Tài liệu môn học'}</span>
                      </h3>
                      <p className="text-xs text-slate-400 m-0">
                        {task.course_name} • Đang xem trực tiếp trong Study Session Workspace
                      </p>
                    </div>
                    {task.course_id && task.material_id && (
                      <Button
                        type="primary"
                        icon={<LinkOutlined />}
                        onClick={() => navigate(`/courses/${task.course_id}/materials/${task.material_id}`)}
                        className="bg-amber-600 hover:bg-amber-500 font-bold text-xs rounded-xl"
                      >
                        Mở Trình xem Toàn Màn hình
                      </Button>
                    )}
                  </div>

                  {(() => {
                    const targetName = materialFileName || task.material_title || '';
                    const ext = targetName.split('.').pop()?.toLowerCase() || '';
                    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext) || (materialMimeType || '').startsWith('image/');
                    const isPdf = ext === 'pdf' || (materialMimeType || '').includes('pdf') || targetName.toLowerCase().includes('pdf') || (!isImage && !!materialStreamUrl);

                    if (isPdf && materialStreamUrl) {
                      return (
                        <div className="flex-1 min-h-[500px] border-2 rounded-2xl overflow-hidden shadow-inner bg-slate-900 flex flex-col">
                          <iframe
                            src={materialStreamUrl}
                            title={task.material_title || 'Material Document'}
                            className="w-full flex-1 border-0"
                          />
                        </div>
                      );
                    } else if (isImage && materialStreamUrl) {
                      return (
                        <div className="flex-1 min-h-[500px] border-2 rounded-2xl p-6 bg-slate-900 flex items-center justify-center overflow-auto">
                          <img
                            src={materialStreamUrl}
                            alt={task.material_title || 'Image Material'}
                            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
                          />
                        </div>
                      );
                    } else if (extractedTextContent) {
                      return (
                        <div className="flex-1 min-h-[500px] border-2 rounded-2xl p-6 overflow-auto bg-slate-900/60 font-sans leading-relaxed">
                          <div className={`p-6 rounded-2xl border shadow-sm max-w-4xl mx-auto space-y-4 ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                          }`}>
                            <div className="flex items-center justify-between border-b pb-3">
                              <span className="font-extrabold text-xs uppercase tracking-wider text-amber-500 flex items-center gap-2">
                                <FileTextOutlined />
                                <span>Nội dung trích xuất tài liệu ({task.material_title})</span>
                              </span>
                            </div>
                            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                              <MarkdownRenderer content={extractedTextContent} />
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-3 bg-black/5 dark:bg-white/5 rounded-2xl border">
                          <BookOutlined className="text-4xl text-amber-500/50" />
                          <p className="text-sm font-semibold m-0">
                            Chưa có nội dung trực tiếp cho tài liệu này.
                          </p>
                          <p className="text-xs text-slate-500">
                            Bạn có thể truy cập danh sách tài liệu môn <b>{task.course_name || 'khóa học'}</b>.
                          </p>
                          {task.course_id && (
                            <Button type="primary" onClick={() => navigate(`/courses/${task.course_id}`)}>
                              Xem Môn học
                            </Button>
                          )}
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: LEARNING COMPANION CHATBOT */}
          <div className={`w-[420px] border-l flex flex-col shrink-0 ${
            isDark ? 'bg-[#0E1621] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* CHATBOT HEADER */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-[#121B26]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <RobotOutlined className="text-emerald-500 text-xl" />
                <div>
                  <h3 className="font-extrabold text-sm m-0 text-slate-900 dark:text-white">
                    Learning Companion AI
                  </h3>
                  <span className="text-[10px] text-emerald-500 font-semibold block">
                    Context-Aware Study Assistant
                  </span>
                </div>
              </div>
            </div>

            {/* CHAT MESSAGES LIST */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-3">
                  <RobotOutlined className="text-4xl text-emerald-500/50" />
                  <p className="text-xs font-semibold text-slate-200">
                    Tôi là Learning Companion của bạn trong buổi học này!
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Hỏi tôi giải thích bài giảng, ví dụ minh họa, hoặc kiểm tra mức độ hiểu của bạn (Self-Check).
                  </p>

                  {/* QUICK PRESET CHIPS */}
                  <div className="space-y-1.5 w-full text-left pt-2">
                    <button
                      onClick={() => handleSendChatMessage('Hỏi tôi 1 câu hỏi trắc nghiệm để kiểm tra xem tôi hiểu bài này chưa (dừng lại đợi tôi trả lời trước khi giải thích).')}
                      className="w-full text-left text-xs p-2.5 rounded-xl border bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 font-bold transition-colors flex items-center gap-2"
                    >
                      <ExperimentOutlined className="text-amber-400" />
                      <span>❓ Kiểm tra mức độ hiểu (Self-Check Mode)</span>
                    </button>

                    {[
                      'Giải thích khái niệm cốt lõi của bài này',
                      'Gợi ý các bước tự học bài này hiệu quả',
                      'Cho ví dụ thực tế liên quan tới chủ đề',
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChatMessage(preset)}
                        className="w-full text-left text-xs p-2 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium transition-colors"
                      >
                        💡 {preset}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2.5 text-xs ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <RobotOutlined />
                      </div>
                    )}

                    <div className="max-w-[85%] space-y-1">
                      <div
                        className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-tr-none font-medium'
                            : isDark
                            ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                            : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <div className="text-[10px] text-slate-400 pt-1 space-y-0.5">
                          <span className="font-bold text-emerald-400">📄 Tham khảo tài liệu:</span>
                          <div className="flex flex-wrap gap-1">
                            {msg.sources.map((src, sIdx) => (
                              <span key={sIdx} className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                {src}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <UserOutlined />
                      </div>
                    )}
                  </div>
                ))
              )}

              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 italic">
                  <Spin size="small" />
                  <span>Learning Companion đang suy nghĩ...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* CHAT INPUT BAR */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className={`p-3 border-t flex items-center gap-2 ${
                isDark ? 'border-slate-800 bg-[#121B26]' : 'border-slate-200 bg-white'
              }`}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Hỏi AI Learning Companion..."
                disabled={chatLoading}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none border ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                }`}
              />
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 shrink-0 rounded-xl"
              />
            </form>
          </div>
        </div>
      </main>

      {/* REFLECTION MODAL (5 QUESTIONS STEP BEFORE COMPLETION) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-extrabold text-base">
            <TrophyOutlined className="text-amber-400 text-xl" />
            <span>Tự Đánh Giá Phản Hồi (Study Session Reflection)</span>
          </div>
        }
        open={isReflectionModalOpen}
        onCancel={() => !submittingReflection && setIsReflectionModalOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width={580}
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={reflectionForm}
          layout="vertical"
          onFinish={handleSubmitReflection}
          className="space-y-4 py-2 text-xs"
        >
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-slate-700 dark:text-slate-300 font-medium">
            Hãy dành 1 phút nhìn lại buổi học vừa qua. Phản hồi của bạn giúp AI đưa ra nhận xét cá nhân hóa và tinh chỉnh kế hoạch cho tuần tới.
          </div>

          <Form.Item
            name="what_learned"
            label={<span className="font-extrabold text-xs uppercase tracking-wider">1. Hôm nay bạn đã học/nắm được nội dung gì chính?</span>}
          >
            <TextArea rows={2} placeholder="Ví dụ: Đã nắm được định nghĩa Supervised vs Unsupervised learning..." className="rounded-xl border font-medium p-2.5 text-xs" />
          </Form.Item>

          <Form.Item
            name="understood_well"
            label={<span className="font-extrabold text-xs uppercase tracking-wider">2. Phần nào bạn hiểu rõ và tự tin nhất?</span>}
          >
            <Input placeholder="Ví dụ: Phân biệt bài toán phân loại Classification..." className="rounded-xl border font-medium p-2.5 text-xs" />
          </Form.Item>

          <Form.Item
            name="struggling_with"
            label={<span className="font-extrabold text-xs uppercase tracking-wider">3. Phần nào bạn còn vướng mắc hoặc cần ôn thêm?</span>}
          >
            <Input placeholder="Ví dụ: Cách tính thuật toán Gradient Descent..." className="rounded-xl border font-medium p-2.5 text-xs" />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="understanding_level"
              label={<span className="font-extrabold text-xs uppercase tracking-wider">4. Mức độ hiểu bài hôm nay?</span>}
            >
              <Select className="rounded-xl font-semibold">
                <Select.Option value="fully">🟢 Hiểu hoàn toàn (Fully understood)</Select.Option>
                <Select.Option value="mostly">🔵 Hiểu hầu hết (Mostly understood)</Select.Option>
                <Select.Option value="partially">🟡 Hiểu một phần (Partially understood)</Select.Option>
                <Select.Option value="not_understood">🔴 Chưa hiểu (Not understood)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="achieved_goal"
              label={<span className="font-extrabold text-xs uppercase tracking-wider">5. Đạt mục tiêu buổi học?</span>}
            >
              <Select className="rounded-xl font-semibold">
                <Select.Option value="yes">✅ Đạt hoàn toàn (Yes)</Select.Option>
                <Select.Option value="partially">🟧 Đạt một phần (Partially)</Select.Option>
                <Select.Option value="no">❌ Chưa đạt (No)</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button
              disabled={submittingReflection}
              onClick={() => setIsReflectionModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submittingReflection}
              icon={<CheckCircleOutlined />}
              className="bg-emerald-600 hover:bg-emerald-500 font-extrabold px-6 rounded-xl"
            >
              Lưu Reflection & Hoàn thành
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
