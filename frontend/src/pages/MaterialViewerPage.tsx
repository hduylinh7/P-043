import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Tag,
  Spin,
  message,
  Input,
  Tooltip,
  Drawer,
  Badge,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileTextOutlined,
  FileUnknownOutlined,
  ThunderboltOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  HistoryOutlined,
  PlusOutlined,
  MessageOutlined,
  CloseOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sidebar } from '../components/Sidebar';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { materialService } from '../services/materialService';
import { api, ChatSession, API_BASE_URL } from '../services/api';
import { CourseMaterial } from '../types/material';


interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
}

export const MaterialViewerPage: React.FC = () => {
  const { courseId, materialId } = useParams<{ courseId: string; materialId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeMode } = useTheme();


  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [currentMaterial, setCurrentMaterial] = useState<CourseMaterial | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [showAiAssistant, setShowAiAssistant] = useState<boolean>(false);
  const [extractedContent, setExtractedContent] = useState<string | null>(null);

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ Lý AI Học Tập. Bạn có câu hỏi nào về bài giảng này không? Tôi có thể giúp bạn tóm tắt, trích xuất điểm chính, giải thích các khái niệm khó hoặc đưa ra ví dụ thực tế!',
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isDark = themeMode === 'dark';

  const [courseSessions, setCourseSessions] = useState<ChatSession[]>([]);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const loadData = async () => {
    if (!courseId || !materialId) return;
    setLoading(true);
    try {
      const data = await materialService.getCourseMaterials(courseId);
      setMaterials(data);
      const found = data.find((m) => m.id === materialId);
      if (found) {
        setCurrentMaterial(found);
        try {
          const res = await materialService.getMaterialContent(courseId, found.id);
          setExtractedContent(res.content);
        } catch (e) {
          console.warn('Extracted text fetch failed:', e);
        }
      } else {
        message.error('Không tìm thấy bài giảng.');
      }
    } catch (err: any) {
      console.error('Failed to load material:', err);
      message.error(err.response?.data?.detail || 'Không thể tải bài giảng.');
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = async () => {
    if (!courseId) return;
    try {
      const userSessions = await api.getSessions(user?.id || 'default_user', 'material_rag', courseId);
      setCourseSessions(userSessions);

      if (userSessions.length > 0) {
        const latestSession = userSessions[0];
        setSessionId(latestSession.id);
        const history = await api.getMessages(latestSession.id);
        if (history && history.length > 0) {
          const mapped: ChatMessage[] = history.map((m) => ({
            sender: m.role === 'user' ? 'user' : 'ai',
            text: m.content,
            sources: m.sources,
          }));
          setChatMessages(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to load course chat history:', err);
    }
  };

  const switchSession = async (sId: string) => {
    setSessionId(sId);
    setHistoryDrawerOpen(false);
    try {
      const history = await api.getMessages(sId);
      const mapped: ChatMessage[] = history.map((m) => ({
        sender: m.role === 'user' ? 'user' : 'ai',
        text: m.content,
        sources: m.sources,
      }));
      setChatMessages(mapped);
    } catch (err) {
      console.error('Failed to switch session:', err);
    }
  };

  const handleNewChatSession = () => {
    setSessionId(null);
    setHistoryDrawerOpen(false);
    setChatMessages([
      {
        sender: 'ai',
        text: 'Xin chào! Tôi là Trợ Lý AI Học Tập. Bạn có câu hỏi nào về bài giảng này không? Tôi có thể giúp bạn tóm tắt, trích xuất điểm chính hoặc giải thích các khái niệm khó!',
      },
    ]);
  };

  useEffect(() => {
    loadData();
    loadChatHistory();
  }, [courseId, materialId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, aiThinking]);


  const handleDownload = async () => {
    if (!courseId || !currentMaterial) return;
    setDownloading(true);
    try {
      await materialService.downloadMaterial(courseId, currentMaterial.id, currentMaterial.file_name);
      message.success('Đang tải xuống bài giảng...');
    } catch (err: any) {
      console.error('Download error:', err);
      message.error(err.response?.data?.detail || 'Không thể tải xuống bài giảng.');
    } finally {
      setDownloading(false);
    }
  };



  const handleAskAi = async (questionText?: string) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || aiThinking) return;

    const userMsg: ChatMessage = { sender: 'user', text: q };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setAiThinking(true);

    try {
      const res = await api.sendMessage(
        q,
        sessionId || undefined,
        user?.id || 'default_user',
        courseId,
        materialId || currentMaterial?.id,
        'material'
      );
      if (res.session_id) {
        setSessionId(res.session_id);
      }
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: res.response,
          sources: res.sources,
        },
      ]);
    } catch (err: any) {
      console.error('AI Chat error:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '❌ Không thể kết nối tới AI Learning Companion backend.',
        },
      ]);
    } finally {
      setAiThinking(false);
    }
  };


  const getMaterialTypeTag = (type: string) => {
    switch (type) {
      case 'syllabus':
        return <Tag color="purple">Syllabus / Đề cương</Tag>;
      case 'lecture_slide':
        return <Tag color="blue">Slide Bài Giảng</Tag>;
      case 'textbook':
        return <Tag color="gold">Sách Giáo Trình</Tag>;
      default:
        return <Tag color="cyan">Tài Liệu Môn Học</Tag>;
    }
  };

  if (loading) {
    return (
      <div className={`flex h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!currentMaterial || !courseId) {
    return (
      <div className={`flex h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-slate-400">Không tìm thấy bài giảng.</p>
          <Button onClick={() => navigate(`/courses/${courseId}`)} icon={<ArrowLeftOutlined />}>
            Quay lại môn học
          </Button>
        </div>
      </div>
    );
  }

  const token = localStorage.getItem('access_token');
  const streamUrl = `${API_BASE_URL}/courses/${courseId}/materials/${currentMaterial.id}/download?inline=true&token=${token}`;
  const ext = currentMaterial.file_name.split('.').pop()?.toLowerCase() || '';
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext);
  const isTextOrCode = ['txt', 'md', 'json', 'csv', 'py', 'js', 'ts', 'html', 'css', 'c', 'cpp', 'java', 'xml', 'log', 'yaml', 'yml'].includes(ext);

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className={`px-6 py-3.5 border-b flex items-center justify-between z-10 ${
          isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-4 min-w-0">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/courses/${courseId}`)}
              className="rounded-xl shrink-0"
            >
              Quay lại
            </Button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {getMaterialTypeTag(currentMaterial.type)}
                <h1 className="text-lg font-bold tracking-tight truncate m-0">{currentMaterial.title}</h1>
              </div>
              <p className="text-xs text-slate-400 m-0 truncate">
                {currentMaterial.file_name} • Tải lên bởi {currentMaterial.uploader_name || 'Giảng viên'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={downloading}
              onClick={handleDownload}
              className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white font-semibold"
            >
              Tải Xuống
            </Button>

            <Button
              type={showAiAssistant ? 'primary' : 'default'}
              icon={<ThunderboltOutlined />}
              onClick={() => setShowAiAssistant(!showAiAssistant)}
              className={`rounded-xl font-semibold ${
                showAiAssistant
                  ? 'bg-minecraft-gold hover:bg-amber-500 text-slate-900 border-0'
                  : ''
              }`}
            >
              Trợ Lý AI
            </Button>
          </div>
        </header>

        {/* Main Body Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Viewer Canvas */}
          <div className={`flex-1 flex flex-col h-full bg-slate-900/40 relative overflow-hidden transition-all duration-300 ${
            showAiAssistant ? 'pr-[460px] sm:pr-[500px] lg:pr-[530px]' : ''
          }`}>
            {isPdf ? (
              <iframe
                src={streamUrl}
                title={currentMaterial.title}
                className="w-full h-full border-0"
              />
            ) : isImage ? (
              <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
                <img
                  src={streamUrl}
                  alt={currentMaterial.title}
                  className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
                />
              </div>
            ) : (isTextOrCode || extractedContent) ? (
              <div className="flex-1 p-6 overflow-auto font-sans leading-relaxed">
                <div className={`p-6 rounded-2xl border shadow-sm max-w-4xl mx-auto space-y-4 ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-amber-500 flex items-center gap-2">
                      <FileTextOutlined />
                      <span>Nội dung bài giảng ({currentMaterial.file_name})</span>
                    </span>
                    <Button size="small" icon={<DownloadOutlined />} onClick={handleDownload}>
                      Tải về máy
                    </Button>
                  </div>
                  <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    <MarkdownRenderer content={extractedContent || 'Đang tải nội dung tệp...'} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                  <FileWordOutlined className="text-4xl" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {currentMaterial.title}
                </h3>
                <p className="text-sm text-slate-400 max-w-md mb-6">
                  Tập tin <span className="font-mono text-emerald-600 dark:text-emerald-400">{currentMaterial.file_name}</span> hỗ trợ tải về máy để xem hoặc đọc cùng AI Companion.
                </p>
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  loading={downloading}
                  onClick={handleDownload}
                  className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white font-semibold px-8"
                >
                  Tải Về Máy
                </Button>
              </div>
            )}
          </div>

          {/* Floating AI Robot Trigger FAB Button (when chat is closed) */}
          {!showAiAssistant && (
            <button
              type="button"
              onClick={() => setShowAiAssistant(true)}
              className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-tr from-[#EA580C] via-[#F97316] to-[#FB923C] text-white shadow-2xl hover:shadow-orange-500/50 border-2 border-white/60 ring-4 ring-orange-500/20 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group"
              title="Mở Trợ Lý AI Học Tập (Hỏi đáp toàn bộ bài giảng)"
            >
              {/* Robot Icon */}
              <div className="w-7 h-7 rounded-lg border-2 border-white flex flex-col items-center justify-center p-1 relative shadow-inner">
                <div className="flex items-center justify-between w-full px-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                </div>
                <div className="w-3 h-0.5 bg-white rounded-full mt-1" />
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-white rounded-full" />
              </div>
              {/* Ping notification dot */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white"></span>
              </span>
            </button>
          )}

          {/* AI Study Assistant Floating Card Popup */}
          {showAiAssistant && (
            <aside
              className={`fixed top-20 right-6 bottom-6 w-[430px] sm:w-[470px] lg:w-[500px] max-w-[calc(100vw-3rem)] z-40 flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-right-4 ${
                isDark
                  ? 'bg-[#0F172A]/95 backdrop-blur-md border-slate-800 shadow-black/80'
                  : 'bg-white/95 backdrop-blur-md border-slate-200/90 shadow-slate-900/15'
              }`}
            >
              {/* Header */}
              <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
                isDark ? 'bg-[#151F30] border-slate-800' : 'bg-[#FDFBF7] border-amber-900/10'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 border border-amber-600/40 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                    <RobotOutlined className="text-xl" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm sm:text-base m-0 truncate text-slate-900 dark:text-white">
                        Trợ Lý AI Học Tập
                      </h4>
                      <Badge
                        status="processing"
                        text={
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                            Material RAG
                          </span>
                        }
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium m-0 truncate">
                      Hỏi đáp toàn diện nội dung, công thức &amp; bài giảng
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Tooltip title="Lịch sử hội thoại">
                    <Button
                      size="small"
                      icon={<HistoryOutlined />}
                      onClick={() => setHistoryDrawerOpen(true)}
                      className="rounded-xl text-xs font-semibold px-2.5 flex items-center gap-1"
                    >
                      Lịch sử
                    </Button>
                  </Tooltip>
                  <Tooltip title="Bắt đầu hội thoại mới">
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={handleNewChatSession}
                      className="rounded-xl text-xs font-semibold px-2.5 flex items-center gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500 hover:text-white"
                    >
                      Mới
                    </Button>
                  </Tooltip>
                  <button
                    type="button"
                    onClick={() => setShowAiAssistant(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Đóng cửa sổ chat"
                  >
                    <CloseOutlined className="text-base" />
                  </button>
                </div>
              </div>

              {/* History Drawer */}
              <Drawer
                title="📜 Lịch sử cuộc hội thoại AI"
                placement="right"
                onClose={() => setHistoryDrawerOpen(false)}
                open={historyDrawerOpen}
                width={340}
              >
                <div className="space-y-2">
                  <Button
                    type="primary"
                    block
                    icon={<PlusOutlined />}
                    onClick={handleNewChatSession}
                    className="mb-4 bg-emerald-600 hover:bg-emerald-500 border border-emerald-700 text-white rounded-xl font-bold"
                  >
                    Bắt đầu cuộc trò chuyện mới
                  </Button>

                  {courseSessions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Chưa có lịch sử hội thoại nào.</p>
                  ) : (
                    courseSessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => switchSession(s.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex items-center justify-between cursor-pointer ${
                          sessionId === s.id
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                            : isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MessageOutlined className="text-emerald-500" />
                          <span className="truncate">{s.title || 'Đoạn chat bài giảng'}</span>
                        </div>
                        {sessionId === s.id && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </Drawer>

              {/* Messages Body */}
              <div className={`flex-1 overflow-y-auto p-5 space-y-6 ${
                isDark ? 'bg-[#0B1118]' : 'bg-[#FAFAF9]'
              }`}>
                {chatMessages.map((msg, index) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={index}
                      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm mt-0.5 border ${
                          isUser
                            ? 'bg-[#00897B] text-white border-teal-700 font-extrabold text-base'
                            : 'bg-amber-500 text-white border-amber-600 font-bold'
                        }`}
                      >
                        {isUser ? <UserOutlined className="text-base" /> : <RobotOutlined className="text-base" />}
                      </div>

                      {/* Content Bubble */}
                      <div className="space-y-2 max-w-[82%]">
                        <div
                          className={
                            isUser
                              ? 'p-3.5 px-5 rounded-2xl text-sm leading-snug bg-minecraft-grass text-white font-medium shadow-sm rounded-tr-none'
                              : 'p-4 sm:p-5 rounded-2xl text-sm leading-relaxed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-sm rounded-tl-none font-sans'
                          }
                        >
                          <MarkdownRenderer
                            content={msg.text}
                            isUser={isUser}
                          />
                        </div>

                        {/* Sources list if any */}
                        {!isUser && msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            <span className="text-[11px] font-medium text-slate-500">
                              Trích xuất từ:
                            </span>
                            {msg.sources.map((src, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                              >
                                📄 {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {aiThinking && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white border border-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                      <RobotOutlined className="animate-spin text-base" />
                    </div>
                    <div className="p-4 rounded-2xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                      <Spin size="small" />
                      <span className="font-medium">AI đang tra cứu tài liệu và tổng hợp câu trả lời...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className={`px-4 py-2.5 border-t border-b flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 ${
                isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                {[
                  { label: '✨ Tóm tắt bài giảng', query: 'Tóm tắt các ý chính và nội dung quan trọng nhất của bài giảng này giúp tôi.' },
                  { label: '📖 Giải thích khái niệm khó', query: 'Hãy liệt kê và giải thích chi tiết các thuật ngữ hoặc khái niệm phức tạp trong tài liệu này.' },
                  { label: '🎯 Điểm cần nhớ để thi', query: 'Những phần nào trong bài giảng này quan trọng nhất cần ghi nhớ cho kỳ thi?' },
                  { label: '❓ Tạo 3 câu hỏi ôn tập', query: 'Hãy tạo 3 câu hỏi kèm gợi ý trả lời để tôi tự kiểm tra mức độ hiểu bài giảng này.' },
                  { label: '💡 Cho ví dụ thực tế', query: 'Hãy cho các ví dụ ứng dụng thực tế minh họa cho kiến thức trong bài giảng này.' },
                  { label: '🔍 Trích xuất công thức', query: 'Hãy tổng hợp tất cả các công thức và quy tắc quan trọng trong tài liệu.' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAskAi(chip.query)}
                    disabled={aiThinking}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap border transition-all cursor-pointer bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:scale-105 active:scale-95 shadow-2xs"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className={`p-4 pt-3 border-t shrink-0 ${
                isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className={`flex items-center gap-2 p-2 rounded-2xl border-2 transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 focus-within:border-emerald-500'
                    : 'bg-white border-slate-300 focus-within:border-emerald-500 shadow-sm'
                }`}>
                  <input
                    type="text"
                    placeholder="Hỏi AI bất kỳ câu hỏi nào về bài giảng này..."
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAskAi();
                      }
                    }}
                    disabled={aiThinking}
                    className="flex-1 bg-transparent border-0 outline-none text-sm px-2 text-slate-900 dark:text-white placeholder:text-slate-400 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => handleAskAi()}
                    disabled={!inputQuestion.trim() || aiThinking}
                    className="w-10 h-10 rounded-xl bg-[#A5D6A7] hover:bg-[#81C784] text-[#1B5E20] flex items-center justify-center shrink-0 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    <SendOutlined className="text-base" />
                  </button>
                </div>
                <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 m-0 pt-2 truncate">
                  Trợ lý bài giảng hỗ trợ giải thích, tóm tắt và hỏi đáp đầy đủ toàn bộ tài liệu học tập.
                </p>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
