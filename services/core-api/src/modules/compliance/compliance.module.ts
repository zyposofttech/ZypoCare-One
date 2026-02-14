import { Module } from "@nestjs/common";
import { ComplianceSharedModule } from "./compliance-shared.module";
import { ComplianceController } from "./compliance.controller";
import { ComplianceService } from "./compliance.service";
import { WorkspaceModule } from "./workspace/workspace.module";
import { EvidenceModule } from "./evidence/evidence.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { AbdmModule } from "./abdm/abdm.module";
import { SchemesModule } from "./schemes/schemes.module";
import { NabhModule } from "./nabh/nabh.module";
import { ValidatorModule } from "./validator/validator.module";

@Module({
  imports: [
    ComplianceSharedModule,
    WorkspaceModule,
    EvidenceModule,
    ApprovalsModule,
    AbdmModule,
    SchemesModule,
    NabhModule,
    ValidatorModule,
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceSharedModule, ComplianceService],
})
export class ComplianceModule {}
