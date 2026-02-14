import { Module } from "@nestjs/common";
import { ComplianceSharedModule } from "../compliance-shared.module";
import { EvidenceController } from "./evidence.controller";
import { EvidenceService } from "./evidence.service";

@Module({
  imports: [ComplianceSharedModule],
  controllers: [EvidenceController],
  providers: [EvidenceService],
  exports: [EvidenceService],
})
export class EvidenceModule {}
