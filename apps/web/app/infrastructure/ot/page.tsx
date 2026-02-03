"use client";

import * as React from "react";
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  CornerDownRight,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Pencil,
  Hospital,
  LayoutGrid,
  BedDouble,
  Stethoscope,
  Wrench,
  Building2,
  Star,
} from "lucide-react";

import { IconPlus, IconSearch } from "@/components/icons";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";

type BranchRow = { id: string; code: string; name: string; city: string };
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


function suiteStatusBadge(status?: OtSuiteStatus | null) {
  const s = status || "DRAFT";
  if (s === "ACTIVE" || s === "READY") return <Badge variant="success">{s}</Badge>;
  if (s === "MAINTENANCE") return <Badge variant="warning">{s}</Badge>;
  if (s === "ARCHIVED") return <Badge variant="secondary">{s}</Badge>;
  if (s === "BOOKED" || s === "IN_USE") return <Badge variant="info">{s}</Badge>;
  return <Badge variant="accent">{s}</Badge>;
}

function spaceTypeBadge(type: OtSpaceType) {
  if (type === "THEATRE") return <Badge variant="info">Theatre</Badge>;
  if (type === "RECOVERY_BAY") return <Badge variant="accent">Recovery</Badge>;
  if (type === "SCRUB_ROOM" || type === "PREOP_HOLDING" || type === "INDUCTION_ROOM") return <Badge variant="warning">{spaceTypeLabel(type)}</Badge>;
  if (type === "STERILE_STORE" || type === "ANESTHESIA_STORE" || type === "EQUIPMENT_STORE") return <Badge variant="neutral">{spaceTypeLabel(type)}</Badge>;
  return <Badge variant="secondary">{spaceTypeLabel(type)}</Badge>;
}

function tablePrimaryBadge(isPrimary: boolean) {
  return isPrimary ? <Badge variant="accent">Primary</Badge> : <Badge variant="secondary">Secondary</Badge>;
}

function equipmentCategoryBadge(category?: string | null) {
  const c = (category || "OTHER").toUpperCase();
  if (c.includes("IMAGING") || c.includes("ENDOSCOPY")) return <Badge variant="info">{category || "OTHER"}</Badge>;
  if (c.includes("ANESTHESIA") || c.includes("MONITOR")) return <Badge variant="accent">{category || "OTHER"}</Badge>;
  if (c.includes("STERIL") || c.includes("DISINFECT")) return <Badge variant="warning">{category || "OTHER"}</Badge>;
  if (c.includes("POWER") || c.includes("GASES")) return <Badge variant="neutral">{category || "OTHER"}</Badge>;
  return <Badge variant="secondary">{category || "OTHER"}</Badge>;
}

function equipmentLevelBadge(spaceId?: string | null) {
  return spaceId ? <Badge variant="info">Room-linked</Badge> : <Badge variant="neutral">Suite-level</Badge>;
}

function qtyBadge(qty?: number | null) {
  return <Badge variant="accent">Qty: {qty || 1}</Badge>;
}

type LocationTreeNode = {
  id: string;
  code?: string | null;
  name?: string | null;
  type?: string | null;
  children?: LocationTreeNode[] | null;
  // fallback shapes
  label?: string | null;
  title?: string | null;
  nodes?: LocationTreeNode[] | null;
};

type LocationOption = {
  id: string;
  label: string;
};

type OtSuiteStatus =
  | "DRAFT"
  | "READY"
  | "ACTIVE"
  | "BOOKED"
  | "IN_USE"
  | "MAINTENANCE"
  | "ARCHIVED";

type OtSuite = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  status: OtSuiteStatus;
  locationNodeId?: string | null;
  config?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OtSpaceType =
  | "THEATRE"
  | "RECOVERY_BAY"
  | "SCRUB_ROOM"
  | "PREOP_HOLDING"
  | "INDUCTION_ROOM"
  | "STERILE_STORE"
  | "ANESTHESIA_STORE"
  | "EQUIPMENT_STORE"
  | "STAFF_CHANGE"
  | "OTHER";

type OtTable = {
  id: string;
  theatreId: string;
  code: string;
  name: string;
  isPrimary: boolean;
  manufacturer?: string | null;
  model?: string | null;
  serialNo?: string | null;
  meta?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type OtTheatre = {
  id: string;
  spaceId: string;
  isActive: boolean;
  specialtyCodes: string[];
  tables: OtTable[];
};

type OtRecoveryBay = {
  id: string;
  spaceId: string;
  isActive: boolean;
  bedCount: number;
  monitorCount: number;
  oxygenPoints: number;
};

type OtEquipment = {
  id: string;
  suiteId: string;
  spaceId?: string | null;
  category: string;
  name: string;
  qty: number;
  manufacturer?: string | null;
  model?: string | null;
  serialNo?: string | null;
  meta?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type OtSpace = {
  id: string;
  suiteId: string;
  type: OtSpaceType;
  code: string;
  name: string;
  locationNodeId?: string | null;
  notes?: string | null;
  meta?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  theatre?: OtTheatre | null;
  recoveryBay?: OtRecoveryBay | null;
  equipment?: OtEquipment[];
};

type OtSuiteDetails = OtSuite & {
  spaces: OtSpace[];
  equipment: OtEquipment[];
};

type ReadinessCheck = {
  key: string;
  label: string;
  ok: boolean;
  details?: any;
};

type SuiteReadiness = {
  suiteId: string;
  isReady: boolean;
  badge: string;
  checks: ReadinessCheck[];
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-800", className)} />;
}

function errMsg(e: any) {
  const m = e?.message || "Request failed";
  // normalize common API error patterns
  if (String(m).includes("(403)") || String(m).includes("Forbidden")) return "Insufficient permission for this action.";
  return String(m);
}

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function normalizeLocationTreePayload(payload: any): LocationTreeNode[] {
  if (!payload) return [];

  // 1) direct array
  if (Array.isArray(payload)) return payload as any;

  // 2) common wrappers
  if (Array.isArray(payload.nodes)) return payload.nodes as any;
  if (Array.isArray(payload.items)) return payload.items as any;
  if (Array.isArray(payload.tree)) return payload.tree as any;

  // 3) infra location tree shape
  if (Array.isArray(payload.campuses)) return payload.campuses as any;

  // 4) root wrapper
  if (payload.root) return [payload.root];

  return [];
}

function locationNodeLabel(n: LocationTreeNode) {
  const name = (n.name ?? n.title ?? n.label ?? "").toString().trim() || "Unnamed";
  const code = n.code ? ` (${n.code})` : "";
  const type = n.type ? ` • ${n.type}` : "";
  return `${name}${code}${type}`;
}

function flattenLocationTree(nodes: LocationTreeNode[], depth = 0, out: LocationOption[] = []): LocationOption[] {
  for (const n of nodes || []) {
    if (!n?.id) continue;

    const prefix = depth > 0 ? `${"—".repeat(Math.min(depth, 6))} ` : "";
    out.push({ id: n.id, label: prefix + locationNodeLabel(n) });

    // Support both:
    // - generic: children/nodes
    // - infra tree: buildings/floors/zones
    const kids: any[] = [
  ...(n.children ?? []),
  ...(n.nodes ?? []),
  ...(((n as any).buildings ?? []) as any[]),
  ...(((n as any).floors ?? []) as any[]),
  ...(((n as any).zones ?? []) as any[]),
];

    if (kids.length) flattenLocationTree(kids, depth + 1, out);
  }
  return out;
}

function findLocationLabel(map: Map<string, string>, id?: string | null) {
  if (!id) return null;
  return map.get(id) || null;
}

function spaceTypeLabel(t: OtSpaceType) {
  switch (t) {
    case "THEATRE":
      return "Theatre";
    case "RECOVERY_BAY":
      return "Recovery Bay";
    case "SCRUB_ROOM":
      return "Scrub Room";
    case "PREOP_HOLDING":
      return "Pre-Op Holding";
    case "INDUCTION_ROOM":
      return "Induction Room";
    case "STERILE_STORE":
      return "Sterile Store";
    case "ANESTHESIA_STORE":
      return "Anesthesia Store";
    case "EQUIPMENT_STORE":
      return "Equipment Store";
    case "STAFF_CHANGE":
      return "Staff Change";
    default:
      return "Other";
  }
}

function suiteStatusTone(s: OtSuiteStatus) {
  if (s === "ACTIVE") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
  if (s === "MAINTENANCE") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  if (s === "ARCHIVED") return "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200";
}

function okBadge(ok: boolean, textOk = "OK", textBad = "Missing") {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {textOk}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
      <AlertTriangle className="h-3.5 w-3.5" />
      {textBad}
    </span>
  );
}

export default function SuperAdminOtSetupPage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";


  // top-level data
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"suites" | "checks">("suites");

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  // locations (infra tree) for dropdown tagging
  const [locLoading, setLocLoading] = React.useState(false);
  const [locationOptions, setLocationOptions] = React.useState<LocationOption[]>([]);
  const locationLabelById = React.useMemo(() => new Map(locationOptions.map((o) => [o.id, o.label])), [locationOptions]);

  const [suites, setSuites] = React.useState<OtSuite[]>([]);
  const [suiteId, setSuiteId] = React.useState<string | null>(null);
  const [suiteQ, setSuiteQ] = React.useState("");

  const [suiteDetails, setSuiteDetails] = React.useState<OtSuiteDetails | null>(null);
  const [readiness, setReadiness] = React.useState<SuiteReadiness | null>(null);

  const reqSeq = React.useRef(0);

  // dialogs
  const [suiteDlgOpen, setSuiteDlgOpen] = React.useState(false);
  const [suiteEditing, setSuiteEditing] = React.useState<OtSuite | null>(null);

  const [spaceDlgOpen, setSpaceDlgOpen] = React.useState(false);
  const [spaceEditing, setSpaceEditing] = React.useState<OtSpace | null>(null);

  const [tableDlgOpen, setTableDlgOpen] = React.useState(false);
  const [tableEditing, setTableEditing] = React.useState<{ theatreId: string; table?: OtTable } | null>(null);

  const [eqDlgOpen, setEqDlgOpen] = React.useState(false);
  const [eqEditing, setEqEditing] = React.useState<OtEquipment | null>(null);

  // template dialog (replaces browser confirm)
  const [tplDlgOpen, setTplDlgOpen] = React.useState(false);
  const [tplBusy, setTplBusy] = React.useState(false);
  const [tplErr, setTplErr] = React.useState<string | null>(null);


  // confirm action dialog (replaces all browser confirm/alerts for destructive actions)
  type ConfirmKind = "danger" | "warning" | "info";
  type ConfirmDlgState = {
    open: boolean;
    kind: ConfirmKind;
    title: string;
    description?: string;
    confirmText: string;
    hint?: string;
    bullets?: string[];
    busy: boolean;
    error: string | null;
    onConfirm?: () => Promise<void>;
  };

  const [confirmDlg, setConfirmDlg] = React.useState<ConfirmDlgState>({
    open: false,
    kind: "danger",
    title: "",
    description: "",
    confirmText: "Confirm",
    hint: "",
    bullets: [],
    busy: false,
    error: null,
    onConfirm: undefined,
  });

  function openConfirm(opts: Omit<ConfirmDlgState, "open" | "busy" | "error">) {
    setConfirmDlg({
      open: true,
      busy: false,
      error: null,
      kind: opts.kind,
      title: opts.title,
      description: opts.description || "",
      confirmText: opts.confirmText || "Confirm",
      hint: opts.hint || "",
      bullets: opts.bullets || [],
      onConfirm: opts.onConfirm,
    });
  }

  function closeConfirm() {
    setConfirmDlg((d) => ({ ...d, open: false, busy: false, error: null, onConfirm: undefined }));
  }

  async function runConfirm() {
    if (!confirmDlg.onConfirm) return;
    setConfirmDlg((d) => ({ ...d, busy: true, error: null }));
    setBusy(true);
    try {
      await confirmDlg.onConfirm();
      closeConfirm();
    } catch (e: any) {
      setConfirmDlg((d) => ({ ...d, busy: false, error: errMsg(e) }));
    } finally {
      setBusy(false);
      setConfirmDlg((d) => (d.open ? { ...d, busy: false } : d));
    }

  }

  // ---------------- Loaders ----------------

  async function loadBranches(showToast = false) {
    setBusy(true);
    try {
      const rows = await apiFetch<BranchRow[]>("/api/branches");
      setBranches(rows || []);

      const stored = (effectiveBranchId || null);
      const first = rows?.[0]?.id;

      const next = (stored && rows?.some((b) => b.id === stored) ? stored : undefined) || first || undefined;
      setBranchId(next);
      if (next) if (isGlobalScope) setActiveBranchId(next || null);
if (showToast) toast({ title: "Refreshed", description: "Loaded branch list.", duration: 1400 });
    } catch (e: any) {
      toast({ title: "Failed", description: errMsg(e), variant: "destructive" as any });
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  async function loadLocations(bId: string) {
    setLocLoading(true);
    try {
      // Location tree is created under Infrastructure → Locations.
      // Different deployments may expose different endpoints; we try a few common ones.
      const candidates = [
        `/api/infrastructure/locations/tree?branchId=${encodeURIComponent(bId)}`,
        `/api/infrastructure/locations?branchId=${encodeURIComponent(bId)}`,
        `/api/infrastructure/locations/nodes?branchId=${encodeURIComponent(bId)}`,
        `/api/infrastructure/locations/location-nodes?branchId=${encodeURIComponent(bId)}`,
      ];

      let payload: any = null;
      for (const url of candidates) {
        try {
          payload = await apiFetch<any>(url);
          if (payload) break;
        } catch {
          // try next
        }
      }

      const nodes = normalizeLocationTreePayload(payload);
      const flat = flattenLocationTree(nodes);
      setLocationOptions(flat);
    } catch {
      setLocationOptions([]);
    } finally {
      setLocLoading(false);
    }
  }

  async function loadSuites(bId: string, keepSelection = true) {
    const seq = ++reqSeq.current;
    setBusy(true);
    try {
      const rows = await apiFetch<OtSuite[]>(`/api/infrastructure/ot/suites?branchId=${encodeURIComponent(bId)}`);
      if (seq !== reqSeq.current) return;

      setSuites(rows || []);

      if (keepSelection) {
        const still = suiteId && rows?.some((s) => s.id === suiteId) ? suiteId : null;
        const next = still || rows?.[0]?.id || null;
        setSuiteId(next);
      } else {
        setSuiteId(rows?.[0]?.id || null);
      }
    } catch (e: any) {
      toast({ title: "Failed to load OT suites", description: errMsg(e), variant: "destructive" as any });
      setSuites([]);
      setSuiteId(null);
    } finally {
      setBusy(false);
    }
  }

  async function loadSuiteDetails(id: string) {
    const seq = ++reqSeq.current;
    setBusy(true);
    try {
      const d = await apiFetch<OtSuiteDetails>(`/api/infrastructure/ot/suites/${encodeURIComponent(id)}`);
      if (seq !== reqSeq.current) return;
      setSuiteDetails(d);

      // load readiness in parallel (partial OK)
      try {
        const r = await apiFetch<SuiteReadiness>(`/api/infrastructure/ot/suites/${encodeURIComponent(id)}/readiness`);
        if (seq !== reqSeq.current) return;
        setReadiness(r);
      } catch {
        setReadiness(null);
      }
    } catch (e: any) {
      toast({ title: "Failed to load suite", description: errMsg(e), variant: "destructive" as any });
      setSuiteDetails(null);
      setReadiness(null);
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    void loadBranches(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    void loadLocations(branchId);
    void loadSuites(branchId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    if (!suiteId) {
      setSuiteDetails(null);
      setReadiness(null);
      return;
    }
    void loadSuiteDetails(suiteId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suiteId]);

  const selectedBranch = React.useMemo(() => branches.find((b) => b.id === branchId) || null, [branches, branchId]);
  const selectedSuite = React.useMemo(() => suites.find((s) => s.id === suiteId) || null, [suites, suiteId]);

  const filteredSuites = React.useMemo(() => {
    const q = suiteQ.trim().toLowerCase();
    if (!q) return suites;
    return (suites || []).filter((s) =>
      String(s.name || '').toLowerCase().includes(q) || String(s.code || '').toLowerCase().includes(q)
    );
  }, [suites, suiteQ]);

  const theatres = React.useMemo(
    () => (suiteDetails?.spaces || []).filter((s) => s.isActive && s.type === "THEATRE" && s.theatre?.isActive),
    [suiteDetails]
  );

  // ---------------- Actions: Suites ----------------

  async function openCreateSuite() {
    if (!branchId) return;
    setSuiteEditing(null);

    // reset form to defaults (avoid carrying old edits)
    setSuiteForm({
      branchId,
      code: "",
      name: "",
      status: "DRAFT",
      locationNodeId: "",
      isActive: true,
      minTheatres: 1,
      minTablesPerTheatre: 1,
      requireRecoveryBays: true,
      minRecoveryBays: 1,
      notes: "",
    });

    // pre-suggest code
    try {
      const sug = await apiFetch<{ code: string }>(
        `/api/infrastructure/ot/suites/suggest-code?branchId=${encodeURIComponent(branchId)}`
      );
      setSuiteForm((p) => ({ ...p, code: sug?.code || "" }));
    } catch {
      setSuiteForm((p) => ({ ...p, code: "" }));
    }

    setSuiteDlgOpen(true);
  }

  async function openEditSuite(s: OtSuite) {
    setSuiteEditing(s);
    const cfg = (s.config ?? {}) as any;
    setSuiteForm({
      branchId: s.branchId,
      code: s.code,
      name: s.name,
      status: (s.status || "DRAFT") as OtSuiteStatus,
      locationNodeId: s.locationNodeId || "",
      isActive: s.isActive,
      minTheatres: Math.max(1, Number(cfg.minTheatres ?? 1) || 1),
      minTablesPerTheatre: Math.max(1, Number(cfg.minTablesPerTheatre ?? 1) || 1),
      requireRecoveryBays: cfg.requireRecoveryBays === undefined ? true : !!cfg.requireRecoveryBays,
      minRecoveryBays: Math.max(1, Number(cfg.minRecoveryBays ?? 1) || 1),
      notes: String(cfg.notes ?? ""),
    });
    setSuiteDlgOpen(true);
  }

  async function archiveSuite(id: string) {
    const srow = suites.find((x) => x.id === id) || (selectedSuite && selectedSuite.id === id ? selectedSuite : null);

    openConfirm({
      kind: "danger",
      title: "Archive OT Suite",
      description: srow
        ? `You are about to archive "${srow.name}" (${srow.code}).`
        : "You are about to archive this OT Suite.",
      confirmText: "Archive Suite",
      hint: "Archiving is a soft delete and is intended for setup clean-up. Operational usage comes later.",
      bullets: [
        "Suite will be marked inactive/archived",
        "All spaces (theatres, recovery, stores, etc.) under the suite will be archived",
        "All equipment mapped to the suite/spaces will be archived",
      ],
      onConfirm: async () => {
        await apiFetch(`/api/infrastructure/ot/suites/${encodeURIComponent(id)}`, { method: "DELETE" });
        toast({ title: "Archived", description: "OT Suite archived.", duration: 1400 });
        if (branchId) await loadSuites(branchId, false);
      },
    });
  }

  // ---------------- Actions: Spaces ----------------

  async function openCreateSpace() {
    if (!suiteId) return;
    setSpaceEditing(null);

    // default type THEATRE and suggest code
    const nextType: OtSpaceType = "THEATRE";
    try {
      const sug = await apiFetch<{ code: string }>(
        `/api/infrastructure/ot/suites/${encodeURIComponent(suiteId)}/spaces/suggest-code?type=${encodeURIComponent(
          nextType
        )}`
      );
      setSpaceForm((p) => ({ ...p, type: nextType, code: sug?.code || "" }));
    } catch {
      setSpaceForm((p) => ({ ...p, type: nextType, code: "" }));
    }

    setSpaceDlgOpen(true);
  }

  async function openEditSpace(s: OtSpace) {
    setSpaceEditing(s);
    setSpaceForm({
      type: s.type,
      code: s.code,
      name: s.name,
      locationNodeId: s.locationNodeId || "",
      notes: s.notes || "",
      isActive: s.isActive,
      createDefaultTable: true,
    });
    setSpaceDlgOpen(true);
  }

  async function archiveSpace(spaceId: string) {
    const sp = suiteDetails?.spaces?.find((x) => x.id === spaceId) || null;

    openConfirm({
      kind: "danger",
      title: "Delete OT Space",
      description: sp
        ? `Delete "${sp.name}" (${sp.code})? This is a soft delete.`
        : "Delete this OT space? This is a soft delete.",
      confirmText: "Delete Space",
      hint: "Used for setup clean-up. You can recreate the space later if needed.",
      bullets: [
        "The space will be archived (soft delete)",
        "If this is a Theatre, its tables will be archived with it",
        "Go-Live checks may fail if minimum spaces are not met",
      ],
      onConfirm: async () => {
        await apiFetch(`/api/infrastructure/ot/spaces/${encodeURIComponent(spaceId)}`, { method: "DELETE" });
        toast({ title: "Deleted", description: "Space archived.", duration: 1400 });
        if (suiteId) await loadSuiteDetails(suiteId);
      },
    });
  }

  // ---------------- Actions: Tables ----------------

  async function openCreateTable(theatreId: string) {
    setTableEditing({ theatreId });
    // prefill code
    const existing =
      theatres
        .find((t) => t.theatre?.id === theatreId)
        ?.theatre?.tables?.filter((x) => x.isActive)
        .map((t) => t.code) || [];

    let max = 0;
    for (const c of existing) {
      const m = /^T(\d{1,3})$/i.exec(c || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    const next = String(max + 1).padStart(2, "0");

    setTableForm({
      code: `T${next}`,
      name: `OT Table ${next}`,
      isPrimary: existing.length === 0,
      manufacturer: "",
      model: "",
      serialNo: "",
      isActive: true,

    });

    setTableDlgOpen(true);
  }

  async function openEditTable(theatreId: string, table: OtTable) {
    setTableEditing({ theatreId, table });
    setTableForm({
      code: table.code,
      name: table.name,
      isPrimary: !!table.isPrimary,
      manufacturer: table.manufacturer || "",
      model: table.model || "",
      serialNo: table.serialNo || "",
      isActive: table.isActive,
    });
    setTableDlgOpen(true);
  }

  async function archiveTable(id: string) {
    const allTables = theatres.flatMap((x) => (x.theatre?.tables || []).filter((t) => t.isActive));
    const t = allTables.find((tb) => tb.id === id);
    const label = t ? `${t.name} (${t.code})` : "";

    openConfirm({
      kind: "danger",
      title: "Delete OT Table",
      description: label ? `Delete "${label}"? This is a soft delete.` : "Delete this OT table? This is a soft delete.",
      confirmText: "Delete Table",
      hint: "Tables are used later in OT scheduling and operation workflows. Delete only if it was created by mistake.",
      bullets: [
        "The table will be archived (soft delete)",
        "If this was the last active table for a theatre, Go-Live checks may fail",
      ],
      onConfirm: async () => {
        await apiFetch(`/api/infrastructure/ot/tables/${encodeURIComponent(id)}`, { method: "DELETE" });
        toast({ title: "Deleted", description: "Table archived.", duration: 1400 });
        if (suiteId) await loadSuiteDetails(suiteId);
      },
    });
  }

  // ---------------- Actions: Equipment ----------------

  async function openCreateEquipment() {
    setEqEditing(null);
    setEqForm({
      category: "OTHER",
      name: "",
      qty: 1,
      manufacturer: "",
      model: "",
      serialNo: "",
      spaceId: "SUITE",
      isActive: true,

    });
    setEqDlgOpen(true);
  }

  async function openEditEquipment(eq: OtEquipment) {
    setEqEditing(eq);
    setEqForm({
      category: eq.category || "OTHER",
      name: eq.name,
      qty: eq.qty || 1,
      manufacturer: eq.manufacturer || "",
      model: eq.model || "",
      serialNo: eq.serialNo || "",
      spaceId: eq.spaceId ? eq.spaceId : "SUITE",
      isActive: eq.isActive,
    });
    setEqDlgOpen(true);
  }

  async function archiveEquipment(id: string) {
    const eq = suiteDetails?.equipment?.find((x) => x.id === id) || null;
    const label = eq ? `${eq.name} (x${eq.qty})` : "";

    openConfirm({
      kind: "danger",
      title: "Delete Equipment",
      description: label ? `Delete "${label}"? This is a soft delete.` : "Delete this equipment item? This is a soft delete.",
      confirmText: "Delete Equipment",
      hint: "Equipment register improves OT readiness and later asset tracking. Delete only if created by mistake.",
      bullets: [
        "The equipment entry will be archived (soft delete)",
        "Go-Live checks may consider equipment as recommended (not mandatory)",
      ],
      onConfirm: async () => {
        await apiFetch(`/api/infrastructure/ot/equipment/${encodeURIComponent(id)}`, { method: "DELETE" });
        toast({ title: "Deleted", description: "Equipment archived.", duration: 1400 });
        if (suiteId) await loadSuiteDetails(suiteId);
      },
    });
  }

  // ---------------- Quick Templates (setup-only) ----------------

  function applyTemplateBasic() {
    if (!suiteId) return;
    setTplErr(null);
    setTplDlgOpen(true);
  }

  async function runTemplateBasic() {
    if (!suiteId) return;

    setTplErr(null);
    setTplBusy(true);
    setBusy(true);

    try {
      const plan: { type: OtSpaceType; name: string; createDefaultTable?: boolean }[] = [
        { type: "THEATRE", name: "Operation Theatre 1", createDefaultTable: true },
        { type: "THEATRE", name: "Operation Theatre 2", createDefaultTable: true },
        { type: "RECOVERY_BAY", name: "Recovery Bay 1" },
        { type: "RECOVERY_BAY", name: "Recovery Bay 2" },
        { type: "RECOVERY_BAY", name: "Recovery Bay 3" },
        { type: "RECOVERY_BAY", name: "Recovery Bay 4" },
        { type: "SCRUB_ROOM", name: "Scrub Room" },
        { type: "PREOP_HOLDING", name: "Pre-Op Holding" },
        { type: "STERILE_STORE", name: "Sterile Store" },
      ];

      for (const item of plan) {
        const sug = await apiFetch<{ code: string }>(
          `/api/infrastructure/ot/suites/${encodeURIComponent(suiteId)}/spaces/suggest-code?type=${encodeURIComponent(
            item.type
          )}`
        );

        await apiFetch(`/api/infrastructure/ot/suites/${encodeURIComponent(suiteId)}/spaces`, {
          method: "POST",
          body: JSON.stringify({
            type: item.type,
            code: sug?.code || "",
            name: item.name,
            createDefaultTable: item.createDefaultTable ?? true,
          }),
        });
      }

      toast({ title: "Template applied", description: "Basic OT layout created successfully.", duration: 1600 });
      setTplDlgOpen(false);
      await loadSuiteDetails(suiteId);
    } catch (e: any) {
      const msg = errMsg(e);
      setTplErr(msg);
      toast({ title: "Template failed", description: msg, variant: "destructive" as any });
    } finally {
      setTplBusy(false);
      setBusy(false);
    }
  }



  // ---------------- Destructive maintenance actions (setup-only) ----------------

  function removeTemplateBasic() {
    if (!suiteId || !suiteDetails) return;

    const plan: { type: OtSpaceType; name: string }[] = [
      { type: "THEATRE", name: "Operation Theatre 1" },
      { type: "THEATRE", name: "Operation Theatre 2" },
      { type: "RECOVERY_BAY", name: "Recovery Bay 1" },
      { type: "RECOVERY_BAY", name: "Recovery Bay 2" },
      { type: "RECOVERY_BAY", name: "Recovery Bay 3" },
      { type: "RECOVERY_BAY", name: "Recovery Bay 4" },
      { type: "SCRUB_ROOM", name: "Scrub Room" },
      { type: "PREOP_HOLDING", name: "Pre-Op Holding" },
      { type: "STERILE_STORE", name: "Sterile Store" },
    ];

    const wanted = new Set(plan.map((p) => `${p.type}::${p.name}`));
    const matches = (suiteDetails.spaces || [])
      .filter((sp) => sp.isActive)
      .filter((sp) => wanted.has(`${sp.type}::${sp.name}`));

    if (matches.length === 0) {
      toast({ title: "Nothing to remove", description: "No Basic Template spaces found in this suite.", duration: 1600 });
      return;
    }

    openConfirm({
      kind: "warning",
      title: "Remove Template Spaces",
      description: "This will archive spaces that match the Basic OT Template names. It will not delete the OT Suite itself.",
      confirmText: "Remove Template",
      hint: "This is a soft delete. If your staff created spaces with the same names, they will also be affected.",
      bullets: matches.slice(0, 10).map((sp) => `${spaceTypeLabel(sp.type)} • ${sp.name} (${sp.code})`).concat(matches.length > 10 ? [`…and ${matches.length - 10} more`] : []),
      onConfirm: async () => {
        // Archive equipment mapped to the template spaces, then archive the spaces.
        const matchIds = new Set(matches.map((m) => m.id));
        const eqs = (suiteDetails.equipment || []).filter((e) => e.isActive && !!e.spaceId && matchIds.has(e.spaceId));
        for (const e of eqs) {
          try {
            await apiFetch(`/api/infrastructure/ot/equipment/${encodeURIComponent(e.id)}`, { method: "DELETE" });
          } catch {
            // ignore
          }
        }

        for (const sp of matches) {
          await apiFetch(`/api/infrastructure/ot/spaces/${encodeURIComponent(sp.id)}`, { method: "DELETE" });
        }

        toast({ title: "Removed", description: "Template spaces archived.", duration: 1600 });
        await loadSuiteDetails(suiteId);
      },
    });
  }

  function requestResetSuite() {
    if (!suiteId) return;

    const activeSpaces = (suiteDetails?.spaces || []).filter((x) => x.isActive);
    const activeEq = (suiteDetails?.equipment || []).filter((x) => x.isActive);

    openConfirm({
      kind: "danger",
      title: "Reset OT Suite",
      description: "This will archive ALL spaces, tables and equipment under this suite. The OT Suite record remains.",
      confirmText: "Reset Suite",
      hint: "Use this only during setup if the suite was configured incorrectly and you want to rebuild from scratch.",
      bullets: [
        `${activeSpaces.length} active spaces will be archived`,
        `${activeEq.length} equipment items will be archived`,
        "Theatre tables will be archived when their Theatre spaces are archived",
      ],
      onConfirm: async () => {
        // Ensure we operate on latest suiteDetails
        const d = suiteDetails || (await apiFetch<OtSuiteDetails>(`/api/infrastructure/ot/suites/${encodeURIComponent(suiteId)}`));

        const eqs = (d.equipment || []).filter((e) => e.isActive);
        for (const e of eqs) {
          try {
            await apiFetch(`/api/infrastructure/ot/equipment/${encodeURIComponent(e.id)}`, { method: "DELETE" });
          } catch {
            // ignore
          }
        }

        const spaces = (d.spaces || []).filter((sp) => sp.isActive);
        for (const sp of spaces) {
          try {
            await apiFetch(`/api/infrastructure/ot/spaces/${encodeURIComponent(sp.id)}`, { method: "DELETE" });
          } catch {
            // ignore
          }
        }

        toast({ title: "Reset complete", description: "Suite cleared. You can apply a template or rebuild manually.", duration: 1800 });
        await loadSuiteDetails(suiteId);
      },
    });
  }
  // ---------------- Forms State ----------------

  const [suiteForm, setSuiteForm] = React.useState({
    branchId: "",
    code: "",
    name: "",
    status: "DRAFT" as OtSuiteStatus,
    locationNodeId: "",
    isActive: true,

    // Admin-friendly baseline stored in config JSON
    minTheatres: 1,
    minTablesPerTheatre: 1,
    requireRecoveryBays: true,
    minRecoveryBays: 1,
    notes: "",
  });

  const [spaceForm, setSpaceForm] = React.useState({
    type: "THEATRE" as OtSpaceType,
    code: "",
    name: "",
    locationNodeId: "",
    notes: "",
    isActive: true,
    createDefaultTable: true,
  });

  const [tableForm, setTableForm] = React.useState({
    code: "",
    name: "",
    isPrimary: false,
    manufacturer: "",
    model: "",
    serialNo: "",
    isActive: true,
  });

  const [eqForm, setEqForm] = React.useState({
    category: "OTHER",
    name: "",
    qty: 1,
    manufacturer: "",
    model: "",
    serialNo: "",
    spaceId: "SUITE" as string, // "SUITE" or actual spaceId
    isActive: true,
  });

  // ---------------- Submit handlers ----------------

  async function submitSuite() {
    if (!branchId) return;
    setBusy(true);
    try {
      const config = {
        minTheatres: Math.max(1, Number((suiteForm as any).minTheatres) || 1),
        minTablesPerTheatre: Math.max(1, Number((suiteForm as any).minTablesPerTheatre) || 1),
        requireRecoveryBays: !!(suiteForm as any).requireRecoveryBays,
        minRecoveryBays: Math.max(1, Number((suiteForm as any).minRecoveryBays) || 1),
        notes: ((suiteForm as any).notes || "").trim() || undefined,
      };

      if (!suiteForm.name.trim()) throw new Error("Suite name is required.");
      const locId = suiteForm.locationNodeId?.trim();
      if (!locId || locId === "__NO_LOCATIONS__") {
        throw new Error("Location is required. Please select a LocationNode for this OT Suite.");
      }

      if (!suiteEditing) {
        await apiFetch(`/api/infrastructure/ot/suites`, {
          method: "POST",
          body: JSON.stringify({
            branchId,
            code: suiteForm.code,
            name: suiteForm.name,
            locationNodeId: locId,
            config,
          }),
        });
        toast({ title: "Created", description: "OT Suite created.", duration: 1400 });
      } else {
        await apiFetch(`/api/infrastructure/ot/suites/${encodeURIComponent(suiteEditing.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: suiteForm.name,
            status: suiteForm.status,
            locationNodeId: locId,
            isActive: suiteForm.isActive,
            config,
          }),
        });
        toast({ title: "Updated", description: "OT Suite updated.", duration: 1400 });
      }

      setSuiteDlgOpen(false);
      await loadSuites(branchId, true);
    } catch (e: any) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function onSpaceTypeChange(next: OtSpaceType) {
    setSpaceForm((p) => ({ ...p, type: next }));
    if (!suiteId) return;
    try {
      const sug = await apiFetch<{ code: string }>(
        `/api/infrastructure/ot/suites/${encodeURIComponent(suiteId)}/spaces/suggest-code?type=${encodeURIComponent(
          next
        )}`
      );
      setSpaceForm((p) => ({ ...p, code: sug?.code || p.code }));
    } catch {
      // ignore
    }
  }

  async function submitSpace() {
    if (!suiteId) return;
    setBusy(true);
    try {
      if (!spaceForm.name.trim()) throw new Error("Space name is required.");

      if (!spaceEditing) {
        await apiFetch(`/api/infrastructure/ot/suites/${encodeURIComponent(suiteId)}/spaces`, {
          method: "POST",
          body: JSON.stringify({
            type: spaceForm.type,
            code: spaceForm.code,
            name: spaceForm.name,
            locationNodeId: spaceForm.locationNodeId?.trim() || null,
            notes: spaceForm.notes?.trim() || null,
            createDefaultTable: spaceForm.createDefaultTable,
          }),
        });
        toast({ title: "Created", description: "Space created.", duration: 1400 });
      } else {
        await apiFetch(`/api/infrastructure/ot/spaces/${encodeURIComponent(spaceEditing.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: spaceForm.name,
            locationNodeId: spaceForm.locationNodeId?.trim() || null,
            notes: spaceForm.notes?.trim() || null,
            isActive: spaceForm.isActive,
          }),
        });
        toast({ title: "Updated", description: "Space updated.", duration: 1400 });
      }

      setSpaceDlgOpen(false);
      await loadSuiteDetails(suiteId);
    } catch (e: any) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function submitTable() {
    if (!suiteId || !tableEditing) return;
    setBusy(true);
    try {
      if (!tableForm.name.trim()) throw new Error("Table name is required.");

      if (!tableEditing.table) {
        await apiFetch(`/api/infrastructure/ot/theatres/${encodeURIComponent(tableEditing.theatreId)}/tables`, {
          method: "POST",
          body: JSON.stringify({
            code: tableForm.code,
            name: tableForm.name,
            isPrimary: tableForm.isPrimary,
            manufacturer: tableForm.manufacturer?.trim() || null,
            model: tableForm.model?.trim() || null,
            serialNo: tableForm.serialNo?.trim() || null,
          }),
        });
        toast({ title: "Created", description: "OT table created.", duration: 1400 });
      } else {
        await apiFetch(`/api/infrastructure/ot/tables/${encodeURIComponent(tableEditing.table.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: tableForm.name,
            isPrimary: tableForm.isPrimary,
            manufacturer: tableForm.manufacturer?.trim() || null,
            model: tableForm.model?.trim() || null,
            serialNo: tableForm.serialNo?.trim() || null,
            isActive: tableForm.isActive,
          }),
        });
        toast({ title: "Updated", description: "OT table updated.", duration: 1400 });
      }

      setTableDlgOpen(false);
      await loadSuiteDetails(suiteId);
    } catch (e: any) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function submitEquipment() {
    if (!suiteId) return;
    setBusy(true);
    try {
      if (!eqForm.name.trim()) throw new Error("Equipment name is required.");

      const payload = {
        category: eqForm.category,
        name: eqForm.name,
        qty: Number(eqForm.qty) || 1,
        manufacturer: eqForm.manufacturer?.trim() || null,
        model: eqForm.model?.trim() || null,
        serialNo: eqForm.serialNo?.trim() || null,
        isActive: eqForm.isActive,
        spaceId: eqForm.spaceId === "SUITE" ? null : eqForm.spaceId,
      };

      if (!eqEditing) {
        await apiFetch(`/api/infrastructure/ot/suites/${encodeURIComponent(suiteId)}/equipment`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Created", description: "Equipment added.", duration: 1400 });
      } else {
        await apiFetch(`/api/infrastructure/ot/equipment/${encodeURIComponent(eqEditing.id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Updated", description: "Equipment updated.", duration: 1400 });
      }

      setEqDlgOpen(false);
      await loadSuiteDetails(suiteId);
    } catch (e: any) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function refreshReadiness() {
    if (!suiteId) return;
    try {
      const r = await apiFetch<SuiteReadiness>(`/api/infrastructure/ot/suites/${encodeURIComponent(suiteId)}/readiness`);
      setReadiness(r);
      toast({ title: "Updated", description: "Go-Live checks refreshed.", duration: 1200 });
    } catch (e: any) {
      toast({ title: "Failed", description: errMsg(e), variant: "destructive" as any });
    }
  }

  // ---------------- Render ----------------

  return (
    <AppShell title="OT Setup">
      <RequirePerm perm="ot.suite.read">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Hospital className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Operation Theatres</div>
              <div className="mt-1 text-sm text-zc-muted">
                Setup OT Suites, Theatres, Recovery Bays, Tables and Equipment.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void loadBranches(true)} disabled={busy}>
              <RefreshCw className={cn("h-4 w-4", busy ? "animate-spin" : "")} />
              Refresh
            </Button>

            <Button
              variant="primary"
              className="px-5 gap-2"
              onClick={() => void openCreateSuite()}
              disabled={!branchId || busy}
              title={!branchId ? "Select a branch first" : ""}
            >
              <IconPlus className="h-4 w-4" />
              Create OT Suite
            </Button>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Pick a branch, search assets, and review upcoming due/expiry signals.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select
                value={branchId || ""}
                onValueChange={(v) => {
                  setBranchId(v);
                  if (isGlobalScope) setActiveBranchId(v || null);
}}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                  <SelectValue placeholder="Select a branch..." />
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

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Suites</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{suites.length}</div>
                <div className="mt-1 text-xs text-zc-muted">In selected branch</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Active Spaces</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{(suiteDetails?.spaces || []).filter((x) => x.isActive).length}</div>
                <div className="mt-1 text-xs text-zc-muted">For selected suite</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Active Equipment</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{(suiteDetails?.equipment || []).filter((x) => x.isActive).length}</div>
                <div className="mt-1 text-xs text-zc-muted">For selected suite</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input value={suiteQ} onChange={(e) => setSuiteQ(e.target.value)} placeholder="Search OT suites by name or code…" className="pl-10" />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filteredSuites.length}</span> of{' '}
                <span className="font-semibold tabular-nums text-zc-text">{suites.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main tabs */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Manage Equipment</CardTitle>
                <CardDescription>Assets, schedules, compliance and downtime.</CardDescription>
              </div>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList
                  className={cn(
                    "h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1",
                  )}
                >
                  <TabsTrigger
                    value="suites"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Suites
                  </TabsTrigger>
                  <TabsTrigger
                    value="checks"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Readiness / Checks
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <Tabs value={activeTab}>
              <TabsContent value="suites" className="mt-0">
                <div className="grid gap-4">
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5 text-zc-accent" />
                        OT Suites (OT Complex)
                      </CardTitle>
                    <CardDescription>Manage OT suites in the selected branch.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                      {loading ? (
                        <div className="grid gap-3">
                          <Skeleton className="h-11 w-full rounded-xl" />
                          <Skeleton className="h-24 w-full rounded-xl" />
                          <Skeleton className="h-24 w-full rounded-xl" />
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Suites</div>
                            <Button size="sm" className="gap-2" onClick={() => void openCreateSuite()} disabled={!branchId || busy}>
                              <Plus className="h-4 w-4" />
                              New Suite
                            </Button>
                          </div>

                          {suites.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                              No OT suites yet. Create your first OT Suite (OT Complex) for this branch.
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              {filteredSuites.map((s) => {
                                const active = s.id === suiteId;
                                return (
                                  <button
                                    key={s.id}
                                    className={cn(
                                      "w-full rounded-xl border p-3 text-left transition-all",
                                      active
                                        ? "border-indigo-200/70 bg-indigo-50/50 dark:border-indigo-900/40 dark:bg-indigo-900/20"
                                        : "border-zc-border bg-zc-panel/10 hover:bg-zc-panel/25"
                                    )}
                                    onClick={() => setSuiteId(s.id)}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold text-zc-text">{s.name}</span>
                                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", suiteStatusTone(s.status))}>
                                            {s.status || "DRAFT"}
                                          </span>
                                        </div>
                                        <div className="mt-1 text-xs text-zc-muted">
                                          <span className="font-mono">{s.code}</span>
                                          {s.locationNodeId ? (
                                            <>
                                              <span className="mx-2 text-zc-muted/60">•</span>
                                              <span className="truncate">
                                                {findLocationLabel(locationLabelById, s.locationNodeId) || s.locationNodeId}
                                              </span>
                                            </>
                                          ) : null}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            void openEditSuite(s);
                                          }}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-red-600 hover:text-red-700"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            void archiveSuite(s.id);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {!selectedSuite ? (
                    <Card className="overflow-hidden">
                      <CardHeader>
                        <CardTitle>Suite Details</CardTitle>
                        <CardDescription>Select an OT Suite to manage theatres, recovery bays, tables and equipment.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        <div className="rounded-2xl border border-dashed border-zc-border bg-zc-panel/15 p-6 text-sm text-zc-muted">
                          No suite selected.
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="overflow-hidden">
                      <CardHeader className="pb-0">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <CardTitle className="flex flex-wrap items-center gap-2">
                              <span>{selectedSuite.name}</span>
                              <Badge variant="info" className="font-mono">
                                {selectedSuite.code}
                              </Badge>
                              {suiteStatusBadge(selectedSuite.status)}
                              {readiness ? (
                                readiness.isReady ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Ready for Operations
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Not Ready
                                  </span>
                                )
                              ) : null}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              Branch:{" "}
                              <span className="font-semibold text-zc-text">
                                {selectedBranch ? `${selectedBranch.name} (${selectedBranch.code})` : selectedSuite.branchId}
                              </span>
                              {selectedSuite.locationNodeId ? (
                                <>
                                                <span className="mx-2 text-zc-muted/60">•</span>
                                  Location: <span className="font-mono">{findLocationLabel(locationLabelById, selectedSuite.locationNodeId) || selectedSuite.locationNodeId}</span>
                                </>
                              ) : null}
                            </CardDescription>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                              <Button
                                variant="outline"
                                className="px-4 gap-2 rounded-xl"
                                onClick={() => suiteId && void loadSuiteDetails(suiteId)}
                                disabled={busy}
                              >
                                <RefreshCw className={cn("h-4 w-4", busy ? "animate-spin" : "")} />
                                Refresh
                              </Button>

                              <Button
                                variant="outline"
                                className="px-4 gap-2 rounded-xl border-amber-200 bg-amber-50/50 text-amber-800 hover:bg-amber-100/60 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-200"
                                onClick={() => void applyTemplateBasic()}
                                disabled={busy}
                              >
                                <Settings2 className="h-4 w-4" />
                                Apply Template
                              </Button>

                              <Button
                                variant="outline"
                                className="px-4 gap-2 rounded-xl border-amber-200 bg-amber-50/50 text-amber-800 hover:bg-amber-100/60 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-200"
                                onClick={() => void removeTemplateBasic()}
                                disabled={busy || !suiteDetails}
                                title="Archive spaces created by the Basic OT Template"
                              >
                                <ClipboardList className="h-4 w-4" />
                                Remove Template
                              </Button>

                              <Button
                                variant="outline"
                                className="px-4 gap-2 rounded-xl border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.10)] text-[rgb(var(--zc-danger))] hover:bg-[rgb(var(--zc-danger-rgb)/0.15)]"
                                onClick={() => void requestResetSuite()}
                                disabled={busy}
                                title="Archive all spaces and equipment under this suite"
                              >
                                <Trash2 className="h-4 w-4" />
                                Reset Suite
                              </Button>

                              <Button
                                variant="secondary"
                                className="px-4 gap-2 rounded-xl"
                                onClick={() => void openEditSuite(selectedSuite)}
                                disabled={busy}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit Suite
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6">
                        {!suiteDetails ? (
                          <div className="grid gap-3">
                            <Skeleton className="h-10 w-full rounded-xl" />
                            <Skeleton className="h-44 w-full rounded-xl" />
                          </div>
                        ) : (
                          <Tabs defaultValue="spaces">
                            <TabsList
                              className={cn(
                                "grid w-full grid-cols-2 gap-2 rounded-2xl border border-zc-border bg-zc-panel/20 p-1 sm:grid-cols-3",
                              )}
                            >
                              <TabsTrigger
                                value="spaces"
                                className={cn(
                                  "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                                )}
                              >
                                Spaces
                              </TabsTrigger>
                              <TabsTrigger
                                value="tables"
                                className={cn(
                                  "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                                )}
                              >
                                Tables
                              </TabsTrigger>
                              <TabsTrigger
                                value="equipment"
                                className={cn(
                                  "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                                )}
                              >
                                Equipment
                              </TabsTrigger>
                            </TabsList>

                            {/* Spaces */}
                            <TabsContent value="spaces" className="mt-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm text-zc-muted">
                                  Create theatres, recovery bays and supporting rooms (scrub, induction, stores).
                                </div>
                                <Button className="gap-2" onClick={() => void openCreateSpace()} disabled={busy}>
                                  <Plus className="h-4 w-4" />
                                  Add Space
                                </Button>
                              </div>

                              <div className="mt-4 grid gap-3">
                                {(suiteDetails.spaces || []).filter((s) => s.isActive).length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                                    No spaces yet. Add theatres first, then recovery bays and supporting rooms.
                                  </div>
                                ) : (
                                  (suiteDetails.spaces || [])
                                    .filter((s) => s.isActive)
                                    .sort((a, b) => (a.type + a.code).localeCompare(b.type + b.code))
                                    .map((s) => (
                                      <div key={s.id} className="rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                          <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <div className="text-sm font-semibold text-zc-text">
                                                {s.name}{" "}
                                                <span className="font-mono text-xs text-zc-muted">({s.code})</span>
                                              </div>
                                              {spaceTypeBadge(s.type)}
                                            </div>
                                            <div className="mt-1 text-xs text-zc-muted">
                                              {s.locationNodeId ? (
                                                <>
                                                  Location:{" "}
                                                  <span className="font-mono">{findLocationLabel(locationLabelById, s.locationNodeId) || s.locationNodeId}</span>
                                                </>
                                              ) : (
                                                <>No location linked</>
                                              )}
                                              {s.notes ? (
                                                <>
                                                  <span className="mx-2 text-zc-muted/60">•</span>
                                                  {s.notes}
                                                </>
                                              ) : null}
                                            </div>

                                            {s.type === "THEATRE" ? (
                                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zc-muted">
                                                <span className="inline-flex items-center gap-1">
                                                  <CornerDownRight className="h-4 w-4" />
                                                  Tables:{" "}
                                                  <span className="font-semibold text-zc-text">
                                                    {(s.theatre?.tables || []).filter((t) => t.isActive).length}
                                                  </span>
                                                </span>
                                                <span className="text-zc-muted/60">•</span>
                                                <span className="inline-flex items-center gap-1">
                                                  Primary:{" "}
                                                  <span className="font-semibold text-zc-text">
                                                    {(s.theatre?.tables || []).find((t) => t.isActive && t.isPrimary)?.code || "-"}
                                                  </span>
                                                </span>
                                              </div>
                                            ) : null}
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" className="gap-2" onClick={() => void openEditSpace(s)} disabled={busy}>
                                              <Pencil className="h-4 w-4" />
                                              Edit
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="gap-2 text-red-600 hover:text-red-700"
                                              onClick={() => void archiveSpace(s.id)}
                                              disabled={busy}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                              Delete
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                )}
                              </div>
                            </TabsContent>

                            {/* Tables */}
                            <TabsContent value="tables" className="mt-4">
                              <div className="text-sm text-zc-muted">
                                Tables live inside theatres. Each theatre should have at least one active table, and exactly one primary table.
                              </div>

                              <div className="mt-4 grid gap-4">
                                {theatres.length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                                    No theatres yet. Create a space of type "Theatre" first.
                                  </div>
                                ) : (
                                  theatres.map((s) => {
                                    const th = s.theatre!;
                                    const tables = (th.tables || []).filter((t) => t.isActive);
                                    return (
                                      <div key={th.id} className="rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <div className="text-sm font-semibold text-zc-text">
                                              {s.name}{" "}
                                              <span className="font-mono text-xs text-zc-muted">({s.code})</span>
                                            </div>
                                            <div className="mt-1 text-xs text-zc-muted">
                                              Active tables:{" "}
                                              <span className="font-semibold text-zc-text">{tables.length}</span>
                                            </div>
                                          </div>

                                          <Button size="sm" className="gap-2" onClick={() => void openCreateTable(th.id)} disabled={busy}>
                                            <Plus className="h-4 w-4" />
                                            Add Table
                                          </Button>
                                        </div>

                                        <Separator className="my-4" />

                                        {tables.length === 0 ? (
                                          <div className="text-sm text-zc-muted">
                                            No active tables. Add at least one table to make this theatre schedulable.
                                          </div>
                                        ) : (
                                          <div className="grid gap-2">
                                            {tables
                                              .slice()
                                              .sort((a, b) => a.code.localeCompare(b.code))
                                              .map((t) => (
                                                <div key={t.id} className="flex flex-col gap-2 rounded-xl border border-zc-border bg-zc-panel/5 p-3 md:flex-row md:items-center md:justify-between">
                                                  <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <span className="font-mono text-xs text-zc-muted">{t.code}</span>
                                                      <span className="text-sm font-semibold text-zc-text">{t.name}</span>
                                                      {tablePrimaryBadge(t.isPrimary)}
                                                    </div>
                                                    {(t.manufacturer || t.model || t.serialNo) ? (
                                                      <div className="mt-1 text-xs text-zc-muted">
                                                        {[t.manufacturer, t.model, t.serialNo].filter(Boolean).join(" • ")}
                                                      </div>
                                                    ) : null}
                                                  </div>

                                                  <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" className="gap-2" onClick={() => void openEditTable(th.id, t)} disabled={busy}>
                                                      <Pencil className="h-4 w-4" />
                                                      Edit
                                                    </Button>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="gap-2 text-red-600 hover:text-red-700"
                                                      onClick={() => void archiveTable(t.id)}
                                                      disabled={busy}
                                                    >
                                                      <Trash2 className="h-4 w-4" />
                                                      Delete
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </TabsContent>

                            {/* Equipment */}
                            <TabsContent value="equipment" className="mt-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm text-zc-muted">
                                  Maintain OT equipment registry (suite-level or attached to a specific room).
                                </div>
                                <Button className="gap-2" onClick={() => void openCreateEquipment()} disabled={busy}>
                                  <Plus className="h-4 w-4" />
                                  Add Equipment
                                </Button>
                              </div>

                              <div className="mt-4 grid gap-2">
                                {(suiteDetails.equipment || []).filter((e) => e.isActive).length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-zc-border bg-zc-panel/15 p-4 text-sm text-zc-muted">
                                    No equipment added yet.
                                  </div>
                                ) : (
                                  (suiteDetails.equipment || [])
                                    .filter((e) => e.isActive)
                                    .sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name))
                                    .map((e) => (
                                      <div key={e.id} className="flex flex-col gap-2 rounded-2xl border border-zc-border bg-zc-panel/10 p-4 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            {equipmentCategoryBadge(e.category)}
                                            <div className="text-sm font-semibold text-zc-text">{e.name}</div>
                                            {qtyBadge(e.qty)}
                                            {equipmentLevelBadge(e.spaceId || undefined)}
                                          </div>

                                          {(e.manufacturer || e.model || e.serialNo) ? (
                                            <div className="mt-1 text-xs text-zc-muted">
                                              {[e.manufacturer, e.model, e.serialNo].filter(Boolean).join(" • ")}
                                            </div>
                                          ) : null}
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <Button variant="outline" size="sm" className="gap-2" onClick={() => void openEditEquipment(e)} disabled={busy}>
                                            <Pencil className="h-4 w-4" />
                                            Edit
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 text-red-600 hover:text-red-700"
                                            onClick={() => void archiveEquipment(e.id)}
                                            disabled={busy}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                          </Button>
                                        </div>
                                      </div>
                                    ))
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="checks" className="mt-0">
                <div className="grid gap-4">
                  {!selectedSuite ? (
                    <Card className="overflow-hidden">
                      <CardHeader>
                        <CardTitle>Readiness / Checks</CardTitle>
                        <CardDescription>Select an OT Suite to review go-live readiness.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        <div className="rounded-2xl border border-dashed border-zc-border bg-zc-panel/15 p-6 text-sm text-zc-muted">
                          No suite selected.
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="overflow-hidden">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ClipboardCheck className="h-5 w-5 text-zc-accent" />
                          Readiness / Checks
                        </CardTitle>
                        <CardDescription>
                          Review go-live readiness for {selectedSuite.name}.
                        </CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-zc-muted">
                            Setup go-live checks for OT Suite. This will drive readiness in the OT module.
                          </div>
                          <Button variant="outline" className="gap-2" onClick={() => void refreshReadiness()} disabled={busy}>
                            <RefreshCw className={cn("h-4 w-4", busy ? "animate-spin" : "")} />
                            Refresh Checks
                          </Button>
                        </div>

                        <div className="mt-4 rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                              <ClipboardCheck className="h-4 w-4 text-zc-accent" />
                              Go-Live Validator
                            </div>
                            {readiness ? (readiness.isReady ? okBadge(true, "Ready", "Not Ready") : okBadge(false, "Ready", "Not Ready")) : okBadge(false, "Loaded", "Not loaded")}
                          </div>

                          <Separator className="my-4" />

                          {!readiness ? (
                            <div className="text-sm text-zc-muted">
                              Checks not available yet. Ensure backend readiness endpoint is enabled for this suite.
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              {readiness.checks.map((c) => (
                                <div key={c.key} className="flex items-start justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/5 p-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-zc-text">{c.label}</div>
                                    {c.details ? (
                                      <div className="mt-1 text-xs text-zc-muted font-mono">
                                        {JSON.stringify(c.details)}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div>{okBadge(c.ok)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 rounded-2xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                          <div className="flex items-center gap-2 font-semibold text-zc-text">
                            <ClipboardList className="h-4 w-4 text-zc-accent" />
                            Recommended baseline for setup
                          </div>
                          <ul className="mt-2 list-disc pl-5">
                            <li>Minimum 1 theatre space</li>
                            <li>Minimum 1 active table per theatre</li>
                            <li>Minimum 1 recovery bay (if your suite config requires)</li>
                            <li>Equipment register started (recommended)</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Confirm Action Dialog ---------------- */}
      <Dialog
        open={confirmDlg.open}
        onOpenChange={(v) => {
          if (!v) closeConfirm();
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                {confirmDlg.kind === "warning" ? (
                  <AlertTriangle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                ) : confirmDlg.kind === "info" ? (
                  <Settings2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Trash2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              {confirmDlg.title}
            </DialogTitle>
            {confirmDlg.description ? <DialogDescription>{confirmDlg.description}</DialogDescription> : null}
          </DialogHeader>

          <Separator className="my-4" />

          {confirmDlg.error ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{confirmDlg.error}</div>
            </div>
          ) : null}

          {confirmDlg.hint ? (
            <div className={cn(
              "rounded-2xl border p-4 text-sm",
              confirmDlg.kind === "danger"
                ? "border-[rgb(var(--zc-danger-rgb)/0.30)] bg-[rgb(var(--zc-danger-rgb)/0.10)]"
                : confirmDlg.kind === "warning"
                  ? "border-amber-200/70 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-900/20"
                  : "border-indigo-200/70 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-900/20"
            )}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-[rgb(var(--zc-warn))]" />
                <div className="min-w-0">
                  <div className="font-semibold text-zc-text">Important</div>
                  <div className="mt-1 text-zc-muted">{confirmDlg.hint}</div>
                </div>
              </div>
            </div>
          ) : null}

          {confirmDlg.bullets && confirmDlg.bullets.length ? (
            <div className="mt-4 rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
              <div className="text-sm font-semibold text-zc-text">This action will</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-zc-muted">
                {confirmDlg.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={closeConfirm} disabled={confirmDlg.busy || busy}>
                Cancel
              </Button>

              <Button
                variant={confirmDlg.kind === "danger" ? ("destructive" as any) : ("primary" as any)}
                onClick={() => void runConfirm()}
                disabled={confirmDlg.busy || busy}
                className={cn(
                  "gap-2",
                  confirmDlg.kind === "warning" &&
                  "border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100/70 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200"
                )}
              >
                {confirmDlg.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {confirmDlg.confirmText}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ---------------- Apply Template Dialog ---------------- */}
      <Dialog
        open={tplDlgOpen}
        onOpenChange={(v) => {
          if (!v) {
            setTplDlgOpen(false);
            setTplErr(null);
          } else {
            setTplDlgOpen(true);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Settings2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Apply Basic OT Template
            </DialogTitle>
            <DialogDescription>
              This will create a standard OT setup layout under the selected suite. It only creates setup entities (no operational data).
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {tplErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{tplErr}</div>
            </div>
          ) : null}

          <div className="grid gap-5">
            <div className="rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
              <div className="text-sm font-semibold text-zc-text">Creates</div>
              <div className="mt-1 text-xs text-zc-muted">Codes will be auto-suggested to avoid duplicates.</div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-zc-border bg-zc-panel/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                    <Stethoscope className="h-4 w-4 text-zc-accent" />
                    2 Theatres
                  </div>
                  <div className="mt-1 text-xs text-zc-muted">Operation Theatre 1, Operation Theatre 2 (each with 1 default OT Table)</div>
                </div>

                <div className="rounded-xl border border-zc-border bg-zc-panel/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                    <BedDouble className="h-4 w-4 text-zc-accent" />
                    4 Recovery Bays
                  </div>
                  <div className="mt-1 text-xs text-zc-muted">Recovery Bay 1–4</div>
                </div>

                <div className="rounded-xl border border-zc-border bg-zc-panel/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                    <Wrench className="h-4 w-4 text-zc-accent" />
                    1 Scrub Room
                  </div>
                  <div className="mt-1 text-xs text-zc-muted">Scrub Room</div>
                </div>

                <div className="rounded-xl border border-zc-border bg-zc-panel/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                    <Hospital className="h-4 w-4 text-zc-accent" />
                    Pre-Op + Store
                  </div>
                  <div className="mt-1 text-xs text-zc-muted">Pre-Op Holding + Sterile Store</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">
                  <div className="font-semibold">Important</div>
                  <div className="mt-1">
                    Applying the template multiple times will create additional spaces (duplicates). Use it once per suite, or delete unwanted spaces after applying.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setTplDlgOpen(false);
                  setTplErr(null);
                }}
                disabled={tplBusy || busy}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                onClick={() => void runTemplateBasic()}
                disabled={tplBusy || busy || !suiteId}
                className="gap-2"
              >
                {tplBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Apply Template
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Suite Dialog ---------------- */}
      <Dialog
        open={suiteDlgOpen}
        onOpenChange={(v) => {
          if (!v) setSuiteDlgOpen(false);
          else setSuiteDlgOpen(true);
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {suiteEditing ? "Edit OT Suite" : "Create OT Suite"}
            </DialogTitle>
            <DialogDescription>
              OT Suite represents the OT Complex for a branch. Later, scheduling and surgical workflows will map to theatres and tables under this suite.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Code</div>
                <Input value={suiteForm.code} onChange={(e) => setSuiteForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. OTC01" disabled={!!suiteEditing} />

              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Status</div>
                <Select value={suiteForm.status} onValueChange={(v) => setSuiteForm((p) => ({ ...p, status: v as OtSuiteStatus }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                    <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-xs text-zc-muted">Unique per branch. Suggested automatically.</div>
            <div className="grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Name</div>
              <Input value={suiteForm.name} onChange={(e) => setSuiteForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. OT Complex – Main Hospital" />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Location (required)</div>
              <Select
                value={suiteForm.locationNodeId || undefined}
                onValueChange={(v) => setSuiteForm((p) => ({ ...p, locationNodeId: v }))}
              >
                <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                  <SelectValue placeholder={locLoading ? "Loading locations…" : "Select OT location…"} />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {(() => {
                    const current = suiteForm.locationNodeId?.trim();
                    const exists = current && locationLabelById.has(current);
                    if (current && !exists) {
                      return (
                        <SelectItem value={current}>
                          {current} <span className="text-xs text-zc-muted">(not in current tree)</span>
                        </SelectItem>
                      );
                    }
                    return null;
                  })()}
                  {locationOptions.length === 0 ? (
                    <SelectItem value="__NO_LOCATIONS__" disabled>
                      {locLoading
                        ? "Loading location tree…"
                        : "No locations found. Create locations under Infrastructure → Locations."}
                    </SelectItem>
                  ) : (
                    locationOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <div className="text-xs text-zc-muted">
                OT Suite must be tagged to a LocationNode from Infrastructure → Locations.
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Active</div>
                <Switch checked={suiteForm.isActive} onCheckedChange={(v) => setSuiteForm((p) => ({ ...p, isActive: !!v }))} />
              </div>
              <div className="text-xs text-zc-muted">Soft disable if OT suite is temporarily not in use.</div>
            </div>


            <div className="grid gap-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Baseline setup targets</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Minimum theatres</div>
                  <Input
                    type="number"
                    min={1}
                    value={(suiteForm as any).minTheatres}
                    onChange={(e) => setSuiteForm((p: any) => ({ ...p, minTheatres: Number(e.target.value) }))}
                  />
                  <div className="text-xs text-zc-muted">Used by Go-Live checks.</div>
                </div>

                <div className="grid gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Min tables per theatre</div>
                  <Input
                    type="number"
                    min={1}
                    value={(suiteForm as any).minTablesPerTheatre}
                    onChange={(e) => setSuiteForm((p: any) => ({ ...p, minTablesPerTheatre: Number(e.target.value) }))}
                  />
                  <div className="text-xs text-zc-muted">Used by Go-Live checks.</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zc-text">Require recovery bays</div>
                    <div className="text-xs text-zc-muted">If enabled, Go-Live requires recovery bays.</div>
                  </div>
                  <Switch
                    checked={!!(suiteForm as any).requireRecoveryBays}
                    onCheckedChange={(v) => setSuiteForm((p: any) => ({ ...p, requireRecoveryBays: !!v }))}
                  />
                </div>

                <div className="grid gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Minimum recovery bays</div>
                  <Input
                    type="number"
                    min={1}
                    value={(suiteForm as any).minRecoveryBays}
                    onChange={(e) => setSuiteForm((p: any) => ({ ...p, minRecoveryBays: Number(e.target.value) }))}
                    disabled={!((suiteForm as any).requireRecoveryBays)}
                  />
                  <div className="text-xs text-zc-muted">Only applies if recovery bays are required.</div>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Notes (optional)</div>
                <Textarea
                  value={(suiteForm as any).notes}
                  onChange={(e) => setSuiteForm((p: any) => ({ ...p, notes: e.target.value }))}
                  placeholder="Any notes about OT complex layout, access rules, infection control, etc."
                  className="min-h-[90px]"
                />
              </div>
            </div>

          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSuiteDlgOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitSuite()} disabled={busy}>
              {suiteEditing ? "Save Changes" : "Create Suite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Space Dialog ---------------- */}
      <Dialog open={spaceDlgOpen} onOpenChange={setSpaceDlgOpen}>
        <DialogContent className={drawerClassName("max-w-[650px]")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Settings2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {spaceEditing ? "Edit OT Space" : "Add OT Space"}
            </DialogTitle>
            <DialogDescription>Spaces are the rooms within the OT Suite: theatres, recovery bays, scrub room, stores, etc.</DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Type</div>
                <Select value={spaceForm.type} onValueChange={(v) => void onSpaceTypeChange(v as OtSpaceType)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THEATRE">Theatre</SelectItem>
                    <SelectItem value="RECOVERY_BAY">Recovery Bay</SelectItem>
                    <SelectItem value="SCRUB_ROOM">Scrub Room</SelectItem>
                    <SelectItem value="PREOP_HOLDING">Pre-Op Holding</SelectItem>
                    <SelectItem value="INDUCTION_ROOM">Induction Room</SelectItem>
                    <SelectItem value="STERILE_STORE">Sterile Store</SelectItem>
                    <SelectItem value="ANESTHESIA_STORE">Anesthesia Store</SelectItem>
                    <SelectItem value="EQUIPMENT_STORE">Equipment Store</SelectItem>
                    <SelectItem value="STAFF_CHANGE">Staff Change</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Code</div>
                <Input value={spaceForm.code} onChange={(e) => setSpaceForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. OT01 / RB01" disabled={!!spaceEditing} />
                
              </div>
            </div>
            <div className="text-xs text-zc-muted">Suggested automatically per space type.</div>
            <div className="grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Name</div>
              <Input value={spaceForm.name} onChange={(e) => setSpaceForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Operation Theatre 1" />
            </div>

            {!spaceEditing && spaceForm.type === "THEATRE" ? (
              <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">Create default table</div>
                  <div className="text-xs text-zc-muted">Adds “Primary OT Table” automatically so theatre becomes schedulable immediately.</div>
                </div>
                <Switch checked={spaceForm.createDefaultTable} onCheckedChange={(v) => setSpaceForm((p) => ({ ...p, createDefaultTable: !!v }))} />
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">LocationNode ID (optional)</div>
                <Input value={spaceForm.locationNodeId} onChange={(e) => setSpaceForm((p) => ({ ...p, locationNodeId: e.target.value }))} placeholder="Zone ID (optional)" />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Active</div>
                  <Switch checked={spaceForm.isActive} onCheckedChange={(v) => setSpaceForm((p) => ({ ...p, isActive: !!v }))} />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Notes (optional)</div>
              <Textarea value={spaceForm.notes} onChange={(e) => setSpaceForm((p) => ({ ...p, notes: e.target.value }))} className="min-h-[80px]" placeholder="Any notes for staff" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSpaceDlgOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitSpace()} disabled={busy}>
              {spaceEditing ? "Save Changes" : "Create Space"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Table Dialog ---------------- */}
      <Dialog open={tableDlgOpen} onOpenChange={setTableDlgOpen}>
        <DialogContent className={drawerClassName("max-w-[650px]")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {tableEditing?.table ? "Edit OT Table" : "Add OT Table"}
            </DialogTitle>
            <DialogDescription>Tables define schedulable OT capacity inside a theatre.</DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Code</div>
                <Input value={tableForm.code} onChange={(e) => setTableForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. T01" disabled={!!tableEditing?.table} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Name</div>
                <Input value={tableForm.name} onChange={(e) => setTableForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Primary OT Table" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zc-text">Primary table</div>
                <div className="text-xs text-zc-muted">Only one primary table per theatre. If enabled, others become secondary automatically.</div>
              </div>
              <Switch checked={tableForm.isPrimary} onCheckedChange={(v) => setTableForm((p) => ({ ...p, isPrimary: !!v }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Manufacturer</div>
                <Input value={tableForm.manufacturer} onChange={(e) => setTableForm((p) => ({ ...p, manufacturer: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Model</div>
                <Input value={tableForm.model} onChange={(e) => setTableForm((p) => ({ ...p, model: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Serial No</div>
                <Input value={tableForm.serialNo} onChange={(e) => setTableForm((p) => ({ ...p, serialNo: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Active</div>
                <Switch checked={tableForm.isActive} onCheckedChange={(v) => setTableForm((p) => ({ ...p, isActive: !!v }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTableDlgOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitTable()} disabled={busy}>
              {tableEditing?.table ? "Save Changes" : "Create Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Equipment Dialog ---------------- */}
      <Dialog open={eqDlgOpen} onOpenChange={setEqDlgOpen}>
        <DialogContent className={drawerClassName("max-w-[650px]")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <ClipboardCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {eqEditing ? "Edit Equipment" : "Add Equipment"}
            </DialogTitle>
            <DialogDescription>Attach equipment to the OT suite or to a specific OT space.</DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Category</div>
                <Select value={eqForm.category} onValueChange={(v) => setEqForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    <SelectItem value="ANESTHESIA_MACHINE">ANESTHESIA_MACHINE</SelectItem>
                    <SelectItem value="AIRWAY_MANAGEMENT">AIRWAY_MANAGEMENT</SelectItem>
                    <SelectItem value="VENTILATION_RESPIRATORY">VENTILATION_RESPIRATORY</SelectItem>

                    <SelectItem value="PATIENT_MONITORING">PATIENT_MONITORING</SelectItem>
                    <SelectItem value="HEMODYNAMIC_MONITORING">HEMODYNAMIC_MONITORING</SelectItem>

                    <SelectItem value="SURGICAL_INSTRUMENTS">SURGICAL_INSTRUMENTS</SelectItem>
                    <SelectItem value="OR_FURNITURE">OR_FURNITURE</SelectItem>
                    <SelectItem value="OR_LIGHTING">OR_LIGHTING</SelectItem>
                    <SelectItem value="ELECTROSURGERY_ENERGY">ELECTROSURGERY_ENERGY</SelectItem>
                    <SelectItem value="ENDOSCOPY_LAPAROSCOPY">ENDOSCOPY_LAPAROSCOPY</SelectItem>
                    <SelectItem value="IMAGING_INTRAOP">IMAGING_INTRAOP</SelectItem>

                    <SelectItem value="STERILIZATION_CSSD">STERILIZATION_CSSD</SelectItem>
                    <SelectItem value="DISINFECTION_CLEANING">DISINFECTION_CLEANING</SelectItem>
                    <SelectItem value="STERILE_STORAGE_PACKAGING">STERILE_STORAGE_PACKAGING</SelectItem>

                    <SelectItem value="MEDICAL_GASES">MEDICAL_GASES</SelectItem>
                    <SelectItem value="SUCTION_SYSTEMS">SUCTION_SYSTEMS</SelectItem>
                    <SelectItem value="POWER_BACKUP">POWER_BACKUP</SelectItem>

                    <SelectItem value="PATIENT_WARMING">PATIENT_WARMING</SelectItem>
                    <SelectItem value="DVT_PROPHYLAXIS">DVT_PROPHYLAXIS</SelectItem>
                    <SelectItem value="SAFETY_EMERGENCY">SAFETY_EMERGENCY</SelectItem>

                    <SelectItem value="RECOVERY_PACU_EQUIPMENT">RECOVERY_PACU_EQUIPMENT</SelectItem>

                    <SelectItem value="IT_AV_EQUIPMENT">IT_AV_EQUIPMENT</SelectItem>

                    <SelectItem value="CONSUMABLES_DISPOSABLES">CONSUMABLES_DISPOSABLES</SelectItem>
                    <SelectItem value="OTHER">OTHER</SelectItem>
                  </SelectContent>

                </Select>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Quantity</div>
                <Input
                  type="number"
                  value={eqForm.qty}
                  onChange={(e) => setEqForm((p) => ({ ...p, qty: Number(e.target.value) }))}
                  min={1}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Name</div>
              <Input value={eqForm.name} onChange={(e) => setEqForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Anesthesia Workstation" />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Attach to</div>
              <Select value={eqForm.spaceId} onValueChange={(v) => setEqForm((p) => ({ ...p, spaceId: v }))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Suite-level or Space" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUITE">Suite-level (not tied to a room)</SelectItem>
                  {(suiteDetails?.spaces || [])
                    .filter((s) => s.isActive)
                    .sort((a, b) => (a.type + a.code).localeCompare(b.type + b.code))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {spaceTypeLabel(s.type)} • {s.code} • {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Manufacturer</div>
                <Input value={eqForm.manufacturer} onChange={(e) => setEqForm((p) => ({ ...p, manufacturer: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Model</div>
                <Input value={eqForm.model} onChange={(e) => setEqForm((p) => ({ ...p, model: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Serial No</div>
                <Input value={eqForm.serialNo} onChange={(e) => setEqForm((p) => ({ ...p, serialNo: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Active</div>
                <Switch checked={eqForm.isActive} onCheckedChange={(v) => setEqForm((p) => ({ ...p, isActive: !!v }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEqDlgOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitEquipment()} disabled={busy}>
              {eqEditing ? "Save Changes" : "Add Equipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </RequirePerm>
</AppShell>
  );
}
