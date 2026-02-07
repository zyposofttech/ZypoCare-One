"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { IconBuilding } from "@/components/icons";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";

import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Copy,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

const LOC_API = {
  tree: (branchId: string) => `/api/infrastructure/locations/tree?branchId=${encodeURIComponent(branchId)}`,
  create: (branchId: string) => `/api/infrastructure/locations?branchId=${encodeURIComponent(branchId)}`,
  update: (id: string) => `/api/infrastructure/locations/${encodeURIComponent(id)}`,
};

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city: string;
  address?: string | null;
};

type LocationType = "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE" | "AREA";

type LocationNode = {
  id: string;
  branchId: string;
  type: LocationType;
  parentId?: string | null;

  code: string; // full code in tree (C01-B01-F01-01-A01)
  name: string;

  isActive?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;

  // 2.2.2 attributes
  gpsLat?: number | null;
  gpsLng?: number | null;
  floorNumber?: number | null;

  wheelchairAccess?: boolean;
  stretcherAccess?: boolean;
  emergencyExit?: boolean;
  fireZone?: string | null;

  // nested
  buildings?: LocationNode[];
  floors?: LocationNode[];
  zones?: LocationNode[];
  areas?: LocationNode[];
};

type LocationTreeResponse =
  | { campuses: LocationNode[] }
  | { items: LocationNode[] }
  | { data: LocationNode[] }
  | any;

/* -------------------------------------------------------------------------- */
/*                                   Styling                                  */
/* -------------------------------------------------------------------------- */

const pillTones = {
  indigo:
    "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
  cyan:
    "border-cyan-200/70 bg-cyan-50/70 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-200",
  rose:
    "border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200",
  zinc: "border-zc-border bg-zc-panel/20 text-zc-text",
};

function typeLabel(t: LocationType) {
  if (t === "CAMPUS") return "Campus";
  if (t === "BUILDING") return "Building";
  if (t === "FLOOR") return "Floor";
  if (t === "ZONE") return "Zone";
  return "Area";
}

function typeTone(t: LocationType): keyof typeof pillTones {
  if (t === "CAMPUS") return "indigo";
  if (t === "BUILDING") return "cyan";
  if (t === "FLOOR") return "emerald";
  if (t === "ZONE") return "amber";
  return "rose";
}

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function nowLocalDateTime() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoFromLocal(local: string) {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function copyText(text: string) {
  try {
    void navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

function tailSegment(fullCode: string) {
  const s = String(fullCode ?? "").trim();
  if (!s) return "";
  const parts = s.split("-").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : s;
}

function composeFullCode(kind: LocationType, segmentRaw: string, parentFullCode?: string | null) {
  const seg = String(segmentRaw ?? "").trim().toUpperCase();
  if (!seg) return "";
  if (kind === "CAMPUS") return seg;
  const parent = String(parentFullCode ?? "").trim().toUpperCase();
  if (!parent) return seg;
  return `${parent}-${seg}`;
}

/**
 * Frontend validation. Backend remains authoritative.
 * CAMPUS: C##
 * BUILDING: B##
 * FLOOR: F##
 * ZONE: numeric (1..4 digits)
 * AREA: numeric OR A + numeric (1..4 digits)
 */
function validateSegmentCode(kind: LocationType, codeRaw: string): string | null {
  const code = String(codeRaw ?? "").trim().toUpperCase();
  if (!code) return "Code is required.";

  if (kind === "CAMPUS") return /^C\d{2}$/.test(code) ? null : "Campus code must be C## (e.g., C01).";
  if (kind === "BUILDING") return /^B\d{2}$/.test(code) ? null : "Building code must be B## (e.g., B01).";
  if (kind === "FLOOR") return /^F\d{2}$/.test(code) ? null : "Floor code must be F## (e.g., F01).";
  if (kind === "ZONE") return /^\d{1,4}$/.test(code) ? null : "Zone code must be numeric (e.g., 01, 101).";
  // AREA
  return /^(A?\d{1,4})$/.test(code) ? null : "Area code must be numeric (e.g., 01) or A01.";
}

function validateName(nameRaw: string): string | null {
  const name = String(nameRaw ?? "").trim();
  if (!name) return "Name is required.";
  if (name.length > 160) return "Name too long (max 160).";
  return null;
}

function suggestCode(kind: LocationType, siblings: LocationNode[]) {
  const pad2 = (n: number) => String(n).padStart(2, "0");

  if (kind === "ZONE") {
    const existingNums = new Set(
      siblings
        .map((s) => tailSegment(s.code))
        .map((seg) => String(seg ?? "").trim())
        .map((seg) => seg.startsWith("Z") ? seg.slice(1) : seg)
        .map((seg) => Number.parseInt(seg, 10))
        .filter((n) => Number.isFinite(n))
        .map((n) => String(n))
    );

    for (let i = 1; i < 500; i++) {
      const n = String(i);
      if (!existingNums.has(n)) return pad2(i);
    }
    return "01";
  }

  if (kind === "AREA") {
    const existing = new Set(siblings.map((s) => tailSegment(s.code).toUpperCase()).filter(Boolean));
    for (let i = 1; i < 500; i++) {
      const seg = `A${pad2(i)}`;
      if (!existing.has(seg)) return seg;
    }
    return "A01";
  }

  const existing = new Set(siblings.map((s) => tailSegment(s.code).toUpperCase()).filter(Boolean));
  const prefix = kind === "CAMPUS" ? "C" : kind === "BUILDING" ? "B" : "F";

  for (let i = 1; i < 500; i++) {
    const seg = `${prefix}${pad2(i)}`;
    if (!existing.has(seg)) return seg;
  }
  return `${prefix}01`;
}

/* -------------------------------------------------------------------------- */
/*                        Normalize API response into tree                     */
/* -------------------------------------------------------------------------- */

type FlatNode = LocationNode & { children: FlatNode[] };

function normalizeTree(data: LocationTreeResponse): LocationNode[] {
  if (!data) return [];
  if (Array.isArray(data.campuses)) return data.campuses;

  const items: LocationNode[] = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];

  if (!items.length) return [];

  const map = new Map<string, FlatNode>();
  for (const it of items) map.set(it.id, { ...(it as any), children: [] });

  const roots: FlatNode[] = [];
  for (const n of map.values()) {
    const pid = n.parentId || null;
    if (!pid || !map.has(pid)) roots.push(n);
    else map.get(pid)!.children.push(n);
  }

  const toNested = (n: FlatNode): LocationNode => {
    const kids = n.children.slice().sort((a, b) => a.code.localeCompare(b.code));
    const out: LocationNode = { ...n };
    delete (out as any).children;

    if (out.type === "CAMPUS") out.buildings = kids.map(toNested);
    else if (out.type === "BUILDING") out.floors = kids.map(toNested);
    else if (out.type === "FLOOR") out.zones = kids.map(toNested);
    else if (out.type === "ZONE") out.areas = kids.map(toNested);

    return out;
  };

  return roots
    .filter((r) => r.type === "CAMPUS" || !r.parentId)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(toNested);
}

function flattenNested(campuses: LocationNode[]) {
  const list: LocationNode[] = [];
  const visit = (n: LocationNode) => {
    list.push(n);
    for (const b of n.buildings ?? []) visit(b);
    for (const f of n.floors ?? []) visit(f);
    for (const z of n.zones ?? []) visit(z);
    for (const a of n.areas ?? []) visit(a);
  };
  for (const c of campuses) visit(c);
  return list;
}

/* -------------------------------------------------------------------------- */
/*                                 Page                                     */
/* -------------------------------------------------------------------------- */

type CreateState = { open: boolean; kind: LocationType; parentId: string | null };
type ReviseState = { open: boolean; node: LocationNode | null };
type RetireState = { open: boolean; node: LocationNode | null };

export default function InfrastructureLocationsPage() {
  const { toast } = useToast();

  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);
  const [selectedBranch, setSelectedBranch] = React.useState<BranchRow | null>(null);

  const [campuses, setCampuses] = React.useState<LocationNode[]>([]);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"overview" | "hierarchy">("hierarchy");

  const [createState, setCreateState] = React.useState<CreateState>({ open: false, kind: "CAMPUS", parentId: null });
  const [reviseState, setReviseState] = React.useState<ReviseState>({ open: false, node: null });
  const [retireState, setRetireState] = React.useState<RetireState>({ open: false, node: null });

  const allNodes = React.useMemo(() => flattenNested(campuses), [campuses]);
  const selectedNode = React.useMemo(
    () => (selectedId ? allNodes.find((n) => n.id === selectedId) || null : null),
    [selectedId, allNodes]
  );

  const counts = React.useMemo(() => {
    const c = { campus: 0, building: 0, floor: 0, zone: 0, area: 0 };
    for (const n of allNodes) {
      if (n.type === "CAMPUS") c.campus++;
      else if (n.type === "BUILDING") c.building++;
      else if (n.type === "FLOOR") c.floor++;
      else if (n.type === "ZONE") c.zone++;
      else c.area++;
    }
    return c;
  }, [allNodes]);

  function isActiveNow(n: LocationNode) {
    if (n.isActive === false) return false;
    if (!n.effectiveTo) return true;
    const t = new Date(n.effectiveTo).getTime();
    if (Number.isNaN(t)) return true;
    return t > Date.now();
  }

  async function loadBranches() {
    const rows = await apiFetch<BranchRow[]>("/api/branches");
    setBranches(rows || []);

    const stored = effectiveBranchId || null;
    const first = rows?.[0]?.id;
    const next = (stored && rows?.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

    setBranchId(next);
    if (next && isGlobalScope) setActiveBranchId(next);
  }

  async function loadTree(branchIdVal: string) {
    setErr(null);
    const data = await apiFetch<LocationTreeResponse>(LOC_API.tree(branchIdVal));
    const normalized = normalizeTree(data);
    setCampuses(normalized);

    const firstCampus = normalized?.[0]?.id;
    setExpanded((prev) => {
      if (firstCampus && prev[firstCampus] == null) return { ...prev, [firstCampus]: true };
      return prev;
    });

    setSelectedId((prev) => {
      if (!prev) return firstCampus || null;
      const still = flattenNested(normalized).some((n) => n.id === prev);
      return still ? prev : firstCampus || null;
    });
  }

  async function refreshAll(showToast = false) {
    setBusy(true);
    setErr(null);
    try {
      await loadBranches();
      if (showToast) toast({ title: "Refreshed", description: "Branches reloaded.", duration: 1400 });
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
    void refreshAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const b = branches.find((x) => x.id === branchId) || null;
    setSelectedBranch(b);
    if (b?.id) void loadTree(b.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, branches.length]);

  function toggle(id: string) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return allNodes
      .filter((n) => (n.code || "").toLowerCase().includes(s) || (n.name || "").toLowerCase().includes(s))
      .slice(0, 80);
  }, [q, allNodes]);

  function siblingsForCreate(kind: LocationType, parentId: string | null) {
    if (kind === "CAMPUS") return campuses;
    if (!parentId) return [];
    const parent = allNodes.find((n) => n.id === parentId) || null;
    if (!parent) return [];

    if (kind === "BUILDING") return parent.type === "CAMPUS" ? (parent.buildings ?? []) : [];
    if (kind === "FLOOR") return parent.type === "BUILDING" ? (parent.floors ?? []) : [];
    if (kind === "ZONE") return parent.type === "FLOOR" ? (parent.zones ?? []) : [];
    if (kind === "AREA") return parent.type === "ZONE" ? (parent.areas ?? []) : [];

    return [];
  }

  function uniqueFullCodeOk(fullCode: string, excludeId?: string) {
    const c = String(fullCode ?? "").trim().toUpperCase();
    if (!c) return true;
    return !allNodes.some((n) => n.id !== excludeId && String(n.code ?? "").trim().toUpperCase() === c);
  }

  async function createLocation(branchIdVal: string, body: any) {
    await apiFetch(LOC_API.create(branchIdVal), { method: "POST", body: JSON.stringify(body) });
  }

  async function reviseLocation(id: string, body: any) {
    await apiFetch(LOC_API.update(id), { method: "PATCH", body: JSON.stringify(body) });
  }

  async function retireLocation(id: string, effectiveToIso: string) {
    await apiFetch(LOC_API.update(id), {
      method: "PATCH",
      body: JSON.stringify({
        effectiveFrom: new Date().toISOString(),
        effectiveTo: effectiveToIso,
      }),
    });
  }

  const branchHref = selectedBranch ? `/branches/${encodeURIComponent(selectedBranch.id)}` : "/branches";

  /* -------------------------------------------------------------------------- */
  /*                                  Tree UI                                  */
  /* -------------------------------------------------------------------------- */

  function nodeGlyph(t: LocationType) {
    if (t === "CAMPUS") return MapPin;
    if (t === "BUILDING") return Building2;
    if (t === "FLOOR") return Layers;
    if (t === "ZONE") return CheckCircle2;
    return CircleDot;
  }

  function childInfo(n: LocationNode) {
    if (n.type === "CAMPUS") return { label: "Buildings", count: n.buildings?.length ?? 0 };
    if (n.type === "BUILDING") return { label: "Floors", count: n.floors?.length ?? 0 };
    if (n.type === "FLOOR") return { label: "Zones", count: n.zones?.length ?? 0 };
    if (n.type === "ZONE") return { label: "Areas", count: n.areas?.length ?? 0 };
    return { label: "—", count: 0 };
  }

  function nodeChildren(n: LocationNode) {
    if (n.type === "CAMPUS") return n.buildings ?? [];
    if (n.type === "BUILDING") return n.floors ?? [];
    if (n.type === "FLOOR") return n.zones ?? [];
    if (n.type === "ZONE") return n.areas ?? [];
    return [];
  }

  function TreeRow({
    node,
    depth,
  }: {
    node: LocationNode;
    depth: number;
  }) {
    const isSel = selectedId === node.id;
    const active = isActiveNow(node);
    const kids = nodeChildren(node);
    const hasKids = kids.length > 0;

    const Glyph = nodeGlyph(node.type);
    const { label, count } = childInfo(node);

    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedId(node.id)}
          className={cn(
            "relative w-full rounded-xl border px-3 py-2 text-left transition-all",
            "border-zc-border bg-zc-panel/15 hover:bg-zc-panel/25",
            isSel &&
              "ring-1 ring-indigo-400/50 border-indigo-200/60 bg-indigo-50/40 dark:border-indigo-900/35 dark:bg-indigo-900/15"
          )}
          style={{ marginLeft: depth * 8 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {hasKids ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(node.id);
                    }}
                    className="grid h-7 w-7 place-items-center rounded-xl border border-zc-border bg-zc-panel/20 hover:bg-zc-panel/30"
                    title={expanded[node.id] ? "Collapse" : "Expand"}
                  >
                    {expanded[node.id] ? (
                      <ChevronDown className="h-4 w-4 text-zc-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zc-muted" />
                    )}
                  </span>
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-xl border border-zc-border bg-zc-panel/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-zc-muted/60" />
                  </span>
                )}

                <span className={cn("grid h-7 w-7 place-items-center rounded-xl border", pillTones[typeTone(node.type)])}>
                  <Glyph className="h-4 w-4" />
                </span>

                <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones[typeTone(node.type)])}>
                  {typeLabel(node.type)}
                </span>

                <span className="font-mono text-xs text-zc-muted" title={node.code}>
                  {node.code}
                </span>

                <span className={cn("truncate text-sm font-semibold", active ? "text-zc-text" : "text-zc-muted")}>
                  {node.name}
                </span>

                {hasKids ? (
                  <span className="hidden sm:inline-flex items-center rounded-full border border-zc-border bg-zc-panel/10 px-2 py-0.5 text-[11px] text-zc-muted">
                    {count} {label}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zc-muted">
                <CalendarClock className="h-4 w-4" />
                <span>From: {fmtDateTime(node.effectiveFrom)}</span>
                <span className="text-zc-muted/60">•</span>
                <span>To: {fmtDateTime(node.effectiveTo)}</span>
              </div>
            </div>

            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px]",
                active ? pillTones.emerald : pillTones.zinc
              )}
            >
              {active ? "Active" : "Ended"}
            </span>
          </div>
        </button>

        {hasKids && expanded[node.id] ? (
          <div className="mt-2 grid gap-2 border-l border-zc-border/60 pl-4">
            {kids.map((k) => (
              <TreeRow key={k.id} node={k} depth={depth + 1} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Render                                   */
  /* -------------------------------------------------------------------------- */

  return (
    <AppShell title="Locations">
      <RequirePerm perm="INFRA_LOCATION_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-900/20">
                  <IconBuilding className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                </span>

                <div className="min-w-0">
                  <div className="mt-1 text-3xl font-semibold tracking-tight">
                    Locations (Campus → Building → Floor → Zone → Area)
                  </div>

                  <div className="mt-2 max-w-3xl text-sm leading-6 text-zc-muted">
                    Supports Campus, floorNumber (Floor), accessibility flags, emergency exits and fire zoning.
                  </div>
                </div>
              </div>

              {err ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div className="min-w-0">{err}</div>
                </div>
              ) : null}
            

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={() => void refreshAll(true)} disabled={busy}>
                <RefreshCw className={cn("h-4 w-4", busy ? "animate-spin" : "")} />
                Refresh
              </Button>

              <Button asChild className="gap-2">
                <Link href={branchHref}>
                  <Building2 className="h-4 w-4" />
                  Open Branch
                </Link>
              </Button>
            </div>
          </div>

          {/* Snapshot */}
          <Card className="overflow-hidden">
            <CardHeader className="py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Snapshot</CardTitle>
                  <CardDescription>Branch and location totals.</CardDescription>
                </div>
                <div className="text-sm text-zc-muted">
                  {selectedBranch ? `${selectedBranch.name} (${selectedBranch.code})` : "Select a branch"}
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pb-6 pt-6">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/50 p-4 text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Campuses</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{counts.campus}</div>
                </div>
                <div className="rounded-xl border border-cyan-200/60 bg-cyan-50/50 p-4 text-cyan-800 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-200">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Buildings</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{counts.building}</div>
                </div>
                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Floors</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{counts.floor}</div>
                </div>
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Zones</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{counts.zone}</div>
                </div>
                <div className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-4 text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Areas</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{counts.area}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main */}
          <Card className="overflow-hidden">
            <CardHeader className="py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Locations</CardTitle>
                  <CardDescription>Manage location hierarchy and effective-dated revisions.</CardDescription>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                    <TabsTrigger
                      value="overview"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="hierarchy"
                      className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <Layers className="mr-2 h-4 w-4" />
                      Hierarchy
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="pb-6">
              <Tabs value={activeTab}>
                {/* Overview */}
                <TabsContent value="overview" className="mt-0">
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-zc-accent" />
                        Target Branch
                      </CardTitle>
                      <CardDescription>Select a branch to manage its location hierarchy.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                      {loading ? (
                        <div className="grid gap-3">
                          <div className="h-11 w-full animate-pulse rounded-xl bg-zc-panel/30" />
                          <div className="h-10 w-full animate-pulse rounded-xl bg-zc-panel/30" />
                        </div>
                      ) : (
                        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                          <div className="grid gap-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branch Selector</div>
                            <Select
                              value={branchId}
                              onValueChange={(v) => {
                                setBranchId(v);
                                if (isGlobalScope) setActiveBranchId(v || null);
                              }}
                            >
                              <SelectTrigger className="h-11 rounded-xl bg-zc-card border-zc-border">
                                <SelectValue placeholder="Select a branch…" />
                              </SelectTrigger>
                              <SelectContent>
                                {branches.map((b) => (
                                  <SelectItem key={b.id} value={b.id}>
                                    {b.name}{" "}
                                    <span className="font-mono text-xs text-zc-muted">({b.code})</span>{" "}
                                    <span className="text-xs text-zc-muted">• {b.city}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="text-xs text-zc-muted">Zone codes are numeric. Area codes are A01 or 01.</div>
                          </div>

                          <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Quick actions</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button asChild variant="outline" className="gap-2" disabled={!selectedBranch}>
                                <Link href={branchHref}>
                                  <Building2 className="h-4 w-4" />
                                  Open Branch
                                </Link>
                              </Button>

                              <RequirePerm perm="INFRA_LOCATION_CREATE">
                                <Button
                                  variant="primary"
                                  className="gap-2"
                                  disabled={!selectedBranch}
                                  onClick={() => setCreateState({ open: true, kind: "CAMPUS", parentId: null })}
                                >
                                  <Plus className="h-4 w-4" />
                                  Add Campus
                                </Button>
                              </RequirePerm>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Hierarchy */}
                <TabsContent value="hierarchy" className="mt-0">
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* Tree */}
                    <Card className="overflow-hidden">
                      <CardHeader className="pb-0">
                        <CardTitle className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-zc-accent" />
                            Location Tree
                          </span>

                          <RequirePerm perm="INFRA_LOCATION_CREATE">
                            <Button
                              variant="primary"
                              size="sm"
                              className="gap-2"
                              disabled={!selectedBranch}
                              onClick={() => setCreateState({ open: true, kind: "CAMPUS", parentId: null })}
                            >
                              <Plus className="h-4 w-4" />
                              Add Campus
                            </Button>
                          </RequirePerm>
                        </CardTitle>

                        <CardDescription className="mt-2">
                          Use “Revise” for effective-dated changes. Retire sets an end date (effectiveTo).
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-panel/15 px-3 py-2">
                          <Search className="h-4 w-4 text-zc-muted" />
                          <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by code or name…"
                            className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
                          />
                        </div>

                        <div className="mt-4 grid gap-2">
                          {!selectedBranch ? (
                            <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                              Select a branch to view and manage locations.
                            </div>
                          ) : err ? (
                            <div className="rounded-2xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.10)] p-4 text-sm text-zc-muted">
                              Unable to load tree. Verify backend route and permissions.
                            </div>
                          ) : q.trim() ? (
                            filtered.length ? (
                              <div className="grid gap-2">
                                {filtered.map((n) => (
                                  <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedId(n.id);
                                      setQ("");
                                    }}
                                    className={cn(
                                      "w-full rounded-xl border border-zc-border bg-zc-panel/15 px-3 py-2 text-left transition-all",
                                      "hover:bg-zc-panel/25"
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones[typeTone(n.type)])}>
                                        {typeLabel(n.type)}
                                      </span>
                                      <span className="font-mono text-xs text-zc-muted">{n.code}</span>
                                      <span className="truncate text-sm font-semibold text-zc-text">{n.name}</span>
                                      <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-[11px]", isActiveNow(n) ? pillTones.emerald : pillTones.zinc)}>
                                        {isActiveNow(n) ? "Active" : "Ended"}
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                                No results.
                              </div>
                            )
                          ) : campuses.length ? (
                            <div className="grid gap-2">
                              {campuses.map((c) => (
                                <TreeRow key={c.id} node={c} depth={0} />
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                              No locations yet. Start by adding a Campus.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Details */}
                    <Card className="overflow-hidden">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-zc-accent" />
                          Details
                        </CardTitle>
                        <CardDescription>Inspect and manage the selected node.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {!selectedBranch ? (
                          <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                            Select a branch first.
                          </div>
                        ) : !selectedNode ? (
                          <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                            Select a node from the tree.
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            {/* Summary */}
                            <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones[typeTone(selectedNode.type)])}>
                                      {typeLabel(selectedNode.type)}
                                    </span>
                                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", isActiveNow(selectedNode) ? pillTones.emerald : pillTones.zinc)}>
                                      {isActiveNow(selectedNode) ? "Active" : "Ended"}
                                    </span>
                                  </div>

                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="font-mono text-sm text-zc-muted">{selectedNode.code}</div>
                                    <button
                                      className="grid h-7 w-7 place-items-center rounded-lg border border-zc-border bg-zc-panel/10 hover:bg-zc-panel/25"
                                      title="Copy code"
                                      onClick={() => {
                                        copyText(selectedNode.code);
                                        toast({ title: "Copied", description: "Location code copied.", duration: 1200 });
                                      }}
                                    >
                                      <Copy className="h-4 w-4 text-zc-muted" />
                                    </button>
                                  </div>

                                  <div className="mt-2 text-lg font-semibold text-zc-text">{selectedNode.name}</div>

                                  <div className="mt-3 grid gap-2 text-sm text-zc-muted">
                                    <div className="flex items-center justify-between">
                                      <span>Effective From</span>
                                      <span className="font-mono">{fmtDateTime(selectedNode.effectiveFrom)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Effective To</span>
                                      <span className="font-mono">{fmtDateTime(selectedNode.effectiveTo)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Attributes */}
                            <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4">
                              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">2.2.2 Attributes</div>

                              <div className="mt-3 grid gap-2 text-sm text-zc-muted">
                                {selectedNode.type === "CAMPUS" ? (
                                  <div className="flex items-center justify-between">
                                    <span>GPS</span>
                                    <span className="font-mono">
                                      {selectedNode.gpsLat != null && selectedNode.gpsLng != null
                                        ? `${selectedNode.gpsLat}, ${selectedNode.gpsLng}`
                                        : "—"}
                                    </span>
                                  </div>
                                ) : null}

                                {selectedNode.type === "FLOOR" ? (
                                  <div className="flex items-center justify-between">
                                    <span>Floor Number</span>
                                    <span className="font-mono">{selectedNode.floorNumber ?? "—"}</span>
                                  </div>
                                ) : null}

                                <div className="flex items-center justify-between">
                                  <span>Wheelchair Access</span>
                                  <span className="font-mono">{selectedNode.wheelchairAccess ? "Yes" : "No"}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span>Stretcher Access</span>
                                  <span className="font-mono">{selectedNode.stretcherAccess ? "Yes" : "No"}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span>Emergency Exit</span>
                                  <span className="font-mono">{selectedNode.emergencyExit ? "Yes" : "No"}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span>Fire Zone</span>
                                  <span className="font-mono">{selectedNode.fireZone || "—"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="grid gap-2">
                              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Actions</div>

                              <div className="flex flex-wrap gap-2">
                                <RequirePerm perm="INFRA_LOCATION_UPDATE">
                                  <Button
                                    variant="secondary"
                                    className="gap-2"
                                    onClick={() => setReviseState({ open: true, node: selectedNode })}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Revise
                                  </Button>
                                </RequirePerm>

                                <RequirePerm perm="INFRA_LOCATION_UPDATE">
                                  <Button
                                    variant="destructive"
                                    className="gap-2"
                                    onClick={() => setRetireState({ open: true, node: selectedNode })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Retire
                                  </Button>
                                </RequirePerm>

                                <RequirePerm perm="INFRA_LOCATION_CREATE">
                                  {selectedNode.type === "CAMPUS" ? (
                                    <Button
                                      variant="primary"
                                      className="gap-2"
                                      onClick={() => setCreateState({ open: true, kind: "BUILDING", parentId: selectedNode.id })}
                                    >
                                      <Plus className="h-4 w-4" />
                                      Add Building
                                    </Button>
                                  ) : null}

                                  {selectedNode.type === "BUILDING" ? (
                                    <Button
                                      variant="outline"
                                      className="gap-2"
                                      onClick={() => setCreateState({ open: true, kind: "FLOOR", parentId: selectedNode.id })}
                                    >
                                      <Plus className="h-4 w-4" />
                                      Add Floor
                                    </Button>
                                  ) : null}

                                  {selectedNode.type === "FLOOR" ? (
                                    <Button
                                      variant="outline"
                                      className="gap-2"
                                      onClick={() => setCreateState({ open: true, kind: "ZONE", parentId: selectedNode.id })}
                                    >
                                      <Plus className="h-4 w-4" />
                                      Add Zone
                                    </Button>
                                  ) : null}

                                  {selectedNode.type === "ZONE" ? (
                                    <Button
                                      variant="outline"
                                      className="gap-2"
                                      onClick={() => setCreateState({ open: true, kind: "AREA", parentId: selectedNode.id })}
                                    >
                                      <Plus className="h-4 w-4" />
                                      Add Area
                                    </Button>
                                  ) : null}
                                </RequirePerm>
                              </div>

                              <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                                <div className="font-semibold text-zc-text">Notes</div>
                                <ul className="mt-2 list-disc pl-5 space-y-1">
                                  <li>Use <span className="font-semibold">Revise</span> for changes; do not edit in-place.</li>
                                  <li>Codes are <span className="font-semibold">segment</span> inputs for children (B01/F01/01/A01). Full code is composed from parent path.</li>
                                  <li>GPS is applicable to <span className="font-semibold">Campus</span>. Floor Number is applicable to <span className="font-semibold">Floor</span>.</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* ------------------------------- Create Dialog ------------------------------ */}
          {createState.open && selectedBranch ? (
            <CreateDialog
              kind={createState.kind}
              branch={selectedBranch}
              parentId={createState.parentId}
              allNodes={allNodes}
              siblings={siblingsForCreate(createState.kind, createState.parentId)}
              busy={busy}
              onClose={() => setCreateState((p) => ({ ...p, open: false }))}
              onCreate={async (v) => {
                try {
                  setBusy(true);

                  const parent = createState.parentId ? allNodes.find((n) => n.id === createState.parentId) || null : null;
                  const parentFull = parent?.code ?? "";

                  const codeErr = validateSegmentCode(createState.kind, v.code);
                  if (codeErr) throw new Error(codeErr);

                  const nameErr = validateName(v.name);
                  if (nameErr) throw new Error(nameErr);

                  const fullPreview = composeFullCode(createState.kind, v.code, parentFull);
                  if (!fullPreview) throw new Error("Invalid code.");
                  if (!uniqueFullCodeOk(fullPreview)) throw new Error("Duplicate code: full location code already exists in this branch.");

                  const iso = toIsoFromLocal(v.effectiveFrom);
                  if (!iso) throw new Error("Invalid effective date/time.");

                  // GPS pairing validation (frontend)
                  if (createState.kind === "CAMPUS") {
                    const hasLat = v.gpsLat !== "" && v.gpsLat != null;
                    const hasLng = v.gpsLng !== "" && v.gpsLng != null;
                    if (hasLat !== hasLng) throw new Error("Provide both GPS latitude and longitude together.");
                  }

                  const body: any = {
                    kind: createState.kind,
                    parentId: createState.parentId ?? null,
                    code: String(v.code).trim(),
                    name: String(v.name).trim(),
                    effectiveFrom: iso,

                    wheelchairAccess: !!v.wheelchairAccess,
                    stretcherAccess: !!v.stretcherAccess,
                    emergencyExit: !!v.emergencyExit,
                    fireZone: v.fireZone?.trim() ? v.fireZone.trim() : undefined,
                  };

                  if (createState.kind === "CAMPUS" && v.gpsLat !== "" && v.gpsLng !== "") {
                    const lat = Number(v.gpsLat);
                    const lng = Number(v.gpsLng);
                    if (Number.isFinite(lat) && Number.isFinite(lng)) {
                      body.gpsLat = lat;
                      body.gpsLng = lng;
                    }
                  }

                  if (createState.kind === "FLOOR" && v.floorNumber !== "") {
                    const fn = Number(v.floorNumber);
                    if (Number.isFinite(fn)) body.floorNumber = Math.trunc(fn);
                  }

                  await createLocation(selectedBranch.id, body);

                  toast({ title: "Created", description: `${typeLabel(createState.kind)} created successfully.`, duration: 1600 });
                  setCreateState((p) => ({ ...p, open: false }));
                  await loadTree(selectedBranch.id);
                } catch (e: any) {
                  toast({ title: "Create failed", description: e?.message || "Unable to create location.", variant: "destructive" as any });
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}

          {/* ------------------------------- Revise Dialog ------------------------------ */}
          {reviseState.open && selectedBranch && reviseState.node ? (
            <ReviseDialog
              node={reviseState.node}
              allNodes={allNodes}
              busy={busy}
              onClose={() => setReviseState({ open: false, node: null })}
              onRevise={async (v) => {
                try {
                  setBusy(true);

                  const node = reviseState.node!;
                  const parent = node.parentId ? allNodes.find((n) => n.id === node.parentId) || null : null;
                  const parentFull = parent?.code ?? "";

                  const codeErr = validateSegmentCode(node.type, v.code);
                  if (codeErr) throw new Error(codeErr);

                  const nameErr = validateName(v.name);
                  if (nameErr) throw new Error(nameErr);

                  const fullPreview = composeFullCode(node.type, v.code, parentFull);
                  if (!fullPreview) throw new Error("Invalid code.");
                  if (!uniqueFullCodeOk(fullPreview, node.id)) throw new Error("Duplicate code: full location code already exists in this branch.");

                  const iso = toIsoFromLocal(v.effectiveFrom);
                  if (!iso) throw new Error("Invalid effective date/time.");

                  // GPS pairing validation (frontend)
                  if (node.type === "CAMPUS") {
                    const hasLat = v.gpsLat !== "" && v.gpsLat != null;
                    const hasLng = v.gpsLng !== "" && v.gpsLng != null;
                    if (hasLat !== hasLng) throw new Error("Provide both GPS latitude and longitude together.");
                  }

                  const body: any = {
                    code: String(v.code).trim(),
                    name: String(v.name).trim(),
                    effectiveFrom: iso,

                    wheelchairAccess: !!v.wheelchairAccess,
                    stretcherAccess: !!v.stretcherAccess,
                    emergencyExit: !!v.emergencyExit,
                    // allow clearing by sending empty string (backend should convert to null)
                    fireZone: v.fireZone ?? "",
                  };

                  if (node.type === "CAMPUS" && v.gpsLat !== "" && v.gpsLng !== "") {
                    const lat = Number(v.gpsLat);
                    const lng = Number(v.gpsLng);
                    if (Number.isFinite(lat) && Number.isFinite(lng)) {
                      body.gpsLat = lat;
                      body.gpsLng = lng;
                    }
                  }

                  if (node.type === "FLOOR" && v.floorNumber !== "") {
                    const fn = Number(v.floorNumber);
                    if (Number.isFinite(fn)) body.floorNumber = Math.trunc(fn);
                  }

                  await reviseLocation(node.id, body);

                  toast({ title: "Revised", description: "Effective-dated revision created.", duration: 1600 });
                  setReviseState({ open: false, node: null });
                  await loadTree(selectedBranch.id);
                } catch (e: any) {
                  toast({ title: "Revise failed", description: e?.message || "Unable to revise location.", variant: "destructive" as any });
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}

          {/* ------------------------------- Retire Dialog ------------------------------ */}
          {retireState.open && selectedBranch && retireState.node ? (
            <RetireDialog
              node={retireState.node}
              busy={busy}
              onClose={() => setRetireState({ open: false, node: null })}
              onRetire={async (v) => {
                try {
                  setBusy(true);
                  const iso = toIsoFromLocal(v.effectiveTo);
                  if (!iso) throw new Error("Invalid end date/time.");

                  await retireLocation(retireState.node!.id, iso);
                  toast({ title: "Retired", description: "Location end-dated successfully.", duration: 1600 });

                  setRetireState({ open: false, node: null });
                  await loadTree(selectedBranch.id);
                } catch (e: any) {
                  toast({ title: "Retire failed", description: e?.message || "Unable to retire location.", variant: "destructive" as any });
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
        </div>
      </RequirePerm>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Dialogs                                  */
/* -------------------------------------------------------------------------- */

function DrawerDialogContent({ children }: { children: React.ReactNode }) {
  return (
    <DialogContent
      className={cn(
        "left-auto right-0 top-0 h-screen w-[95vw] max-w-[980px] translate-x-0 translate-y-0 rounded-2xl",
        "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
        "shadow-2xl shadow-indigo-500/10 overflow-y-auto"
      )}
      onInteractOutside={(e) => e.preventDefault()}
    >
      {children}
    </DialogContent>
  );
}

type CreateDialogValues = {
  code: string;
  name: string;
  effectiveFrom: string;

  gpsLat: string;
  gpsLng: string;
  floorNumber: string;

  wheelchairAccess: boolean;
  stretcherAccess: boolean;
  emergencyExit: boolean;
  fireZone: string;
};

function CreateDialog({
  kind,
  branch,
  parentId,
  allNodes,
  siblings,
  busy,
  onClose,
  onCreate,
}: {
  kind: LocationType;
  branch: BranchRow;
  parentId: string | null;
  allNodes: LocationNode[];
  siblings: LocationNode[];
  busy: boolean;
  onClose: () => void;
  onCreate: (v: CreateDialogValues) => void;
}) {
  const parent = React.useMemo(() => (parentId ? allNodes.find((n) => n.id === parentId) || null : null), [parentId, allNodes]);
  const parentFullCode = parent?.code ?? "";
  const [code, setCode] = React.useState(() => suggestCode(kind, siblings));
  const [name, setName] = React.useState("");
  const [effectiveFrom, setEffectiveFrom] = React.useState(nowLocalDateTime());

  const [gpsLat, setGpsLat] = React.useState("");
  const [gpsLng, setGpsLng] = React.useState("");
  const [floorNumber, setFloorNumber] = React.useState("");

  const [wheelchairAccess, setWheelchairAccess] = React.useState(false);
  const [stretcherAccess, setStretcherAccess] = React.useState(false);
  const [emergencyExit, setEmergencyExit] = React.useState(false);
  const [fireZone, setFireZone] = React.useState("");

  const segErr = validateSegmentCode(kind, code);
  const nameErr = validateName(name);

  const fullPreview = React.useMemo(() => composeFullCode(kind, code, parentFullCode), [kind, code, parentFullCode]);
  const fullConflict = React.useMemo(() => {
    const x = String(fullPreview ?? "").trim().toUpperCase();
    if (!x) return false;
    return allNodes.some((n) => String(n.code ?? "").trim().toUpperCase() === x);
  }, [fullPreview, allNodes]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DrawerDialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {`Add ${typeLabel(kind)}`}
          </DialogTitle>
          <DialogDescription>
            Branch: {branch.name} ({branch.code})
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="grid gap-4">
          <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
            <div className="font-semibold text-zc-text">Code preview</div>
            <div className="mt-2">
              Segment: <span className="font-mono text-zc-text">{code || "—"}</span>
              <span className="mx-2 text-zc-muted/60">→</span>
              Full: <span className="font-mono text-zc-text">{fullPreview || "—"}</span>
            </div>
            <div className="mt-2 text-xs">
              You enter only the <span className="font-semibold text-zc-text">segment</span> (B01/F01/01/A01). Backend composes full code.
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Code (Segment)</div>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={kind === "ZONE" ? "e.g., 01" : kind === "AREA" ? "e.g., A01" : kind === "CAMPUS" ? "e.g., C01" : kind === "BUILDING" ? "e.g., B01" : "e.g., F01"}
              className="h-11 rounded-xl"
            />
            {segErr ? <div className="text-xs text-[rgb(var(--zc-danger))]">{segErr}</div> : null}
            {!segErr && fullConflict ? <div className="text-xs text-[rgb(var(--zc-danger))]">Duplicate full code exists in this branch.</div> : null}
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Enter ${typeLabel(kind)} name`} className="h-11 rounded-xl" />
            {nameErr ? <div className="text-xs text-[rgb(var(--zc-danger))]">{nameErr}</div> : null}
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Effective From</div>
            <Input type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="h-11 rounded-xl" />
          </div>

          {/* Conditional: GPS for campus */}
          {kind === "CAMPUS" ? (
            <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">GPS Coordinates</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-xs text-zc-muted">Latitude</div>
                  <Input value={gpsLat} onChange={(e) => setGpsLat(e.target.value)} placeholder="e.g., 12.9716" className="h-11 rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs text-zc-muted">Longitude</div>
                  <Input value={gpsLng} onChange={(e) => setGpsLng(e.target.value)} placeholder="e.g., 77.5946" className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="mt-2 text-xs text-zc-muted">Provide both fields together (optional).</div>
            </div>
          ) : null}

          {/* Conditional: floorNumber on FLOOR */}
          {kind === "FLOOR" ? (
            <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Floor Number</div>
              <div className="mt-3 grid gap-2">
                <Input
                  type="number"
                  value={floorNumber}
                  onChange={(e) => setFloorNumber(e.target.value)}
                  placeholder="e.g., 1"
                  className="h-11 rounded-xl"
                />
                <div className="text-xs text-zc-muted">Stored on FLOOR nodes only (per your requirement).</div>
              </div>
            </div>
          ) : null}

          {/* Common: accessibility + emergency + fire zone */}
          <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Safety & Accessibility</div>

            <div className="mt-3 grid gap-3">
              <label className="flex items-center gap-3 text-sm text-zc-muted">
                <Checkbox checked={wheelchairAccess} onCheckedChange={(v) => setWheelchairAccess(Boolean(v))} />
                Wheelchair access
              </label>

              <label className="flex items-center gap-3 text-sm text-zc-muted">
                <Checkbox checked={stretcherAccess} onCheckedChange={(v) => setStretcherAccess(Boolean(v))} />
                Stretcher access
              </label>

              <label className="flex items-center gap-3 text-sm text-zc-muted">
                <Checkbox checked={emergencyExit} onCheckedChange={(v) => setEmergencyExit(Boolean(v))} />
                Emergency exit marker
              </label>

              <div className="grid gap-2">
                <div className="text-xs text-zc-muted">Fire zone</div>
                <Input value={fireZone} onChange={(e) => setFireZone(e.target.value)} placeholder="e.g., FZ-1" className="h-11 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} type="button" disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onCreate({
                code,
                name,
                effectiveFrom,
                gpsLat,
                gpsLng,
                floorNumber,
                wheelchairAccess,
                stretcherAccess,
                emergencyExit,
                fireZone,
              })
            }
            type="button"
            disabled={busy || !!segErr || !!nameErr || fullConflict}
          >
            Create
          </Button>
        </DialogFooter>
      </DrawerDialogContent>
    </Dialog>
  );
}

type ReviseDialogValues = {
  code: string;
  name: string;
  effectiveFrom: string;

  gpsLat: string;
  gpsLng: string;
  floorNumber: string;

  wheelchairAccess: boolean;
  stretcherAccess: boolean;
  emergencyExit: boolean;
  fireZone: string;
};

function ReviseDialog({
  node,
  allNodes,
  busy,
  onClose,
  onRevise,
}: {
  node: LocationNode;
  allNodes: LocationNode[];
  busy: boolean;
  onClose: () => void;
  onRevise: (v: ReviseDialogValues) => void;
}) {
  const parent = React.useMemo(
    () => (node.parentId ? allNodes.find((n) => n.id === node.parentId) || null : null),
    [node.parentId, allNodes]
  );
  const parentFullCode = parent?.code ?? "";

  // IMPORTANT: backend expects SEGMENT in update for non-campus kinds
  const initialSegment = node.type === "CAMPUS" ? node.code : tailSegment(node.code);

  const [code, setCode] = React.useState(initialSegment);
  const [name, setName] = React.useState(node.name || "");
  const [effectiveFrom, setEffectiveFrom] = React.useState(nowLocalDateTime());

  const [gpsLat, setGpsLat] = React.useState(node.gpsLat != null ? String(node.gpsLat) : "");
  const [gpsLng, setGpsLng] = React.useState(node.gpsLng != null ? String(node.gpsLng) : "");
  const [floorNumber, setFloorNumber] = React.useState(node.floorNumber != null ? String(node.floorNumber) : "");

  const [wheelchairAccess, setWheelchairAccess] = React.useState(!!node.wheelchairAccess);
  const [stretcherAccess, setStretcherAccess] = React.useState(!!node.stretcherAccess);
  const [emergencyExit, setEmergencyExit] = React.useState(!!node.emergencyExit);
  const [fireZone, setFireZone] = React.useState(node.fireZone ?? "");

  const segErr = validateSegmentCode(node.type, code);
  const nameErr = validateName(name);

  const fullPreview = React.useMemo(() => composeFullCode(node.type, code, parentFullCode), [node.type, code, parentFullCode]);
  const fullConflict = React.useMemo(() => {
    const x = String(fullPreview ?? "").trim().toUpperCase();
    if (!x) return false;
    return allNodes.some((n) => n.id !== node.id && String(n.code ?? "").trim().toUpperCase() === x);
  }, [fullPreview, allNodes, node.id]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DrawerDialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Pencil className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {`Revise ${typeLabel(node.type)}`}
          </DialogTitle>
          <DialogDescription>Create a new effective-dated revision.</DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="grid gap-4">
          <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm">
            <div className="text-zc-muted">Current</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones[typeTone(node.type)])}>
                {typeLabel(node.type)}
              </span>
              <span className="font-mono text-xs text-zc-muted">{node.code}</span>
              <span className="text-sm font-semibold text-zc-text">{node.name}</span>
            </div>
            <div className="mt-2 text-xs text-zc-muted">
              Effective: {fmtDateTime(node.effectiveFrom)} → {fmtDateTime(node.effectiveTo)}
            </div>
          </div>

          <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
            <div className="font-semibold text-zc-text">Code preview</div>
            <div className="mt-2">
              Segment: <span className="font-mono text-zc-text">{code || "—"}</span>
              <span className="mx-2 text-zc-muted/60">→</span>
              Full: <span className="font-mono text-zc-text">{fullPreview || "—"}</span>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">New Code (Segment)</div>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-11 rounded-xl" />
            {segErr ? <div className="text-xs text-[rgb(var(--zc-danger))]">{segErr}</div> : null}
            {!segErr && fullConflict ? <div className="text-xs text-[rgb(var(--zc-danger))]">Duplicate full code exists in this branch.</div> : null}
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">New Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
            {nameErr ? <div className="text-xs text-[rgb(var(--zc-danger))]">{nameErr}</div> : null}
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Effective From</div>
            <Input type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="h-11 rounded-xl" />
          </div>

          {node.type === "CAMPUS" ? (
            <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">GPS Coordinates</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-xs text-zc-muted">Latitude</div>
                  <Input value={gpsLat} onChange={(e) => setGpsLat(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs text-zc-muted">Longitude</div>
                  <Input value={gpsLng} onChange={(e) => setGpsLng(e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="mt-2 text-xs text-zc-muted">Provide both fields together (optional).</div>
            </div>
          ) : null}

          {node.type === "FLOOR" ? (
            <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Floor Number</div>
              <div className="mt-3 grid gap-2">
                <Input type="number" value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Safety & Accessibility</div>

            <div className="mt-3 grid gap-3">
              <label className="flex items-center gap-3 text-sm text-zc-muted">
                <Checkbox checked={wheelchairAccess} onCheckedChange={(v) => setWheelchairAccess(Boolean(v))} />
                Wheelchair access
              </label>

              <label className="flex items-center gap-3 text-sm text-zc-muted">
                <Checkbox checked={stretcherAccess} onCheckedChange={(v) => setStretcherAccess(Boolean(v))} />
                Stretcher access
              </label>

              <label className="flex items-center gap-3 text-sm text-zc-muted">
                <Checkbox checked={emergencyExit} onCheckedChange={(v) => setEmergencyExit(Boolean(v))} />
                Emergency exit marker
              </label>

              <div className="grid gap-2">
                <div className="text-xs text-zc-muted">Fire zone</div>
                <Input value={fireZone} onChange={(e) => setFireZone(e.target.value)} placeholder="Set empty to clear" className="h-11 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} type="button" disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onRevise({
                code,
                name,
                effectiveFrom,
                gpsLat,
                gpsLng,
                floorNumber,
                wheelchairAccess,
                stretcherAccess,
                emergencyExit,
                fireZone,
              })
            }
            type="button"
            disabled={busy || !!segErr || !!nameErr || fullConflict}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Create Revision
          </Button>
        </DialogFooter>
      </DrawerDialogContent>
    </Dialog>
  );
}

function RetireDialog({
  node,
  busy,
  onClose,
  onRetire,
}: {
  node: LocationNode;
  busy: boolean;
  onClose: () => void;
  onRetire: (v: { effectiveTo: string }) => void;
}) {
  const [effectiveTo, setEffectiveTo] = React.useState(nowLocalDateTime());

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DrawerDialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            {`Retire ${typeLabel(node.type)}`}
          </DialogTitle>
          <DialogDescription>End-dates the location (effectiveTo).</DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="grid gap-4">
          <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-900/15 p-4 text-sm text-zc-muted">
            <div className="font-semibold text-amber-800 dark:text-amber-200">Careful</div>
            <div className="mt-1">
              Retiring a location can impact units/rooms/resources bound to it. Backend should block retire if active dependencies exist.
            </div>
          </div>

          <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm">
            <div className="text-zc-muted">Target</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-zc-muted">{node.code}</span>
              <span className="text-sm font-semibold text-zc-text">{node.name}</span>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Effective To</div>
            <Input type="datetime-local" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} type="button" disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => onRetire({ effectiveTo })} type="button" disabled={busy} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Retire
          </Button>
        </DialogFooter>
      </DrawerDialogContent>
    </Dialog>
  );
}
