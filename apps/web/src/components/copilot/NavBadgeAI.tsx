"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Map sidebar nav href → health issue area.
 * Must match the _issue_area() mapping in ai-copilot/src/app.py.
 */
const HREF_TO_AREA: Record<string, string> = {
  "/branches": "branches",
  "/infrastructure/locations": "locations",
  "/infrastructure/departments": "departments",
  "/infrastructure/unit-types": "unit-types",
  "/infrastructure/units": "units",
  "/infrastructure/rooms": "rooms",
  "/infrastructure/resources": "resources",
  "/infrastructure": "infrastructure",
};

/**
 * Small AI-driven badge that shows issue count on sidebar nav items.
 * Reads health data from sessionStorage (broadcast by CopilotProvider).
 *
 * Usage: <NavBadgeAI href="/branches" /> next to a sidebar link.
 */
export function NavBadgeAI({ href }: { href: string }) {
  const [count, setCount] = React.useState(0);
  const [severity, setSeverity] = React.useState<"blocker" | "warning" | null>(null);

  const area = HREF_TO_AREA[href];

  React.useEffect(() => {
    if (!area) return;

    function readHealth() {
      try {
        const raw = sessionStorage.getItem("zc.copilot.health");
        if (!raw) return;
        const health = JSON.parse(raw);
        if (!health?.topIssues) return;

        const issues = health.topIssues.filter(
          (i: { area: string }) => i.area === area
        );
        const blockers = issues.filter(
          (i: { severity: string }) => i.severity === "BLOCKER"
        );
        const total = issues.length;

        setCount(total);
        setSeverity(blockers.length > 0 ? "blocker" : total > 0 ? "warning" : null);
      } catch {
        // ignore
      }
    }

    readHealth();

    const handler = () => readHealth();
    window.addEventListener("zc:health-update", handler);
    return () => window.removeEventListener("zc:health-update", handler);
  }, [area]);

  if (!area || !count || !severity) return null;

  return (
    <span
      className={cn(
        "ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white",
        severity === "blocker" ? "bg-red-500" : "bg-amber-500"
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
