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
import { MinecraftAIFloatingButton } from '../components/common/MinecraftAIFloatingButton';
import { DocumentLoadingOrb } from '../components/common/DocumentLoadingOrb';
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
        <div className="flex-1 flex items-center justify-center p-8">
          <DocumentLoadingOrb isLoading={loading} documentTitle={currentMaterial?.title} />
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
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
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
            <MinecraftAIFloatingButton
              onClick={() => setShowAiAssistant(true)}
              title="Mở Trợ Lý AI Học Tập (Hỏi đáp toàn bộ bài giảng)"
            />
          )}

          {/* AI Study Assistant Docked Side Panel */}
          {showAiAssistant && (
            <aside
              className={`w-[420px] sm:w-[460px] lg:w-[480px] max-w-[50vw] my-3 mr-3 rounded-3xl border-2 shadow-xl flex flex-col shrink-0 z-30 overflow-hidden transition-all duration-300 ${
                isDark
                  ? 'bg-[#0F172A] border-slate-800'
                  : 'bg-white border-slate-200 shadow-slate-900/10'
              }`}
            >
              {/* Header */}
              <div className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 ${
                isDark ? 'bg-[#151F30] border-slate-800' : 'bg-[#FDFBF7] border-amber-900/10'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#EA580C] to-[#FB923C] border border-orange-400/40 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <RobotOutlined className="text-base text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm m-0 truncate text-slate-900 dark:text-white">
                        Trợ Lý AI Học Tập
                      </h4>
                      <Badge
                        status="processing"
                        text={
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                            Material RAG
                          </span>
                        }
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium m-0 truncate leading-tight">
                      Hỏi đáp toàn diện nội dung, công thức &amp; bài giảng
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip title="Lịch sử hội thoại">
                    <Button
                      size="small"
                      icon={<HistoryOutlined className="text-xs" />}
                      onClick={() => setHistoryDrawerOpen(true)}
                      className="rounded-lg text-[11px] font-medium px-2 h-7 flex items-center gap-1"
                    >
                      Lịch sử
                    </Button>
                  </Tooltip>
                  <Tooltip title="Bắt đầu hội thoại mới">
                    <Button
                      size="small"
                      icon={<PlusOutlined className="text-xs" />}
                      onClick={handleNewChatSession}
                      className="rounded-lg text-[11px] font-medium px-2 h-7 flex items-center gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500 hover:text-white"
                    >
                      Mới
                    </Button>
                  </Tooltip>
                  <button
                    type="button"
                    onClick={() => setShowAiAssistant(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Đóng cửa sổ chat"
                  >
                    <CloseOutlined className="text-sm" />
                  </button>
                </div>
              </div>

              {/* History Drawer */}
              <Drawer
                title="Lịch sử cuộc hội thoại AI"
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
              <div className={`flex-1 overflow-y-auto p-3.5 space-y-3.5 ${
                isDark ? 'bg-[#0B1118]' : 'bg-[#FAFAF9]'
              }`}>
                {chatMessages.map((msg, index) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={index}
                      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs mt-0.5 border ${
                          isUser
                            ? 'bg-[#00897B] text-white border-teal-700 font-extrabold text-xs'
                            : 'bg-gradient-to-tr from-[#EA580C] to-[#FB923C] border-orange-400/50 text-white font-bold'
                        }`}
                      >
                        {isUser ? <UserOutlined className="text-xs" /> : <RobotOutlined className="text-xs text-white" />}
                      </div>

                      {/* Content Bubble */}
                      <div className="space-y-1.5 max-w-[85%]">
                        <div
                          className={
                            isUser
                              ? 'p-2.5 px-3.5 rounded-xl text-xs sm:text-sm leading-normal bg-minecraft-grass text-white font-medium shadow-xs rounded-tr-none'
                              : 'p-3 px-4 rounded-xl text-xs sm:text-sm leading-normal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs rounded-tl-none font-sans'
                          }
                        >
                          <MarkdownRenderer
                            content={msg.text}
                            isUser={isUser}
                          />
                        </div>

                        {/* Sources list if any */}
                        {!isUser && msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            <span className="text-[10px] font-medium text-slate-500">
                              Trích xuất từ:
                            </span>
                            {msg.sources.map((src, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {aiThinking && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white border border-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                      <RobotOutlined className="animate-spin text-xs" />
                    </div>
                    <div className="p-2.5 px-3.5 rounded-xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Spin size="small" />
                      <span className="font-medium">AI đang tra cứu tài liệu &amp; tổng hợp...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className={`px-3 py-1.5 border-t border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${
                isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                {[
                  { label: 'Tóm tắt 1 câu', query: 'Tóm tắt ngắn gọn bài giảng này trong 1 câu.' },
                  { label: '3 câu hỏi nhanh', query: 'Tạo 3 câu hỏi ngắn để tự ôn tập.' },
                  { label: 'Chủ đề chính', query: 'Bài giảng này nói về chủ đề chính nào?' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAskAi(chip.query)}
                    disabled={aiThinking}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap border transition-all cursor-pointer bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shadow-2xs"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className={`p-2.5 px-3 border-t shrink-0 ${
                isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className={`flex items-center gap-2 p-1 px-2 rounded-xl border transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 focus-within:border-emerald-500'
                    : 'bg-white border-slate-300 focus-within:border-emerald-500 shadow-2xs'
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
                    className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm py-1 px-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => handleAskAi()}
                    disabled={!inputQuestion.trim() || aiThinking}
                    className="w-8 h-8 rounded-lg bg-[#A5D6A7] hover:bg-[#81C784] text-[#1B5E20] flex items-center justify-center shrink-0 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    <SendOutlined className="text-sm" />
                  </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 m-0 pt-1 truncate leading-tight">
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
