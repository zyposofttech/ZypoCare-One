import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { AccessPolicyService } from "./access-policy.service";

/**
 * Loads the local DB User as "principal" using the authenticated token's email claim.
 * Requires JwtAuthGuard to have already set req.user.
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

    const email =
      tokenUser.email ||
      tokenUser.preferred_username ||
      tokenUser.upn ||
      tokenUser.unique_name;

    if (!email) throw new UnauthorizedException("Token missing email claim");

    const principal = await this.access.loadPrincipalByEmail(String(email));
    if (!principal) throw new UnauthorizedException("No local user mapped for this identity");

    req.principal = principal;
    return true;
  }
}
