import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";
import { hashPassword } from "../iam/password.util";

/**
 * NOTE:
 * - login is public
 * - change-password requires Bearer token
 * - force-seed endpoints are DEV/BOOTSTRAP only (blocked in production by default)
 */
@ApiTags("Auth/Login")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // -------------------------------
  // Auth endpoints
  // -------------------------------

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(@Body() dto: Record<string, any>) {
    // AuthService.login returns:
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
    await this.authService.revokeJti(
      String(jti || ""),
      typeof exp === "number" ? exp : undefined
    );
    return { ok: true };
  }

  /**
   * Helpful for debugging what guards put on the request.
   * If you later add staffId into JWT + principal, you’ll see it here immediately.
   */
  @HttpCode(HttpStatus.OK)
  @Get("me")
  async me(@Req() req: any) {
    return {
      jwt: req.user ?? null,
      principal: req.principal ?? null,
    };
  }

  // -------------------------------
  // Force seed helpers (DEV only)
  // -------------------------------

  private prisma() {
    // Access prisma from AuthService (current pattern in your repo)
    return (this.authService as any).prisma;
  }

  private assertForceSeedAllowed() {
    const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
    const allow = process.env.ALLOW_AUTH_FORCE_SEED === "true";

    // Block in production unless explicitly enabled
    if (nodeEnv === "production" && !allow) {
      throw new ForbiddenException(
        "force-seed is disabled in production. Set ALLOW_AUTH_FORCE_SEED=true to enable."
      );
    }
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

  /**
   * ✅ Seeds SUPER_ADMIN user (GLOBAL).
   * Does NOT create a Staff row (by design) — SUPER_ADMIN is an IAM principal.
   *
   * You can override defaults via query params for convenience:
   * /auth/force-seed?email=...&password=...&name=...
   */
  @Public()
  @Get("force-seed")
  async forceSeed(
    @Query("email") emailQ?: string,
    @Query("password") passwordQ?: string,
    @Query("name") nameQ?: string
  ) {
    this.assertForceSeedAllowed();

    const prisma = this.prisma();

    const email = (emailQ?.trim() || "superadmin@zypocare.com").toLowerCase();
    const password = passwordQ?.trim() || "ChangeMe@123";
    const name = nameQ?.trim() || "ZypoCare Super Admin";

    const hash = hashPassword(password);

    const roleVersion = await this.ensureActiveRoleVersion({
      code: "SUPER_ADMIN",
      name: "Super Admin",
      scope: "GLOBAL",
      description: "Bootstrap Super Admin",
    });

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash: hash,
        mustChangePassword: true,
        isActive: true,
        role: "SUPER_ADMIN",
        roleVersionId: roleVersion.id,
        branchId: null,
      },
      create: {
        email,
        name,
        role: "SUPER_ADMIN",
        roleVersionId: roleVersion.id,
        passwordHash: hash,
        mustChangePassword: true,
        isActive: true,
        branchId: null,
      },
    });

    return {
      message: "✅ SUCCESS: Super Admin seeded!",
      user: { email: user.email, password, mustChangePassword: true },
    };
  }

  /**
   * ✅ Seeds Corporate Admin (GLOBAL) — useful for multi-branch setup.
   */
  @Public()
  @Get("force-seed-corporate")
  async forceSeedCorporate(
    @Query("email") emailQ?: string,
    @Query("password") passwordQ?: string,
    @Query("name") nameQ?: string
  ) {
    this.assertForceSeedAllowed();

    const prisma = this.prisma();

    const email = (emailQ?.trim() || "corporateadmin@zypocare.com").toLowerCase();
    const password = passwordQ?.trim() || "ChangeMe@123";
    const name = nameQ?.trim() || "ZypoCare Corporate Admin";

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
        mustChangePassword: true,
        isActive: true,
        role: "CORPORATE_ADMIN",
        roleVersionId: roleVersion.id,
        branchId: null,
      },
      create: {
        email,
        name,
        role: "CORPORATE_ADMIN",
        roleVersionId: roleVersion.id,
        passwordHash: hash,
        mustChangePassword: true,
        isActive: true,
        branchId: null,
      },
    });

    return {
      message: "✅ SUCCESS: Corporate Admin seeded!",
      user: { email: user.email, password, mustChangePassword: true },
    };
  }

  /**
   * ✅ Seeds Branch Admin (BRANCH).
   * Needs branchId.
   *
   * Example:
   * /auth/force-seed-branch-admin?branchId=xxx&email=...&password=...
   */
  @Public()
  @Get("force-seed-branch-admin")
  async forceSeedBranchAdmin(
    @Query("branchId") branchId?: string,
    @Query("email") emailQ?: string,
    @Query("password") passwordQ?: string,
    @Query("name") nameQ?: string
  ) {
    this.assertForceSeedAllowed();

    const prisma = this.prisma();

    const b = (branchId || "").trim();
    if (!b) throw new BadRequestException("branchId is required");

    const email = (emailQ?.trim() || `branchadmin.${b}@zypocare.com`).toLowerCase();
    const password = passwordQ?.trim() || "ChangeMe@123";
    const name = nameQ?.trim() || "ZypoCare Branch Admin";

    const hash = hashPassword(password);

    const roleVersion = await this.ensureActiveRoleVersion({
      code: "BRANCH_ADMIN",
      name: "Branch Admin",
      scope: "BRANCH",
      description: "Branch administrator",
    });

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash: hash,
        mustChangePassword: true,
        isActive: true,
        role: "BRANCH_ADMIN",
        roleVersionId: roleVersion.id,
        branchId: b,
      },
      create: {
        email,
        name,
        role: "BRANCH_ADMIN",
        roleVersionId: roleVersion.id,
        passwordHash: hash,
        mustChangePassword: true,
        isActive: true,
        branchId: b,
      },
    });

    return {
      message: "✅ SUCCESS: Branch Admin seeded!",
      user: { email: user.email, password, branchId: b, mustChangePassword: true },
    };
  }
}
