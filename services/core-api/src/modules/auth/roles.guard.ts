import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";
import type { Principal } from "./access-policy.service";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRaw = this.reflector.getAllAndOverride<any>(ROLES_KEY, [
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

    // ✅ Primary: evaluate from DB principal (single source of truth)
    const principal = req.principal as Principal | undefined;
    const principalRole = (principal?.roleCode || principal?.roleCode === "" ? principal.roleCode : null) ?? null;

    // SUPER_ADMIN override (industry-standard)
    if (principalRole === "SUPER_ADMIN") return true;

    if (principalRole && required.includes(principalRole)) return true;

    // Fallback: token roles (Keycloak-style) or direct role claim
    const user = req.user as any;
    const tokenRoles: string[] = Array.isArray(user?.realm_access?.roles) ? user.realm_access.roles : [];
    const tokenRole: string | undefined = user?.roleCode || user?.role;

    const ok = required.some((r) => tokenRoles.includes(r) || tokenRole === r);
    if (!ok) {
      throw new ForbiddenException({
        message: "Insufficient role",
        code: "INSUFFICIENT_ROLE",
        required,
        have: principalRole ?? tokenRole ?? null,
      });
    }

    return true;
  }
}
