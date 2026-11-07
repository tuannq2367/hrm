const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { AttendanceParserService } = require(path.resolve('apps/api/dist/src/modules/attendance/attendance-parser.service.js'));

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });
const parser = new AttendanceParserService(prisma);

const sampleCsv = `BẢNG CHI TIẾT CHẤM CÔNG,,,,,,,,,,,,,,,
Mã nhân viên: 00002         Tên nhân viên: Nguyen Van Cuong         Phòng ban: --------,,,,,,,,,,,,,,,
Tổng giờ,,0,,,Số lần trễ,,0,,Số phút trễ,,0,,Tăng ca ngày lễ,,
Tổng công,,0,,,Số lần sớm,,0,,Số phút sớm,,0,,,,
Tăng ca,,0,0,,Vắng KP,,24,,Vắng CP,,0,,,,
Chi tiết,,,,,,,,,,,,,,,
Ngày,Thứ,1,,2,,3,,Trễ,Sớm,Về trễ,Giờ,Công,T.Ca1,T.Ca2,Ký hiệu
,,Vào,Ra,Vào,Ra,Vào,Ra,,,,,,,,
2026-09-01,Ba,,,,,,,0,0,0,0,0,0,0,V
2026-09-03,Năm,07:59,12:14,,,,,0,0,0,0,0,0,0,V
`;

async function test() {
  try {
    const res = await parser.processAndSaveAttendance(sampleCsv, 'test-admin', 'test.csv');
    console.log('Result:', res);
  } catch (err) {
    console.error('ERROR during processAndSaveAttendance:', err);
  }
}

test().finally(() => prisma.$disconnect());
