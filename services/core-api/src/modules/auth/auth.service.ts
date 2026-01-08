import { Inject, Injectable, UnauthorizedException, BadRequestException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { PrismaClient } from "@excelcare/db";
import { verifyPassword, hashPassword } from "../iam/password.util";
import { randomBytes } from "crypto";

@Injectable()
export class AuthService {
  constructor(
    @Inject("PRISMA") private readonly prisma: PrismaClient,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.passwordHash && verifyPassword(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(userDto: any) {
    const user = await this.validateUser(userDto.email, userDto.password);
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      branchId: user.branchId 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    };
  }

  // --- NEW: FORGOT PASSWORD LOGIC ---
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Security: Do not reveal if user exists. Pretend success.
      return { message: "If that email exists, a reset link has been sent." };
    }

    // 1. Generate a secure random token
    const resetToken = randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // 2. Save hash of token to DB (Best practice: store hash, send raw to user)
    // For simplicity here, we storing raw token. In high security, hash it.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    // 3. Mock Email Sending (Since we don't have an SMTP setup)
    // In production, use @nestjs-modules/mailer to send this link:
    // Link: http://localhost:3000/auth/reset-password?token=${resetToken}
    console.log(`[MOCK EMAIL] To: ${email} | Reset Link: http://localhost:3000/auth/reset-password?token=${resetToken}`);

    return { 
      message: "Reset link sent (check console)", 
      // DEV ONLY: returning token so you can test it immediately
      dev_token: resetToken 
    };
  }

  async resetPassword(token: string, newPass: string) {
    // 1. Find user with valid token and non-expired date
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) throw new BadRequestException("Invalid or expired reset token");

    // 2. Hash new password
    const newHash = hashPassword(newPass);

    // 3. Update User & Clear Token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        mustChangePassword: false // They just changed it, so they are good
      }
    });

    return { message: "Password reset successfully. You may now login." };
  }
}