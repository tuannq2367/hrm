import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  InputNumber,
  Space,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Alert,
  Radio,
  Typography,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RequestType } from '@snake/shared';

const { Text } = Typography;

interface LeaveBalanceInfo {
  year: number;
  totalEntitled: number;
  seniorityBonus: number;
  usedBeforeSystem?: number;
  systemUsed?: number;
  used: number;
  remaining: number;
  pendingDays: number;
  available: number;
}

export const RequestsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrHr = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN' || user?.role === 'HR';
  const [requests, setRequests] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedType, setSelectedType] = useState<string>(RequestType.LATE_EARLY_EXEMPT);
  const [leaveDuration, setLeaveDuration] = useState<'FULL' | 'MORNING' | 'AFTERNOON'>('FULL');
  const [punchUnits, setPunchUnits] = useState<number>(1.0);

  // Quản lý nhân viên khi Admin/HR đăng ký hộ cho người khác
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployeeBalance, setSelectedEmployeeBalance] = useState<LeaveBalanceInfo | null>(null);

  // Bộ lọc danh sách đơn từ
  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterEmpId, setFilterEmpId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  useEffect(() => {
    setCurrentPage(1);
    loadRequests();
  }, [filterMonth, filterType, filterStatus, filterEmpId]);

  useEffect(() => {
    loadLeaveBalance();
    if (isAdminOrHr) {
      loadEmployees();
    }
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const url = isAdminOrHr ? '/requests' : '/requests/my';
      const params: any = {};
      if (filterMonth) params.month = filterMonth;
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (isAdminOrHr && filterEmpId) params.employeeId = filterEmpId;

      const res = await apiClient.get(url, { params });
      setRequests(res.data);
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveBalance = async () => {
    try {
      const res = await apiClient.get('/requests/leave-balance');
      setLeaveBalance(res.data);
    } catch (err) {
      // User might be purely admin with no employee profile
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await apiClient.get('/employees');
      setEmployees(res.data.filter((e: any) => e.status !== 'RESIGNED'));
    } catch (err) {
      // handled
    }
  };

  const loadSelectedEmployeeLeaveBalance = async (empId: string) => {
    try {
      const res = await apiClient.get(`/requests/leave-balance?employeeId=${empId}`);
      setSelectedEmployeeBalance(res.data);
    } catch (err) {
      setSelectedEmployeeBalance(null);
    }
  };

  const handleOpenCreateModal = () => {
    form.resetFields();
    const defaultEmpId = user?.employee?.id || (employees.length > 0 ? employees[0].id : undefined);
    form.setFieldsValue({
      type: RequestType.LATE_EARLY_EXEMPT,
      targetDate: dayjs(),
      employeeId: defaultEmpId,
      autoApprove: isAdminOrHr,
    });
    setSelectedType(RequestType.LATE_EARLY_EXEMPT);
    setLeaveDuration('FULL');
    setPunchUnits(1.0);
    setSelectedEmployeeId(defaultEmpId || null);
    if (defaultEmpId) {
      loadSelectedEmployeeLeaveBalance(defaultEmpId);
    }
    setCreateModalOpen(true);
  };

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmployeeId(empId);
    loadSelectedEmployeeLeaveBalance(empId);
  };

  const handleCreate = async (values: any) => {
    try {
      const payload: any = {
        ...values,
        targetDate: values.targetDate.format('YYYY-MM-DD'),
      };

      if (isAdminOrHr && values.employeeId) {
        payload.employeeId = values.employeeId;
        payload.autoApprove = Boolean(values.autoApprove);
      }

      // Xử lý đơn nghỉ phép năm hoặc nghỉ không lương
      if (values.type === RequestType.LEAVE || values.type === RequestType.UNPAID_LEAVE) {
        if (leaveDuration === 'FULL') {
          payload.minutes = 480;
        } else if (leaveDuration === 'MORNING') {
          payload.minutes = 240;
          payload.startTime = '08:00';
          payload.endTime = '12:00';
        } else if (leaveDuration === 'AFTERNOON') {
          payload.minutes = 240;
          payload.startTime = '13:00';
          payload.endTime = '17:00';
        }
      }

      // Xử lý đơn giải trình quên chấm công (1.0, 0.75, 0.5, 0.25 công)
      if (values.type === RequestType.MISSING_PUNCH) {
        payload.minutes = Math.round(punchUnits * 480);
      }

      await apiClient.post('/requests', payload);
      message.success('Gửi đơn xin phép thành công!');
      setCreateModalOpen(false);
      form.resetFields();
      loadRequests();
      loadLeaveBalance();
      if (selectedEmployeeId) {
        loadSelectedEmployeeLeaveBalance(selectedEmployeeId);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi đơn';
      message.error(msg);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await apiClient.put(`/requests/${id}/review`, { status });
      message.success(status === 'APPROVED' ? 'Đã duyệt đơn!' : 'Đã từ chối đơn!');
      loadRequests();
      loadLeaveBalance();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi khi phê duyệt đơn';
      message.error(msg);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await apiClient.put(`/requests/${id}/cancel`);
      message.success('Đã hủy đơn');
      loadRequests();
      loadLeaveBalance();
    } catch (err) {
      // handled
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/requests/${id}`);
      message.success('Đã xóa phiếu xin phép thành công');
      loadRequests();
      loadLeaveBalance();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi khi xóa phiếu xin phép';
      message.error(msg);
    }
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    [RequestType.LATE_EARLY_EXEMPT]: { label: 'Đi muộn / Về sớm (Miễn)', color: 'blue' },
    [RequestType.LATE_EARLY_MAKEUP]: { label: 'Đi muộn / Về sớm (Xin làm bù)', color: 'purple' },
    [RequestType.MAKEUP]: { label: 'Đăng ký làm bù sau 17h', color: 'cyan' },
    [RequestType.OT]: { label: 'Làm thêm giờ (OT sau 17h)', color: 'gold' },
    [RequestType.THROUGH_LUNCH]: { label: 'Làm thông trưa (Về sớm 16h)', color: 'magenta' },
    [RequestType.LEAVE]: { label: 'Nghỉ phép năm (Có lương)', color: 'green' },
    [RequestType.UNPAID_LEAVE]: { label: 'Nghỉ không lương', color: 'volcano' },
    [RequestType.MISSING_PUNCH]: { label: 'Giải trình quên chấm công', color: 'orange' },
  };

  const requiredDays = leaveDuration === 'FULL' ? 1 : 0.5;
  const currentBalance = (isAdminOrHr && selectedEmployeeBalance) ? selectedEmployeeBalance : leaveBalance;
  const isOutOfLeave = Boolean(selectedType === RequestType.LEAVE && currentBalance && (currentBalance.available < requiredDays));

  const filteredRequests = requests.filter((r) => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    const empName = (r.employee?.fullName || '').toLowerCase();
    const empCode = (r.employee?.employeeCode || '').toLowerCase();
    const reason = (r.reason || '').toLowerCase();
    const adminNote = (r.adminNote || '').toLowerCase();
    return empName.includes(kw) || empCode.includes(kw) || reason.includes(kw) || adminNote.includes(kw);
  });

  const columns = [
    ...(isAdminOrHr
      ? [
          {
            title: 'Nhân viên',
            key: 'emp',
            render: (_: any, r: any) => (
              <div>
                <b>{r.employee?.fullName}</b>
                <div>
                  <small style={{ color: '#8c8c8c' }}>
                    {r.employee?.employeeCode} - {r.employee?.department?.name || ''}
                  </small>
                </div>
              </div>
            ),
          },
        ]
      : []),
    {
      title: 'Loại đơn',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => {
        const item = typeLabels[t] || { label: t, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Ngày áp dụng',
      dataIndex: 'targetDate',
      key: 'targetDate',
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Thời lượng / Giờ',
      dataIndex: 'minutes',
      key: 'minutes',
      render: (m: number, r: any) => {
        if (r.type === RequestType.LEAVE || r.type === RequestType.UNPAID_LEAVE) {
          if (m === 480) return <Tag color="blue">Cả ngày (1 ngày)</Tag>;
          if (m === 240) return <Tag color="cyan">Nửa ngày (0.5 ngày)</Tag>;
          if (m) return `${(m / 480).toFixed(1)} ngày`;
        }
        if (r.type === RequestType.MISSING_PUNCH) {
          const u = m ? Number((m / 480).toFixed(2)) : 1.0;
          if (u === 1) return <Tag color="green">Tính 1 công (1.0)</Tag>;
          if (u === 0.75) return <Tag color="blue">Tính 3/4 công (0.75)</Tag>;
          if (u === 0.5) return <Tag color="cyan">Tính 1/2 công (0.5)</Tag>;
          if (u === 0.25) return <Tag color="orange">Tính 1/4 công (0.25)</Tag>;
          return <Tag color="green">Tính {u} công</Tag>;
        }
        if (m) return `${m} phút`;
        if (r.startTime && r.endTime) return `${r.startTime} - ${r.endTime}`;
        return '-';
      },
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        if (st === 'APPROVED') return <Tag color="green">Đã duyệt</Tag>;
        if (st === 'REJECTED') return <Tag color="red">Từ chối</Tag>;
        if (st === 'CANCELLED') return <Tag>Đã hủy</Tag>;
        return <Tag color="orange">Chờ duyệt</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="small">
          {isAdminOrHr && record.status === 'PENDING' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleReview(record.id, 'APPROVED')}
              >
                Duyệt
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleReview(record.id, 'REJECTED')}
              >
                Từ chối
              </Button>
            </>
          )}

          {!isAdminOrHr && record.status === 'PENDING' && (
            <Popconfirm
              title="Bạn muốn hủy đơn này?"
              onConfirm={() => handleCancel(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Hủy
              </Button>
            </Popconfirm>
          )}

          {isAdminOrHr && (
            <Popconfirm
              title="Xóa phiếu xin phép"
              description="Bạn có chắc chắn muốn xóa phiếu xin phép này? (Nếu là đơn phép năm đã duyệt, hệ thống sẽ tự động hoàn trả ngày phép vào quỹ)"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} title="Admin xóa phiếu">
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Thẻ Quỹ Phép Năm của nhân viên */}
      {leaveBalance && (
        <Card
          size="small"
          style={{
            marginBottom: 16,
            borderRadius: 8,
            background: leaveBalance.available > 0 ? '#f6ffed' : '#fff2f0',
            borderColor: leaveBalance.available > 0 ? '#b7eb8f' : '#ffccc7',
          }}
        >
          <Row align="middle" justify="space-between" gutter={[12, 12]}>
            <Col xs={24} md={16}>
              <Space wrap size={[8, 8]}>
                <span style={{ fontWeight: 600, color: '#262626', fontSize: 14 }}>
                  <CalendarOutlined style={{ marginRight: 6, color: '#52c41a' }} />
                  Quỹ phép năm {leaveBalance.year}:
                </span>
                <Tag color="blue">
                  Tổng tiêu chuẩn: <b>{leaveBalance.totalEntitled}</b> ngày
                  {leaveBalance.seniorityBonus > 0 && ` (+${leaveBalance.seniorityBonus} thâm niên)`}
                </Tag>
                <Tag color="orange">
                  Đã sử dụng: <b>{leaveBalance.used}</b> ngày
                  {Number(leaveBalance.usedBeforeSystem || 0) > 0 && ` (Trước PM: ${leaveBalance.usedBeforeSystem}n, HT: ${leaveBalance.systemUsed || 0}n)`}
                </Tag>
                {leaveBalance.pendingDays > 0 && (
                  <Tag color="warning">
                    Chờ duyệt: <b>{leaveBalance.pendingDays}</b> ngày
                  </Tag>
                )}
                <Tag color={leaveBalance.available > 0 ? 'green' : 'red'}>
                  Khả dụng còn lại: <b>{leaveBalance.available}</b> ngày
                </Tag>
              </Space>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: 'right' }}>
              {leaveBalance.available <= 0 ? (
                <Text type="danger" style={{ fontSize: 12, fontWeight: 600 }}>
                  ⚠️ Đã hết phép năm. Xin nghỉ thêm vui lòng chọn "Nghỉ không lương".
                </Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  * Quy tắc: 12 ngày/năm + 1 ngày cho mỗi 5 năm thâm niên.
                </Text>
              )}
            </Col>
          </Row>
        </Card>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space wrap align="center">
          <h3 style={{ margin: 0 }}>Quản lý Đơn từ & Phê duyệt</h3>
          <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
            Tổng: <b>{filteredRequests.length}</b> đơn
          </Tag>
        </Space>
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadRequests()}
            loading={loading}
          >
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
          >
            {isAdminOrHr ? 'Đăng ký đơn xin phép (Bản thân / Hộ nhân sự)' : 'Gửi đơn xin phép mới'}
          </Button>
        </Space>
      </div>

      {/* Thanh bộ lọc đơn từ: Theo tháng, theo loại đơn, theo trạng thái, nhân viên */}
      <Card
        size="small"
        style={{
          marginBottom: 16,
          borderRadius: 8,
          background: '#fafafa',
          borderColor: '#d9d9d9',
        }}
      >
        <Row gutter={[12, 12]} align="middle">
          {/* 1. Lọc theo tháng */}
          <Col xs={24} sm={12} md={5}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#595959' }}>
              📅 Lọc theo tháng:
            </div>
            <DatePicker
              picker="month"
              placeholder="Tất cả các tháng"
              format="MM/YYYY"
              allowClear
              value={filterMonth ? dayjs(filterMonth, 'YYYY-MM') : null}
              onChange={(d) => setFilterMonth(d ? d.format('YYYY-MM') : null)}
              style={{ width: '100%' }}
            />
          </Col>

          {/* 2. Lọc theo loại đơn */}
          <Col xs={24} sm={12} md={5}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#595959' }}>
              📋 Loại đơn xin phép:
            </div>
            <Select
              placeholder="-- Tất cả loại đơn --"
              allowClear
              value={filterType || undefined}
              onChange={(val) => setFilterType(val || null)}
              style={{ width: '100%' }}
              options={[
                { value: '', label: '-- Tất cả loại đơn --' },
                ...Object.entries(typeLabels).map(([val, item]) => ({
                  value: val,
                  label: item.label,
                })),
              ]}
            />
          </Col>

          {/* 3. Lọc theo trạng thái duyệt */}
          <Col xs={24} sm={12} md={4}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#595959' }}>
              🏷️ Trạng thái:
            </div>
            <Select
              placeholder="-- Tất cả trạng thái --"
              allowClear
              value={filterStatus || undefined}
              onChange={(val) => setFilterStatus(val || null)}
              style={{ width: '100%' }}
              options={[
                { value: '', label: '-- Tất cả trạng thái --' },
                { value: 'PENDING', label: '⏳ Chờ duyệt' },
                { value: 'APPROVED', label: '✅ Đã duyệt' },
                { value: 'REJECTED', label: '❌ Từ chối' },
                { value: 'CANCELLED', label: '🚫 Đã hủy' },
              ]}
            />
          </Col>

          {/* 4. Lọc theo nhân viên (Admin/HR) */}
          {isAdminOrHr && (
            <Col xs={24} sm={12} md={5}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#595959' }}>
                👤 Nhân sự:
              </div>
              <Select
                showSearch
                placeholder="-- Tất cả nhân sự --"
                allowClear
                optionFilterProp="label"
                value={filterEmpId || undefined}
                onChange={(val) => setFilterEmpId(val || null)}
                style={{ width: '100%' }}
                options={[
                  { value: '', label: '-- Tất cả nhân sự --' },
                  ...employees.map((emp) => ({
                    value: emp.id,
                    label: `${emp.fullName} (${emp.employeeCode})`,
                  })),
                ]}
              />
            </Col>
          )}

          {/* 5. Tìm kiếm theo lý do, ghi chú */}
          <Col xs={24} sm={12} md={isAdminOrHr ? 5 : 10}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#595959' }}>
              🔍 Tìm kiếm nội dung:
            </div>
            <Input.Search
              placeholder="Tìm theo lý do / ghi chú / tên..."
              allowClear
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        {/* Thẻ hiển thị các bộ lọc đang kích hoạt */}
        {(filterMonth || filterType || filterStatus || filterEmpId || searchKeyword) && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 600 }}>
              <FilterOutlined style={{ marginRight: 4 }} />
              Đang lọc:
            </span>
            {filterMonth && (
              <Tag closable onClose={() => setFilterMonth(null)} color="blue">
                Tháng: <b>{dayjs(filterMonth, 'YYYY-MM').format('MM/YYYY')}</b>
              </Tag>
            )}
            {filterType && (
              <Tag closable onClose={() => setFilterType(null)} color="purple">
                Loại: <b>{typeLabels[filterType]?.label || filterType}</b>
              </Tag>
            )}
            {filterStatus && (
              <Tag closable onClose={() => setFilterStatus(null)} color="orange">
                Trạng thái:{' '}
                <b>
                  {filterStatus === 'PENDING'
                    ? 'Chờ duyệt'
                    : filterStatus === 'APPROVED'
                    ? 'Đã duyệt'
                    : filterStatus === 'REJECTED'
                    ? 'Từ chối'
                    : 'Đã hủy'}
                </b>
              </Tag>
            )}
            {filterEmpId && (
              <Tag closable onClose={() => setFilterEmpId(null)} color="cyan">
                Nhân sự: <b>{employees.find((e) => e.id === filterEmpId)?.fullName || filterEmpId}</b>
              </Tag>
            )}
            {searchKeyword && (
              <Tag closable onClose={() => setSearchKeyword('')}>
                Từ khóa: "<b>{searchKeyword}</b>"
              </Tag>
            )}
            <Button
              size="small"
              type="link"
              danger
              onClick={() => {
                setFilterMonth(null);
                setFilterType(null);
                setFilterStatus(null);
                setFilterEmpId(null);
                setSearchKeyword('');
              }}
            >
              Xóa tất cả bộ lọc
            </Button>
          </div>
        )}
      </Card>

      <Table
        dataSource={filteredRequests}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '15', '20', '30', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn`,
          onChange: (page, size) => {
            setCurrentPage(page);
            if (size && size !== pageSize) {
              setPageSize(size);
            }
          },
          onShowSizeChange: (_curr, size) => {
            setCurrentPage(1);
            setPageSize(size);
          },
        }}
      />

      {/* Modal Tạo đơn mới */}
      <Modal
        title={isAdminOrHr ? 'Đăng ký đơn xin phép (Admin / Quản lý)' : 'Gửi đơn xin phép mới'}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          {isAdminOrHr && (
            <Form.Item
              name="employeeId"
              label="Nhân viên xin phép"
              rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
              tooltip="Quản trị viên có thể tạo đơn hộ cho bất kỳ nhân sự nào trong công ty"
            >
              <Select
                showSearch
                placeholder="-- Chọn nhân viên cần đăng ký hộ --"
                optionFilterProp="label"
                onChange={handleEmployeeChange}
                options={employees.map((emp) => ({
                  value: emp.id,
                  label: `${emp.fullName} (${emp.employeeCode}) - ${emp.department?.name || 'Chưa xếp phòng'}`,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="type"
            label="Loại đơn"
            rules={[{ required: true }]}
          >
            <Select
              onChange={(val) => {
                setSelectedType(val);
                if (val === RequestType.LEAVE || val === RequestType.UNPAID_LEAVE) {
                  setLeaveDuration('FULL');
                }
              }}
              options={Object.entries(typeLabels).map(([val, item]) => ({
                value: val,
                label: item.label,
              }))}
            />
          </Form.Item>

          {/* Cảnh báo và hướng dẫn quỹ phép khi chọn Nghỉ phép năm */}
          {selectedType === RequestType.LEAVE && currentBalance && (
            <div style={{ marginBottom: 16 }}>
              {isOutOfLeave ? (
                <Alert
                  type="error"
                  showIcon
                  icon={<WarningOutlined />}
                  message="Không đủ số ngày phép năm có hưởng lương"
                  description={
                    <div>
                      <div>
                        Quỹ phép khả dụng còn: <b>{currentBalance.available} ngày</b> (Đã dùng: {currentBalance.used}/{currentBalance.totalEntitled} ngày{currentBalance.pendingDays > 0 ? `, Đang chờ duyệt: ${currentBalance.pendingDays} ngày` : ''}).
                      </div>
                      <div style={{ marginTop: 6, color: '#cf1322', fontWeight: 500 }}>
                        Theo quy định, nhân sự không thể xin thêm ngày nghỉ có hưởng lương. Vui lòng chuyển sang "Nghỉ không lương".
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Button
                          size="small"
                          danger
                          type="primary"
                          onClick={() => {
                            form.setFieldsValue({ type: RequestType.UNPAID_LEAVE });
                            setSelectedType(RequestType.UNPAID_LEAVE);
                          }}
                        >
                          Chuyển sang "Nghỉ không lương"
                        </Button>
                      </div>
                    </div>
                  }
                />
              ) : (
                <Alert
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  message={`Quỹ phép năm khả dụng: ${currentBalance.available} ngày (Tổng: ${currentBalance.totalEntitled} ngày)`}
                  description={
                    isAdminOrHr
                      ? 'Admin đăng ký hộ: Nếu tích chọn Tự động duyệt ngay, hệ thống sẽ trừ trực tiếp vào quỹ phép của nhân sự này.'
                      : 'Khi đơn được Admin duyệt, hệ thống sẽ tự động trừ vào số ngày phép năm của bạn.'
                  }
                />
              )}
            </div>
          )}

          {isAdminOrHr && (
            <Form.Item
              name="autoApprove"
              valuePropName="checked"
              extra="Tự động duyệt đơn ngay khi bấm Lưu mà không cần qua trạng thái Chờ duyệt"
            >
              <Checkbox style={{ fontWeight: 600, color: '#1677ff' }}>
                ⚡ Tự động phê duyệt đơn ngay lập tức (Duyệt bởi Admin)
              </Checkbox>
            </Form.Item>
          )}

          <Form.Item
            name="targetDate"
            label="Ngày xin phép"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          {/* Lựa chọn thời lượng nghỉ cho Đơn Nghỉ phép năm hoặc Nghỉ không lương */}
          {(selectedType === RequestType.LEAVE || selectedType === RequestType.UNPAID_LEAVE) && (
            <Form.Item label="Thời lượng nghỉ" required>
              <Radio.Group
                value={leaveDuration}
                onChange={(e) => setLeaveDuration(e.target.value)}
                buttonStyle="solid"
                style={{ width: '100%', display: 'flex', gap: 8 }}
              >
                <Radio.Button value="FULL" style={{ flex: 1, textAlign: 'center' }}>
                  Cả ngày (1 ngày)
                </Radio.Button>
                <Radio.Button value="MORNING" style={{ flex: 1, textAlign: 'center' }}>
                  Nửa ngày sáng (0.5 ngày)
                </Radio.Button>
                <Radio.Button value="AFTERNOON" style={{ flex: 1, textAlign: 'center' }}>
                  Nửa ngày chiều (0.5 ngày)
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}

          {/* Lựa chọn mức công giải trình quên quẹt thẻ */}
          {selectedType === RequestType.MISSING_PUNCH && (
            <Form.Item label="Mức công giải trình đề xuất được tính" required>
              <Radio.Group
                value={punchUnits}
                onChange={(e) => setPunchUnits(e.target.value)}
                buttonStyle="solid"
                style={{ width: '100%', display: 'flex', gap: 6 }}
              >
                <Radio.Button value={1.0} style={{ flex: 1, textAlign: 'center' }}>
                  1.0 công
                </Radio.Button>
                <Radio.Button value={0.75} style={{ flex: 1, textAlign: 'center' }}>
                  3/4 công (0.75)
                </Radio.Button>
                <Radio.Button value={0.5} style={{ flex: 1, textAlign: 'center' }}>
                  1/2 công (0.5)
                </Radio.Button>
                <Radio.Button value={0.25} style={{ flex: 1, textAlign: 'center' }}>
                  1/4 công (0.25)
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}

          {(selectedType === RequestType.LATE_EARLY_EXEMPT ||
            selectedType === RequestType.LATE_EARLY_MAKEUP ||
            selectedType === RequestType.MAKEUP) && (
            <Form.Item
              name="minutes"
              label="Số phút xin phép (hoặc số phút đăng ký bù sau 17h)"
              rules={[{ required: true, message: 'Vui lòng nhập số phút' }]}
            >
              <InputNumber min={5} max={480} style={{ width: '100%' }} placeholder="VD: 30" />
            </Form.Item>
          )}

          {selectedType === RequestType.OT && (
            <Form.Item
              name="minutes"
              label="Số phút đăng ký làm thêm giờ (sau 17h)"
              rules={[{ required: true }]}
            >
              <InputNumber min={30} step={30} style={{ width: '100%' }} placeholder="VD: 120 (2 tiếng)" />
            </Form.Item>
          )}

          <Form.Item
            name="reason"
            label="Lý do chi tiết"
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết lý do..." />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setCreateModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              disabled={isOutOfLeave}
            >
              {isOutOfLeave ? 'Không đủ ngày phép' : 'Gửi đơn'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
