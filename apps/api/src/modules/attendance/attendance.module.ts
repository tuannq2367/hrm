import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceParserService } from './attendance-parser.service';
import { AttendanceController } from './attendance.controller';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceParserService],
  exports: [AttendanceService, AttendanceParserService],
})
export class AttendanceModule {}
