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
  const users = await prisma.user.findMany({ include: { employee: true } });
  console.log('Total users in local DB:', users.length);
  for (const u of users) {
    const l6 = u.phone.slice(-6);
    const m6 = await bcrypt.compare(l6, u.passwordHash);
    const ma = await bcrypt.compare('Admin@123', u.passwordHash);
    console.log(u.phone, u.role, 'matchLast6:', m6, 'matchAdmin123:', ma, 'emp:', u.employee?.fullName);
  }
}

main().finally(() => prisma.$disconnect());
