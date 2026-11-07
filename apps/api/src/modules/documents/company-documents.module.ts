import { Module } from '@nestjs/common';
import { CompanyDocumentsController } from './company-documents.controller';
import { CompanyDocumentsService } from './company-documents.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyDocumentsController],
  providers: [CompanyDocumentsService],
  exports: [CompanyDocumentsService],
})
export class CompanyDocumentsModule {}
