import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { FacilitySetupController } from "./facility-setup.controller";
import { FacilitySetupService } from "./facility-setup.service";
import { FacilitySetupSeedService } from "./facility-setup.seed";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [FacilitySetupController],
  providers: [FacilitySetupService, FacilitySetupSeedService],
})
export class FacilitySetupModule {}
