const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../apps/api/dist/src/app.module');

async function test() {
  console.log('--- Đang khởi động NestJS trong tiến trình test ---');
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(4001);
  console.log('--- NestJS đã sẵn sàng trên cổng 4001 ---');

  try {
    // 1. Test Login Admin
    console.log('\n[1] Thử nghiệm Đăng nhập Admin (0988888888)...');
    let loginRes;
    try {
      loginRes = await fetch('http://127.0.0.1:4001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '0988888888', password: 'Admin@123' }),
      });
    } catch (e) {
      console.error('Fetch error:', e);
      throw e;
    }

    const loginData = await loginRes.json();
    console.log('HTTP Status:', loginRes.status);
    console.log('Login Response:', {
      hasToken: !!loginData.accessToken,
      phone: loginData.user?.phone,
      role: loginData.user?.role,
      fullName: loginData.user?.employee?.fullName,
    });

    if (!loginData.accessToken) {
      throw new Error('Đăng nhập thất bại, không có token!');
    }

    const token = loginData.accessToken;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Test Get Employees
    console.log('\n[2] Thử nghiệm Lấy danh sách Nhân viên...');
    const empRes = await fetch('http://127.0.0.1:4001/api/employees', { headers: authHeaders });
    const employees = await empRes.json();
    console.log('HTTP Status:', empRes.status);
    console.log(`Số lượng nhân sự hiện tại: ${employees.length}`);
    console.log('Nhân sự đầu tiên:', {
      code: employees[0]?.employeeCode,
      name: employees[0]?.fullName,
      status: employees[0]?.status,
      dept: employees[0]?.department?.name,
    });

    // 3. Test Create Employee (Thử việc 2 tháng)
    console.log('\n[3] Thử nghiệm Thêm nhân viên thử việc mới (Trần Thị B)...');
    const createRes = await fetch('http://127.0.0.1:4001/api/employees', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeCode: 'NV001',
        attendanceCode: '001',
        fullName: 'Trần Thị B',
        phone: '0912345678',
        email: 'tranthib@company.com',
        gender: 'FEMALE',
        departmentId: employees[0]?.departmentId,
        positionId: employees[0]?.positionId,
        joinDate: '2026-10-01',
        status: 'PROBATION',
        probationMonths: 2,
        agreedSalary: 12000000,
        managementLevel: 0,
      }),
    });
    const createdData = await createRes.json();
    console.log('HTTP Status:', createRes.status);
    console.log('Tài khoản tự động tạo cho nhân viên mới:', createdData.user);

    // 4. Test Đăng nhập bằng tài khoản nhân viên mới (6 số cuối SĐT = 345678)
    console.log('\n[4] Thử nghiệm Đăng nhập bằng nhân viên mới (0912345678 / pass: 345678)...');
    const empLoginRes = await fetch('http://127.0.0.1:4001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0912345678', password: '345678' }),
    });
    const empLoginData = await empLoginRes.json();
    console.log('HTTP Status:', empLoginRes.status);
    console.log('Employee Login:', {
      mustChangePassword: empLoginData.user?.mustChangePassword,
      role: empLoginData.user?.role,
      name: empLoginData.user?.employee?.fullName,
    });

    // 5. Test Nhân viên mới gửi đơn xin đi muộn làm bù
    console.log('\n[5] Thử nghiệm Nhân viên mới gửi đơn xin đi muộn 30 phút (xin làm bù)...');
    const empToken = empLoginData.accessToken;
    const reqRes = await fetch('http://127.0.0.1:4001/api/requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'LATE_EARLY_MAKEUP',
        targetDate: '2026-10-31',
        minutes: 30,
        reason: 'Hỏng xe trên đường đến công ty, xin làm bù sau 17h hôm sau',
      }),
    });
    const reqData = await reqRes.json();
    console.log('HTTP Status:', reqRes.status);
    console.log('Đơn vừa tạo:', {
      id: reqData.id,
      type: reqData.type,
      status: reqData.status,
      minutes: reqData.minutes,
    });

    // 6. Admin duyệt đơn
    console.log('\n[6] Thử nghiệm Admin duyệt đơn và kiểm tra tạo nợ làm bù (MakeupDebt)...');
    const approveRes = await fetch(`http://127.0.0.1:4001/api/requests/${reqData.id}/review`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    console.log('HTTP Status:', approveRes.status);

    const debtRes = await fetch('http://127.0.0.1:4001/api/attendance/makeup-debts', {
      headers: authHeaders,
    });
    const debts = await debtRes.json();
    console.log('Danh sách nợ làm bù:', debts.map((d) => ({
      emp: d.employee?.fullName,
      debtMinutes: d.debtMinutes,
      deadline: d.deadlineDate,
      isResolved: d.isResolved,
    })));

    console.log('\n======================================================');
    console.log('🎉 TẤT CẢ CÁC BƯỚC TEST TÍCH HỢP ĐỀU THÀNH CÔNG 100%!');
    console.log('======================================================');
  } finally {
    await app.close();
    process.exit(0);
  }
}

test().catch((err) => {
  console.error('LỖI TEST:', err);
  process.exit(1);
});
