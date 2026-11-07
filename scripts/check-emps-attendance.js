const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });

async function check() {
  const emps = await prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
      attendanceCode: true,
      fullName: true,
    },
    take: 20
  });
  console.log('Sample employees in DB:', emps);
}

check().finally(() => prisma.$disconnect());
