import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrgService {
  constructor(private prisma: PrismaService) {}

  // =================== PHÒNG BAN ===================
  async getDepartments() {
    return this.prisma.department.findMany({
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createDepartment(data: {
    code: string;
    name: string;
    parentId?: string;
    managerId?: string;
    standardWorkDays?: number;
    otRatePerHour?: number;
    unionFee?: number;
    isStoreSales?: boolean;
  }) {
    const exist = await this.prisma.department.findUnique({ where: { code: data.code } });
    if (exist) {
      throw new BadRequestException(`Mã phòng ban ${data.code} đã tồn tại`);
    }
    const isStore = Boolean(data.isStoreSales);
    const unionFee = (data.unionFee !== undefined && data.unionFee !== null)
      ? Number(data.unionFee)
      : (isStore ? 0 : 50000);

    return this.prisma.department.create({
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId || null,
        managerId: data.managerId || null,
        standardWorkDays: data.standardWorkDays ? Number(data.standardWorkDays) : 26,
        otRatePerHour: data.otRatePerHour ? Number(data.otRatePerHour) : 50000,
        unionFee,
        isStoreSales: isStore,
      },
    });
  }

  async updateDepartment(
    id: string,
    data: {
      name?: string;
      parentId?: string;
      managerId?: string;
      standardWorkDays?: number;
      otRatePerHour?: number;
      unionFee?: number;
      isStoreSales?: boolean;
    },
  ) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.parentId !== undefined) updateData.parentId = data.parentId || null;
    if (data.managerId !== undefined) updateData.managerId = data.managerId || null;
    if (data.standardWorkDays !== undefined) updateData.standardWorkDays = Number(data.standardWorkDays) || 26;
    if (data.otRatePerHour !== undefined) updateData.otRatePerHour = Number(data.otRatePerHour) || 50000;
    if (data.unionFee !== undefined && data.unionFee !== null) {
      updateData.unionFee = Number(data.unionFee);
    }
    if (data.isStoreSales !== undefined) {
      updateData.isStoreSales = Boolean(data.isStoreSales);
      if (updateData.isStoreSales && (data.unionFee === undefined || data.unionFee === null)) {
        // Nhóm nhân viên cửa hàng thì mặc định tiền trích công đoàn là 0
        updateData.unionFee = 0;
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteDepartment(id: string) {
    const count = await this.prisma.employee.count({ where: { departmentId: id } });
    if (count > 0) {
      throw new BadRequestException(`Không thể xóa phòng ban đang có ${count} nhân sự`);
    }
    return this.prisma.department.delete({ where: { id } });
  }

  // =================== CHỨC DANH ===================
  async getPositions() {
    return this.prisma.position.findMany({
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPosition(data: { code: string; name: string }) {
    const exist = await this.prisma.position.findUnique({ where: { code: data.code } });
    if (exist) {
      throw new BadRequestException(`Mã chức danh ${data.code} đã tồn tại`);
    }
    return this.prisma.position.create({ data });
  }

  async updatePosition(id: string, data: { name: string }) {
    return this.prisma.position.update({
      where: { id },
      data,
    });
  }

  async deletePosition(id: string) {
    const count = await this.prisma.employee.count({ where: { positionId: id } });
    if (count > 0) {
      throw new BadRequestException(`Không thể xóa chức danh đang có ${count} nhân sự`);
    }
    return this.prisma.position.delete({ where: { id } });
  }
}
