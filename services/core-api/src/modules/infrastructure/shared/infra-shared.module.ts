import { Module } from "@nestjs/common";

import { AuditModule } from "../../audit/audit.module";
import { PolicyEngineModule } from "../../policy-engine/policy-engine.module";

import { InfraContextService } from "./infra-context.service";

/**
 * InfraSharedModule
 *
 * Exports InfraContextService (Prisma + Audit + PolicyEngine) for all Infrastructure submodules.
 */
@Module({
  imports: [AuditModule, PolicyEngineModule],
  providers: [InfraContextService],
  exports: [InfraContextService],
})
export class InfraSharedModule {}
