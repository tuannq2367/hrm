import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateWorkUnits, ViolationType, RequestType, RequestStatus } from '@snake/shared';
import * as bcrypt from 'bcryptjs';
import * as ExcelJS from 'exceljs';

function removeAccents(str: string): string {
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

export interface ParsedEmployeeBlock {
  attendanceCode: string;
  fullName: string;
  departmentName: string;
  days: {
    workDate: string; // YYYY-MM-DD
    dayOfWeek: string;
    checkIn?: string; // HH:mm
    checkOut?: string; // HH:mm
    allPunches: string[];
    isSinglePunch: boolean;
  }[];
}

@Injectable()
export class AttendanceParserService {
  constructor(private prisma: PrismaService) {}

  // Chuyển đổi file Excel (.xlsx / .xls) sang định dạng CSV dòng để tái sử dụng bộ phân tích
  async convertExcelBufferToCsv(buffer: Buffer): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('File Excel không chứa trang tính (worksheet) nào');
    }

    const lines: string[] = [];
    sheet.eachRow((row) => {
      const rowValues: string[] = [];
      for (let c = 1; c <= 16; c++) {
        const cell = row.getCell(c);
        const val = cell.value;
        if (val === null || val === undefined) {
          rowValues.push('');
        } else if (val instanceof Date) {
          const y = val.getFullYear();
          const m = String(val.getMonth() + 1).padStart(2, '0');
          const d = String(val.getDate()).padStart(2, '0');
          rowValues.push(`${y}-${m}-${d}`);
        } else if (typeof val === 'object' && (val as any).text) {
          rowValues.push(String((val as any).text).trim());
        } else {
          rowValues.push(String(val).trim());
        }
      }
      lines.push(rowValues.join(','));
    });

    return lines.join('\n');
  }

  // Phân tích nội dung file CSV/text từ phần mềm Ronald Jack
  parseRawText(content: string): ParsedEmployeeBlock[] {
    const lines = content.split(/\r?\n/);
    const blocks: ParsedEmployeeBlock[] = [];
    let currentBlock: ParsedEmployeeBlock | null = null;
    let readingDetails = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Tìm dòng thông tin nhân viên: "Mã nhân viên: 00002   Tên nhân viên: Nguyen Van Cuong"
      const empMatch = line.match(/Mã nhân viên:\s*(\S+)\s+Tên nhân viên:\s*([^\t,]+?)(?:\s+Phòng ban:|\s*,|$)/i);
      if (empMatch) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          attendanceCode: empMatch[1].trim(),
          fullName: empMatch[2].trim(),
          departmentName: '',
          days: [],
        };
        readingDetails = false;
        continue;
      }

      if (line.startsWith('Chi tiết')) {
        readingDetails = true;
        continue;
      }

      // Bỏ qua dòng tiêu đề cột
      if (line.startsWith('Ngày,Thứ') || line.startsWith(',,Vào,Ra')) {
        continue;
      }

      // Đọc dòng dữ liệu ngày: "2026-09-03,Năm,07:37,17:14,,,,,"
      const dayMatch = line.match(/^(\d{4}-\d{2}-\d{2}),([^,]*),(.*)$/);
      if (currentBlock && dayMatch) {
        const workDate = dayMatch[1];
        const dayOfWeek = dayMatch[2];
        const restCols = dayMatch[3].split(',');

        // 6 cột quẹt thẻ: Vào 1, Ra 1, Vào 2, Ra 2, Vào 3, Ra 3
        const punches: string[] = [];
        for (let col = 0; col < 6; col++) {
          const val = restCols[col]?.trim();
          if (val && /^\d{1,2}:\d{2}$/.test(val)) {
            punches.push(val.length === 4 ? `0${val}` : val);
          }
        }

        let checkIn: string | undefined;
        let checkOut: string | undefined;
        let isSinglePunch = false;

        if (punches.length === 1) {
          // Chỉ có 1 lần quẹt
          checkIn = punches[0];
          isSinglePunch = true;
        } else if (punches.length >= 2) {
          // Lấy lần đầu làm checkIn, lần cuối làm checkOut
          punches.sort();
          checkIn = punches[0];
          checkOut = punches[punches.length - 1];
        }

        currentBlock.days.push({
          workDate,
          dayOfWeek,
          checkIn,
          checkOut,
          allPunches: punches,
          isSinglePunch,
        });
      }
    }

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  // Chuyển đổi giờ HH:mm sang phút trong ngày
  private timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  // Tính số giờ làm thực tế nằm trong khung quy định
  private calculateDayWorkedHours(
    checkInStr: string,
    checkOutStr: string,
    isThroughLunch = false,
  ): { workedHours: number; lateMinutes: number; earlyMinutes: number } {
    const inMin = this.timeToMinutes(checkInStr);
    const outMin = this.timeToMinutes(checkOutStr);

    if (outMin <= inMin) {
      return { workedHours: 0, lateMinutes: 0, earlyMinutes: 0 };
    }

    // Khung làm việc
    // Buổi sáng: 08:00 (480) - 12:00 (720)
    // Buổi chiều: 13:00 (780) - 17:00 (1020)
    // Nếu làm thông trưa: 08:00 (480) - 16:00 (960)
    let totalWorkedMinutes = 0;

    if (isThroughLunch) {
      const start = Math.max(inMin, 480);
      const end = Math.min(outMin, 960);
      if (end > start) totalWorkedMinutes += end - start;
    } else {
      // Sáng
      const mStart = Math.max(inMin, 480);
      const mEnd = Math.min(outMin, 720);
      if (mEnd > mStart) totalWorkedMinutes += mEnd - mStart;

      // Chiều
      const aStart = Math.max(inMin, 780);
      const aEnd = Math.min(outMin, 1020);
      if (aEnd > aStart) totalWorkedMinutes += aEnd - aStart;
    }

    // Tính đi muộn: Vào sau 08:15 (495 phút)
    let lateMinutes = 0;
    if (inMin > 495) {
      lateMinutes = inMin - 480;
    }

    // Tính về sớm:
    // Mốc chuẩn: 17:00 (1020) nếu bình thường, 16:00 (960) nếu làm thông trưa
    const expectedOut = isThroughLunch ? 960 : 1020;
    let earlyMinutes = 0;
    if (outMin < expectedOut) {
      earlyMinutes = expectedOut - outMin;
    }

    return {
      workedHours: totalWorkedMinutes / 60,
      lateMinutes,
      earlyMinutes,
    };
  }

  // Import và tính công tự động vào Cơ sở dữ liệu
  async processAndSaveAttendance(
    rawContent: string,
    importedBy: string,
    fileName: string,
    clearExistingMonth = false,
  ) {
    // Đảm bảo cột leaveUnits luôn tồn tại kể cả khi chạy trên database cũ
    await this.prisma.$executeRawUnsafe(`ALTER TABLE "AttendanceDay" ADD COLUMN "leaveUnits" REAL DEFAULT 0;`).catch(() => {});

    const blocks = this.parseRawText(rawContent);
    const results = {
      totalEmployeesInFile: blocks.length,
      employeesProcessed: 0,
      daysSaved: 0,
      missingPunchCount: 0,
      violationsDetected: 0,
    };

    // Nếu người dùng chọn xóa dữ liệu chấm công cũ để tính công lại
    // (Giữ nguyên toàn bộ các đơn xin phép của nhân viên đã duyệt)
    if (clearExistingMonth && blocks.length > 0) {
      const distinctMonths = new Set<string>();
      for (const block of blocks) {
        for (const day of block.days) {
          if (day.workDate && day.workDate.length >= 7) {
            distinctMonths.add(day.workDate.slice(0, 7));
          }
        }
      }

      for (const month of distinctMonths) {
        const [year, monthNum] = month.split('-').map(Number);
        const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0) - 24 * 60 * 60 * 1000);
        const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
        const endDate = new Date(Date.UTC(year, monthNum - 1, lastDay, 23, 59, 59, 999) + 24 * 60 * 60 * 1000);

        await this.prisma.attendanceDay.deleteMany({
          where: {
            workDate: { gte: startDate, lte: endDate },
          },
        });
        await this.prisma.violationRecord.deleteMany({
          where: { month },
        });
      }
    }

    // Tạo bản ghi AttendanceImport
    const importRecord = await this.prisma.attendanceImport.create({
      data: {
        fileName,
        importedBy,
        totalRows: blocks.length,
        successRows: 0,
      },
    });

    // Tải trước danh sách nhân sự hiện có để khớp thông minh (tránh N truy vấn database)
    const allEmployees = await this.prisma.employee.findMany({
      include: { user: true },
    });

    for (const block of blocks) {
      const rawCode = block.attendanceCode.trim();
      const intCode = String(parseInt(rawCode, 10));
      const normName = removeAccents(block.fullName);
      const nameWords = normName.split(' ').filter(Boolean);
      const firstName = nameWords[nameWords.length - 1];

      // 1. Khớp chính xác toàn bộ Họ Tên (không dấu)
      let emp = allEmployees.find(
        (e) => removeAccents(e.fullName) === normName && e.status !== 'RESIGNED',
      );
      if (!emp) {
        emp = allEmployees.find((e) => removeAccents(e.fullName) === normName);
      }

      // 2. Khớp theo Tên bị cắt ngắn bởi máy Ronald Jack (VD: "Nguyen Thi Thu Huo" -> "Nguyễn Thị Thu Hương")
      if (!emp) {
        emp = allEmployees.find((e) => {
          const eNorm = removeAccents(e.fullName);
          return (
            (eNorm.startsWith(normName) || normName.startsWith(eNorm)) &&
            eNorm.split(' ')[0] === nameWords[0] &&
            e.status !== 'RESIGNED'
          );
        });
      }

      // 3. Khớp 2 từ cuối của Họ Tên (VD: "Tri Hieu" -> "Vuong Tri Hieu")
      if (!emp && nameWords.length >= 2) {
        const lastTwo = nameWords.slice(-2).join(' ');
        const candidates = allEmployees.filter(
          (e) => removeAccents(e.fullName).endsWith(lastTwo) && e.status !== 'RESIGNED',
        );
        if (candidates.length === 1) {
          emp = candidates[0];
        }
      }

      // 4. Khớp theo Mã chấm công NẾU tên chính (từ cuối) trùng khớp hoàn toàn
      if (!emp) {
        emp = allEmployees.find((e) => {
          const isCodeMatch = e.attendanceCode === rawCode || e.attendanceCode === intCode;
          if (!isCodeMatch) return false;
          const eNorm = removeAccents(e.fullName);
          const eWords = eNorm.split(' ').filter(Boolean);
          const eFirst = eWords[eWords.length - 1];
          return eFirst === firstName;
        });
      }

      // 5. Khớp theo Mã nhân viên (e.g. NV173 or NV007) NẾU tên chính trùng khớp
      if (!emp) {
        emp = allEmployees.find((e) => {
          const isEmpCodeMatch =
            e.employeeCode === 'NV' + rawCode ||
            e.employeeCode === 'NV' + intCode ||
            e.employeeCode === 'NV' + intCode.padStart(3, '0') ||
            e.employeeCode === 'NV' + intCode.padStart(4, '0');
          if (!isEmpCodeMatch) return false;
          const eNorm = removeAccents(e.fullName);
          const eWords = eNorm.split(' ').filter(Boolean);
          const eFirst = eWords[eWords.length - 1];
          return eFirst === firstName;
        });
      }

      // 6. Nếu tìm thấy nhân sự, đồng bộ lại attendanceCode về mã chuẩn của máy nếu đang khác
      if (emp) {
        if (emp.attendanceCode !== intCode && emp.attendanceCode !== rawCode) {
          await this.prisma.employee.update({
            where: { id: emp.id },
            data: { attendanceCode: intCode },
          });
          emp.attendanceCode = intCode;
        }
      } else {
        // Tự động tạo nhân sự nếu chưa có trong DB để tiết kiệm thời gian cho HR
        // Sinh mã NV tiếp theo chuẩn NVxxx (VD: NV180, NV181, ...)
        const existingNumbers = allEmployees
          .map((e) => {
            const m = e.employeeCode.match(/^NV(\d+)$/i);
            return m ? parseInt(m[1], 10) : 0;
          })
          .filter((n) => !isNaN(n) && n > 0 && n < 9000);
        const nextNum = (existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0) + 1;
        const autoEmpCode = `NV${String(nextNum).padStart(3, '0')}`;

        const autoPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
        const defaultPassword = autoPhone.slice(-6);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);

        const newUser = await this.prisma.user.create({
          data: {
            phone: autoPhone,
            passwordHash,
            role: 'EMPLOYEE',
            mustChangePassword: true,
            isActive: true,
          },
        });

        emp = await this.prisma.employee.create({
          data: {
            employeeCode: autoEmpCode,
            attendanceCode: intCode,
            fullName: block.fullName,
            phone: autoPhone,
            status: 'OFFICIAL',
            joinDate: new Date('2026-09-01T00:00:00.000Z'),
            userId: newUser.id,
          },
          include: { user: true },
        });

        allEmployees.push(emp);

        // Tạo mức lương thỏa thuận mặc định 10 triệu
        await this.prisma.salaryProfile.create({
          data: {
            employeeId: emp.id,
            agreedSalary: 10000000,
            managementLevel: 0,
            effectiveDate: new Date('2026-09-01T00:00:00.000Z'),
            note: 'Khởi tạo tự động từ file chấm công',
          },
        });
      }

      results.employeesProcessed++;

      // 2. Lấy tất cả đơn đã duyệt của nhân viên trong tháng
      const requests = await this.prisma.request.findMany({
        where: {
          employeeId: emp.id,
          status: RequestStatus.APPROVED,
        },
      });

      // 3. Xử lý từng ngày
      const monthlyDaysForViolationCheck: {
        date: string;
        isWorkingDay: boolean;
        isLate: boolean;
        isEarlyGrace: boolean; // Về sớm 5-10p
      }[] = [];

      for (const day of block.days) {
        const dateObj = new Date(`${day.workDate}T00:00:00.000Z`);
        const dayOfWeek = dateObj.getDay(); // 0 là Chủ nhật

        // Tìm đơn trong ngày (hỗ trợ cả UTC và định dạng thời gian máy chủ)
        const dayReqs = requests.filter((r) => {
          if (!r.targetDate) return false;
          const iso = r.targetDate.toISOString().slice(0, 10);
          if (iso === day.workDate) return true;
          const y = r.targetDate.getFullYear();
          const m = String(r.targetDate.getMonth() + 1).padStart(2, '0');
          const d = String(r.targetDate.getDate()).padStart(2, '0');
          if (`${y}-${m}-${d}` === day.workDate) return true;
          const utcY = r.targetDate.getUTCFullYear();
          const utcM = String(r.targetDate.getUTCMonth() + 1).padStart(2, '0');
          const utcD = String(r.targetDate.getUTCDate()).padStart(2, '0');
          return `${utcY}-${utcM}-${utcD}` === day.workDate;
        });

        const isThroughLunch = dayReqs.some((r) => r.type === RequestType.THROUGH_LUNCH);
        const exemptLateReq = dayReqs.find((r) => r.type === RequestType.LATE_EARLY_EXEMPT);
        const makeupLateReq = dayReqs.find((r) => r.type === RequestType.LATE_EARLY_MAKEUP);
        const missingPunchReq = dayReqs.find((r) => r.type === RequestType.MISSING_PUNCH);
        const otReq = dayReqs.find((r) => r.type === RequestType.OT);
        const leaveReq = dayReqs.find((r) => r.type === RequestType.LEAVE);

        // Đơn giải trình quên thẻ (1.0, 0.75, 0.5, 0.25 công)
        const punchUnits = missingPunchReq
          ? (missingPunchReq.minutes ? Number((missingPunchReq.minutes / 480).toFixed(2)) : 1.0)
          : 0;

        // Đơn nghỉ phép năm hưởng lương (1.0 hoặc 0.5 công phép)
        const leaveUnitsReq = leaveReq
          ? (leaveReq.minutes ? Number((leaveReq.minutes / 480).toFixed(2)) : 1.0)
          : 0;

        let checkInDate: Date | null = null;
        let checkOutDate: Date | null = null;
        let workedHours = 0;
        let workUnits = 0; // Công đi làm thực tế
        let leaveUnits = 0; // Công nghỉ phép hưởng lương
        let lateMinutes = 0;
        let earlyMinutes = 0;
        let isLate = false;
        let isEarly = false;
        let isMissingPunch = false;
        let otHours = 0;

        if (day.checkIn) {
          checkInDate = new Date(`${day.workDate}T${day.checkIn}:00.000Z`);
        }
        if (day.checkOut) {
          checkOutDate = new Date(`${day.workDate}T${day.checkOut}:00.000Z`);
        }

        // Tính công làm thêm giờ (OT) nếu có đơn đăng ký đã duyệt
        if (otReq) {
          const registeredOtHours = otReq.minutes ? Number((otReq.minutes / 60).toFixed(2)) : 0;
          if (dayOfWeek === 0) {
            // Ngày Chủ nhật: có quẹt thẻ tính theo thời gian thực tế hoặc đơn đăng ký
            if (day.checkIn && day.checkOut) {
              const res = this.calculateDayWorkedHours(day.checkIn, day.checkOut, false);
              otHours = Math.max(registeredOtHours, res.workedHours);
            } else {
              otHours = registeredOtHours;
            }
          } else {
            // Ngày thường: nếu có quẹt thẻ ra sau 17:00
            if (day.checkOut && this.timeToMinutes(day.checkOut) > 1020) {
              const actualOtHours = (this.timeToMinutes(day.checkOut) - 1020) / 60;
              otHours = Math.max(registeredOtHours, actualOtHours);
            } else {
              // Nếu quẹt thẻ ra lúc 17h hoặc quên quẹt về nhưng đã có đơn OT được duyệt -> bảo đảm tính đủ giờ OT
              otHours = registeredOtHours;
            }
          }
        }

        // Ngày chủ nhật: mặc định 0 công thực tế (công OT đã tính ở trên)
        if (dayOfWeek === 0) {
          // Chủ nhật không tính công thực tế thường
          workUnits = 0;
        } else if (day.isSinglePunch || (!day.checkIn && !day.checkOut)) {
          // Thiếu quẹt thẻ hoặc vắng mặt
          if (day.isSinglePunch) {
            if (missingPunchReq) {
              // Có giải trình quên thẻ được duyệt -> tính là công thực tế, không tính lỗi quên quẹt thẻ
              isMissingPunch = false;
              workUnits = punchUnits;
              workedHours = punchUnits * 8;
            } else if (leaveReq) {
              // Có đơn nghỉ phép năm đã duyệt -> tính vào công phép, không báo lỗi quên thẻ
              isMissingPunch = false;
              leaveUnits = leaveUnitsReq;
              workUnits = 0;
            } else {
              isMissingPunch = true;
              results.missingPunchCount++;
            }
          } else if (missingPunchReq) {
            // Không có quẹt thẻ nào nhưng có đơn giải trình quên thẻ
            isMissingPunch = false;
            workUnits = punchUnits;
            workedHours = punchUnits * 8;
          } else if (leaveReq) {
            // Không quẹt thẻ nhưng có đơn xin nghỉ phép năm
            leaveUnits = leaveUnitsReq;
            workUnits = 0;
          }
        } else if (day.checkIn && day.checkOut) {
          // Có cả giờ vào và giờ ra
          const res = this.calculateDayWorkedHours(day.checkIn, day.checkOut, isThroughLunch);
          workedHours = res.workedHours;
          lateMinutes = res.lateMinutes;
          earlyMinutes = res.earlyMinutes;

          // 1. Khi xin đi muộn, về sớm không cần làm bù có sự chấp nhận:
          // Phần giờ đó sẽ được cộng thêm vào thời gian làm để đảm bảo tính đúng công trong ngày
          if (exemptLateReq) {
            const exemptMins = exemptLateReq.minutes || (lateMinutes + earlyMinutes) || 60;
            workedHours += exemptMins / 60;
            lateMinutes = Math.max(0, lateMinutes - exemptMins);
            earlyMinutes = 0;
          }

          // 2. Khi xin phép về sớm, đi muộn có làm bù:
          // Thời gian đăng ký làm bù được bù trừ với thời gian làm việc để bảo đảm công
          if (makeupLateReq) {
            const makeupMins = makeupLateReq.minutes || (lateMinutes + earlyMinutes) || 60;
            workedHours += makeupMins / 60;
            lateMinutes = Math.max(0, lateMinutes - makeupMins);
            earlyMinutes = 0;
          }

          // Khi nhân sự có phiếu xin đi sớm, về muộn thì sẽ KHÔNG bị cảnh báo đi muộn/về sớm
          if (lateMinutes > 0 && !exemptLateReq && !makeupLateReq) {
            isLate = true;
          }
          if (earlyMinutes > 0 && !exemptLateReq && !makeupLateReq) {
            isEarly = true;
          }

          // Tính công thực tế dựa trên thời gian làm việc (đã cộng bù thời gian được duyệt)
          workUnits = calculateWorkUnits(workedHours);

          // Nếu có giải trình quên thẻ được duyệt
          if (missingPunchReq) {
            isMissingPunch = false;
            isLate = false;
            isEarly = false;
            workedHours = Math.max(workedHours, punchUnits * 8);
            workUnits = Math.max(workUnits, punchUnits);
          }

          // Nếu có nghỉ phép năm (tách riêng công phép và công thực tế)
          if (leaveReq) {
            leaveUnits = leaveUnitsReq;
            if (leaveUnits >= 1.0) {
              // Nghỉ phép cả ngày thì công thực tế = 0 (công phép = 1.0)
              workUnits = 0;
            } else {
              // Nghỉ phép nửa ngày (0.5 ngày): công thực tế tối đa 0.5
              workUnits = Math.min(workUnits, Number((1.0 - leaveUnits).toFixed(2)));
            }
          }
        }

        // Bảo toàn các điều chỉnh công thủ công của Admin nếu có trước đó
        const existingDay = await this.prisma.attendanceDay.findUnique({
          where: {
            employeeId_workDate: {
              employeeId: emp.id,
              workDate: dateObj,
            },
          },
        });

        let finalWorkUnits = workUnits;
        let finalOtHours = otHours;
        let finalLeaveUnits = leaveUnits;
        let isOverridden = false;
        let overrideReason = null;

        if (existingDay?.isManualOverridden) {
          isOverridden = true;
          overrideReason = existingDay.overrideReason;
          finalWorkUnits = Math.max(existingDay.workUnits, workUnits);
          finalOtHours = Math.max(existingDay.otHours, otHours);
          finalLeaveUnits = Math.max(existingDay.leaveUnits || 0, leaveUnits);
          isMissingPunch = false;
        }

        // Lưu / Cập nhật AttendanceDay
        await this.prisma.attendanceDay.upsert({
          where: {
            employeeId_workDate: {
              employeeId: emp.id,
              workDate: dateObj,
            },
          },
          update: {
            checkIn: checkInDate || existingDay?.checkIn,
            checkOut: checkOutDate || existingDay?.checkOut,
            workedHours: Math.max(workedHours, existingDay?.workedHours || 0),
            workUnits: finalWorkUnits,
            leaveUnits: finalLeaveUnits,
            lateMinutes,
            earlyMinutes,
            isLate: isOverridden ? false : isLate,
            isEarly: isOverridden ? false : isEarly,
            isMissingPunch: isOverridden ? false : isMissingPunch,
            isThroughLunch,
            otHours: finalOtHours,
            isManualOverridden: isOverridden || Boolean(missingPunchReq),
            overrideReason: overrideReason || (missingPunchReq ? `Giải trình quên thẻ: ${missingPunchReq.reason}` : null),
          },
          create: {
            employeeId: emp.id,
            workDate: dateObj,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            workedHours,
            workUnits: finalWorkUnits,
            leaveUnits: finalLeaveUnits,
            lateMinutes,
            earlyMinutes,
            isLate,
            isEarly,
            isMissingPunch,
            isThroughLunch,
            otHours: finalOtHours,
            isManualOverridden: Boolean(missingPunchReq),
            overrideReason: missingPunchReq ? `Giải trình quên thẻ: ${missingPunchReq.reason}` : null,
          },
        });

        results.daysSaved++;

        // Ghi nhận theo dõi vi phạm:
        // Nếu đã có đơn xin đi muộn/về sớm/quên thẻ được duyệt thì không bị cảnh báo vi phạm
        if (dayOfWeek !== 0) {
          const hasApprovedGrace = Boolean(exemptLateReq || makeupLateReq || missingPunchReq);
          const isEarlyGrace = !hasApprovedGrace && earlyMinutes >= 5 && earlyMinutes <= 10;
          const finalLate = !hasApprovedGrace && isLate;
          monthlyDaysForViolationCheck.push({
            date: day.workDate,
            isWorkingDay: true,
            isLate: finalLate,
            isEarlyGrace,
          });
        }
      }

      // 4. Kiểm tra Vi phạm Đi muộn 3 ngày liên tiếp
      let consecutiveLate = 0;
      let lateViolationsCount = 0;
      const targetMonth = block.days[0]?.workDate?.slice(0, 7) || '2026-09';

      for (const d of monthlyDaysForViolationCheck) {
        if (d.isLate) {
          consecutiveLate++;
          if (consecutiveLate === 3) {
            lateViolationsCount++;
            consecutiveLate = 0; // Đủ chuỗi 3 ngày thì đếm lại từ đầu
          }
        } else {
          consecutiveLate = 0; // Bị ngắt chuỗi
        }
      }

      if (lateViolationsCount > 0) {
        results.violationsDetected += lateViolationsCount;
        await this.prisma.violationRecord.create({
          data: {
            employeeId: emp.id,
            month: targetMonth,
            type: ViolationType.LATE_3_DAYS,
            details: `Đi muộn 3 ngày làm việc liên tiếp (${lateViolationsCount} lần trong tháng)`,
            fineAmount: lateViolationsCount * 100000,
            isConfirmed: false,
          },
        });
      }

      // 5. Kiểm tra Về sớm việc gấp quá 7 lần/tháng
      const totalEarlyGrace = monthlyDaysForViolationCheck.filter((d) => d.isEarlyGrace).length;
      if (totalEarlyGrace > 7) {
        results.violationsDetected++;
        await this.prisma.violationRecord.create({
          data: {
            employeeId: emp.id,
            month: targetMonth,
            type: ViolationType.EARLY_EXCEED_7,
            details: `Về sớm 5-10 phút ${totalEarlyGrace} lần trong tháng (vượt hạn mức 7 lần)`,
            fineAmount: 0, // Không phạt tiền, đưa vào danh sách nêu tên nhắc nhở
            isConfirmed: false,
          },
        });
      }
    }

    await this.prisma.attendanceImport.update({
      where: { id: importRecord.id },
      data: { successRows: results.employeesProcessed },
    });

    return results;
  }
}
