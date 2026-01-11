import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";

import { AuditModule } from "../audit/audit.module";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

import { JwtAuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";

import { AccessPolicyService } from "./access-policy.service";
import { PrincipalGuard } from "./principal.guard";
import { PermissionsGuard } from "./permissions.guard";

@Module({
  imports: [
    // ✅ Needed because AuthService injects AuditService
    AuditModule,

    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || "dev-secret-key",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,

    // ✅ Required for PrincipalGuard / PermissionsGuard to work wherever used
    AccessPolicyService,
    PrincipalGuard,
    PermissionsGuard,

    // Global guards (existing behavior)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [
    AuthService,
    AccessPolicyService,
    PrincipalGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
