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
 */
@Injectable()
export class PrincipalGuard implements CanActivate {
  constructor(private access: AccessPolicyService, private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // Allow explicitly public routes to bypass principal loading.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const tokenUser = req.user || {};

    const userId = tokenUser.sub || tokenUser.id || tokenUser.userId;

    let principal = null;

    if (userId) {
      principal = await this.access.loadPrincipalByUserId(String(userId), tokenUser.authzVersion);
    } else {
      const email =
        tokenUser.email ||
        tokenUser.preferred_username ||
        tokenUser.upn ||
        tokenUser.unique_name;

      if (!email) throw new UnauthorizedException("Token missing user identifier");
      principal = await this.access.loadPrincipalByEmail(String(email));
    }

    if (!principal) throw new UnauthorizedException("No local user mapped for this identity");

    req.principal = principal;
    return true;
  }
}
