import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { PrismaClient } from "@excelcare/db";
import { AuditService } from "../audit/audit.service";
import { hashPassword, validatePassword, verifyPassword } from "../iam/password.util";

function lowerEmail(e: string) {
  return (e || "").trim().toLowerCase();
}

type AuthUserPayload = {
  id: string;
  email: string;
  name: string;
  role: string;
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
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      branchId: u.branchId ?? null,
      mustChangePassword: !!u.mustChangePassword,
      isActive: !!u.isActive,
    };
  }

  private signToken(user: AuthUserPayload) {
    // IMPORTANT: Include mustChangePassword in token so guard can enforce it
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      // ✅ FIX: Added realm_access to satisfy Keycloak-style RolesGuard
      realm_access: {
        roles: [user.role],
      },
      branchId: user.branchId,
      mustChangePassword: user.mustChangePassword,
    });
  }

  async validateUser(emailRaw: string, pass: string): Promise<AuthUserPayload | null> {
    const email = lowerEmail(emailRaw);

    const user = await this.prisma.user.findUnique({
      where: { email },
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
      user, // includes mustChangePassword
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!userId) throw new UnauthorizedException("Invalid token");

    if (!currentPassword?.trim()) {
      throw new BadRequestException("Current password is required");
    }
    if (!newPassword?.trim()) {
      throw new BadRequestException("New password is required");
    }

    const policyErrors = validatePassword(newPassword);
    if (policyErrors.length) {
      throw new BadRequestException({
        message: "Password policy violation",
        errors: policyErrors,
      });
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
      access_token: this.signToken(authUser), // NEW token with mustChangePassword=false
      user: authUser,
      ok: true,
    };
  }
}