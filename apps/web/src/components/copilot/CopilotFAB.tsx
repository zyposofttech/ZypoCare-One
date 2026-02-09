"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { useCopilot } from "@/lib/copilot/CopilotProvider";

/**
 * Floating Action Button for the copilot.
 * Shows a badge when there are critical issues.
 */
export function CopilotFAB({ onClick }: { onClick: () => void }) {
  const { health } = useCopilot();
  const blockerCount = health?.totalBlockers ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      title="AI Copilot (Ctrl+Shift+A)"
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "flex h-14 w-14 items-center justify-center rounded-full",
        "bg-indigo-600 text-white shadow-lg",
        "hover:bg-indigo-700 hover:shadow-xl",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      )}
    >
      {/* Brain/Sparkle icon */}
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>

      {/* Badge */}
      {blockerCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {blockerCount > 9 ? "9+" : blockerCount}
        </span>
      )}
    </button>
  );
}
