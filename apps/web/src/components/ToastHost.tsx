// apps/web/src/components/ToastHost.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { NotifyPayload, NotifyTone } from "@/lib/notify";

type ToastItem = NotifyPayload & {
  id: string;
};

function toneStyles(tone: NotifyTone) {
  switch (tone) {
    case "success":
      return "border-[rgb(var(--xc-ok)/0.35)] bg-[rgb(var(--xc-ok)/0.08)]";
    case "info":
      return "border-[rgb(var(--xc-accent)/0.35)] bg-[rgb(var(--xc-accent)/0.08)]";
    case "warning":
      return "border-[rgb(var(--xc-warn)/0.35)] bg-[rgb(var(--xc-warn)/0.08)]";
    case "danger":
      return "border-[rgb(var(--xc-danger)/0.35)] bg-[rgb(var(--xc-danger)/0.08)]";
    default:
      return "border-xc-border bg-xc-panel/20";
  }
}

function uid() {
  // Works on modern browsers; fallback for older ones.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  return c?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ToastHost() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    function onToast(e: Event) {
      const ce = e as CustomEvent<NotifyPayload>;
      const p = ce.detail;
      const toast: ToastItem = {
        id: uid(),
        title: p.title,
        description: p.description,
        tone: p.tone ?? "neutral",
        timeoutMs: p.timeoutMs ?? 3200,
      };

      setItems((prev) => [toast, ...prev].slice(0, 5));

      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== toast.id));
      }, toast.timeoutMs);
    }

    window.addEventListener("xc:toast", onToast);
    return () => window.removeEventListener("xc:toast", onToast);
  }, []);

  if (!items.length) return null;

  return (
    <div className="fixed right-4 top-4 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-2xl border px-4 py-3 shadow-elev-2",
            "backdrop-blur supports-[backdrop-filter]:bg-opacity-60",
            toneStyles(t.tone ?? "neutral")
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-xc-text">{t.title}</div>
              {t.description ? (
                <div className="mt-1 text-xs leading-5 text-xc-muted">{t.description}</div>
              ) : null}
            </div>
            <button
              className="rounded-md px-2 py-1 text-xs text-xc-muted hover:bg-xc-panel/30 hover:text-xc-text"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              aria-label="Dismiss"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
