import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Descriptions,
  Tag,
  Button,
  Table,
  Modal,
  Form,
  Select,
  DatePicker,
  InputNumber,
  Input,
  message,
  Alert,
  Row,
  Col,
  Statistic,
  Checkbox,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  RiseOutlined,
  BankOutlined,
  CalendarOutlined,
  EditOutlined,
  DollarCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SalaryBreakdownPreview } from './EmployeesPage';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrHr = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN' || user?.role === 'HR';
  const isSuperAdmin = user?.role === 'ADMIN';
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [empLeaveBalance, setEmpLeaveBalance] = useState<any>(null);

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm] = Form.useForm();
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Raise modal
  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [raiseForm] = Form.useForm();

  // Salary Config Modal
  const [salaryConfigModalOpen, setSalaryConfigModalOpen] = useState(false);
  const [salaryConfigForm] = Form.useForm();

  const configAgreedSalary = Form.useWatch('agreedSalary', salaryConfigForm);
  const configCustomBaseSalary = Form.useWatch('customBaseSalary', salaryConfigForm);
  const configManagementLevel = Form.useWatch('managementLevel', salaryConfigForm);
  const configKpiSalary = Form.useWatch('kpiSalary', salaryConfigForm);
  const configHasInsurance = Form.useWatch('hasInsurance', salaryConfigForm);
  const configInsuranceSalary = Form.useWatch('insuranceSalary', salaryConfigForm);

  // Edit leave balance modal
  const [editLeaveModalOpen, setEditLeaveModalOpen] = useState(false);
  const [leaveForm] = Form.useForm();
  const watchLeaveTotal = Form.useWatch('totalEntitled', leaveForm);
  const watchLeaveUsedBefore = Form.useWatch('usedBeforeSystem', leaveForm);

  useEffect(() => {
    loadDetail();
    loadLeaveBalance();
  }, [id]);

  const loadLeaveBalance = async () => {
    try {
      const res = await apiClient.get(`/requests/leave-balance?employeeId=${id}`);
      setEmpLeaveBalance(res.data);
    } catch (err) {
      // ignore
    }
  };

  const handleUpdateLeave = async (values: any) => {
    try {
      await apiClient.put(`/requests/leave-balance/${id}`, {
        totalEntitled: values.totalEntitled,
        usedBeforeSystem: values.usedBeforeSystem,
        seniorityBonus: values.seniorityBonus,
      });
      message.success('Cập nhật quỹ phép năm thành công!');
      setEditLeaveModalOpen(false);
      loadLeaveBalance();
      loadDetail();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi khi cập nhật quỹ phép');
    }
  };

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/employees/${id}`);
      setEmployee(res.data);
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (values: any) => {
    if (!selectedFile) {
      message.error('Vui lòng chọn file');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', values.type);
    if (values.expiryDate) {
      formData.append('expiryDate', values.expiryDate.format('YYYY-MM-DD'));
    }

    try {
      await apiClient.post(`/employees/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Tải lên giấy tờ thành công!');
      setUploadModalOpen(false);
      setSelectedFile(null);
      uploadForm.resetFields();
      loadDetail();
    } catch (err) {
      // handled
    }
  };

  const handleAddRaise = async (values: any) => {
    try {
      await apiClient.post(`/employees/${id}/salary-raise`, {
        agreedSalary: values.agreedSalary,
        baseSalary: values.baseSalary,
        managementLevel: values.managementLevel,
        kpiSalary: values.kpiSalary !== undefined ? Number(values.kpiSalary) : 0,
        effectiveDate: values.effectiveDate.format('YYYY-MM-DD'),
        note: values.note,
      });
      message.success('Thêm quyết định tăng lương thành công!');
      setRaiseModalOpen(false);
      raiseForm.resetFields();
      loadDetail();
    } catch (err) {
      // handled
    }
  };

  const handleDeleteSalaryProfile = async (profileId: string) => {
    try {
      await apiClient.delete(`/employees/${id}/salary-profile/${profileId}`);
      message.success('Đã xóa đợt tăng lương thành công!');
      loadDetail();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi xóa đợt tăng lương';
      message.error(msg);
    }
  };

  const handleSaveSalaryConfig = async (values: any) => {
    try {
      await apiClient.put(`/employees/${id}`, {
        agreedSalary: values.agreedSalary,
        customBaseSalary: values.customBaseSalary ? Number(values.customBaseSalary) : null,
        managementLevel: Number(values.managementLevel || 0),
        kpiSalary: values.kpiSalary !== undefined ? Number(values.kpiSalary) : 0,
        hasInsurance: Boolean(values.hasInsurance),
        insuranceSalary: values.hasInsurance && values.insuranceSalary ? Number(values.insuranceSalary) : null,
        salaryNote: values.salaryNote || 'Cập nhật cấu hình lương & KPI',
      });
      message.success('Cập nhật cấu hình Lương & KPI thành công!');
      setSalaryConfigModalOpen(false);
      loadDetail();
    } catch (err) {
      // handled
    }
  };

  if (!employee) return <div>Đang tải thông tin...</div>;

  const docTypeLabels: Record<string, string> = {
    ID_CARD_FRONT: 'CCCD mặt trước',
    ID_CARD_BACK: 'CCCD mặt sau',
    RESUME: 'Sơ yếu lý lịch',
    AVATAR: 'Ảnh thẻ 3x4',
    DEGREE: 'Bằng cấp / Chứng chỉ',
    HEALTH_CERT: 'Giấy khám sức khỏe',
    LABOR_CONTRACT: 'Bản scan hợp đồng',
    OTHER: 'Giấy tờ khác',
  };

  const requiredDocTypes = ['ID_CARD_FRONT', 'ID_CARD_BACK', 'RESUME', 'AVATAR'];
  const uploadedDocTypes = (employee.documents || []).map((d: any) => d.type);
  const missingDocs = requiredDocTypes.filter((t) => !uploadedDocTypes.includes(t));

  const latestSalaryProfile = employee.salaryProfiles?.[0];
  const agreedSalary = latestSalaryProfile?.agreedSalary || 0;
  const lcb = employee.customBaseSalary && employee.customBaseSalary > 0 ? employee.customBaseSalary : 5681700;
  const pc = agreedSalary * 0.1;
  const mgmtSalaries = [0, 1000000, 2000000, 3000000];
  const mgmtLevel = latestSalaryProfile?.managementLevel || 0;
  const lql = mgmtSalaries[mgmtLevel] || 0;
  const totalLkn = Math.max(0, agreedSalary - lcb - pc - lql);
  const kpiSal = latestSalaryProfile?.kpiSalary ?? employee.kpiSalary ?? 0;
  const effectiveKpi = Math.min(totalLkn, Math.max(0, kpiSal));
  const lknFixed = Math.max(0, totalLkn - effectiveKpi);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/employees')}>
          Quay lại danh sách
        </Button>
      </div>

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>{employee.fullName}</span>
            <Tag color="blue">{employee.employeeCode}</Tag>
            <Tag color={employee.status === 'PROBATION' ? 'orange' : 'green'}>
              {employee.status === 'PROBATION' ? 'Đang thử việc' : 'Chính thức'}
            </Tag>
          </div>
        }
        extra={
          isAdminOrHr && (
            <Button
              type="primary"
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
              icon={<DollarCircleOutlined />}
              onClick={() => {
                salaryConfigForm.setFieldsValue({
                  agreedSalary: agreedSalary || 10000000,
                  customBaseSalary: employee.customBaseSalary,
                  hasInsurance: Boolean(employee.hasInsurance),
                  insuranceSalary: employee.insuranceSalary,
                  managementLevel: mgmtLevel,
                  kpiSalary: kpiSal,
                  salaryNote: 'Cập nhật cấu hình lương & KPI',
                });
                setSalaryConfigModalOpen(true);
              }}
            >
              ⚙️ Cấu hình Lương & KPI
            </Button>
          )
        }
        loading={loading}
      >
        {missingDocs.length > 0 && (
          <Alert
            message="Hồ sơ còn thiếu giấy tờ bắt buộc"
            description={`Chưa tải lên: ${missingDocs.map((t) => docTypeLabels[t] || t).join(', ')}`}
            type="warning"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        <Tabs
          defaultActiveKey="info"
          items={[
            {
              key: 'info',
              label: '👤 Thông tin cá nhân & Công việc',
              children: (
                <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
                  <Descriptions.Item label="Mã nhân viên (Hệ thống)">
                    <b style={{ color: '#1677ff' }}>{employee.employeeCode}</b>
                  </Descriptions.Item>
                  <Descriptions.Item label="Mã máy chấm công (Ronald Jack)">
                    <Tag color="cyan" style={{ fontSize: 13, fontWeight: 600 }}>
                      🆔 {employee.attendanceCode}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày tháng năm sinh">
                    {employee.dateOfBirth ? dayjs(employee.dateOfBirth).format('DD/MM/YYYY') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">{employee.phone}</Descriptions.Item>
                  <Descriptions.Item label="Phòng ban">{employee.department?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Chức danh">{employee.position?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Vai trò tài khoản">
                    {employee.user?.role === 'ADMIN' && <Tag color="red">Quản trị viên (Admin)</Tag>}
                    {employee.user?.role === 'SUB_ADMIN' && <Tag color="magenta">Phó QTV (Sub-Admin)</Tag>}
                    {employee.user?.role === 'HR' && <Tag color="blue">Nhân sự (HR)</Tag>}
                    {employee.user?.role === 'MANAGER' && <Tag color="purple">Quản lý</Tag>}
                    {(!employee.user?.role || employee.user?.role === 'EMPLOYEE') && <Tag color="green">Nhân viên</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Quản lý trực tiếp">{employee.manager?.fullName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Ngày vào làm">
                    {dayjs(employee.joinDate).format('DD/MM/YYYY')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Hạn thử việc">
                    {employee.probationEndDate ? dayjs(employee.probationEndDate).format('DD/MM/YYYY') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày vào chính thức">
                    {employee.officialDate ? dayjs(employee.officialDate).format('DD/MM/YYYY') : '-'}
                  </Descriptions.Item>
                  {employee.resignDate && (
                    <Descriptions.Item label="Ngày nghỉ việc">
                      <Tag color="default" style={{ color: '#cf1322' }}>
                        {dayjs(employee.resignDate).format('DD/MM/YYYY')}
                      </Tag>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Số CCCD">{employee.idCardNumber || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Lương thỏa thuận (LTT)">
                    <b style={{ color: '#3f8600', fontSize: 14 }}>
                      {agreedSalary > 0 ? `${agreedSalary.toLocaleString('vi-VN')} VNĐ` : 'Chưa thiết lập'}
                    </b>
                  </Descriptions.Item>
                  <Descriptions.Item label="Lương cơ bản (LCB)">
                    <b>
                      {employee.customBaseSalary
                        ? `${employee.customBaseSalary.toLocaleString('vi-VN')} VNĐ (tự cấu hình)`
                        : '5.681.700 VNĐ (mặc định)'}
                    </b>
                  </Descriptions.Item>
                  <Descriptions.Item label="Phụ cấp cố định (10%)">
                    <b>{pc.toLocaleString('vi-VN')} VNĐ</b>
                  </Descriptions.Item>
                  <Descriptions.Item label="Cấp vị trí quản lý">
                    {mgmtLevel > 0 ? (
                      <Tag color="cyan">Cấp {mgmtLevel} (+{lql.toLocaleString('vi-VN')}đ)</Tag>
                    ) : (
                      'Không có (Cấp 0)'
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Lương KPI định mức">
                    <Tag color="purple" style={{ fontSize: 13, fontWeight: 600 }}>
                      🎯 {effectiveKpi.toLocaleString('vi-VN')} VNĐ / tháng
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Lương CM theo ngày công">
                    <b style={{ color: '#0958d9' }}>
                      📅 {lknFixed.toLocaleString('vi-VN')} VNĐ
                    </b>{' '}
                    <small style={{ color: '#8c8c8c' }}>(tính theo công thực tế)</small>
                  </Descriptions.Item>
                  <Descriptions.Item label="Đóng BHXH">
                    {employee.hasInsurance ? (
                      <Tag color="green">Có tham gia</Tag>
                    ) : (
                      <Tag>Không đóng</Tag>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Mức đóng BHXH">
                    {employee.hasInsurance ? (
                      <div>
                        <b style={{ color: '#0958d9' }}>
                          {(employee.insuranceSalary || employee.customBaseSalary || 5681700).toLocaleString('vi-VN')} VNĐ
                        </b>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                          Trích đóng NLĐ (10.5%): {Math.round((employee.insuranceSalary || employee.customBaseSalary || 5681700) * 0.105).toLocaleString('vi-VN')} VNĐ
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#8c8c8c' }}>-</span>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label={`Phép năm (${empLeaveBalance?.year || new Date().getFullYear()})`}>
                    <div>
                      <Tag
                        color={(empLeaveBalance?.used || 0) > 0 ? 'orange' : 'default'}
                        style={{ fontWeight: 600, fontSize: 13 }}
                      >
                        Đã dùng: {empLeaveBalance?.used || 0} / {empLeaveBalance?.totalEntitled || 12} ngày
                      </Tag>
                      <div style={{ marginTop: 4 }}>
                        <small
                          style={{
                            color:
                              (empLeaveBalance?.available ?? empLeaveBalance?.remaining ?? 12) > 0
                                ? '#52c41a'
                                : '#cf1322',
                            fontWeight: 500,
                          }}
                        >
                          {(empLeaveBalance?.available ?? empLeaveBalance?.remaining ?? 12) > 0
                            ? `Còn khả dụng: ${empLeaveBalance?.available ?? empLeaveBalance?.remaining} ngày`
                            : 'Đã hết phép năm'}
                        </small>
                        {(empLeaveBalance?.usedBeforeSystem || 0) > 0 && (
                          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                            (Trước phần mềm: {empLeaveBalance?.usedBeforeSystem}n, Hệ thống: {empLeaveBalance?.systemUsed || 0}n)
                          </div>
                        )}
                      </div>
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Người phụ thuộc">{employee.dependentsCount} người</Descriptions.Item>
                  <Descriptions.Item label="Tài khoản Ngân hàng" span={2}>
                    <span style={{ fontWeight: 600, color: '#1677ff' }}>
                      <BankOutlined style={{ marginRight: 6 }} />
                      {employee.bankAccount ? `${employee.bankAccount} (${employee.bankName || 'Ngân hàng'})` : 'Chưa cập nhật'}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ thường trú" span={1}>
                    {employee.addressPermanent || '-'}
                  </Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'salary',
              label: `💵 Lịch sử Lương & Tăng lương (${employee.salaryProfiles?.length || 0})`,
              children: (
                <div>
                  {isAdminOrHr && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
                      <Button
                        style={{ color: '#722ed1', borderColor: '#722ed1' }}
                        icon={<DollarCircleOutlined />}
                        onClick={() => {
                          salaryConfigForm.setFieldsValue({
                            agreedSalary: agreedSalary || 10000000,
                            customBaseSalary: employee.customBaseSalary,
                            managementLevel: mgmtLevel,
                            kpiSalary: kpiSal,
                            salaryNote: 'Cập nhật cấu hình lương & KPI',
                          });
                          setSalaryConfigModalOpen(true);
                        }}
                      >
                        ⚙️ Cấu hình Lương & KPI
                      </Button>
                      <Button
                        type="primary"
                        icon={<RiseOutlined />}
                        onClick={() => {
                          raiseForm.setFieldsValue({
                            effectiveDate: dayjs(),
                            agreedSalary: (employee.salaryProfiles?.[0]?.agreedSalary || 10000000) + 1000000,
                            managementLevel: employee.salaryProfiles?.[0]?.managementLevel || 0,
                            kpiSalary: employee.salaryProfiles?.[0]?.kpiSalary ?? employee.kpiSalary ?? 0,
                            note: 'Tăng lương chuyên môn',
                          });
                          setRaiseModalOpen(true);
                        }}
                      >
                        Thêm Đợt Tăng Lương Chuyên Môn
                      </Button>
                    </div>
                  )}
                  <Table
                    dataSource={employee.salaryProfiles || []}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Mức lương thỏa thuận (LTT)',
                        dataIndex: 'agreedSalary',
                        render: (v: number) => (
                          <span style={{ fontWeight: 600, color: '#3f8600' }}>
                            {v.toLocaleString('vi-VN')} VNĐ
                          </span>
                        ),
                      },
                      {
                        title: 'Lương cơ bản (LCB)',
                        dataIndex: 'baseSalary',
                        render: (v: number) => {
                          const lcb = v || employee.customBaseSalary || 5681700;
                          return <span>{lcb.toLocaleString('vi-VN')} đ</span>;
                        },
                      },
                      {
                        title: 'Lương chuyên môn (LKN)',
                        render: (_: any, r: any) => {
                          const lcb = r.baseSalary || employee.customBaseSalary || 5681700;
                          const pc = r.agreedSalary * 0.1;
                          const mgmtSalaries = [0, 1000000, 2000000, 3000000];
                          const lql = mgmtSalaries[r.managementLevel || 0] || 0;
                          const lkn = Math.max(0, r.agreedSalary - lcb - pc - lql);
                          return <span style={{ color: '#1677ff', fontWeight: 600 }}>{lkn.toLocaleString('vi-VN')} đ</span>;
                        },
                      },
                      {
                        title: 'Lương KPI định mức',
                        dataIndex: 'kpiSalary',
                        render: (v: number) => (
                          <Tag color="purple">{(v || 0).toLocaleString('vi-VN')} đ</Tag>
                        ),
                      },
                      {
                        title: 'Cấp quản lý',
                        dataIndex: 'managementLevel',
                        render: (v: number) => (v > 0 ? `Cấp ${v}` : 'Không có'),
                      },
                      {
                        title: 'Ngày hiệu lực',
                        dataIndex: 'effectiveDate',
                        render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
                      },
                      {
                        title: 'Ghi chú / Quyết định',
                        dataIndex: 'note',
                        render: (n: string) => n || 'Lương thỏa thuận',
                      },
                      ...(isAdminOrHr
                        ? [
                            {
                              title: 'Hành động',
                              key: 'action',
                              width: 110,
                              align: 'center' as const,
                              render: (_: any, r: any) => {
                                const isOnlyOne = (employee.salaryProfiles || []).length <= 1;
                                return (
                                  <Popconfirm
                                    title="Xóa quyết định tăng lương"
                                    description="Bạn có chắc chắn muốn xóa đợt tăng lương này? Sau khi xóa, mức lương sẽ quay về đợt liền trước."
                                    okText="Xác nhận xóa"
                                    cancelText="Hủy"
                                    okButtonProps={{ danger: true }}
                                    disabled={isOnlyOne}
                                    onConfirm={() => handleDeleteSalaryProfile(r.id)}
                                  >
                                    <Tooltip
                                      title={
                                        isOnlyOne
                                          ? 'Hồ sơ lương ban đầu duy nhất không thể xóa. Bạn có thể cập nhật mức thỏa thuận tại nút "Cập nhật cấu hình lương & KPI".'
                                          : 'Xóa đợt tăng lương do nhập nhầm'
                                      }
                                    >
                                      <Button
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        disabled={isOnlyOne}
                                      >
                                        Xóa
                                      </Button>
                                    </Tooltip>
                                  </Popconfirm>
                                );
                              },
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'documents',
              label: `📁 Hồ sơ scan (${employee.documents?.length || 0})`,
              children: (
                <div>
                  <div style={{ textAlign: 'right', marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<UploadOutlined />}
                      onClick={() => setUploadModalOpen(true)}
                    >
                      Tải lên giấy tờ scan
                    </Button>
                  </div>
                  <Table
                    dataSource={employee.documents || []}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Loại giấy tờ',
                        dataIndex: 'type',
                        render: (t: string) => docTypeLabels[t] || t,
                      },
                      {
                        title: 'Tên file',
                        dataIndex: 'fileName',
                      },
                      {
                        title: 'Dung lượng',
                        dataIndex: 'fileSize',
                        render: (s: number) => `${Math.round(s / 1024)} KB`,
                      },
                      {
                        title: 'Ngày tải lên',
                        dataIndex: 'createdAt',
                        render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
                      },
                      {
                        title: 'Thao tác',
                        render: (_: any, record: any) => (
                          <Button
                            size="small"
                            type="link"
                            href={`/${record.filePath}`}
                            target="_blank"
                          >
                            Xem / Tải về
                          </Button>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'leave',
              label: '🌴 Quỹ phép năm',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ margin: 0 }}>Quỹ ngày phép năm {empLeaveBalance?.year || new Date().getFullYear()}</h4>
                    {isAdminOrHr && (
                      <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => {
                          leaveForm.setFieldsValue({
                            totalEntitled: empLeaveBalance?.totalEntitled || 12,
                            seniorityBonus: empLeaveBalance?.seniorityBonus || 0,
                            usedBeforeSystem: empLeaveBalance?.usedBeforeSystem || 0,
                          });
                          setEditLeaveModalOpen(true);
                        }}
                      >
                        Điều chỉnh quỹ phép
                      </Button>
                    )}
                  </div>

                  <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                    <Col xs={12} sm={4}>
                      <Card bordered size="small">
                        <Statistic
                          title="Tiêu chuẩn năm"
                          value={empLeaveBalance?.totalEntitled || 12}
                          suffix="ngày"
                          valueStyle={{ color: '#1677ff' }}
                        />
                        <small style={{ color: '#8c8c8c' }}>
                          (12 + {empLeaveBalance?.seniorityBonus || 0} thâm niên)
                        </small>
                      </Card>
                    </Col>
                    <Col xs={12} sm={4}>
                      <Card bordered size="small">
                        <Statistic
                          title="Trước phần mềm"
                          value={empLeaveBalance?.usedBeforeSystem || 0}
                          suffix="ngày"
                          valueStyle={{ color: '#722ed1' }}
                        />
                        <small style={{ color: '#8c8c8c' }}>Nhập tay dữ liệu cũ</small>
                      </Card>
                    </Col>
                    <Col xs={12} sm={4}>
                      <Card bordered size="small">
                        <Statistic
                          title="Qua hệ thống"
                          value={empLeaveBalance?.systemUsed || 0}
                          suffix="ngày"
                          valueStyle={{ color: '#fa8c16' }}
                        />
                        <small style={{ color: '#8c8c8c' }}>Đơn phép đã duyệt</small>
                      </Card>
                    </Col>
                    <Col xs={12} sm={4}>
                      <Card bordered size="small">
                        <Statistic
                          title="Tổng đã nghỉ"
                          value={empLeaveBalance?.used || 0}
                          suffix="ngày"
                          valueStyle={{ color: '#d4380d' }}
                        />
                        <small style={{ color: '#8c8c8c' }}>Trước PM + Hệ thống</small>
                      </Card>
                    </Col>
                    <Col xs={12} sm={4}>
                      <Card bordered size="small">
                        <Statistic
                          title="Đang chờ duyệt"
                          value={empLeaveBalance?.pendingDays || 0}
                          suffix="ngày"
                          valueStyle={{ color: '#faad14' }}
                        />
                        <small style={{ color: '#8c8c8c' }}>Đơn chưa xét duyệt</small>
                      </Card>
                    </Col>
                    <Col xs={12} sm={4}>
                      <Card bordered size="small">
                        <Statistic
                          title="Khả dụng còn lại"
                          value={empLeaveBalance?.available ?? (empLeaveBalance?.remaining || 12)}
                          suffix="ngày"
                          valueStyle={{
                            color: (empLeaveBalance?.available ?? empLeaveBalance?.remaining) > 0 ? '#52c41a' : '#cf1322',
                          }}
                        />
                        <small style={{ color: '#8c8c8c' }}>Có thể xin nghỉ</small>
                      </Card>
                    </Col>
                  </Row>

                  <Alert
                    type="info"
                    showIcon
                    message="Quy định quản lý ngày phép năm"
                    description="Nhân viên có 12 ngày phép/năm theo Luật Lao động. Mỗi 5 năm làm việc tại công ty được cộng thêm 1 ngày phép thâm niên. Khi nhân viên đã sử dụng hết số ngày phép năm khả dụng, hệ thống sẽ tự động chặn không cho nộp đơn nghỉ phép có hưởng lương (bắt buộc chọn Nghỉ không lương)."
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal Upload giấy tờ scan */}
      <Modal
        title="Tải lên giấy tờ scan"
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        footer={null}
      >
        <Form form={uploadForm} layout="vertical" onFinish={handleUpload}>
          <Form.Item
            name="type"
            label="Loại giấy tờ"
            rules={[{ required: true, message: 'Vui lòng chọn loại giấy tờ' }]}
          >
            <Select
              options={Object.entries(docTypeLabels).map(([val, label]) => ({
                value: val,
                label,
              }))}
            />
          </Form.Item>
          <Form.Item label="Chọn file (PDF, ảnh JPG, PNG)">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0])}
            />
          </Form.Item>
          <Form.Item name="expiryDate" label="Ngày hết hạn (nếu có, VD: giấy khám SK)">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setUploadModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Tải lên
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Thêm đợt tăng lương */}
      <Modal
        title={`Thêm quyết định tăng lương chuyên môn: ${employee.fullName}`}
        open={raiseModalOpen}
        onCancel={() => setRaiseModalOpen(false)}
        footer={null}
      >
        <Form form={raiseForm} layout="vertical" onFinish={handleAddRaise}>
          <Form.Item
            name="agreedSalary"
            label="Mức lương thỏa thuận MỚI (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập mức lương mới' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
            />
          </Form.Item>
          <Form.Item
            name="baseSalary"
            label="Lương cơ bản (LCB) MỚI (VNĐ)"
            extra="Để trống sẽ giữ nguyên LCB hiện tại"
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
              placeholder="Để trống nếu không đổi"
            />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="managementLevel" label="Cấp vị trí quản lý">
                <Select
                  options={[
                    { label: 'Không có (Cấp 0)', value: 0 },
                    { label: 'Cấp 1 (+1.000.000đ)', value: 1 },
                    { label: 'Cấp 2 (+2.000.000đ)', value: 2 },
                    { label: 'Cấp 3 (+3.000.000đ)', value: 3 },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="kpiSalary"
                label="Lương KPI MỚI (trích từ Lương CM)"
                extra="Hưởng theo % hiệu quả KPI"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="effectiveDate"
            label="Ngày bắt đầu có hiệu lực"
            rules={[{ required: true, message: 'Vui lòng chọn ngày hiệu lực' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú quyết định tăng lương">
            <Input.TextArea rows={2} placeholder="VD: Tăng lương chuyên môn đợt 2 sau đánh giá..." />
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setRaiseModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Xác nhận Tăng Lương
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Điều chỉnh Quỹ Phép Năm */}
      <Modal
        title={`Điều chỉnh quỹ phép năm ${empLeaveBalance?.year || new Date().getFullYear()} - ${employee.fullName}`}
        open={editLeaveModalOpen}
        onCancel={() => setEditLeaveModalOpen(false)}
        footer={null}
        width={560}
      >
        <Form form={leaveForm} layout="vertical" onFinish={handleUpdateLeave}>
          <Form.Item
            name="totalEntitled"
            label="Tổng số ngày phép được hưởng trong năm"
            rules={[{ required: true, message: 'Vui lòng nhập số ngày phép tiêu chuẩn' }]}
            extra={`Mặc định theo Luật Lao động: 12 ngày + ${empLeaveBalance?.seniorityBonus || 0} ngày thâm niên = ${12 + (empLeaveBalance?.seniorityBonus || 0)} ngày.`}
          >
            <InputNumber min={0} max={60} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="usedBeforeSystem"
            label="Số ngày phép đã sử dụng TRƯỚC KHI vào phần mềm"
            extra="Số ngày nghỉ phép nhân sự đã dùng ngoài hệ thống trước khi triển khai phần mềm."
          >
            <InputNumber min={0} max={60} step={0.5} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
          <Form.Item
            name="seniorityBonus"
            label="Số ngày phép thâm niên được cộng thêm (+1 ngày mỗi 5 năm làm việc)"
          >
            <InputNumber min={0} max={20} step={1} style={{ width: '100%' }} />
          </Form.Item>

          {/* Bảng tính toán tự động */}
          {(() => {
            const tot = Number(watchLeaveTotal ?? (empLeaveBalance?.totalEntitled || 12));
            const beforeSys = Number(watchLeaveUsedBefore ?? (empLeaveBalance?.usedBeforeSystem || 0));
            const sys = Number(empLeaveBalance?.systemUsed || 0);
            const totalUsed = Number((beforeSys + sys).toFixed(2));
            const rem = Math.max(0, Number((tot - totalUsed).toFixed(2)));
            return (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 14, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#1677ff' }}>
                  📊 Dự toán quỹ phép sau khi lưu:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Số phép đã dùng trước phần mềm:</span>
                  <b>{beforeSys} ngày</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Số phép đã dùng qua đơn hệ thống:</span>
                  <b style={{ color: '#fa8c16' }}>{sys} ngày</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, borderTop: '1px dashed #cbd5e1', paddingTop: 6 }}>
                  <span>Tổng số ngày phép đã sử dụng:</span>
                  <b style={{ color: '#cf1322' }}>{totalUsed} ngày</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 0, borderTop: '1px dashed #cbd5e1', paddingTop: 6 }}>
                  <span>Số ngày phép năm còn lại:</span>
                  <b style={{ color: rem > 0 ? '#52c41a' : '#cf1322' }}>{rem} / {tot} ngày</b>
                </div>
              </div>
            );
          })()}

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setEditLeaveModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Cấu hình Lương & KPI */}
      <Modal
        title={`⚙️ Cấu hình Lương & KPI: ${employee.fullName}`}
        open={salaryConfigModalOpen}
        onCancel={() => setSalaryConfigModalOpen(false)}
        footer={null}
        width={680}
      >
        <Form form={salaryConfigForm} layout="vertical" onFinish={handleSaveSalaryConfig}>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Cấu hình cơ cấu thu nhập & Lương KPI (Thỏa thuận ban đầu)"
            description="Cấu hình này điều chỉnh trực tiếp mức thỏa thuận ban đầu của nhân sự (mốc thời gian áp dụng giữ nguyên mốc thỏa thuận ban đầu). Để tạo quyết định tăng lương có mốc ngày hiệu lực mới, vui lòng dùng chức năng 'Thêm đợt tăng lương chuyên môn'."
          />
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="agreedSalary"
                label="Mức lương thỏa thuận (LTT)"
                rules={[{ required: true, message: 'Vui lòng nhập lương thỏa thuận' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  placeholder="10000000"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="customBaseSalary"
                label="Lương cơ bản (LCB)"
                extra="Để trống để áp dụng mặc định 5.681.700đ"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  placeholder="5681700"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="managementLevel" label="Cấp vị trí quản lý">
                <Select
                  options={[
                    { label: 'Không có (Cấp 0)', value: 0 },
                    { label: 'Cấp 1 (+1.000.000đ)', value: 1 },
                    { label: 'Cấp 2 (+2.000.000đ)', value: 2 },
                    { label: 'Cấp 3 (+3.000.000đ)', value: 3 },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="kpiSalary"
                label="Mức lương KPI định mức (VNĐ)"
                extra="Trích từ Lương CM, hưởng theo % hiệu quả KPI"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="hasInsurance" valuePropName="checked" style={{ marginTop: 12 }}>
                <Checkbox>
                  Tham gia đóng BHXH
                </Checkbox>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              {configHasInsurance && (
                <Form.Item
                  name="insuranceSalary"
                  label="Mức lương đóng BHXH (VNĐ)"
                  extra="Tách riêng với LCB (để trống lấy theo LCB)"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                    placeholder="5681700"
                  />
                </Form.Item>
              )}
            </Col>
          </Row>

          <SalaryBreakdownPreview
            agreedSalary={configAgreedSalary}
            customBaseSalary={configCustomBaseSalary}
            managementLevel={configManagementLevel}
            kpiSalary={configKpiSalary}
            hasInsurance={configHasInsurance}
            insuranceSalary={configInsuranceSalary}
          />

          <Form.Item name="salaryNote" label="Ghi chú điều chỉnh">
            <Input placeholder="VD: Điều chỉnh cấu hình KPI và lương thỏa thuận..." />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setSalaryConfigModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>
              Lưu cấu hình
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
