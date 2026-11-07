import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  DatePicker,
  Tag,
  Space,
  message,
  Popconfirm,
  Card,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Tabs,
  Alert,
  Tooltip,
} from 'antd';
import {
  CalculatorOutlined,
  LockOutlined,
  UnlockOutlined,
  PlusOutlined,
  GiftOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  PrinterOutlined,
  TableOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const PayrollPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [period, setPeriod] = useState<any>(null);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Adjustment Modal
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjForm] = Form.useForm();

  // Adjustment Import Modal
  const [adjImportModalOpen, setAdjImportModalOpen] = useState(false);
  const [adjImporting, setAdjImporting] = useState(false);
  const [adjImportResult, setAdjImportResult] = useState<any>(null);
  const [adjImportFile, setAdjImportFile] = useState<File | null>(null);

  // Modal đánh giá KPI
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [selectedPayslipForKpi, setSelectedPayslipForKpi] = useState<any>(null);
  const [kpiPercentInput, setKpiPercentInput] = useState<number>(100);
  const [savingKpi, setSavingKpi] = useState(false);

  // Màn hình chi tiết bảng lương toàn bộ nhân viên
  const [departments, setDepartments] = useState<any[]>([]);
  const [masterDetailModalOpen, setMasterDetailModalOpen] = useState(false);
  const [detailDepartmentFilter, setDetailDepartmentFilter] = useState<string>('ALL');
  const [detailSearchText, setDetailSearchText] = useState<string>('');
  const [deletingPeriod, setDeletingPeriod] = useState(false);

  // Modal Cấu hình Thuế TNCN & Tham số chung
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configForm] = Form.useForm();
  const [configLoading, setConfigLoading] = useState(false);

  const loadHrmSettings = async () => {
    try {
      const res = await apiClient.get('/payroll/settings');
      configForm.setFieldsValue(res.data);
    } catch (err) {
      // ignore
    }
  };

  const handleSaveHrmSettings = async (values: any) => {
    try {
      setConfigLoading(true);
      await apiClient.put('/payroll/settings', values);
      message.success('Cập nhật cấu hình tham số chung thành công!');
      setConfigModalOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình');
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
    loadAdjustments();
    loadEmployees();
    loadDepartments();
  }, [selectedMonth]);

  const loadDepartments = async () => {
    try {
      const res = await apiClient.get('/org/departments');
      setDepartments(res.data);
    } catch (err) {
      // handled
    }
  };

  const loadPayroll = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/payroll/period?month=${selectedMonth}`);
      setPeriod(res.data);
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const loadAdjustments = async () => {
    try {
      const res = await apiClient.get(`/payroll/adjustments?month=${selectedMonth}`);
      setAdjustments(res.data);
    } catch (err) {
      // handled
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await apiClient.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      // handled
    }
  };

  const handleDeletePeriod = async () => {
    try {
      setDeletingPeriod(true);
      const res = await apiClient.delete(`/payroll/period?month=${selectedMonth}`);
      message.success(res.data?.message || `Đã xóa bảng lương tháng ${selectedMonth}`);
      setPeriod(null);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi xóa bảng lương');
    } finally {
      setDeletingPeriod(false);
    }
  };

  const handleExportMasterExcel = async () => {
    try {
      message.loading({ content: 'Đang kết xuất file Excel bảng lương chi tiết...', key: 'exportMaster' });
      const res = await apiClient.get(`/payroll/export?month=${selectedMonth}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bang_Luong_Chi_Tiet_${selectedMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success({ content: 'Đã xuất file Excel bảng lương chi tiết thành công!', key: 'exportMaster' });
    } catch (err: any) {
      message.error({ content: err.response?.data?.message || 'Không thể xuất file Excel. Vui lòng kiểm tra lại.', key: 'exportMaster' });
    }
  };

  const handleGenerate = async () => {
    try {
      setCalculating(true);
      const res = await apiClient.post('/payroll/generate', { month: selectedMonth });
      message.success(`Đã tính toán bảng lương cho ${res.data.totalPayslips} nhân sự!`);
      loadPayroll();
    } catch (err) {
      // handled
    } finally {
      setCalculating(false);
    }
  };

  const handleLock = async () => {
    try {
      await apiClient.put('/payroll/lock', { month: selectedMonth });
      message.success(`Đã khóa bảng lương tháng ${selectedMonth}!`);
      loadPayroll();
    } catch (err) {
      // handled
    }
  };

  const handleUnlock = async () => {
    try {
      await apiClient.put('/payroll/unlock', { month: selectedMonth });
      message.success(`Đã mở khóa bảng lương tháng ${selectedMonth}! Bạn có thể tính toán lại bảng lương.`);
      loadPayroll();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi mở khóa bảng lương');
    }
  };

  const handleDownloadAdjTemplate = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    try {
      const res = await apiClient.get(`/payroll/adjustments/template?format=${format}`, {
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
      link.setAttribute('download', `mau_thuong_phat_tam_ung.${ext}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success(`Đã tải xuống file mẫu ${ext.toUpperCase()}`);
    } catch (err) {
      message.error('Không thể tải file mẫu. Vui lòng thử lại.');
    }
  };

  const handleImportAdjustments = async () => {
    if (!adjImportFile) {
      message.error('Vui lòng chọn file CSV thưởng phạt');
      return;
    }
    try {
      setAdjImporting(true);
      const formData = new FormData();
      formData.append('file', adjImportFile);
      formData.append('month', selectedMonth);
      const res = await apiClient.post('/payroll/adjustments/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAdjImportResult(res.data);
      if (res.data.success > 0) {
        message.success(`Đã import ${res.data.success}/${res.data.total} dòng điều chỉnh thành công!`);
        loadAdjustments();
        message.info('Vui lòng bấm lại nút "Tính toán bảng lương" để cập nhật số liệu mới nhất!');
      } else {
        message.warning('Không có dòng điều chỉnh nào được import thành công');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi import');
    } finally {
      setAdjImporting(false);
    }
  };

  const handleAddAdjustment = async (values: any) => {
    try {
      await apiClient.post('/payroll/adjustments', {
        ...values,
        month: selectedMonth,
      });
      message.success('Đã thêm khoản điều chỉnh!');
      setAdjModalOpen(false);
      adjForm.resetFields();
      loadAdjustments();
      message.info('Vui lòng bấm lại nút "Tính toán bảng lương" để cập nhật số liệu mới nhất!');
    } catch (err) {
      // handled
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    try {
      await apiClient.delete(`/payroll/adjustments/${id}`);
      message.success('Đã xóa khoản điều chỉnh');
      loadAdjustments();
    } catch (err) {
      // handled
    }
  };

  const handleOpenKpiModal = (payslip: any) => {
    setSelectedPayslipForKpi(payslip);
    setKpiPercentInput(payslip.kpiPercent !== undefined ? payslip.kpiPercent : 100);
    setKpiModalOpen(true);
  };

  const handleSaveKpi = async () => {
    if (!selectedPayslipForKpi) return;
    try {
      setSavingKpi(true);
      const res = await apiClient.put(`/payroll/payslips/${selectedPayslipForKpi.id}/kpi`, {
        kpiPercent: kpiPercentInput,
      });
      message.success(`Đã cập nhật KPI ${kpiPercentInput}% cho ${selectedPayslipForKpi.employee?.fullName}!`);
      setKpiModalOpen(false);
      // Cập nhật lại payslip trong danh sách trực tiếp để giao diện cực mượt
      setPeriod((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          payslips: prev.payslips.map((p: any) => (p.id === res.data.id ? res.data : p)),
        };
      });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu KPI');
    } finally {
      setSavingKpi(false);
    }
  };

  const payslips = period?.payslips || [];
  const totalNet = payslips.reduce((sum: number, p: any) => sum + p.netSalary, 0);

  const columns = [
    {
      title: 'Mã NV',
      dataIndex: ['employee', 'employeeCode'],
      key: 'code',
      fixed: 'left' as any,
      width: 90,
    },
    {
      title: 'Họ và tên',
      dataIndex: ['employee', 'fullName'],
      key: 'name',
      fixed: 'left' as any,
      width: 170,
      render: (name: string, r: any) => (
        <div>
          <b>{name}</b>
          <div>
            <small style={{ color: '#8c8c8c' }}>{r.employee?.department?.name}</small>
          </div>
        </div>
      ),
    },
    {
      title: 'Công chuẩn',
      key: 'stdDays',
      width: 105,
      render: (_: any, r: any) => {
        const stdDays = r.employee?.department?.standardWorkDays || 26;
        return <Tag color="blue">{stdDays} ngày</Tag>;
      },
    },
    {
      title: 'Công TT',
      dataIndex: 'actualWorkUnits',
      key: 'actualWorkUnits',
      render: (v: number) => <b>{v}</b>,
    },
    {
      title: 'Công Lễ',
      dataIndex: 'holidayUnits',
      key: 'holidayUnits',
      render: (v: number) => (v > 0 ? <Tag color="purple">+{v}</Tag> : '-'),
    },
    {
      title: 'Lương thỏa thuận',
      dataIndex: 'agreedSalary',
      key: 'agreedSalary',
      render: (v: number) => `${v.toLocaleString('vi-VN')} đ`,
    },
    {
      title: '1. LCB nhận',
      dataIndex: 'baseSalary',
      key: 'baseSalary',
      render: (v: number) => `${v.toLocaleString('vi-VN')} đ`,
    },
    {
      title: '2. Phụ cấp (10%)',
      dataIndex: 'allowance',
      key: 'allowance',
      render: (v: number) => `${v.toLocaleString('vi-VN')} đ`,
    },
    {
      title: '3. Lương CM (ngày công)',
      dataIndex: 'skillSalary',
      key: 'skillSalary',
      render: (v: number) => `${v.toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Định mức KPI',
      dataIndex: 'kpiSalary',
      key: 'kpiSalary',
      render: (v: number) => (v > 0 ? `${v.toLocaleString('vi-VN')} đ` : '-'),
    },
    {
      title: '% KPI',
      key: 'kpiPercent',
      width: 110,
      render: (_: any, r: any) => {
        if ((r.kpiSalary || 0) <= 0) return '-';
        const percent = r.kpiPercent !== undefined ? r.kpiPercent : 100;
        const color = percent >= 100 ? 'green' : percent >= 80 ? 'blue' : 'volcano';
        return (
          <Tooltip title={!period?.isLocked ? 'Bấm để đánh giá / chỉnh sửa % KPI' : 'Bảng lương đã khóa'}>
            <Tag
              color={color}
              style={{
                cursor: !period?.isLocked ? 'pointer' : 'default',
                fontWeight: 600,
                padding: '2px 8px',
                fontSize: 13,
              }}
              onClick={() => !period?.isLocked && handleOpenKpiModal(r)}
            >
              {percent}% {!period?.isLocked && '✏️'}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Lương KPI nhận',
      dataIndex: 'kpiPay',
      key: 'kpiPay',
      render: (v: number, r: any) =>
        (r.kpiSalary || 0) > 0 ? (
          <span style={{ fontWeight: 600, color: '#722ed1' }}>{(v || 0).toLocaleString('vi-VN')} đ</span>
        ) : (
          '-'
        ),
    },
    {
      title: 'Lương quản lý',
      dataIndex: 'managementSalary',
      key: 'managementSalary',
      render: (v: number) => (v > 0 ? `${v.toLocaleString('vi-VN')} đ` : '-'),
    },
    {
      title: '4. Tăng ca (OT)',
      key: 'ot',
      render: (_: any, r: any) => {
        const total = r.otPay + r.otBonus;
        const otRate = r.employee?.department?.otRatePerHour || 50000;
        return total > 0 ? (
          <Tooltip title={`${r.otHours} giờ OT (đơn giá: ${otRate.toLocaleString('vi-VN')} đ/h) + thưởng bậc: ${r.otBonus.toLocaleString('vi-VN')} đ`}>
            <span style={{ color: '#1677ff', fontWeight: 600 }}>{total.toLocaleString('vi-VN')} đ</span>
          </Tooltip>
        ) : (
          '-'
        );
      },
    },
    {
      title: '5. Các khoản thưởng',
      dataIndex: 'directorBonus',
      key: 'bonus',
      render: (v: number) =>
        v > 0 ? <span style={{ color: '#3f8600' }}>+{v.toLocaleString('vi-VN')} đ</span> : '-',
    },
    {
      title: '6. Phạt - Giảm trừ',
      key: 'fines',
      render: (_: any, r: any) => {
        const fines = r.lateFine + r.otherFine;
        return fines > 0 ? (
          <span style={{ color: '#cf1322' }}>-{fines.toLocaleString('vi-VN')} đ</span>
        ) : (
          '-'
        );
      },
    },
    {
      title: '7. Bảo hiểm (10.5%)',
      dataIndex: 'insuranceDeduction',
      key: 'insurance',
      render: (v: number) =>
        v > 0 ? <span style={{ color: '#cf1322' }}>-{v.toLocaleString('vi-VN')} đ</span> : '-',
    },
    {
      title: '8. Đã tạm ứng',
      dataIndex: 'advancePayment',
      key: 'advance',
      render: (v: number) =>
        v > 0 ? <span style={{ color: '#cf1322' }}>-{v.toLocaleString('vi-VN')} đ</span> : '-',
    },
    {
      title: 'THỰC NHẬN CÒN LẠI',
      dataIndex: 'netSalary',
      key: 'netSalary',
      fixed: 'right' as any,
      width: 160,
      render: (v: number) => (
        <Tag color="green" style={{ fontSize: 14, padding: '4px 8px' }}>
          <b>{v.toLocaleString('vi-VN')} VNĐ</b>
        </Tag>
      ),
    },
  ];

  const adjTypeLabels: Record<string, { label: string; color: string }> = {
    DIRECTOR_BONUS: { label: 'Thưởng Ban Giám Đốc', color: 'green' },
    HOLIDAY_CASH_BONUS: {
      label: 'Thưởng lễ tiền mặt (20/10, 8/3...) [Đã nhận mặt -> tính vào Thưởng & trừ Tạm ứng]',
      color: 'gold',
    },
    FINE: { label: 'Phạt vi phạm', color: 'red' },
    ADVANCE: { label: 'Tạm ứng lương', color: 'orange' },
  };

  // Dữ liệu lọc cho Màn hình Bảng lương chi tiết toàn bộ nhân viên
  const filteredDetailPayslips = payslips.filter((p: any) => {
    const matchDept =
      detailDepartmentFilter === 'ALL' ||
      p.employee?.departmentId === detailDepartmentFilter ||
      p.employee?.department?.id === detailDepartmentFilter;
    const q = detailSearchText.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.employee?.fullName?.toLowerCase().includes(q) ||
      p.employee?.employeeCode?.toLowerCase().includes(q) ||
      p.employee?.position?.name?.toLowerCase().includes(q);
    return matchDept && matchSearch;
  });

  const totalDetailNet = filteredDetailPayslips.reduce((sum: number, p: any) => sum + (p.netSalary || 0), 0);
  const totalDetailGross = filteredDetailPayslips.reduce(
    (sum: number, p: any) =>
      sum +
      (p.baseSalary +
        p.allowance +
        p.skillSalary +
        p.managementSalary +
        (p.kpiPay || 0) +
        p.otPay +
        p.otBonus +
        p.directorBonus),
    0,
  );
  const totalDetailInsurance = filteredDetailPayslips.reduce(
    (sum: number, p: any) => sum + (p.insuranceDeduction || 0),
    0,
  );
  const totalDetailTax = filteredDetailPayslips.reduce(
    (sum: number, p: any) => sum + (p.personalIncomeTax || 0),
    0,
  );
  const totalDetailOt = filteredDetailPayslips.reduce(
    (sum: number, p: any) => sum + (p.otPay || 0) + (p.otBonus || 0),
    0,
  );

  const detailColumns = [
    {
      title: '1. THÔNG TIN NHÂN SỰ',
      children: [
        {
          title: 'STT',
          key: 'stt',
          width: 50,
          align: 'center' as const,
          render: (_: any, __: any, index: number) => index + 1,
        },
        {
          title: 'Mã NV',
          dataIndex: ['employee', 'employeeCode'],
          key: 'code',
          width: 90,
          fixed: 'left' as const,
        },
        {
          title: 'Họ và tên',
          dataIndex: ['employee', 'fullName'],
          key: 'name',
          width: 170,
          fixed: 'left' as const,
          render: (name: string, r: any) => (
            <div>
              <b>{name}</b>
              <div>
                <small style={{ color: '#8c8c8c' }}>{r.employee?.position?.name || 'Nhân viên'}</small>
              </div>
            </div>
          ),
        },
        {
          title: 'Phòng ban',
          dataIndex: ['employee', 'department', 'name'],
          key: 'dept',
          width: 130,
        },
        {
          title: 'Phân loại',
          key: 'empType',
          width: 110,
          render: (_: any, r: any) => {
            let snap: any = {};
            try {
              if (r.snapshotData) snap = JSON.parse(r.snapshotData);
            } catch (e) {}
            const isProbation = snap.isProbation ?? (r.employee?.status === 'PROBATION');
            if (r.employee?.isStoreSales || r.employee?.department?.isStoreSales) {
              return <Tag color="gold">Showroom</Tag>;
            }
            if (isProbation) return <Tag color="orange">Thử việc</Tag>;
            return <Tag color="blue">Chính thức</Tag>;
          },
        },
      ],
    },
    {
      title: '2. NGÀY CÔNG & THỜI GIAN',
      children: [
        {
          title: 'Công chuẩn',
          key: 'stdDays',
          width: 90,
          align: 'center' as const,
          render: (_: any, r: any) => {
            let snap: any = {};
            try {
              if (r.snapshotData) snap = JSON.parse(r.snapshotData);
            } catch (e) {}
            return snap.stdDays || r.employee?.department?.standardWorkDays || 26;
          },
        },
        {
          title: 'Công TT',
          dataIndex: 'actualWorkUnits',
          key: 'actualWorkUnits',
          width: 80,
          align: 'center' as const,
          render: (v: number) => <b>{v}</b>,
        },
        {
          title: 'Nghỉ lễ',
          dataIndex: 'holidayUnits',
          key: 'holidayUnits',
          width: 75,
          align: 'center' as const,
          render: (v: number) => (v > 0 ? <Tag color="purple">+{v}</Tag> : '-'),
        },
        {
          title: 'Phép năm',
          dataIndex: 'paidLeaveUnits',
          key: 'paidLeaveUnits',
          width: 85,
          align: 'center' as const,
          render: (v: number) => (v > 0 ? <Tag color="green">+{v}</Tag> : '-'),
        },
        {
          title: 'Nghỉ KL',
          key: 'unpaidLeave',
          width: 75,
          align: 'center' as const,
          render: (_: any, r: any) => {
            let snap: any = {};
            try {
              if (r.snapshotData) snap = JSON.parse(r.snapshotData);
            } catch (e) {}
            const v = snap.unpaidLeaveDays || 0;
            return v > 0 ? <Tag color="red">-{v}</Tag> : '-';
          },
        },
        {
          title: 'Tổng công hưởng lương',
          key: 'totalPaidUnits',
          width: 105,
          align: 'center' as const,
          render: (_: any, r: any) => {
            const sum = (r.actualWorkUnits || 0) + (r.holidayUnits || 0) + (r.paidLeaveUnits || 0);
            return (
              <Tag color="cyan">
                <b>{Number(sum.toFixed(2))}</b>
              </Tag>
            );
          },
        },
      ],
    },
    {
      title: '3. LƯƠNG CƠ SỞ & CHUYÊN MÔN',
      children: [
        {
          title: 'Lương thỏa thuận',
          dataIndex: 'agreedSalary',
          key: 'agreedSalary',
          width: 125,
          align: 'right' as const,
          render: (v: number) => (v || 0).toLocaleString('vi-VN') + ' đ',
        },
        {
          title: 'Mức LCB',
          key: 'lcbBase',
          width: 115,
          align: 'right' as const,
          render: (_: any, r: any) => {
            let snap: any = {};
            try {
              if (r.snapshotData) snap = JSON.parse(r.snapshotData);
            } catch (e) {}
            const lcb = snap.lcb || snap.customBaseSalary || 5681700;
            return (lcb || 0).toLocaleString('vi-VN') + ' đ';
          },
        },
        {
          title: 'Mức đóng BHXH',
          key: 'insuranceBase',
          width: 120,
          align: 'right' as const,
          render: (_: any, r: any) => {
            let snap: any = {};
            try {
              if (r.snapshotData) snap = JSON.parse(r.snapshotData);
            } catch (e) {}
            const insBase = snap.insuranceBase || 0;
            return insBase > 0 ? (
              <span style={{ color: '#0958d9', fontWeight: 500 }}>
                {insBase.toLocaleString('vi-VN')} đ
              </span>
            ) : (
              <span style={{ color: '#8c8c8c' }}>Không đóng</span>
            );
          },
        },
        {
          title: 'LCB nhận',
          dataIndex: 'baseSalary',
          key: 'baseSalary',
          width: 115,
          align: 'right' as const,
          render: (v: number) => (v || 0).toLocaleString('vi-VN') + ' đ',
        },
        {
          title: 'Phụ cấp (10%)',
          dataIndex: 'allowance',
          key: 'allowance',
          width: 115,
          align: 'right' as const,
          render: (v: number) => (v > 0 ? `${(v || 0).toLocaleString('vi-VN')} đ` : '-'),
        },
        {
          title: 'Lương CM (ngày công)',
          dataIndex: 'skillSalary',
          key: 'skillSalary',
          width: 130,
          align: 'right' as const,
          render: (v: number) => (v > 0 ? `${(v || 0).toLocaleString('vi-VN')} đ` : '-'),
        },
        {
          title: 'Lương quản lý',
          dataIndex: 'managementSalary',
          key: 'managementSalary',
          width: 120,
          align: 'right' as const,
          render: (v: number) => (v > 0 ? `${(v || 0).toLocaleString('vi-VN')} đ` : '-'),
        },
      ],
    },
    {
      title: '4. ĐÁNH GIÁ & LƯƠNG KPI',
      children: [
        {
          title: 'Định mức KPI',
          dataIndex: 'kpiSalary',
          key: 'kpiSalary',
          width: 115,
          align: 'right' as const,
          render: (v: number) => (v > 0 ? `${(v || 0).toLocaleString('vi-VN')} đ` : '-'),
        },
        {
          title: '% KPI',
          key: 'kpiPercent',
          width: 90,
          align: 'center' as const,
          render: (_: any, r: any) => {
            if ((r.kpiSalary || 0) <= 0) return '-';
            const percent = r.kpiPercent !== undefined ? r.kpiPercent : 100;
            const color = percent >= 100 ? 'green' : percent >= 80 ? 'blue' : 'volcano';
            return (
              <Tag color={color} style={{ fontWeight: 600 }}>
                {percent}%
              </Tag>
            );
          },
        },
        {
          title: 'Lương KPI nhận',
          dataIndex: 'kpiPay',
          key: 'kpiPay',
          width: 120,
          align: 'right' as const,
          render: (v: number, r: any) =>
            (r.kpiSalary || 0) > 0 ? (
              <span style={{ fontWeight: 600, color: '#722ed1' }}>{(v || 0).toLocaleString('vi-VN')} đ</span>
            ) : (
              '-'
            ),
        },
      ],
    },
    {
      title: '5. LÀM THÊM GIỜ (OT)',
      children: [
        {
          title: 'Giờ OT',
          dataIndex: 'otHours',
          key: 'otHours',
          width: 75,
          align: 'center' as const,
          render: (v: number) => (v > 0 ? `${v}h` : '-'),
        },
        {
          title: 'Tiền OT',
          dataIndex: 'otPay',
          key: 'otPay',
          width: 110,
          align: 'right' as const,
          render: (v: number) => (v > 0 ? `${(v || 0).toLocaleString('vi-VN')} đ` : '-'),
        },
        {
          title: 'Thưởng bậc OT',
          dataIndex: 'otBonus',
          key: 'otBonus',
          width: 115,
          align: 'right' as const,
          render: (v: number) =>
            v > 0 ? <span style={{ color: '#52c41a' }}>+{(v || 0).toLocaleString('vi-VN')} đ</span> : '-',
        },
      ],
    },
    {
      title: '6. THƯỞNG & THU NHẬP',
      children: [
        {
          title: 'Thưởng BGĐ',
          dataIndex: 'directorBonus',
          key: 'directorBonus',
          width: 115,
          align: 'right' as const,
          render: (v: number) =>
            v > 0 ? <span style={{ color: '#3f8600' }}>+{(v || 0).toLocaleString('vi-VN')} đ</span> : '-',
        },
        {
          title: 'Thưởng lễ mặt',
          key: 'holidayCashBonus',
          width: 115,
          align: 'right' as const,
          render: (_: any, r: any) => {
            let snap: any = {};
            try {
              if (r.snapshotData) snap = JSON.parse(r.snapshotData);
            } catch (e) {}
            const v = snap.holidayCashBonus || 0;
            return v > 0 ? <span style={{ color: '#fa8c16' }}>{v.toLocaleString('vi-VN')} đ</span> : '-';
          },
        },
        {
          title: 'TỔNG THU NHẬP GỘP',
          key: 'totalIncome',
          width: 150,
          align: 'right' as const,
          render: (_: any, r: any) => {
            const sum =
              r.baseSalary +
              r.allowance +
              r.skillSalary +
              r.managementSalary +
              (r.kpiPay || 0) +
              r.otPay +
              r.otBonus +
              r.directorBonus;
            return <b style={{ color: '#1677ff' }}>{sum.toLocaleString('vi-VN')} đ</b>;
          },
        },
      ],
    },
    {
      title: '7. CÁC KHOẢN GIẢM TRỪ',
      children: [
        {
          title: 'BHXH (10.5%)',
          dataIndex: 'insuranceDeduction',
          key: 'insuranceDeduction',
          width: 115,
          align: 'right' as const,
          render: (v: number) =>
            v > 0 ? <span style={{ color: '#cf1322' }}>-{(v || 0).toLocaleString('vi-VN')} đ</span> : '-',
        },
        {
          title: 'Công đoàn',
          dataIndex: 'unionFee',
          key: 'unionFee',
          width: 95,
          align: 'right' as const,
          render: (v: number) =>
            v > 0 ? <span style={{ color: '#cf1322' }}>-{(v || 0).toLocaleString('vi-VN')} đ</span> : '-',
        },
        {
          title: 'Thuế TNCN',
          dataIndex: 'personalIncomeTax',
          key: 'personalIncomeTax',
          width: 110,
          align: 'right' as const,
          render: (v: number) =>
            v > 0 ? <span style={{ color: '#cf1322' }}>-{(v || 0).toLocaleString('vi-VN')} đ</span> : '-',
        },
        {
          title: 'Phạt muộn/về sớm',
          dataIndex: 'lateFine',
          key: 'lateFine',
          width: 115,
          align: 'right' as const,
          render: (v: number) =>
            v > 0 ? <span style={{ color: '#cf1322' }}>-{(v || 0).toLocaleString('vi-VN')} đ</span> : '-',
        },
        {
          title: 'Phạt khác',
          dataIndex: 'otherFine',
          key: 'otherFine',
          width: 105,
          align: 'right' as const,
          render: (v: number) =>
            v > 0 ? <span style={{ color: '#cf1322' }}>-{(v || 0).toLocaleString('vi-VN')} đ</span> : '-',
        },
        {
          title: 'Đã tạm ứng',
          dataIndex: 'advancePayment',
          key: 'advancePayment',
          width: 115,
          align: 'right' as const,
          render: (v: number) =>
            v > 0 ? <span style={{ color: '#cf1322' }}>-{(v || 0).toLocaleString('vi-VN')} đ</span> : '-',
        },
      ],
    },
    {
      title: '8. THỰC LĨNH & TÀI KHOẢN',
      children: [
        {
          title: 'THỰC LĨNH CHUYỂN KHOẢN',
          dataIndex: 'netSalary',
          key: 'netSalary',
          fixed: 'right' as const,
          width: 175,
          align: 'right' as const,
          render: (v: number) => (
            <Tag color="green" style={{ fontSize: 14, padding: '4px 8px', fontWeight: 700 }}>
              {(v || 0).toLocaleString('vi-VN')} VNĐ
            </Tag>
          ),
        },
        {
          title: 'Số TK ngân hàng',
          dataIndex: ['employee', 'bankAccount'],
          key: 'bankAcc',
          width: 135,
          render: (v: string) => v || '-',
        },
        {
          title: 'Ngân hàng',
          dataIndex: ['employee', 'bankName'],
          key: 'bankName',
          width: 130,
          render: (v: string) => v || '-',
        },
      ],
    },
  ];

  const renderMasterTableSummary = () => (
    <Table.Summary fixed>
      <Table.Summary.Row style={{ background: '#f5f5f5', fontWeight: 700 }}>
        <Table.Summary.Cell index={0} colSpan={5} align="center">
          TỔNG CỘNG ({filteredDetailPayslips.length} NHÂN SỰ)
        </Table.Summary.Cell>
        <Table.Summary.Cell index={5} align="center">
          -
        </Table.Summary.Cell>
        <Table.Summary.Cell index={6} align="center">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.actualWorkUnits || 0), 0)}
        </Table.Summary.Cell>
        <Table.Summary.Cell index={7} align="center">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.holidayUnits || 0), 0)}
        </Table.Summary.Cell>
        <Table.Summary.Cell index={8} align="center">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.paidLeaveUnits || 0), 0)}
        </Table.Summary.Cell>
        <Table.Summary.Cell index={9} align="center">
          {filteredDetailPayslips.reduce((s: number, p: any) => {
            let snap: any = {};
            try {
              if (p.snapshotData) snap = JSON.parse(p.snapshotData);
            } catch (e) {}
            return s + (snap.unpaidLeaveDays || 0);
          }, 0)}
        </Table.Summary.Cell>
        <Table.Summary.Cell index={10} align="center">
          {filteredDetailPayslips
            .reduce((s: number, p: any) => s + (p.actualWorkUnits || 0) + (p.holidayUnits || 0) + (p.paidLeaveUnits || 0), 0)
            .toFixed(1)}
        </Table.Summary.Cell>
        <Table.Summary.Cell index={11} align="right">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.agreedSalary || 0), 0).toLocaleString('vi-VN')} đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={12} align="right">
          {filteredDetailPayslips
            .reduce((s: number, p: any) => {
              let snap: any = {};
              try {
                if (p.snapshotData) snap = JSON.parse(p.snapshotData);
              } catch (e) {}
              return s + (snap.lcb || snap.customBaseSalary || 5681700);
            }, 0)
            .toLocaleString('vi-VN')}{' '}
          đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={13} align="right">
          {filteredDetailPayslips
            .reduce((s: number, p: any) => {
              let snap: any = {};
              try {
                if (p.snapshotData) snap = JSON.parse(p.snapshotData);
              } catch (e) {}
              return s + (snap.insuranceBase || 0);
            }, 0)
            .toLocaleString('vi-VN')}{' '}
          đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={14} align="right">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.baseSalary || 0), 0).toLocaleString('vi-VN')} đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={15} align="right">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.allowance || 0), 0).toLocaleString('vi-VN')} đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={16} align="right">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.skillSalary || 0), 0).toLocaleString('vi-VN')} đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={17} align="right">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.managementSalary || 0), 0).toLocaleString('vi-VN')} đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={18} align="right">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.kpiSalary || 0), 0).toLocaleString('vi-VN')} đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={19} align="center">
          -
        </Table.Summary.Cell>
        <Table.Summary.Cell index={20} align="right">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.kpiPay || 0), 0).toLocaleString('vi-VN')} đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={21} align="center">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.otHours || 0), 0)}h
        </Table.Summary.Cell>
        <Table.Summary.Cell index={22} align="right">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.otPay || 0), 0).toLocaleString('vi-VN')} đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={23} align="right">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.otBonus || 0), 0).toLocaleString('vi-VN')} đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={24} align="right">
          {filteredDetailPayslips.reduce((s: number, p: any) => s + (p.directorBonus || 0), 0).toLocaleString('vi-VN')} đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={25} align="right">
          {filteredDetailPayslips
            .reduce((s: number, p: any) => {
              let snap: any = {};
              try {
                if (p.snapshotData) snap = JSON.parse(p.snapshotData);
              } catch (e) {}
              return s + (snap.holidayCashBonus || 0);
            }, 0)
            .toLocaleString('vi-VN')}{' '}
          đ
        </Table.Summary.Cell>
        <Table.Summary.Cell index={26} align="right">
          <span style={{ color: '#1677ff' }}>{totalDetailGross.toLocaleString('vi-VN')} đ</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={27} align="right">
          <span style={{ color: '#cf1322' }}>-{totalDetailInsurance.toLocaleString('vi-VN')} đ</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={28} align="right">
          <span style={{ color: '#cf1322' }}>
            -{filteredDetailPayslips.reduce((s: number, p: any) => s + (p.unionFee || 0), 0).toLocaleString('vi-VN')} đ
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={29} align="right">
          <span style={{ color: '#cf1322' }}>-{totalDetailTax.toLocaleString('vi-VN')} đ</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={30} align="right">
          <span style={{ color: '#cf1322' }}>
            -{filteredDetailPayslips.reduce((s: number, p: any) => s + (p.lateFine || 0), 0).toLocaleString('vi-VN')} đ
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={31} align="right">
          <span style={{ color: '#cf1322' }}>
            -{filteredDetailPayslips.reduce((s: number, p: any) => s + (p.otherFine || 0), 0).toLocaleString('vi-VN')} đ
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={32} align="right">
          <span style={{ color: '#cf1322' }}>
            -{filteredDetailPayslips.reduce((s: number, p: any) => s + (p.advancePayment || 0), 0).toLocaleString('vi-VN')} đ
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={33} align="right">
          <span style={{ color: '#389e0d', fontSize: 14, fontWeight: 700 }}>
            {totalDetailNet.toLocaleString('vi-VN')} đ
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={34} align="center">
          -
        </Table.Summary.Cell>
        <Table.Summary.Cell index={35} align="center">
          -
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  );

  const renderMasterDetailContent = () => (
    <div className="print-master-payroll">
      {/* Thanh bộ lọc & thao tác nhanh */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
          background: '#f8fafc',
          padding: '12px 16px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <Space wrap>
          <span>
            <b>Lọc phòng ban:</b>
          </span>
          <Select
            style={{ width: 200 }}
            value={detailDepartmentFilter}
            onChange={(val) => setDetailDepartmentFilter(val)}
            options={[
              { value: 'ALL', label: 'Tất cả phòng ban' },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />

          <Input
            placeholder="Tìm theo Tên, Mã NV, Chức vụ..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ width: 260 }}
            value={detailSearchText}
            onChange={(e) => setDetailSearchText(e.target.value)}
            allowClear
          />

          <Button icon={<ReloadOutlined />} onClick={() => loadPayroll()}>
            Tải lại
          </Button>
        </Space>

        <Space wrap>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            style={{ background: '#107c41', borderColor: '#107c41' }}
            onClick={handleExportMasterExcel}
          >
            Xuất Excel Toàn Bộ NV (.xlsx)
          </Button>

          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            In Bảng Lương (Print)
          </Button>
        </Space>
      </div>

      {/* Thẻ thống kê tổng hợp */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} className="no-print">
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}>
            <Statistic
              title="Tổng quỹ lương gộp"
              value={totalDetailGross}
              suffix="đ"
              valueStyle={{ color: '#1d39c4', fontSize: 14 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic
              title="Tổng thực lĩnh chuyển khoản"
              value={totalDetailNet}
              suffix="đ"
              valueStyle={{ color: '#389e0d', fontSize: 15, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ background: '#fff2f0', borderColor: '#ffccc7' }}>
            <Statistic
              title="Tổng trích BHXH (10.5%)"
              value={totalDetailInsurance}
              suffix="đ"
              valueStyle={{ color: '#cf1322', fontSize: 14 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ background: '#fffbe6', borderColor: '#ffe58f' }}>
            <Statistic
              title="Tổng thuế TNCN tạm tính"
              value={totalDetailTax}
              suffix="đ"
              valueStyle={{ color: '#d46b08', fontSize: 14 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
            <Statistic
              title="Tổng chi phí tăng ca (OT)"
              value={totalDetailOt}
              suffix="đ"
              valueStyle={{ color: '#722ed1', fontSize: 14 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Bảng chi tiết toàn bộ nhân viên */}
      <Table
        dataSource={filteredDetailPayslips}
        columns={detailColumns as any}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: ['15', '25', '50', '100'] }}
        scroll={{ x: 3400, y: 550 }}
        bordered
        size="small"
        summary={renderMasterTableSummary}
      />
    </div>
  );

  return (
    <div>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-master-payroll, .print-master-payroll * {
            visibility: visible;
          }
          .print-master-payroll {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

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
          <h3 style={{ margin: 0 }}>Bảng Lương & Thưởng Phạt Tháng</h3>
          <DatePicker
            picker="month"
            value={dayjs(selectedMonth, 'YYYY-MM')}
            onChange={(d) => d && setSelectedMonth(d.format('YYYY-MM'))}
            format="MM/YYYY"
          />
          {period?.isLocked && <Tag color="red">🔒 ĐÃ KHÓA BẢNG LƯƠNG</Tag>}
        </Space>

        <Space wrap>
          {/* Nút Cấu hình Thuế & Tham số chung */}
          {(user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN') && (
            <Button
              icon={<SettingOutlined style={{ color: '#0958d9' }} />}
              onClick={() => {
                loadHrmSettings();
                setConfigModalOpen(true);
              }}
            >
              Cấu hình Thuế & Tham số
            </Button>
          )}

          {/* Nút Xem bảng lương chi tiết toàn bộ nhân viên */}
          <Button
            type="primary"
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
            icon={<TableOutlined />}
            onClick={() => setMasterDetailModalOpen(true)}
          >
            Bảng Lương Chi Tiết Toàn Bộ NV
          </Button>

          <Button
            icon={<FileExcelOutlined style={{ color: '#107c41' }} />}
            onClick={handleExportMasterExcel}
          >
            Xuất Excel Chi Tiết
          </Button>

          <Button
            icon={<GiftOutlined />}
            onClick={() => {
              adjForm.resetFields();
              setAdjModalOpen(true);
            }}
          >
            Thêm Thưởng / Phạt / Tạm Ứng
          </Button>

          <Button
            icon={<UploadOutlined />}
            onClick={() => {
              setAdjImportResult(null);
              setAdjImportFile(null);
              setAdjImportModalOpen(true);
            }}
          >
            Import Thưởng/Phạt từ Excel
          </Button>

          {!period?.isLocked ? (
            <>
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                loading={calculating}
                onClick={handleGenerate}
              >
                Tính toán bảng lương
              </Button>
              {(user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN') && (
                <Popconfirm
                  title="Khóa bảng lương tháng này?"
                  description="Sau khi khóa, dữ liệu sẽ cố định để kế toán chi trả."
                  onConfirm={handleLock}
                >
                  <Button icon={<LockOutlined />}>Khóa bảng lương</Button>
                </Popconfirm>
              )}
              {/* Nút Xóa toàn bộ tính toán bảng lương để tính lại */}
              {(user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN') && period && (
                <Popconfirm
                  title="Xóa toàn bộ bảng lương tháng này để tính lại?"
                  description="Thao tác này sẽ xóa toàn bộ phiếu lương đã tính toán để bạn có thể tính lại từ đầu. Dữ liệu thưởng phạt vẫn được giữ nguyên. Tiếp tục?"
                  onConfirm={handleDeletePeriod}
                  okText="Xóa dữ liệu"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} loading={deletingPeriod}>
                    Xóa bảng lương tháng
                  </Button>
                </Popconfirm>
              )}
            </>
          ) : (
            (user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN') && (
              <Popconfirm
                title="Mở khóa bảng lương tháng này?"
                description="Sau khi mở khóa, quản trị viên có thể tính toán lại bảng lương khi có thay đổi số liệu."
                onConfirm={handleUnlock}
              >
                <Button icon={<UnlockOutlined />} danger>
                  Mở khóa bảng lương
                </Button>
              </Popconfirm>
            )
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="Tổng số nhân sự có phiếu lương"
              value={payslips.length}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="Tổng chi phí thực nhận chuyển khoản toàn công ty"
              value={totalNet}
              suffix="VNĐ"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="detailed"
        items={[
          {
            key: 'detailed',
            label: `📑 Bảng Lương Chi Tiết Đầy Đủ (${filteredDetailPayslips.length} NV)`,
            children: renderMasterDetailContent(),
          },
          {
            key: 'payroll',
            label: '📊 Bảng Lương Tổng Hợp Rút Gọn',
            children: (
              <Table
                dataSource={payslips}
                columns={columns}
                rowKey="id"
                loading={loading}
                scroll={{ x: 1800 }}
              />
            ),
          },
          {
            key: 'adjustments',
            label: `🎁 Danh sách Thưởng / Phạt / Tạm ứng tháng (${adjustments.length})`,
            children: (
              <Table
                dataSource={adjustments}
                rowKey="id"
                columns={[
                  {
                    title: 'Nhân viên',
                    dataIndex: ['employee', 'fullName'],
                    render: (name: string, r: any) => `${name} (${r.employee?.employeeCode})`,
                  },
                  {
                    title: 'Khoản mục',
                    dataIndex: 'type',
                    render: (t: string) => {
                      const item = adjTypeLabels[t] || { label: t, color: 'default' };
                      return <Tag color={item.color}>{item.label}</Tag>;
                    },
                  },
                  {
                    title: 'Số tiền',
                    dataIndex: 'amount',
                    render: (v: number) => <b>{v.toLocaleString('vi-VN')} đ</b>,
                  },
                  {
                    title: 'Lý do / Ngày lễ',
                    dataIndex: 'reason',
                  },
                  {
                    title: 'Người tạo',
                    dataIndex: 'createdBy',
                  },
                  {
                    title: 'Thao tác',
                    render: (_: any, r: any) =>
                      !period?.isLocked && (
                        <Popconfirm
                          title="Xóa khoản này?"
                          onConfirm={() => handleDeleteAdjustment(r.id)}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      ),
                  },
                ]}
              />
            ),
          },
        ]}
      />

      {/* Modal Thêm Thưởng / Phạt / Tạm ứng */}
      <Modal
        title="Thêm khoản Thưởng / Phạt / Tạm ứng / Thưởng lễ tiền mặt"
        open={adjModalOpen}
        onCancel={() => setAdjModalOpen(false)}
        footer={null}
      >
        <Form form={adjForm} layout="vertical" onFinish={handleAddAdjustment}>
          <Form.Item
            name="employeeId"
            label="Chọn nhân viên"
            rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
          >
            <Select
              showSearch
              placeholder="Chọn nhân viên"
              optionFilterProp="label"
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.fullName} (${e.employeeCode})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="Khoản mục"
            rules={[{ required: true }]}
            initialValue="HOLIDAY_CASH_BONUS"
          >
            <Select
              options={[
                {
                  value: 'HOLIDAY_CASH_BONUS',
                  label: '🎁 Thưởng ngày lễ tiền mặt (20/10, 8/3...) [Cộng Thưởng & Trừ Tạm ứng]',
                },
                { value: 'DIRECTOR_BONUS', label: '⭐ Thưởng Ban Giám Đốc (chuyển cùng lương)' },
                { value: 'ADVANCE', label: '💵 Tạm ứng lương trong tháng' },
                { value: 'FINE', label: '⚠️ Phạt vi phạm khác' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Số tiền (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
              placeholder="VD: 500000"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do chi tiết"
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <Input.TextArea rows={2} placeholder="VD: Thưởng lễ 20/10 nhận tiền mặt, Tạm ứng viện phí..." />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setAdjModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu khoản mục
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Import Thưởng / Phạt / Tạm ứng */}
      <Modal
        title={`Import Thưởng, Phạt, Tạm ứng tháng ${selectedMonth}`}
        open={adjImportModalOpen}
        onCancel={() => setAdjImportModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setAdjImportModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={adjImporting}
            disabled={!adjImportFile}
            onClick={handleImportAdjustments}
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
                  onClick={() => handleDownloadAdjTemplate('xlsx')}
                >
                  Tải file mẫu Excel (.xlsx)
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownloadAdjTemplate('csv')}
                >
                  Tải file mẫu (.csv)
                </Button>
              </Space>
            </div>
            <small style={{ color: '#8c8c8c', display: 'block', marginTop: 4 }}>
              File mẫu gồm các cột: Mã NV, Loại (THƯỞNG / PHẠT / TẠM ỨNG / THƯỞNG LỄ TIỀN MẶT), Số tiền, Lý do chi tiết.
            </small>
          </div>

          <div>
            <strong>2. Tải lên file Thưởng/Phạt đã điền (.xlsx hoặc .csv):</strong>
            <div style={{ marginTop: 8 }}>
              <input
                type="file"
                accept=".xlsx, .xls, .csv, .txt"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setAdjImportFile(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {adjImportResult && (
            <div style={{ marginTop: 12 }}>
              <Alert
                message={`Kết quả: Đã nhập thành công ${adjImportResult.success}/${adjImportResult.total} dòng`}
                type={adjImportResult.errors.length > 0 ? 'warning' : 'success'}
                showIcon
              />
              {adjImportResult.errors.length > 0 && (
                <div style={{ maxHeight: 150, overflowY: 'auto', marginTop: 8, fontSize: 12, color: '#cf1322' }}>
                  {adjImportResult.errors.map((err: string, idx: number) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Space>
      </Modal>

      {/* Modal Đánh giá % hoàn thành KPI */}
      <Modal
        title={`Đánh giá hiệu quả KPI: ${selectedPayslipForKpi?.employee?.fullName || ''} (${selectedPayslipForKpi?.employee?.employeeCode || ''})`}
        open={kpiModalOpen}
        onCancel={() => setKpiModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setKpiModalOpen(false)}>
            Hủy
          </Button>,
          <Button key="save" type="primary" loading={savingKpi} onClick={handleSaveKpi}>
            Lưu đánh giá KPI
          </Button>,
        ]}
      >
        {selectedPayslipForKpi && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ background: '#f9f0ff', border: '1px solid #d3adf7', padding: '12px 16px', borderRadius: 6, marginBottom: 16 }}>
              <div style={{ color: '#531dab', fontWeight: 600, marginBottom: 6 }}>
                🎯 Mức lương KPI định mức tháng:
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#722ed1' }}>
                {(selectedPayslipForKpi.kpiSalary || 0).toLocaleString('vi-VN')} VNĐ
              </div>
              <small style={{ color: '#595959' }}>
                (Trích từ Lương chuyên môn thỏa thuận của nhân sự)
              </small>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                Tỷ lệ hoàn thành công việc / KPI đạt được (%):
              </label>
              <InputNumber
                min={0}
                max={300}
                step={5}
                value={kpiPercentInput}
                onChange={(v) => setKpiPercentInput(Number(v) || 0)}
                style={{ width: '100%', fontSize: 16 }}
                addonAfter="%"
              />
              <small style={{ color: '#8c8c8c', display: 'block', marginTop: 4 }}>
                Mặc định: 100% (đạt đủ định mức). Vượt chỉ tiêu &gt; 100% (nhận nhiều hơn). Thấp hơn 100% nhận theo tỷ lệ.
              </small>
            </div>

            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '10px 14px', borderRadius: 6 }}>
              <div style={{ color: '#237804', fontWeight: 600 }}>
                💰 Lương KPI thực nhận dự kiến:
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#389e0d', marginTop: 4 }}>
                {Math.round(
                  (selectedPayslipForKpi.kpiSalary || 0) * (kpiPercentInput / 100)
                ).toLocaleString('vi-VN')}{' '}
                VNĐ
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                Khoản này sẽ tự động cộng vào tổng thu nhập và cập nhật lại mức Thực Lĩnh ngay sau khi lưu.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Bảng Lương Chi Tiết Toàn Bộ Nhân Viên (Toàn màn hình) */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 32 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>
              📋 BẢNG LƯƠNG CHI TIẾT TOÀN BỘ NHÂN VIÊN - THÁNG {selectedMonth}
            </span>
          </div>
        }
        open={masterDetailModalOpen}
        onCancel={() => setMasterDetailModalOpen(false)}
        footer={null}
        width="98vw"
        style={{ top: 12 }}
        styles={{ body: { maxHeight: '86vh', overflowY: 'auto', padding: '16px 20px' } }}
      >
        {renderMasterDetailContent()}
      </Modal>

      {/* Modal Cấu hình Thuế TNCN & Tham số chung toàn công ty */}
      <Modal
        title="⚙️ Cấu hình Thuế TNCN & Tham số tính lương toàn công ty"
        open={configModalOpen}
        onCancel={() => setConfigModalOpen(false)}
        footer={null}
        width={650}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Cài đặt quy chuẩn tính thuế & khấu trừ toàn bộ nhân sự"
          description="Các tham số này áp dụng cho toàn công ty. Thay đổi tại đây sẽ được áp dụng cho các lần tính toán bảng lương tiếp theo."
        />
        <Form form={configForm} layout="vertical" onFinish={handleSaveHrmSettings}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="taxPersonalDeduction"
                label="Giảm trừ bản thân (Thuế TNCN)"
                extra="Quy định hiện hành: 15.500.000 đ"
                rules={[{ required: true, message: 'Vui lòng nhập mức giảm trừ bản thân' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="taxDependentDeduction"
                label="Giảm trừ người phụ thuộc (Thuế TNCN)"
                extra="Quy định hiện hành: 6.200.000 đ / người"
                rules={[{ required: true, message: 'Vui lòng nhập mức giảm trừ người phụ thuộc' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="unionFeeMonthly"
                label="Đoàn phí công đoàn hàng tháng (VNĐ)"
                extra="Chỉ trừ khi nhân viên chính thức CÓ tham gia BHXH (50.000 đ)"
                rules={[{ required: true, message: 'Vui lòng nhập mức đoàn phí' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="defaultBaseSalary"
                label="Mức Lương cơ bản chuẩn mặc định (VNĐ)"
                extra="Áp dụng khi nhân sự chưa cấu hình LCB riêng (5.681.700 đ)"
                rules={[{ required: true, message: 'Vui lòng nhập mức lương cơ bản' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setConfigModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={configLoading}>
              Lưu cấu hình
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
