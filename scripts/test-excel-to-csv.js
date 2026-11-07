const ExcelJS = require('exceljs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { AttendanceParserService } = require(path.resolve('apps/api/dist/src/modules/attendance/attendance-parser.service.js'));

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });
const parser = new AttendanceParserService(prisma);

function formatDate(val) {
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    // Check if ISO or date string
    const d = new Date(val);
    if (!isNaN(d.getTime()) && val.includes('-')) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  return String(val ?? '').trim();
}

async function convertExcelToCsv(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  const lines = [];

  sheet.eachRow((row) => {
    const rowValues = [];
    // Ronald Jack has up to 16 columns
    for (let c = 1; c <= 16; c++) {
      const cell = row.getCell(c);
      let val = cell.value;
      if (val === null || val === undefined) {
        rowValues.push('');
      } else if (val instanceof Date) {
        rowValues.push(formatDate(val));
      } else if (typeof val === 'object' && val.text) {
        rowValues.push(val.text.trim());
      } else {
        rowValues.push(String(val).trim());
      }
    }
    lines.push(rowValues.join(','));
  });

  return lines.join('\n');
}

async function run() {
  const fs = require('fs');
  const buf = fs.readFileSync('C:/Users/PC/.gemini/antigravity/brain/c98a0142-50fb-470e-888f-14aa0669e606/.user_uploaded/media_1793617921877_55d5747f.xlsx');
  
  const csv = await convertExcelToCsv(buf);
  console.log('Converted CSV lines:', csv.split('\n').length);
  console.log('Sample first 15 lines:\n' + csv.split('\n').slice(0, 15).join('\n'));

  const blocks = parser.parseRawText(csv);
  console.log('\nParsed blocks:', blocks.length);
  
  console.log('\n--- Running processAndSaveAttendance ---');
  const result = await parser.processAndSaveAttendance(csv, 'admin', 'chitiettungng2026_10_1_16_37_26.xlsx');
  console.log('Result:', result);

  // Check September timesheet
  const { AttendanceService } = require(path.resolve('apps/api/dist/src/modules/attendance/attendance.service.js'));
  const attService = new AttendanceService(prisma);
  const timesheet = await attService.getMonthlyTimesheet('2026-09');
  console.log('\nTimesheet employees count:', timesheet.length);
  
  let totalSavedDays = 0;
  timesheet.forEach(emp => {
    totalSavedDays += emp.attendanceDays.length;
  });
  console.log('Total attendance days in 2026-09:', totalSavedDays);
  console.log('Sample 3 employees in timesheet:');
  timesheet.slice(0, 3).forEach(emp => {
    const totalUnits = emp.attendanceDays.reduce((sum, d) => sum + d.workUnits, 0);
    console.log(`- ${emp.employeeCode} (${emp.attendanceCode}) ${emp.fullName}: ${emp.attendanceDays.length} days recorded, ${totalUnits} công`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
