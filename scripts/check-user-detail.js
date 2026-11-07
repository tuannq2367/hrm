const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });

async function check() {
  const u = await prisma.user.findUnique({ where: { phone: '0936260692' }, include: { employee: true } });
  console.log('User 0936260692:', u);
  const emps = await prisma.employee.findMany({ where: { phone: '0936260692' } });
  console.log('Employees with 0936260692:', emps);
  const allAdmins = await prisma.user.findMany({ where: { OR: [{ role: 'ADMIN' }, { role: 'SUB_ADMIN' }] }, include: { employee: true } });
  console.log('All admins / subadmins:', allAdmins);
}

check().finally(() => prisma.$disconnect());
