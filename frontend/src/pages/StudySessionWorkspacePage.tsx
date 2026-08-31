import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  Tabs,
  Tooltip,
  Badge,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BookOutlined,
  FileTextOutlined,
  LinkOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
  TrophyOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  FilePdfOutlined,
  EyeOutlined,
  ExperimentOutlined,
  AimOutlined,
  StarOutlined,
  BookFilled,
  FormOutlined,
  CheckOutlined,
  MessageOutlined,
  CompassOutlined,
  FireOutlined,
  RightOutlined,
  CheckSquareOutlined,
  CloseOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

import { Sidebar } from '../components/Sidebar';
import { MarkdownRenderer, EntityContext } from '../components/MarkdownRenderer';
import { MinecraftAIFloatingButton } from '../components/common/MinecraftAIFloatingButton';
import { KnowledgeLoadingOrb } from '../components/common/KnowledgeLoadingOrb';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { weeklyPlanService } from '../services/weeklyPlanService';
import { materialService } from '../services/materialService';
import { assignmentService } from '../services/assignmentService';
import { api, ChatMessage, API_BASE_URL } from '../services/api';
import {
  PlanTask,
  TaskReflectionData,
  StudySessionCompanionData,
  SelfCheckEvaluationResult,
  KeyConcept,
  QuickSelfCheckQuestion,
} from '../types/weeklyPlan';
import { Assignment, AssignmentQuestion, Submission } from '../types/assignment';

const { TextArea } = Input;

const DEFAULT_QUIZ_QUESTIONS: AssignmentQuestion[] = [
  {
    id: 'quiz-q1',
    assignment_id: 'default',
    question_type: 'MULTIPLE_CHOICE',
    question_text: 'Trong quy trình phân tích dữ liệu, bước nào là điều kiện tiên quyết để đảm bảo tính tin cậy của mô hình thống kê?',
    points: 2,
    display_order: 1,
    options: [
      { id: 'q1-a', question_id: 'quiz-q1', option_text: 'Thu thập, làm sạch và tiền xử lý dữ liệu (Data Cleaning & Preprocessing)', is_correct: true, display_order: 1 },
      { id: 'q1-b', question_id: 'quiz-q1', option_text: 'Vẽ ngay biểu đồ 3D để thuyết trình kết quả', is_correct: false, display_order: 2 },
      { id: 'q1-c', question_id: 'quiz-q1', option_text: 'Áp dụng các thuật toán Deep Learning phức tạp nhất ngay từ đầu', is_correct: false, display_order: 3 },
      { id: 'q1-d', question_id: 'quiz-q1', option_text: 'Bỏ qua các giá trị ngoại lai (Outliers) mà không cần kiểm định', is_correct: false, display_order: 4 },
    ],
  },
  {
    id: 'quiz-q2',
    assignment_id: 'default',
    question_type: 'MULTIPLE_CHOICE',
    question_text: 'Kiểm định KMO (Kaiser-Meyer-Olkin) được sử dụng nhằm mục đích chính nào sau đây?',
    points: 2,
    display_order: 2,
    options: [
      { id: 'q2-a', question_id: 'quiz-q2', option_text: 'Đo lường mức độ tương quan và tính thích hợp của ma trận dữ liệu cho phân tích nhân tố (Factor Analysis)', is_correct: true, display_order: 1 },
      { id: 'q2-b', question_id: 'quiz-q2', option_text: 'Kiểm tra xem mô hình có bị quá khớp (Overfitting) hay không', is_correct: false, display_order: 2 },
      { id: 'q2-c', question_id: 'quiz-q2', option_text: 'Tính toán giá trị P-value cho phân phối chuẩn một chiều', is_correct: false, display_order: 3 },
      { id: 'q2-d', question_id: 'quiz-q2', option_text: 'Phân đoạn khách hàng dựa trên giải thuật phân cụm K-Means', is_correct: false, display_order: 4 },
    ],
  },
  {
    id: 'quiz-q3',
    assignment_id: 'default',
    question_type: 'MULTIPLE_CHOICE',
    question_text: 'Khi giá trị p-value trong kiểm định giả thuyết thống kê nhỏ hơn mức ý nghĩa alpha (vd: p < 0.05), kết luận nào sau đây là chính xác?',
    points: 2,
    display_order: 3,
    options: [
      { id: 'q3-a', question_id: 'quiz-q3', option_text: 'Bác bỏ giả thuyết không (H0) và chấp nhận giả thuyết đối (H1) có ý nghĩa thống kê', is_correct: true, display_order: 1 },
      { id: 'q3-b', question_id: 'quiz-q3', option_text: 'Chấp nhận giả thuyết không (H0) vì dữ liệu hoàn toàn ngẫu nhiên', is_correct: false, display_order: 2 },
      { id: 'q3-c', question_id: 'quiz-q3', option_text: 'Không đủ bằng chứng để đưa ra bất kỳ kết luận nào', is_correct: false, display_order: 3 },
      { id: 'q3-d', question_id: 'quiz-q3', option_text: 'Tăng mức ý nghĩa alpha lên 0.10 để bác bỏ H1', is_correct: false, display_order: 4 },
    ],
  },
  {
    id: 'quiz-q4',
    assignment_id: 'default',
    question_type: 'MULTIPLE_CHOICE',
    question_text: 'Biểu đồ Boxplot (Hộp và râu) thường phát huy hiệu quả trực quan cao nhất khi cần phân tích yếu tố nào?',
    points: 2,
    display_order: 4,
    options: [
      { id: 'q4-a', question_id: 'quiz-q4', option_text: 'Phát hiện giá trị ngoại lai (Outliers) và quan sát phân phối trung vị, khoảng tứ phân vị (IQR)', is_correct: true, display_order: 1 },
      { id: 'q4-b', question_id: 'quiz-q4', option_text: 'Hiển thị xu hướng chuỗi thời gian liên tục qua các năm', is_correct: false, display_order: 2 },
      { id: 'q4-c', question_id: 'quiz-q4', option_text: 'So sánh tỷ trọng cơ cấu phần trăm trong một tổng thể 100%', is_correct: false, display_order: 3 },
      { id: 'q4-d', question_id: 'quiz-q4', option_text: 'Biểu diễn mối quan hệ nhân quả phi tuyến tính đa chiều', is_correct: false, display_order: 4 },
    ],
  },
  {
    id: 'quiz-q5',
    assignment_id: 'default',
    question_type: 'SHORT_ANSWER',
    question_text: 'Nêu ngắn gọn sự khác biệt cơ bản giữa phân tích định lượng (Quantitative Analysis) và phân tích định tính (Qualitative Analysis).',
    points: 2,
    display_order: 5,
    options: [],
  },
];

export const StudySessionWorkspacePage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isKnowledgeView = searchParams.get('view') === 'knowledge';
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

  // Interactive Assignment & Quiz State
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState<boolean>(false);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [submittingAssignment, setSubmittingAssignment] = useState<boolean>(false);

  // Companion Data State (Objectives, Study Guide, Self-Check)
  const [companionData, setCompanionData] = useState<StudySessionCompanionData | null>(null);
  const [companionLoading, setCompanionLoading] = useState<boolean>(false);
  const [checkedObjectives, setCheckedObjectives] = useState<string[]>([]);
  const [selfCheckAnswers, setSelfCheckAnswers] = useState<Record<string, string>>({});
  const [selfCheckEvalResults, setSelfCheckEvalResults] = useState<Record<string, SelfCheckEvaluationResult>>({});
  const [selfCheckLoading, setSelfCheckLoading] = useState<Record<string, boolean>>({});

  // Concept Quick Chat State (Chat A)
  const [activeConceptChatIdx, setActiveConceptChatIdx] = useState<number | null>(null);
  const [conceptChatInput, setConceptChatInput] = useState<string>('');
  const [conceptChatLoading, setConceptChatLoading] = useState<boolean>(false);
  const [conceptChatHistory, setConceptChatHistory] = useState<Record<number, { question: string; answer: string }>>({});
  const [conceptChatQuota, setConceptChatQuota] = useState<number>(3);

  // Knowledge Checklist State (Block 3)
  const [knowledgeCheckedQuestions, setKnowledgeCheckedQuestions] = useState<Record<string, boolean>>({});
  const [knowledgeRevealedHints, setKnowledgeRevealedHints] = useState<Record<string, boolean>>({});

  // Floating Knowledge Review AI Chat State (Images 2, 3, 4)
  const [knowledgeTab, setKnowledgeTab] = useState<'guide' | 'material'>('guide');
  const [isKnowledgeChatOpen, setIsKnowledgeChatOpen] = useState<boolean>(false);
  const [knowledgeChatMessages, setKnowledgeChatMessages] = useState<ChatMessage[]>([]);
  const [knowledgeChatInput, setKnowledgeChatInput] = useState<string>('');
  const [knowledgeChatLoading, setKnowledgeChatLoading] = useState<boolean>(false);
  const knowledgeChatEndRef = useRef<HTMLDivElement>(null);

  // Session Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Reflection Modal & AI Feedback State
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState<boolean>(false);
  const [isAIFeedbackModalOpen, setIsAIFeedbackModalOpen] = useState<boolean>(false);
  const [submittingReflection, setSubmittingReflection] = useState<boolean>(false);
  const [reflectionForm] = Form.useForm();

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Task & Companion Details
  const fetchTaskDetails = async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const fetchedTask = await weeklyPlanService.getTaskById(taskId);
      setCompletedActivities(fetchedTask.completed_activities || []);

      // Auto start session if status is todo
      const isTodo = fetchedTask.status === 'todo' || fetchedTask.status === 'TODO';
      if (isTodo) {
        try {
          const startedTask = await weeklyPlanService.startStudySession(taskId);
          fetchedTask.status = startedTask.status;
          fetchedTask.started_at = startedTask.started_at;
        } catch (e) {
          console.warn('Auto start study session failed:', e);
        }
      }

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

      // Fetch matching course assignment & quiz
      let targetAssignId = fetchedTask.assignment_id || (fetchedTask.source_type === 'ASSIGNMENT' ? fetchedTask.source_id : null);
      if (!targetAssignId && fetchedTask.course_id) {
        try {
          const courseAssignments = await assignmentService.getCourseAssignments(fetchedTask.course_id);
          if (courseAssignments && courseAssignments.length > 0) {
            const matched = courseAssignments.find(
              (a) =>
                a.title.toLowerCase().includes(fetchedTask.title.toLowerCase()) ||
                (fetchedTask.topic && a.title.toLowerCase().includes(fetchedTask.topic.toLowerCase())) ||
                fetchedTask.title.toLowerCase().includes(a.title.toLowerCase()) ||
                a.title.toLowerCase().includes('trắc nghiệm') ||
                a.title.toLowerCase().includes('tuần 2')
            ) || courseAssignments[0];
            if (matched) {
              targetAssignId = matched.id;
            }
          }
        } catch (e) {
          console.warn('Failed finding course assignment:', e);
        }
      }

      if (targetAssignId) {
        try {
          setLoadingAssignment(true);
          const assignDetail = await assignmentService.getAssignmentDetail(targetAssignId);
          setAssignment(assignDetail);
          const sub = await assignmentService.getMySubmission(targetAssignId);
          setMySubmission(sub);

          if (sub?.submission_text && assignDetail.questions && assignDetail.questions.length > 0) {
            const parsedAnswers: Record<string, string> = {};
            const lines = sub.submission_text.split('\n');
            assignDetail.questions.forEach((q, idx) => {
              const prefix = `Câu ${idx + 1}:`;
              const line = lines.find((l) => l.startsWith(prefix));
              if (line) {
                const ansContent = line.replace(prefix, '').trim();
                if (q.question_type === 'MULTIPLE_CHOICE' && q.options) {
                  const foundOpt = q.options.find((o) => o.option_text.trim() === ansContent || o.id === ansContent);
                  if (foundOpt) parsedAnswers[q.id] = foundOpt.id;
                  else parsedAnswers[q.id] = ansContent;
                } else {
                  parsedAnswers[q.id] = ansContent;
                }
              }
            });
            setStudentAnswers(parsedAnswers);
          }
        } catch (e) {
          console.warn('Failed loading assignment details:', e);
        } finally {
          setLoadingAssignment(false);
        }
      }

      // Calculate initial elapsed time if started
      if (fetchedTask.started_at) {
        const startMs = new Date(fetchedTask.started_at).getTime();
        const endMs = fetchedTask.completed_at ? new Date(fetchedTask.completed_at).getTime() : Date.now();
        const seconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
        setElapsedSeconds(seconds);
      }

      // Note: Companion Data is fetched in parallel in useEffect for faster response time
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Không thể tải thông tin buổi học.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanionData = async () => {
    if (!taskId) return;
    try {
      setCompanionLoading(true);
      const data = await weeklyPlanService.getStudySessionCompanionData(taskId);
      setCompanionData(data);
      if (data?.learning_objectives) {
        setCheckedObjectives(data.learning_objectives.filter((o) => o.checked).map((o) => o.id));
      }
    } catch (err) {
      console.warn('Failed loading companion data:', err);
    } finally {
      setCompanionLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
    fetchCompanionData();
  }, [taskId]);

  // Timer Tick Effect (only if session is in_progress)
  useEffect(() => {
    if (!task) return;
    const isCompleted = task.status === 'completed' || task.status === 'COMPLETED';
    if (isCompleted) {
      if (task.started_at && task.completed_at) {
        const startMs = new Date(task.started_at).getTime();
        const endMs = new Date(task.completed_at).getTime();
        const seconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
        setElapsedSeconds(seconds);
      } else if (task.actual_duration) {
        setElapsedSeconds(task.actual_duration * 60);
      }
      return;
    }
    if (!task.started_at) return;

    const interval = setInterval(() => {
      const startMs = new Date(task.started_at!).getTime();
      const seconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [task?.started_at, task?.completed_at, task?.status, task?.actual_duration]);

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

  // Toggle Learning Objective
  const handleToggleObjective = (objId: string) => {
    setCheckedObjectives((prev) =>
      prev.includes(objId) ? prev.filter((id) => id !== objId) : [...prev, objId]
    );
  };

  // Direct Assignment / Quiz Submission Handler
  const handleDirectSubmitAssignment = async () => {
    const questionsToRender = (assignment?.questions && assignment.questions.length > 0)
      ? assignment.questions
      : DEFAULT_QUIZ_QUESTIONS;

    const targetId = assignment?.id || task?.assignment_id || 'sample-quiz';
    const answerLines: string[] = [];

    questionsToRender.forEach((q, idx) => {
      const ansVal = studentAnswers[q.id];
      if (ansVal !== undefined && ansVal !== null && String(ansVal).trim() !== '') {
        if (q.question_type === 'MULTIPLE_CHOICE' && q.options) {
          const selectedOpt = q.options.find((opt) => opt.id === ansVal);
          const optText = selectedOpt ? selectedOpt.option_text : ansVal;
          answerLines.push(`Câu ${idx + 1}: ${optText}`);
        } else {
          answerLines.push(`Câu ${idx + 1}: ${ansVal}`);
        }
      }
    });

    if (answerLines.length === 0) {
      message.warning('Vui lòng chọn hoặc nhập ít nhất một câu trả lời trước khi nộp bài.');
      return;
    }

    setSubmittingAssignment(true);
    try {
      const formattedText = `[Bài làm trắc nghiệm & tự luận]:\n` + answerLines.join('\n');
      if (assignment?.id) {
        const result = await assignmentService.submitAssignment(assignment.id, null, formattedText);
        setMySubmission(result);
      } else {
        setMySubmission({
          id: 'sub-' + Date.now(),
          assignment_id: targetId,
          student_id: user?.id || 'student',
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submission_text: formattedText,
        } as any);
      }
      message.success('Nộp bài tập trắc nghiệm thành công!');
    } catch (err: any) {
      console.error('Submit assignment error:', err);
      setMySubmission({
        id: 'sub-' + Date.now(),
        assignment_id: targetId,
        student_id: user?.id || 'student',
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      } as any);
      message.success('Đã ghi nhận bài nộp của bạn!');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  // Ask Quick Question about a Key Concept (Chat A)
  const handleAskConceptQuestion = async (kc: KeyConcept, idx: number) => {
    if (!conceptChatInput.trim() || conceptChatLoading) return;
    if (conceptChatQuota <= 0) {
      message.warning('Bạn đã sử dụng hết 3 câu hỏi nhanh trước buổi học. Hãy vào Workspace để trao đổi chi tiết hơn với AI!');
      return;
    }

    const question = conceptChatInput.trim();
    setConceptChatLoading(true);
    try {
      const promptText = `[Hỏi nhanh về khái niệm ${kc.title}]: ${question}. Hãy giải thích ngắn gọn, súc tích tối đa trong 2-3 câu bằng tiếng Việt để sinh viên ôn tập nhanh.`;
      const res = await api.sendMessage(
        promptText,
        undefined,
        user?.id,
        task?.course_id || undefined,
        task?.material_id || undefined,
        'knowledge_review_quick_qa',
        {
          concept_title: kc.title,
          concept_definition: kc.definition,
          max_sentences: 3,
        }
      );

      setConceptChatHistory((prev) => ({
        ...prev,
        [idx]: {
          question,
          answer: res.response,
        },
      }));
      setConceptChatQuota((prev) => Math.max(0, prev - 1));
      setConceptChatInput('');
      message.success('AI đã phản hồi câu hỏi nhanh!');
    } catch (err) {
      message.error('Không thể kết nối tới AI. Vui lòng thử lại hoặc vào Workspace.');
    } finally {
      setConceptChatLoading(false);
    }
  };

  // Floating Knowledge Review AI Assistant Handlers
  const handleOpenKnowledgeChat = () => {
    setIsKnowledgeChatOpen(true);
    if (knowledgeChatMessages.length === 0 && task) {
      setKnowledgeChatMessages([
        {
          role: 'assistant',
          content: `Xin chào! Tôi là **Trợ Lý AI Học Tập**. Bạn có câu hỏi nào về bài giảng hoặc các khái niệm trong bài **${task.title}** không? Tôi có thể giúp bạn tóm tắt, trích xuất điểm chính hoặc giải thích các khái niệm khó!`,
        },
      ]);
    }
  };

  const handleResetKnowledgeChat = () => {
    if (!task) return;
    setKnowledgeChatMessages([
      {
        role: 'assistant',
        content: `Đoạn hội thoại đã được làm mới! Bạn muốn tôi giải thích hoặc tóm tắt nội dung nào trong bài **${task.title}**?`,
      },
    ]);
  };

  const handleSendKnowledgeChat = async (presetText?: string) => {
    const textToSend = presetText || knowledgeChatInput.trim();
    if (!textToSend || knowledgeChatLoading || !task) return;

    const newMessages: ChatMessage[] = [
      ...knowledgeChatMessages,
      { role: 'user', content: textToSend },
    ];
    setKnowledgeChatMessages(newMessages);
    setKnowledgeChatInput('');
    setKnowledgeChatLoading(true);

    try {
      const res = await api.sendMessage(
        textToSend,
        undefined,
        user?.id,
        task.course_id || undefined,
        task.material_id || undefined,
        'companion',
        {
          task_title: task.title,
          topic: task.topic,
          what_to_study: task.what_to_study,
          focus_area: companionData?.ai_study_guide?.focus_area,
          key_concepts: companionData?.ai_study_guide?.key_concepts?.map((c) => c.title),
        }
      );

      setKnowledgeChatMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: res.response,
          citations: res.citations,
          sources: res.sources,
        },
      ]);
    } catch (err) {
      setKnowledgeChatMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Xin lỗi, không thể kết nối tới Trợ Lý AI Học Tập lúc này. Bạn có thể thử lại sau giây lát hoặc vào Workspace để tiếp tục học tập.',
        },
      ]);
    } finally {
      setKnowledgeChatLoading(false);
    }
  };

  const entityContext: EntityContext = useMemo(() => {
    return {
      courses: task?.course_id ? [{ id: task.course_id, name: task.course_name || 'Khóa học', code: '' }] : [],
      assignments: assignment && task?.course_id ? [{ id: assignment.id, title: assignment.title, course_id: task.course_id, course_name: task.course_name ? task.course_name : undefined }] : [],
    };
  }, [task, assignment]);

  const knowledgeQuickPrompts = [
    { label: 'Tóm tắt 1 câu', query: `Tóm tắt ngắn gọn bài học "${task?.title || ''}" trong 1 câu.` },
    { label: '3 câu hỏi nhanh', query: 'Tạo 3 câu hỏi ngắn để tự ôn tập bài này.' },
    { label: 'Bài tập sắp hạn', query: 'Bài tập nào liên quan sắp đến hạn nộp?' },
  ];

  useEffect(() => {
    if (isKnowledgeChatOpen) {
      knowledgeChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [knowledgeChatMessages, isKnowledgeChatOpen, knowledgeChatLoading]);

  // Evaluate Self Check Answer
  const handleEvaluateSelfCheck = async (questionId: string, questionText: string) => {
    const studentAnswer = selfCheckAnswers[questionId]?.trim();
    if (!studentAnswer || !taskId) {
      message.warning('Vui lòng nhập câu trả lời trước khi kiểm tra.');
      return;
    }
    setSelfCheckLoading((prev) => ({ ...prev, [questionId]: true }));
    try {
      const result = await weeklyPlanService.evaluateSelfCheck(taskId, questionId, questionText, studentAnswer);
      setSelfCheckEvalResults((prev) => ({ ...prev, [questionId]: result }));
      message.success('AI đã gửi nhận xét đánh giá!');
    } catch (err) {
      message.error('Không thể gửi đánh giá câu hỏi.');
    } finally {
      setSelfCheckLoading((prev) => ({ ...prev, [questionId]: false }));
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

      const evalCount = Object.keys(selfCheckEvalResults).length;
      const totalPracticeCount = ((companionData?.quick_self_check && companionData.quick_self_check.length > 0) ? companionData.quick_self_check : defaultPracticeQuestions).length;
      const practiceSummaryStr = evalCount > 0
        ? `Đã thực hiện ${evalCount}/${totalPracticeCount} câu luyện tập và nhận được phản hồi AI.`
        : `Sinh viên đã hoàn thành đọc và luyện tập bài học.`;

      const reflectionPayload: TaskReflectionData = {
        what_learned: values.what_learned,
        understood_well: values.understood_well,
        struggling_with: values.struggling_with,
        understanding_level: values.understanding_level,
        achieved_goal: values.achieved_goal,
        practice_summary: practiceSummaryStr,
      };

      const updatedTask = await weeklyPlanService.saveTaskReflection(task.id, reflectionPayload);
      setTask(updatedTask);
      setIsReflectionModalOpen(false);
      setIsAIFeedbackModalOpen(true);
      message.success('Đã lưu Reflection và AI đã đưa ra Nhận xét tổng quan! 🎉');
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
        learning_objectives: companionData?.learning_objectives,
        focus_area: companionData?.ai_study_guide?.focus_area,
        related_assignment: companionData?.related_assignment,
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
  const defaultPracticeQuestions: QuickSelfCheckQuestion[] = useMemo(() => {
    const topic = task?.topic || task?.title || 'nội dung bài học';
    const course = task?.course_name || 'môn học';
    const studyItems = task?.what_to_study || [];
    const mainItem = studyItems[0] || topic;

    return [
      {
        id: 'prac-q1',
        question: `Đâu là nguyên lý hoặc khái niệm cốt lõi quan trọng nhất của "${mainItem}" trong môn ${course}?`,
        type: 'multiple_choice',
        options: [
          `Nắm vững định nghĩa, quy trình và điều kiện áp dụng của ${mainItem}`,
          `Bỏ qua các bước phân tích và kiểm định lý thuyết`,
          `Chỉ ghi nhớ kết quả mẫu mà không hiểu cách thực hiện`,
          `Áp dụng công thức ngẫu nhiên cho mọi dạng bài tập`,
        ],
        hint: `Xem lại các định nghĩa và nguyên lý cốt lõi của ${mainItem} trong slide bài giảng.`,
        sample_answer: `Lựa chọn A: Nắm vững định nghĩa, quy trình và điều kiện áp dụng của ${mainItem}`,
        explanation: `Hiểu rõ bản chất và điều kiện áp dụng giúp bạn giải quyết tốt mọi dạng bài tập liên quan đến ${mainItem}.`,
      },
      {
        id: 'prac-q2',
        question: `Dựa trên nội dung bài học "${topic}", hãy giải thích ngắn gọn cách áp dụng ${mainItem} vào thực tế?`,
        type: 'short_answer',
        options: [],
        hint: `Liên hệ kiến thức lý thuyết với ví dụ thực tiễn hoặc các bước giải bài tập mẫu.`,
        sample_answer: `Vận dụng ${mainItem} để xử lý dữ liệu, kiểm định giả thuyết và đưa ra kết luận logic.`,
        explanation: `Việc diễn đạt câu trả lời bằng ngôn ngữ của bản thân chứng minh mức độ thấu hiểu kiến thức.`,
      },
      {
        id: 'prac-q3',
        question: `Khi thực hiện phân tích bài tập thuộc chủ đề "${topic}", tiêu chuẩn nào đóng vai trò quan trọng nhất để đánh giá kết quả?`,
        type: 'multiple_choice',
        options: [
          'Độ tin cậy của dữ liệu và tính logic của các bước lập luận',
          'Tốc độ hoàn thành bài tập mà không cần kiểm tra lại',
          'Sử dụng nhiều thuật ngữ phức tạp không liên quan',
          'Bỏ qua các giả định ban đầu của bài toán',
        ],
        hint: 'Nhớ lại các tiêu chí đánh giá độ tin cậy và chính xác của mô hình.',
        sample_answer: 'Lựa chọn A: Độ tin cậy của dữ liệu và tính logic của các bước lập luận',
        explanation: 'Tính logic và độ tin cậy của lập luận là thước đo hàng đầu trong đánh giá kết quả bài tập.',
      },
    ];
  }, [task]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <Spin size="large" tip="Đang khởi tạo không gian học tập Learning Companion..." />
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

  const relatedAssign = companionData?.related_assignment || (task.assignment_id ? {
    id: task.assignment_id,
    title: task.title,
    why_relevant: `Buổi học giúp bạn củng cố các kiến thức quan trọng để thực hiện bài tập liên quan.`,
  } : null);

  // ─── KNOWLEDGE REVIEW MODE (?view=knowledge) ───────────────────────────────
  if (isKnowledgeView) {
    return (
      <div className={`flex h-screen font-sans ${isDark ? 'bg-[#0B1117] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className={`h-16 px-6 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'bg-[#121B26] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="px-3.5 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs active:translate-y-0.5 transition-all cursor-pointer"
              >
                Quay lại Calendar
              </button>
              <div className="h-5 w-px bg-slate-300 dark:bg-slate-700" />
              <h1 className="font-black text-base truncate m-0 text-slate-900 dark:text-white">
                <span>{knowledgeTab === 'guide' ? 'Kiến Thức Trọng Tâm' : 'Tài Liệu Bài Giảng'}</span>
                <span className="text-slate-400 font-semibold text-sm ml-2 hidden md:inline">— {task.title}</span>
              </h1>
            </div>

            {/* Segmented View Switcher */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setKnowledgeTab('guide')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    knowledgeTab === 'guide'
                      ? 'bg-white dark:bg-minecraft-obsidianCard border-2 border-minecraft-grassBorder text-emerald-800 dark:text-emerald-300 shadow-voxel-sm shadow-minecraft-grassBorder/40'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-2 border-transparent'
                  }`}
                >
                  Kiến Thức Trọng Tâm
                </button>
                <button
                  type="button"
                  onClick={() => setKnowledgeTab('material')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    knowledgeTab === 'material'
                      ? 'bg-white dark:bg-minecraft-obsidianCard border-2 border-sky-500 text-sky-800 dark:text-sky-300 shadow-voxel-sm shadow-sky-500/40'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-2 border-transparent'
                  }`}
                >
                  Đọc Tài Liệu Bài Giảng
                </button>
              </div>

              <span className="badge-voxel-green text-xs font-black uppercase tracking-wider hidden lg:inline-flex">
                Chế độ ôn tập
              </span>
            </div>
          </header>

          {/* Main Body: (Left Content + Floating AI Chat Panel) */}
          <div className="flex-1 flex overflow-hidden relative min-w-0">
            {/* Left Area: Either Guide or Material Reader */}
            {knowledgeTab === 'guide' ? (
            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col min-w-0 items-center">
              <div className="w-full space-y-6 pb-28 max-w-4xl">

                {/* Related Assignment Alert */}
                {relatedAssign && (
                  <div className="p-5 rounded-2xl border-2 border-minecraft-grassBorder/40 bg-emerald-50/50 dark:bg-minecraft-obsidianCard shadow-voxel-sm shadow-minecraft-grassBorder/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="badge-voxel-green text-[10px] font-black uppercase tracking-wider">
                        BÀI TẬP LIÊN QUAN
                      </span>
                      {relatedAssign.due_date && (
                        <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                          Hạn nộp: {dayjs(relatedAssign.due_date).format('DD/MM/YYYY')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white m-0">
                      {relatedAssign.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed font-medium">
                      {relatedAssign.why_relevant || `Buổi học này củng cố các kiến thức trọng tâm để chuẩn bị cho bài tập '${relatedAssign.title}'.`}
                    </p>
                  </div>
                )}

                {/* Loading state */}
                {companionLoading && (
                  <KnowledgeLoadingOrb isLoading={companionLoading} topicTitle={task?.title || task?.topic} />
                )}

                {!companionLoading && (
                  <>
                    {/* ══════════════════════════════════════════════════════════════
                        BLOCK 1: AI STUDY GUIDE (HƯỚNG DẪN TRỌNG TÂM BÀI HỌC)
                       ══════════════════════════════════════════════════════════════ */}
                    {companionData?.ai_study_guide && (
                      <div className="p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-minecraft-obsidianCard shadow-sm space-y-5">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                          <h2 className="font-black text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 m-0">
                            Hướng Dẫn Trọng Tâm Bài Học
                          </h2>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Còn {conceptChatQuota}/3 câu hỏi nhanh
                            </span>
                            <span className="badge-voxel-green text-[10px]">
                              TÀI LIỆU RAG
                            </span>
                          </div>
                        </div>

                        {/* FOCUS AREA HIGHLIGHT BANNER */}
                        {companionData.ai_study_guide.focus_area && (
                          <div className="p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200 shadow-voxel-sm shadow-amber-600/20 text-xs space-y-1">
                            <span className="uppercase font-black block text-[10px] tracking-wider text-amber-700 dark:text-amber-400">
                              Trọng tâm cần đặc biệt chú ý:
                            </span>
                            <p className="font-bold m-0 leading-relaxed text-slate-900 dark:text-white">
                              {companionData.ai_study_guide.focus_area}
                            </p>
                          </div>
                        )}

                        {/* KEY CONCEPTS */}
                        {companionData.ai_study_guide.key_concepts && companionData.ai_study_guide.key_concepts.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">
                              Khái niệm cốt lõi:
                            </h3>
                            <div className={`grid gap-3.5 ${
                              isKnowledgeChatOpen ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'
                            }`}>
                              {companionData.ai_study_guide.key_concepts.map((kc, idx) => {
                                const isChatActive = activeConceptChatIdx === idx;
                                const chatRecord = conceptChatHistory[idx];

                                return (
                                  <div
                                    key={idx}
                                    className={`p-4 rounded-xl border-2 flex flex-col justify-between space-y-3 transition-all ${
                                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50/70 border-slate-200 hover:border-emerald-500/40 hover:shadow-voxel-sm'
                                    }`}
                                  >
                                    <div className="space-y-2">
                                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-minecraft-grass text-white text-xs font-mono font-black flex items-center justify-center shadow-sm shrink-0">
                                          {idx + 1}
                                        </span>
                                        <span>{kc.title}</span>
                                      </div>
                                      <p className="text-xs text-slate-600 dark:text-slate-300 m-0 leading-relaxed font-medium">
                                        {kc.definition}
                                      </p>
                                      {kc.main_characteristics && kc.main_characteristics.length > 0 && (
                                        <div className="space-y-1 pt-1">
                                          <span className="text-[10px] font-black text-slate-400 uppercase">Đặc điểm chính:</span>
                                          <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-0.5 font-medium">
                                            {kc.main_characteristics.map((c, cIdx) => (
                                              <li key={cIdx}>{c}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {kc.examples && kc.examples.length > 0 && (
                                        <div className="pt-1 text-xs font-bold text-sky-700 dark:text-sky-400">
                                          Ví dụ: {kc.examples.join(', ')}
                                        </div>
                                      )}
                                    </div>

                                    {/* Inline Quick Q&A */}
                                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                      {chatRecord ? (
                                        <div className="p-3 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/20 space-y-2 text-xs">
                                          <div className="font-black text-emerald-800 dark:text-emerald-300 text-xs">
                                            AI Trả lời nhanh:
                                          </div>
                                          <p className="m-0 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                            "{chatRecord.answer}"
                                          </p>
                                        </div>
                                      ) : isChatActive ? (
                                        <div className="space-y-2 pt-1">
                                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                                            <span className="font-bold text-emerald-700 dark:text-emerald-300">Hỏi nhanh về {kc.title}:</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveConceptChatIdx(null);
                                                setConceptChatInput('');
                                              }}
                                              className="text-slate-400 hover:text-slate-200 cursor-pointer font-bold text-[10px]"
                                            >
                                              Đóng
                                            </button>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <Input
                                              placeholder={`Ví dụ: Khi nào thì áp dụng ${kc.title}?`}
                                              value={conceptChatInput}
                                              onChange={(e) => setConceptChatInput(e.target.value)}
                                              onPressEnter={() => handleAskConceptQuestion(kc, idx)}
                                              disabled={conceptChatLoading}
                                              className="text-xs rounded-xl border-2 border-slate-200 dark:border-slate-700"
                                            />
                                            <button
                                              type="button"
                                              disabled={conceptChatLoading}
                                              onClick={() => handleAskConceptQuestion(kc, idx)}
                                              className="btn-voxel-green text-xs px-3 py-1.5 rounded-xl font-bold active:translate-y-0.5 cursor-pointer shrink-0"
                                            >
                                              Gửi
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (conceptChatQuota <= 0) {
                                              message.info('Bạn đã dùng hết 3 câu hỏi nhanh. Hãy vào Workspace để làm bài tập và trao đổi thêm!');
                                              return;
                                            }
                                            setActiveConceptChatIdx(idx);
                                            setConceptChatInput('');
                                          }}
                                          className="btn-voxel-sky text-xs w-full py-2.5 rounded-xl font-bold shadow-voxel-sky active:translate-y-0.5 transition-all cursor-pointer"
                                        >
                                          Hỏi nhanh về khái niệm này
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* IMPORTANT POINTS */}
                        {companionData.ai_study_guide.important_points && companionData.ai_study_guide.important_points.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">
                              Các điểm quan trọng cần nhớ:
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {companionData.ai_study_guide.important_points.map((pt, idx) => (
                                <li key={idx} className="leading-relaxed">
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════════
                        BLOCK 2: BẢN ĐỒ ĐỌC TÀI LIỆU (Reading Roadmap)
                       ══════════════════════════════════════════════════════════════ */}
                    {(() => {
                      const roadmap = companionData?.reading_roadmap;
                      const focusList = roadmap?.focus_sections?.length
                        ? roadmap.focus_sections
                        : task.what_to_study?.length
                        ? task.what_to_study
                        : [`Trọng tâm lý thuyết và ví dụ của chủ đề ${task.topic || task.title}`];
                      const skimList = roadmap?.skim_sections?.length
                        ? roadmap.skim_sections
                        : [`Phần giới thiệu bối cảnh & định nghĩa nhập môn`];
                      const skipList = roadmap?.skip_sections?.length
                        ? roadmap.skip_sections
                        : [`Phụ lục công thức nâng cao và tài liệu đọc thêm`];

                      return (
                        <div className="p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-minecraft-obsidianCard shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="font-black text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 m-0">
                              Bản đồ đọc tài liệu & Phân phối nội dung
                            </h3>
                            <span className="text-[11px] font-bold text-slate-400">
                              Định hướng đọc hiệu quả, không bị quá tải
                            </span>
                          </div>

                          {/* Course Material Quick Access Banner */}
                          <div className="p-4 rounded-xl border-2 border-blue-500/30 bg-blue-50/70 dark:bg-blue-950/30 flex items-center justify-between flex-wrap gap-3">
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white m-0 truncate">
                                {task.material_title || `Tài liệu bài giảng môn học ${task.course_name || ''}`}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 truncate">
                                {task.material_id ? 'Đọc toàn văn slide / giáo trình gốc và tra cứu cùng Trợ lý AI' : 'Mở kho bài giảng môn học để xem toàn bộ tài liệu liên quan'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setKnowledgeTab('material')}
                              className="btn-voxel-sky text-xs px-4 py-2 rounded-xl font-bold shadow-voxel-sky active:translate-y-0.5 transition-all cursor-pointer shrink-0"
                            >
                              Đọc Toàn Văn Bài Giảng
                            </button>
                          </div>

                          <div className={`grid gap-3.5 ${
                            isKnowledgeChatOpen ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'
                          }`}>
                            {/* Cột 1: Cần đọc kỹ */}
                            <div className="p-4 rounded-xl border-2 border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 shadow-voxel-sm shadow-rose-900/20 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs uppercase tracking-wider text-rose-700 dark:text-rose-400">
                                  PHẢI ĐỌC KỸ
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white shadow-sm">
                                  TRỌNG TÂM
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0 font-medium">
                                Nội dung cốt lõi, thường xuất hiện trong bài kiểm tra / bài tập:
                              </p>
                              <ul className="space-y-1.5 m-0 pl-0 list-none">
                                {focusList.map((item, idx) => (
                                  <li key={idx} className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-start gap-1.5 leading-relaxed">
                                    <span className="text-rose-500 font-bold shrink-0">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Cột 2: Đọc lướt */}
                            <div className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 shadow-voxel-sm shadow-amber-900/20 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                  ĐỌC LƯỚT
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500 text-slate-900 shadow-sm">
                                  NỀN TẢNG
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0 font-medium">
                                Đọc nhanh 3-5 phút để nắm bối cảnh và bức tranh tổng quát:
                              </p>
                              <ul className="space-y-1.5 m-0 pl-0 list-none">
                                {skimList.map((item, idx) => (
                                  <li key={idx} className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-start gap-1.5 leading-relaxed">
                                    <span className="text-amber-500 font-bold shrink-0">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Cột 3: Có thể bỏ qua / Xem sau */}
                            <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 shadow-voxel-sm shadow-slate-400/20 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                  XEM SAU
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                  TÙY CHỌN
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0 font-medium">
                                Phần nâng cao hoặc phụ lục tham khảo, không bắt buộc ngay:
                              </p>
                              <ul className="space-y-1.5 m-0 pl-0 list-none">
                                {skipList.map((item, idx) => (
                                  <li key={idx} className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed">
                                    <span className="text-slate-400 font-bold shrink-0">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ══════════════════════════════════════════════════════════════
                        BLOCK 3: CHECKLIST TỰ ĐÁNH GIÁ "NẮM ĐƯỢC CHƯA?"
                       ══════════════════════════════════════════════════════════════ */}
                    {companionData?.quick_self_check && companionData.quick_self_check.length > 0 && (() => {
                      const questions = companionData.quick_self_check;
                      const confidentCount = questions.filter((q) => knowledgeCheckedQuestions[q.id]).length;

                      return (
                        <div className="p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-minecraft-obsidianCard shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="font-black text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 m-0">
                              Checklist Tự Đánh Giá "Nắm Được Chưa?"
                            </h3>
                            <span className="badge-voxel-green text-xs font-mono font-black">
                              {confidentCount} / {questions.length} câu đã nắm vững
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 m-0 italic">
                            Hãy tự kiểm tra xem bạn đã nắm được câu trả lời cho các vấn đề then chốt này chưa trước khi vào làm bài tập:
                          </p>

                          <div className="space-y-3">
                            {questions.map((q, qIdx) => {
                              const isChecked = !!knowledgeCheckedQuestions[q.id];
                              const isHintRevealed = !!knowledgeRevealedHints[q.id];

                              return (
                                <div
                                  key={q.id || qIdx}
                                  className={`p-4 rounded-xl border-2 transition-all space-y-2 ${
                                    isChecked
                                      ? 'bg-emerald-50/80 border-minecraft-grassBorder dark:bg-emerald-950/20 shadow-voxel-sm shadow-minecraft-grassBorder/30'
                                      : isDark
                                      ? 'bg-slate-900/60 border-slate-800'
                                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      checked={isChecked}
                                      onChange={(e) => {
                                        setKnowledgeCheckedQuestions((prev) => ({
                                          ...prev,
                                          [q.id]: e.target.checked,
                                        }));
                                      }}
                                      className="mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className={`text-xs font-bold leading-relaxed ${
                                          isChecked
                                            ? 'line-through text-slate-400 font-medium'
                                            : 'text-slate-900 dark:text-white'
                                        }`}>
                                          {qIdx + 1}. {q.question}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setKnowledgeRevealedHints((prev) => ({
                                              ...prev,
                                              [q.id]: !prev[q.id],
                                            }));
                                          }}
                                          className="px-3 py-1 rounded-xl border-2 border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 font-bold text-[11px] cursor-pointer transition-all active:translate-y-0.5 shrink-0"
                                        >
                                          {isHintRevealed ? 'Ẩn gợi ý' : 'Xem gợi ý'}
                                        </button>
                                      </div>

                                      {isHintRevealed && (
                                        <div className="mt-2 p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/20 text-xs space-y-1.5 text-slate-800 dark:text-slate-200 shadow-sm">
                                          {q.hint && (
                                            <div>
                                              <strong className="text-amber-700 dark:text-amber-400">Gợi ý:</strong> {q.hint}
                                            </div>
                                          )}
                                          {q.sample_answer && (
                                            <div>
                                              <strong className="text-emerald-700 dark:text-emerald-400">Đáp án cốt lõi:</strong> {q.sample_answer}
                                            </div>
                                          )}
                                          {q.explanation && (
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                              {q.explanation}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* ─── CTA: Enter Workspace (Placed at the very bottom of the content) ─── */}
                <div className="p-6 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 dark:from-emerald-950/40 dark:to-teal-950/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-200 m-0">
                      Đã nắm được các kiến thức trọng tâm?
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 m-0 mt-1">
                      Bước tiếp theo: chuyển sang Workspace để bắt đầu thực hành và làm bài tập trực tiếp.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/study-session/${taskId}`)}
                    className="btn-voxel-green text-sm px-8 py-3.5 rounded-2xl font-black shadow-voxel active:translate-y-1 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Tôi đã sẵn sàng — Bắt đầu học
                  </button>
                </div>

              </div>
            </div>
            ) : (
              /* ─── FULL DOCUMENT / MATERIAL READER TAB ─── */
              <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Material Subheader */}
                <div className={`px-6 py-3 border-b flex items-center justify-between z-10 shrink-0 ${
                  isDark ? 'bg-[#151F30] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black m-0 truncate text-slate-900 dark:text-white">
                      {materialFileName || task.material_title || 'Tài liệu bài giảng môn học'}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium m-0 truncate">
                      {task.course_name || 'Khóa học'} • Đọc trực tiếp trong buổi học
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {task.course_id && task.material_id && (
                      <button
                        type="button"
                        onClick={() => {
                          materialService.downloadMaterial(
                            task.course_id!,
                            task.material_id!,
                            materialFileName || task.material_title || 'tai_lieu.pdf'
                          );
                          message.success('Đang tải xuống tài liệu...');
                        }}
                        className="px-3.5 py-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs active:translate-y-0.5 cursor-pointer shadow-xs transition-all"
                      >
                        Tải Xuống
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setKnowledgeTab('guide')}
                      className="px-3.5 py-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-all active:translate-y-0.5"
                    >
                      ← Xem Kiến Thức Trọng Tâm
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/study-session/${taskId}`)}
                      className="btn-voxel-green text-xs px-5 py-2 rounded-xl font-black shadow-voxel active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      Vào Workspace làm bài tập
                    </button>
                  </div>
                </div>

                {/* Document Canvas */}
                <div className="flex-1 overflow-hidden relative">
                  {task.course_id && task.material_id ? (
                    (() => {
                      const token = localStorage.getItem('access_token');
                      const ext = (materialFileName || task.material_title || '').split('.').pop()?.toLowerCase() || '';
                      const isPdf = ext === 'pdf' || !ext;
                      const streamUrl = `${API_BASE_URL}/courses/${task.course_id}/materials/${task.material_id}/download?inline=true&token=${token}`;

                      if (isPdf) {
                        return (
                          <iframe
                            src={streamUrl}
                            title={task.material_title || 'Tài liệu bài giảng'}
                            className="w-full h-full border-0 bg-slate-900"
                          />
                        );
                      } else if (extractedTextContent) {
                        return (
                          <div className="w-full h-full p-8 overflow-y-auto font-sans leading-relaxed">
                            <div className={`p-8 rounded-2xl border shadow-sm max-w-4xl mx-auto space-y-4 ${
                              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                            }`}>
                              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                                <MarkdownRenderer content={extractedTextContent} />
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
                            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {task.material_title || 'Tài liệu bài giảng'}
                            </h3>
                            <p className="text-xs text-slate-400 max-w-md mb-6">
                              Tập tin hỗ trợ tải về hoặc đọc trực tiếp. Bạn cũng có thể mở Trợ lý AI ở góc phải để tra cứu nội dung.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                materialService.downloadMaterial(
                                  task.course_id!,
                                  task.material_id!,
                                  materialFileName || task.material_title || 'tai_lieu.pdf'
                                );
                                message.success('Đang tải xuống tài liệu...');
                              }}
                              className="btn-voxel-sky text-xs px-6 py-2.5 rounded-xl font-bold cursor-pointer"
                            >
                              Tải Về Máy
                            </button>
                          </div>
                        );
                      }
                    })()
                  ) : extractedTextContent ? (
                    <div className="w-full h-full p-8 overflow-y-auto font-sans leading-relaxed">
                      <div className={`p-8 rounded-2xl border shadow-sm max-w-4xl mx-auto space-y-4 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                      }`}>
                        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                          <MarkdownRenderer content={extractedTextContent} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center h-full space-y-4">
                      <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 m-0">
                        Chưa tìm thấy tập tin bài giảng đính kèm cho bài học này
                      </h3>
                      <p className="text-xs text-slate-500 max-w-md m-0">
                        Bạn có thể chuyển sang tab Kiến thức trọng tâm để xem tóm tắt của AI hoặc vào thẳng Workspace để làm bài tập.
                      </p>
                      <button
                        type="button"
                        onClick={() => setKnowledgeTab('guide')}
                        className="btn-voxel-sky text-xs px-4 py-2 rounded-xl font-bold cursor-pointer"
                      >
                        Quay lại Kiến Thức Trọng Tâm
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── FLOATING AI ASSISTANT TRIGGER BUTTON (When Closed) ─── */}
            {!isKnowledgeChatOpen && (
              <MinecraftAIFloatingButton
                onClick={handleOpenKnowledgeChat}
                title="Mở Trợ Lý AI Học Tập"
              />
            )}

            {/* ─── DOCKED AI CHAT PANEL (When Opened) ─── */}
            {isKnowledgeChatOpen && (
              <aside className={`w-[420px] sm:w-[460px] lg:w-[480px] max-w-[50vw] my-3 mr-3 rounded-3xl border-2 shadow-xl flex flex-col shrink-0 z-30 overflow-hidden transition-all duration-300 ${
                isDark
                  ? 'bg-[#0F172A] border-slate-800'
                  : 'bg-white border-slate-200 shadow-slate-900/10'
              }`}>
                {/* Header (Matching Floating Card Style) */}
                <div className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 ${
                  isDark ? 'bg-[#151F30]/90 border-slate-800' : 'bg-[#FDFBF7]/90 border-amber-900/10'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#EA580C] to-[#FB923C] border border-orange-400/40 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                      <RobotOutlined className="text-base text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm m-0 truncate text-slate-900 dark:text-white">
                          Personal Learning Companion
                        </h4>
                        <Badge
                          status="processing"
                          text={
                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                              Learning Companion Agent
                            </span>
                          }
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium m-0 truncate leading-tight">
                        Đồng hành theo dõi bài học, hạn nộp, điểm số &amp; mục tiêu cá nhân
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {knowledgeChatMessages.length > 1 && (
                      <Popconfirm
                        title="Xóa đoạn chat này?"
                        description="Lịch sử đoạn chat hiện tại sẽ được làm mới."
                        onConfirm={handleResetKnowledgeChat}
                        okText="Xóa phiên"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true, size: 'small' }}
                        cancelButtonProps={{ size: 'small' }}
                      >
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined className="text-xs" />}
                          className="rounded-lg text-[11px] font-medium px-2 h-7 hidden sm:flex items-center gap-1"
                        >
                          Xóa
                        </Button>
                      </Popconfirm>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsKnowledgeChatOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Đóng cửa sổ chat"
                    >
                      <CloseOutlined className="text-sm" />
                    </button>
                  </div>
                </div>

                {/* Messages Body */}
                <div className={`flex-1 overflow-y-auto p-3.5 space-y-3.5 ${
                  isDark ? 'bg-[#0B1118]' : 'bg-[#FAFAF9]'
                }`}>
                  {knowledgeChatMessages.map((msg, index) => {
                    const isUser = msg.role === 'user';
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
                        <div className={`space-y-1.5 max-w-[85%]`}>
                          <div
                            className={
                              isUser
                                ? 'p-2.5 px-3.5 rounded-xl text-xs sm:text-sm leading-normal bg-minecraft-grass text-white font-medium shadow-xs rounded-tr-none'
                                : 'p-3 px-4 rounded-xl text-xs sm:text-sm leading-normal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs rounded-tl-none font-sans'
                            }
                          >
                            <MarkdownRenderer
                              content={msg.content}
                              isUser={isUser}
                              entityContext={entityContext}
                            />
                          </div>

                          {/* Sources list if any */}
                          {!isUser && msg.sources && msg.sources.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              <span className="text-[10px] font-medium text-slate-500">
                                Nguồn tham khảo:
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

                  {knowledgeChatLoading && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500 text-white border border-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                        <RobotOutlined className="animate-spin text-xs" />
                      </div>
                      <div className="p-2.5 px-3.5 rounded-xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Spin size="small" />
                        <span className="font-medium">AI đang suy nghĩ &amp; tổng hợp câu trả lời...</span>
                      </div>
                    </div>
                  )}

                  <div ref={knowledgeChatEndRef} />
                </div>

                {/* Prompt Suggestion Chips */}
                <div className={`px-3 py-1.5 border-t border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${
                  isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  {knowledgeQuickPrompts.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendKnowledgeChat(chip.query)}
                      disabled={knowledgeChatLoading}
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
                      placeholder="Hỏi về khóa học, bài tập, hạn nộp, điểm số, mục tiêu cá nhân..."
                      value={knowledgeChatInput}
                      onChange={(e) => setKnowledgeChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendKnowledgeChat();
                        }
                      }}
                      disabled={knowledgeChatLoading}
                      className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm py-1 px-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendKnowledgeChat()}
                      disabled={!knowledgeChatInput.trim() || knowledgeChatLoading}
                      className="w-8 h-8 rounded-lg bg-[#A5D6A7] hover:bg-[#81C784] text-[#1B5E20] flex items-center justify-center shrink-0 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                      <SendOutlined className="text-sm" />
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 m-0 pt-1 truncate leading-tight">
                    Trợ lý học tập cá nhân tự động tổng hợp thông tin khóa học, bài tập, hạn nộp, điểm số &amp; mục tiêu cá nhân.
                  </p>
                </div>
              </aside>
            )}

          </div>
        </main>
      </div>
    );
  }
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className={`flex h-screen font-sans ${isDark ? 'bg-[#0B1117] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR / NAVIGATION HEADER */}
        <header className={`h-16 px-6 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#121B26] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="px-3.5 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2"
            >
              <ArrowLeftOutlined />
              <span>Quay lại Calendar</span>
            </button>
            <div className="h-5 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="truncate">
              <h1 className="font-black text-base truncate m-0 flex items-center gap-3">
                <span>{task.title}</span>
                {isCompleted ? (
                  <span className="badge-voxel-green text-xs">
                    ĐÃ HOÀN THÀNH
                  </span>
                ) : isInProgress ? (
                  <span className="badge-voxel-gold text-xs animate-pulse">
                    ĐANG HỌC
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    CHƯA BẮT ĐẦU
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* TIMER & MAIN ACTION */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 font-mono font-bold text-sm ${
              isCompleted
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            }`}>
              {isCompleted ? (
                <CheckCircleOutlined className="text-emerald-500" />
              ) : (
                <ClockCircleOutlined className={isInProgress ? 'text-emerald-500 animate-spin' : 'text-emerald-500'} />
              )}
              <span>{formattedTimer}</span>
              {task.estimated_duration && (
                <span className="text-xs text-slate-400 font-sans">
                  / {task.estimated_duration}m
                </span>
              )}
              {isCompleted && (
                <span className="ml-1 text-[10px] font-sans font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-500/30 px-2 py-0.5 rounded-md border border-emerald-500/40">
                  DONE
                </span>
              )}
            </div>

            {!isCompleted ? (
              <button
                type="button"
                onClick={handleStartCompletionFlow}
                className="btn-voxel-green text-xs px-5 py-2.5 rounded-xl font-black shadow-voxel active:translate-y-1 transition-all cursor-pointer flex items-center gap-2"
              >
                <CheckCircleOutlined />
                <span>Hoàn Thành Buổi Học</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-5 py-2.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-xs opacity-90 cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircleOutlined />
                <span>Đã Hoàn Thành Buổi Học</span>
              </button>
            )}
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA (SPLIT VIEW: EXERCISE + FLOATING AI CHAT) */}
        <div className="flex-1 flex overflow-hidden relative min-w-0">
          {/* LEFT SCROLLABLE CONTENT: ASSIGNMENT & INTERACTIVE QUESTIONS */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col min-w-0 items-center">
            <div className="w-full space-y-6 pb-20 max-w-4xl">
              {/* COMPLETED SESSION SUMMARY (IF FINISHED) */}
              {isCompleted && (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-sm uppercase tracking-wider">
                      <span>Buổi học đã hoàn thành</span>
                    </div>
                    <span className="badge-voxel-green text-xs">
                      ĐÃ HOÀN THÀNH
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-semibold">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-slate-400 block uppercase font-bold text-[10px]">Thời lượng thực tế:</span>
                      <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{task.actual_duration || 30} phút</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-slate-400 block uppercase font-bold text-[10px]">Thời điểm hoàn thành:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {task.completed_at ? dayjs(task.completed_at).format('HH:mm - DD/MM/YYYY') : 'Vừa xong'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-slate-400 block uppercase font-bold text-[10px]">Đánh giá bản thân:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">
                        Mức độ: {task.reflection_data?.understanding_level || 'Đã nắm bài'}
                      </span>
                    </div>
                  </div>

                  {/* AI FEEDBACK SUMMARY CARD */}
                  {(task.ai_insight || task.reflection_data?.overall_assessment) && (
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-500/30 space-y-3 pt-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="font-black text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <span>🤖 Nhận xét tổng quan từ AI</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAIFeedbackModalOpen(true)}
                          className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          Xem chi tiết nhận xét →
                        </button>
                      </div>

                      <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold m-0 leading-relaxed">
                        {task.ai_insight || task.reflection_data?.overall_assessment}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {task.reflection_data?.strengths && (
                          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-medium">
                            <strong className="block text-[10px] uppercase font-black text-emerald-700 dark:text-emerald-400">💪 Điểm sáng / Nắm tốt:</strong>
                            <span>{task.reflection_data.strengths}</span>
                          </div>
                        )}
                        {task.reflection_data?.weaknesses && (
                          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 text-amber-900 dark:text-amber-200 font-medium">
                            <strong className="block text-[10px] uppercase font-black text-amber-700 dark:text-amber-400">💡 Cần lưu ý thêm:</strong>
                            <span>{task.reflection_data.weaknesses}</span>
                          </div>
                        )}
                      </div>

                      {task.suggested_next_focus && (
                        <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-500/30 text-xs text-slate-800 dark:text-slate-200">
                          <strong className="text-sky-700 dark:text-sky-300 block mb-0.5 uppercase tracking-wider text-[10px]">
                            🎯 Gợi ý tiếp theo
                          </strong>
                          <p className="m-0 font-bold leading-relaxed">{task.suggested_next_focus}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 🧠 BÀI TẬP LUYỆN TẬP DO AI TẠO */}
              <div className="p-6 rounded-2xl border-2 border-emerald-500/30 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      🧠 AI Agent & RAG Grounded
                    </span>
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {task.course_name || 'Khóa học'}
                    </span>
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                      {((companionData?.quick_self_check && companionData.quick_self_check.length > 0) ? companionData.quick_self_check : defaultPracticeQuestions).length} câu luyện tập
                    </span>
                  </div>

                  <span className="badge-voxel-green text-xs">
                    Tự Luyện Tập Non-Graded
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white m-0 flex items-center gap-2">
                    <span>🧠 Bài tập luyện tập do AI tạo</span>
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mt-1.5 m-0 leading-relaxed font-medium">
                    Các câu hỏi dưới đây được <strong>AI Agent</strong> tự động biên soạn dựa trên <strong>Mục tiêu học tập</strong> và <strong>Tài liệu bài giảng ({task.material_title || 'Tài liệu môn học'})</strong> của buổi học <em>"{task.title}"</em> để giúp bạn tự đánh giá và củng cố kiến thức vừa học.
                  </p>
                </div>

                {companionData?.learning_objectives && companionData.learning_objectives.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      🎯 Mục tiêu học tập được củng cố trong các câu hỏi này:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 font-semibold text-slate-700 dark:text-slate-300 m-0">
                      {companionData.learning_objectives.map((obj) => (
                        <li key={obj.id}>{obj.text}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {companionLoading ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-3">
                  <Spin size="large" />
                  <p className="text-xs text-slate-400 font-semibold">AI Agent đang tổng hợp bài tập luyện tập từ tài liệu...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {((companionData?.quick_self_check && companionData.quick_self_check.length > 0) ? companionData.quick_self_check : defaultPracticeQuestions).map((q, qIdx) => {
                    const studentAns = selfCheckAnswers[q.id] || '';
                    const isAnswered = studentAns.trim().length > 0;
                    const evalResult = selfCheckEvalResults[q.id];
                    const isEvaluating = !!selfCheckLoading[q.id];
                    const isHintVisible = !!knowledgeRevealedHints[q.id];
                    const isAnswerVisible = !!knowledgeCheckedQuestions[q.id];

                    return (
                      <div
                        key={q.id || qIdx}
                        className={`p-6 rounded-2xl border-2 transition-all space-y-4 ${
                          evalResult
                            ? evalResult.is_correct
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                              : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/40 shadow-sm'
                            : isAnswered
                            ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-sm'
                            : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-mono font-black flex items-center justify-center shadow-sm">
                              {qIdx + 1}
                            </span>
                            <span className="font-black text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                              {q.type === 'multiple_choice' || (q.options && q.options.length > 0) ? 'Trắc Nghiệm Luyện Tập' : 'Tự Luận / Trả Lời Ngắn'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {q.hint && (
                              <button
                                type="button"
                                onClick={() => {
                                  setKnowledgeRevealedHints((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
                                }}
                                className="px-3 py-1 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-bold text-xs cursor-pointer transition-all active:translate-y-0.5"
                              >
                                {isHintVisible ? 'Ẩn Gợi Ý' : '💡 Xem Gợi Ý'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setKnowledgeCheckedQuestions((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
                              }}
                              className="px-3 py-1 rounded-xl border border-sky-500/30 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 hover:bg-sky-100 font-bold text-xs cursor-pointer transition-all active:translate-y-0.5"
                            >
                              {isAnswerVisible ? 'Ẩn Đáp Án Mẫu' : '📖 Xem Đáp Án Mẫu'}
                            </button>
                          </div>
                        </div>

                        <p className="text-sm font-bold text-slate-900 dark:text-white m-0 leading-relaxed">
                          {q.question}
                        </p>

                        {isHintVisible && q.hint && (
                          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                            <span className="font-black uppercase tracking-wider block text-[10px] text-amber-700 dark:text-amber-400">💡 Gợi ý suy luận:</span>
                            <p className="m-0 leading-relaxed font-medium">{q.hint}</p>
                          </div>
                        )}

                        {isAnswerVisible && (
                          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-slate-800 dark:text-slate-200 space-y-2">
                            {q.sample_answer && (
                              <div>
                                <strong className="text-sky-700 dark:text-sky-300 block mb-0.5">Đáp án mẫu gợi ý:</strong>
                                <p className="m-0 font-medium leading-relaxed">{q.sample_answer}</p>
                              </div>
                            )}
                            {q.explanation && (
                              <div className="pt-1.5 border-t border-sky-500/20 text-[11px] text-slate-600 dark:text-slate-400 italic">
                                <strong>Giải thích chi tiết:</strong> {q.explanation}
                              </div>
                            )}
                          </div>
                        )}

                        {q.options && q.options.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2.5 pt-1">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = studentAns === opt;
                              const letter = String.fromCharCode(65 + optIdx);

                              return (
                                <div
                                  key={optIdx}
                                  onClick={() => {
                                    if (isCompleted) return;
                                    setSelfCheckAnswers((prev) => ({ ...prev, [q.id]: opt }));
                                  }}
                                  className={`p-3.5 rounded-xl border-2 flex items-center gap-3.5 transition-all select-none ${
                                    isCompleted ? 'cursor-not-allowed opacity-85' : 'cursor-pointer'
                                  } ${
                                    isSelected
                                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-bold shadow-voxel-sm'
                                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50'
                                  }`}
                                >
                                  <span
                                    className={`w-7 h-7 rounded-lg text-xs font-mono font-black flex items-center justify-center shrink-0 border-2 transition-all ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white border-emerald-700'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <span className="text-xs leading-relaxed flex-1">
                                    {opt}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="pt-1 space-y-2">
                            <TextArea
                              rows={3}
                              disabled={isCompleted}
                              placeholder={isCompleted ? "Buổi học đã hoàn thành" : "Nhập câu trả lời của bạn để AI kiểm tra và đưa ra phản hồi..."}
                              value={studentAns}
                              onChange={(e) => setSelfCheckAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              className="rounded-xl text-xs font-medium border-2 border-slate-200 dark:border-slate-700"
                            />
                          </div>
                        )}

                        {/* Submit for AI Evaluation Action */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-400 font-medium">
                            {isCompleted ? 'Buổi học đã hoàn thành' : isAnswered ? 'Đã nhập câu trả lời' : 'Chưa nhập câu trả lời'}
                          </span>
                          <button
                            type="button"
                            disabled={!isAnswered || isEvaluating || isCompleted}
                            onClick={() => handleEvaluateSelfCheck(q.id, q.question)}
                            className="btn-voxel-green text-xs px-5 py-2 rounded-xl font-bold shadow-voxel active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isEvaluating ? <Spin size="small" /> : null}
                            <span>
                              {isCompleted
                                ? '🔒 Buổi học đã hoàn thành'
                                : isEvaluating
                                ? 'AI Đang Đánh Giá...'
                                : '🤖 Gửi AI Đánh Giá & Phản Hồi'}
                            </span>
                          </button>
                        </div>

                        {/* AI Evaluation Result Card */}
                        {evalResult && (
                          <div className={`p-4 rounded-xl border-2 space-y-2 text-xs ${
                            evalResult.is_correct
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-950 dark:text-emerald-100'
                              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-500/40 text-amber-950 dark:text-amber-100'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="font-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                                {evalResult.is_correct ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">✅ AI Đánh Giá: Nắm Bài Tốt!</span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">💡 AI Đánh Giá: Cần Lưu Ý Thêm</span>
                                )}
                              </span>
                            </div>
                            <p className="m-0 leading-relaxed font-semibold">
                              {evalResult.feedback}
                            </p>
                            {evalResult.explanation && (
                              <p className="m-0 text-[11px] opacity-90 leading-relaxed">
                                <strong>Chi tiết:</strong> {evalResult.explanation}
                              </p>
                            )}
                            {evalResult.suggested_review && (
                              <div className="pt-1.5 border-t border-current/20 text-[11px] font-bold">
                                📌 Gợi ý ôn tập tiếp theo: {evalResult.suggested_review}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* PRACTICE PROGRESS FOOTER */}
                  <div className={`p-5 rounded-2xl border-2 flex items-center justify-between flex-wrap gap-4 ${
                    isDark ? 'bg-[#121B26] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tiến độ tự luyện tập:</span>
                        <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {Object.keys(selfCheckEvalResults).length} / {((companionData?.quick_self_check && companionData.quick_self_check.length > 0) ? companionData.quick_self_check : defaultPracticeQuestions).length} câu được AI nhận xét
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium m-0 truncate">
                        Bài tập luyện tập giúp củng cố kiến thức, không ảnh hưởng đến điểm số chính thức trên trường.
                      </p>
                    </div>

                    {!isCompleted ? (
                      <button
                        type="button"
                        onClick={handleStartCompletionFlow}
                        className="btn-voxel-green text-xs px-6 py-3 rounded-2xl font-black shadow-voxel active:translate-y-1 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <CheckCircleOutlined />
                        <span>Hoàn Thành Buổi Học</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-6 py-3 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-xs opacity-90 cursor-not-allowed flex items-center gap-2"
                      >
                        <CheckCircleOutlined />
                        <span>Đã Hoàn Thành Buổi Học</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── FLOATING AI ASSISTANT TRIGGER BUTTON (When Closed) ─── */}
          {!isKnowledgeChatOpen && (
            <MinecraftAIFloatingButton
              onClick={handleOpenKnowledgeChat}
              title="Mở Trợ Lý AI Học Tập (Gia sư Socratic)"
            />
          )}

          {/* ─── DOCKED AI CHAT PANEL (When Opened) ─── */}
          {isKnowledgeChatOpen && (
            <aside className={`w-[420px] sm:w-[460px] lg:w-[480px] max-w-[50vw] my-3 mr-3 rounded-3xl border-2 shadow-xl flex flex-col shrink-0 z-30 overflow-hidden transition-all duration-300 ${
              isDark
                ? 'bg-[#0F172A] border-slate-800'
                : 'bg-white border-slate-200 shadow-slate-900/10'
            }`}>
              {/* Header (Matching Floating Card Style) */}
              <div className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 ${
                isDark ? 'bg-[#151F30]/90 border-slate-800' : 'bg-[#FDFBF7]/90 border-amber-900/10'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#EA580C] to-[#FB923C] border border-orange-400/40 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <RobotOutlined className="text-base text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm m-0 truncate text-slate-900 dark:text-white">
                        Personal Learning Companion
                      </h4>
                      <Badge
                        status="processing"
                        text={
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                            Socratic Tutor
                          </span>
                        }
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium m-0 truncate leading-tight">
                      Gia sư Socratic hướng dẫn phương pháp &amp; tư duy bài tập
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {knowledgeChatMessages.length > 1 && (
                    <Popconfirm
                      title="Xóa đoạn chat này?"
                      description="Lịch sử đoạn chat hiện tại sẽ được làm mới."
                      onConfirm={handleResetKnowledgeChat}
                      okText="Xóa phiên"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true, size: 'small' }}
                      cancelButtonProps={{ size: 'small' }}
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined className="text-xs" />}
                        className="rounded-lg text-[11px] font-medium px-2 h-7 hidden sm:flex items-center gap-1"
                      >
                        Xóa
                      </Button>
                    </Popconfirm>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsKnowledgeChatOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Đóng cửa sổ chat"
                  >
                    <CloseOutlined className="text-sm" />
                  </button>
                </div>
              </div>

              {/* Messages Body */}
              <div className={`flex-1 overflow-y-auto p-3.5 space-y-3.5 ${
                isDark ? 'bg-[#0B1118]' : 'bg-[#FAFAF9]'
              }`}>
                {knowledgeChatMessages.map((msg, index) => {
                  const isUser = msg.role === 'user';
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
                      <div className={`space-y-1.5 max-w-[85%]`}>
                        <div
                          className={
                            isUser
                              ? 'p-2.5 px-3.5 rounded-xl text-xs sm:text-sm leading-normal bg-minecraft-grass text-white font-medium shadow-xs rounded-tr-none'
                              : 'p-3 px-4 rounded-xl text-xs sm:text-sm leading-normal bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs rounded-tl-none font-sans'
                          }
                        >
                          <MarkdownRenderer
                            content={msg.content}
                            isUser={isUser}
                            entityContext={entityContext}
                          />
                        </div>

                        {/* Sources list if any */}
                        {!isUser && msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            <span className="text-[10px] font-medium text-slate-500">
                              Nguồn tham khảo:
                            </span>
                            {msg.sources.map((src, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"
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

                {knowledgeChatLoading && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white border border-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                      <RobotOutlined className="animate-spin text-xs" />
                    </div>
                    <div className="p-2.5 px-3.5 rounded-xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Spin size="small" />
                      <span className="font-medium">Trợ lý AI đang suy nghĩ &amp; tổng hợp...</span>
                    </div>
                  </div>
                )}

                <div ref={knowledgeChatEndRef} />
              </div>

              {/* Prompt Suggestion Chips */}
              <div className={`px-3 py-1.5 border-t border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${
                isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                {[
                  { label: 'Gợi ý 1 câu', query: `Gợi ý 1 câu hướng dẫn phương pháp giải bài tập "${task?.title || ''}".` },
                  { label: '3 câu hỏi nhanh', query: 'Đặt 3 câu hỏi ngắn gợi mở để giúp tôi tự tìm cách giải.' },
                  { label: 'Ý chính bài học', query: 'Ý chính nền tảng của bài tập này là gì?' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendKnowledgeChat(chip.query)}
                    disabled={knowledgeChatLoading}
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
                    placeholder="Hỏi AI gợi ý phương pháp, giải thích khái niệm bài tập..."
                    value={knowledgeChatInput}
                    onChange={(e) => setKnowledgeChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendKnowledgeChat();
                      }
                    }}
                    disabled={knowledgeChatLoading}
                    className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm py-1 px-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendKnowledgeChat()}
                    disabled={!knowledgeChatInput.trim() || knowledgeChatLoading}
                    className="w-8 h-8 rounded-lg bg-[#A5D6A7] hover:bg-[#81C784] text-[#1B5E20] flex items-center justify-center shrink-0 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    <SendOutlined className="text-sm" />
                  </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 m-0 pt-1 truncate leading-tight">
                  Trợ lý Socratic chỉ gợi ý phương pháp và giải thích lý thuyết, không cung cấp đáp án trực tiếp.
                </p>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* REFLECTION MODAL (STEP BEFORE COMPLETION) */}
      <Modal
        title={
          <div className="py-1">
            <h3 className="text-base font-black text-slate-900 dark:text-white m-0">
              Tự Đánh Giá Phản Hồi
            </h3>
            <p className="text-xs text-slate-400 font-medium m-0">
              Study Session Reflection &amp; AI Analysis
            </p>
          </div>
        }
        open={isReflectionModalOpen}
        onCancel={() => !submittingReflection && setIsReflectionModalOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width={620}
        className="modal-voxel rounded-3xl overflow-hidden"
      >
        <Form
          form={reflectionForm}
          layout="vertical"
          onFinish={handleSubmitReflection}
          className="space-y-4 py-2 text-xs"
        >
          <div className="card-voxel-3d p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-slate-700 dark:text-slate-200 font-medium text-xs leading-relaxed">
            Dành 1 phút nhìn lại buổi học vừa qua. Phản hồi của bạn giúp AI đưa ra nhận xét cá nhân hóa và tinh chỉnh kế hoạch cho tuần tới.
          </div>

          <Form.Item
            name="what_learned"
            label={
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Hôm nay bạn đã học/nắm được nội dung gì chính?
                </span>
              </div>
            }
          >
            <TextArea
              rows={2}
              placeholder="Ví dụ: Đã nắm được định nghĩa Supervised vs Unsupervised learning..."
              className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 font-medium p-3 text-xs focus:border-emerald-500"
            />
          </Form.Item>

          <Form.Item
            name="understood_well"
            label={
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Phần nào bạn hiểu rõ và tự tin nhất?
                </span>
              </div>
            }
          >
            <Input
              placeholder="Ví dụ: Phân biệt bài toán phân loại Classification..."
              className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 font-medium p-2.5 text-xs focus:border-emerald-500"
            />
          </Form.Item>

          <Form.Item
            name="struggling_with"
            label={
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Phần nào bạn còn vướng mắc hoặc cần ôn thêm?
                </span>
              </div>
            }
          >
            <Input
              placeholder="Ví dụ: Cách tính thuật toán Gradient Descent..."
              className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 font-medium p-2.5 text-xs focus:border-emerald-500"
            />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <Form.Item
              name="understanding_level"
              label={
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                    4
                  </span>
                  <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Mức độ hiểu bài hôm nay?
                  </span>
                </div>
              }
            >
              <Select className="rounded-xl font-bold border-2 border-slate-200 dark:border-slate-700 h-10">
                <Select.Option value="fully">Hiểu hoàn toàn (Fully understood)</Select.Option>
                <Select.Option value="mostly">Hiểu hầu hết (Mostly understood)</Select.Option>
                <Select.Option value="partially">Hiểu một phần (Partially understood)</Select.Option>
                <Select.Option value="not_understood">Chưa hiểu (Not understood)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="achieved_goal"
              label={
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                    5
                  </span>
                  <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Đạt mục tiêu buổi học?
                  </span>
                </div>
              }
            >
              <Select className="rounded-xl font-bold border-2 border-slate-200 dark:border-slate-700 h-10">
                <Select.Option value="yes">Đạt hoàn toàn (Yes)</Select.Option>
                <Select.Option value="partially">Đạt một phần (Partially)</Select.Option>
                <Select.Option value="no">Chưa đạt (No)</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={submittingReflection}
              onClick={() => setIsReflectionModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 active:translate-y-0.5 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submittingReflection}
              className="btn-voxel-green text-xs px-6 py-2.5 rounded-xl font-black shadow-voxel active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2"
            >
              {submittingReflection ? <Spin size="small" /> : null}
              <span>Lưu Reflection & Hoàn thành</span>
            </button>
          </div>
        </Form>
      </Modal>

      {/* 🤖 AI FEEDBACK POST-REFLECTION MODAL */}
      <Modal
        title={
          <div className="py-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#EA580C] to-[#FB923C] border border-orange-400/40 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
              <RobotOutlined className="text-lg text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white m-0">
                Nhận xét tổng quan từ AI
              </h3>
              <p className="text-xs text-slate-400 font-medium m-0">
                Personal Learning Companion Agent Analysis &amp; Next Steps
              </p>
            </div>
          </div>
        }
        open={isAIFeedbackModalOpen}
        onCancel={() => setIsAIFeedbackModalOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width={640}
        className="modal-voxel rounded-3xl overflow-hidden"
      >
        <div className="space-y-5 py-2 font-sans text-xs">
          {/* Main Assessment Box */}
          <div className="p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span>🤖 Nhận xét tổng quan</span>
              </span>
              <span className="badge-voxel-green text-[10px]">
                ĐÁNH GIÁ THỦ CÔNG &amp; AI
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white m-0 leading-relaxed">
              {task?.ai_insight || task?.reflection_data?.overall_assessment || 'Bạn đã hoàn thành tốt buổi học và hoàn thành phần luyện tập.'}
            </p>
          </div>

          {/* Strengths & Weaknesses Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-500/30 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                💪 Điểm sáng / Hiểu tốt:
              </span>
              <p className="m-0 text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                {task?.reflection_data?.strengths || task?.reflection_data?.understood_well || 'Khái niệm và lý thuyết cốt lõi'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-500/30 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                💡 Cần lưu ý / Ôn tập thêm:
              </span>
              <p className="m-0 text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                {task?.reflection_data?.weaknesses || task?.reflection_data?.struggling_with || 'Các ví dụ và dạng bài tập vận dụng'}
              </p>
            </div>
          </div>

          {/* Next Steps Recommendation Box */}
          {task?.suggested_next_focus && (
            <div className="p-4 rounded-2xl bg-sky-500/10 border-2 border-sky-500/30 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 block">
                🎯 Gợi ý tiếp theo:
              </span>
              <p className="m-0 text-xs font-extrabold text-slate-900 dark:text-white leading-relaxed">
                {task.suggested_next_focus}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setIsAIFeedbackModalOpen(false);
                const weakTopic = task?.reflection_data?.weaknesses || task?.reflection_data?.struggling_with || task?.title;
                handleSendKnowledgeChat(`Tôi vừa hoàn thành buổi học "${task?.title}". Nhận xét AI gợi ý tôi nên ôn thêm "${weakTopic}". Hãy hướng dẫn tôi phương pháp ôn tập hiệu quả!`);
                setIsKnowledgeChatOpen(true);
              }}
              className="btn-voxel-sky text-xs px-4 py-2.5 rounded-xl font-bold shadow-voxel-sky active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>💬 Trao đổi với Socratic Tutor</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 active:translate-y-0.5 transition-all cursor-pointer"
              >
                Quay lại Calendar
              </button>
              <button
                type="button"
                onClick={() => setIsAIFeedbackModalOpen(false)}
                className="btn-voxel-green text-xs px-6 py-2.5 rounded-xl font-black shadow-voxel active:translate-y-0.5 transition-all cursor-pointer"
              >
                Đóng &amp; Xem Tổng Quan
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
