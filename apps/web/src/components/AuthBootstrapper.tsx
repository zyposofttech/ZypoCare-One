"use client";

import * as React from "react";
import { syncPrincipalToAuthStore } from "@/lib/api";
import { useAuthStore } from "@/lib/auth/store";

/**
 * Bootstraps auth context after hydration:
 * - If access_token exists, fetch /api/iam/me
 * - Normalize principal into Zustand auth store
 * - If token invalid, logout/clear token (handled inside api.ts helper)
 */
export function AuthBootstrapper() {
  const hydrated = useAuthStore((s) => s._hasHydrated);
  const user = useAuthStore((s) => s.user);
  const inFlight = React.useRef(false);

  React.useEffect(() => {
    // Bootstraps auth context after hydration and also after login.
    // Key fix: the original version ran only once, BEFORE login, so permissions
    // were not hydrated until a full page refresh.
    if (!hydrated) return;
    if (!user) return;

    const perms = Array.isArray(user.permissions) ? user.permissions : null;
    const permsLoaded = !!perms; // treat empty array as "loaded" (backend is source of truth)
    if (permsLoaded) return;

    if (inFlight.current) return;
    inFlight.current = true;
    void syncPrincipalToAuthStore().finally(() => {
      inFlight.current = false;
    });
  }, [hydrated, user?.id, user?.permissions]);

  return null;
}
