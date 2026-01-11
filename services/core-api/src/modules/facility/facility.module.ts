import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { IamModule } from "../iam/iam.module";
import { FacilityController } from "./facility.controller";
import { FacilityService } from "./facility.service";

@Module({
  imports: [AuditModule, IamModule],
  controllers: [FacilityController],
  providers: [FacilityService],
})
export class FacilityModule {}
