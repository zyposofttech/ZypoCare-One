import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";

import { AuditModule } from "../audit/audit.module";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

import { JwtAuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";

import { IamPrincipalService } from "./iam-principal.service";
import { RedisService } from "./redis.service";

import { AccessPolicyService } from "./access-policy.service";
import { PrincipalGuard } from "./principal.guard";
import { PermissionsGuard } from "./permissions.guard";

function readJwtExpiresIn(): number | string | undefined {
  const raw = process.env.JWT_EXPIRES_IN;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber)) return asNumber;
  return trimmed;
}

@Module({
  imports: [
    AuditModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || "dev-secret-key",
      signOptions: {
        expiresIn: (readJwtExpiresIn() || "1d") as any,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,

    // Optional Redis cache (shared principal cache when scaled horizontally)
    RedisService,

    IamPrincipalService,

    AccessPolicyService,
    PrincipalGuard,
    PermissionsGuard,

    // Global guards (standardized behavior)
    // Order matters: JWT -> Principal -> Permission/Role evaluation
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PrincipalGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, RedisService, IamPrincipalService, AccessPolicyService, PrincipalGuard, PermissionsGuard],
})
export class AuthModule {}
