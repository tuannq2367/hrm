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

async function main() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@123', salt);

  // Tìm tất cả tài khoản admin hiện có
  const existingAdmins = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'ADMIN' },
        { phone: 'admin' },
        { phone: '0988888888' },
      ],
    },
  });

  console.log('Existing admin accounts:', existingAdmins);

  if (existingAdmins.length > 0) {
    // Giữ lại bản ghi đầu tiên và cập nhật thành phone = 'admin', pass = Admin@123
    const primaryAdmin = existingAdmins[0];
    await prisma.user.update({
      where: { id: primaryAdmin.id },
      data: {
        phone: 'admin',
        passwordHash,
        role: 'ADMIN',
        mustChangePassword: false,
        isActive: true,
      },
    });
    console.log(`Updated admin user ${primaryAdmin.id} to phone='admin'`);

    // Xóa các tài khoản admin trùng lặp khác nếu có
    for (let i = 1; i < existingAdmins.length; i++) {
      const extra = existingAdmins[i];
      // Nếu có employee gắn kèm thì ngắt liên kết trước khi xóa
      await prisma.employee.updateMany({
        where: { userId: extra.id },
        data: { userId: null },
      });
      await prisma.user.delete({ where: { id: extra.id } });
      console.log(`Deleted redundant admin user ${extra.id} (${extra.phone})`);
    }
  } else {
    // Tạo mới duy nhất tài khoản admin
    await prisma.user.create({
      data: {
        phone: 'admin',
        passwordHash,
        role: 'ADMIN',
        mustChangePassword: false,
        isActive: true,
      },
    });
    console.log(`Created new single admin account: username='admin', pass='Admin@123'`);
  }

  // Cập nhật Employee admin nếu có
  const adminEmp = await prisma.employee.findFirst({
    where: {
      OR: [
        { employeeCode: 'NV000' },
        { phone: '0988888888' },
        { phone: 'admin' },
      ],
    },
  });
  const currentAdmin = await prisma.user.findUnique({ where: { phone: 'admin' } });
  if (adminEmp && currentAdmin) {
    await prisma.employee.update({
      where: { id: adminEmp.id },
      data: {
        phone: 'admin',
        userId: currentAdmin.id,
      },
    });
  }

  const finalUsers = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  console.log('Final admin accounts in DB:', finalUsers);
}

main().finally(() => prisma.$disconnect());
