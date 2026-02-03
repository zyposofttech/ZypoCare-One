import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";
import { hashPassword } from "../iam/password.util";

@ApiTags("Auth/Login")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(@Body() dto: Record<string, any>) {
    // AuthService.login already returns:
    // { access_token, user { roleCode, roleScope, branchId, ... } }
    return this.authService.login(dto);
  }

  // ✅ change password (requires Bearer token)
  @HttpCode(HttpStatus.OK)
  @Post("change-password")
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    // Support both JwtAuthGuard (req.user.sub) and PrincipalGuard (req.principal.userId)
    const userId = req.user?.sub ?? req.principal?.userId;
    return this.authService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword
    );
  }

  // ✅ Optional: server-side logout (hard token revoke via jti blacklist)
  // Works only when AUTH_JTI_ENFORCE=true and Redis is configured.
  @HttpCode(HttpStatus.OK)
  @Post("logout")
  async logout(@Req() req: any) {
    const jti = req.user?.jti;
    const exp = req.user?.exp;
    await this.authService.revokeJti(String(jti || ""), typeof exp === "number" ? exp : undefined);
    return { ok: true };
  }

  // -------------------------------
  // Force seed helpers (dev only)
  // -------------------------------

  private prisma() {
    // Access prisma from AuthService (as in your original code)
    return (this.authService as any).prisma;
  }

  private async ensureActiveRoleVersion(args: {
    code: string;
    name: string;
    scope: "GLOBAL" | "BRANCH";
    description?: string;
  }) {
    const prisma = this.prisma();

    let tpl = await prisma.roleTemplate.findUnique({
      where: { code: args.code },
    });

    if (!tpl) {
      tpl = await prisma.roleTemplate.create({
        data: {
          code: args.code,
          name: args.name,
          scope: args.scope,
          description: args.description ?? null,
          isSystem: true,
        },
      });
    }

    // Prefer ACTIVE version
    let roleVersion = await prisma.roleTemplateVersion.findFirst({
      where: {
        roleTemplateId: tpl.id,
        status: "ACTIVE",
      },
      orderBy: { version: "desc" },
    });

    if (!roleVersion) {
      // Create v1 ACTIVE if none exists
      roleVersion = await prisma.roleTemplateVersion.create({
        data: {
          roleTemplateId: tpl.id,
          version: 1,
          status: "ACTIVE",
          notes: "Force seed",
        },
      });
    }

    return roleVersion;
  }

  // ✅ Keeps your original endpoint but makes it deterministic (always SUPER_ADMIN)
  @Public()
  @Get("force-seed")
  async forceSeed() {
    const prisma = this.prisma();

    const email = "superadmin@zypocare.com";
    const password = "ChangeMe@123";
    const hash = hashPassword(password);

    const roleVersion = await this.ensureActiveRoleVersion({
      code: "SUPER_ADMIN",
      name: "Super Admin",
      scope: "GLOBAL",
      description: "Emergency Seed",
    });

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash: hash,
        mustChangePassword: false,
        isActive: true,
        role: "SUPER_ADMIN",
        roleVersionId: roleVersion.id,
        branchId: null,
      },
      create: {
        email,
        name: "ZypoCare Super Admin",
        role: "SUPER_ADMIN",
        roleVersionId: roleVersion.id,
        passwordHash: hash,
        mustChangePassword: false,
        isActive: true,
        branchId: null,
      },
    });

    return {
      message: "✅ SUCCESS: Super Admin seeded!",
      user: { email: user.email, password },
    };
  }

  // ✅ NEW: seed a Corporate Admin (GLOBAL) to manage branches
  @Public()
  @Get("force-seed-corporate")
  async forceSeedCorporate() {
    const prisma = this.prisma();

    const email = "corporateadmin@zypocare.com";
    const password = "ChangeMe@123";
    const hash = hashPassword(password);

    const roleVersion = await this.ensureActiveRoleVersion({
      code: "CORPORATE_ADMIN",
      name: "Corporate Admin",
      scope: "GLOBAL",
      description: "Enterprise-level admin (multi-branch)",
    });

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash: hash,
        mustChangePassword: false,
        isActive: true,
        role: "CORPORATE_ADMIN",
        roleVersionId: roleVersion.id,
        branchId: null,
      },
      create: {
        email,
        name: "ZypoCare Corporate Admin",
        role: "CORPORATE_ADMIN",
        roleVersionId: roleVersion.id,
        passwordHash: hash,
        mustChangePassword: false,
        isActive: true,
        branchId: null,
      },
    });

    return {
      message: "✅ SUCCESS: Corporate Admin seeded!",
      user: { email: user.email, password },
    };
  }
}
