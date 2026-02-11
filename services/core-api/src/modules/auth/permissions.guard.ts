import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import type { Principal } from "./access-policy.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRaw = this.reflector.getAllAndOverride<any>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const required: string[] = Array.isArray(requiredRaw)
      ? requiredRaw.filter(Boolean).map(String)
      : requiredRaw
        ? [String(requiredRaw)]
        : [];

    if (!required.length) return true;

    const req = ctx.switchToHttp().getRequest();
    const principal = req.principal as Principal | undefined;
    if (!principal) {
      throw new ForbiddenException({
        message: "Missing principal",
        code: "MISSING_PRINCIPAL",
      });
    }

    const set = new Set(principal.permissions || []);
    const missing = required.filter((p) => !set.has(p));

    if (missing.length) {
      throw new ForbiddenException({
        message: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
        missing,
      });
    }

    return true;
  }
}
