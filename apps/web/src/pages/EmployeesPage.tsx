import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  Form,
  Row,
  Col,
  DatePicker,
  InputNumber,
  Checkbox,
  message,
  Popconfirm,
  Tooltip,
  Alert,
  Divider,
} from 'antd';
import {
  UserAddOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  StopOutlined,
  DownloadOutlined,
  UploadOutlined,
  BankOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  WarningOutlined,
  DollarCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const VIETNAM_BANKS = [
  { value: 'Vietcombank', label: 'Vietcombank - Ngân hàng Ngoại thương Việt Nam' },
  { value: 'Techcombank', label: 'Techcombank - Ngân hàng Kỹ thương Việt Nam' },
  { value: 'MBBank', label: 'MBBank - Ngân hàng Quân đội' },
  { value: 'VietinBank', label: 'VietinBank - Ngân hàng Công thương Việt Nam' },
  { value: 'BIDV', label: 'BIDV - Ngân hàng Đầu tư và Phát triển Việt Nam' },
  { value: 'Agribank', label: 'Agribank - Ngân hàng Nông nghiệp và PTNT Việt Nam' },
  { value: 'ACB', label: 'ACB - Ngân hàng Á Châu' },
  { value: 'VPBank', label: 'VPBank - Ngân hàng Việt Nam Thịnh Vượng' },
  { value: 'TPBank', label: 'TPBank - Ngân hàng Tiên Phong' },
  { value: 'Sacombank', label: 'Sacombank - Ngân hàng Sài Gòn Thương Tín' },
  { value: 'VIB', label: 'VIB - Ngân hàng Quốc tế' },
  { value: 'HDBank', label: 'HDBank - Ngân hàng Phát triển TP.HCM' },
  { value: 'MSB', label: 'MSB - Ngân hàng Hàng Hải Việt Nam' },
  { value: 'OCB', label: 'OCB - Ngân hàng Phương Đông' },
  { value: 'SHB', label: 'SHB - Ngân hàng Sài Gòn - Hà Nội' },
  { value: 'SeABank', label: 'SeABank - Ngân hàng Đông Nam Á' },
  { value: 'Bac A Bank', label: 'Bac A Bank - Ngân hàng Bắc Á' },
  { value: 'PVcomBank', label: 'PVcomBank - Ngân hàng Đại Chúng Việt Nam' },
  { value: 'BVBank', label: 'BVBank - Ngân hàng Bản Việt' },
  { value: 'Nam A Bank', label: 'Nam A Bank - Ngân hàng Nam Á' },
  { value: 'Saigonbank', label: 'Saigonbank - Ngân hàng Sài Gòn Công Thương' },
  { value: 'BaoViet Bank', label: 'BaoViet Bank - Ngân hàng Bảo Việt' },
  { value: 'Kienlongbank', label: 'Kienlongbank - Ngân hàng Kiên Long' },
  { value: 'LPBank', label: 'LPBank - Ngân hàng Bưu điện Liên Việt' },
  { value: 'PGBank', label: 'PGBank - Ngân hàng Thịnh vượng và Phát triển' },
  { value: 'Shinhan Bank', label: 'Shinhan Bank - Ngân hàng Shinhan Việt Nam' },
  { value: 'Woori Bank', label: 'Woori Bank - Ngân hàng Woori Việt Nam' },
  { value: 'HSBC', label: 'HSBC - Ngân hàng HSBC Việt Nam' },
  { value: 'Standard Chartered', label: 'Standard Chartered - Ngân hàng Standard Chartered' },
  { value: 'UOB', label: 'UOB - Ngân hàng United Overseas Bank' },
  { value: 'Timo', label: 'Timo - Ngân hàng số Timo' },
  { value: 'Cake by VPBank', label: 'Cake - Ngân hàng số Cake by VPBank' },
  { value: 'Khác', label: 'Ngân hàng khác...' },
];

export const SalaryBreakdownPreview: React.FC<{
  agreedSalary?: number;
  customBaseSalary?: number;
  managementLevel?: number;
  kpiSalary?: number;
  hasInsurance?: boolean;
  insuranceSalary?: number;
}> = ({ agreedSalary = 0, customBaseSalary, managementLevel = 0, kpiSalary = 0, hasInsurance = false, insuranceSalary }) => {
  const lcb = customBaseSalary && customBaseSalary > 0 ? customBaseSalary : 5681700;
  const pc = agreedSalary * 0.1;
  const mgmtSalaries = [0, 1000000, 2000000, 3000000];
  const lql = mgmtSalaries[managementLevel] || 0;
  const totalLkn = Math.max(0, agreedSalary - lcb - pc - lql);
  const kpi = Math.min(totalLkn, Math.max(0, kpiSalary || 0));
  const lknFixed = Math.max(0, totalLkn - kpi);
  const insBase = hasInsurance ? (insuranceSalary && insuranceSalary > 0 ? insuranceSalary : lcb) : 0;
  const insDeduct = Math.round(insBase * 0.105);

  return (
    <div
      style={{
        background: '#f6ffed',
        border: '1px solid #b7eb8f',
        padding: '10px 14px',
        borderRadius: 6,
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 600, color: '#237804', marginBottom: 6 }}>
        ⚡ Phân bổ cơ cấu lương (Đảm bảo tổng Thỏa thuận = {agreedSalary?.toLocaleString('vi-VN')} đ)
      </div>
      <Row gutter={[12, 6]} style={{ fontSize: 13 }}>
        <Col span={12}>
          • Lương cơ bản (LCB): <b>{lcb.toLocaleString('vi-VN')} đ</b>{' '}
          <span style={{ color: '#8c8c8c' }}>
            {customBaseSalary ? '(tự cấu hình)' : '(mặc định)'}
          </span>
        </Col>
        <Col span={12}>
          • Phụ cấp (10%): <b>{pc.toLocaleString('vi-VN')} đ</b>
        </Col>
        <Col span={12}>
          • Lương quản lý: <b>{lql.toLocaleString('vi-VN')} đ</b>
        </Col>
        <Col span={12}>
          • Tổng Lương CM định mức:{' '}
          <b style={{ color: '#1677ff' }}>{totalLkn.toLocaleString('vi-VN')} đ</b>
        </Col>
        <Col span={24} style={{ marginTop: 2, background: hasInsurance ? '#e6f4ff' : '#f5f5f5', padding: '5px 10px', borderRadius: 4, border: hasInsurance ? '1px solid #91caff' : '1px solid #d9d9d9' }}>
          🛡️ <b>Mức đóng BHXH riêng biệt:</b>{' '}
          {hasInsurance ? (
            <span>
              <b style={{ color: '#0958d9' }}>{insBase.toLocaleString('vi-VN')} đ</b>{' '}
              {insuranceSalary ? <span style={{ color: '#595959' }}>(cấu hình riêng)</span> : <span style={{ color: '#8c8c8c' }}>(lấy theo LCB)</span>}
              {' '}— Trích đóng NLĐ (10.5%): <b style={{ color: '#cf1322' }}>{insDeduct.toLocaleString('vi-VN')} đ</b>
            </span>
          ) : (
            <span style={{ color: '#8c8c8c' }}>Không tham gia đóng BHXH</span>
          )}
        </Col>
        {totalLkn > 0 && (
          <Col span={24} style={{ marginTop: 4, background: '#f0f5ff', padding: '6px 10px', borderRadius: 4, border: '1px dashed #adc6ff' }}>
            <Row gutter={12}>
              <Col span={12}>
                🎯 <b>Lương KPI:</b> <span style={{ color: '#722ed1', fontWeight: 600 }}>{kpi.toLocaleString('vi-VN')} đ</span>{' '}
                <small style={{ color: '#595959' }}>(hưởng theo % hoàn thành KPI)</small>
              </Col>
              <Col span={12}>
                📅 <b>Lương CM theo ngày công:</b> <span style={{ color: '#0958d9', fontWeight: 600 }}>{lknFixed.toLocaleString('vi-VN')} đ</span>{' '}
                <small style={{ color: '#595959' }}>(tính theo công thực tế)</small>
              </Col>
            </Row>
          </Col>
        )}
      </Row>
      <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
        💡 <i>Lương cơ bản dùng để tính lương ngày công & phụ cấp. Mức đóng BHXH được tách riêng để tính trích nộp bảo hiểm theo quy định.</i>
      </div>
    </div>
  );
};

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [salaryConfigModalOpen, setSalaryConfigModalOpen] = useState(false);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'ADMIN';

  // Modal Xóa toàn bộ dữ liệu nhân sự
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [clearAllLoading, setClearAllLoading] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState('');
  const [clearAllPassword, setClearAllPassword] = useState('');

  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [salaryConfigForm] = Form.useForm();
  const [promoteForm] = Form.useForm();
  const [raiseForm] = Form.useForm();
  const navigate = useNavigate();

  const addAgreedSalary = Form.useWatch('agreedSalary', addForm);
  const addCustomBaseSalary = Form.useWatch('customBaseSalary', addForm);
  const addManagementLevel = Form.useWatch('managementLevel', addForm);
  const addKpiSalary = Form.useWatch('kpiSalary', addForm);
  const addHasInsurance = Form.useWatch('hasInsurance', addForm);
  const addInsuranceSalary = Form.useWatch('insuranceSalary', addForm);
  const addStatus = Form.useWatch('status', addForm);

  const editAgreedSalary = Form.useWatch('agreedSalary', editForm);
  const editCustomBaseSalary = Form.useWatch('customBaseSalary', editForm);
  const editManagementLevel = Form.useWatch('managementLevel', editForm);
  const editKpiSalary = Form.useWatch('kpiSalary', editForm);
  const editHasInsurance = Form.useWatch('hasInsurance', editForm);
  const editInsuranceSalary = Form.useWatch('insuranceSalary', editForm);
  const editStatus = Form.useWatch('status', editForm);

  const configAgreedSalary = Form.useWatch('agreedSalary', salaryConfigForm);
  const configCustomBaseSalary = Form.useWatch('customBaseSalary', salaryConfigForm);
  const configManagementLevel = Form.useWatch('managementLevel', salaryConfigForm);
  const configKpiSalary = Form.useWatch('kpiSalary', salaryConfigForm);
  const configHasInsurance = Form.useWatch('hasInsurance', salaryConfigForm);
  const configInsuranceSalary = Form.useWatch('insuranceSalary', salaryConfigForm);

  const raiseAgreedSalary = Form.useWatch('agreedSalary', raiseForm);
  const raiseCustomBaseSalary = Form.useWatch('baseSalary', raiseForm);
  const raiseManagementLevel = Form.useWatch('managementLevel', raiseForm);
  const raiseKpiSalary = Form.useWatch('kpiSalary', raiseForm);

  useEffect(() => {
    setCurrentPage(1);
    loadData();
    loadOrgData();
  }, [statusFilter, deptFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (deptFilter) params.departmentId = deptFilter;
      if (search) params.search = search;

      const res = await apiClient.get('/employees', { params });
      setEmployees(res.data);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadOrgData = async () => {
    try {
      const [deptRes, posRes] = await Promise.all([
        apiClient.get('/org/departments'),
        apiClient.get('/org/positions'),
      ]);
      setDepartments(deptRes.data);
      setPositions(posRes.data);
    } catch (err) {
      // ignore
    }
  };

  // Thêm nhân viên mới
  const handleCreate = async (values: any) => {
    try {
      let cleanPhone = values.phone ? String(values.phone).trim().replace(/\D/g, '') : '';
      if (cleanPhone.startsWith('84') && cleanPhone.length >= 11) cleanPhone = '0' + cleanPhone.slice(2);
      else if (!cleanPhone.startsWith('0') && cleanPhone.length === 9) cleanPhone = '0' + cleanPhone;

      const payload = {
        ...values,
        phone: cleanPhone || values.phone,
        joinDate: values.joinDate?.format('YYYY-MM-DD'),
        dateOfBirth: values.dateOfBirth?.format('YYYY-MM-DD'),
        officialDate: values.officialDate?.format('YYYY-MM-DD'),
        resignDate: values.resignDate?.format('YYYY-MM-DD'),
        idCardDate: values.idCardDate?.format('YYYY-MM-DD'),
        leaveStartDate: values.leaveStartDate?.format('YYYY-MM-DD'),
        leaveEndDate: values.leaveEndDate?.format('YYYY-MM-DD'),
        leaveNote: values.leaveNote || undefined,
        customBaseSalary: values.customBaseSalary ? Number(values.customBaseSalary) : null,
        insuranceSalary: values.hasInsurance && values.insuranceSalary ? Number(values.insuranceSalary) : null,
        totalLeaveEntitled: values.totalLeaveEntitled !== undefined && values.totalLeaveEntitled !== null && values.totalLeaveEntitled !== ''
          ? Number(values.totalLeaveEntitled)
          : undefined,
        usedBeforeSystem: values.usedBeforeSystem !== undefined && values.usedBeforeSystem !== null && values.usedBeforeSystem !== ''
          ? Number(values.usedBeforeSystem)
          : 0,
      };
      const res = await apiClient.post('/employees', payload);
      message.success(
        `Thêm nhân viên thành công! Mật khẩu khởi tạo: ${res.data.user?.defaultPassword}`,
      );
      setAddModalOpen(false);
      addForm.resetFields();
      loadData();
    } catch (err) {
      // handled
    }
  };

  // Sửa thông tin nhân viên
  const handleUpdate = async (values: any) => {
    if (!selectedEmp) return;
    try {
      let cleanPhone = values.phone ? String(values.phone).trim().replace(/\D/g, '') : '';
      if (cleanPhone.startsWith('84') && cleanPhone.length >= 11) cleanPhone = '0' + cleanPhone.slice(2);
      else if (!cleanPhone.startsWith('0') && cleanPhone.length === 9) cleanPhone = '0' + cleanPhone;

      const payload = {
        ...values,
        phone: cleanPhone || values.phone,
        joinDate: values.joinDate ? values.joinDate.format('YYYY-MM-DD') : undefined,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : undefined,
        officialDate: values.officialDate ? values.officialDate.format('YYYY-MM-DD') : undefined,
        resignDate: values.resignDate ? values.resignDate.format('YYYY-MM-DD') : undefined,
        idCardDate: values.idCardDate ? values.idCardDate.format('YYYY-MM-DD') : undefined,
        leaveStartDate: values.leaveStartDate ? values.leaveStartDate.format('YYYY-MM-DD') : undefined,
        leaveEndDate: values.leaveEndDate ? values.leaveEndDate.format('YYYY-MM-DD') : undefined,
        leaveNote: values.leaveNote || undefined,
        customBaseSalary: values.customBaseSalary ? Number(values.customBaseSalary) : null,
        insuranceSalary: values.hasInsurance && values.insuranceSalary ? Number(values.insuranceSalary) : null,
        totalLeaveEntitled: values.totalLeaveEntitled !== undefined && values.totalLeaveEntitled !== null && values.totalLeaveEntitled !== ''
          ? Number(values.totalLeaveEntitled)
          : undefined,
        usedBeforeSystem: values.usedBeforeSystem !== undefined && values.usedBeforeSystem !== null && values.usedBeforeSystem !== ''
          ? Number(values.usedBeforeSystem)
          : undefined,
      };
      await apiClient.put(`/employees/${selectedEmp.id}`, payload);
      message.success('Cập nhật thông tin nhân viên thành công!');
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      // handled
    }
  };

  // Cấu hình Lương & KPI nhanh
  const handleSaveSalaryConfig = async (values: any) => {
    if (!selectedEmp) return;
    try {
      await apiClient.put(`/employees/${selectedEmp.id}`, {
        agreedSalary: values.agreedSalary,
        customBaseSalary: values.customBaseSalary ? Number(values.customBaseSalary) : null,
        managementLevel: Number(values.managementLevel || 0),
        kpiSalary: values.kpiSalary !== undefined ? Number(values.kpiSalary) : 0,
        hasInsurance: Boolean(values.hasInsurance),
        insuranceSalary: values.hasInsurance && values.insuranceSalary ? Number(values.insuranceSalary) : null,
        salaryNote: values.salaryNote || 'Cập nhật cấu hình lương & KPI',
      });
      message.success(`Cập nhật cấu hình Lương & KPI cho ${selectedEmp.fullName} thành công!`);
      setSalaryConfigModalOpen(false);
      loadData();
    } catch (err) {
      // handled
    }
  };

  // Thêm quyết định tăng lương chuyên môn
  const handleRaise = async (values: any) => {
    if (!selectedEmp) return;
    try {
      await apiClient.post(`/employees/${selectedEmp.id}/salary-raise`, {
        agreedSalary: values.agreedSalary,
        baseSalary: values.baseSalary,
        managementLevel: values.managementLevel,
        kpiSalary: values.kpiSalary,
        effectiveDate: values.effectiveDate.format('YYYY-MM-DD'),
        note: values.note,
      });
      message.success(`Đã cập nhật mức lương mới cho ${selectedEmp.fullName}!`);
      setRaiseModalOpen(false);
      raiseForm.resetFields();
      loadData();
    } catch (err) {
      // handled
    }
  };

  // Chuyển chính thức
  const handlePromote = async (values: any) => {
    if (!selectedEmp) return;
    try {
      await apiClient.post(`/employees/${selectedEmp.id}/promote`, {
        officialDate: values.officialDate.format('YYYY-MM-DD'),
        agreedSalary: values.agreedSalary,
        managementLevel: values.managementLevel,
        kpiSalary: values.kpiSalary,
      });
      message.success('Đã chuyển nhân sự sang chính thức thành công!');
      setPromoteModalOpen(false);
      promoteForm.resetFields();
      loadData();
    } catch (err) {
      // handled
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      const res = await apiClient.post(`/employees/${id}/reset-password`);
      message.success(`Mật khẩu đã được reset về: ${res.data.newPassword}`);
    } catch (err) {
      // handled
    }
  };

  const handleResign = async (id: string) => {
    try {
      await apiClient.post(`/employees/${id}/resign`, {
        resignDate: new Date().toISOString().slice(0, 10),
      });
      message.success('Đã cập nhật trạng thái nghỉ việc và khóa tài khoản');
      loadData();
    } catch (err) {
      // handled
    }
  };

  // Xóa một nhân sự
  const handleDeleteEmployee = async (id: string) => {
    try {
      await apiClient.delete(`/employees/${id}`);
      message.success('Đã xóa nhân sự thành công');
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi xóa nhân sự');
    }
  };

  // Xóa sạch toàn bộ dữ liệu nhân sự (Chỉ dành cho Admin tối cao)
  const handleClearAll = async () => {
    if (clearAllConfirmText.trim() !== 'XOA TOAN BO') {
      message.error('Vui lòng nhập chính xác "XOA TOAN BO" để xác nhận');
      return;
    }
    try {
      setClearAllLoading(true);
      const res = await apiClient.delete('/employees/clear-all', {
        data: {
          confirmation: clearAllConfirmText.trim(),
          password: clearAllPassword,
        },
      });
      message.success(res.data?.message || 'Đã xóa toàn bộ nhân sự thành công!');
      setClearAllModalOpen(false);
      setClearAllConfirmText('');
      setClearAllPassword('');
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi xóa toàn bộ dữ liệu nhân sự');
    } finally {
      setClearAllLoading(false);
    }
  };

  // Xuất file chi trả ngân hàng
  const handleExportBankPayroll = () => {
    if (employees.length === 0) {
      message.warning('Không có dữ liệu nhân viên để xuất');
      return;
    }
    const headers = ['STT', 'Mã NV', 'Họ và Tên', 'Số Điện Thoại', 'Tên Ngân Hàng', 'Số Tài Khoản', 'Lương Thỏa Thuận', 'Nội Dung Chi Lương'];
    const rows = employees.map((e, idx) => [
      idx + 1,
      e.employeeCode,
      `"${e.fullName}"`,
      `"${e.phone}"`,
      `"${e.bankName || 'Chưa cập nhật'}"`,
      `"${e.bankAccount || 'Chưa cập nhật'}"`,
      e.salaryProfiles?.[0]?.agreedSalary || 0,
      `"Chi tra luong - ${e.fullName}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_chi_luong_ngan_hang_${dayjs().format('YYYYMMDD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Đã tải xuống danh sách chi lương ngân hàng!');
  };

  const handleDownloadTemplate = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    try {
      const res = await apiClient.get(`/employees/template?format=${format}`, {
        responseType: 'blob',
      });
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      const mime =
        format === 'csv'
          ? 'text/csv;charset=utf-8;'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([res.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mau_danh_sach_nhan_vien.${ext}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success(`Đã tải xuống file mẫu ${ext.toUpperCase()}`);
    } catch (err) {
      message.error('Không thể tải file mẫu. Vui lòng thử lại.');
    }
  };

  const handleImportEmployees = async () => {
    if (!importFile) {
      message.error('Vui lòng chọn file mẫu CSV');
      return;
    }
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await apiClient.post('/employees/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      if (res.data.success > 0) {
        message.success(`Đã nhập thành công ${res.data.success}/${res.data.total} nhân sự`);
        loadData();
      } else {
        message.warning('Không có dòng nhân sự nào được nhập thành công');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi import danh sách nhân viên');
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    {
      title: 'Mã NV',
      dataIndex: 'employeeCode',
      key: 'employeeCode',
      render: (code: string, record: any) => (
        <a onClick={() => navigate(`/employees/${record.id}`)} style={{ fontWeight: 600 }}>
          {code}
        </a>
      ),
    },
    {
      title: 'Mã chấm công',
      dataIndex: 'attendanceCode',
      key: 'attendanceCode',
      render: (code: string) => (
        <Tooltip title="Mã ID trên máy chấm công Ronald Jack để tự động nhận diện và tính công">
          <Tag color="cyan" style={{ fontWeight: 600, fontSize: 13 }}>
            🆔 {code}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name: string, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <small style={{ color: '#8c8c8c' }}>{record.phone}</small>
          {record.dateOfBirth && (
            <div>
              <small style={{ color: '#1677ff' }}>🎂 {dayjs(record.dateOfBirth).format('DD/MM/YYYY')}</small>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Phòng ban',
      key: 'department',
      render: (_: any, r: any) => {
        const isStore = Boolean(r.isStoreSales || r.department?.isStoreSales);
        return (
          <div>
            <span>{r.department?.name || '-'}</span>
            {isStore && (
              <div>
                <Tag color="cyan" style={{ fontSize: 11, marginTop: 2 }}>
                  Bán hàng (Báo công)
                </Tag>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Tài khoản Ngân hàng',
      key: 'bank',
      render: (_: any, r: any) =>
        r.bankAccount ? (
          <div>
            <span style={{ fontWeight: 500 }}>{r.bankAccount}</span>
            <div>
              <small style={{ color: '#8c8c8c' }}>{r.bankName || 'Ngân hàng'}</small>
            </div>
          </div>
        ) : (
          <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>Chưa có STK</span>
        ),
    },
    {
      title: 'Lương & BHXH',
      key: 'salary',
      render: (_: any, r: any) => {
        const sal = r.salaryProfiles?.[0]?.agreedSalary;
        const kpi = r.salaryProfiles?.[0]?.kpiSalary ?? r.kpiSalary ?? 0;
        const lcb = r.customBaseSalary && r.customBaseSalary > 0 ? r.customBaseSalary : 5681700;
        const insSal = r.insuranceSalary && r.insuranceSalary > 0 ? r.insuranceSalary : lcb;
        return sal ? (
          <div>
            <div style={{ color: '#3f8600', fontWeight: 600 }}>
              {sal.toLocaleString('vi-VN')} đ
            </div>
            {kpi > 0 && (
              <div>
                <Tag color="purple" style={{ fontSize: 11, padding: '0 4px', marginTop: 2 }}>
                  KPI: {kpi.toLocaleString('vi-VN')} đ
                </Tag>
              </div>
            )}
            <div style={{ marginTop: 2 }}>
              <small style={{ color: '#595959' }}>
                LCB: {lcb.toLocaleString('vi-VN')} đ
              </small>
            </div>
            <div>
              <small style={{ color: r.hasInsurance ? '#0958d9' : '#8c8c8c' }}>
                {r.hasInsurance ? `BHXH: ${insSal.toLocaleString('vi-VN')} đ` : 'Không BHXH'}
              </small>
            </div>
          </div>
        ) : (
          '-'
        );
      },
    },
    {
      title: `Phép năm (${new Date().getFullYear()})`,
      key: 'leaveBalance',
      width: 185,
      render: (_: any, r: any) => {
        const lb = r.currentLeaveBalance || r.leaveBalances?.[0];
        const used = lb ? Number(lb.used || 0) : 0;
        const total = lb ? Number(lb.totalEntitled || 12) : 12;
        const remaining = lb ? Number(lb.remaining ?? (total - used)) : (total - used);
        const seniority = lb ? Number(lb.seniorityBonus || 0) : 0;
        const usedBefore = lb ? Number(lb.usedBeforeSystem || 0) : 0;
        const systemUsed = lb ? Number(lb.systemUsed ?? Math.max(0, Number((used - usedBefore).toFixed(2)))) : 0;

        return (
          <Tooltip
            title={
              <div style={{ fontSize: 12 }}>
                <div>Tổng tiêu chuẩn: <b>{total} ngày</b> {seniority > 0 ? `(12 + ${seniority} thâm niên)` : ''}</div>
                <div>• Đã dùng trước phần mềm: <b style={{ color: '#d3adf7' }}>{usedBefore} ngày</b></div>
                <div>• Đã duyệt qua hệ thống: <b style={{ color: '#ffd591' }}>{systemUsed} ngày</b></div>
                <div style={{ borderTop: '1px dashed #d9d9d9', marginTop: 4, paddingTop: 4 }}>
                  = Tổng đã sử dụng: <b style={{ color: '#fa8c16' }}>{used} ngày</b>
                </div>
                <div>Còn lại: <b style={{ color: '#52c41a' }}>{remaining} ngày</b></div>
              </div>
            }
          >
            <div>
              <Tag
                color={used > 0 ? 'orange' : 'default'}
                style={{ fontWeight: 600, fontSize: 12, padding: '2px 8px' }}
              >
                Đã dùng: {used} / {total} ngày
              </Tag>
              <div style={{ marginTop: 3 }}>
                <small style={{ color: remaining > 0 ? '#52c41a' : '#cf1322', fontWeight: 500 }}>
                  {remaining > 0 ? `Còn khả dụng: ${remaining} ngày` : 'Đã hết phép năm'}
                </small>
                {usedBefore > 0 && (
                  <span style={{ fontSize: 11, color: '#8c8c8c', marginLeft: 4 }}>
                    (Cũ: {usedBefore})
                  </span>
                )}
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Vai trò',
      key: 'role',
      render: (_: any, r: any) => {
        const role = r.user?.role || 'EMPLOYEE';
        if (role === 'ADMIN') return <Tag color="red">Admin</Tag>;
        if (role === 'SUB_ADMIN') return <Tag color="magenta">Sub-Admin</Tag>;
        if (role === 'HR') return <Tag color="blue">HR</Tag>;
        if (role === 'MANAGER') return <Tag color="purple">Quản lý</Tag>;
        return <Tag color="green">Nhân viên</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st: string, record: any) => {
        if (st === 'PROBATION') return <Tag color="orange">Thử việc</Tag>;
        if (st === 'OFFICIAL')
          return (
            <div>
              <Tag color="green">Chính thức</Tag>
              {record.officialDate && (
                <div>
                  <small style={{ color: '#52c41a' }}>Từ {dayjs(record.officialDate).format('DD/MM/YYYY')}</small>
                </div>
              )}
            </div>
          );
        if (st === 'MATERNITY_LEAVE')
          return (
            <div>
              <Tag color="magenta">Nghỉ thai sản</Tag>
              {record.leaveStartDate && (
                <div>
                  <small style={{ color: '#c026d3' }}>
                    Từ {dayjs(record.leaveStartDate).format('DD/MM/YYYY')}
                    {record.leaveEndDate ? ` - ${dayjs(record.leaveEndDate).format('DD/MM/YYYY')}` : ''}
                  </small>
                </div>
              )}
            </div>
          );
        if (st === 'TEMPORARY_LEAVE')
          return (
            <div>
              <Tag color="purple">Tạm dừng / Hoãn</Tag>
              {record.leaveStartDate && (
                <div>
                  <small style={{ color: '#7c3aed' }}>
                    Từ {dayjs(record.leaveStartDate).format('DD/MM/YYYY')}
                    {record.leaveEndDate ? ` - ${dayjs(record.leaveEndDate).format('DD/MM/YYYY')}` : ''}
                  </small>
                </div>
              )}
            </div>
          );
        return (
          <div>
            <Tag color="default">Nghỉ việc</Tag>
            {record.resignDate && (
              <div>
                <small style={{ color: '#8c8c8c' }}>Nghỉ {dayjs(record.resignDate).format('DD/MM/YYYY')}</small>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết hồ sơ & giấy tờ scan">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/employees/${record.id}`)}
            />
          </Tooltip>

          <Tooltip title="Chỉnh sửa thông tin nhân sự">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedEmp(record);
                const lb = record.currentLeaveBalance || record.leaveBalances?.[0];
                editForm.setFieldsValue({
                  employeeCode: record.employeeCode,
                  attendanceCode: record.attendanceCode,
                  fullName: record.fullName,
                  phone: record.phone,
                  email: record.email,
                  dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
                  gender: record.gender,
                  idCardNumber: record.idCardNumber,
                  departmentId: record.departmentId,
                  positionId: record.positionId,
                  status: record.status,
                  joinDate: record.joinDate ? dayjs(record.joinDate) : null,
                  officialDate: record.officialDate ? dayjs(record.officialDate) : null,
                  resignDate: record.resignDate ? dayjs(record.resignDate) : null,
                  leaveStartDate: record.leaveStartDate ? dayjs(record.leaveStartDate) : null,
                  leaveEndDate: record.leaveEndDate ? dayjs(record.leaveEndDate) : null,
                  leaveNote: record.leaveNote || '',
                  bankAccount: record.bankAccount,
                  bankName: record.bankName,
                  hasInsurance: record.hasInsurance,
                  insuranceSalary: record.insuranceSalary,
                  customBaseSalary: record.customBaseSalary,
                  dependentsCount: record.dependentsCount || 0,
                  agreedSalary: record.salaryProfiles?.[0]?.agreedSalary,
                  managementLevel: record.salaryProfiles?.[0]?.managementLevel || 0,
                  kpiSalary: record.salaryProfiles?.[0]?.kpiSalary ?? record.kpiSalary ?? 0,
                  isStoreSales: Boolean(record.isStoreSales),
                  role: record.user?.role || 'EMPLOYEE',
                  totalLeaveEntitled: lb?.totalEntitled,
                  usedBeforeSystem: lb?.usedBeforeSystem || 0,
                });
                setEditModalOpen(true);
              }}
            />
          </Tooltip>

          <Tooltip title="Cấu hình Lương & KPI">
            <Button
              size="small"
              style={{ color: '#722ed1', borderColor: '#722ed1' }}
              icon={<DollarCircleOutlined />}
              onClick={() => {
                setSelectedEmp(record);
                const latestProfile = record.salaryProfiles?.[0];
                salaryConfigForm.setFieldsValue({
                  agreedSalary: latestProfile?.agreedSalary || 10000000,
                  customBaseSalary: record.customBaseSalary,
                  hasInsurance: Boolean(record.hasInsurance),
                  insuranceSalary: record.insuranceSalary,
                  managementLevel: latestProfile?.managementLevel || 0,
                  kpiSalary: latestProfile?.kpiSalary ?? record.kpiSalary ?? 0,
                  salaryNote: 'Cập nhật cấu hình lương & KPI',
                });
                setSalaryConfigModalOpen(true);
              }}
            />
          </Tooltip>

          <Tooltip title="Thêm đợt tăng lương chuyên môn">
            <Button
              size="small"
              style={{ color: '#1677ff', borderColor: '#1677ff' }}
              icon={<RiseOutlined />}
              onClick={() => {
                setSelectedEmp(record);
                raiseForm.setFieldsValue({
                  effectiveDate: dayjs(),
                  agreedSalary: (record.salaryProfiles?.[0]?.agreedSalary || 10000000) + 1000000,
                  managementLevel: record.salaryProfiles?.[0]?.managementLevel || 0,
                  kpiSalary: record.salaryProfiles?.[0]?.kpiSalary ?? record.kpiSalary ?? 0,
                  isStoreSales: Boolean(record.isStoreSales),
                  note: 'Tăng lương chuyên môn định kỳ',
                });
                setRaiseModalOpen(true);
              }}
            />
          </Tooltip>

          {record.status === 'PROBATION' && (
            <Tooltip title="Chuyển chính thức">
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setSelectedEmp(record);
                  promoteForm.setFieldsValue({
                    officialDate: dayjs(),
                    agreedSalary: record.salaryProfiles?.[0]?.agreedSalary || 0,
                    managementLevel: record.salaryProfiles?.[0]?.managementLevel || 0,
                    kpiSalary: record.salaryProfiles?.[0]?.kpiSalary ?? record.kpiSalary ?? 0,
                  });
                  setPromoteModalOpen(true);
                }}
              />
            </Tooltip>
          )}

          <Popconfirm
            title="Reset mật khẩu?"
            description="Mật khẩu sẽ được đặt lại về 6 số cuối số điện thoại."
            onConfirm={() => handleResetPassword(record.id)}
            okText="Reset"
            cancelText="Hủy"
          >
            <Button size="small" icon={<KeyOutlined />} title="Reset mật khẩu" />
          </Popconfirm>

          {record.status !== 'RESIGNED' && (
            <Popconfirm
              title="Xác nhận thôi việc?"
              description="Tài khoản nhân viên sẽ bị khóa đăng nhập ngay lập tức."
              onConfirm={() => handleResign(record.id)}
              okText="Xác nhận"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<StopOutlined />} title="Nghỉ việc" />
            </Popconfirm>
          )}

          {record.user?.role !== 'ADMIN' && (isSuperAdmin || record.user?.role !== 'SUB_ADMIN') && (
            <Popconfirm
              title={`Xóa vĩnh viễn nhân sự ${record.fullName}?`}
              description="Toàn bộ hồ sơ, dữ liệu chấm công và bảng lương của nhân viên này sẽ bị xóa."
              onConfirm={() => handleDeleteEmployee(record.id)}
              okText="Xóa vĩnh viễn"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} title="Xóa nhân sự này" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
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
            placeholder="Tìm theo tên, mã NV, SĐT, STK..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => {
              setCurrentPage(1);
              loadData();
            }}
            style={{ width: 260 }}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 170 }}
            value={statusFilter}
            onChange={(val) => {
              setCurrentPage(1);
              setStatusFilter(val);
            }}
            options={[
              { label: 'Thử việc', value: 'PROBATION' },
              { label: 'Chính thức', value: 'OFFICIAL' },
              { label: 'Nghỉ thai sản', value: 'MATERNITY_LEAVE' },
              { label: 'Tạm dừng / Hoãn', value: 'TEMPORARY_LEAVE' },
              { label: 'Nghỉ việc', value: 'RESIGNED' },
            ]}
          />
          <Select
            placeholder="Phòng ban"
            allowClear
            style={{ width: 180 }}
            value={deptFilter}
            onChange={(val) => {
              setCurrentPage(1);
              setDeptFilter(val);
            }}
            options={departments.map((d) => ({ label: d.name, value: d.id }))}
          />
          <Button onClick={() => {
            setCurrentPage(1);
            loadData();
          }}>Tìm kiếm</Button>
        </Space>

        <Space wrap>
          {isSuperAdmin && (
            <Button
              danger
              type="primary"
              icon={<DeleteOutlined />}
              onClick={() => {
                setClearAllConfirmText('');
                setClearAllPassword('');
                setClearAllModalOpen(true);
              }}
            >
              Xóa toàn bộ nhân sự
            </Button>
          )}
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportBankPayroll}
          >
            Xuất Danh Sách Chi Lương Ngân Hàng
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => {
              setImportResult(null);
              setImportFile(null);
              setImportModalOpen(true);
            }}
          >
            Nhập từ Excel/CSV
          </Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => {
              addForm.resetFields();
              addForm.setFieldsValue({
                status: 'PROBATION',
                probationMonths: 2,
                hasInsurance: false,
                joinDate: dayjs(),
                managementLevel: 0,
                agreedSalary: 10000000,
                kpiSalary: 0,
              });
              setAddModalOpen(true);
            }}
          >
            Thêm nhân viên mới
          </Button>
        </Space>
      </div>

      <Table
        dataSource={employees}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '15', '20', '30', '50', '100', '200'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} nhân sự`,
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

      {/* Modal Thêm nhân viên mới */}
      <Modal
        title="Thêm nhân viên mới"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        footer={null}
        width={820}
      >
        <Form form={addForm} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="fullName"
                label="Họ và tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="phone"
                label="Số điện thoại (dùng đăng nhập)"
                extra="Hệ thống tự động chuẩn hóa bỏ dấu cách, dấu chấm (VD: 0988888888)"
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const cleaned = String(value).replace(/\D/g, '');
                      if (cleaned.length >= 9 && cleaned.length <= 11) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Số điện thoại không hợp lệ (VD: 0988888888)'));
                    },
                  },
                ]}
              >
                <Input placeholder="0912345678" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="employeeCode"
                label="Mã nhân viên (Hệ thống)"
                rules={[{ required: true, message: 'Vui lòng nhập mã NV' }]}
                extra="Mã duy nhất, không trùng lặp"
              >
                <Input placeholder="NV001" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="attendanceCode"
                label="Mã máy chấm công (Ronald Jack)"
                rules={[{ required: true, message: 'Vui lòng nhập mã chấm công' }]}
                extra="Mã ID trên máy chấm công để tính công tự động"
              >
                <Input placeholder="VD: 101" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="dateOfBirth" label="Ngày tháng năm sinh">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="departmentId" label="Phòng ban">
                <Select
                  placeholder="Chọn phòng ban"
                  options={departments.map((d) => ({ label: d.name, value: d.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="positionId" label="Chức danh">
                <Select
                  placeholder="Chọn chức danh"
                  options={positions.map((p) => ({ label: p.name, value: p.id }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isStoreSales" valuePropName="checked" style={{ marginBottom: 12 }}>
            <Checkbox>
              <b>Nhân viên thuộc nhóm bán hàng tại cửa hàng</b> (Chốt công tháng, không quẹt thẻ, ngày lễ tính công thực tế)
            </Checkbox>
          </Form.Item>

          {/* Ngân hàng */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="bankName" label="Tên Ngân hàng (Chi trả lương)">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn ngân hàng từ danh sách"
                  optionFilterProp="label"
                  options={VIETNAM_BANKS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="bankAccount" label="Số tài khoản ngân hàng">
                <Input placeholder="VD: 0123456789" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item name="status" label="Tình trạng" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'Thử việc', value: 'PROBATION' },
                    { label: 'Chính thức', value: 'OFFICIAL' },
                    { label: 'Nghỉ thai sản', value: 'MATERNITY_LEAVE' },
                    { label: 'Tạm dừng / Hoãn', value: 'TEMPORARY_LEAVE' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="joinDate" label="Ngày vào làm" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            {addStatus === 'PROBATION' ? (
              <Col xs={24} sm={6}>
                <Form.Item name="probationMonths" label="Thời gian thử việc">
                  <Select
                    options={[
                      { label: '1 tháng', value: 1 },
                      { label: '2 tháng', value: 2 },
                    ]}
                  />
                </Form.Item>
              </Col>
            ) : (
              <Col xs={24} sm={6}>
                <Form.Item name="officialDate" label="Ngày vào chính thức">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Ngày chính thức" />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={6}>
              <Form.Item name="dependentsCount" label="Số người phụ thuộc">
                <InputNumber min={0} max={10} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          {(addStatus === 'MATERNITY_LEAVE' || addStatus === 'TEMPORARY_LEAVE') && (
            <Row gutter={16} style={{ background: '#fdf4ff', padding: '10px 12px', borderRadius: 6, marginBottom: 16, border: '1px solid #f0abfc' }}>
              <Col xs={24} sm={8}>
                <Form.Item name="leaveStartDate" label="Ngày bắt đầu nghỉ" rules={[{ required: true, message: 'Chọn ngày bắt đầu nghỉ' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Từ ngày" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="leaveEndDate" label="Ngày kết thúc dự kiến">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Đến ngày (để trống nếu chưa rõ)" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="leaveNote" label="Ghi chú chế độ nghỉ">
                  <Input placeholder="VD: Nghỉ thai sản 6 tháng..." />
                </Form.Item>
              </Col>
              <Col span={24}>
                <small style={{ color: '#c026d3' }}>
                  ℹ️ <i>Nhân viên trong thời gian nghỉ thai sản hoặc tạm dừng sẽ tự động không tính lương và không tính các khoản trích đóng/trừ trong tháng.</i>
                </small>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="role"
                label="Vai trò tài khoản hệ thống"
                initialValue="EMPLOYEE"
                extra="Quyền hạn truy cập các chức năng của phần mềm"
              >
                <Select
                  options={[
                    { label: 'Nhân viên (EMPLOYEE)', value: 'EMPLOYEE' },
                    { label: 'Quản lý phòng ban (MANAGER)', value: 'MANAGER' },
                    { label: 'Nhân sự (HR)', value: 'HR' },
                    ...(isSuperAdmin
                      ? [{ label: '⭐ Phó Quản trị viên (SUB_ADMIN) - Có quyền như Admin', value: 'SUB_ADMIN' }]
                      : []),
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item name="agreedSalary" label="Mức lương thỏa thuận (VNĐ)" rules={[{ required: true }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  placeholder="VD: 10000000"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item
                name="customBaseSalary"
                label="Lương cơ bản (LCB)"
                extra="Mặc định: 5.681.700đ"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  placeholder="5681700"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
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
            <Col xs={24} sm={6}>
              <Form.Item
                name="kpiSalary"
                label="Lương KPI (trích từ Lương CM)"
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

          {/* Preview bù trừ tự động: Lương chuyên môn = Lương thỏa thuận - LCB - Phụ cấp - LQL */}
          <SalaryBreakdownPreview
            agreedSalary={addAgreedSalary}
            customBaseSalary={addCustomBaseSalary}
            managementLevel={addManagementLevel}
            kpiSalary={addKpiSalary}
            hasInsurance={addHasInsurance}
            insuranceSalary={addInsuranceSalary}
          />

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="idCardNumber" label="Số CCCD">
                <Input placeholder="12 số CCCD" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="hasInsurance" valuePropName="checked" style={{ marginTop: 28 }}>
                <Checkbox>
                  Tham gia đóng BHXH
                </Checkbox>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              {addHasInsurance && (
                <Form.Item
                  name="insuranceSalary"
                  label="Mức đóng BHXH (VNĐ)"
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

          <Divider orientation="left" style={{ fontSize: 13, color: '#1677ff', margin: '12px 0 16px' }}>
            🌴 Quỹ phép năm ban đầu
          </Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="totalLeaveEntitled"
                label="Số ngày phép được hưởng trong năm"
                extra="Mặc định để trống sẽ tính theo luật: 12 ngày + thâm niên (+1 ngày / 5 năm)"
              >
                <InputNumber min={0} max={60} step={0.5} style={{ width: '100%' }} placeholder="Mặc định: 12 + thâm niên" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="usedBeforeSystem"
                label="Số phép đã dùng trước khi vào phần mềm"
                extra="Số ngày phép đã dùng ngoài hệ thống trước đó (mặc định 0)"
              >
                <InputNumber min={0} max={60} step={0.5} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setAddModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu nhân viên
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Chỉnh sửa thông tin nhân sự */}
      <Modal
        title={`Chỉnh sửa thông tin: ${selectedEmp?.fullName}`}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        width={820}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="employeeCode"
                label="Mã nhân viên (Hệ thống)"
                rules={[{ required: true, message: 'Vui lòng nhập mã NV' }]}
                extra="Mã duy nhất, không trùng người khác"
              >
                <Input placeholder="NV001" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="attendanceCode"
                label="Mã máy chấm công (Ronald Jack)"
                rules={[{ required: true, message: 'Vui lòng nhập mã chấm công' }]}
                extra="Có thể tái sử dụng mã của người đã nghỉ"
              >
                <Input placeholder="VD: 101" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="dateOfBirth" label="Ngày tháng năm sinh">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="phone"
                label="Số điện thoại (dùng đăng nhập)"
                extra="Khi đổi SĐT, tài khoản đăng nhập của nhân sự sẽ tự động cập nhật theo"
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const cleaned = String(value).replace(/\D/g, '');
                      if (cleaned.length >= 9 && cleaned.length <= 11) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Số điện thoại không hợp lệ (VD: 0988888888)'));
                    },
                  },
                ]}
              >
                <Input placeholder="0912345678" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="departmentId" label="Phòng ban">
                <Select
                  placeholder="Chọn phòng ban"
                  options={departments.map((d) => ({ label: d.name, value: d.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="positionId" label="Chức danh">
                <Select
                  placeholder="Chọn chức danh"
                  options={positions.map((p) => ({ label: p.name, value: p.id }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isStoreSales" valuePropName="checked" style={{ marginBottom: 12 }}>
            <Checkbox>
              <b>Nhân viên thuộc nhóm bán hàng tại cửa hàng</b> (Chốt công tháng, không quẹt thẻ, ngày lễ tính công thực tế)
            </Checkbox>
          </Form.Item>

          {/* Ngân hàng */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="bankName" label="Tên Ngân hàng (Chi trả lương)">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn ngân hàng từ danh sách"
                  optionFilterProp="label"
                  options={VIETNAM_BANKS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="bankAccount" label="Số tài khoản ngân hàng">
                <Input placeholder="Số tài khoản nhận lương" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item name="status" label="Tình trạng">
                <Select
                  options={[
                    { label: 'Thử việc', value: 'PROBATION' },
                    { label: 'Chính thức', value: 'OFFICIAL' },
                    { label: 'Nghỉ thai sản', value: 'MATERNITY_LEAVE' },
                    { label: 'Tạm dừng / Hoãn', value: 'TEMPORARY_LEAVE' },
                    { label: 'Nghỉ việc', value: 'RESIGNED' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="joinDate" label="Ngày vào làm">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="officialDate" label="Ngày vào chính thức">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Ngày chính thức" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              {editStatus === 'RESIGNED' ? (
                <Form.Item name="resignDate" label="Ngày nghỉ việc">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Ngày nghỉ việc" />
                </Form.Item>
              ) : (
                <Form.Item name="dependentsCount" label="Số người phụ thuộc">
                  <InputNumber min={0} max={10} style={{ width: '100%' }} />
                </Form.Item>
              )}
            </Col>
          </Row>

          {(editStatus === 'MATERNITY_LEAVE' || editStatus === 'TEMPORARY_LEAVE') && (
            <Row gutter={16} style={{ background: '#fdf4ff', padding: '10px 12px', borderRadius: 6, marginBottom: 16, border: '1px solid #f0abfc' }}>
              <Col xs={24} sm={8}>
                <Form.Item name="leaveStartDate" label="Ngày bắt đầu nghỉ" rules={[{ required: true, message: 'Chọn ngày bắt đầu nghỉ' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Từ ngày" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="leaveEndDate" label="Ngày kết thúc dự kiến">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Đến ngày (để trống nếu chưa rõ)" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="leaveNote" label="Ghi chú chế độ nghỉ">
                  <Input placeholder="VD: Nghỉ thai sản 6 tháng..." />
                </Form.Item>
              </Col>
              <Col span={24}>
                <small style={{ color: '#c026d3' }}>
                  ℹ️ <i>Nhân viên trong thời gian nghỉ thai sản hoặc tạm dừng sẽ tự động không tính lương và không tính các khoản trích đóng/trừ trong tháng.</i>
                </small>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="role"
                label="Vai trò tài khoản hệ thống"
                extra={
                  !isSuperAdmin && selectedEmp?.user?.role === 'SUB_ADMIN'
                    ? 'Chỉ Quản trị viên tối cao mới có thể sửa tài khoản Sub-Admin'
                    : selectedEmp?.user?.role === 'ADMIN'
                    ? 'Tài khoản Quản trị viên tối cao không thể hạ quyền'
                    : 'Quyền hạn thao tác trên hệ thống'
                }
              >
                <Select
                  disabled={
                    selectedEmp?.user?.role === 'ADMIN' ||
                    (!isSuperAdmin && selectedEmp?.user?.role === 'SUB_ADMIN')
                  }
                  options={[
                    { label: 'Nhân viên (EMPLOYEE)', value: 'EMPLOYEE' },
                    { label: 'Quản lý phòng ban (MANAGER)', value: 'MANAGER' },
                    { label: 'Nhân sự (HR)', value: 'HR' },
                    ...(isSuperAdmin
                      ? [{ label: '⭐ Phó Quản trị viên (SUB_ADMIN) - Có quyền như Admin', value: 'SUB_ADMIN' }]
                      : []),
                    ...(selectedEmp?.user?.role === 'ADMIN'
                      ? [{ label: '👑 Quản trị viên tối cao (ADMIN)', value: 'ADMIN' }]
                      : []),
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item name="agreedSalary" label="Mức lương thỏa thuận (VNĐ)">
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item
                name="customBaseSalary"
                label="Lương cơ bản (LCB)"
                extra="Mặc định: 5.681.700đ"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  placeholder="5681700"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
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
            <Col xs={24} sm={6}>
              <Form.Item
                name="kpiSalary"
                label="Lương KPI (trích từ Lương CM)"
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

          {/* Preview bù trừ tự động */}
          <SalaryBreakdownPreview
            agreedSalary={editAgreedSalary}
            customBaseSalary={editCustomBaseSalary}
            managementLevel={editManagementLevel}
            kpiSalary={editKpiSalary}
            hasInsurance={editHasInsurance}
            insuranceSalary={editInsuranceSalary}
          />

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="idCardNumber" label="Số CCCD">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="hasInsurance" valuePropName="checked" style={{ marginTop: 28 }}>
                <Checkbox>
                  Tham gia đóng BHXH
                </Checkbox>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              {editHasInsurance && (
                <Form.Item
                  name="insuranceSalary"
                  label="Mức đóng BHXH (VNĐ)"
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

          <Divider orientation="left" style={{ fontSize: 13, color: '#1677ff', margin: '12px 0 16px' }}>
            🌴 Quỹ phép năm ban đầu
          </Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="totalLeaveEntitled"
                label="Số ngày phép được hưởng trong năm"
                extra="Mặc định để trống sẽ tính theo luật: 12 ngày + thâm niên (+1 ngày / 5 năm)"
              >
                <InputNumber min={0} max={60} step={0.5} style={{ width: '100%' }} placeholder="Mặc định: 12 + thâm niên" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="usedBeforeSystem"
                label="Số phép đã dùng trước khi vào phần mềm"
                extra="Số ngày phép đã dùng ngoài hệ thống trước đó (mặc định 0)"
              >
                <InputNumber min={0} max={60} step={0.5} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setEditModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Cấu hình Lương & KPI Nhanh */}
      <Modal
        title={`⚙️ Cấu hình Lương & KPI: ${selectedEmp?.fullName}`}
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

      {/* Modal Tăng Lương Chuyên Môn */}
      <Modal
        title={`Tăng lương chuyên môn: ${selectedEmp?.fullName}`}
        open={raiseModalOpen}
        onCancel={() => setRaiseModalOpen(false)}
        footer={null}
        width={680}
      >
        <Form form={raiseForm} layout="vertical" onFinish={handleRaise}>
          <div style={{ marginBottom: 16, color: '#8c8c8c' }}>
            Mức lương thỏa thuận hiện tại:{' '}
            <b>{selectedEmp?.salaryProfiles?.[0]?.agreedSalary?.toLocaleString('vi-VN')} VNĐ</b>
          </div>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
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
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="baseSalary"
                label="Lương cơ bản (LCB) MỚI"
                extra="Để trống giữ nguyên LCB hiện tại"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  placeholder="Để trống nếu không đổi"
                />
              </Form.Item>
            </Col>
          </Row>

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

          {/* Preview bù trừ tự động */}
          <SalaryBreakdownPreview
            agreedSalary={raiseAgreedSalary}
            customBaseSalary={raiseCustomBaseSalary || selectedEmp?.customBaseSalary}
            managementLevel={raiseManagementLevel}
            kpiSalary={raiseKpiSalary}
          />

          <Form.Item
            name="effectiveDate"
            label="Ngày bắt đầu có hiệu lực"
            rules={[{ required: true, message: 'Vui lòng chọn ngày hiệu lực' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú quyết định tăng lương">
            <Input.TextArea rows={2} placeholder="VD: Tăng lương chuyên môn đợt xét duyệt cuối năm..." />
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

      {/* Modal Chuyển chính thức */}
      <Modal
        title={`Chuyển nhân sự chính thức: ${selectedEmp?.fullName}`}
        open={promoteModalOpen}
        onCancel={() => setPromoteModalOpen(false)}
        footer={null}
      >
        <Form form={promoteForm} layout="vertical" onFinish={handlePromote}>
          <Form.Item
            name="officialDate"
            label="Ngày bắt đầu chính thức"
            rules={[{ required: true, message: 'Vui lòng chọn ngày chính thức' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="agreedSalary" label="Lương thỏa thuận chính thức (VNĐ)">
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
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
                label="Lương KPI chính thức"
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
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setPromoteModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Xác nhận chính thức
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Import Nhân viên */}
      <Modal
        title="Nhập danh sách Nhân viên từ Excel / CSV"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setImportModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={importing}
            disabled={!importFile}
            onClick={handleImportEmployees}
          >
            Bắt đầu Nhập
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <strong>1. Tải file mẫu chuẩn:</strong>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<FileExcelOutlined />}
                  onClick={() => handleDownloadTemplate('xlsx')}
                >
                  Tải file mẫu Excel (.xlsx)
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownloadTemplate('csv')}
                >
                  Tải file mẫu (.csv)
                </Button>
              </Space>
            </div>
            <small style={{ color: '#8c8c8c', display: 'block', marginTop: 4 }}>
              File mẫu gồm các cột: Mã NV, Mã chấm công, Họ tên, SĐT, Email, CCCD, Ngày vào làm, Trạng thái, Lương thỏa thuận, Ngân hàng, STK.
            </small>
          </div>

          <div>
            <strong>2. Tải lên file nhân viên đã điền (.xlsx hoặc .csv):</strong>
            <div style={{ marginTop: 8 }}>
              <input
                type="file"
                accept=".xlsx, .xls, .csv, .txt"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setImportFile(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {importResult && (
            <div style={{ marginTop: 12 }}>
              <Alert
                message={`Kết quả: Đã nhập thành công ${importResult.success}/${importResult.total} nhân sự`}
                type={importResult.errors.length > 0 ? 'warning' : 'success'}
                showIcon
              />
              {importResult.errors.length > 0 && (
                <div style={{ maxHeight: 150, overflowY: 'auto', marginTop: 8, fontSize: 12, color: '#cf1322' }}>
                  {importResult.errors.map((err: string, idx: number) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Space>
      </Modal>

      {/* Modal Xác nhận Xóa Toàn Bộ Dữ Liệu Nhân Sự (Chỉ Quản trị viên tối cao) */}
      <Modal
        title={
          <div style={{ color: '#cf1322', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
            <WarningOutlined style={{ fontSize: 22 }} />
            <span>XÁC NHẬN XÓA TOÀN BỘ DỮ LIỆU NHÂN SỰ</span>
          </div>
        }
        open={clearAllModalOpen}
        onCancel={() => !clearAllLoading && setClearAllModalOpen(false)}
        footer={null}
        destroyOnClose
        width={560}
      >
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Cảnh báo: Hành động mang tính xóa sạch và KHÔNG THỂ HOÀN TÁC!"
          description={
            <div>
              <p style={{ margin: '4px 0' }}>
                Hệ thống sẽ <b>xóa sạch toàn bộ dữ liệu nhân sự</b>, bao gồm:
              </p>
              <ul style={{ paddingLeft: 20, margin: '4px 0' }}>
                <li>Danh sách toàn bộ nhân viên & hồ sơ lương</li>
                <li>Lịch sử chấm công, bảng công và bảng lương tất cả các tháng</li>
                <li>Toàn bộ đơn từ xin nghỉ, OT, làm bù và số dư ngày phép năm</li>
                <li>Toàn bộ tài khoản người dùng của các nhân viên</li>
              </ul>
              <p style={{ margin: '6px 0 0', fontWeight: 600, color: '#389e0d' }}>
                🛡️ Tài khoản Quản trị viên (Admin) tối cao và các cấu hình cơ sở (Mức LCB mặc định, Phòng ban, Chức vụ) sẽ được bảo lưu an toàn.
              </p>
            </div>
          }
        />

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
            1. Vui lòng nhập chính xác cụm từ <span style={{ color: '#cf1322' }}>XOA TOAN BO</span> để xác nhận:
          </label>
          <Input
            placeholder="Nhập: XOA TOAN BO"
            value={clearAllConfirmText}
            onChange={(e) => setClearAllConfirmText(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
            2. Nhập mật khẩu Quản trị viên của bạn để xác thực:
          </label>
          <Input.Password
            placeholder="Nhập mật khẩu Admin của bạn"
            value={clearAllPassword}
            onChange={(e) => setClearAllPassword(e.target.value)}
          />
        </div>

        <div style={{ textAlign: 'right' }}>
          <Button
            style={{ marginRight: 8 }}
            onClick={() => setClearAllModalOpen(false)}
            disabled={clearAllLoading}
          >
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            danger
            loading={clearAllLoading}
            disabled={clearAllConfirmText.trim() !== 'XOA TOAN BO' || !clearAllPassword}
            onClick={handleClearAll}
          >
            Xác nhận Xóa Sạch Toàn Bộ
          </Button>
        </div>
      </Modal>
    </div>
  );
};
