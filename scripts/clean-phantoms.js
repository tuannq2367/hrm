const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });

async function clean() {
  const phantoms = await prisma.employee.findMany({
    where: {
      OR: [
        { employeeCode: { startsWith: 'NV0000' } },
        { employeeCode: { startsWith: 'NV0017' } },
      ],
    },
    include: { attendanceDays: true, user: true },
  });

  console.log('Found phantoms:', phantoms.map(p => ({ code: p.employeeCode, name: p.fullName, days: p.attendanceDays.length })));

  for (const p of phantoms) {
    await prisma.attendanceDay.deleteMany({ where: { employeeId: p.id } });
    await prisma.salaryProfile.deleteMany({ where: { employeeId: p.id } });
    await prisma.employee.delete({ where: { id: p.id } });
    if (p.userId) {
      await prisma.user.delete({ where: { id: p.userId } }).catch(() => {});
    }
    console.log(`Deleted phantom ${p.employeeCode}`);
  }
}

clean().finally(() => prisma.$disconnect());
