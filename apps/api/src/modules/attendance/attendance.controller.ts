import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceService } from './attendance.service';
import { AttendanceParserService } from './attendance-parser.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(
    private attendanceService: AttendanceService,
    private parserService: AttendanceParserService,
  ) {}

  // Bảng công tháng (Admin/HR/Manager xem toàn bộ, nhân viên xem công của chính mình)
  @Get('monthly')
  getMonthlyTimesheet(
    @Query('month') month: string,
    @Query('departmentId') departmentId?: string,
    @CurrentUser() user?: any,
  ) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const employeeId = user?.role === 'EMPLOYEE' ? user.employee?.id : undefined;
    return this.attendanceService.getMonthlyTimesheet(targetMonth, departmentId, employeeId);
  }

  // Xóa sạch dữ liệu chấm công máy của tháng để tính công lại (giữ nguyên phiếu xin phép)
  @Delete('clear-month')
  @Roles('ADMIN', 'HR', 'SUB_ADMIN')
  clearMonthlyAttendance(@Query('month') month: string) {
    return this.attendanceService.clearMonthlyAttendance(month);
  }

  // Import dữ liệu chấm công từ text/CSV dán trực tiếp
  @Post('import-raw')
  @Roles('ADMIN', 'HR')
  async importRawText(
    @Body('content') content: string,
    @Body('fileName') fileName: string,
    @Body('clearExistingMonth') clearExistingMonth: boolean | string,
    @CurrentUser() user: any,
  ) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Vui lòng dán nội dung file chấm công');
    }
    const shouldClear = clearExistingMonth === true || clearExistingMonth === 'true';
    return this.parserService.processAndSaveAttendance(
      content,
      user.phone,
      fileName || 'imported_clipboard.csv',
      shouldClear,
    );
  }

  // Import dữ liệu từ file đính kèm (.xlsx, .xls, .csv, .txt)
  @Post('import-file')
  @Roles('ADMIN', 'HR')
  @UseInterceptors(FileInterceptor('file'))
  async importFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('clearExistingMonth') clearExistingMonth: boolean | string,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file Excel / CSV để tải lên');
    }

    let content: string;
    const isExcel =
      Boolean(file.originalname && file.originalname.match(/\.xlsx?$/i)) ||
      Boolean(file.buffer && file.buffer[0] === 0x50 && file.buffer[1] === 0x4b);

    if (isExcel) {
      content = await this.parserService.convertExcelBufferToCsv(file.buffer);
    } else {
      content = file.buffer.toString('utf-8');
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
      }
    }

    const shouldClear = clearExistingMonth === true || clearExistingMonth === 'true';
    return this.parserService.processAndSaveAttendance(
      content,
      user.phone,
      file.originalname,
      shouldClear,
    );
  }

  // Trưởng bộ phận / Admin chốt công tháng cho nhân viên nhóm bán hàng (hoặc nhân viên không quẹt thẻ)
  @Post('store-sales/submit-monthly')
  @Roles('ADMIN', 'HR', 'MANAGER')
  submitMonthlyStoreSalesAttendance(
    @Body()
    body: {
      month: string;
      entries: {
        employeeId: string;
        workUnits: number;
        otHours?: number;
        note?: string;
      }[];
    },
    @CurrentUser() user: any,
  ) {
    return this.attendanceService.submitMonthlyStoreSalesAttendance(
      body.month,
      body.entries,
      user.phone || user.id,
    );
  }

  // Admin / HR điều chỉnh công / ghi nhận quên thẻ / bổ sung tăng ca
  @Post('override/:employeeId')
  @Roles('ADMIN', 'HR', 'SUB_ADMIN')
  overrideAttendanceDay(
    @Param('employeeId') employeeId: string,
    @Body() body: any,
  ) {
    return this.attendanceService.overrideAttendanceDay(employeeId, body);
  }

  // Danh sách nợ làm bù
  @Get('makeup-debts')
  getMakeupDebts(@CurrentUser() user: any) {
    const empId = user.role === 'EMPLOYEE' ? user.employee?.id : undefined;
    return this.attendanceService.getMakeupDebts(empId);
  }

  // Cảnh báo vi phạm
  @Get('violations')
  @Roles('ADMIN', 'HR')
  getViolations(@Query('month') month: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.attendanceService.getViolations(targetMonth);
  }

  @Put('violations/:id/confirm')
  @Roles('ADMIN')
  confirmViolation(@Param('id') id: string) {
    return this.attendanceService.confirmViolation(id);
  }

  // Danh sách ngày nghỉ lễ
  @Get('holidays')
  getHolidays(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.attendanceService.getHolidays(month, year ? Number(year) : undefined);
  }

  // Thêm ngày nghỉ lễ (Admin & HR)
  @Post('holidays')
  @Roles('ADMIN', 'HR')
  createHoliday(@Body() body: { name: string; date: string; isPaid?: boolean }) {
    return this.attendanceService.createHoliday(body);
  }

  // Khởi tạo ngày lễ chuẩn cả năm (Admin & HR)
  @Post('holidays/seed')
  @Roles('ADMIN', 'HR')
  seedStandardHolidays(@Body('year') year?: number) {
    const targetYear = year || new Date().getFullYear();
    return this.attendanceService.seedStandardHolidays(targetYear);
  }

  // Xóa ngày nghỉ lễ (Admin & HR)
  @Delete('holidays/:id')
  @Roles('ADMIN', 'HR')
  deleteHoliday(@Param('id') id: string) {
    return this.attendanceService.deleteHoliday(id);
  }
}
