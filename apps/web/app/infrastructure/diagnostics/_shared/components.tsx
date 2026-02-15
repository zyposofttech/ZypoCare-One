"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { cn } from "@/lib/cn";
import { Settings2 } from "lucide-react";

import type { DiagnosticKind, ResultDataType, ServicePointType } from "./types";

/* =========================================================
   Small UI helpers shared across diagnostics pages
   ========================================================= */

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
