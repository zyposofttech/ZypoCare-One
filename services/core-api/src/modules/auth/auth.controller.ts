// services/core-api/src/modules/auth/auth.controller.ts
import { Body, Controller, HttpCode, HttpStatus, Post, Get, BadRequestException,Res } from "@nestjs/common"; 
import { Response } from 'express';
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";
import { hashPassword } from "../iam/password.util"; // <-- Import this

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post("login")
    async login(@Body() signInDto: Record<string, any>) {
        return this.authService.login(signInDto);
    }

    @Public()
    @Post("forgot-password")
    async forgotPassword(@Body() body: { email: string }) {
        return this.authService.forgotPassword(body.email);
    }

    @Public()
    @Post("reset-password")
    async resetPassword(@Body() body: { token: string; password: string }) {
        return this.authService.resetPassword(body.token, body.password);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Res({ passthrough: true }) res: Response) {
        // If using cookies, clear them
        res.clearCookie('access_token');
        return { message: 'Logged out successfully' };
    }
    
    @Public()
    @Get("force-seed")
    async forceSeed() {
        // 1. Access Prisma directly via AuthService (we cast to 'any' to bypass private)
        const prisma = (this.authService as any).prisma;

        const email = "superadmin@excelcare.local";
        const password = "ChangeMe@123";

        // 2. Generate Hash
        const hash = await hashPassword(password);

        // 3. Upsert User (Create if new, Update if exists)
        try {
            // We need a dummy Role Version ID. Let's find or create one.
            // In a real app, this is cleaner, but for emergency fix:
            let roleVersion = await prisma.roleTemplateVersion.findFirst();
            if (!roleVersion) {
                const tpl = await prisma.roleTemplate.create({
                    data: { code: "SUPER_ADMIN", name: "Super Admin", scope: "GLOBAL", description: "Emergency Seed" }
                });
                roleVersion = await prisma.roleTemplateVersion.create({
                    data: { roleTemplateId: tpl.id, version: 1, status: "ACTIVE" }
                });
            }

            const user = await prisma.user.upsert({
                where: { email },
                update: {
                    passwordHash: hash,
                    mustChangePassword: false, // Turn off forced change for now
                    isActive: true
                },
                create: {
                    email,
                    name: "ExcelCare Super Admin",
                    role: "SUPER_ADMIN",
                    roleVersionId: roleVersion.id,
                    passwordHash: hash,
                    mustChangePassword: false,
                    isActive: true
                }
            });

            return {
                message: "✅ SUCCESS: User seeded!",
                user: { email: user.email, password: password }
            };
        } catch (error: any) {
            return { error: error.message, stack: error.stack };
        }
    }

}