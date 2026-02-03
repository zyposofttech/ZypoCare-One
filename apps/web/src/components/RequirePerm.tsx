"use client";

import * as React from "react";
import { useAuthStore, hasPerm, hasAnyPerm, hasAllPerms } from "@/lib/auth/store";
import { NoAccess } from "@/components/NoAccess";

type BaseProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  title?: string;
  description?: string;
};

type RequirePermProps = BaseProps & {
  perm: string;
};

type RequireAnyPermProps = BaseProps & {
  any: string[];
};

type RequireAllPermProps = BaseProps & {
  all: string[];
};

function useAuthSnapshot() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return { user, hydrated };
}

export function RequirePerm({ perm, children, fallback, title, description }: RequirePermProps) {
  const { user, hydrated } = useAuthSnapshot();

  if (!hydrated) return null;
  if (!perm) return <>{children}</>;

  const ok = hasPerm(user, perm);
  if (ok) return <>{children}</>;

  return (
    <>
      {fallback ?? (
        <NoAccess
          perm={perm}
          title={title ?? "Access denied"}
          description={description ?? "You don’t have permission to view this page."}
        />
      )}
    </>
  );
}

export function RequireAnyPerm({ any, children, fallback, title, description }: RequireAnyPermProps) {
  const { user, hydrated } = useAuthSnapshot();

  if (!hydrated) return null;
  if (!any?.length) return <>{children}</>;

  const ok = hasAnyPerm(user, any);
  if (ok) return <>{children}</>;

  const label = any.join(" | ");
  return (
    <>
      {fallback ?? (
        <NoAccess
          perm={label}
          title={title ?? "Access denied"}
          description={description ?? "You don’t have permission to view this page."}
        />
      )}
    </>
  );
}

export function RequireAllPerm({ all, children, fallback, title, description }: RequireAllPermProps) {
  const { user, hydrated } = useAuthSnapshot();

  if (!hydrated) return null;
  if (!all?.length) return <>{children}</>;

  const ok = hasAllPerms(user, all);
  if (ok) return <>{children}</>;

  const label = all.join(" & ");
  return (
    <>
      {fallback ?? (
        <NoAccess
          perm={label}
          title={title ?? "Access denied"}
          description={description ?? "You don’t have permission to view this page."}
        />
      )}
    </>
  );
}
