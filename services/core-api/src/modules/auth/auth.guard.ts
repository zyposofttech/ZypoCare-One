import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { RedisService } from "./redis.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly redis: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException("Missing Bearer token");

    try {
      const payload = await this.jwtService.verifyAsync(token);

      // Optional hard token revocation via Redis blacklist (jti)
      // Enabled only when AUTH_JTI_ENFORCE=true AND Redis is configured.
      if (process.env.AUTH_JTI_ENFORCE === "true" && this.redis.isEnabled()) {
        const jti = String(payload?.jti || "").trim();
        if (jti) {
          const revoked = await this.redis.isJtiRevoked(jti);
          if (revoked) throw new UnauthorizedException("Session revoked");
        }
      }

      request.user = payload;

      // ✅ Enforce mustChangePassword, but allow minimal endpoints needed
      // IMPORTANT: allow /iam/me so frontend bootstrap doesn't get stuck/log-out loops
      const mustChangePassword = payload?.mustChangePassword === true;
      if (mustChangePassword) {
        const url = String(request.originalUrl || request.url || "");
        const method = String(request.method || "GET").toUpperCase();

        const allow =
          // password change itself
          url.includes("/auth/change-password") ||
          // allow principal bootstrap & UI role detection
          (method === "GET" && url.includes("/iam/me")) ||
          // allow logout endpoint if you later add it in core-api
          url.includes("/auth/logout");

        if (!allow) {
          throw new ForbiddenException({
            message: "Password change required",
            code: "MUST_CHANGE_PASSWORD",
          });
        }
      }

      return true;
    } catch (e: any) {
      if (e instanceof ForbiddenException) throw e;
      throw new UnauthorizedException("Invalid or Expired Token");
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
