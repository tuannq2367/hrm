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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as ExcelJS from 'exceljs';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

const uploadDir = './uploads/documents';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Controller('api/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(
    private employeesService: EmployeesService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @Roles('ADMIN', 'HR', 'MANAGER')
  getEmployees(
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.employeesService.getEmployees({ departmentId, status, search });
  }

  // File mẫu Excel / CSV import danh sách nhân viên
  @Get('template')
  @Roles('ADMIN', 'HR')
  async getEmployeeTemplate(
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    if (format === 'csv') {
      const csvContent =
        '\uFEFFMã NV,Mã chấm công,Họ và tên,Số điện thoại,Email,Số CCCD,Ngày vào làm (YYYY-MM-DD),Trạng thái (CHÍNH THỨC/THỬ VIỆC),Lương thỏa thuận,Tên ngân hàng,Số tài khoản,Ngày sinh (YYYY-MM-DD),Ngày vào chính thức (YYYY-MM-DD),Lương cơ bản riêng (để trống lấy mặc định 5.681.700đ),Đóng BHXH (CÓ/KHÔNG - mức đóng là LCB),Ngày nghỉ việc (nếu có)\n' +
        'NV001,101,Nguyễn Văn An,0912345678,an.nv@company.com,001200001234,2026-01-15,CHÍNH THỨC,15000000,Vietcombank,0123456789,1995-05-20,2026-03-15,5681700,CÓ,\n' +
        'NV002,102,Trần Thị Bình,0987654321,binh.tt@company.com,001200005678,2026-03-01,THỬ VIỆC,12000000,Techcombank,9876543210,1998-10-12,,,KHÔNG,\n';

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="mau_danh_sach_nhan_vien.csv"');
      return res.send(csvContent);
    }

    // Mặc định tạo file Excel .xlsx chuẩn
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh Sách Nhân Viên');

    sheet.columns = [
      { header: 'Mã NV', key: 'empCode', width: 14 },
      { header: 'Mã chấm công', key: 'attCode', width: 16 },
      { header: 'Họ và tên', key: 'fullName', width: 25 },
      { header: 'Số điện thoại', key: 'phone', width: 16 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Số CCCD', key: 'idCard', width: 18 },
      { header: 'Ngày vào làm (YYYY-MM-DD)', key: 'joinDate', width: 25 },
      { header: 'Trạng thái (CHÍNH THỨC/THỬ VIỆC)', key: 'status', width: 28 },
      { header: 'Lương thỏa thuận', key: 'salary', width: 20 },
      { header: 'Tên ngân hàng', key: 'bankName', width: 20 },
      { header: 'Số tài khoản', key: 'bankAccount', width: 20 },
      { header: 'Ngày sinh (YYYY-MM-DD)', key: 'dob', width: 22 },
      { header: 'Ngày vào chính thức (YYYY-MM-DD)', key: 'officialDate', width: 26 },
      { header: 'Lương cơ bản riêng (để trống lấy mặc định 5.681.700đ)', key: 'customBaseSalary', width: 32 },
      { header: 'Đóng BHXH (CÓ/KHÔNG - mức đóng là LCB)', key: 'hasInsurance', width: 28 },
      { header: 'Ngày nghỉ việc (nếu có)', key: 'resignDate', width: 22 },
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
      attCode: '101',
      fullName: 'Nguyễn Văn An',
      phone: '0912345678',
      email: 'an.nv@company.com',
      idCard: '001200001234',
      joinDate: '2026-01-15',
      status: 'CHÍNH THỨC',
      salary: 15000000,
      bankName: 'Vietcombank',
      bankAccount: '0123456789',
      dob: '1995-05-20',
      officialDate: '2026-03-15',
      customBaseSalary: 5681700,
      hasInsurance: 'CÓ',
      resignDate: '',
    });

    sheet.addRow({
      empCode: 'NV002',
      attCode: '102',
      fullName: 'Trần Thị Bình',
      phone: '0987654321',
      email: 'binh.tt@company.com',
      idCard: '001200005678',
      joinDate: '2026-03-01',
      status: 'THỬ VIỆC',
      salary: 12000000,
      bankName: 'Techcombank',
      bankAccount: '9876543210',
      dob: '1998-10-12',
      officialDate: '',
      customBaseSalary: '',
      hasInsurance: 'KHÔNG',
      resignDate: '',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="mau_danh_sach_nhan_vien.xlsx"',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // Import danh sách nhân viên từ file Excel (.xlsx) hoặc CSV
  @Post('import')
  @Roles('ADMIN', 'HR')
  @UseInterceptors(FileInterceptor('file'))
  async importEmployees(
    @UploadedFile() file?: Express.Multer.File,
    @Body('content') rawContent?: string,
  ) {
    if (file) {
      return this.employeesService.importEmployees(file.buffer);
    }
    if (rawContent) {
      return this.employeesService.importEmployees(rawContent);
    }
    throw new BadRequestException('Vui lòng tải lên file Excel (.xlsx) hoặc CSV');
  }

  // Xem hồ sơ cá nhân của người đang đăng nhập
  @Get('me')
  getMyProfile(@CurrentUser() user: any) {
    if (!user.employee?.id) {
      throw new BadRequestException('Tài khoản này chưa gắn với hồ sơ nhân viên');
    }
    return this.employeesService.getEmployeeById(user.employee.id);
  }

  @Get(':id')
  @Roles('ADMIN', 'HR', 'MANAGER')
  getEmployeeById(@Param('id') id: string) {
    return this.employeesService.getEmployeeById(id);
  }

  @Post()
  @Roles('ADMIN', 'HR')
  createEmployee(@Body() body: any, @CurrentUser() user: any) {
    return this.employeesService.createEmployee(body, user);
  }

  // Xóa toàn bộ dữ liệu nhân sự (Chỉ Quản trị viên tối cao ADMIN)
  @Delete('clear-all')
  @Roles('ADMIN')
  clearAllEmployees(
    @CurrentUser() user: any,
    @Body() body: { confirmation: string; password?: string },
  ) {
    return this.employeesService.clearAllEmployees(
      user.userId,
      user.role,
      body.confirmation,
      body.password,
    );
  }

  @Put(':id')
  @Roles('ADMIN', 'HR')
  updateEmployee(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.employeesService.updateEmployee(id, body, user);
  }

  // Xóa một nhân sự
  @Delete(':id')
  @Roles('ADMIN', 'HR')
  deleteEmployee(@Param('id') id: string, @CurrentUser() user: any) {
    return this.employeesService.deleteEmployee(id, user);
  }

  // Thêm quyết định tăng lương chuyên môn
  @Post(':id/salary-raise')
  @Roles('ADMIN', 'HR')
  addSalaryRaise(@Param('id') id: string, @Body() body: any) {
    return this.employeesService.addSalaryRaise(id, body);
  }

  // Xóa quyết định tăng lương chuyên môn
  @Delete(':id/salary-profile/:profileId')
  @Roles('ADMIN', 'HR')
  deleteSalaryProfile(
    @Param('id') employeeId: string,
    @Param('profileId') profileId: string,
  ) {
    return this.employeesService.deleteSalaryProfile(employeeId, profileId);
  }

  @Delete(':id/salary-raise/:profileId')
  @Roles('ADMIN', 'HR')
  deleteSalaryRaise(
    @Param('id') employeeId: string,
    @Param('profileId') profileId: string,
  ) {
    return this.employeesService.deleteSalaryProfile(employeeId, profileId);
  }

  @Post(':id/promote')
  @Roles('ADMIN', 'HR')
  promoteToOfficial(@Param('id') id: string, @Body() body: any) {
    return this.employeesService.promoteToOfficial(id, body);
  }

  @Post(':id/resign')
  @Roles('ADMIN')
  resignEmployee(@Param('id') id: string, @Body() body: any) {
    return this.employeesService.resignEmployee(id, body);
  }

  @Post(':id/reset-password')
  @Roles('ADMIN')
  resetPassword(@Param('id') id: string) {
    return this.employeesService.resetPassword(id);
  }

  // Upload giấy tờ scan
  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${req.params.id}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Body('expiryDate') expiryDate?: string,
    @CurrentUser() user?: any,
  ) {
    // Chỉ Admin/HR hoặc chính nhân viên đó được upload
    if (user.role !== 'ADMIN' && user.role !== 'HR' && user.employee?.id !== id) {
      throw new BadRequestException('Bạn không có quyền tải lên giấy tờ cho nhân viên này');
    }

    if (!file) {
      throw new BadRequestException('Vui lòng chọn file cần tải lên');
    }

    const doc = await this.prisma.employeeDocument.create({
      data: {
        employeeId: id,
        type: type || 'OTHER',
        fileName: file.originalname,
        filePath: file.path.replace(/\\/g, '/'),
        fileSize: file.size,
        mimeType: file.mimetype,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    return doc;
  }
}
