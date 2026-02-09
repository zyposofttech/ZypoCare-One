"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";

// ─── Types matching backend AutoFillResult ─────────────────────────────

export type AutoFillSuggestion = {
  field: string;
  value: any;
  confidence: number;
  reasoning: string;
  source: string;
  isOverride: boolean;
};

export type UnitSuggestion = {
  typeCode: string;
  typeName: string;
  suggestedCount: number;
  bedCount: number;
  roomTypes: Array<{ type: string; count: number }>;
  reasoning: string;
};

export type AutoFillResult = {
  suggestions: AutoFillSuggestion[];
  unitPlan: UnitSuggestion[];
  departmentSuggestions: Array<{ code: string; name: string; reason: string }>;
  equipmentHighlights: Array<{
    name: string;
    quantity: number;
    compliance: string | null;
    reason: string;
  }>;
  summary: string;
  confidence: number;
};

export type AutoFillInput = {
  name?: string;
  city?: string;
  bedCount?: number;
  hospitalType?: string;
  specialties?: string[];
  emergency24x7?: boolean;
};

// ─── Hook ───────────────────────────────────────────────────────────────

export function useAutoFill(debounceMs = 600) {
  const [result, setResult] = React.useState<AutoFillResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [appliedFields, setAppliedFields] = React.useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const lastInputRef = React.useRef<string>("");

  const fetch = React.useCallback(
    async (input: AutoFillInput) => {
      // Don't fetch if no meaningful input
      const hasInput = input.city || (input.bedCount && input.bedCount > 0);
      if (!hasInput) {
        setResult(null);
        return;
      }

      // Deduplicate identical requests
      const key = JSON.stringify(input);
      if (key === lastInputRef.current) return;
      lastInputRef.current = key;

      // Cancel previous request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const data = await apiFetch<AutoFillResult>("/api/infrastructure/ai/auto-fill", {
          method: "POST",
          body: JSON.stringify(input),
          signal: abortRef.current.signal,
        });
        setResult(data);
        setDismissed(false);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Auto-fill failed");
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const debouncedFetch = React.useCallback(
    (input: AutoFillInput) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void fetch(input), debounceMs);
    },
    [fetch, debounceMs],
  );

  const markApplied = React.useCallback((field: string) => {
    setAppliedFields((prev) => new Set(prev).add(field));
  }, []);

  const dismiss = React.useCallback(() => {
    setDismissed(true);
  }, []);

  const reset = React.useCallback(() => {
    setResult(null);
    setAppliedFields(new Set());
    setDismissed(false);
    lastInputRef.current = "";
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return {
    result,
    loading,
    error,
    appliedFields,
    dismissed,
    fetch: debouncedFetch,
    markApplied,
    dismiss,
    reset,
  };
}
