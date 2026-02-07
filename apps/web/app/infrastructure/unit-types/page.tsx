"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import {
  AlertTriangle,
  Filter,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Tags,
  ToggleLeft,
  ToggleRight,
  Wrench,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type UnitTypeTab = "ALL" | "ROOMS" | "SCHED";

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type UnitCategory =
  | "OUTPATIENT"
  | "INPATIENT"
  | "CRITICAL_CARE"
  | "PROCEDURE"
  | "DIAGNOSTIC"
  | "SUPPORT";

const UNIT_CATEGORY_OPTIONS: Array<{ value: UnitCategory; label: string }> = [
  { value: "OUTPATIENT", label: "Outpatient" },
  { value: "INPATIENT", label: "Inpatient" },
  { value: "CRITICAL_CARE", label: "Critical Care" },
  { value: "PROCEDURE", label: "Procedure" },
  { value: "DIAGNOSTIC", label: "Diagnostic" },
  { value: "SUPPORT", label: "Support" },
];

const UNIT_CATEGORY_LABEL: Record<UnitCategory, string> = UNIT_CATEGORY_OPTIONS.reduce(
  (acc, x) => {
    acc[x.value] = x.label;
    return acc;
  },
  {} as Record<UnitCategory, string>,
);

type UnitTypeCatalogRow = {
  id: string;
  code: string;
  name: string;
  category?: UnitCategory | null;

  usesRoomsDefault: boolean;
  schedulableByDefault: boolean;
  bedBasedDefault: boolean;
  requiresPreAuthDefault?: boolean;

  isSystemDefined?: boolean;
  isActive: boolean;
  sortOrder: number | null;
};

type BranchUnitTypeLink = {
  id: string;
  unitTypeId: string;
  isEnabled: boolean;
  enabledAt?: string | null;
};

/* ----------------------------- Helpers ----------------------------- */

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "_");
}

function isValidCode(code: string) {
  return /^[A-Z0-9_-]{2,32}$/.test(code);
}

const okPill =
  "inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
const badPill =
  "inline-flex items-center rounded-full border border-rose-200/70 bg-rose-50/70 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200";

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
/* ----------------------------- Page ----------------------------- */

export default function UnitTypesPage() {
  const { toast } = useToast();
  const { scope, branchId, isReady, reason } = useBranchContext();

  const [branch, setBranch] = React.useState<BranchRow | null>(null);
  const [allRows, setAllRows] = React.useState<UnitTypeCatalogRow[]>([]);
  const [enabledIds, setEnabledIds] = React.useState<Set<string>>(new Set());

  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Filters
  const [q, setQ] = React.useState("");
  const [tab, setTab] = React.useState<UnitTypeTab>("ALL");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [roomsOnly, setRoomsOnly] = React.useState(false);
  const [bedOnly, setBedOnly] = React.useState(false);
  const [categoryFilter, setCategoryFilter] = React.useState<UnitCategory | "ALL">("ALL");

  // Editor
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UnitTypeCatalogRow | null>(null);
  const [fCode, setFCode] = React.useState("");
  const [fName, setFName] = React.useState("");
  const [fCategory, setFCategory] = React.useState<UnitCategory>("OUTPATIENT");
  const [fSortOrder, setFSortOrder] = React.useState("");
  const [fUsesRooms, setFUsesRooms] = React.useState(true);
  const [fSched, setFSched] = React.useState(false);
  const [fBedBased, setFBedBased] = React.useState(false);
  const [fRequiresPreAuth, setFRequiresPreAuth] = React.useState(false);
  const [fActive, setFActive] = React.useState(true);

  const activeCount = allRows.filter((r) => r.isActive).length;
  const inactiveCount = allRows.filter((r) => !r.isActive).length;
  const enabledCount = enabledIds.size;

  const sysLocked = !!editing?.isSystemDefined;

  const filteredRows = React.useMemo(() => {
    let list = allRows;
    if (!includeInactive) list = list.filter((r) => r.isActive);
    if (tab === "SCHED") list = list.filter((r) => r.schedulableByDefault);
    if (roomsOnly) list = list.filter((r) => r.usesRoomsDefault);
    if (bedOnly) list = list.filter((r) => r.bedBasedDefault);
    if (categoryFilter !== "ALL") list = list.filter((r) => (r.category ?? "OUTPATIENT") === categoryFilter);

    const qq = q.trim().toLowerCase();
    if (qq) list = list.filter((r) => `${r.code} ${r.name}`.toLowerCase().includes(qq));

    return list;
  }, [allRows, includeInactive, tab, roomsOnly, bedOnly, categoryFilter, q]);

  async function loadBranch(bid: string) {
    try {
      const b = await apiFetch<BranchRow>(`/api/branches/${encodeURIComponent(bid)}`);
      setBranch(b);
    } catch {
      setBranch(null);
    }
  }

  async function loadCatalog() {
    setErr(null);
    setLoading(true);
    try {
      const qs = includeInactive ? "?includeInactive=true" : "";
      const data = await apiFetch<UnitTypeCatalogRow[]>(`/api/infrastructure/unit-types/catalog${qs}`);
      const list = Array.isArray(data) ? data : [];
      setAllRows(list);
    } catch (e: any) {
      setAllRows([]);
      setErr(errorMessage(e, "Failed to load unit types"));
    } finally {
      setLoading(false);
    }
  }

  async function loadBranchEnabled(bid: string) {
    try {
      const links = (await apiFetch<BranchUnitTypeLink[]>(
        `/api/infrastructure/branches/${encodeURIComponent(bid)}/unit-types`,
      )) || [];
      const ids = links.filter((x) => x.isEnabled).map((x) => x.unitTypeId);
      setEnabledIds(new Set(ids));
    } catch (e: any) {
      setEnabledIds(new Set());
      setErr(errorMessage(e, "Failed to load enablement"));
    }
  }

  const refreshAll = React.useCallback(async () => {
    if (!branchId) return;
    await Promise.all([loadBranch(branchId), loadCatalog(), loadBranchEnabled(branchId)]);
  }, [branchId, includeInactive]);

  React.useEffect(() => {
    if (!isReady || !branchId) return;
    void loadBranch(branchId);
    void loadCatalog();
    void loadBranchEnabled(branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, branchId, includeInactive]);

  function openCreate() {
    setEditing(null);
    setFCode("");
    setFName("");
    setFCategory("OUTPATIENT");
    setFSortOrder("");
    setFUsesRooms(true);
    setFSched(false);
    setFBedBased(false);
    setFRequiresPreAuth(false);
    setFActive(true);
    setOpen(true);
  }

  function openEdit(r: UnitTypeCatalogRow) {
    setEditing(r);
    setFCode(r.code);
    setFName(r.name);
    setFCategory((r.category ?? "OUTPATIENT") as UnitCategory);
    setFSortOrder(r.sortOrder === null || r.sortOrder === undefined ? "" : String(r.sortOrder));
    setFUsesRooms(!!r.usesRoomsDefault);
    setFSched(!!r.schedulableByDefault);
    setFBedBased(!!r.bedBasedDefault);
    setFRequiresPreAuth(!!r.requiresPreAuthDefault);
    setFActive(!!r.isActive);
    setOpen(true);
  }

  async function save() {
    if (!branchId) return;

    const code = normalizeCode(fCode);
    const name = fName.trim();

    if (!editing && !code) {
      toast({ title: "Missing code", description: "Unit type code is required.", variant: "destructive" });
      return;
    }
    if (!name) {
      toast({ title: "Missing name", description: "Unit type name is required.", variant: "destructive" });
      return;
    }
    if (!editing && !isValidCode(code)) {
      toast({
        title: "Invalid code",
        description: "Use 2-32 chars: A-Z, 0-9, underscore or hyphen. Example: ICU, IPD_GEN, RAD_CT",
        variant: "destructive",
      });
      return;
    }

    const sortOrder = fSortOrder.trim() ? Number(fSortOrder.trim()) : null;
    if (fSortOrder.trim() && !Number.isFinite(sortOrder)) {
      toast({ title: "Invalid sort order", description: "Sort order must be a number.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        const sysLocked = !!editing.isSystemDefined;

        const body: any = {
          isActive: !!fActive,
          sortOrder,
        };

        if (!sysLocked) {
          body.name = name;
          body.category = fCategory;
          body.usesRoomsDefault = !!fUsesRooms;
          body.schedulableByDefault = !!fSched;
          body.bedBasedDefault = !!fBedBased;
          body.requiresPreAuthDefault = !!fRequiresPreAuth;
        }

        await apiFetch(`/api/infrastructure/unit-types/catalog/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          body,
        });
        toast({ title: "Unit type updated", description: "Changes saved successfully.", duration: 1600 });
      } else {
        await apiFetch(`/api/infrastructure/unit-types/catalog`, {
          method: "POST",
          body: {
            code,
            name,
            category: fCategory,
            usesRoomsDefault: !!fUsesRooms,
            schedulableByDefault: !!fSched,
            bedBasedDefault: !!fBedBased,
            requiresPreAuthDefault: !!fRequiresPreAuth,
            isActive: !!fActive,
            sortOrder,
          },
        });
        toast({ title: "Unit type created", description: "Catalog item added successfully.", duration: 1600 });
      }

      setOpen(false);
      await loadCatalog();
    } catch (e: any) {
      toast({ title: "Save failed", description: errorMessage(e, "Failed to save unit type"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(r: UnitTypeCatalogRow) {
    if (!branchId) return;
    if (!r.isActive) return;

    const next = new Set(enabledIds);
    if (next.has(r.id)) next.delete(r.id);
    else next.add(r.id);

    const activeIds = new Set(allRows.filter((x) => x.isActive).map((x) => x.id));
    const unitTypeIds = Array.from(next).filter((id) => activeIds.has(id));

    if (!unitTypeIds.length) {
      toast({ title: "At least one unit type required", description: "You cannot disable all unit types.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/branches/${encodeURIComponent(branchId)}/unit-types`, {
        method: "PUT",
        body: { unitTypeIds },
      });
      setEnabledIds(new Set(unitTypeIds));
      toast({
        title: next.has(r.id) ? "Enabled" : "Disabled",
        description: r.name,
        duration: 1400,
      });
    } catch (e: any) {
      toast({ title: "Update failed", description: errorMessage(e, "Failed to update enablement"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell title="Infrastructure - Unit Types">
      <RequirePerm perm="INFRA_UNITTYPE_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <Layers className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Unit Types</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Standard unit type catalog and per-branch enablement.
                </div>
                {scope === "GLOBAL" && !branchId ? (
                  <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2 text-sm text-zc-muted">
                    {reason ?? "Select an active branch to manage unit types."}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="px-5 gap-2" onClick={() => void refreshAll()} disabled={loading || busy || !branchId}>
                <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>
              <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={loading || busy || !branchId}>
                <Plus className="h-4 w-4" />
                New Unit Type
              </Button>
            </div>
          </div>

          {/* Overview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription className="text-sm">Search and filter unit types in the active branch.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Unit Types</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{allRows.length}</div>
                  <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                    Active: <span className="font-semibold tabular-nums">{activeCount}</span> | Inactive: {" "}
                    <span className="font-semibold tabular-nums">{inactiveCount}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                  <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Enabled (Branch)</div>
                  <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{enabledCount}</div>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                  <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Catalog Active</div>
                  <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{activeCount}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    placeholder="Search by code or name..."
                    className="pl-10"
                    disabled={!branchId}
                  />
                </div>

                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{filteredRows.length}</span> unit types
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[240px]">
                  <Label className="text-xs text-zc-muted">View</Label>
                  <Tabs value={tab} onValueChange={(v) => setTab(v as UnitTypeTab)}>
                    <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                      <TabsTrigger
                        value="ALL"
                        className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        <Tags className="mr-2 h-4 w-4" />
                        All
                      </TabsTrigger>
                      <TabsTrigger
                        value="SCHED"
                        className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Schedulable
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="min-w-[240px]">
                  <Label className="text-xs text-zc-muted">Category</Label>
                  <Select
                    value={categoryFilter}
                    onValueChange={(v) => setCategoryFilter(v as UnitCategory | "ALL")}
                    disabled={!branchId}
                  >
                    <SelectTrigger className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All categories</SelectItem>
                      {UNIT_CATEGORY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={!branchId} />
                  <span className="text-xs text-zc-muted">Include inactive</span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                  <Switch checked={roomsOnly} onCheckedChange={setRoomsOnly} disabled={!branchId} />
                  <span className="text-xs text-zc-muted">Uses rooms only</span>
                </div>
               <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                  <Switch checked={bedOnly} onCheckedChange={setBedOnly} disabled={!branchId} />
                  <span className="text-xs text-zc-muted">Bed-based only</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setQ("");
                    setTab("ALL");
                    setIncludeInactive(false);
                    setRoomsOnly(false);
                    setBedOnly(false);
                    setCategoryFilter("ALL");
                  }}
                  disabled={!branchId}
                >
                  <Filter className="h-4 w-4" />
                  Reset
                </Button>

                {branch ? (
                  <span className="text-xs text-zc-muted">
                    Branch: <span className="font-semibold text-zc-text">{branch.code}</span>
                  </span>
                ) : null}
              </div>

              {err ? (
                <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div className="min-w-0">{err}</div>
                </div>
              ) : null}
            </CardContent>
          </Card>
          {/* Table */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Unit Type Directory</CardTitle>
                  <CardDescription className="text-sm">Master list used to enable branches.</CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
                    {roomsOnly ? "Rooms Only" : "All Types"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <Separator />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Code</th>
                    <th className="px-4 py-3 text-left font-semibold">Unit Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Defaults</th>
                    <th className="px-4 py-3 text-left font-semibold">Enabled</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Sort</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                        Loading unit types...
                      </td>
                    </tr>
                  ) : !branchId ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                        <span className="inline-flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-zc-warn" />
                          Select a branch first.
                        </span>
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                        <span className="inline-flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-zc-warn" />
                          No unit types found.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => {
                      const enabled = enabledIds.has(r.id);

                      return (
                        <tr key={r.id} className={cn("border-t border-zc-border hover:bg-zc-panel/20", !r.isActive && "opacity-70")}>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                              {r.code}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-semibold text-zc-text">{r.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
                                {r.category ? (UNIT_CATEGORY_LABEL[r.category as UnitCategory] ?? r.category) : "—"}
                              </span>
                              {r.requiresPreAuthDefault ? (
                                <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
                                  Pre-auth
                                </span>
                              ) : null}
                              {r.isSystemDefined ? (
                                <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
                                  System
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <span className={r.usesRoomsDefault ? okPill : badPill}>Rooms</span>
                              <span className={r.schedulableByDefault ? okPill : badPill}>Schedulable</span>
                              <span className={r.bedBasedDefault ? okPill : badPill}>Bed-based</span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {enabled ? <span className={okPill}>ENABLED</span> : <span className={badPill}>DISABLED</span>}
                          </td>

                          <td className="px-4 py-3">
                            {r.isActive ? (
                              <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                                INACTIVE
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-zc-muted">{r.sortOrder ?? "-"}</td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="info"
                                size="icon"
                                onClick={() => openEdit(r)}
                                title="Edit unit type"
                                aria-label="Edit unit type"
                                disabled={!branchId || busy}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={enabled ? "secondary" : "success"}
                                size="icon"
                                onClick={() => void toggleEnabled(r)}
                                title={enabled ? "Disable unit type" : "Enable unit type"}
                                aria-label={enabled ? "Disable unit type" : "Enable unit type"}
                                disabled={!branchId || busy || !r.isActive}
                              >
                                {busy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : enabled ? (
                                  <ToggleLeft className="h-4 w-4" />
                                ) : (
                                  <ToggleRight className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Editor */}
          <Dialog open={open} onOpenChange={(v) => (!busy ? setOpen(v) : null)}>
            <DialogContent className={drawerClassName()}>
              <ModalHeader
                title={editing ? "Edit Unit Type" : "Create Unit Type"}
                description="Unit types define defaults and branch enablement settings."
                onClose={() => setOpen(false)}
              />

              <div className="grid gap-6">
                {sysLocked ? (
                  <div className="rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2 text-sm text-zc-muted">
                    This is a system-defined unit type. You can only change <span className="font-semibold">Status</span> and{" "}
                    <span className="font-semibold">Sort Order</span>.
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Code</Label>
                    <Input
                      value={fCode}
                      onChange={(e) => setFCode(e.target.value)}
                      placeholder="e.g. ICU"
                      className={cn(
                        "font-mono",
                        editing && "opacity-80",
                      )}
                      disabled={!!editing || busy}
                    />
                    <div className="text-[11px] text-zc-muted">Unique code (A-Z, 0-9, underscore or hyphen). 2-32 chars.</div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input
                      value={fName}
                      onChange={(e) => setFName(e.target.value)}
                      placeholder="e.g. Intensive Care Unit"
                      disabled={busy || sysLocked}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select
                      value={fCategory}
                      onValueChange={(v) => setFCategory(v as UnitCategory)}
                      disabled={busy || sysLocked}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_CATEGORY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Sort Order</Label>
                    <Input
                      value={fSortOrder}
                      onChange={(e) => setFSortOrder(e.target.value)}
                      placeholder="e.g. 10"
                      disabled={busy}
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zc-text">Status</div>
                      <div className="text-xs text-zc-muted">Inactive unit types are hidden by default.</div>
                    </div>
                    <Switch checked={fActive} onCheckedChange={setFActive} disabled={busy} />
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zc-text">Uses Rooms</div>
                      <div className="text-xs text-zc-muted">Enable if this unit type uses rooms/bays.</div>
                    </div>
                    <Switch checked={fUsesRooms} onCheckedChange={setFUsesRooms} disabled={busy || sysLocked} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zc-text">Schedulable</div>
                      <div className="text-xs text-zc-muted">Allow scheduling for this unit type.</div>
                    </div>
                    <Switch checked={fSched} onCheckedChange={setFSched} disabled={busy || sysLocked} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zc-text">Bed-based</div>
                      <div className="text-xs text-zc-muted">Enable if the unit type is bed-based.</div>
                    </div>
                    <Switch checked={fBedBased} onCheckedChange={setFBedBased} disabled={busy || sysLocked} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zc-text">Requires Pre-auth</div>
                      <div className="text-xs text-zc-muted">Enable if insurance pre-authorization is typically required.</div>
                    </div>
                    <Switch checked={fRequiresPreAuth} onCheckedChange={setFRequiresPreAuth} disabled={busy || sysLocked} />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={() => void save()} disabled={busy}>
                  {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editing ? "Save Changes" : "Create Unit Type"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
