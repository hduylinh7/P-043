import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Tag,
  Spin,
  message,
  Input,
  Tooltip,
  Drawer,
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
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sidebar } from '../components/Sidebar';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { materialService } from '../services/materialService';
import { api, ChatSession } from '../services/api';
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
  const [showAiAssistant, setShowAiAssistant] = useState<boolean>(true);

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ Lý AI Học Tập. Bạn có câu hỏi nào về bài giảng này không? Tôi có thể giúp bạn tóm tắt, trích xuất điểm chính hoặc giải thích các khái niệm khó!',
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [aiThinking, setAiThinking] = useState<boolean>(false);

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
  const streamUrl = `/api/v1/courses/${courseId}/materials/${currentMaterial.id}/download?inline=true&token=${token}`;
  const ext = currentMaterial.file_name.split('.').pop()?.toLowerCase();
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg'].includes(ext || '');

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

        {/* Main Split Body Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Viewer Canvas */}
          <div className="flex-1 flex flex-col h-full bg-slate-900/40 relative overflow-hidden">
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
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                  <FileWordOutlined className="text-4xl" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {currentMaterial.title}
                </h3>
                <p className="text-sm text-slate-400 max-w-md mb-6">
                  Tập tin <span className="font-mono text-emerald-600 dark:text-emerald-400">{currentMaterial.file_name}</span> hỗ trợ tải về máy để xem với ứng dụng chuyên dụng.
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

          {/* AI Study Assistant Side Panel */}
          {showAiAssistant && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`border-l flex flex-col h-full z-10 shrink-0 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {/* AI Header */}
              <div className={`p-3.5 border-b flex items-center justify-between ${
                isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-minecraft-grass flex items-center justify-center text-white font-bold shadow-md">
                    <ThunderboltOutlined className="text-sm" />
                  </div>
                  <div>
                    <div className="font-bold text-sm leading-none">Trợ Lý AI Học Tập</div>
                    <div className="text-[11px] text-slate-400 mt-1">Đồng hành cùng bài giảng</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Tooltip title="Xem các phiên hội thoại cũ">
                    <Button
                      size="small"
                      icon={<HistoryOutlined />}
                      onClick={() => setHistoryDrawerOpen(true)}
                      className="rounded-lg text-xs"
                    >
                      Lịch sử
                    </Button>
                  </Tooltip>
                  <Tooltip title="Tạo cuộc hội thoại mới">
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleNewChatSession}
                      className="rounded-lg text-xs bg-minecraft-grass hover:bg-emerald-600 text-white"
                    >
                      Mới
                    </Button>
                  </Tooltip>
                </div>
              </div>

              {/* History Drawer */}
              <Drawer
                title="📜 Lịch sử cuộc hội thoại AI"
                placement="right"
                onClose={() => setHistoryDrawerOpen(false)}
                open={historyDrawerOpen}
                width={320}
              >
                <div className="space-y-2">
                  <Button
                    type="primary"
                    block
                    icon={<PlusOutlined />}
                    onClick={handleNewChatSession}
                    className="mb-4 bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white rounded-xl"
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
                        className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex items-center justify-between ${
                          sessionId === s.id
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold'
                            : isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MessageOutlined className="text-emerald-400" />
                          <span className="truncate">{s.title || 'Untitled Chat'}</span>
                        </div>
                        {sessionId === s.id && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </Drawer>



              {/* Quick AI Prompts */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto">
                <Button
                  size="small"
                  onClick={() => handleAskAi('Tóm tắt bài giảng này giúp tôi')}
                  className="rounded-full text-xs font-medium"
                >
                  ✨ Tóm tắt bài giảng
                </Button>
                <Button
                  size="small"
                  onClick={() => handleAskAi('Tạo 3 câu hỏi ôn tập')}
                  className="rounded-full text-xs font-medium"
                >
                  ❓ Câu hỏi ôn tập
                </Button>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                      msg.sender === 'user' ? 'bg-minecraft-grass text-white' : 'bg-minecraft-gold text-slate-900 font-bold'
                    }`}>
                      {msg.sender === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    </div>
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                          msg.sender === 'user'
                            ? 'bg-minecraft-grass text-white rounded-tr-none'
                            : isDark
                            ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                            : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        <MarkdownRenderer content={msg.text} isUser={msg.sender === 'user'} />
                      </div>

                      {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap text-[10px] text-slate-400 pl-1">
                          <span className="font-semibold text-emerald-400">📚 Tài liệu:</span>
                          {msg.sources.map((src, sIdx) => (
                            <span
                              key={sIdx}
                              className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded"
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}


                {aiThinking && (
                  <div className="flex items-center gap-2 text-xs text-amber-500">
                    <Spin size="small" />
                    <span>AI đang suy nghĩ...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Hỏi AI về nội dung bài giảng..."
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    onPressEnter={() => handleAskAi()}
                    size="large"
                    className="rounded-xl text-xs"
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => handleAskAi()}
                    size="large"
                    className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white"
                  />
                </div>
              </div>
            </motion.aside>
          )}
        </div>
      </div>
    </div>
  );
};
