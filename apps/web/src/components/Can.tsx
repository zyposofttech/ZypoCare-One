"use client";

import * as React from "react";
import { usePermissions } from "@/lib/auth/store";

type Props = {
  perm?: string;
  any?: string[];
  all?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function Can({ perm, any, all, children, fallback = null }: Props) {
  const { can, canAny, canAll } = usePermissions();

  let ok = true;
  if (perm) ok = ok && can(perm);
  if (any?.length) ok = ok && canAny(any);
  if (all?.length) ok = ok && canAll(all);

  return <>{ok ? children : fallback}</>;
}
