import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Empty,
  Spin,
  message,
  DatePicker,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  BookOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  TeamOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  MinusCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sidebar } from '../components/Sidebar';
import { courseService } from '../services/courseService';
import { Course, CourseCreatePayload, CourseUpdatePayload, ScheduleConflictInfo } from '../types/course';

const DAYS_OF_WEEK = [
  { value: 'Monday', label: 'Thứ Hai (Monday)' },
  { value: 'Tuesday', label: 'Thứ Ba (Tuesday)' },
  { value: 'Wednesday', label: 'Thứ Tư (Wednesday)' },
  { value: 'Thursday', label: 'Thứ Năm (Thursday)' },
  { value: 'Friday', label: 'Thứ Sáu (Friday)' },
  { value: 'Saturday', label: 'Thứ Bảy (Saturday)' },
  { value: 'Sunday', label: 'Chủ Nhật (Sunday)' },
];

export const CoursesPage: React.FC = () => {
  const { user } = useAuth();
  const { themeMode } = useTheme();
  const navigate = useNavigate();

  const isInstructor = user?.roles?.includes('instructor') || user?.roles?.includes('admin');

  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>(isInstructor ? 'managed' : 'my_courses');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  // Modal State for Create / Edit Course
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Conflict Modal State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState<boolean>(false);
  const [conflictInfo, setConflictInfo] = useState<{ targetCourseName: string; conflict: ScheduleConflictInfo } | null>(null);

  const isDark = themeMode === 'dark';

  const fetchCourses = async (tab: string) => {
    setLoading(true);
    try {
      if (isInstructor && tab === 'managed') {
        const data = await courseService.getInstructorCourses();
        setCourses(data);
      } else if (tab === 'my_courses') {
        const data = await courseService.getStudentCourses();
        setCourses(data);
      } else if (tab === 'discover') {
        const data = await courseService.getAvailableCourses();
        setCourses(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch courses:', err);
      message.error(err.response?.data?.detail || 'Không thể tải danh sách khóa học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(activeTab);
  }, [activeTab, isInstructor]);

  const handleCreateCourse = async (values: any) => {
    if (!values.date_range || values.date_range.length < 2) {
      message.error('Vui lòng chọn Ngày bắt đầu và Ngày kết thúc khóa học.');
      return;
    }
    const startDate = values.date_range[0].toISOString();
    const endDate = values.date_range[1].toISOString();

    setSubmitting(true);
    try {
      const payload: CourseCreatePayload = {
        name: values.name,
        code: values.code,
        term: values.term,
        credits: values.credits || 3,
        description: values.description,
        start_date: startDate,
        end_date: endDate,
      };
      const newCourse = await courseService.createCourse(payload);
      message.success('Tạo khóa học & phân bổ lịch tự động thành công!');
      setIsModalOpen(false);
      form.resetFields();
      navigate(`/courses/${newCourse.id}`);
    } catch (err: any) {
      console.error('Create course error:', err);
      const detailMsg = typeof err.response?.data?.detail === 'string'
        ? err.response.data.detail
        : err.response?.data?.detail?.message || 'Tạo khóa học thất bại. Vui lòng kiểm tra lại.';
      message.error(detailMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCourse = async (values: any) => {
    if (!editingCourse) return;
    if (!values.date_range || values.date_range.length < 2) {
      message.error('Vui lòng chọn Ngày bắt đầu và Ngày kết thúc khóa học.');
      return;
    }
    const startDate = values.date_range[0].toISOString();
    const endDate = values.date_range[1].toISOString();

    setSubmitting(true);
    try {
      const payload: CourseUpdatePayload = {
        name: values.name,
        code: values.code,
        term: values.term,
        credits: values.credits || 3,
        description: values.description,
        start_date: startDate,
        end_date: endDate,
      };
      await courseService.updateCourse(editingCourse.id, payload);
      message.success('Cập nhật khóa học & lịch học tự động thành công!');
      setIsEditModalOpen(false);
      setEditingCourse(null);
      editForm.resetFields();
      fetchCourses(activeTab);
    } catch (err: any) {
      console.error('Edit course error:', err);
      const detailMsg = typeof err.response?.data?.detail === 'string'
        ? err.response.data.detail
        : err.response?.data?.detail?.message || 'Cập nhật khóa học thất bại.';
      message.error(detailMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (c: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCourse(c);
    editForm.setFieldsValue({
      name: c.name,
      code: c.code,
      term: c.term,
      credits: c.credits || 3,
      description: c.description,
      date_range: c.start_date && c.end_date ? [dayjs(c.start_date), dayjs(c.end_date)] : undefined,
      schedules: c.schedules || [],
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await courseService.deleteCourse(courseId);
      message.success('Xóa khóa học thành công!');
      fetchCourses(activeTab);
    } catch (err: any) {
      console.error('Delete course error:', err);
      message.error(err.response?.data?.detail || 'Không thể xóa khóa học.');
    }
  };

  const handleJoinCourse = async (course: Course) => {
    setJoiningId(course.id);
    try {
      await courseService.joinCourse(course.id);
      message.success(`Đã tham gia thành công môn ${course.name}!`);
      fetchCourses(activeTab);
    } catch (err: any) {
      console.error('Join course error:', err);
      if (err.response?.status === 409 && err.response?.data?.detail?.conflict) {
        setConflictInfo({
          targetCourseName: course.name,
          conflict: err.response.data.detail.conflict,
        });
        setIsConflictModalOpen(true);
      } else {
        const detailMsg = typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : err.response?.data?.detail?.message || 'Không thể tham gia khóa học.';
        message.error(detailMsg);
      }
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeaveCourse = async (courseId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLeavingId(courseId);
    try {
      await courseService.leaveCourse(courseId);
      message.success('Đã rời khỏi khóa học.');
      fetchCourses(activeTab);
    } catch (err: any) {
      console.error('Leave course error:', err);
      message.error(err.response?.data?.detail || 'Không thể rời khóa học.');
    } finally {
      setLeavingId(null);
    }
  };

  const renderStatusTag = (status?: string) => {
    const st = (status || '').toUpperCase();
    if (st === 'UPCOMING') {
      return <Tag color="blue" className="rounded-full px-2.5 py-0.5 font-semibold text-xs border-0">Sắp diễn ra</Tag>;
    } else if (st === 'COMPLETED') {
      return <Tag color="default" className="rounded-full px-2.5 py-0.5 font-semibold text-xs border-0">Đã kết thúc</Tag>;
    }
    return <Tag color="green" className="rounded-full px-2.5 py-0.5 font-semibold text-xs border-0">Đang diễn ra</Tag>;
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-[#0F1710] text-[#F2F9F3]' : 'bg-[#FDFBF7] text-slate-900'}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className={`px-6 py-5 border-b sticky top-0 z-10 backdrop-blur-md flex items-center justify-between ${isDark ? 'bg-[#0F1710]/90 border-minecraft-obsidianBorder' : 'bg-[#FDFBF7]/90 border-amber-900/10'
          }`}>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight m-0">Quản Lý Khóa Học</h1>
              <span className="badge-voxel-green text-xs">
                {isInstructor ? 'Giảng Viên' : 'Sinh Viên'}
              </span>
            </div>
            <p className={`text-xs mt-1.5 m-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isInstructor
                ? 'Quản lý danh sách khóa học do bạn giảng dạy và xếp thời khóa biểu giảng đường.'
                : 'Khám phá môn học mới, xem lịch học cố định và quản lý các môn học đã đăng ký.'}
            </p>
          </div>

          {isInstructor && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-voxel-green text-xs px-5 py-2.5 flex items-center gap-2"
            >
              <PlusOutlined />
              <span>Tạo Khóa Học Mới</span>
            </button>
          )}
        </header>

        {/* Filter & Tabs Toolbar */}
        <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Custom 3D Voxel Tabs */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {(isInstructor
                ? [
                  { key: 'managed', label: 'Khóa Học Giảng Dạy', icon: <BookOutlined /> },
                  { key: 'discover', label: 'Tất Cả Khóa Học', icon: <SearchOutlined /> },
                ]
                : [
                  { key: 'my_courses', label: 'Khóa Học Của Tôi', icon: <BookOutlined /> },
                  { key: 'discover', label: 'Khám Phá Khóa Học', icon: <SearchOutlined /> },
                ]
              ).map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={isActive ? 'tab-voxel-active text-xs' : 'tab-voxel-inactive text-xs'}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="w-full sm:w-72">
              <Input
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder="Tìm theo tên hoặc mã môn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="rounded-xl border-2 border-slate-300 dark:border-minecraft-obsidianBorder focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="py-20 text-center">
              <Spin size="large" />
              <p className="text-sm mt-3 text-slate-400">Đang tải danh sách khóa học...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="py-16 bg-white dark:bg-minecraft-obsidianCard rounded-3xl border-2 border-minecraft-grassBorder/40 dark:border-minecraft-obsidianBorder text-center shadow-voxel-sm shadow-minecraft-grassBorder/20">
              <Empty
                description={
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                    Chưa có khóa học nào trong mục này.
                  </span>
                }
              />
              {isInstructor && activeTab === 'managed' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn-voxel-green text-xs px-4 py-2 mt-4 inline-flex items-center gap-1.5"
                >
                  <PlusOutlined />
                  <span>Tạo khóa học đầu tiên</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <motion.div
                  key={course.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="card-voxel-3d flex flex-col justify-between relative group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="badge-voxel-green text-[11px] font-mono tracking-wider">
                          {course.code}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                          {course.credits || 3} Tín chỉ
                        </span>
                        {renderStatusTag(course.status)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        <TeamOutlined className="text-emerald-500" />
                        <span>{course.student_count} sinh viên</span>
                      </div>
                    </div>

                    <h3 className={`text-lg font-bold tracking-tight mb-2 line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {course.name}
                    </h3>

                    <p className={`text-xs leading-relaxed line-clamp-2 mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {course.description || 'Chưa có mô tả cho khóa học này.'}
                    </p>

                    {/* Course Active Period */}
                    {course.start_date && course.end_date && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl mb-2.5">
                        <CalendarOutlined />
                        <span>
                          Thời gian: {dayjs(course.start_date).format('DD/MM/YYYY')} - {dayjs(course.end_date).format('DD/MM/YYYY')}
                        </span>
                      </div>
                    )}

                    {/* Official Class Schedule entries preview */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <ClockCircleOutlined className="text-emerald-500" />
                        <span>Lịch học cố định trên lớp:</span>
                      </div>
                      {course.schedules && course.schedules.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {course.schedules.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              📅 {s.day_of_week}: {s.start_time}–{s.end_time} {s.room ? `(${s.room})` : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Chưa xếp lịch học</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <UserOutlined className="text-slate-400" />
                      <span className="truncate max-w-[120px]">{course.instructor_name || 'Giảng viên'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isInstructor && activeTab === 'managed' && (
                        <>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => openEditModal(course, e)}
                            className="rounded-lg text-slate-500 hover:text-indigo-600"
                          />
                          <Popconfirm
                            title="Xóa khóa học"
                            description="Bạn có chắc chắn muốn xóa khóa học này cùng toàn bộ tài liệu liên quan không?"
                            onConfirm={(e) => {
                              if (e) e.stopPropagation();
                              handleDeleteCourse(course.id);
                            }}
                            onCancel={(e) => {
                              if (e) e.stopPropagation();
                            }}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg text-rose-500 hover:text-rose-700"
                            />
                          </Popconfirm>
                        </>
                      )}

                      {activeTab === 'discover' && !isInstructor ? (
                        course.is_enrolled ? (
                          <div className="flex items-center gap-2">
                            <span className="badge-voxel-green text-xs">
                              <CheckCircleOutlined /> Đã tham gia
                            </span>
                            <Popconfirm
                              title="Hủy đăng ký khóa học"
                              description="Bạn có chắc chắn muốn rời khỏi khóa học này?"
                              onConfirm={() => handleLeaveCourse(course.id)}
                              okText="Rời khỏi"
                              cancelText="Hủy"
                              okButtonProps={{ danger: true }}
                            >
                              <Button danger size="small" type="text" icon={<DeleteOutlined />} title="Rời khóa học" />
                            </Popconfirm>
                          </div>
                        ) : (
                          <button
                            disabled={joiningId === course.id}
                            onClick={() => handleJoinCourse(course)}
                            className="btn-voxel-green text-xs px-3.5 py-1.5 rounded-xl"
                          >
                            Tham gia
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => navigate(`/courses/${course.id}`)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-minecraft-grassBorder bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs shadow-voxel-sm shadow-minecraft-grassBorder/40 hover:bg-minecraft-grass hover:text-white transition-all active:translate-y-0.5"
                        >
                          <span>Chi tiết</span>
                          <ArrowRightOutlined className="text-xs" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal Create Course */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <BookOutlined />
            <span>Tạo Khóa Học & Thời Khóa Biểu Mới</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        centered
        width={680}
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateCourse}
          requiredMark="optional"
          initialValues={{ credits: 3, schedules: [{ day_of_week: 'Monday', start_time: '08:00', end_time: '10:00', room: '' }] }}
          className="mt-4 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Form.Item
              name="name"
              label={<span className="font-semibold text-xs uppercase">Tên khóa học *</span>}
              rules={[{ required: true, message: 'Vui lòng nhập tên khóa học' }]}
              className="sm:col-span-2"
            >
              <Input placeholder="Ví dụ: Học Máy (Machine Learning)" size="large" className="rounded-xl" />
            </Form.Item>

            <Form.Item
              name="code"
              label={<span className="font-semibold text-xs uppercase">Mã môn học *</span>}
              rules={[{ required: true, message: 'Vui lòng nhập mã môn học' }]}
            >
              <Input placeholder="COMP3010" size="large" className="rounded-xl font-mono uppercase" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="term"
              label={<span className="font-semibold text-xs uppercase">Học kỳ / Niên khóa</span>}
            >
              <Input placeholder="Ví dụ: Fall 2026" size="large" className="rounded-xl" />
            </Form.Item>

            <Form.Item
              name="credits"
              label={<span className="font-semibold text-xs uppercase">Số Tín Chỉ (Credits) *</span>}
              rules={[{ required: true, message: 'Vui lòng nhập số tín chỉ' }]}
            >
              <InputNumber min={1} max={30} size="large" className="w-full rounded-xl" />
            </Form.Item>
          </div>

          <Form.Item
            name="date_range"
            label={<span className="font-semibold text-xs uppercase">Thời Gian Khóa Học (Bắt Đầu — Kết Thúc) *</span>}
            rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu và kết thúc' }]}
          >
            <DatePicker.RangePicker
              size="large"
              className="w-full rounded-xl"
              format="DD/MM/YYYY"
              placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
            />
          </Form.Item>

          {/* Auto Schedule Allocation Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
            <InfoCircleOutlined className="text-base text-emerald-500 mt-0.5" />
            <div>
              <div className="font-extrabold text-sm text-emerald-700 dark:text-emerald-300">Phân Bổ Lịch Học Tự Động Hóa</div>
              <p className="m-0 mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                Lịch học cố định giảng đường sẽ được hệ thống tính toán và tự động xếp lịch dựa trên <strong>Số tín chỉ (Credits)</strong> và <strong>Thời gian khóa học</strong>, đảm bảo tối ưu thời lượng và phòng tránh trùng lịch toàn trường.
              </p>
            </div>
          </div>

          <Form.Item
            name="description"
            label={<span className="font-semibold text-xs uppercase">Mô tả môn học</span>}
          >
            <Input.TextArea
              rows={2}
              placeholder="Nhập tổng quan nội dung môn học..."
              className="rounded-xl"
            />
          </Form.Item>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => {
                setIsModalOpen(false);
                form.resetFields();
              }}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              className="rounded-xl bg-minecraft-grass hover:bg-emerald-600 border border-minecraft-grassBorder text-white font-semibold"
            >
              Tạo Khóa Học
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Edit Course */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <EditOutlined />
            <span>Chỉnh Sửa Khóa Học & Thời Khóa Biểu</span>
          </div>
        }
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingCourse(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        centered
        width={680}
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditCourse}
          requiredMark="optional"
          className="mt-4 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Form.Item
              name="name"
              label={<span className="font-semibold text-xs uppercase">Tên khóa học *</span>}
              rules={[{ required: true, message: 'Vui lòng nhập tên khóa học' }]}
              className="sm:col-span-2"
            >
              <Input size="large" className="rounded-xl" />
            </Form.Item>

            <Form.Item
              name="code"
              label={<span className="font-semibold text-xs uppercase">Mã môn học *</span>}
              rules={[{ required: true, message: 'Vui lòng nhập mã môn học' }]}
            >
              <Input size="large" className="rounded-xl font-mono uppercase" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="term"
              label={<span className="font-semibold text-xs uppercase">Học kỳ / Niên khóa</span>}
            >
              <Input size="large" className="rounded-xl" />
            </Form.Item>

            <Form.Item
              name="credits"
              label={<span className="font-semibold text-xs uppercase">Số Tín Chỉ (Credits) *</span>}
              rules={[{ required: true, message: 'Vui lòng nhập số tín chỉ' }]}
            >
              <InputNumber min={1} max={30} size="large" className="w-full rounded-xl" />
            </Form.Item>
          </div>

          <Form.Item
            name="date_range"
            label={<span className="font-semibold text-xs uppercase">Thời Gian Bắt Đầu — Kết Thúc *</span>}
            rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu và kết thúc' }]}
          >
            <DatePicker.RangePicker
              size="large"
              className="w-full rounded-xl"
              format="DD/MM/YYYY"
              placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
            />
          </Form.Item>

          {/* Auto Schedule Allocation Banner */}
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <InfoCircleOutlined className="text-base text-indigo-500 mt-0.5" />
            <div>
              <div className="font-extrabold text-sm text-indigo-700 dark:text-indigo-300">Tự Động Cập Nhật Lịch Học Tối Ưu</div>
              <p className="m-0 mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                Khi thay đổi <strong>Số tín chỉ</strong> hoặc <strong>Thời gian khóa học</strong>, hệ thống sẽ tự động tính toán và cập nhật lại khung giờ giảng đường phòng tránh trùng lịch toàn trường.
              </p>
            </div>
          </div>

          <Form.Item
            name="description"
            label={<span className="font-semibold text-xs uppercase">Mô tả chi tiết</span>}
          >
            <Input.TextArea rows={2} className="rounded-xl" />
          </Form.Item>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingCourse(null);
                editForm.resetFields();
              }}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Lưu Thay Đổi
            </Button>
          </div>
        </Form>
      </Modal>

      {/* CONFLICT WARNING MODAL */}
      <Modal
        open={isConflictModalOpen}
        onCancel={() => setIsConflictModalOpen(false)}
        footer={null}
        centered
        className="rounded-2xl overflow-hidden"
      >
        <div className="text-center p-2 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/15 border-2 border-rose-500/30 text-rose-500 flex items-center justify-center text-2xl shadow-voxel-sm">
            <WarningOutlined />
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-rose-600 dark:text-rose-400 m-0">
              ⚠ Schedule Conflict (Xung Đột Thời Khóa Biểu)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0">
              Bạn không thể đăng ký khóa học <strong>{conflictInfo?.targetCourseName}</strong> do trùng giờ học cố định với môn học bạn đã tham gia.
            </p>
          </div>

          {conflictInfo?.conflict && (
            <div className="bg-rose-500/10 dark:bg-rose-950/40 p-4 rounded-2xl border-2 border-rose-500/30 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-300 pb-2 border-b border-rose-500/20">
                <span>Môn học đã đăng ký:</span>
                <span className="font-mono text-xs">{conflictInfo.conflict.conflicting_course_code} — {conflictInfo.conflict.conflicting_course_name}</span>
              </div>

              <div className="space-y-1.5 text-slate-700 dark:text-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ngày trong tuần:</span>
                  <span className="font-bold">{conflictInfo.conflict.day_of_week}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Khung giờ môn đã đăng ký:</span>
                  <span className="font-mono font-bold">{conflictInfo.conflict.existing_start_time} – {conflictInfo.conflict.existing_end_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Khung giờ môn muốn đăng ký:</span>
                  <span className="font-mono font-bold text-rose-500">{conflictInfo.conflict.new_start_time} – {conflictInfo.conflict.new_end_time}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-rose-500/20 font-bold text-rose-600 dark:text-rose-400">
                  <span>Thời gian bị trùng lắp:</span>
                  <span className="font-mono">{conflictInfo.conflict.overlap_start_time} – {conflictInfo.conflict.overlap_end_time}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setIsConflictModalOpen(false)}
              className="btn-voxel-green text-xs px-5 py-2 rounded-xl"
            >
              Đã Hiểu / Đóng
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
