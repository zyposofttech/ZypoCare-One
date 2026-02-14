"use client";

/**
 * Compliance AI hooks — thin wrappers around the main CopilotProvider.
 *
 * The compliance AI state now lives in CopilotProvider (unified widget).
 * These hooks provide a convenient API for compliance pages.
 *
 * IMPORTANT: useCompliancePageHelp must be called from a component that
 * renders INSIDE <AppShell> (which contains CopilotProvider).
 * Use <CompliancePageHead> in the inline components for the easiest pattern.
 */

import * as React from "react";
import { useCopilot } from "./CopilotProvider";

/* ─── Page Registration Hook ───────────────────────────────────────────── */

/**
 * Call from a component rendered INSIDE <AppShell>/<CopilotProvider>.
 * This sets the compliancePageId in CopilotProvider, which triggers
 * contextual help loading and switches the widget to compliance mode.
 *
 * ⚠️  Do NOT call at the top level of a page component that renders
 *     <AppShell> — the provider isn't available yet at that level.
 *     Use <CompliancePageHead pageId="..." /> instead.
 */
export function useCompliancePageHelp(pageId: string) {
  const ctx = useCopilot();

  React.useEffect(() => {
    ctx.setCompliancePageId(pageId);
    return () => {
      ctx.setCompliancePageId(null);
    };
  }, [pageId, ctx]);

  return {
    pageHelp: ctx.compliancePageHelp,
    loading: ctx.compliancePageHelpLoading,
    openHelp: () => ctx.setWidgetOpen(true),
  };
}
