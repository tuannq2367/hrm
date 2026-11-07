const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.resolve('apps/api/prisma/dev.db') } } });

function removeAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

async function testMatch() {
  const employees = await prisma.employee.findMany();
  console.log('Total emps in DB:', employees.length);

  const testCases = [
    { code: '00002', name: 'Nguyen Van Cuong' },
    { code: '00003', name: 'Pham Hong Phuong' },
    { code: '00004', name: 'Nguyen Thuy Trang' },
    { code: '00005', name: 'Le Thi Phuc' },
    { code: '00006', name: 'Nguyen Thi Lan Anh' },
    { code: '00007', name: 'Dang Thi Hai Hoa' },
    { code: '00008', name: 'Trieu Thi Kim Dung' },
    { code: '00009', name: 'Bui Thi Tuyet Mai' },
    { code: '00010', name: 'Ngo Thi Luan' },
    { code: '00011', name: 'Duong Thu Thuy' },
    { code: '00012', name: 'Nguyen Van Luan' },
    { code: '00013', name: 'Nguyen Quoc Tuan' },
    { code: '00014', name: 'Tran Thi Xuan' },
    { code: '00015', name: 'Nguyen Thu Hoai' },
    { code: '00016', name: 'Nguyen Tri Hieu' },
    { code: '00017', name: 'Le Thi Thanh Thao' },
    { code: '00018', name: 'Nguyen Thi Thuy Hi' },
    { code: '00019', name: 'Nguyen Thi Thu Huy' },
    { code: '00020', name: 'Nguyen Thi Huong' },
    { code: '00021', name: 'Pham Tien Dat' },
    { code: '00022', name: 'Nguyen Gia Duong' },
    { code: '00023', name: 'Dang Thi Huong' },
    { code: '00024', name: 'Vi thi nuong' },
    { code: '00025', name: 'Hoang Thi Hung' },
    { code: '00026', name: 'Hoang Thi Sa' },
    { code: '00027', name: 'Dang Thu Ha' },
    { code: '00028', name: 'Le Thi Hoang Anh' },
    { code: '00029', name: 'An Thi Lan' },
    { code: '00030', name: 'Tran Thi Hang' },
    { code: '00031', name: 'Le Thi Hong Ngat' },
    { code: '00032', name: 'Hoang Thi Duong' },
    { code: '00033', name: 'Cao Mai Hoa' },
    { code: '00034', name: 'Nguyen Thi Hong Li' },
    { code: '00035', name: 'Dao Dinh Huy' },
    { code: '00036', name: 'Tran Thuy Linh' },
    { code: '00037', name: 'Nguyen Xuan Binh' },
    { code: '00038', name: 'Le Thi Thuy' },
    { code: '00039', name: 'Nguyen thi hong la' },
    { code: '00041', name: 'Dinh Thi Thanh Mo' },
    { code: '00042', name: 'Tran Thi Anh Tuyet' },
    { code: '00043', name: 'Dao Thanh Huyen' },
    { code: '00044', name: 'Nguyen Huu Thanh' },
    { code: '00045', name: 'Nguyen Thi Thu Huo' },
    { code: '00046', name: 'Hoang Minh Nam' },
    { code: '00047', name: 'Vu Thanh Hang' },
    { code: '00049', name: 'Pham Thi Huong' },
    { code: '00053', name: 'Nguyen thuy trang' },
    { code: '00054', name: 'Bui thi thu ha' },
    { code: '00055', name: 'Nguyen thi thao' },
    { code: '00056', name: 'An thi la' },
    { code: '00057', name: 'Nguyen thi hong' },
    { code: '00173', name: 'Do thi quyen' },
    { code: '00174', name: 'Ngo thu ha' },
    { code: '00175', name: 'Tran thi trang' },
    { code: '00176', name: 'Dao Thi Hong Gam' }
  ];

  let matchedCount = 0;
  for (const tc of testCases) {
    const rawCode = tc.code;
    const intCode = String(parseInt(rawCode, 10));
    const targetNameNorm = removeAccents(tc.name);

    // Matching priority:
    // 1. attendanceCode === rawCode OR intCode
    let matched = employees.find(e => e.attendanceCode === rawCode || e.attendanceCode === intCode);

    // 2. employeeCode matches NV00173 or NV173 or NV00002
    if (!matched) {
      matched = employees.find(e =>
        e.employeeCode === 'NV' + rawCode ||
        e.employeeCode === 'NV' + intCode ||
        e.employeeCode === 'NV' + intCode.padStart(3, '0')
      );
    }

    // 3. Match by Name (unsigned)
    if (!matched) {
      matched = employees.find(e => {
        const empNameNorm = removeAccents(e.fullName);
        return empNameNorm === targetNameNorm || empNameNorm.startsWith(targetNameNorm) || targetNameNorm.startsWith(empNameNorm);
      });
    }

    if (matched) {
      matchedCount++;
      console.log(`[OK] CSV: ${tc.code} (${tc.name}) -> DB: ${matched.employeeCode} (attCode: ${matched.attendanceCode}, name: ${matched.fullName})`);
    } else {
      console.log(`[MISSING] CSV: ${tc.code} (${tc.name}) -> NO MATCH IN DB!`);
    }
  }

  console.log(`Total matched: ${matchedCount} / ${testCases.length}`);
}

testMatch().finally(() => prisma.$disconnect());
