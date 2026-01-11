"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ModalShell({
  title,
  description,
  children,
  onClose,
  size = "lg",
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "md" | "lg" | "xl";
  footer?: React.ReactNode;
}) {
  const maxW =
    size === "md"
      ? "max-w-xl"
      : size === "xl"
        ? "max-w-5xl"
        : "max-w-3xl";

  // ESC close
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "w-full rounded-2xl border border-xc-border bg-xc-card shadow-elev-2",
          maxW,
          // This is the key fix: prevent off-screen modal & enable internal scrolling
          "max-h-[90vh] overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-xc-border px-5 py-4">
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-semibold tracking-tight text-xc-text">
              {title}
            </div>
            {description ? (
              <div className="mt-1 text-sm text-xc-muted">{description}</div>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body (scrolls) */}
        <div className="px-5 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {children}
        </div>

        {/* Footer (sticky-ish) */}
        {footer ? (
          <div className="border-t border-xc-border px-5 py-4 bg-xc-card">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
