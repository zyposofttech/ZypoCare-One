import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";
import { hashPassword } from "../iam/password.util";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(@Body() dto: Record<string, any>) {
    return this.authService.login(dto);
  }

  // ✅ NEW: change password (requires Bearer token)
  @HttpCode(HttpStatus.OK)
  @Post("change-password")
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    const userId = req.user?.sub;
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword);
  }

  // (keeping your force-seed endpoint as-is)
  @Public()
  @Get("force-seed")
  async forceSeed() {
    const prisma = (this.authService as any).prisma;

    const email = "superadmin@zypocare.local";
    const password = "ChangeMe@123";
    const hash = await hashPassword(password);

    let roleVersion = await prisma.roleTemplateVersion.findFirst();
    if (!roleVersion) {
      const tpl = await prisma.roleTemplate.create({
        data: { code: "SUPER_ADMIN", name: "Super Admin", scope: "GLOBAL", description: "Emergency Seed" },
      });
      roleVersion = await prisma.roleTemplateVersion.create({
        data: { roleTemplateId: tpl.id, version: 1, status: "ACTIVE" },
      });
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: hash, mustChangePassword: false, isActive: true },
      create: {
        email,
        name: "ExcelCare Super Admin",
        role: "SUPER_ADMIN",
        roleVersionId: roleVersion.id,
        passwordHash: hash,
        mustChangePassword: false,
        isActive: true,
      },
    });

    return { message: "✅ SUCCESS: User seeded!", user: { email: user.email, password } };
  }
}
