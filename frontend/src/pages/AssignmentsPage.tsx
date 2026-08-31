import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Input,
  Select,
  Spin,
  Empty,
  Button,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { assignmentService } from '../services/assignmentService';
import {
  Assignment,
  PriorityLevel,
} from '../types/assignment';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; badgeClass: string; dotClass: string }> = {
  LOW: {
    label: 'Thấp',
    badgeClass: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  MEDIUM: {
    label: 'Trung bình',
    badgeClass: 'border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    dotClass: 'bg-sky-500',
  },
  HIGH: {
    label: 'Cao',
    badgeClass: 'border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  CRITICAL: {
    label: 'Khẩn cấp',
    badgeClass: 'border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    dotClass: 'bg-rose-500',
  },
};

export const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { themeMode } = useTheme();
  const navigate = useNavigate();
  const isDark = themeMode === 'dark';

  const isInstructor = user?.roles?.includes('instructor') || user?.roles?.includes('admin');

  // Data & Loading states
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search & Sort states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('due_asc');

  // Fetch all assignments for user
  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assignmentService.getAllAssignments();
      setAssignments(data);
    } catch (err: any) {
      console.error('Fetch assignments failed:', err);
      setError(err.response?.data?.detail || 'Không thể tải danh sách bài tập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Compute overview statistics
  const stats = useMemo(() => {
    const total = assignments.length;
    let todo = 0;
    let inProgress = 0;
    let dueSoon = 0;
    let completed = 0;

    const now = dayjs();

    assignments.forEach((a) => {
      const st = a.progress_status || 'NOT_STARTED';
      const isDone = st === 'COMPLETED' || st === 'SUBMITTED' || st === 'GRADED';

      if (isDone) {
        completed += 1;
      } else if (st === 'IN_PROGRESS') {
        inProgress += 1;
        todo += 1;
      } else {
        todo += 1;
      }

      // Check if due soon or overdue
      if (!isDone && a.due_date) {
        const due = dayjs(a.due_date);
        const diffDays = due.diff(now, 'day');
        if (due.isBefore(now) || diffDays <= 3) {
          dueSoon += 1;
        }
      }
    });

    return { total, todo, inProgress, dueSoon, completed };
  }, [assignments]);

  // Extract unique course options for dropdown filter
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((a) => {
      const courseId = a.course_id;
      const courseLabel = a.course_title
        ? (a.course_code ? `${a.course_code} - ${a.course_title}` : a.course_title)
        : `Môn học (${courseId.slice(0, 6)}...)`;
      map.set(courseId, courseLabel);
    });
    const opts = [{ value: 'ALL', label: 'Tất cả môn học' }];
    map.forEach((label, id) => {
      opts.push({ value: id, label });
    });
    return opts;
  }, [assignments]);

  // Filtered & Sorted Assignments List
  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((a) => {
        // Search matching title or course
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = a.title.toLowerCase().includes(q);
          const matchCourse = a.course_title?.toLowerCase().includes(q) || a.course_code?.toLowerCase().includes(q);
          const matchDesc = a.description?.toLowerCase().includes(q);
          if (!matchTitle && !matchCourse && !matchDesc) return false;
        }

        // Course filter
        if (selectedCourse !== 'ALL' && a.course_id !== selectedCourse) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'ALL') {
          const st = a.progress_status || 'NOT_STARTED';
          if (selectedStatus === 'TODO' && st !== 'NOT_STARTED') return false;
          if (selectedStatus === 'IN_PROGRESS' && st !== 'IN_PROGRESS') return false;
          if (selectedStatus === 'COMPLETED' && (st !== 'COMPLETED' && st !== 'SUBMITTED' && st !== 'GRADED')) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'due_asc') {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return dayjs(a.due_date).valueOf() - dayjs(b.due_date).valueOf();
        }
        if (sortBy === 'due_desc') {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return dayjs(b.due_date).valueOf() - dayjs(a.due_date).valueOf();
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'priority') {
          const weight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          const pA = weight[a.priority] || 0;
          const pB = weight[b.priority] || 0;
          return pB - pA;
        }
        return 0;
      });
  }, [assignments, searchQuery, selectedCourse, selectedStatus, sortBy]);

  // Deadline visualization badge
  const renderDeadlineBadge = (dueDateStr?: string | null) => {
    if (!dueDateStr) {
      return (
        <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          Không có hạn
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
        <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          Quá hạn {pastDays > 0 ? `${pastDays} ngày` : 'hôm nay'}
        </span>
      );
    }

    if (diffHours < 24) {
      return (
        <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          Hạn hôm nay ({due.format('HH:mm')})
        </span>
      );
    }

    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          Hạn ngày mai ({due.format('HH:mm')})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        Còn {diffDays} ngày ({due.format('DD/MM')})
      </span>
    );
  };

  // Status tag badge
  const renderStatusTag = (statusStr?: string | null) => {
    const st = statusStr || 'NOT_STARTED';
    if (st === 'COMPLETED' || st === 'SUBMITTED' || st === 'GRADED') {
      return (
        <span className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          Đã hoàn thành
        </span>
      );
    }
    if (st === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-lg border border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300">
          Đang làm
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300">
        Cần làm
      </span>
    );
  };

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#0F1710] text-[#F2F9F3]' : 'bg-[#FDFBF7] text-slate-900'}`}>
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header Bar */}
        <header
          className={`px-6 py-5 border-b sticky top-0 z-20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
            isDark ? 'bg-[#0F1710]/90 border-minecraft-obsidianBorder' : 'bg-[#FDFBF7]/90 border-amber-900/10'
          }`}
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight m-0 text-slate-900 dark:text-white">
              Bài tập
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0 font-medium">
              Theo dõi các bài tập, deadline và trạng thái hoàn thành.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <button
              onClick={fetchAssignments}
              disabled={loading}
              className="btn-voxel-green text-xs px-4 py-2 flex items-center gap-2"
              title="Tải lại danh sách bài tập"
            >
              <ReloadOutlined className={loading ? 'animate-spin' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Instructor Notice Banner */}
          {isInstructor && (
            <div className="card-voxel border-2 border-minecraft-goldBorder bg-amber-50/60 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Dành cho Giảng viên & Quản trị viên
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 m-0 mt-0.5">
                  Tạo bài tập mới, chỉnh sửa câu hỏi trắc nghiệm/tự luận và chấm điểm bài nộp của sinh viên được thực hiện trong trang chi tiết từng Khóa học.
                </p>
              </div>
              <button
                onClick={() => navigate('/courses')}
                className="btn-voxel-gold text-xs px-4 py-2 shrink-0 flex items-center gap-1.5"
              >
                <span>Quản lý Khóa học</span>
                <ArrowRightOutlined className="text-xs" />
              </button>
            </div>
          )}

          {/* 4 Clean Metric Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: All Assignments */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                isDark
                  ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder hover:border-minecraft-grassBorder'
                  : 'bg-white border-amber-900/15 hover:border-minecraft-grassBorder'
              } shadow-sm hover:shadow-md`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tất cả bài tập
              </span>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {stats.total}
                </span>
                <span className="text-xs text-slate-400 font-medium">Nhiệm vụ</span>
              </div>
            </div>

            {/* Card 2: Todo */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                isDark
                  ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder hover:border-amber-500'
                  : 'bg-white border-amber-900/15 hover:border-amber-500'
              } shadow-sm hover:shadow-md`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                Cần làm
              </span>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <span className="text-3xl font-extrabold text-amber-500">
                  {stats.todo}
                </span>
                <span className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium">Chờ nộp</span>
              </div>
            </div>

            {/* Card 3: Due Soon / Overdue */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                isDark
                  ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder hover:border-rose-500'
                  : 'bg-white border-amber-900/15 hover:border-rose-500'
              } shadow-sm hover:shadow-md`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
                Sắp đến hạn
              </span>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <span className="text-3xl font-extrabold text-rose-500">
                  {stats.dueSoon}
                </span>
                <span className="text-xs text-rose-600/80 dark:text-rose-400/80 font-medium">Hạn gấp / Quá hạn</span>
              </div>
            </div>

            {/* Card 4: Completed */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                isDark
                  ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder hover:border-emerald-500'
                  : 'bg-white border-amber-900/15 hover:border-emerald-500'
              } shadow-sm hover:shadow-md`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                Đã hoàn thành
              </span>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <span className="text-3xl font-extrabold text-emerald-500">
                  {stats.completed}
                </span>
                <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80 font-medium">Đã nộp bài</span>
              </div>
            </div>
          </div>

          {/* Filter & Search Control Panel */}
          <div className="card-voxel space-y-4 p-5">
            {/* Quick Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { key: 'ALL', label: 'Tất cả bài tập', count: stats.total },
                { key: 'TODO', label: 'Cần làm', count: stats.todo },
                { key: 'IN_PROGRESS', label: 'Đang làm', count: stats.inProgress },
                { key: 'COMPLETED', label: 'Đã hoàn thành', count: stats.completed },
              ].map((tab) => {
                const isActive = selectedStatus === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedStatus(tab.key)}
                    className={`text-xs py-2 px-3.5 shrink-0 rounded-xl font-bold transition-all ${
                      isActive
                        ? 'bg-white dark:bg-minecraft-obsidianCard border-2 border-minecraft-grassBorder text-emerald-700 dark:text-emerald-300 shadow-sm'
                        : 'bg-slate-100/80 dark:bg-slate-900/60 border-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${
                        isActive
                          ? 'bg-emerald-500 text-white font-extrabold'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + Dropdown Filters Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[240px]">
                <Input
                  prefix={<SearchOutlined className="text-slate-400 mr-1" />}
                  placeholder="Tìm theo tên bài tập, mã môn học, từ khóa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  className="rounded-xl text-xs py-2 border-2 border-slate-300 dark:border-minecraft-obsidianBorder focus:border-emerald-500"
                />
              </div>

              {/* Secondary Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                  <FilterOutlined className="text-emerald-500" />
                  <span>Bộ lọc:</span>
                </div>

                {/* Course Filter Dropdown */}
                <Select
                  value={selectedCourse}
                  onChange={setSelectedCourse}
                  options={courseOptions}
                  className="w-48 text-xs"
                />

                {/* Sort Control Dropdown */}
                <Select
                  value={sortBy}
                  onChange={setSortBy}
                  prefix={<SortAscendingOutlined className="text-amber-500" />}
                  options={[
                    { value: 'due_asc', label: 'Hạn nộp gần nhất' },
                    { value: 'due_desc', label: 'Hạn nộp xa nhất' },
                    { value: 'priority', label: 'Độ ưu tiên cao nhất' },
                    { value: 'title', label: 'Tên bài tập (A-Z)' },
                  ]}
                  className="w-52 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-50/90 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
              <span className="font-semibold">{error}</span>
              <button
                onClick={fetchAssignments}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-sm"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Assignments Cards Grid */}
          {loading ? (
            <div className="py-24 text-center space-y-3 card-voxel">
              <Spin size="large" />
              <p className="text-xs font-bold text-slate-400 mt-2 m-0">Đang tải danh sách bài tập...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="card-voxel py-16 text-center space-y-4">
              <Empty
                description={
                  <div className="space-y-1 mt-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 m-0">
                      {assignments.length === 0 ? 'Chưa có bài tập nào' : 'Không tìm thấy bài tập phù hợp'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      {assignments.length === 0
                        ? 'Bạn hiện chưa có bài tập nào được giao. Hãy khám phá khóa học hoặc kiểm tra lại sau.'
                        : 'Thử điều chỉnh từ khóa tìm kiếm hoặc chọn bộ lọc "Tất cả bài tập".'}
                    </p>
                  </div>
                }
              />
              {assignments.length === 0 && (
                <button
                  onClick={() => navigate('/courses')}
                  className="btn-voxel-green text-xs px-5 py-2.5 inline-flex items-center gap-2"
                >
                  <span>Khám phá Khóa học</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredAssignments.map((assignment) => {
                const priorityInfo = PRIORITY_CONFIG[assignment.priority] || PRIORITY_CONFIG.MEDIUM;
                const isDone =
                  assignment.progress_status === 'COMPLETED' ||
                  assignment.progress_status === 'SUBMITTED' ||
                  assignment.progress_status === 'GRADED';

                return (
                  <motion.div
                    key={assignment.id}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.15 }}
                    className="card-voxel flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div>
                      {/* Top Row: Course Badge + Status Tag */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 truncate max-w-[220px]">
                          {assignment.course_code || assignment.course_title || 'Khóa học'}
                        </span>

                        <div className="shrink-0">{renderStatusTag(assignment.progress_status)}</div>
                      </div>

                      {/* Assignment Title */}
                      <h3
                        onClick={() => navigate(`/assignments/${assignment.id}`)}
                        className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors cursor-pointer m-0 mb-1 leading-snug line-clamp-2"
                      >
                        {assignment.title}
                      </h3>

                      {/* Course Full Title Subtitle */}
                      {assignment.course_title && assignment.course_code && (
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mb-2.5 m-0">
                          {assignment.course_title}
                        </p>
                      )}

                      {/* Assignment Description Snippet */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3.5 leading-relaxed m-0">
                        {assignment.description || 'Chưa có mô tả chi tiết cho bài tập này.'}
                      </p>

                      {/* Badges Bar: Deadline & Priority & Questions */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {renderDeadlineBadge(assignment.due_date)}

                        {assignment.priority && (
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-lg ${priorityInfo.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dotClass}`} />
                            <span>{priorityInfo.label}</span>
                          </span>
                        )}

                        {assignment.question_count !== undefined && assignment.question_count > 0 && (
                          <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {assignment.question_count} câu hỏi
                          </span>
                        )}

                        {assignment.total_points !== undefined && assignment.total_points > 0 && (
                          <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
                            {assignment.total_points} điểm
                          </span>
                        )}

                        {assignment.estimated_hours && (
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {assignment.estimated_hours}h
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="text-xs text-slate-400 font-medium">
                        <span>
                          {assignment.created_at
                            ? `Giao: ${dayjs(assignment.created_at).format('DD/MM/YYYY')}`
                            : 'Đã giao'}
                        </span>
                      </div>

                      <button
                        onClick={() => navigate(`/assignments/${assignment.id}`)}
                        className={`${
                          isDone ? 'btn-voxel-sky' : 'btn-voxel-green'
                        } text-xs px-4 py-2 flex items-center gap-1.5`}
                      >
                        <span>{isDone ? 'Xem kết quả' : 'Xem chi tiết'}</span>
                        <ArrowRightOutlined className="text-xs" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AssignmentsPage;
