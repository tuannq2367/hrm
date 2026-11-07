import { Module } from '@nestjs/common';
import { OrgService } from './org.service';
import { OrgController, DepartmentsAliasController } from './org.controller';

@Module({
  controllers: [OrgController, DepartmentsAliasController],
  providers: [OrgService],
  exports: [OrgService],
})
export class OrgModule {}
