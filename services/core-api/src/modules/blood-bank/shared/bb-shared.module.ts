import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { BBContextService } from "./bb-context.service";

@Module({
  imports: [AuditModule],
  providers: [BBContextService],
  exports: [BBContextService],
})
export class BBSharedModule {}
