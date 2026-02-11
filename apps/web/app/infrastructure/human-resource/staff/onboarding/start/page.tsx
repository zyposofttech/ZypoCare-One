"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";

function newLocalDraftId() {
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") return (crypto as any).randomUUID();
  return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Start route should NOT render a blank app.
 * It simply ensures draftId exists and moves user to Personal step.
 * No DB writes here.
 */
export default function StartPage() {
  const router = useRouter();
  const sp = useSearchParams();

  React.useEffect(() => {
    const existing = sp.get("draftId");
    const id = existing || newLocalDraftId();
    router.replace(
      `/infrastructure/human-resource/staff/onboarding/personal?draftId=${encodeURIComponent(id)}` as any,
    );
  }, [router, sp]);

  return (
    <AppShell title="Staff Onboarding">
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-zc-border border-t-zc-accent" />
          <div className="text-sm text-zc-muted">Starting onboarding…</div>
        </div>
      </div>
    </AppShell>
  );
}
