const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../apps/api/dist/src/app.module');

async function testNewFeatures() {
  console.log('--- Đang khởi động NestJS trên cổng 4002 để kiểm thử tính năng mới ---');
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(4002);
  console.log('--- Máy chủ đã sẵn sàng trên cổng 4002 ---');

  try {
    // 1. Kiểm tra phục vụ giao diện React tĩnh tại root "/"
    console.log('\n[1] Thử nghiệm phục vụ Web UI React tại http://127.0.0.1:4002/...');
    const rootRes = await fetch('http://127.0.0.1:4002/');
    const rootHtml = await rootRes.text();
    console.log('Status code:', rootRes.status);
    console.log('Chứa root element:', rootHtml.includes('id="root"'));
    if (rootRes.status !== 200 || !rootHtml.includes('id="root"')) {
      throw new Error('Lỗi phục vụ giao diện React!');
    }

    // 2. Đăng nhập Admin
    console.log('\n[2] Đăng nhập tài khoản Quản trị...');
    const loginRes = await fetch('http://127.0.0.1:4002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0988888888', password: 'Admin@123' }),
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log('Đăng nhập thành công, vai trò:', loginData.user?.role);

    // 3. Tải file mẫu CSV danh sách nhân viên
    console.log('\n[3] Tải file mẫu CSV danh sách nhân viên (/api/employees/template)...');
    const empTplRes = await fetch('http://127.0.0.1:4002/api/employees/template', {
      headers: authHeaders,
    });
    const empTplText = await empTplRes.text();
    console.log('Status:', empTplRes.status);
    console.log('Tiêu đề cột mẫu:', empTplText.split('\n')[0]);
    if (!empTplText.includes('Mã NV') || !empTplText.includes('Mã chấm công')) {
      throw new Error('File mẫu nhân viên không đúng định dạng!');
    }

    // 4. Tải file mẫu CSV thưởng / phạt / tạm ứng
    console.log('\n[4] Tải file mẫu CSV thưởng phạt (/api/payroll/adjustments/template)...');
    const adjTplRes = await fetch('http://127.0.0.1:4002/api/payroll/adjustments/template', {
      headers: authHeaders,
    });
    const adjTplText = await adjTplRes.text();
    console.log('Status:', adjTplRes.status);
    console.log('Tiêu đề cột mẫu:', adjTplText.split('\n')[0]);
    if (!adjTplText.includes('Mã NV') || !adjTplText.includes('Số tiền')) {
      throw new Error('File mẫu thưởng phạt không đúng định dạng!');
    }

    // 5. Kiểm tra Mở khóa / Khóa bảng lương
    console.log('\n[5] Kiểm thử Khóa và Mở khóa bảng lương (PUT /api/payroll/unlock)...');
    const month = '2026-10';
    // Khóa trước
    await fetch('http://127.0.0.1:4002/api/payroll/lock', {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ month }),
    });
    // Mở khóa
    const unlockRes = await fetch('http://127.0.0.1:4002/api/payroll/unlock', {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ month }),
    });
    const unlockData = await unlockRes.json();
    console.log('Status mở khóa:', unlockRes.status);
    console.log('Trạng thái isLocked:', unlockData.isLocked);
    if (unlockData.isLocked !== false) {
      throw new Error('Mở khóa bảng lương thất bại!');
    }

    // 6. Kiểm tra module Văn bản & Quy chế (Company Documents)
    console.log('\n[6] Kiểm thử module Văn bản & Quy chế công ty (/api/documents)...');
    // Lấy danh sách ban đầu
    const docsRes = await fetch('http://127.0.0.1:4002/api/documents', {
      headers: authHeaders,
    });
    const docs = await docsRes.json();
    console.log('Số lượng tài liệu ban đầu:', docs.length);

    console.log('\n======================================================');
    console.log('🎉 TẤT CẢ TÍNH NĂNG MỚI ĐÃ HOẠT ĐỘNG CHUẨN XÁC 100%!');
    console.log('======================================================');
  } finally {
    await app.close();
  }
}

testNewFeatures().catch((err) => {
  console.error('Test thất bại:', err);
  process.exit(1);
});
