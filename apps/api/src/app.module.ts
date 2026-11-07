import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { existsSync } from 'fs';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrgModule } from './modules/org/org.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { RequestsModule } from './modules/requests/requests.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { SystemErrorsModule } from './modules/system-errors/system-errors.module';
import { CompanyDocumentsModule } from './modules/documents/company-documents.module';
import { ExternalInsuranceModule } from './modules/external-insurance/external-insurance.module';

// Tự động tìm thư mục chứa bản build React (index.html)
function findStaticRoot(): string {
  const candidates = [
    join(process.cwd(), 'apps/web/dist'),
    join(process.cwd(), 'apps/api/client'),
    join(process.cwd(), 'client'),
    join(__dirname, '../../../../apps/web/dist'),
    join(__dirname, '../../../web/dist'),
    join(__dirname, '../../client'),
    join(__dirname, '../client'),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, 'index.html'))) {
      console.log(`[StaticServe] Đang phục vụ giao diện web từ: ${c}`);
      return c;
    }
  }
  return join(process.cwd(), 'apps/web/dist');
}

const staticRoot = findStaticRoot();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrgModule,
    EmployeesModule,
    RequestsModule,
    AttendanceModule,
    PayrollModule,
    SystemErrorsModule,
    CompanyDocumentsModule,
    ExternalInsuranceModule,
    // Phục vụ file upload scan
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    // Phục vụ giao diện Single Page Application (React)
    ServeStaticModule.forRoot({
      rootPath: staticRoot,
      exclude: ['/api/(.*)', '/uploads/(.*)'],
    }),
  ],
})
export class AppModule {}
