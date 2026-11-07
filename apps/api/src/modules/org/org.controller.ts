import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { OrgService } from './org.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/org')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrgController {
  constructor(private orgService: OrgService) {}

  // Departments
  @Get('departments')
  getDepartments() {
    return this.orgService.getDepartments();
  }

  @Post('departments')
  @Roles('ADMIN', 'HR')
  createDepartment(
    @Body()
    body: {
      code: string;
      name: string;
      parentId?: string;
      managerId?: string;
      standardWorkDays?: number;
      otRatePerHour?: number;
      unionFee?: number;
      isStoreSales?: boolean;
    },
  ) {
    return this.orgService.createDepartment(body);
  }

  @Put('departments/:id')
  @Roles('ADMIN', 'HR')
  updateDepartment(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      code?: string;
      parentId?: string;
      managerId?: string;
      standardWorkDays?: number;
      otRatePerHour?: number;
      unionFee?: number;
      isStoreSales?: boolean;
    },
  ) {
    return this.orgService.updateDepartment(id, body);
  }

  @Delete('departments/:id')
  @Roles('ADMIN')
  deleteDepartment(@Param('id') id: string) {
    return this.orgService.deleteDepartment(id);
  }

  // Positions
  @Get('positions')
  getPositions() {
    return this.orgService.getPositions();
  }

  @Post('positions')
  @Roles('ADMIN', 'HR')
  createPosition(@Body() body: { code: string; name: string }) {
    return this.orgService.createPosition(body);
  }

  @Put('positions/:id')
  @Roles('ADMIN', 'HR')
  updatePosition(@Param('id') id: string, @Body() body: { name: string }) {
    return this.orgService.updatePosition(id, body);
  }

  @Delete('positions/:id')
  @Roles('ADMIN')
  deletePosition(@Param('id') id: string) {
    return this.orgService.deletePosition(id);
  }
}

@Controller('api/departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsAliasController {
  constructor(private orgService: OrgService) {}

  @Get()
  getDepartments() {
    return this.orgService.getDepartments();
  }
}
