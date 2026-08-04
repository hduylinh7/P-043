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
} from 'antd';
import {
  PlusOutlined,
  BookOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  TeamOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sidebar } from '../components/Sidebar';
import { courseService } from '../services/courseService';
import { Course, CourseCreatePayload } from '../types/course';

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

  // Modal State for Create Course
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [creating, setCreating] = useState<boolean>(false);

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

  const handleCreateCourse = async (values: CourseCreatePayload) => {
    setCreating(true);
    try {
      const newCourse = await courseService.createCourse(values);
      message.success('Tạo khóa học thành công!');
      setIsModalOpen(false);
      form.resetFields();
      navigate(`/courses/${newCourse.id}`);
    } catch (err: any) {
      console.error('Create course error:', err);
      message.error(err.response?.data?.detail || 'Tạo khóa học thất bại. Vui lòng thử lại.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinCourse = async (courseId: string) => {
    setJoiningId(courseId);
    try {
      await courseService.joinCourse(courseId);
      message.success('Tham gia khóa học thành công!');
      // Refresh discover tab
      fetchCourses(activeTab);
    } catch (err: any) {
      console.error('Join course error:', err);
      message.error(err.response?.data?.detail || 'Không thể tham gia khóa học.');
    } finally {
      setJoiningId(null);
    }
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className={`px-6 py-5 border-b sticky top-0 z-10 backdrop-blur-md flex items-center justify-between ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight m-0">Quản Lý Khóa Học</h1>
              <Tag color={isInstructor ? 'purple' : 'blue'} className="rounded-full px-3 py-0.5 font-semibold text-xs border-0">
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
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
              size="large"
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold shadow-md shadow-indigo-500/20"
            >
              Tạo Khóa Học Mới
            </Button>
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
              className="w-full sm:w-auto"
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
            <div className="py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
              <Empty
                description={
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                    Chưa có khóa học nào trong mục này.
                  </span>
                }
              />
              {isInstructor && activeTab === 'managed' && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-500"
                >
                  Tạo khóa học đầu tiên
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <motion.div
                  key={course.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-2xl border p-6 flex flex-col justify-between relative shadow-sm hover:shadow-md transition-all ${
                    isDark
                      ? 'bg-slate-900/90 border-slate-800/80 hover:border-slate-700'
                      : 'bg-white border-slate-200/80 hover:border-indigo-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Tag color="indigo" className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border-0">
                        {course.code}
                      </Tag>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <TeamOutlined />
                        <span>{course.student_count} sinh viên</span>
                      </div>
                    </div>

                    <h3 className={`text-lg font-bold tracking-tight mb-2 line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {course.name}
                    </h3>

                    <p className={`text-xs leading-relaxed line-clamp-2 mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {course.description || 'Chưa có mô tả cho khóa học này.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <UserOutlined />
                      <span className="truncate max-w-[120px]">{course.instructor_name || 'Giảng viên'}</span>
                    </div>

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
            name="description"
            label={<span className="font-semibold text-xs uppercase">Mô tả chi tiết</span>}
          >
            <Input.TextArea
              rows={4}
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
              loading={creating}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Tạo Khóa Học
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
