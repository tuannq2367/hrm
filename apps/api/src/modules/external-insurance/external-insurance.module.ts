import { Module } from '@nestjs/common';
import { ExternalInsuranceService } from './external-insurance.service';
import { ExternalInsuranceController } from './external-insurance.controller';

@Module({
  controllers: [ExternalInsuranceController],
  providers: [ExternalInsuranceService],
  exports: [ExternalInsuranceService],
})
export class ExternalInsuranceModule {}
