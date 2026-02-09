"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Sparkles, X, ChevronDown, ChevronUp } from "lucide-react";
import type { PageInsight } from "@/lib/copilot/types";

type PageInsightBannerProps = {
  insights: PageInsight[];
  loading: boolean;
  onDismiss: (id: string) => void;
  className?: string;
};

const MAX_VISIBLE = 2;

const LEVEL_STYLES = {
  critical: {
    border: "border-red-200 dark:border-red-900/50",
    bg: "bg-red-50/50 dark:bg-red-900/10",
    icon: "text-red-500 dark:text-red-400",
    text: "text-red-800 dark:text-red-300",
    hint: "text-red-600/70 dark:text-red-400/70",
    dot: "bg-red-500",
  },
  warning: {
    border: "border-amber-200 dark:border-amber-900/50",
    bg: "bg-amber-50/50 dark:bg-amber-900/10",
    icon: "text-amber-500 dark:text-amber-400",
    text: "text-amber-800 dark:text-amber-300",
    hint: "text-amber-600/70 dark:text-amber-400/70",
    dot: "bg-amber-500",
  },
  info: {
    border: "border-blue-200 dark:border-blue-900/50",
    bg: "bg-blue-50/50 dark:bg-blue-900/10",
    icon: "text-blue-500 dark:text-blue-400",
    text: "text-blue-800 dark:text-blue-300",
    hint: "text-blue-600/70 dark:text-blue-400/70",
    dot: "bg-blue-500",
  },
};

function InsightRow({
  insight,
  onDismiss,
}: {
  insight: PageInsight;
  onDismiss: () => void;
}) {
  const style = LEVEL_STYLES[insight.level] ?? LEVEL_STYLES.info;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3 py-2.5",
        "animate-in fade-in slide-in-from-top-1 duration-150",
        style.border,
        style.bg
      )}
    >
      <Sparkles className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", style.icon)} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-medium leading-relaxed", style.text)}>
          {insight.message}
        </p>
        {insight.actionHint && (
          <p className={cn("mt-0.5 text-[11px]", style.hint)}>
            {insight.actionHint}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-current opacity-50 hover:opacity-100 transition-opacity",
          style.text
        )}
        aria-label="Dismiss insight"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/**
 * Lightweight banner showing page-level AI insights.
 * Shows up to 2 insights initially, with "Show more" expander.
 */
export function PageInsightBanner({
  insights,
  loading,
  onDismiss,
  className,
}: PageInsightBannerProps) {
  const [expanded, setExpanded] = React.useState(false);

  if (insights.length === 0 && !loading) return null;

  const visible = expanded ? insights : insights.slice(0, MAX_VISIBLE);
  const hasMore = insights.length > MAX_VISIBLE;

  return (
    <div className={cn("space-y-2", className)}>
      {loading && insights.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-2.5">
          <span className="h-3 w-3 animate-spin rounded-full border border-zinc-300 border-t-indigo-500" />
          <span className="text-xs text-zinc-500">Analyzing page...</span>
        </div>
      )}

      {visible.map((insight) => (
        <InsightRow
          key={insight.id}
          insight={insight}
          onDismiss={() => onDismiss(insight.id)}
        />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show {insights.length - MAX_VISIBLE} more{" "}
              {insights.length - MAX_VISIBLE === 1 ? "insight" : "insights"}
            </>
          )}
        </button>
      )}
    </div>
  );
}
