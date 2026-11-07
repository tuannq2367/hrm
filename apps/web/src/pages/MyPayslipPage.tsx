import React, { useEffect, useState } from 'react';
import { Card, DatePicker, Descriptions, Tag, Alert, Button, Divider, Table } from 'antd';
import { PrinterOutlined, BankOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const MyPayslipPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [payslip, setPayslip] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMyPayslip();
  }, [selectedMonth]);

  const loadMyPayslip = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/payroll/my-payslip?month=${selectedMonth}`);
      setPayslip(res.data);
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const otTotal = (payslip?.otPay || 0) + (payslip?.otBonus || 0);
  const totalFines = (payslip?.lateFine || 0) + (payslip?.otherFine || 0);

  // Phân tích snapshotData nếu có
  let snapshot: any = {};
  try {
    if (payslip?.snapshotData) {
      snapshot = JSON.parse(payslip.snapshotData);
    }
  } catch (e) {
    // ignore
  }

  const salaryItems = payslip
    ? [
        {
          key: '1',
          category: '1. Lương cơ bản (LCB)',
          amount: payslip.baseSalary,
          type: 'income',
          note: `Mức LCB: ${(snapshot.lcb || snapshot.customBaseSalary || 5681700).toLocaleString('vi-VN')} đ (tính hưởng ${payslip.actualWorkUnits} công TT${payslip.holidayUnits > 0 ? ` + ${payslip.holidayUnits} công nghỉ lễ` : ''} / ${snapshot.stdDays || 26} công chuẩn)`,
        },
        {
          key: '2',
          category: '2. Phụ cấp (10%)',
          amount: payslip.allowance,
          type: 'income',
          note: `Phụ cấp ăn trưa, đi lại, liên lạc (${payslip.actualWorkUnits} / ${snapshot.stdDays || 26} công chuẩn)`,
        },
        {
          key: '3',
          category: '3. Lương chuyên môn (ngày công)',
          amount: payslip.skillSalary,
          type: 'income',
          note: `Lương chuyên môn tính theo công thực tế (${payslip.actualWorkUnits} / ${snapshot.stdDays || 26} công chuẩn)`,
        },
        ...(payslip.kpiSalary > 0
          ? [
              {
                key: '3a',
                category: '3a. Lương KPI (Hiệu quả CV)',
                amount: payslip.kpiPay,
                type: 'income',
                note: `Định mức ${(payslip.kpiSalary || 0).toLocaleString('vi-VN')} đ × ${payslip.kpiPercent || 100}% hoàn thành KPI`,
              },
            ]
          : []),
        ...(payslip.managementSalary > 0
          ? [
              {
                key: '3b',
                category: 'Phụ cấp vị trí quản lý',
                amount: payslip.managementSalary,
                type: 'income',
                note: 'Cố định theo tháng',
              },
            ]
          : []),
        {
          key: '4',
          category: '4. Tăng ca (Làm thêm giờ)',
          amount: otTotal,
          type: 'income',
          note: payslip.otHours > 0 ? `${payslip.otHours} giờ OT (${(snapshot.otRate || 50000).toLocaleString('vi-VN')} đ/h + thưởng bậc)` : '0 giờ',
        },
        {
          key: '5',
          category: '5. Các khoản thưởng',
          amount: payslip.directorBonus,
          type: 'income',
          note:
            snapshot.holidayCashBonus > 0
              ? `Bao gồm thưởng lễ ${snapshot.holidayCashBonus.toLocaleString('vi-VN')} đ nhận tiền mặt`
              : 'Thưởng hiệu quả / thưởng ban giám đốc',
        },
        {
          key: '6',
          category: '6. Bảo hiểm (BHXH, BHYT, BHTN)',
          amount: -payslip.insuranceDeduction,
          type: 'deduction',
          note:
            payslip.insuranceDeduction > 0
              ? `Trích 10.5% × Mức đóng BHXH ${(snapshot.insuranceBase || snapshot.insuranceSalary || snapshot.lcb || 0).toLocaleString('vi-VN')} đ`
              : 'Không tham gia đóng BH',
        },
        {
          key: '6b',
          category: '6b. Kinh phí Công đoàn',
          amount: -payslip.unionFee,
          type: 'deduction',
          note:
            payslip.unionFee > 0
              ? `Đoàn phí công đoàn ${(payslip.unionFee || 50000).toLocaleString('vi-VN')} đ/tháng (áp dụng nhân viên chính thức)`
              : 'Không trừ đoàn phí (thử việc hoặc thuộc nhóm được miễn trích công đoàn)',
        },
        {
          key: '6c',
          category: '6c. Thuế thu nhập cá nhân (TNCN)',
          amount: -payslip.personalIncomeTax,
          type: 'deduction',
          note:
            payslip.personalIncomeTax > 0
              ? `Giảm trừ bản thân: ${(snapshot.taxPersonalDeduction || 15500000).toLocaleString('vi-VN')} đ, Người phụ thuộc: ${(((payslip as any).employee?.dependentsCount || snapshot.dependentsCount || 0) * (snapshot.taxDependentDeduction || 6200000)).toLocaleString('vi-VN')} đ`
              : `Thu nhập chưa đến mức nộp thuế (Giảm trừ bản thân: ${(snapshot.taxPersonalDeduction || 15500000).toLocaleString('vi-VN')} đ, Người phụ thuộc: ${(snapshot.taxDependentDeduction || 6200000).toLocaleString('vi-VN')} đ/người)`,
        },
        {
          key: '7',
          category: '7. Các khoản phạt - giảm trừ',
          amount: -totalFines,
          type: 'deduction',
          note:
            payslip.lateFine > 0
              ? `Phạt đi muộn: ${payslip.lateFine.toLocaleString('vi-VN')} đ`
              : totalFines > 0
              ? 'Giảm trừ vi phạm khác'
              : 'Không có vi phạm',
        },
        {
          key: '8',
          category: '8. Các khoản đã tạm ứng',
          amount: -payslip.advancePayment,
          type: 'deduction',
          note:
            snapshot.holidayCashBonus > 0
              ? `Bao gồm tiền thưởng lễ (20/10, 8/3...) ${snapshot.holidayCashBonus.toLocaleString('vi-VN')} đ đã nhận tiền mặt`
              : 'Tạm ứng đã nhận trong tháng',
        },
      ]
    : [];

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
        <h3 style={{ margin: 0 }}>Phiếu Lương Cá Nhân</h3>
        <DatePicker
          picker="month"
          value={dayjs(selectedMonth, 'YYYY-MM')}
          onChange={(d) => d && setSelectedMonth(d.format('YYYY-MM'))}
          format="MM/YYYY"
        />
      </div>

      {!payslip ? (
        <Alert
          message={`Chưa có dữ liệu bảng lương tháng ${selectedMonth}`}
          description="Bảng lương tháng này có thể chưa được tính hoặc đang trong quá trình chốt công."
          type="info"
          showIcon
        />
      ) : (
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>
                Phiếu Lương Tháng {selectedMonth} - {user?.employee?.fullName}
              </span>
              <Tag color="blue">{user?.employee?.employeeCode}</Tag>
            </div>
          }
          extra={
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              In phiếu lương
            </Button>
          }
          loading={loading}
        >
          <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="middle" style={{ marginBottom: 20 }}>
            <Descriptions.Item label="Họ và tên">
              <b>{user?.employee?.fullName}</b>
            </Descriptions.Item>
            <Descriptions.Item label="Mức lương thỏa thuận">
              <span style={{ color: '#3f8600', fontWeight: 600 }}>
                {payslip.agreedSalary.toLocaleString('vi-VN')} VNĐ
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Công làm việc thực tế">
              <Tag color="blue" style={{ fontSize: 14 }}>
                {payslip.actualWorkUnits} công
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Tài khoản nhận lương (Ngân hàng)" span={3}>
              <span style={{ color: '#1677ff', fontWeight: 500 }}>
                <BankOutlined style={{ marginRight: 6 }} />
                Chi trả chuyển khoản qua tài khoản ngân hàng của nhân viên
              </span>
            </Descriptions.Item>
          </Descriptions>

          <h4 style={{ marginBottom: 12 }}>Bảng Thống Kê Chi Tiết Các Khoản Lương & Thu Nhập</h4>

          <Table
            dataSource={salaryItems}
            pagination={false}
            columns={[
              {
                title: 'Khoản mục thu nhập & Khấu trừ',
                dataIndex: 'category',
                key: 'cat',
                render: (cat: string, r: any) => <b>{cat}</b>,
              },
              {
                title: 'Số tiền (VNĐ)',
                dataIndex: 'amount',
                key: 'amount',
                width: 220,
                render: (v: number, r: any) => {
                  if (v === 0) return <span>0 đ</span>;
                  if (r.type === 'income') {
                    return (
                      <span style={{ color: '#3f8600', fontWeight: 600 }}>
                        +{v.toLocaleString('vi-VN')} đ
                      </span>
                    );
                  }
                  return (
                    <span style={{ color: '#cf1322', fontWeight: 600 }}>
                      {v.toLocaleString('vi-VN')} đ
                    </span>
                  );
                },
              },
              {
                title: 'Ghi chú / Diễn giải',
                dataIndex: 'note',
                key: 'note',
                render: (note: string) => <span style={{ color: '#595959' }}>{note}</span>,
              },
            ]}
          />

          <Divider />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f6ffed',
              padding: '16px 24px',
              borderRadius: 8,
              border: '1px solid #b7eb8f',
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#389e0d' }}>
                <CheckCircleOutlined style={{ marginRight: 8 }} />
                THỰC NHẬN CÒN LẠI (Chuyển khoản)
              </div>
              <small style={{ color: '#8c8c8c' }}>
                Đã trừ toàn bộ các khoản tạm ứng (kể cả tiền mặt lễ 20/10, 8/3), bảo hiểm và các khoản giảm trừ
              </small>
            </div>
            <div style={{ fontSize: 26, fontWeight: 'bold', color: '#3f8600' }}>
              {payslip.netSalary.toLocaleString('vi-VN')} VNĐ
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
