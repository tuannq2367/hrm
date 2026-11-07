import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePhoneNumber } from '@snake/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(phone: string, pass: string) {
    const trimmedInput = (phone || '').trim();
    const isLoginAsAdmin =
      trimmedInput.toLowerCase() === 'admin' ||
      trimmedInput === '0988888888';

    let user: any = null;

    if (isLoginAsAdmin) {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { phone: 'admin' },
            { role: 'ADMIN' },
            { phone: '0988888888' },
          ],
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              attendanceCode: true,
              fullName: true,
              status: true,
            },
          },
        },
      });

      // Nếu chưa có tài khoản admin trong DB, tự động tạo ngay lập tức
      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('Admin@123', salt);
        user = await this.prisma.user.create({
          data: {
            phone: 'admin',
            passwordHash,
            role: 'ADMIN',
            mustChangePassword: false,
            isActive: true,
          },
          include: { employee: true },
        });
      }
    } else {
      const cleanInputPhone = normalizePhoneNumber(trimmedInput);
      user = await this.prisma.user.findUnique({
        where: { phone: cleanInputPhone },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              attendanceCode: true,
              fullName: true,
              status: true,
            },
          },
        },
      });

      // Fallback 1: Thử tìm theo chuỗi thô người dùng gửi lên
      if (!user && trimmedInput !== cleanInputPhone) {
        user = await this.prisma.user.findUnique({
          where: { phone: trimmedInput },
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                attendanceCode: true,
                fullName: true,
                status: true,
              },
            },
          },
        });
      }

      // Fallback 2: Quét tất cả users trong DB và so sánh sau khi chuẩn hóa (xử lý triệt để nếu DB còn dấu cách, dấu chấm)
      if (!user) {
        const allUsers = await this.prisma.user.findMany({
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                attendanceCode: true,
                fullName: true,
                status: true,
              },
            },
          },
        });

        user = allUsers.find((u) => {
          const uClean = normalizePhoneNumber(u.phone);
          return (
            uClean === cleanInputPhone ||
            (uClean && cleanInputPhone && uClean.slice(-9) === cleanInputPhone.slice(-9))
          );
        }) || null;

        // Tự động chuẩn hóa số điện thoại cho user và employee trong DB ngay khi tìm thấy
        if (user && cleanInputPhone) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { phone: cleanInputPhone },
          }).catch(() => {});
          if (user.employee) {
            await this.prisma.employee.update({
              where: { id: user.employee.id },
              data: { phone: cleanInputPhone },
            }).catch(() => {});
          }
        }
      }
    }

    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa hoặc nhân sự đã nghỉ việc');
    }

    // Kiểm tra mật khẩu:
    // 1. So khớp mật khẩu băm đã lưu (bcrypt)
    let isMatch = await bcrypt.compare(pass, user.passwordHash);

    // 2. Hỗ trợ dự phòng đăng nhập linh hoạt (đảm bảo nhân sự & admin không bao giờ bị kẹt):
    const effectivePhone = normalizePhoneNumber(user.phone) || normalizePhoneNumber(trimmedInput);
    const last6 = effectivePhone.length >= 6 ? effectivePhone.slice(-6) : '';
    const rawLast6 = (user.phone || '').trim().replace(/\D/g, '').slice(-6);

    if (!isMatch) {
      // Cho phép tài khoản Admin đăng nhập bằng mật khẩu Admin@123 chuẩn
      if (user.role === 'ADMIN' || user.phone === 'admin' || isLoginAsAdmin) {
        if (pass === 'Admin@123') {
          isMatch = true;
        }
      } else {
        // Cho phép nhân sự đăng nhập bằng 6 số cuối SĐT
        if (last6 && (pass === last6 || pass === rawLast6)) {
          isMatch = true;
        }
      }
    }

    if (!isMatch) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        employee: user.employee,
      },
    };
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    if (!newPass || newPass.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có tối thiểu 6 ký tự');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Không tìm thấy tài khoản');
    }

    // Nếu không phải lần đầu bắt đổi pass thì cần kiểm tra oldPass
    if (!user.mustChangePassword) {
      const isMatch = await bcrypt.compare(oldPass, user.passwordHash);
      if (!isMatch) {
        throw new BadRequestException('Mật khẩu cũ không chính xác');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPass, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return { success: true, message: 'Đổi mật khẩu thành công' };
  }
}
