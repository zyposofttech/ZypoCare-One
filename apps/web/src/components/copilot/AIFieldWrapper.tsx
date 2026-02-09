"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { FieldWarning, FieldValidationResult } from "@/lib/copilot/types";

type AIFieldWrapperProps = {
  children: React.ReactNode;
  warnings: FieldWarning[];
  suggestion?: FieldValidationResult["suggestion"] | null;
  onApply?: () => void;
  onDismiss?: () => void;
  validating?: boolean;
  className?: string;
};

/**
 * Wraps a form field to show inline AI warnings and smart suggestions.
 *
 * Usage:
 *   <AIFieldWrapper warnings={warnings} suggestion={suggestion} onApply={apply}>
 *     <Input value={code} onChange={...} />
 *   </AIFieldWrapper>
 */
export function AIFieldWrapper({
  children,
  warnings,
  suggestion,
  onApply,
  onDismiss,
  validating,
  className,
}: AIFieldWrapperProps) {
  const [expanded, setExpanded] = React.useState(false);
  const hasIssues = warnings.length > 0;
  const hasSuggestion = !!suggestion;
  const showIndicator = hasIssues || hasSuggestion;

  const highestLevel = warnings.reduce<"critical" | "warning" | "info">(
    (acc, w) => {
      if (w.level === "critical") return "critical";
      if (w.level === "warning" && acc !== "critical") return "warning";
      return acc;
    },
    "info"
  );

  if (!showIndicator && !validating) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      {children}

      {/* Indicator badges */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {validating && (
          <span className="flex h-5 w-5 items-center justify-center">
            <span className="h-3 w-3 animate-spin rounded-full border border-zinc-300 border-t-indigo-500" />
          </span>
        )}

        {hasIssues && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex h-5 items-center gap-1 rounded-full px-1.5 text-[10px] font-semibold transition-colors",
              highestLevel === "critical" &&
                "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400",
              highestLevel === "warning" &&
                "bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400",
              highestLevel === "info" &&
                "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400"
            )}
            title="AI warnings"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 9v4m0 4h.01M10.29 3.86l-8.46 14.5a1 1 0 0 0 .87 1.5h16.86a1 1 0 0 0 .87-1.5l-8.46-14.5a1 1 0 0 0-1.74 0z" />
            </svg>
            {warnings.length}
          </button>
        )}

        {hasSuggestion && !hasIssues && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-5 items-center gap-1 rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400"
            title="AI suggestion available"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded popover */}
      {expanded && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Warnings */}
          {warnings.map((w, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 rounded-md p-2 text-xs",
                w.level === "critical" && "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
                w.level === "warning" && "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
                w.level === "info" && "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
              )}
            >
              <span className="mt-0.5 shrink-0 font-bold uppercase text-[9px]">{w.level}</span>
              <p>{w.message}</p>
            </div>
          ))}

          {/* Suggestion */}
          {suggestion && (
            <div className="rounded-md bg-indigo-50 dark:bg-indigo-500/10 p-2">
              <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                Smart Suggestion
              </p>
              <p className="mt-1 text-[11px] text-indigo-600/80 dark:text-indigo-300/80">
                {suggestion.reasoning}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {onApply && (
                  <button
                    type="button"
                    onClick={() => {
                      onApply();
                      setExpanded(false);
                    }}
                    className="rounded bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-indigo-700"
                  >
                    Apply
                  </button>
                )}
                {onDismiss && (
                  <button
                    type="button"
                    onClick={() => {
                      onDismiss();
                      setExpanded(false);
                    }}
                    className="rounded px-2.5 py-1 text-[10px] font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-full text-center text-[10px] text-zinc-400 hover:text-zinc-600 pt-1"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
