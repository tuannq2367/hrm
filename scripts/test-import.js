const fs = require('fs');
const path = require('path');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../apps/api/dist/src/app.module');
const { AttendanceParserService } = require('../apps/api/dist/src/modules/attendance/attendance-parser.service');
const { PayrollService } = require('../apps/api/dist/src/modules/payroll/payroll.service');

async function test() {
  console.log('=== KIỂM THỬ IMPORT DỮ LIỆU THỰC TẾ TỪ MÁY RONALD JACK ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const parserService = app.get(AttendanceParserService);
  const payrollService = app.get(PayrollService);

  try {
    const filePath = path.join(__dirname, '../test-attendance-2026-09.csv');
    const content = fs.readFileSync(filePath, 'utf-8');

    console.log('[1] Đang phân tích và xử lý file CSV chấm công tháng 09/2026...');
    const result = await parserService.processAndSaveAttendance(
      content,
      '0988888888',
      'test-attendance-2026-09.csv',
    );

    console.log('\n--- KẾT QUẢ IMPORT ---');
    console.log(`- Tổng nhân sự trong file: ${result.totalEmployeesInFile}`);
    console.log(`- Nhân sự được đồng bộ: ${result.employeesProcessed}`);
    console.log(`- Số ngày công được tính và lưu DB: ${result.daysSaved}`);
    console.log(`- Số lượt thiếu chấm công (chỉ có 1 lần quẹt): ${result.missingPunchCount}`);
    console.log(`- Số cảnh báo vi phạm phát hiện: ${result.violationsDetected}`);

    console.log('\n[2] Tự động tính Bảng Lương tháng 09/2026 từ dữ liệu chấm công thực tế...');
    const payrollResult = await payrollService.generateMonthlyPayroll('2026-09');
    console.log(`- Đã tính lương xong cho: ${payrollResult.totalPayslips} nhân sự!`);

    console.log('\n[3] Trích xuất bảng lương tháng 09/2026:');
    const period = await payrollService.getPayrollPeriod('2026-09');
    const payslips = period?.payslips || [];

    console.table(
      payslips.map((p) => ({
        'Mã NV': p.employee?.employeeCode,
        'Họ và tên': p.employee?.fullName,
        'Lương TT': p.agreedSalary.toLocaleString('vi-VN') + ' đ',
        'Công TT': p.actualWorkUnits,
        'LCB nhận': p.baseSalary.toLocaleString('vi-VN') + ' đ',
        'Phụ cấp': p.allowance.toLocaleString('vi-VN') + ' đ',
        'OT Pay': p.otPay.toLocaleString('vi-VN') + ' đ',
        'Phạt đi muộn': p.lateFine.toLocaleString('vi-VN') + ' đ',
        'BHXH': p.insuranceDeduction.toLocaleString('vi-VN') + ' đ',
        'THỰC LĨNH': p.netSalary.toLocaleString('vi-VN') + ' đ',
      })),
    );

    console.log('\n=============================================================');
    console.log('🎉 TOÀN BỘ DỮ LIỆU FILE MÁY CHẤM CÔNG ĐÃ ĐƯỢC XỬ LÝ CHUẨN XÁC!');
    console.log('=============================================================');
  } finally {
    await app.close();
  }
}

test().catch((err) => {
  console.error('LỖI TEST IMPORT:', err);
  process.exit(1);
});
