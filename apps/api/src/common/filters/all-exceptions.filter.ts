import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFilePath = path.join(logsDir, 'error.log');

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private prisma: PrismaService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Lỗi máy chủ nội bộ';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Chỉ lưu và theo dõi các lỗi hệ thống 500+ hoặc unhandled exceptions
    // (Bỏ qua các lỗi nghiệp vụ thông thường 400 Bad Request, 401 Unauthorized)
    const isCritical = status >= 500 || !(exception instanceof HttpException);
    const traceId = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const stack = exception instanceof Error ? exception.stack : JSON.stringify(exception);

    if (isCritical) {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${traceId}] [${request.method}] ${request.url}\nStatus: ${status} - Message: ${Array.isArray(message) ? message.join(', ') : message}\nStack: ${stack}\n------------------------------------------------------------\n`;

      // 1. Ghi ra file log cục bộ
      try {
        fs.appendFileSync(logFilePath, logEntry, 'utf-8');
      } catch (e) {
        console.error('Không thể ghi file error.log:', e);
      }

      // 2. Lưu vào bảng SystemError để theo dõi và chuyển trạng thái RESOLVED
      try {
        await this.prisma.systemError.create({
          data: {
            errorTraceId: traceId,
            message: Array.isArray(message) ? message.join(', ') : String(message),
            stack: stack || null,
            path: request.url,
            method: request.method,
            statusCode: status,
            status: 'OPEN',
          },
        });
      } catch (e) {
        console.error('Không thể lưu SystemError vào DB:', e);
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      errorTraceId: isCritical ? traceId : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
