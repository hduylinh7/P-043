import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Input,
  Tag,
  Select,
  Tooltip,
  Spin,
  message,
  Collapse,
  Badge,
} from 'antd';
import {
  SendOutlined,
  PlusOutlined,
  MessageOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  BookOutlined,
  RobotOutlined,
  UserOutlined,
  BulbOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sidebar } from '../components/Sidebar';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { api, ChatSession, ChatMessage, Citation } from '../services/api';
import { courseService } from '../services/courseService';
import { assignmentService } from '../services/assignmentService';
import { goalService } from '../services/goalService';
import { Course } from '../types/course';
import { Assignment } from '../types/assignment';
import { Goal } from '../types/goal';
import { EntityContext } from '../components/MarkdownRenderer';

export const AIChatPage: React.FC = () => {
  const { user } = useAuth();
  const { themeMode } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('course_id') || undefined;

  const isDark = themeMode === 'dark';

  // Data States
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(initialCourseId);

  // UI States
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Load User Courses, Assignments, Goals & Sessions on Mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingSessions(true);
      try {
        // Fetch courses for context selector & entity matching
        const userCourses = await courseService.getStudentCourses();
        setCourses(userCourses);

        // Fetch assignments for entity matching
        let userAssignments: Assignment[] = [];
        for (const c of userCourses) {
          try {
            const cAss = await assignmentService.getCourseAssignments(c.id);
            userAssignments = [...userAssignments, ...cAss];
          } catch (e) {
            console.error('Failed to load course assignments:', e);
          }
        }
        setAssignments(userAssignments);

        // Fetch goals for entity matching
        try {
          const userGoals = await goalService.getGoals();
          setGoals(userGoals);
        } catch (e) {
          console.error('Failed to load user goals:', e);
        }

        // Fetch chat sessions for Personal Companion ONLY
        const userSessions = await api.getSessions(user?.id || 'default_user', 'companion');
        setSessions(userSessions);

        if (userSessions.length > 0) {
          const firstSession = userSessions[0];
          setActiveSessionId(firstSession.id);
          loadSessionMessages(firstSession.id);
        } else {
          // Initialize empty state welcome message
          setMessages([
            {
              role: 'assistant',
              content:
                'Xin chào! Tôi là Trợ Lý Học Tập Cá Nhân (Personal Learning Companion). Tôi có thể giúp bạn theo dõi thông tin khóa học, bài tập, hạn nộp, điểm số, mục tiêu cá nhân và gợi ý những bài tập cần ưu tiên!',
            },
          ]);
        }
      } catch (err: any) {
        console.error('Failed to load initial RAG Chat data:', err);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchData();
  }, [user]);

  const loadSessionMessages = async (sessionId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await api.getMessages(sessionId);
      if (msgs.length === 0) {
        setMessages([
          {
            role: 'assistant',
            content:
              'Phiên trò chuyện mới đã sẵn sàng. Bạn có thể hỏi tôi về các môn học, bài tập sắp đến hạn, điểm số, hoặc xin gợi ý ưu tiên làm bài tập!',
          },
        ]);
      } else {
        setMessages(msgs);
      }
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      message.error('Không thể tải lịch sử trò chuyện.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    loadSessionMessages(sessionId);
  };

  const handleCreateNewSession = () => {
    setActiveSessionId(null);
    setMessages([
      {
        role: 'assistant',
        content:
          'Đã khởi tạo phiên hỏi đáp mới. Hãy đặt câu hỏi về khóa học, bài tập, hạn nộp, điểm số hoặc mục tiêu cá nhân của bạn!',
      },
    ]);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || sending) return;

    const userMsgContent = textToSend.trim();
    setInputMessage('');

    // Append user message immediately
    const newUserMsg: ChatMessage = {
      role: 'user',
      content: userMsgContent,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setSending(true);

    try {
      const response = await api.sendMessage(
        userMsgContent,
        activeSessionId || undefined,
        user?.id || 'default_user',
        selectedCourseId,
        undefined,
        'companion'
      );

      // If new session was created by backend
      if (!activeSessionId && response.session_id) {
        setActiveSessionId(response.session_id);
        // Refresh sessions list
        const updatedSessions = await api.getSessions(user?.id || 'default_user', 'companion');
        setSessions(updatedSessions);
      }

      // Append assistant response with citations and analysis
      const newAssistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.response,
        citations: response.citations,
        sources: response.sources,
        analysis: response.analysis,
      };

      setMessages((prev) => [...prev, newAssistantMsg]);
    } catch (err: any) {
      console.error('Failed to send RAG chat message:', err);
      message.error('Không thể kết nối tới Trợ Lý AI. Vui lòng thử lại.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Đã xảy ra lỗi khi truy vấn dữ liệu học tập. Vui lòng thử lại sau giây lát.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    {
      label: '📚 Môn học của tôi',
      query: 'Tôi đang học những môn học nào?',
    },
    {
      label: '⏰ Bài tập sắp đến hạn',
      query: 'Tôi có những bài tập nào sắp đến hạn nộp?',
    },
    {
      label: '🎯 Mục tiêu cá nhân',
      query: 'Mục tiêu cá nhân của tôi hiện tại là gì?',
    },
    {
      label: '📊 Điểm số & Đánh giá',
      query: 'Tôi đã nhận được điểm số và nhận xét nào?',
    },
    {
      label: '💡 Gợi ý ưu tiên bài tập',
      query: 'Tôi nên ưu tiên tập trung làm bài tập nào tuần này?',
    },
  ];

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const entityContext: EntityContext = {
    courses: courses.map((c) => ({ id: c.id, code: c.code, name: c.name })),
    assignments: assignments.map((a) => ({ id: a.id, title: a.title, course_id: a.course_id })),
    goals: goals.map((g) => ({ id: g.id, title: g.title })),
  };

  return (
    <div
      className={`min-h-screen flex transition-colors duration-300 ${
        isDark ? 'bg-[#0F1710] text-[#F2F9F3]' : 'bg-[#FDFBF7] text-slate-900'
      }`}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Bar */}
        <header
          className={`h-20 px-6 border-b flex items-center justify-between shrink-0 backdrop-blur-md z-10 ${
            isDark
              ? 'bg-[#0F1710]/90 border-minecraft-obsidianBorder text-white'
              : 'bg-[#FDFBF7]/90 border-amber-900/10 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-minecraft-grass/20 border-2 border-minecraft-grassBorder flex items-center justify-center text-emerald-500 shadow-sm">
              <ThunderboltOutlined className="text-xl animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight flex items-center gap-2 m-0">
                Personal Learning Companion
                <Badge
                  status="processing"
                  text={
                    <span className="text-[11px] font-medium text-emerald-500 dark:text-emerald-400">
                      Learning Companion Agent
                    </span>
                  }
                />
              </h1>
              <p className="text-xs text-slate-400 m-0">
                Đồng hành theo dõi khóa học, bài tập, hạn nộp, điểm số &amp; mục tiêu cá nhân
              </p>
            </div>
          </div>

          {/* Course Context Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
              Phạm vi tra cứu:
            </span>
            <Select
              value={selectedCourseId || 'all'}
              onChange={(val) => setSelectedCourseId(val === 'all' ? undefined : val)}
              className="w-56"
              size="middle"
              options={[
                { value: 'all', label: '📚 Tất cả môn học' },
                ...courses.map((c) => ({
                  value: c.id,
                  label: `${c.code} - ${c.name}`,
                })),
              ]}
            />
          </div>
        </header>

        {/* Workspace Body: Split View (Sessions Sidebar + Chat View) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Session Drawer/Panel */}
          <div
            className={`w-72 border-r-2 flex flex-col shrink-0 transition-all ${
              isDark ? 'bg-slate-950/60 border-minecraft-obsidianBorder' : 'bg-slate-100/70 border-amber-900/10'
            }`}
          >
            {/* New Chat Button */}
            <div className="p-4 border-b-2 border-slate-200 dark:border-minecraft-obsidianBorder space-y-3">
              <button
                type="button"
                onClick={handleCreateNewSession}
                className="w-full btn-voxel-green py-3 text-sm rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <PlusOutlined />
                <span>Tạo Đoạn Chat Mới</span>
              </button>

              <Input
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder="Tìm phiên trò chuyện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                size="small"
                className="rounded-xl border-2 border-slate-200 dark:border-slate-800"
              />
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                Lịch sử trò chuyện ({filteredSessions.length})
              </div>

              {loadingSessions ? (
                <div className="py-8 text-center">
                  <Spin size="small" />
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="text-xs text-center py-6 text-slate-400">
                  Chưa có lịch sử chat
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const isActive = activeSessionId === session.id;
                  return (
                    <motion.button
                      key={session.id}
                      whileHover={{ x: 2 }}
                      onClick={() => handleSelectSession(session.id)}
                      className={
                        isActive
                          ? 'tab-voxel-active text-xs w-full text-left justify-start'
                          : 'tab-voxel-inactive text-xs w-full text-left justify-start'
                      }
                    >
                      <MessageOutlined
                        className={`text-sm shrink-0 ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-emerald-500'}`}
                      />
                      <span className="truncate flex-1">{session.title || 'Trò chuyện RAG'}</span>
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Chat View */}
          <div className="flex-1 flex flex-col overflow-hidden relative bg-transparent">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingMessages ? (
                <div className="py-20 text-center space-y-3">
                  <Spin size="large" />
                  <p className="text-xs text-slate-400">Đang tải lịch sử tin nhắn...</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isUser = msg.role === 'user';

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex gap-3 max-w-4xl mx-auto ${
                        isUser ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                          isUser
                            ? 'bg-emerald-600 text-white border-emerald-700 font-extrabold'
                            : 'bg-amber-500 text-white border-amber-600 font-bold'
                        }`}
                      >
                        {isUser ? <UserOutlined className="text-base" /> : <RobotOutlined />}
                      </div>

                      {/* Content Bubble */}
                      <div className="space-y-2 max-w-[82%]">
                        <div
                          className={
                            isUser
                              ? 'p-3.5 rounded-2xl text-sm leading-snug bg-minecraft-grass text-white font-medium shadow-sm rounded-tr-none'
                              : 'p-3.5 rounded-2xl text-sm leading-snug bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-sm rounded-tl-none font-sans'
                          }
                        >
                          <MarkdownRenderer content={msg.content} isUser={isUser} entityContext={entityContext} />
                        </div>

                        {/* RAG Citations Cards (AI Messages only) */}
                        {!isUser && msg.citations && msg.citations.length > 0 && (
                          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl space-y-2.5 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                              <FileTextOutlined className="text-blue-600 dark:text-blue-400" />
                              <span>Trích dẫn từ tài liệu RAG ({msg.citations.length})</span>
                            </div>

                            <div className="grid grid-cols-1 gap-1.5">
                              {msg.citations.map((cite, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                                >
                                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                                    📄 {cite.file_name || 'Tài liệu môn học'}
                                  </span>
                                  {cite.score !== undefined && (
                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 py-0.5 px-2 rounded-md">
                                      Độ khớp: {Math.round(cite.score * 100)}%
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* RAG Sources Tags */}
                        {!isUser && msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] font-medium text-slate-500">
                              Nguồn tham khảo:
                            </span>
                            {msg.sources.map((src, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}

              {/* AI Thinking Loader */}
              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 max-w-4xl mx-auto"
                >
                  <div className="w-11 h-11 rounded-2xl bg-minecraft-gold text-slate-900 flex items-center justify-center shadow-voxel-sm border-2 border-minecraft-goldBorder font-bold">
                    <RobotOutlined className="text-lg animate-spin" />
                  </div>
                  <div className="card-voxel-3d p-4 rounded-2xl rounded-tl-none text-xs flex items-center gap-3 text-emerald-700 dark:text-emerald-300 font-bold">
                    <Spin size="small" />
                    <span>Đang phân tích thông tin học tập cá nhân & tổng hợp câu trả lời...</span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions & Input Bar */}
            <div
              className={`p-4 border-t-2 shrink-0 ${
                isDark ? 'bg-slate-950/80 border-minecraft-obsidianBorder' : 'bg-white border-amber-900/10'
              }`}
            >
              <div className="max-w-4xl mx-auto space-y-3">
                {/* Quick Prompts */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {quickPrompts.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.query)}
                      disabled={sending}
                      className="tab-voxel-inactive text-xs font-bold shrink-0 cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Input Controls */}
                <div className="card-voxel-3d p-2 flex items-end gap-2 relative">
                  <Input.TextArea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Hỏi về khóa học, bài tập, hạn nộp, điểm số, mục tiêu cá nhân..."
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    disabled={sending}
                    bordered={false}
                    className="flex-1 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || sending}
                    className="btn-voxel-green p-3 rounded-xl font-bold flex items-center justify-center shrink-0 disabled:opacity-40"
                    title="Gửi câu hỏi"
                  >
                    <SendOutlined className="text-base" />
                  </button>
                </div>

                <div className="text-[11px] text-center text-slate-400 font-medium">
                  Trợ lý học tập cá nhân tự động tổng hợp thông tin khóa học, bài tập, hạn nộp, điểm số &amp; mục tiêu cá nhân.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
