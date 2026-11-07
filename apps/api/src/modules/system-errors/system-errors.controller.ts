import { Controller, Get, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { SystemErrorsService } from './system-errors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/system/errors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemErrorsController {
  constructor(private errorsService: SystemErrorsService) {}

  @Get()
  @Roles('ADMIN')
  getErrors(@Query('status') status?: string) {
    return this.errorsService.getErrors(status);
  }

  @Get(':id')
  @Roles('ADMIN')
  getErrorById(@Param('id') id: string) {
    return this.errorsService.getErrorById(id);
  }

  @Put(':id/resolve')
  @Roles('ADMIN')
  resolveError(
    @Param('id') id: string,
    @Body('note') note: string,
    @CurrentUser() user: any,
  ) {
    return this.errorsService.resolveError(id, note, user.phone);
  }

  @Put(':id/reopen')
  @Roles('ADMIN')
  reopenError(@Param('id') id: string) {
    return this.errorsService.reopenError(id);
  }
}
