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
  const adminUsers = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
    },
    include: { employee: true }
  });
  console.log('Admin users count:', adminUsers.length);
  for (const u of adminUsers) {
    console.log('Phone:', u.phone, 'isActive:', u.isActive, 'mustChange:', u.mustChangePassword);
    console.log('Match Admin@123:', await bcrypt.compare('Admin@123', u.passwordHash));
    console.log('Match 888888:', await bcrypt.compare('888888', u.passwordHash));
    console.log('Match 123456:', await bcrypt.compare('123456', u.passwordHash));
    console.log('Match admin:', await bcrypt.compare('admin', u.passwordHash));
    console.log('Match admin123:', await bcrypt.compare('admin123', u.passwordHash));
  }
}

main().finally(() => prisma.$disconnect());
