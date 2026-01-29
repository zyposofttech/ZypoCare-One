
"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import {
  AlertTriangle,
  ClipboardList,
  ExternalLink,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };
type DepartmentRow = { id: string; code: string; name: string };
type UnitRow = { id: string; branchId: string; code: string; name: string; usesRooms: boolean; isActive: boolean };
type RoomRow = { id: string; unitId: string; branchId: string; code: string; name: string; isActive: boolean };
type DiagnosticSectionRow = { id: string; branchId: string; code: string; name: string; isActive: boolean };
type DiagnosticCategoryRow = { id: string; branchId: string; sectionId: string; code: string; name: string; isActive: boolean };

type LocationType = "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE";
type LocationNode = {
  id: string;
  branchId: string;
  type: LocationType;
  parentId?: string | null;
  code: string;
  name: string;
  isActive: boolean;
  buildings?: LocationNode[];
  floors?: LocationNode[];
  zones?: LocationNode[];
};
type LocationTreeResponse = { campuses: LocationNode[] } | any;

type EquipmentCategory = "GENERAL" | "RADIOLOGY" | "ULTRASOUND";
type EquipmentOperationalStatus = "OPERATIONAL" | "DOWN" | "MAINTENANCE" | "RETIRED";

type DowntimeTicketRow = {
  id: string;
  assetId: string;
  status: "OPEN" | "CLOSED";
  reason: string;
  notes?: string | null;
  openedAt: string;
  closedAt?: string | null;
};

type EquipmentAssetRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  category: EquipmentCategory;
  make?: string | null;
  model?: string | null;
  serial?: string | null;

  ownerDepartmentId?: string | null;
  ownerDepartment?: DepartmentRow | null;

  unitId?: string | null;
  roomId?: string | null;
  locationNodeId?: string | null;

  operationalStatus: EquipmentOperationalStatus;
  isSchedulable: boolean;

  amcVendor?: string | null;
  amcValidFrom?: string | null;
  amcValidTo?: string | null;
  warrantyValidTo?: string | null;

  pmFrequencyDays?: number | null;
  nextPmDueAt?: string | null;

  aerbLicenseNo?: string | null;
  aerbValidTo?: string | null;
  pcpndtRegNo?: string | null;
  pcpndtValidTo?: string | null;

  downtimeTickets?: DowntimeTicketRow[];

  warnings?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type EquipmentListResponse =
  | EquipmentAssetRow[]
  | { page: number; pageSize: number; total: number; rows: EquipmentAssetRow[] };

type EquipmentSummaryResponse = {
  branchId: string;
  byStatus: Array<{ operationalStatus: EquipmentOperationalStatus; _count: { _all: number } }>;
  byCategory: Array<{ category: EquipmentCategory; _count: { _all: number } }>;
  openDowntimeCount: number;
  due: {
    pmDueCount: number;
    amcExpiringIn30Count: number;
    warrantyExpiringIn30Count: number;
    complianceExpiringIn30Count: number;
  };
};

type AlertsResponse = {
  branchId: string;
  withinDays: number;
  pmDue: EquipmentAssetRow[];
  amcExpiring: EquipmentAssetRow[];
  warrantyExpiring: EquipmentAssetRow[];
  complianceExpiring: EquipmentAssetRow[];
  openDowntime: Array<DowntimeTicketRow & { asset?: { id: string; code: string; name: string; category: EquipmentCategory } }>;
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

const LS_BRANCH = "zc.superadmin.infrastructure.branchId";

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

function buildQS(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (!s || s === "all") return;
    usp.set(k, s);
  });
  return usp.toString();
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function daysUntil(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function statusBadge(s: EquipmentOperationalStatus) {
  if (s === "OPERATIONAL") return <Badge variant="success">OPERATIONAL</Badge>;
  if (s === "DOWN") return <Badge variant="destructive">DOWN</Badge>;
  if (s === "MAINTENANCE") return <Badge variant="warning">MAINTENANCE</Badge>;
  return <Badge variant="secondary">RETIRED</Badge>;
}

function catBadge(c: EquipmentCategory) {
  if (c === "GENERAL") return <Badge variant="neutral">GENERAL</Badge>;
  if (c === "RADIOLOGY") return <Badge variant="info">RADIOLOGY</Badge>;
  return <Badge variant="accent">ULTRASOUND</Badge>;
}

function dueTone(days: number | null) {
  if (days === null) return "secondary" as const;
  if (days <= 0) return "destructive" as const;
  if (days <= 7) return "warning" as const;
  if (days <= 30) return "accent" as const;
  return "secondary" as const;
}

function summaryBadgeClass(tone: "rose" | "amber" | "sky" | "violet" | "emerald") {
  if (tone === "rose") {
    return "border-rose-200 bg-rose-50/70 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/10 dark:text-rose-200";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200";
  }
  if (tone === "sky") {
    return "border-sky-200 bg-sky-50/70 text-sky-700 dark:border-sky-900/50 dark:bg-sky-900/10 dark:text-sky-200";
  }
  if (tone === "violet") {
    return "border-violet-200 bg-violet-50/70 text-violet-700 dark:border-violet-900/50 dark:bg-violet-900/10 dark:text-violet-200";
  }
  return "border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/10 dark:text-emerald-200";
}

function mapDiagnosticCategoryToEquipmentCategory(
  cat: DiagnosticCategoryRow,
  sectionById: Map<string, DiagnosticSectionRow>,
): EquipmentCategory {
  const section = sectionById.get(cat.sectionId);
  const sectionCode = (section?.code || "").toUpperCase();
  const sectionName = (section?.name || "").toUpperCase();
  const catCode = (cat.code || "").toUpperCase();
  const catName = (cat.name || "").toUpperCase();

  if (catCode.includes("USG") || catName.includes("ULTRASOUND")) return "ULTRASOUND";
  if (sectionCode.includes("RADIOLOGY") || sectionName.includes("RADIOLOGY")) return "RADIOLOGY";
  return "GENERAL";
}

function flattenLocations(tree: LocationTreeResponse): Array<{ id: string; label: string; type: LocationType }> {
  const campuses: LocationNode[] = Array.isArray(tree?.campuses)
    ? tree.campuses
    : Array.isArray(tree?.items)
      ? tree.items
      : Array.isArray(tree?.data)
        ? tree.data
        : [];

  const out: Array<{ id: string; label: string; type: LocationType }> = [];
  const walk = (node: LocationNode, prefix: string) => {
    const label = `${prefix}${node.code} • ${node.name}`;
    out.push({ id: node.id, label, type: node.type });
    (node.buildings || []).forEach((c) => walk(c, `${prefix}${node.code} / `));
    (node.floors || []).forEach((c) => walk(c, `${prefix}${node.code} / `));
    (node.zones || []).forEach((c) => walk(c, `${prefix}${node.code} / `));
  };
  campuses.forEach((c) => walk(c, ""));
  return out;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

function modalClassName(extra?: string) {
  return cn("rounded-2xl border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card shadow-2xl shadow-indigo-500/10", extra);
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

function ModalHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  // onClose is kept for API compatibility with existing call sites.
  // DialogContent already renders its own close button.
  void onClose;
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>

      <Separator className="my-4" />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

const DUE_OPTIONS = [
  { label: "Any", value: "all" },
  { label: "Already due", value: "0" },
  { label: "Within 7 days", value: "7" },
  { label: "Within 30 days", value: "30" },
  { label: "Within 60 days", value: "60" },
];

export default function SuperAdminEquipmentRegisterPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<"assets" | "alerts">("assets");
  const [showFilters, setShowFilters] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");
  const [departments, setDepartments] = React.useState<DepartmentRow[]>([]);
  const [units, setUnits] = React.useState<UnitRow[]>([]);
  const [rooms, setRooms] = React.useState<RoomRow[]>([]);
  const [locations, setLocations] = React.useState<Array<{ id: string; label: string; type: LocationType }>>([]);
  const [diagnosticSections, setDiagnosticSections] = React.useState<DiagnosticSectionRow[]>([]);
  const [diagnosticCategories, setDiagnosticCategories] = React.useState<DiagnosticCategoryRow[]>([]);

  // filters
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<EquipmentCategory | "all">("all");
  const [status, setStatus] = React.useState<EquipmentOperationalStatus | "all">("all");
  const [ownerDepartmentId, setOwnerDepartmentId] = React.useState<string | "all">("all");
  const [unitId, setUnitId] = React.useState<string | "all">("all");
  const [roomId, setRoomId] = React.useState<string | "all">("all");
  const [locationNodeId, setLocationNodeId] = React.useState<string | "all">("all");
  const [pmDueInDays, setPmDueInDays] = React.useState<string>("all");
  const [amcExpiringInDays, setAmcExpiringInDays] = React.useState<string>("all");
  const [warrantyExpiringInDays, setWarrantyExpiringInDays] = React.useState<string>("all");
  const [complianceExpiringInDays, setComplianceExpiringInDays] = React.useState<string>("all");

  // data
  const [rows, setRows] = React.useState<EquipmentAssetRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const [total, setTotal] = React.useState<number | null>(null);

  const [summary, setSummary] = React.useState<EquipmentSummaryResponse | null>(null);

  // alerts
  const [withinDays, setWithinDays] = React.useState(30);
  const [alerts, setAlerts] = React.useState<AlertsResponse | null>(null);

  // dialogs
  const [assetDialogOpen, setAssetDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EquipmentAssetRow | null>(null);

  const [downtimeDialogOpen, setDowntimeDialogOpen] = React.useState(false);
  const [closingTicket, setClosingTicket] = React.useState<DowntimeTicketRow | null>(null);
  const [downtimeAsset, setDowntimeAsset] = React.useState<EquipmentAssetRow | null>(null);
  const [dtReason, setDtReason] = React.useState("");
  const [dtNotes, setDtNotes] = React.useState("");

  const unitMap = React.useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const roomMap = React.useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const deptMap = React.useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const mustSelectBranch = !branchId;

  async function loadBranches(): Promise<string | null> {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = readLS(LS_BRANCH);
    const first = list[0]?.id || null;
    const next = (stored && list.some((b) => b.id === stored) ? stored : null) || first;
    if (next) writeLS(LS_BRANCH, next);
    setBranchId(next || "");
    return next;
  }

  async function loadBranchCatalogs(bid: string) {
    const [deps, us, locTree, diagSecs, diagCats] = await Promise.all([
      apiFetch<DepartmentRow[]>(`/api/infrastructure/departments?branchId=${encodeURIComponent(bid)}`),
      apiFetch<UnitRow[]>(`/api/infrastructure/units?branchId=${encodeURIComponent(bid)}`),
      apiFetch<LocationTreeResponse>(`/api/infrastructure/locations/tree?branchId=${encodeURIComponent(bid)}`),
      apiFetch<DiagnosticSectionRow[]>(`/api/infrastructure/diagnostics/sections?branchId=${encodeURIComponent(bid)}`),
      apiFetch<DiagnosticCategoryRow[]>(`/api/infrastructure/diagnostics/categories?branchId=${encodeURIComponent(bid)}`),
    ]);
    setDepartments(deps || []);
    setUnits(us || []);
    setLocations(flattenLocations(locTree));
    setDiagnosticSections(diagSecs || []);
    setDiagnosticCategories(diagCats || []);
  }

  async function loadRoomsForUnit(uid: string | "all") {
    if (!uid || uid === "all") {
      setRooms([]);
      return;
    }
    const data = await apiFetch<RoomRow[]>(`/api/infrastructure/rooms?unitId=${encodeURIComponent(uid)}`);
    setRooms(data || []);
  }

  function normalizeList(resp: EquipmentListResponse): { rows: EquipmentAssetRow[]; total: number | null } {
    if (Array.isArray(resp)) return { rows: resp, total: null };
    return { rows: resp.rows || [], total: typeof resp.total === "number" ? resp.total : null };
  }

  async function loadEquipment(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const resp = await apiFetch<EquipmentListResponse>(
        `/api/infrastructure/equipment?${buildQS({
          branchId,
          q: q.trim() || undefined,
          category,
          operationalStatus: status,
          ownerDepartmentId,
          unitId,
          roomId,
          locationNodeId,
          pmDueInDays: pmDueInDays === "all" ? undefined : Number(pmDueInDays),
          amcExpiringInDays: amcExpiringInDays === "all" ? undefined : Number(amcExpiringInDays),
          warrantyExpiringInDays: warrantyExpiringInDays === "all" ? undefined : Number(warrantyExpiringInDays),
          complianceExpiringInDays: complianceExpiringInDays === "all" ? undefined : Number(complianceExpiringInDays),
          page,
          pageSize,
        })}`,
      );
      const n = normalizeList(resp);
      setRows(n.rows);
      setTotal(n.total);
      if (showToast) toast({ title: "Equipment refreshed", description: "Loaded latest equipment assets." });
    } catch (e: any) {
      const msg = e?.message || "Failed to load equipment";
      setErr(msg);
      setRows([]);
      setTotal(null);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    if (!branchId) return;
    try {
      const s = await apiFetch<EquipmentSummaryResponse>(
        `/api/infrastructure/equipment-summary?branchId=${encodeURIComponent(branchId)}`,
      );
      setSummary(s || null);
    } catch {
      setSummary(null);
    }
  }

  async function loadAlerts(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const a = await apiFetch<AlertsResponse>(
        `/api/infrastructure/equipment-alerts?branchId=${encodeURIComponent(branchId)}&withinDays=${encodeURIComponent(
          String(withinDays),
        )}`,
      );
      setAlerts(a || null);
      if (showToast) toast({ title: "Alerts refreshed", description: "Loaded latest due/expiry lists." });
    } catch (e: any) {
      const msg = e?.message || "Failed to load alerts";
      setErr(msg);
      setAlerts(null);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll(showToast = false) {
    setErr(null);
    setLoading(true);
    try {
      const bid = branchId || (await loadBranches());
      if (!bid) {
        setLoading(false);
        return;
      }
      await loadBranchCatalogs(bid);
      await loadRoomsForUnit(unitId);
      await Promise.all([loadEquipment(false), loadSummary()]);
      if (activeTab === "alerts") await loadAlerts(false);
      if (showToast) toast({ title: "Equipment ready", description: "Catalogs and assets are up to date." });
    } catch (e: any) {
      const msg = e?.message || "Refresh failed";
      setErr(msg);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refreshAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    if (!branchId) return;
    void loadRoomsForUnit(unitId);
    // Reset room filter if unit changes
    setRoomId("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  React.useEffect(() => {
    if (!branchId) return;
    // When paging or filters change, reload assets.
    void loadEquipment(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, q, category, status, ownerDepartmentId, unitId, roomId, locationNodeId, pmDueInDays, amcExpiringInDays, warrantyExpiringInDays, complianceExpiringInDays, page, pageSize]);

  React.useEffect(() => {
    if (!branchId) return;
    if (activeTab !== "alerts") return;
    void loadAlerts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, branchId, withinDays]);

  async function onBranchChange(nextId: string) {
    setBranchId(nextId);
    writeLS(LS_BRANCH, nextId);

    // reset filters
    setQ("");
    setCategory("all");
    setStatus("all");
    setOwnerDepartmentId("all");
    setUnitId("all");
    setRoomId("all");
    setLocationNodeId("all");
    setPmDueInDays("all");
    setAmcExpiringInDays("all");
    setWarrantyExpiringInDays("all");
    setComplianceExpiringInDays("all");
    setPage(1);

    setErr(null);
    setLoading(true);
    try {
      await loadBranchCatalogs(nextId);
      setRooms([]);
      await Promise.all([loadEquipment(false), loadSummary()]);
      toast({ title: "Branch scope changed", description: "Loaded equipment for selected branch." });
    } catch (e: any) {
      const msg = e?.message || "Failed to load branch scope";
      setErr(msg);
      toast({ variant: "destructive", title: "Load failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setAssetDialogOpen(true);
  }

  function openEdit(r: EquipmentAssetRow) {
    setEditing(r);
    setAssetDialogOpen(true);
  }

  function openDowntime(r: EquipmentAssetRow) {
    setDowntimeAsset(r);
    setClosingTicket(null);
    setDtReason("");
    setDtNotes("");
    setDowntimeDialogOpen(true);
  }

  function openCloseDowntime(r: EquipmentAssetRow, t: DowntimeTicketRow) {
    setDowntimeAsset(r);
    setClosingTicket(t);
    setDtReason(t.reason);
    setDtNotes("");
    setDowntimeDialogOpen(true);
  }

  async function retireAsset(r: EquipmentAssetRow) {
    if (!window.confirm(`Retire equipment ${r.code} • ${r.name}? This will disable scheduling.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/equipment/${encodeURIComponent(r.id)}/retire`, { method: "POST" });
      toast({ title: "Equipment retired", description: `${r.code} has been marked as RETIRED.` });
      await Promise.all([loadEquipment(false), loadSummary()]);
      if (activeTab === "alerts") await loadAlerts(false);
    } catch (e: any) {
      toast({ title: "Retire failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function submitDowntime() {
    if (!downtimeAsset) return;
    if (!closingTicket && !dtReason.trim()) {
      toast({ title: "Reason required", description: "Enter a downtime reason." });
      return;
    }
    setBusy(true);
    try {
      if (closingTicket) {
        await apiFetch(`/api/infrastructure/equipment/downtime/close`, {
          method: "POST",
          body: JSON.stringify({ ticketId: closingTicket.id, notes: dtNotes.trim() || undefined }),
        });
        toast({ title: "Downtime closed", description: "Ticket closed successfully." });
      } else {
        await apiFetch(`/api/infrastructure/equipment/downtime`, {
          method: "POST",
          body: JSON.stringify({ assetId: downtimeAsset.id, reason: dtReason.trim(), notes: dtNotes.trim() || undefined }),
        });
        toast({ title: "Downtime opened", description: "Ticket created and status set to DOWN." });
      }
      setDowntimeDialogOpen(false);
      await Promise.all([loadEquipment(false), loadSummary()]);
      if (activeTab === "alerts") await loadAlerts(false);
    } catch (e: any) {
      toast({ title: "Request failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  const totalPages = React.useMemo(() => {
    if (total == null) return null;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const totalAssets = total ?? rows.length;
  const openDowntimeCount = summary?.openDowntimeCount ?? 0;
  const complianceExpiringCount = summary?.due.complianceExpiringIn30Count ?? 0;

  return (
    <AppShell title="Infrastructure • Equipment Register">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ShieldCheck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Equipment Register</div>
              <div className="mt-1 text-sm text-zc-muted">
                Register assets with AMC/Warranty/PM schedules, compliance and downtime tickets.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => refreshAll(true)} disabled={loading || busy}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={mustSelectBranch || busy}>
              <Plus className="h-4 w-4" />
              New Equipment
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load equipment</CardTitle>
                  <CardDescription className="mt-1">{err}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : null}

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
              <Select value={branchId || ""} onValueChange={onBranchChange}>
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {branches.filter((b) => b.id).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} - {b.name} ({b.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Assets</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalAssets}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Open Downtime</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{openDowntimeCount}</div>
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Compliance Expiring (30d)</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{complianceExpiringCount}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Search by code, name, or serial..."
                  className="pl-10"
                  disabled={mustSelectBranch}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
                  {total != null ? (
                    <>
                      {" "}
                      of <span className="font-semibold tabular-nums text-zc-text">{total}</span>
                    </>
                  ) : null}
                </div>
                {activeTab === "assets" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowFilters((s) => !s)}
                    disabled={mustSelectBranch}
                  >
                    <Filter className="h-4 w-4" />
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </Button>
                ) : null}
              </div>
            </div>

            {summary ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={summaryBadgeClass("rose")}>Open downtime: {summary.openDowntimeCount}</Badge>
                <Badge className={summaryBadgeClass("amber")}>PM due: {summary.due.pmDueCount}</Badge>
                <Badge className={summaryBadgeClass("sky")}>AMC expiring (30d): {summary.due.amcExpiringIn30Count}</Badge>
                <Badge className={summaryBadgeClass("violet")}>Warranty expiring (30d): {summary.due.warrantyExpiringIn30Count}</Badge>
                <Badge className={summaryBadgeClass("emerald")}>Compliance expiring (30d): {summary.due.complianceExpiringIn30Count}</Badge>
              </div>
            ) : (
              <div className="text-sm text-zc-muted">Select a branch to see snapshot.</div>
            )}
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
                    value="assets"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Assets
                  </TabsTrigger>
                  <TabsTrigger
                    value="alerts"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Alerts
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <Tabs value={activeTab}>
              <TabsContent value="assets" className="mt-0">
                <div className="grid gap-4">

                  {/* Filters */}
                  {showFilters ? (
                    <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                        <Filter className="h-4 w-4 text-zc-accent" />
                        Filters
                      </div>

                      <div className="grid gap-3 md:grid-cols-12">
                        <div className="md:col-span-2">
                          <Label className="text-xs text-zc-muted">Category</Label>
                          <Select
                            value={category}
                            onValueChange={(v) => {
                              setPage(1);
                              setCategory(v as any);
                            }}
                            disabled={mustSelectBranch}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="GENERAL">GENERAL</SelectItem>
                              <SelectItem value="RADIOLOGY">RADIOLOGY</SelectItem>
                              <SelectItem value="ULTRASOUND">ULTRASOUND</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-xs text-zc-muted">Status</Label>
                          <Select
                            value={status}
                            onValueChange={(v) => {
                              setPage(1);
                              setStatus(v as any);
                            }}
                            disabled={mustSelectBranch}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="OPERATIONAL">OPERATIONAL</SelectItem>
                              <SelectItem value="DOWN">DOWN</SelectItem>
                              <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                              <SelectItem value="RETIRED">RETIRED</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-4">
                          <Label className="text-xs text-zc-muted">Owner Department</Label>
                          <Select
                            value={ownerDepartmentId}
                            onValueChange={(v) => {
                              setPage(1);
                              setOwnerDepartmentId(v as any);
                            }}
                            disabled={mustSelectBranch}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[320px] overflow-y-auto">
                              <SelectItem value="all">All</SelectItem>
                              {departments.filter((d) => d.id).map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.code} - {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-4">
                          <Label className="text-xs text-zc-muted">Unit</Label>
                          <Select
                            value={unitId}
                            onValueChange={(v) => {
                              setPage(1);
                              setUnitId(v as any);
                            }}
                            disabled={mustSelectBranch}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[320px] overflow-y-auto">
                              <SelectItem value="all">All</SelectItem>
                              {units.filter((u) => u.id).map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.code} - {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-4">
                          <Label className="text-xs text-zc-muted">Room / Bay</Label>
                          <Select
                            value={roomId}
                            onValueChange={(v) => {
                              setPage(1);
                              setRoomId(v as any);
                            }}
                            disabled={mustSelectBranch || unitId === "all"}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder={unitId === "all" ? "Select Unit first" : "Room"} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[320px] overflow-y-auto">
                              <SelectItem value="all">All</SelectItem>
                              {rooms.filter((r) => r.id).map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.code} - {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-4">
                          <Label className="text-xs text-zc-muted">Location Node</Label>
                          <Select
                            value={locationNodeId}
                            onValueChange={(v) => {
                              setPage(1);
                              setLocationNodeId(v as any);
                            }}
                            disabled={mustSelectBranch}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Location" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[320px] overflow-y-auto">
                              <SelectItem value="all">All</SelectItem>
                              {locations.filter((l) => l.id).map((l) => (
                                <SelectItem key={l.id} value={l.id}>
                                  {l.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-xs text-zc-muted">PM Due</Label>
                          <Select value={pmDueInDays} onValueChange={(v) => setPmDueInDays(v)} disabled={mustSelectBranch}>
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DUE_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-xs text-zc-muted">AMC Expiry</Label>
                          <Select
                            value={amcExpiringInDays}
                            onValueChange={(v) => setAmcExpiringInDays(v)}
                            disabled={mustSelectBranch}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DUE_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-xs text-zc-muted">Warranty Expiry</Label>
                          <Select
                            value={warrantyExpiringInDays}
                            onValueChange={(v) => setWarrantyExpiringInDays(v)}
                            disabled={mustSelectBranch}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DUE_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-xs text-zc-muted">Compliance Expiry</Label>
                          <Select
                            value={complianceExpiringInDays}
                            onValueChange={(v) => setComplianceExpiringInDays(v)}
                            disabled={mustSelectBranch}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DUE_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Table */}
                  <div className="rounded-xl border border-zc-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[170px]">Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[140px]">Category</TableHead>
                          <TableHead className="w-[140px]">Status</TableHead>
                          <TableHead className="w-[130px]">Schedulable</TableHead>
                          <TableHead className="w-[190px]">Location</TableHead>
                          <TableHead className="w-[160px]">PM Due</TableHead>
                          <TableHead className="w-[160px]">AMC Exp</TableHead>
                          <TableHead className="w-[160px]">Warranty</TableHead>
                          <TableHead className="w-[160px]">Compliance</TableHead>
                          <TableHead className="w-[70px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          Array.from({ length: 8 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell colSpan={11}>
                                <Skeleton className="h-6 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11}>
                              <div className="flex items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                                <Wrench className="h-4 w-4" />
                                No equipment found for the current filters.
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          rows.map((r) => {
                            const u = r.unitId ? unitMap.get(r.unitId) : null;
                            const rm = r.roomId ? roomMap.get(r.roomId) : null;
                            const dept = r.ownerDepartment || (r.ownerDepartmentId ? deptMap.get(r.ownerDepartmentId) : null);

                            const pmDays = daysUntil(r.nextPmDueAt);
                            const amcDays = daysUntil(r.amcValidTo);
                            const warDays = daysUntil(r.warrantyValidTo);
                            const compDate = r.category === "RADIOLOGY" ? r.aerbValidTo : r.category === "ULTRASOUND" ? r.pcpndtValidTo : null;
                            const compDays = daysUntil(compDate);

                            const openTicket = (r.downtimeTickets || []).find((t) => t.status === "OPEN") || null;

                            return (
                              <TableRow key={r.id}>
                                <TableCell className="font-mono text-xs">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-zc-text">{r.code}</span>
                                    {dept ? <span className="text-[11px] text-zc-muted">{dept.code}</span> : null}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-zc-text">{r.name}</span>
                                    <span className="text-xs text-zc-muted">
                                      {(r.make || r.model || r.serial) ? (
                                        <>
                                          {[r.make, r.model].filter(Boolean).join(" ")}
                                          {r.serial ? ` • SN: ${r.serial}` : ""}
                                        </>
                                      ) : (
                                        "—"
                                      )}
                                    </span>
                                    {r.warnings?.length ? (
                                      <span className="text-[11px] text-zc-warn">{r.warnings[0]}</span>
                                    ) : null}
                                    {openTicket ? (
                                      <span className="text-[11px] text-zc-danger">Downtime: {openTicket.reason}</span>
                                    ) : null}
                                  </div>
                                </TableCell>
                                <TableCell>{catBadge(r.category)}</TableCell>
                                <TableCell>{statusBadge(r.operationalStatus)}</TableCell>
                                <TableCell>
                                  {r.isSchedulable ? <Badge variant="ok">Yes</Badge> : <Badge variant="secondary">No</Badge>}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div className="text-zc-text">
                                      {u ? `${u.code}` : r.unitId ? `${String(r.unitId).slice(0, 8)}…` : "—"}
                                      {rm ? ` / ${rm.code}` : r.roomId ? ` / ${String(r.roomId).slice(0, 8)}…` : ""}
                                    </div>
                                    <div className="text-xs text-zc-muted">
                                      {r.locationNodeId ? `Loc: ${String(r.locationNodeId).slice(0, 8)}…` : ""}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={dueTone(pmDays)}>
                                    {fmtDate(r.nextPmDueAt)}
                                    {pmDays != null ? ` (${pmDays}d)` : ""}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={dueTone(amcDays)}>
                                    {fmtDate(r.amcValidTo)}
                                    {amcDays != null ? ` (${amcDays}d)` : ""}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={dueTone(warDays)}>
                                    {fmtDate(r.warrantyValidTo)}
                                    {warDays != null ? ` (${warDays}d)` : ""}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={dueTone(compDays)}>
                                    {fmtDate(compDate)}
                                    {compDays != null ? ` (${compDays}d)` : ""}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[220px]">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem asChild>
                                        <Link href={`/superadmin/infrastructure/equipment/${encodeURIComponent(r.id)}`}>
                                          <ExternalLink className="mr-2 h-4 w-4" />
                                          View details
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEdit(r)}>
                                        <Wrench className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {openTicket ? (
                                        <DropdownMenuItem onClick={() => openCloseDowntime(r, openTicket)}>
                                          <ClipboardList className="mr-2 h-4 w-4" />
                                          Close downtime
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem onClick={() => openDowntime(r)}>
                                          <ClipboardList className="mr-2 h-4 w-4" />
                                          Open downtime
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-zc-danger focus:text-zc-danger"
                                        onClick={() => retireAsset(r)}
                                      >
                                        Retire equipment
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>

                    <div className="flex flex-col gap-3 border-t border-zc-border p-4 md:flex-row md:items-center md:justify-between">
                      <div className="text-sm text-zc-muted">
                        {total != null ? (
                          <>
                            Showing <span className="font-semibold text-zc-text">{rows.length}</span> of{" "}
                            <span className="font-semibold text-zc-text">{total}</span>
                          </>
                        ) : (
                          <>
                            Showing <span className="font-semibold text-zc-text">{rows.length}</span> (max 200)
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={String(pageSize)}
                          onValueChange={(v) => {
                            setPage(1);
                            setPageSize(Number(v));
                          }}
                          disabled={mustSelectBranch}
                        >
                          <SelectTrigger className="h-9 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[25, 50, 100, 200].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                Page size: {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          className="h-9"
                          disabled={mustSelectBranch || page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Prev
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9"
                          disabled={mustSelectBranch || (totalPages != null ? page >= totalPages : rows.length < pageSize)}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                        <Badge variant="secondary">Page {page}{totalPages ? ` / ${totalPages}` : ""}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="alerts" className="mt-0">
                <div className="grid gap-4">
                  <div className="flex flex-col gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4 md:flex-row md:items-end md:justify-between">
                    <div className="grid gap-2">
                      <div className="text-sm font-semibold text-zc-text">Alert window</div>
                      <div className="text-sm text-zc-muted">
                        Lists PM due, AMC/Warranty expiring, compliance expiring and open downtime.
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="w-full sm:w-[220px]">
                        <Label className="text-xs text-zc-muted">Within (days)</Label>
                        <Select
                          value={String(withinDays)}
                          onValueChange={(v) => setWithinDays(Math.max(0, Math.min(365, Number(v))))}
                          disabled={mustSelectBranch}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 7, 14, 30, 60, 90, 180].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n === 0 ? "Already due/expired" : `Within ${n} days`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" className="h-10 mt-4" onClick={() => loadAlerts(true)} disabled={mustSelectBranch || loading}>
                        <RefreshCw className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "")} />
                        Refresh Alerts
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <AlertList
                      title="PM Due"
                      icon={<Wrench className="h-4 w-4 text-zc-accent" />}
                      items={alerts?.pmDue || []}
                      empty="No PM due within selected window."
                      dateField="nextPmDueAt"
                    />
                    <AlertList
                      title="AMC Expiring"
                      icon={<ShieldCheck className="h-4 w-4 text-zc-accent" />}
                      items={alerts?.amcExpiring || []}
                      empty="No AMC expiring within selected window."
                      dateField="amcValidTo"
                    />
                    <AlertList
                      title="Warranty Expiring"
                      icon={<ShieldCheck className="h-4 w-4 text-zc-accent" />}
                      items={alerts?.warrantyExpiring || []}
                      empty="No warranty expiring within selected window."
                      dateField="warrantyValidTo"
                    />
                    <AlertList
                      title="Compliance Expiring"
                      icon={<AlertTriangle className="h-4 w-4 text-zc-warn" />}
                      items={alerts?.complianceExpiring || []}
                      empty="No compliance expiring within selected window."
                      dateField="__compliance"
                    />
                  </div>

                  <Card>
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Open Downtime</CardTitle>
                          <CardDescription>Tickets currently open across equipment assets.</CardDescription>
                        </div>
                        <Badge variant={(alerts?.openDowntime?.length || 0) > 0 ? "destructive" : "secondary"}>
                          {alerts?.openDowntime?.length || 0}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl border border-zc-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[160px]">Asset</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead className="w-[180px]">Opened</TableHead>
                              <TableHead className="w-[120px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loading ? (
                              Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                  <TableCell colSpan={4}>
                                    <Skeleton className="h-6 w-full" />
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (alerts?.openDowntime || []).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4}>
                                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-zc-muted">
                                    <ClipboardList className="h-4 w-4" /> No open downtime tickets.
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              (alerts?.openDowntime || []).map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell className="font-mono text-xs">
                                    <div className="flex flex-col gap-1">
                                      <span className="font-semibold text-zc-text">{t.asset?.code || "—"}</span>
                                      <span className="text-[11px] text-zc-muted">{t.asset?.name || ""}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="destructive">OPEN</Badge>
                                      <span className="text-sm text-zc-text">{t.reason}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{fmtDate(t.openedAt)}</TableCell>
                                  <TableCell className="text-right">
                                    {t.asset?.id ? (
                                      <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() =>
                                          openCloseDowntime(
                                            {
                                              id: t.asset!.id,
                                              branchId,
                                              code: t.asset!.code,
                                              name: t.asset!.name,
                                              category: t.asset!.category,
                                              operationalStatus: "DOWN",
                                              isSchedulable: false,
                                              downtimeTickets: [{
                                                id: t.id,
                                                assetId: t.asset!.id,
                                                status: "OPEN",
                                                reason: t.reason,
                                                notes: t.notes,
                                                openedAt: t.openedAt,
                                                closedAt: null,
                                              }],
                                            } as any,
                                            {
                                              id: t.id,
                                              assetId: t.asset!.id,
                                              status: "OPEN",
                                              reason: t.reason,
                                              notes: t.notes,
                                              openedAt: t.openedAt,
                                              closedAt: null,
                                            },
                                          )
                                        }
                                      >
                                        Close
                                      </Button>
                                    ) : null}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit dialog */}
      <EquipmentAssetDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        branchId={branchId}
        departments={departments}
        units={units}
        rooms={rooms}
        locations={locations}
        diagnosticSections={diagnosticSections}
        diagnosticCategories={diagnosticCategories}
        editing={editing}
        onSaved={async (result, mode) => {
          if (result?.warnings?.length) {
            toast({ title: mode === "create" ? "Saved with warnings" : "Updated with warnings", description: result.warnings.join(" • ") });
          } else {
            toast({ title: mode === "create" ? "Equipment created" : "Equipment updated", description: "Saved successfully." });
          }
          await Promise.all([loadEquipment(false), loadSummary()]);
          if (activeTab === "alerts") await loadAlerts(false);
        }}
      />

      {/* Downtime dialog */}
      <Dialog open={downtimeDialogOpen} onOpenChange={setDowntimeDialogOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{closingTicket ? "Close Downtime" : "Open Downtime"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
              <div className="text-sm font-semibold text-zc-text">{downtimeAsset ? `${downtimeAsset.code} • ${downtimeAsset.name}` : ""}</div>
              <div className="mt-1 text-sm text-zc-muted">
                {closingTicket ? "Add closure notes and confirm." : "Create a downtime ticket; equipment status will be set to DOWN."}
              </div>
            </div>

            {!closingTicket ? (
              <div className="grid gap-2">
                <Label>Reason</Label>
                <Input value={dtReason} onChange={(e) => setDtReason(e.target.value)} placeholder="e.g., Power supply failure" />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Reason</Label>
                <Input value={dtReason} disabled />
              </div>
            )}

            <div className="grid gap-2">
              <Label>{closingTicket ? "Closure notes" : "Notes"}</Label>
              <Textarea value={dtNotes} onChange={(e) => setDtNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDowntimeDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitDowntime} disabled={busy || !downtimeAsset}>
              {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              {closingTicket ? "Close Ticket" : "Open Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Alerts List Card                               */
/* -------------------------------------------------------------------------- */

function AlertList({
  title,
  icon,
  items,
  empty,
  dateField,
}: {
  title: string;
  icon: React.ReactNode;
  items: EquipmentAssetRow[];
  empty: string;
  dateField: "nextPmDueAt" | "amcValidTo" | "warrantyValidTo" | "__compliance";
}) {
  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge variant={items.length ? "warning" : "secondary"}>{items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-zc-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[170px]">Due / Expiry</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-zc-muted">
                      <Wrench className="h-4 w-4" /> {empty}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.slice(0, 20).map((r) => {
                  const d =
                    dateField === "__compliance"
                      ? r.category === "RADIOLOGY"
                        ? r.aerbValidTo
                        : r.category === "ULTRASOUND"
                          ? r.pcpndtValidTo
                          : null
                      : (r as any)[dateField];
                  const dd = daysUntil(d);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-zc-text">{r.code}</span>
                          <span className="text-[11px] text-zc-muted">{r.category}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-zc-text">{r.name}</span>
                          <span className="text-xs text-zc-muted">{[r.make, r.model].filter(Boolean).join(" ") || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={dueTone(dd)}>
                          {fmtDate(d)}
                          {dd != null ? ` (${dd}d)` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="primary" size="sm" asChild>
                          <Link href={`/superadmin/infrastructure/equipment/${encodeURIComponent(r.id)}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Create/Edit Equipment Dialog                        */
/* -------------------------------------------------------------------------- */

function EquipmentAssetDialog({
  open,
  onOpenChange,
  branchId,
  departments,
  units,
  rooms,
  locations,
  diagnosticSections,
  diagnosticCategories,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  departments: DepartmentRow[];
  units: UnitRow[];
  rooms: RoomRow[];
  locations: Array<{ id: string; label: string; type: LocationType }>;
  diagnosticSections: DiagnosticSectionRow[];
  diagnosticCategories: DiagnosticCategoryRow[];
  editing: EquipmentAssetRow | null;
  onSaved: (row: EquipmentAssetRow, mode: "create" | "update") => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState<any>({});

  const sectionById = React.useMemo(
    () => new Map(diagnosticSections.filter((s) => s.id).map((s) => [s.id, s])),
    [diagnosticSections],
  );
  const categoryOptions = React.useMemo(() => {
    return diagnosticCategories
      .filter((c) => c.id && c.isActive)
      .map((c) => {
        const section = sectionById.get(c.sectionId);
        const label = section ? `${c.name} (${c.code}) • ${section.name}` : `${c.name} (${c.code})`;
        return {
          id: c.id,
          label,
          mappedCategory: mapDiagnosticCategoryToEquipmentCategory(c, sectionById),
        };
      });
  }, [diagnosticCategories, sectionById]);

  React.useEffect(() => {
    if (!open) return;
    const base = {
      code: editing?.code || "",
      name: editing?.name || "",
      category: (editing?.category || "GENERAL") as EquipmentCategory,
      diagnosticCategoryId: "",
      make: editing?.make || "",
      model: editing?.model || "",
      serial: editing?.serial || "",
      ownerDepartmentId: editing?.ownerDepartmentId || "",
      unitId: editing?.unitId || "",
      roomId: editing?.roomId || "",
      locationNodeId: editing?.locationNodeId || "",
      operationalStatus: (editing?.operationalStatus || "OPERATIONAL") as EquipmentOperationalStatus,
      isSchedulable: Boolean(editing?.isSchedulable ?? false),
      amcVendor: editing?.amcVendor || "",
      amcValidFrom: editing?.amcValidFrom ? String(editing?.amcValidFrom).slice(0, 10) : "",
      amcValidTo: editing?.amcValidTo ? String(editing?.amcValidTo).slice(0, 10) : "",
      warrantyValidTo: editing?.warrantyValidTo ? String(editing?.warrantyValidTo).slice(0, 10) : "",
      pmFrequencyDays: editing?.pmFrequencyDays ?? "",
      nextPmDueAt: editing?.nextPmDueAt ? String(editing?.nextPmDueAt).slice(0, 10) : "",
      aerbLicenseNo: editing?.aerbLicenseNo || "",
      aerbValidTo: editing?.aerbValidTo ? String(editing?.aerbValidTo).slice(0, 10) : "",
      pcpndtRegNo: editing?.pcpndtRegNo || "",
      pcpndtValidTo: editing?.pcpndtValidTo ? String(editing?.pcpndtValidTo).slice(0, 10) : "",
    };
    setForm(base);
  }, [open, editing]);

  React.useEffect(() => {
    if (!open) return;
    if (form.diagnosticCategoryId) return;
    if (!categoryOptions.length) return;
    const currentCategory = (editing?.category || form.category || "GENERAL") as EquipmentCategory;
    const match = categoryOptions.find((c) => c.mappedCategory === currentCategory) || categoryOptions[0];
    setForm((prev: any) => ({
      ...prev,
      diagnosticCategoryId: match?.id || "",
      category: match?.mappedCategory || currentCategory,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryOptions]);

  const requiresAerb = form.category === "RADIOLOGY";
  const requiresPcpndt = form.category === "ULTRASOUND";

  const roomOptions = React.useMemo(() => {
    if (!form.unitId) return [] as RoomRow[];
    return rooms.filter((r) => r.unitId === form.unitId);
  }, [rooms, form.unitId]);

  function patch(p: Partial<any>) {
    setForm((prev: any) => ({ ...prev, ...p }));
  }

  function normalizePayload(): any {
    const payload: any = {
      code: String(form.code || "").trim(),
      name: String(form.name || "").trim(),
      category: form.category,
      make: form.make?.trim() ? String(form.make).trim() : null,
      model: form.model?.trim() ? String(form.model).trim() : null,
      serial: form.serial?.trim() ? String(form.serial).trim() : null,
      ownerDepartmentId: form.ownerDepartmentId ? form.ownerDepartmentId : null,
      unitId: form.unitId ? form.unitId : null,
      roomId: form.roomId ? form.roomId : null,
      locationNodeId: form.locationNodeId ? form.locationNodeId : null,
      operationalStatus: form.operationalStatus,
      isSchedulable: Boolean(form.isSchedulable),
      amcVendor: form.amcVendor?.trim() ? String(form.amcVendor).trim() : null,
      amcValidFrom: form.amcValidFrom ? form.amcValidFrom : null,
      amcValidTo: form.amcValidTo ? form.amcValidTo : null,
      warrantyValidTo: form.warrantyValidTo ? form.warrantyValidTo : null,
      pmFrequencyDays: form.pmFrequencyDays === "" || form.pmFrequencyDays === null ? null : Number(form.pmFrequencyDays),
      nextPmDueAt: form.nextPmDueAt ? form.nextPmDueAt : null,
      aerbLicenseNo: requiresAerb && form.aerbLicenseNo?.trim() ? String(form.aerbLicenseNo).trim() : null,
      aerbValidTo: requiresAerb && form.aerbValidTo ? form.aerbValidTo : null,
      pcpndtRegNo: requiresPcpndt && form.pcpndtRegNo?.trim() ? String(form.pcpndtRegNo).trim() : null,
      pcpndtValidTo: requiresPcpndt && form.pcpndtValidTo ? form.pcpndtValidTo : null,
    };

    // If retired, always make non-schedulable.
    if (payload.operationalStatus === "RETIRED") payload.isSchedulable = false;
    return payload;
  }

  async function save() {
    if (!branchId) return;
    const payload = normalizePayload();
    if (!payload.code || !payload.name) {
      toast({ title: "Missing fields", description: "Code and Name are required." });
      return;
    }
    setSaving(true);
    try {
      const mode: "create" | "update" = editing ? "update" : "create";
      const url = editing
        ? `/api/infrastructure/equipment/${encodeURIComponent(editing.id)}`
        : `/api/infrastructure/equipment?branchId=${encodeURIComponent(branchId)}`;
      const res = await apiFetch<any>(url, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      onOpenChange(false);
      onSaved(res as EquipmentAssetRow, mode);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={editing ? "Edit Equipment" : "New Equipment"}
          description="Register assets with schedules, compliance, and downtime settings."
          onClose={() => onOpenChange(false)}
        />

        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Code</Label>
              <Input value={form.code || ""} onChange={(e) => patch({ code: e.target.value })} placeholder="e.g., XRAY-01" />
            </div>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name || ""} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g., X-Ray Machine" />
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={form.diagnosticCategoryId || ""}
                onValueChange={(v) => {
                  const picked = categoryOptions.find((c) => c.id === v);
                  const mapped = picked?.mappedCategory || "GENERAL";
                  patch({
                    diagnosticCategoryId: v,
                    category: mapped,
                    aerbLicenseNo: "",
                    aerbValidTo: "",
                    pcpndtRegNo: "",
                    pcpndtValidTo: "",
                  });
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No diagnostic categories found
                    </SelectItem>
                  ) : (
                    categoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Operational Status</Label>
              <Select value={form.operationalStatus} onValueChange={(v) => patch({ operationalStatus: v })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATIONAL">OPERATIONAL</SelectItem>
                  <SelectItem value="DOWN">DOWN</SelectItem>
                  <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                  <SelectItem value="RETIRED">RETIRED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Make</Label>
              <Input value={form.make || ""} onChange={(e) => patch({ make: e.target.value })} placeholder="e.g., GE" />
            </div>
            <div className="grid gap-2">
              <Label>Model</Label>
              <Input value={form.model || ""} onChange={(e) => patch({ model: e.target.value })} placeholder="e.g., LOGIQ P9" />
            </div>
            <div className="grid gap-2">
              <Label>Serial No</Label>
              <Input value={form.serial || ""} onChange={(e) => patch({ serial: e.target.value })} placeholder="Optional" />
            </div>
            <div className="grid gap-2">
              <Label>Owner Department</Label>
              <Select
                value={form.ownerDepartmentId || "none"}
                onValueChange={(v) => patch({ ownerDepartmentId: v === "none" ? "" : v })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  <SelectItem value="none">None</SelectItem>
                  {departments.filter((d) => d.id).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.code} • {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Unit</Label>
              <Select
                value={form.unitId || "none"}
                onValueChange={(v) => patch({ unitId: v === "none" ? "" : v, roomId: "" })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  <SelectItem value="none">None</SelectItem>
                  {units.filter((u) => u.id).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.code} • {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Room / Bay</Label>
              <Select
                value={form.roomId || "none"}
                onValueChange={(v) => patch({ roomId: v === "none" ? "" : v })}
                disabled={!form.unitId}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={!form.unitId ? "Select Unit first" : "Optional"} />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  <SelectItem value="none">None</SelectItem>
                  {roomOptions.filter((r) => r.id).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} • {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Location Node</Label>
              <Select
                value={form.locationNodeId || "none"}
                onValueChange={(v) => patch({ locationNodeId: v === "none" ? "" : v })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  <SelectItem value="none">None</SelectItem>
                  {locations.filter((l) => l.id).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>AMC Vendor</Label>
              <Input value={form.amcVendor || ""} onChange={(e) => patch({ amcVendor: e.target.value })} placeholder="Optional" />
            </div>
            <div className="grid gap-2">
              <Label>AMC Valid From</Label>
              <Input type="date" value={form.amcValidFrom || ""} onChange={(e) => patch({ amcValidFrom: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>AMC Valid To</Label>
              <Input type="date" value={form.amcValidTo || ""} onChange={(e) => patch({ amcValidTo: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Warranty Valid To</Label>
              <Input type="date" value={form.warrantyValidTo || ""} onChange={(e) => patch({ warrantyValidTo: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>PM Frequency (days)</Label>
              <Input
                type="number"
                min={1}
                value={form.pmFrequencyDays ?? ""}
                onChange={(e) => patch({ pmFrequencyDays: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label>Next PM Due</Label>
              <Input type="date" value={form.nextPmDueAt || ""} onChange={(e) => patch({ nextPmDueAt: e.target.value })} />
            </div>
          </div>

          <Separator />

          {(requiresAerb || requiresPcpndt) ? (
            <div className="grid gap-4 md:grid-cols-2">
              {requiresAerb ? (
                <>
                  <div className="grid gap-2">
                    <Label>AERB License No</Label>
                    <Input value={form.aerbLicenseNo || ""} onChange={(e) => patch({ aerbLicenseNo: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>AERB Valid To</Label>
                    <Input type="date" value={form.aerbValidTo || ""} onChange={(e) => patch({ aerbValidTo: e.target.value })} />
                  </div>
                </>
              ) : null}
              {requiresPcpndt ? (
                <>
                  <div className="grid gap-2">
                    <Label>PCPNDT Reg No</Label>
                    <Input value={form.pcpndtRegNo || ""} onChange={(e) => patch({ pcpndtRegNo: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>PCPNDT Valid To</Label>
                    <Input type="date" value={form.pcpndtValidTo || ""} onChange={(e) => patch({ pcpndtValidTo: e.target.value })} />
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
              Compliance fields apply only to <span className="font-semibold text-zc-text">RADIOLOGY</span> (AERB) and{" "}
              <span className="font-semibold text-zc-text">ULTRASOUND</span> (PCPNDT) categories.
            </div>
          )}

          <Separator />

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={Boolean(form.isSchedulable)}
                onCheckedChange={(v) => patch({ isSchedulable: v })}
                disabled={form.operationalStatus === "RETIRED"}
              />
              <div>
                <div className="text-sm font-semibold text-zc-text">Schedulable</div>
                <div className="text-sm text-zc-muted">
                  If enabled, policy enforcement may require compliance to be present and valid.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={form.operationalStatus === "RETIRED" ? "secondary" : "neutral"}>{form.operationalStatus}</Badge>
              {form.isSchedulable ? <Badge variant="ok">Schedulable</Badge> : <Badge variant="secondary">Not schedulable</Badge>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

