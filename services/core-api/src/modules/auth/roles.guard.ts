import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";
import type { Principal } from "./access-policy.service";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const req = ctx.switchToHttp().getRequest();

    // ✅ Standard: roles are evaluated from the DB principal first (single source of truth)
    const principal = req.principal as Principal | undefined;
    const principalRole = principal?.roleCode || null;
    if (principalRole && required.includes(principalRole)) return true;

    // Fallback: token roles (Keycloak-style) or direct role claim
    const user = req.user as any;
    const tokenRoles: string[] = user?.realm_access?.roles || [];
    const tokenRole: string | undefined = user?.role;

    const ok = required.some((r) => tokenRoles.includes(r) || tokenRole === r);
    if (!ok) throw new ForbiddenException("Insufficient role");
    return true;
  }
}
