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

function findSafeMatch(rawCode, rawName, employees) {
  const intCode = String(parseInt(rawCode, 10));
  const normName = removeAccents(rawName);
  const nameWords = normName.split(' ').filter(Boolean);
  const firstName = nameWords[nameWords.length - 1];

  // 1. Khớp chính xác toàn bộ Họ Tên (không dấu)
  let found = employees.find(e => removeAccents(e.fullName) === normName);
  if (found) return { emp: found, reason: 'exact name' };

  // 2. Khớp theo Tên bị cắt ngắn bởi máy Ronald Jack (VD: "Nguyen Thi Thu Huo" -> "Nguyễn Thị Thu Hương")
  found = employees.find(e => {
    const eNorm = removeAccents(e.fullName);
    return (eNorm.startsWith(normName) || normName.startsWith(eNorm)) &&
      eNorm.split(' ')[0] === nameWords[0];
  });
  if (found) return { emp: found, reason: 'truncated name' };

  // 3. Khớp 2 từ cuối của Họ Tên (VD: "Tri Hieu" -> "Vuong Tri Hieu")
  if (nameWords.length >= 2) {
    const lastTwo = nameWords.slice(-2).join(' ');
    const candidates = employees.filter(e => removeAccents(e.fullName).endsWith(lastTwo));
    if (candidates.length === 1) {
      return { emp: candidates[0], reason: 'last two words: ' + lastTwo };
    }
  }

  // 4. Khớp theo Mã chấm công NẾU tên chính (từ cuối) trùng khớp hoàn toàn
  found = employees.find(e => {
    const isCodeMatch = e.attendanceCode === rawCode || e.attendanceCode === intCode;
    if (!isCodeMatch) return false;
    const eNorm = removeAccents(e.fullName);
    const eWords = eNorm.split(' ').filter(Boolean);
    const eFirst = eWords[eWords.length - 1];
    return eFirst === firstName;
  });
  if (found) return { emp: found, reason: 'attendanceCode + exact first name' };

  // 5. Khớp theo Mã nhân viên (e.g. NV173 or NV007) NẾU tên chính trùng khớp
  found = employees.find(e => {
    const isEmpCodeMatch =
      e.employeeCode === 'NV' + rawCode ||
      e.employeeCode === 'NV' + intCode ||
      e.employeeCode === 'NV' + intCode.padStart(3, '0');
    if (!isEmpCodeMatch) return false;
    const eNorm = removeAccents(e.fullName);
    const eWords = eNorm.split(' ').filter(Boolean);
    const eFirst = eWords[eWords.length - 1];
    return eFirst === firstName;
  });
  if (found) return { emp: found, reason: 'employeeCode + exact first name' };

  return null;
}

async function run() {
  const allEmployees = await prisma.employee.findMany();

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

  for (const [code, name] of testList) {
    const res = findSafeMatch(code, name, allEmployees);
    if (res) {
      console.log(`[MATCH] CSV [${code}] ${name.padEnd(20)} -> ${res.emp.employeeCode} (${res.emp.fullName}) [${res.reason}]`);
    } else {
      console.log(`[CREATE NEW] CSV [${code}] ${name}`);
    }
  }
}

run().finally(() => prisma.$disconnect());
