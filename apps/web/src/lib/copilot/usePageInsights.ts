"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import type { PageInsight, PageInsightsResponse } from "./types";

type UsePageInsightsOptions = {
  module: string;
  enabled?: boolean;
  refreshIntervalMs?: number;
};

type UsePageInsightsReturn = {
  insights: PageInsight[];
  loading: boolean;
  refresh: () => void;
  dismiss: (id: string) => void;
};

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for fetching page-level AI insights.
 * Returns contextual tips for the current infrastructure page.
 */
export function usePageInsights({
  module,
  enabled = true,
  refreshIntervalMs = REFRESH_MS,
}: UsePageInsightsOptions): UsePageInsightsReturn {
  const { branchId, isReady } = useBranchContext();

  const [insights, setInsights] = React.useState<PageInsight[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  const mountedRef = React.useRef(true);

  const fetchInsights = React.useCallback(async () => {
    if (!branchId || !enabled) return;

    setLoading(true);
    try {
      const res = await apiFetch<PageInsightsResponse>("/api/ai/page-insights", {
        method: "POST",
        body: { module, branchId },
        showLoader: false,
        branch: "none",
        skipNotify: true,
      });
      if (mountedRef.current) {
        setInsights(res.insights ?? []);
      }
    } catch (err: unknown) {
      // Log for debugging — AI copilot service may be down
      if (process.env.NODE_ENV === "development") {
        console.warn(`[usePageInsights] Failed to fetch insights for "${module}":`, err);
      }
      if (mountedRef.current) setInsights([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [branchId, module, enabled]);

  // Fetch on mount + interval
  React.useEffect(() => {
    mountedRef.current = true;
    if (!isReady || !branchId || !enabled) return;

    fetchInsights();
    const interval = setInterval(fetchInsights, refreshIntervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [isReady, branchId, enabled, fetchInsights, refreshIntervalMs]);

  // Re-fetch insights when infrastructure data changes
  React.useEffect(() => {
    const handler = () => {
      setTimeout(() => fetchInsights(), 1500);
    };
    window.addEventListener("zc:data-changed", handler);
    return () => window.removeEventListener("zc:data-changed", handler);
  }, [fetchInsights]);

  // Reset dismissed IDs when branch or module changes
  React.useEffect(() => {
    setDismissedIds(new Set());
  }, [branchId, module]);

  const dismiss = React.useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  // Filter out dismissed insights
  const visibleInsights = React.useMemo(
    () => insights.filter((i) => !dismissedIds.has(i.id)),
    [insights, dismissedIds]
  );

  return {
    insights: visibleInsights,
    loading,
    refresh: fetchInsights,
    dismiss,
  };
}
