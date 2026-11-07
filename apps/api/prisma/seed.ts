import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Đang khởi tạo dữ liệu mẫu (Seed)... ---');

  // 1. Khởi tạo tài khoản Admin tối cao
  const adminPhone = '0988888888';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@123', salt);

  const adminUser = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {},
    create: {
      phone: adminPhone,
      passwordHash,
      role: 'ADMIN',
      mustChangePassword: false,
      isActive: true,
    },
  });

  // 2. Khởi tạo các phòng ban chuẩn
  const depts = [
    { code: 'BGD', name: 'Ban Giám Đốc' },
    { code: 'HCNS', name: 'Phòng Hành chính - Nhân sự' },
    { code: 'KTTC', name: 'Phòng Kế toán - Tài chính' },
    { code: 'TECH', name: 'Phòng Kỹ thuật & Công nghệ' },
    { code: 'SALES', name: 'Phòng Kinh doanh & Marketing' },
  ];

  for (const d of depts) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: d,
    });
  }

  // 3. Khởi tạo các chức danh chuẩn
  const positions = [
    { code: 'GD', name: 'Giám đốc' },
    { code: 'TP', name: 'Trưởng phòng' },
    { code: 'PP', name: 'Phó phòng' },
    { code: 'NV', name: 'Nhân viên' },
    { code: 'CTV', name: 'Cộng tác viên' },
  ];

  for (const p of positions) {
    await prisma.position.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }

  // 4. Tạo hồ sơ nhân sự cho Admin
  const bgdDept = await prisma.department.findUnique({ where: { code: 'BGD' } });
  const gdPos = await prisma.position.findUnique({ where: { code: 'GD' } });

  await prisma.employee.upsert({
    where: { phone: adminPhone },
    update: {},
    create: {
      employeeCode: 'NV000',
      attendanceCode: '000',
      fullName: 'Quản Trị Viên (Admin)',
      phone: adminPhone,
      email: 'admin@company.com',
      gender: 'MALE',
      departmentId: bgdDept?.id,
      positionId: gdPos?.id,
      status: 'OFFICIAL',
      joinDate: new Date('2024-01-01'),
      hasInsurance: true,
      userId: adminUser.id,
    },
  });

  // 5. Khởi tạo cấu hình hệ thống
  const settings = [
    { key: 'standardWorkDays', value: '26', description: 'Công chuẩn / tháng' },
    { key: 'lateGraceMinutes', value: '15', description: 'Số phút đi muộn cho phép' },
    { key: 'maxEarlyPerMonth', value: '7', description: 'Số lần về sớm việc gấp tối đa' },
    { key: 'consecutiveLateDaysTrigger', value: '3', description: 'Số ngày đi muộn liên tiếp để phạt' },
    { key: 'consecutiveLateFine', value: '100000', description: 'Mức phạt đi muộn 3 ngày liên tiếp (VNĐ)' },
    { key: 'otHourlyRate', value: '50000', description: 'Đơn giá làm thêm giờ (VNĐ/giờ)' },
    { key: 'unionFeeMonthly', value: '50000', description: 'Phí công đoàn / tháng (VNĐ)' },
    { key: 'defaultBaseSalary', value: '5681700', description: 'Mức lương cơ bản mặc định (VNĐ)' },
    { key: 'taxPersonalDeduction', value: '15500000', description: 'Mức giảm trừ gia cảnh cho bản thân (Thuế TNCN)' },
    { key: 'taxDependentDeduction', value: '6200000', description: 'Mức giảm trừ gia cảnh cho mỗi người phụ thuộc (Thuế TNCN)' },
    { key: 'allowancePercent', value: '0.10', description: 'Tỷ lệ phụ cấp theo lương thỏa thuận' },
  ];

  for (const s of settings) {
    await prisma.hrmSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log('--- Khởi tạo dữ liệu mẫu thành công! ---');
  console.log(`Tài khoản Admin: ${adminPhone} / Mật khẩu: Admin@123`);
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
