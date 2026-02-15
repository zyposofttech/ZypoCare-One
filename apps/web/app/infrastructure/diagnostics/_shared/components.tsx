"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { AlertTriangle, RefreshCw, Settings2 } from "lucide-react";
import { IconSearch, IconPlus } from "@/components/icons";

import type { DiagnosticKind, ResultDataType, ServicePointType } from "./types";

/* =========================================================
   Small UI helpers shared across diagnostics pages
   ========================================================= */

/**
 * Guard component shown when branchId is not selected.
 * The AppShell header always has a branch selector; this message
 * tells the user to pick one before the page can load data.
 */
export function NoBranchGuard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/70 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-900/20">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="text-base font-semibold text-zc-text">No Branch Selected</div>
        <div className="max-w-sm text-sm text-zc-muted">
          Please select a branch from the header to view and manage diagnostics configuration.
        </div>
      </CardContent>
    </Card>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-end justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
          {label}
          {required ? <span className="ml-1 text-rose-600">*</span> : null}
        </div>
        {hint ? <div className="text-xs text-zc-muted">{hint}</div> : null}
      </div>
      {children}
      {error ? <div className="text-xs text-rose-700 dark:text-rose-200">{error}</div> : null}
    </div>
  );
}

export type BadgeTone = "slate" | "sky" | "emerald" | "violet" | "amber" | "rose";

export function badgeToneClass(tone: BadgeTone) {
  switch (tone) {
    case "sky":
      return "border-sky-200/70 bg-sky-50/80 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200";
    case "emerald":
      return "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200";
    case "violet":
      return "border-violet-200/70 bg-violet-50/80 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-200";
    case "amber":
      return "border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200";
    case "rose":
      return "border-rose-200/70 bg-rose-50/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-text";
  }
}

export function ToneBadge({
  tone,
  className,
  children,
}: {
  tone: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge variant="outline" className={cn("border", badgeToneClass(tone), className)}>
      {children}
    </Badge>
  );
}

export function toneForDiagnosticKind(kind: DiagnosticKind): BadgeTone {
  if (kind === "LAB") return "emerald";
  if (kind === "IMAGING") return "sky";
  return "violet";
}

export function toneForResultDataType(dt: ResultDataType): BadgeTone {
  if (dt === "NUMERIC") return "sky";
  if (dt === "CHOICE") return "violet";
  if (dt === "BOOLEAN") return "amber";
  return "slate";
}

export function toneForServicePointType(t: ServicePointType): BadgeTone {
  if (t === "LAB") return "emerald";
  if (t === "RADIOLOGY") return "sky";
  if (t === "ENDOSCOPY") return "amber";
  return "violet";
}

export function modalClassName(extra?: string) {
  return cn("rounded-2xl border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card shadow-2xl shadow-indigo-500/10", extra);
}

export function drawerClassName(extra?: string) {
  return cn(
    "h-screen w-[95vw] max-w-[980px]",
    "!left-auto !right-0 !top-0 !bottom-0 !translate-x-0 !translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

export function ModalHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  void onClose;
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <Settings2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>

      <Separator className="my-4" />
    </>
  );
}

/* =========================================================
   Shared layout components matching branches page design
   ========================================================= */

/** Page header with icon, title, description, and action buttons */
export function PageHeader({
  icon,
  title,
  description,
  loading,
  onRefresh,
  canCreate,
  createLabel,
  onCreate,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  loading?: boolean;
  onRefresh?: () => void;
  canCreate?: boolean;
  createLabel?: string;
  onCreate?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-3xl font-semibold tracking-tight">{title}</div>
          <div className="mt-1 text-sm text-zc-muted">{description}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onRefresh ? (
          <Button variant="outline" className="px-5 gap-2" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        ) : null}
        {extra}
        {canCreate && onCreate ? (
          <Button variant="primary" className="px-5 gap-2" onClick={onCreate}>
            <IconPlus className="h-4 w-4" />
            {createLabel ?? "Create"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Error banner matching branches page zc-danger style */
export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{message}</div>
    </div>
  );
}

/** Status pill matching branches page ACTIVE/INACTIVE badges */
export function StatusPill({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
      ACTIVE
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
      INACTIVE
    </span>
  );
}

/** Monospace code badge matching branches page code column */
export function CodeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
      {children}
    </span>
  );
}

/** Colored stat box matching branches overview card */
export function StatBox({
  label,
  value,
  color = "blue",
  detail,
}: {
  label: string;
  value: number | string;
  color?: "blue" | "sky" | "violet" | "emerald" | "amber" | "rose";
  detail?: React.ReactNode;
}) {
  const cls: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10",
    sky: "border-sky-200 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-900/10",
    violet: "border-violet-200 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-900/10",
    emerald: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-900/10",
    amber: "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/10",
    rose: "border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-900/10",
  };
  const txtCls: Record<string, { label: string; value: string; detail: string }> = {
    blue: { label: "text-blue-600 dark:text-blue-400", value: "text-blue-700 dark:text-blue-300", detail: "text-blue-700/80 dark:text-blue-300/80" },
    sky: { label: "text-sky-600 dark:text-sky-400", value: "text-sky-700 dark:text-sky-300", detail: "text-sky-700/80 dark:text-sky-300/80" },
    violet: { label: "text-violet-600 dark:text-violet-400", value: "text-violet-700 dark:text-violet-300", detail: "text-violet-700/80 dark:text-violet-300/80" },
    emerald: { label: "text-emerald-600 dark:text-emerald-400", value: "text-emerald-700 dark:text-emerald-300", detail: "text-emerald-700/80 dark:text-emerald-300/80" },
    amber: { label: "text-amber-600 dark:text-amber-400", value: "text-amber-700 dark:text-amber-300", detail: "text-amber-700/80 dark:text-amber-300/80" },
    rose: { label: "text-rose-600 dark:text-rose-400", value: "text-rose-700 dark:text-rose-300", detail: "text-rose-700/80 dark:text-rose-300/80" },
  };
  const t = txtCls[color] ?? txtCls.blue;
  return (
    <div className={cn("rounded-xl border p-3", cls[color])}>
      <div className={cn("text-xs font-medium", t.label)}>{label}</div>
      <div className={cn("mt-1 text-lg font-bold", t.value)}>{value}</div>
      {detail ? <div className={cn("mt-1 text-[11px]", t.detail)}>{detail}</div> : null}
    </div>
  );
}

/** Search bar matching branches page search pattern */
export function SearchBar({
  value,
  onChange,
  placeholder,
  filteredCount,
  totalCount,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  filteredCount: number;
  totalCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          placeholder={placeholder ?? "Search..."}
          className="pl-10"
        />
      </div>
      <div className="text-xs text-zc-muted">
        Showing{" "}
        <span className="font-semibold tabular-nums text-zc-text">{filteredCount}</span>{" "}
        of{" "}
        <span className="font-semibold tabular-nums text-zc-text">{totalCount}</span>
      </div>
    </div>
  );
}

/** Onboarding callout at the bottom of pages */
export function OnboardingCallout({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zc-text">{title}</div>
          <div className="mt-1 text-sm text-zc-muted">{description}</div>
        </div>
      </div>
    </div>
  );
}
