import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private requestsService: RequestsService) {}

  // Lấy danh sách đơn của chính nhân viên đang đăng nhập
  @Get('my')
  getMyRequests(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('month') month?: string,
  ) {
    return this.requestsService.getMyRequests(user.employee?.id, { type, status, month });
  }

  // Lấy quỹ ngày phép năm của nhân viên
  @Get('leave-balance')
  getLeaveBalance(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('year') year?: string,
  ) {
    const targetEmpId =
      (user.role === 'ADMIN' || user.role === 'HR' || user.role === 'SUB_ADMIN') && employeeId
        ? employeeId
        : user.employee?.id;

    if (!targetEmpId) {
      throw new BadRequestException('Không tìm thấy thông tin nhân viên');
    }
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.requestsService.getLeaveBalance(targetEmpId, targetYear);
  }

  // Admin / HR cấu hình quỹ phép năm cho nhân sự
  @Put('leave-balance/:employeeId')
  @Roles('ADMIN', 'HR')
  updateLeaveBalance(
    @Param('employeeId') employeeId: string,
    @Body() body: { year?: number; totalEntitled?: number; usedBeforeSystem?: number; used?: number; seniorityBonus?: number },
  ) {
    const targetYear = body.year || new Date().getFullYear();
    return this.requestsService.updateLeaveBalance(employeeId, targetYear, body);
  }

  // Admin / Quản lý xem toàn bộ đơn
  @Get()
  @Roles('ADMIN', 'HR', 'MANAGER')
  getRequests(
    @Query('employeeId') employeeId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('month') month?: string,
  ) {
    return this.requestsService.getRequests({ employeeId, type, status, month });
  }

  // Nhân viên hoặc Admin gửi đơn mới (Admin có thể đăng ký hộ cho nhân sự khác)
  @Post()
  createRequest(@CurrentUser() user: any, @Body() body: any) {
    const isAdminOrHr = user.role === 'ADMIN' || user.role === 'HR' || user.role === 'SUB_ADMIN';
    const targetEmployeeId = (isAdminOrHr && body.employeeId) ? body.employeeId : user.employee?.id;
    const autoApprove = Boolean(isAdminOrHr && body.autoApprove);
    return this.requestsService.createRequest(targetEmployeeId, body, user.userId, autoApprove);
  }

  // Nhân viên hủy đơn đang chờ duyệt
  @Put(':id/cancel')
  cancelRequest(@Param('id') id: string, @CurrentUser() user: any) {
    return this.requestsService.cancelRequest(id, user.employee?.id);
  }

  // Admin duyệt hoặc từ chối đơn
  @Put(':id/review')
  @Roles('ADMIN')
  reviewRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; adminNote?: string },
  ) {
    return this.requestsService.reviewRequest(id, user.userId, body);
  }

  // Admin xóa phiếu xin phép
  @Delete(':id')
  @Roles('ADMIN')
  deleteRequest(@Param('id') id: string) {
    return this.requestsService.deleteRequest(id);
  }
}
