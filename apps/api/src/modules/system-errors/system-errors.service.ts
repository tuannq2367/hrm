import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SystemErrorsService {
  constructor(private prisma: PrismaService) {}

  async getErrors(status?: string) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    return this.prisma.systemError.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getErrorById(id: string) {
    const error = await this.prisma.systemError.findUnique({ where: { id } });
    if (!error) throw new NotFoundException('Không tìm thấy bản ghi lỗi');
    return error;
  }

  async resolveError(id: string, note?: string, resolvedBy?: string) {
    const error = await this.prisma.systemError.findUnique({ where: { id } });
    if (!error) throw new NotFoundException('Không tìm thấy bản ghi lỗi');

    return this.prisma.systemError.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolutionNote: note || 'Đã sửa chữa và khắc phục',
        resolvedAt: new Date(),
        resolvedBy: resolvedBy || 'Admin',
      },
    });
  }

  async reopenError(id: string) {
    return this.prisma.systemError.update({
      where: { id },
      data: {
        status: 'OPEN',
        resolutionNote: null,
        resolvedAt: null,
        resolvedBy: null,
      },
    });
  }
}
