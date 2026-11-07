import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestStatus, RequestType, calculateWorkUnits } from '@snake/shared';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  async getRequests(params?: {
    employeeId?: string;
    type?: string;
    status?: string;
    month?: string; // YYYY-MM
  }) {
    const where: any = {};
    if (params?.employeeId) {
      where.employeeId = params.employeeId;
    }
    if (params?.type) {
      where.type = params.type;
    }
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.month) {
      const [year, month] = params.month.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      where.targetDate = { gte: start, lte: end };
    }

    return this.prisma.request.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            attendanceCode: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyRequests(
    employeeId: string,
    params?: {
      type?: string;
      status?: string;
      month?: string;
    },
  ) {
    const where: any = { employeeId };
    if (params?.type) {
      where.type = params.type;
    }
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.month) {
      const [year, month] = params.month.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      where.targetDate = { gte: start, lte: end };
    }

    return this.prisma.request.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            attendanceCode: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrCreateLeaveBalance(employeeId: string, year: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Không tìm thấy thông tin nhân viên');
    }

    let seniorityBonus = 0;
    const startDate = employee.officialDate || employee.joinDate;
    if (startDate) {
      const endOfYear = new Date(year, 11, 31);
      const start = new Date(startDate);
      const diffYears = Math.max(0, Math.floor((endOfYear.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000)));
      seniorityBonus = Math.floor(diffYears / 5);
    }
    const totalEntitled = 12 + seniorityBonus;

    let balance = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId, year } },
    });

    if (!balance) {
      balance = await this.prisma.leaveBalance.create({
        data: {
          employeeId,
          year,
          totalEntitled,
          seniorityBonus,
          usedBeforeSystem: 0,
          used: 0,
          remaining: totalEntitled,
        },
      });
    }

    return balance;
  }

  async getLeaveBalance(employeeId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    const balance = await this.getOrCreateLeaveBalance(employeeId, targetYear);

    // Tính tổng số ngày phép năm đã duyệt qua đơn trên hệ thống
    const approvedRequests = await this.prisma.request.findMany({
      where: {
        employeeId,
        type: RequestType.LEAVE,
        status: RequestStatus.APPROVED,
        targetDate: {
          gte: new Date(targetYear, 0, 1),
          lte: new Date(targetYear, 11, 31, 23, 59, 59),
        },
      },
    });
    const systemUsed = approvedRequests.reduce(
      (sum, r) => sum + (r.minutes ? Number((r.minutes / 480).toFixed(2)) : 1),
      0,
    );

    const usedBeforeSystem = (balance as any).usedBeforeSystem || 0;
    const totalUsed = Number((usedBeforeSystem + systemUsed).toFixed(2));
    const remaining = Math.max(0, Number((balance.totalEntitled - totalUsed).toFixed(2)));

    // Tự động đồng bộ lại vào DB nếu có chênh lệch
    if (balance.used !== totalUsed || balance.remaining !== remaining) {
      await this.prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { used: totalUsed, remaining },
      });
    }

    const pendingRequests = await this.prisma.request.findMany({
      where: {
        employeeId,
        type: RequestType.LEAVE,
        status: RequestStatus.PENDING,
        targetDate: {
          gte: new Date(targetYear, 0, 1),
          lte: new Date(targetYear, 11, 31, 23, 59, 59),
        },
      },
    });
    const pendingDays = pendingRequests.reduce(
      (sum, r) => sum + (r.minutes ? Number((r.minutes / 480).toFixed(2)) : 1),
      0,
    );

    return {
      ...balance,
      usedBeforeSystem,
      systemUsed,
      used: totalUsed,
      remaining,
      pendingDays,
      available: Math.max(0, Number((remaining - pendingDays).toFixed(2))),
    };
  }

  async updateLeaveBalance(
    employeeId: string,
    year: number,
    data: { totalEntitled?: number; usedBeforeSystem?: number; used?: number; seniorityBonus?: number },
  ) {
    const balance = await this.getOrCreateLeaveBalance(employeeId, year);
    const totalEntitled = data.totalEntitled !== undefined ? Number(data.totalEntitled) : balance.totalEntitled;
    const seniorityBonus = data.seniorityBonus !== undefined ? Number(data.seniorityBonus) : balance.seniorityBonus;

    // Tính tổng số ngày phép năm đã duyệt qua đơn trên hệ thống
    const approvedRequests = await this.prisma.request.findMany({
      where: {
        employeeId,
        type: RequestType.LEAVE,
        status: RequestStatus.APPROVED,
        targetDate: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      },
    });
    const systemUsed = approvedRequests.reduce(
      (sum, r) => sum + (r.minutes ? Number((r.minutes / 480).toFixed(2)) : 1),
      0,
    );

    let usedBeforeSystem = (balance as any).usedBeforeSystem || 0;
    if (data.usedBeforeSystem !== undefined && data.usedBeforeSystem !== null) {
      usedBeforeSystem = Number(data.usedBeforeSystem);
    } else if (data.used !== undefined && data.used !== null) {
      // Hỗ trợ ngược nếu client gửi used thay vì usedBeforeSystem
      usedBeforeSystem = Math.max(0, Number((Number(data.used) - systemUsed).toFixed(2)));
    }

    const totalUsed = Number((usedBeforeSystem + systemUsed).toFixed(2));
    const remaining = Math.max(0, Number((totalEntitled - totalUsed).toFixed(2)));

    const updated = await this.prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        totalEntitled,
        seniorityBonus,
        usedBeforeSystem,
        used: totalUsed,
        remaining,
      },
    });

    return {
      ...updated,
      systemUsed,
      usedBeforeSystem,
      used: totalUsed,
      remaining,
    };
  }

  async createRequest(
    employeeId: string,
    data: {
      type: string;
      targetDate: string;
      startTime?: string;
      endTime?: string;
      minutes?: number;
      reason: string;
    },
    createdByUserId?: string,
    autoApprove = false,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Vui lòng chọn nhân viên gửi đơn');
    }

    if (!data.reason || !data.reason.trim()) {
      throw new BadRequestException('Vui lòng nhập lý do gửi đơn');
    }

    const rawDateStr = typeof data.targetDate === 'string'
      ? data.targetDate.slice(0, 10)
      : (data.targetDate ? new Date(data.targetDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    const targetDate = new Date(`${rawDateStr}T00:00:00.000Z`);

    // Kiểm tra đơn nghỉ phép năm có hưởng lương
    if (data.type === RequestType.LEAVE) {
      const currentYear = targetDate.getFullYear();
      const balance = await this.getOrCreateLeaveBalance(employeeId, currentYear);
      const leaveDays = data.minutes ? Number((data.minutes / 480).toFixed(2)) : 1;

      // Tính các đơn xin nghỉ phép năm đang chờ duyệt trong năm
      const pendingRequests = await this.prisma.request.findMany({
        where: {
          employeeId,
          type: RequestType.LEAVE,
          status: RequestStatus.PENDING,
          targetDate: {
            gte: new Date(currentYear, 0, 1),
            lte: new Date(currentYear, 11, 31, 23, 59, 59),
          },
        },
      });
      const pendingDays = pendingRequests.reduce(
        (sum, r) => sum + (r.minutes ? r.minutes / 480 : 1),
        0,
      );
      const availableDays = Number((balance.remaining - pendingDays).toFixed(2));

      if (balance.remaining <= 0) {
        throw new BadRequestException(
          `Nhân sự đã sử dụng hết số ngày phép trong năm ${currentYear} (${balance.used}/${balance.totalEntitled} ngày). Không thể xin thêm phép nghỉ có hưởng lương. Vui lòng chọn loại đơn "Nghỉ không lương".`,
        );
      }

      if (availableDays < leaveDays) {
        throw new BadRequestException(
          `Nhân sự chỉ còn khả dụng ${availableDays > 0 ? availableDays : 0} ngày phép năm (Tổng: ${balance.totalEntitled}, Đã dùng: ${balance.used}${pendingDays > 0 ? `, Đang chờ duyệt: ${pendingDays}` : ''}). Không đủ để xin nghỉ thêm ${leaveDays} ngày phép hưởng lương. Vui lòng chọn loại đơn "Nghỉ không lương".`,
        );
      }
    }

    const req = await this.prisma.request.create({
      data: {
        employeeId,
        type: data.type,
        targetDate,
        startTime: data.startTime,
        endTime: data.endTime,
        minutes: data.minutes || 0,
        reason: data.reason,
        status: autoApprove ? RequestStatus.APPROVED : RequestStatus.PENDING,
        approvedBy: autoApprove ? createdByUserId : null,
        approvedAt: autoApprove ? new Date() : null,
        adminNote: autoApprove ? 'Tạo đơn và tự động duyệt bởi Admin' : null,
      },
    });

    if (autoApprove) {
      // 1. Nếu là đơn xin đi muộn/về sớm LÀM BÙ -> tự tạo bản ghi nợ MakeupDebt
      if (req.type === RequestType.LATE_EARLY_MAKEUP && req.minutes && req.minutes > 0) {
        const deadline = new Date(req.targetDate);
        const dayOfWeek = deadline.getDay();
        if (dayOfWeek === 6) {
          deadline.setDate(deadline.getDate() + 2);
        } else {
          deadline.setDate(deadline.getDate() + 1);
        }

        await this.prisma.makeupDebt.create({
          data: {
            employeeId: req.employeeId,
            originalDate: req.targetDate,
            debtMinutes: req.minutes,
            deadlineDate: deadline,
            paidMinutes: 0,
            isResolved: false,
          },
        });
      }

      // 2. Nếu là đơn nghỉ phép năm -> trừ quỹ phép
      if (req.type === RequestType.LEAVE) {
        const currentYear = targetDate.getFullYear();
        const leaveDays = req.minutes ? Number((req.minutes / 480).toFixed(2)) : 1;
        const balance = await this.getOrCreateLeaveBalance(employeeId, currentYear);
        const newUsed = Number((balance.used + leaveDays).toFixed(2));
        const newRemaining = Math.max(0, Number((balance.totalEntitled - newUsed).toFixed(2)));

        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            used: newUsed,
            remaining: newRemaining,
          },
        });
      }

      // 3. ĐỒNG BỘ TRỰC TIẾP VÀO BẢNG CHẤM CÔNG (AttendanceDay)
      await this.syncRequestToAttendance(req);
    }

    return req;
  }

  async cancelRequest(requestId: string, employeeId: string) {
    const req = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Không tìm thấy đơn');
    if (req.employeeId !== employeeId) throw new ForbiddenException('Bạn không thể hủy đơn của người khác');
    if (req.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể hủy đơn đang ở trạng thái chờ duyệt');
    }

    const updated = await this.prisma.request.update({
      where: { id: requestId },
      data: { status: RequestStatus.CANCELLED },
    });

    return updated;
  }

  async reviewRequest(
    requestId: string,
    reviewerId: string,
    data: { status: 'APPROVED' | 'REJECTED'; adminNote?: string },
  ) {
    const req = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });
    if (!req) throw new NotFoundException('Không tìm thấy đơn');
    if (req.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Đơn này đã được xử lý trước đó');
    }

    const updated = await this.prisma.request.update({
      where: { id: requestId },
      data: {
        status: data.status,
        adminNote: data.adminNote,
        approvedBy: reviewerId,
        approvedAt: new Date(),
      },
    });

    // Nếu duyệt thành công:
    if (data.status === 'APPROVED') {
      // 1. Nếu là đơn xin đi muộn/về sớm LÀM BÙ -> tự tạo bản ghi nợ MakeupDebt
      if (req.type === RequestType.LATE_EARLY_MAKEUP && req.minutes && req.minutes > 0) {
        // Hạn làm bù là ngày làm việc kế tiếp (nếu là thứ 7 -> thứ 2)
        const deadline = new Date(req.targetDate);
        const dayOfWeek = deadline.getDay(); // 0: CN, 6: T7
        if (dayOfWeek === 6) {
          deadline.setDate(deadline.getDate() + 2); // sang thứ 2
        } else {
          deadline.setDate(deadline.getDate() + 1);
        }

        await this.prisma.makeupDebt.create({
          data: {
            employeeId: req.employeeId,
            originalDate: req.targetDate,
            debtMinutes: req.minutes,
            deadlineDate: deadline,
            paidMinutes: 0,
            isResolved: false,
          },
        });
      }

      // 2. Nếu là đơn nghỉ phép năm -> trừ quỹ phép
      if (req.type === RequestType.LEAVE) {
        const year = req.targetDate.getFullYear();
        const leaveDays = req.minutes ? Number((req.minutes / 480).toFixed(2)) : 1;
        const balance = await this.getOrCreateLeaveBalance(req.employeeId, year);
        const newUsed = Number((balance.used + leaveDays).toFixed(2));
        const newRemaining = Math.max(0, Number((balance.totalEntitled - newUsed).toFixed(2)));
        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            used: newUsed,
            remaining: newRemaining,
          },
        });
      }

      // 3. ĐỒNG BỘ TRỰC TIẾP VÀO BẢNG CHẤM CÔNG (AttendanceDay)
      await this.syncRequestToAttendance(updated);
    } else if (data.status === 'REJECTED') {
      await this.revertRequestFromAttendance(req);
    }

    return updated;
  }

  // Admin xóa phiếu xin phép
  async deleteRequest(requestId: string) {
    const req = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });
    if (!req) {
      throw new NotFoundException('Không tìm thấy phiếu xin phép cần xóa');
    }

    // 1. Nếu đơn từng được duyệt (APPROVED) và là đơn nghỉ phép năm (LEAVE) -> hoàn lại số ngày phép
    if (req.status === RequestStatus.APPROVED && req.type === RequestType.LEAVE) {
      const year = req.targetDate.getFullYear();
      const leaveDays = req.minutes ? Number((req.minutes / 480).toFixed(2)) : 1;
      const balance = await this.getOrCreateLeaveBalance(req.employeeId, year);
      const newUsed = Math.max(0, Number((balance.used - leaveDays).toFixed(2)));
      const newRemaining = Math.min(balance.totalEntitled, Number((balance.totalEntitled - newUsed).toFixed(2)));
      await this.prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { used: newUsed, remaining: newRemaining },
      });
    }

    // 2. Nếu đơn là LATE_EARLY_MAKEUP -> xóa bản ghi nợ làm bù liên quan nếu có
    if (req.type === RequestType.LATE_EARLY_MAKEUP) {
      await this.prisma.makeupDebt.deleteMany({
        where: {
          employeeId: req.employeeId,
          originalDate: req.targetDate,
        },
      });
    }

    // 3. Nếu đơn từng được duyệt -> hoàn tác cập nhật trên bảng chấm công
    if (req.status === RequestStatus.APPROVED) {
      await this.revertRequestFromAttendance(req);
    }

    // 4. Xóa đơn khỏi hệ thống
    await this.prisma.request.delete({
      where: { id: requestId },
    });

    return { success: true, message: 'Đã xóa phiếu xin phép thành công' };
  }

  // Đồng bộ phiếu xin phép đã duyệt sang bảng AttendanceDay
  async syncRequestToAttendance(req: {
    id?: string;
    employeeId: string;
    type: string;
    targetDate: Date;
    minutes?: number | null;
    reason?: string | null;
  }) {
    if (!req.employeeId || !req.targetDate) return;

    // Đảm bảo cột leaveUnits tồn tại
    await this.prisma.$executeRawUnsafe(`ALTER TABLE "AttendanceDay" ADD COLUMN "leaveUnits" REAL DEFAULT 0;`).catch(() => {});

    const dateStr = req.targetDate.toISOString().slice(0, 10);
    const workDate = new Date(`${dateStr}T00:00:00.000Z`);

    const existing = await this.prisma.attendanceDay.findUnique({
      where: {
        employeeId_workDate: {
          employeeId: req.employeeId,
          workDate,
        },
      },
    });

    if (req.type === RequestType.MISSING_PUNCH) {
      // Đơn giải trình quên thẻ (1.0, 0.75, 0.5, 0.25 công)
      const punchUnits = req.minutes ? Number((req.minutes / 480).toFixed(2)) : 1.0;
      const finalUnits = existing ? Math.max(existing.workUnits, punchUnits) : punchUnits;
      const finalHours = existing ? Math.max(existing.workedHours, punchUnits * 8) : punchUnits * 8;
      const reasonText = `Giải trình quên quẹt thẻ (${punchUnits} công) đã duyệt: ${req.reason || ''}`.trim();

      await this.prisma.attendanceDay.upsert({
        where: {
          employeeId_workDate: {
            employeeId: req.employeeId,
            workDate,
          },
        },
        update: {
          workUnits: finalUnits,
          workedHours: finalHours,
          isMissingPunch: false,
          isLate: false,
          isEarly: false,
          isManualOverridden: true,
          overrideReason: reasonText,
        },
        create: {
          employeeId: req.employeeId,
          workDate,
          workUnits: finalUnits,
          workedHours: finalHours,
          leaveUnits: 0,
          otHours: 0,
          isMissingPunch: false,
          isLate: false,
          isEarly: false,
          isManualOverridden: true,
          overrideReason: reasonText,
        },
      });
    } else if (req.type === RequestType.OT) {
      // Đăng ký làm thêm giờ (sau 17:00)
      const otHours = req.minutes ? Number((req.minutes / 60).toFixed(2)) : 0;
      const finalOt = existing ? Math.max(existing.otHours, otHours) : otHours;
      const reasonText = (existing?.overrideReason ? `${existing.overrideReason}; ` : '') +
        `Làm thêm giờ OT (${otHours}h) đã duyệt: ${req.reason || ''}`.trim();

      await this.prisma.attendanceDay.upsert({
        where: {
          employeeId_workDate: {
            employeeId: req.employeeId,
            workDate,
          },
        },
        update: {
          otHours: finalOt,
          overrideReason: reasonText,
        },
        create: {
          employeeId: req.employeeId,
          workDate,
          workUnits: 0,
          workedHours: 0,
          leaveUnits: 0,
          otHours: finalOt,
          isMissingPunch: false,
          isLate: false,
          isEarly: false,
          overrideReason: reasonText,
        },
      });
    } else if (req.type === RequestType.LEAVE) {
      // Nghỉ phép năm có hưởng lương
      const leaveUnits = req.minutes ? Number((req.minutes / 480).toFixed(2)) : 1.0;
      const finalWorkUnits = leaveUnits >= 1.0 ? 0 : (existing ? Math.min(existing.workUnits, Number((1.0 - leaveUnits).toFixed(2))) : 0);
      const reasonText = `Nghỉ phép năm (${leaveUnits} ngày) đã duyệt: ${req.reason || ''}`.trim();

      await this.prisma.attendanceDay.upsert({
        where: {
          employeeId_workDate: {
            employeeId: req.employeeId,
            workDate,
          },
        },
        update: {
          leaveUnits,
          workUnits: finalWorkUnits,
          isMissingPunch: false,
          overrideReason: reasonText,
        },
        create: {
          employeeId: req.employeeId,
          workDate,
          workUnits: finalWorkUnits,
          leaveUnits,
          workedHours: 0,
          otHours: 0,
          isMissingPunch: false,
          isLate: false,
          isEarly: false,
          overrideReason: reasonText,
        },
      });
    } else if (req.type === RequestType.UNPAID_LEAVE) {
      const reasonText = `Nghỉ không lương đã duyệt: ${req.reason || ''}`.trim();
      await this.prisma.attendanceDay.upsert({
        where: {
          employeeId_workDate: {
            employeeId: req.employeeId,
            workDate,
          },
        },
        update: {
          workUnits: 0,
          leaveUnits: 0,
          isMissingPunch: false,
          overrideReason: reasonText,
        },
        create: {
          employeeId: req.employeeId,
          workDate,
          workUnits: 0,
          leaveUnits: 0,
          workedHours: 0,
          otHours: 0,
          isMissingPunch: false,
          isLate: false,
          isEarly: false,
          overrideReason: reasonText,
        },
      });
    } else if (req.type === RequestType.LATE_EARLY_EXEMPT || req.type === RequestType.LATE_EARLY_MAKEUP) {
      if (existing) {
        const exemptMins = req.minutes || 60;
        const newHours = Math.min(8.0, (existing.workedHours || 0) + exemptMins / 60);
        const newUnits = calculateWorkUnits(newHours);
        await this.prisma.attendanceDay.update({
          where: { id: existing.id },
          data: {
            isLate: false,
            isEarly: false,
            lateMinutes: 0,
            earlyMinutes: 0,
            workedHours: Math.max(existing.workedHours, newHours),
            workUnits: Math.max(existing.workUnits, newUnits),
          },
        });
      }
    } else if (req.type === RequestType.THROUGH_LUNCH) {
      if (existing) {
        await this.prisma.attendanceDay.update({
          where: { id: existing.id },
          data: {
            isThroughLunch: true,
            isEarly: false,
            earlyMinutes: 0,
            workUnits: 1.0,
            workedHours: Math.max(existing.workedHours, 8.0),
          },
        });
      }
    }
  }

  // Hoàn tác cập nhật trên bảng chấm công khi từ chối / hủy / xóa đơn đã duyệt
  async revertRequestFromAttendance(req: {
    id?: string;
    employeeId: string;
    type: string;
    targetDate: Date;
    minutes?: number | null;
  }) {
    if (!req.employeeId || !req.targetDate) return;

    const dateStr = req.targetDate.toISOString().slice(0, 10);
    const workDate = new Date(`${dateStr}T00:00:00.000Z`);

    const existing = await this.prisma.attendanceDay.findUnique({
      where: {
        employeeId_workDate: {
          employeeId: req.employeeId,
          workDate,
        },
      },
    });
    if (!existing) return;

    if (req.type === RequestType.MISSING_PUNCH) {
      const otherApproved = await this.prisma.request.findFirst({
        where: {
          id: req.id ? { not: req.id } : undefined,
          employeeId: req.employeeId,
          type: RequestType.MISSING_PUNCH,
          status: RequestStatus.APPROVED,
          targetDate: req.targetDate,
        },
      });
      if (!otherApproved) {
        if (!existing.checkIn && !existing.checkOut) {
          await this.prisma.attendanceDay.update({
            where: { id: existing.id },
            data: {
              workUnits: 0,
              workedHours: 0,
              isMissingPunch: true,
            },
          });
        }
      }
    } else if (req.type === RequestType.OT) {
      const otherApproved = await this.prisma.request.findFirst({
        where: {
          id: req.id ? { not: req.id } : undefined,
          employeeId: req.employeeId,
          type: RequestType.OT,
          status: RequestStatus.APPROVED,
          targetDate: req.targetDate,
        },
      });
      if (!otherApproved) {
        await this.prisma.attendanceDay.update({
          where: { id: existing.id },
          data: { otHours: 0 },
        });
      }
    } else if (req.type === RequestType.LEAVE) {
      const otherApproved = await this.prisma.request.findFirst({
        where: {
          id: req.id ? { not: req.id } : undefined,
          employeeId: req.employeeId,
          type: RequestType.LEAVE,
          status: RequestStatus.APPROVED,
          targetDate: req.targetDate,
        },
      });
      if (!otherApproved) {
        await this.prisma.attendanceDay.update({
          where: { id: existing.id },
          data: { leaveUnits: 0 },
        });
      }
    }
  }
}
