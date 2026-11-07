const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { AttendanceParserService } = require(path.resolve('apps/api/dist/src/modules/attendance/attendance-parser.service.js'));

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });
const parser = new AttendanceParserService(prisma);

// Read the user prompt or user CSV
const fs = require('fs');
const transcript = fs.readFileSync('C:\\Users\\PC\\.gemini\\antigravity\\brain\\c98a0142-50fb-470e-888f-14aa0669e606\\.system_generated\\logs\\transcript_full.jsonl', 'utf-8');
const lines = transcript.split('\n');
const lastLine = lines.filter(l => l.includes('BẢNG CHI TIẾT CHẤM CÔNG')).pop();
const parsedJson = JSON.parse(lastLine);
// In the user request, the user attached the CSV text directly
const fullCsv = parsedJson.content.replace(/^[\s\S]*?(?=BẢNG CHI TIẾT CHẤM CÔNG)/i, '').trim();

console.log('CSV length:', fullCsv.length);

async function testFull() {
  try {
    const blocks = parser.parseRawText(fullCsv);
    console.log('Parsed blocks count:', blocks.length);
    console.log('First 5 blocks:', blocks.slice(0, 5).map(b => ({ code: b.attendanceCode, name: b.fullName, daysCount: b.days.length })));
    
    // Now test processAndSaveAttendance
    const res = await parser.processAndSaveAttendance(fullCsv, 'admin', 'test_thang9.csv');
    console.log('Import result:', res);
  } catch (err) {
    console.error('ERROR during full import:', err);
  }
}

testFull().finally(() => prisma.$disconnect());
