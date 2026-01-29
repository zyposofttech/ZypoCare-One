"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { IconBuilding } from "@/components/icons";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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

type LocationType = "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE";

type LocationNode = {
  id: string;
  branchId: string;
  type: LocationType;
  parentId?: string | null;

  code: string;
  name: string;

  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive?: boolean;

  // Nested shape support
  buildings?: LocationNode[];
  floors?: LocationNode[];
  zones?: LocationNode[];
};

type LocationTreeResponse =
  | { campuses: LocationNode[] }
  | { items: LocationNode[] }
  | { data: LocationNode[] }
  | any;

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

const LS_BRANCH = "zc.superadmin.infrastructure.branchId";

const pillTones = {
  indigo:
    "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
  rose:
    "border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200",
  cyan:
    "border-cyan-200/70 bg-cyan-50/70 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-200",
  zinc: "border-zc-border bg-zc-panel/20 text-zc-text",
};

function MetricPill({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  tone: keyof typeof pillTones;
  icon?: React.ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", pillTones[tone])}>
      {icon ? <span className="grid place-items-center">{icon}</span> : null}
      <span className="font-medium">{label}</span>
      <span className="text-zc-muted/70">•</span>
      <span className="font-mono font-semibold">{value}</span>
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
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
  // yyyy-MM-ddThh:mm (for datetime-local)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoFromLocal(local: string) {
  // local = yyyy-MM-ddThh:mm
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function readLS(key: string) {
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

function copyText(text: string) {
  try {
    void navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

function typeLabel(t: LocationType) {
  if (t === "CAMPUS") return "Campus";
  if (t === "BUILDING") return "Building";
  if (t === "FLOOR") return "Floor";
  return "Zone";
}

function typeTone(t: LocationType): keyof typeof pillTones {
  if (t === "CAMPUS") return "indigo";
  if (t === "BUILDING") return "cyan";
  if (t === "FLOOR") return "emerald";
  return "amber";
}

/**
 * Minimal frontend validation. Backend naming.util.ts remains the final authority.
 * - All codes: uppercase A-Z0-9 and hyphen, 1..24
 * - Zone: numeric only (per your preference)
 */
function validateCode(type: LocationType, codeRaw: string): string | null {
  const code = String(codeRaw ?? "").trim();
  if (!code) return "Code is required.";
  if (code.length > 24) return "Code too long (max 24).";
  if (type === "ZONE") {
    if (!/^\d+$/.test(code)) return "Zone code must be numeric only (e.g., 01, 1, 101).";
    return null;
  }
  if (!/^[A-Z0-9-]+$/.test(code.toUpperCase())) return "Code must be A-Z / 0-9 / '-' only.";
  return null;
}

function validateName(nameRaw: string): string | null {
  const name = String(nameRaw ?? "").trim();
  if (!name) return "Name is required.";
  if (name.length > 80) return "Name too long (max 80).";
  return null;
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

  // Build from flat items using parentId; top-level are CAMPUS or parentId null
  const map = new Map<string, FlatNode>();
  for (const it of items) map.set(it.id, { ...(it as any), children: [] });

  const roots: FlatNode[] = [];
  for (const n of map.values()) {
    const pid = n.parentId || null;
    if (!pid || !map.has(pid)) roots.push(n);
    else map.get(pid)!.children.push(n);
  }

  // Convert children to typed nesting buckets
  const toNested = (n: FlatNode): LocationNode => {
    const kids = n.children.slice().sort((a, b) => a.code.localeCompare(b.code));
    const out: LocationNode = { ...n };
    delete (out as any).children;

    if (out.type === "CAMPUS") out.buildings = kids.map(toNested);
    else if (out.type === "BUILDING") out.floors = kids.map(toNested);
    else if (out.type === "FLOOR") out.zones = kids.map(toNested);

    return out;
  };

  return roots
    .filter((r) => r.type === "CAMPUS" || !r.parentId)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(toNested);
}

function flattenNested(campuses: LocationNode[]) {
  const list: LocationNode[] = [];
  const visitCampus = (c: LocationNode) => {
    list.push(c);
    for (const b of c.buildings ?? []) {
      list.push(b);
      for (const f of b.floors ?? []) {
        list.push(f);
        for (const z of f.zones ?? []) list.push(z);
      }
    }
  };
  for (const c of campuses) visitCampus(c);
  return list;
}

/* -------------------------------------------------------------------------- */
/*                                 ModalShell                                 */
/* -------------------------------------------------------------------------- */

function ModalShell({
  title,
  description,
  children,
  onClose,
  maxW = "max-w-2xl",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  maxW?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-in fade-in duration-200">
      <div className={cn("w-full rounded-2xl border border-zc-border bg-zc-card shadow-elev-2 animate-in zoom-in-95 duration-200", maxW)}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-zc-text">{title}</div>
              {description ? <div className="mt-1 text-sm text-zc-muted">{description}</div> : null}
            </div>
            <Button variant="ghost" size="iconSm" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          </div>
        </div>
        <Separator />
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[980px] translate-x-0 translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

/* -------------------------------------------------------------------------- */
/*                             Create/Revise Forms                             */
/* -------------------------------------------------------------------------- */

type CreateKind = LocationType;

type CreateState = {
  open: boolean;
  kind: CreateKind;
  parentId?: string | null;
};

type ReviseState = {
  open: boolean;
  node: LocationNode | null;
};

type RetireState = {
  open: boolean;
  node: LocationNode | null;
};

function tailSegment(fullCode: string) {
  const s = String(fullCode ?? "").trim();
  if (!s) return "";
  const parts = s.split("-").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : s;
}

function composeFullCodeForCreate(kind: LocationType, segmentRaw: string, parentFullCode?: string | null) {
  const seg = String(segmentRaw ?? "").trim().toUpperCase();
  if (!seg) return "";
  if (kind === "CAMPUS") return seg;

  const parent = String(parentFullCode ?? "").trim().toUpperCase();
  if (!parent) return seg;

  return `${parent}-${seg}`;
}

function suggestCode(kind: LocationType, siblings: LocationNode[]) {
  // Suggest segment codes. Backend composes the full code using parent code + segment.
  // We must compare against the sibling *segments* (tail of full code), not the full codes.
  const pad2 = (n: number) => String(n).padStart(2, "0");

  if (kind === "ZONE") {
    const existing = new Set(
      siblings
        .map((s) => tailSegment(s.code))
        .map((seg) => {
          const n = Number.parseInt(String(seg ?? "").trim(), 10);
          return Number.isFinite(n) ? String(n) : "";
        })
        .filter(Boolean),
    );

    for (let i = 1; i < 500; i++) {
      const norm = String(i);
      if (!existing.has(norm)) return pad2(i);
    }
    return "01";
  }

  const existing = new Set(siblings.map((s) => tailSegment(s.code).toUpperCase()).filter(Boolean));

  const prefix =
    kind === "CAMPUS" ? "C" : kind === "BUILDING" ? "B" : kind === "FLOOR" ? "F" : "X";

  for (let i = 1; i < 500; i++) {
    const seg = `${prefix}${pad2(i)}`;
    if (!existing.has(seg)) return seg;
  }
  return `${prefix}01`;
}
/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function SuperAdminInfrastructureLocations() {
  const { toast } = useToast();

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
  const [activeTab, setActiveTab] = React.useState<"overview" | "hierarchy">("overview");

  const [createState, setCreateState] = React.useState<CreateState>({ open: false, kind: "CAMPUS", parentId: null });
  const [reviseState, setReviseState] = React.useState<ReviseState>({ open: false, node: null });
  const [retireState, setRetireState] = React.useState<RetireState>({ open: false, node: null });

  const allNodes = React.useMemo(() => flattenNested(campuses), [campuses]);
  const selectedNode = React.useMemo(
    () => (selectedId ? allNodes.find((n) => n.id === selectedId) || null : null),
    [selectedId, allNodes]
  );

  const counts = React.useMemo(() => {
    const c = { campus: 0, building: 0, floor: 0, zone: 0 };
    for (const n of allNodes) {
      if (n.type === "CAMPUS") c.campus++;
      else if (n.type === "BUILDING") c.building++;
      else if (n.type === "FLOOR") c.floor++;
      else c.zone++;
    }
    return c;
  }, [allNodes]);

  async function loadBranches() {
    const rows = await apiFetch<BranchRow[]>("/api/branches");
    setBranches(rows || []);

    const stored = readLS(LS_BRANCH);
    const first = rows?.[0]?.id;
    const next = (stored && rows?.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

    setBranchId(next);
    if (next) writeLS(LS_BRANCH, next);
  }

  async function loadTree(branchIdVal: string) {
    setErr(null);
    try {
      const data = await apiFetch<LocationTreeResponse>(LOC_API.tree(branchIdVal));
      const normalized = normalizeTree(data);
      setCampuses(normalized);

      // Expand first campus by default on first load
      const firstCampus = normalized?.[0]?.id;
      setExpanded((prev) => {
        if (firstCampus && prev[firstCampus] == null) return { ...prev, [firstCampus]: true };
        return prev;
      });

      // Keep selection if still exists
      setSelectedId((prev) => {
        if (!prev) return firstCampus || null;
        const still = flattenNested(normalized).some((n) => n.id === prev);
        return still ? prev : firstCampus || null;
      });
    } catch (e: any) {
      setCampuses([]);
      setSelectedId(null);
      setErr(e?.message || "Unable to load location tree.");
    }
  }

  async function loadAll(showToast = false) {
    setBusy(true);
    setErr(null);
    try {
      await loadBranches();
      if (showToast) toast({ title: "Refreshed", description: "Loaded latest branch list.", duration: 1500 });
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
    void loadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const b = branches.find((x) => x.id === branchId) || null;
    setSelectedBranch(b);
    if (b?.id) void loadTree(b.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, branches.length]);

  /* ---------------------------- tree render helpers --------------------------- */

  function toggle(id: string) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  function isActiveNow(n: LocationNode) {
    // Active if no effectiveTo or effectiveTo in future
    if (n.isActive === false) return false;
    if (!n.effectiveTo) return true;
    const t = new Date(n.effectiveTo).getTime();
    if (Number.isNaN(t)) return true;
    return t > Date.now();
  }

  function rowPill(n: LocationNode) {
    const active = isActiveNow(n);
    return active ? (
      <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>Active</span>
    ) : (
      <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.zinc)}>Ended</span>
    );
  }

 function TreeRow({
  node,
  depth,
  hasChildren,
  children,
}: {
  node: LocationNode;
  depth: number;
  hasChildren: boolean;
  children?: React.ReactNode;
}) {
  const active = isActiveNow(node);
  const isSel = selectedId === node.id;

  const Accent =
    node.type === "CAMPUS"
      ? "bg-indigo-500/70 dark:bg-indigo-400/60"
      : node.type === "BUILDING"
      ? "bg-cyan-500/70 dark:bg-cyan-400/60"
      : node.type === "FLOOR"
      ? "bg-emerald-500/70 dark:bg-emerald-400/60"
      : "bg-amber-500/70 dark:bg-amber-400/60";

  const Glyph =
    node.type === "CAMPUS"
      ? MapPin
      : node.type === "BUILDING"
      ? Building2
      : node.type === "FLOOR"
      ? Layers
      : CheckCircle2;

  const childCount = hasChildren
    ? node.type === "CAMPUS"
      ? (node.buildings?.length ?? 0)
      : node.type === "BUILDING"
      ? (node.floors?.length ?? 0)
      : (node.zones?.length ?? 0)
    : 0;

  const childLabel = node.type === "CAMPUS" ? "Buildings" : node.type === "BUILDING" ? "Floors" : "Zones";

  return (
    <div>
      <button
        type="button"
        onClick={() => setSelectedId(node.id)}
        className={cn(
          "relative w-full rounded-xl border px-3 py-2 text-left transition-all",
          "border-zc-border bg-zc-panel/15 hover:bg-zc-panel/25",
          isSel &&
            "ring-1 ring-indigo-400/50 border-indigo-200/60 bg-indigo-50/40 dark:border-indigo-900/35 dark:bg-indigo-900/15",
        )}
        style={{ marginLeft: depth * 4 }}
      >
        <span className={cn("absolute left-0 top-2 bottom-2 w-1 rounded-full", Accent)} />

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {hasChildren ? (
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

              {hasChildren ? (
                <span className="hidden sm:inline-flex items-center rounded-full border border-zc-border bg-zc-panel/10 px-2 py-0.5 text-[11px] text-zc-muted">
                  {childCount} {childLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">{rowPill(node)}</div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zc-muted">
          <CalendarClock className="h-4 w-4" />
          <span>From: {fmtDateTime(node.effectiveFrom)}</span>
          <span className="text-zc-muted/60">•</span>
          <span>To: {fmtDateTime(node.effectiveTo)}</span>
        </div>
      </button>

      {hasChildren && expanded[node.id] ? (
        <div className="mt-2 grid gap-2 border-l border-zc-border/60 pl-4" style={{ marginLeft: depth * 10 + 10 }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

  function renderTree() {
    return campuses.map((c) => (
      <TreeRow
        key={c.id}
        node={c}
        depth={0}
        hasChildren={(c.buildings?.length ?? 0) > 0}
        children={(c.buildings ?? []).map((b) => (
          <TreeRow
            key={b.id}
            node={b}
            depth={1}
            hasChildren={(b.floors?.length ?? 0) > 0}
            children={(b.floors ?? []).map((f) => (
              <TreeRow
                key={f.id}
                node={f}
                depth={2}
                hasChildren={(f.zones?.length ?? 0) > 0}
                children={(f.zones ?? []).map((z) => (
                  <TreeRow key={z.id} node={z} depth={3} hasChildren={false} />
                ))}
              />
            ))}
          />
        ))}
      />
    ));
  }

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return allNodes
      .filter((n) => (n.code || "").toLowerCase().includes(s) || (n.name || "").toLowerCase().includes(s))
      .slice(0, 50);
  }, [q, allNodes]);

  /* ------------------------------ CRUD handlers ------------------------------ */

  function siblingsForCreate(kind: LocationType, parentId: string | null | undefined) {
    if (kind === "CAMPUS") return campuses;
    if (!parentId) return [];
    const parent = allNodes.find((n) => n.id === parentId) || null;
    if (!parent) return [];
    if (kind === "BUILDING") return parent.type === "CAMPUS" ? (parent.buildings ?? []) : [];
    if (kind === "FLOOR") return parent.type === "BUILDING" ? (parent.floors ?? []) : [];
    if (kind === "ZONE") return parent.type === "FLOOR" ? (parent.zones ?? []) : [];
    return [];
  }

  function isUniqueCodeWithinBranch(codeRaw: string, excludeId?: string) {
    const c = String(codeRaw ?? "").trim().toUpperCase();
    if (!c) return true;
    return !allNodes.some((n) => n.id !== excludeId && String(n.code ?? "").trim().toUpperCase() === c);
  }

  async function createLocation(payload: {
    kind: LocationType;
    branchId: string;
    parentId?: string | null;
    code: string;
    name: string;
    effectiveFrom: string; // ISO
  }) {
    await apiFetch(LOC_API.create(payload.branchId), {
      method: "POST",
      body: JSON.stringify({
        kind: payload.kind,
        parentId: payload.parentId ?? null,
        code: payload.code,
        name: payload.name,
        effectiveFrom: payload.effectiveFrom,
      }),
    });
  }

  async function reviseLocation(payload: {
    id: string;
    code: string;
    name: string;
    effectiveFrom: string; // ISO
  }) {
    await apiFetch(LOC_API.update(payload.id), {
      method: "PATCH",
      body: JSON.stringify({
        code: payload.code,
        name: payload.name,
        effectiveFrom: payload.effectiveFrom,
      }),
    });
  }

  async function retireLocation(payload: { id: string; effectiveTo: string }) {
    // Backend uses effective-dated revisions. We create a final version effective now, ending at effectiveTo.
    await apiFetch(LOC_API.update(payload.id), {
      method: "PATCH",
      body: JSON.stringify({
        effectiveFrom: new Date().toISOString(),
        effectiveTo: payload.effectiveTo,
      }),
    });
  }


  /* -------------------------------------------------------------------------- */
  /*                                   Render                                   */
  /* -------------------------------------------------------------------------- */

  const branchHref = selectedBranch ? `/superadmin/branches/${encodeURIComponent(selectedBranch.id)}` : "/superadmin/branches";

  return (
    <AppShell title="Locations">
      <div className="grid gap-6">
        {/* Header (matches Branch Details visual language) */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-900/20">
                <IconBuilding className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              </span>

              <div className="min-w-0">
                <div className="text-sm text-zc-muted">
                  <Link href="/superadmin/infrastructure" className="hover:underline">
                    Infrastructure
                  </Link>
                  <span className="mx-2 text-zc-muted/60">/</span>
                  <span className="text-zc-text">Locations</span>
                </div>

                <div className="mt-1 text-3xl font-semibold tracking-tight">Locations (Campus → Building → Floor → Zone)</div>

                <div className="mt-2 max-w-3xl text-sm leading-6 text-zc-muted">
                  Branch-scoped location hierarchy with <span className="font-semibold text-zc-text">unique codes</span> and
                  <span className="font-semibold text-zc-text"> effective-dated revisions</span>.
                  Zone code is numeric (per your standard). Backend validations remain authoritative.
                </div>
              </div>
            </div>

            {err ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void loadAll(true)} disabled={busy}>
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
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/50 p-4 text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Campuses</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{counts.campus}</div>
                <div className="mt-1 text-sm opacity-80">Top-level sites</div>
              </div>
              <div className="rounded-xl border border-cyan-200/60 bg-cyan-50/50 p-4 text-cyan-800 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-200">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Buildings</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{counts.building}</div>
                <div className="mt-1 text-sm opacity-80">Structures</div>
              </div>
              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Floors</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{counts.floor}</div>
                <div className="mt-1 text-sm opacity-80">Levels</div>
              </div>
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Zones</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{counts.zone}</div>
                <div className="mt-1 text-sm opacity-80">Patient areas</div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Tabs */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Locations</CardTitle>
                <CardDescription>Overview and hierarchy management.</CardDescription>
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
              <TabsContent value="overview" className="mt-0">
        {/* Branch selector + KPI pills */}
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
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Branch Selector</div>
                  <Select
                    value={branchId}
                    onValueChange={(v) => {
                      setBranchId(v);
                      writeLS(LS_BRANCH, v);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-zc-card border-zc-border">
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
                    Codes are unique per branch. Zones are numeric (01, 02…).
                  </div>
                </div>

                <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Hierarchy summary</div>
                  <div className="mt-2 grid gap-2 text-sm text-zc-muted">
                    <div className="flex items-center justify-between">
                      <span>Campuses</span>
                      <span className="font-mono text-zc-text">{counts.campus}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Buildings</span>
                      <span className="font-mono text-zc-text">{counts.building}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Floors</span>
                      <span className="font-mono text-zc-text">{counts.floor}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Zones</span>
                      <span className="font-mono text-zc-text">{counts.zone}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-zc-border pt-2">
                      <span>Total nodes</span>
                      <span className="font-semibold text-zc-text tabular-nums">{allNodes.length}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" className="gap-2" disabled={!selectedBranch}>
                      <Link href={branchHref}>
                        <Building2 className="h-4 w-4" />
                        Open Branch
                      </Link>
                    </Button>
                    <Button
                      variant="primary"
                      className="gap-2"
                      disabled={!selectedBranch}
                      onClick={() => setCreateState({ open: true, kind: "CAMPUS", parentId: null })}
                    >
                      <Plus className="h-4 w-4" />
                      Add Campus
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
              </TabsContent>

              <TabsContent value="hierarchy" className="mt-0">
        {/* Main layout: Tree + Details */}
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Tree */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-zc-accent" />
                  Location Tree
                </span>

                <div className="flex items-center gap-2">
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
                </div>
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
                    Unable to load tree. Verify backend route for locations tree and permissions.
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
                            <span className="ml-auto">{isActiveNow(n) ? rowPill(n) : rowPill(n)}</span>
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
                  <div className="grid gap-2">{renderTree()}</div>
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
            <CardContent className="pt-6 ">
              {!selectedBranch ? (
                <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                  Select a branch first.
                </div>
              ) : !selectedNode ? (
                <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                  Select a node from the tree.
                </div>
              ) : (
                <div className="grid gap-4 ">
                  <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                    <div className="flex items-start justify-between gap-3 ">
                      <div className="min-w-0 ">
                        <div className="flex items-center gap-2 ">
                          <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones[typeTone(selectedNode.type)])}>
                            {typeLabel(selectedNode.type)}
                          </span>
                          {rowPill(selectedNode)}
                        </div>

                        <div className="mt-2 flex items-center gap-2 ">
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

                  {/* Actions */}
                  <div className="grid gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Actions</div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={() => setReviseState({ open: true, node: selectedNode })}
                      >
                        <Pencil className="h-4 w-4" />
                        Revise (Effective-dated)
                      </Button>

                      <Button
                        variant="destructive"
                        className="gap-2"
                        onClick={() => setRetireState({ open: true, node: selectedNode })}
                      >
                        <Trash2 className="h-4 w-4" />
                        Retire (End-date)
                      </Button>

                      {/* Add child actions based on selected type */}
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
                    </div>

                    <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                      <div className="font-semibold text-zc-text">Notes</div>
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        <li>Use <span className="font-semibold">Revise</span> for changes; do not edit in-place.</li>
                        <li>Zone code is numeric (e.g., 01). Backend enforces naming/code rules.</li>
                        <li>All codes must be unique within the branch.</li>
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
      {/* ------------------------------- Create Modal ------------------------------ */}
      {createState.open && selectedBranch ? (
        <CreateModal
          branch={selectedBranch}
          kind={createState.kind}
          parentId={createState.parentId ?? null}
          siblings={siblingsForCreate(createState.kind, createState.parentId ?? null)}
          allNodes={allNodes}
          onClose={() => setCreateState((p) => ({ ...p, open: false }))}
          onCreate={async (v) => {
            try {
              setBusy(true);

              const codeErr = validateCode(createState.kind, v.code);
              if (codeErr) throw new Error(codeErr);

              const nameErr = validateName(v.name);
              if (nameErr) throw new Error(nameErr);

              const parentFull = createState.parentId
                ? allNodes.find((n) => n.id === createState.parentId)?.code ?? ""
                : "";

              const proposedFull = composeFullCodeForCreate(createState.kind, v.code, parentFull);

              if (!proposedFull) {
                throw new Error("Invalid code.");
              }

              if (!isUniqueCodeWithinBranch(proposedFull)) {
                throw new Error("Duplicate code: location code already exists for the selected parent path.");
              }
              const iso = toIsoFromLocal(v.effectiveFrom);
              if (!iso) throw new Error("Invalid effective date/time.");

              await createLocation({
                kind: createState.kind,
                branchId: selectedBranch.id,
                parentId: createState.parentId ?? null,
                code: v.code.trim(),
                name: v.name.trim(),
                effectiveFrom: iso,
              });

              toast({
                title: "Created",
                description: `${typeLabel(createState.kind)} created successfully.`,
                duration: 1600,
              });

              setCreateState((p) => ({ ...p, open: false }));
              await loadTree(selectedBranch.id);
            } catch (e: any) {
              toast({
                title: "Create failed",
                description: e?.message || "Unable to create location.",
                variant: "destructive" as any,
              });
            } finally {
              setBusy(false);
            }
          }}
          busy={busy}
        />
      ) : null}

      {/* ------------------------------- Revise Modal ------------------------------ */}
      {reviseState.open && selectedBranch && reviseState.node ? (
        <ReviseModal
          node={reviseState.node}
          allNodes={allNodes}
          onClose={() => setReviseState({ open: false, node: null })}
          onRevise={async (v) => {
            try {
              setBusy(true);

              const codeErr = validateCode(reviseState.node!.type, v.code);
              if (codeErr) throw new Error(codeErr);

              const nameErr = validateName(v.name);
              if (nameErr) throw new Error(nameErr);

              if (!isUniqueCodeWithinBranch(v.code, reviseState.node!.id)) {
                throw new Error("Duplicate code: location codes must be unique within the branch.");
              }

              const iso = toIsoFromLocal(v.effectiveFrom);
              if (!iso) throw new Error("Invalid effective date/time.");

              await reviseLocation({
                id: reviseState.node!.id,
                code: v.code.trim(),
                name: v.name.trim(),
                effectiveFrom: iso,
              });

              toast({ title: "Revised", description: "Effective-dated revision created.", duration: 1600 });
              setReviseState({ open: false, node: null });
              await loadTree(selectedBranch.id);
            } catch (e: any) {
              toast({
                title: "Revise failed",
                description: e?.message || "Unable to revise location.",
                variant: "destructive" as any,
              });
            } finally {
              setBusy(false);
            }
          }}
          busy={busy}
        />
      ) : null}

      {/* ------------------------------- Retire Modal ------------------------------ */}
      {retireState.open && selectedBranch && retireState.node ? (
        <RetireModal
          node={retireState.node}
          onClose={() => setRetireState({ open: false, node: null })}
          onRetire={async (v) => {
            try {
              setBusy(true);

              const iso = toIsoFromLocal(v.effectiveTo);
              if (!iso) throw new Error("Invalid end date/time.");

              await retireLocation({ id: retireState.node!.id, effectiveTo: iso });

              toast({ title: "Retired", description: "Location end-dated successfully.", duration: 1600 });
              setRetireState({ open: false, node: null });
              await loadTree(selectedBranch.id);
            } catch (e: any) {
              toast({
                title: "Retire failed",
                description: e?.message || "Unable to retire location.",
                variant: "destructive" as any,
              });
            } finally {
              setBusy(false);
            }
          }}
          busy={busy}
        />
      ) : null}
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Modals                                   */
/* -------------------------------------------------------------------------- */

function CreateModal({
  branch,
  kind,
  parentId,
  siblings,
  allNodes,
  onClose,
  onCreate,
  busy,
}: {
  branch: BranchRow;
  kind: LocationType;
  parentId: string | null;
  siblings: LocationNode[];
  allNodes: LocationNode[];
  onClose: () => void;
  onCreate: (v: { code: string; name: string; effectiveFrom: string }) => void;
  busy: boolean;
}) {
  const codeRef = React.useRef<HTMLInputElement | null>(null);

  const parent = React.useMemo(() => {
    if (!parentId) return null;
    return allNodes.find((n) => n.id === parentId) || null;
  }, [parentId, allNodes]);

  const parentFullCode = parent?.code ?? "";
  const parentParts = React.useMemo(() => {
    const parts = String(parentFullCode ?? "").split("-").filter(Boolean);
    return {
      campus: parts[0] || "",
      building: parts[1] || "",
      floor: parts[2] || "",
    };
  }, [parentFullCode]);

  const [code, setCode] = React.useState(() => suggestCode(kind, siblings));
  const [name, setName] = React.useState("");
  const [effectiveFrom, setEffectiveFrom] = React.useState(nowLocalDateTime());

  const fullPreview = React.useMemo(
    () => composeFullCodeForCreate(kind, code, parentFullCode),
    [kind, code, parentFullCode],
  );

  const fullConflict = React.useMemo(() => {
    if (!fullPreview) return false;
    const full = fullPreview.trim().toUpperCase();
    return allNodes.some((n) => String(n.code ?? "").trim().toUpperCase() == full);
  }, [fullPreview, allNodes]);

  const codeErr = validateCode(kind, code);
  const nameErr = validateName(name);

  const suggestNow = () => {
    const next = suggestCode(kind, siblings);
    setCode(next);
    requestAnimationFrame(() => codeRef.current?.focus());
  };

  const PatternChip = ({
    label,
    value,
    tone,
  }: {
    label: string;
    value: string;
    tone: keyof typeof pillTones;
  }) => (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs", pillTones[tone])}>
      <span className="text-zc-muted">{label}:</span>
      <span className="font-mono text-[11px] text-zc-text">{value || "—"}</span>
    </span>
  );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {`Add ${typeLabel(kind)}`}
          </DialogTitle>
          <DialogDescription>Branch: {branch.name} ({branch.code})</DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="grid gap-4">
        <div className="rounded-2xl border border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
          <div className="font-semibold text-zc-text">Suggested code pattern</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <PatternChip
              label="Campus"
              value={kind === "CAMPUS" ? code || "C01" : parentParts.campus || "C01"}
              tone="indigo"
            />
            <PatternChip
              label="Building"
              value={kind === "BUILDING" ? code || "B01" : parentParts.building || (kind === "CAMPUS" ? "—" : "B01")}
              tone="cyan"
            />
            <PatternChip
              label="Floor"
              value={kind === "FLOOR" ? code || "F01" : parentParts.floor || (kind === "ZONE" ? "F01" : "—")}
              tone="emerald"
            />
            <PatternChip label="Zone" value={kind === "ZONE" ? code || "01" : "—"} tone="amber" />
          </div>
          <div className="mt-3 text-xs">
            You enter only the <span className="font-semibold text-zc-text">segment</span> (e.g.,{" "}
            <span className="font-mono">F04</span>). The backend composes the full code using the parent path.
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Code</div>
          <div className="flex items-center gap-2">
            <Input
              ref={codeRef}
              value={code}
              onChange={(e) => setCode(kind === "ZONE" ? e.target.value : e.target.value.toUpperCase())}
              placeholder={kind === "ZONE" ? "e.g., 01" : kind === "CAMPUS" ? "e.g., C01" : kind === "BUILDING" ? "e.g., B01" : "e.g., F01"}
              className="h-11 rounded-xl"
            />
            <Button variant="outline" className="h-11" onClick={suggestNow} type="button">
              Suggest
            </Button>
          </div>

          {codeErr ? <div className="text-xs text-[rgb(var(--zc-danger))]">{codeErr}</div> : null}
          {!codeErr && fullConflict ? (
            <div className="text-xs text-[rgb(var(--zc-danger))]">
              This code is already used for the selected parent path.
            </div>
          ) : null}

          <div className="text-xs text-zc-muted">
            Full code preview: <span className="font-mono text-zc-text">{fullPreview || "—"}</span>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Name</div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Enter ${typeLabel(kind)} name`}
            className="h-11 rounded-xl"
          />
          {nameErr ? <div className="text-xs text-[rgb(var(--zc-danger))]">{nameErr}</div> : null}
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Effective From</div>
          <Input
            type="datetime-local"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="h-11 rounded-xl"
          />
          <div className="text-xs text-zc-muted">Creation is effective-dated. To change later, use “Revise”.</div>
        </div>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} type="button" disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => onCreate({ code, name, effectiveFrom })}
            type="button"
            disabled={busy || !!codeErr || !!nameErr || fullConflict}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ReviseModal({
  node,
  allNodes,
  onClose,
  onRevise,
  busy,
}: {
  node: LocationNode;
  allNodes: LocationNode[];
  onClose: () => void;
  onRevise: (v: { code: string; name: string; effectiveFrom: string }) => void;
  busy: boolean;
}) {
  const [code, setCode] = React.useState(node.code || "");
  const [name, setName] = React.useState(node.name || "");
  const [effectiveFrom, setEffectiveFrom] = React.useState(nowLocalDateTime());

  const codeErr = validateCode(node.type, code);
  const nameErr = validateName(name);

  return (
    <ModalShell
      title={`Revise ${typeLabel(node.type)}`}
      description="Creates a new effective-dated version (maker-checker can be enforced backend-side)."
      onClose={onClose}
      maxW="max-w-xl"
    >
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

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">New Code</div>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-11 rounded-xl" />
          {codeErr ? <div className="text-xs text-[rgb(var(--zc-danger))]">{codeErr}</div> : null}
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">New Name</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
          {nameErr ? <div className="text-xs text-[rgb(var(--zc-danger))]">{nameErr}</div> : null}
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Effective From</div>
          <Input type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="h-11 rounded-xl" />
          <div className="text-xs text-zc-muted">
            Backend should end-date the old record automatically and activate the new revision from this time.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} type="button" disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => onRevise({ code, name, effectiveFrom })}
            type="button"
            disabled={busy || !!codeErr || !!nameErr}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Create Revision
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function RetireModal({
  node,
  onClose,
  onRetire,
  busy,
}: {
  node: LocationNode;
  onClose: () => void;
  onRetire: (v: { effectiveTo: string }) => void;
  busy: boolean;
}) {
  const [effectiveTo, setEffectiveTo] = React.useState(nowLocalDateTime());

  return (
    <ModalShell
      title={`Retire ${typeLabel(node.type)}`}
      description="End-dates the location. Typically used when physical structure changes."
      onClose={onClose}
      maxW="max-w-xl"
    >
      <div className="grid gap-4">
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-900/15 p-4 text-sm text-zc-muted">
          <div className="font-semibold text-amber-800 dark:text-amber-200">Careful</div>
          <div className="mt-1">
            Retiring a location may impact downstream units/rooms/resources bound to it. Backend should block retire if
            active dependencies exist.
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

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} type="button" disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => onRetire({ effectiveTo })}
            type="button"
            disabled={busy}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Retire
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
