import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { PrismaClient } from "@excelcare/db";
import { verifyPassword } from "../iam/password.util";

@Injectable()
export class AuthService {
  constructor(
    @Inject("PRISMA") private readonly prisma: PrismaClient,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && user.passwordHash && verifyPassword(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(userDto: any) {
    const user = await this.validateUser(userDto.email, userDto.password);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Payload matches what your Guards likely expect
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
}