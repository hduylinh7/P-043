import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Tag,
  Table,
  Spin,
  Tabs,
  message,
  Avatar,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  Empty,
  Popconfirm,
  Progress,
  Checkbox,
  Tooltip,
  Radio,
  Space,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  UploadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileTextOutlined,
  FileUnknownOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  EyeOutlined,
  BookOutlined,
  EditOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  CheckSquareOutlined,
  SyncOutlined,
  UpOutlined,
  DownOutlined,
  BarChartOutlined,
  FireOutlined,
  PaperClipOutlined,
  SendOutlined,
  FolderOpenOutlined,
  QuestionCircleOutlined,
  FileExcelOutlined,
  CheckOutlined,
  FileDoneOutlined,
  SearchOutlined,
  FilterOutlined,
  SaveOutlined,
  LockOutlined,
} from '@ant-design/icons';

import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sidebar } from '../components/Sidebar';
import { courseService } from '../services/courseService';
import { materialService } from '../services/materialService';
import { assignmentService } from '../services/assignmentService';
import { CourseDetail, EnrolledStudent } from '../types/course';
import { CourseMaterial } from '../types/material';
import {
  Assignment,
  AssignmentAnalytics,
  AssignmentQuestion,
  AssignmentQuestionPayload,
  AssignmentSubmissionsOverview,
  Checklist,
  PriorityLevel,
  ProgressStatus,
  QuestionType,
  Submission,
} from '../types/assignment';


export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeMode } = useTheme();

  const isInstructor = user?.roles?.includes('instructor') || user?.roles?.includes('admin');
  const isDark = themeMode === 'dark';

  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Materials State
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  // Assignments State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);

  // Assignment Creation/Edit Attachment State
  const [assignmentAttachmentList, setAssignmentAttachmentList] = useState<any[]>([]);

  // Assignment Modals
  const [isCreateAssignmentModalOpen, setIsCreateAssignmentModalOpen] = useState<boolean>(false);
  const [isEditAssignmentModalOpen, setIsEditAssignmentModalOpen] = useState<boolean>(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isDetailAssignmentModalOpen, setIsDetailAssignmentModalOpen] = useState<boolean>(false);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [submittingAssignment, setSubmittingAssignment] = useState<boolean>(false);

  // Checklist & Analytics State
  const [newChecklistTitle, setNewChecklistTitle] = useState<string>('');
  const [newChecklistDesc, setNewChecklistDesc] = useState<string>('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editChecklistTitle, setEditChecklistTitle] = useState<string>('');
  const [editChecklistDesc, setEditChecklistDesc] = useState<string>('');
  const [submittingChecklist, setSubmittingChecklist] = useState<boolean>(false);
  const [togglingChecklistId, setTogglingChecklistId] = useState<string | null>(null);

  // Analytics Modal State
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<AssignmentAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);

  // Student Submission State
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [loadingMySubmission, setLoadingMySubmission] = useState<boolean>(false);
  const [submissionFileList, setSubmissionFileList] = useState<any[]>([]);
  const [submissionNotes, setSubmissionNotes] = useState<string>('');
  const [submittingSolution, setSubmittingSolution] = useState<boolean>(false);
  const [undoingTurnIn, setUndoingTurnIn] = useState<boolean>(false);

  // Download Loading States
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [downloadingSubmissionId, setDownloadingSubmissionId] = useState<string | null>(null);

  // Instructor Submissions Roster & Overview State
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState<boolean>(false);
  const [submissionsOverview, setSubmissionsOverview] = useState<AssignmentSubmissionsOverview | null>(null);
  const [loadingSubmissionsRoster, setLoadingSubmissionsRoster] = useState<boolean>(false);
  const [selectedAssignmentForSubmissions, setSelectedAssignmentForSubmissions] = useState<Assignment | null>(null);

  // Search & Filter State
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState<string>('');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<string>('ALL');
  const [gradingStatusFilter, setGradingStatusFilter] = useState<string>('ALL');

  // Student Grading Drawer/Modal State
  const [isGradingDrawerOpen, setIsGradingDrawerOpen] = useState<boolean>(false);
  const [selectedSubmissionForGrading, setSelectedSubmissionForGrading] = useState<Submission | null>(null);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [questionFeedbacks, setQuestionFeedbacks] = useState<Record<string, string>>({});
  const [generalFeedback, setGeneralFeedback] = useState<string>('');
  const [submittingGrade, setSubmittingGrade] = useState<boolean>(false);

  const [createAssignmentForm] = Form.useForm();
  const [editAssignmentForm] = Form.useForm();

  // Question Management State (Instructor Create/Edit)
  const [questions, setQuestions] = useState<AssignmentQuestionPayload[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [questionSearchQuery, setQuestionSearchQuery] = useState<string>('');
  const [assignmentModalTab, setAssignmentModalTab] = useState<string>('details');

  // CSV Question Import Modal State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [csvFileList, setCsvFileList] = useState<any[]>([]);
  const [importingCsv, setImportingCsv] = useState<boolean>(false);

  // Student Question Answers State
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [viewingAssignmentTab, setViewingAssignmentTab] = useState<string>('overview');

  // Question Management Handlers
  const handleAddQuestion = () => {
    const newQ: AssignmentQuestionPayload = {
      question_type: 'MULTIPLE_CHOICE',
      question_text: `Câu hỏi ${questions.length + 1}`,
      points: 1.0,
      display_order: questions.length,
      options: [
        { option_text: 'Lựa chọn A', is_correct: true, display_order: 0 },
        { option_text: 'Lựa chọn B', is_correct: false, display_order: 1 },
      ],
    };
    const updated = [...questions, newQ];
    setQuestions(updated);
    setActiveQuestionIdx(updated.length - 1);
  };

  const handleUpdateActiveQuestion = (field: string, val: any) => {
    if (questions.length === 0 || activeQuestionIdx >= questions.length) return;
    const updated = [...questions];
    updated[activeQuestionIdx] = {
      ...updated[activeQuestionIdx],
      [field]: val,
    };
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    if (activeQuestionIdx >= updated.length) {
      setActiveQuestionIdx(Math.max(0, updated.length - 1));
    }
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setQuestions(updated);
    setActiveQuestionIdx(targetIdx);
  };

  const handleAddOptionToActiveQuestion = () => {
    if (questions.length === 0 || activeQuestionIdx >= questions.length) return;
    const currentQ = questions[activeQuestionIdx];
    const currentOpts = currentQ.options || [];
    const newOpt = {
      option_text: `Lựa chọn ${String.fromCharCode(65 + currentOpts.length)}`,
      is_correct: false,
      display_order: currentOpts.length,
    };
    handleUpdateActiveQuestion('options', [...currentOpts, newOpt]);
  };

  const handleUpdateOption = (optIdx: number, field: string, val: any) => {
    if (questions.length === 0 || activeQuestionIdx >= questions.length) return;
    const currentQ = questions[activeQuestionIdx];
    const currentOpts = [...(currentQ.options || [])];
    if (field === 'is_correct' && val === true) {
      currentOpts.forEach((o, i) => {
        o.is_correct = i === optIdx;
      });
    } else {
      currentOpts[optIdx] = { ...currentOpts[optIdx], [field]: val };
    }
    handleUpdateActiveQuestion('options', currentOpts);
  };

  const handleDeleteOption = (optIdx: number) => {
    if (questions.length === 0 || activeQuestionIdx >= questions.length) return;
    const currentQ = questions[activeQuestionIdx];
    const currentOpts = (currentQ.options || []).filter((_, i) => i !== optIdx);
    handleUpdateActiveQuestion('options', currentOpts);
  };

  const handleParseCsvFile = async (file: File) => {
    setImportingCsv(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        message.warning('Tập tin CSV không chứa dữ liệu câu hỏi.');
        return;
      }

      // Robust CSV line parser handling quotes
      const parseCsvLine = (lineStr: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < lineStr.length; i++) {
          const char = lineStr[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim().replace(/^"|"$/g, ''));
        return result;
      };

      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
      const parsedQuestions: AssignmentQuestionPayload[] = [];

      const getOptVal = (r: Record<string, string>, idx: number) => {
        const char = String.fromCharCode(97 + idx); // 'a', 'b', 'c', 'd'
        const num = idx + 1; // 1, 2, 3, 4
        return (
          r[`option_${num}`] || r[`option${num}`] || r[`opt_${num}`] || r[`opt${num}`] ||
          r[`option_${char}`] || r[`option${char}`] || r[`opt_${char}`] || r[`opt${char}`] ||
          r[char] || r[`${num}`] || ''
        );
      };

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length === 0 || !cols.some((c) => c && c.trim().length > 0)) continue;

        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = cols[idx] || '';
        });

        let qTypeRaw = (row['question_type'] || row['type'] || '').toUpperCase().replace(/[\s-]/g, '_');
        let qType: QuestionType = 'SHORT_ANSWER';
        if (['MULTIPLE_CHOICE', 'ESSAY', 'SHORT_ANSWER'].includes(qTypeRaw)) {
          qType = qTypeRaw as QuestionType;
        } else if (qTypeRaw.includes('TRAC_NGHIEM') || qTypeRaw.includes('MCQ') || getOptVal(row, 0)) {
          qType = 'MULTIPLE_CHOICE';
        } else if (qTypeRaw.includes('TU_LUAN')) {
          qType = 'ESSAY';
        }

        const qText = (row['question_text'] || row['question'] || row['text'] || cols[0] || '').trim();
        if (!qText) continue;

        const pts = parseFloat(row['points'] || '1.0') || 1.0;
        const expAns = (row['expected_answer'] || row['answer'] || row['rubric'] || '').trim();

        const opts: any[] = [];
        if (qType === 'MULTIPLE_CHOICE') {
          const rawCorrect = (row['correct_option'] || row['correct'] || row['dap_an'] || '').toString().trim();
          let correctIdx = -1;

          if (/^\d+$/.test(rawCorrect)) {
            correctIdx = parseInt(rawCorrect, 10) - 1;
          } else if (/^option[_\-\s]?(\d+)$/i.test(rawCorrect)) {
            const match = rawCorrect.match(/^option[_\-\s]?(\d+)$/i);
            if (match) correctIdx = parseInt(match[1], 10) - 1;
          } else if (/^[a-f]$/i.test(rawCorrect)) {
            correctIdx = rawCorrect.toUpperCase().charCodeAt(0) - 65;
          }

          for (let o = 0; o < 6; o++) {
            const optVal = getOptVal(row, o);
            if (optVal && optVal.trim()) {
              const trimmedOpt = optVal.trim();
              const isCorr = (correctIdx >= 0 && o === correctIdx) ||
                             (rawCorrect.length > 0 && rawCorrect.toLowerCase() === trimmedOpt.toLowerCase());
              opts.push({
                option_text: trimmedOpt,
                is_correct: isCorr,
                display_order: o,
              });
            }
          }
        }

        parsedQuestions.push({
          question_type: qType,
          question_text: qText,
          points: pts,
          display_order: questions.length + parsedQuestions.length,
          expected_answer: expAns || null,
          options: opts.length > 0 ? opts : undefined,
        });
      }

      if (parsedQuestions.length > 0) {
        setQuestions((prev) => [...prev, ...parsedQuestions]);
        message.success(`Nhập thành công ${parsedQuestions.length} câu hỏi từ tệp CSV!`);
        setIsCsvModalOpen(false);
        setCsvFileList([]);
      } else {
        message.warning('Không đọc được câu hỏi nào từ tệp CSV.');
      }
    } catch (err) {
      console.error('CSV Parse Error:', err);
      message.error('Không thể đọc tệp CSV. Vui lòng kiểm tra định dạng.');
    } finally {
      setImportingCsv(false);
    }
  };


  const fetchDetail = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await courseService.getCourseDetail(courseId);
      setDetail(data);
    } catch (err: any) {
      console.error('Failed to fetch course detail:', err);
      message.error(err.response?.data?.detail || 'Không thể tải chi tiết khóa học.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    if (!courseId) return;
    setLoadingMaterials(true);
    try {
      const data = await materialService.getCourseMaterials(courseId);
      setMaterials(data);
    } catch (err: any) {
      console.error('Failed to fetch materials:', err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const fetchAssignments = async () => {
    if (!courseId) return;
    setLoadingAssignments(true);
    try {
      const data = await assignmentService.getCourseAssignments(courseId);
      setAssignments(data);
    } catch (err: any) {
      console.error('Failed to fetch assignments:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const [searchParams] = useSearchParams();
  const targetAssignmentId = searchParams.get('assignment') || searchParams.get('assignmentId');

  useEffect(() => {
    fetchDetail();
    fetchMaterials();
    fetchAssignments();
  }, [courseId]);

  useEffect(() => {
    if (targetAssignmentId && assignments.length > 0) {
      const found = assignments.find((a) => a.id === targetAssignmentId);
      if (found) {
        setViewingAssignment(found);
        setIsDetailAssignmentModalOpen(true);
      }
    }
  }, [targetAssignmentId, assignments]);

  const handleUploadMaterial = async (values: any) => {
    if (!courseId || fileList.length === 0) {
      message.error('Vui lòng chọn tập tin để tải lên.');
      return;
    }

    const fileToUpload = fileList[0].originFileObj || fileList[0];
    setUploading(true);

    try {
      await materialService.uploadMaterial(
        courseId,
        fileToUpload,
        values.title || fileToUpload.name,
        values.type || 'document'
      );
      message.success('Tải lên tài liệu thành công!');
      setIsUploadModalOpen(false);
      form.resetFields();
      setFileList([]);
      fetchMaterials();
    } catch (err: any) {
      console.error('Upload material error:', err);
      message.error(err.response?.data?.detail || 'Không thể tải lên tài liệu.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (material: CourseMaterial) => {
    if (!courseId) return;
    setDownloadingId(material.id);
    message.loading({ content: `Đang tải xuống bài giảng ${material.file_name}...`, key: 'dl_mat' });
    try {
      await materialService.downloadMaterial(courseId, material.id, material.file_name);
      message.success({ content: 'Tải xuống tập tin thành công!', key: 'dl_mat' });
    } catch (err: any) {
      console.error('Download material error:', err);
      message.error({ content: err.response?.data?.detail || 'Không thể tải xuống tập tin.', key: 'dl_mat' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAssignmentAttachment = async (assignmentId: string, fileName: string) => {
    setDownloadingAttachmentId(assignmentId);
    message.loading({ content: `Đang tải xuống đề bài ${fileName}...`, key: 'dl_attach' });
    try {
      await assignmentService.downloadAttachment(assignmentId, fileName);
      message.success({ content: `Tải xuống ${fileName} thành công!`, key: 'dl_attach' });
    } catch (err: any) {
      console.error('Download attachment error:', err);
      message.error({ content: err.response?.data?.detail || 'Không thể tải xuống tài liệu đề bài.', key: 'dl_attach' });
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const handleDownloadSubmissionFile = async (submissionId: string, fileName: string) => {
    setDownloadingSubmissionId(submissionId);
    message.loading({ content: `Đang tải xuống bài nộp ${fileName}...`, key: 'dl_sub' });
    try {
      await assignmentService.downloadSubmissionFile(submissionId, fileName);
      message.success({ content: `Tải xuống bài nộp ${fileName} thành công!`, key: 'dl_sub' });
    } catch (err: any) {
      console.error('Download submission file error:', err);
      message.error({ content: err.response?.data?.detail || 'Không thể tải xuống bài nộp.', key: 'dl_sub' });
    } finally {
      setDownloadingSubmissionId(null);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!courseId) return;
    try {
      await materialService.deleteMaterial(courseId, materialId);
      message.success('Xóa tài liệu thành công!');
      fetchMaterials();
    } catch (err: any) {
      console.error('Delete material error:', err);
      message.error(err.response?.data?.detail || 'Không thể xóa tài liệu.');
    }
  };

  // Helper to clean questions payload and prevent Pydantic 422 validation errors
  const sanitizeQuestionsForPayload = (rawQuestions: AssignmentQuestionPayload[]): AssignmentQuestionPayload[] => {
    return (rawQuestions || [])
      .filter((q) => q && q.question_text && q.question_text.trim().length > 0)
      .map((q, idx) => {
        let validQType: QuestionType = 'SHORT_ANSWER';
        const rawType = (q.question_type || '').toUpperCase();
        if (rawType === 'MULTIPLE_CHOICE' || rawType === 'ESSAY' || rawType === 'SHORT_ANSWER') {
          validQType = rawType as QuestionType;
        } else if (rawType.includes('TRAC_NGHIEM') || rawType.includes('MCQ') || (q.options && q.options.length > 0)) {
          validQType = 'MULTIPLE_CHOICE';
        }

        const rawOpts = q.options || [];
        const cleanOpts = rawOpts
          .filter((opt) => opt && opt.option_text && opt.option_text.trim().length > 0)
          .map((opt, optIdx) => ({
            option_text: opt.option_text.trim(),
            is_correct: Boolean(opt.is_correct),
            display_order: opt.display_order ?? optIdx,
          }));

        return {
          question_type: validQType,
          question_text: q.question_text.trim(),
          points: Math.max(0, Number(q.points) || 1.0),
          display_order: q.display_order ?? idx,
          expected_answer: q.expected_answer?.trim() || null,
          options: validQType === 'MULTIPLE_CHOICE' ? cleanOpts : [],
        };
      });
  };

  // Assignment Actions
  const handleCreateAssignment = async (values: any, statusOverride?: string) => {
    if (!courseId) return;
    setSubmittingAssignment(true);
    try {
      const finalStatus = statusOverride || values.status || 'ACTIVE';
      const cleanQuestions = sanitizeQuestionsForPayload(questions);

      const newAssignment = await assignmentService.createAssignment(courseId, {
        title: values.title?.trim() || 'Bài tập trắc nghiệm',
        description: values.description?.trim() || undefined,
        available_from: values.available_from ? new Date(values.available_from).toISOString() : undefined,
        due_date: values.due_date ? new Date(values.due_date).toISOString() : undefined,
        estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : undefined,
        status: finalStatus,
        priority: values.priority || 'MEDIUM',
        questions: cleanQuestions,
      });

      // Upload reference file if attached
      if (assignmentAttachmentList.length > 0) {
        const attachFile = assignmentAttachmentList[0].originFileObj || assignmentAttachmentList[0];
        await assignmentService.uploadAttachment(newAssignment.id, attachFile);
      }

      message.success(finalStatus === 'DRAFT' ? 'Lưu bản nháp bài tập thành công!' : 'Tạo bài tập thành công!');
      setIsCreateAssignmentModalOpen(false);
      createAssignmentForm.resetFields();
      setAssignmentAttachmentList([]);
      setQuestions([]);
      setActiveQuestionIdx(0);
      fetchAssignments();
    } catch (err: any) {
      console.error('Create assignment error:', err);
      message.error(err.response?.data?.detail || 'Không thể tạo bài tập.');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const handleOpenEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignmentAttachmentList([]);
    setQuestions(
      (assignment.questions || []).map((q) => ({
        question_type: q.question_type,
        question_text: q.question_text,
        points: q.points,
        display_order: q.display_order,
        expected_answer: q.expected_answer,
        options: (q.options || []).map((o) => ({
          option_text: o.option_text,
          is_correct: o.is_correct,
          display_order: o.display_order,
        })),
      }))
    );
    setActiveQuestionIdx(0);
    editAssignmentForm.setFieldsValue({
      title: assignment.title,
      description: assignment.description,
      available_from: assignment.available_from ? assignment.available_from.slice(0, 16) : '',
      due_date: assignment.due_date ? assignment.due_date.slice(0, 16) : '',
      estimated_hours: assignment.estimated_hours,
      status: assignment.status || 'ACTIVE',
      priority: assignment.priority || 'MEDIUM',
    });
    setIsEditAssignmentModalOpen(true);
  };

  const handleEditAssignment = async (values: any, statusOverride?: string) => {
    if (!editingAssignment) return;
    setSubmittingAssignment(true);
    try {
      const finalStatus = statusOverride || values.status || editingAssignment.status || 'ACTIVE';
      const cleanQuestions = sanitizeQuestionsForPayload(questions);

      await assignmentService.updateAssignment(editingAssignment.id, {
        title: values.title?.trim(),
        description: values.description?.trim(),
        available_from: values.available_from ? new Date(values.available_from).toISOString() : undefined,
        due_date: values.due_date ? new Date(values.due_date).toISOString() : undefined,
        estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : undefined,
        status: finalStatus,
        priority: values.priority,
        questions: cleanQuestions,
      });

      // Upload reference file if attached
      if (assignmentAttachmentList.length > 0) {
        const attachFile = assignmentAttachmentList[0].originFileObj || assignmentAttachmentList[0];
        await assignmentService.uploadAttachment(editingAssignment.id, attachFile);
      }

      message.success('Cập nhật bài tập thành công!');
      setIsEditAssignmentModalOpen(false);
      setEditingAssignment(null);
      setAssignmentAttachmentList([]);
      setQuestions([]);
      setActiveQuestionIdx(0);
      editAssignmentForm.resetFields();
      fetchAssignments();
    } catch (err: any) {
      console.error('Edit assignment error:', err);
      message.error(err.response?.data?.detail || 'Không thể cập nhật bài tập.');
    } finally {
      setSubmittingAssignment(false);
    }
  };


  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await assignmentService.deleteAssignment(assignmentId);
      message.success('Xóa bài tập thành công!');
      fetchAssignments();
    } catch (err: any) {
      console.error('Delete assignment error:', err);
      message.error(err.response?.data?.detail || 'Không thể xóa bài tập.');
    }
  };

  const handlePublishAssignmentDirectly = async (assignment: Assignment) => {
    try {
      await assignmentService.updateAssignment(assignment.id, {
        status: 'ACTIVE',
      });
      message.success(`Đã phát hành bài tập "${assignment.title}" thành công! Sinh viên giờ đây có thể làm bài.`);
      fetchAssignments();
    } catch (err: any) {
      console.error('Publish assignment error:', err);
      message.error(err.response?.data?.detail || 'Không thể phát hành bài tập.');
    }
  };

  // Phase 2: Checklist & Submissions Operations
  const refreshViewingAssignment = async (assignmentId: string) => {
    try {
      const updatedAssignment = await assignmentService.getAssignmentDetail(assignmentId);
      setViewingAssignment(updatedAssignment);
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? updatedAssignment : a))
      );

      // Fetch student's submission if not instructor
      if (!isInstructor) {
        setLoadingMySubmission(true);
        try {
          const sub = await assignmentService.getMySubmission(assignmentId);
          setMySubmission(sub);
          if (sub?.submission_text) {
            setSubmissionNotes(sub.submission_text);
          }
        } catch (subErr) {
          console.error('Failed to fetch my submission:', subErr);
        } finally {
          setLoadingMySubmission(false);
        }
      }
    } catch (err) {
      console.error('Failed to refresh viewing assignment:', err);
    }
  };

  const handleStudentSubmitAssignment = async () => {
    if (!viewingAssignment) return;

    // Format student answers from Tab 2
    let formattedAnswersText = '';
    if (viewingAssignment.questions && viewingAssignment.questions.length > 0) {
      const answerLines: string[] = [];
      viewingAssignment.questions.forEach((q, idx) => {
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
      if (answerLines.length > 0) {
        formattedAnswersText = `[Bài làm trắc nghiệm & tự luận]:\n` + answerLines.join('\n');
      }
    }

    const hasFile = submissionFileList.length > 0;
    const hasNotes = submissionNotes.trim().length > 0;
    const hasAnswers = formattedAnswersText.length > 0;

    if (!hasFile && !hasNotes && !hasAnswers) {
      message.error('Vui lòng trả lời câu hỏi trắc nghiệm/tự luận, chọn tập tin nộp bài hoặc nhập ghi chú trước khi bấm Nộp Bài.');
      return;
    }

    const finalNotes = submissionNotes.trim()
      ? (formattedAnswersText ? `${submissionNotes.trim()}\n\n${formattedAnswersText}` : submissionNotes.trim())
      : formattedAnswersText;

    setSubmittingSolution(true);
    try {
      const submitFile = hasFile ? (submissionFileList[0].originFileObj || submissionFileList[0]) : null;
      const result = await assignmentService.submitAssignment(
        viewingAssignment.id,
        submitFile,
        finalNotes || undefined
      );
      message.success('Nộp bài tập thành công!');
      setMySubmission(result);
      setSubmissionFileList([]);
      await refreshViewingAssignment(viewingAssignment.id);
    } catch (err: any) {
      console.error('Submit assignment error:', err);
      message.error(err.response?.data?.detail || 'Không thể nộp bài tập.');
    } finally {
      setSubmittingSolution(false);
    }
  };

  const handleUndoTurnIn = async () => {
    if (!viewingAssignment) return;
    if (viewingAssignment.questions && viewingAssignment.questions.length > 0) {
      message.warning('Bài tập trắc nghiệm / có bộ câu hỏi chỉ được phép nộp 1 lần và không thể hủy nộp bài để bảo mật đề thi.');
      return;
    }
    setUndoingTurnIn(true);
    try {
      const result = await assignmentService.undoTurnIn(viewingAssignment.id);
      message.success('Đã hủy nộp bài thành công! Bạn có thể chỉnh sửa lại các câu trả lời.');
      setMySubmission(result);
      await refreshViewingAssignment(viewingAssignment.id);
    } catch (err: any) {
      console.error('Undo turn in error:', err);
      message.error(err.response?.data?.detail || 'Không thể hủy nộp bài.');
    } finally {
      setUndoingTurnIn(false);
    }
  };

  const parseStudentAnswersFromSubmissionText = (text: string, questionsList: AssignmentQuestion[]) => {
    const result: Record<string, string> = {};
    if (!text || !questionsList || questionsList.length === 0) return result;

    const lines = text.split('\n');
    questionsList.forEach((q, idx) => {
      const prefix = `Câu ${idx + 1}:`;
      for (const line of lines) {
        if (line.trim().startsWith(prefix)) {
          const ans = line.trim().substring(prefix.length).trim();
          result[q.id] = ans;
          break;
        }
      }
    });

    // Fallback: If no question prefix "Câu X:" was matched, but submission text is present
    if (Object.keys(result).length === 0 && text.trim()) {
      let cleanText = text.trim();
      if (cleanText.includes('[Bài làm trắc nghiệm & tự luận]:')) {
        cleanText = cleanText.split('[Bài làm trắc nghiệm & tự luận]:')[1].trim();
      }
      if (questionsList.length > 0 && cleanText) {
        result[questionsList[0].id] = cleanText;
      }
    }

    return result;
  };

  const handleOpenInstructorSubmissionsRoster = async (assignment: Assignment) => {
    setSelectedAssignmentForSubmissions(assignment);
    setSubmissionsModalOpen(true);
    setLoadingSubmissionsRoster(true);
    setSubmissionSearchQuery('');
    setSubmissionStatusFilter('ALL');
    setGradingStatusFilter('ALL');
    try {
      const overview = await assignmentService.getAssignmentSubmissions(assignment.id);
      setSubmissionsOverview(overview);
    } catch (err: any) {
      console.error('Get submissions roster error:', err);
      message.error(err.response?.data?.detail || 'Không thể tải danh sách bài nộp.');
    } finally {
      setLoadingSubmissionsRoster(false);
    }
  };

  const handleOpenGradingModal = (submission: Submission) => {
    setSelectedSubmissionForGrading(submission);

    let savedScores: Record<string, number> = {};
    let savedFeedbacks: Record<string, string> = {};
    let savedGeneralFeedback = '';

    if (submission.feedback) {
      try {
        const parsed = JSON.parse(submission.feedback);
        if (parsed.questionScores) savedScores = parsed.questionScores;
        if (parsed.questionFeedbacks) savedFeedbacks = parsed.questionFeedbacks;
        if (parsed.generalFeedback) savedGeneralFeedback = parsed.generalFeedback;
      } catch (e) {
        savedGeneralFeedback = submission.feedback;
      }
    }

    const questionsList = selectedAssignmentForSubmissions?.questions || [];
    const parsedAnswers = parseStudentAnswersFromSubmissionText(submission.submission_text || '', questionsList);

    questionsList.forEach((q) => {
      if (savedScores[q.id] === undefined) {
        if (q.question_type === 'MULTIPLE_CHOICE' && q.options) {
          const studentAnsText = parsedAnswers[q.id];
          const correctOption = q.options.find((opt) => opt.is_correct);
          if (correctOption && studentAnsText) {
            if (
              studentAnsText.toLowerCase().trim() === correctOption.option_text.toLowerCase().trim() ||
              studentAnsText === correctOption.id
            ) {
              savedScores[q.id] = q.points;
            } else {
              savedScores[q.id] = 0;
            }
          } else {
            savedScores[q.id] = 0;
          }
        } else {
          savedScores[q.id] = 0;
        }
      }
    });

    setQuestionScores(savedScores);
    setQuestionFeedbacks(savedFeedbacks);
    setGeneralFeedback(savedGeneralFeedback);
    setIsGradingDrawerOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmissionForGrading || !selectedAssignmentForSubmissions) return;

    const questionsList = selectedAssignmentForSubmissions.questions || [];
    let calculatedTotalScore = 0;
    questionsList.forEach((q) => {
      calculatedTotalScore += questionScores[q.id] || 0;
    });

    const feedbackPayload = JSON.stringify({
      questionScores,
      questionFeedbacks,
      generalFeedback,
    });

    setSubmittingGrade(true);
    try {
      await assignmentService.gradeSubmission(selectedSubmissionForGrading.id, {
        score: calculatedTotalScore,
        grade: 'GRADED',
        feedback: feedbackPayload,
      });

      message.success('Lưu điểm và nhận xét thành công!');
      setIsGradingDrawerOpen(false);

      // Refresh overview
      const updatedOverview = await assignmentService.getAssignmentSubmissions(selectedAssignmentForSubmissions.id);
      setSubmissionsOverview(updatedOverview);
    } catch (err: any) {
      console.error('Grade submission error:', err);
      message.error(err.response?.data?.detail || 'Không thể lưu điểm bài nộp.');
    } finally {
      setSubmittingGrade(false);
    }
  };

  const handleAddChecklist = async () => {
    if (!viewingAssignment || !newChecklistTitle.trim()) return;
    setSubmittingChecklist(true);
    try {
      await assignmentService.createChecklist(viewingAssignment.id, {
        title: newChecklistTitle.trim(),
        description: newChecklistDesc.trim() || undefined,
        display_order: (viewingAssignment.checklists?.length || 0) + 1,
      });
      message.success('Thêm mục checklist thành công!');
      setNewChecklistTitle('');
      setNewChecklistDesc('');
      await refreshViewingAssignment(viewingAssignment.id);
    } catch (err: any) {
      console.error('Add checklist error:', err);
      message.error(err.response?.data?.detail || 'Không thể thêm mục checklist.');
    } finally {
      setSubmittingChecklist(false);
    }
  };

  const handleUpdateChecklist = async (checklistId: string) => {
    if (!viewingAssignment || !editChecklistTitle.trim()) return;
    setSubmittingChecklist(true);
    try {
      await assignmentService.updateChecklist(checklistId, {
        title: editChecklistTitle.trim(),
        description: editChecklistDesc.trim() || undefined,
      });
      message.success('Cập nhật mục checklist thành công!');
      setEditingChecklistId(null);
      await refreshViewingAssignment(viewingAssignment.id);
    } catch (err: any) {
      console.error('Update checklist error:', err);
      message.error(err.response?.data?.detail || 'Không thể cập nhật checklist.');
    } finally {
      setSubmittingChecklist(false);
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!viewingAssignment) return;
    try {
      await assignmentService.deleteChecklist(checklistId);
      message.success('Xóa mục checklist thành công!');
      await refreshViewingAssignment(viewingAssignment.id);
    } catch (err: any) {
      console.error('Delete checklist error:', err);
      message.error(err.response?.data?.detail || 'Không thể xóa checklist.');
    }
  };

  const handleReorderChecklist = async (checklistId: string, direction: 'up' | 'down') => {
    if (!viewingAssignment || !viewingAssignment.checklists) return;
    const list = [...viewingAssignment.checklists];
    const index = list.findIndex((c) => c.id === checklistId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === list.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const items = list.map((item, idx) => ({ id: item.id, display_order: idx + 1 }));
    try {
      await assignmentService.reorderChecklists(items);
      await refreshViewingAssignment(viewingAssignment.id);
    } catch (err: any) {
      console.error('Reorder error:', err);
      message.error('Không thể sắp xếp lại checklist.');
    }
  };

  const handleToggleChecklistComplete = async (checklist: Checklist, completed: boolean) => {
    if (!viewingAssignment) return;
    setTogglingChecklistId(checklist.id);
    try {
      if (completed) {
        await assignmentService.completeChecklist(checklist.id);
      } else {
        await assignmentService.uncompleteChecklist(checklist.id);
      }
      await refreshViewingAssignment(viewingAssignment.id);
    } catch (err: any) {
      console.error('Toggle checklist error:', err);
      message.error(err.response?.data?.detail || 'Không thể cập nhật trạng thái checklist.');
    } finally {
      setTogglingChecklistId(null);
    }
  };

  const handleOpenAnalytics = async (assignmentId: string) => {
    setAnalyticsModalOpen(true);
    setLoadingAnalytics(true);
    try {
      const data = await assignmentService.getAssignmentAnalytics(assignmentId);
      setAnalyticsData(data);
    } catch (err: any) {
      console.error('Get analytics error:', err);
      message.error(err.response?.data?.detail || 'Không thể tải thống kê bài tập.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const getPriorityBadge = (priority?: PriorityLevel) => {
    switch (priority) {
      case 'CRITICAL':
        return (
          <Tag color="red" icon={<FireOutlined />} className="rounded-full px-2.5 py-0.5 text-xs font-bold border-0">
            CRITICAL
          </Tag>
        );
      case 'HIGH':
        return (
          <Tag color="orange" className="rounded-full px-2.5 py-0.5 text-xs font-bold border-0">
            HIGH
          </Tag>
        );
      case 'LOW':
        return (
          <Tag color="blue" className="rounded-full px-2.5 py-0.5 text-xs font-semibold border-0">
            LOW
          </Tag>
        );
      case 'MEDIUM':
      default:
        return (
          <Tag color="cyan" className="rounded-full px-2.5 py-0.5 text-xs font-semibold border-0">
            MEDIUM
          </Tag>
        );
    }
  };

  const getFileIcon = (fileName: string, type?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined className="text-red-500 text-xl" />;
    if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined className="text-blue-500 text-xl" />;
    if (['txt', 'md'].includes(ext || '')) return <FileTextOutlined className="text-emerald-500 text-xl" />;
    return <FileUnknownOutlined className="text-blue-500 text-xl" />;
  };

  const getProgressBadge = (status?: ProgressStatus | null, dueDate?: string | null) => {
    if (status === 'COMPLETED') {
      return (
        <Tag color="success" icon={<CheckCircleOutlined />} className="rounded-full px-3 py-0.5 text-xs border-0 font-extrabold shadow-sm bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          ✓ ĐÃ LÀM XONG
        </Tag>
      );
    }

    if (dueDate && new Date(dueDate).getTime() < Date.now()) {
      return (
        <Tag color="error" icon={<ClockCircleOutlined />} className="rounded-full px-3 py-0.5 text-xs border-0 font-extrabold shadow-sm bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse">
          ⚠️ QUÁ THỜI HẠN
        </Tag>
      );
    }

    if (status === 'IN_PROGRESS') {
      return (
        <Tag color="warning" icon={<SyncOutlined spin />} className="rounded-full px-3 py-0.5 text-xs border-0 font-extrabold shadow-sm bg-blue-500/15 text-blue-600 dark:text-blue-400">
          ⚡ ĐANG THỰC HIỆN
        </Tag>
      );
    }

    return (
      <Tag color="default" className="rounded-full px-3 py-0.5 text-xs border-0 font-extrabold shadow-sm bg-amber-500/15 text-amber-600 dark:text-amber-400">
        ⏳ CHƯA LÀM
      </Tag>
    );
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

  if (!detail) {
    return (
      <div className={`flex h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-slate-400">Không tìm thấy khóa học.</p>
          <Button onClick={() => navigate('/courses')} icon={<ArrowLeftOutlined />}>
            Quay lại danh sách khóa học
          </Button>
        </div>
      </div>
    );
  }

  const { course, students } = detail;
  const isCourseOwner = isInstructor && (course.instructor_id === user?.id || user?.roles?.includes('admin'));

  const studentColumns = [
    {
      title: 'Sinh Viên',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text: string, record: EnrolledStudent) => (
        <div className="flex items-center gap-3">
          <Avatar className="bg-indigo-600 text-white font-bold shrink-0">
            {text.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div className="font-semibold text-sm">{text}</div>
            <div className="text-xs text-slate-400">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Ngày Ghi Danh',
      dataIndex: 'joined_at',
      key: 'joined_at',
      render: (val: string) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(val).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color="success" icon={<CheckCircleOutlined />} className="rounded-full px-3 py-0.5 text-xs border-0">
          {status.toUpperCase()}
        </Tag>
      ),
    },
  ];

  const renderQuestionManagerUI = () => {
    const totalPts = questions.reduce((acc, q) => acc + (q.points || 0), 0);
    const activeQ = questions[activeQuestionIdx];

    const filteredQs = questions.filter(
      (q, idx) =>
        `Câu ${idx + 1}`.toLowerCase().includes(questionSearchQuery.toLowerCase()) ||
        q.question_text.toLowerCase().includes(questionSearchQuery.toLowerCase())
    );

    return (
      <div className="space-y-4 pt-2">
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 flex-wrap">
            <Tag color="indigo" className="font-bold text-xs px-3 py-1 rounded-xl border-0">
              Tổng số: {questions.length} câu hỏi
            </Tag>
            <Tag color="gold" className="font-bold text-xs px-3 py-1 rounded-xl border-0">
              Tổng điểm: {totalPts} điểm
            </Tag>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="default"
              icon={<FileExcelOutlined className="text-emerald-600" />}
              onClick={() => setIsCsvModalOpen(true)}
              className="rounded-xl text-xs font-semibold"
            >
              Nhập CSV câu hỏi
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddQuestion}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
            >
              Thêm Câu Hỏi
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <Empty
            description={
              <span className="text-xs text-slate-400">
                Chưa có câu hỏi nào. Bấm <strong>&quot;Thêm Câu Hỏi&quot;</strong> hoặc <strong>&quot;Nhập CSV câu hỏi&quot;</strong> để tạo.
              </span>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[400px]">
            {/* Left Question Selector (Sidebar for 50+ questions) */}
            <div className="lg:col-span-4 rounded-2xl border p-3 space-y-3 bg-white dark:bg-slate-950 flex flex-col max-h-[460px]">
              <Input
                placeholder="Tìm câu hỏi..."
                value={questionSearchQuery}
                onChange={(e) => setQuestionSearchQuery(e.target.value)}
                allowClear
                size="small"
                className="rounded-lg"
              />

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {questions.map((q, idx) => {
                  const isSelected = idx === activeQuestionIdx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                        }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-extrabold text-xs text-indigo-600 dark:text-indigo-400">
                            #{idx + 1}
                          </span>
                          <Tag
                            color={
                              q.question_type === 'MULTIPLE_CHOICE'
                                ? 'blue'
                                : q.question_type === 'ESSAY'
                                  ? 'purple'
                                  : 'orange'
                            }
                            className="rounded-full text-[10px] font-semibold px-2 py-0 border-0"
                          >
                            {q.question_type === 'MULTIPLE_CHOICE'
                              ? 'Trắc nghiệm'
                              : q.question_type === 'ESSAY'
                                ? 'Tự luận'
                                : 'Trả lời ngắn'}
                          </Tag>
                          <span className="text-[11px] font-bold text-slate-500">{q.points}đ</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate m-0 font-medium">
                          {q.question_text || 'Chưa nhập nội dung'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="text"
                          size="small"
                          icon={<UpOutlined className="text-[10px]" />}
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveQuestion(idx, 'up');
                          }}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<DownOutlined className="text-[10px]" />}
                          disabled={idx === questions.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveQuestion(idx, 'down');
                          }}
                        />
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined className="text-[10px]" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuestion(idx);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Active Question Editor */}
            {activeQ && (
              <div className="lg:col-span-8 rounded-2xl border p-5 space-y-4 bg-white dark:bg-slate-950 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      <EditOutlined />
                      <span>Chỉnh sửa Câu hỏi #{activeQuestionIdx + 1}</span>
                    </span>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteQuestion(activeQuestionIdx)}
                      className="text-xs"
                    >
                      Xóa câu hỏi này
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Loại câu hỏi</label>
                      <Select
                        value={activeQ.question_type}
                        onChange={(val) => handleUpdateActiveQuestion('question_type', val)}
                        className="w-full rounded-xl"
                      >
                        <Select.Option value="MULTIPLE_CHOICE">Trắc Nghiệm (Multiple Choice)</Select.Option>
                        <Select.Option value="ESSAY">Tự Luận (Essay)</Select.Option>
                        <Select.Option value="SHORT_ANSWER">Trả Lời Ngắn (Short Answer)</Select.Option>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Thang điểm</label>
                      <InputNumber
                        min={0.5}
                        step={0.5}
                        value={activeQ.points}
                        onChange={(val) => handleUpdateActiveQuestion('points', val || 1.0)}
                        className="w-full rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Nội dung câu hỏi</label>
                    <Input.TextArea
                      rows={3}
                      value={activeQ.question_text}
                      onChange={(e) => handleUpdateActiveQuestion('question_text', e.target.value)}
                      placeholder="Nhập nội dung câu hỏi..."
                      className="rounded-xl"
                    />
                  </div>

                  {/* Multiple Choice Options Editor */}
                  {activeQ.question_type === 'MULTIPLE_CHOICE' && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-slate-500">Danh sách lựa chọn</span>
                        <Button
                          type="dashed"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={handleAddOptionToActiveQuestion}
                          className="rounded-lg text-xs"
                        >
                          Thêm Lựa Chọn
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {(activeQ.options || []).map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <Radio
                              checked={opt.is_correct}
                              onChange={(e) => handleUpdateOption(oIdx, 'is_correct', e.target.checked)}
                              title="Tích chọn làm đáp án đúng"
                            />
                            <Input
                              value={opt.option_text}
                              onChange={(e) => handleUpdateOption(oIdx, 'option_text', e.target.value)}
                              placeholder={`Lựa chọn ${String.fromCharCode(65 + oIdx)}`}
                              className="rounded-xl flex-1"
                            />
                            {opt.is_correct && (
                              <Tag color="success" className="rounded-lg px-2 py-0.5 text-xs font-bold border-0">
                                ĐÁP ÁN ĐÚNG
                              </Tag>
                            )}
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteOption(oIdx)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Essay Rubric / Expected Answer */}
                  {activeQ.question_type === 'ESSAY' && (
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                        Đáp án mẫu / Biểu điểm hướng dẫn chấm (Rubric)
                      </label>
                      <Input.TextArea
                        rows={3}
                        value={activeQ.expected_answer || ''}
                        onChange={(e) => handleUpdateActiveQuestion('expected_answer', e.target.value)}
                        placeholder="Nhập đáp án gợi ý hoặc tiêu chí chấm bài..."
                        className="rounded-xl"
                      />
                    </div>
                  )}

                  {/* Short Answer Expected Answer */}
                  {activeQ.question_type === 'SHORT_ANSWER' && (
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Đáp án đúng chuẩn</label>
                      <Input
                        value={activeQ.expected_answer || ''}
                        onChange={(e) => handleUpdateActiveQuestion('expected_answer', e.target.value)}
                        placeholder="Nhập câu trả lời ngắn đúng..."
                        className="rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Filtered Submissions Roster List
  const filteredSubmissionsList = (submissionsOverview?.submissions || []).filter((sub) => {
    const matchesSearch =
      !submissionSearchQuery.trim() ||
      (sub.student_name || '').toLowerCase().includes(submissionSearchQuery.toLowerCase()) ||
      (sub.student_email || '').toLowerCase().includes(submissionSearchQuery.toLowerCase());

    let matchesSubmissionStatus = true;
    if (submissionStatusFilter === 'Submitted') {
      matchesSubmissionStatus = sub.student_status === 'Submitted' || sub.student_status === 'Late';
    } else if (submissionStatusFilter === 'Not Submitted') {
      matchesSubmissionStatus = sub.student_status === 'Not Submitted';
    } else if (submissionStatusFilter === 'Late') {
      matchesSubmissionStatus = sub.student_status === 'Late' || sub.is_late === true;
    }

    let matchesGradingStatus = true;
    if (gradingStatusFilter === 'Graded') {
      matchesGradingStatus = sub.grading_status === 'Graded';
    } else if (gradingStatusFilter === 'Pending') {
      matchesGradingStatus = sub.grading_status === 'Pending';
    }

    return matchesSearch && matchesSubmissionStatus && matchesGradingStatus;
  });

  const submissionColumns = [
    {
      title: 'Sinh Viên (Student)',
      dataIndex: 'student_name',
      key: 'student_name',
      render: (text: string, record: Submission) => (
        <div className="flex items-center gap-3">
          <Avatar className="bg-indigo-600 text-white font-bold shrink-0">
            {(text || 'S').charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{text || 'Sinh viên'}</div>
            <div className="text-xs text-slate-400 font-mono">{record.student_email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng Thái Nộp',
      dataIndex: 'student_status',
      key: 'student_status',
      render: (status?: string, record?: Submission) => {
        if (status === 'Late' || record?.is_late) {
          return (
            <Tag color="orange" className="rounded-full px-2.5 py-0.5 text-xs font-bold border-0">
              NỘP MUỘN (LATE)
            </Tag>
          );
        }
        if (status === 'Submitted' || record?.submitted_at) {
          return (
            <Tag color="green" icon={<CheckCircleOutlined />} className="rounded-full px-2.5 py-0.5 text-xs font-bold border-0">
              ĐÃ NỘP (SUBMITTED)
            </Tag>
          );
        }
        return (
          <Tag color="default" className="rounded-full px-2.5 py-0.5 text-xs font-semibold border-0 text-slate-500">
            CHƯA NỘP
          </Tag>
        );
      },
    },
    {
      title: 'Thời Gian Nộp',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (val?: string) => (
        <span className="text-xs text-slate-500 font-mono">
          {val ? new Date(val).toLocaleString('vi-VN') : '-'}
        </span>
      ),
    },
    {
      title: 'Điểm Số (Score)',
      dataIndex: 'score',
      key: 'score',
      render: (val: number | null | undefined, record: Submission) => {
        if (!record.submitted_at && record.student_status === 'Not Submitted') {
          return <span className="text-xs text-slate-400 font-mono">-</span>;
        }
        const totalPts = submissionsOverview?.total_points || selectedAssignmentForSubmissions?.total_points || 0;
        if (val !== null && val !== undefined) {
          return (
            <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
              {val} / {totalPts}
            </span>
          );
        }
        return <span className="font-mono text-xs text-slate-400 italic">-- / {totalPts}</span>;
      },
    },
    {
      title: 'Trạng Thái Chấm',
      dataIndex: 'grading_status',
      key: 'grading_status',
      render: (gStatus?: string, record?: Submission) => {
        if (!record?.submitted_at && record?.student_status === 'Not Submitted') {
          return <span className="text-xs text-slate-400 font-mono">-</span>;
        }
        if (gStatus === 'Graded' || record?.score !== null) {
          return (
            <Tag color="success" icon={<CheckOutlined />} className="rounded-full px-2.5 py-0.5 text-xs font-bold border-0">
              ĐÃ CHẤM
            </Tag>
          );
        }
        return (
          <Tag color="warning" icon={<ClockCircleOutlined />} className="rounded-full px-2.5 py-0.5 text-xs font-bold border-0">
            CHỜ CHẤM
          </Tag>
        );
      },
    },
    {
      title: 'Hành Động',
      key: 'actions',
      render: (_: any, record: Submission) => {
        const hasSub = record.submitted_at || record.student_status !== 'Not Submitted';
        return (
          <Button
            type={hasSub ? 'primary' : 'default'}
            size="small"
            icon={<FileDoneOutlined />}
            onClick={() => handleOpenGradingModal(record)}
            className={`rounded-xl text-xs font-semibold ${hasSub ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : ''
              }`}
          >
            {hasSub ? 'Xem & Chấm Bài' : 'Xem Chi Tiết'}
          </Button>
        );
      },
    },
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Bar */}
        <header className={`px-6 py-4 border-b sticky top-0 z-10 backdrop-blur-md flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'
          }`}>
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/courses')}
              className="rounded-xl"
            >
              Quay lại
            </Button>
            <div className="flex items-center gap-2">
              <Tag color="indigo" className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border-0">
                {course.code}
              </Tag>
              <h1 className="text-xl font-bold tracking-tight m-0">{course.name}</h1>
            </div>
          </div>

          {isCourseOwner && (
            <div className="flex items-center gap-3">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateAssignmentModalOpen(true)}
                className="rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold"
              >
                Tạo Bài Tập
              </Button>

              <Button
                type="default"
                icon={<UploadOutlined />}
                onClick={() => setIsUploadModalOpen(true)}
                className="rounded-xl font-semibold"
              >
                Tải Lên Tài Liệu
              </Button>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 sm:p-8 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
                  Môn Học Lita Learning
                </span>
                <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {course.name}
                </h2>
                <p className={`text-sm max-w-2xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {course.description || 'Chưa có thông tin mô tả chi tiết cho môn học này.'}
                </p>
              </div>

              {/* Metadata Badges */}
              <div className="flex flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <UserOutlined className="text-indigo-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Giảng viên:</span>
                  <span>{course.instructor_name || 'Chưa cập nhật'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <TeamOutlined className="text-purple-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Sĩ số lớp:</span>
                  <span>{students.length} sinh viên</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarOutlined className="text-blue-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Học kỳ:</span>
                  <span>{course.term || 'Fall 2026'}</span>
                </div>
                {course.start_date && course.end_date && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <ClockCircleOutlined className="text-emerald-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Thời gian học:</span>
                    <span>{dayjs(course.start_date).format('DD/MM/YYYY')} - {dayjs(course.end_date).format('DD/MM/YYYY')}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Roster, Materials & Assignments Tabs */}
          <Tabs
            defaultActiveKey="assignments"
            items={[
              {
                key: 'assignments',
                label: `Bài Tập (${assignments.length})`,
                children: (
                  <div className={`rounded-2xl border p-6 shadow-sm space-y-4 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BookOutlined className="text-indigo-500 text-lg" />
                        <h3 className="font-bold text-base m-0">Danh sách bài tập</h3>
                      </div>
                      {isCourseOwner && (
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            setQuestions([]);
                            setActiveQuestionIdx(0);
                            createAssignmentForm.resetFields();
                            setIsCreateAssignmentModalOpen(true);
                          }}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                        >
                          Tạo Bài Tập Mới
                        </Button>
                      )}
                    </div>

                    {loadingAssignments ? (
                      <div className="py-12 text-center">
                        <Spin />
                        <p className="text-xs text-slate-400 mt-2">Đang tải danh sách bài tập...</p>
                      </div>
                    ) : assignments.length === 0 ? (
                      <Empty
                        description={
                          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                            Chưa có bài tập nào được giao cho khóa học này.
                          </span>
                        }
                      />
                    ) : (
                      <div className="space-y-4">
                        {assignments.map((item) => {
                          const hasChecklists = (item.checklist_count || 0) > 0;
                          const progressPct = item.progress_percentage || 0;
                          const completedCount = item.completed_checklist_count || 0;
                          const totalCount = item.checklist_count || 0;
                          const isDraft = item.status === 'DRAFT';

                          return (
                            <div
                              key={item.id}
                              className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50/80 border-slate-200 hover:border-indigo-200'
                                } ${isDraft ? 'opacity-90 border-dashed border-amber-400/50' : ''}`}
                            >
                              <div className="space-y-2 min-w-0 flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h4 className="font-bold text-base m-0 text-slate-900 dark:text-slate-100">
                                    {item.title}
                                  </h4>
                                  {getPriorityBadge(item.priority)}
                                  {isDraft ? (
                                    <Tag color="volcano" className="rounded-full text-xs font-bold border-0">
                                      BẢN NHÁP (DRAFT)
                                    </Tag>
                                  ) : (
                                    <Tag color="green" className="rounded-full text-xs font-bold border-0">
                                      ĐÃ PHÁT HÀNH
                                    </Tag>
                                  )}
                                  {!isCourseOwner && getProgressBadge(item.progress_status, item.due_date)}
                                </div>

                                <p className={`text-sm line-clamp-2 m-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {item.description || 'Không có mô tả chi tiết.'}
                                </p>

                                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                                  {item.available_from && (
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                      <CalendarOutlined />
                                      <span>Có sẵn từ: {new Date(item.available_from).toLocaleString('vi-VN')}</span>
                                    </span>
                                  )}
                                  {item.due_date && (
                                    <span className="flex items-center gap-1">
                                      <ClockCircleOutlined className="text-amber-500" />
                                      <span>Hạn nộp: {new Date(item.due_date).toLocaleString('vi-VN')}</span>
                                    </span>
                                  )}
                                  {item.estimated_hours !== undefined && item.estimated_hours !== null && (
                                    <span className="flex items-center gap-1">
                                      <FieldTimeOutlined className="text-purple-500" />
                                      <span>Thời gian ước tính: {item.estimated_hours} giờ</span>
                                    </span>
                                  )}
                                  {item.question_count !== undefined && item.question_count > 0 && (
                                    <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                                      <QuestionCircleOutlined />
                                      <span>{item.question_count} câu hỏi ({item.total_points || 0} điểm)</span>
                                    </span>
                                  )}
                                  {hasChecklists && (
                                    <span className="flex items-center gap-1 font-semibold text-indigo-500">
                                      <CheckSquareOutlined />
                                      <span>Checklist: {completedCount} / {totalCount} hoàn thành</span>
                                    </span>
                                  )}
                                </div>

                                {/* Reference File Attachment Badge */}
                                {item.attachment_file_name && (
                                  <div className="pt-2">
                                    <Button
                                      type="dashed"
                                      size="small"
                                      icon={<PaperClipOutlined className="text-indigo-500" />}
                                      loading={downloadingAttachmentId === item.id}
                                      onClick={() => handleDownloadAssignmentAttachment(item.id, item.attachment_file_name!)}
                                      className="rounded-lg text-xs font-semibold border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400"
                                    >
                                      Tệp đề bài: {item.attachment_file_name}
                                    </Button>
                                  </div>
                                )}

                                {/* Progress Bar */}
                                {hasChecklists && (
                                  <div className="pt-2 max-w-md">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span className="font-semibold text-slate-500">Tiến độ bài tập:</span>
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{progressPct}%</span>
                                    </div>
                                    <Progress percent={progressPct} showInfo={false} strokeColor="#6366f1" size="small" />
                                  </div>
                                )}
                              </div>

                              {/* Actions / Progress Controls */}
                              <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800 flex-wrap">
                                {isCourseOwner && (
                                  <>
                                    {isDraft && (
                                      <Button
                                        type="primary"
                                        icon={<SendOutlined />}
                                        onClick={() => handlePublishAssignmentDirectly(item)}
                                        className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-sm"
                                      >
                                        Phát Hành
                                      </Button>
                                    )}

                                    <Button
                                      type="default"
                                      icon={<FolderOpenOutlined />}
                                      onClick={() => handleOpenInstructorSubmissionsRoster(item)}
                                      className="rounded-xl text-xs font-semibold border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400"
                                    >
                                      Bài Nộp SV
                                    </Button>

                                    <Button
                                      type="default"
                                      icon={<BarChartOutlined />}
                                      onClick={() => handleOpenAnalytics(item.id)}
                                      className="rounded-xl text-xs font-semibold border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400"
                                    >
                                      Thống Kê
                                    </Button>
                                  </>
                                )}

                                <Button
                                  type="primary"
                                  icon={<EyeOutlined />}
                                  onClick={async () => {
                                    await refreshViewingAssignment(item.id);
                                    setIsDetailAssignmentModalOpen(true);
                                  }}
                                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                                >
                                  {isCourseOwner ? 'Quản Lý Bài Tập' : 'Nộp Bài / Checklist'}
                                </Button>

                                {isCourseOwner && (
                                  <>
                                    <Button
                                      type="text"
                                      icon={<EditOutlined />}
                                      onClick={() => handleOpenEditAssignment(item)}
                                      className="rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                      title="Chỉnh sửa bài tập"
                                    />

                                    <Popconfirm
                                      title="Xóa bài tập này?"
                                      description="Tất cả dữ liệu bài tập sẽ bị xóa vĩnh viễn."
                                      onConfirm={() => handleDeleteAssignment(item.id)}
                                      okText="Xóa"
                                      cancelText="Hủy"
                                      okButtonProps={{ danger: true }}
                                    >
                                      <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        className="rounded-lg"
                                        title="Xóa bài tập"
                                      />
                                    </Popconfirm>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'materials',
                label: `Tài Liệu Học Tập (${materials.length})`,
                children: (
                  <div className={`rounded-2xl border p-6 shadow-sm space-y-4 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                    {loadingMaterials ? (
                      <div className="py-12 text-center">
                        <Spin />
                        <p className="text-xs text-slate-400 mt-2">Đang tải tài liệu môn học...</p>
                      </div>
                    ) : materials.length === 0 ? (
                      <Empty
                        description={
                          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                            Chưa có tài liệu nào được tải lên cho môn học này.
                          </span>
                        }
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {materials.map((item) => (
                          <div
                            key={item.id}
                            className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'
                              }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="p-3 rounded-xl bg-slate-200/50 dark:bg-slate-800/80 shrink-0">
                                {getFileIcon(item.file_name, item.type)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-sm truncate">{item.title}</div>
                                <div className="text-xs text-slate-400 truncate mt-0.5">
                                  {item.file_name} • {new Date(item.created_at).toLocaleDateString('vi-VN')}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                type="primary"
                                icon={<EyeOutlined />}
                                onClick={() => navigate(`/courses/${courseId}/materials/${item.id}`)}
                                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs"
                              >
                                Xem bài giảng
                              </Button>

                              <Button
                                type="text"
                                icon={<DownloadOutlined />}
                                loading={downloadingId === item.id}
                                onClick={() => handleDownload(item)}
                                className="rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                title="Tải xuống tập tin"
                              />

                              {isCourseOwner && (
                                <Popconfirm
                                  title="Xóa tài liệu này?"
                                  description="Hành động này không thể hoàn tác."
                                  onConfirm={() => handleDeleteMaterial(item.id)}
                                  okText="Xóa"
                                  cancelText="Hủy"
                                  okButtonProps={{ danger: true }}
                                >
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    className="rounded-lg"
                                    title="Xóa tài liệu"
                                  />
                                </Popconfirm>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'students',
                label: `Danh Sách Sinh Viên (${students.length})`,
                children: (
                  <div className={`rounded-2xl border p-6 shadow-sm overflow-hidden ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                    <Table
                      dataSource={students}
                      columns={studentColumns}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      className="rounded-xl overflow-hidden"
                    />
                  </div>
                ),
              },
              {
                key: 'overview',
                label: 'Tổng Quan',
                children: (
                  <div className={`rounded-2xl border p-6 shadow-sm space-y-4 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                    <h3 className="font-bold text-base m-0">Mô tả chi tiết</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {course.description || 'Chưa có thông tin mô tả.'}
                    </p>
                  </div>
                ),
              },
            ]}
          />
        </main>
      </div>

      {/* Upload Material Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <UploadOutlined />
            <span>Tải Lên Tài Liệu Môn Học</span>
          </div>
        }
        open={isUploadModalOpen}
        onCancel={() => {
          setIsUploadModalOpen(false);
          form.resetFields();
          setFileList([]);
        }}
        footer={null}
        destroyOnClose
        centered
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUploadMaterial}
          requiredMark="optional"
          className="mt-4 space-y-4"
        >
          <Form.Item
            name="title"
            label={<span className="font-semibold text-xs uppercase">Tiêu đề tài liệu</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề tài liệu' }]}
          >
            <Input placeholder="Ví dụ: Đề cương môn học & Bài giảng Tuần 1" size="large" className="rounded-xl" />
          </Form.Item>

          <Form.Item
            name="type"
            label={<span className="font-semibold text-xs uppercase">Loại tài liệu</span>}
            initialValue="document"
          >
            <Select size="large" className="rounded-xl">
              <Select.Option value="syllabus">Syllabus / Đề cương</Select.Option>
              <Select.Option value="lecture_slide">Slide bài giảng</Select.Option>
              <Select.Option value="textbook">Sách giáo trình / Tài liệu tham khảo</Select.Option>
              <Select.Option value="document">Tài liệu tổng hợp (Document)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={<span className="font-semibold text-xs uppercase">Chọn tập tin (PDF, DOCX, TXT...)</span>}
            required
          >
            <Upload
              beforeUpload={(file) => {
                setFileList([file]);
                return false;
              }}
              fileList={fileList}
              onRemove={() => setFileList([])}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />} className="rounded-xl">
                Chọn tập tin từ máy tính
              </Button>
            </Upload>
          </Form.Item>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => {
                setIsUploadModalOpen(false);
                form.resetFields();
                setFileList([]);
              }}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={uploading}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Tải Lên
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Create Assignment Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <PlusOutlined />
            <span>Tạo Bài Tập Mới (Giảng Viên)</span>
          </div>
        }
        open={isCreateAssignmentModalOpen}
        onCancel={() => {
          setIsCreateAssignmentModalOpen(false);
          createAssignmentForm.resetFields();
          setAssignmentAttachmentList([]);
          setQuestions([]);
          setActiveQuestionIdx(0);
        }}
        footer={null}
        destroyOnClose
        centered
        width={920}
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={createAssignmentForm}
          layout="vertical"
          onFinish={(vals) => handleCreateAssignment(vals, vals.status)}
          requiredMark="optional"
          className="mt-4"
        >
          <Tabs
            activeKey={assignmentModalTab}
            onChange={(k) => setAssignmentModalTab(k)}
            items={[
              {
                key: 'details',
                label: '1. Thông tin chung',
                children: (
                  <div className="space-y-4 pt-2">
                    <Form.Item
                      name="title"
                      label={<span className="font-semibold text-xs uppercase">Tên bài tập *</span>}
                      rules={[{ required: true, message: 'Vui lòng nhập tên bài tập' }]}
                    >
                      <Input placeholder="Ví dụ: Kiểm tra giữa kỳ - Lập trình Python & AI" size="large" className="rounded-xl" />
                    </Form.Item>

                    <Form.Item
                      name="description"
                      label={<span className="font-semibold text-xs uppercase">Mô tả chi tiết / Hướng dẫn</span>}
                    >
                      <Input.TextArea rows={3} placeholder="Nhập yêu cầu bài tập và hướng dẫn sinh viên..." className="rounded-xl" />
                    </Form.Item>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Form.Item
                        name="available_from"
                        label={<span className="font-semibold text-xs uppercase">Thời gian có sẵn (Start)</span>}
                      >
                        <Input type="datetime-local" size="large" className="rounded-xl" />
                      </Form.Item>

                      <Form.Item
                        name="due_date"
                        label={<span className="font-semibold text-xs uppercase">Hạn nộp bài (Deadline)</span>}
                      >
                        <Input type="datetime-local" size="large" className="rounded-xl" />
                      </Form.Item>

                      <Form.Item
                        name="estimated_hours"
                        label={<span className="font-semibold text-xs uppercase">Thời gian ước tính (Giờ)</span>}
                      >
                        <InputNumber min={0} step={0.5} placeholder="12" size="large" className="w-full rounded-xl" />
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Form.Item
                        name="priority"
                        label={<span className="font-semibold text-xs uppercase">Mức độ ưu tiên</span>}
                        initialValue="MEDIUM"
                      >
                        <Select size="large" className="rounded-xl">
                          <Select.Option value="LOW">LOW</Select.Option>
                          <Select.Option value="MEDIUM">MEDIUM</Select.Option>
                          <Select.Option value="HIGH">HIGH</Select.Option>
                          <Select.Option value="CRITICAL">CRITICAL</Select.Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="status"
                        label={<span className="font-semibold text-xs uppercase">Trạng thái phát hành</span>}
                        initialValue="ACTIVE"
                      >
                        <Select size="large" className="rounded-xl">
                          <Select.Option value="ACTIVE">Phát hành ngay (ACTIVE)</Select.Option>
                          <Select.Option value="DRAFT">Lưu bản nháp (DRAFT - Sinh viên không thấy)</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>
                  </div>
                ),
              },
              {
                key: 'questions',
                label: `2. Ngân hàng câu hỏi (${questions.length})`,
                children: renderQuestionManagerUI(),
              },
              {
                key: 'attachment',
                label: '3. Đính kèm đề bài',
                children: (
                  <div className="py-6 space-y-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <PaperClipOutlined className="text-3xl text-indigo-500" />
                    <div className="text-xs text-slate-500">
                      Tải lên tập tin đề bài chi tiết hoặc tài liệu tham khảo (PDF, DOCX, ZIP...)
                    </div>
                    <Upload
                      beforeUpload={(file) => {
                        setAssignmentAttachmentList([file]);
                        return false;
                      }}
                      fileList={assignmentAttachmentList}
                      onRemove={() => setAssignmentAttachmentList([])}
                      maxCount={1}
                    >
                      <Button icon={<UploadOutlined />} className="rounded-xl">
                        Chọn tập tin đề bài
                      </Button>
                    </Upload>
                  </div>
                ),
              },
            ]}
          />

          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <Button
              onClick={() => {
                setIsCreateAssignmentModalOpen(false);
                createAssignmentForm.resetFields();
                setAssignmentAttachmentList([]);
                setQuestions([]);
                setActiveQuestionIdx(0);
              }}
              className="rounded-xl"
            >
              Hủy
            </Button>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  const vals = createAssignmentForm.getFieldsValue();
                  handleCreateAssignment(vals, 'DRAFT');
                }}
                loading={submittingAssignment}
                className="rounded-xl border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                Lưu Bản Nháp (Draft)
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submittingAssignment}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
              >
                Tạo &amp; Phát Hành Bài Tập
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <EditOutlined />
            <span>Chỉnh Sửa Bài Tập (Giảng Viên)</span>
          </div>
        }
        open={isEditAssignmentModalOpen}
        onCancel={() => {
          setIsEditAssignmentModalOpen(false);
          setEditingAssignment(null);
          setAssignmentAttachmentList([]);
          setQuestions([]);
          setActiveQuestionIdx(0);
          editAssignmentForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        centered
        width={920}
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={editAssignmentForm}
          layout="vertical"
          onFinish={(vals) => handleEditAssignment(vals, vals.status)}
          requiredMark="optional"
          className="mt-4"
        >
          <Tabs
            activeKey={assignmentModalTab}
            onChange={(k) => setAssignmentModalTab(k)}
            items={[
              {
                key: 'details',
                label: '1. Thông tin chung',
                children: (
                  <div className="space-y-4 pt-2">
                    <Form.Item
                      name="title"
                      label={<span className="font-semibold text-xs uppercase">Tên bài tập *</span>}
                      rules={[{ required: true, message: 'Vui lòng nhập tên bài tập' }]}
                    >
                      <Input size="large" className="rounded-xl" />
                    </Form.Item>

                    <Form.Item
                      name="description"
                      label={<span className="font-semibold text-xs uppercase">Mô tả chi tiết / Hướng dẫn</span>}
                    >
                      <Input.TextArea rows={3} className="rounded-xl" />
                    </Form.Item>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Form.Item
                        name="available_from"
                        label={<span className="font-semibold text-xs uppercase">Thời gian có sẵn (Start)</span>}
                      >
                        <Input type="datetime-local" size="large" className="rounded-xl" />
                      </Form.Item>

                      <Form.Item
                        name="due_date"
                        label={<span className="font-semibold text-xs uppercase">Hạn nộp bài (Deadline)</span>}
                      >
                        <Input type="datetime-local" size="large" className="rounded-xl" />
                      </Form.Item>

                      <Form.Item
                        name="estimated_hours"
                        label={<span className="font-semibold text-xs uppercase">Thời gian ước tính (Giờ)</span>}
                      >
                        <InputNumber min={0} step={0.5} size="large" className="w-full rounded-xl" />
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Form.Item
                        name="priority"
                        label={<span className="font-semibold text-xs uppercase">Mức độ ưu tiên</span>}
                      >
                        <Select size="large" className="rounded-xl">
                          <Select.Option value="LOW">LOW</Select.Option>
                          <Select.Option value="MEDIUM">MEDIUM</Select.Option>
                          <Select.Option value="HIGH">HIGH</Select.Option>
                          <Select.Option value="CRITICAL">CRITICAL</Select.Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="status"
                        label={<span className="font-semibold text-xs uppercase">Trạng thái phát hành</span>}
                      >
                        <Select size="large" className="rounded-xl">
                          <Select.Option value="ACTIVE">Phát hành (ACTIVE)</Select.Option>
                          <Select.Option value="DRAFT">Lưu bản nháp (DRAFT - Sinh viên không thấy)</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>
                  </div>
                ),
              },
              {
                key: 'questions',
                label: `2. Ngân hàng câu hỏi (${questions.length})`,
                children: renderQuestionManagerUI(),
              },
              {
                key: 'attachment',
                label: '3. Đính kèm đề bài',
                children: (
                  <div className="py-6 space-y-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <PaperClipOutlined className="text-3xl text-indigo-500" />
                    {editingAssignment?.attachment_file_name && (
                      <p className="text-xs text-slate-500 mb-2">
                        Tệp hiện tại: <strong>{editingAssignment.attachment_file_name}</strong>
                      </p>
                    )}
                    <Upload
                      beforeUpload={(file) => {
                        setAssignmentAttachmentList([file]);
                        return false;
                      }}
                      fileList={assignmentAttachmentList}
                      onRemove={() => setAssignmentAttachmentList([])}
                      maxCount={1}
                    >
                      <Button icon={<PaperClipOutlined />} className="rounded-xl">
                        Thay thế tập tin đề bài mới
                      </Button>
                    </Upload>
                  </div>
                ),
              },
            ]}
          />

          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <Button
              onClick={() => {
                setIsEditAssignmentModalOpen(false);
                setEditingAssignment(null);
                setAssignmentAttachmentList([]);
                setQuestions([]);
                setActiveQuestionIdx(0);
                editAssignmentForm.resetFields();
              }}
              className="rounded-xl"
            >
              Hủy
            </Button>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  const vals = editAssignmentForm.getFieldsValue();
                  handleEditAssignment(vals, 'DRAFT');
                }}
                loading={submittingAssignment}
                className="rounded-xl border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                Lưu Thành Bản Nháp (Draft)
              </Button>
              <Button
                htmlType="button"
                onClick={() => {
                  const vals = editAssignmentForm.getFieldsValue();
                  handleEditAssignment(vals, 'ACTIVE');
                }}
                loading={submittingAssignment}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold border-0"
              >
                🚀 Phát Hành Bài Tập (Active)
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submittingAssignment}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
              >
                Lưu Thay Đổi
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      {/* CSV Question Import Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <FileExcelOutlined />
            <span>Nhập Câu Hỏi Từ Tệp CSV</span>
          </div>
        }
        open={isCsvModalOpen}
        onCancel={() => {
          setIsCsvModalOpen(false);
          setCsvFileList([]);
        }}
        footer={null}
        destroyOnClose
        centered
        className="rounded-2xl overflow-hidden"
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs space-y-2 text-slate-600 dark:text-slate-400">
            <div className="font-bold text-slate-800 dark:text-slate-200">Định dạng tiêu đề cột CSV hỗ trợ:</div>
            <code className="block font-mono bg-slate-200 dark:bg-slate-800 p-2 rounded text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto">
              question_type,question_text,points,expected_answer,option_1,option_2,option_3,option_4,correct_option
            </code>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>question_type</strong>: MULTIPLE_CHOICE, ESSAY, SHORT_ANSWER</li>
              <li><strong>correct_option</strong>: Số thứ tự đáp án đúng (1, 2, 3...)</li>
              <li>Tự động nhận diện tới 50+ câu hỏi liên tiếp!</li>
            </ul>
          </div>

          <div className="text-center py-4">
            <Upload
              accept=".csv"
              beforeUpload={(file) => {
                setCsvFileList([file]);
                handleParseCsvFile(file);
                return false;
              }}
              fileList={csvFileList}
              onRemove={() => setCsvFileList([])}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />} loading={importingCsv} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-semibold">
                Chọn tệp CSV để tải lên
              </Button>
            </Upload>
          </div>
        </div>
      </Modal>


      {/* View Assignment Detail, Checklist & Student Submission Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <BookOutlined />
            <span>Chi Tiết Bài Tập, Câu Hỏi &amp; Nộp Bài</span>
          </div>
        }
        open={isDetailAssignmentModalOpen}
        onCancel={() => {
          setIsDetailAssignmentModalOpen(false);
          setViewingAssignment(null);
          setMySubmission(null);
          setSubmissionFileList([]);
          setSubmissionNotes('');
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsDetailAssignmentModalOpen(false);
              setViewingAssignment(null);
              setMySubmission(null);
              setSubmissionFileList([]);
              setSubmissionNotes('');
            }}
            className="rounded-xl"
          >
            Đóng
          </Button>,
        ]}
        centered
        width={840}
        className="rounded-2xl overflow-hidden"
      >
        {viewingAssignment && (
          <div className="mt-4 space-y-6">
            {/* Header Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white m-0">
                  {viewingAssignment.title}
                </h3>
                {getPriorityBadge(viewingAssignment.priority)}
                {viewingAssignment.status === 'DRAFT' ? (
                  <Tag color="volcano" className="rounded-full text-xs font-bold border-0">BẢN NHÁP</Tag>
                ) : (
                  <Tag color="green" className="rounded-full text-xs font-bold border-0">ĐÃ PHÁT HÀNH</Tag>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                {viewingAssignment.available_from && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Bắt đầu: <strong>{new Date(viewingAssignment.available_from).toLocaleString('vi-VN')}</strong>
                  </span>
                )}
                {viewingAssignment.due_date && (
                  <span>Deadline: <strong>{new Date(viewingAssignment.due_date).toLocaleString('vi-VN')}</strong></span>
                )}
                {viewingAssignment.estimated_hours !== undefined && (
                  <span>Ước tính: <strong>{viewingAssignment.estimated_hours} giờ</strong></span>
                )}
                {viewingAssignment.question_count !== undefined && viewingAssignment.question_count > 0 && (
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {viewingAssignment.question_count} câu hỏi ({viewingAssignment.total_points || 0} điểm)
                  </span>
                )}
              </div>
            </div>

            {/* Student Teams-Style Submission Status & Feedback Banner */}
            {!isCourseOwner && (
              <div className="space-y-3">
                {(() => {
                  const isSub = Boolean(
                    mySubmission &&
                    (mySubmission.status === 'submitted' ||
                      mySubmission.status === 'SUBMITTED' ||
                      mySubmission.status === 'graded' ||
                      mySubmission.status === 'GRADED')
                  );
                  const isGraded = Boolean(
                    mySubmission &&
                    (mySubmission.score !== null && mySubmission.score !== undefined ||
                      mySubmission.status === 'graded' ||
                      mySubmission.status === 'GRADED')
                  );

                  let genFb = '';
                  if (mySubmission?.feedback) {
                    try {
                      const p = JSON.parse(mySubmission.feedback);
                      if (p.generalFeedback) genFb = p.generalFeedback;
                    } catch (e) {
                      genFb = mySubmission.feedback;
                    }
                  }

                  if (isGraded) {
                    return (
                      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-emerald-950' : 'bg-emerald-50/70 border-emerald-200'} space-y-3`}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Tag color="success" icon={<CheckCircleOutlined />} className="rounded-full px-3 py-0.5 text-xs font-bold border-0">
                              ĐÃ CHẤM ĐIỂM (GRADED)
                            </Tag>
                            <span className="text-xs text-slate-500">
                              Nộp lúc: {mySubmission?.submitted_at ? new Date(mySubmission.submitted_at).toLocaleString('vi-VN') : '---'}
                            </span>
                          </div>

                          <div className="flex items-baseline gap-1 font-mono">
                            <span className="text-xs font-semibold uppercase text-slate-500">Score:</span>
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                              {mySubmission?.score}
                            </span>
                            <span className="text-sm font-bold text-slate-400">
                              / {viewingAssignment.total_points || 0} điểm
                            </span>
                          </div>
                        </div>

                        {genFb && (
                          <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/50 space-y-1">
                            <span className="text-xs font-extrabold uppercase text-emerald-700 dark:text-emerald-300 block">
                              Nhận xét tổng quan của Giảng viên (Instructor Feedback):
                            </span>
                            <p className="m-0 text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-medium italic bg-white dark:bg-slate-950 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900">
                              &quot;{genFb}&quot;
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (isSub) {
                    return (
                      <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${isDark ? 'bg-slate-900 border-indigo-950' : 'bg-indigo-50/60 border-indigo-200'
                        }`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Tag color="processing" icon={<ClockCircleOutlined />} className="rounded-full px-3 py-0.5 text-xs font-bold border-0">
                              ĐÃ NỘP BÀI (SUBMITTED)
                            </Tag>
                            <span className="text-xs text-slate-500 font-mono">
                              {mySubmission?.submitted_at ? new Date(mySubmission.submitted_at).toLocaleString('vi-VN') : '---'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 m-0">
                            Bài làm đã được nộp và khóa chỉnh sửa. Nếu muốn sửa lại, vui lòng bấm <strong>&quot;Undo Turn In&quot; (Hủy Nộp Bài)</strong>.
                          </p>
                        </div>

                        <Popconfirm
                          title="Hủy Nộp Bài (Undo Turn In)?"
                          description="Undoing your submission will allow you to edit your answers again. You will need to turn in the assignment again after making your changes."
                          onConfirm={handleUndoTurnIn}
                          okText="Hủy Nộp Bài"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true, loading: undoingTurnIn, className: 'rounded-xl' }}
                        >
                          <Button
                            type="default"
                            icon={<SyncOutlined />}
                            loading={undoingTurnIn}
                            className="rounded-xl border-indigo-400 text-indigo-600 hover:bg-indigo-50 font-semibold text-xs shrink-0"
                          >
                            Undo Turn In (Hủy Nộp Bài)
                          </Button>
                        </Popconfirm>
                      </div>
                    );
                  }

                  return (
                    <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Tag color="default" className="rounded-full px-3 py-0.5 text-xs font-semibold border-0 text-slate-500">
                            CHƯA NỘP (NOT SUBMITTED)
                          </Tag>
                        </div>
                        <p className="text-xs text-slate-500 m-0">
                          Trả lời các câu hỏi ở Tab 2 hoặc tải lên file bài làm ở Tab 3, sau đó bấm <strong>&quot;Turn In&quot; (Nộp Bài)</strong>.
                        </p>
                      </div>

                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={submittingSolution}
                        onClick={handleStudentSubmitAssignment}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs shrink-0"
                      >
                        Turn In (Nộp Bài)
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}

            <Tabs
              activeKey={viewingAssignmentTab}
              onChange={(k) => setViewingAssignmentTab(k)}
              items={[
                {
                  key: 'overview',
                  label: '1. Mô tả & Hướng dẫn',
                  children: (
                    <div className="space-y-4 pt-2">
                      <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <h4 className="text-xs font-semibold uppercase text-slate-400 m-0 mb-1">Hướng dẫn chi tiết</h4>
                        <p className="text-sm leading-relaxed m-0 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          {viewingAssignment.description || 'Không có mô tả.'}
                        </p>

                        {/* Reference Document Download */}
                        {viewingAssignment.attachment_file_name && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-xs text-slate-500 flex items-center gap-1.5">
                              <PaperClipOutlined className="text-indigo-500" />
                              <span>Tài liệu đề bài: <strong>{viewingAssignment.attachment_file_name}</strong></span>
                            </span>
                            <Button
                              type="primary"
                              size="small"
                              icon={<DownloadOutlined />}
                              loading={downloadingAttachmentId === viewingAssignment.id}
                              onClick={() => handleDownloadAssignmentAttachment(viewingAssignment.id, viewingAssignment.attachment_file_name!)}
                              className="rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500"
                            >
                              Tải Đề Bài
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Derived Progress Bar */}
                      <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">Tiến độ hoàn thành:</span>
                          <span className="font-mono font-bold text-lg text-indigo-600 dark:text-indigo-400">
                            {viewingAssignment.progress_percentage || 0}% ({viewingAssignment.completed_checklist_count || 0}/{viewingAssignment.checklist_count || 0} mục)
                          </span>
                        </div>
                        <Progress
                          percent={viewingAssignment.progress_percentage || 0}
                          strokeColor={{ '0%': '#818cf8', '100%': '#4f46e5' }}
                        />
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'questions',
                  label: `2. Câu hỏi trắc nghiệm & tự luận (${viewingAssignment.questions?.length || 0})`,
                  children: (
                    <div className="space-y-4 pt-2">
                      {(() => {
                        const isLocked = Boolean(
                          mySubmission &&
                          (mySubmission.status === 'submitted' ||
                            mySubmission.status === 'SUBMITTED' ||
                            mySubmission.status === 'graded' ||
                            mySubmission.status === 'GRADED')
                        );
                        const isGraded = Boolean(
                          mySubmission &&
                          (mySubmission.score !== null && mySubmission.score !== undefined ||
                            mySubmission.status === 'graded' ||
                            mySubmission.status === 'GRADED')
                        );

                        let qScores: Record<string, number> = {};
                        let qFbs: Record<string, string> = {};
                        if (mySubmission?.feedback) {
                          try {
                            const p = JSON.parse(mySubmission.feedback);
                            if (p.questionScores) qScores = p.questionScores;
                            if (p.questionFeedbacks) qFbs = p.questionFeedbacks;
                          } catch (e) { }
                        }

                        if (!isCourseOwner && isLocked) {
                          return (
                            <div className="p-8 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/40 text-center space-y-4 my-4">
                              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-3xl shadow-sm">
                                <LockOutlined />
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white m-0">
                                  Đề bài trắc nghiệm đã được khóa an toàn!
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto m-0 leading-relaxed">
                                  Bạn đã hoàn thành và nộp bài trắc nghiệm này. Đề thi và các câu hỏi đã được khóa lại để bảo mật nội dung bài thi và chống rò rỉ đề.
                                </p>
                              </div>
                              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                <CheckCircleOutlined className="text-emerald-500" />
                                <span>Nộp lúc: {mySubmission?.submitted_at ? new Date(mySubmission.submitted_at).toLocaleString('vi-VN') : 'Đã nộp bài'}</span>
                              </div>
                            </div>
                          );
                        }

                        return viewingAssignment.questions && viewingAssignment.questions.length > 0 ? (
                          <div className="space-y-4">
                            {viewingAssignment.questions.map((q, idx) => (
                              <div
                                key={q.id || idx}
                                className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                    <span>Câu {idx + 1}:</span>
                                    <Tag
                                      color={
                                        q.question_type === 'MULTIPLE_CHOICE'
                                          ? 'blue'
                                          : q.question_type === 'ESSAY'
                                            ? 'purple'
                                            : 'orange'
                                      }
                                      className="rounded-full text-[10px] font-semibold border-0"
                                    >
                                      {q.question_type === 'MULTIPLE_CHOICE'
                                        ? 'Trắc nghiệm'
                                        : q.question_type === 'ESSAY'
                                          ? 'Tự luận'
                                          : 'Trả lời ngắn'}
                                    </Tag>
                                  </span>

                                  <div className="flex items-center gap-2">
                                    {isGraded && (
                                      <Tag color="emerald" className="rounded-full text-xs font-bold border-0 font-mono">
                                        Score: {qScores[q.id] ?? 0} / {q.points}đ
                                      </Tag>
                                    )}
                                    <Tag color="gold" className="rounded-full text-xs font-bold border-0">
                                      {q.points} điểm
                                    </Tag>
                                  </div>
                                </div>

                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 m-0 leading-relaxed">
                                  {q.question_text}
                                </p>

                                {q.question_type === 'MULTIPLE_CHOICE' && q.options && (
                                  <Radio.Group
                                    disabled={isLocked}
                                    onChange={(e) => setStudentAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                    value={studentAnswers[q.id]}
                                    className="w-full space-y-2 pt-1"
                                  >
                                    <Space direction="vertical" className="w-full">
                                      {q.options.map((opt) => (
                                        <Radio key={opt.id} value={opt.id} className="text-sm">
                                          {opt.option_text}
                                        </Radio>
                                      ))}
                                    </Space>
                                  </Radio.Group>
                                )}

                                {q.question_type === 'ESSAY' && (
                                  <Input.TextArea
                                    disabled={isLocked}
                                    rows={4}
                                    placeholder="Nhập câu trả lời tự luận của bạn vào đây..."
                                    value={studentAnswers[q.id] || ''}
                                    onChange={(e) => setStudentAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                    className="rounded-xl"
                                  />
                                )}

                                {q.question_type === 'SHORT_ANSWER' && (
                                  <Input
                                    disabled={isLocked}
                                    placeholder="Nhập câu trả lời ngắn..."
                                    value={studentAnswers[q.id] || ''}
                                    onChange={(e) => setStudentAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                    className="rounded-xl"
                                  />
                                )}

                                {/* Individual Question Feedback from Instructor */}
                                {isGraded && (
                                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
                                    <span className="font-extrabold uppercase text-indigo-600 dark:text-indigo-400 block text-[10px]">
                                      Nhận xét riêng cho câu này (Instructor Feedback):
                                    </span>
                                    <p className="m-0 text-slate-700 dark:text-slate-300 font-medium italic bg-indigo-50/50 dark:bg-indigo-950/40 p-2.5 rounded-xl">
                                      {qFbs[q.id] || 'No feedback provided.'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}

                            {!isCourseOwner && !isLocked && (
                              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-xs text-slate-500">
                                  Hoàn tất trả lời? Bạn có thể bấm Turn In trực tiếp tại đây.
                                </span>
                                <Button
                                  type="primary"
                                  icon={<SendOutlined />}
                                  loading={submittingSolution}
                                  onClick={handleStudentSubmitAssignment}
                                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
                                >
                                  Turn In (Nộp Bài)
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Empty description={<span className="text-xs text-slate-400">Bài tập này chưa tạo danh sách câu hỏi.</span>} />
                        );
                      })()}
                    </div>
                  ),
                },
                {
                  key: 'submission',
                  label: '3. Nộp bài tập',
                  children: (
                    <div className="pt-2">
                      {!isCourseOwner && (
                        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-indigo-950/60' : 'bg-indigo-50/40 border-indigo-100'} space-y-4`}>
                          {viewingAssignment.questions && viewingAssignment.questions.length > 0 && (
                            <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-300">
                              <strong>Lưu ý:</strong> Bài tập này có câu hỏi trắc nghiệm/tự luận. Nếu bạn đã hoàn thành ở Tab 2, bạn chỉ cần bấm <strong>&quot;Turn In&quot;</strong> mà không bắt buộc chọn file đính kèm hay ghi chú.
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-base m-0 text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                              <SendOutlined />
                              <span>Nộp Bài Tập (Student Submission)</span>
                            </h4>
                            {mySubmission && (mySubmission.status === 'submitted' || mySubmission.status === 'SUBMITTED' || mySubmission.status === 'graded' || mySubmission.status === 'GRADED') ? (
                              <Tag color="success" icon={<CheckCircleOutlined />} className="rounded-full px-3 py-0.5 text-xs border-0 font-bold">
                                ĐÃ NỘP BÀI (SUBMITTED)
                              </Tag>
                            ) : (
                              <Tag color="default" className="rounded-full px-3 py-0.5 text-xs border-0 font-semibold text-slate-500">
                                CHƯA NỘP (NOT SUBMITTED)
                              </Tag>
                            )}
                          </div>

                          {loadingMySubmission ? (
                            <Spin size="small" />
                          ) : (
                            <div className="space-y-3 text-xs">
                              {mySubmission && (
                                <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} space-y-2`}>
                                  <div className="flex items-center justify-between text-slate-500">
                                    <span>Thời gian nộp: <strong>{mySubmission.submitted_at ? new Date(mySubmission.submitted_at).toLocaleString('vi-VN') : 'Mới nộp'}</strong></span>
                                    {mySubmission.score !== null && mySubmission.score !== undefined && (
                                      <span className="font-bold text-emerald-600 text-sm">Điểm: {mySubmission.score} / {viewingAssignment.total_points || 0}</span>
                                    )}
                                  </div>

                                  {mySubmission.file_name && (
                                    <div className="flex items-center justify-between pt-1">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <PaperClipOutlined className="text-indigo-500" />
                                        <span>{mySubmission.file_name}</span>
                                      </span>
                                      <Button
                                        type="dashed"
                                        size="small"
                                        icon={<DownloadOutlined />}
                                        loading={downloadingSubmissionId === mySubmission.id}
                                        onClick={() => handleDownloadSubmissionFile(mySubmission.id, mySubmission.file_name!)}
                                        className="rounded-lg text-xs"
                                      >
                                        Tải Bài Đã Nộp
                                      </Button>
                                    </div>
                                  )}

                                  {mySubmission.submission_text && (
                                    <p className="text-slate-600 dark:text-slate-400 m-0 pt-1 italic">
                                      &quot;{mySubmission.submission_text}&quot;
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Submission Upload Controls (Disabled if turned in) */}
                              {!(mySubmission && (mySubmission.status === 'submitted' || mySubmission.status === 'SUBMITTED' || mySubmission.status === 'graded' || mySubmission.status === 'GRADED')) && (
                                <div className="space-y-3">
                                  <div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                      {mySubmission ? 'Nộp tập tin bài làm mới (Tải đè)' : 'Tải lên tập tin bài làm (PDF, ZIP, DOCX, TXT...)'}
                                    </span>
                                    <Upload
                                      beforeUpload={(file) => {
                                        setSubmissionFileList([file]);
                                        return false;
                                      }}
                                      fileList={submissionFileList}
                                      onRemove={() => setSubmissionFileList([])}
                                      maxCount={1}
                                    >
                                      <Button icon={<UploadOutlined />} className="rounded-xl">
                                        Chọn tập tin bài làm
                                      </Button>
                                    </Upload>
                                  </div>

                                  <div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                      Ghi chú nộp bài / Lời nhắn cho giảng viên
                                    </span>
                                    <Input.TextArea
                                      rows={2}
                                      placeholder="Nhập ghi chú nộp bài..."
                                      value={submissionNotes}
                                      onChange={(e) => setSubmissionNotes(e.target.value)}
                                      className="rounded-xl"
                                    />
                                  </div>

                                  <div className="flex justify-end pt-1">
                                    <Button
                                      type="primary"
                                      icon={<SendOutlined />}
                                      loading={submittingSolution}
                                      onClick={handleStudentSubmitAssignment}
                                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
                                    >
                                      Turn In (Nộp Bài Tập)
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Instructor Submissions Roster & Overview Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <FolderOpenOutlined />
            <span>Tổng Quan &amp; Danh Sách Bài Nộp Sinh Viên</span>
          </div>
        }
        open={submissionsModalOpen}
        onCancel={() => {
          setSubmissionsModalOpen(false);
          setSubmissionsOverview(null);
          setSelectedAssignmentForSubmissions(null);
        }}
        footer={[
          <Button key="close" onClick={() => setSubmissionsModalOpen(false)} className="rounded-xl">
            Đóng
          </Button>,
        ]}
        centered
        width={980}
        className="rounded-2xl overflow-hidden"
      >
        {selectedAssignmentForSubmissions && (
          <div className="mt-4 space-y-5">
            {/* Header Assignment Overview Info */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-extrabold text-lg m-0 text-slate-900 dark:text-white">
                    {submissionsOverview?.assignment_title || selectedAssignmentForSubmissions.title}
                  </h4>
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                    Môn học: {submissionsOverview?.course_title || detail?.course.name}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {submissionsOverview?.due_date && (
                    <Tag color="volcano" icon={<ClockCircleOutlined />} className="rounded-full font-semibold border-0">
                      Deadline: {new Date(submissionsOverview.due_date).toLocaleString('vi-VN')}
                    </Tag>
                  )}
                  <Tag color="indigo" className="rounded-full font-bold border-0">
                    {submissionsOverview?.question_count || selectedAssignmentForSubmissions.question_count || 0} câu hỏi ({submissionsOverview?.total_points || selectedAssignmentForSubmissions.total_points || 0} điểm)
                  </Tag>
                </div>
              </div>

              {/* 5 Summary Stat Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Tổng SV ghi danh</span>
                  <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    {submissionsOverview?.total_students || 0}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-emerald-50/60 border-emerald-200'}`}>
                  <span className="text-[11px] font-semibold text-emerald-600 block uppercase">Đã nộp bài</span>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {submissionsOverview?.submitted_count || 0}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/60 border-amber-200'}`}>
                  <span className="text-[11px] font-semibold text-amber-600 block uppercase">Nộp muộn (Late)</span>
                  <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                    {submissionsOverview?.late_count || 0}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase">Chưa nộp</span>
                  <span className="text-xl font-extrabold text-slate-600 dark:text-slate-400">
                    {submissionsOverview?.not_submitted_count || 0}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-purple-50/60 border-purple-200'}`}>
                  <span className="text-[11px] font-semibold text-purple-600 block uppercase">Đã chấm / Chờ</span>
                  <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
                    {submissionsOverview?.graded_count || 0} / {submissionsOverview?.pending_count || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Input
                placeholder="Tìm sinh viên theo tên hoặc email..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={submissionSearchQuery}
                onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                allowClear
                className="rounded-xl flex-1"
              />

              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={submissionStatusFilter}
                  onChange={(val) => setSubmissionStatusFilter(val)}
                  className="w-36 rounded-xl"
                  title="Lọc trạng thái nộp bài"
                >
                  <Select.Option value="ALL">Tất cả nộp bài</Select.Option>
                  <Select.Option value="Submitted">Đã nộp bài</Select.Option>
                  <Select.Option value="Not Submitted">Chưa nộp bài</Select.Option>
                  <Select.Option value="Late">Nộp muộn (Late)</Select.Option>
                </Select>

                <Select
                  value={gradingStatusFilter}
                  onChange={(val) => setGradingStatusFilter(val)}
                  className="w-36 rounded-xl"
                  title="Lọc trạng thái chấm điểm"
                >
                  <Select.Option value="ALL">Tất cả chấm điểm</Select.Option>
                  <Select.Option value="Graded">Đã chấm điểm</Select.Option>
                  <Select.Option value="Pending">Chờ chấm điểm</Select.Option>
                </Select>
              </div>
            </div>

            {/* Student Submission Table */}
            {loadingSubmissionsRoster ? (
              <div className="py-12 text-center">
                <Spin />
                <p className="text-xs text-slate-400 mt-2">Đang tải danh sách nộp bài sinh viên...</p>
              </div>
            ) : (
              <Table
                dataSource={filteredSubmissionsList}
                columns={submissionColumns}
                rowKey={(r) => r.id || r.student_id}
                pagination={{ pageSize: 8 }}
                className="rounded-xl overflow-hidden"
              />
            )}
          </div>
        )}
      </Modal>

      {/* Individual Student Submission & Grading Drawer/Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <FileDoneOutlined />
            <span>Chấm Bài &amp; Nhận Xét Sinh Viên</span>
          </div>
        }
        open={isGradingDrawerOpen}
        onCancel={() => {
          setIsGradingDrawerOpen(false);
          setSelectedSubmissionForGrading(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsGradingDrawerOpen(false);
              setSelectedSubmissionForGrading(null);
            }}
            className="rounded-xl"
          >
            Hủy
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            loading={submittingGrade}
            onClick={handleSaveGrade}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
          >
            Lưu Điểm &amp; Nhận Xét
          </Button>,
        ]}
        centered
        width={880}
        className="rounded-2xl overflow-hidden"
      >
        {selectedSubmissionForGrading && selectedAssignmentForSubmissions && (
          <div className="mt-4 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            {/* Header Student & Submission Info Card */}
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Avatar className="bg-indigo-600 text-white font-bold shrink-0">
                    {(selectedSubmissionForGrading.student_name || 'S').charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <h3 className="font-extrabold text-base m-0 text-slate-900 dark:text-white">
                      {selectedSubmissionForGrading.student_name || 'Sinh viên'}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono m-0">
                      {selectedSubmissionForGrading.student_email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedSubmissionForGrading.is_late || selectedSubmissionForGrading.student_status === 'Late' ? (
                    <Tag color="orange" className="rounded-full px-3 py-0.5 text-xs font-bold border-0">
                      NỘP MUỘN (LATE)
                    </Tag>
                  ) : selectedSubmissionForGrading.submitted_at ? (
                    <Tag color="green" icon={<CheckCircleOutlined />} className="rounded-full px-3 py-0.5 text-xs font-bold border-0">
                      ĐÚNG HẠN (ON TIME)
                    </Tag>
                  ) : (
                    <Tag color="default" className="rounded-full px-3 py-0.5 text-xs font-bold border-0">
                      CHƯA NỘP
                    </Tag>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 uppercase font-semibold block mb-0.5">Bài tập</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAssignmentForSubmissions.title}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold block mb-0.5">Thời gian nộp</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedSubmissionForGrading.submitted_at
                      ? new Date(selectedSubmissionForGrading.submitted_at).toLocaleString('vi-VN')
                      : 'Chưa nộp bài'}
                  </span>
                </div>
              </div>

              {/* Submission File Download Button */}
              {selectedSubmissionForGrading.file_name && selectedSubmissionForGrading.has_file && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                    <PaperClipOutlined className="text-indigo-500 text-base" />
                    <span>File bài làm: <strong>{selectedSubmissionForGrading.file_name}</strong></span>
                  </span>
                  <Button
                    type="primary"
                    size="small"
                    icon={<DownloadOutlined />}
                    loading={downloadingSubmissionId === selectedSubmissionForGrading.id}
                    onClick={() => handleDownloadSubmissionFile(selectedSubmissionForGrading.id, selectedSubmissionForGrading.file_name!)}
                    className="rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 font-semibold"
                  >
                    Tải Bài Đã Nộp
                  </Button>
                </div>
              )}

              {/* Raw Submission Text / Notes from Student */}
              {selectedSubmissionForGrading.submission_text && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-xs font-bold uppercase text-slate-500 block">
                    Nội dung bài làm / Ghi chú nộp bài của Sinh viên:
                  </span>
                  <p className="m-0 text-xs text-slate-800 dark:text-slate-200 font-medium italic bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
                    {selectedSubmissionForGrading.submission_text}
                  </p>
                </div>
              )}
            </div>

            {/* Total Score & Grading Status Banner */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-900 border-indigo-950/80' : 'bg-indigo-50/70 border-indigo-200'
              }`}>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-600 text-white shrink-0">
                  <FileDoneOutlined className="text-xl" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase block">Tổng điểm bài nộp</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      {selectedAssignmentForSubmissions.questions
                        ? selectedAssignmentForSubmissions.questions.reduce((acc, q) => acc + (questionScores[q.id] || 0), 0)
                        : selectedSubmissionForGrading.score || 0}
                    </span>
                    <span className="text-sm font-bold text-slate-400 font-mono">
                      / {selectedAssignmentForSubmissions.total_points || 0} điểm
                    </span>
                  </div>
                </div>
              </div>

              <Tag color="success" className="rounded-full px-3 py-1 text-xs font-bold border-0">
                ĐANG CHẤM BÀI (GRADING)
              </Tag>
            </div>

            {/* Question-by-Question Detailed Review & Grading */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-base m-0 text-slate-900 dark:text-white flex items-center gap-2">
                <BookOutlined className="text-indigo-500" />
                <span>Chi Tiết Từng Câu Hỏi &amp; Chấm Điểm</span>
              </h4>

              {selectedAssignmentForSubmissions.questions && selectedAssignmentForSubmissions.questions.length > 0 ? (
                <div className="space-y-4">
                  {selectedAssignmentForSubmissions.questions.map((q, idx) => {
                    const studentAnsMap = parseStudentAnswersFromSubmissionText(
                      selectedSubmissionForGrading.submission_text || '',
                      selectedAssignmentForSubmissions.questions || []
                    );
                    const studentAnsText = studentAnsMap[q.id] || 'Chưa trả lời';
                    const isMCQ = q.question_type === 'MULTIPLE_CHOICE';
                    const correctOpt = isMCQ && q.options ? q.options.find((opt) => opt.is_correct) : null;
                    const isCorrect =
                      isMCQ &&
                      correctOpt &&
                      (studentAnsText.toLowerCase().trim() === correctOpt.option_text.toLowerCase().trim() ||
                        studentAnsText === correctOpt.id);

                    return (
                      <div
                        key={q.id || idx}
                        className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                      >
                        {/* Question Header */}
                        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                            <span>Câu {idx + 1}:</span>
                            <Tag
                              color={q.question_type === 'MULTIPLE_CHOICE' ? 'blue' : q.question_type === 'ESSAY' ? 'purple' : 'orange'}
                              className="rounded-full text-[10px] font-semibold border-0"
                            >
                              {q.question_type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : q.question_type === 'ESSAY' ? 'Tự luận' : 'Trả lời ngắn'}
                            </Tag>
                          </span>

                          <div className="flex items-center gap-2">
                            {isMCQ && (
                              <Tag color={isCorrect ? 'success' : 'error'} className="rounded-full text-xs font-bold border-0">
                                {isCorrect ? '✓ CHÍNH XÁC' : '✗ CHƯA ĐÚNG'}
                              </Tag>
                            )}
                            <Tag color="gold" className="rounded-full text-xs font-bold border-0">
                              Thang điểm: {q.points} điểm
                            </Tag>
                          </div>
                        </div>

                        {/* Question Text */}
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 m-0 leading-relaxed">
                          {q.question_text}
                        </p>

                        {/* Answers Box */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* Student Answer */}
                          <div className={`p-3 rounded-xl border text-xs space-y-1 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                            <span className="font-bold text-slate-500 uppercase block text-[10px]">Câu trả lời của Sinh viên:</span>
                            <p className="m-0 font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                              {studentAnsText}
                            </p>
                          </div>

                          {/* Correct Answer / Rubric */}
                          <div className={`p-3 rounded-xl border text-xs space-y-1 ${isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/60 border-emerald-200'
                            }`}>
                            <span className="font-bold text-emerald-600 block uppercase text-[10px]">
                              {isMCQ ? 'Đáp án đúng chuẩn:' : 'Gợi ý đáp án / Rubric hướng dẫn:'}
                            </span>
                            <p className="m-0 font-semibold text-emerald-800 dark:text-emerald-200 whitespace-pre-wrap">
                              {isMCQ ? (correctOpt ? correctOpt.option_text : 'Chưa thiết lập đáp án đúng') : (q.expected_answer || 'Không có rubric mẫu')}
                            </p>
                          </div>
                        </div>

                        {/* Score Input & Question Feedback */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 items-start">
                          <div className="sm:col-span-4 space-y-1">
                            <label className="text-[11px] font-bold uppercase text-slate-500 block">
                              Điểm cho câu này
                            </label>
                            <div className="flex items-center gap-2">
                              <InputNumber
                                min={0}
                                max={q.points}
                                step={0.5}
                                value={questionScores[q.id] ?? (isMCQ ? (isCorrect ? q.points : 0) : 0)}
                                onChange={(val) => setQuestionScores((prev) => ({ ...prev, [q.id]: val || 0 }))}
                                className="rounded-xl flex-1"
                              />
                              <span className="text-xs font-bold text-slate-400 font-mono">/ {q.points}đ</span>
                            </div>
                          </div>

                          <div className="sm:col-span-8 space-y-1">
                            <label className="text-[11px] font-bold uppercase text-slate-500 block">
                              Nhận xét riêng cho câu hỏi này (Feedback)
                            </label>
                            <Input.TextArea
                              rows={1}
                              placeholder="Nhập ghi chú / góp ý chi tiết cho câu hỏi..."
                              value={questionFeedbacks[q.id] || ''}
                              onChange={(e) => setQuestionFeedbacks((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              className="rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty description="Bài tập này không có ngân hàng câu hỏi." />
              )}

              {/* General Submission Feedback */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase text-slate-500 block">
                  Nhận xét &amp; Đánh giá tổng quan toàn bộ bài tập (General Instructor Feedback)
                </label>
                <Input.TextArea
                  rows={3}
                  placeholder="Nhập nhận xét tổng quan bài nộp dành cho sinh viên..."
                  value={generalFeedback}
                  onChange={(e) => setGeneralFeedback(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Instructor Analytics Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <BarChartOutlined />
            <span>Thống Kê Hoàn Thành Bài Tập (Giảng Viên)</span>
          </div>
        }
        open={analyticsModalOpen}
        onCancel={() => {
          setAnalyticsModalOpen(false);
          setAnalyticsData(null);
        }}
        footer={[
          <Button key="close" onClick={() => setAnalyticsModalOpen(false)} className="rounded-xl">
            Đóng
          </Button>,
        ]}
        centered
        className="rounded-2xl overflow-hidden"
      >
        {loadingAnalytics ? (
          <div className="py-12 text-center">
            <Spin />
            <p className="text-xs text-slate-400 mt-2">Đang tổng hợp dữ liệu thống kê...</p>
          </div>
        ) : analyticsData ? (
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-indigo-50/50 border-indigo-100'}`}>
                <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Tổng sinh viên ghi danh</span>
                <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{analyticsData.total_enrolled_students}</span>
              </div>

              <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-purple-50/50 border-purple-100'}`}>
                <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Tỷ lệ hoàn thành trung bình</span>
                <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{analyticsData.average_completion_percentage}%</span>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
              <h4 className="font-bold text-sm m-0">Phân bố tiến độ sinh viên</h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Tag color="success" className="rounded-full border-0">Đã hoàn thành (100%)</Tag>
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{analyticsData.completed_students_count} sinh viên</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Tag color="warning" className="rounded-full border-0">Đang thực hiện (&gt;0%)</Tag>
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{analyticsData.in_progress_students_count} sinh viên</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Tag color="default" className="rounded-full border-0 text-slate-500">Chưa bắt đầu (0%)</Tag>
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{analyticsData.not_started_students_count} sinh viên</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Empty description="Không có dữ liệu thống kê." />
        )}
      </Modal>
    </div>
  );
};
