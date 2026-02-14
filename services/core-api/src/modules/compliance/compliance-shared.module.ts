import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ComplianceContextService } from "./compliance-context.service";

/**
 * Shared module that provides ComplianceContextService to all compliance sub-modules.
 * Each sub-module imports this module to get access to Prisma, AuditService, and logCompliance().
 */
@Module({
  imports: [AuditModule],
  providers: [ComplianceContextService],
  exports: [ComplianceContextService],
})
export class ComplianceSharedModule {}
