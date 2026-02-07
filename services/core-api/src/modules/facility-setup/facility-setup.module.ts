import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { FacilitySetupController } from "./facility-setup.controller";
import { FacilitySetupSeed } from "./facility-setup.seed";
import { FacilitySetupService } from "./facility-setup.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [FacilitySetupController],
  providers: [FacilitySetupService, FacilitySetupSeed],
})
export class FacilitySetupModule {}
