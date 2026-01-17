"use client";

import * as React from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { ZcLoadingStartDetail, ZcLoadingEndDetail } from "@/lib/loading-events";

type LoadingMode = "floating" | "fullscreen";

type LoadingState = {
  visible: boolean;
  mode: LoadingMode;
  label: string;
  sublabel: string;
};

const DEFAULTS = {
  api: { label: "Loading…", sublabel: "Fetching data and preparing the screen." },
  route: { label: "Opening page…", sublabel: "Preparing your dashboard and loading the latest data." },
  action: { label: "Working…", sublabel: "Please wait while we complete the operation." },
};

export function GlobalLoader() {
  const active = React.useRef<Map<string, ZcLoadingStartDetail>>(new Map());
  const showTimer = React.useRef<number | null>(null);
  const hideTimer = React.useRef<number | null>(null);
  const shownAt = React.useRef<number>(0);

  const [state, setState] = React.useState<LoadingState>({
    visible: false,
    mode: "floating",
    label: DEFAULTS.api.label,
    sublabel: DEFAULTS.api.sublabel,
  });

  function clearTimer(ref: React.MutableRefObject<number | null>) {
    if (ref.current !== null) {
      window.clearTimeout(ref.current);
      ref.current = null;
    }
  }

  function computePresentation(map: Map<string, ZcLoadingStartDetail>) {
    const hasRoute = Array.from(map.values()).some((d) => d.kind === "route");
    const mode: LoadingMode = hasRoute ? "fullscreen" : "floating";

    // Prefer route labels if any route loader exists
    const preferred =
      Array.from(map.values()).find((d) => d.kind === "route") ??
      Array.from(map.values()).find((d) => d.kind === "action") ??
      Array.from(map.values()).find((d) => d.kind === "api");

    const kind = preferred?.kind ?? "api";
    const base = DEFAULTS[kind] ?? DEFAULTS.api;

    const label =
      preferred?.label ??
      (preferred?.method && preferred.method !== "GET" ? "Saving changes…" : base.label);

    const sublabel = base.sublabel;

    // Faster appearance for navigation; slower for API to avoid flicker
    const showDelayMs = hasRoute ? 80 : 250;

    return { mode, label, sublabel, showDelayMs };
  }

  function scheduleShow(showDelayMs: number, label: string, sublabel: string, mode: LoadingMode) {
    clearTimer(hideTimer);

    // If already visible, just update content/mode
    if (state.visible) {
      setState((s) => ({ ...s, mode, label, sublabel }));
      return;
    }

    if (showTimer.current !== null) return;

    showTimer.current = window.setTimeout(() => {
      showTimer.current = null;
      if (active.current.size === 0) return;

      shownAt.current = Date.now();
      setState((s) => ({ ...s, visible: true, mode, label, sublabel }));
    }, showDelayMs);
  }

  function scheduleHide() {
    clearTimer(showTimer);

    // If not visible yet, just ensure hidden
    if (!state.visible) {
      setState((s) => ({ ...s, visible: false }));
      return;
    }

    const MIN_VISIBLE_MS = 450;
    const elapsed = Date.now() - shownAt.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    clearTimer(hideTimer);
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null;
      setState((s) => ({ ...s, visible: false }));
    }, remaining);
  }

  React.useEffect(() => {
    function onStart(e: Event) {
      const ce = e as CustomEvent<ZcLoadingStartDetail>;
      const detail = ce.detail;
      if (!detail?.id) return;

      active.current.set(detail.id, detail);

      const p = computePresentation(active.current);
      scheduleShow(p.showDelayMs, p.label, p.sublabel, p.mode);
    }

    function onEnd(e: Event) {
      const ce = e as CustomEvent<ZcLoadingEndDetail>;
      const id = ce.detail?.id;
      if (!id) return;

      active.current.delete(id);

      if (active.current.size === 0) {
        scheduleHide();
        return;
      }

      // Still active loads: update presentation (e.g., route ended but API still running)
      const p = computePresentation(active.current);
      setState((s) => ({ ...s, mode: p.mode, label: p.label, sublabel: p.sublabel, visible: true }));
    }

    window.addEventListener("zc:loading:start", onStart);
    window.addEventListener("zc:loading:end", onEnd);

    return () => {
      window.removeEventListener("zc:loading:start", onStart);
      window.removeEventListener("zc:loading:end", onEnd);
      clearTimer(showTimer);
      clearTimer(hideTimer);
      active.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.visible]);

  if (!state.visible) return null;

  const interactive = state.mode === "fullscreen"; // block clicks only during navigation
  return (
    <LoadingScreen
      mode={state.mode}
      label={state.label}
      sublabel={state.sublabel}
      interactive={interactive}
    />
  );
}
