import React, { useEffect, useState } from 'react';
import {
  Table,
  DatePicker,
  Button,
  Tabs,
  Tag,
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  message,
  Card,
  Alert,
  Space,
  Upload,
  Popconfirm,
  Tooltip,
  TimePicker,
  Radio,
  Checkbox,
  Row,
  Col,
} from 'antd';
import {
  EditOutlined,
  UploadOutlined,
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  ShopOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  StarOutlined,
  CalendarOutlined,
  EyeOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrHr = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN' || user?.role === 'HR';
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [timesheet, setTimesheet] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal Điều chỉnh công
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideTargetEmp, setOverrideTargetEmp] = useState<any>(null);
  const [overrideForm] = Form.useForm();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');

  // Modal Chi tiết ngày công & tăng ca của 1 nhân viên
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailEmp, setSelectedDetailEmp] = useState<any>(null);
  const [detailFilter, setDetailFilter] = useState<'ALL' | 'WORKED' | 'OT' | 'ISSUES'>('ALL');

  // Modal Import chấm công
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [selectedUploadFile, setSelectedUploadFile] = useState<any>(null);
  const [clearBeforeImport, setClearBeforeImport] = useState<boolean>(true);
  const [clearingMonth, setClearingMonth] = useState(false);

  // Quản lý Ngày nghỉ lễ
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayForm] = Form.useForm();
  const [seedingHolidays, setSeedingHolidays] = useState(false);

  // Quản lý Chốt công Nhóm Bán hàng tại cửa hàng (báo công tháng)
  const [storeSalesModalOpen, setStoreSalesModalOpen] = useState(false);
  const [storeSalesList, setStoreSalesList] = useState<any[]>([]);
  const [savingStoreSales, setSavingStoreSales] = useState(false);

  // Modal báo công lẻ cho 1 nhân viên bán hàng
  const [singleStoreModalOpen, setSingleStoreModalOpen] = useState(false);
  const [singleStoreEmp, setSingleStoreEmp] = useState<any>(null);
  const [singleStoreForm] = Form.useForm();

  // Quản lý Đánh giá KPI tháng
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [kpiList, setKpiList] = useState<any[]>([]);
  const [loadingKpi, setLoadingKpi] = useState(false);
  const [savingKpi, setSavingKpi] = useState(false);
  const [kpiDeptFilter, setKpiDeptFilter] = useState<string>('');

  // Modal Đánh giá KPI riêng cho từng nhân sự
  const [singleKpiModalOpen, setSingleKpiModalOpen] = useState(false);
  const [singleKpiEmp, setSingleKpiEmp] = useState<any>(null);
  const [singleKpiPercent, setSingleKpiPercent] = useState<number>(100);
  const [singleKpiNote, setSingleKpiNote] = useState<string>('');
  const [savingSingleKpi, setSavingSingleKpi] = useState(false);

  const handleOpenSingleKpi = (emp: any) => {
    setSingleKpiEmp(emp);
    setSingleKpiPercent(emp.kpiPercent !== undefined ? emp.kpiPercent : 100);
    setSingleKpiNote(emp.kpiNote || '');
    setSingleKpiModalOpen(true);
  };

  const handleSaveSingleKpi = async () => {
    if (!singleKpiEmp) return;
    try {
      setSavingSingleKpi(true);
      await apiClient.post('/payroll/kpi/monthly', {
        month: selectedMonth,
        evaluations: [
          {
            employeeId: singleKpiEmp.id,
            kpiPercent: Number(singleKpiPercent) || 0,
            notes: singleKpiNote,
          },
        ],
      });
      message.success(`Đã lưu đánh giá KPI ${singleKpiPercent}% cho ${singleKpiEmp.fullName}!`);
      setSingleKpiModalOpen(false);
      loadAttendanceData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi khi lưu đánh giá KPI');
    } finally {
      setSavingSingleKpi(false);
    }
  };

  const formatPunchTime = (dt?: string | null) => {
    if (!dt) return '-';
    const match = String(dt).match(/T(\d{2}:\d{2})/);
    if (match) return match[1];
    return dayjs(dt).format('HH:mm');
  };

  const getDayOfWeekName = (dayOfWeek: number) => {
    switch (dayOfWeek) {
      case 0:
        return 'Chủ nhật';
      case 1:
        return 'Thứ hai';
      case 2:
        return 'Thứ ba';
      case 3:
        return 'Thứ tư';
      case 4:
        return 'Thứ năm';
      case 5:
        return 'Thứ sáu';
      case 6:
        return 'Thứ bảy';
      default:
        return '';
    }
  };

  const getEmployeeDailyList = (emp: any) => {
    if (!emp) return [];
    const daysInMonth = dayjs(selectedMonth).daysInMonth();
    const isStore = Boolean(emp.isStoreSales || emp.department?.isStoreSales);

    const list: any[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${selectedMonth}-${dayStr}`;
      const dateObj = dayjs(dateKey);
      const dayOfWeek = dateObj.day();

      const attRecord = (emp.attendanceDays || []).find((a: any) => {
        const aDate = a.workDate ? String(a.workDate).slice(0, 10) : '';
        return aDate === dateKey;
      });

      const holiday = holidays.find((h: any) => {
        const hDate = h.date ? String(h.date).slice(0, 10) : '';
        return hDate === dateKey && h.isPaid;
      });

      const jDate = emp.joinDate ? String(emp.joinDate).slice(0, 10) : null;
      const rDate = emp.resignDate ? String(emp.resignDate).slice(0, 10) : null;
      const isBeforeJoin = Boolean(jDate && dateKey < jDate);
      const isAfterResign = Boolean(rDate && dateKey > rDate);

      let workUnits = 0;
      let leaveUnits = 0;
      let otHours = 0;
      let workedHours = 0;
      let checkIn = null;
      let checkOut = null;
      let lateMinutes = 0;
      let earlyMinutes = 0;
      let isLate = false;
      let isEarly = false;
      let isMissingPunch = false;
      let isThroughLunch = false;
      let isManualOverridden = false;
      let overrideReason = '';

      if (attRecord) {
        workUnits = Number(attRecord.workUnits || 0);
        leaveUnits = Number(attRecord.leaveUnits || 0);
        otHours = Number(attRecord.otHours || 0);
        workedHours = Number(attRecord.workedHours || workUnits * 8);
        checkIn = attRecord.checkIn;
        checkOut = attRecord.checkOut;
        lateMinutes = attRecord.lateMinutes || 0;
        earlyMinutes = attRecord.earlyMinutes || 0;
        isLate = Boolean(attRecord.isLate);
        isEarly = Boolean(attRecord.isEarly);
        isMissingPunch = Boolean(attRecord.isMissingPunch);
        isThroughLunch = Boolean(attRecord.isThroughLunch);
        isManualOverridden = Boolean(attRecord.isManualOverridden);
        overrideReason = attRecord.overrideReason || '';
      } else if (holiday && !isBeforeJoin && !isAfterResign && !isStore) {
        workUnits = 1.0;
      }

      list.push({
        key: dateKey,
        dayNumber: d,
        dateKey,
        dateFormatted: dateObj.format('DD/MM/YYYY'),
        dayOfWeek,
        dayOfWeekName: getDayOfWeekName(dayOfWeek),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        isSaturday: dayOfWeek === 6,
        holiday: holiday ? holiday.name : null,
        isBeforeJoin,
        isAfterResign,
        hasRecord: Boolean(attRecord),
        workUnits,
        leaveUnits,
        otHours,
        workedHours,
        checkIn,
        checkOut,
        lateMinutes,
        earlyMinutes,
        isLate,
        isEarly,
        isMissingPunch,
        isThroughLunch,
        isManualOverridden,
        overrideReason,
        rawRecord: attRecord,
      });
    }
    return list;
  };

  const handleOpenDetailModal = (emp: any) => {
    setSelectedDetailEmp(emp);
    setDetailFilter('ALL');
    setDetailModalOpen(true);
  };

  const handleOpenOverrideForDay = (emp: any, dayItem: any) => {
    if (!emp?.id) {
      message.error('Không tìm thấy thông tin nhân viên');
      return;
    }
    setOverrideTargetEmp(emp);
    setSelectedEmpId(emp.id);
    const dateObj = dayjs(dayItem.dateKey);
    let checkInVal = null;
    let checkOutVal = null;
    if (dayItem.checkIn) {
      const match = String(dayItem.checkIn).match(/T(\d{2}):(\d{2})/);
      if (match) {
        checkInVal = dayjs().hour(Number(match[1])).minute(Number(match[2])).second(0);
      }
    }
    if (dayItem.checkOut) {
      const match = String(dayItem.checkOut).match(/T(\d{2}):(\d{2})/);
      if (match) {
        checkOutVal = dayjs().hour(Number(match[1])).minute(Number(match[2])).second(0);
      }
    }

    overrideForm.resetFields();
    overrideForm.setFieldsValue({
      workDate: dateObj,
      workUnits: dayItem.workUnits !== undefined ? dayItem.workUnits : 1.0,
      leaveUnits: dayItem.leaveUnits || 0,
      otHours: dayItem.otHours || 0,
      checkIn: checkInVal,
      checkOut: checkOutVal,
      overrideReason: dayItem.overrideReason || `Điều chỉnh công / OT ngày ${dayItem.dateFormatted}`,
    });
    setOverrideModalOpen(true);
  };

  const handleExportEmployeeDaily = (emp: any) => {
    const dailyList = getEmployeeDailyList(emp);
    if (!dailyList.length) {
      message.warning('Không có dữ liệu ngày công');
      return;
    }

    const headers = [
      'STT',
      'Ngày',
      'Thứ',
      'Giờ vào',
      'Giờ ra',
      'Số giờ làm',
      'Công thực tế',
      'Công phép',
      'Giờ tăng ca (OT)',
      'Đi muộn (phút)',
      'Về sớm (phút)',
      'Trạng thái / Ghi chú',
      'Lý do điều chỉnh',
    ];

    const rows = dailyList.map((d: any, idx: number) => {
      let statusDesc = '';
      if (d.holiday) statusDesc += `Nghỉ lễ: ${d.holiday}; `;
      if (d.leaveUnits > 0) statusDesc += `Nghỉ phép năm ${d.leaveUnits} ngày; `;
      if (d.isSunday) statusDesc += 'Chủ nhật; ';
      if (d.isMissingPunch) statusDesc += 'Thiếu quẹt thẻ; ';
      if (d.isThroughLunch) statusDesc += 'Thông trưa; ';
      if (d.isManualOverridden) statusDesc += 'Đã điều chỉnh; ';
      if (!statusDesc) statusDesc = d.workUnits > 0 ? 'Bình thường' : 'Nghỉ';

      return [
        idx + 1,
        `"${d.dateFormatted}"`,
        `"${d.dayOfWeekName}"`,
        `"${formatPunchTime(d.checkIn)}"`,
        `"${formatPunchTime(d.checkOut)}"`,
        d.workedHours,
        d.workUnits,
        d.leaveUnits,
        d.otHours,
        d.lateMinutes,
        d.earlyMinutes,
        `"${statusDesc.trim()}"`,
        `"${(d.overrideReason || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `bang_cong_chi_tiet_${emp.employeeCode}_${selectedMonth}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(`Đã xuất chi tiết ngày công & tăng ca của ${emp.fullName}!`);
  };

  const handleExportMatrixCsv = () => {
    if (!timesheet.length) {
      message.warning('Không có dữ liệu bảng công');
      return;
    }
    const daysInMonth = dayjs(selectedMonth).daysInMonth();
    const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => `Ngày ${i + 1}`);
    const headers = [
      'Mã NV',
      'Họ và tên',
      'Phòng ban',
      ...dayHeaders,
      'Công thực tế',
      'Công phép',
      'Công lễ',
      'Tổng công tính lương',
      'Tổng giờ OT',
    ];

    const rows = timesheet.map((r) => {
      const dailyList = getEmployeeDailyList(r);
      const isStore = Boolean(r.isStoreSales || r.department?.isStoreSales);
      const dayValues = Array.from({ length: daysInMonth }, (_, i) => {
        const item = dailyList.find((d) => d.dayNumber === i + 1);
        if (!item) return '-';
        let text = `${item.workUnits}`;
        if (item.leaveUnits > 0) text += ` [P:${item.leaveUnits}]`;
        if (item.otHours > 0) text += ` (OT:${item.otHours}h)`;
        if (item.holiday) text += ` [Lễ:${item.holiday}]`;
        return `"${text}"`;
      });

      const actual = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.workUnits || 0), 0);
      const leave = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.leaveUnits || 0), 0);
      const hUnits = isStore ? 0 : holidaysInMonth.length;
      const totalUnits = Number((actual + leave + hUnits).toFixed(2));
      const totalOt = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.otHours || 0), 0);

      return [
        `"${r.employeeCode}"`,
        `"${r.fullName}"`,
        `"${r.department?.name || ''}"`,
        ...dayValues,
        actual,
        leave,
        hUnits,
        totalUnits,
        totalOt,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ma_tran_cham_cong_chi_tiet_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Đã tải xuống bảng ma trận công & tăng ca cả tháng!');
  };

  useEffect(() => {
    loadAttendanceData();
    loadDebts();
    loadViolations();
    loadHolidays();
  }, [selectedMonth]);

  const loadHolidays = async () => {
    try {
      const year = dayjs(selectedMonth).year();
      const res = await apiClient.get(`/attendance/holidays?year=${year}`);
      setHolidays(res.data);
    } catch (err) {
      // handled
    }
  };

  const handleCreateHoliday = async (values: any) => {
    try {
      await apiClient.post('/attendance/holidays', {
        name: values.name,
        date: values.date.format('YYYY-MM-DD'),
        isPaid: values.isPaid !== undefined ? values.isPaid : true,
      });
      message.success('Đã thêm ngày nghỉ lễ thành công!');
      setHolidayModalOpen(false);
      holidayForm.resetFields();
      loadHolidays();
      loadAttendanceData();
    } catch (err) {
      // handled
    }
  };

  const handleSeedHolidays = async () => {
    try {
      setSeedingHolidays(true);
      const year = dayjs(selectedMonth).year();
      const res = await apiClient.post('/attendance/holidays/seed', { year });
      message.success(`Đã khởi tạo thành công ${res.data.totalHolidays} ngày nghỉ lễ chuẩn năm ${year}!`);
      loadHolidays();
      loadAttendanceData();
    } catch (err) {
      // handled
    } finally {
      setSeedingHolidays(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      await apiClient.delete(`/attendance/holidays/${id}`);
      message.success('Đã xóa ngày nghỉ lễ');
      loadHolidays();
      loadAttendanceData();
    } catch (err) {
      // handled
    }
  };

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/attendance/monthly?month=${selectedMonth}`);
      setTimesheet(res.data);
      if (selectedDetailEmp) {
        const refreshed = res.data.find((e: any) => e.id === selectedDetailEmp.id);
        if (refreshed) setSelectedDetailEmp(refreshed);
      }
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const loadDebts = async () => {
    try {
      const res = await apiClient.get('/attendance/makeup-debts');
      setDebts(res.data);
    } catch (err) {
      // handled
    }
  };

  const loadViolations = async () => {
    if (!isAdminOrHr) return;
    try {
      const res = await apiClient.get(`/attendance/violations?month=${selectedMonth}`);
      setViolations(res.data);
    } catch (err) {
      // handled
    }
  };

  const handleOverride = async (values: any) => {
    try {
      const targetEmpId = selectedEmpId || overrideTargetEmp?.id;
      if (!targetEmpId) {
        message.error('Chưa xác định được nhân viên cần điều chỉnh công');
        return;
      }

      if (!values.workDate) {
        message.error('Vui lòng chọn ngày cần điều chỉnh công');
        return;
      }

      let formattedWorkDate = '';
      if (dayjs.isDayjs(values.workDate)) {
        formattedWorkDate = values.workDate.format('YYYY-MM-DD');
      } else if (typeof values.workDate === 'string') {
        formattedWorkDate = values.workDate.slice(0, 10);
      } else {
        formattedWorkDate = dayjs(values.workDate).format('YYYY-MM-DD');
      }

      if (!formattedWorkDate || formattedWorkDate === 'Invalid Date') {
        message.error('Ngày điều chỉnh không hợp lệ');
        return;
      }

      const reason = (values.overrideReason || '').trim();
      if (!reason) {
        message.error('Bắt buộc phải nhập lý do điều chỉnh công');
        return;
      }

      const payload: any = {
        workDate: formattedWorkDate,
        workUnits: values.workUnits !== undefined ? Number(values.workUnits) : 1.0,
        leaveUnits: values.leaveUnits !== undefined ? Number(values.leaveUnits) : 0,
        otHours: values.otHours !== undefined ? Number(values.otHours) : 0,
        overrideReason: reason,
      };

      if (values.checkIn) {
        if (dayjs.isDayjs(values.checkIn) && values.checkIn.isValid()) {
          payload.checkIn = values.checkIn.format('HH:mm');
        } else if (typeof values.checkIn === 'string' && values.checkIn.trim()) {
          const match = values.checkIn.match(/(\d{1,2}):(\d{2})/);
          if (match) payload.checkIn = `${match[1].padStart(2, '0')}:${match[2]}`;
        }
      }

      if (values.checkOut) {
        if (dayjs.isDayjs(values.checkOut) && values.checkOut.isValid()) {
          payload.checkOut = values.checkOut.format('HH:mm');
        } else if (typeof values.checkOut === 'string' && values.checkOut.trim()) {
          const match = values.checkOut.match(/(\d{1,2}):(\d{2})/);
          if (match) payload.checkOut = `${match[1].padStart(2, '0')}:${match[2]}`;
        }
      }

      setOverrideLoading(true);
      await apiClient.post(`/attendance/override/${targetEmpId}`, payload);
      message.success('Điều chỉnh công & tăng ca thành công!');
      setOverrideModalOpen(false);
      overrideForm.resetFields();
      await loadAttendanceData();
    } catch (err: any) {
      console.error('Lỗi điều chỉnh công:', err);
      const serverMsg = err.response?.data?.message;
      const errorMsg =
        typeof serverMsg === 'string'
          ? serverMsg
          : Array.isArray(serverMsg)
          ? serverMsg.join(', ')
          : err.message || 'Có lỗi xảy ra khi điều chỉnh công';
      message.error(errorMsg);
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleClearMonth = async () => {
    try {
      setClearingMonth(true);
      const res = await apiClient.delete(`/attendance/clear-month?month=${selectedMonth}`);
      message.success(
        res.data.message || `Đã xóa dữ liệu chấm công máy của tháng ${selectedMonth}. Đơn xin phép được bảo toàn.`,
      );
      loadAttendanceData();
      loadViolations();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi khi xóa dữ liệu chấm công';
      message.error(msg);
    } finally {
      setClearingMonth(false);
    }
  };

  const handleImportRaw = async () => {
    if (!importContent.trim()) {
      message.error('Vui lòng dán nội dung file chấm công');
      return;
    }
    try {
      setImportLoading(true);
      const res = await apiClient.post('/attendance/import-raw', {
        content: importContent,
        fileName: 'clipboard_data.csv',
        clearExistingMonth: clearBeforeImport,
      });
      message.success(
        `Import thành công! Đã xử lý ${res.data.employeesProcessed} nhân sự, ${res.data.daysSaved} ngày công, phát hiện ${res.data.missingPunchCount} lượt thiếu chấm.`,
      );
      setImportModalOpen(false);
      setImportContent('');
      loadAttendanceData();
      loadViolations();
    } catch (err) {
      // handled
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportFile = async () => {
    if (!selectedUploadFile) {
      message.error('Vui lòng chọn file Excel / CSV');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedUploadFile);
    formData.append('clearExistingMonth', String(clearBeforeImport));

    try {
      setImportLoading(true);
      const res = await apiClient.post('/attendance/import-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success(
        `Import thành công! Đã xử lý ${res.data.employeesProcessed} nhân sự, ${res.data.daysSaved} ngày công.`,
      );
      setImportModalOpen(false);
      setSelectedUploadFile(null);
      loadAttendanceData();
      loadViolations();
    } catch (err) {
      // handled
    } finally {
      setImportLoading(false);
    }
  };

  // Mở modal chốt công nhóm Bán hàng tại cửa hàng
  const handleOpenStoreSalesModal = () => {
    const list = timesheet.map((emp) => {
      const isStore = Boolean(emp.isStoreSales || emp.department?.isStoreSales);
      const currentUnits = (emp.attendanceDays || []).reduce((sum: number, d: any) => sum + d.workUnits, 0);
      const currentOt = (emp.attendanceDays || []).reduce((sum: number, d: any) => sum + d.otHours, 0);
      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        departmentName: emp.department?.name || 'Chưa phân phòng',
        isStoreSales: isStore,
        workUnits: currentUnits > 0 ? currentUnits : 26,
        otHours: currentOt,
        note: `Trưởng bộ phận chốt công tháng ${selectedMonth}`,
      };
    });

    list.sort((a, b) => (b.isStoreSales ? 1 : 0) - (a.isStoreSales ? 1 : 0));
    setStoreSalesList(list);
    setStoreSalesModalOpen(true);
  };

  const handleUpdateStoreSalesRow = (id: string, field: string, value: any) => {
    setStoreSalesList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleSaveStoreSalesBatch = async () => {
    const targets = storeSalesList.filter((item) => item.isStoreSales);
    if (targets.length === 0) {
      message.warning('Không có nhân viên nào thuộc nhóm bán hàng để chốt công.');
      return;
    }

    try {
      setSavingStoreSales(true);
      const res = await apiClient.post('/attendance/store-sales/submit-monthly', {
        month: selectedMonth,
        entries: targets.map((item) => ({
          employeeId: item.id,
          workUnits: Number(item.workUnits) || 0,
          otHours: Number(item.otHours) || 0,
          note: item.note,
        })),
      });
      message.success(res.data.message || 'Chốt công nhóm bán hàng thành công!');
      setStoreSalesModalOpen(false);
      loadAttendanceData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi chốt công');
    } finally {
      setSavingStoreSales(false);
    }
  };

  // Mở modal báo công cho 1 nhân viên bán hàng
  const handleOpenStoreSalesModalSingle = (emp: any) => {
    setSingleStoreEmp(emp);
    const currentUnits = (emp.attendanceDays || []).reduce((sum: number, d: any) => sum + d.workUnits, 0);
    const currentOt = (emp.attendanceDays || []).reduce((sum: number, d: any) => sum + d.otHours, 0);
    singleStoreForm.setFieldsValue({
      workUnits: currentUnits > 0 ? currentUnits : 26,
      otHours: currentOt,
      note: `Trưởng bộ phận chốt công tháng ${selectedMonth}`,
    });
    setSingleStoreModalOpen(true);
  };

  const handleSaveSingleStoreSales = async (values: any) => {
    if (!singleStoreEmp) return;
    try {
      setSavingStoreSales(true);
      await apiClient.post('/attendance/store-sales/submit-monthly', {
        month: selectedMonth,
        entries: [
          {
            employeeId: singleStoreEmp.id,
            workUnits: Number(values.workUnits) || 0,
            otHours: Number(values.otHours) || 0,
            note: values.note,
          },
        ],
      });
      message.success(`Đã chốt công ${values.workUnits} ngày cho ${singleStoreEmp.fullName}!`);
      setSingleStoreModalOpen(false);
      loadAttendanceData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi chốt công');
    } finally {
      setSavingStoreSales(false);
    }
  };

  // Mở modal đánh giá KPI tháng
  const handleOpenKpiModal = async () => {
    try {
      setLoadingKpi(true);
      setKpiModalOpen(true);
      const res = await apiClient.get(`/payroll/kpi/monthly?month=${selectedMonth}`);
      setKpiList(res.data);
    } catch (err: any) {
      message.error('Không thể tải danh sách đánh giá KPI');
    } finally {
      setLoadingKpi(false);
    }
  };

  const handleUpdateKpiRow = (employeeId: string, field: string, value: any) => {
    setKpiList((prev) =>
      prev.map((item) => (item.employeeId === employeeId ? { ...item, [field]: value } : item)),
    );
  };

  const handleSaveKpiBatch = async () => {
    try {
      setSavingKpi(true);
      const res = await apiClient.post('/payroll/kpi/monthly', {
        month: selectedMonth,
        evaluations: kpiList.map((item) => ({
          employeeId: item.employeeId,
          kpiPercent: Number(item.kpiPercent !== undefined ? item.kpiPercent : 100),
          notes: item.notes,
        })),
      });
      message.success(res.data.message || 'Lưu đánh giá KPI thành công!');
      setKpiModalOpen(false);
      loadAttendanceData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu đánh giá KPI');
    } finally {
      setSavingKpi(false);
    }
  };

  const holidaysInMonth = holidays.filter(
    (h: any) => dayjs(h.date).format('YYYY-MM') === selectedMonth && h.isPaid,
  );

  const timesheetColumns = [
    {
      title: 'Mã NV',
      dataIndex: 'employeeCode',
      key: 'code',
      width: 90,
      render: (code: string, r: any) => (
        <a onClick={() => handleOpenDetailModal(r)} style={{ fontWeight: 600 }}>
          {code}
        </a>
      ),
    },
    {
      title: 'Mã CC',
      dataIndex: 'attendanceCode',
      key: 'attCode',
      width: 90,
      render: (code: string, r: any) => {
        const isStore = Boolean(r.isStoreSales || r.department?.isStoreSales);
        return isStore ? <Tag color="orange">Báo công</Tag> : (code || '-');
      },
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'name',
      render: (name: string, r: any) => {
        const isStore = Boolean(r.isStoreSales || r.department?.isStoreSales);
        return (
          <div>
            <a onClick={() => handleOpenDetailModal(r)} style={{ fontWeight: 600 }}>
              {name}
            </a>
            <div style={{ color: '#8c8c8c' }}>
              {r.department?.name || 'Chưa phân phòng'}
              {isStore && (
                <Tag color="cyan" style={{ marginLeft: 6 }}>
                  Nhóm bán hàng
                </Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Công thực tế (CC)',
      key: 'actualUnits',
      render: (_: any, r: any) => {
        const actual = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.workUnits || 0), 0);
        return (
          <Tag color="blue" style={{ fontSize: 13, fontWeight: 600 }}>
            {actual} công
          </Tag>
        );
      },
    },
    {
      title: 'Công nghỉ phép',
      key: 'leaveUnits',
      render: (_: any, r: any) => {
        const leave = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.leaveUnits || 0), 0);
        return leave > 0 ? (
          <Tag color="green" style={{ fontSize: 13, fontWeight: 600 }}>
            +{leave} phép
          </Tag>
        ) : (
          <span style={{ color: '#bfbfbf' }}>-</span>
        );
      },
    },
    {
      title: 'Công nghỉ lễ',
      key: 'holidayUnits',
      render: (_: any, r: any) => {
        const isStore = Boolean(r.isStoreSales || r.department?.isStoreSales);
        if (isStore) {
          return <span style={{ color: '#8c8c8c', fontStyle: 'italic' }}>Không áp dụng (Bán hàng)</span>;
        }
        const hUnits = holidaysInMonth.filter((h: any) => {
          const hDate = dayjs(h.date);
          const jDate = dayjs(r.joinDate);
          const rDate = r.resignDate ? dayjs(r.resignDate) : null;
          return !hDate.isBefore(jDate, 'day') && (!rDate || !hDate.isAfter(rDate, 'day'));
        }).length;
        return hUnits > 0 ? <Tag color="purple">+{hUnits} ngày lễ</Tag> : '-';
      },
    },
    {
      title: 'Tổng công tính lương',
      key: 'totalUnits',
      render: (_: any, r: any) => {
        const actual = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.workUnits || 0), 0);
        const leave = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.leaveUnits || 0), 0);
        const isStore = Boolean(r.isStoreSales || r.department?.isStoreSales);
        const hUnits = isStore ? 0 : holidaysInMonth.filter((h: any) => {
          const hDate = dayjs(h.date);
          const jDate = dayjs(r.joinDate);
          const rDate = r.resignDate ? dayjs(r.resignDate) : null;
          return !hDate.isBefore(jDate, 'day') && (!rDate || !hDate.isAfter(rDate, 'day'));
        }).length;
        const total = Number((actual + leave + hUnits).toFixed(2));
        return (
          <Tooltip title={`Thực tế: ${actual} | Nghỉ phép: ${leave} | Lễ: ${hUnits}`}>
            <Tag color="cyan" style={{ fontSize: 14, fontWeight: 700 }}>
              {total} công
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Số giờ làm thêm (OT)',
      key: 'totalOt',
      render: (_: any, r: any) => {
        const ot = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + d.otHours, 0);
        return (
          <span>
            {ot > 0 ? (
              <Tag color="purple" style={{ fontWeight: 600, fontSize: 13 }}>
                ⚡ {ot} giờ
              </Tag>
            ) : (
              '-'
            )}
          </span>
        );
      },
    },
    {
      title: 'Đánh giá KPI',
      key: 'kpiPercent',
      width: 135,
      render: (_: any, r: any) => {
        const percent = r.kpiPercent !== undefined ? r.kpiPercent : 100;
        const color = percent >= 100 ? '#52c41a' : percent >= 80 ? '#1677ff' : percent >= 50 ? '#fa8c16' : '#cf1322';
        const label = percent >= 120 ? 'Xuất sắc' : percent >= 100 ? 'Đạt' : percent >= 80 ? 'Khá' : 'Chưa đạt';
        const kpiSal = r.kpiSalary || 0;
        const estPay = Math.round((kpiSal * percent) / 100);

        return (
          <Tooltip
            title={
              <div style={{ fontSize: 12 }}>
                <div>
                  Hiệu quả công việc: <b>{percent}% ({label})</b>
                </div>
                {kpiSal > 0 ? (
                  <div style={{ marginTop: 2 }}>
                    Định mức Lương KPI: {kpiSal.toLocaleString('vi-VN')} đ<br />
                    → Nhận theo KPI: <b style={{ color: '#52c41a' }}>{estPay.toLocaleString('vi-VN')} đ</b>
                  </div>
                ) : (
                  <div style={{ color: '#8c8c8c' }}>Chưa thiết lập mức lương KPI</div>
                )}
                {r.kpiNote && (
                  <div style={{ fontStyle: 'italic', color: '#ffd591', marginTop: 3 }}>
                    Nhận xét: {r.kpiNote}
                  </div>
                )}
                {isAdminOrHr && (
                  <div style={{ marginTop: 4, color: '#40a9ff', fontWeight: 600 }}>
                    👉 Bấm để chỉnh sửa KPI nhân viên này
                  </div>
                )}
              </div>
            }
          >
            <div
              style={{ cursor: isAdminOrHr ? 'pointer' : 'default', display: 'inline-block' }}
              onClick={() => isAdminOrHr && handleOpenSingleKpi(r)}
            >
              <Tag
                icon={<TrophyOutlined />}
                style={{
                  color,
                  borderColor: color,
                  fontWeight: 700,
                  fontSize: 12,
                  padding: '2px 8px',
                  background: '#fafafa',
                }}
              >
                {percent}%
              </Tag>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                {label}
                {isAdminOrHr && <EditOutlined style={{ marginLeft: 4, color: '#1677ff', fontSize: 10 }} />}
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, r: any) => {
        const isStore = Boolean(r.isStoreSales || r.department?.isStoreSales);
        return (
          <Space wrap>
            <Button
              size="small"
              type="primary"
              ghost
              icon={<CalendarOutlined />}
              onClick={() => handleOpenDetailModal(r)}
            >
              Chi tiết công & OT
            </Button>
            {isAdminOrHr && (
              <Tooltip title="Đánh giá hiệu quả công việc & % hoàn thành KPI tháng">
                <Button
                  size="small"
                  icon={<TrophyOutlined />}
                  style={{ color: '#722ed1', borderColor: '#722ed1' }}
                  onClick={() => handleOpenSingleKpi(r)}
                >
                  KPI ({r.kpiPercent ?? 100}%)
                </Button>
              </Tooltip>
            )}
            {isAdminOrHr && isStore && (
              <Button
                size="small"
                type="primary"
                style={{ background: '#389e0d', borderColor: '#389e0d' }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleOpenStoreSalesModalSingle(r)}
              >
                Báo công tháng
              </Button>
            )}
            {isAdminOrHr && !isStore && (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setOverrideTargetEmp(r);
                  setSelectedEmpId(r.id);
                  overrideForm.resetFields();
                  overrideForm.setFieldsValue({
                    workDate: dayjs(),
                    workUnits: 1.0,
                    otHours: 0,
                    checkIn: null,
                    checkOut: null,
                    overrideReason: 'Điều chỉnh công',
                  });
                  setOverrideModalOpen(true);
                }}
              >
                Sửa công / OT
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const daysInMonth = dayjs(selectedMonth).daysInMonth();
  const matrixColumns: any[] = [
    {
      title: 'Mã NV',
      dataIndex: 'employeeCode',
      key: 'code',
      width: 85,
      fixed: 'left',
      render: (code: string, r: any) => (
        <a onClick={() => handleOpenDetailModal(r)} style={{ fontWeight: 600 }}>
          {code}
        </a>
      ),
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'name',
      width: 170,
      fixed: 'left',
      render: (name: string, r: any) => (
        <div>
          <a onClick={() => handleOpenDetailModal(r)} style={{ fontWeight: 600 }}>
            {name}
          </a>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            {r.department?.name || 'Chưa phân phòng'}
          </div>
        </div>
      ),
    },
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dayStr = String(dayNum).padStart(2, '0');
      const dateKey = `${selectedMonth}-${dayStr}`;
      const dObj = dayjs(dateKey);
      const dow = dObj.day();
      const isSun = dow === 0;
      const isSat = dow === 6;
      const dowShort = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dow];

      return {
        title: (
          <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{dayNum}</span>
            <div style={{ fontSize: 10, color: isSun ? '#ff4d4f' : isSat ? '#fa8c16' : '#8c8c8c' }}>
              {dowShort}
            </div>
          </div>
        ),
        key: `day_${dayNum}`,
        width: 60,
        align: 'center' as const,
        render: (_: any, r: any) => {
          const dailyList = getEmployeeDailyList(r);
          const dayItem = dailyList.find((d) => d.dayNumber === dayNum);
          if (!dayItem) return '-';

          if (dayItem.holiday) {
            return (
              <Tooltip title={`Nghỉ lễ: ${dayItem.holiday}`}>
                <Tag color="magenta" style={{ margin: 0, padding: '0 3px', fontSize: 11 }}>
                  Lễ
                </Tag>
              </Tooltip>
            );
          }

          if (dayItem.workUnits === 0 && dayItem.leaveUnits === 0 && dayItem.otHours === 0) {
            if (isSun) return <span style={{ color: '#d9d9d9', fontSize: 11 }}>CN</span>;
            return <span style={{ color: '#e8e8e8' }}>-</span>;
          }

          return (
            <div
              style={{ cursor: isAdminOrHr ? 'pointer' : 'default', lineHeight: 1.2 }}
              onClick={() => isAdminOrHr && handleOpenOverrideForDay(r, dayItem)}
              title={isAdminOrHr ? 'Bấm để sửa công / tăng ca' : undefined}
            >
              {dayItem.workUnits > 0 && (
                <span
                  style={{
                    fontWeight: 600,
                    color: dayItem.workUnits >= 1 ? '#389e0d' : '#fa8c16',
                    fontSize: 12,
                  }}
                >
                  {dayItem.workUnits}
                </span>
              )}
              {dayItem.leaveUnits > 0 && (
                <div>
                  <Tooltip title={`Nghỉ phép năm hưởng lương (${dayItem.leaveUnits} ngày)`}>
                    <Tag
                      color="green"
                      style={{
                        margin: 0,
                        padding: '0 2px',
                        fontSize: 10,
                        lineHeight: '14px',
                        fontWeight: 600,
                      }}
                    >
                      P{dayItem.leaveUnits === 1 ? '' : ` ${dayItem.leaveUnits}`}
                    </Tag>
                  </Tooltip>
                </div>
              )}
              {dayItem.otHours > 0 && (
                <div>
                  <Tag
                    color="purple"
                    style={{ margin: 0, padding: '0 2px', fontSize: 10, lineHeight: '14px', fontWeight: 600 }}
                  >
                    +{dayItem.otHours}h
                  </Tag>
                </div>
              )}
            </div>
          );
        },
      };
    }),
    {
      title: 'Công TT',
      key: 'matrixActualUnits',
      width: 75,
      fixed: 'right',
      align: 'center' as const,
      render: (_: any, r: any) => {
        const actual = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.workUnits || 0), 0);
        return <b>{actual}</b>;
      },
    },
    {
      title: 'Phép',
      key: 'matrixLeaveUnits',
      width: 65,
      fixed: 'right',
      align: 'center' as const,
      render: (_: any, r: any) => {
        const leave = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.leaveUnits || 0), 0);
        return leave > 0 ? (
          <Tag color="green" style={{ margin: 0, padding: '0 4px', fontWeight: 600 }}>
            {leave}
          </Tag>
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Lễ',
      key: 'matrixHolidayUnits',
      width: 55,
      fixed: 'right',
      align: 'center' as const,
      render: (_: any, r: any) => {
        const isStore = Boolean(r.isStoreSales || r.department?.isStoreSales);
        const hUnits = isStore
          ? 0
          : holidaysInMonth.filter((h: any) => {
              const hDate = dayjs(h.date);
              const jDate = dayjs(r.joinDate);
              const rDate = r.resignDate ? dayjs(r.resignDate) : null;
              return !hDate.isBefore(jDate, 'day') && (!rDate || !hDate.isAfter(rDate, 'day'));
            }).length;
        return hUnits > 0 ? <Tag color="purple" style={{ margin: 0, padding: '0 3px' }}>+{hUnits}</Tag> : '-';
      },
    },
    {
      title: 'Tổng công',
      key: 'matrixTotalUnits',
      width: 85,
      fixed: 'right',
      align: 'center' as const,
      render: (_: any, r: any) => {
        const actual = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.workUnits || 0), 0);
        const leave = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.leaveUnits || 0), 0);
        const isStore = Boolean(r.isStoreSales || r.department?.isStoreSales);
        const hUnits = isStore
          ? 0
          : holidaysInMonth.filter((h: any) => {
              const hDate = dayjs(h.date);
              const jDate = dayjs(r.joinDate);
              const rDate = r.resignDate ? dayjs(r.resignDate) : null;
              return !hDate.isBefore(jDate, 'day') && (!rDate || !hDate.isAfter(rDate, 'day'));
            }).length;
        return (
          <Tag color="blue" style={{ fontWeight: 700, margin: 0 }}>
            {Number((actual + leave + hUnits).toFixed(2))}
          </Tag>
        );
      },
    },
    {
      title: 'Tổng OT',
      key: 'matrixTotalOt',
      width: 85,
      fixed: 'right',
      align: 'center' as const,
      render: (_: any, r: any) => {
        const ot = (r.attendanceDays || []).reduce((sum: number, d: any) => sum + d.otHours, 0);
        return ot > 0 ? (
          <Tag color="purple" style={{ fontWeight: 600 }}>
            {ot}h
          </Tag>
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Chi tiết',
      key: 'matrixAction',
      width: 70,
      fixed: 'right',
      align: 'center' as const,
      render: (_: any, r: any) => (
        <Tooltip title="Xem chi tiết ngày công & tăng ca của nhân viên này">
          <Button
            size="small"
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetailModal(r)}
          />
        </Tooltip>
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
          <h3 style={{ margin: 0 }}>Theo dõi & Quản lý Chấm công</h3>
          <DatePicker
            picker="month"
            value={dayjs(selectedMonth, 'YYYY-MM')}
            onChange={(d) => d && setSelectedMonth(d.format('YYYY-MM'))}
            format="MM/YYYY"
          />
        </Space>

        {isAdminOrHr && (
          <Space wrap>
            <Button
              icon={<ShopOutlined />}
              style={{ background: '#389e0d', color: '#fff', borderColor: '#389e0d' }}
              onClick={handleOpenStoreSalesModal}
            >
              Chốt công nhóm Bán hàng
            </Button>
            <Button
              icon={<TrophyOutlined />}
              style={{ background: '#722ed1', color: '#fff', borderColor: '#722ed1', fontWeight: 600 }}
              onClick={handleOpenKpiModal}
            >
              🏆 Đánh giá KPI cả tháng ({selectedMonth})
            </Button>
            <Popconfirm
              title="Xóa dữ liệu chấm công tháng này?"
              description={
                <div style={{ maxWidth: 320 }}>
                  Bạn có chắc muốn xóa sạch chấm công máy tháng <b>{selectedMonth}</b> để tính công lại?
                  <div style={{ marginTop: 6, color: '#389e0d', fontWeight: 600 }}>
                    ✓ 100% các phiếu xin phép của nhân sự vẫn được giữ nguyên vẹn.
                  </div>
                </div>
              }
              onConfirm={handleClearMonth}
              okText="Xóa để tính lại"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} loading={clearingMonth}>
                Clear chấm công tháng
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
            >
              Import File Chấm Công Ronald Jack
            </Button>
          </Space>
        )}
      </div>

      <Tabs
        defaultActiveKey="timesheet"
        items={[
          {
            key: 'timesheet',
            label: '📅 Bảng công tháng',
            children: (
              <div>
                {holidaysInMonth.length > 0 && (
                  <Alert
                    message={
                      <div>
                        <strong>
                          Tháng {dayjs(selectedMonth, 'YYYY-MM').format('MM/YYYY')} có {holidaysInMonth.length} ngày nghỉ lễ hưởng nguyên lương:
                        </strong>{' '}
                        {holidaysInMonth.map((h: any) => `${h.name} (${dayjs(h.date).format('DD/MM/YYYY')})`).join('; ')}.
                        <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                          ℹ️ Hệ thống tự động cộng công nghỉ lễ vào tổng công hưởng lương của nhân sự mà không cần phải quẹt thẻ máy chấm công.
                        </div>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}
                <Table
                  dataSource={timesheet}
                  columns={timesheetColumns}
                  rowKey="id"
                  loading={loading}
                  expandable={{
                    expandedRowRender: (record) => {
                      const dailyList = getEmployeeDailyList(record);
                      const activeDays = dailyList.filter(
                        (d) => d.workUnits > 0 || d.otHours > 0 || d.hasRecord || d.holiday,
                      );
                      return (
                        <div
                          style={{
                            background: '#fafafa',
                            padding: '12px 16px',
                            borderRadius: 6,
                            border: '1px solid #f0f0f0',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 8,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: '#1677ff' }}>
                              📅 Danh sách ngày làm việc & tăng ca trong tháng ({activeDays.length} ngày)
                            </span>
                            <Button
                              size="small"
                              type="link"
                              icon={<EyeOutlined />}
                              onClick={() => handleOpenDetailModal(record)}
                            >
                              Xem toàn bộ 31 ngày & Xuất Excel
                            </Button>
                          </div>
                          <Table
                            size="small"
                            pagination={false}
                            dataSource={activeDays}
                            rowKey="key"
                            columns={[
                              {
                                title: 'Ngày',
                                dataIndex: 'dateFormatted',
                                key: 'dateFormatted',
                                render: (d: string, item: any) => (
                                  <span>
                                    <b>{d}</b>{' '}
                                    <small
                                      style={{
                                        color: item.isSunday ? '#ff4d4f' : item.isSaturday ? '#fa8c16' : '#8c8c8c',
                                      }}
                                    >
                                      ({item.dayOfWeekName})
                                    </small>
                                  </span>
                                ),
                              },
                              {
                                title: 'Giờ vào',
                                dataIndex: 'checkIn',
                                key: 'checkIn',
                                render: (v: any, item: any) => (
                                  <span>
                                    {formatPunchTime(v)}
                                    {item.isLate && (
                                      <Tag color="volcano" style={{ marginLeft: 4, fontSize: 11 }}>
                                        Muộn {item.lateMinutes}p
                                      </Tag>
                                    )}
                                  </span>
                                ),
                              },
                              {
                                title: 'Giờ ra',
                                dataIndex: 'checkOut',
                                key: 'checkOut',
                                render: (v: any, item: any) => (
                                  <span>
                                    {formatPunchTime(v)}
                                    {item.isEarly && (
                                      <Tag color="orange" style={{ marginLeft: 4, fontSize: 11 }}>
                                        Sớm {item.earlyMinutes}p
                                      </Tag>
                                    )}
                                  </span>
                                ),
                              },
                              {
                                title: 'Giờ làm',
                                dataIndex: 'workedHours',
                                key: 'workedHours',
                                render: (h: number) => (h > 0 ? `${h.toFixed(1)}h` : '-'),
                              },
                              {
                                title: 'Công tính',
                                dataIndex: 'workUnits',
                                key: 'workUnits',
                                render: (u: number, item: any) => {
                                  if (item.holiday) return <Tag color="magenta">1.0 (Lễ)</Tag>;
                                  if (u >= 1) return <Tag color="green">{u} công</Tag>;
                                  if (u > 0) return <Tag color="gold">{u} công</Tag>;
                                  return <Tag>0 công</Tag>;
                                },
                              },
                              {
                                title: 'Tăng ca (OT)',
                                dataIndex: 'otHours',
                                key: 'otHours',
                                render: (ot: number) =>
                                  ot > 0 ? (
                                    <Tag color="purple" style={{ fontWeight: 600 }}>
                                      ⚡ {ot} giờ OT
                                    </Tag>
                                  ) : (
                                    '-'
                                  ),
                              },
                              {
                                title: 'Trạng thái',
                                key: 'status',
                                render: (_: any, item: any) => (
                                  <Space size={4} wrap>
                                    {item.holiday && <Tag color="magenta">Nghỉ lễ</Tag>}
                                    {item.isMissingPunch && <Tag color="red">Thiếu quẹt thẻ</Tag>}
                                    {item.isThroughLunch && <Tag color="cyan">Thông trưa</Tag>}
                                    {item.isManualOverridden && (
                                      <Tooltip title={item.overrideReason}>
                                        <Tag color="blue">Điều chỉnh tay</Tag>
                                      </Tooltip>
                                    )}
                                  </Space>
                                ),
                              },
                              ...(isAdminOrHr
                                ? [
                                    {
                                      title: '',
                                      key: 'action',
                                      width: 70,
                                      render: (_: any, item: any) => (
                                        <Button
                                          size="small"
                                          icon={<EditOutlined />}
                                          onClick={() => handleOpenOverrideForDay(record, item)}
                                          title="Sửa công / tăng ca ngày này"
                                        />
                                      ),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </div>
                      );
                    },
                    rowExpandable: () => true,
                  }}
                />
              </div>
            ),
          },
          ...(isAdminOrHr
            ? [
                {
                  key: 'matrix',
                  label: `📊 Chi tiết công & tăng ca cả tháng (${timesheet.length})`,
                  children: (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 12,
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <div>
                          <b style={{ fontSize: 15 }}>
                            Bảng Ma Trận Công & Tăng Ca Từng Ngày - Tháng {dayjs(selectedMonth).format('MM/YYYY')}
                          </b>
                          <div style={{ fontSize: 12, color: '#595959', marginTop: 2 }}>
                            💡 Bấm vào ô ngày công của nhân sự để xem chi tiết hoặc điều chỉnh nhanh công và giờ tăng ca của ngày đó.
                          </div>
                        </div>
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={handleExportMatrixCsv}
                        >
                          Xuất Ma Trận Excel
                        </Button>
                      </div>

                      <Table
                        dataSource={timesheet}
                        columns={matrixColumns}
                        rowKey="id"
                        loading={loading}
                        scroll={{ x: 'max-content' }}
                        size="small"
                        bordered
                      />
                    </div>
                  ),
                },
              ]
            : []),
          {
            key: 'debts',
            label: `⏳ Nợ làm bù (${debts.length})`,
            children: (
              <Table
                dataSource={debts}
                rowKey="id"
                columns={[
                  {
                    title: 'Nhân viên',
                    dataIndex: ['employee', 'fullName'],
                  },
                  {
                    title: 'Ngày phát sinh nợ',
                    dataIndex: 'originalDate',
                    render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
                  },
                  {
                    title: 'Số phút nợ',
                    dataIndex: 'debtMinutes',
                    render: (m: number) => <Tag color="volcano">{m} phút</Tag>,
                  },
                  {
                    title: 'Hạn làm bù (ngày kế tiếp)',
                    dataIndex: 'deadlineDate',
                    render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
                  },
                  {
                    title: 'Đã bù',
                    dataIndex: 'paidMinutes',
                    render: (m: number) => `${m} phút`,
                  },
                  {
                    title: 'Trạng thái',
                    dataIndex: 'isResolved',
                    render: (r: boolean) =>
                      r ? <Tag color="green">Đã bù xong</Tag> : <Tag color="orange">Đang nợ</Tag>,
                  },
                ]}
              />
            ),
          },
          ...(isAdminOrHr
            ? [
                {
                  key: 'violations',
                  label: `⚠️ Cảnh báo vi phạm (${violations.length})`,
                  children: (
                    <div>
                      {violations.length === 0 ? (
                        <Alert
                          message="Không có nhân sự nào vi phạm trong tháng này"
                          type="success"
                          showIcon
                        />
                      ) : (
                        <Table
                          dataSource={violations}
                          rowKey="id"
                          columns={[
                            {
                              title: 'Nhân viên',
                              dataIndex: ['employee', 'fullName'],
                            },
                            {
                              title: 'Loại vi phạm',
                              dataIndex: 'type',
                              render: (t: string) => (
                                <Tag color="red">
                                  {t === 'LATE_3_DAYS'
                                    ? 'Đi muộn 3 ngày liên tiếp'
                                    : 'Về sớm quá 7 lần'}
                                </Tag>
                              ),
                            },
                            {
                              title: 'Chi tiết',
                              dataIndex: 'details',
                            },
                            {
                              title: 'Mức phạt',
                              dataIndex: 'fineAmount',
                              render: (a: number) => `${a.toLocaleString('vi-VN')} VNĐ`,
                            },
                            {
                              title: 'Xác nhận',
                              dataIndex: 'isConfirmed',
                              render: (c: boolean) =>
                                c ? <Tag color="green">Đã chốt phạt</Tag> : <Tag color="orange">Chờ chốt</Tag>,
                            },
                          ]}
                        />
                      )}
                    </div>
                  ),
                },
              ]
            : []),
          {
            key: 'holidays',
            label: `🎉 Quản lý Ngày nghỉ lễ (${holidays.length})`,
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
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0 }}>
                      Danh sách Ngày nghỉ lễ & Tết năm {dayjs(selectedMonth).year()}
                    </h4>
                    <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
                      Máy chấm công không phân biệt ngày lễ. Các ngày nghỉ lễ được khai báo tại đây sẽ được hệ thống tự động cộng công hưởng nguyên lương cho nhân sự.
                    </div>
                  </div>
                  {isAdminOrHr && (
                    <Space wrap>
                      <Button
                        icon={<ThunderboltOutlined />}
                        loading={seedingHolidays}
                        onClick={handleSeedHolidays}
                      >
                        Khởi tạo ngày lễ chuẩn năm {dayjs(selectedMonth).year()}
                      </Button>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          holidayForm.resetFields();
                          holidayForm.setFieldsValue({
                            isPaid: true,
                            date: dayjs(),
                          });
                          setHolidayModalOpen(true);
                        }}
                      >
                        Thêm ngày nghỉ lễ mới
                      </Button>
                    </Space>
                  )}
                </div>

                <Table
                  dataSource={holidays}
                  rowKey="id"
                  columns={[
                    {
                      title: 'Tên ngày nghỉ lễ',
                      dataIndex: 'name',
                      key: 'name',
                      render: (name: string) => <b>{name}</b>,
                    },
                    {
                      title: 'Ngày diễn ra',
                      dataIndex: 'date',
                      key: 'date',
                      render: (d: string) => (
                        <span style={{ fontWeight: 500 }}>
                          {dayjs(d).format('DD/MM/YYYY')}
                        </span>
                      ),
                    },
                    {
                      title: 'Chế độ lương',
                      dataIndex: 'isPaid',
                      key: 'isPaid',
                      render: (paid: boolean) =>
                        paid ? (
                          <Tag color="green">Hưởng nguyên lương (1.0 công)</Tag>
                        ) : (
                          <Tag>Nghỉ không lương</Tag>
                        ),
                    },
                    ...(isAdminOrHr
                      ? [
                          {
                            title: 'Thao tác',
                            key: 'action',
                            render: (_: any, r: any) => (
                              <Popconfirm
                                title="Xác nhận xóa ngày lễ này?"
                                onConfirm={() => handleDeleteHoliday(r.id)}
                                okText="Xóa"
                                cancelText="Hủy"
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Modal Import chấm công */}
      <Modal
        title="📥 Import Dữ Liệu Máy Chấm Công Ronald Jack"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
        width={720}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Khuyến nghị khi tính lại công:"
          description="Hệ thống sẽ giữ nguyên 100% tất cả các phiếu xin phép (phép năm, đi muộn, về sớm, làm bù, giải trình quên thẻ). Sau khi nạp file máy chấm công, hệ thống sẽ tự động bù trừ giờ và tính đúng công theo các đơn đã được duyệt."
        />

        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
          <Checkbox
            checked={clearBeforeImport}
            onChange={(e) => setClearBeforeImport(e.target.checked)}
            style={{ fontWeight: 600, color: '#389e0d' }}
          >
            🧹 Tự động làm sạch dữ liệu chấm công máy cũ của tháng trước khi import lại (Giữ nguyên các đơn xin phép)
          </Checkbox>
        </div>

        <Tabs
          defaultActiveKey="paste"
          items={[
            {
              key: 'paste',
              label: '📋 Dán nội dung trực tiếp (Nhanh nhất)',
              children: (
                <div>
                  <div style={{ marginBottom: 12, color: '#8c8c8c' }}>
                    Mở file xuất từ máy Ronald Jack, copy toàn bộ nội dung và dán vào ô bên dưới:
                  </div>
                  <Input.TextArea
                    rows={10}
                    placeholder="Dán nội dung bảng chi tiết chấm công vào đây..."
                    value={importContent}
                    onChange={(e) => setImportContent(e.target.value)}
                  />
                  <div style={{ textAlign: 'right', marginTop: 16 }}>
                    <Button onClick={() => setImportModalOpen(false)} style={{ marginRight: 8 }}>
                      Hủy
                    </Button>
                    <Button
                      type="primary"
                      loading={importLoading}
                      onClick={handleImportRaw}
                    >
                      Bắt đầu Xử lý & Tính công
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              key: 'file',
              label: '📁 Tải lên file (.csv / .txt / .xlsx)',
              children: (
                <div style={{ padding: '16px 0' }}>
                  <input
                    type="file"
                    accept=".csv,.txt,.xlsx"
                    onChange={(e) => setSelectedUploadFile(e.target.files?.[0])}
                  />
                  <div style={{ textAlign: 'right', marginTop: 24 }}>
                    <Button onClick={() => setImportModalOpen(false)} style={{ marginRight: 8 }}>
                      Hủy
                    </Button>
                    <Button
                      type="primary"
                      loading={importLoading}
                      onClick={handleImportFile}
                    >
                      Tải lên & Tính công
                    </Button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Modal>

      {/* Modal Điều chỉnh công / Quên thẻ / Bổ sung Tăng ca */}
      <Modal
        title={
          <div>
            <b>Điều chỉnh Ngày công & Tăng ca (OT)</b>
            {overrideTargetEmp && (
              <div style={{ fontSize: 13, color: '#1677ff', fontWeight: 500, marginTop: 2 }}>
                👤 {overrideTargetEmp.fullName} ({overrideTargetEmp.employeeCode})
                {overrideTargetEmp.department?.name && ` - ${overrideTargetEmp.department.name}`}
              </div>
            )}
          </div>
        }
        open={overrideModalOpen}
        onCancel={() => setOverrideModalOpen(false)}
        footer={null}
        width={560}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Hệ thống tự động đồng bộ phiếu & công"
          description="Khi điều chỉnh công (ví dụ quên thẻ chấm công, bổ sung tăng ca OT), hệ thống sẽ tự động tính công và tạo phiếu giải trình quên quẹt thẻ / đăng ký OT đã duyệt tương ứng để đảm bảo tính lương và lưu vết minh bạch."
        />
        <Form form={overrideForm} layout="vertical" onFinish={handleOverride}>
          <Form.Item
            name="workDate"
            label="Ngày điều chỉnh"
            rules={[{ required: true, message: 'Vui lòng chọn ngày điều chỉnh' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="workUnits"
                label="Công thực tế (CC)"
                rules={[{ required: true, message: 'Chọn số công thực tế' }]}
                extra="Đi làm thực tế / Quên thẻ"
              >
                <Select
                  options={[
                    { label: 'Đủ 1 công thực tế (1.0)', value: 1.0 },
                    { label: '3/4 công (0.75)', value: 0.75 },
                    { label: '1/2 công thực tế (0.50)', value: 0.5 },
                    { label: '1/4 công (0.25)', value: 0.25 },
                    { label: '0 công (Nghỉ / Vắng)', value: 0 },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="leaveUnits"
                label="Công nghỉ phép năm"
                extra="Nghỉ phép hưởng lương"
              >
                <Select
                  options={[
                    { label: '0 công phép', value: 0 },
                    { label: 'Nửa ngày phép (0.5)', value: 0.5 },
                    { label: 'Cả ngày phép (1.0)', value: 1.0 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="otHours"
                label="Số giờ tăng ca (OT)"
                extra="Tính lương làm thêm giờ"
              >
                <InputNumber
                  min={0}
                  max={24}
                  step={0.5}
                  style={{ width: '100%' }}
                  placeholder="VD: 2.0 (giờ)"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="checkIn" label="Giờ vào (Check-in)">
                <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Chọn giờ vào" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="checkOut" label="Giờ ra (Check-out)">
                <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Chọn giờ ra" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="overrideReason"
            label="Lý do điều chỉnh (Bắt buộc)"
            rules={[{ required: true, message: 'Vui lòng nhập lý do điều chỉnh' }]}
          >
            <Input.TextArea rows={3} placeholder="VD: Quên quẹt thẻ, bổ sung tăng ca 2 tiếng có duyệt đơn..." />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setOverrideModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={overrideLoading}>
              Xác nhận ghi nhận
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Chi tiết ngày công & tăng ca của từng nhân sự */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              📅 Chi tiết Ngày công & Tăng ca (OT): {selectedDetailEmp?.fullName} ({selectedDetailEmp?.employeeCode})
            </span>
            <Tag color="blue" style={{ fontSize: 13 }}>
              Tháng {dayjs(selectedMonth).format('MM/YYYY')}
            </Tag>
            {selectedDetailEmp?.department?.name && (
              <Tag color="cyan">{selectedDetailEmp.department.name}</Tag>
            )}
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={1000}
      >
        {selectedDetailEmp && (() => {
          const dailyList = getEmployeeDailyList(selectedDetailEmp);
          const isStore = Boolean(selectedDetailEmp.isStoreSales || selectedDetailEmp.department?.isStoreSales);
          const actualUnits = (selectedDetailEmp.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.workUnits || 0), 0);
          const leaveUnits = (selectedDetailEmp.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.leaveUnits || 0), 0);
          const hUnits = isStore ? 0 : holidaysInMonth.length;
          const totalUnits = Number((actualUnits + leaveUnits + hUnits).toFixed(2));
          const totalOt = (selectedDetailEmp.attendanceDays || []).reduce((sum: number, d: any) => sum + (d.otHours || 0), 0);
          const totalWorkedHours = (selectedDetailEmp.attendanceDays || []).reduce(
            (sum: number, d: any) => sum + (d.workedHours || d.workUnits * 8),
            0,
          );
          const lateCount = dailyList.filter((d) => d.isLate).length;
          const earlyCount = dailyList.filter((d) => d.isEarly).length;
          const missingCount = dailyList.filter((d) => d.isMissingPunch).length;
          const otDaysCount = dailyList.filter((d) => d.otHours > 0).length;
          const workedDaysCount = dailyList.filter((d) => d.workUnits > 0).length;
          const leaveDaysCount = dailyList.filter((d) => d.leaveUnits > 0).length;
          const issueDaysCount = dailyList.filter((d) => d.isLate || d.isEarly || d.isMissingPunch).length;

          const filteredList = dailyList.filter((d) => {
            if (detailFilter === 'WORKED') return d.workUnits > 0 || d.hasRecord;
            if (detailFilter === 'OT') return d.otHours > 0;
            if (detailFilter === 'ISSUES') return d.isLate || d.isEarly || d.isMissingPunch;
            return true;
          });

          return (
            <div>
              {/* Thẻ tóm tắt số liệu */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={4}>
                  <Card size="small" style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}>
                    <div style={{ fontSize: 12, color: '#1d39c4' }}>Công thực tế (CC)</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1d39c4' }}>
                      {actualUnits} <span style={{ fontSize: 13, fontWeight: 400 }}>công</span>
                    </div>
                    <small style={{ color: '#595959' }}>{totalWorkedHours.toFixed(1)} giờ làm</small>
                  </Card>
                </Col>
                <Col xs={12} sm={4}>
                  <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                    <div style={{ fontSize: 12, color: '#389e0d' }}>Công nghỉ phép</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#389e0d' }}>
                      {leaveUnits} <span style={{ fontSize: 13, fontWeight: 400 }}>ngày</span>
                    </div>
                    <small style={{ color: '#52c41a' }}>Hưởng lương cơ bản</small>
                  </Card>
                </Col>
                <Col xs={12} sm={4}>
                  <Card size="small" style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
                    <div style={{ fontSize: 12, color: '#722ed1' }}>Nghỉ lễ</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#722ed1' }}>
                      {hUnits} <span style={{ fontSize: 13, fontWeight: 400 }}>ngày</span>
                    </div>
                    <small style={{ color: '#9254de' }}>Hưởng nguyên lương</small>
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ background: '#e6f4ff', borderColor: '#91caff' }}>
                    <div style={{ fontSize: 12, color: '#0958d9' }}>Tổng công tính lương</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#0958d9' }}>
                      {totalUnits} <span style={{ fontSize: 13, fontWeight: 400 }}>công</span>
                    </div>
                    <small style={{ color: '#0958d9' }}>Thực tế: {actualUnits} + Phép: {leaveUnits} {hUnits > 0 ? `+ Lễ: ${hUnits}` : ''}</small>
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ background: '#fff2e8', borderColor: '#ffbb96' }}>
                    <div style={{ fontSize: 12, color: '#d4380d', fontWeight: 600 }}>Tăng ca & Vi phạm</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#d4380d' }}>
                      OT: {totalOt}h | Lỗi: {lateCount + earlyCount + missingCount}
                    </div>
                    <small style={{ color: '#8c8c8c' }}>Muộn: {lateCount} | Sớm: {earlyCount} | Quên: {missingCount}</small>
                  </Card>
                </Col>
              </Row>

              {/* Bộ lọc & Export */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <Radio.Group
                  value={detailFilter}
                  onChange={(e) => setDetailFilter(e.target.value)}
                  buttonStyle="solid"
                  size="small"
                >
                  <Radio.Button value="ALL">Tất cả ({dailyList.length} ngày)</Radio.Button>
                  <Radio.Button value="WORKED">Có đi làm ({workedDaysCount} ngày)</Radio.Button>
                  <Radio.Button value="OT">⚡ Có tăng ca ({otDaysCount} ngày)</Radio.Button>
                  <Radio.Button value="ISSUES">⚠️ Bất thường ({issueDaysCount} ngày)</Radio.Button>
                </Radio.Group>

                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleExportEmployeeDaily(selectedDetailEmp)}
                >
                  Xuất Excel chi tiết nhân viên
                </Button>
              </div>

              {/* Bảng chi tiết từng ngày */}
              <Table
                dataSource={filteredList}
                rowKey="key"
                pagination={false}
                scroll={{ y: 440 }}
                size="small"
                columns={[
                  {
                    title: 'Ngày',
                    dataIndex: 'dateFormatted',
                    key: 'dateFormatted',
                    width: 140,
                    render: (d: string, item: any) => (
                      <div>
                        <b>{d}</b>{' '}
                        <span style={{ fontSize: 12, color: item.isSunday ? '#ff4d4f' : item.isSaturday ? '#fa8c16' : '#595959' }}>
                          ({item.dayOfWeekName})
                        </span>
                      </div>
                    ),
                  },
                  {
                    title: 'Giờ vào',
                    dataIndex: 'checkIn',
                    key: 'checkIn',
                    width: 110,
                    render: (v: any, item: any) => (
                      <div>
                        <span>{formatPunchTime(v)}</span>
                        {item.isLate && (
                          <div>
                            <Tag color="volcano" style={{ fontSize: 11, padding: '0 4px', margin: 0 }}>
                              Muộn {item.lateMinutes}p
                            </Tag>
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: 'Giờ ra',
                    dataIndex: 'checkOut',
                    key: 'checkOut',
                    width: 110,
                    render: (v: any, item: any) => (
                      <div>
                        <span>{formatPunchTime(v)}</span>
                        {item.isEarly && (
                          <div>
                            <Tag color="orange" style={{ fontSize: 11, padding: '0 4px', margin: 0 }}>
                              Sớm {item.earlyMinutes}p
                            </Tag>
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: 'Giờ làm',
                    dataIndex: 'workedHours',
                    key: 'workedHours',
                    width: 90,
                    render: (h: number) => (h > 0 ? `${h.toFixed(1)}h` : '-'),
                  },
                  {
                    title: 'Công thực tế',
                    dataIndex: 'workUnits',
                    key: 'workUnits',
                    width: 105,
                    render: (u: number, item: any) => {
                      if (item.holiday) return <Tag color="magenta">Lễ</Tag>;
                      if (u >= 1) return <Tag color="blue">{u} công</Tag>;
                      if (u > 0) return <Tag color="cyan">{u} công</Tag>;
                      return <span style={{ color: '#bfbfbf' }}>-</span>;
                    },
                  },
                  {
                    title: 'Công phép',
                    dataIndex: 'leaveUnits',
                    key: 'leaveUnits',
                    width: 100,
                    render: (lu: number) =>
                      lu > 0 ? (
                        <Tag color="green" style={{ fontWeight: 600 }}>
                          +{lu} phép
                        </Tag>
                      ) : (
                        <span style={{ color: '#bfbfbf' }}>-</span>
                      ),
                  },
                  {
                    title: 'Tăng ca (OT)',
                    dataIndex: 'otHours',
                    key: 'otHours',
                    width: 120,
                    render: (ot: number) =>
                      ot > 0 ? (
                        <Tag color="purple" style={{ fontWeight: 600, fontSize: 12 }}>
                          ⚡ {ot} giờ OT
                        </Tag>
                      ) : (
                        <span style={{ color: '#bfbfbf' }}>-</span>
                      ),
                  },
                  {
                    title: 'Trạng thái / Ghi chú',
                    key: 'status',
                    render: (_: any, item: any) => (
                      <Space size={4} wrap>
                        {item.holiday && <Tag color="magenta">Nghỉ lễ: {item.holiday}</Tag>}
                        {item.leaveUnits > 0 && <Tag color="green">Phép năm: {item.leaveUnits} ngày</Tag>}
                        {item.isMissingPunch && <Tag color="red">Thiếu quẹt thẻ</Tag>}
                        {item.isThroughLunch && <Tag color="cyan">Thông trưa</Tag>}
                        {item.isManualOverridden && (
                          <Tooltip title={item.overrideReason || 'Admin điều chỉnh'}>
                            <Tag color="geekblue">Đã sửa ({item.overrideReason})</Tag>
                          </Tooltip>
                        )}
                      </Space>
                    ),
                  },
                  ...(isAdminOrHr
                    ? [
                        {
                          title: '',
                          key: 'action',
                          width: 80,
                          render: (_: any, item: any) => (
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleOpenOverrideForDay(selectedDetailEmp, item)}
                              title="Sửa công / tăng ca ngày này"
                            >
                              Sửa
                            </Button>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          );
        })()}
      </Modal>

      {/* Modal Thêm ngày nghỉ lễ */}
      <Modal
        title="Thêm Ngày Nghỉ Lễ Hưởng Lương"
        open={holidayModalOpen}
        onCancel={() => setHolidayModalOpen(false)}
        footer={null}
      >
        <Form form={holidayForm} layout="vertical" onFinish={handleCreateHoliday}>
          <Form.Item
            name="name"
            label="Tên ngày nghỉ lễ"
            rules={[{ required: true, message: 'Vui lòng nhập tên ngày lễ' }]}
          >
            <Input placeholder="VD: Nghỉ Lễ Quốc Khánh 2/9, Nghỉ Giải phóng 30/4..." />
          </Form.Item>

          <Form.Item
            name="date"
            label="Ngày diễn ra"
            rules={[{ required: true, message: 'Vui lòng chọn ngày nghỉ lễ' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="isPaid"
            label="Chế độ hưởng lương"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: 'Hưởng nguyên lương (tính là ngày công hưởng lương)', value: true },
                { label: 'Nghỉ không hưởng lương', value: false },
              ]}
            />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setHolidayModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu ngày nghỉ lễ
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Chốt công Nhóm Bán hàng tại cửa hàng */}
      <Modal
        title={
          <Space>
            <ShopOutlined style={{ color: '#389e0d', fontSize: 20 }} />
            <span>Chốt công tháng {selectedMonth} - Nhóm Bán Hàng Tại Cửa Hàng</span>
          </Space>
        }
        open={storeSalesModalOpen}
        onCancel={() => setStoreSalesModalOpen(false)}
        width={980}
        footer={[
          <Button key="cancel" onClick={() => setStoreSalesModalOpen(false)}>
            Hủy
          </Button>,
          <Button
            key="save"
            type="primary"
            style={{ background: '#389e0d', borderColor: '#389e0d' }}
            loading={savingStoreSales}
            onClick={handleSaveStoreSalesBatch}
          >
            Lưu toàn bộ chốt công
          </Button>,
        ]}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Quy định chấm công nhóm Bán hàng tại cửa hàng:"
          description="Nhóm nhân viên bán hàng tại cửa hàng không chấm công qua máy quẹt thẻ. Cuối tháng trưởng bộ phận chốt số ngày công thực tế và báo cáo lên. Các ngày nghỉ lễ nhóm này vẫn có thể làm việc và được tính công như bình thường (không được coi là nghỉ hưởng lương cơ bản)."
        />

        <Table
          dataSource={storeSalesList}
          rowKey="id"
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'Mã NV',
              dataIndex: 'employeeCode',
              width: 90,
            },
            {
              title: 'Nhân viên',
              key: 'emp',
              render: (_: any, r: any) => (
                <div>
                  <b>{r.fullName}</b>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>{r.departmentName}</div>
                </div>
              ),
            },
            {
              title: 'Nhóm bán hàng?',
              key: 'isStore',
              width: 140,
              render: (_: any, r: any) => (
                <Tag color={r.isStoreSales ? 'cyan' : 'default'}>
                  {r.isStoreSales ? 'Bán hàng (Báo công)' : 'Văn phòng / Xưởng'}
                </Tag>
              ),
            },
            {
              title: 'Số công thực tế',
              key: 'units',
              width: 140,
              render: (_: any, r: any) => (
                <InputNumber
                  min={0}
                  max={31}
                  step={0.5}
                  value={r.workUnits}
                  disabled={!r.isStoreSales}
                  onChange={(val) => handleUpdateStoreSalesRow(r.id, 'workUnits', val)}
                  style={{ width: '100%' }}
                  addonAfter="công"
                />
              ),
            },
            {
              title: 'Giờ OT',
              key: 'ot',
              width: 120,
              render: (_: any, r: any) => (
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  value={r.otHours}
                  disabled={!r.isStoreSales}
                  onChange={(val) => handleUpdateStoreSalesRow(r.id, 'otHours', val)}
                  style={{ width: '100%' }}
                  addonAfter="h"
                />
              ),
            },
            {
              title: 'Ghi chú chốt công',
              key: 'note',
              render: (_: any, r: any) => (
                <Input
                  value={r.note}
                  disabled={!r.isStoreSales}
                  placeholder="Ghi chú / TP xác nhận..."
                  onChange={(e) => handleUpdateStoreSalesRow(r.id, 'note', e.target.value)}
                />
              ),
            },
          ]}
        />
      </Modal>

      {/* Modal Báo công lẻ cho 1 nhân viên bán hàng */}
      <Modal
        title={`Chốt công tháng ${selectedMonth}: ${singleStoreEmp?.fullName || ''} (${singleStoreEmp?.employeeCode || ''})`}
        open={singleStoreModalOpen}
        onCancel={() => setSingleStoreModalOpen(false)}
        footer={null}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Nhân viên nhóm bán hàng tại cửa hàng: Ngày lễ vẫn làm việc tính công bình thường, không tự động cộng ngày nghỉ lễ hưởng lương cơ bản."
        />
        <Form form={singleStoreForm} layout="vertical" onFinish={handleSaveSingleStoreSales}>
          <Form.Item
            name="workUnits"
            label="Số ngày công thực tế trong tháng"
            rules={[{ required: true, message: 'Vui lòng nhập số ngày công' }]}
          >
            <InputNumber min={0} max={31} step={0.5} style={{ width: '100%' }} addonAfter="công" />
          </Form.Item>

          <Form.Item name="otHours" label="Số giờ làm thêm (OT)">
            <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} addonAfter="giờ" />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú xác nhận của Trưởng bộ phận">
            <Input.TextArea rows={2} placeholder="VD: Trưởng cửa hàng chốt công thực tế tháng 9..." />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setSingleStoreModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={savingStoreSales}>
              Lưu chốt công
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Đánh giá KPI tháng */}
      <Modal
        title={
          <Space>
            <TrophyOutlined style={{ color: '#722ed1', fontSize: 20 }} />
            <span>Đánh giá hiệu quả công việc & KPI tháng {selectedMonth}</span>
          </Space>
        }
        open={kpiModalOpen}
        onCancel={() => setKpiModalOpen(false)}
        width={980}
        footer={[
          <Button key="cancel" onClick={() => setKpiModalOpen(false)}>
            Hủy
          </Button>,
          <Button
            key="save"
            type="primary"
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
            loading={savingKpi}
            onClick={handleSaveKpiBatch}
          >
            Lưu toàn bộ đánh giá KPI
          </Button>,
        ]}
      >
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message="Đánh giá KPI hàng tháng của nhân sự:"
          description="Mặc định mức hoàn thành KPI luôn là 100% nếu không có đánh giá gì. Lương KPI thực nhận trong bảng lương sẽ được nhân theo tỷ lệ % này."
        />

        <Table
          dataSource={kpiList}
          rowKey="employeeId"
          loading={loadingKpi}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'Mã NV',
              dataIndex: 'employeeCode',
              width: 85,
            },
            {
              title: 'Nhân viên',
              key: 'emp',
              render: (_: any, r: any) => (
                <div>
                  <b>{r.fullName}</b>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                    {r.department?.name || 'Chưa phân phòng'}
                    {r.isStoreSales && (
                      <Tag color="cyan" style={{ marginLeft: 6 }}>
                        Bán hàng
                      </Tag>
                    )}
                  </div>
                </div>
              ),
            },
            {
              title: 'Định mức KPI',
              dataIndex: 'kpiSalary',
              width: 130,
              render: (v: number) =>
                v > 0 ? (
                  <b style={{ color: '#722ed1' }}>{v.toLocaleString('vi-VN')} đ</b>
                ) : (
                  <span style={{ color: '#8c8c8c' }}>Chưa cấu hình</span>
                ),
            },
            {
              title: '% Đạt KPI (Mặc định 100%)',
              key: 'percent',
              width: 230,
              render: (_: any, r: any) => (
                <div>
                  <Space style={{ marginBottom: 4 }}>
                    <InputNumber
                      min={0}
                      max={300}
                      step={5}
                      value={r.kpiPercent !== undefined ? r.kpiPercent : 100}
                      onChange={(val) => handleUpdateKpiRow(r.employeeId, 'kpiPercent', val)}
                      style={{ width: 100 }}
                      addonAfter="%"
                    />
                    <Tag
                      color={
                        (r.kpiPercent ?? 100) >= 100
                          ? 'green'
                          : (r.kpiPercent ?? 100) >= 80
                          ? 'blue'
                          : 'volcano'
                      }
                    >
                      {r.isEvaluated ? 'Đã đánh giá' : 'Mặc định'}
                    </Tag>
                  </Space>
                  <div>
                    <Space size={4}>
                      {[80, 90, 100, 110].map((quick) => (
                        <Button
                          key={quick}
                          size="small"
                          type={r.kpiPercent === quick ? 'primary' : 'default'}
                          onClick={() => handleUpdateKpiRow(r.employeeId, 'kpiPercent', quick)}
                          style={{ fontSize: 11, padding: '0 4px', height: 20 }}
                        >
                          {quick}%
                        </Button>
                      ))}
                    </Space>
                  </div>
                </div>
              ),
            },
            {
              title: 'Nhận xét / Đánh giá',
              key: 'notes',
              render: (_: any, r: any) => (
                <Input
                  value={r.notes}
                  placeholder="Nhận xét kết quả công việc tháng..."
                  onChange={(e) => handleUpdateKpiRow(r.employeeId, 'notes', e.target.value)}
                />
              ),
            },
          ]}
        />
      </Modal>

      {/* Modal Đánh giá KPI riêng cho 1 nhân sự */}
      <Modal
        title={
          <Space>
            <TrophyOutlined style={{ color: '#722ed1', fontSize: 20 }} />
            <span>
              Đánh giá KPI tháng {selectedMonth}: {singleKpiEmp?.fullName} ({singleKpiEmp?.employeeCode})
            </span>
          </Space>
        }
        open={singleKpiModalOpen}
        onCancel={() => setSingleKpiModalOpen(false)}
        footer={null}
        width={540}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            type="info"
            showIcon
            message="Đánh giá hiệu quả công việc & % hoàn thành KPI để tính lương"
            description="Mức 100% là hoàn thành định mức KPI. Tỷ lệ % này sẽ tự động cập nhật vào bảng tính lương của nhân sự trong tháng."
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Tỷ lệ hoàn thành KPI (%):
          </label>
          <Row gutter={12} align="middle">
            <Col span={10}>
              <InputNumber
                min={0}
                max={200}
                step={5}
                style={{ width: '100%', fontSize: 16, fontWeight: 700 }}
                value={singleKpiPercent}
                onChange={(val) => setSingleKpiPercent(Number(val) || 0)}
                addonAfter="%"
              />
            </Col>
            <Col span={14}>
              <Space wrap size={[4, 4]}>
                {[50, 70, 80, 90, 100, 110, 120].map((quick) => (
                  <Button
                    key={quick}
                    size="small"
                    type={singleKpiPercent === quick ? 'primary' : 'default'}
                    onClick={() => setSingleKpiPercent(quick)}
                    style={{ fontSize: 11 }}
                  >
                    {quick}%
                  </Button>
                ))}
              </Space>
            </Col>
          </Row>
        </div>

        {/* Realtime KPI Calculation Preview */}
        {(() => {
          const kpiSal = Number(singleKpiEmp?.kpiSalary || 0);
          const estPay = Math.round((kpiSal * (Number(singleKpiPercent) || 0)) / 100);
          return (
            <div
              style={{
                background: '#f9f0ff',
                border: '1px solid #d3adf7',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Định mức Lương KPI:</span>
                <b>{kpiSal.toLocaleString('vi-VN')} đ</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Tỷ lệ hoàn thành:</span>
                <b style={{ color: singleKpiPercent >= 100 ? '#52c41a' : '#fa8c16' }}>
                  {singleKpiPercent}%
                </b>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px dashed #d3adf7',
                  paddingTop: 6,
                }}
              >
                <span>Lương KPI dự kiến nhận vào lương:</span>
                <b style={{ color: '#722ed1', fontSize: 15 }}>{estPay.toLocaleString('vi-VN')} đ</b>
              </div>
            </div>
          );
        })()}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Ghi chú / Nhận xét đánh giá:
          </label>
          <Input.TextArea
            rows={3}
            placeholder="Nhận xét kết quả công việc tháng, lý do thưởng/phạt KPI..."
            value={singleKpiNote}
            onChange={(e) => setSingleKpiNote(e.target.value)}
          />
        </div>

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Button onClick={() => setSingleKpiModalOpen(false)} style={{ marginRight: 8 }}>
            Hủy
          </Button>
          <Button
            type="primary"
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
            loading={savingSingleKpi}
            onClick={handleSaveSingleKpi}
          >
            Lưu đánh giá KPI
          </Button>
        </div>
      </Modal>
    </div>
  );
};
