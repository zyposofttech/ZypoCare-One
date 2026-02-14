"use client";
import * as React from "react";
import { cn } from "@/lib/cn";
import { useCopilot } from "@/lib/copilot/CopilotProvider";
import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";

export function ComplianceWhatsNextTab() {
  const { complianceWhatsNext: whatsNext, complianceWhatsNextLoading: whatsNextLoading } = useCopilot();
  const router = useRouter();

  if (whatsNextLoading && !whatsNext) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
        <p className="mt-3 text-xs text-zinc-500">Computing your progress...</p>
      </div>
    );
  }

  if (!whatsNext || whatsNext.steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ListChecks className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-500">Loading compliance workflow...</p>
      </div>
    );
  }

  const doneCount = whatsNext.steps.filter((s) => s.status === "done").length;
  const totalSteps = whatsNext.steps.length;

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
          Setup Progress
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${whatsNext.overallProgress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
            {whatsNext.overallProgress}%
          </span>
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">
          {doneCount} of {totalSteps} steps completed
        </p>
      </div>

      <div className="space-y-1">
        {whatsNext.steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => router.push(step.href as any)}
            disabled={step.status === "blocked"}
            className={cn(
              "w-full text-left rounded-lg p-3 transition-colors",
              step.status === "current" &&
                "bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30",
              step.status === "blocked" &&
                "bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 cursor-not-allowed",
              step.status !== "current" && step.status !== "blocked" &&
                "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.status === "done" &&
                    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
                  step.status === "current" &&
                    "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 ring-2 ring-indigo-500/30",
                  step.status === "upcoming" &&
                    "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
                  step.status === "blocked" &&
                    "bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400",
                )}
              >
                {step.status === "done" ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : step.status === "blocked" ? (
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                ) : (
                  step.order
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-xs font-medium",
                  step.status === "done" && "text-zinc-500 dark:text-zinc-400 line-through",
                  step.status === "current" && "text-indigo-700 dark:text-indigo-400",
                  step.status === "upcoming" && "text-zinc-600 dark:text-zinc-400",
                  step.status === "blocked" && "text-red-600 dark:text-red-400",
                )}>
                  {step.label}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-500">
                  {step.description}
                </p>
                {step.blockedReason && (
                  <p className="mt-1 text-[10px] text-red-500 dark:text-red-400 font-medium">
                    {step.blockedReason}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
