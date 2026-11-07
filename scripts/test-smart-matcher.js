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

// Function to find the best employee match
function findEmployeeMatch(code, name, employees) {
  const rawCode = (code || '').trim();
  const intCode = String(parseInt(rawCode, 10));
  const normName = removeAccents(name);

  // 1. Exact match on attendanceCode (raw or int)
  let found = employees.find(e => e.attendanceCode === rawCode || e.attendanceCode === intCode);
  if (found) {
    // Verify if name is also reasonably close, or if attendance code is exact
    const empNormName = removeAccents(found.fullName);
    if (empNormName === normName || empNormName.includes(normName) || normName.includes(empNormName)) {
      return { match: found, method: 'attendanceCode + name' };
    }
  }

  // 2. Exact match on fullName (unsigned)
  found = employees.find(e => removeAccents(e.fullName) === normName);
  if (found) return { match: found, method: 'exact name' };

  // 3. Match on employeeCode
  found = employees.find(e =>
    e.employeeCode === 'NV' + rawCode ||
    e.employeeCode === 'NV' + intCode ||
    e.employeeCode === 'NV' + intCode.padStart(3, '0')
  );
  if (found) return { match: found, method: 'employeeCode' };

  // 4. Match on attendanceCode alone
  found = employees.find(e => e.attendanceCode === rawCode || e.attendanceCode === intCode);
  if (found) return { match: found, method: 'attendanceCode' };

  // 5. Partial name match (e.g. Ronald Jack truncates name like "Nguyen Thi Thu Huo" for "Nguyễn Thị Thu Hường")
  found = employees.find(e => {
    const empNorm = removeAccents(e.fullName);
    return empNorm.startsWith(normName) || normName.startsWith(empNorm);
  });
  if (found) return { match: found, method: 'partial name' };

  return null;
}

async function run() {
  // Only real employees (not the fake ones created in test snippet)
  const allEmployees = await prisma.employee.findMany({
    where: {
      NOT: {
        employeeCode: { in: ['NV00002', 'NV00003', 'NV00173'] }
      }
    }
  });

  const testList = [
    ['00002', 'Nguyen Van Cuong'],
    ['00003', 'Pham Hong Phuong'],
    ['00004', 'Nguyen Thuy Trang'],
    ['00005', 'Le Thi Phuc'],
    ['00006', 'Nguyen Thi Lan Anh'],
    ['00007', 'Dang Thi Hai Hoa'],
    ['00008', 'Trieu Thi Kim Dung'],
    ['00009', 'Bui Thi Tuyet Mai'],
    ['00010', 'Ngo Thi Luan'],
    ['00011', 'Duong Thu Thuy'],
    ['00012', 'Nguyen Van Luan'],
    ['00013', 'Nguyen Quoc Tuan'],
    ['00014', 'Tran Thi Xuan'],
    ['00015', 'Nguyen Thu Hoai'],
    ['00016', 'Nguyen Tri Hieu'],
    ['00017', 'Le Thi Thanh Thao'],
    ['00018', 'Nguyen Thi Thuy Hi'],
    ['00019', 'Nguyen Thi Thu Huy'],
    ['00020', 'Nguyen Thi Huong'],
    ['00021', 'Pham Tien Dat'],
    ['00022', 'Nguyen Gia Duong'],
    ['00023', 'Dang Thi Huong'],
    ['00024', 'Vi thi nuong'],
    ['00025', 'Hoang Thi Hung'],
    ['00026', 'Hoang Thi Sa'],
    ['00027', 'Dang Thu Ha'],
    ['00028', 'Le Thi Hoang Anh'],
    ['00029', 'An Thi Lan'],
    ['00030', 'Tran Thi Hang'],
    ['00031', 'Le Thi Hong Ngat'],
    ['00032', 'Hoang Thi Duong'],
    ['00033', 'Cao Mai Hoa'],
    ['00034', 'Nguyen Thi Hong Li'],
    ['00035', 'Dao Dinh Huy'],
    ['00036', 'Tran Thuy Linh'],
    ['00037', 'Nguyen Xuan Binh'],
    ['00038', 'Le Thi Thuy'],
    ['00039', 'Nguyen thi hong la'],
    ['00041', 'Dinh Thi Thanh Mo'],
    ['00042', 'Tran Thi Anh Tuyet'],
    ['00043', 'Dao Thanh Huyen'],
    ['00044', 'Nguyen Huu Thanh'],
    ['00045', 'Nguyen Thi Thu Huo'],
    ['00046', 'Hoang Minh Nam'],
    ['00047', 'Vu Thanh Hang'],
    ['00049', 'Pham Thi Huong'],
    ['00053', 'Nguyen thuy trang'],
    ['00054', 'Bui thi thu ha'],
    ['00055', 'Nguyen thi thao'],
    ['00056', 'An thi la'],
    ['00057', 'Nguyen thi hong'],
    ['00173', 'Do thi quyen'],
    ['00174', 'Ngo thu ha'],
    ['00175', 'Tran thi trang'],
    ['00176', 'Dao Thi Hong Gam'],
  ];

  let matched = 0;
  for (const [code, name] of testList) {
    const res = findEmployeeMatch(code, name, allEmployees);
    if (res) {
      matched++;
      console.log(`MATCHED: [${code}] ${name} -> ${res.match.employeeCode} (${res.match.fullName}) [via ${res.method}]`);
    } else {
      console.log(`NOT MATCHED: [${code}] ${name}`);
    }
  }

  console.log(`Matched: ${matched} / ${testList.length}`);
}

run().finally(() => prisma.$disconnect());
