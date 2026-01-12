import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { PolicyEngineModule } from "../policy-engine/policy-engine.module";
import { InfrastructureController } from "./infrastructure.controller";
import { InfrastructureService } from "./infrastructure.service";
import { InfrastructureSeedService } from "./infrastructure.seed";

@Module({
  imports: [AuditModule, AuthModule, PolicyEngineModule],
  controllers: [InfrastructureController],
  providers: [InfrastructureService, InfrastructureSeedService],
})
export class InfrastructureModule {}
