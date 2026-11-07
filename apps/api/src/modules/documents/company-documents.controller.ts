import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CompanyDocumentsService } from './company-documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const uploadDir = './uploads/company-docs';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Controller('api/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyDocumentsController {
  constructor(private documentsService: CompanyDocumentsService) {}

  // Lấy danh sách văn bản (Public cho toàn bộ nhân viên)
  @Get()
  getDocuments(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.documentsService.getDocuments({ category, search });
  }

  // Tải văn bản
  @Get(':id/download')
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.documentsService.getDocumentById(id);
    const fullPath = join(process.cwd(), doc.filePath);
    if (!existsSync(fullPath)) {
      throw new BadRequestException('File đính kèm không còn tồn tại trên máy chủ');
    }
    return res.download(fullPath, doc.fileName);
  }

  // Tải lên văn bản, quy chế, nội quy mới (Chỉ Admin và HR)
  @Post()
  @Roles('ADMIN', 'HR')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `doc-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
    }),
  )
  async createDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('documentNumber') documentNumber?: string,
    @Body('category') category?: string,
    @Body('effectiveDate') effectiveDate?: string,
    @Body('description') description?: string,
    @CurrentUser() user?: any,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file văn bản đính kèm');
    }
    if (!title || title.trim().length === 0) {
      throw new BadRequestException('Vui lòng nhập tiêu đề văn bản');
    }

    return this.documentsService.createDocument({
      title: title.trim(),
      documentNumber: documentNumber?.trim(),
      category: category || 'QUY_CHE',
      effectiveDate,
      fileName: file.originalname,
      filePath: file.path.replace(/\\/g, '/'),
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: user?.phone || 'ADMIN',
      description,
    });
  }

  // Xóa văn bản (Chỉ quyền Admin)
  @Delete(':id')
  @Roles('ADMIN')
  deleteDocument(@Param('id') id: string) {
    return this.documentsService.deleteDocument(id);
  }
}
