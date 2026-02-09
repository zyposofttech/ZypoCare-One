"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";

export default function DashboardRedirectClient() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (!user) {
      router.replace("/login?next=/dashboard" as any);
      return;
    }

    const scope =
      (user as any).roleScope === "BRANCH"
        ? "BRANCH"
        : (user as any).roleScope === "GLOBAL"
          ? "GLOBAL"
          : (user as any).branchId
            ? "BRANCH"
            : "GLOBAL";

    const target = scope === "BRANCH" ? "/dashboard/branch" : "/dashboard/global";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace(target as any);
  }, [user, router]);

  return null;
}
