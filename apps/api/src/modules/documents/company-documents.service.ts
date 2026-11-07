import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { unlinkSync, existsSync } from 'fs';

@Injectable()
export class CompanyDocumentsService {
  constructor(private prisma: PrismaService) {}

  // Lấy danh sách văn bản (mọi nhân viên đều có quyền xem)
  async getDocuments(params: { category?: string; search?: string }) {
    const where: any = {};
    if (params.category && params.category !== 'ALL') {
      where.category = params.category;
    }
    if (params.search) {
      where.OR = [
        { title: { contains: params.search } },
        { documentNumber: { contains: params.search } },
        { description: { contains: params.search } },
      ];
    }

    return this.prisma.companyDocument.findMany({
      where,
      orderBy: { effectiveDate: 'desc' },
    });
  }

  // Xem chi tiết một văn bản
  async getDocumentById(id: string) {
    const doc = await this.prisma.companyDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    return doc;
  }

  // Thêm văn bản mới (Admin / HR)
  async createDocument(data: {
    title: string;
    documentNumber?: string;
    category: string;
    effectiveDate?: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
    description?: string;
  }) {
    return this.prisma.companyDocument.create({
      data: {
        title: data.title,
        documentNumber: data.documentNumber,
        category: data.category || 'QUY_CHE',
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
        fileName: data.fileName,
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedBy: data.uploadedBy,
        description: data.description,
      },
    });
  }

  // Xóa văn bản (Chỉ Admin)
  async deleteDocument(id: string) {
    const doc = await this.prisma.companyDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu cần xóa');

    // Xóa file vật lý trên đĩa nếu tồn tại
    try {
      if (existsSync(doc.filePath)) {
        unlinkSync(doc.filePath);
      }
    } catch (e) {
      // bỏ qua lỗi file nếu đã bị xóa trước
    }

    return this.prisma.companyDocument.delete({ where: { id } });
  }
}
