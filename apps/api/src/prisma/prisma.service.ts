import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // Bật WAL mode cho SQLite để hỗ trợ đa truy cập đọc/ghi tốt hơn
    try {
      await this.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
      await this.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
      // Tự động nâng cấp bảng nếu database trên hosting là bản cũ
      await this.$executeRawUnsafe(`ALTER TABLE "AttendanceDay" ADD COLUMN "leaveUnits" REAL DEFAULT 0;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "LeaveBalance" ADD COLUMN "usedBeforeSystem" REAL DEFAULT 0;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN "standardWorkDays" REAL DEFAULT 26;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN "otRatePerHour" REAL DEFAULT 50000;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN "unionFee" REAL DEFAULT 50000;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN "isStoreSales" BOOLEAN DEFAULT 0;`).catch(() => {});
      await this.$executeRawUnsafe(`UPDATE "Department" SET "unionFee" = 0 WHERE "isStoreSales" = 1 AND ("unionFee" IS NULL OR "unionFee" = 50000);`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN "kpiSalary" REAL DEFAULT 0;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN "isStoreSales" BOOLEAN DEFAULT 0;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN "leaveStartDate" DATETIME;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN "leaveEndDate" DATETIME;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN "leaveNote" TEXT;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "SalaryProfile" ADD COLUMN "kpiSalary" REAL DEFAULT 0;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Payslip" ADD COLUMN "kpiSalary" REAL DEFAULT 0;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Payslip" ADD COLUMN "kpiPercent" REAL DEFAULT 100;`).catch(() => {});
      await this.$executeRawUnsafe(`ALTER TABLE "Payslip" ADD COLUMN "kpiPay" REAL DEFAULT 0;`).catch(() => {});
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "monthly_kpis" (
          "id" TEXT PRIMARY KEY,
          "employeeId" TEXT NOT NULL,
          "month" TEXT NOT NULL,
          "kpiPercent" REAL DEFAULT 100,
          "evaluatedBy" TEXT,
          "notes" TEXT,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "monthly_kpis_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE,
          UNIQUE ("employeeId", "month")
        );
      `).catch(() => {});
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "external_insurances" (
          "id" TEXT PRIMARY KEY,
          "fullName" TEXT NOT NULL,
          "phone" TEXT,
          "idCard" TEXT,
          "insuranceCode" TEXT,
          "insuranceSalary" REAL NOT NULL,
          "contributionRate" REAL DEFAULT 32,
          "monthlyAmount" REAL NOT NULL,
          "startDate" DATETIME NOT NULL,
          "endDate" DATETIME,
          "status" TEXT DEFAULT 'ACTIVE',
          "notes" TEXT,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(() => {});
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "external_insurance_payments" (
          "id" TEXT PRIMARY KEY,
          "externalInsuranceId" TEXT NOT NULL,
          "month" TEXT NOT NULL,
          "amount" REAL NOT NULL,
          "paymentDate" DATETIME NOT NULL,
          "paymentMethod" TEXT DEFAULT 'TRANSFER',
          "receiptNumber" TEXT,
          "notes" TEXT,
          "receivedBy" TEXT,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "external_insurance_payments_externalInsuranceId_fkey" FOREIGN KEY ("externalInsuranceId") REFERENCES "external_insurances" ("id") ON DELETE CASCADE,
          UNIQUE ("externalInsuranceId", "month")
        );
      `).catch(() => {});

      // 1. Đảm bảo DUY NHẤT 1 tài khoản Admin tối cao: username 'admin', mật khẩu 'Admin@123'
      const salt = await bcrypt.genSalt(10);
      const adminPasswordHash = await bcrypt.hash('Admin@123', salt);

      const allAdmins = await this.user.findMany({
        where: {
          OR: [{ phone: 'admin' }, { role: 'ADMIN' }, { phone: '0988888888' }],
        },
      });

      if (allAdmins.length > 0) {
        const primaryAdmin = allAdmins[0];
        await this.user.update({
          where: { id: primaryAdmin.id },
          data: {
            phone: 'admin',
            passwordHash: adminPasswordHash,
            role: 'ADMIN',
            mustChangePassword: false,
            isActive: true,
          },
        }).catch(() => {});

        // Xóa các tài khoản admin trùng lặp khác nếu có
        for (let i = 1; i < allAdmins.length; i++) {
          const duplicate = allAdmins[i];
          await this.employee.updateMany({
            where: { userId: duplicate.id },
            data: { userId: null },
          }).catch(() => {});
          await this.user.delete({ where: { id: duplicate.id } }).catch(() => {});
        }
      } else {
        await this.user.create({
          data: {
            phone: 'admin',
            passwordHash: adminPasswordHash,
            role: 'ADMIN',
            mustChangePassword: false,
            isActive: true,
          },
        }).catch(() => {});
      }

      // 2. Chuẩn hóa và đồng bộ số điện thoại cho các bản ghi hiện có
      const allUsers = await this.user.findMany();
      for (const u of allUsers) {
        let clean = (u.phone || '').trim().replace(/\D/g, '');
        if (clean.startsWith('84') && clean.length >= 11) clean = '0' + clean.slice(2);
        else if (!clean.startsWith('0') && clean.length === 9) clean = '0' + clean;
        if (clean && clean !== u.phone) {
          await this.user.update({ where: { id: u.id }, data: { phone: clean } }).catch(() => {});
        }
      }

      const allEmps = await this.employee.findMany({ include: { user: true } });
      for (const e of allEmps) {
        let clean = (e.phone || '').trim().replace(/\D/g, '');
        if (clean.startsWith('84') && clean.length >= 11) clean = '0' + clean.slice(2);
        else if (!clean.startsWith('0') && clean.length === 9) clean = '0' + clean;
        if (clean && clean !== e.phone) {
          await this.employee.update({ where: { id: e.id }, data: { phone: clean } }).catch(() => {});
        }
        if (clean && e.user && e.user.phone !== clean) {
          await this.user.update({ where: { id: e.user.id }, data: { phone: clean } }).catch(() => {});
        }
      }

      // 3. Tự động dọn dẹp các nhân sự ảo sinh ra do lỗi import mã chấm công Ronald Jack trước đây
      const phantomEmps = await this.employee.findMany({
        where: {
          employeeCode: { startsWith: 'NV0000' },
        },
        include: { user: true },
      });

      for (const p of phantomEmps) {
        await this.attendanceDay.deleteMany({ where: { employeeId: p.id } }).catch(() => {});
        await this.salaryProfile.deleteMany({ where: { employeeId: p.id } }).catch(() => {});
        await this.employee.delete({ where: { id: p.id } }).catch(() => {});
        if (p.userId) {
          await this.user.delete({ where: { id: p.userId } }).catch(() => {});
        }
      }
    } catch (e) {
      // ignore
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
