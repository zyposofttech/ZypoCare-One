import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import type { Principal } from "./access-policy.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!required?.length) return true;

    const req = ctx.switchToHttp().getRequest();
    const principal = req.principal as Principal | undefined;
    if (!principal) throw new ForbiddenException("Missing principal");

    // ✅ SUPER_ADMIN safety: never block system-level access due to permission catalog drift.
    // Backend services also enforce SUPER_ADMIN bypass in several places, but this guard sits
    // in front of controllers — so it must honor the same rule.
    const roleCode = String((principal as any).roleCode ?? "").trim().toUpperCase();
    if (roleCode === "SUPER_ADMIN") return true;

    const set = new Set(principal.permissions || []);
    const ok = required.every((p) => set.has(p));
    if (!ok) throw new ForbiddenException("Insufficient permissions");
    return true;
  }
}
