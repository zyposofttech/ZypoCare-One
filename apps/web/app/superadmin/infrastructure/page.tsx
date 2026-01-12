"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";

import { IconBuilding, IconChevronRight } from "@/components/icons";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Layers,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wrench,
  Database,
  Hammer,
  CalendarClock,
  Stethoscope,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------- Types ----------------

type BranchCounts = Record<string, number | undefined>;

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city: string;

  address?: string | null;
  contactPhone1?: string | null;
  contactPhone2?: string | null;
  contactEmail?: string | null;

  createdAt?: string;
  updatedAt?: string;

  _count?: BranchCounts;

  // fallback if API sends direct counts
  departmentsCount?: number;
  specialtiesCount?: number;
  usersCount?: number;
  wardsCount?: number;
  bedsCount?: number;
  oTsCount?: number;
};

// ---------------- Utilities (same visual language as Branch Details) ----------------

const LS_KEY = "xc.superadmin.infrastructure.branchId";

const pillTones = {
  sky: "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  violet:
    "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200",
  zinc: "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
  indigo:
    "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
}

function readLS(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function countOf(row: BranchRow | null, key: string) {
  if (!row) return 0;

  // direct counts if API supplies them
  if (key === "departments" && row.departmentsCount != null) return safeNum(row.departmentsCount);
  if (key === "specialties" && row.specialtiesCount != null) return safeNum(row.specialtiesCount);
  if (key === "users" && row.usersCount != null) return safeNum(row.usersCount);
  if (key === "wards" && row.wardsCount != null) return safeNum(row.wardsCount);
  if (key === "beds" && row.bedsCount != null) return safeNum(row.bedsCount);
  if (key === "ots" && row.oTsCount != null) return safeNum(row.oTsCount);

  const c = row._count || {};

  if (key === "departments") return safeNum(c.departments ?? c.department);
  if (key === "specialties") return safeNum(c.specialties ?? c.specialty);
  if (key === "users") return safeNum(c.users ?? c.user ?? c.staff ?? c.employees);
  if (key === "wards") return safeNum(c.wards ?? c.units ?? c.unit ?? c.ward);
  if (key === "beds") return safeNum(c.beds ?? c.resources ?? c.bed ?? c.resource);
  if (key === "ots") return safeNum(c.oTs ?? c.ots ?? c.ot ?? c.operationTheatres);

  return 0;
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof pillTones;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", pillTones[tone])}>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="opacity-90">{label}</span>
    </span>
  );
}

function readinessFlag(kind: "ready" | "pending" | "warn" | "block", note?: string) {
  if (kind === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Ready
      </span>
    );
  }

  const warn = kind === "warn";
  const block = kind === "block";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
        block
          ? "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
          : warn
            ? "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200"
            : "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200"
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      {block ? "Blocked" : warn ? "Warning" : "Pending"}
      {note ? ` • ${note}` : ""}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className="mt-3 h-2 w-full rounded-full border border-xc-border bg-xc-panel/30 overflow-hidden">
      <div className="h-full rounded-full bg-indigo-500/80 dark:bg-indigo-400/70 transition-[width] duration-300" style={{ width: `${v}%` }} />
    </div>
  );
}

function InfoTile({
  label,
  value,
  className,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  tone?: "indigo" | "emerald" | "cyan" | "zinc";
}) {
  const toneCls =
    tone === "indigo"
      ? "border-indigo-200/50 bg-indigo-50/40 dark:border-indigo-900/35 dark:bg-indigo-900/15"
      : tone === "emerald"
        ? "border-emerald-200/50 bg-emerald-50/40 dark:border-emerald-900/35 dark:bg-emerald-900/15"
        : tone === "cyan"
          ? "border-cyan-200/50 bg-cyan-50/40 dark:border-cyan-900/35 dark:bg-cyan-900/15"
          : "border-xc-border bg-xc-panel/15";

  return (
    <div className={cn("rounded-xl border p-4", toneCls, className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-xc-muted">
        {icon ? <span className="text-xc-muted">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className="mt-2">{value}</div>
    </div>
  );
}

function ModuleCard({
  title,
  description,
  icon,
  href,
  tone = "zinc",
  disabled,
  rightTag,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  tone?: keyof typeof pillTones;
  disabled?: boolean;
  rightTag?: React.ReactNode;
}) {
  const card = (
    <div
      className={cn(
        "group block rounded-2xl border border-xc-border bg-xc-panel/20 p-4 transition-all",
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:bg-xc-panel/35 hover:shadow-elev-2 hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-xc-border bg-xc-panel/25">
              {icon}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-xc-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {title}
              </div>
              <div className="mt-1 text-sm text-xc-muted">{description}</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <MetricPill label="Module" value={1} tone={tone} />
            {rightTag}
          </div>
        </div>

        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-transparent group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
          <IconChevronRight className="h-4 w-4 text-xc-muted group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );

  if (disabled) return <div aria-disabled="true">{card}</div>;
  return (
    <Link href={href} className="block">
      {card}
    </Link>
  );
}

// ---------------- Page ----------------

export default function SuperAdminInfrastructureOverview() {
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  async function load(showToast = false) {
    setErr(null);
    setBusy(true);
    try {
      const rows = await apiFetch<BranchRow[]>("/api/branches");
      setBranches(rows || []);

      const stored = readLS(LS_KEY);
      const first = rows?.[0]?.id;

      const next =
        (stored && rows?.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

      setBranchId(next);
      if (next) writeLS(LS_KEY, next);

      if (showToast) {
        toast({ title: "Refreshed", description: "Loaded latest branch list.", duration: 1600 });
      }
    } catch (e: any) {
      const msg = e?.message || "Unable to load branches.";
      setErr(msg);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = React.useMemo(
    () => branches.find((b) => b.id === branchId) || null,
    [branches, branchId]
  );

  const metrics = React.useMemo(() => {
    return {
      users: countOf(selected, "users"),
      departments: countOf(selected, "departments"),
      specialties: countOf(selected, "specialties"),
      wards: countOf(selected, "wards"),
      beds: countOf(selected, "beds"),
      ots: countOf(selected, "ots"),
    };
  }, [selected]);

  const readiness = React.useMemo(() => {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (metrics.departments <= 0) blockers.push("Departments not configured.");
    if (metrics.wards <= 0) blockers.push("Units/Wards not configured.");
    if (metrics.beds <= 0) blockers.push("Beds/Resources not configured.");
    if (metrics.users <= 0) warnings.push("No staff/users linked to this branch yet (IAM).");

    // provisional score based on known counts
    const knownMax = 75; // depts 20 + wards 20 + beds 20 + users 10 + specialties 5
    const pts =
      (metrics.departments > 0 ? 20 : 0) +
      (metrics.wards > 0 ? 20 : 0) +
      (metrics.beds > 0 ? 20 : 0) +
      (metrics.users > 0 ? 10 : 0) +
      (metrics.specialties > 0 ? 5 : 0);

    const score = knownMax ? Math.round((pts / knownMax) * 100) : 0;

    return { blockers, warnings, score };
  }, [metrics]);

  const branchHref = selected ? `/superadmin/branches/${encodeURIComponent(selected.id)}` : "/superadmin/branches";

  return (
    <AppShell title="Infrastructure Setup">
      <div className="grid gap-6">
        {/* Header (Branch-details-like hero) */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-900/20">
                <IconBuilding className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              </span>

              <div className="min-w-0">
                <div className="text-sm text-xc-muted">
                  <Link href="/superadmin/dashboard" className="hover:underline">
                    Super Admin
                  </Link>
                  <span className="mx-2 text-xc-muted/60">/</span>
                  <span className="text-xc-text">Infrastructure</span>
                </div>

                <div className="mt-1 text-3xl font-semibold tracking-tight">
                  Infrastructure Setup
                </div>

                <div className="mt-2 max-w-3xl text-sm leading-6 text-xc-muted">
                  Configure and validate branch infrastructure: locations (Campus → Building → Floor → Zone),
                  unit configuration, rooms/bays, resources (beds), OT scheduling readiness, diagnostics/equipment
                  compliance, and service ↔ charge master mapping.
                </div>
              </div>
            </div>

            {err ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void load(true)} disabled={busy}>
              <RefreshCw className={cn("h-4 w-4", busy ? "animate-spin" : "")} />
              Refresh
            </Button>

            <Button asChild className="gap-2">
              <Link href={branchHref}>
                <Sparkles className="h-4 w-4" />
                Open Branch
              </Link>
            </Button>
          </div>
        </div>

        {/* Branch selector + readiness */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-xc-accent" />
                Target Branch
              </CardTitle>
              <CardDescription>Select the branch to onboard/validate. Saved locally on this device.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {loading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">
                      Branch Selector
                    </div>

                    <Select
                      value={branchId}
                      onValueChange={(v) => {
                        setBranchId(v);
                        writeLS(LS_KEY, v);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-xc-card border-xc-border">
                        <SelectValue placeholder="Select a branch…" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}{" "}
                            <span className="font-mono text-xs text-xc-muted">({b.code})</span>{" "}
                            <span className="text-xs text-xc-muted">• {b.city}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="text-xs text-xc-muted">
                      Tip: Infra setup will be strictly validated (codes, naming conventions, effective dating).
                    </div>
                  </div>

                  {selected ? (
                    <div className="rounded-2xl border border-xc-border bg-xc-panel/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-xc-text">
                            {selected.name}{" "}
                            <span className="font-mono text-xs text-xc-muted">({selected.code})</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-xc-muted">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" /> {selected.city}
                            </span>
                            {selected.address ? (
                              <>
                                <span className="text-xc-muted/60">•</span>
                                <span className="truncate">{selected.address}</span>
                              </>
                            ) : null}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <MetricPill label="Users" value={metrics.users} tone="sky" />
                            <MetricPill label="Departments" value={metrics.departments} tone="emerald" />
                            <MetricPill label="Specialties" value={metrics.specialties} tone="violet" />
                          </div>
                        </div>

                        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200/50 bg-indigo-50/40 dark:border-indigo-900/35 dark:bg-indigo-900/15">
                          <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-xc-muted">No branch selected.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-xc-accent" />
                Readiness Preview
              </CardTitle>
              <CardDescription>
                Provisional readiness score based on currently available signals. Final blockers/warnings will be computed by Go-Live Validator.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {loading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">
                        Score
                      </div>
                      <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                        {selected ? `${readiness.score}%` : "—"}
                      </div>
                      <div className="mt-2 text-sm text-xc-muted">
                        Defaults are stricter at scheduling time. Compliance blockers (AERB/PCPNDT) will be enforced before “schedulable”.
                      </div>
                      <ProgressBar value={selected ? readiness.score : 0} />
                    </div>

                    <div className="grid h-10 w-10 place-items-center rounded-2xl border border-xc-border bg-xc-panel/25">
                      <Wrench className="h-5 w-5 text-xc-accent" />
                    </div>
                  </div>

                  {!selected ? (
                    <div className="text-sm text-xc-muted">Select a branch to view readiness.</div>
                  ) : (
                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-xc-border bg-xc-panel/15 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-xc-text">Core Setup Health</div>
                          {readiness.blockers.length === 0 ? readinessFlag("ready") : readinessFlag("block", `${readiness.blockers.length} blockers`)}
                        </div>

                        <div className="mt-3 grid gap-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xc-muted">Departments</span>
                            {metrics.departments > 0 ? readinessFlag("ready") : readinessFlag("block")}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xc-muted">Units/Wards</span>
                            {metrics.wards > 0 ? readinessFlag("ready") : readinessFlag("block")}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xc-muted">Beds/Resources</span>
                            {metrics.beds > 0 ? readinessFlag("ready") : readinessFlag("block")}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xc-muted">Users (IAM)</span>
                            {metrics.users > 0 ? readinessFlag("ready") : readinessFlag("warn")}
                          </div>
                        </div>
                      </div>

                      {readiness.blockers.length ? (
                        <div className="rounded-2xl border border-red-200/60 bg-red-50/40 dark:border-red-900/40 dark:bg-red-900/15 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-200">
                            <AlertTriangle className="h-4 w-4" />
                            Blockers
                          </div>
                          <ul className="mt-2 list-disc pl-5 text-sm text-xc-muted">
                            {readiness.blockers.map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {readiness.warnings.length ? (
                        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-900/15 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                            <Wrench className="h-4 w-4" />
                            Warnings
                          </div>
                          <ul className="mt-2 list-disc pl-5 text-sm text-xc-muted">
                            {readiness.warnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KPI strip */}
        <div className="grid gap-4 md:grid-cols-6">
          <InfoTile label="Users" tone="cyan" icon={<ClipboardList className="h-4 w-4" />} value={<div className="text-2xl font-semibold tabular-nums">{selected ? metrics.users : "—"}</div>} />
          <InfoTile label="Departments" tone="emerald" icon={<Layers className="h-4 w-4" />} value={<div className="text-2xl font-semibold tabular-nums">{selected ? metrics.departments : "—"}</div>} />
          <InfoTile label="Specialties" tone="indigo" icon={<Stethoscope className="h-4 w-4" />} value={<div className="text-2xl font-semibold tabular-nums">{selected ? metrics.specialties : "—"}</div>} />
          <InfoTile label="Units/Wards" tone="indigo" icon={<Layers className="h-4 w-4" />} value={<div className="text-2xl font-semibold tabular-nums">{selected ? metrics.wards : "—"}</div>} />
          <InfoTile label="Beds/Resources" tone="emerald" icon={<Hammer className="h-4 w-4" />} value={<div className="text-2xl font-semibold tabular-nums">{selected ? metrics.beds : "—"}</div>} />
          <InfoTile label="OTs" tone="zinc" icon={<CalendarClock className="h-4 w-4" />} value={<div className="text-2xl font-semibold tabular-nums">{selected ? metrics.ots : "—"}</div>} />
        </div>

        {/* Modules grid (colorful cards) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle>Infrastructure Modules</CardTitle>
            <CardDescription>
              We will enable these pages one-by-one. “Soon” modules are visible but intentionally disabled until implemented.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ModuleCard
                title="Locations"
                description="Campus → Building → Floor → Zone (effective-dated, strict codes)"
                icon={<MapPin className="h-4 w-4 text-xc-accent" />}
                href="/superadmin/infrastructure/locations"
                tone="indigo"
                disabled
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="Unit Types (Enablement)"
                description="Day-1 unit types catalog. Branch enable/disable"
                icon={<Layers className="h-4 w-4 text-xc-accent" />}
                href="/superadmin/infrastructure/unit-types"
                tone="violet"
                disabled
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="Units / Wards"
                description="Care units: Ward/ICU/OT/Diagnostics with naming validation"
                icon={<Building2 className="h-4 w-4 text-xc-accent" />}
                href="/superadmin/infrastructure/units"
                tone="sky"
                disabled
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="Rooms / Bays"
                description="Rooms (beds in room) + option for Open Bays"
                icon={<Layers className="h-4 w-4 text-xc-accent" />}
                href="/superadmin/infrastructure/rooms"
                tone="emerald"
                disabled
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="Resources (Beds/OT Tables/etc.)"
                description="Bed states + housekeeping gate; support bays & rooms"
                icon={<Hammer className="h-4 w-4 text-xc-accent" />}
                href="/superadmin/infrastructure/resources"
                tone="emerald"
                disabled
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="OT Scheduling Readiness"
                description="Conflict detection + pre-check blockers (consent/anesthesia/checklists)"
                icon={<CalendarClock className="h-4 w-4 text-xc-accent" />}
                href="/superadmin/infrastructure/ot"
                tone="indigo"
                disabled
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="Diagnostics Configuration"
                description="Orderables, modalities, worklists, validation policy"
                icon={<Database className="h-4 w-4 text-xc-accent" />}
                href="/superadmin/infrastructure/diagnostics"
                tone="sky"
                disabled
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="Equipment Register"
                description="Make/model/serial, location binding, AMC/PM schedules, downtime tickets; AERB/PCPNDT blockers"
                icon={<ShieldCheck className="h-4 w-4 text-xc-accent" />}
                href="/superadmin/infrastructure/equipment"
                tone="violet"
                disabled
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="Service Items + Charge Mapping"
                description="Orderable ServiceItem → versioned Charge Master code; Fix-It queue for unmapped"
                icon={<ClipboardList className="h-4 w-4 text-xc-accent" />}
                href="/superadmin/infrastructure/service-items"
                tone="indigo"
                disabled
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="Bulk Import (CSV/XLS)"
                description="Templates: Departments / Units / Rooms / Resources / Assets / Service Items"
                icon={<Database className="h-4 w-4 text-xc-accent" />}
                href="/superadmin/infrastructure/import"
                tone="zinc"
                disabled
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="Go-Live Validator"
                description="Readiness score + blockers/warnings + recommended fixes + immutable snapshot report"
                icon={<Sparkles className="h-4 w-4 text-xc-accent" />}
                href="/superadmin/infrastructure/go-live"
                tone="emerald"
                disabled
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-xc-border bg-xc-panel/15 p-4 text-sm text-xc-muted">
              <div className="font-semibold text-xc-text">Next we will implement:</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full border px-3 py-1 text-xs", pillTones.indigo)}>Locations</span>
                <span className={cn("rounded-full border px-3 py-1 text-xs", pillTones.emerald)}>Units</span>
                <span className={cn("rounded-full border px-3 py-1 text-xs", pillTones.violet)}>Rooms/Bays</span>
                <span className={cn("rounded-full border px-3 py-1 text-xs", pillTones.sky)}>Resources</span>
              </div>
              <div className="mt-2 text-xs">
                Note: Defaults are stricter at scheduling time. Compliance gates (AERB/PCPNDT) will be hard blockers before schedulable.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
