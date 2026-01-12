"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

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

/* -------------------------------------------------------------------------- */
/*                         IMPORTANT: API ENDPOINTS                            */
/* -------------------------------------------------------------------------- */
/**
 * Adjust these if your backend uses different routes.
 * The page expects:
 * - tree(branchId) => returns either nested tree or flat items.
 * - create endpoints per type
 * - revise(id) => effective-dated change
 * - retire(id) => effectiveTo/end-dating
 */
const LOC_API = {
  tree: (branchId: string) => `/api/infrastructure/locations/tree?branchId=${encodeURIComponent(branchId)}`,

  createCampus: `/api/infrastructure/locations/campuses`,
  createBuilding: `/api/infrastructure/locations/buildings`,
  createFloor: `/api/infrastructure/locations/floors`,
  createZone: `/api/infrastructure/locations/zones`,

  revise: (id: string) => `/api/infrastructure/locations/${encodeURIComponent(id)}/revise`,
  retire: (id: string) => `/api/infrastructure/locations/${encodeURIComponent(id)}/retire`,
};

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

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

const LS_BRANCH = "xc.superadmin.infrastructure.branchId";

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
  zinc: "border-xc-border bg-xc-panel/20 text-xc-text",
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
      <span className="text-xc-muted/70">•</span>
      <span className="font-mono font-semibold">{value}</span>
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-xc-panel/30", className)} />;
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
      <div className={cn("w-full rounded-2xl border border-xc-border bg-xc-card shadow-elev-2 animate-in zoom-in-95 duration-200", maxW)}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-xc-text">{title}</div>
              {description ? <div className="mt-1 text-sm text-xc-muted">{description}</div> : null}
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

function suggestCode(kind: LocationType, siblings: LocationNode[]) {
  // Convention suggestion (can be changed; backend validates):
  // Campus: C01, C02...
  // Building: B01...
  // Floor: F01...
  // Zone: 01, 02... numeric
  const existing = new Set(
    siblings.map((s) => String(s.code ?? "").trim().toUpperCase()).filter(Boolean)
  );

  const pad2 = (n: number) => String(n).padStart(2, "0");
  for (let i = 1; i < 200; i++) {
    const code =
      kind === "CAMPUS" ? `C${pad2(i)}` :
      kind === "BUILDING" ? `B${pad2(i)}` :
      kind === "FLOOR" ? `F${pad2(i)}` :
      `${pad2(i)}`;

    if (!existing.has(code.toUpperCase())) return code;
  }
  return kind === "ZONE" ? "01" : "X01";
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

    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedId(node.id)}
          className={cn(
            "w-full rounded-xl border px-3 py-2 text-left transition-all",
            "border-xc-border bg-xc-panel/15 hover:bg-xc-panel/25",
            isSel && "border-indigo-200/60 bg-indigo-50/40 dark:border-indigo-900/35 dark:bg-indigo-900/15",
          )}
          style={{ marginLeft: depth * 14 }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {hasChildren ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(node.id);
                    }}
                    className="grid h-6 w-6 place-items-center rounded-lg border border-xc-border bg-xc-panel/20 hover:bg-xc-panel/30"
                    title={expanded[node.id] ? "Collapse" : "Expand"}
                  >
                    {expanded[node.id] ? <ChevronDown className="h-4 w-4 text-xc-muted" /> : <ChevronRight className="h-4 w-4 text-xc-muted" />}
                  </span>
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-lg border border-xc-border bg-xc-panel/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-xc-muted/60" />
                  </span>
                )}

                <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones[typeTone(node.type)])}>
                  {typeLabel(node.type)}
                </span>

                <span className="font-mono text-xs text-xc-muted">{node.code}</span>

                <span className={cn("truncate text-sm font-semibold", active ? "text-xc-text" : "text-xc-muted")}>
                  {node.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {rowPill(node)}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-xc-muted">
            <CalendarClock className="h-4 w-4" />
            <span>From: {fmtDateTime(node.effectiveFrom)}</span>
            <span className="text-xc-muted/60">•</span>
            <span>To: {fmtDateTime(node.effectiveTo)}</span>
          </div>
        </button>

        {hasChildren && expanded[node.id] ? <div className="mt-2 grid gap-2">{children}</div> : null}
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
    const url =
      payload.kind === "CAMPUS"
        ? LOC_API.createCampus
        : payload.kind === "BUILDING"
          ? LOC_API.createBuilding
          : payload.kind === "FLOOR"
            ? LOC_API.createFloor
            : LOC_API.createZone;

    await apiFetch(url, {
      method: "POST",
      body: JSON.stringify({
        branchId: payload.branchId,
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
    await apiFetch(LOC_API.revise(payload.id), {
      method: "POST",
      body: JSON.stringify({
        code: payload.code,
        name: payload.name,
        effectiveFrom: payload.effectiveFrom,
      }),
    });
  }

  async function retireLocation(payload: { id: string; effectiveTo: string }) {
    await apiFetch(LOC_API.retire(payload.id), {
      method: "POST",
      body: JSON.stringify({ effectiveTo: payload.effectiveTo }),
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
                <div className="text-sm text-xc-muted">
                  <Link href="/superadmin/infrastructure" className="hover:underline">
                    Infrastructure
                  </Link>
                  <span className="mx-2 text-xc-muted/60">/</span>
                  <span className="text-xc-text">Locations</span>
                </div>

                <div className="mt-1 text-3xl font-semibold tracking-tight">Locations (Campus → Building → Floor → Zone)</div>

                <div className="mt-2 max-w-3xl text-sm leading-6 text-xc-muted">
                  Branch-scoped location hierarchy with <span className="font-semibold text-xc-text">unique codes</span> and
                  <span className="font-semibold text-xc-text"> effective-dated revisions</span>.
                  Zone code is numeric (per your standard). Backend validations remain authoritative.
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

        {/* Branch selector + KPI pills */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-xc-accent" />
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
                  <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Branch Selector</div>
                  <Select
                    value={branchId}
                    onValueChange={(v) => {
                      setBranchId(v);
                      writeLS(LS_BRANCH, v);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-xc-card border-xc-border">
                      <SelectValue placeholder="Select a branch…" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} <span className="font-mono text-xs text-xc-muted">({b.code})</span>{" "}
                          <span className="text-xs text-xc-muted">• {b.city}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-xc-muted">
                    Codes must be unique within the branch. Zones must be numeric.
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <MetricPill label="Campuses" value={counts.campus} tone="indigo" />
                  <MetricPill label="Buildings" value={counts.building} tone="cyan" />
                  <MetricPill label="Floors" value={counts.floor} tone="emerald" />
                  <MetricPill label="Zones" value={counts.zone} tone="amber" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main layout: Tree + Details */}
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Tree */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-xc-accent" />
                  Location Tree
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
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
              <div className="flex items-center gap-2 rounded-xl border border-xc-border bg-xc-panel/15 px-3 py-2">
                <Search className="h-4 w-4 text-xc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code or name…"
                  className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
                />
              </div>

              <div className="mt-4 grid gap-2">
                {!selectedBranch ? (
                  <div className="rounded-2xl border border-xc-border bg-xc-panel/15 p-4 text-sm text-xc-muted">
                    Select a branch to view and manage locations.
                  </div>
                ) : err ? (
                  <div className="rounded-2xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.10)] p-4 text-sm text-xc-muted">
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
                            "w-full rounded-xl border border-xc-border bg-xc-panel/15 px-3 py-2 text-left transition-all",
                            "hover:bg-xc-panel/25"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones[typeTone(n.type)])}>
                              {typeLabel(n.type)}
                            </span>
                            <span className="font-mono text-xs text-xc-muted">{n.code}</span>
                            <span className="truncate text-sm font-semibold text-xc-text">{n.name}</span>
                            <span className="ml-auto">{isActiveNow(n) ? rowPill(n) : rowPill(n)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-xc-border bg-xc-panel/15 p-4 text-sm text-xc-muted">
                      No results.
                    </div>
                  )
                ) : campuses.length ? (
                  <div className="grid gap-2">{renderTree()}</div>
                ) : (
                  <div className="rounded-2xl border border-xc-border bg-xc-panel/15 p-4 text-sm text-xc-muted">
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
                <Building2 className="h-5 w-5 text-xc-accent" />
                Details
              </CardTitle>
              <CardDescription>Inspect and manage the selected node.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {!selectedBranch ? (
                <div className="rounded-2xl border border-xc-border bg-xc-panel/15 p-4 text-sm text-xc-muted">
                  Select a branch first.
                </div>
              ) : !selectedNode ? (
                <div className="rounded-2xl border border-xc-border bg-xc-panel/15 p-4 text-sm text-xc-muted">
                  Select a node from the tree.
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-xc-border bg-xc-panel/15 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones[typeTone(selectedNode.type)])}>
                            {typeLabel(selectedNode.type)}
                          </span>
                          {rowPill(selectedNode)}
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <div className="font-mono text-sm text-xc-muted">{selectedNode.code}</div>
                          <button
                            className="grid h-7 w-7 place-items-center rounded-lg border border-xc-border bg-xc-panel/10 hover:bg-xc-panel/25"
                            title="Copy code"
                            onClick={() => {
                              copyText(selectedNode.code);
                              toast({ title: "Copied", description: "Location code copied.", duration: 1200 });
                            }}
                          >
                            <Copy className="h-4 w-4 text-xc-muted" />
                          </button>
                        </div>

                        <div className="mt-2 text-lg font-semibold text-xc-text">{selectedNode.name}</div>

                        <div className="mt-3 grid gap-2 text-sm text-xc-muted">
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
                    <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Actions</div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setReviseState({ open: true, node: selectedNode })}
                      >
                        <Pencil className="h-4 w-4" />
                        Revise (Effective-dated)
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setRetireState({ open: true, node: selectedNode })}
                      >
                        <Trash2 className="h-4 w-4" />
                        Retire (End-date)
                      </Button>

                      {/* Add child actions based on selected type */}
                      {selectedNode.type === "CAMPUS" ? (
                        <Button
                          variant="outline"
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

                    <div className="rounded-2xl border border-xc-border bg-xc-panel/15 p-4 text-sm text-xc-muted">
                      <div className="font-semibold text-xc-text">Notes</div>
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
      </div>

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

              if (!isUniqueCodeWithinBranch(v.code)) {
                throw new Error("Duplicate code: location codes must be unique within the branch.");
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
  const [code, setCode] = React.useState(() => suggestCode(kind, siblings));
  const [name, setName] = React.useState("");
  const [effectiveFrom, setEffectiveFrom] = React.useState(nowLocalDateTime());

  const codeErr = validateCode(kind, code);
  const nameErr = validateName(name);

  return (
    <ModalShell
      title={`Add ${typeLabel(kind)}`}
      description={`Branch: ${branch.name} (${branch.code})`}
      onClose={onClose}
      maxW="max-w-xl"
    >
      <div className="grid gap-4">
        <div className="rounded-2xl border border-xc-border bg-xc-panel/15 p-4 text-sm text-xc-muted">
          Suggested code pattern:
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={cn("rounded-full border px-3 py-1 text-xs", pillTones.indigo)}>Campus: C01</span>
            <span className={cn("rounded-full border px-3 py-1 text-xs", pillTones.cyan)}>Building: B01</span>
            <span className={cn("rounded-full border px-3 py-1 text-xs", pillTones.emerald)}>Floor: F01</span>
            <span className={cn("rounded-full border px-3 py-1 text-xs", pillTones.amber)}>Zone: 01 (numeric)</span>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Code</div>
          <div className="flex items-center gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g., C01" className="h-11 rounded-xl" />
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setCode(suggestCode(kind, siblings))}
              type="button"
            >
              Suggest
            </Button>
          </div>
          {codeErr ? <div className="text-xs text-[rgb(var(--xc-danger))]">{codeErr}</div> : null}
          <div className="text-xs text-xc-muted">
            Unique within branch (backend enforced). For Zone: numeric only.
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Name</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Enter ${typeLabel(kind)} name`} className="h-11 rounded-xl" />
          {nameErr ? <div className="text-xs text-[rgb(var(--xc-danger))]">{nameErr}</div> : null}
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Effective From</div>
          <Input type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="h-11 rounded-xl" />
          <div className="text-xs text-xc-muted">
            Creation is effective-dated. To change later, use “Revise”.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} type="button" disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => onCreate({ code, name, effectiveFrom })}
            type="button"
            disabled={busy || !!codeErr || !!nameErr}
          >
            Create
          </Button>
        </div>
      </div>
    </ModalShell>
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
        <div className="rounded-2xl border border-xc-border bg-xc-panel/15 p-4 text-sm">
          <div className="text-xc-muted">Current</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones[typeTone(node.type)])}>
              {typeLabel(node.type)}
            </span>
            <span className="font-mono text-xs text-xc-muted">{node.code}</span>
            <span className="text-sm font-semibold text-xc-text">{node.name}</span>
          </div>
          <div className="mt-2 text-xs text-xc-muted">
            Effective: {fmtDateTime(node.effectiveFrom)} → {fmtDateTime(node.effectiveTo)}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">New Code</div>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-11 rounded-xl" />
          {codeErr ? <div className="text-xs text-[rgb(var(--xc-danger))]">{codeErr}</div> : null}
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">New Name</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
          {nameErr ? <div className="text-xs text-[rgb(var(--xc-danger))]">{nameErr}</div> : null}
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Effective From</div>
          <Input type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="h-11 rounded-xl" />
          <div className="text-xs text-xc-muted">
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
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-900/15 p-4 text-sm text-xc-muted">
          <div className="font-semibold text-amber-800 dark:text-amber-200">Careful</div>
          <div className="mt-1">
            Retiring a location may impact downstream units/rooms/resources bound to it. Backend should block retire if
            active dependencies exist.
          </div>
        </div>

        <div className="rounded-2xl border border-xc-border bg-xc-panel/15 p-4 text-sm">
          <div className="text-xc-muted">Target</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-xc-muted">{node.code}</span>
            <span className="text-sm font-semibold text-xc-text">{node.name}</span>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted">Effective To</div>
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
