const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });

async function check() {
  const cuong = await prisma.employee.findMany({
    where: {
      fullName: { contains: 'Cuong' }
    }
  });
  console.log('Cuong:', cuong);

  const allEmps = await prisma.employee.findMany({
    select: {
      employeeCode: true,
      attendanceCode: true,
      fullName: true,
    }
  });
  console.log('All emps codes:', allEmps.map(e => `${e.employeeCode} | attCode: '${e.attendanceCode}' | ${e.fullName}`));
}

check().finally(() => prisma.$disconnect());
