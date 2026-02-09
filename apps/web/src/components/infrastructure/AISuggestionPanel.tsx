"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, ChevronUp, Loader2, Sparkles, X, Lightbulb, Zap } from "lucide-react";
import type { AutoFillResult, AutoFillSuggestion } from "@/lib/infrastructure/ai/useAutoFill";

// ─── Field label mapping ────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  state: "State",
  timezone: "Timezone",
  gstStateCode: "GST State Code",
  defaultCurrency: "Currency",
  fiscalYearStartMonth: "Fiscal Year Start",
  workingHours: "Working Hours",
  emergency24x7: "24×7 Emergency",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-zinc-500",
};

function confidenceLevel(c: number): "high" | "medium" | "low" {
  if (c >= 0.8) return "high";
  if (c >= 0.5) return "medium";
  return "low";
}

function confidenceLabel(c: number): string {
  if (c >= 0.9) return "Very likely";
  if (c >= 0.7) return "Likely";
  if (c >= 0.5) return "Possible";
  return "Suggestion";
}

// ─── Props ──────────────────────────────────────────────────────────────

interface AISuggestionPanelProps {
  result: AutoFillResult | null;
  loading: boolean;
  appliedFields: Set<string>;
  dismissed: boolean;
  onApply: (field: string, value: any) => void;
  onDismiss: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────

export function AISuggestionPanel({
  result,
  loading,
  appliedFields,
  dismissed,
  onApply,
  onDismiss,
}: AISuggestionPanelProps) {
  const [expanded, setExpanded] = React.useState(true);

  // Nothing to show
  if (!loading && !result) return null;
  if (dismissed) return null;

  const suggestions = result?.suggestions?.filter((s) => !appliedFields.has(s.field)) ?? [];
  const allApplied = suggestions.length === 0 && !loading && result;

  if (allApplied) return null;

  return (
    <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/40 dark:border-indigo-800/50 dark:from-indigo-950/20 dark:via-zinc-900 dark:to-violet-950/15">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          AI Suggestions
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />}
          {!loading && result && (
            <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
              {suggestions.length} available
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-indigo-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-indigo-400" />
          )}
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
          onClick={onDismiss}
          title="Dismiss suggestions"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="border-t border-indigo-100/60 px-4 pb-4 pt-3 dark:border-indigo-900/30">
          {/* Summary */}
          {result?.summary && (
            <div className="mb-3 flex items-start gap-2 text-xs text-indigo-700/80 dark:text-indigo-300/70">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{result.summary}</span>
            </div>
          )}

          {/* Suggestion cards */}
          {loading && !result && (
            <div className="flex items-center gap-2 py-3 text-xs text-indigo-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing your input for smart suggestions…
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="grid gap-2">
              {suggestions.map((s) => (
                <SuggestionCard
                  key={s.field}
                  suggestion={s}
                  onApply={() => onApply(s.field, s.value)}
                />
              ))}
            </div>
          )}

          {/* Unit plan preview (read-only insight) */}
          {result && result.unitPlan.length > 0 && (
            <div className="mt-3 rounded-xl border border-indigo-100/60 bg-white/60 p-3 dark:border-indigo-900/30 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Zap className="h-3.5 w-3.5" />
                Suggested Unit Plan
              </div>
              <div className="mt-2 grid gap-1.5">
                {result.unitPlan.slice(0, 5).map((u) => (
                  <div
                    key={u.typeCode}
                    className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <span>{u.typeName}</span>
                    <span className="font-mono font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                      {u.bedCount > 0 ? `${u.bedCount} beds` : `${u.roomTypes.reduce((s, r) => s + r.count, 0)} rooms`}
                    </span>
                  </div>
                ))}
                {result.unitPlan.length > 5 && (
                  <div className="text-[11px] text-indigo-500">
                    +{result.unitPlan.length - 5} more unit types
                  </div>
                )}
              </div>
              <p className="mt-2 text-[10px] text-zinc-400">
                This is a preview. Use the Setup Copilot for full config generation.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Individual Suggestion Card ─────────────────────────────────────────

function SuggestionCard({
  suggestion,
  onApply,
}: {
  suggestion: AutoFillSuggestion;
  onApply: () => void;
}) {
  const level = confidenceLevel(suggestion.confidence);
  const label = FIELD_LABELS[suggestion.field] ?? suggestion.field;

  const displayValue =
    typeof suggestion.value === "boolean"
      ? suggestion.value
        ? "Yes"
        : "No"
      : typeof suggestion.value === "object"
        ? JSON.stringify(suggestion.value).slice(0, 60) + "…"
        : String(suggestion.value);

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-indigo-100/60 bg-white/70 px-3 py-2.5 transition-colors hover:border-indigo-200/80 dark:border-indigo-900/30 dark:bg-zinc-900/40 dark:hover:border-indigo-800/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{label}</span>
          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800">
            {suggestion.source.replace(/_/g, " ")}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {displayValue}
          </span>
          <span className={cn("text-[10px]", CONFIDENCE_COLORS[level])}>
            {confidenceLabel(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
          </span>
        </div>

        <p className="mt-1 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
          {suggestion.reasoning}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-0.5 h-7 shrink-0 gap-1 border-indigo-200/60 text-xs text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800/50 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
        onClick={onApply}
      >
        <Check className="h-3 w-3" />
        Apply
      </Button>
    </div>
  );
}
