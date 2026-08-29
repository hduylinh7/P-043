import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Input,
  Select,
  Tag,
  Spin,
  Empty,
  Button,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BookOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  ArrowRightOutlined,
  SyncOutlined,
  ReloadOutlined,
  CheckSquareOutlined,
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
  PriorityLevel,
} from '../types/assignment';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; badgeBg: string }> = {
  LOW: { label: 'Thấp', badgeBg: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  MEDIUM: { label: 'Trung bình', badgeBg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' },
  HIGH: { label: 'Cao', badgeBg: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  CRITICAL: { label: 'Khẩn cấp', badgeBg: 'bg-rose-500/10 text-rose-500 border-rose-500/30' },
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

  // Compute compact overview statistics
  const stats = useMemo(() => {
    const total = assignments.length;
    let todo = 0;
    let dueSoon = 0;
    let completed = 0;

    const now = dayjs();

    assignments.forEach((a) => {
      const st = a.progress_status || 'NOT_STARTED';
      const isDone = st === 'COMPLETED' || st === 'SUBMITTED' || st === 'GRADED';

      if (isDone) {
        completed += 1;
      } else {
        todo += 1;

        // Check if due soon (due within 3 days and not overdue)
        if (a.due_date) {
          const due = dayjs(a.due_date);
          const diffDays = due.diff(now, 'day');
          if (due.isAfter(now) && diffDays <= 3) {
            dueSoon += 1;
          }
        }
      }
    });

    return { total, todo, dueSoon, completed };
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
        return 0;
      });
  }, [assignments, searchQuery, selectedCourse, selectedStatus, sortBy]);

  // Deadline relative visualization badge
  const renderDeadlineBadge = (dueDateStr?: string | null) => {
    if (!dueDateStr) {
      return <span className="text-xs text-slate-400">Không có hạn</span>;
    }

    const now = dayjs();
    const due = dayjs(dueDateStr);
    const diffDays = due.diff(now, 'day');
    const diffHours = due.diff(now, 'hour');

    if (due.isBefore(now)) {
      const pastDays = Math.abs(diffDays);
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/30">
          <ExclamationCircleOutlined /> Quá hạn {pastDays > 0 ? `${pastDays} ngày` : 'hôm nay'}
        </span>
      );
    }

    if (diffHours < 24) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <ClockCircleOutlined /> Hạn hôm nay ({due.format('HH:mm')})
        </span>
      );
    }

    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <CalendarOutlined /> Hạn ngày mai ({due.format('HH:mm')})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20">
        <CalendarOutlined /> Còn {diffDays} ngày ({due.format('DD/MM')})
      </span>
    );
  };

  // Status tag badge
  const renderStatusTag = (statusStr?: string | null) => {
    const st = statusStr || 'NOT_STARTED';
    if (st === 'COMPLETED' || st === 'SUBMITTED' || st === 'GRADED') {
      return (
        <Tag color="success" className="font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 m-0">
          <CheckCircleOutlined /> Đã nộp
        </Tag>
      );
    }
    if (st === 'IN_PROGRESS') {
      return (
        <Tag color="processing" className="font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 m-0">
          <SyncOutlined spin /> Đang làm
        </Tag>
      );
    }
    return (
      <Tag color="default" className="font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 m-0">
        <ClockCircleOutlined /> Cần làm
      </Tag>
    );
  };

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#0F1710] text-[#F2F9F3]' : 'bg-[#FDFBF7] text-slate-900'}`}>
      <Sidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-900/10 dark:border-minecraft-obsidianBorder pb-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2.5 m-0 text-slate-900 dark:text-white">
              <CheckSquareOutlined className="text-emerald-500" />
              Bài tập
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0 font-medium">
              Theo dõi các bài tập, deadline và trạng thái hoàn thành.
            </p>
          </div>

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAssignments}
            loading={loading}
            className="self-start sm:self-auto rounded-xl font-medium"
          >
            Làm mới
          </Button>
        </div>

        {/* Instructor Notice Banner */}
        {isInstructor && (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <BookOutlined className="text-base" />
              <span>Dành cho Giảng viên: Tạo mới, quản lý bài tập và chấm điểm bài nộp của sinh viên được thực hiện trong trang từng Khóa học.</span>
            </div>
            <Button size="small" type="primary" onClick={() => navigate('/courses')}>
              Quản lý Khóa học
            </Button>
          </div>
        )}

        {/* Compact Summary Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className={`p-3.5 rounded-2xl border transition-all ${isDark ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder' : 'bg-white border-amber-900/10 shadow-sm'
            }`}>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">Tất cả bài tập</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5 m-0">{stats.total}</p>
          </div>

          <div className={`p-3.5 rounded-2xl border transition-all ${isDark ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder' : 'bg-white border-amber-900/10 shadow-sm'
            }`}>
            <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider m-0">Cần làm</p>
            <p className="text-xl font-black text-amber-500 mt-0.5 m-0">{stats.todo}</p>
          </div>

          <div className={`p-3.5 rounded-2xl border transition-all ${isDark ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder' : 'bg-white border-amber-900/10 shadow-sm'
            }`}>
            <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider m-0">Sắp đến hạn</p>
            <p className="text-xl font-black text-rose-500 mt-0.5 m-0">{stats.dueSoon}</p>
          </div>

          <div className={`p-3.5 rounded-2xl border transition-all ${isDark ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder' : 'bg-white border-amber-900/10 shadow-sm'
            }`}>
            <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider m-0">Đã hoàn thành</p>
            <p className="text-xl font-black text-emerald-500 mt-0.5 m-0">{stats.completed}</p>
          </div>
        </div>

        {/* Clean Search / Filter / Sort Toolbar */}
        <div className={`p-3.5 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${isDark ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder' : 'bg-white border-amber-900/10 shadow-sm'
          }`}>
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm kiếm bài tập..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="rounded-xl text-xs py-1.5"
            />
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mr-1">
              <FilterOutlined /> Lọc:
            </span>

            {/* Course Filter */}
            <Select
              value={selectedCourse}
              onChange={setSelectedCourse}
              options={courseOptions}
              className="w-44 text-xs"
            />

            {/* Status Filter */}
            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'TODO', label: 'Cần làm' },
                { value: 'IN_PROGRESS', label: 'Đang làm' },
                { value: 'COMPLETED', label: 'Đã hoàn thành' },
              ]}
              className="w-36 text-xs"
            />

            {/* Sort Control */}
            <Select
              value={sortBy}
              onChange={setSortBy}
              prefix={<SortAscendingOutlined />}
              options={[
                { value: 'due_asc', label: 'Sắp xếp: Hạn nộp gần nhất' },
                { value: 'due_desc', label: 'Sắp xếp: Hạn nộp xa nhất' },
                { value: 'title', label: 'Sắp xếp: Tên bài tập' },
              ]}
              className="w-48 text-xs ml-1"
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <ExclamationCircleOutlined className="text-base" />
              <span>{error}</span>
            </div>
            <Button size="small" type="primary" danger onClick={fetchAssignments}>
              Thử lại
            </Button>
          </div>
        )}

        {/* Assignment Cards Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Spin size="large" />
            <p className="text-xs text-slate-400">Đang tải danh sách bài tập...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className={`py-16 text-center rounded-2xl border ${isDark ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder' : 'bg-white border-amber-900/10'
            }`}>
            <Empty
              description={
                assignments.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Chưa có bài tập nào</p>
                    <p className="text-xs text-slate-400">Bạn hiện chưa có bài tập nào được giao.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Không tìm thấy bài tập</p>
                    <p className="text-xs text-slate-400">Thử thay đổi từ khóa hoặc bộ lọc.</p>
                  </div>
                )
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssignments.map((assignment) => {
              const priorityInfo = PRIORITY_CONFIG[assignment.priority] || PRIORITY_CONFIG.MEDIUM;

              return (
                <div
                  key={assignment.id}
                  className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between group hover:shadow-md ${isDark
                    ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder hover:border-emerald-500/50'
                    : 'bg-white border-amber-900/10 hover:border-emerald-500/40 shadow-sm'
                    }`}
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Course Name + Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 truncate">
                        <BookOutlined className="mr-1" />
                        {assignment.course_code || assignment.course_title || 'Khóa học'}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        {renderStatusTag(assignment.progress_status)}
                      </div>
                    </div>

                    {/* Assignment Title */}
                    <h3
                      onClick={() => navigate(`/assignments/${assignment.id}`)}
                      className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors cursor-pointer m-0 line-clamp-2"
                    >
                      {assignment.title}
                    </h3>

                    {/* Course Title preview */}
                    {assignment.course_title && assignment.course_code && (
                      <p className="text-xs text-slate-400 truncate m-0 font-medium">
                        {assignment.course_title}
                      </p>
                    )}

                    {/* Short Description preview */}
                    {assignment.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 m-0 leading-relaxed">
                        {assignment.description}
                      </p>
                    )}

                    {/* Deadline urgency & Priority */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {renderDeadlineBadge(assignment.due_date)}
                      {assignment.priority && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${priorityInfo.badgeBg}`}>
                          {priorityInfo.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer / Primary Action */}
                  <div className="mt-4 pt-3 border-t border-amber-900/10 dark:border-slate-800/60 flex items-center justify-end">
                    <button
                      onClick={() => navigate(`/assignments/${assignment.id}`)}
                      className="btn-voxel-green text-xs px-3.5 py-1.5 flex items-center gap-1.5"
                    >
                      <span>Xem chi tiết</span>
                      <ArrowRightOutlined className="text-[10px]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AssignmentsPage;
