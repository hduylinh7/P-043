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
  InfoCircleOutlined,
} from '@ant-design/icons';

import { motion } from 'framer-motion';
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
  Checklist,
  PriorityLevel,
  ProgressStatus,
  Submission,
} from '../types/assignment';

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeMode } = useTheme();

  const isInstructor = user?.roles?.includes('instructor') || user?.roles?.includes('admin');
  const isDark = themeMode === 'dark';

  const [activeDetailTab, setActiveDetailTab] = useState<string>('assignments');
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

  // Download Loading States
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [downloadingSubmissionId, setDownloadingSubmissionId] = useState<string | null>(null);

  // Instructor Submissions Roster Modal State
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState<boolean>(false);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissionsRoster, setLoadingSubmissionsRoster] = useState<boolean>(false);
  const [selectedAssignmentForSubmissions, setSelectedAssignmentForSubmissions] = useState<Assignment | null>(null);

  const [createAssignmentForm] = Form.useForm();
  const [editAssignmentForm] = Form.useForm();

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

  useEffect(() => {
    fetchDetail();
    fetchMaterials();
    fetchAssignments();
  }, [courseId]);

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

  // Assignment Actions
  const handleCreateAssignment = async (values: any) => {
    if (!courseId) return;
    setSubmittingAssignment(true);
    try {
      const newAssignment = await assignmentService.createAssignment(courseId, {
        title: values.title,
        description: values.description,
        due_date: values.due_date ? new Date(values.due_date).toISOString() : undefined,
        estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : undefined,
        status: values.status || 'ACTIVE',
        priority: values.priority || 'MEDIUM',
      });

      // Upload reference file if attached
      if (assignmentAttachmentList.length > 0) {
        const attachFile = assignmentAttachmentList[0].originFileObj || assignmentAttachmentList[0];
        await assignmentService.uploadAttachment(newAssignment.id, attachFile);
      }

      message.success('Tạo bài tập mới thành công!');
      setIsCreateAssignmentModalOpen(false);
      createAssignmentForm.resetFields();
      setAssignmentAttachmentList([]);
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
    editAssignmentForm.setFieldsValue({
      title: assignment.title,
      description: assignment.description,
      due_date: assignment.due_date ? assignment.due_date.slice(0, 16) : '',
      estimated_hours: assignment.estimated_hours,
      status: assignment.status || 'ACTIVE',
      priority: assignment.priority || 'MEDIUM',
    });
    setIsEditAssignmentModalOpen(true);
  };

  const handleEditAssignment = async (values: any) => {
    if (!editingAssignment) return;
    setSubmittingAssignment(true);
    try {
      await assignmentService.updateAssignment(editingAssignment.id, {
        title: values.title,
        description: values.description,
        due_date: values.due_date ? new Date(values.due_date).toISOString() : undefined,
        estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : undefined,
        status: values.status,
        priority: values.priority,
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

  // Phase 2: Checklist & Submissions Operations
  const [searchParams] = useSearchParams();
  const targetAssignmentId = searchParams.get('assignment') || searchParams.get('assignmentId');

  useEffect(() => {
    if (targetAssignmentId && assignments.length > 0) {
      const found = assignments.find((a) => a.id === targetAssignmentId);
      if (found) {
        setViewingAssignment(found);
        setIsDetailAssignmentModalOpen(true);
      }
    }
  }, [targetAssignmentId, assignments]);

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
    if (submissionFileList.length === 0 && !submissionNotes.trim()) {
      message.error('Vui lòng chọn tập tin nộp bài hoặc nhập ghi chú trước khi bấm Nộp Bài.');
      return;
    }

    setSubmittingSolution(true);
    try {
      const submitFile = submissionFileList.length > 0 ? (submissionFileList[0].originFileObj || submissionFileList[0]) : null;
      const result = await assignmentService.submitAssignment(
        viewingAssignment.id,
        submitFile,
        submissionNotes.trim() || undefined
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

  const handleOpenInstructorSubmissionsRoster = async (assignment: Assignment) => {
    setSelectedAssignmentForSubmissions(assignment);
    setSubmissionsModalOpen(true);
    setLoadingSubmissionsRoster(true);
    try {
      const subs = await assignmentService.getAssignmentSubmissions(assignment.id);
      setAssignmentSubmissions(subs);
    } catch (err: any) {
      console.error('Get submissions roster error:', err);
      message.error(err.response?.data?.detail || 'Không thể tải danh sách bài nộp.');
    } finally {
      setLoadingSubmissionsRoster(false);
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

  const getProgressBadge = (status?: ProgressStatus | null) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Tag color="success" icon={<CheckCircleOutlined />} className="rounded-full px-3 py-0.5 text-xs border-0 font-semibold">
            Đã Hoàn Thành
          </Tag>
        );
      case 'IN_PROGRESS':
        return (
          <Tag color="warning" icon={<SyncOutlined spin />} className="rounded-full px-3 py-0.5 text-xs border-0 font-semibold">
            Đang Thực Hiện
          </Tag>
        );
      case 'NOT_STARTED':
      default:
        return (
          <Tag color="default" className="rounded-full px-3 py-0.5 text-xs border-0 font-semibold text-slate-500">
            Chưa Bắt Đầu
          </Tag>
        );
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
          <Avatar className="bg-minecraft-grass text-white font-bold shrink-0">
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

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Bar */}
        <header className={`px-6 py-4 border-b sticky top-0 z-10 backdrop-blur-md flex items-center justify-between ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'
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
              <Tag color="green" className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border-0">
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
                className="btn-voxel-gold text-xs px-4 py-2 text-slate-900"
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
            className={`p-6 sm:p-8 rounded-3xl border shadow-sm ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
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
                  <UserOutlined className="text-emerald-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Giảng viên:</span>
                  <span>{course.instructor_name || 'Chưa cập nhật'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <TeamOutlined className="text-amber-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Sĩ số lớp:</span>
                  <span>{students.length} sinh viên</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarOutlined className="text-sky-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Học kỳ:</span>
                  <span>{course.term || 'Fall 2026'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Custom 3D Voxel Tabs Navigation */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 mb-6">
            {[
              { key: 'assignments', label: `Bài Tập (${assignments.length})`, icon: <BookOutlined /> },
              { key: 'materials', label: `Tài Liệu Học Tập (${materials.length})`, icon: <FileTextOutlined /> },
              { key: 'students', label: `Danh Sách Sinh Viên (${students.length})`, icon: <TeamOutlined /> },
              { key: 'overview', label: `Tổng Quan`, icon: <InfoCircleOutlined /> },
            ].map((tab) => {
              const isActive = activeDetailTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveDetailTab(tab.key)}
                  className={isActive ? 'tab-voxel-active text-xs shrink-0' : 'tab-voxel-inactive text-xs shrink-0'}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Assignments */}
          {activeDetailTab === 'assignments' && (
            <div className="card-voxel-3d space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOutlined className="text-emerald-500 text-lg" />
                  <h3 className="font-bold text-base m-0">Danh sách bài tập</h3>
                </div>
                {isCourseOwner && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreateAssignmentModalOpen(true)}
                    className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 text-white border border-minecraft-grassBorder text-xs font-semibold"
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

                    return (
                      <div
                        key={item.id}
                        className={`p-5 rounded-2xl border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                          isDark
                            ? 'bg-slate-950/60 border-minecraft-obsidianBorder hover:border-emerald-500/40'
                            : 'bg-slate-50/80 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-bold text-base m-0 text-slate-900 dark:text-slate-100">
                              {item.title}
                            </h4>
                            {getPriorityBadge(item.priority)}
                            {item.status && (
                              <Tag color={item.status === 'ACTIVE' ? 'green' : 'default'} className="rounded-full text-xs font-semibold border-0">
                                {item.status}
                              </Tag>
                            )}
                            {!isCourseOwner && getProgressBadge(item.progress_status)}
                          </div>

                          <p className={`text-sm line-clamp-2 m-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {item.description || 'Không có mô tả chi tiết.'}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                            {item.due_date && (
                              <span className="flex items-center gap-1">
                                <ClockCircleOutlined className="text-amber-500" />
                                <span>Hạn nộp: {new Date(item.due_date).toLocaleString('vi-VN')}</span>
                              </span>
                            )}
                            {item.estimated_hours !== undefined && item.estimated_hours !== null && (
                              <span className="flex items-center gap-1">
                                <FieldTimeOutlined className="text-sky-500" />
                                <span>Thời gian ước tính: {item.estimated_hours} giờ</span>
                              </span>
                            )}
                            {hasChecklists && (
                              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
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
                                icon={<PaperClipOutlined className="text-emerald-500" />}
                                loading={downloadingAttachmentId === item.id}
                                onClick={() => handleDownloadAssignmentAttachment(item.id, item.attachment_file_name!)}
                                className="rounded-lg text-xs font-semibold border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400"
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
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{progressPct}%</span>
                              </div>
                              <Progress percent={progressPct} showInfo={false} strokeColor="#59B335" size="small" />
                            </div>
                          )}
                        </div>

                        {/* Actions / Progress Controls */}
                        <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800 flex-wrap">
                          {isCourseOwner && (
                            <>
                              <Button
                                type="default"
                                icon={<FolderOpenOutlined />}
                                onClick={() => handleOpenInstructorSubmissionsRoster(item)}
                                className="rounded-xl text-xs font-semibold border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400"
                              >
                                Bài Nộp SV
                              </Button>

                              <Button
                                type="default"
                                icon={<BarChartOutlined />}
                                onClick={() => handleOpenAnalytics(item.id)}
                                className="rounded-xl text-xs font-semibold border-sky-200 text-sky-600 dark:border-sky-800 dark:text-sky-400"
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
                            className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white text-xs font-semibold"
                          >
                            {isCourseOwner ? 'Quản Lý Bài Tập' : 'Nộp Bài / Checklist'}
                          </Button>

                          {isCourseOwner && (
                            <>
                              <Button
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => handleOpenEditAssignment(item)}
                                className="rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
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
          )}

          {/* Tab 2: Materials */}
          {activeDetailTab === 'materials' && (
            <div className="card-voxel-3d space-y-4">
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
                      className={`p-4 rounded-xl border-2 flex items-center justify-between gap-4 transition-all ${
                        isDark ? 'bg-slate-950/60 border-minecraft-obsidianBorder hover:border-emerald-500/40' : 'bg-slate-50 border-slate-200 hover:border-emerald-300'
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
                          className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white font-semibold text-xs"
                        >
                          Xem bài giảng
                        </Button>

                        <Button
                          type="text"
                          icon={<DownloadOutlined />}
                          loading={downloadingId === item.id}
                          onClick={() => handleDownload(item)}
                          className="rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
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
          )}

          {/* Tab 3: Students Roster */}
          {activeDetailTab === 'students' && (
            <div className="card-voxel-3d overflow-hidden">
              <Table
                dataSource={students}
                columns={studentColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                className="rounded-xl overflow-hidden"
              />
            </div>
          )}

          {/* Tab 4: Overview */}
          {activeDetailTab === 'overview' && (
            <div className="card-voxel-3d space-y-4">
              <h3 className="font-bold text-base m-0">Mô tả chi tiết</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {course.description || 'Chưa có thông tin mô tả.'}
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Upload Material Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
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
              className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white font-semibold"
            >
              Tải Lên
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Create Assignment Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <PlusOutlined />
            <span>Tạo Bài Tập Mới (Giảng Viên)</span>
          </div>
        }
        open={isCreateAssignmentModalOpen}
        onCancel={() => {
          setIsCreateAssignmentModalOpen(false);
          createAssignmentForm.resetFields();
          setAssignmentAttachmentList([]);
        }}
        footer={null}
        destroyOnClose
        centered
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={createAssignmentForm}
          layout="vertical"
          onFinish={handleCreateAssignment}
          requiredMark="optional"
          className="mt-4 space-y-4"
        >
          <Form.Item
            name="title"
            label={<span className="font-semibold text-xs uppercase">Tên bài tập</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên bài tập' }]}
          >
            <Input placeholder="Ví dụ: RAG Project - Lập trình AI companion" size="large" className="rounded-xl" />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className="font-semibold text-xs uppercase">Mô tả chi tiết / Hướng dẫn</span>}
          >
            <Input.TextArea rows={3} placeholder="Nhập yêu cầu bài tập..." className="rounded-xl" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              name="due_date"
              label={<span className="font-semibold text-xs uppercase">Hạn nộp bài</span>}
            >
              <Input type="datetime-local" size="large" className="rounded-xl" />
            </Form.Item>

            <Form.Item
              name="estimated_hours"
              label={<span className="font-semibold text-xs uppercase">Số giờ ước tính</span>}
            >
              <InputNumber min={0} step={0.5} placeholder="Ví dụ: 12" size="large" className="w-full rounded-xl" />
            </Form.Item>
          </div>

          <Form.Item
            name="status"
            label={<span className="font-semibold text-xs uppercase">Trạng thái</span>}
            initialValue="ACTIVE"
          >
            <Select size="large" className="rounded-xl">
              <Select.Option value="ACTIVE">Hoạt động (ACTIVE)</Select.Option>
              <Select.Option value="ARCHIVED">Lưu trữ (ARCHIVED)</Select.Option>
            </Select>
          </Form.Item>

          {/* Instructor File Attachment */}
          <Form.Item
            label={<span className="font-semibold text-xs uppercase">Đính kèm tập tin đề bài / Tài liệu tham khảo</span>}
          >
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
                Tải lên tập tin đề bài (PDF, DOCX...)
              </Button>
            </Upload>
          </Form.Item>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => {
                setIsCreateAssignmentModalOpen(false);
                createAssignmentForm.resetFields();
                setAssignmentAttachmentList([]);
              }}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submittingAssignment}
              className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white font-semibold"
            >
              Tạo Bài Tập
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <EditOutlined />
            <span>Chỉnh Sửa Bài Tập</span>
          </div>
        }
        open={isEditAssignmentModalOpen}
        onCancel={() => {
          setIsEditAssignmentModalOpen(false);
          setEditingAssignment(null);
          setAssignmentAttachmentList([]);
          editAssignmentForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        centered
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={editAssignmentForm}
          layout="vertical"
          onFinish={handleEditAssignment}
          requiredMark="optional"
          className="mt-4 space-y-4"
        >
          <Form.Item
            name="title"
            label={<span className="font-semibold text-xs uppercase">Tên bài tập</span>}
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
              name="due_date"
              label={<span className="font-semibold text-xs uppercase">Hạn nộp bài</span>}
            >
              <Input type="datetime-local" size="large" className="rounded-xl" />
            </Form.Item>

            <Form.Item
              name="estimated_hours"
              label={<span className="font-semibold text-xs uppercase">Số giờ ước tính</span>}
            >
              <InputNumber min={0} step={0.5} size="large" className="w-full rounded-xl" />
            </Form.Item>
          </div>

          <Form.Item
            name="status"
            label={<span className="font-semibold text-xs uppercase">Trạng thái</span>}
          >
            <Select size="large" className="rounded-xl">
              <Select.Option value="ACTIVE">Hoạt động (ACTIVE)</Select.Option>
              <Select.Option value="ARCHIVED">Lưu trữ (ARCHIVED)</Select.Option>
            </Select>
          </Form.Item>

          {/* Instructor Update File Attachment */}
          <Form.Item
            label={<span className="font-semibold text-xs uppercase">Cập nhật tập tin đề bài / Tài liệu đính kèm</span>}
          >
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
          </Form.Item>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => {
                setIsEditAssignmentModalOpen(false);
                setEditingAssignment(null);
                setAssignmentAttachmentList([]);
                editAssignmentForm.resetFields();
              }}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submittingAssignment}
              className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white font-semibold"
            >
              Lưu Thay Đổi
            </Button>
          </div>
        </Form>
      </Modal>

      {/* View Assignment Detail, Checklist & Student Submission Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <BookOutlined />
            <span>Chi Tiết Bài Tập, Checklist &amp; Nộp Bài</span>
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
        width={760}
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
                <Tag color={viewingAssignment.status === 'ACTIVE' ? 'blue' : 'default'} className="rounded-full text-xs border-0 font-semibold">
                  {viewingAssignment.status}
                </Tag>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                {viewingAssignment.due_date && (
                  <span>Deadline: <strong>{new Date(viewingAssignment.due_date).toLocaleString('vi-VN')}</strong></span>
                )}
                {viewingAssignment.estimated_hours !== undefined && (
                  <span>Ước tính: <strong>{viewingAssignment.estimated_hours} giờ</strong></span>
                )}
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className="text-xs font-semibold uppercase text-slate-400 m-0 mb-1">Mô tả bài tập</h4>
              <p className="text-sm leading-relaxed m-0 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {viewingAssignment.description || 'Không có mô tả.'}
              </p>

              {/* Reference Document Download */}
              {viewingAssignment.attachment_file_name && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <PaperClipOutlined className="text-emerald-500" />
                    <span>Tài liệu đính kèm từ giảng viên: <strong>{viewingAssignment.attachment_file_name}</strong></span>
                  </span>
                  <Button
                    type="primary"
                    size="small"
                    icon={<DownloadOutlined />}
                    loading={downloadingAttachmentId === viewingAssignment.id}
                    onClick={() => handleDownloadAssignmentAttachment(viewingAssignment.id, viewingAssignment.attachment_file_name!)}
                    className="rounded-lg text-xs bg-minecraft-grass hover:bg-emerald-600 text-white"
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
                <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">
                  {viewingAssignment.progress_percentage || 0}% ({viewingAssignment.completed_checklist_count || 0}/{viewingAssignment.checklist_count || 0} mục)
                </span>
              </div>
              <Progress
                percent={viewingAssignment.progress_percentage || 0}
                strokeColor="#59B335"
              />
            </div>

            {/* Student Upload Submission Section */}
            {!isCourseOwner && (
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-emerald-950/60' : 'bg-emerald-50/40 border-emerald-100'} space-y-4`}>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base m-0 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <SendOutlined />
                    <span>Nộp Bài Tập (Student Submission)</span>
                  </h4>
                  {mySubmission ? (
                    <Tag color="success" icon={<CheckCircleOutlined />} className="rounded-full px-3 py-0.5 text-xs border-0 font-bold">
                      ĐÃ NỘP BÀI
                    </Tag>
                  ) : (
                    <Tag color="default" className="rounded-full px-3 py-0.5 text-xs border-0 font-semibold text-slate-500">
                      CHƯA NỘP
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
                            <span className="font-bold text-emerald-600">Điểm: {mySubmission.score}</span>
                          )}
                        </div>

                        {mySubmission.file_name && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <PaperClipOutlined className="text-emerald-500" />
                              <span>{mySubmission.file_name}</span>
                            </span>
                            <Button
                              type="dashed"
                              size="small"
                              icon={<DownloadOutlined />}
                              loading={downloadingSubmissionId === mySubmission.id}
                              onClick={() => handleDownloadSubmissionFile(mySubmission.id, mySubmission.file_name!)}
                              className="rounded-lg text-xs border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400"
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

                    {/* Submission Upload Controls */}
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
                          className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white font-semibold"
                        >
                          {mySubmission ? 'Cập Nhật Bài Nộp' : 'Nộp Bài Tập'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Checklist Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-base m-0 flex items-center gap-2">
                  <CheckSquareOutlined className="text-emerald-500" />
                  <span>Danh sách Checklist ({viewingAssignment.checklists?.length || 0})</span>
                </h4>
              </div>

              {/* Instructor Form to Add Checklist */}
              {isCourseOwner && (
                <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-emerald-50/50 border-emerald-100'}`}>
                  <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                    Thêm mục checklist mới (Giảng viên)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Tiêu đề mục (Ví dụ: Thiết kế Database schema)"
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      className="rounded-xl"
                    />
                    <Input
                      placeholder="Mô tả phụ (Tùy chọn)"
                      value={newChecklistDesc}
                      onChange={(e) => setNewChecklistDesc(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      loading={submittingChecklist}
                      onClick={handleAddChecklist}
                      disabled={!newChecklistTitle.trim()}
                      className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white font-semibold text-xs"
                    >
                      Thêm Mục
                    </Button>
                  </div>
                </div>
              )}

              {/* Checklist Items List */}
              {(!viewingAssignment.checklists || viewingAssignment.checklists.length === 0) ? (
                <Empty description={<span className="text-xs text-slate-400">Bài tập này chưa có mục checklist nào.</span>} />
              ) : (
                <div className="space-y-2">
                  {viewingAssignment.checklists.map((chk, idx) => {
                    const isEditing = editingChecklistId === chk.id;
                    const isToggling = togglingChecklistId === chk.id;

                    return (
                      <div
                        key={chk.id}
                        className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                          chk.completed
                            ? isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/60 border-emerald-200'
                            : isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex-1 space-y-2">
                            <Input
                              value={editChecklistTitle}
                              onChange={(e) => setEditChecklistTitle(e.target.value)}
                              className="rounded-xl"
                            />
                            <Input
                              value={editChecklistDesc}
                              onChange={(e) => setEditChecklistDesc(e.target.value)}
                              placeholder="Mô tả..."
                              className="rounded-xl"
                            />
                            <div className="flex gap-2">
                              <Button size="small" type="primary" onClick={() => handleUpdateChecklist(chk.id)}>Lưu</Button>
                              <Button size="small" onClick={() => setEditingChecklistId(null)}>Hủy</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Student Checkbox */}
                            <Checkbox
                              checked={chk.completed}
                              disabled={isCourseOwner || isToggling}
                              onChange={(e) => handleToggleChecklistComplete(chk, e.target.checked)}
                              className="mt-0.5 shrink-0"
                            />

                            <div className="min-w-0">
                              <div className={`font-semibold text-sm ${chk.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                {idx + 1}. {chk.title}
                              </div>
                              {chk.description && (
                                <p className="text-xs text-slate-400 m-0 mt-0.5">{chk.description}</p>
                              )}
                              {chk.completed && chk.completed_at && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
                                  ✓ Hoàn thành lúc: {new Date(chk.completed_at).toLocaleString('vi-VN')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Instructor Controls */}
                        {isCourseOwner && !isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Tooltip title="Di chuyển lên">
                              <Button
                                type="text"
                                size="small"
                                icon={<UpOutlined />}
                                disabled={idx === 0}
                                onClick={() => handleReorderChecklist(chk.id, 'up')}
                              />
                            </Tooltip>
                            <Tooltip title="Di chuyển xuống">
                              <Button
                                type="text"
                                size="small"
                                icon={<DownOutlined />}
                                disabled={idx === viewingAssignment.checklists!.length - 1}
                                onClick={() => handleReorderChecklist(chk.id, 'down')}
                              />
                            </Tooltip>
                            <Tooltip title="Sửa">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                  setEditingChecklistId(chk.id);
                                  setEditChecklistTitle(chk.title);
                                  setEditChecklistDesc(chk.description || '');
                                }}
                              />
                            </Tooltip>
                            <Popconfirm
                              title="Xóa mục này?"
                              onConfirm={() => handleDeleteChecklist(chk.id)}
                              okText="Xóa"
                              cancelText="Hủy"
                              okButtonProps={{ danger: true }}
                            >
                              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Instructor Submissions Roster Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <FolderOpenOutlined />
            <span>Danh Sách Bài Nộp Sinh Viên</span>
          </div>
        }
        open={submissionsModalOpen}
        onCancel={() => {
          setSubmissionsModalOpen(false);
          setAssignmentSubmissions([]);
          setSelectedAssignmentForSubmissions(null);
        }}
        footer={[
          <Button key="close" onClick={() => setSubmissionsModalOpen(false)} className="rounded-xl">
            Đóng
          </Button>,
        ]}
        centered
        width={760}
        className="rounded-2xl overflow-hidden"
      >
        {selectedAssignmentForSubmissions && (
          <div className="mt-4 space-y-4">
            <div className="border-b pb-3">
              <h4 className="font-bold text-base m-0">{selectedAssignmentForSubmissions.title}</h4>
              <p className="text-xs text-slate-400 m-0 mt-1">Tổng cộng {assignmentSubmissions.length} lượt nộp bài</p>
            </div>

            {loadingSubmissionsRoster ? (
              <div className="py-12 text-center">
                <Spin />
                <p className="text-xs text-slate-400 mt-2">Đang tải danh sách nộp bài...</p>
              </div>
            ) : assignmentSubmissions.length === 0 ? (
              <Empty description="Chưa có sinh viên nào nộp bài tập này." />
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {assignmentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{sub.student_name || 'Sinh viên'}</span>
                        <span className="text-xs text-slate-400 font-normal">({sub.student_email})</span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Nộp lúc: <strong>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('vi-VN') : '---'}</strong></span>
                        <Tag color="success" className="rounded-full border-0 text-[10px]">
                          {sub.status.toUpperCase()}
                        </Tag>
                      </div>

                      {sub.submission_text && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 m-0 pt-1 italic">
                          &quot;{sub.submission_text}&quot;
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {sub.file_name && sub.has_file ? (
                        <Button
                          type="primary"
                          icon={<DownloadOutlined />}
                          loading={downloadingSubmissionId === sub.id}
                          onClick={() => handleDownloadSubmissionFile(sub.id, sub.file_name!)}
                          className="rounded-xl text-xs bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white font-semibold"
                        >
                          Tải Tập Tin ({sub.file_name})
                        </Button>
                      ) : sub.file_name ? (
                        <Tooltip title="Bài nộp này khởi tạo trước khi nâng cấp lưu tệp. Vui lòng yêu cầu sinh viên chọn tập tin và nộp lại.">
                          <Tag color="warning" className="rounded-full px-3 py-1 text-xs border-0 font-semibold">
                            Tệp chưa lưu storage ({sub.file_name})
                          </Tag>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Không gửi file đính kèm</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Instructor Analytics Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
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
              <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Tổng sinh viên ghi danh</span>
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{analyticsData.total_enrolled_students}</span>
              </div>

              <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/50 border-amber-100'}`}>
                <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Tỷ lệ hoàn thành trung bình</span>
                <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{analyticsData.average_completion_percentage}%</span>
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
