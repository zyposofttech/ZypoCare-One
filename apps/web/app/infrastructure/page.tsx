"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm, RequireAnyPerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";

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
  Bed,
  Stethoscope,
  Hospital
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

// ---------------- Utilities ----------------

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

  if (key === "departments") return safeNum((c as any).departments ?? (c as any).department);
  if (key === "specialties") return safeNum((c as any).specialties ?? (c as any).specialty);
  if (key === "users") return safeNum((c as any).users ?? (c as any).user ?? (c as any).staff ?? (c as any).employees);
  if (key === "wards") return safeNum((c as any).wards ?? (c as any).units ?? (c as any).unit ?? (c as any).ward);
  if (key === "beds") return safeNum((c as any).beds ?? (c as any).resources ?? (c as any).bed ?? (c as any).resource);
  if (key === "ots") return safeNum((c as any).oTs ?? (c as any).ots ?? (c as any).ot ?? (c as any).operationTheatres);

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
          ? "cursor-not-allowed opacity-55"
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

function fmtDate(s: string | null | undefined) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

function appendBranch(href: string, branchId: string) {
  if (!branchId) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}branchId=${encodeURIComponent(branchId)}`;
}

function clamp100(n: number) {
  return Math.max(0, Math.min(100, n));
}

// ---------------- Page ----------------

export default function SuperAdminInfrastructureOverview() {
  const { toast } = useToast();


  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);
  const effectiveBranchId = branchCtx.branchId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [ctxBusy, setCtxBusy] = React.useState(false);
  const [ctxErr, setCtxErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);

  const [goLive, setGoLive] = React.useState<GoLivePreview | null>(null);
  const [locTree, setLocTree] = React.useState<LocationTree | null>(null);
  const [facilityReadiness, setFacilityReadiness] = React.useState<BranchReadiness | null>(null);

  const ctxReqSeq = React.useRef(0);

  async function loadBranches(showToast = false) {
    setErr(null);
    setBusy(true);
    try {
      const rows = await apiFetch<BranchRow[]>("/api/branches");
      const list = rows || [];
      setBranches(list);

      const first = list?.[0]?.id;

      // GLOBAL scope: ensure an active branch is selected (persisted by the branch store)
      if (branchCtx.scope === "GLOBAL") {
        const current = activeBranchId ?? "";
        const next = (current && list.some((b) => b.id === current) ? current : "") || first || "";
        if (next && next !== current) setActiveBranchId(next);
      }

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

    const seq = ++ctxReqSeq.current;
    setCtxErr(null);
    setCtxBusy(true);

    // Keep old signals visible while refreshing to avoid flicker,
    // but we do clear readiness (more volatile / often missing).
    setFacilityReadiness(null);

    try {
      const q = encodeURIComponent(branchIdParam);

      // Page remains "live" even if one endpoint isn't ready yet.
      const [glRes, treeRes, rdRes] = await Promise.allSettled([
        apiFetch<GoLivePreview>(`/api/infrastructure/branch/go-live?branchId=${q}`),
        apiFetch<LocationTree>(`/api/infrastructure/locations/tree?branchId=${q}`),
        apiFetch<BranchReadiness>(`/api/branches/${q}/readiness`),
      ]);

      if (seq !== ctxReqSeq.current) return;

      const partialErrors: string[] = [];

      if (glRes.status === "fulfilled") setGoLive(glRes.value || null);
      else {
        setGoLive(null);
        partialErrors.push("Go-Live preview not available (using fallback readiness).");
      }

      if (treeRes.status === "fulfilled") setLocTree(treeRes.value || null);
      else {
        setLocTree(null);
        partialErrors.push("Location tree not available.");
      }

      if (rdRes.status === "fulfilled") setFacilityReadiness(rdRes.value || null);
      else {
        setFacilityReadiness(null);
        partialErrors.push("Branch readiness not available.");
      }

      if (partialErrors.length) setCtxErr(partialErrors.join(" "));

      if (showToast) {
        toast({
          title: partialErrors.length ? "Updated (partial)" : "Updated",
          description: partialErrors.length
            ? "Some backend signals are not available yet, but the page updated what it could."
            : "Loaded latest infrastructure signals.",
          duration: 1800,
        });
      }
    } catch (e: any) {
      if (seq !== ctxReqSeq.current) return;
      const msg = e?.message || "Unable to load infrastructure signals.";
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
    if (!effectiveBranchId) return;
    void loadBranchContext(effectiveBranchId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranchId]);

  const selected = React.useMemo(
    () => branches.find((b) => b.id === effectiveBranchId) || null,
    [branches, effectiveBranchId]
  );

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

  // -------- Fallback Go-Live (client-side) so the page is always "live" --------
  const fallbackGoLive = React.useMemo<GoLivePreview | null>(() => {
    if (!selected) return null;

    const s = facilityReadiness?.summary;
    const zones = locCounts.zones;

    const blockers: string[] = [];
    const warnings: string[] = [];

    // Hard blockers (minimum “hospital reality”)
    if (zones <= 0) blockers.push("Locations not complete: no Zones found (Campus → Building → Floor → Zone).");
    if (!s || safeNum(s.enabledFacilities) <= 0) blockers.push("No facilities enabled for this branch.");
    if (!s || safeNum(s.departments) <= 0) blockers.push("No departments configured.");
    if (!s || safeNum(s.specialties) <= 0) blockers.push("No specialties configured.");
    if (!s || safeNum(s.doctors) <= 0) warnings.push("No doctors assigned yet (HOD/Doctor mapping pending).");
    if (!s || safeNum(s.beds) <= 0) blockers.push("No beds configured (Resources/Beds).");
    if (!s || safeNum(s.otRooms) <= 0) warnings.push("No OT rooms detected yet (OT setup pending).");

    // Score: 0–100 based on the signals we do have
    let score = 0;
    score += zones > 0 ? 15 : 0;
    score += safeNum(s?.enabledFacilities) > 0 ? 10 : 0;
    score += safeNum(s?.departments) > 0 ? 15 : 0;
    score += safeNum(s?.specialties) > 0 ? 15 : 0;
    score += safeNum(s?.doctors) > 0 ? 10 : 0;
    score += safeNum(s?.beds) > 0 ? 20 : 0;
    score += safeNum(s?.otRooms) > 0 ? 15 : 0;

    score = clamp100(score);

    const now = new Date().toISOString();

    return {
      branchId: selected.id,
      score,
      blockers,
      warnings,
      snapshot: {
        // These are “best-effort” when backend Go-Live isn’t available.
        enabledUnitTypes: 0,
        units: 0,
        rooms: 0,
        resources: 0,
        beds: safeNum(s?.beds),
        schedulableOts: 0,
        equipmentCount: 0,
        fixItsOpen: 0,
        generatedAt: now,
      },
      reportId: undefined,
    };
  }, [selected, facilityReadiness, locCounts.zones]);

  // Effective Go-Live: prefer backend signal; fallback ensures page stays live.
  const effectiveGoLive = goLive ?? fallbackGoLive;

  const snap = effectiveGoLive?.snapshot ?? null;

  // Module flags: use real snapshot if available; fallback uses what we can infer.
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
      unitTypes: enabledUnitTypes > 0 ? readinessFlag("ready") : readinessFlag("pending"),
      unitsFlag: units > 0 ? readinessFlag("ready") : readinessFlag("pending"),
      roomsFlag: rooms > 0 ? readinessFlag("ready") : readinessFlag("pending"),
      resourcesFlag: resources > 0 ? readinessFlag("ready") : readinessFlag("pending"),
      ot: schedulableOts > 0 ? readinessFlag("ready") : readinessFlag("pending"),
      equipment: equipmentCount > 0 ? readinessFlag("ready") : readinessFlag("pending"),
      mapping: fixItsOpen === 0 ? readinessFlag("ready") : readinessFlag("warn", `${fixItsOpen} open`),

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

  const score = effectiveGoLive?.score ?? 0;
  const blockers = effectiveGoLive?.blockers ?? [];
  const warnings = effectiveGoLive?.warnings ?? [];
  const generatedAt = snap?.generatedAt ?? null;

  const branchHref = selected ? `/branches/${encodeURIComponent(selected.id)}` : "/branches";

  const mustSelectBranch = !effectiveBranchId || !selected;

  const moduleHref = React.useCallback(
    (href: string) => (effectiveBranchId ? appendBranch(href, effectiveBranchId) : href),
    [effectiveBranchId]
  );

  return (
    <AppShell title="Infrastructure Setup">
      <RequireAnyPerm
        perms={[
          "INFRA_LOCATION_READ",
          "INFRA_UNIT_READ",
          "INFRA_ROOM_READ",
          "INFRA_RESOURCE_READ",
          "INFRA_EQUIPMENT_READ",
          "INFRA_SERVICE_READ",
          "INFRA_GOLIVE_READ",
        ]}
      >
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
                  <Link href="/dashboard/global" className="hover:underline">
                    Super Admin
                  </Link>
                  <span className="mx-2 text-zc-muted/60">/</span>
                  <span className="text-zc-text">Infrastructure</span>
                </div>

                <div className="mt-1 text-3xl font-semibold tracking-tight">Infrastructure Setup</div>

                <div className="mt-2 max-w-3xl text-sm leading-6 text-zc-muted">
                  Score is computed from Locations + Branch Readiness and tells system status.
                </div>

                {fmtDate(generatedAt) ? (
                  <div className="mt-2 text-xs text-zc-muted">
                    Last signal refresh: <span className="font-mono">{fmtDate(generatedAt)}</span>
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

            {mustSelectBranch ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2 text-sm text-zc-muted">
                <Sparkles className="mt-0.5 h-4 w-4 text-zc-accent" />
                <div className="min-w-0">Select a branch to activate all modules and load branch-scoped infra signals.</div>
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
              onClick={() => (effectiveBranchId ? void loadBranchContext(effectiveBranchId, true) : undefined)}
              disabled={!effectiveBranchId || ctxBusy}
            >
              <RefreshCw className={cn("h-4 w-4", ctxBusy ? "animate-spin" : "")} />
              Refresh Infra Signals
            </Button>

            {selected ? (
              <Button asChild className="gap-2">
                <Link href={branchHref}>
                  <Sparkles className="h-4 w-4" />
                  Open Branch
                </Link>
              </Button>
            ) : (
              <Button className="gap-2" disabled>
                <Sparkles className="h-4 w-4" />
                Open Branch
              </Button>
            )}
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
                      value={effectiveBranchId}
                      disabled={branchCtx.scope !== "GLOBAL"}
                      onValueChange={(v) => {
                        if (branchCtx.scope !== "GLOBAL") return;
                        setActiveBranchId(v);
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
                  </div>

                  {selected ? (
                    <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zc-text">
                            {selected.name} <span className="font-mono text-xs text-zc-muted">({selected.code})</span>
                          </div>
                          <div className="mt-2 grid gap-1 text-sm text-zc-muted">
  <div className="flex items-center gap-2">
    <MapPin className="h-4 w-4 shrink-0" />
    <span className="whitespace-normal break-words">{selected.city}</span>
  </div>

  {selected.address ? (
    <div className="pl-6 whitespace-normal break-words leading-5">
      {selected.address}
    </div>
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
                              value={facilityReadiness?.summary?.departments ?? countOf(selected, "departments")}
                              tone="emerald"
                            />
                            <MetricPill
                              label="Specialties"
                              value={facilityReadiness?.summary?.specialties ?? countOf(selected, "specialties")}
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
                Go Live Preview Generates a score based on your system readyness.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {!selected ? (
                <div className="text-sm text-zc-muted">Select a branch to view readiness.</div>
              ) : ctxBusy && !effectiveGoLive ? (
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
                      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{effectiveGoLive ? `${score}%` : "—"}</div>
                      <div className="mt-2 text-sm text-zc-muted">
                        This score reflects minimum infra completeness. If backend Go-Live is unavailable, it is computed from Locations + Branch readiness.
                      </div>
                      <ProgressBar value={effectiveGoLive ? score : 0} />
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
                        <span className="text-zc-muted">Beds</span>
                        {moduleFlags.beds > 0 ? readinessFlag("ready") : readinessFlag("pending")}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">OT Scheduling Readiness</span>
                        {moduleFlags.schedulableOts > 0 ? readinessFlag("ready") : readinessFlag("pending")}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zc-muted">Equipment Register</span>
                        {moduleFlags.equipmentCount > 0 ? readinessFlag("ready") : readinessFlag("pending")}
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

        {/* KPI strip */}
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
            icon={<Bed className="h-4 w-4" />}
            value={<div className="text-2xl font-semibold tabular-nums">{selected ? safeNum(snap?.beds) : "—"}</div>}
          />
        </div>

        {/* Modules grid */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle>Infrastructure Modules</CardTitle>
            <CardDescription>All modules are now clickable once a branch is selected. Links carry branchId automatically.</CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ModuleCard
                title="Locations"
                description="Campus → Building → Floor → Zone (effective-dated)"
                icon={<MapPin className="h-4 w-4 text-zc-accent" />}
                href={moduleHref("/infrastructure/locations")}
                tone="indigo"
                disabled={mustSelectBranch}
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
                description="Unit types catalog + branch enable/disable"
                icon={<Hospital className="h-4 w-4 text-zc-accent" />}
                href={moduleHref("/infrastructure/unit-types")}
                tone="violet"
                disabled={mustSelectBranch}
                metricLabel="Enabled"
                metricValue={selected ? moduleFlags.enabledUnitTypes : 0}
                rightTag={
                  <>
                    {moduleFlags.unitTypes}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>Live</span>
                  </>
                }
              />

              <ModuleCard
                title="Units / Wards"
                description="Care units: Ward/ICU/OT/Diagnostics"
                icon={<Building2 className="h-4 w-4 text-zc-accent" />}
                href={moduleHref("/infrastructure/units")}
                tone="sky"
                disabled={mustSelectBranch}
                metricLabel="Units"
                metricValue={selected ? moduleFlags.units : 0}
                rightTag={
                  <>
                    {moduleFlags.units}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>Live</span>
                  </>
                }
              />

              <ModuleCard
                title="Rooms / Bays"
                description="Rooms and open bays"
                icon={<Layers className="h-4 w-4 text-zc-accent" />}
                href={moduleHref("/infrastructure/rooms")}
                tone="emerald"
                disabled={mustSelectBranch}
                metricLabel="Rooms"
                metricValue={selected ? moduleFlags.rooms : 0}
                rightTag={
                  <>
                    {moduleFlags.rooms}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>Live</span>
                  </>
                }
              />

              <ModuleCard
                title="Resources (Beds/OT Tables/etc.)"
                description="Beds + other resources registry"
                icon={<Bed className="h-4 w-4 text-zc-accent" />}
                href={moduleHref("/infrastructure/resources")}
                tone="emerald"
                disabled={mustSelectBranch}
                metricLabel="Resources"
                metricValue={selected ? moduleFlags.resources : 0}
                rightTag={
                  <>
                    {moduleFlags.resources}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>Live</span>
                  </>
                }
              />

              <ModuleCard
                title="OT Scheduling Readiness"
                description="Scheduling gates + readiness checks"
                icon={<CalendarClock className="h-4 w-4 text-zc-accent" />}
                href={moduleHref("/infrastructure/ot")}
                tone="indigo"
                disabled={mustSelectBranch}
                metricLabel="Schedulable"
                metricValue={selected ? moduleFlags.schedulableOts : 0}
                rightTag={
                  <>
                    {moduleFlags.ot}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>Live</span>
                  </>
                }
              />

              <ModuleCard
                title="Diagnostics Configuration"
                description="Orderables, modalities, worklists"
                icon={<Stethoscope className="h-4 w-4 text-zc-accent" />}
                href={moduleHref("/infrastructure/diagnostics")}
                tone="sky"
                disabled={mustSelectBranch}
                metricLabel="Planned"
                metricValue={1}
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.sky)}>Open</span>}
              />

              <ModuleCard
                title="Equipment Register"
                description="Assets + AMC/PM schedules"
                icon={<Hammer className="h-4 w-4 text-zc-accent" />}
                href={moduleHref("/infrastructure/equipment")}
                tone="violet"
                disabled={mustSelectBranch}
                metricLabel="Assets"
                metricValue={selected ? moduleFlags.equipmentCount : 0}
                rightTag={
                  <>
                    {moduleFlags.equipment}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>Live</span>
                  </>
                }
              />

              <ModuleCard
                title="Service Items + Charge Mapping"
                description="ServiceItem → Charge Master mapping"
                icon={<ClipboardList className="h-4 w-4 text-zc-accent" />}
                href={moduleHref("/infrastructure/service-items")}
                tone="indigo"
                disabled={mustSelectBranch}
                metricLabel="Fix-Its"
                metricValue={selected ? moduleFlags.fixItsOpen : 0}
                rightTag={
                  <>
                    {moduleFlags.mapping}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>Live</span>
                  </>
                }
              />

              <ModuleCard
                title="Bulk Import (CSV/XLS)"
                description="Templates: Units / Rooms / Resources / Assets"
                icon={<Database className="h-4 w-4 text-zc-accent" />}
                href={moduleHref("/infrastructure/import")}
                tone="zinc"
                disabled={mustSelectBranch}
                metricLabel="Planned"
                metricValue={1}
                rightTag={<span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.zinc)}>Open</span>}
              />

              <ModuleCard
                title="Go-Live Validator"
                description="Readiness score + blockers/warnings + snapshot report"
                icon={<Sparkles className="h-4 w-4 text-zc-accent" />}
                href={moduleHref("/infrastructure/golive")}
                tone="emerald"
                disabled={mustSelectBranch}
                metricLabel="Score"
                metricValue={selected ? score : 0}
                rightTag={
                  <>
                    {blockers.length === 0 ? readinessFlag("ready") : readinessFlag("block", `${blockers.length}`)}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>Live</span>
                  </>
                }
              />
            </div>

            {/* <div className="mt-6 rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
              <div className="font-semibold text-zc-text">What makes this “live” now</div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                <li>All module cards are enabled after branch selection and carry the selected branchId automatically.</li>
                <li>Go-Live score never disappears: backend signal preferred, fallback score computed if validator isn’t ready.</li>
                <li>Partial backend failures don’t break the page (allSettled + graceful UI state).</li>
              </ul>
            </div> */}
          </CardContent>
        </Card>
      </div>
          </RequireAnyPerm>
</AppShell>
  );
}
