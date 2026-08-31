import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Button,
  Input,
  Tag,
  Spin,
  message,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  UploadOutlined,
  SyncOutlined,
  RightOutlined,
  FormOutlined,
  MessageOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { assignmentService } from '../services/assignmentService';
import {
  Assignment,
  AssignmentQuestion,
  PriorityLevel,
  Submission,
} from '../types/assignment';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; badgeBg: string }> = {
  LOW: { label: 'Thấp', badgeBg: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  MEDIUM: { label: 'Trung bình', badgeBg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' },
  HIGH: { label: 'Cao', badgeBg: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  CRITICAL: { label: 'Khẩn cấp', badgeBg: 'bg-rose-500/10 text-rose-500 border-rose-500/30' },
};

interface ParsedFeedback {
  questionScores: Record<string, number>;
  questionFeedbacks: Record<string, string>;
  generalFeedback: string;
}

export const AssignmentDetailPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Student Answers per Question (question_id -> selected_option_id or text)
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});

  // General Submission Notes & File
  const [submissionText, setSubmissionText] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Parse structured feedback JSON if present
  const parsedFeedback = useMemo<ParsedFeedback | null>(() => {
    if (!mySubmission?.feedback) return null;
    try {
      const parsed = JSON.parse(mySubmission.feedback);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          questionScores: parsed.questionScores || {},
          questionFeedbacks: parsed.questionFeedbacks || {},
          generalFeedback: parsed.generalFeedback || '',
        };
      }
    } catch (e) {
      // If feedback string is raw text
    }
    return {
      questionScores: {},
      questionFeedbacks: {},
      generalFeedback: mySubmission.feedback,
    };
  }, [mySubmission?.feedback]);

  // Helper to parse student answers from submission text
  const parseStudentAnswersFromSubmissionText = (text: string, questionsList: AssignmentQuestion[]) => {
    const result: Record<string, string> = {};
    if (!text || !questionsList || questionsList.length === 0) return result;

    const lines = text.split('\n');
    questionsList.forEach((q, idx) => {
      const prefix = `Câu ${idx + 1}:`;
      for (const line of lines) {
        if (line.startsWith(prefix)) {
          const ansContent = line.replace(prefix, '').trim();
          if (q.question_type === 'MULTIPLE_CHOICE' && q.options) {
            const matchedOpt = q.options.find(
              (opt) => opt.option_text.trim().toLowerCase() === ansContent.toLowerCase() || opt.id === ansContent
            );
            result[q.id] = matchedOpt ? matchedOpt.id : ansContent;
          } else {
            result[q.id] = ansContent;
          }
        }
      }
    });
    return result;
  };

  const fetchDetail = async () => {
    if (!assignmentId) return;
    setLoading(true);
    setError(null);
    try {
      const [assignData, subData] = await Promise.all([
        assignmentService.getAssignmentDetail(assignmentId),
        assignmentService.getMySubmission(assignmentId).catch(() => null),
      ]);
      setAssignment(assignData);
      setMySubmission(subData);

      if (subData?.submission_text) {
        setSubmissionText(subData.submission_text);
        if (assignData.questions && assignData.questions.length > 0) {
          const parsed = parseStudentAnswersFromSubmissionText(subData.submission_text, assignData.questions);
          setStudentAnswers(parsed);
        }
      }
    } catch (err: any) {
      console.error('Fetch assignment detail error:', err);
      setError(err.response?.data?.detail || 'Không thể tải thông tin bài tập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [assignmentId]);

  // Submit Assignment Solution
  const handleSubmitAssignment = async () => {
    if (!assignmentId || !assignment) return;

    // Format answers from question forms
    let formattedAnswersText = '';
    if (assignment.questions && assignment.questions.length > 0) {
      const answerLines: string[] = [];
      assignment.questions.forEach((q, idx) => {
        const ansVal = studentAnswers[q.id];
        if (ansVal !== undefined && ansVal !== null && String(ansVal).trim() !== '') {
          if (q.question_type === 'MULTIPLE_CHOICE' && q.options) {
            const selectedOpt = q.options.find((opt) => opt.id === ansVal || opt.option_text === ansVal);
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

    const hasFile = !!uploadFile;
    const hasNotes = submissionText.trim().length > 0;
    const hasAnswers = formattedAnswersText.length > 0;

    if (!hasFile && !hasNotes && !hasAnswers) {
      message.warning('Vui lòng trả lời câu hỏi trắc nghiệm/tự luận, nhập nội dung bài nộp hoặc chọn tệp đính kèm.');
      return;
    }

    const finalSubmissionText = submissionText.trim()
      ? (formattedAnswersText ? `${submissionText.trim()}\n\n${formattedAnswersText}` : submissionText.trim())
      : formattedAnswersText;

    setSubmitting(true);
    try {
      const res = await assignmentService.submitAssignment(assignmentId, uploadFile, finalSubmissionText);
      setMySubmission(res);
      message.success('Nộp bài tập thành công! 🎉');
      fetchDetail();
    } catch (err: any) {
      console.error('Submit assignment error:', err);
      message.error(err.response?.data?.detail || 'Lỗi khi nộp bài tập.');
    } finally {
      setSubmitting(false);
    }
  };

  // Undo Turn-in
  const handleUndoTurnIn = async () => {
    if (!assignmentId) return;
    setSubmitting(true);
    try {
      const res = await assignmentService.undoTurnIn(assignmentId);
      setMySubmission(res);
      message.success('Đã hoàn tác nộp bài. Bạn có thể chỉnh sửa lại.');
      fetchDetail();
    } catch (err: any) {
      console.error('Undo turn in error:', err);
      message.error(err.response?.data?.detail || 'Không thể hoàn tác nộp bài.');
    } finally {
      setSubmitting(false);
    }
  };

  // Deadline relative badge
  const renderDeadlineBadge = (dueDateStr?: string | null) => {
    if (!dueDateStr) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <ClockCircleOutlined /> Không có hạn
        </span>
      );
    }

    const now = dayjs();
    const due = dayjs(dueDateStr);
    const diffDays = due.diff(now, 'day');
    const diffHours = due.diff(now, 'hour');

    if (due.isBefore(now)) {
      const pastDays = Math.abs(diffDays);
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border-2 border-rose-500/30 shadow-voxel-sm shadow-rose-900/20">
          <ExclamationCircleOutlined /> Quá hạn {pastDays > 0 ? `${pastDays} ngày` : 'hôm nay'}
        </span>
      );
    }

    if (diffHours < 24) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border-2 border-amber-500/30 shadow-voxel-sm shadow-amber-900/20">
          <ClockCircleOutlined className="text-amber-500" /> Hạn hôm nay ({due.format('HH:mm')})
        </span>
      );
    }

    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500/30 shadow-voxel-sm shadow-emerald-900/20">
          <CalendarOutlined /> Hạn ngày mai ({due.format('HH:mm')})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700">
        <CalendarOutlined className="text-emerald-500" /> Còn {diffDays} ngày ({due.format('DD/MM/YYYY')})
      </span>
    );
  };

  // Status tag
  const renderStatusTag = (statusStr?: string | null) => {
    const st = statusStr || 'NOT_STARTED';
    if (st === 'COMPLETED' || st === 'SUBMITTED' || st === 'GRADED') {
      return (
        <span className="badge-voxel-green text-xs font-extrabold">
          <CheckCircleOutlined /> Đã hoàn thành
        </span>
      );
    }
    if (st === 'IN_PROGRESS') {
      return (
        <span className="badge-voxel-sky text-xs font-extrabold">
          <SyncOutlined spin /> Đang thực hiện
        </span>
      );
    }
    return (
      <span className="badge-voxel-gold text-xs font-extrabold">
        <ClockCircleOutlined /> Cần làm
      </span>
    );
  };

  const isSubmitted = Boolean(mySubmission && mySubmission.status !== 'unsubmitted' && mySubmission.status !== 'NOT_SUBMITTED');

  // Compute answered questions count
  const questionsCount = assignment?.questions?.length || 0;
  const answeredCount = assignment?.questions
    ? assignment.questions.filter((q) => studentAnswers[q.id] && String(studentAnswers[q.id]).trim() !== '').length
    : 0;

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#0F1710] text-[#F2F9F3]' : 'bg-[#FDFBF7] text-slate-900'}`}>
      <Sidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <button
            onClick={() => navigate('/assignments')}
            className="hover:text-emerald-500 transition-colors flex items-center gap-1"
          >
            <ArrowLeftOutlined /> Bài tập
          </button>
          <RightOutlined className="text-[10px] opacity-60" />
          {assignment && (
            <>
              <Link
                to={`/courses/${assignment.course_id}`}
                className="hover:text-emerald-500 transition-colors truncate max-w-[200px]"
              >
                {assignment.course_code || assignment.course_title || 'Khóa học'}
              </Link>
              <RightOutlined className="text-[10px] opacity-60" />
              <span className="text-slate-900 dark:text-white font-bold truncate max-w-[250px]">
                {assignment.title}
              </span>
            </>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-24 text-center space-y-3 card-voxel-3d">
            <Spin size="large" />
            <p className="text-xs font-bold text-slate-400 mt-2">Đang tải thông tin bài tập...</p>
          </div>
        ) : error || !assignment ? (
          <div className="card-voxel-3d text-center p-8 space-y-4">
            <ExclamationCircleOutlined className="text-3xl text-rose-500" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{error || 'Không tìm thấy bài tập'}</p>
            <button onClick={() => navigate('/assignments')} className="btn-voxel-green text-xs px-4 py-2 mx-auto">
              Quay lại danh sách bài tập
            </button>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="card-voxel-3d p-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-voxel-green text-xs font-bold">
                    <BookOutlined className="mr-1" />
                    {assignment.course_code || assignment.course_title || 'Khóa học'}
                  </span>
                  {renderStatusTag(assignment.progress_status)}
                  {renderDeadlineBadge(assignment.due_date)}
                  {assignment.priority && (
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border-2 ${
                      (PRIORITY_CONFIG[assignment.priority] || PRIORITY_CONFIG.MEDIUM).badgeBg
                    }`}>
                      {(PRIORITY_CONFIG[assignment.priority] || PRIORITY_CONFIG.MEDIUM).label}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-black text-slate-900 dark:text-white m-0">
                  {assignment.title}
                </h1>

                {assignment.course_title && assignment.course_code && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold m-0">
                    Môn học: {assignment.course_title}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (Main Content) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Assignment Description Card */}
                <div className="card-voxel-3d space-y-4 p-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 m-0 flex items-center gap-2">
                    <FileTextOutlined className="text-emerald-500" />
                    Mô tả bài tập
                  </h2>

                  {assignment.description ? (
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap m-0">
                      {assignment.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic m-0">Không có mô tả chi tiết cho bài tập này.</p>
                  )}

                  {/* Attachment File Download if exists */}
                  {assignment.attachment_file_name && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                      <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Tài liệu đính kèm</h3>
                      <div className="p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileTextOutlined className="text-emerald-500 text-xl shrink-0" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {assignment.attachment_file_name}
                          </span>
                        </div>
                        <Button
                          type="primary"
                          icon={<DownloadOutlined />}
                          onClick={() => assignmentService.downloadAttachment(assignment.id, assignment.attachment_file_name!)}
                        >
                          Tải về
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive Questions Section (Multiple Choice / Essay / Short Answer) */}
                {questionsCount > 0 && (
                  <div className="card-voxel-3d space-y-5 p-6">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 m-0 flex items-center gap-2">
                        <FormOutlined className="text-emerald-500 text-base" />
                        Nội dung bài tập & Câu hỏi ({questionsCount} câu)
                      </h2>

                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Đã làm: {answeredCount} / {questionsCount} câu
                      </span>
                    </div>

                    <div className="space-y-6">
                      {assignment.questions!.map((q, idx) => {
                        const isMC = q.question_type === 'MULTIPLE_CHOICE';
                        const currentAns = studentAnswers[q.id];
                        const qScore = parsedFeedback?.questionScores?.[q.id];
                        const qFeedback = parsedFeedback?.questionFeedbacks?.[q.id];
                        const isGraded = qScore !== undefined;

                        return (
                          <div
                            key={q.id}
                            className={`p-5 rounded-2xl border space-y-3 transition-all ${
                              isGraded
                                ? qScore > 0
                                  ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/40'
                                  : 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/40'
                                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                                  Câu {idx + 1} ({q.points} điểm)
                                </span>
                                {isGraded && (
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 ${
                                    qScore > 0
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                  }`}>
                                    {qScore > 0 ? <CheckOutlined /> : <CloseOutlined />}
                                    {qScore > 0 ? `Đúng (+${qScore}/${q.points}đ)` : `Sai (0/${q.points}đ)`}
                                  </span>
                                )}
                              </div>

                              <span className="text-slate-400 uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 shrink-0">
                                {isMC ? 'Trắc nghiệm 1 đáp án' : q.question_type === 'ESSAY' ? 'Tự luận' : 'Câu hỏi ngắn'}
                              </span>
                            </div>

                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 m-0 leading-relaxed">
                              {q.question_text}
                            </p>

                            {/* Multiple Choice Options Single Choice */}
                            {isMC && q.options && q.options.length > 0 && (
                              <div className="space-y-2 pt-2">
                                {q.options.map((opt) => {
                                  const isSelected = currentAns === opt.id || currentAns === opt.option_text;
                                  const isCorrectOpt = opt.is_correct;

                                  // Highlight styles when submitted/graded
                                  let optionCardStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50';
                                  if (isSubmitted) {
                                    if (isCorrectOpt) {
                                      optionCardStyle = 'bg-emerald-500/15 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-extrabold shadow-sm';
                                    } else if (isSelected && !isCorrectOpt) {
                                      optionCardStyle = 'bg-rose-500/15 border-2 border-rose-500 text-rose-700 dark:text-rose-300 font-extrabold shadow-sm';
                                    } else if (isSelected) {
                                      optionCardStyle = 'bg-emerald-500/15 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-extrabold shadow-sm';
                                    }
                                  } else if (isSelected) {
                                    optionCardStyle = 'bg-emerald-500/10 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm';
                                  }

                                  return (
                                    <div
                                      key={opt.id}
                                      onClick={() => {
                                        if (!isSubmitted) {
                                          setStudentAnswers((prev) => ({ ...prev, [q.id]: opt.id }));
                                        }
                                      }}
                                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                                        isSubmitted ? 'cursor-default' : 'cursor-pointer'
                                      } ${optionCardStyle}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                          isSubmitted && isCorrectOpt
                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                            : isSubmitted && isSelected && !isCorrectOpt
                                            ? 'border-rose-500 bg-rose-500 text-white'
                                            : isSelected
                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                            : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                          {isSubmitted && isCorrectOpt && <CheckOutlined className="text-xs" />}
                                          {isSubmitted && isSelected && !isCorrectOpt && <CloseOutlined className="text-xs" />}
                                          {!isSubmitted && isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                        <span className="text-xs font-semibold">{opt.option_text}</span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        {isSubmitted && isCorrectOpt && (
                                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500 text-white">
                                            ✓ Đáp án đúng
                                          </span>
                                        )}
                                        {isSubmitted && isSelected && !isCorrectOpt && (
                                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-500 text-white">
                                            ✗ Đã chọn (Sai)
                                          </span>
                                        )}
                                        {!isSubmitted && isSelected && (
                                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                            Đã chọn
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Essay / Short Answer Input */}
                            {(!isMC) && (
                              <div className="pt-2">
                                <Input.TextArea
                                  rows={q.question_type === 'ESSAY' ? 4 : 2}
                                  placeholder="Nhập câu trả lời bài tự luận của bạn tại đây..."
                                  disabled={isSubmitted}
                                  value={currentAns || ''}
                                  onChange={(e) => {
                                    if (!isSubmitted) {
                                      const val = e.target.value;
                                      setStudentAnswers((prev) => ({ ...prev, [q.id]: val }));
                                    }
                                  }}
                                  className="text-xs rounded-xl"
                                />
                              </div>
                            )}

                            {/* Per Question Instructor Feedback */}
                            {qFeedback && (
                              <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 font-medium">
                                💬 Nhận xét: {qFeedback}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submission Workspace Card */}
                <div className="card-voxel-3d space-y-4 p-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 m-0 flex items-center gap-2">
                    <UploadOutlined className="text-emerald-500" />
                    Nộp bài làm
                  </h2>

                  {isSubmitted && mySubmission ? (
                    <div className="p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-sm">
                          <CheckCircleOutlined className="text-base" /> Đã nộp bài
                        </span>
                        {mySubmission.submitted_at && (
                          <span className="text-xs text-slate-500 font-medium">
                            {dayjs(mySubmission.submitted_at).format('DD/MM/YYYY HH:mm')}
                          </span>
                        )}
                      </div>

                      {mySubmission.score !== null && mySubmission.score !== undefined && (
                        <div className="p-3 rounded-xl bg-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                          <span>Kết quả chấm điểm:</span>
                          <span className="text-sm font-black">{mySubmission.score} điểm</span>
                        </div>
                      )}

                      {mySubmission.file_name && (
                        <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="truncate">📄 Tệp đã nộp: {mySubmission.file_name}</span>
                          <Button
                            size="small"
                            type="link"
                            icon={<DownloadOutlined />}
                            onClick={() => mySubmission?.file_name && assignmentService.downloadSubmissionFile(mySubmission.id, mySubmission.file_name)}
                          >
                            Tải về
                          </Button>
                        </div>
                      )}

                      {mySubmission.submission_text && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">Nội dung câu trả lời:</span>
                          <div className="text-xs bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">
                            {mySubmission.submission_text}
                          </div>
                        </div>
                      )}

                      {/* Clean Human-Readable Instructor / System Feedback */}
                      {mySubmission.feedback && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-xs space-y-2">
                          <p className="font-extrabold text-amber-600 dark:text-amber-400 m-0 flex items-center gap-1.5 text-sm">
                            <MessageOutlined /> Nhận xét từ Giảng viên / Hệ thống:
                          </p>

                          {parsedFeedback?.generalFeedback ? (
                            <p className="m-0 text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                              {parsedFeedback.generalFeedback}
                            </p>
                          ) : (
                            <p className="m-0 text-slate-700 dark:text-slate-300 italic font-medium">
                              Bài nộp đã được hệ thống chấm điểm tự động. Bạn có thể xem lại chi tiết đáp án đúng và điểm từng câu ở phần Danh sách câu hỏi.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <Popconfirm
                          title="Hoàn tác nộp bài?"
                          description="Bạn có chắc chắn muốn mở lại bài nộp để chỉnh sửa?"
                          onConfirm={handleUndoTurnIn}
                          okText="Hoàn tác"
                          cancelText="Hủy"
                        >
                          <Button size="small" loading={submitting}>
                            Hoàn tác nộp bài
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Ghi chú bổ sung (nếu có):
                        </label>
                        <Input.TextArea
                          rows={3}
                          placeholder="Nhập ghi chú thêm cho bài nộp..."
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          className="rounded-xl text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                          Tệp đính kèm bài nộp (nếu có):
                        </label>
                        <input
                          type="file"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="text-xs text-slate-500"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          {questionsCount > 0
                            ? `Đã trả lời ${answeredCount} / ${questionsCount} câu hỏi.`
                            : ''}
                        </span>

                        <Button
                          type="primary"
                          icon={<UploadOutlined />}
                          loading={submitting}
                          onClick={handleSubmitAssignment}
                          className="btn-voxel-green text-xs px-6 py-2"
                        >
                          Nộp bài tập
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (Information Panel) */}
              <div className="space-y-6">
                <div className="card-voxel-3d space-y-4 sticky top-6 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 m-0 border-b border-slate-200 dark:border-slate-800 pb-3">
                    Thông tin bài tập
                  </h3>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Môn học</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {assignment.course_title || assignment.course_code || 'Chưa cập nhật'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Hạn nộp bài</span>
                      <div>{renderDeadlineBadge(assignment.due_date)}</div>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Trạng thái</span>
                      <div>{renderStatusTag(assignment.progress_status)}</div>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Tình trạng nộp bài</span>
                      <span className={`font-bold ${isSubmitted ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {isSubmitted ? 'Đã nộp bài' : 'Chưa nộp bài'}
                      </span>
                    </div>

                    {questionsCount > 0 && (
                      <div>
                        <span className="text-slate-400 block mb-0.5">Số lượng câu hỏi</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {questionsCount} câu ({answeredCount} câu đã làm)
                        </span>
                      </div>
                    )}

                    {mySubmission && mySubmission.score !== null && mySubmission.score !== undefined && (
                      <div>
                        <span className="text-slate-400 block mb-0.5">Điểm số</span>
                        <span className="font-black text-emerald-500 text-sm">{mySubmission.score} điểm</span>
                      </div>
                    )}

                    {assignment.estimated_hours && (
                      <div>
                        <span className="text-slate-400 block mb-0.5">Thời gian ước tính</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          ⏱ {assignment.estimated_hours} giờ
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400 block mb-0.5">Ngày đăng</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {dayjs(assignment.created_at).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => navigate(`/courses/${assignment.course_id}`)}
                      className="btn-voxel-green text-xs w-full py-2.5 flex items-center justify-center gap-2"
                    >
                      <BookOutlined />
                      <span>Đến trang môn học</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AssignmentDetailPage;
