"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { useCopilot } from "@/lib/copilot/CopilotProvider";
import { useRouter } from "next/navigation";

type GuideStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  status: "done" | "current" | "upcoming";
};

function getSetupSteps(health: NonNullable<ReturnType<typeof useCopilot>["health"]>): GuideStep[] {
  const scores = {
    branch: health.consistencyScore >= 50,
    nabh: health.nabhScore >= 30,
    goLive: health.canGoLive,
  };

  // Determine status based on real health data
  const steps: GuideStep[] = [
    {
      id: "branch",
      label: "Configure Branch",
      description: "Set up hospital name, address, GSTIN, PAN, and basic settings.",
      href: "/branches",
      status: scores.branch ? "done" : "current",
    },
    {
      id: "location",
      label: "Build Location Hierarchy",
      description: "Create Campus, Buildings, Floors with fire zones and emergency exits.",
      href: "/infrastructure/locations",
      status: scores.branch ? (health.nabhScore >= 20 ? "done" : "current") : "upcoming",
    },
    {
      id: "departments",
      label: "Set Up Departments",
      description: "Create departments and assign department heads.",
      href: "/infrastructure/departments",
      status: scores.nabh ? "done" : (scores.branch ? "current" : "upcoming"),
    },
    {
      id: "units",
      label: "Configure Units",
      description: "Add ward, ICU, OPD, ER, OT units linked to departments and locations.",
      href: "/infrastructure/units",
      status: scores.nabh ? "done" : "upcoming",
    },
    {
      id: "rooms",
      label: "Add Rooms & Amenities",
      description: "Create rooms with oxygen, suction, monitors per NABH requirements.",
      href: "/infrastructure/rooms",
      status: scores.nabh ? (health.goLiveScore >= 50 ? "done" : "current") : "upcoming",
    },
    {
      id: "resources",
      label: "Register Resources",
      description: "Add beds, equipment, and consultation slots to rooms.",
      href: "/infrastructure/resources",
      status: health.goLiveScore >= 60 ? "done" : "upcoming",
    },
    {
      id: "golive",
      label: "Go-Live Validation",
      description: "Run final checks and resolve any blockers before going live.",
      href: "/infrastructure/golive",
      status: scores.goLive ? "done" : "upcoming",
    },
  ];

  return steps;
}

export function GuideTab() {
  const { health, pageContext } = useCopilot();
  const router = useRouter();

  if (!health) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-sm text-zinc-500">Select a branch to see setup guide.</p>
      </div>
    );
  }

  const steps = getSetupSteps(health);
  const currentStep = steps.find((s) => s.status === "current");

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-4">
      {/* Progress header */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
          Setup Progress
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{
                width: `${(steps.filter((s) => s.status === "done").length / steps.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {steps.filter((s) => s.status === "done").length}/{steps.length}
          </span>
        </div>
      </div>

      {/* Current page context */}
      {pageContext && (
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 p-3">
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
            Current: {pageContext.module} / {pageContext.action}
          </p>
          {pageContext.module === "room" && pageContext.action === "create" && (
            <p className="mt-1 text-[11px] text-indigo-600/80 dark:text-indigo-300/80">
              Tip: ICU rooms require oxygen, suction, and monitoring per NABH standards.
            </p>
          )}
        </div>
      )}

      {/* Steps */}
      <div className="space-y-1">
        {steps.map((step, idx) => (
          <button
            key={step.id}
            type="button"
            onClick={() => router.push(step.href as any)}
            className={cn(
              "w-full text-left rounded-lg p-3 transition-colors",
              step.status === "current"
                ? "bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30"
                : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Step indicator */}
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.status === "done" &&
                    "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
                  step.status === "current" &&
                    "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
                  step.status === "upcoming" &&
                    "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                )}
              >
                {step.status === "done" ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-xs font-medium",
                    step.status === "done" && "text-zinc-500 dark:text-zinc-400 line-through",
                    step.status === "current" && "text-indigo-700 dark:text-indigo-400",
                    step.status === "upcoming" && "text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-500">
                  {step.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
