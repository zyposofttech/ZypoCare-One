import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { PrismaClient } from "@zypocare/db";
import { AuditService } from "../audit/audit.service";
import { hashPassword, validatePassword, verifyPassword } from "../iam/password.util";

function lowerEmail(e: string) {
  return (e || "").trim().toLowerCase();
}

type AuthUserPayload = {
  id: string;
  email: string;
  name: string;
  // Legacy string role (kept for backward compatibility)
  role: string;
  // Canonical role code sourced from RoleTemplate (preferred)
  roleCode: string;
  roleScope: "GLOBAL" | "BRANCH" | null;
  branchId: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject("PRISMA") private readonly prisma: PrismaClient,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService
  ) {}

  private toAuthUser(u: any): AuthUserPayload {
    const roleCode = u?.roleVersion?.roleTemplate?.code ?? u.role;
    const roleScope = (u?.roleVersion?.roleTemplate?.scope as any) ?? null;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      roleCode,
      roleScope,
      branchId: u.branchId ?? null,
      mustChangePassword: !!u.mustChangePassword,
      isActive: !!u.isActive,
    };
  }

  private signToken(user: AuthUserPayload) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      roleCode: user.roleCode,
      roleScope: user.roleScope,
      realm_access: {
        roles: [user.roleCode || user.role],
      },
      branchId: user.branchId,
      mustChangePassword: user.mustChangePassword,
    });
  }

  async validateUser(emailRaw: string, pass: string): Promise<AuthUserPayload | null> {
    const email = lowerEmail(emailRaw);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roleVersion: { include: { roleTemplate: true } },
      },
    });

    if (!user || !user.passwordHash) return null;
    if (!user.isActive) return null;

    const ok = verifyPassword(pass, user.passwordHash);
    if (!ok) return null;

    return this.toAuthUser(user);
  }

  async login(dto: any) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException("Invalid credentials");

    return {
      access_token: this.signToken(user),
      user,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!userId) throw new UnauthorizedException("Invalid token");

    if (!currentPassword?.trim()) throw new BadRequestException("Current password is required");
    if (!newPassword?.trim()) throw new BadRequestException("New password is required");

    const policyErrors = validatePassword(newPassword);
    if (policyErrors.length) {
      throw new BadRequestException({ message: "Password policy violation", errors: policyErrors });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new UnauthorizedException("User not found");
    if (!user.isActive) throw new ForbiddenException("User is inactive");

    const ok = verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Current password is incorrect");

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashPassword(newPassword),
        mustChangePassword: false,
      },
      include: { roleVersion: { include: { roleTemplate: true } } },
    });

    await this.audit.log({
      branchId: updated.branchId ?? null,
      actorUserId: updated.id,
      action: "AUTH_PASSWORD_CHANGED",
      entity: "User",
      entityId: updated.id,
      meta: { forced: !!user.mustChangePassword },
    });

    const authUser = this.toAuthUser(updated);

    return {
      access_token: this.signToken(authUser),
      user: authUser,
      ok: true,
    };
  }
}
