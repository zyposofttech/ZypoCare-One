import { Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { PolicyEngineModule } from "../policy-engine/policy-engine.module";

@Module({
  imports: [PolicyEngineModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
