import { Module } from "@nestjs/common";
import { ComplianceSharedModule } from "../compliance-shared.module";
import { ValidatorController } from "./validator.controller";
import { ValidatorService } from "./validator.service";

@Module({
  imports: [ComplianceSharedModule],
  controllers: [ValidatorController],
  providers: [ValidatorService],
  exports: [ValidatorService],
})
export class ValidatorModule {}
