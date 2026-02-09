"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { useCopilot } from "@/lib/copilot/CopilotProvider";
import { useRouter } from "next/navigation";
import type { HealthIssue } from "@/lib/copilot/types";

const AREA_ROUTES: Record<string, string> = {
  branches: "/branches",
  locations: "/infrastructure/locations",
  departments: "/infrastructure/departments",
  "unit-types": "/infrastructure/unit-types",
  units: "/infrastructure/units",
  rooms: "/infrastructure/rooms",
  resources: "/infrastructure/resources",
  infrastructure: "/infrastructure",
};

function ScoreGauge({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const color =
    pct >= 80
      ? "text-green-600 dark:text-green-400"
      : pct >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const barColor =
    pct >= 80
      ? "bg-green-500"
      : pct >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 w-24">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-xs font-semibold tabular-nums w-8 text-right", color)}>{pct}%</span>
    </div>
  );
}

function IssueRow({ issue }: { issue: HealthIssue }) {
  const router = useRouter();
  const route = AREA_ROUTES[issue.area] ?? "/infrastructure";

  return (
    <button
      type="button"
      onClick={() => router.push(route as any)}
      className="w-full text-left rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
            issue.severity === "BLOCKER"
              ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
              : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
          )}
        >
          {issue.severity === "BLOCKER" ? "!" : "~"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2">
            {issue.title}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {issue.fixHint}
          </p>
          <span className="mt-1 inline-block rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium uppercase text-zinc-500">
            {issue.category}
          </span>
        </div>
      </div>
    </button>
  );
}

export function AlertsTab() {
  const { health, healthLoading, refreshHealth } = useCopilot();

  if (healthLoading && !health) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
        <p className="mt-3 text-xs text-zinc-500">Analyzing infrastructure...</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-sm text-zinc-500">Select a branch to see health status.</p>
      </div>
    );
  }

  const blockers = health.topIssues.filter((i) => i.severity === "BLOCKER");
  const warnings = health.topIssues.filter((i) => i.severity === "WARNING");

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-4">
      {/* Scores */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
            Health Scores
          </h3>
          <button
            type="button"
            onClick={refreshHealth}
            disabled={healthLoading}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
          >
            {healthLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <ScoreGauge label="Consistency" score={health.consistencyScore} />
        <ScoreGauge label="NABH" score={health.nabhScore} />
        <ScoreGauge label="Go-Live" score={health.goLiveScore} />
        <ScoreGauge label="Naming" score={health.namingScore} />
      </div>

      {/* Go-live status */}
      <div
        className={cn(
          "rounded-lg border p-3 text-center",
          health.canGoLive
            ? "border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10"
            : "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
        )}
      >
        <p
          className={cn(
            "text-sm font-semibold",
            health.canGoLive
              ? "text-green-700 dark:text-green-400"
              : "text-red-700 dark:text-red-400"
          )}
        >
          {health.canGoLive ? "Ready to Go Live" : "Not Ready for Go-Live"}
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500">{health.summary}</p>
      </div>

      {/* Issues */}
      {blockers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
            Blockers ({blockers.length})
          </h3>
          {blockers.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            Warnings ({warnings.length})
          </h3>
          {warnings.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      )}

      {blockers.length === 0 && warnings.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            No issues found
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Your infrastructure configuration looks good.
          </p>
        </div>
      )}
    </div>
  );
}
