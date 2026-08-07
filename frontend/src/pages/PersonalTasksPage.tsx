import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  message,
  Popconfirm,
  Empty,
  Spin,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  CheckSquareOutlined,
  BookOutlined,
  SolutionOutlined,
  UserOutlined,
  HeartOutlined,
  TeamOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { personalTaskService } from '../services/personalTaskService';
import {
  PersonalTask,
  PersonalTaskCreatePayload,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from '../types/personalTask';

const { TextArea } = Input;

const CATEGORY_CONFIG: Record<TaskCategory, { label: string; color: string; icon: React.ReactNode }> = {
  STUDY: { label: 'Học tập', color: 'indigo', icon: <BookOutlined /> },
  CAREER: { label: 'Sự nghiệp', color: 'emerald', icon: <SolutionOutlined /> },
  PERSONAL: { label: 'Cá nhân', color: 'amber', icon: <UserOutlined /> },
  HEALTH: { label: 'Sức khỏe', color: 'rose', icon: <HeartOutlined /> },
  MEETING: { label: 'Cuộc họp', color: 'cyan', icon: <TeamOutlined /> },
  OTHER: { label: 'Khác', color: 'slate', icon: <AppstoreOutlined /> },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  LOW: { label: 'Thấp', color: 'blue' },
  MEDIUM: { label: 'Trung bình', color: 'cyan' },
  HIGH: { label: 'Cao', color: 'volcano' },
  CRITICAL: { label: 'Khẩn cấp', color: 'magenta' },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  NOT_STARTED: { label: 'Chưa bắt đầu', color: 'default', icon: <ClockCircleOutlined /> },
  IN_PROGRESS: { label: 'Đang thực hiện', color: 'processing', icon: <SyncOutlined spin /> },
  COMPLETED: { label: 'Đã hoàn thành', color: 'success', icon: <CheckCircleOutlined /> },
};

export const PersonalTasksPage: React.FC = () => {
  const { user } = useAuth();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter & Sorting states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('due_date');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [viewingTask, setViewingTask] = useState<PersonalTask | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const isStudent = user?.roles?.includes('student') || false;

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params: any = { sort_by: sortBy };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;

      const data = await personalTaskService.getPersonalTasks(params);
      setTasks(data);
    } catch (err: any) {
      console.error('Fetch personal tasks error:', err);
      message.error(err.response?.data?.detail || 'Không thể tải danh sách nhiệm vụ cá nhân.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, categoryFilter, priorityFilter, sortBy]);

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      const payload: PersonalTaskCreatePayload = {
        title: values.title,
        description: values.description,
        category: values.category || 'STUDY',
        priority: values.priority || 'MEDIUM',
        status: values.status || 'NOT_STARTED',
        estimated_hours: values.estimated_hours,
        due_date: values.due_date ? values.due_date.toISOString() : undefined,
      };

      await personalTaskService.createPersonalTask(payload);
      message.success('Tạo nhiệm vụ cá nhân thành công!');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchTasks();
    } catch (err: any) {
      console.error('Create personal task error:', err);
      message.error(err.response?.data?.detail || 'Không thể tạo nhiệm vụ cá nhân.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (task: PersonalTask) => {
    setEditingTask(task);
    editForm.setFieldsValue({
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      status: task.status,
      estimated_hours: task.estimated_hours,
      due_date: task.due_date ? dayjs(task.due_date) : null,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (values: any) => {
    if (!editingTask) return;
    setSubmitting(true);
    try {
      const payload = {
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        status: values.status,
        estimated_hours: values.estimated_hours,
        due_date: values.due_date ? values.due_date.toISOString() : undefined,
      };

      const updated = await personalTaskService.updatePersonalTask(editingTask.id, payload);
      message.success('Cập nhật nhiệm vụ thành công!');
      setIsEditModalOpen(false);
      setEditingTask(null);
      if (viewingTask?.id === updated.id) {
        setViewingTask(updated);
      }
      fetchTasks();
    } catch (err: any) {
      console.error('Update personal task error:', err);
      message.error(err.response?.data?.detail || 'Không thể cập nhật nhiệm vụ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updated = await personalTaskService.updateTaskStatus(taskId, newStatus);
      message.success('Đã cập nhật trạng thái nhiệm vụ!');
      if (viewingTask?.id === taskId) {
        setViewingTask(updated);
      }
      fetchTasks();
    } catch (err: any) {
      console.error('Update task status error:', err);
      message.error(err.response?.data?.detail || 'Không thể cập nhật trạng thái.');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await personalTaskService.deletePersonalTask(taskId);
      message.success('Xóa nhiệm vụ thành công!');
      if (viewingTask?.id === taskId) {
        setIsDetailModalOpen(false);
        setViewingTask(null);
      }
      fetchTasks();
    } catch (err: any) {
      console.error('Delete personal task error:', err);
      message.error(err.response?.data?.detail || 'Không thể xóa nhiệm vụ.');
    }
  };

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#0b0910] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2.5 m-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              <CheckSquareOutlined className="text-indigo-500" />
              Nhiệm Vụ Cá Nhân
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0">
              Quản lý các hoạt động học tập, sự nghiệp và cá nhân của riêng bạn ngoài chương trình học chính khóa.
            </p>
          </div>

          {isStudent && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold h-10 px-5 shadow-lg shadow-indigo-500/25 border-0"
            >
              Tạo Nhiệm Vụ Mới
            </Button>
          )}
        </div>

        {/* Filter & Sorting Controls */}
        <div className={`p-4 rounded-2xl border flex flex-wrap items-center gap-3 justify-between ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FilterOutlined /> Lọc:
            </span>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-36 text-xs"
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'NOT_STARTED', label: 'Chưa bắt đầu' },
                { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
                { value: 'COMPLETED', label: 'Đã hoàn thành' },
              ]}
            />

            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              className="w-36 text-xs"
              options={[
                { value: 'ALL', label: 'Tất cả danh mục' },
                { value: 'STUDY', label: 'Học tập' },
                { value: 'CAREER', label: 'Sự nghiệp' },
                { value: 'PERSONAL', label: 'Cá nhân' },
                { value: 'HEALTH', label: 'Sức khỏe' },
                { value: 'MEETING', label: 'Cuộc họp' },
                { value: 'OTHER', label: 'Khác' },
              ]}
            />

            {/* Priority Filter */}
            <Select
              value={priorityFilter}
              onChange={setPriorityFilter}
              className="w-36 text-xs"
              options={[
                { value: 'ALL', label: 'Tất cả độ ưu tiên' },
                { value: 'LOW', label: 'Thấp' },
                { value: 'MEDIUM', label: 'Trung bình' },
                { value: 'HIGH', label: 'Cao' },
                { value: 'CRITICAL', label: 'Khẩn cấp' },
              ]}
            />
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <SortAscendingOutlined /> Sắp xếp:
            </span>
            <Select
              value={sortBy}
              onChange={setSortBy}
              className="w-40 text-xs"
              options={[
                { value: 'due_date', label: 'Hạn chót (gần nhất)' },
                { value: 'priority', label: 'Mức độ ưu tiên' },
                { value: 'updated_at', label: 'Mới cập nhật' },
              ]}
            />
          </div>
        </div>

        {/* Task Cards Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <Spin size="large" />
            <p className="text-xs text-slate-400 mt-3">Đang tải danh sách nhiệm vụ...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className={`py-16 text-center rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Empty
              description={
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Chưa có nhiệm vụ cá nhân nào. Bấm nút <strong>&quot;Tạo Nhiệm Vụ Mới&quot;</strong> để tạo!
                </span>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => {
              const categoryInfo = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.OTHER;
              const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
              const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.NOT_STARTED;

              return (
                <Card
                  key={task.id}
                  hoverable
                  className={`rounded-2xl transition-all border ${
                    isDark ? 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                  }`}
                  bodyStyle={{ padding: '20px' }}
                >
                  <div className="flex flex-col h-full justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Category & Priority Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Tag className="rounded-full px-3 py-0.5 border-0 font-semibold text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60">
                          {categoryInfo.icon} {categoryInfo.label}
                        </Tag>
                        <Tag color={priorityInfo.color} className="rounded-full px-2.5 py-0.5 text-xs font-bold border-0">
                          Ưu tiên {priorityInfo.label}
                        </Tag>
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => {
                          setViewingTask(task);
                          setIsDetailModalOpen(true);
                        }}
                        className="font-bold text-base m-0 leading-snug cursor-pointer hover:text-indigo-500 transition-colors line-clamp-2"
                      >
                        {task.title}
                      </h3>

                      {/* Description preview */}
                      {task.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 m-0 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Due date & Estimated hours */}
                      <div className="text-xs text-slate-400 flex items-center gap-3 pt-1 flex-wrap">
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <CalendarOutlined className="text-indigo-500" />
                            <span>Hạn: {new Date(task.due_date).toLocaleDateString('vi-VN')}</span>
                          </span>
                        )}
                        {task.estimated_hours !== undefined && task.estimated_hours !== null && (
                          <span className="flex items-center gap-1">
                            <FieldTimeOutlined className="text-purple-500" />
                            <span>{task.estimated_hours}h</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Status Control & Actions */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      {/* Status Selector */}
                      <Select
                        value={task.status}
                        onChange={(val) => handleStatusChange(task.id, val)}
                        size="small"
                        className="w-36 text-xs"
                        options={[
                          { value: 'NOT_STARTED', label: 'Chưa bắt đầu' },
                          { value: 'IN_PROGRESS', label: 'Đang làm' },
                          { value: 'COMPLETED', label: 'Đã hoàn thành' },
                        ]}
                      />

                      {/* Edit / Delete Buttons */}
                      <div className="flex items-center gap-1">
                        <Tooltip title="Chỉnh sửa">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined className="text-slate-400 hover:text-indigo-500" />}
                            onClick={() => handleOpenEdit(task)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Xóa nhiệm vụ"
                          description="Bạn có chắc chắn muốn xóa nhiệm vụ này?"
                          onConfirm={() => handleDelete(task.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="Xóa">
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined className="text-slate-400 hover:text-red-500" />}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Task Modal */}
        <Modal
          title={<span className="font-bold text-base">Tạo Nhiệm Vụ Cá Nhân Mới</span>}
          open={isCreateModalOpen}
          onCancel={() => setIsCreateModalOpen(false)}
          footer={null}
          centered
          className="rounded-2xl overflow-hidden"
        >
          <Form form={createForm} layout="vertical" onFinish={handleCreate} className="mt-4 space-y-4">
            <Form.Item
              name="title"
              label="Tên nhiệm vụ"
              rules={[{ required: true, message: 'Vui lòng nhập tên nhiệm vụ!' }]}
            >
              <Input placeholder="Ví dụ: Ôn tập TOEIC 750+, Chuẩn bị CV xin việc, Tập Gym..." className="rounded-xl" />
            </Form.Item>

            <Form.Item name="description" label="Mô tả / Ghi chú">
              <TextArea rows={3} placeholder="Ghi chú chi tiết các mục tiêu hoặc tài liệu cần chuẩn bị..." className="rounded-xl" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="category" label="Danh mục" initialValue="STUDY">
                <Select className="rounded-xl">
                  <Select.Option value="STUDY">📚 Học tập</Select.Option>
                  <Select.Option value="CAREER">💼 Sự nghiệp</Select.Option>
                  <Select.Option value="PERSONAL">👤 Cá nhân</Select.Option>
                  <Select.Option value="HEALTH">❤️ Sức khỏe</Select.Option>
                  <Select.Option value="MEETING">👥 Cuộc họp</Select.Option>
                  <Select.Option value="OTHER">⚡ Khác</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="priority" label="Mức độ ưu tiên" initialValue="MEDIUM">
                <Select className="rounded-xl">
                  <Select.Option value="LOW">Thấp</Select.Option>
                  <Select.Option value="MEDIUM">Trung bình</Select.Option>
                  <Select.Option value="HIGH">Cao</Select.Option>
                  <Select.Option value="CRITICAL">Khẩn cấp</Select.Option>
                </Select>
              </Form.Item>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="estimated_hours" label="Ước tính (Giờ)">
                <InputNumber min={0.5} step={0.5} placeholder="2.5" className="w-full rounded-xl" />
              </Form.Item>

              <Form.Item name="due_date" label="Hạn hoàn thành">
                <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full rounded-xl" />
              </Form.Item>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button onClick={() => setIsCreateModalOpen(false)} className="rounded-xl">
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold">
                Tạo Nhiệm Vụ
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Edit Task Modal */}
        <Modal
          title={<span className="font-bold text-base">Chỉnh Sửa Nhiệm Vụ</span>}
          open={isEditModalOpen}
          onCancel={() => setIsEditModalOpen(false)}
          footer={null}
          centered
          className="rounded-2xl overflow-hidden"
        >
          <Form form={editForm} layout="vertical" onFinish={handleUpdate} className="mt-4 space-y-4">
            <Form.Item
              name="title"
              label="Tên nhiệm vụ"
              rules={[{ required: true, message: 'Vui lòng nhập tên nhiệm vụ!' }]}
            >
              <Input className="rounded-xl" />
            </Form.Item>

            <Form.Item name="description" label="Mô tả / Ghi chú">
              <TextArea rows={3} className="rounded-xl" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="category" label="Danh mục">
                <Select className="rounded-xl">
                  <Select.Option value="STUDY">📚 Học tập</Select.Option>
                  <Select.Option value="CAREER">💼 Sự nghiệp</Select.Option>
                  <Select.Option value="PERSONAL">👤 Cá nhân</Select.Option>
                  <Select.Option value="HEALTH">❤️ Sức khỏe</Select.Option>
                  <Select.Option value="MEETING">👥 Cuộc họp</Select.Option>
                  <Select.Option value="OTHER">⚡ Khác</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="priority" label="Mức độ ưu tiên">
                <Select className="rounded-xl">
                  <Select.Option value="LOW">Thấp</Select.Option>
                  <Select.Option value="MEDIUM">Trung bình</Select.Option>
                  <Select.Option value="HIGH">Cao</Select.Option>
                  <Select.Option value="CRITICAL">Khẩn cấp</Select.Option>
                </Select>
              </Form.Item>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="estimated_hours" label="Ước tính (Giờ)">
                <InputNumber min={0.5} step={0.5} className="w-full rounded-xl" />
              </Form.Item>

              <Form.Item name="due_date" label="Hạn hoàn thành">
                <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full rounded-xl" />
              </Form.Item>
            </div>

            <Form.Item name="status" label="Trạng thái">
              <Select className="rounded-xl">
                <Select.Option value="NOT_STARTED">Chưa bắt đầu</Select.Option>
                <Select.Option value="IN_PROGRESS">Đang thực hiện</Select.Option>
                <Select.Option value="COMPLETED">Đã hoàn thành</Select.Option>
              </Select>
            </Form.Item>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button onClick={() => setIsEditModalOpen(false)} className="rounded-xl">
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold">
                Lưu Thay Đổi
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Task Detail Modal */}
        <Modal
          title={<span className="font-bold text-base">Chi Tiết Nhiệm Vụ Cá Nhân</span>}
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="edit" onClick={() => { setIsDetailModalOpen(false); if (viewingTask) handleOpenEdit(viewingTask); }} className="rounded-xl">
              Chỉnh Sửa
            </Button>,
            <Button key="close" type="primary" onClick={() => setIsDetailModalOpen(false)} className="rounded-xl bg-indigo-600">
              Đóng
            </Button>,
          ]}
          centered
          className="rounded-2xl overflow-hidden"
        >
          {viewingTask && (
            <div className="mt-3 space-y-4 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-lg m-0">{viewingTask.title}</h3>
                <Tag color={STATUS_CONFIG[viewingTask.status].color} className="rounded-full px-3 py-1 font-semibold text-xs border-0">
                  {STATUS_CONFIG[viewingTask.status].label}
                </Tag>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="rounded-full px-3 py-0.5 font-semibold text-indigo-500 bg-indigo-50 border-0">
                  {CATEGORY_CONFIG[viewingTask.category]?.label}
                </Tag>
                <Tag color={PRIORITY_CONFIG[viewingTask.priority]?.color} className="rounded-full px-3 py-0.5 font-bold border-0">
                  Ưu tiên: {PRIORITY_CONFIG[viewingTask.priority]?.label}
                </Tag>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-semibold uppercase text-slate-400 m-0 mb-1">Ghi chú / Mô tả</h4>
                <p className="text-sm leading-relaxed m-0 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {viewingTask.description || 'Không có ghi chú.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-500">
                <div>
                  Hạn hoàn thành: <strong>{viewingTask.due_date ? new Date(viewingTask.due_date).toLocaleString('vi-VN') : 'Không có'}</strong>
                </div>
                <div>
                  Thời gian ước tính: <strong>{viewingTask.estimated_hours ? `${viewingTask.estimated_hours} giờ` : 'Không có'}</strong>
                </div>
                <div>
                  Ngày tạo: <strong>{new Date(viewingTask.created_at).toLocaleDateString('vi-VN')}</strong>
                </div>
                <div>
                  Mới cập nhật: <strong>{new Date(viewingTask.updated_at).toLocaleDateString('vi-VN')}</strong>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
};

export default PersonalTasksPage;
