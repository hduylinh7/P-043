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
  message,
  Popconfirm,
  Empty,
  Spin,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  InboxOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  CalendarOutlined,
  AimOutlined,
  BookOutlined,
  SolutionOutlined,
  UserOutlined,
  HeartOutlined,
  AppstoreOutlined,
  RocketOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { goalService } from '../services/goalService';
import {
  Goal,
  GoalCategory,
  GoalCreatePayload,
  GoalPriority,
  GoalStatus,
} from '../types/goal';

const { TextArea } = Input;

const CATEGORY_CONFIG: Record<GoalCategory, { label: string; color: string; icon: React.ReactNode }> = {
  LEARNING: { label: 'Học tập', color: 'indigo', icon: <BookOutlined /> },
  CAREER: { label: 'Sự nghiệp', color: 'emerald', icon: <SolutionOutlined /> },
  PERSONAL: { label: 'Cá nhân', color: 'amber', icon: <UserOutlined /> },
  HEALTH: { label: 'Sức khỏe', color: 'rose', icon: <HeartOutlined /> },
  OTHER: { label: 'Khác', color: 'slate', icon: <AppstoreOutlined /> },
};

const PRIORITY_CONFIG: Record<GoalPriority, { label: string; color: string }> = {
  LOW: { label: 'Thấp', color: 'blue' },
  MEDIUM: { label: 'Trung bình', color: 'cyan' },
  HIGH: { label: 'Cao', color: 'volcano' },
  CRITICAL: { label: 'Khẩn cấp', color: 'magenta' },
};

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: { label: 'Đang thực hiện', color: 'processing', icon: <SyncOutlined spin /> },
  COMPLETED: { label: 'Đã hoàn thành', color: 'success', icon: <CheckCircleOutlined /> },
  ARCHIVED: { label: 'Đã lưu trữ', color: 'default', icon: <InboxOutlined /> },
};

export const GoalsPage: React.FC = () => {
  const { user } = useAuth();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter & Sorting states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('target_date');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [viewingGoal, setViewingGoal] = useState<Goal | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const isStudent = user?.roles?.includes('student') || false;

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const params: any = { sort_by: sortBy };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;

      const data = await goalService.getGoals(params);
      setGoals(data);
    } catch (err: any) {
      console.error('Fetch goals error:', err);
      message.error(err.response?.data?.detail || 'Không thể tải danh sách mục tiêu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStudent) {
      fetchGoals();
    } else {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter, sortBy, isStudent]);

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      const payload: GoalCreatePayload = {
        title: values.title,
        description: values.description,
        category: values.category || 'LEARNING',
        priority: values.priority || 'MEDIUM',
        target_date: values.target_date ? values.target_date.toISOString() : undefined,
      };

      await goalService.createGoal(payload);
      message.success('Tạo mục tiêu mới thành công!');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchGoals();
    } catch (err: any) {
      console.error('Create goal error:', err);
      message.error(err.response?.data?.detail || 'Không thể tạo mục tiêu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    editForm.setFieldsValue({
      title: goal.title,
      description: goal.description,
      category: goal.category,
      priority: goal.priority,
      status: goal.status,
      target_date: goal.target_date ? dayjs(goal.target_date) : null,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (values: any) => {
    if (!editingGoal) return;
    setSubmitting(true);
    try {
      const payload = {
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        status: values.status,
        target_date: values.target_date ? values.target_date.toISOString() : undefined,
      };

      const updated = await goalService.updateGoal(editingGoal.id, payload);
      message.success('Cập nhật mục tiêu thành công!');
      setIsEditModalOpen(false);
      setEditingGoal(null);
      if (viewingGoal?.id === updated.id) {
        setViewingGoal(updated);
      }
      fetchGoals();
    } catch (err: any) {
      console.error('Update goal error:', err);
      message.error(err.response?.data?.detail || 'Không thể cập nhật mục tiêu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (goalId: string, newStatus: GoalStatus) => {
    try {
      const updated = await goalService.updateGoalStatus(goalId, newStatus);
      message.success('Đã cập nhật trạng thái mục tiêu!');
      if (viewingGoal?.id === goalId) {
        setViewingGoal(updated);
      }
      fetchGoals();
    } catch (err: any) {
      console.error('Update goal status error:', err);
      message.error(err.response?.data?.detail || 'Không thể cập nhật trạng thái.');
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await goalService.deleteGoal(goalId);
      message.success('Xóa mục tiêu thành công!');
      if (viewingGoal?.id === goalId) {
        setIsDetailModalOpen(false);
        setViewingGoal(null);
      }
      fetchGoals();
    } catch (err: any) {
      console.error('Delete goal error:', err);
      message.error(err.response?.data?.detail || 'Không thể xóa mục tiêu.');
    }
  };

  if (!isStudent) {
    return (
      <div className={`flex min-h-screen ${isDark ? 'bg-[#0b0910] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <Sidebar />
        <main className="flex-1 p-10 flex items-center justify-center">
          <div className={`p-8 rounded-3xl border max-w-md text-center space-y-4 shadow-xl ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <AimOutlined className="text-5xl text-rose-500" />
            <h2 className="text-xl font-bold">Quyền Truy Cập Bị Hạn Chế</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Chức năng <strong>Quản lý Mục tiêu</strong> chỉ dành riêng cho tài khoản Sinh viên để định hướng học tập & sự nghiệp cá nhân.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-[#0b0910] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2.5 m-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              <AimOutlined className="text-blue-500" />
              Mục Tiêu Cá Nhân
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0">
              Định hướng các mục tiêu dài hạn về học tập, sự nghiệp và phát triển bản thân (Context cho AI Planner).
            </p>
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-sm font-semibold h-10 px-5 shadow-lg shadow-blue-500/25 border-0"
          >
            Tạo Mục Tiêu Mới
          </Button>
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
                { value: 'ACTIVE', label: 'Đang thực hiện' },
                { value: 'COMPLETED', label: 'Đã hoàn thành' },
                { value: 'ARCHIVED', label: 'Đã lưu trữ' },
              ]}
            />

            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              className="w-36 text-xs"
              options={[
                { value: 'ALL', label: 'Tất cả danh mục' },
                { value: 'LEARNING', label: 'Học tập' },
                { value: 'CAREER', label: 'Sự nghiệp' },
                { value: 'PERSONAL', label: 'Cá nhân' },
                { value: 'HEALTH', label: 'Sức khỏe' },
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
                { value: 'target_date', label: 'Hạn hoàn thành' },
                { value: 'priority', label: 'Mức độ ưu tiên' },
                { value: 'updated_at', label: 'Mới cập nhật' },
              ]}
            />
          </div>
        </div>

        {/* Goal Cards Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <Spin size="large" />
            <p className="text-xs text-slate-400 mt-3">Đang tải danh sách mục tiêu...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className={`py-16 text-center rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Empty
              description={
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Chưa có mục tiêu nào. Bấm nút <strong>&quot;Tạo Mục Tiêu Mới&quot;</strong> để thiết lập mục tiêu!
                </span>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const categoryInfo = CATEGORY_CONFIG[goal.category] || CATEGORY_CONFIG.OTHER;
              const priorityInfo = PRIORITY_CONFIG[goal.priority] || PRIORITY_CONFIG.MEDIUM;

              return (
                <Card
                  key={goal.id}
                  hoverable
                  className={`rounded-2xl transition-all border ${
                    isDark ? 'bg-slate-900/90 border-slate-800 hover:border-blue-500/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                  }`}
                  bodyStyle={{ padding: '20px' }}
                >
                  <div className="flex flex-col h-full justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Category & Priority Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Tag className="rounded-full px-3 py-0.5 border-0 font-semibold text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60">
                          {categoryInfo.icon} {categoryInfo.label}
                        </Tag>
                        <Tag color={priorityInfo.color} className="rounded-full px-2.5 py-0.5 text-xs font-bold border-0">
                          Ưu tiên {priorityInfo.label}
                        </Tag>
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => {
                          setViewingGoal(goal);
                          setIsDetailModalOpen(true);
                        }}
                        className="font-bold text-base m-0 leading-snug cursor-pointer hover:text-blue-500 transition-colors line-clamp-2"
                      >
                        {goal.title}
                      </h3>

                      {/* Description preview */}
                      {goal.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 m-0 line-clamp-2 leading-relaxed">
                          {goal.description}
                        </p>
                      )}

                      {/* Target date */}
                      <div className="text-xs text-slate-400 flex items-center gap-3 pt-1 flex-wrap">
                        {goal.target_date ? (
                          <span className="flex items-center gap-1">
                            <CalendarOutlined className="text-blue-500" />
                            <span>Mục tiêu: {new Date(goal.target_date).toLocaleDateString('vi-VN')}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa đặt thời hạn</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Status Control & Actions */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      {/* Status Selector */}
                      <Select
                        value={goal.status}
                        onChange={(val) => handleStatusChange(goal.id, val)}
                        size="small"
                        className="w-36 text-xs"
                        options={[
                          { value: 'ACTIVE', label: 'Đang thực hiện' },
                          { value: 'COMPLETED', label: 'Đã hoàn thành' },
                          { value: 'ARCHIVED', label: 'Đã lưu trữ' },
                        ]}
                      />

                      {/* Edit / Delete Buttons */}
                      <div className="flex items-center gap-1">
                        <Tooltip title="Chỉnh sửa">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined className="text-slate-400 hover:text-blue-500" />}
                            onClick={() => handleOpenEdit(goal)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Xóa mục tiêu"
                          description="Bạn có chắc chắn muốn xóa mục tiêu này?"
                          onConfirm={() => handleDelete(goal.id)}
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

        {/* Create Goal Modal */}
        <Modal
          title={<span className="font-bold text-base">Tạo Mục Tiêu Mới</span>}
          open={isCreateModalOpen}
          onCancel={() => setIsCreateModalOpen(false)}
          footer={null}
          centered
          className="rounded-2xl overflow-hidden"
        >
          <Form form={createForm} layout="vertical" onFinish={handleCreate} className="mt-4 space-y-4">
            <Form.Item
              name="title"
              label="Tên mục tiêu"
              rules={[{ required: true, message: 'Vui lòng nhập tên mục tiêu!' }]}
            >
              <Input placeholder="Ví dụ: Trở thành AI Engineer, Đạt TOEIC 750, Chuẩn bị phỏng vấn thực tập..." className="rounded-xl" />
            </Form.Item>

            <Form.Item name="description" label="Mô tả chi tiết / Lộ trình">
              <TextArea rows={3} placeholder="Mô tả các tiêu chí đạt được, kiến thức cần chuẩn bị..." className="rounded-xl" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="category" label="Danh mục" initialValue="LEARNING">
                <Select className="rounded-xl">
                  <Select.Option value="LEARNING">📚 Học tập</Select.Option>
                  <Select.Option value="CAREER">💼 Sự nghiệp</Select.Option>
                  <Select.Option value="PERSONAL">👤 Cá nhân</Select.Option>
                  <Select.Option value="HEALTH">❤️ Sức khỏe</Select.Option>
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

            <Form.Item name="target_date" label="Hạn dự kiến hoàn thành">
              <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full rounded-xl" />
            </Form.Item>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button onClick={() => setIsCreateModalOpen(false)} className="rounded-xl">
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting} className="rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold">
                Tạo Mục Tiêu
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Edit Goal Modal */}
        <Modal
          title={<span className="font-bold text-base">Chỉnh Sửa Mục Tiêu</span>}
          open={isEditModalOpen}
          onCancel={() => setIsEditModalOpen(false)}
          footer={null}
          centered
          className="rounded-2xl overflow-hidden"
        >
          <Form form={editForm} layout="vertical" onFinish={handleUpdate} className="mt-4 space-y-4">
            <Form.Item
              name="title"
              label="Tên mục tiêu"
              rules={[{ required: true, message: 'Vui lòng nhập tên mục tiêu!' }]}
            >
              <Input className="rounded-xl" />
            </Form.Item>

            <Form.Item name="description" label="Mô tả chi tiết / Lộ trình">
              <TextArea rows={3} className="rounded-xl" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="category" label="Danh mục">
                <Select className="rounded-xl">
                  <Select.Option value="LEARNING">📚 Học tập</Select.Option>
                  <Select.Option value="CAREER">💼 Sự nghiệp</Select.Option>
                  <Select.Option value="PERSONAL">👤 Cá nhân</Select.Option>
                  <Select.Option value="HEALTH">❤️ Sức khỏe</Select.Option>
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
              <Form.Item name="target_date" label="Hạn dự kiến hoàn thành">
                <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full rounded-xl" />
              </Form.Item>

              <Form.Item name="status" label="Trạng thái">
                <Select className="rounded-xl">
                  <Select.Option value="ACTIVE">Đang thực hiện</Select.Option>
                  <Select.Option value="COMPLETED">Đã hoàn thành</Select.Option>
                  <Select.Option value="ARCHIVED">Đã lưu trữ</Select.Option>
                </Select>
              </Form.Item>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button onClick={() => setIsEditModalOpen(false)} className="rounded-xl">
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting} className="rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold">
                Lưu Thay Đổi
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Goal Detail Modal */}
        <Modal
          title={<span className="font-bold text-base">Chi Tiết Mục Tiêu</span>}
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="edit" onClick={() => { setIsDetailModalOpen(false); if (viewingGoal) handleOpenEdit(viewingGoal); }} className="rounded-xl">
              Chỉnh Sửa
            </Button>,
            <Button key="close" type="primary" onClick={() => setIsDetailModalOpen(false)} className="rounded-xl bg-blue-600">
              Đóng
            </Button>,
          ]}
          centered
          className="rounded-2xl overflow-hidden"
        >
          {viewingGoal && (
            <div className="mt-3 space-y-4 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-lg m-0">{viewingGoal.title}</h3>
                <Tag color={STATUS_CONFIG[viewingGoal.status]?.color} className="rounded-full px-3 py-1 font-semibold text-xs border-0">
                  {STATUS_CONFIG[viewingGoal.status]?.label}
                </Tag>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="rounded-full px-3 py-0.5 font-semibold text-blue-500 bg-blue-50 border-0">
                  {CATEGORY_CONFIG[viewingGoal.category]?.label}
                </Tag>
                <Tag color={PRIORITY_CONFIG[viewingGoal.priority]?.color} className="rounded-full px-3 py-0.5 font-bold border-0">
                  Ưu tiên: {PRIORITY_CONFIG[viewingGoal.priority]?.label}
                </Tag>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-semibold uppercase text-slate-400 m-0 mb-1">Mô tả / Lộ trình</h4>
                <p className="text-sm leading-relaxed m-0 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {viewingGoal.description || 'Chưa có mô tả.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-500">
                <div>
                  Hạn mục tiêu: <strong>{viewingGoal.target_date ? new Date(viewingGoal.target_date).toLocaleString('vi-VN') : 'Chưa đặt'}</strong>
                </div>
                <div>
                  Ngày khởi tạo: <strong>{new Date(viewingGoal.created_at).toLocaleDateString('vi-VN')}</strong>
                </div>
                <div>
                  Cập nhật lần cuối: <strong>{new Date(viewingGoal.updated_at).toLocaleDateString('vi-VN')}</strong>
                </div>
              </div>

              {/* Related information placeholder for future task linking & AI Planner */}
              <div className={`p-4 rounded-xl border border-dashed flex items-start gap-3 ${
                isDark ? 'bg-blue-950/20 border-blue-800/60 text-blue-200' : 'bg-blue-50/60 border-blue-200 text-blue-900'
              }`}>
                <RocketOutlined className="text-xl text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-bold text-xs m-0 flex items-center gap-1.5 text-blue-500">
                    <LinkOutlined /> Liên kết nhiệm vụ & AI Planner (Sắp ra mắt)
                  </h5>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 m-0">
                    Mục tiêu này sẽ tự động kết hợp cùng Bài tập (Assignments) và Nhiệm vụ cá nhân (Personal Tasks) để AI Agent lập kế hoạch học tập thông minh cho bạn.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
};

export default GoalsPage;
