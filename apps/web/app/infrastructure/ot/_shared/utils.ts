import type { OtSuiteStatus } from "./types";

/* =========================================================
   OT Setup Module — Shared Utilities
   ========================================================= */

/** Status badge color classes keyed by suite status */
export function statusBadge(status: OtSuiteStatus | string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "DRAFT":
      return "border-zinc-200 bg-zinc-50/70 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-300";
    case "IN_REVIEW":
      return "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";
    case "VALIDATED":
      return "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200";
    case "UNDER_MAINTENANCE":
      return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "DECOMMISSIONED":
      return "border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-text";
  }
}

/** Readiness badge (score-based) */
export function readinessBadge(score: number | null | undefined) {
  const s = score ?? 0;
  if (s >= 90) return { label: `${s}%`, cls: "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200" };
  if (s >= 60) return { label: `${s}%`, cls: "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200" };
  return { label: `${s}%`, cls: "border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200" };
}

/** Space type badge colour */
export function spaceTypeBadge(type: string) {
  switch (type) {
    case "THEATRE":
      return "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200";
    case "RECOVERY_BAY":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "PREOP_HOLDING":
      return "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200";
    case "INDUCTION_ROOM":
      return "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200";
    case "SCRUB_ROOM":
      return "border-cyan-200/70 bg-cyan-50/70 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-200";
    case "STERILE_STORE":
    case "ANESTHESIA_STORE":
      return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "STAFF_CHANGE":
      return "border-zinc-200 bg-zinc-50/70 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-300";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-text";
  }
}

/** Format minutes to "Xh Ym" */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "\u2014";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Safely parse JSON, returning fallback if invalid */
export function parseJsonSafe<T = any>(value: any, fallback: T): T {
  if (typeof value !== "string") return value ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** humanize enum value: SOME_VALUE → Some Value */
export function humanize(str: string): string {
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Safe array helper */
export function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : [];
}
