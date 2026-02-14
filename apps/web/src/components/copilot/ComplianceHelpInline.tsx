"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { HelpCircle, Sparkles, ChevronRight, ExternalLink, AlertTriangle, ShieldAlert, Lightbulb, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCompliancePageHelp } from "@/lib/copilot/useComplianceAI";
import { useCopilot } from "@/lib/copilot/CopilotProvider";
import type { ComplianceHealthStatus } from "@/lib/copilot/CopilotProvider";

/* ═══════════════════════════════════════════════════════════════════════════
   CompliancePageHead — self-contained registration + AI Help button.

   Renders INSIDE <AppShell>/<CopilotProvider>. Registers the page with
   the copilot and renders the "✨ AI Help" button.

   Usage:  <CompliancePageHead pageId="compliance-evidence" />
   ═══════════════════════════════════════════════════════════════════════════ */

export function CompliancePageHead({ pageId, className }: { pageId: string; className?: string }) {
  const { openHelp } = useCompliancePageHelp(pageId);
  return <PageHelpButton onClick={openHelp} className={className} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CompliancePageInsights — shows page-specific AI issues (blockers/warnings)
   from the compliance health check. Filters topIssues by the page's area.

   Renders a compact banner below the page header with relevant issues.
   Auto-hides when there are no issues for this page.

   The `pageId` maps directly to the `area` field in health check issues:
   e.g. pageId="compliance-abdm" matches issues with area "compliance-abdm",
   "compliance-abdm-hfr", "compliance-abdm-hpr", "compliance-abdm-abha"
   ═══════════════════════════════════════════════════════════════════════════ */

export function CompliancePageInsights({ pageId }: { pageId: string }) {
  const ctx = useCopilot();
  const [dismissed, setDismissed] = React.useState(false);

  const health = ctx.complianceHealth;
  const loading = ctx.complianceHealthLoading;

  // Filter issues relevant to this page (exact match or child area match)
  const pageIssues = React.useMemo(() => {
    if (!health?.topIssues) return [];
    return health.topIssues.filter(
      (i) => i.area === pageId || i.area.startsWith(pageId + "-"),
    );
  }, [health?.topIssues, pageId]);

  const blockers = pageIssues.filter((i) => i.severity === "BLOCKER");
  const warnings = pageIssues.filter((i) => i.severity === "WARNING");

  // Also get the area score if available
  const areaKey = pageId.replace("compliance-", "").split("-")[0]; // e.g. "abdm", "schemes", "nabh"
  const areaScore = health?.areas?.[areaKey];

  // Don't render if no issues, dismissed, or still loading with no cached data
  if (dismissed || (pageIssues.length === 0 && !loading)) return null;
  if (pageIssues.length === 0 && loading) return null;

  return (
    <div className="col-span-full w-full mt-1">
      <div
        className={cn(
          "rounded-xl border p-3",
          blockers.length > 0
            ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10"
            : "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/10",
        )}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
                blockers.length > 0
                  ? "bg-red-100 dark:bg-red-500/20"
                  : "bg-amber-100 dark:bg-amber-500/20",
              )}
            >
              {blockers.length > 0 ? (
                <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <span
              className={cn(
                "text-xs font-semibold",
                blockers.length > 0
                  ? "text-red-700 dark:text-red-300"
                  : "text-amber-700 dark:text-amber-300",
              )}
            >
              AI Health: {pageIssues.length} issue{pageIssues.length !== 1 ? "s" : ""} found
              {blockers.length > 0 && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-red-100 dark:bg-red-500/30 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300">
                  {blockers.length} BLOCKER{blockers.length !== 1 ? "S" : ""}
                </span>
              )}
              {warnings.length > 0 && (
                <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {warnings.length} WARNING{warnings.length !== 1 ? "S" : ""}
                </span>
              )}
            </span>
            {areaScore && (
              <span className="ml-2 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                {areaScore.label} Score: {areaScore.score}%
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Issue list */}
        <div className="space-y-1.5">
          {pageIssues.map((issue) => (
            <div
              key={issue.id}
              className={cn(
                "flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs",
                issue.severity === "BLOCKER"
                  ? "bg-red-100/60 dark:bg-red-900/20"
                  : "bg-amber-100/60 dark:bg-amber-900/20",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded text-[9px] font-bold",
                  issue.severity === "BLOCKER"
                    ? "bg-red-200 text-red-800 dark:bg-red-500/30 dark:text-red-200"
                    : "bg-amber-200 text-amber-800 dark:bg-amber-500/30 dark:text-amber-200",
                )}
              >
                {issue.severity === "BLOCKER" ? "!" : "?"}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-medium leading-snug",
                    issue.severity === "BLOCKER"
                      ? "text-red-800 dark:text-red-200"
                      : "text-amber-800 dark:text-amber-200",
                  )}
                >
                  {issue.title}
                </p>
                {issue.fixHint && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <Lightbulb className="h-3 w-3 shrink-0 text-indigo-500" />
                    {issue.fixHint}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SmartTooltip — hover tooltip that explains compliance terms inline
   ═══════════════════════════════════════════════════════════════════════════ */

type SmartTooltipProps = {
  term: string;
  explanation: string;
  children: React.ReactNode;
  className?: string;
};

export function SmartTooltip({ term, explanation, children, className }: SmartTooltipProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <span
      className={cn("relative inline-flex items-center group", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      <HelpCircle className="ml-1 h-3 w-3 text-zinc-400 dark:text-zinc-500 cursor-help opacity-60 group-hover:opacity-100 transition-opacity" />

      {open && (
        <div
          className={cn(
            "absolute bottom-full left-0 z-50 mb-2 w-64",
            "rounded-xl border border-zinc-200 dark:border-zinc-800",
            "bg-white dark:bg-zinc-900 shadow-lg",
            "p-3 animate-in fade-in slide-in-from-bottom-1 duration-100",
          )}
        >
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{term}</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{explanation}</p>
        </div>
      )}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PageHelpButton — small "?" button on page headers that opens AI help
   ═══════════════════════════════════════════════════════════════════════════ */

type PageHelpButtonProps = {
  onClick: () => void;
  className?: string;
};

export function PageHelpButton({ onClick, className }: PageHelpButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/30",
        "bg-indigo-50/50 dark:bg-indigo-500/10",
        "px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400",
        "hover:bg-indigo-100 dark:hover:bg-indigo-500/20",
        "transition-colors",
        className,
      )}
      title="Open AI Help (Ctrl+Shift+H)"
    >
      <Sparkles className="h-3.5 w-3.5" />
      AI Help
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   QuickStartBanner — shown on compliance pages for first-time users
   ═══════════════════════════════════════════════════════════════════════════ */

type QuickStartBannerProps = {
  title: string;
  description: string;
  steps?: string[];
  onDismiss?: () => void;
  onOpenHelp?: () => void;
  className?: string;
};

export function QuickStartBanner({
  title,
  description,
  steps,
  onDismiss,
  onOpenHelp,
  className,
}: QuickStartBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-indigo-200 dark:border-indigo-900/50",
        "bg-gradient-to-r from-indigo-50/80 to-violet-50/80 dark:from-indigo-900/10 dark:to-violet-900/10",
        "p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">{title}</h3>
            <p className="mt-0.5 text-xs text-indigo-700/80 dark:text-indigo-300/80">{description}</p>

            {steps && steps.length > 0 && (
              <ol className="mt-2 space-y-1">
                {steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-indigo-700 dark:text-indigo-300">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-500/30 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                      {idx + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-3 flex items-center gap-2">
              {onOpenHelp && (
                <button
                  type="button"
                  onClick={onOpenHelp}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  Open AI Help
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDismissed(true);
                  onDismiss?.();
                }}
                className="text-xs text-indigo-600/70 dark:text-indigo-400/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NextStepCard — shows the next recommended action
   ═══════════════════════════════════════════════════════════════════════════ */

type NextStepCardProps = {
  label: string;
  description: string;
  href: string;
  progress?: number; // 0-100
  className?: string;
};

export function NextStepCard({ label, description, href, progress, className }: NextStepCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(href as any)}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-indigo-200 dark:border-indigo-900/50",
        "bg-indigo-50/50 dark:bg-indigo-900/10",
        "px-4 py-3 text-left w-full",
        "hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20",
        "transition-colors group",
        className,
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
        <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">Next Step</p>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{description}</p>
        {typeof progress === "number" && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-zinc-500">{progress}%</span>
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
