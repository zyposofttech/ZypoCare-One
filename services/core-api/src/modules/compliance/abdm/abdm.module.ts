import { Module } from "@nestjs/common";
import { ComplianceSharedModule } from "../compliance-shared.module";
import { AbdmController } from "./abdm.controller";
import { AbdmService } from "./abdm.service";

@Module({
  imports: [ComplianceSharedModule],
  controllers: [AbdmController],
  providers: [AbdmService],
  exports: [AbdmService],
})
export class AbdmModule {}
