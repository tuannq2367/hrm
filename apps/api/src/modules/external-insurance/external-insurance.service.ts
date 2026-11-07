import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExternalInsuranceService {
  constructor(private prisma: PrismaService) {}

  // Lấy danh sách người gửi đóng BHXH
  async getAll(query?: { status?: string; search?: string }) {
    const where: any = {};

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { phone: { contains: q } },
        { idCard: { contains: q } },
        { insuranceCode: { contains: q } },
      ];
    }

    return this.prisma.externalInsurance.findMany({
      where,
      include: {
        payments: {
          orderBy: { month: 'desc' },
          take: 12,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Xem chi tiết 1 người gửi đóng
  async getById(id: string) {
    const item = await this.prisma.externalInsurance.findUnique({
      where: { id },
      include: {
        payments: {
          orderBy: { month: 'desc' },
        },
      },
    });
    if (!item) {
      throw new NotFoundException('Không tìm thấy thông tin người gửi đóng BHXH');
    }
    return item;
  }

  // Thêm mới hồ sơ gửi đóng BHXH
  async create(data: {
    fullName: string;
    phone?: string;
    idCard?: string;
    insuranceCode?: string;
    insuranceSalary: number;
    contributionRate?: number;
    monthlyAmount?: number;
    startDate: string;
    endDate?: string;
    status?: string;
    notes?: string;
  }) {
    if (!data.fullName || !data.fullName.trim()) {
      throw new BadRequestException('Vui lòng nhập họ và tên người gửi đóng');
    }
    if (!data.insuranceSalary || Number(data.insuranceSalary) <= 0) {
      throw new BadRequestException('Mức lương đóng BHXH phải lớn hơn 0');
    }
    if (!data.startDate) {
      throw new BadRequestException('Vui lòng chọn ngày bắt đầu gửi đóng');
    }

    const rate = data.contributionRate !== undefined ? Number(data.contributionRate) : 32;
    const monthlyAmount =
      data.monthlyAmount !== undefined && Number(data.monthlyAmount) > 0
        ? Number(data.monthlyAmount)
        : Math.round((Number(data.insuranceSalary) * rate) / 100);

    return this.prisma.externalInsurance.create({
      data: {
        fullName: data.fullName.trim(),
        phone: data.phone?.trim() || null,
        idCard: data.idCard?.trim() || null,
        insuranceCode: data.insuranceCode?.trim() || null,
        insuranceSalary: Number(data.insuranceSalary),
        contributionRate: rate,
        monthlyAmount,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status || 'ACTIVE',
        notes: data.notes?.trim() || null,
      },
    });
  }

  // Cập nhật thông tin hồ sơ gửi đóng BHXH
  async update(
    id: string,
    data: {
      fullName?: string;
      phone?: string;
      idCard?: string;
      insuranceCode?: string;
      insuranceSalary?: number;
      contributionRate?: number;
      monthlyAmount?: number;
      startDate?: string;
      endDate?: string;
      status?: string;
      notes?: string;
    },
  ) {
    const existing = await this.prisma.externalInsurance.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thông tin người gửi đóng BHXH');
    }

    const updateData: any = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.idCard !== undefined) updateData.idCard = data.idCard?.trim() || null;
    if (data.insuranceCode !== undefined) updateData.insuranceCode = data.insuranceCode?.trim() || null;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    if (data.insuranceSalary !== undefined) updateData.insuranceSalary = Number(data.insuranceSalary);
    if (data.contributionRate !== undefined) updateData.contributionRate = Number(data.contributionRate);

    // Tính lại số tiền nộp hàng tháng nếu có thay đổi lương hoặc tỷ lệ
    const targetSalary = data.insuranceSalary !== undefined ? Number(data.insuranceSalary) : existing.insuranceSalary;
    const targetRate = data.contributionRate !== undefined ? Number(data.contributionRate) : (existing.contributionRate || 32);

    if (data.monthlyAmount !== undefined && Number(data.monthlyAmount) > 0) {
      updateData.monthlyAmount = Number(data.monthlyAmount);
    } else if (data.insuranceSalary !== undefined || data.contributionRate !== undefined) {
      updateData.monthlyAmount = Math.round((targetSalary * targetRate) / 100);
    }

    return this.prisma.externalInsurance.update({
      where: { id },
      data: updateData,
    });
  }

  // Xóa hồ sơ
  async delete(id: string) {
    const existing = await this.prisma.externalInsurance.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thông tin');
    }
    return this.prisma.externalInsurance.delete({ where: { id } });
  }

  // Ghi nhận kỳ đóng tiền (hoặc cập nhật nếu đã đóng tháng đó)
  async recordPayment(
    externalInsuranceId: string,
    data: {
      month: string;
      amount: number;
      paymentDate: string;
      paymentMethod?: string;
      receiptNumber?: string;
      notes?: string;
      receivedBy: string;
    },
  ) {
    const person = await this.prisma.externalInsurance.findUnique({
      where: { id: externalInsuranceId },
    });
    if (!person) {
      throw new NotFoundException('Không tìm thấy người gửi đóng BHXH');
    }

    if (!data.month || !/^\d{4}-\d{2}$/.test(data.month)) {
      throw new BadRequestException('Tháng không đúng định dạng YYYY-MM');
    }
    if (!data.amount || Number(data.amount) <= 0) {
      throw new BadRequestException('Số tiền đóng phải lớn hơn 0');
    }

    return this.prisma.externalInsurancePayment.upsert({
      where: {
        externalInsuranceId_month: {
          externalInsuranceId,
          month: data.month,
        },
      },
      update: {
        amount: Number(data.amount),
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        paymentMethod: data.paymentMethod || 'TRANSFER',
        receiptNumber: data.receiptNumber || null,
        notes: data.notes || null,
        receivedBy: data.receivedBy,
      },
      create: {
        externalInsuranceId,
        month: data.month,
        amount: Number(data.amount),
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        paymentMethod: data.paymentMethod || 'TRANSFER',
        receiptNumber: data.receiptNumber || null,
        notes: data.notes || null,
        receivedBy: data.receivedBy,
      },
    });
  }

  // Xóa bản ghi thanh toán
  async deletePayment(paymentId: string) {
    return this.prisma.externalInsurancePayment.delete({
      where: { id: paymentId },
    });
  }

  // Báo cáo theo dõi nộp tiền theo tháng
  async getMonthlyPaymentReport(month: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const contributors = await this.prisma.externalInsurance.findMany({
      orderBy: { fullName: 'asc' },
    });

    const payments = await this.prisma.externalInsurancePayment.findMany({
      where: { month: targetMonth },
    });
    const paymentMap = new Map(payments.map((p) => [p.externalInsuranceId, p]));

    return contributors.map((c) => {
      const p = paymentMap.get(c.id);
      return {
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        idCard: c.idCard,
        insuranceCode: c.insuranceCode,
        insuranceSalary: c.insuranceSalary,
        contributionRate: c.contributionRate,
        monthlyAmount: c.monthlyAmount,
        startDate: c.startDate,
        endDate: c.endDate,
        status: c.status,
        isPaid: Boolean(p),
        payment: p || null,
      };
    });
  }

  // Xuất file Excel danh sách người gửi đóng BHXH
  async exportToExcel(res: Response) {
    const list = await this.prisma.externalInsurance.findMany({
      include: {
        payments: {
          orderBy: { month: 'desc' },
          take: 3,
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('GuiDongBHXH');

    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'DANH SÁCH THEO DÕI NGƯỜI GỬI ĐÓNG BẢO HIỂM TẠI CÔNG TY';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F2937' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 32;

    const headers = [
      'STT',
      'Họ và tên',
      'Số điện thoại',
      'Số CCCD/CMND',
      'Mã số BHXH',
      'Mức lương đóng BHXH',
      'Tỷ lệ (%)',
      'Tiền nộp/tháng',
      'Ngày bắt đầu',
      'Ngày kết thúc',
      'Trạng thái',
      'Ghi chú',
    ];

    sheet.addRow(headers);
    const headerRow = sheet.getRow(2);
    headerRow.height = 26;
    headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D9488' }, // Teal
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    let index = 1;
    for (const item of list) {
      const statusText =
        item.status === 'ACTIVE'
          ? 'Đang gửi đóng'
          : item.status === 'PAUSED'
          ? 'Tạm dừng'
          : 'Đã dừng đóng';

      const row = sheet.addRow([
        index++,
        item.fullName,
        item.phone || '',
        item.idCard || '',
        item.insuranceCode || '',
        item.insuranceSalary,
        item.contributionRate || 32,
        item.monthlyAmount,
        item.startDate ? item.startDate.toISOString().slice(0, 10) : '',
        item.endDate ? item.endDate.toISOString().slice(0, 10) : '',
        statusText,
        item.notes || '',
      ]);

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
        if (colNumber === 6 || colNumber === 8) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (colNumber === 1 || colNumber === 7 || colNumber === 9 || colNumber === 10 || colNumber === 11) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    }

    sheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: false }, (c) => {
        const len = c.value ? String(c.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(Math.max(maxLen + 3, 11), 32);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Theo_Doi_Dong_BHXH_Ngoai.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  }
}
