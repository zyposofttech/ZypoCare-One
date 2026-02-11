import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { AccessPolicyService } from "./access-policy.service";

/**
 * Loads the local DB User as "principal".
 *
 * Enterprise behavior:
 *  - Prefer token.sub (userId) for lookup
 *  - Enforce authzVersion invalidation (handled by IamPrincipalService)
 *  - Fallback to email claim if sub is missing (compat)
 *  - Normalize req.user fields (staffId/branchId) from principal to avoid drift
 */
@Injectable()
export class PrincipalGuard implements CanActivate {
  constructor(private readonly access: AccessPolicyService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // Allow explicitly public routes to bypass principal loading.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const tokenUser: any = req.user || {};

    const userId = tokenUser.sub ?? tokenUser.userId ?? tokenUser.id ?? null;

    let principal: any = null;

    if (userId) {
      const raw = tokenUser.authzVersion;
      const authzVersion = Number.isFinite(Number(raw)) ? Number(raw) : 0;
      principal = await this.access.loadPrincipalByUserId(String(userId), authzVersion);
    } else {
      const email =
        tokenUser.email ??
        tokenUser.preferred_username ??
        tokenUser.upn ??
        tokenUser.unique_name ??
        null;

      if (!email) throw new UnauthorizedException("Token missing user identifier");
      principal = await this.access.loadPrincipalByEmail(String(email));
    }

    if (!principal) throw new UnauthorizedException("No local user mapped for this identity");

    // Attach principal for downstream controllers/services
    req.principal = principal;

    // Keep request user claims stable for downstream code paths that read req.user.*
    req.user = {
      ...tokenUser,
      sub: tokenUser.sub ?? principal.userId,
      email: tokenUser.email ?? principal.email ?? null,
      staffId: principal.staffId ?? tokenUser.staffId ?? null,
      branchId: principal.branchId ?? tokenUser.branchId ?? null,
      authzVersion: principal.authzVersion ?? tokenUser.authzVersion ?? 0,
    };

    return true;
  }
}
