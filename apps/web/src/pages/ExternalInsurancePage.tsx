import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Popconfirm,
  message,
  Tabs,
  Alert,
  Tooltip,
} from 'antd';
import {
  SafetyCertificateOutlined,
  PlusOutlined,
  SearchOutlined,
  FileExcelOutlined,
  DollarOutlined,
  HistoryOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const ExternalInsurancePage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN';

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [search, setSearch] = useState<string>('');

  // Selected Month for Tracking
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [monthlyReport, setMonthlyReport] = useState<any[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Modal Add / Edit Contributor
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [form] = Form.useForm();
  const [calcSalary, setCalcSalary] = useState<number>(5000000);
  const [calcRate, setCalcRate] = useState<number>(32);

  // Modal Record Payment
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentPerson, setPaymentPerson] = useState<any>(null);
  const [paymentForm] = Form.useForm();

  // Modal Payment History
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyPerson, setHistoryPerson] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    loadMonthlyReport();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/external-insurance', {
        params: {
          status: statusFilter,
          search: search.trim() || undefined,
        },
      });
      setData(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách gửi đóng BHXH');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    try {
      setLoadingMonthly(true);
      const res = await apiClient.get('/external-insurance/monthly-report', {
        params: { month: selectedMonth },
      });
      setMonthlyReport(res.data);
    } catch (err) {
      // handled
    } finally {
      setLoadingMonthly(false);
    }
  };

  // Tính toán nhanh mức nộp tự động khi gõ lương
  const handleSalaryOrRateChange = (salary?: number, rate?: number) => {
    const s = salary !== undefined ? salary : form.getFieldValue('insuranceSalary') || 0;
    const r = rate !== undefined ? rate : form.getFieldValue('contributionRate') || 32;
    setCalcSalary(s);
    setCalcRate(r);
    form.setFieldsValue({
      monthlyAmount: Math.round((Number(s) * Number(r)) / 100),
    });
  };

  const handleOpenAdd = () => {
    setSelectedPerson(null);
    form.resetFields();
    form.setFieldsValue({
      contributionRate: 32,
      insuranceSalary: 5000000,
      monthlyAmount: 1600000,
      startDate: dayjs(),
      status: 'ACTIVE',
    });
    setCalcSalary(5000000);
    setCalcRate(32);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    setSelectedPerson(record);
    form.resetFields();
    form.setFieldsValue({
      fullName: record.fullName,
      phone: record.phone,
      idCard: record.idCard,
      insuranceCode: record.insuranceCode,
      insuranceSalary: record.insuranceSalary,
      contributionRate: record.contributionRate || 32,
      monthlyAmount: record.monthlyAmount,
      startDate: record.startDate ? dayjs(record.startDate) : dayjs(),
      endDate: record.endDate ? dayjs(record.endDate) : null,
      status: record.status,
      notes: record.notes,
    });
    setCalcSalary(record.insuranceSalary);
    setCalcRate(record.contributionRate || 32);
    setEditModalOpen(true);
  };

  const handleSavePerson = async (values: any) => {
    try {
      const payload = {
        ...values,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
      };

      if (selectedPerson) {
        await apiClient.put(`/external-insurance/${selectedPerson.id}`, payload);
        message.success('Cập nhật hồ sơ gửi đóng BHXH thành công!');
      } else {
        await apiClient.post('/external-insurance', payload);
        message.success('Thêm người gửi đóng BHXH thành công!');
      }
      setEditModalOpen(false);
      loadData();
      loadMonthlyReport();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dữ liệu');
    }
  };

  const handleDeletePerson = async (id: string) => {
    try {
      await apiClient.delete(`/external-insurance/${id}`);
      message.success('Đã xóa hồ sơ gửi đóng BHXH');
      loadData();
      loadMonthlyReport();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xóa hồ sơ');
    }
  };

  // Mở modal thu tiền
  const handleOpenPayment = (record: any, customMonth?: string) => {
    setPaymentPerson(record);
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      month: customMonth || selectedMonth,
      amount: record.monthlyAmount,
      paymentDate: dayjs(),
      paymentMethod: 'TRANSFER',
      receiptNumber: '',
      notes: `Đóng tiền BHXH tháng ${customMonth || selectedMonth}`,
    });
    setPaymentModalOpen(true);
  };

  const handleSavePayment = async (values: any) => {
    if (!paymentPerson) return;
    try {
      const payload = {
        ...values,
        paymentDate: values.paymentDate.format('YYYY-MM-DD'),
      };
      await apiClient.post(`/external-insurance/${paymentPerson.id}/payments`, payload);
      message.success(`Đã ghi nhận thu tiền đóng BHXH tháng ${values.month}!`);
      setPaymentModalOpen(false);
      loadData();
      loadMonthlyReport();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi ghi nhận thu tiền');
    }
  };

  // Mở modal lịch sử nộp
  const handleOpenHistory = async (record: any) => {
    try {
      const res = await apiClient.get(`/external-insurance/${record.id}`);
      setHistoryPerson(res.data);
      setHistoryModalOpen(true);
    } catch (err) {
      // handled
    }
  };

  const handleDeleteHistoryPayment = async (paymentId: string) => {
    try {
      await apiClient.delete(`/external-insurance/payments/${paymentId}`);
      message.success('Đã xóa bản ghi nộp tiền');
      if (historyPerson) {
        const res = await apiClient.get(`/external-insurance/${historyPerson.id}`);
        setHistoryPerson(res.data);
      }
      loadData();
      loadMonthlyReport();
    } catch (err) {
      message.error('Không thể xóa bản ghi nộp tiền');
    }
  };

  // Xuất file Excel
  const handleExportExcel = async () => {
    try {
      message.loading({ content: 'Đang tạo file Excel...', key: 'exportInsurance' });
      const res = await apiClient.get('/external-insurance/export', { responseType: 'blob' });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Theo_Doi_Gui_Dong_BHXH_${dayjs().format('YYYYMMDD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success({ content: 'Đã xuất file Excel thành công!', key: 'exportInsurance' });
    } catch (err) {
      message.error({ content: 'Lỗi khi xuất file Excel', key: 'exportInsurance' });
    }
  };

  // Thống kê nhanh
  const activeContributors = data.filter((d) => d.status === 'ACTIVE');
  const totalSalary = activeContributors.reduce((s, d) => s + (d.insuranceSalary || 0), 0);
  const totalMonthlyAmount = activeContributors.reduce((s, d) => s + (d.monthlyAmount || 0), 0);

  const statusTags: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'Đang gửi đóng', color: 'green' },
    PAUSED: { label: 'Tạm dừng', color: 'orange' },
    STOPPED: { label: 'Đã dừng đóng', color: 'default' },
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, idx: number) => idx + 1,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (v: string, r: any) => (
        <div>
          <b style={{ fontSize: 14 }}>{v}</b>
          {r.phone && <div><small style={{ color: '#595959' }}>SĐT: {r.phone}</small></div>}
        </div>
      ),
    },
    {
      title: 'Số CCCD/CMND',
      dataIndex: 'idCard',
      key: 'idCard',
      render: (v: string) => v || '-',
    },
    {
      title: 'Mã số sổ BHXH',
      dataIndex: 'insuranceCode',
      key: 'insuranceCode',
      render: (v: string) => (
        v ? <Tag color="cyan"><b>{v}</b></Tag> : <span style={{ color: '#bfbfbf' }}>Chưa có</span>
      ),
    },
    {
      title: 'Mức lương đóng BHXH',
      dataIndex: 'insuranceSalary',
      key: 'insuranceSalary',
      align: 'right' as const,
      render: (v: number) => <span>{(v || 0).toLocaleString('vi-VN')} đ</span>,
    },
    {
      title: 'Tỷ lệ đóng',
      dataIndex: 'contributionRate',
      key: 'contributionRate',
      align: 'center' as const,
      render: (v: number) => <Tag color="blue">{v || 32}%</Tag>,
    },
    {
      title: 'Tiền phải nộp/tháng',
      dataIndex: 'monthlyAmount',
      key: 'monthlyAmount',
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>
          {(v || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Thời gian đóng',
      key: 'dates',
      render: (_: any, r: any) => (
        <div style={{ fontSize: 12 }}>
          <div>Từ: <b>{dayjs(r.startDate).format('DD/MM/YYYY')}</b></div>
          {r.endDate ? (
            <div style={{ color: '#cf1322' }}>Đến: <b>{dayjs(r.endDate).format('DD/MM/YYYY')}</b></div>
          ) : (
            <div style={{ color: '#52c41a' }}>Đến: Hiện tại</div>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        const item = statusTags[st] || { label: st, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      render: (v: string) => v || '-',
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Thu tiền đóng BHXH tháng này">
            <Button
              size="small"
              type="primary"
              style={{ background: '#10b981', borderColor: '#10b981' }}
              icon={<DollarOutlined />}
              onClick={() => handleOpenPayment(record)}
            />
          </Tooltip>

          <Tooltip title="Xem lịch sử các kỳ nộp tiền">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => handleOpenHistory(record)}
            />
          </Tooltip>

          <Tooltip title="Sửa thông tin">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>

          {isAdmin && (
            <Popconfirm
              title={`Xóa hồ sơ gửi đóng của ${record.fullName}?`}
              description="Toàn bộ lịch sử nộp tiền của người này cũng sẽ bị xóa."
              onConfirm={() => handleDeletePerson(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Alert Header */}
      <Alert
        message="Quản lý Người Gửi Đóng Bảo Hiểm Xã Hội (Ngoài Công Ty)"
        description="Dành riêng cho Ban Giám Đốc và Bộ phận Nhân sự / Kế toán theo dõi người bên ngoài gửi đóng BHXH qua công ty. Những người này không cần tạo tài khoản hệ thống và tài khoản nhân viên thông thường sẽ không nhìn thấy thông tin này."
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined />}
        style={{ marginBottom: 16 }}
      />

      {/* Top Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <Statistic
              title="Tổng người đang gửi đóng BHXH"
              value={activeContributors.length}
              suffix="người"
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
            <Statistic
              title="Tổng quỹ lương đóng BHXH"
              value={totalSalary}
              suffix="VNĐ"
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ background: '#faf5ff', borderColor: '#e9d5ff' }}>
            <Statistic
              title="Tổng tiền thu hàng tháng (Mức nộp BHXH)"
              value={totalMonthlyAmount}
              suffix="VNĐ"
              valueStyle={{ color: '#9333ea', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="list"
        items={[
          {
            key: 'list',
            label: `📋 Danh Sách Người Gửi Đóng (${data.length})`,
            children: (
              <div>
                {/* Search & Actions Bar */}
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
                  <Space wrap>
                    <Input
                      placeholder="Tìm theo Tên, SĐT, CCCD, Mã BHXH..."
                      prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onPressEnter={loadData}
                      style={{ width: 280 }}
                      allowClear
                    />
                    <Select
                      style={{ width: 160 }}
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val)}
                      options={[
                        { value: 'ALL', label: 'Tất cả trạng thái' },
                        { value: 'ACTIVE', label: 'Đang gửi đóng' },
                        { value: 'PAUSED', label: 'Tạm dừng' },
                        { value: 'STOPPED', label: 'Đã dừng đóng' },
                      ]}
                    />
                    <Button onClick={loadData}>Tìm kiếm</Button>
                  </Space>

                  <Space wrap>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleOpenAdd}
                      style={{ background: '#059669', borderColor: '#059669' }}
                    >
                      Thêm Người Gửi Đóng Mới
                    </Button>

                    <Button
                      icon={<FileExcelOutlined style={{ color: '#107c41' }} />}
                      onClick={handleExportExcel}
                    >
                      Xuất Excel Danh Sách
                    </Button>
                  </Space>
                </div>

                {/* Main Table */}
                <Table
                  dataSource={data}
                  columns={columns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 15 }}
                  scroll={{ x: 1300 }}
                />
              </div>
            ),
          },
          {
            key: 'tracking',
            label: `📅 Bảng Theo Dõi Thu Tiền Tháng (${selectedMonth})`,
            children: (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    gap: 12,
                    background: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Space wrap>
                    <span><b>Chọn tháng theo dõi:</b></span>
                    <DatePicker
                      picker="month"
                      value={dayjs(selectedMonth, 'YYYY-MM')}
                      onChange={(d) => d && setSelectedMonth(d.format('YYYY-MM'))}
                      format="MM/YYYY"
                    />
                    <Button onClick={loadMonthlyReport}>Tải lại</Button>
                  </Space>

                  <Space wrap>
                    <Tag color="green" style={{ fontSize: 13, padding: '4px 8px' }}>
                      Đã thu: {monthlyReport.filter((r) => r.isPaid).length} người
                    </Tag>
                    <Tag color="red" style={{ fontSize: 13, padding: '4px 8px' }}>
                      Chưa nộp: {monthlyReport.filter((r) => !r.isPaid && r.status === 'ACTIVE').length} người
                    </Tag>
                  </Space>
                </div>

                <Table
                  dataSource={monthlyReport}
                  rowKey="id"
                  loading={loadingMonthly}
                  pagination={{ pageSize: 20 }}
                  columns={[
                    {
                      title: 'STT',
                      key: 'stt',
                      width: 50,
                      align: 'center' as const,
                      render: (_: any, __: any, idx: number) => idx + 1,
                    },
                    {
                      title: 'Họ và tên',
                      dataIndex: 'fullName',
                      render: (name: string, r: any) => (
                        <div>
                          <b>{name}</b>
                          {r.phone && <div><small style={{ color: '#595959' }}>{r.phone}</small></div>}
                        </div>
                      ),
                    },
                    {
                      title: 'Mã số sổ BHXH',
                      dataIndex: 'insuranceCode',
                      render: (v: string) => v || '-',
                    },
                    {
                      title: 'Tiền phải nộp/tháng',
                      dataIndex: 'monthlyAmount',
                      align: 'right' as const,
                      render: (v: number) => <b>{(v || 0).toLocaleString('vi-VN')} đ</b>,
                    },
                    {
                      title: `Tình trạng nộp tháng ${selectedMonth}`,
                      key: 'paymentStatus',
                      render: (_: any, r: any) => {
                        if (r.isPaid) {
                          return (
                            <div>
                              <Tag color="green" icon={<CheckCircleOutlined />}>
                                <b>ĐÃ NỘP TIỀN</b>
                              </Tag>
                              <div style={{ fontSize: 12, color: '#059669', marginTop: 2 }}>
                                Số tiền: <b>{r.payment.amount?.toLocaleString('vi-VN')} đ</b> (Ngày {dayjs(r.payment.paymentDate).format('DD/MM')})
                              </div>
                              {r.payment.receivedBy && (
                                <small style={{ color: '#8c8c8c' }}>Người thu: {r.payment.receivedBy}</small>
                              )}
                            </div>
                          );
                        }
                        if (r.status !== 'ACTIVE') {
                          return <Tag color="default">Hồ sơ đang tạm dừng</Tag>;
                        }
                        return (
                          <Tag color="red" icon={<CloseCircleOutlined />}>
                            <b>CHƯA NỘP TIỀN</b>
                          </Tag>
                        );
                      },
                    },
                    {
                      title: 'Thao tác thu tiền',
                      key: 'action',
                      render: (_: any, r: any) =>
                        r.isPaid ? (
                          <Tag color="cyan">Đã hoàn thành</Tag>
                        ) : (
                          <Button
                            size="small"
                            type="primary"
                            icon={<DollarOutlined />}
                            style={{ background: '#059669', borderColor: '#059669' }}
                            onClick={() => handleOpenPayment(r, selectedMonth)}
                          >
                            Thu tiền tháng {selectedMonth}
                          </Button>
                        ),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Modal Thêm / Sửa Người Gửi Đóng BHXH */}
      <Modal
        title={selectedPerson ? `Chỉnh sửa hồ sơ gửi đóng: ${selectedPerson.fullName}` : 'Thêm Người Gửi Đóng BHXH Ngoài Mới'}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSavePerson}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="fullName"
                label="Họ và tên người gửi đóng"
                rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
              >
                <Input placeholder="VD: Nguyễn Thị Lan" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Số điện thoại liên hệ">
                <Input placeholder="VD: 0988123456" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="idCard" label="Số CCCD / CMND">
                <Input placeholder="VD: 001200008899" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="insuranceCode" label="Mã số sổ BHXH (nếu có)">
                <Input placeholder="VD: 0123456789" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="insuranceSalary"
                label="Mức lương đóng BHXH (VNĐ)"
                rules={[{ required: true, message: 'Vui lòng nhập mức lương đóng BHXH' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => val?.replace(/\$\s?|(,*)/g, '') as any}
                  onChange={(val) => handleSalaryOrRateChange(Number(val) || 0, undefined)}
                  placeholder="5000000"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="contributionRate" label="Tỷ lệ đóng (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={100}
                  onChange={(val) => handleSalaryOrRateChange(undefined, Number(val) || 32)}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="monthlyAmount"
                label="Tiền phải nộp/tháng (VNĐ)"
                rules={[{ required: true, message: 'Nhập số tiền nộp hàng tháng' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => val?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
            <small style={{ color: '#166534' }}>
              💡 <b>Gợi ý công thức:</b> Lương đóng <b>{calcSalary.toLocaleString('vi-VN')} đ</b> × Tỷ lệ <b>{calcRate}%</b> = <b>{Math.round((calcSalary * calcRate) / 100).toLocaleString('vi-VN')} đ/tháng</b>.
            </small>
          </div>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="startDate"
                label="Ngày bắt đầu gửi đóng"
                rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="endDate" label="Ngày kết thúc (nếu có)">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Để trống nếu đang đóng" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="status" label="Trạng thái hồ sơ">
                <Select
                  options={[
                    { value: 'ACTIVE', label: 'Đang gửi đóng' },
                    { value: 'PAUSED', label: 'Tạm dừng' },
                    { value: 'STOPPED', label: 'Đã dừng đóng' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Ghi chú chi tiết">
            <Input.TextArea rows={2} placeholder="VD: Người nhà nhân viên phòng Thiết kế, đóng tiền mặt vào ngày mùng 5 hàng tháng..." />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setEditModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu Hồ Sơ
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Thu Tiền Đóng BHXH */}
      <Modal
        title={`Ghi nhận thu tiền BHXH: ${paymentPerson?.fullName || ''}`}
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={paymentForm} layout="vertical" onFinish={handleSavePayment}>
          <Form.Item
            name="month"
            label="Kỳ đóng BHXH (Tháng YYYY-MM)"
            rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập tháng' }]}
          >
            <Input placeholder="2026-11" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Số tiền thu (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => val?.replace(/\$\s?|(,*)/g, '') as any}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="paymentDate"
                label="Ngày nộp tiền"
                rules={[{ required: true, message: 'Chọn ngày nộp tiền' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentMethod" label="Hình thức thanh toán">
                <Select
                  options={[
                    { value: 'TRANSFER', label: 'Chuyển khoản' },
                    { value: 'CASH', label: 'Tiền mặt' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="receiptNumber" label="Mã giao dịch / Số phiếu thu">
            <Input placeholder="VD: VCB.10293847 hoặc PT-11/01" />
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú">
            <Input placeholder="Ghi chú thêm nếu có..." />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setPaymentModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Xác Nhận Đã Thu Tiền
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Lịch Sử Các Kỳ Nộp Tiền */}
      <Modal
        title={`Lịch sử nộp tiền đóng BHXH: ${historyPerson?.fullName || ''}`}
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setHistoryModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={700}
      >
        <div style={{ marginBottom: 12 }}>
          <span>Mức nộp tiêu chuẩn: <b>{(historyPerson?.monthlyAmount || 0).toLocaleString('vi-VN')} đ/tháng</b></span>
        </div>
        <Table
          dataSource={historyPerson?.payments || []}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: 'Tháng',
              dataIndex: 'month',
              render: (m: string) => <Tag color="blue"><b>Tháng {m}</b></Tag>,
            },
            {
              title: 'Số tiền nộp',
              dataIndex: 'amount',
              align: 'right' as const,
              render: (v: number) => <b style={{ color: '#059669' }}>{(v || 0).toLocaleString('vi-VN')} đ</b>,
            },
            {
              title: 'Ngày nộp',
              dataIndex: 'paymentDate',
              render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
            },
            {
              title: 'Hình thức',
              dataIndex: 'paymentMethod',
              render: (v: string) => (v === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'),
            },
            {
              title: 'Người thu tiền',
              dataIndex: 'receivedBy',
            },
            {
              title: 'Mã GD / Phiếu thu',
              dataIndex: 'receiptNumber',
              render: (v: string) => v || '-',
            },
            {
              title: 'Xóa',
              key: 'action',
              render: (_: any, r: any) => (
                isAdmin && (
                  <Popconfirm
                    title="Xóa bản ghi nộp tiền này?"
                    onConfirm={() => handleDeleteHistoryPayment(r.id)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};
