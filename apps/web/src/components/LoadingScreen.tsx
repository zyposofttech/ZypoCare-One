// apps/web/src/components/LoadingScreen.tsx

import * as React from "react";
import { IconZypoCare } from "@/components/icons";
import { cn } from "@/lib/cn";

export type LoadingScreenMode = "fullscreen" | "floating";

export type LoadingScreenProps = {
  label?: string;
  sublabel?: string;
  mode?: LoadingScreenMode;
  /**
   * When true, the overlay captures pointer events (prevents accidental clicks).
   * Prefer true for route navigation; false for background API calls.
   */
  interactive?: boolean;
};

function TopProgress() {
  return (
    <div className="xc-progress-track" aria-hidden="true">
      <div className="xc-progress-indicator" />
    </div>
  );
}

export function LoadingScreen({
  label = "Loading…",
  sublabel = "Please wait while we prepare your workspace.",
  mode = "fullscreen",
  interactive = true,
}: LoadingScreenProps) {
  if (mode === "floating") {
    return (
      <>
        <TopProgress />
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[9998]",
            interactive ? "pointer-events-auto" : "pointer-events-none"
          )}
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              "w-[320px] max-w-[calc(100vw-3rem)]",
              "rounded-2xl border border-xc-border bg-xc-card/75 shadow-elev-2",
              "backdrop-blur supports-[backdrop-filter]:bg-opacity-60"
            )}
          >
            <div className="h-1 w-full rounded-t-2xl bg-[linear-gradient(90deg,rgb(var(--xc-accent)),rgb(var(--xc-accent2)),rgb(var(--xc-accent)))]" />
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="relative">
                <div className="xc-loader-ring" />
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <IconZypoCare className="h-5 w-5 text-xc-text/85" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-semibold text-xc-text">{label}</div>
                  <div className="flex items-center gap-1" aria-hidden="true">
                    <span className="xc-loader-dot" />
                    <span className="xc-loader-dot" />
                    <span className="xc-loader-dot" />
                  </div>
                </div>
                <div className="mt-1 max-h-10 overflow-hidden text-xs leading-5 text-xc-muted">
                  {sublabel}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="grid gap-2">
                <div className="h-2 w-full rounded-full bg-xc-border/35 xc-loader-shimmer" />
                <div className="h-2 w-[92%] rounded-full bg-xc-border/35 xc-loader-shimmer" />
                <div className="h-2 w-[78%] rounded-full bg-xc-border/35 xc-loader-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopProgress />
      <div
        className={cn(
          "fixed inset-0 z-[9997]",
          "bg-xc-bg/65 backdrop-blur",
          interactive ? "pointer-events-auto" : "pointer-events-none"
        )}
        role="status"
        aria-live="polite"
      >
        <div className="grid h-full place-items-center px-6">
          <div
            className={cn(
              "w-[520px] max-w-full",
              "rounded-3xl border border-xc-border bg-xc-card/70 shadow-elev-2",
              "backdrop-blur supports-[backdrop-filter]:bg-opacity-60"
            )}
          >
            <div className="h-1 w-full rounded-t-3xl bg-[linear-gradient(90deg,rgb(var(--xc-accent)),rgb(var(--xc-accent2)),rgb(var(--xc-accent)))]" />
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="relative mt-0.5">
                  <div className="xc-loader-ring" />
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <IconZypoCare className="h-6 w-6 text-xc-text/85" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="text-base font-semibold tracking-tight text-xc-text">{label}</div>
                    <div className="flex items-center gap-1" aria-hidden="true">
                      <span className="xc-loader-dot" />
                      <span className="xc-loader-dot" />
                      <span className="xc-loader-dot" />
                    </div>
                  </div>
                  <div className="mt-1 text-sm leading-6 text-xc-muted">{sublabel}</div>

                  <div className="mt-5 grid gap-3">
                    <div className="h-2 w-full rounded-full bg-xc-border/35 xc-loader-shimmer" />
                    <div className="h-2 w-[88%] rounded-full bg-xc-border/35 xc-loader-shimmer" />
                    <div className="h-2 w-[76%] rounded-full bg-xc-border/35 xc-loader-shimmer" />
                    <div className="h-2 w-[64%] rounded-full bg-xc-border/35 xc-loader-shimmer" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
