import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuditModule } from "../audit/audit.module";
import { AccessPolicyService } from "./access-policy.service"; 

@Module({
  imports: [
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
    AccessPolicyService, 
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [
    AuthService, 
    AccessPolicyService 
  ],
})
export class AuthModule {}