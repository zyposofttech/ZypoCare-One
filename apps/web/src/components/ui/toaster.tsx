"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastPrimitives.Provider swipeDirection="right">
      {toasts.map((t) => {
        const variant = t.variant ?? "default";

        const tone =
          variant === "destructive"
            ? "border-[rgb(var(--zc-danger-rgb)/0.40)] bg-[rgb(var(--zc-danger-rgb)/0.12)]"
            : variant === "success"
              ? "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/25"
              : variant === "warning"
                ? "border-amber-200/70 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/25"
                : variant === "info"
                  ? "border-sky-200/70 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-950/25"
                  : "border-zc-border bg-zc-card";

        const descTone =
          variant === "destructive"
            ? "text-[rgb(var(--zc-danger))]"
            : variant === "success"
              ? "text-emerald-800 dark:text-emerald-200"
              : variant === "warning"
                ? "text-amber-900 dark:text-amber-200"
                : variant === "info"
                  ? "text-sky-800 dark:text-sky-200"
                  : "text-zc-muted";

        return (
          <ToastPrimitives.Root
            key={t.id}
            open={t.open}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
            duration={t.duration ?? 3500}
            className={cn(
              "group pointer-events-auto relative grid w-full max-w-[420px] gap-1 rounded-2xl border p-4 shadow-elev-2",
              tone
            )}
          >
            <ToastPrimitives.Close
              className={cn(
                "absolute right-3 top-3 rounded-lg p-1 text-zc-muted",
                "hover:bg-[rgb(var(--zc-hover-rgb)/0.08)] hover:text-zc-text",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-zc-ring"
              )}
            >
              <X className="h-4 w-4" />
            </ToastPrimitives.Close>

            {t.title ? (
              <ToastPrimitives.Title className="text-sm font-semibold text-zc-text">
                {t.title}
              </ToastPrimitives.Title>
            ) : null}

            {t.description ? (
              <ToastPrimitives.Description className={cn("text-sm", descTone)}>
                {t.description}
              </ToastPrimitives.Description>
            ) : null}
          </ToastPrimitives.Root>
        );
      })}

      {/* TOP-RIGHT viewport (matches your screenshot) */}
      <ToastPrimitives.Viewport
        className={cn(
          "fixed right-4 top-4 z-[100] flex max-h-screen w-full flex-col gap-2 p-4",
          "sm:max-w-[460px]"
        )}
      />
    </ToastPrimitives.Provider>
  );
}
