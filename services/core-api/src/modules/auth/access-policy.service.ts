import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { IamPrincipalService } from "./iam-principal.service";

export type Principal = {
  userId: string;
  email: string;
  name: string;

  /**
   * Linked Staff directory identity (HR).
   *
   * - null for purely system users (e.g., GLOBAL SUPER_ADMIN not represented as Staff)
   * - non-null for staff-managed accounts
   */
  staffId?: string | null;

  branchId: string | null;
  // Optional multi-branch allowance (derived from UserRoleBinding)
  branchIds?: string[];
  roleCode: string | null;
  roleScope: "GLOBAL" | "BRANCH" | null;
  roleVersionId: string | null;
  authzVersion: number;
  permissions: string[];
};

@Injectable()
export class AccessPolicyService {
  constructor(private principals: IamPrincipalService) {}

  /**
   * Loads the local DB user as a Principal (roleScope + permissions).
   *
   * Source of truth:
   *  - roleTemplateVersion (ACTIVE) permissions if roleVersionId exists
   *  - fallback: resolve latest ACTIVE version by roleTemplate.code
   *  - safety fallback: SUPER_ADMIN gets all permissions (DB-driven)
   *
   * NOTE: returns null for disabled users (isActive=false).
   */
  async loadPrincipalByEmail(emailRaw: string): Promise<Principal | null> {
    return this.principals.loadPrincipalByEmail(emailRaw);
  }

  async loadPrincipalByUserId(userIdRaw: string, tokenAuthzVersion?: any): Promise<Principal | null> {
    return this.principals.loadPrincipalByUserId(userIdRaw, tokenAuthzVersion);
  }

  hasAll(principal: Principal, required: string[]) {
    if (!required?.length) return true;
    const set = new Set(principal.permissions || []);
    return required.every((p) => set.has(p));
  }

  isGlobal(principal: Principal | null | undefined) {
    return !!principal && principal.roleScope === "GLOBAL";
  }

  isBranch(principal: Principal | null | undefined) {
    return !!principal && principal.roleScope === "BRANCH";
  }

  /**
   * Convenience: checks if principal can operate on a branchId.
   * GLOBAL: allowed for any branchId
   * BRANCH: allowed only for own branchId
   */
  canAccessBranch(principal: Principal, branchId: string | null | undefined) {
    if (principal.roleScope === "GLOBAL") return true;
    if (principal.roleScope === "BRANCH") {
      const allowed =
        Array.isArray((principal as any).branchIds) && (principal as any).branchIds.length
          ? (principal as any).branchIds
          : principal.branchId
            ? [principal.branchId]
            : [];
      if (!allowed.length) return false;
      if (!branchId) return false;
      return allowed.includes(branchId);
    }
    return false;
  }

  resolveBranchId(
    principal: Principal,
    requestedBranchId: string | null | undefined,
    opts: { require?: boolean } = {},
  ): string | null {
    const req = requestedBranchId ? String(requestedBranchId).trim() : "";
    const requested = req.length ? req : null;

    if (principal.roleScope === "BRANCH") {
      const allowed =
        Array.isArray((principal as any).branchIds) && (principal as any).branchIds.length
          ? (principal as any).branchIds
          : principal.branchId
            ? [principal.branchId]
            : [];

      if (!allowed.length) {
        throw new ForbiddenException("Branch-scoped principal missing branchId");
      }

      // If caller requested a branchId, it must be one of the allowed branches.
      if (requested && !allowed.includes(requested)) {
        throw new ForbiddenException("Forbidden: cross-branch access");
      }

      // Default branch (when not explicitly requested): use principal.branchId if set, else the first allowed.
      return requested ?? principal.branchId ?? allowed[0];
    }

    if (principal.roleScope === "GLOBAL") {
      if (opts.require && !requested) {
        throw new BadRequestException("branchId is required");
      }
      return requested;
    }

    // Unknown/legacy scope: behave like GLOBAL, but keep strict require semantics
    if (opts.require && !requested) throw new BadRequestException("branchId is required");
    return requested;
  }

  /**
   * Throws if principal cannot access the supplied branchId.
   * (Use after resolveBranchId if you want explicit mismatch checks.)
   */
  assertBranchAccess(principal: Principal, branchId: string | null | undefined) {
    if (principal.roleScope === "GLOBAL") return;
    if (principal.roleScope === "BRANCH") {
      const allowed =
        Array.isArray((principal as any).branchIds) && (principal as any).branchIds.length
          ? (principal as any).branchIds
          : principal.branchId
            ? [principal.branchId]
            : [];
      if (!allowed.length) throw new ForbiddenException("Branch-scoped principal missing branchId");
      if (!branchId || !allowed.includes(branchId)) {
        throw new ForbiddenException("Forbidden: cross-branch access");
      }
    }
  }
}
