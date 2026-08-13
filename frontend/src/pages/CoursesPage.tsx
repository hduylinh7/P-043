import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Modal,
  Form,
  Input,
  Tabs,
  Tag,
  Alert,
  Empty,
  Spin,
  message,
  DatePicker,
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
  ClockCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sidebar } from '../components/Sidebar';
import { courseService } from '../services/courseService';
import { Course, CourseCreatePayload, CourseUpdatePayload } from '../types/course';

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

  // Modal State for Create / Edit Course
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);

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
        description: values.description,
        start_date: startDate,
        end_date: endDate,
      };
      const newCourse = await courseService.createCourse(payload);
      message.success('Tạo khóa học thành công!');
      setIsModalOpen(false);
      form.resetFields();
      navigate(`/courses/${newCourse.id}`);
    } catch (err: any) {
      console.error('Create course error:', err);
      message.error(err.response?.data?.detail || 'Tạo khóa học thất bại. Vui lòng thử lại.');
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
        description: values.description,
        start_date: startDate,
        end_date: endDate,
      };
      await courseService.updateCourse(editingCourse.id, payload);
      message.success('Cập nhật khóa học thành công!');
      setIsEditModalOpen(false);
      setEditingCourse(null);
      editForm.resetFields();
      fetchCourses(activeTab);
    } catch (err: any) {
      console.error('Edit course error:', err);
      message.error(err.response?.data?.detail || 'Cập nhật khóa học thất bại.');
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
      description: c.description,
      date_range: c.start_date && c.end_date ? [dayjs(c.start_date), dayjs(c.end_date)] : undefined,
    });
    setIsEditModalOpen(true);
  };

  const handleJoinCourse = async (courseId: string) => {
    setJoiningId(courseId);
    try {
      await courseService.joinCourse(courseId);
      message.success('Tham gia khóa học thành công!');
      fetchCourses(activeTab);
    } catch (err: any) {
      console.error('Join course error:', err);
      message.error(err.response?.data?.detail || 'Không thể tham gia khóa học.');
    } finally {
      setJoiningId(null);
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
        <header className={`px-6 py-5 border-b sticky top-0 z-10 backdrop-blur-md flex items-center justify-between ${
          isDark ? 'bg-[#0F1710]/90 border-minecraft-obsidianBorder' : 'bg-[#FDFBF7]/90 border-amber-900/10'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight m-0">Quản Lý Khóa Học</h1>
              <Tag color={isInstructor ? 'gold' : 'green'} className="rounded-full px-3 py-0.5 font-bold text-xs border-0">
                {isInstructor ? 'Giảng Viên' : 'Sinh Viên'}
              </Tag>
            </div>
            <p className={`text-xs mt-1 m-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isInstructor
                ? 'Quản lý danh sách khóa học do bạn giảng dạy và theo dõi sinh viên ghi danh.'
                : 'Khám phá khóa học mới hoặc xem lại các khóa học bạn đã đăng ký.'}
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
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key)}
              items={
                isInstructor
                  ? [
                      { key: 'managed', label: 'Khóa Học Giảng Dạy' },
                      { key: 'discover', label: 'Tất Cả Khóa Học' },
                    ]
                  : [
                      { key: 'my_courses', label: 'Khóa Học Của Tôi' },
                      { key: 'discover', label: 'Khám Phá Khóa Học' },
                    ]
              }
              className="w-full sm:w-auto font-bold"
            />

            <div className="w-full sm:w-72">
              <Input
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder="Tìm theo tên hoặc mã môn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="rounded-xl"
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
            <div className="py-16 bg-white dark:bg-minecraft-obsidianCard rounded-3xl border-2 border-amber-900/10 dark:border-minecraft-obsidianBorder text-center">
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
                  className={`rounded-2xl border-2 p-6 flex flex-col justify-between relative shadow-sm hover:shadow-md transition-all ${
                    isDark
                      ? 'bg-minecraft-obsidianCard border-minecraft-obsidianBorder hover:border-emerald-500/50'
                      : 'bg-white border-amber-900/10 hover:border-emerald-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Tag color="emerald" className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border-0">
                          {course.code}
                        </Tag>
                        {renderStatusTag(course.status)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <TeamOutlined />
                        <span>{course.student_count} sinh viên</span>
                      </div>
                    </div>

                    <h3 className={`text-lg font-bold tracking-tight mb-2 line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {course.name}
                    </h3>

                    <p className={`text-xs leading-relaxed line-clamp-2 mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {course.description || 'Chưa có mô tả cho khóa học này.'}
                    </p>

                    {/* Course Period Display */}
                    {course.start_date && course.end_date && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl mb-3">
                        <CalendarOutlined />
                        <span>
                          Thời gian: {dayjs(course.start_date).format('DD/MM/YYYY')} - {dayjs(course.end_date).format('DD/MM/YYYY')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <UserOutlined />
                      <span className="truncate max-w-[120px]">{course.instructor_name || 'Giảng viên'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isInstructor && activeTab === 'managed' && (
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => openEditModal(course, e)}
                          className="rounded-lg text-slate-500 hover:text-indigo-600"
                        />
                      )}

                      {activeTab === 'discover' && !isInstructor ? (
                        course.is_enrolled ? (
                          <Tag color="success" icon={<CheckCircleOutlined />} className="rounded-lg px-3 py-1 font-medium">
                            Đã tham gia
                          </Tag>
                        ) : (
                          <Button
                            type="primary"
                            size="small"
                            loading={joiningId === course.id}
                            onClick={() => handleJoinCourse(course.id)}
                            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                          >
                            Tham gia
                          </Button>
                        )
                      ) : (
                        <Button
                          type="default"
                          size="small"
                          icon={<ArrowRightOutlined />}
                          onClick={() => navigate(`/courses/${course.id}`)}
                          className="rounded-lg text-xs font-semibold"
                        >
                          Chi tiết
                        </Button>
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
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <BookOutlined />
            <span>Tạo Khóa Học Mới</span>
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
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateCourse}
          requiredMark="optional"
          className="mt-4 space-y-4"
        >
          <Form.Item
            name="name"
            label={<span className="font-semibold text-xs uppercase">Tên khóa học</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên khóa học' }]}
          >
            <Input placeholder="Ví dụ: Lập trình Python & AI Agent" size="large" className="rounded-xl" />
          </Form.Item>

          <Form.Item
            name="code"
            label={<span className="font-semibold text-xs uppercase">Mã môn học</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mã môn học' }]}
          >
            <Input placeholder="Ví dụ: COMP1010" size="large" className="rounded-xl font-mono uppercase" />
          </Form.Item>

          <Form.Item
            name="term"
            label={<span className="font-semibold text-xs uppercase">Học kỳ / Niên khóa</span>}
          >
            <Input placeholder="Ví dụ: Học kỳ Fall 2026" size="large" className="rounded-xl" />
          </Form.Item>

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

          <Form.Item
            name="description"
            label={<span className="font-semibold text-xs uppercase">Mô tả chi tiết</span>}
          >
            <Input.TextArea
              rows={3}
              placeholder="Nhập tổng quan nội dung môn học, mục tiêu & thông tin bổ sung..."
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
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
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
            <span>Chỉnh Sửa Khóa Học</span>
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
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditCourse}
          requiredMark="optional"
          className="mt-4 space-y-4"
        >
          <Form.Item
            name="name"
            label={<span className="font-semibold text-xs uppercase">Tên khóa học</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên khóa học' }]}
          >
            <Input size="large" className="rounded-xl" />
          </Form.Item>

          <Form.Item
            name="code"
            label={<span className="font-semibold text-xs uppercase">Mã môn học</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mã môn học' }]}
          >
            <Input size="large" className="rounded-xl font-mono uppercase" />
          </Form.Item>

          <Form.Item
            name="term"
            label={<span className="font-semibold text-xs uppercase">Học kỳ / Niên khóa</span>}
          >
            <Input size="large" className="rounded-xl" />
          </Form.Item>

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

          <Form.Item
            name="description"
            label={<span className="font-semibold text-xs uppercase">Mô tả chi tiết</span>}
          >
            <Input.TextArea rows={3} className="rounded-xl" />
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
    </div>
  );
};

