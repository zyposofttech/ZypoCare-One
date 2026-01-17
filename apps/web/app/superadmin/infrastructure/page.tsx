"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type GoLiveSnapshot = {
  enabledUnitTypes: number;
  units: number;
  rooms: number;
  resources: number;
  beds: number;
  schedulableOts: number;
  equipmentCount: number;
  fixItsOpen: number;
  generatedAt: string;
};

type GoLivePreview = {
  branchId: string;
  score: number;
  blockers: string[];
  warnings: string[];
  snapshot: GoLiveSnapshot;
  reportId?: string;
};

type LocationNode = {
  id: string;
  branchId: string;
  type: "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE";
  parentId?: string | null;
  code: string;
  name: string;
  isActive: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;

  buildings?: LocationNode[];
  floors?: LocationNode[];
  zones?: LocationNode[];
};

type LocationTree = { campuses: LocationNode[] };

type BranchReadiness = {
  branchId: string;
  score: number;
  summary: {
    enabledFacilities: number;
    departments: number;
    specialties: number;
    doctors: number;
    otRooms: number;
    beds: number;
  };
  blockers: string[];
  warnings: string[];
  generatedAt: string;
};

// ---------------- Utilities (same visual language as Branch Details) ----------------

const LS_KEY = "zc.superadmin.infrastructure.branchId";

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
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-zc-border bg-zc-panel/30">
      <div
        className="h-full rounded-full bg-indigo-500/80 transition-[width] duration-300 dark:bg-indigo-400/70"
        style={{ width: `${v}%` }}
      />
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
          : "border-zc-border bg-zc-panel/15";

  return (
    <div className={cn("rounded-xl border p-4", toneCls, className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
        {icon ? <span className="text-zc-muted">{icon}</span> : null}
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
  metricLabel = "Items",
  metricValue = 0,
  rightTag,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  tone?: keyof typeof pillTones;
  disabled?: boolean;
  metricLabel?: string;
  metricValue?: number;
  rightTag?: React.ReactNode;
}) {
  const card = (
    <div
      className={cn(
        "group block rounded-2xl border border-zc-border bg-zc-panel/20 p-4 transition-all",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 hover:bg-zc-panel/35 hover:shadow-elev-2"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-zc-border bg-zc-panel/25">
              {icon}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {title}
              </div>
              <div className="mt-1 text-sm text-zc-muted">{description}</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <MetricPill label={metricLabel} value={metricValue} tone={tone} />
            {rightTag}
          </div>
        </div>

        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition-colors group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50">
          <IconChevronRight className="h-4 w-4 text-zc-muted transition-all group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
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

  const [ctxBusy, setCtxBusy] = React.useState(false);
  const [ctxErr, setCtxErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  const [goLive, setGoLive] = React.useState<GoLivePreview | null>(null);
  const [locTree, setLocTree] = React.useState<LocationTree | null>(null);
  const [facilityReadiness, setFacilityReadiness] =
    React.useState<BranchReadiness | null>(null);
  const ctxReqSeq = React.useRef(0);

  async function loadBranches(showToast = false) {
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

  async function loadBranchContext(branchIdParam: string, showToast = false) {
    if (!branchIdParam) return;
    setFacilityReadiness(null);
    const seq = ++ctxReqSeq.current;
    setCtxErr(null);
    setCtxBusy(true);

    try {
      const q = encodeURIComponent(branchIdParam);

      const [gl, tree, rd] = await Promise.all([
        apiFetch<GoLivePreview>(`/api/infrastructure/branch/go-live?branchId=${q}`),
        apiFetch<LocationTree>(`/api/infrastructure/locations/tree?branchId=${q}`),
        apiFetch<BranchReadiness>(`/api/branches/${q}/readiness`),
      ]);

      if (seq !== ctxReqSeq.current) return;

      setGoLive(gl || null);
      setLocTree(tree || null);
      setFacilityReadiness(rd || null);


      setFacilityReadiness(rd || null);


      if (seq !== ctxReqSeq.current) return; // ignore stale responses

      setGoLive(gl || null);
      setLocTree(tree || null);

      if (showToast) {
        toast({ title: "Updated", description: "Loaded latest infrastructure signals.", duration: 1600 });
      }
    } catch (e: any) {
      const msg = e?.message || "Unable to load infrastructure signals.";
      if (seq !== ctxReqSeq.current) return;

      setCtxErr(msg);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      if (seq === ctxReqSeq.current) setCtxBusy(false);
    }
  }

  React.useEffect(() => {
    void loadBranches(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    void loadBranchContext(branchId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const selected = React.useMemo(
    () => branches.find((b) => b.id === branchId) || null,
    [branches, branchId]
  );

  const orgMetrics = React.useMemo(() => {
    return {
      users: countOf(selected, "users"),
      departments: countOf(selected, "departments"),
      specialties: countOf(selected, "specialties"),
      wards: countOf(selected, "wards"),
      beds: countOf(selected, "beds"),
      ots: countOf(selected, "ots"),
    };
  }, [selected]);

  const locCounts = React.useMemo(() => {
    const campuses = locTree?.campuses ?? [];
    let buildings = 0;
    let floors = 0;
    let zones = 0;

    for (const c of campuses) {
      const bs = c.buildings ?? [];
      buildings += bs.length;

      for (const b of bs) {
        const fs = b.floors ?? [];
        floors += fs.length;

        for (const f of fs) {
          const zs = f.zones ?? [];
          zones += zs.length;
        }
      }
    }

    return { campuses: campuses.length, buildings, floors, zones };
  }, [locTree]);

  const snap = goLive?.snapshot ?? null;

  const moduleFlags = React.useMemo(() => {
    const zones = locCounts.zones;
    const enabledUnitTypes = safeNum(snap?.enabledUnitTypes);
    const units = safeNum(snap?.units);
    const rooms = safeNum(snap?.rooms);
    const resources = safeNum(snap?.resources);
    const beds = safeNum(snap?.beds);
    const schedulableOts = safeNum(snap?.schedulableOts);
    const equipmentCount = safeNum(snap?.equipmentCount);
    const fixItsOpen = safeNum(snap?.fixItsOpen);

    return {
      locations: zones > 0 ? readinessFlag("ready") : readinessFlag("pending"),
      unitTypes: enabledUnitTypes > 0 ? readinessFlag("ready") : readinessFlag("block"),
      units: units > 0 ? readinessFlag("ready") : readinessFlag("block"),
      rooms: rooms > 0 ? readinessFlag("ready") : readinessFlag("warn"),
      resources: beds > 0 ? readinessFlag("ready") : readinessFlag("block"),
      ot: schedulableOts > 0 ? readinessFlag("ready") : readinessFlag("block"),
      equipment: equipmentCount > 0 ? readinessFlag("ready") : readinessFlag("warn"),
      mapping: fixItsOpen === 0 ? readinessFlag("ready") : readinessFlag("warn", `${fixItsOpen} open`),

      // counts
      enabledUnitTypes,
      units,
      rooms,
      resources,
      beds,
      schedulableOts,
      equipmentCount,
      fixItsOpen,
    };
  }, [locCounts.zones, snap]);

  const score = goLive?.score ?? 0;
  const blockers = goLive?.blockers ?? [];
  const warnings = goLive?.warnings ?? [];
  const generatedAt = snap?.generatedAt ?? null;

  const branchHref = selected ? `/superadmin/branches/${encodeURIComponent(selected.id)}` : "/superadmin/branches";

  return (
    <AppShell title="Infrastructure Setup">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-900/20">
                <IconBuilding className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              </span>

              <div className="min-w-0">
                <div className="text-sm text-zc-muted">
                  <Link href="/superadmin/dashboard" className="hover:underline">
                    Super Admin
                  </Link>
                  <span className="mx-2 text-zc-muted/60">/</span>
                  <span className="text-zc-text">Infrastructure</span>
                </div>

                <div className="mt-1 text-3xl font-semibold tracking-tight">Infrastructure Setup</div>

                <div className="mt-2 max-w-3xl text-sm leading-6 text-zc-muted">
                  This page is now live: it reads the latest branch infra state from backend (Go-Live preview + Location tree) and reflects
                  readiness, blockers, and module-level progress automatically.
                </div>

                {generatedAt ? (
                  <div className="mt-2 text-xs text-zc-muted">
                    Last signal refresh: <span className="font-mono">{new Date(generatedAt).toLocaleString()}</span>
                    {ctxBusy ? <span className="ml-2">(updating…)</span> : null}
                  </div>
                ) : null}
              </div>
            </div>

            {err ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}

            {ctxErr ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50/40 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-200">
                <Wrench className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{ctxErr}</div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void loadBranches(true)} disabled={busy}>
              <RefreshCw className={cn("h-4 w-4", busy ? "animate-spin" : "")} />
              Refresh Branches
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => (branchId ? void loadBranchContext(branchId, true) : undefined)}
              disabled={!branchId || ctxBusy}
            >
              <RefreshCw className={cn("h-4 w-4", ctxBusy ? "animate-spin" : "")} />
              Refresh Infra Signals
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
                <Building2 className="h-5 w-5 text-zc-accent" />
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
                    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branch Selector</div>

                    <Select
                      value={branchId}
                      onValueChange={(v) => {
                        setBranchId(v);
                        writeLS(LS_KEY, v);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                        <SelectValue placeholder="Select a branch…" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} <span className="font-mono text-xs text-zc-muted">({b.code})</span>{" "}
                            <span className="text-xs text-zc-muted">• {b.city}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="text-xs text-zc-muted">
                      Infra readiness and module counts below are fetched live from backend for the selected branch.
                    </div>
                  </div>

                  {selected ? (
                    <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zc-text">
                            {selected.name} <span className="font-mono text-xs text-zc-muted">({selected.code})</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zc-muted">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" /> {selected.city}
                            </span>
                            {selected.address ? (
                              <>
                                <span className="text-zc-muted/60">•</span>
                                <span className="truncate">{selected.address}</span>
                              </>
                            ) : null}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <MetricPill
                              label="Facilities"
                              value={facilityReadiness?.summary?.enabledFacilities ?? 0}
                              tone="sky"
                            />
                            <MetricPill
                              label="Departments"
                              value={facilityReadiness?.summary?.departments ?? 0}
                              tone="emerald"
                            />
                            <MetricPill
                              label="Specialties"
                              value={facilityReadiness?.summary?.specialties ?? 0}
                              tone="violet"
                            />
                          </div>

                        </div>

                        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200/50 bg-indigo-50/40 dark:border-indigo-900/35 dark:bg-indigo-900/15">
                          <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-zc-muted">No branch selected.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-zc-accent" />
                Go-Live Preview (Live)
              </CardTitle>
              <CardDescription>
                This panel is now backend-driven. Score, blockers and warnings are computed by the Go-Live Validator service.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {!selected ? (
                <div className="text-sm text-zc-muted">Select a branch to view readiness.</div>
              ) : ctxBusy && !goLive ? (
                <div className="grid gap-3">
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Score</div>
                      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{goLive ? `${score}%` : "—"}</div>
                      <div className="mt-2 text-sm text-zc-muted">
                        This score is computed from enabled unit types, units, beds, schedulable OT tables, equipment registry, and open Fix-It tasks.
                      </div>
                      <ProgressBar value={goLive ? score : 0} />
                    </div>

                    <div className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/25">
                      <Wrench className="h-5 w-5 text-zc-accent" />
                    </div>
                  </div>

                  {/* Core checks */}
                  <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-zc-text">Core Infra Checks</div>
                      {blockers.length === 0 ? readinessFlag("ready") : readinessFlag("block", `${blockers.length} blockers`)}
                    </div>

                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Location Zones</span>
                        {locCounts.zones > 0 ? readinessFlag("ready") : readinessFlag("pending")}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Unit Types Enabled</span>
                        {moduleFlags.enabledUnitTypes > 0 ? readinessFlag("ready") : readinessFlag("block")}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Units</span>
                        {moduleFlags.units > 0 ? readinessFlag("ready") : readinessFlag("block")}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Beds</span>
                        {moduleFlags.beds > 0 ? readinessFlag("ready") : readinessFlag("block")}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Schedulable OT Tables</span>
                        {moduleFlags.schedulableOts > 0 ? readinessFlag("ready") : readinessFlag("block")}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Equipment Register</span>
                        {moduleFlags.equipmentCount > 0 ? readinessFlag("ready") : readinessFlag("warn")}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Fix-It Queue</span>
                        {moduleFlags.fixItsOpen === 0 ? readinessFlag("ready") : readinessFlag("warn", `${moduleFlags.fixItsOpen} open`)}
                      </div>
                    </div>
                  </div>

                  {blockers.length ? (
                    <div className="rounded-2xl border border-red-200/60 bg-red-50/40 p-4 dark:border-red-900/40 dark:bg-red-900/15">
                      <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-200">
                        <AlertTriangle className="h-4 w-4" />
                        Blockers
                      </div>
                      <ul className="mt-2 list-disc pl-5 text-sm text-zc-muted">
                        {blockers.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {warnings.length ? (
                    <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-900/15">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                        <Wrench className="h-4 w-4" />
                        Warnings
                      </div>
                      <ul className="mt-2 list-disc pl-5 text-sm text-zc-muted">
                        {warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KPI strip (Infra-focused + location counts) */}
        <div className="grid gap-4 md:grid-cols-6">
          <InfoTile
            label="Campuses"
            tone="indigo"
            icon={<MapPin className="h-4 w-4" />}
            value={<div className="text-2xl font-semibold tabular-nums">{selected ? locCounts.campuses : "—"}</div>}
          />
          <InfoTile
            label="Buildings"
            tone="cyan"
            icon={<Building2 className="h-4 w-4" />}
            value={<div className="text-2xl font-semibold tabular-nums">{selected ? locCounts.buildings : "—"}</div>}
          />
          <InfoTile
            label="Floors"
            tone="emerald"
            icon={<Layers className="h-4 w-4" />}
            value={<div className="text-2xl font-semibold tabular-nums">{selected ? locCounts.floors : "—"}</div>}
          />
          <InfoTile
            label="Zones"
            tone="indigo"
            icon={<Layers className="h-4 w-4" />}
            value={<div className="text-2xl font-semibold tabular-nums">{selected ? locCounts.zones : "—"}</div>}
          />
          <InfoTile
            label="Units"
            tone="emerald"
            icon={<ClipboardList className="h-4 w-4" />}
            value={<div className="text-2xl font-semibold tabular-nums">{selected ? safeNum(snap?.units) : "—"}</div>}
          />
          <InfoTile
            label="Beds"
            tone="zinc"
            icon={<Hammer className="h-4 w-4" />}
            value={<div className="text-2xl font-semibold tabular-nums">{selected ? safeNum(snap?.beds) : "—"}</div>}
          />
        </div>

        {/* Modules grid (now status + counts are live; Locations is enabled) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle>Infrastructure Modules</CardTitle>
            <CardDescription>
              Status and counts are live. Pages that are not implemented yet remain disabled, but still reflect backend progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ModuleCard
                title="Locations"
                description="Campus → Building → Floor → Zone (effective-dated, strict codes)"
                icon={<MapPin className="h-4 w-4 text-zc-accent" />}
                href="/superadmin/infrastructure/locations"
                tone="indigo"
                metricLabel="Zones"
                metricValue={selected ? locCounts.zones : 0}
                rightTag={
                  <>
                    {moduleFlags.locations}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>Live</span>
                  </>
                }
              />

              <ModuleCard
                title="Unit Types (Enablement)"
                description="Day-1 unit types catalog. Branch enable/disable"
                icon={<Layers className="h-4 w-4 text-zc-accent" />}
                href="/superadmin/infrastructure/unit-types"
                tone="violet"
                disabled
                metricLabel="Enabled"
                metricValue={selected ? moduleFlags.enabledUnitTypes : 0}
                rightTag={
                  <>
                    {moduleFlags.unitTypes}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>UI Soon</span>
                  </>
                }
              />

              <ModuleCard
                title="Units / Wards"
                description="Care units: Ward/ICU/OT/Diagnostics with naming validation"
                icon={<Building2 className="h-4 w-4 text-zc-accent" />}
                href="/superadmin/infrastructure/units"
                tone="sky"
                disabled
                metricLabel="Units"
                metricValue={selected ? moduleFlags.units : 0}
                rightTag={
                  <>
                    {moduleFlags.units}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>UI Soon</span>
                  </>
                }
              />

              <ModuleCard
                title="Rooms / Bays"
                description="Rooms (beds in room) + option for Open Bays"
                icon={<Layers className="h-4 w-4 text-zc-accent" />}
                href="/superadmin/infrastructure/rooms"
                tone="emerald"
                disabled
                metricLabel="Rooms"
                metricValue={selected ? moduleFlags.rooms : 0}
                rightTag={
                  <>
                    {moduleFlags.rooms}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>UI Soon</span>
                  </>
                }
              />

              <ModuleCard
                title="Resources (Beds/OT Tables/etc.)"
                description="Bed states + housekeeping gate; support bays & rooms"
                icon={<Hammer className="h-4 w-4 text-zc-accent" />}
                href="/superadmin/infrastructure/resources"
                tone="emerald"
                disabled
                metricLabel="Resources"
                metricValue={selected ? moduleFlags.resources : 0}
                rightTag={
                  <>
                    {moduleFlags.resources}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>UI Soon</span>
                  </>
                }
              />

              <ModuleCard
                title="OT Scheduling Readiness"
                description="Conflict detection + pre-check blockers (consent/anesthesia/checklists)"
                icon={<CalendarClock className="h-4 w-4 text-zc-accent" />}
                href="/superadmin/infrastructure/ot"
                tone="indigo"
                disabled
                metricLabel="Schedulable"
                metricValue={selected ? moduleFlags.schedulableOts : 0}
                rightTag={
                  <>
                    {moduleFlags.ot}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>UI Soon</span>
                  </>
                }
              />

              <ModuleCard
                title="Diagnostics Configuration"
                description="Orderables, modalities, worklists, validation policy"
                icon={<Database className="h-4 w-4 text-zc-accent" />}
                href="/superadmin/infrastructure/diagnostics"
                tone="sky"
                disabled
                metricLabel="Planned"
                metricValue={1}
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="Equipment Register"
                description="Make/model/serial, AMC/PM schedules, downtime tickets; AERB/PCPNDT gates"
                icon={<ShieldCheck className="h-4 w-4 text-zc-accent" />}
                href="/superadmin/infrastructure/equipment"
                tone="violet"
                disabled
                metricLabel="Assets"
                metricValue={selected ? moduleFlags.equipmentCount : 0}
                rightTag={
                  <>
                    {moduleFlags.equipment}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>UI Soon</span>
                  </>
                }
              />

              <ModuleCard
                title="Service Items + Charge Mapping"
                description="Orderable ServiceItem → versioned Charge Master code; Fix-It queue for unmapped"
                icon={<ClipboardList className="h-4 w-4 text-zc-accent" />}
                href="/superadmin/infrastructure/service-items"
                tone="indigo"
                disabled
                metricLabel="Fix-Its"
                metricValue={selected ? moduleFlags.fixItsOpen : 0}
                rightTag={
                  <>
                    {moduleFlags.mapping}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>UI Soon</span>
                  </>
                }
              />

              <ModuleCard
                title="Bulk Import (CSV/XLS)"
                description="Templates: Units / Rooms / Resources / Assets / Service Items"
                icon={<Database className="h-4 w-4 text-zc-accent" />}
                href="/superadmin/infrastructure/import"
                tone="zinc"
                disabled
                metricLabel="Planned"
                metricValue={1}
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>Soon</span>}
              />

              <ModuleCard
                title="Go-Live Validator"
                description="Readiness score + blockers/warnings + recommended fixes + immutable snapshot report"
                icon={<Sparkles className="h-4 w-4 text-zc-accent" />}
                href="/superadmin/infrastructure/go-live"
                tone="emerald"
                disabled
                metricLabel="Score"
                metricValue={selected ? score : 0}
                rightTag={
                  <>
                    {blockers.length === 0 ? readinessFlag("ready") : readinessFlag("block", `${blockers.length}`)}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.amber)}>UI Soon</span>
                  </>
                }
              />
            </div>

            <div className="mt-6 rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
              <div className="font-semibold text-zc-text">What changed (so it is “live” now)</div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                <li>Locations card is enabled and shows live location counts from the backend location-tree endpoint.</li>
                <li>Readiness is computed by backend Go-Live Preview (not hardcoded heuristics).</li>
                <li>All module cards reflect real counts/status even if their UI pages are not enabled yet.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
