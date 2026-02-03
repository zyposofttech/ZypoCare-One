"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const SYSTEM_ROLE_CODES = [
  "SUPER_ADMIN",
  "CORPORATE_ADMIN",
  "GLOBAL_ADMIN",
  "BRANCH_ADMIN",
] as const;
export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number];
// Role codes must be extensible: HIMS will have many roles (pharmacy, lab, housekeeping, etc.)
export type RoleCode = string;

// Backward compatibility: some older code uses `user.role`
export type AppRole = SystemRoleCode | string;

export type RoleScope = "GLOBAL" | "BRANCH";

export type AuthUser = {
  id: string;
  name: string;
  email: string;

  // Legacy role field (kept for backward compatibility).
  // Prefer roleCode for authorization decisions.
  role: AppRole | string;

  // Canonical role code returned by backend (any string, not enum-limited)
  roleCode?: RoleCode | null;

  roleScope?: RoleScope | string | null;
  permissions?: string[];

  branchId?: string | null;
  branchName?: string | null;

  // ✅ enterprise: for corporate/global principals that can operate across multiple branches
  allowedBranchIds?: string[] | null;

  mustChangePassword?: boolean;
  isActive?: boolean;
};

export function getRoleCode(user: AuthUser | null | undefined): string {
  return String(user?.roleCode ?? user?.role ?? "").trim().toUpperCase();
}

export function getRoleScope(user: AuthUser | null | undefined): RoleScope | null {
  if (!user) return null;

  const scope = String(user.roleScope ?? "").trim().toUpperCase();
  if (scope === "GLOBAL" || scope === "BRANCH") return scope as RoleScope;

  // Fallback: branchId implies BRANCH scope
  if (user.branchId) return "BRANCH";

  // Fallback: known platform roles imply GLOBAL
  const roleCode = getRoleCode(user);
  if (roleCode === "SUPER_ADMIN" || roleCode === "CORPORATE_ADMIN" || roleCode === "GLOBAL_ADMIN") {
    return "GLOBAL";
  }

  return null;
}

export function getPermissions(user: AuthUser | null | undefined): string[] {
  return Array.isArray(user?.permissions) ? user!.permissions! : [];
}

/**
 * ✅ Enterprise helper: supports exact permissions and simple wildcard patterns.
 * Example:
 *  - hasPerm(user, "IAM_ROLE_READ")
 *  - hasPerm(user, "INFRA_*_READ")
 */
function matchPerm(pattern: string, granted: string): boolean {
  if (!pattern) return false;
  if (pattern === granted) return true;

  // Wildcard support: "*" matches any substring
  if (pattern.includes("*")) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const re = new RegExp(`^${escaped}$`);
    return re.test(granted);
  }

  return false;
}

export function hasPerm(user: AuthUser | null | undefined, perm: string): boolean {
  if (!perm) return false;
  const perms = getPermissions(user);
  if (!perms.length) return false;

  // Fast path for exact matches
  if (!perm.includes("*")) return perms.includes(perm);

  // Pattern match path
  return perms.some((g) => matchPerm(perm, g));
}

export function hasAnyPerm(user: AuthUser | null | undefined, perms: string[]): boolean {
  const p = getPermissions(user);
  if (!p.length) return false;
  return perms.some((x) => (x.includes("*") ? p.some((g) => matchPerm(x, g)) : p.includes(x)));
}

export function hasAllPerms(user: AuthUser | null | undefined, perms: string[]): boolean {
  const p = getPermissions(user);
  if (!p.length) return false;
  return perms.every((x) => (x.includes("*") ? p.some((g) => matchPerm(x, g)) : p.includes(x)));
}

/**
 * ✅ Standard primitive to use everywhere in UI.
 * This is how we stop RBAC logic from being re-implemented in every page.
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const perms = getPermissions(user);
  return {
    user,
    perms,
    can: (code: string) => hasPerm(user, code),
    canAny: (codes: string[]) => hasAnyPerm(user, codes),
    canAll: (codes: string[]) => hasAllPerms(user, codes),
  };
}

const REMEMBER_DEVICE_KEY = "zypocare-remember-device";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  _hasHydrated: boolean;
  login: (user: AuthUser, token: string | null) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
  setHydrated: (state: boolean) => void;
};

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function setAuthCookie() {
  setCookie("zypocare_auth", "1");
}

function clearAuthCookie() {
  clearCookie("zypocare_auth");
}

function inferScopeFromUser(u: AuthUser): "GLOBAL" | "BRANCH" {
  // Prefer explicit scope if backend provides it
  const scope = String(u.roleScope || "").toUpperCase();
  if (scope === "BRANCH") return "BRANCH";
  if (scope === "GLOBAL") return "GLOBAL";

  // Fallback: branchId implies BRANCH scope
  if (u.branchId) return "BRANCH";
  return "GLOBAL";
}

function setRoleScopeCookies(u: AuthUser) {
  const roleCode = getRoleCode(u);
  const scope = getRoleScope(u) ?? inferScopeFromUser(u);
  setCookie("zypocare_role", roleCode || "UNKNOWN");
  setCookie("zypocare_scope", scope);
}

function clearRoleScopeCookies() {
  clearCookie("zypocare_role");
  clearCookie("zypocare_scope");
}

function getPreferredStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    if (localStorage.getItem(REMEMBER_DEVICE_KEY) === "1") return localStorage;
    if (sessionStorage.getItem(REMEMBER_DEVICE_KEY) === "1") return sessionStorage;
  } catch {}
  return null;
}

const authStorage = {
  getItem: (name: string) => {
    if (typeof window === "undefined") return null;
    try {
      const preferred = getPreferredStorage();
      if (preferred) return preferred.getItem(name);
      return localStorage.getItem(name) ?? sessionStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    if (typeof window === "undefined") return;
    try {
      const preferred = getPreferredStorage();
      (preferred ?? localStorage).setItem(name, value);
    } catch {}
  },
  removeItem: (name: string) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    } catch {}
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      _hasHydrated: false,

      login: (user, token) => {
        setAuthCookie();
        setRoleScopeCookies(user);
        set({ user, token });
      },

      updateUser: (patch) => {
        const current = get().user;
        if (!current) return;
        const nextUser = { ...current, ...patch };
        // Keep cookies aligned if role/scope/branch changes
        try {
          setRoleScopeCookies(nextUser);
        } catch {}
        set({ user: nextUser });
      },

      logout: () => {
        clearAuthCookie();
        clearRoleScopeCookies();
        try {
          localStorage.removeItem(REMEMBER_DEVICE_KEY);
          sessionStorage.removeItem(REMEMBER_DEVICE_KEY);
          localStorage.removeItem("access_token");
          sessionStorage.removeItem("access_token");
        } catch {}
        set({ user: null, token: null });
      },

      setHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "zypocare-auth",
      storage: createJSONStorage(() => authStorage),
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
