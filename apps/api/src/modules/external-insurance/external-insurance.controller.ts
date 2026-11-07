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
} from '@nestjs/common';
import { Response } from 'express';
import { ExternalInsuranceService } from './external-insurance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/external-insurance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'HR', 'SUB_ADMIN')
export class ExternalInsuranceController {
  constructor(private externalInsuranceService: ExternalInsuranceService) {}

  // Danh sách người gửi đóng BHXH ngoài
  @Get()
  getAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.externalInsuranceService.getAll({ status, search });
  }

  // Báo cáo theo dõi nộp tiền theo tháng
  @Get('monthly-report')
  getMonthlyPaymentReport(@Query('month') month: string) {
    return this.externalInsuranceService.getMonthlyPaymentReport(month);
  }

  // Xuất Excel danh sách theo dõi
  @Get('export')
  exportToExcel(@Res() res: Response) {
    return this.externalInsuranceService.exportToExcel(res);
  }

  // Xem chi tiết 1 người
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.externalInsuranceService.getById(id);
  }

  // Thêm người gửi đóng BHXH mới
  @Post()
  create(@Body() body: any) {
    return this.externalInsuranceService.create(body);
  }

  // Cập nhật thông tin người gửi đóng
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.externalInsuranceService.update(id, body);
  }

  // Xóa hồ sơ người gửi đóng
  @Delete(':id')
  @Roles('ADMIN', 'SUB_ADMIN')
  delete(@Param('id') id: string) {
    return this.externalInsuranceService.delete(id);
  }

  // Ghi nhận nộp tiền đóng BHXH tháng
  @Post(':id/payments')
  recordPayment(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    const receivedBy = user.employee?.fullName || user.phone || 'Admin';
    return this.externalInsuranceService.recordPayment(id, {
      ...body,
      receivedBy,
    });
  }

  // Xóa bản ghi nộp tiền
  @Delete('payments/:paymentId')
  @Roles('ADMIN', 'SUB_ADMIN')
  deletePayment(@Param('paymentId') paymentId: string) {
    return this.externalInsuranceService.deletePayment(paymentId);
  }
}
