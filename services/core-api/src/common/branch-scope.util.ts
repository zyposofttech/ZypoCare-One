import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { Principal } from "../modules/auth/access-policy.service";

/**
 * If client sends branchId in both query & body, they must match.
 * Returns a single chosen branchId (or null).
 */
export function pickBranchId(queryBranchId?: string | null, bodyBranchId?: string | null): string | null {
  const q = queryBranchId ? String(queryBranchId).trim() : null;
  const b = bodyBranchId ? String(bodyBranchId).trim() : null;

  if (q && b && q !== b) {
    throw new BadRequestException("branchId provided in both query and body must match");
  }

  return q ?? b ?? null;
}

/**
 * Standard branch scope resolution:
 * - BRANCH principals: always return principal.branchId; if requestedBranchId provided and differs -> 403
 * - GLOBAL principals: return requestedBranchId when provided; if requiredForGlobal and missing -> 400; else null (meaning "all branches")
 */
// Overloads to keep branchId types strict in call-sites.
// - If a concrete branchId string is provided, we will always return a string.
// - If `requiredForGlobal: true`, GLOBAL principals must provide a branchId and the return is a string.
// - Otherwise, GLOBAL principals may omit branchId and the return can be null ("all branches").
export function resolveBranchId(
  principal: Principal,
  requestedBranchId: string,
  opts?: { requiredForGlobal?: boolean },
): string;
export function resolveBranchId(
  principal: Principal,
  requestedBranchId: string | null | undefined,
  opts: { requiredForGlobal: true },
): string;
export function resolveBranchId(
  principal: Principal,
  requestedBranchId?: string | null,
  opts?: { requiredForGlobal?: false },
): string | null;
export function resolveBranchId(
  principal: Principal,
  requestedBranchId?: string | null,
  opts?: { requiredForGlobal?: boolean },
): string | null {
  const requiredForGlobal = opts?.requiredForGlobal ?? false;

  if (principal.roleScope === "BRANCH") {
    const allowed = Array.isArray((principal as any).branchIds) && (principal as any).branchIds.length
      ? (principal as any).branchIds
      : (principal.branchId ? [principal.branchId] : []);

    if (!allowed.length) throw new ForbiddenException("Branch-scoped principal missing branchId");

    // If caller requested a branchId, it must be one of the allowed branches.
    if (requestedBranchId && !allowed.includes(requestedBranchId)) {
      throw new ForbiddenException("Cannot access another branch");
    }

    // Default when not explicitly requested: use principal.branchId if set, else first allowed.
    return requestedBranchId ?? principal.branchId ?? allowed[0];
  }

  // GLOBAL
  if (!requestedBranchId) {
    if (requiredForGlobal) throw new BadRequestException("branchId is required for this operation");
    return null;
  }
  return requestedBranchId;
}

/** Convenience: actor user id extraction for audit */
export function actorUserIdFromReq(req: any): string | null {
  return req?.principal?.userId ?? req?.user?.sub ?? null;
}
