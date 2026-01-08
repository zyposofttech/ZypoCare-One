import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator"; // Ensure you have this decorator

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public() // This bypasses the AuthGuard so you can actually log in
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(@Body() signInDto: Record<string, any>) {
    return this.authService.login(signInDto);
  }
}