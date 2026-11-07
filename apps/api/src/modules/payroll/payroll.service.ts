import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_HRM_CONFIG,
  calculateOtBonus,
  calculatePersonalIncomeTax,
  getManagementSalary,
} from '@snake/shared';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  // Lấy danh sách bảng lương tháng
  async getPayrollPeriod(month: string) {
    let period = await this.prisma.payrollPeriod.findUnique({
      where: { month },
      include: {
        payslips: {
          include: {
            employee: {
              include: { department: true, position: true },
            },
          },
          orderBy: { employee: { employeeCode: 'asc' } },
        },
      },
    });
    return period;
  }

  // Tính toán bảng lương tháng (Tính toán tự động toàn bộ nhân viên)
  async generateMonthlyPayroll(month: string) {
    // 1. Kiểm tra kỳ lương có bị khóa chưa
    let period = await this.prisma.payrollPeriod.findUnique({ where: { month } });
    if (period && period.isLocked) {
      throw new BadRequestException(`Bảng lương tháng ${month} đã bị khóa, không thể tính lại`);
    }

    if (!period) {
      period = await this.prisma.payrollPeriod.create({
        data: {
          month,
          standardWorkDays: DEFAULT_HRM_CONFIG.standardWorkDays,
        },
      });
    }

    if (period.isLocked) {
      throw new BadRequestException(
        `Bảng lương tháng ${month} đã bị khóa. Vui lòng mở khóa trước khi tính toán lại.`,
      );
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    // Lấy cấu hình tham số chung HRM (Thuế TNCN, Công đoàn, LCB mặc định, BHXH...)
    const hrmSettings = await this.getHrmSettings();
    const defaultLCB = hrmSettings.defaultBaseSalary;
    const taxPersonalDeduction = hrmSettings.taxPersonalDeduction;
    const taxDependentDeduction = hrmSettings.taxDependentDeduction;
    const unionFeeMonthly = hrmSettings.unionFeeMonthly;
    const insuranceRateEmployee = hrmSettings.insuranceRateEmployee;

    // Lấy tất cả nhân sự đang làm việc trong tháng đó (kèm phòng ban để lấy ngày công chuẩn & đơn giá tăng ca)
    const employees = await this.prisma.employee.findMany({
      where: {
        joinDate: { lte: endDate },
        OR: [{ resignDate: null }, { resignDate: { gte: startDate } }],
      },
      include: {
        department: true,
        salaryProfiles: {
          where: { effectiveDate: { lte: endDate } },
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
        attendanceDays: { where: { workDate: { gte: startDate, lte: endDate } } },
        violations: { where: { month, isConfirmed: true } },
        adjustments: { where: { month } },
      },
    });

    // Lấy bảng lương hiện có (nếu tính lại) để giữ nguyên % KPI đã nhập trước đó
    const existingPayslips = await this.prisma.payslip.findMany({
      where: { periodId: period.id },
    });
    const existingMap = new Map(existingPayslips.map((p) => [p.employeeId, p]));

    // Lấy tất cả đánh giá KPI tháng đã có
    const monthlyKpiList = await this.prisma.monthlyKpi.findMany({
      where: { month },
    });
    const kpiMap = new Map(monthlyKpiList.map((k) => [k.employeeId, k.kpiPercent]));

    // Lấy tất cả các ngày lễ hưởng lương trong tháng
    const holidaysInMonth = await this.prisma.holiday.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        isPaid: true,
      },
    });

    const payslips = [];

    for (const emp of employees) {
      // 0. Kiểm tra nhân sự đã nghỉ việc hoặc nghỉ thai sản / tạm dừng hợp đồng
      if (emp.status === 'RESIGNED') {
        if (!emp.resignDate || new Date(emp.resignDate) < startDate) {
          // Đã nghỉ việc trước tháng tính lương, xóa phiếu cũ (nếu có) và bỏ qua không tính lương
          await this.prisma.payslip
            .deleteMany({
              where: { periodId: period.id, employeeId: emp.id },
            })
            .catch(() => {});
          continue;
        }
      }

      if (emp.status === 'MATERNITY_LEAVE' || emp.status === 'TEMPORARY_LEAVE') {
        let isOffFullMonth = false;
        if (emp.leaveStartDate) {
          const lStart = new Date(emp.leaveStartDate);
          const lEnd = emp.leaveEndDate ? new Date(emp.leaveEndDate) : null;
          // Toàn bộ tháng tính lương nằm trong thời gian nghỉ thai sản / tạm hoãn
          if (lStart <= startDate && (!lEnd || lEnd >= endDate)) {
            isOffFullMonth = true;
          }
        } else {
          // Không có ngày cụ thể nhưng đang ở trạng thái Nghỉ thai sản / Tạm dừng
          isOffFullMonth = true;
        }

        if (isOffFullMonth) {
          // Không tính lương, không tính các khoản trừ
          await this.prisma.payslip
            .deleteMany({
              where: { periodId: period.id, employeeId: emp.id },
            })
            .catch(() => {});
          continue;
        }
      }

      const latestSalary = emp.salaryProfiles[0];
      const agreedSalary = latestSalary ? latestSalary.agreedSalary : 0;
      const mgmtLevel = latestSalary ? latestSalary.managementLevel : 0;

      // 1. Ngày công chuẩn & đơn giá OT theo phòng ban (mặc định 26 ngày và 50.000đ/h)
      const stdDays = emp.department?.standardWorkDays || period.standardWorkDays || DEFAULT_HRM_CONFIG.standardWorkDays || 26;
      const otRate = emp.department?.otRatePerHour || DEFAULT_HRM_CONFIG.otHourlyRate || 50000;

      // 2. Tổng hợp công thực tế & công phép hưởng lương
      let actualWorkUnits = emp.attendanceDays.reduce((sum, d) => sum + (d.workUnits || 0), 0);
      let otHours = emp.attendanceDays.reduce((sum, d) => sum + (d.otHours || 0), 0);

      // Công phép: tổng hợp từ AttendanceDay.leaveUnits hoặc các đơn LEAVE đã duyệt trong tháng
      const attendanceLeaveUnits = emp.attendanceDays.reduce((sum, d) => sum + ((d as any).leaveUnits || 0), 0);
      const approvedLeaveReqs = await this.prisma.request.findMany({
        where: {
          employeeId: emp.id,
          type: 'LEAVE',
          status: 'APPROVED',
          targetDate: { gte: startDate, lte: endDate },
        },
      });
      const reqLeaveUnits = approvedLeaveReqs.reduce(
        (sum, r) => sum + (r.minutes ? Number((r.minutes / 480).toFixed(2)) : 1.0),
        0,
      );
      const paidLeaveUnits = Math.max(attendanceLeaveUnits, reqLeaveUnits);

      // Kiểm tra bảo đảm tính đủ công từ các đơn giải trình quên thẻ (MISSING_PUNCH) và làm thêm giờ (OT) đã duyệt
      const otherApprovedReqs = await this.prisma.request.findMany({
        where: {
          employeeId: emp.id,
          type: { in: ['MISSING_PUNCH', 'OT'] },
          status: 'APPROVED',
          targetDate: { gte: startDate, lte: endDate },
        },
      });

      for (const req of otherApprovedReqs) {
        const reqDateStr = req.targetDate.toISOString().slice(0, 10);
        const dayRecord = emp.attendanceDays.find((d) => d.workDate.toISOString().slice(0, 10) === reqDateStr);

        if (req.type === 'MISSING_PUNCH') {
          const punchUnits = req.minutes ? Number((req.minutes / 480).toFixed(2)) : 1.0;
          if (!dayRecord || (dayRecord.workUnits || 0) < punchUnits) {
            const currentUnits = dayRecord ? (dayRecord.workUnits || 0) : 0;
            actualWorkUnits += (punchUnits - currentUnits);
          }
        } else if (req.type === 'OT') {
          const reqOt = req.minutes ? Number((req.minutes / 60).toFixed(2)) : 0;
          if (!dayRecord || (dayRecord.otHours || 0) < reqOt) {
            const currentOt = dayRecord ? (dayRecord.otHours || 0) : 0;
            otHours += (reqOt - currentOt);
          }
        }
      }

      // Kiểm tra xem nhân sự có thuộc nhóm bán hàng tại cửa hàng không (qua cấu hình cá nhân hoặc phòng ban)
      const isStoreSales = Boolean(emp.isStoreSales || emp.department?.isStoreSales);

      // Công nghỉ lễ hưởng nguyên lương:
      // - Với nhóm bán hàng tại cửa hàng: các ngày nghỉ lễ vẫn có thể làm việc và tính công như bình thường,
      //   KHÔNG được coi là nghỉ hưởng lương cơ bản (holidayUnits = 0).
      // - Với các bộ phận khác: tính cho các ngày lễ rơi vào khoảng thời gian nhân viên đang làm việc tại công ty.
      const holidayUnits = isStoreSales
        ? 0
        : holidaysInMonth.filter((h) => {
            const hDate = new Date(h.date);
            return hDate >= emp.joinDate && (!emp.resignDate || hDate <= emp.resignDate);
          }).length;

      // 3. Tính các thành phần lương
      // Mức lương cơ bản: ưu tiên từ SalaryProfile, sau đó đến Employee.customBaseSalary, cuối cùng là defaultLCB (mặc định 5.681.700đ)
      const lcb =
        latestSalary?.baseSalary && latestSalary.baseSalary > 0
          ? latestSalary.baseSalary
          : emp.customBaseSalary && emp.customBaseSalary > 0
          ? emp.customBaseSalary
          : defaultLCB;

      const pc = agreedSalary * DEFAULT_HRM_CONFIG.allowancePercent; // 10%
      const rawLql = getManagementSalary(mgmtLevel);

      // Điều kiện nhận Lương Quản Lý:
      // - Vào làm không sau ngày 15
      // - Không nghỉ việc trong tháng
      // - Số công thực tế > 13
      let isEligibleForLql = true;
      if (emp.joinDate > new Date(year, monthNum - 1, 15)) isEligibleForLql = false;
      if (emp.resignDate && emp.resignDate <= endDate) isEligibleForLql = false;
      if (actualWorkUnits <= 13) isEligibleForLql = false;

      const lql = isEligibleForLql ? rawLql : 0;

      // Tổng Lương kỹ năng & trách nhiệm (Lương chuyên môn định mức)
      // Đảm bảo: LCB + Phụ cấp + Lương quản lý + Lương chuyên môn = Lương thỏa thuận
      let totalLkn = agreedSalary - lcb - pc - lql;
      if (totalLkn < 0) totalLkn = 0;

      // Lương KPI định mức: cấu hình riêng cho từng nhân sự (trích 1 phần từ Lương chuyên môn)
      const configuredKpi = (latestSalary?.kpiSalary && latestSalary.kpiSalary > 0)
        ? latestSalary.kpiSalary
        : (emp.kpiSalary || 0);
      const kpiSalary = Math.min(totalLkn, Math.max(0, configuredKpi));

      // Lương chuyên môn còn lại: tính theo số ngày công thực tế
      const lknFixed = Math.max(0, totalLkn - kpiSalary);

      // Nhân sự thử việc: LCB, LKN, LQL, KPI hưởng 85%. Riêng phụ cấp hưởng 100%.
      const isProbation = emp.status === 'PROBATION';
      const salaryRate = isProbation ? DEFAULT_HRM_CONFIG.probationSalaryRate : 1.0;

      // Tỷ lệ % hoàn thành KPI (ưu tiên từ MonthlyKpi, kế tiếp là payslip hiện có, mặc định 100% nếu không đánh giá gì)
      const existing = existingMap.get(emp.id);
      const evaluatedKpi = kpiMap.get(emp.id);
      const kpiPercent = evaluatedKpi !== undefined && evaluatedKpi !== null
        ? evaluatedKpi
        : (existing?.kpiPercent !== undefined && existing?.kpiPercent !== null ? existing.kpiPercent : 100);

      // Tiền lương KPI thực nhận: tính theo hiệu quả công việc (% KPI), không tính theo ngày công
      const kpiPay = Math.round(kpiSalary * (kpiPercent / 100) * (isProbation ? salaryRate : 1.0));

      // Tiền thực nhận từng khoản (chia theo Ngày công chuẩn của phòng ban)
      const lcbPay = (lcb * salaryRate * (actualWorkUnits + paidLeaveUnits + holidayUnits)) / stdDays;
      const pcPay = (pc * actualWorkUnits) / stdDays;
      const lknPay = (lknFixed * salaryRate * actualWorkUnits) / stdDays;
      const lqlPay = lql * salaryRate;

      // Tiền làm thêm giờ (đơn giá phòng ban + thưởng bậc)
      const otPay = otHours * otRate;
      const otBonus = calculateOtBonus(otHours);

      // Thưởng giám đốc & Thưởng lễ (20/10, 8/3...)
      const directorBonus = emp.adjustments
        .filter((a) => a.type === 'DIRECTOR_BONUS' || a.type === 'HOLIDAY_CASH_BONUS')
        .reduce((sum, a) => sum + a.amount, 0);

      // Thưởng ngày lễ bằng tiền mặt (20/10, 8/3...) được tính vào Thưởng và ĐỒNG THỜI tính vào Tạm ứng
      const holidayCashBonus = emp.adjustments
        .filter((a) => a.type === 'HOLIDAY_CASH_BONUS')
        .reduce((sum, a) => sum + a.amount, 0);

      const lateFine = emp.violations
        .filter((v) => v.type === 'LATE_3_DAYS')
        .reduce((sum, v) => sum + v.fineAmount, 0);

      const otherFine = emp.adjustments
        .filter((a) => a.type === 'FINE')
        .reduce((sum, a) => sum + a.amount, 0);

      // Tạm ứng gồm các khoản tạm ứng thông thường + thưởng lễ đã nhận tiền mặt
      const regularAdvance = emp.adjustments
        .filter((a) => a.type === 'ADVANCE')
        .reduce((sum, a) => sum + a.amount, 0);

      const advancePayment = regularAdvance + holidayCashBonus;

      // Bảo hiểm xã hội: Tách riêng Mức lương đóng BHXH và Lương cơ bản (LCB).
      // Nếu nhân viên có thiết lập insuranceSalary (> 0) thì căn cứ đóng BHXH là insuranceSalary.
      // Nếu không thiết lập riêng, fallback về LCB.
      // Chỉ trích BHXH (10.5%) nếu nhân viên có tham gia BHXH (emp.hasInsurance = true).
      const insuranceBase = emp.hasInsurance
        ? ((emp.insuranceSalary && emp.insuranceSalary > 0) ? emp.insuranceSalary : lcb)
        : 0;
      const insuranceDeduction = emp.hasInsurance
        ? Math.round(insuranceBase * insuranceRateEmployee)
        : 0;

      // Công đoàn: Nhân viên chính thức (không phải thử việc) sẽ được trích công đoàn.
      // Mức trích:
      // - Lấy theo cấu hình phòng ban (department.unionFee nếu có).
      // - Mặc định của các nhóm là 50.000đ (unionFeeMonthly).
      // - Mặc định của nhóm nhân viên cửa hàng (emp.isStoreSales hoặc department.isStoreSales) là 0đ.
      let defaultDeptUnionFee = unionFeeMonthly;
      if (emp.isStoreSales || emp.department?.isStoreSales) {
        defaultDeptUnionFee = 0;
      }
      const deptConfiguredUnionFee =
        emp.department && emp.department.unionFee !== null && emp.department.unionFee !== undefined
          ? Number(emp.department.unionFee)
          : defaultDeptUnionFee;

      const unionFee = !isProbation ? Math.max(0, deptConfiguredUnionFee) : 0;

      // Thu nhập chịu thuế TNCN (bao gồm cả Lương KPI)
      const totalIncome = lcbPay + pcPay + lknPay + kpiPay + lqlPay + otPay + otBonus + directorBonus;
      const taxableIncome = totalIncome - insuranceDeduction - taxPersonalDeduction - (emp.dependentsCount * taxDependentDeduction);
      const personalIncomeTax = calculatePersonalIncomeTax(taxableIncome);

      // Thực lĩnh
      const netSalary = Math.round(
        totalIncome - insuranceDeduction - unionFee - personalIncomeTax - lateFine - otherFine - advancePayment,
      );

      const snapshotData = JSON.stringify({
        isProbation,
        salaryRate,
        agreedSalary,
        stdDays,
        otRate,
        lcb,
        customBaseSalary: emp.customBaseSalary,
        insuranceSalary: emp.insuranceSalary,
        insuranceBase,
        hasInsurance: emp.hasInsurance,
        insuranceRate: insuranceRateEmployee,
        taxPersonalDeduction,
        taxDependentDeduction,
        unionFeeMonthly,
        dependentsCount: emp.dependentsCount || 0,
        pc,
        lql,
        totalLkn,
        lknFixed,
        lknPay: Math.round(lknPay),
        kpiSalary: Math.round(kpiSalary),
        kpiPercent,
        kpiPay: Math.round(kpiPay),
        actualWorkUnits,
        paidLeaveUnits,
        holidayUnits,
        totalPaidUnits: actualWorkUnits + paidLeaveUnits + holidayUnits,
        otHours,
        totalIncome,
        netSalary,
        holidayCashBonus,
        regularAdvance,
      });

      const payslip = await this.prisma.payslip.upsert({
        where: {
          periodId_employeeId: {
            periodId: period.id,
            employeeId: emp.id,
          },
        },
        update: {
          agreedSalary,
          baseSalary: Math.round(lcbPay),
          allowance: Math.round(pcPay),
          managementSalary: Math.round(lqlPay),
          skillSalary: Math.round(lknPay),
          kpiSalary: Math.round(kpiSalary),
          kpiPercent,
          kpiPay: Math.round(kpiPay),
          actualWorkUnits,
          paidLeaveUnits,
          holidayUnits,
          otHours,
          otPay: Math.round(otPay),
          otBonus: Math.round(otBonus),
          directorBonus: Math.round(directorBonus),
          lateFine: Math.round(lateFine),
          otherFine: Math.round(otherFine),
          insuranceDeduction: Math.round(insuranceDeduction),
          unionFee: Math.round(unionFee),
          personalIncomeTax: Math.round(personalIncomeTax),
          advancePayment: Math.round(advancePayment),
          netSalary,
          snapshotData,
        },
        create: {
          periodId: period.id,
          employeeId: emp.id,
          agreedSalary,
          baseSalary: Math.round(lcbPay),
          allowance: Math.round(pcPay),
          managementSalary: Math.round(lqlPay),
          skillSalary: Math.round(lknPay),
          kpiSalary: Math.round(kpiSalary),
          kpiPercent,
          kpiPay: Math.round(kpiPay),
          actualWorkUnits,
          paidLeaveUnits,
          holidayUnits,
          otHours,
          otPay: Math.round(otPay),
          otBonus: Math.round(otBonus),
          directorBonus: Math.round(directorBonus),
          lateFine: Math.round(lateFine),
          otherFine: Math.round(otherFine),
          insuranceDeduction: Math.round(insuranceDeduction),
          unionFee: Math.round(unionFee),
          personalIncomeTax: Math.round(personalIncomeTax),
          advancePayment: Math.round(advancePayment),
          netSalary,
          snapshotData,
        },
      });

      payslips.push(payslip);
    }

    return {
      success: true,
      periodId: period.id,
      month,
      totalPayslips: payslips.length,
    };
  }

  // Khóa bảng lương (Chỉ quyền Admin)
  async lockPayrollPeriod(month: string, lockedBy: string) {
    return this.prisma.payrollPeriod.update({
      where: { month },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy,
      },
    });
  }

  // Mở khóa bảng lương (Chỉ quyền Admin)
  async unlockPayrollPeriod(month: string) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { month } });
    if (!period) {
      throw new BadRequestException(`Bảng lương tháng ${month} chưa tồn tại`);
    }
    return this.prisma.payrollPeriod.update({
      where: { month },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  // Xóa toàn bộ tính toán lương của tháng để tính lại từ đầu (Chỉ quyền Admin)
  async deleteMonthlyPayroll(month: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { month },
      include: { payslips: true },
    });
    if (!period) {
      throw new NotFoundException(`Bảng lương tháng ${month} chưa tồn tại hoặc đã bị xóa`);
    }
    if (period.isLocked) {
      throw new BadRequestException(
        `Bảng lương tháng ${month} đang bị khóa. Vui lòng mở khóa bảng lương trước khi xóa để tính lại.`,
      );
    }

    // Xóa toàn bộ phiếu lương của tháng
    await this.prisma.payslip.deleteMany({
      where: { periodId: period.id },
    });

    // Xóa kỳ lương
    await this.prisma.payrollPeriod.delete({
      where: { id: period.id },
    });

    return {
      success: true,
      message: `Đã xóa toàn bộ dữ liệu tính lương tháng ${month}. Bạn có thể tiến hành tính toán lại từ đầu.`,
    };
  }

  // Xuất file Excel Bảng Lương Chi Tiết Toàn Bộ Nhân Viên
  async exportPayrollMasterToExcel(month: string, res: Response) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { month },
      include: {
        payslips: {
          include: {
            employee: {
              include: { department: true, position: true },
            },
          },
          orderBy: { employee: { employeeCode: 'asc' } },
        },
      },
    });

    if (!period || period.payslips.length === 0) {
      throw new BadRequestException(`Chưa có dữ liệu bảng lương tháng ${month}. Vui lòng tính toán bảng lương trước.`);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`BangLuong_${month}`);

    // Dòng tiêu đề lớn
    sheet.mergeCells('A1:AK1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `BẢNG LƯƠNG CHI TIẾT TOÀN BỘ NHÂN VIÊN - THÁNG ${month}`;
    titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF1F2937' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 36;

    const headers = [
      'STT',
      'Mã NV',
      'Họ và tên',
      'Phòng ban',
      'Chức vụ',
      'Loại nhân sự',
      'Lương thỏa thuận',
      'Mức Lương cơ bản',
      'Mức đóng BHXH',
      'Công chuẩn',
      'Công thực tế',
      'Nghỉ lễ',
      'Phép năm',
      'Nghỉ KL',
      'Tổng công tính lương',
      'Lương thời gian',
      'Phụ cấp 10%',
      'Lương chuyên môn',
      'Lương quản lý',
      'Mức KPI',
      'Tỷ lệ KPI (%)',
      'Lương KPI',
      'Giờ OT',
      'Tiền OT',
      'Thưởng OT',
      'Thưởng BGĐ',
      'Thưởng lễ tiền mặt',
      'TỔNG THU NHẬP',
      'BHXH (10.5%)',
      'Công đoàn',
      'Thuế TNCN',
      'Phạt muộn/về sớm',
      'Phạt khác',
      'Tạm ứng',
      'THỰC LĨNH CHUYỂN KHOẢN',
      'Số tài khoản',
      'Ngân hàng',
    ];

    sheet.addRow(headers);
    const headerRow = sheet.getRow(2);
    headerRow.height = 28;
    headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    let index = 1;
    for (const p of period.payslips) {
      let snapshot: any = {};
      try {
        if (p.snapshotData) snapshot = JSON.parse(p.snapshotData);
      } catch (e) {}

      const isProbation = snapshot.isProbation ?? (p.employee.status === 'PROBATION');
      const empType = isProbation ? 'Thử việc' : (p.employee.isStoreSales ? 'Showroom' : 'Chính thức');
      const totalPaidDays = (p.actualWorkUnits || 0) + (p.holidayUnits || 0) + (p.paidLeaveUnits || 0);
      const totalIncome =
        p.baseSalary +
        p.allowance +
        p.skillSalary +
        p.managementSalary +
        (p.kpiPay || 0) +
        p.otPay +
        p.otBonus +
        p.directorBonus;

      const rowValues = [
        index++,
        p.employee.employeeCode,
        p.employee.fullName,
        p.employee.department?.name || '',
        p.employee.position?.name || '',
        empType,
        p.agreedSalary || 0,
        snapshot.lcb || snapshot.customBaseSalary || DEFAULT_HRM_CONFIG.defaultBaseSalary || 5681700,
        snapshot.insuranceBase || 0,
        snapshot.stdDays || period.standardWorkDays || 26,
        p.actualWorkUnits || 0,
        p.holidayUnits || 0,
        p.paidLeaveUnits || 0,
        snapshot.unpaidLeaveDays || 0,
        Number(totalPaidDays.toFixed(2)),
        p.baseSalary,
        p.allowance,
        p.skillSalary,
        p.managementSalary,
        p.kpiSalary || 0,
        p.kpiPercent || 100,
        p.kpiPay || 0,
        p.otHours,
        p.otPay,
        p.otBonus,
        p.directorBonus,
        snapshot.holidayCashBonus || 0,
        totalIncome,
        p.insuranceDeduction,
        p.unionFee,
        p.personalIncomeTax,
        p.lateFine,
        p.otherFine,
        p.advancePayment,
        p.netSalary,
        p.employee.bankAccount || '',
        p.employee.bankName || '',
      ];

      const row = sheet.addRow(rowValues);
      row.height = 22;
      row.alignment = { vertical: 'middle' };
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
        // Cột tiền tệ định dạng #,##0
        if ([7, 8, 15, 16, 17, 18, 19, 21, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34].includes(colNumber)) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if ([9, 10, 11, 12, 13, 14, 20, 22].includes(colNumber)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 1 || colNumber === 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    }

    // Tự động căn chỉnh độ rộng cột
    sheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: false }, (c) => {
        const len = c.value ? String(c.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(Math.max(maxLen + 3, 11), 32);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Bang_Luong_Chi_Tiet_${month}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // Cập nhật % hoàn thành KPI của nhân sự trong kỳ lương và tự động tính lại thu nhập
  async updatePayslipKpi(payslipId: string, kpiPercent: number) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        period: true,
        employee: { include: { department: true } },
      },
    });
    if (!payslip) {
      throw new NotFoundException('Không tìm thấy phiếu lương');
    }
    if (payslip.period.isLocked) {
      throw new BadRequestException('Bảng lương tháng này đã bị khóa, không thể cập nhật % KPI');
    }

    const percent = Math.max(0, Number(kpiPercent) || 0);

    let snapshot: any = {};
    try {
      if (payslip.snapshotData) snapshot = JSON.parse(payslip.snapshotData);
    } catch (e) {}

    const isProbation = snapshot.isProbation ?? (payslip.employee.status === 'PROBATION');
    const salaryRate = snapshot.salaryRate ?? (isProbation ? DEFAULT_HRM_CONFIG.probationSalaryRate : 1.0);
    const kpiSalary = payslip.kpiSalary || 0;

    // Lương KPI thực nhận tính theo % KPI và tỷ lệ thử việc (nếu có)
    const kpiPay = Math.round(kpiSalary * (percent / 100) * (isProbation ? salaryRate : 1.0));

    // Tính lại Tổng thu nhập
    const totalIncome =
      payslip.baseSalary +
      payslip.allowance +
      payslip.skillSalary +
      kpiPay +
      payslip.managementSalary +
      payslip.otPay +
      payslip.otBonus +
      payslip.directorBonus;

    // Tính lại Thuế TNCN
    const hrmSettings = await this.getHrmSettings();
    const taxPersonal = snapshot.taxPersonalDeduction || hrmSettings.taxPersonalDeduction;
    const taxDependent = snapshot.taxDependentDeduction || hrmSettings.taxDependentDeduction;

    const taxableIncome =
      totalIncome -
      payslip.insuranceDeduction -
      taxPersonal -
      (payslip.employee.dependentsCount || 0) * taxDependent;
    const personalIncomeTax = Math.round(calculatePersonalIncomeTax(taxableIncome));

    // Tính lại Thực lĩnh
    const netSalary = Math.round(
      totalIncome -
        payslip.insuranceDeduction -
        payslip.unionFee -
        personalIncomeTax -
        payslip.lateFine -
        payslip.otherFine -
        payslip.advancePayment,
    );

    snapshot.kpiPercent = percent;
    snapshot.kpiPay = kpiPay;
    snapshot.totalIncome = totalIncome;
    snapshot.netSalary = netSalary;

    // Đồng bộ vào bảng MonthlyKpi
    await this.prisma.monthlyKpi.upsert({
      where: {
        employeeId_month: {
          employeeId: payslip.employeeId,
          month: payslip.period.month,
        },
      },
      update: { kpiPercent: percent },
      create: {
        employeeId: payslip.employeeId,
        month: payslip.period.month,
        kpiPercent: percent,
      },
    }).catch(() => {});

    return this.prisma.payslip.update({
      where: { id: payslipId },
      data: {
        kpiPercent: percent,
        kpiPay,
        personalIncomeTax,
        netSalary,
        snapshotData: JSON.stringify(snapshot),
      },
      include: {
        employee: { include: { department: true, position: true } },
      },
    });
  }

  // Lấy danh sách đánh giá KPI trong tháng của nhân viên (mặc định 100% nếu chưa có)
  async getMonthlyKpiEvaluations(month: string, departmentId?: string) {
    const where: any = {
      status: { notIn: ['RESIGNED', 'MATERNITY_LEAVE', 'TEMPORARY_LEAVE'] },
    };
    if (departmentId) {
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
      },
      orderBy: { employeeCode: 'asc' },
    });

    return employees.map((emp) => {
      const evalItem = emp.kpiEvaluations[0];
      const configuredKpi = (emp.salaryProfiles[0]?.kpiSalary && emp.salaryProfiles[0].kpiSalary > 0)
        ? emp.salaryProfiles[0].kpiSalary
        : (emp.kpiSalary || 0);

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        department: emp.department,
        position: emp.position,
        isStoreSales: Boolean(emp.isStoreSales || emp.department?.isStoreSales),
        kpiSalary: configuredKpi,
        kpiPercent: evalItem?.kpiPercent !== undefined && evalItem?.kpiPercent !== null ? evalItem.kpiPercent : 100,
        notes: evalItem?.notes || '',
        evaluatedBy: evalItem?.evaluatedBy || '',
        isEvaluated: Boolean(evalItem),
        updatedAt: evalItem?.updatedAt || null,
      };
    });
  }

  // Lưu đánh giá KPI tháng (hỗ trợ lưu hàng loạt hoặc từng người)
  async saveMonthlyKpiEvaluations(
    month: string,
    evaluations: {
      employeeId: string;
      kpiPercent: number; // Mặc định 100 nếu không có gì
      notes?: string;
    }[],
    evaluatedBy: string,
  ) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Tháng không hợp lệ (định dạng YYYY-MM)');
    }
    if (!evaluations || !Array.isArray(evaluations)) {
      throw new BadRequestException('Dữ liệu đánh giá không hợp lệ');
    }

    const saved = [];
    for (const item of evaluations) {
      const percent = item.kpiPercent !== undefined && item.kpiPercent !== null
        ? Math.max(0, Number(item.kpiPercent))
        : 100;

      const record = await this.prisma.monthlyKpi.upsert({
        where: {
          employeeId_month: {
            employeeId: item.employeeId,
            month,
          },
        },
        update: {
          kpiPercent: percent,
          notes: item.notes || null,
          evaluatedBy,
        },
        create: {
          employeeId: item.employeeId,
          month,
          kpiPercent: percent,
          notes: item.notes || null,
          evaluatedBy,
        },
      });

      // Nếu đã có phiếu lương trong kỳ lương tháng đó (chưa khóa), đồng bộ luôn vào payslip
      const period = await this.prisma.payrollPeriod.findUnique({ where: { month } });
      if (period && !period.isLocked) {
        const payslip = await this.prisma.payslip.findUnique({
          where: {
            periodId_employeeId: {
              periodId: period.id,
              employeeId: item.employeeId,
            },
          },
        });
        if (payslip) {
          await this.updatePayslipKpi(payslip.id, percent).catch(() => {});
        }
      }

      saved.push(record);
    }

    return {
      success: true,
      message: `Đã lưu đánh giá KPI tháng ${month} cho ${saved.length} nhân sự`,
      data: saved,
    };
  }

  // Import Thưởng, Phạt, Tạm ứng từ file Excel (.xlsx) hoặc CSV
  async importAdjustmentsFromCsv(input: Buffer | string, month: string, createdBy: string) {
    const rows: string[][] = [];

    // Kiểm tra nếu là file Excel (.xlsx - PK header)
    if (Buffer.isBuffer(input) && input.length >= 2 && input[0] === 0x50 && input[1] === 0x4b) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(input as any);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('File Excel không chứa trang tính (sheet) nào');
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const values: string[] = [];
          for (let col = 1; col <= 4; col++) {
            const cell = row.getCell(col);
            let val = cell.value;
            if (val && typeof val === 'object' && 'text' in val) {
              val = (val as any).text;
            } else if (val && typeof val === 'object' && 'result' in val) {
              val = (val as any).result;
            }
            values.push(val != null ? String(val).trim() : '');
          }
          if (values.some((v) => v.length > 0)) {
            rows.push(values);
          }
        }
      });
    } else {
      const content = Buffer.isBuffer(input) ? input.toString('utf-8') : input;
      const cleanContent = content.replace(/^\uFEFF/, '');
      const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const separator = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
        const cols = line.split(separator).map((c) => c.replace(/^["'\s]+|["'\s]+$/g, '').trim());
        if (cols.some((c) => c.length > 0)) {
          rows.push(cols);
        }
      }
    }

    if (rows.length === 0) {
      throw new BadRequestException('File không chứa dữ liệu điều chỉnh thưởng phạt');
    }

    const results = {
      total: rows.length,
      success: 0,
      errors: [] as string[],
    };

    const typeMapping: Record<string, 'DIRECTOR_BONUS' | 'FINE' | 'ADVANCE' | 'HOLIDAY_CASH_BONUS'> = {
      DIRECTOR_BONUS: 'DIRECTOR_BONUS',
      THUONG: 'DIRECTOR_BONUS',
      'THƯỞNG': 'DIRECTOR_BONUS',
      FINE: 'FINE',
      PHAT: 'FINE',
      'PHẠT': 'FINE',
      ADVANCE: 'ADVANCE',
      TAM_UNG: 'ADVANCE',
      'TẠM ỨNG': 'ADVANCE',
      HOLIDAY_CASH_BONUS: 'HOLIDAY_CASH_BONUS',
      THUONG_LE_TIEN_MAT: 'HOLIDAY_CASH_BONUS',
      'THƯỞNG LỄ TIỀN MẶT': 'HOLIDAY_CASH_BONUS',
    };

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i];
      const [empCode, typeRaw, amountRaw, reason] = cols;

      if (!empCode || !typeRaw || !amountRaw) {
        results.errors.push(`Dòng ${i + 2}: Thiếu thông tin bắt buộc (Mã NV, Loại, Số tiền)`);
        continue;
      }

      const emp = await this.prisma.employee.findUnique({
        where: { employeeCode: empCode },
      });
      if (!emp) {
        results.errors.push(`Dòng ${i + 2}: Không tìm thấy nhân viên có mã '${empCode}'`);
        continue;
      }

      const normalizedType = typeMapping[typeRaw.toUpperCase()] || typeMapping[typeRaw];
      if (!normalizedType) {
        results.errors.push(
          `Dòng ${i + 2}: Loại '${typeRaw}' không hợp lệ (hợp lệ: THƯỞNG, PHẠT, TẠM ỨNG, THƯỞNG LỄ TIỀN MẶT)`,
        );
        continue;
      }

      const amount = Number(String(amountRaw).replace(/[.,\s]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        results.errors.push(`Dòng ${i + 2}: Số tiền '${amountRaw}' không hợp lệ`);
        continue;
      }

      try {
        await this.addAdjustment({
          employeeId: emp.id,
          month,
          type: normalizedType,
          amount,
          reason: reason || 'Import từ file Excel/CSV',
          createdBy,
        });
        results.success++;
      } catch (err: any) {
        results.errors.push(`Dòng ${i + 2} (${empCode}): ${err.message}`);
      }
    }

    return results;
  }

  // Thêm khoản điều chỉnh lương (Thưởng, Phạt, Tạm ứng, Thưởng lễ tiền mặt 20/10, 8/3...)
  async addAdjustment(data: {
    employeeId: string;
    month: string;
    type: 'DIRECTOR_BONUS' | 'FINE' | 'ADVANCE' | 'HOLIDAY_CASH_BONUS';
    amount: number;
    reason: string;
    createdBy: string;
  }) {
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('Số tiền phải lớn hơn 0');
    }
    return this.prisma.adjustment.create({
      data: {
        employeeId: data.employeeId,
        month: data.month,
        type: data.type,
        amount: Number(data.amount),
        reason: data.reason,
        createdBy: data.createdBy,
      },
    });
  }

  // Lấy danh sách điều chỉnh theo tháng
  async getAdjustments(month: string) {
    return this.prisma.adjustment.findMany({
      where: { month },
      include: {
        employee: {
          select: { id: true, fullName: true, employeeCode: true, department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Xóa khoản điều chỉnh
  async deleteAdjustment(id: string) {
    return this.prisma.adjustment.delete({ where: { id } });
  }

  // Xem phiếu lương của chính nhân viên đăng nhập
  async getMyPayslip(employeeId: string, month: string) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { month } });
    if (!period) return null;

    return this.prisma.payslip.findUnique({
      where: {
        periodId_employeeId: {
          periodId: period.id,
          employeeId,
        },
      },
      include: {
        employee: true,
      },
    });
  }

  // Lấy cấu hình tham số chung HRM (Thuế TNCN, Công đoàn, LCB mặc định, BHXH...)
  async getHrmSettings() {
    const settings = await this.prisma.hrmSetting.findMany();
    const map = new Map(settings.map((s) => [s.key, s.value]));

    return {
      taxPersonalDeduction: map.has('taxPersonalDeduction')
        ? Number(map.get('taxPersonalDeduction'))
        : DEFAULT_HRM_CONFIG.taxPersonalDeduction,
      taxDependentDeduction: map.has('taxDependentDeduction')
        ? Number(map.get('taxDependentDeduction'))
        : DEFAULT_HRM_CONFIG.taxDependentDeduction,
      unionFeeMonthly: map.has('unionFeeMonthly')
        ? Number(map.get('unionFeeMonthly'))
        : DEFAULT_HRM_CONFIG.unionFeeMonthly,
      defaultBaseSalary: map.has('defaultBaseSalary')
        ? Number(map.get('defaultBaseSalary'))
        : DEFAULT_HRM_CONFIG.defaultBaseSalary,
      insuranceRateEmployee: map.has('insuranceRateEmployee')
        ? Number(map.get('insuranceRateEmployee'))
        : DEFAULT_HRM_CONFIG.insuranceRateEmployee,
    };
  }

  // Cập nhật cấu hình tham số chung HRM (Chỉ quyền Admin)
  async updateHrmSettings(data: {
    taxPersonalDeduction?: number;
    taxDependentDeduction?: number;
    unionFeeMonthly?: number;
    defaultBaseSalary?: number;
    insuranceRateEmployee?: number;
  }) {
    const entries: { key: string; value: string; description: string }[] = [];

    if (data.taxPersonalDeduction !== undefined) {
      entries.push({
        key: 'taxPersonalDeduction',
        value: String(data.taxPersonalDeduction),
        description: 'Mức giảm trừ gia cảnh cho bản thân (Thuế TNCN)',
      });
    }
    if (data.taxDependentDeduction !== undefined) {
      entries.push({
        key: 'taxDependentDeduction',
        value: String(data.taxDependentDeduction),
        description: 'Mức giảm trừ gia cảnh cho mỗi người phụ thuộc (Thuế TNCN)',
      });
    }
    if (data.unionFeeMonthly !== undefined) {
      entries.push({
        key: 'unionFeeMonthly',
        value: String(data.unionFeeMonthly),
        description: 'Mức đóng đoàn phí công đoàn hàng tháng (cho NV chính thức có BHXH)',
      });
    }
    if (data.defaultBaseSalary !== undefined) {
      entries.push({
        key: 'defaultBaseSalary',
        value: String(data.defaultBaseSalary),
        description: 'Mức lương cơ bản chuẩn mặc định',
      });
    }
    if (data.insuranceRateEmployee !== undefined) {
      entries.push({
        key: 'insuranceRateEmployee',
        value: String(data.insuranceRateEmployee),
        description: 'Tỷ lệ đóng BHXH của người lao động (10.5%)',
      });
    }

    for (const item of entries) {
      await this.prisma.hrmSetting.upsert({
        where: { key: item.key },
        update: { value: item.value, description: item.description },
        create: item,
      });
    }

    return this.getHrmSettings();
  }
}
