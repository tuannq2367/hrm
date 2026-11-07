const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });

async function check() {
  const users = await prisma.user.findMany({ where: { phone: { in: ['0967339992', '0962546299'] } } });
  for (const u of users) {
    console.log(u.phone, 'mustChange:', u.mustChangePassword, 'isActive:', u.isActive);
    console.log('match 123456:', await bcrypt.compare('123456', u.passwordHash));
    console.log('match 339992:', await bcrypt.compare('339992', u.passwordHash));
    console.log('match 546299:', await bcrypt.compare('546299', u.passwordHash));
    console.log('match Admin@123:', await bcrypt.compare('Admin@123', u.passwordHash));
  }
}

check().finally(() => prisma.$disconnect());
