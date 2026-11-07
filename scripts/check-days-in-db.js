const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });

async function checkAttendanceDays() {
  const days = await prisma.attendanceDay.findMany({
    include: {
      employee: true
    },
    take: 10
  });

  console.log('Sample AttendanceDays in DB:');
  for (const d of days) {
    console.log(d.workDate.toISOString().slice(0, 10), 'emp:', d.employee?.fullName, 'empCode:', d.employee?.employeeCode, 'attCode:', d.employee?.attendanceCode, 'workUnits:', d.workUnits);
  }

  // Let's check employee NV173 (Do Thi Quyen)
  const quyen = await prisma.employee.findUnique({
    where: { employeeCode: 'NV173' },
    include: { attendanceDays: true }
  });
  console.log('Original Quyen (NV173) days count:', quyen?.attendanceDays.length);

  // Let's check if a duplicate was created
  const allQuyens = await prisma.employee.findMany({
    where: { fullName: { contains: 'Quyen' } },
    include: { attendanceDays: true }
  });
  console.log('All Quyens in DB:', allQuyens.map(q => ({ id: q.id, code: q.employeeCode, attCode: q.attendanceCode, days: q.attendanceDays.length })));
}

checkAttendanceDays().finally(() => prisma.$disconnect());
