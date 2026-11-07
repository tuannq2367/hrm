import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as ExcelJS from 'exceljs';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  // Lấy bảng lương tháng
  @Get('period')
  @Roles('ADMIN', 'HR')
  getPayrollPeriod(@Query('month') month: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.payrollService.getPayrollPeriod(targetMonth);
  }

  // Lấy cấu hình tham số chung (Thuế TNCN, Công đoàn, LCB, BHXH...)
  @Get('settings')
  @Roles('ADMIN', 'HR')
  getHrmSettings() {
    return this.payrollService.getHrmSettings();
  }

  // Cập nhật cấu hình tham số chung (Chỉ quyền Admin)
  @Put('settings')
  @Roles('ADMIN')
  updateHrmSettings(@Body() body: any) {
    return this.payrollService.updateHrmSettings(body);
  }

  // Tự động tính toán bảng lương tháng (khi chưa khóa thì có thể tính lại thoải mái)
  @Post('generate')
  @Roles('ADMIN')
  generateMonthlyPayroll(@Body('month') month: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.payrollService.generateMonthlyPayroll(targetMonth);
  }

  // Khóa bảng lương (Chỉ quyền Admin)
  @Put('lock')
  @Roles('ADMIN')
  lockPayrollPeriod(@Body('month') month: string, @CurrentUser() user: any) {
    return this.payrollService.lockPayrollPeriod(month, user.userId);
  }

  // Mở khóa bảng lương (Chỉ quyền Admin)
  @Put('unlock')
  @Roles('ADMIN')
  unlockPayrollPeriod(@Body('month') month: string) {
    return this.payrollService.unlockPayrollPeriod(month);
  }

  // Xóa toàn bộ bảng lương tháng để tính lại từ đầu (Chỉ quyền Admin)
  @Delete('period')
  @Roles('ADMIN')
  deleteMonthlyPayroll(@Query('month') month: string) {
    if (!month) {
      throw new BadRequestException('Vui lòng cung cấp tháng cần xóa (định dạng YYYY-MM)');
    }
    return this.payrollService.deleteMonthlyPayroll(month);
  }

  // Xuất file Excel Bảng Lương Chi Tiết Toàn Bộ Nhân Viên
  @Get('export')
  @Roles('ADMIN', 'HR')
  exportPayrollMaster(@Query('month') month: string, @Res() res: Response) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.payrollService.exportPayrollMasterToExcel(targetMonth, res);
  }

  // Cập nhật % KPI của nhân sự trong kỳ lương
  @Put('payslips/:id/kpi')
  @Roles('ADMIN', 'HR')
  updatePayslipKpi(
    @Param('id') id: string,
    @Body('kpiPercent') kpiPercent: number,
  ) {
    return this.payrollService.updatePayslipKpi(id, Number(kpiPercent));
  }

  // Lấy danh sách đánh giá KPI tháng của nhân viên
  @Get('kpi/monthly')
  @Roles('ADMIN', 'HR', 'MANAGER')
  getMonthlyKpiEvaluations(
    @Query('month') month: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.payrollService.getMonthlyKpiEvaluations(targetMonth, departmentId);
  }

  // Lưu đánh giá KPI tháng (hàng loạt hoặc từng người)
  @Post('kpi/monthly')
  @Roles('ADMIN', 'HR', 'MANAGER')
  saveMonthlyKpiEvaluations(
    @Body()
    body: {
      month: string;
      evaluations: {
        employeeId: string;
        kpiPercent: number;
        notes?: string;
      }[];
    },
    @CurrentUser() user: any,
  ) {
    return this.payrollService.saveMonthlyKpiEvaluations(
      body.month,
      body.evaluations,
      user.phone || user.id,
    );
  }

  // File mẫu Excel / CSV Import Thưởng / Phạt / Tạm ứng
  @Get('adjustments/template')
  @Roles('ADMIN', 'HR')
  async getAdjustmentTemplate(
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    if (format === 'csv') {
      const csvContent =
        '\uFEFFMã NV,Loại (THƯỞNG / PHẠT / TẠM ỨNG / THƯỞNG LỄ TIỀN MẶT),Số tiền,Lý do\n' +
        'NV001,THƯỞNG,500000,Thưởng hoàn thành xuất sắc dự án\n' +
        'NV002,THƯỞNG LỄ TIỀN MẶT,200000,Thưởng lễ 20/10 nhận tiền mặt\n' +
        'NV001,TẠM ỨNG,1000000,Tạm ứng lương giữa tháng\n' +
        'NV003,PHẠT,100000,Vi phạm quy định nội quy thiết bị\n';

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="mau_thuong_phat_tam_ung.csv"');
      return res.send(csvContent);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('ThuongPhatTamUng');

    sheet.columns = [
      { header: 'Mã NV', key: 'empCode', width: 15 },
      { header: 'Loại (THƯỞNG / PHẠT / TẠM ỨNG / THƯỞNG LỄ TIỀN MẶT)', key: 'type', width: 45 },
      { header: 'Số tiền', key: 'amount', width: 18 },
      { header: 'Lý do chi tiết', key: 'reason', width: 35 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1890FF' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.addRow({
      empCode: 'NV001',
      type: 'THƯỞNG',
      amount: 500000,
      reason: 'Thưởng hoàn thành xuất sắc dự án',
    });
    sheet.addRow({
      empCode: 'NV002',
      type: 'THƯỞNG LỄ TIỀN MẶT',
      amount: 200000,
      reason: 'Thưởng lễ 20/10 nhận tiền mặt',
    });
    sheet.addRow({
      empCode: 'NV001',
      type: 'TẠM ỨNG',
      amount: 1000000,
      reason: 'Tạm ứng lương giữa tháng',
    });
    sheet.addRow({
      empCode: 'NV003',
      type: 'PHẠT',
      amount: 100000,
      reason: 'Vi phạm quy định nội quy thiết bị',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="mau_thuong_phat_tam_ung.xlsx"',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // Import thưởng / phạt / tạm ứng từ file Excel (.xlsx) hoặc CSV
  @Post('adjustments/import')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async importAdjustments(
    @UploadedFile() file?: Express.Multer.File,
    @Body('month') month?: string,
    @Body('content') rawContent?: string,
    @CurrentUser() user?: any,
  ) {
    const input = file ? file.buffer : rawContent;
    if (!input) {
      throw new BadRequestException('Vui lòng tải lên file Excel (.xlsx) / CSV hoặc cung cấp nội dung');
    }
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.payrollService.importAdjustmentsFromCsv(input, targetMonth, user.phone || 'ADMIN');
  }

  // Thêm khoản thưởng, phạt, tạm ứng, thưởng lễ tiền mặt
  @Post('adjustments')
  @Roles('ADMIN')
  addAdjustment(@Body() body: any, @CurrentUser() user: any) {
    return this.payrollService.addAdjustment({
      ...body,
      createdBy: user.phone,
    });
  }

  // Danh sách các khoản điều chỉnh
  @Get('adjustments')
  @Roles('ADMIN', 'HR')
  getAdjustments(@Query('month') month: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.payrollService.getAdjustments(targetMonth);
  }

  // Xóa khoản điều chỉnh
  @Delete('adjustments/:id')
  @Roles('ADMIN')
  deleteAdjustment(@Param('id') id: string) {
    return this.payrollService.deleteAdjustment(id);
  }

  // Nhân viên xem phiếu lương của chính mình
  @Get('my-payslip')
  getMyPayslip(@CurrentUser() user: any, @Query('month') month: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.payrollService.getMyPayslip(user.employee?.id, targetMonth);
  }
}
