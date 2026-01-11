import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { PolicyEngineModule } from "../policy-engine/policy-engine.module";
import { GovernanceController } from "./governance.controller";
import { GovernanceSeedService } from "./governance.seed";
import { GovernanceService } from "./governance.service";

@Module({
  imports: [AuditModule, AuthModule, PolicyEngineModule],
  controllers: [GovernanceController],
  providers: [GovernanceService, GovernanceSeedService],
  exports: [GovernanceService],
})
export class GovernanceModule {}
