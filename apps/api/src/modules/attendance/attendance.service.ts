import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateWorkUnits, ViolationType, RequestType, RequestStatus } from '@snake/shared';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // Lấy bảng công tháng của tất cả nhân viên (hoặc theo phòng ban / nhân viên)
  async getMonthlyTimesheet(month: string, departmentId?: string, employeeId?: string) {
    // month format: YYYY-MM
    const [year, monthNum] = month.split('-').map(Number);
    // Mốc thời gian UTC (có dự phòng 10 tiếng cho các bản ghi lưu múi giờ địa phương GMT+7)
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0) - 10 * 60 * 60 * 1000);
    const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const endDate = new Date(Date.UTC(year, monthNum - 1, lastDay, 23, 59, 59, 999));

    const where: any = {
      status: { in: ['PROBATION', 'OFFICIAL'] },
    };
    if (employeeId) {
      where.id = employeeId;
    } else if (departmentId) {
      where.departmentId = departmentId;
    }

    const employees = await this.prisma.employee.findMany({
      where,
      include: {
        department: true,
        position: true,
        kpiEvaluations: {
          where: { month },
        },
        salaryProfiles: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
        attendanceDays: {
          where: {
            workDate: { gte: startDate, lte: endDate },
          },
          orderBy: { workDate: 'asc' },
        },
      },
      orderBy: { employeeCode: 'asc' },
    });

    return employees.map((emp) => {
      const kpiEval = emp.kpiEvaluations?.[0];
      const kpiPercent = kpiEval?.kpiPercent !== undefined && kpiEval?.kpiPercent !== null
        ? kpiEval.kpiPercent
        : 100;
      const kpiSalary = emp.salaryProfiles?.[0]?.kpiSalary ?? (emp as any).kpiSalary ?? 0;

      return {
        ...emp,
        kpiPercent,
        kpiSalary,
        kpiNote: kpiEval?.notes || '',
      };
    });
  }

  // Xóa toàn bộ dữ liệu chấm công máy của 1 tháng (AttendanceDay & ViolationRecord) để import và tính công lại
  // Tuyệt đối KHÔNG xóa đơn xin phép (Request), nợ làm bù (MakeupDebt) hay quỹ phép (LeaveBalance)
  async clearMonthlyAttendance(month: string) {
    if (!month || !month.match(/^\d{4}-\d{2}$/)) {
      throw new BadRequestException('Tháng không đúng định dạng YYYY-MM');
    }

    const [year, monthNum] = month.split('-').map(Number);
    // Biên độ rộng đảm bảo dọn sạch các bản ghi trong tháng theo UTC hoặc GMT+7
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0) - 24 * 60 * 60 * 1000);
    const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const endDate = new Date(Date.UTC(year, monthNum - 1, lastDay, 23, 59, 59, 999) + 24 * 60 * 60 * 1000);

    const deletedDays = await this.prisma.attendanceDay.deleteMany({
      where: {
        workDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const deletedViolations = await this.prisma.violationRecord.deleteMany({
      where: {
        month,
      },
    });

    return {
      success: true,
      month,
      deletedDaysCount: deletedDays.count,
      deletedViolationsCount: deletedViolations.count,
      message: `Đã xóa ${deletedDays.count} bản ghi chấm công và ${deletedViolations.count} vi phạm của tháng ${month}. Toàn bộ đơn xin phép được giữ nguyên vẹn.`,
    };
  }

  // Admin ghi nhận / điều chỉnh công thủ công (ví dụ quên thẻ chấm công, bổ sung tăng ca)
  async overrideAttendanceDay(
    employeeId: string,
    data: {
      workDate: string;
      workUnits?: number; // Công thực tế: 0, 0.25, 0.5, 0.75, 1.0
      leaveUnits?: number; // Công phép: 0, 0.5, 1.0
      otHours?: number;   // Số giờ tăng ca
      checkIn?: string;
      checkOut?: string;
      overrideReason: string;
    },
  ) {
    if (!employeeId || employeeId === 'undefined') {
      throw new BadRequestException('Mã nhân viên không hợp lệ');
    }

    // Đảm bảo cột leaveUnits luôn tồn tại kể cả khi chạy trên database cũ
    await this.prisma.$executeRawUnsafe(`ALTER TABLE "AttendanceDay" ADD COLUMN "leaveUnits" REAL DEFAULT 0;`).catch(() => {});

    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!emp) {
      throw new BadRequestException('Không tìm thấy nhân viên trên hệ thống');
    }

    if (!data.overrideReason || !data.overrideReason.trim()) {
      throw new BadRequestException('Bắt buộc phải nhập lý do điều chỉnh công');
    }

    if (!data.workDate || typeof data.workDate !== 'string') {
      throw new BadRequestException('Vui lòng chọn ngày điều chỉnh hợp lệ');
    }

    const dateStr = data.workDate.slice(0, 10);
    const workDate = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(workDate.getTime())) {
      throw new BadRequestException('Ngày điều chỉnh không hợp lệ');
    }

    const workUnits = data.workUnits !== undefined ? Number(data.workUnits) : 1.0;
    const leaveUnits = data.leaveUnits !== undefined ? Math.max(0, Number(data.leaveUnits)) : 0;
    const otHours = data.otHours !== undefined ? Math.max(0, Number(data.otHours)) : 0;

    let checkInDate: Date | null = null;
    let checkOutDate: Date | null = null;
    if (data.checkIn && typeof data.checkIn === 'string' && data.checkIn.trim()) {
      const match = data.checkIn.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const hh = match[1].padStart(2, '0');
        const mm = match[2];
        const parsed = new Date(`${dateStr}T${hh}:${mm}:00.000Z`);
        if (!isNaN(parsed.getTime())) {
          checkInDate = parsed;
        }
      }
    }
    if (data.checkOut && typeof data.checkOut === 'string' && data.checkOut.trim()) {
      const match = data.checkOut.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const hh = match[1].padStart(2, '0');
        const mm = match[2];
        const parsed = new Date(`${dateStr}T${hh}:${mm}:00.000Z`);
        if (!isNaN(parsed.getTime())) {
          checkOutDate = parsed;
        }
      }
    }

    let workedHours = workUnits * 8;
    if (checkInDate && checkOutDate) {
      const diffMs = checkOutDate.getTime() - checkInDate.getTime();
      if (diffMs > 0) {
        workedHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      }
    }

    const updateFields: any = {
      workUnits,
      leaveUnits,
      otHours,
      workedHours,
      isManualOverridden: true,
      overrideReason: data.overrideReason.trim(),
      isMissingPunch: false,
    };
    if (checkInDate) updateFields.checkIn = checkInDate;
    if (checkOutDate) updateFields.checkOut = checkOutDate;

    const result = await this.prisma.attendanceDay.upsert({
      where: {
        employeeId_workDate: {
          employeeId,
          workDate,
        },
      },
      update: updateFields,
      create: {
        employeeId,
        workDate,
        workUnits,
        leaveUnits,
        otHours,
        workedHours,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        isManualOverridden: true,
        overrideReason: data.overrideReason.trim(),
        isMissingPunch: false,
      },
    });

    // 1. TỰ ĐỘNG TẠO / CẬP NHẬT PHIẾU GIẢI TRÌNH QUÊN QUẸT THẺ (Nếu sửa công cho trường hợp quên thẻ)
    if (workUnits > 0) {
      const punchMinutes = Math.round(workUnits * 480);
      const existingMissingReq = await this.prisma.request.findFirst({
        where: {
          employeeId,
          type: RequestType.MISSING_PUNCH,
          targetDate: workDate,
        },
      });

      if (!existingMissingReq) {
        await this.prisma.request.create({
          data: {
            employeeId,
            type: RequestType.MISSING_PUNCH,
            status: RequestStatus.APPROVED,
            targetDate: workDate,
            minutes: punchMinutes,
            reason: data.overrideReason.trim(),
            adminNote: 'Admin sửa/điều chỉnh công trực tiếp (tự động tạo phiếu giải trình quên quẹt thẻ)',
            approvedBy: 'Admin',
            approvedAt: new Date(),
          },
        });
      } else {
        await this.prisma.request.update({
          where: { id: existingMissingReq.id },
          data: {
            status: RequestStatus.APPROVED,
            minutes: punchMinutes,
            reason: data.overrideReason.trim(),
            adminNote: 'Admin sửa/điều chỉnh công trực tiếp (tự động cập nhật duyệt phiếu)',
            approvedBy: 'Admin',
            approvedAt: new Date(),
          },
        });
      }
    }

    // 2. TỰ ĐỘNG TẠO / CẬP NHẬT PHIẾU LÀM THÊM GIỜ (OT) nếu có điều chỉnh tăng ca
    if (otHours > 0) {
      const otMinutes = Math.round(otHours * 60);
      const existingOtReq = await this.prisma.request.findFirst({
        where: {
          employeeId,
          type: RequestType.OT,
          targetDate: workDate,
        },
      });

      if (!existingOtReq) {
        await this.prisma.request.create({
          data: {
            employeeId,
            type: RequestType.OT,
            status: RequestStatus.APPROVED,
            targetDate: workDate,
            minutes: otMinutes,
            reason: data.overrideReason.trim() || 'Admin bổ sung giờ làm thêm (OT)',
            adminNote: 'Admin điều chỉnh công trực tiếp (tự động tạo phiếu làm thêm giờ OT)',
            approvedBy: 'Admin',
            approvedAt: new Date(),
          },
        });
      } else {
        await this.prisma.request.update({
          where: { id: existingOtReq.id },
          data: {
            status: RequestStatus.APPROVED,
            minutes: otMinutes,
            adminNote: 'Admin điều chỉnh công trực tiếp (tự động duyệt phiếu OT)',
            approvedBy: 'Admin',
            approvedAt: new Date(),
          },
        });
      }
    }

    // 3. TỰ ĐỘNG TẠO PHIẾU NGHỈ PHÉP NĂM nếu có chỉnh ngày phép
    if (leaveUnits > 0) {
      const leaveMinutes = Math.round(leaveUnits * 480);
      const existingLeaveReq = await this.prisma.request.findFirst({
        where: {
          employeeId,
          type: RequestType.LEAVE,
          targetDate: workDate,
        },
      });

      if (!existingLeaveReq) {
        await this.prisma.request.create({
          data: {
            employeeId,
            type: RequestType.LEAVE,
            status: RequestStatus.APPROVED,
            targetDate: workDate,
            minutes: leaveMinutes,
            reason: data.overrideReason.trim() || 'Admin bổ sung ngày nghỉ phép năm',
            adminNote: 'Admin điều chỉnh công trực tiếp (tự động tạo phiếu nghỉ phép)',
            approvedBy: 'Admin',
            approvedAt: new Date(),
          },
        });
      }
    }

    return result;
  }

  // Trưởng bộ phận / Admin chốt công tháng cho nhân viên nhóm bán hàng (hoặc nhân viên không quẹt thẻ)
  async submitMonthlyStoreSalesAttendance(
    month: string, // YYYY-MM
    entries: {
      employeeId: string;
      workUnits: number; // Tổng số ngày công thực tế trong tháng
      otHours?: number; // Số giờ tăng ca
      note?: string; // Ghi chú chốt công
    }[],
    reportedBy: string,
  ) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Tháng không hợp lệ (định dạng YYYY-MM)');
    }
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      throw new BadRequestException('Vui lòng gửi danh sách nhân sự cần chốt công');
    }

    const [year, monthNum] = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0) - 10 * 60 * 60 * 1000);
    const endDate = new Date(Date.UTC(year, monthNum - 1, lastDay, 23, 59, 59, 999));

    const results = [];

    for (const item of entries) {
      const emp = await this.prisma.employee.findUnique({
        where: { id: item.employeeId },
      });
      if (!emp) continue;

      const totalUnits = Math.max(0, Number(item.workUnits) || 0);
      const totalOt = Math.max(0, Number(item.otHours) || 0);
      const reason = item.note?.trim() || `Trưởng bộ phận chốt công tháng ${month} (báo công)`;

      // Xóa các bản ghi công cũ trong tháng của nhân sự này để thay thế bằng công chốt mới
      await this.prisma.attendanceDay.deleteMany({
        where: {
          employeeId: emp.id,
          workDate: { gte: startDate, lte: endDate },
        },
      });

      // Tạo các bản ghi AttendanceDay theo các ngày trong tháng sao cho tổng workUnits = totalUnits
      let remainingUnits = totalUnits;
      let remainingOt = totalOt;

      for (let day = 1; day <= lastDay; day++) {
        const dateObj = new Date(Date.UTC(year, monthNum - 1, day, 0, 0, 0, 0));

        let dayUnit = 0;
        if (remainingUnits > 0) {
          dayUnit = Math.min(1.0, remainingUnits);
          remainingUnits = Math.round((remainingUnits - dayUnit) * 100) / 100;
        }

        let dayOt = 0;
        if (remainingOt > 0 && dayUnit > 0) {
          dayOt = Math.min(4.0, remainingOt);
          remainingOt = Math.round((remainingOt - dayOt) * 100) / 100;
        }

        if (dayUnit > 0 || dayOt > 0 || day === 1) {
          await this.prisma.attendanceDay.create({
            data: {
              employeeId: emp.id,
              workDate: dateObj,
              workUnits: dayUnit,
              otHours: dayOt,
              workedHours: dayUnit * 8,
              isManualOverridden: true,
              overrideReason: reason,
              isMissingPunch: false,
            },
          });
        }
      }

      if (remainingUnits > 0) {
        const lastDateObj = new Date(Date.UTC(year, monthNum - 1, lastDay, 0, 0, 0, 0));
        await this.prisma.attendanceDay.updateMany({
          where: {
            employeeId: emp.id,
            workDate: lastDateObj,
          },
          data: {
            workUnits: { increment: remainingUnits },
          },
        });
      }

      if (remainingOt > 0) {
        const lastDateObj = new Date(Date.UTC(year, monthNum - 1, lastDay, 0, 0, 0, 0));
        await this.prisma.attendanceDay.updateMany({
          where: {
            employeeId: emp.id,
            workDate: lastDateObj,
          },
          data: {
            otHours: { increment: remainingOt },
          },
        });
      }

      results.push({
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        workUnits: totalUnits,
        otHours: totalOt,
      });
    }

    return {
      message: `Đã chốt công thành công cho ${results.length} nhân sự nhóm bán hàng trong tháng ${month}`,
      data: results,
    };
  }

  // Lấy danh sách nợ làm bù
  async getMakeupDebts(employeeId?: string) {
    return this.prisma.makeupDebt.findMany({
      where: employeeId ? { employeeId } : {},
      include: {
        employee: {
          select: { id: true, fullName: true, employeeCode: true, department: true },
        },
      },
      orderBy: { deadlineDate: 'asc' },
    });
  }

  // Lấy danh sách vi phạm / cảnh báo cuối tháng (Đi muộn 3 ngày liên tiếp, về sớm > 7 lần)
  async getViolations(month: string) {
    return this.prisma.violationRecord.findMany({
      where: { month },
      include: {
        employee: {
          select: { id: true, fullName: true, employeeCode: true, department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin xác nhận phạt vi phạm
  async confirmViolation(violationId: string) {
    return this.prisma.violationRecord.update({
      where: { id: violationId },
      data: {
        isConfirmed: true,
        confirmedAt: new Date(),
      },
    });
  }

  // Lấy danh sách ngày nghỉ lễ
  async getHolidays(month?: string, year?: number) {
    const where: any = {};
    if (month) {
      const [y, m] = month.split('-').map(Number);
      where.date = {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0, 23, 59, 59),
      };
    } else if (year) {
      where.date = {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31, 23, 59, 59),
      };
    }
    return this.prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  // Thêm ngày nghỉ lễ mới
  async createHoliday(data: { name: string; date: string; isPaid?: boolean }) {
    if (!data.name || !data.date) {
      throw new BadRequestException('Vui lòng nhập tên ngày lễ và ngày diễn ra');
    }
    const [y, m, d] = data.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 0, 0, 0);

    return this.prisma.holiday.upsert({
      where: { date: dateObj },
      update: {
        name: data.name,
        isPaid: data.isPaid !== undefined ? data.isPaid : true,
      },
      create: {
        name: data.name,
        date: dateObj,
        isPaid: data.isPaid !== undefined ? data.isPaid : true,
      },
    });
  }

  // Xóa ngày nghỉ lễ
  async deleteHoliday(id: string) {
    return this.prisma.holiday.delete({ where: { id } });
  }

  // Khởi tạo các ngày nghỉ lễ luật định của Việt Nam trong năm
  async seedStandardHolidays(year: number) {
    const listHolidays = [
      { name: 'Nghỉ Tết Dương Lịch', date: `${year}-01-01` },
      { name: 'Nghỉ Tết Nguyên Đán (29 Tết)', date: `${year}-02-16` },
      { name: 'Nghỉ Tết Nguyên Đán (Mùng 1 Tết)', date: `${year}-02-17` },
      { name: 'Nghỉ Tết Nguyên Đán (Mùng 2 Tết)', date: `${year}-02-18` },
      { name: 'Nghỉ Tết Nguyên Đán (Mùng 3 Tết)', date: `${year}-02-19` },
      { name: 'Nghỉ Tết Nguyên Đán (Mùng 4 Tết)', date: `${year}-02-20` },
      { name: 'Nghỉ Giỗ Tổ Hùng Vương (10/3 AL)', date: `${year}-04-26` },
      { name: 'Nghỉ Ngày Chiến thắng 30/4', date: `${year}-04-30` },
      { name: 'Nghỉ Ngày Quốc tế Lao động 1/5', date: `${year}-05-01` },
      { name: 'Nghỉ Lễ Quốc Khánh (ngày trước lễ)', date: `${year}-09-01` },
      { name: 'Nghỉ Lễ Quốc Khánh 2/9', date: `${year}-09-02` },
    ];

    let createdCount = 0;
    for (const h of listHolidays) {
      await this.createHoliday({
        name: h.name,
        date: h.date,
        isPaid: true,
      });
      createdCount++;
    }

    return { success: true, year, totalHolidays: createdCount };
  }
}
