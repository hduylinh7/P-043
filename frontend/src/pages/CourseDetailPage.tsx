import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Select,
  Upload,
  Empty,
  Popconfirm,
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
} from '@ant-design/icons';

import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sidebar } from '../components/Sidebar';
import { courseService } from '../services/courseService';
import { materialService } from '../services/materialService';
import { CourseDetail, EnrolledStudent } from '../types/course';
import { CourseMaterial } from '../types/material';

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

  useEffect(() => {
    fetchDetail();
    fetchMaterials();
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
    try {
      await materialService.downloadMaterial(courseId, material.id, material.file_name);
      message.success('Đang tải xuống tập tin...');
    } catch (err: any) {
      console.error('Download material error:', err);
      message.error(err.response?.data?.detail || 'Không thể tải xuống tập tin.');
    } finally {
      setDownloadingId(null);
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

  const getFileIcon = (fileName: string, type: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined className="text-red-500 text-xl" />;
    if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined className="text-blue-500 text-xl" />;
    if (['txt', 'md'].includes(ext || '')) return <FileTextOutlined className="text-emerald-500 text-xl" />;
    return <FileUnknownOutlined className="text-blue-500 text-xl" />;
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
              <Tag color="indigo" className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border-0">
                {course.code}
              </Tag>
              <h1 className="text-xl font-bold tracking-tight m-0">{course.name}</h1>
            </div>
          </div>

          {isCourseOwner && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsUploadModalOpen(true)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Tải Lên Tài Liệu
            </Button>
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
              </div>
            </div>
          </motion.div>

          {/* Roster & Materials Tabs */}
          <Tabs
            defaultActiveKey="materials"
            items={[
              {
                key: 'materials',
                label: `Tài Liệu Học Tập (${materials.length})`,
                children: (
                  <div className={`rounded-2xl border p-6 shadow-sm space-y-4 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
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
                            className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                              isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'
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
                  <div className={`rounded-2xl border p-6 shadow-sm overflow-hidden ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
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
                  <div className={`rounded-2xl border p-6 shadow-sm space-y-4 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
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
    </div>
  );
};
