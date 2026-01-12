import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { AccessPolicyService } from "../auth/access-policy.service";
import { PrincipalGuard } from "../auth/principal.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { IamController } from "./iam.controller";
import { IamService } from "./iam.service";
import { IamSeedService } from "./iam.seed";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [IamController],
  providers: [IamService, IamSeedService],
})
export class IamModule {}
