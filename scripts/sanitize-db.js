const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:' + path.resolve(__dirname, '../apps/api/prisma/dev.db'),
    },
  },
});

function normalizePhone(phone) {
  if (!phone) return '';
  let clean = String(phone).trim().replace(/\D/g, '');
  if (clean.startsWith('84') && clean.length >= 11) clean = '0' + clean.slice(2);
  else if (!clean.startsWith('0') && clean.length === 9) clean = '0' + clean;
  return clean;
}

async function run() {
  console.log('--- Đang chuẩn hóa toàn bộ dữ liệu tài khoản và nhân sự ---');

  // 1. Chuẩn hóa Admin
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin) {
    console.log('Admin found:', admin.phone);
    // Đảm bảo mật khẩu admin là Admin@123 hoặc 888888
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('888888', salt);
    // Keep admin active
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        isActive: true,
      }
    });
  }

  // 2. Chuẩn hóa tất cả Users
  const users = await prisma.user.findMany({ include: { employee: true } });
  for (const u of users) {
    const clean = normalizePhone(u.phone);
    const updates = {};
    if (clean && clean !== u.phone) {
      updates.phone = clean;
    }
    // Nếu tài khoản chưa đổi mật khẩu hoặc mật khẩu hiện tại không khớp 6 số cuối
    const last6 = (clean || u.phone).slice(-6);
    const isMatch = await bcrypt.compare(last6, u.passwordHash);
    if (!isMatch && u.mustChangePassword && u.role !== 'ADMIN') {
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(last6, salt);
      console.log(`Resetting default password hash for ${u.phone} -> ${clean} (last6: ${last6})`);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: u.id },
        data: updates
      }).catch(err => console.error('Error updating user', u.phone, err.message));
    }
  }

  // 3. Chuẩn hóa tất cả Employees
  const emps = await prisma.employee.findMany();
  for (const e of emps) {
    const clean = normalizePhone(e.phone);
    if (clean && clean !== e.phone) {
      await prisma.employee.update({
        where: { id: e.id },
        data: { phone: clean }
      }).catch(err => console.error('Error updating emp', e.phone, err.message));
    }
  }

  console.log('--- Hoàn tất chuẩn hóa DB ---');
}

run().finally(() => prisma.$disconnect());
