"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import {
  AlertTriangle,
  Check,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Search,
  Wand2,
  Pencil,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city: string;
};

type UnitTypeCatalogRow = {
  id: string;
  code: string;
  name: string;
  usesRoomsDefault?: boolean;
  schedulableByDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

type BranchUnitTypeRow =
  | string
  | {
      id?: string;
      unitTypeId: string;
      isEnabled: boolean;
    };

/* ----------------------------- Helpers ----------------------------- */

type Tone = "indigo" | "emerald" | "amber" | "rose";

function summaryCardClass(tone: Tone) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/10 dark:text-emerald-200";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50/50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200";
  }
  if (tone === "rose") {
    return "border-rose-200 bg-rose-50/50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/10 dark:text-rose-200";
  }
  return "border-indigo-200 bg-indigo-50/50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-900/10 dark:text-indigo-200";
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

function suggestCatalogCode(name: string) {
  const raw = (name || "").trim().toUpperCase();
  if (!raw) return "";
  const normalized = raw.replace(/\s+/g, "_").replace(/[^A-Z0-9_-]/g, "");
  return normalized.slice(0, 32);
}

function normalizeEnabledIds(rows: BranchUnitTypeRow[]): string[] {
  if (!rows || rows.length === 0) return [];
  if (typeof rows[0] === "string") return (rows as string[]).filter(Boolean);
  return (rows as any[])
    .filter((r) => r?.unitTypeId && r?.isEnabled === true)
    .map((r) => String(r.unitTypeId));
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function uniqSorted(ids: string[]) {
  return Array.from(new Set(ids)).sort();
}

function sameSet(a: string[], b: string[]) {
  const aa = uniqSorted(a);
  const bb = uniqSorted(b);
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
  return true;
}

function sortCatalog(list: UnitTypeCatalogRow[]) {
  return list
    .slice()
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name));
}

/* ----------------------------- Page ----------------------------- */

export default function SuperAdminUnitTypeEnablementPage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const sp = useSearchParams();
  const qpBranchId = sp.get("branchId") || undefined;

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  const [catalog, setCatalog] = React.useState<UnitTypeCatalogRow[]>([]);
  const [enabledIds, setEnabledIds] = React.useState<string[]>([]);
  const [savedEnabledIds, setSavedEnabledIds] = React.useState<string[]>([]);

  const [q, setQ] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [enabledFilter, setEnabledFilter] = React.useState<"all" | "enabled" | "disabled">("all");
  const [showFilters, setShowFilters] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"all" | "rooms" | "schedulable">("all");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createBusy, setCreateBusy] = React.useState(false);
  const [createErr, setCreateErr] = React.useState<string | null>(null);
  const [manualCode, setManualCode] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    code: "",
    name: "",
    usesRoomsDefault: true,
    schedulableByDefault: false,
    isActive: true,
    sortOrder: 0,
  });

  const enabledSet = React.useMemo(() => new Set(enabledIds), [enabledIds]);
  const dirty = !sameSet(enabledIds, savedEnabledIds);

  const activeCatalog = React.useMemo(
    () => (includeInactive ? catalog : catalog.filter((c) => c.isActive !== false)),
    [catalog, includeInactive],
  );

  const tabGroups = React.useMemo(
    () => ({
      all: sortCatalog(activeCatalog),
      rooms: sortCatalog(activeCatalog.filter((c) => c.usesRoomsDefault)),
      schedulable: sortCatalog(activeCatalog.filter((c) => c.schedulableByDefault)),
    }),
    [activeCatalog],
  );

  const filteredByTab = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    const applyFilters = (list: UnitTypeCatalogRow[]) => {
      let out = list;
      if (qq) out = out.filter((r) => `${r.code} ${r.name}`.toLowerCase().includes(qq));
      if (enabledFilter === "enabled") out = out.filter((r) => enabledSet.has(r.id));
      if (enabledFilter === "disabled") out = out.filter((r) => !enabledSet.has(r.id));
      return out;
    };

    return {
      all: applyFilters(tabGroups.all),
      rooms: applyFilters(tabGroups.rooms),
      schedulable: applyFilters(tabGroups.schedulable),
    };
  }, [q, enabledFilter, enabledSet, tabGroups]);

  const activeIds = React.useMemo(
    () => new Set(catalog.filter((c) => c.isActive !== false).map((c) => c.id)),
    [catalog],
  );

  const enabledCount = enabledIds.filter((id) => activeIds.has(id)).length;
  const totalCatalog = catalog.length;
  const inactiveCount = catalog.filter((c) => c.isActive === false).length;
  const activeTabLabel = activeTab === "rooms" ? "Uses Rooms" : activeTab === "schedulable" ? "Schedulable" : "All";

  async function loadBranches(): Promise<string | undefined> {
    const rows = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(rows);

    const stored = (effectiveBranchId || null);
    const first = rows[0]?.id;

    const next =
      (qpBranchId && rows.some((b) => b.id === qpBranchId) ? qpBranchId : undefined) ||
      (stored && rows.some((b) => b.id === stored) ? stored : undefined) ||
      first ||
      undefined;

    if (next) if (isGlobalScope) setActiveBranchId(next || null);
setBranchId(next);
    return next;
  }

  async function loadCatalog() {
    const rows = (await apiFetch<UnitTypeCatalogRow[]>("/api/infrastructure/unit-types/catalog")) || [];
    setCatalog(rows);
  }

  async function loadBranchEnabledTypes(bid: string) {
    const rows = (await apiFetch<BranchUnitTypeRow[]>(
      `/api/infrastructure/branches/${encodeURIComponent(bid)}/unit-types`,
    )) || [];
    const ids = normalizeEnabledIds(rows);
    setEnabledIds(ids);
    setSavedEnabledIds(ids);
  }

  async function refreshAll(showToast = false) {
    if (!branchId) return;
    setBusy(true);
    setErr(null);
    try {
      await Promise.all([loadCatalog(), loadBranchEnabledTypes(branchId)]);
      if (showToast) toast({ title: "Refreshed", description: "Loaded latest data." });
    } catch (e) {
      const message = errorMessage(e, "Refresh failed.");
      setErr(message);
      if (showToast) toast({ title: "Refresh failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function toggleOne(id: string) {
    setEnabledIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return Array.from(s);
    });
  }

  function toggleAllInList(list: UnitTypeCatalogRow[]) {
    const activeListIds = list.filter((x) => x.isActive !== false).map((x) => x.id);
    const enabled = new Set(enabledIds);
    const allSelected = activeListIds.length > 0 && activeListIds.every((id) => enabled.has(id));

    setEnabledIds((prev) => {
      const s = new Set(prev);
      if (allSelected) {
        for (const id of activeListIds) s.delete(id);
      } else {
        for (const id of activeListIds) s.add(id);
      }
      return Array.from(s);
    });

    return !allSelected;
  }

  async function saveChanges() {
    if (!branchId) return;
    setBusy(true);
    setErr(null);

    try {
      const unitTypeIds = Array.from(new Set(enabledIds));

      await apiFetch(`/api/infrastructure/branches/${encodeURIComponent(branchId)}/unit-types`, {
        method: "PUT",
        body: JSON.stringify({ unitTypeIds }),
      });

      setSavedEnabledIds(unitTypeIds);
      toast({ title: "Saved", description: "Unit type enablement updated successfully." });
    } catch (e) {
      const message = errorMessage(e, "Save failed.");
      setErr(message);
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    setLoading(true);
    void loadBranches()
      .then((bid) => loadCatalog().then(() => (bid ? loadBranchEnabledTypes(bid) : undefined)))
      .catch((e) => setErr(errorMessage(e, "Unable to load data.")))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    if (isGlobalScope) setActiveBranchId(branchId || null);
setBusy(true);
    setErr(null);
    void loadBranchEnabledTypes(branchId)
      .catch((e) => setErr(errorMessage(e, "Unable to load enablement.")))
      .finally(() => setBusy(false));
  }, [branchId]);

  React.useEffect(() => {
    if (!createOpen) return;
    if (manualCode) return;
    const suggested = suggestCatalogCode(createForm.name);
    setCreateForm((p) => ({ ...p, code: suggested }));
  }, [createForm.name, manualCode, createOpen]);

  function openCreateDialog() {
    setCreateErr(null);
    setManualCode(false);
    setCreateForm({
      code: "",
      name: "",
      usesRoomsDefault: true,
      schedulableByDefault: false,
      isActive: true,
      sortOrder: 0,
    });
    setCreateOpen(true);
  }

  async function createCatalog() {
    setCreateErr(null);

    const code = (createForm.code || "").trim().toUpperCase();
    const name = (createForm.name || "").trim();

    if (!name) return setCreateErr("Name is required.");
    if (!code) return setCreateErr("Code is required.");
    if (code.length < 2 || code.length > 32) return setCreateErr("Code must be between 2 and 32 characters.");
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      return setCreateErr("Code can contain only A-Z, 0-9, underscore (_) and hyphen (-).");
    }
    if (catalog.some((c) => (c.code || "").toUpperCase() === code)) {
      return setCreateErr(`Code "${code}" already exists in the catalog.`);
    }
    if (name.length > 120) return setCreateErr("Name must be 120 characters or less.");

    setCreateBusy(true);
    try {
      await apiFetch("/api/infrastructure/unit-types/catalog", {
        method: "POST",
        body: JSON.stringify({
          code,
          name,
          usesRoomsDefault: !!createForm.usesRoomsDefault,
          schedulableByDefault: !!createForm.schedulableByDefault,
          isActive: !!createForm.isActive,
          sortOrder: Number.isFinite(createForm.sortOrder) ? Math.max(0, Math.floor(createForm.sortOrder)) : 0,
        }),
      });

      toast({
        title: "Catalogue Created",
        description: `Unit type "${name}" added to catalog.`,
      });

      setCreateOpen(false);
      await loadCatalog();
    } catch (e) {
      const message = errorMessage(e, "Unable to create catalog item.");
      setCreateErr(message);
      toast({ title: "Create failed", description: message, variant: "destructive" });
    } finally {
      setCreateBusy(false);
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
                Enable or disable unit types per branch. Only enabled unit types can be used while creating units.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refreshAll(true)} disabled={busy || !branchId}>
              <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
            <Button variant="outline" className="px-5 gap-2" onClick={openCreateDialog} disabled={busy}>
              <Plus className="h-4 w-4" />
              Create Catalog
            </Button>
            <Button variant="primary" className="px-5 gap-2" onClick={() => void saveChanges()} disabled={busy || !branchId || !dirty}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load unit types</CardTitle>
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
              Select a branch, review the catalog, and enable the unit types needed for that branch.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Branch</Label>
                <Select
                  value={branchId || ""}
                  onValueChange={(v) => {
                    setBranchId(v || undefined);
                    if (isGlobalScope) setActiveBranchId(v || null);
}}
                >
                  <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} <span className="font-mono text-xs text-zc-muted">({b.code})</span> 
                        <span className="text-xs text-zc-muted">- {b.city}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Catalog status</Label>
                <div className={cn("rounded-xl border p-3", summaryCardClass(dirty ? "amber" : "emerald"))}>
                  <div className="text-xs font-medium">Changes</div>
                  <div className="mt-1 text-lg font-bold">{dirty ? "Unsaved" : "Saved"}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className={cn("rounded-xl border p-3", summaryCardClass("indigo"))}>
                <div className="text-xs font-medium">Catalog</div>
                <div className="mt-1 text-lg font-bold">{totalCatalog}</div>
              </div>
              <div className={cn("rounded-xl border p-3", summaryCardClass("emerald"))}>
                <div className="text-xs font-medium">Enabled</div>
                <div className="mt-1 text-lg font-bold">{enabledCount}</div>
              </div>
              <div className={cn("rounded-xl border p-3", summaryCardClass("amber"))}>
                <div className="text-xs font-medium">Inactive</div>
                <div className="mt-1 text-lg font-bold">{inactiveCount}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code/name..."
                  className="pl-10"
                  disabled={loading}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">Include inactive</div>
                    <div className="text-xs text-zc-muted">Show disabled catalog items</div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowFilters((s) => !s)}
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Button>
              </div>
            </div>

            {showFilters ? (
              <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                  <Filter className="h-4 w-4 text-zc-accent" />
                  Filters
                </div>

                <div className="grid gap-3 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <Label className="text-xs text-zc-muted">Enabled filter</Label>
                    <Select value={enabledFilter} onValueChange={(v) => setEnabledFilter(v as "all" | "enabled" | "disabled")}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Branch scoped</Badge>
              <Badge variant="secondary">Segment: {activeTabLabel}</Badge>
              <Badge variant="secondary">Enabled: {enabledCount}</Badge>
              {dirty ? <Badge variant="warning">Unsaved</Badge> : <Badge variant="ok">Saved</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Workspace */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Unit Type Workspace</CardTitle>
                <CardDescription>Search and toggle which unit types are enabled for the selected branch.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "rooms" | "schedulable")}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="all"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="rooms"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    Uses Rooms
                  </TabsTrigger>
                  <TabsTrigger
                    value="schedulable"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    Schedulable
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <Tabs value={activeTab}>
              {([
                { key: "all", label: "All" },
                { key: "rooms", label: "Uses Rooms" },
                { key: "schedulable", label: "Schedulable" },
              ] as const).map((tab) => {
                const list = filteredByTab[tab.key] || [];
                const base = tabGroups[tab.key] || [];
                return (
                  <TabsContent key={tab.key} value={tab.key} className="mt-0">
                    <div className="rounded-xl border border-zc-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[140px]">Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[200px]">Defaults</TableHead>
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead className="w-[120px]">Enabled</TableHead>
                            <TableHead className="w-[120px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell colSpan={6}>
                                  <Skeleton className="h-6 w-full" />
                                </TableCell>
                              </TableRow>
                            ))
                          ) : !branchId ? (
                            <TableRow>
                              <TableCell colSpan={6}>
                                <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                                  <AlertTriangle className="h-4 w-4 text-zc-warn" />
                                  Select a branch first.
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : list.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6}>
                                <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                                  <Layers className="h-4 w-4" />
                                  No unit types found.
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            list.map((ut) => {
                              const enabled = enabledSet.has(ut.id);
                              const disabled = ut.isActive === false;
                              return (
                                <TableRow key={ut.id} className={disabled ? "opacity-70" : ""}>
                                  <TableCell className="font-mono text-xs font-semibold text-zc-text">{ut.code}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      <span className="font-semibold text-zc-text">{ut.name}</span>
                                      <span className="text-xs text-zc-muted">Sort: {ut.sortOrder ?? "--"}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm text-zc-muted">
                                    <div className="flex flex-wrap gap-2">
                                      <Badge variant={ut.usesRoomsDefault ? "secondary" : "outline"}>Rooms</Badge>
                                      <Badge variant={ut.schedulableByDefault ? "secondary" : "outline"}>Schedulable</Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {ut.isActive !== false ? (
                                      <Badge variant="ok">ACTIVE</Badge>
                                    ) : (
                                      <Badge variant="secondary">INACTIVE</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {enabled ? <Badge variant="ok">ENABLED</Badge> : <Badge variant="secondary">DISABLED</Badge>}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant={enabled ? "outline" : "primary"}
                                      size="sm"
                                      onClick={() => toggleOne(ut.id)}
                                      disabled={disabled || busy || !branchId}
                                    >
                                      {enabled ? "Disable" : "Enable"}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>

                      <div className="flex flex-col gap-3 border-t border-zc-border p-4 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-zc-muted">
                          Showing <span className="font-semibold text-zc-text">{list.length}</span> of{" "}
                          <span className="font-semibold text-zc-text">{base.length}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => toggleAllInList(base)}
                            disabled={!branchId || busy || loading}
                          >
                            <Check className="h-4 w-4" />
                            Toggle all (active)
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          if (!v) {
            setCreateErr(null);
            setCreateBusy(false);
            setManualCode(false);
          }
          setCreateOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Create Unit Type Catalog</DialogTitle>
            <DialogDescription>
              Adds a new unit type to the global catalog. After creation, enable it per branch on this page.
            </DialogDescription>
          </DialogHeader>

          {createErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{createErr}</div>
            </div>
          ) : null}

          <div className="grid gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Operation Theatre"
                  disabled={createBusy}
                />
                <p className="text-[11px] text-zc-muted">Human-friendly display name (max 120 chars).</p>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Code</Label>
                  {!manualCode && createForm.code ? (
                    <span className="flex items-center gap-1 text-[10px] text-zc-accent">
                      <Wand2 className="h-3 w-3" /> Auto-suggested
                    </span>
                  ) : null}
                </div>

                <div className="relative">
                  <Input
                    value={createForm.code}
                    onChange={(e) => {
                      setManualCode(true);
                      setCreateForm((p) => ({ ...p, code: e.target.value.toUpperCase() }));
                    }}
                    placeholder="OT"
                    className={cn("font-mono", createBusy && "opacity-80")}
                    disabled={createBusy}
                  />

                  {!manualCode && createForm.code ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1 h-7 w-7 text-zc-muted hover:text-zc-text"
                      title="Edit manually"
                      onClick={() => setManualCode(true)}
                      disabled={createBusy}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1 h-7 w-7 text-zc-muted hover:text-zc-text"
                      title="Suggest from name"
                      onClick={() => {
                        setManualCode(false);
                        setCreateForm((p) => ({ ...p, code: suggestCatalogCode(p.name) }));
                      }}
                      disabled={createBusy}
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Suggest</span>
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-zc-muted">
                  Allowed: A-Z, 0-9, <span className="font-mono">_</span>, <span className="font-mono">-</span>. Max 32
                  chars.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                <div className="grid gap-1">
                  <div className="text-sm font-semibold">Uses Rooms</div>
                  <div className="text-[11px] text-zc-muted">Default behavior for new units of this type.</div>
                </div>
                <Switch
                  checked={createForm.usesRoomsDefault}
                  onCheckedChange={(v) => setCreateForm((p) => ({ ...p, usesRoomsDefault: !!v }))}
                  disabled={createBusy}
                />
              </div>

              <div className="flex items-start justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                <div className="grid gap-1">
                  <div className="text-sm font-semibold">Schedulable</div>
                  <div className="text-[11px] text-zc-muted">Default scheduling capability.</div>
                </div>
                <Switch
                  checked={createForm.schedulableByDefault}
                  onCheckedChange={(v) => setCreateForm((p) => ({ ...p, schedulableByDefault: !!v }))}
                  disabled={createBusy}
                />
              </div>

              <div className="flex items-start justify-between gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                <div className="grid gap-1">
                  <div className="text-sm font-semibold">Active</div>
                  <div className="text-[11px] text-zc-muted">Inactive types stay hidden in selectors.</div>
                </div>
                <Switch
                  checked={createForm.isActive}
                  onCheckedChange={(v) => setCreateForm((p) => ({ ...p, isActive: !!v }))}
                  disabled={createBusy}
                />
              </div>

              <div className="grid gap-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={createForm.sortOrder}
                  onChange={(e) => setCreateForm((p) => ({ ...p, sortOrder: Number(e.target.value || 0) }))}
                  disabled={createBusy}
                />
                <p className="text-[11px] text-zc-muted">Lower numbers appear first. Leave 0 if unsure.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createBusy}>
              Cancel
            </Button>
            <Button type="button" className="gap-2" onClick={() => void createCatalog()} disabled={createBusy}>
              <Plus className={cn("h-4 w-4", createBusy ? "animate-pulse" : "")} />
              Create Catalog
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </RequirePerm>
</AppShell>
  );
}
