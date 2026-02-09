"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";
import { checkFieldRules } from "./field-rules";
import type { FieldValidationResult, FieldWarning } from "./types";

type UseFieldCopilotOptions = {
  module: string;
  field: string;
  value: string;
  context?: Record<string, unknown>;
  debounceMs?: number;
  enabled?: boolean;
};

type UseFieldCopilotReturn = {
  warnings: FieldWarning[];
  suggestion: FieldValidationResult["suggestion"] | null;
  validating: boolean;
  applySuggestion: (() => Record<string, unknown>) | null;
  dismissSuggestion: () => void;
};

/**
 * Hook that provides field-level AI validation.
 *
 * Tier 1: Client-side rules (instant, <10ms)
 * Tier 2: Server-side rules via /api/ai/field-validate (debounced)
 */
export function useFieldCopilot({
  module,
  field,
  value,
  context,
  debounceMs = 400,
  enabled = true,
}: UseFieldCopilotOptions): UseFieldCopilotReturn {
  const [serverWarnings, setServerWarnings] = React.useState<FieldWarning[]>([]);
  const [suggestion, setSuggestion] = React.useState<FieldValidationResult["suggestion"] | null>(null);
  const [validating, setValidating] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Tier 1: client-side rules (instant)
  const clientWarnings = React.useMemo(() => {
    if (!enabled || !value) return [];
    return checkFieldRules(module, field, value, context) ?? [];
  }, [enabled, module, field, value, context]);

  // Tier 2: server-side validation (debounced)
  React.useEffect(() => {
    if (!enabled || !value) {
      setServerWarnings([]);
      setSuggestion(null);
      return;
    }

    // Reset dismissed state on value change
    setDismissed(false);

    // Cancel previous request
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    timerRef.current = setTimeout(async () => {
      abortRef.current = new AbortController();
      setValidating(true);

      try {
        const res = await apiFetch<FieldValidationResult>("/api/ai/field-validate", {
          method: "POST",
          body: { module, field, value, context },
          signal: abortRef.current.signal,
          showLoader: false,
          branch: "none",
        });

        // Only keep server warnings that aren't already caught client-side
        const clientMsgs = new Set(clientWarnings.map((w) => w.message));
        const newWarnings = res.warnings.filter((w) => !clientMsgs.has(w.message));
        setServerWarnings(newWarnings);
        setSuggestion(res.suggestion ?? null);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setServerWarnings([]);
          setSuggestion(null);
        }
      } finally {
        setValidating(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [enabled, module, field, value, context, debounceMs, clientWarnings]);

  // Merge client + server warnings (deduplicated)
  const allWarnings = React.useMemo(() => {
    const seen = new Set<string>();
    const merged: FieldWarning[] = [];
    for (const w of [...clientWarnings, ...serverWarnings]) {
      if (!seen.has(w.message)) {
        seen.add(w.message);
        merged.push(w);
      }
    }
    return merged;
  }, [clientWarnings, serverWarnings]);

  const applySuggestion = React.useMemo(() => {
    if (!suggestion || dismissed) return null;
    return () => {
      setDismissed(true);
      return suggestion.value;
    };
  }, [suggestion, dismissed]);

  const dismissSuggestion = React.useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    warnings: allWarnings,
    suggestion: dismissed ? null : suggestion,
    validating,
    applySuggestion,
    dismissSuggestion,
  };
}
