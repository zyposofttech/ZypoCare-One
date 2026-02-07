"use client";

import * as React from "react";
import { useAuthStore } from "@/lib/auth/store";
import { useActiveBranchStore } from "@/lib/branch/active-branch";

export type BranchContext = {
  scope: "GLOBAL" | "BRANCH";
  branchId: string | null;
  activeBranchId: string | null;
  isReady: boolean;
  reason?: string;
};
function normUpper(v: unknown) {
  return String(v ?? "").trim().toUpperCase();
}

function resolveScope(user: any): "GLOBAL" | "BRANCH" {
  const explicit = normUpper(user?.roleScope);
  if (explicit === "GLOBAL" || explicit === "BRANCH") return explicit as any;

  const role = normUpper(user?.roleCode ?? user?.role);
  if (role === "SUPER_ADMIN" || role === "CORPORATE_ADMIN" || role === "GLOBAL_ADMIN") return "GLOBAL";
  if (role === "BRANCH_ADMIN") return "BRANCH";

  // Last resort fallback
  return user?.branchId ? "BRANCH" : "GLOBAL";
}

export function useBranchContext(): BranchContext {
  const user = useAuthStore((s) => s.user);
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);

  const scope: "GLOBAL" | "BRANCH" = resolveScope(user);

  // BRANCH scope: branch is always fixed.
  if (scope === "BRANCH") {
    const resolvedBranchId = user?.branchId ?? null;
    return {
      scope,
      branchId: resolvedBranchId,
      activeBranchId: resolvedBranchId,
      isReady: Boolean(resolvedBranchId),
      reason: resolvedBranchId ? undefined : "Missing branchId on principal",
    };
  }

  // GLOBAL scope: branch must be chosen.
  return {
    scope,
    branchId: activeBranchId ?? null,
    activeBranchId: activeBranchId ?? null,
    isReady: Boolean(activeBranchId),
    reason: activeBranchId ? undefined : "Select an active branch",
  };
}
