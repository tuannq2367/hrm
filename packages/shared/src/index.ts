// ==========================================
// 1. Enums & Constants
// ==========================================

export enum UserRole {
  ADMIN = 'ADMIN',
  SUB_ADMIN = 'SUB_ADMIN',
  HR = 'HR',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum EmployeeStatus {
  PROBATION = 'PROBATION',     // Thử việc (1-2 tháng)
  OFFICIAL = 'OFFICIAL',       // Chính thức
  RESIGNED = 'RESIGNED',       // Đã nghỉ việc
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum ContractType {
  PROBATION = 'PROBATION',                   // Thử việc
  DEFINITE_TERM = 'DEFINITE_TERM',           // Xác định thời hạn
  INDEFINITE_TERM = 'INDEFINITE_TERM',       // Không xác định thời hạn
  COLLABORATOR = 'COLLABORATOR',             // Cộng tác viên
}

export enum RequestType {
  LATE_EARLY_EXEMPT = 'LATE_EARLY_EXEMPT',   // Đi muộn / về sớm (được miễn)
  LATE_EARLY_MAKEUP = 'LATE_EARLY_MAKEUP',   // Đi muộn / về sớm (xin làm bù)
  MAKEUP = 'MAKEUP',                         // Đăng ký làm bù (sau 17:00)
  OT = 'OT',                                 // Làm thêm giờ (sau 17:00)
  THROUGH_LUNCH = 'THROUGH_LUNCH',           // Làm thông trưa (về sớm lúc 16:00)
  LEAVE = 'LEAVE',                           // Nghỉ phép năm (có lương)
  UNPAID_LEAVE = 'UNPAID_LEAVE',             // Nghỉ không lương
  MISSING_PUNCH = 'MISSING_PUNCH',           // Giải trình quên thẻ / quên chấm công
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum DocumentType {
  ID_CARD_FRONT = 'ID_CARD_FRONT',           // CCCD mặt trước
  ID_CARD_BACK = 'ID_CARD_BACK',             // CCCD mặt sau
  RESUME = 'RESUME',                         // Sơ yếu lý lịch
  AVATAR = 'AVATAR',                         // Ảnh 3x4
  DEGREE = 'DEGREE',                         // Bằng cấp / chứng chỉ
  HEALTH_CERT = 'HEALTH_CERT',               // Giấy khám sức khỏe
  LABOR_CONTRACT = 'LABOR_CONTRACT',         // Bản scan hợp đồng
  OTHER = 'OTHER',
}

export enum ViolationType {
  LATE_3_DAYS = 'LATE_3_DAYS',               // Đi muộn 3 ngày làm việc liên tiếp
  EARLY_EXCEED_7 = 'EARLY_EXCEED_7',         // Về sớm 5-10p quá 7 lần/tháng
  OVERDUE_MAKEUP = 'OVERDUE_MAKEUP',         // Nợ làm bù quá hạn (không bù ở ngày làm việc tiếp theo)
}

// ==========================================
// 2. Default Configuration & Parameters
// ==========================================

export const DEFAULT_HRM_CONFIG = {
  // Giờ làm việc chuẩn
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '13:00',
  afternoonEnd: '17:00',
  throughLunchEnd: '16:00',

  // Ngưỡng thời gian
  lateGraceMinutes: 15,          // Vào trước hoặc đúng 08:15 được coi là đúng giờ
  earlyGraceMinMinutes: 5,       // Về sớm 5-10 phút (16:50 - 16:59)
  earlyGraceMaxMinutes: 10,
  maxEarlyPerMonth: 7,           // Về sớm việc gấp tối đa 7 lần/tháng

  // Lương & Công chuẩn
  standardWorkDays: 26,          // Công chuẩn / tháng
  probationSalaryRate: 0.85,     // LCB, LKN, LQL thử việc hưởng 85%
  allowancePercent: 0.10,        // Phụ cấp 10% LTT
  unionFeeMonthly: 50000,        // Phí công đoàn 50.000đ/tháng (chính thức)

  // Mức lương cơ bản mặc định (có thể cấu hình riêng cho từng nhân sự hoặc theo HrmSetting)
  defaultBaseSalary: 5681700,

  // Làm thêm giờ (OT)
  otHourlyRate: 50000,           // 50.000đ/giờ
  otBonusBracket1Hours: 8,       // Từ 8h đến dưới 16h: thưởng 150.000đ
  otBonusBracket1Amount: 150000,
  otBonusBracket2Hours: 16,      // Từ 16h đến 24h: thưởng 300.000đ
  otBonusBracket2Amount: 300000,
  otBonusBracket3Hours: 24,      // Trên 24h: thưởng 400.000đ
  otBonusBracket3Amount: 400000,

  // Phạt vi phạm
  consecutiveLateDaysTrigger: 3, // 3 ngày liên tiếp
  consecutiveLateFine: 100000,   // Phạt 100.000đ mỗi chuỗi 3 ngày

  // Tỷ lệ bảo hiểm xã hội (Nhân viên đóng)
  insuranceRateEmployee: 0.105,  // 8% BHXH + 1.5% BHYT + 1% BHTN = 10.5%
  insuranceRateEmployer: 0.215,  // Công ty đóng 21.5% (để báo cáo chi phí)

  // Giảm trừ gia cảnh thuế TNCN (Quy định mới: Bản thân 15.500.000đ, Người phụ thuộc 6.200.000đ)
  taxPersonalDeduction: 15500000, // Bản thân: 15.500.000đ
  taxDependentDeduction: 6200000, // Mỗi người phụ thuộc: 6.200.000đ
};

// ==========================================
// 3. Work Unit Conversion Engine
// ==========================================
// Quy tắc đã chốt:
// < 1h: 0 công
// 1h đến < 2.9h: 1/4 (0.25)
// 2.9h đến < 4.9h: 1/2 (0.5)
// 4.9h đến 6.5h: 3/4 (0.75) (đúng 6.5h vẫn là 3/4)
// > 6.5h: 1 công
export function calculateWorkUnits(workedHours: number): number {
  if (workedHours < 1.0) {
    return 0;
  }
  if (workedHours < 2.9) {
    return 0.25;
  }
  if (workedHours < 4.9) {
    return 0.5;
  }
  if (workedHours <= 6.5) {
    return 0.75;
  }
  return 1.0;
}

// ==========================================
// 4. OT Bonus Engine
// ==========================================
export function calculateOtBonus(
  totalOtHours: number,
  config = DEFAULT_HRM_CONFIG
): number {
  if (totalOtHours > config.otBonusBracket3Hours) {
    return config.otBonusBracket3Amount; // Hơn 24h: 400.000đ
  }
  if (totalOtHours >= config.otBonusBracket2Hours) {
    return config.otBonusBracket2Amount; // 16h - 24h: 300.000đ
  }
  if (totalOtHours >= config.otBonusBracket1Hours) {
    return config.otBonusBracket1Amount; // 8h - dưới 16h: 150.000đ
  }
  return 0;
}

// ==========================================
// 5. Personal Income Tax (Biểu lũy tiến từng phần)
// ==========================================
export function calculatePersonalIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  // Bậc 1: đến 5 triệu -> 5%
  if (taxableIncome <= 5000000) {
    return taxableIncome * 0.05;
  }
  // Bậc 2: 5tr - 10tr -> 10% - 250.000đ
  if (taxableIncome <= 10000000) {
    return taxableIncome * 0.1 - 250000;
  }
  // Bậc 3: 10tr - 18tr -> 15% - 750.000đ
  if (taxableIncome <= 18000000) {
    return taxableIncome * 0.15 - 750000;
  }
  // Bậc 4: 18tr - 32tr -> 20% - 1.650.000đ
  if (taxableIncome <= 32000000) {
    return taxableIncome * 0.2 - 1650000;
  }
  // Bậc 5: 32tr - 52tr -> 25% - 3.250.000đ
  if (taxableIncome <= 52000000) {
    return taxableIncome * 0.25 - 3250000;
  }
  // Bậc 6: 52tr - 80tr -> 30% - 5.850.000đ
  if (taxableIncome <= 80000000) {
    return taxableIncome * 0.3 - 5850000;
  }
  // Bậc 7: trên 80tr -> 35% - 9.850.000đ
  return taxableIncome * 0.35 - 9850000;
}

// ==========================================
// 6. Management Salary Level Amount
// ==========================================
export function getManagementSalary(level: number): number {
  switch (level) {
    case 1:
      return 1000000;
    case 2:
      return 2000000;
    case 3:
      return 3000000;
    default:
      return 0;
  }
}

// ==========================================
// 7. Phone Number Normalization
// ==========================================
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  // Loại bỏ tất cả ký tự không phải số (khoảng trắng, dấu chấm, dấu gạch ngang, ngoặc...)
  let cleaned = String(phone).trim().replace(/\D/g, '');

  // Xử lý mã quốc gia Việt Nam (+84 hoặc 84) về đầu số 0
  if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(2);
  } else if (!cleaned.startsWith('0') && (cleaned.length === 9 || cleaned.length === 10)) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}
