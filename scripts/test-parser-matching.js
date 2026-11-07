const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });

// We simulate what AttendanceParserService.processAndSaveAttendance does
// Let's import AttendanceParserService or test the logic
async function testImport() {
  const content = `BẢNG CHI TIẾT CHẤM CÔNG,,,,,,,,,,,,,,,
Mã nhân viên: 00002         Tên nhân viên: Nguyen Van Cuong         Phòng ban: --------,,,,,,,,,,,,,,,
Tổng giờ,,0,,,Số lần trễ,,0,,Số phút trễ,,0,,Tăng ca ngày lễ,,
Chi tiết,,,,,,,,,,,,,,,
Ngày,Thứ,1,,2,,3,,Trễ,Sớm,Về trễ,Giờ,Công,T.Ca1,T.Ca2,Ký hiệu
,,Vào,Ra,Vào,Ra,Vào,Ra,,,,,,,,
2026-09-03,Năm,07:59,12:14,,,,,0,0,0,0,0,0,0,V
`;

  // Test regex
  const line = 'Mã nhân viên: 00002         Tên nhân viên: Nguyen Van Cuong         Phòng ban: --------,,,,,,,,,,,,,,,';
  const empMatch = line.match(/Mã nhân viên:\s*(\S+)\s+Tên nhân viên:\s*([^\t,]+?)(?:\s+Phòng ban:|\s*,|$)/i);
  console.log('empMatch:', empMatch);

  const rawCode = empMatch[1].trim();
  const cleanIntCode = String(parseInt(rawCode, 10));
  console.log('rawCode:', rawCode, 'cleanIntCode:', cleanIntCode);

  const foundByRaw = await prisma.employee.findFirst({ where: { attendanceCode: rawCode } });
  const foundByClean = await prisma.employee.findFirst({ where: { attendanceCode: cleanIntCode } });
  const foundByEmpCode1 = await prisma.employee.findFirst({ where: { employeeCode: 'NV' + rawCode } });
  const foundByEmpCode2 = await prisma.employee.findFirst({ where: { employeeCode: 'NV' + cleanIntCode.padStart(3, '0') } });

  console.log('foundByRaw:', foundByRaw?.fullName);
  console.log('foundByClean:', foundByClean?.fullName);
  console.log('foundByEmpCode1:', foundByEmpCode1?.fullName);
  console.log('foundByEmpCode2:', foundByEmpCode2?.fullName);
}

testImport().finally(() => prisma.$disconnect());
