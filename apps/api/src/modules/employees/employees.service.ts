import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePhoneNumber } from '@snake/shared';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async getEmployees(params?: { departmentId?: string; status?: string; search?: string }) {
    const where: any = {};
    if (params?.departmentId) {
      where.departmentId = params.departmentId;
    }
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.search) {
      where.OR = [
        { fullName: { contains: params.search } },
        { phone: { contains: params.search } },
        { employeeCode: { contains: params.search } },
        { attendanceCode: { contains: params.search } },
        { bankAccount: { contains: params.search } },
      ];
    }

    const currentYear = new Date().getFullYear();
    const employees = await this.prisma.employee.findMany({
      where,
      include: {
        department: true,
        position: true,
        manager: { select: { id: true, fullName: true, employeeCode: true } },
        user: { select: { id: true, phone: true, role: true, isActive: true, mustChangePassword: true } },
        salaryProfiles: { orderBy: { effectiveDate: 'desc' }, take: 1 },
        leaveBalances: { where: { year: currentYear }, take: 1 },
        _count: { select: { documents: true, contracts: true } },
      },
      orderBy: { joinDate: 'desc' },
    });

    return employees.map((emp) => {
      const lb = emp.leaveBalances?.[0];
      let seniorityBonus = 0;
      const startDate = emp.officialDate || emp.joinDate;
      if (startDate) {
        const endOfYear = new Date(currentYear, 11, 31);
        const start = new Date(startDate);
        const diffYears = Math.max(0, Math.floor((endOfYear.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000)));
        seniorityBonus = Math.floor(diffYears / 5);
      }
      const totalEntitled = lb?.totalEntitled ?? (12 + seniorityBonus);
      const usedBeforeSystem = (lb as any)?.usedBeforeSystem ?? 0;
      const used = lb?.used ?? usedBeforeSystem;
      const systemUsed = Math.max(0, Number((used - usedBeforeSystem).toFixed(2)));
      const remaining = lb?.remaining ?? Math.max(0, Number((totalEntitled - used).toFixed(2)));

      return {
        ...emp,
        currentLeaveBalance: {
          year: currentYear,
          totalEntitled,
          seniorityBonus: lb?.seniorityBonus ?? seniorityBonus,
          usedBeforeSystem,
          systemUsed,
          used,
          remaining,
        },
      };
    });
  }

  async getEmployeeById(id: string) {
    const currentYear = new Date().getFullYear();
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        position: true,
        manager: { select: { id: true, fullName: true, employeeCode: true } },
        user: { select: { id: true, phone: true, role: true, isActive: true, mustChangePassword: true } },
        salaryProfiles: { orderBy: { effectiveDate: 'desc' } },
        contracts: { orderBy: { startDate: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        leaveBalances: { orderBy: { year: 'desc' }, take: 1 },
      },
    });
    if (!emp) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    const lb = emp.leaveBalances?.[0];
    let seniorityBonus = 0;
    const startDate = emp.officialDate || emp.joinDate;
    if (startDate) {
      const endOfYear = new Date(currentYear, 11, 31);
      const start = new Date(startDate);
      const diffYears = Math.max(0, Math.floor((endOfYear.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000)));
      seniorityBonus = Math.floor(diffYears / 5);
    }
    const totalEntitled = lb?.totalEntitled ?? (12 + seniorityBonus);
    const usedBeforeSystem = (lb as any)?.usedBeforeSystem ?? 0;
    const used = lb?.used ?? usedBeforeSystem;
    const systemUsed = Math.max(0, Number((used - usedBeforeSystem).toFixed(2)));
    const remaining = lb?.remaining ?? Math.max(0, Number((totalEntitled - used).toFixed(2)));

    return {
      ...emp,
      currentLeaveBalance: {
        year: currentYear,
        totalEntitled,
        seniorityBonus: lb?.seniorityBonus ?? seniorityBonus,
        usedBeforeSystem,
        systemUsed,
        used,
        remaining,
      },
    };
  }

  async createEmployee(data: {
    employeeCode: string;
    attendanceCode: string;
    fullName: string;
    phone: string;
    email?: string;
    dateOfBirth?: string;
    gender?: string;
    idCardNumber?: string;
    idCardDate?: string;
    idCardPlace?: string;
    addressPermanent?: string;
    addressTemporary?: string;
    departmentId?: string;
    positionId?: string;
    managerId?: string;
    joinDate: string;
    status?: string; // PROBATION | OFFICIAL | RESIGNED | MATERNITY_LEAVE | TEMPORARY_LEAVE
    probationMonths?: number;
    officialDate?: string;
    resignDate?: string;
    leaveStartDate?: string;
    leaveEndDate?: string;
    leaveNote?: string;
    hasInsurance?: boolean;
    insuranceSalary?: number;
    customBaseSalary?: number;
    taxCode?: string;
    insuranceNumber?: string;
    bankAccount?: string;
    bankName?: string;
    dependentsCount?: number;
    agreedSalary?: number;
    managementLevel?: number;
    kpiSalary?: number;
    isStoreSales?: boolean;
    role?: string;
    totalLeaveEntitled?: number;
    usedBeforeSystem?: number;
  }, currentUser?: any) {
    // Kiểm tra quyền hạn khi phân quyền Sub-Admin / Admin
    if (data.role === 'ADMIN' || data.role === 'SUB_ADMIN') {
      if (currentUser && currentUser.role !== 'ADMIN') {
        throw new ForbiddenException('Chỉ Quản trị viên tối cao (Admin) mới có quyền phân quyền Sub-Admin hoặc Admin cho nhân sự!');
      }
    }
    // Chuẩn hóa số điện thoại theo chuẩn thống nhất (bỏ dấu cách, dấu chấm, chuẩn hóa đầu số)
    const phone = normalizePhoneNumber(data.phone);
    if (!phone || phone.length < 9) {
      throw new BadRequestException('Số điện thoại không hợp lệ (tối thiểu 10 chữ số)');
    }

    // 1. Kiểm tra trùng số điện thoại
    const existPhone = await this.prisma.employee.findUnique({ where: { phone } });
    if (existPhone) {
      throw new BadRequestException(
        `Số điện thoại ${phone} đã tồn tại trong hệ thống (gắn với nhân sự ${existPhone.fullName} - ${existPhone.employeeCode})`,
      );
    }

    // 2. Kiểm tra trùng Mã nhân viên (Tuyệt đối không trùng với bất kỳ ai)
    const existEmpCode = await this.prisma.employee.findUnique({ where: { employeeCode: data.employeeCode } });
    if (existEmpCode) throw new BadRequestException(`Mã nhân viên ${data.employeeCode} đã tồn tại`);

    // 3. Kiểm tra Mã chấm công (Chỉ kiểm tra người đang cùng làm việc, người đã nghỉ có thể dùng lại mã)
    const existAttCodeActive = await this.prisma.employee.findFirst({
      where: {
        attendanceCode: data.attendanceCode,
        status: { not: 'RESIGNED' },
      },
    });
    if (existAttCodeActive) {
      throw new BadRequestException(
        `Mã chấm công ${data.attendanceCode} đang được sử dụng bởi nhân sự ${existAttCodeActive.fullName} (${existAttCodeActive.employeeCode})`,
      );
    }

    // 4. Tìm hoặc tạo tài khoản đăng nhập (Tự động tái sử dụng nếu tài khoản User tự do đã có sẵn)
    let userId: string;
    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
      include: { employee: true },
    });

    const defaultPassword = phone.length >= 6 ? phone.slice(-6) : '123456';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    if (existingUser) {
      if (existingUser.employee) {
        throw new BadRequestException(`Số điện thoại ${phone} đã liên kết với nhân sự ${existingUser.employee.fullName} (${existingUser.employee.employeeCode})`);
      }
      // Tái sử dụng user có sẵn nếu chưa gắn với nhân sự nào
      const updatedUser = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: data.role || existingUser.role || 'EMPLOYEE',
          isActive: true,
        },
      });
      userId = updatedUser.id;
    } else {
      const newUser = await this.prisma.user.create({
        data: {
          phone,
          passwordHash,
          role: data.role || 'EMPLOYEE',
          mustChangePassword: true,
          isActive: true,
        },
      });
      userId = newUser.id;
    }

    // 5. Tính toán ngày thử việc
    const joinDateTime = new Date(data.joinDate);
    const status = data.status || 'PROBATION';
    let probationEndDate: Date | null = null;
    if (status === 'PROBATION') {
      const months = data.probationMonths || 2;
      probationEndDate = new Date(joinDateTime);
      probationEndDate.setMonth(probationEndDate.getMonth() + months);
    }

    // 6. Tạo Employee
    const employee = await this.prisma.employee.create({
      data: {
        employeeCode: data.employeeCode,
        attendanceCode: data.attendanceCode,
        fullName: data.fullName,
        phone,
        email: data.email,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || 'MALE',
        idCardNumber: data.idCardNumber,
        idCardDate: data.idCardDate ? new Date(data.idCardDate) : null,
        idCardPlace: data.idCardPlace,
        addressPermanent: data.addressPermanent,
        addressTemporary: data.addressTemporary,
        departmentId: data.departmentId,
        positionId: data.positionId,
        managerId: data.managerId,
        status,
        joinDate: joinDateTime,
        probationEndDate,
        officialDate: data.officialDate ? new Date(data.officialDate) : (status === 'OFFICIAL' ? joinDateTime : null),
        resignDate: data.resignDate ? new Date(data.resignDate) : null,
        leaveStartDate: data.leaveStartDate ? new Date(data.leaveStartDate) : null,
        leaveEndDate: data.leaveEndDate ? new Date(data.leaveEndDate) : null,
        leaveNote: data.leaveNote || null,
        hasInsurance: !!data.hasInsurance,
        insuranceSalary: data.insuranceSalary ? Number(data.insuranceSalary) : null,
        customBaseSalary: data.customBaseSalary ? Number(data.customBaseSalary) : null,
        taxCode: data.taxCode,
        insuranceNumber: data.insuranceNumber,
        bankAccount: data.bankAccount,
        bankName: data.bankName,
        dependentsCount: data.dependentsCount || 0,
        kpiSalary: data.kpiSalary !== undefined ? Number(data.kpiSalary || 0) : 0,
        isStoreSales: data.isStoreSales !== undefined ? Boolean(data.isStoreSales) : false,
        userId,
      },
    });

    // 7. Khởi tạo mức lương thỏa thuận ban đầu
    if (data.agreedSalary && data.agreedSalary > 0) {
      await this.prisma.salaryProfile.create({
        data: {
          employeeId: employee.id,
          agreedSalary: Number(data.agreedSalary),
          baseSalary: data.customBaseSalary ? Number(data.customBaseSalary) : null,
          managementLevel: Number(data.managementLevel || 0),
          kpiSalary: data.kpiSalary !== undefined ? Number(data.kpiSalary || 0) : 0,
          effectiveDate: joinDateTime,
          note: status === 'PROBATION' ? 'Lương thỏa thuận thử việc' : 'Lương thỏa thuận ban đầu',
        },
      });
    }

    // 8. Khởi tạo Quỹ phép năm ban đầu (Mặc định lấy theo luật: 12 ngày + thâm niên)
    const currentYear = new Date().getFullYear();
    let seniorityBonus = 0;
    const startEmpDate = employee.officialDate || employee.joinDate;
    if (startEmpDate) {
      const endOfYear = new Date(currentYear, 11, 31);
      const start = new Date(startEmpDate);
      const diffYears = Math.max(0, Math.floor((endOfYear.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000)));
      seniorityBonus = Math.floor(diffYears / 5);
    }
    const lawEntitled = 12 + seniorityBonus;
    const totalEntitled = (data.totalLeaveEntitled !== undefined && data.totalLeaveEntitled !== null && (data.totalLeaveEntitled as any) !== '')
      ? Number(data.totalLeaveEntitled)
      : lawEntitled;
    const usedBeforeSystem = (data.usedBeforeSystem !== undefined && data.usedBeforeSystem !== null && (data.usedBeforeSystem as any) !== '')
      ? Number(data.usedBeforeSystem)
      : 0;
    const remaining = Math.max(0, Number((totalEntitled - usedBeforeSystem).toFixed(2)));

    await this.prisma.leaveBalance.create({
      data: {
        employeeId: employee.id,
        year: currentYear,
        totalEntitled,
        seniorityBonus,
        usedBeforeSystem,
        used: usedBeforeSystem,
        remaining,
      },
    }).catch(() => {});

    return {
      employee,
      user: {
        phone,
        defaultPassword,
      },
    };
  }

  async updateEmployee(id: string, data: any, currentUser?: any) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!emp) throw new NotFoundException('Không tìm thấy nhân viên');

    // Kiểm tra quyền hạn khi phân quyền Sub-Admin / Admin
    if (data.role) {
      if (data.role === 'ADMIN' || data.role === 'SUB_ADMIN') {
        if (currentUser && currentUser.role !== 'ADMIN') {
          throw new ForbiddenException('Chỉ Quản trị viên tối cao (Admin) mới có quyền phân quyền Sub-Admin hoặc Admin!');
        }
      }
    }

    // Sub-Admin không được sửa đổi tài khoản của Admin hoặc Sub-Admin khác
    if (emp.user && (emp.user.role === 'ADMIN' || emp.user.role === 'SUB_ADMIN')) {
      if (currentUser && currentUser.role === 'SUB_ADMIN' && emp.userId !== currentUser.userId) {
        throw new ForbiddenException('Sub-Admin không thể chỉnh sửa tài khoản của Admin hoặc Sub-Admin khác!');
      }
    }

    // Khởi tạo đối tượng cập nhật Employee
    const updateData: any = {};

    // 1. Kiểm tra nếu sửa Mã nhân viên -> không được trùng bất kỳ ai
    if (data.employeeCode && data.employeeCode !== emp.employeeCode) {
      const exist = await this.prisma.employee.findFirst({
        where: { employeeCode: data.employeeCode, id: { not: id } },
      });
      if (exist) {
        throw new BadRequestException(`Mã nhân viên ${data.employeeCode} đã tồn tại trong hệ thống`);
      }
    }

    // 2. Kiểm tra nếu sửa Mã chấm công -> không trùng với người đang cùng làm việc (trừ người đã nghỉ)
    if (data.attendanceCode && data.attendanceCode !== emp.attendanceCode) {
      const exist = await this.prisma.employee.findFirst({
        where: {
          attendanceCode: data.attendanceCode,
          status: { not: 'RESIGNED' },
          id: { not: id },
        },
      });
      if (exist) {
        throw new BadRequestException(
          `Mã chấm công ${data.attendanceCode} đang được sử dụng bởi ${exist.fullName} (${exist.employeeCode})`,
        );
      }
    }

    // 3. Chuẩn hóa & Cập nhật Số điện thoại & Tài khoản đăng nhập
    if (data.phone !== undefined && data.phone !== null && String(data.phone).trim() !== '') {
      const normalizedPhone = normalizePhoneNumber(data.phone);
      if (!normalizedPhone || normalizedPhone.length < 9) {
        throw new BadRequestException('Số điện thoại không hợp lệ (tối thiểu 10 chữ số, VD: 0988888888)');
      }

      // Kiểm tra xem số điện thoại mới đã bị nhân sự khác sử dụng chưa
      const existPhone = await this.prisma.employee.findFirst({
        where: { phone: normalizedPhone, id: { not: id } },
      });
      if (existPhone) {
        throw new BadRequestException(
          `Số điện thoại ${normalizedPhone} đã tồn tại trong hệ thống (gắn với ${existPhone.fullName} - ${existPhone.employeeCode})`,
        );
      }

      // Luôn đảm bảo tài khoản User được đồng bộ theo số điện thoại chuẩn hóa mới
      if (emp.userId) {
        const existUser = await this.prisma.user.findFirst({
          where: { phone: normalizedPhone, id: { not: emp.userId } },
          include: { employee: true },
        });

        if (existUser) {
          if (!existUser.employee) {
            // Xóa tài khoản tự do không liên kết nhân viên nào để giải phóng số điện thoại
            await this.prisma.user.delete({ where: { id: existUser.id } });
          } else {
            throw new BadRequestException(
              `Số điện thoại ${normalizedPhone} đã được liên kết với nhân sự ${existUser.employee.fullName} (${existUser.employee.employeeCode})!`,
            );
          }
        }

        const userUpdateData: any = { phone: normalizedPhone };
        // Nếu nhân viên vẫn đang dùng mật khẩu khởi tạo (chưa đổi mật khẩu riêng),
        // tự động cập nhật lại mật khẩu mặc định theo 6 số cuối của SĐT mới để họ đăng nhập được ngay
        if (emp.user?.mustChangePassword) {
          const newDefaultPass = normalizedPhone.length >= 6 ? normalizedPhone.slice(-6) : '123456';
          const salt = await bcrypt.genSalt(10);
          userUpdateData.passwordHash = await bcrypt.hash(newDefaultPass, salt);
        }

        await this.prisma.user.update({
          where: { id: emp.userId },
          data: userUpdateData,
        });
      } else {
        // Nếu nhân sự chưa có User liên kết, tạo mới User và gán vào
        const defaultPassword = normalizedPhone.length >= 6 ? normalizedPhone.slice(-6) : '123456';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);
        const newUser = await this.prisma.user.create({
          data: {
            phone: normalizedPhone,
            passwordHash,
            role: data.role || 'EMPLOYEE',
            mustChangePassword: true,
            isActive: emp.status !== 'RESIGNED',
          },
        });
        updateData.userId = newUser.id;
      }

      updateData.phone = normalizedPhone;
    }

    // Cập nhật mức lương thỏa thuận, phụ cấp quản lý hoặc lương KPI nếu có
    if (
      (data.agreedSalary !== undefined && Number(data.agreedSalary) > 0) ||
      data.managementLevel !== undefined ||
      data.kpiSalary !== undefined ||
      data.customBaseSalary !== undefined
    ) {
      // Tìm hồ sơ lương ban đầu và hồ sơ lương mới nhất hiện tại
      const initialProfile = await this.prisma.salaryProfile.findFirst({
        where: { employeeId: id },
        orderBy: { effectiveDate: 'asc' },
      });
      const latestProfile = await this.prisma.salaryProfile.findFirst({
        where: { employeeId: id },
        orderBy: { effectiveDate: 'desc' },
      });

      const agreedSalary = (data.agreedSalary !== undefined && Number(data.agreedSalary) > 0)
        ? Number(data.agreedSalary)
        : (latestProfile ? latestProfile.agreedSalary : 0);
      const managementLevel = data.managementLevel !== undefined
        ? Number(data.managementLevel)
        : (latestProfile ? latestProfile.managementLevel : 0);
      const kpiSalary = data.kpiSalary !== undefined
        ? Number(data.kpiSalary || 0)
        : (latestProfile?.kpiSalary !== null && latestProfile?.kpiSalary !== undefined ? latestProfile.kpiSalary : (emp.kpiSalary || 0));
      const baseSalaryVal = data.customBaseSalary !== undefined
        ? (data.customBaseSalary ? Number(data.customBaseSalary) : null)
        : emp.customBaseSalary;

      if (agreedSalary > 0) {
        if (initialProfile) {
          // Quy tắc: Khi Cập nhật cấu hình lương & KPI thì mốc thời gian áp dụng giữ nguyên
          // như chỉ số thỏa thuận ban đầu. TUYỆT ĐỐI không tạo thêm đợt tăng lương mới với ngày hôm nay (new Date()).
          // Chỉ khi dùng chức năng "Thêm đợt tăng lương chuyên môn" mới tính mốc thời gian áp dụng mới.
          const targetProfile = (latestProfile && latestProfile.id !== initialProfile.id && latestProfile.note?.includes('Tăng lương chuyên môn'))
            ? latestProfile
            : initialProfile;

          await this.prisma.salaryProfile.update({
            where: { id: targetProfile.id },
            data: {
              agreedSalary,
              baseSalary: baseSalaryVal,
              managementLevel,
              kpiSalary,
              // Giữ nguyên mốc thời gian áp dụng ban đầu
              effectiveDate: targetProfile.effectiveDate || emp.joinDate || new Date(),
              note: targetProfile.note || 'Lương thỏa thuận ban đầu',
            },
          });
        } else {
          // Chưa có hồ sơ lương nào -> Khởi tạo gắn liền với mốc ngày thỏa thuận ban đầu (joinDate)
          await this.prisma.salaryProfile.create({
            data: {
              employeeId: id,
              agreedSalary,
              baseSalary: baseSalaryVal,
              managementLevel,
              kpiSalary,
              effectiveDate: emp.joinDate || new Date(),
              note: 'Lương thỏa thuận ban đầu',
            },
          });
        }
      }
    }

    if (data.role && emp.userId) {
      await this.prisma.user.update({
        where: { id: emp.userId },
        data: { role: data.role },
      });
    }

    // Chỉ lọc các trường dữ liệu hợp lệ thuộc bảng Employee (tránh lỗi Prisma Unknown Argument)
    if (data.employeeCode !== undefined) updateData.employeeCode = data.employeeCode;
    if (data.attendanceCode !== undefined) updateData.attendanceCode = data.attendanceCode;
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.idCardNumber !== undefined) updateData.idCardNumber = data.idCardNumber || null;
    if (data.idCardPlace !== undefined) updateData.idCardPlace = data.idCardPlace || null;
    if (data.addressPermanent !== undefined) updateData.addressPermanent = data.addressPermanent || null;
    if (data.addressTemporary !== undefined) updateData.addressTemporary = data.addressTemporary || null;
    if (data.taxCode !== undefined) updateData.taxCode = data.taxCode || null;
    if (data.insuranceNumber !== undefined) updateData.insuranceNumber = data.insuranceNumber || null;
    if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount || null;
    if (data.bankName !== undefined) updateData.bankName = data.bankName || null;
    if (data.dependentsCount !== undefined) updateData.dependentsCount = Number(data.dependentsCount || 0);

    // Foreign keys
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId || null;
    if (data.positionId !== undefined) updateData.positionId = data.positionId || null;
    if (data.managerId !== undefined) updateData.managerId = data.managerId || null;

    // Date & Numeric fields
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    if (data.idCardDate !== undefined) updateData.idCardDate = data.idCardDate ? new Date(data.idCardDate) : null;
    if (data.joinDate !== undefined) {
      updateData.joinDate = new Date(data.joinDate);
      const initProfile = await this.prisma.salaryProfile.findFirst({
        where: { employeeId: id },
        orderBy: { effectiveDate: 'asc' },
      });
      if (initProfile && (!initProfile.note || initProfile.note.includes('thỏa thuận') || initProfile.note.includes('file chấm công'))) {
        await this.prisma.salaryProfile.update({
          where: { id: initProfile.id },
          data: { effectiveDate: new Date(data.joinDate) },
        });
      }
    }
    if (data.probationEndDate !== undefined) updateData.probationEndDate = data.probationEndDate ? new Date(data.probationEndDate) : null;
    if (data.officialDate !== undefined) updateData.officialDate = data.officialDate ? new Date(data.officialDate) : null;
    if (data.resignDate !== undefined) updateData.resignDate = data.resignDate ? new Date(data.resignDate) : null;
    if (data.leaveStartDate !== undefined) updateData.leaveStartDate = data.leaveStartDate ? new Date(data.leaveStartDate) : null;
    if (data.leaveEndDate !== undefined) updateData.leaveEndDate = data.leaveEndDate ? new Date(data.leaveEndDate) : null;
    if (data.leaveNote !== undefined) updateData.leaveNote = data.leaveNote || null;
    if (data.hasInsurance !== undefined) updateData.hasInsurance = Boolean(data.hasInsurance);
    if (data.customBaseSalary !== undefined) updateData.customBaseSalary = data.customBaseSalary ? Number(data.customBaseSalary) : null;
    if (data.insuranceSalary !== undefined) updateData.insuranceSalary = data.insuranceSalary ? Number(data.insuranceSalary) : null;
    if (data.kpiSalary !== undefined) updateData.kpiSalary = Number(data.kpiSalary || 0);
    if (data.isStoreSales !== undefined) updateData.isStoreSales = Boolean(data.isStoreSales);

    // Cập nhật quỹ phép năm nếu có gửi kèm
    if (data.totalLeaveEntitled !== undefined || data.usedBeforeSystem !== undefined) {
      const currentYear = new Date().getFullYear();
      const lb = await this.prisma.leaveBalance.findUnique({
        where: { employeeId_year: { employeeId: id, year: currentYear } },
      });

      let seniorityBonus = lb?.seniorityBonus ?? 0;
      const startEmpDate = emp.officialDate || emp.joinDate;
      if (startEmpDate) {
        const endOfYear = new Date(currentYear, 11, 31);
        const start = new Date(startEmpDate);
        const diffYears = Math.max(0, Math.floor((endOfYear.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000)));
        seniorityBonus = Math.floor(diffYears / 5);
      }

      // Đếm số ngày phép đã duyệt qua đơn trên hệ thống
      const approvedRequests = await this.prisma.request.findMany({
        where: {
          employeeId: id,
          type: 'LEAVE',
          status: 'APPROVED',
          targetDate: {
            gte: new Date(currentYear, 0, 1),
            lte: new Date(currentYear, 11, 31, 23, 59, 59),
          },
        },
      });
      const systemUsed = approvedRequests.reduce(
        (sum, r) => sum + (r.minutes ? Number((r.minutes / 480).toFixed(2)) : 1),
        0,
      );

      const totalEntitled = (data.totalLeaveEntitled !== undefined && data.totalLeaveEntitled !== null && (data.totalLeaveEntitled as any) !== '')
        ? Number(data.totalLeaveEntitled)
        : (lb?.totalEntitled ?? (12 + seniorityBonus));

      const usedBeforeSystem = (data.usedBeforeSystem !== undefined && data.usedBeforeSystem !== null && (data.usedBeforeSystem as any) !== '')
        ? Number(data.usedBeforeSystem)
        : ((lb as any)?.usedBeforeSystem ?? 0);

      const totalUsed = Number((usedBeforeSystem + systemUsed).toFixed(2));
      const remaining = Math.max(0, Number((totalEntitled - totalUsed).toFixed(2)));

      await this.prisma.leaveBalance.upsert({
        where: { employeeId_year: { employeeId: id, year: currentYear } },
        create: {
          employeeId: id,
          year: currentYear,
          totalEntitled,
          seniorityBonus,
          usedBeforeSystem,
          used: totalUsed,
          remaining,
        },
        update: {
          totalEntitled,
          seniorityBonus,
          usedBeforeSystem,
          used: totalUsed,
          remaining,
        },
      }).catch(() => {});
    }

    return this.prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        position: true,
        user: true,
      },
    });
  }

  // Thêm quyết định tăng lương chuyên môn
  async addSalaryRaise(
    employeeId: string,
    data: { agreedSalary: number; baseSalary?: number; managementLevel?: number; kpiSalary?: number; effectiveDate: string; note: string },
  ) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new NotFoundException('Không tìm thấy nhân viên');

    const baseSalary = data.baseSalary !== undefined && data.baseSalary !== null
      ? (data.baseSalary > 0 ? Number(data.baseSalary) : null)
      : emp.customBaseSalary;

    const kpiSalary = data.kpiSalary !== undefined ? Number(data.kpiSalary || 0) : (emp.kpiSalary || 0);

    const empUpdate: any = {};
    if (data.baseSalary !== undefined) empUpdate.customBaseSalary = baseSalary;
    if (data.kpiSalary !== undefined) empUpdate.kpiSalary = kpiSalary;

    if (Object.keys(empUpdate).length > 0) {
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: empUpdate,
      });
    }

    return this.prisma.salaryProfile.create({
      data: {
        employeeId,
        agreedSalary: Number(data.agreedSalary),
        baseSalary,
        managementLevel: Number(data.managementLevel || 0),
        kpiSalary,
        effectiveDate: new Date(data.effectiveDate),
        note: data.note || 'Tăng lương chuyên môn',
      },
    });
  }

  // Xóa lịch sử tăng lương
  async deleteSalaryProfile(employeeId: string, profileId: string) {
    const profile = await this.prisma.salaryProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) {
      throw new NotFoundException('Không tìm thấy bản ghi lương cần xóa');
    }
    if (profile.employeeId !== employeeId) {
      throw new BadRequestException('Bản ghi lương không thuộc về nhân sự này');
    }

    const totalProfiles = await this.prisma.salaryProfile.count({
      where: { employeeId },
    });

    if (totalProfiles <= 1) {
      throw new BadRequestException(
        'Không thể xóa hồ sơ lương khởi điểm ban đầu duy nhất của nhân sự. Nếu muốn điều chỉnh mức thỏa thuận ban đầu, vui lòng sử dụng chức năng "Cập nhật cấu hình lương & KPI".',
      );
    }

    await this.prisma.salaryProfile.delete({
      where: { id: profileId },
    });

    // Cập nhật lại kpiSalary và customBaseSalary cho Employee theo bản ghi mới nhất còn lại
    const latestRemaining = await this.prisma.salaryProfile.findFirst({
      where: { employeeId },
      orderBy: { effectiveDate: 'desc' },
    });

    if (latestRemaining) {
      const updateData: any = {};
      if (latestRemaining.kpiSalary !== undefined && latestRemaining.kpiSalary !== null) {
        updateData.kpiSalary = latestRemaining.kpiSalary;
      }
      if (latestRemaining.baseSalary !== undefined) {
        updateData.customBaseSalary = latestRemaining.baseSalary;
      }
      if (Object.keys(updateData).length > 0) {
        await this.prisma.employee.update({
          where: { id: employeeId },
          data: updateData,
        });
      }
    }

    return {
      success: true,
      message: 'Đã xóa quyết định tăng lương thành công',
      latestAgreedSalary: latestRemaining?.agreedSalary,
    };
  }

  // Chuyển thử việc -> chính thức
  async promoteToOfficial(id: string, data: { officialDate: string; agreedSalary?: number; managementLevel?: number; kpiSalary?: number }) {
    const emp = await this.prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException('Không tìm thấy nhân viên');

    const officialDate = new Date(data.officialDate);

    const empUpdate: any = {
      status: 'OFFICIAL',
      officialDate,
    };
    if (data.kpiSalary !== undefined) {
      empUpdate.kpiSalary = Number(data.kpiSalary || 0);
    }

    await this.prisma.employee.update({
      where: { id },
      data: empUpdate,
    });

    if (data.agreedSalary && data.agreedSalary > 0) {
      await this.prisma.salaryProfile.create({
        data: {
          employeeId: id,
          agreedSalary: Number(data.agreedSalary),
          managementLevel: Number(data.managementLevel || 0),
          kpiSalary: data.kpiSalary !== undefined ? Number(data.kpiSalary || 0) : (emp.kpiSalary || 0),
          effectiveDate: officialDate,
          note: 'Chuyển nhân sự chính thức',
        },
      });
    }

    return { success: true, message: 'Đã chuyển nhân sự sang chính thức thành công' };
  }

  // Nghỉ việc
  async resignEmployee(id: string, data: { resignDate: string; reason?: string }) {
    const emp = await this.prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException('Không tìm thấy nhân viên');

    const resignDate = new Date(data.resignDate);

    await this.prisma.$transaction([
      this.prisma.employee.update({
        where: { id },
        data: {
          status: 'RESIGNED',
          resignDate,
        },
      }),
      this.prisma.user.update({
        where: { id: emp.userId },
        data: { isActive: false },
      }),
    ]);

    return { success: true, message: 'Đã cập nhật trạng thái nghỉ việc và khóa tài khoản' };
  }

  // Reset mật khẩu
  async resetPassword(id: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException('Không tìm thấy nhân viên');

    const cleanPhone = normalizePhoneNumber(emp.phone);
    const newPassword = cleanPhone.length >= 6 ? cleanPhone.slice(-6) : '123456';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    if (emp.userId) {
      await this.prisma.user.update({
        where: { id: emp.userId },
        data: {
          phone: cleanPhone,
          passwordHash,
          mustChangePassword: true,
        },
      });
    }

    return { success: true, newPassword };
  }

  // Import hàng loạt nhân sự từ file Excel (.xlsx) hoặc CSV
  async importEmployees(input: Buffer | string) {
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
          for (let col = 1; col <= 17; col++) {
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
      throw new BadRequestException('File không chứa dữ liệu nhân sự');
    }

    const results = {
      total: rows.length,
      success: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i];
      const [
        empCode,
        attCode,
        fullName,
        phone,
        email,
        idCard,
        joinDateStr,
        statusStr,
        salaryStr,
        bankName,
        bankAccount,
        dobStr,
        officialDateStr,
        customBaseSalaryStr,
        insuranceSalaryStr,
        resignDateStr,
        kpiSalaryStr,
      ] = cols;

      if (!empCode || !attCode || !fullName || !phone) {
        results.errors.push(`Dòng ${i + 2}: Thiếu thông tin bắt buộc (Mã NV, Mã chấm công, Họ tên, SĐT)`);
        continue;
      }

      const cleanPhone = normalizePhoneNumber(phone);
      if (!cleanPhone || cleanPhone.length < 9) {
        results.errors.push(`Dòng ${i + 2} (${fullName}): Số điện thoại '${phone}' không hợp lệ`);
        continue;
      }

      try {
        const customBase = customBaseSalaryStr ? Number(String(customBaseSalaryStr).replace(/[.,\s]/g, '')) : undefined;
        const kpiSal = kpiSalaryStr ? Number(String(kpiSalaryStr).replace(/[.,\s]/g, '')) : undefined;
        const isInsurance =
          insuranceSalaryStr?.toUpperCase() === 'CÓ' ||
          insuranceSalaryStr?.toUpperCase() === 'YES' ||
          insuranceSalaryStr?.toUpperCase() === 'TRUE' ||
          Boolean(Number(String(insuranceSalaryStr).replace(/[.,\s]/g, '')) > 0);

        // Kiểm tra xem nhân viên đã tồn tại theo Mã NV hoặc Số điện thoại chưa (hỗ trợ Import thông minh / Upsert)
        const existingEmp = await this.prisma.employee.findFirst({
          where: {
            OR: [
              { employeeCode: empCode },
              { phone: cleanPhone },
            ],
          },
        });

        if (existingEmp) {
          await this.updateEmployee(existingEmp.id, {
            employeeCode: empCode,
            attendanceCode: attCode,
            fullName,
            phone: cleanPhone,
            email: email || undefined,
            idCardNumber: idCard || undefined,
            joinDate: joinDateStr || undefined,
            status:
              statusStr?.toUpperCase() === 'CHÍNH THỨC' || statusStr?.toUpperCase() === 'OFFICIAL'
                ? 'OFFICIAL'
                : 'PROBATION',
            agreedSalary: Number(String(salaryStr).replace(/[.,\s]/g, '')) || undefined,
            bankName: bankName || undefined,
            bankAccount: bankAccount || undefined,
            dateOfBirth: dobStr || undefined,
            officialDate: officialDateStr || undefined,
            resignDate: resignDateStr || undefined,
            customBaseSalary: customBase && customBase > 0 ? customBase : undefined,
            kpiSalary: kpiSal !== undefined ? kpiSal : undefined,
            hasInsurance: isInsurance,
          });
        } else {
          await this.createEmployee({
            employeeCode: empCode,
            attendanceCode: attCode,
            fullName,
            phone: cleanPhone,
            email: email || undefined,
            idCardNumber: idCard || undefined,
            joinDate: joinDateStr || new Date().toISOString().slice(0, 10),
            status:
              statusStr?.toUpperCase() === 'CHÍNH THỨC' || statusStr?.toUpperCase() === 'OFFICIAL'
                ? 'OFFICIAL'
                : 'PROBATION',
            agreedSalary: Number(String(salaryStr).replace(/[.,\s]/g, '')) || 10000000,
            bankName: bankName || undefined,
            bankAccount: bankAccount || undefined,
            dateOfBirth: dobStr || undefined,
            officialDate: officialDateStr || undefined,
            resignDate: resignDateStr || undefined,
            customBaseSalary: customBase && customBase > 0 ? customBase : undefined,
            kpiSalary: kpiSal || 0,
            hasInsurance: isInsurance,
          });
        }
        results.success++;
      } catch (err: any) {
        results.errors.push(`Dòng ${i + 2} (${fullName}): ${err.message}`);
      }
    }

    return results;
  }

  // Xóa một nhân sự
  async deleteEmployee(id: string, currentUser?: any) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!emp) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    if (emp.user?.role === 'ADMIN') {
      throw new BadRequestException('Không thể xóa tài khoản Quản trị viên tối cao!');
    }

    if (emp.user?.role === 'SUB_ADMIN' && currentUser?.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ Quản trị viên tối cao (Admin) mới có quyền xóa tài khoản Sub-Admin!');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.adjustment.deleteMany({ where: { employeeId: id } });
      await tx.payslip.deleteMany({ where: { employeeId: id } });
      await tx.violationRecord.deleteMany({ where: { employeeId: id } });
      await tx.attendanceDay.deleteMany({ where: { employeeId: id } });
      await tx.punch.deleteMany({ where: { employeeId: id } });
      await tx.makeupDebt.deleteMany({ where: { employeeId: id } });
      await tx.request.deleteMany({ where: { employeeId: id } });
      await tx.leaveBalance.deleteMany({ where: { employeeId: id } });
      await tx.salaryProfile.deleteMany({ where: { employeeId: id } });
      await tx.contract.deleteMany({ where: { employeeId: id } });
      await tx.employeeDocument.deleteMany({ where: { employeeId: id } });

      await tx.employee.delete({ where: { id } });

      if (emp.userId) {
        await tx.user.delete({ where: { id: emp.userId } }).catch(() => {});
      }
    });

    return { success: true, message: 'Đã xóa nhân sự thành công' };
  }

  // XÓA TOÀN BỘ DỮ LIỆU NHÂN SỰ ĐỂ TẢI LẠI MỚI (CHỈ ADMIN TỐI CAO ĐƯỢC PHÉP)
  async clearAllEmployees(adminUserId: string, currentUserRole: string, confirmation: string, password?: string) {
    if (currentUserRole !== 'ADMIN') {
      throw new ForbiddenException('Chỉ Quản trị viên tối cao (Admin) mới có quyền xóa toàn bộ dữ liệu nhân sự!');
    }

    if (!confirmation || confirmation.trim() !== 'XOA TOAN BO') {
      throw new BadRequestException('Cụm từ xác nhận không chính xác. Vui lòng nhập đúng: "XOA TOAN BO"');
    }

    // Xác thực mật khẩu admin nếu có gửi lên
    if (password) {
      const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
      if (!adminUser) {
        throw new NotFoundException('Không tìm thấy thông tin tài khoản Quản trị viên');
      }
      const isMatch = await bcrypt.compare(password, adminUser.passwordHash);
      if (!isMatch) {
        throw new BadRequestException('Mật khẩu xác thực của Quản trị viên không chính xác!');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Chấm công & tính lương
      await tx.adjustment.deleteMany({});
      await tx.payslip.deleteMany({});
      await tx.payrollPeriod.deleteMany({});
      await tx.violationRecord.deleteMany({});
      await tx.attendanceDay.deleteMany({});
      await tx.punch.deleteMany({});
      await tx.attendanceImport.deleteMany({});
      await tx.makeupDebt.deleteMany({});
      await tx.request.deleteMany({});
      await tx.leaveBalance.deleteMany({});

      // 2. Hồ sơ nhân sự
      await tx.salaryProfile.deleteMany({});
      await tx.contract.deleteMany({});
      await tx.employeeDocument.deleteMany({});
      await tx.employee.deleteMany({});

      // 3. Xóa các tài khoản User nhân sự (Chỉ giữ lại tài khoản Quản trị viên đang thực hiện xóa và tài khoản Admin 0988888888)
      await tx.user.deleteMany({
        where: {
          AND: [
            { id: { not: adminUserId } },
            { phone: { not: '0988888888' } },
          ],
        },
      });
    });

    return {
      success: true,
      message: 'Đã xóa sạch toàn bộ dữ liệu nhân sự thành công. Hệ thống đã sẵn sàng để tải lên danh sách mới!',
    };
  }
}
