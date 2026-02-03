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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type FacilityCategory = "CLINICAL" | "SERVICE" | "SUPPORT";

type DepartmentRow = {
  id: string;
  branchId: string;
  facilityId: string;
  facility?: { id: string; code: string; name: string; category: FacilityCategory } | null;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SpecialtyRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  departments?: Array<{
    departmentId: string;
    isPrimary: boolean;
    department: { id: string; code: string; name: string; isActive: boolean };
  }>;
};

type DeptSpecialtyListResp = {
  department: { id: string; branchId: string; facilityId: string; code: string; name: string };
  items: Array<{
    id: string;
    departmentId: string;
    specialtyId: string;
    isPrimary: boolean;
    isActive: boolean;
    specialty: { id: string; code: string; name: string; isActive: boolean };
    createdAt: string;
    updatedAt: string;
  }>;
};

/* ----------------------------- Helpers ----------------------------- */

function qs(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (!s) return;
    usp.set(k, s);
  });
  return usp.toString();
}

function uniqSorted(ids: string[]) {
  return Array.from(new Set(ids)).sort();
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function fmtDateTime(value?: string | Date | null) {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

/* ----------------------------- Page ----------------------------- */

export default function SpecialtiesPage() {
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

  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [includeMappings, setIncludeMappings] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<SpecialtyRow[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [activeTab, setActiveTab] = React.useState<"specialties" | "mapping">("specialties");

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SpecialtyRow | null>(null);
  const [fCode, setFCode] = React.useState("");
  const [fName, setFName] = React.useState("");
  const [fActive, setFActive] = React.useState(true);

  const [deptQ, setDeptQ] = React.useState("");
  const [departments, setDepartments] = React.useState<DepartmentRow[]>([]);
  const [departmentId, setDepartmentId] = React.useState<string | undefined>(undefined);

  const [mapLoading, setMapLoading] = React.useState(false);
  const [mappedIds, setMappedIds] = React.useState<string[]>([]);
  const [savedMappedIds, setSavedMappedIds] = React.useState<string[]>([]);
  const [primaryId, setPrimaryId] = React.useState<string | undefined>(undefined);
  const [savedPrimaryId, setSavedPrimaryId] = React.useState<string | undefined>(undefined);

  const mappingDirty = !(
    uniqSorted(mappedIds).join(",") === uniqSorted(savedMappedIds).join(",") &&
    (primaryId ?? "") === (savedPrimaryId ?? "")
  );

  const activeCount = rows.filter((r) => r.isActive).length;
  const inactiveCount = rows.length - activeCount;

  async function loadBranches() {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = (effectiveBranchId || null);
    const first = list[0]?.id;

    const next =
      (qpBranchId && list.some((b) => b.id === qpBranchId) ? qpBranchId : undefined) ||
      (stored && list.some((b) => b.id === stored) ? stored : undefined) ||
      first ||
      undefined;

    if (next) if (isGlobalScope) setActiveBranchId(next || null);
setBranchId(next);
  }

  async function loadSpecialties(bid: string) {
    setLoading(true);
    setErr(null);
    try {
      const query = qs({
        branchId: bid,
        includeInactive: includeInactive ? "true" : undefined,
        includeMappings: includeMappings ? "true" : undefined,
        q: q.trim() || undefined,
      });

      const list = (await apiFetch<SpecialtyRow[]>(`/api/specialties?${query}`)) || [];
      let filtered = list;
      if (statusFilter === "active") filtered = list.filter((r) => r.isActive);
      if (statusFilter === "inactive") filtered = list.filter((r) => !r.isActive);
      setRows(filtered);
    } catch (e) {
      setRows([]);
      setErr(errorMessage(e, "Failed to load specialties"));
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments(bid: string) {
    const query = qs({
      branchId: bid,
      includeInactive: "false",
      q: deptQ.trim() || undefined,
    });
    const list = (await apiFetch<DepartmentRow[]>(`/api/departments?${query}`)) || [];
    setDepartments(list);

    if (!departmentId || !list.some((d) => d.id === departmentId)) {
      setDepartmentId(list[0]?.id);
    }
  }

  async function loadMapping(bid: string, deptId: string) {
    setMapLoading(true);
    try {
      const resp = await apiFetch<DeptSpecialtyListResp>(`/api/departments/${encodeURIComponent(deptId)}/specialties`);
      const ids = resp.items.map((x) => x.specialtyId);
      const primary = resp.items.find((x) => x.isPrimary)?.specialtyId;

      const norm = uniqSorted(ids);
      setMappedIds(norm);
      setSavedMappedIds(norm);
      setPrimaryId(primary);
      setSavedPrimaryId(primary);

      await loadSpecialties(bid);
    } finally {
      setMapLoading(false);
    }
  }

  async function refreshAll() {
    if (!branchId) return;
    setBusy(true);
    setErr(null);
    try {
      await Promise.all([loadSpecialties(branchId), loadDepartments(branchId)]);
      if (departmentId) await loadMapping(branchId, departmentId);
    } catch (e) {
      const message = errorMessage(e, "Failed to load");
      setErr(message);
      toast({ title: "Load failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFCode("");
    setFName("");
    setFActive(true);
    setEditorOpen(true);
  }

  function openEdit(r: SpecialtyRow) {
    setEditing(r);
    setFCode(r.code);
    setFName(r.name);
    setFActive(r.isActive);
    setEditorOpen(true);
  }

  async function saveSpecialty() {
    if (!branchId) return;

    const code = fCode.trim().toUpperCase();
    const name = fName.trim();

    if (!editing) {
      if (!code || code.length < 2) {
        toast({ title: "Invalid code", description: "Code must be at least 2 characters.", variant: "destructive" });
        return;
      }
    }
    if (!name) {
      toast({ title: "Invalid name", description: "Name is required.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      if (!editing) {
        await apiFetch("/api/specialties", {
          method: "POST",
          body: JSON.stringify({ branchId, code, name, isActive: fActive }),
        });
        toast({ title: "Created", description: "Specialty created." });
      } else {
        await apiFetch(`/api/specialties/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ name, isActive: fActive }),
        });
        toast({ title: "Updated", description: "Specialty updated." });
      }
      setEditorOpen(false);
      await loadSpecialties(branchId);
    } catch (e) {
      const message = errorMessage(e, "Failed to save");
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleSpecialtyActive(r: SpecialtyRow) {
    setBusy(true);
    try {
      await apiFetch(`/api/specialties/${encodeURIComponent(r.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      await loadSpecialties(branchId!);
      if (departmentId) await loadMapping(branchId!, departmentId);
    } catch (e) {
      const message = errorMessage(e, "Failed to update");
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function toggleMapped(id: string) {
    setMappedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      const next = Array.from(s);
      if (primaryId && !next.includes(primaryId)) setPrimaryId(undefined);
      return next;
    });
  }

  async function saveMapping() {
    if (!branchId || !departmentId) return;

    const ids = uniqSorted(mappedIds);
    if (primaryId && !ids.includes(primaryId)) {
      toast({ title: "Primary mismatch", description: "Primary must be part of selected specialties.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/api/departments/${encodeURIComponent(departmentId)}/specialties`, {
        method: "PUT",
        body: JSON.stringify({ specialtyIds: ids, primarySpecialtyId: primaryId ?? null }),
      });

      setSavedMappedIds(ids);
      setSavedPrimaryId(primaryId);
      toast({ title: "Saved", description: "Department specialty mapping updated." });
      await loadSpecialties(branchId);
    } catch (e) {
      const message = errorMessage(e, "Failed to save mapping");
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    setLoading(true);
    void loadBranches()
      .catch((e) => {
        setErr(errorMessage(e, "Failed to load branches"));
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!branchId) {
      setRows([]);
      setDepartments([]);
      setDepartmentId(undefined);
      return;
    }
    if (isGlobalScope) setActiveBranchId(branchId || null);
void refreshAll();
  }, [branchId]);

  React.useEffect(() => {
    if (!includeInactive && statusFilter !== "all") setStatusFilter("all");
  }, [includeInactive, statusFilter]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadSpecialties(branchId), 250);
    return () => clearTimeout(t);
  }, [q, includeInactive, includeMappings, statusFilter]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadDepartments(branchId), 250);
    return () => clearTimeout(t);
  }, [deptQ]);

  React.useEffect(() => {
    if (!branchId || !departmentId) return;
    void loadMapping(branchId, departmentId);
  }, [departmentId]);

  const branch = branches.find((b) => b.id === branchId) || null;

  return (
    <AppShell title="Infrastructure - Specialties">
      <RequirePerm perm="SPECIALTY_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Sparkles className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Specialties</div>
              <div className="mt-1 text-sm text-zc-muted">
                Branch-scoped specialty catalog with department mapping.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => void refreshAll()}
              disabled={loading || busy || !branchId}
            >
              <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
            <Button
              variant="primary"
              className="px-5 gap-2"
              onClick={openCreate}
              disabled={loading || busy || !branchId}
            >
              <Plus className="h-4 w-4" />
              New Specialty
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load specialties</CardTitle>
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
              Select a branch, manage specialty catalog, and map specialties to departments.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Branch</Label>
                <Select
                  value={branchId || ""}
                  onValueChange={(v) => {
                    setBranchId(v);
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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {branch ? <div className="text-xs text-zc-muted">Selected: {branch.name}</div> : null}
              </div>

              <div className="grid gap-2">
                <Label>Mapping visibility</Label>
                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={includeMappings} onCheckedChange={setIncludeMappings} disabled={!branchId} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">Show mapping info</div>
                    <div className="text-xs text-zc-muted">Linked departments count</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Specialties</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{rows.length}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{activeCount}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-200">Inactive</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-200">{inactiveCount}</div>
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
                  disabled={!branchId}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={!branchId} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">Include inactive</div>
                    <div className="text-xs text-zc-muted">Disabled specialties</div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowFilters((s) => !s)}
                  disabled={!branchId}
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
                    <Label className="text-xs text-zc-muted">Status</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}
                      disabled={!branchId || !includeInactive}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Branch scoped</Badge>
              {branch ? <Badge variant="secondary">Branch: {branch.code}</Badge> : null}
              <Badge variant="secondary">Total: {rows.length}</Badge>
              <Badge variant="ok">Active: {activeCount}</Badge>
              <Badge variant="warning">Inactive: {inactiveCount}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Workspace */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Specialty Workspace</CardTitle>
                <CardDescription>Create and manage specialty catalog and mappings.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "specialties" | "mapping")}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="specialties"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    Specialties
                  </TabsTrigger>
                  <TabsTrigger
                    value="mapping"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    Mapping
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <Tabs value={activeTab}>
              <TabsContent value="specialties" className="mt-0">
                <div className="rounded-xl border border-zc-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="w-[180px]">Mappings</TableHead>
                        <TableHead className="w-[180px]">Updated</TableHead>
                        <TableHead className="w-[72px]" />
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
                      ) : rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                              <AlertTriangle className="h-4 w-4 text-zc-warn" />
                              No specialties found.
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((r) => {
                          const mapCount = r.departments?.length ?? 0;
                          const primaryCount = (r.departments ?? []).filter((x) => x.isPrimary).length;

                          return (
                            <TableRow key={r.id} className={r.isActive ? "" : "opacity-70"}>
                              <TableCell className="font-mono text-xs font-semibold text-zc-text">{r.code}</TableCell>
                              <TableCell className="font-semibold text-zc-text">{r.name}</TableCell>
                              <TableCell>
                                {r.isActive ? <Badge variant="ok">ACTIVE</Badge> : <Badge variant="secondary">INACTIVE</Badge>}
                              </TableCell>
                              <TableCell className="text-sm text-zc-muted">
                                {includeMappings ? (
                                  <span className="font-mono text-xs">
                                    {mapCount} linked{primaryCount ? ` - ${primaryCount} primary` : ""}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-zc-muted">{fmtDateTime(r.updatedAt)}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[220px]">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => openEdit(r)}>
                                      <Wrench className="mr-2 h-4 w-4" />
                                      Edit specialty
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => void toggleSpecialtyActive(r)}>
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      {r.isActive ? "Deactivate" : "Activate"}
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
                      Total: <span className="font-semibold text-zc-text">{rows.length}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mapping" className="mt-0">
                <div className="grid gap-4 rounded-xl border border-zc-border p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Department</Label>
                      <Select value={departmentId} onValueChange={(v) => setDepartmentId(v)} disabled={!branchId}>
                        <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                          <SelectValue placeholder="Select department..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[320px] overflow-y-auto">
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name} <span className="font-mono text-xs text-zc-muted">({d.code})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-zc-muted">Mapping uses PUT /api/departments/:id/specialties</div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Search departments</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zc-muted" />
                        <Input
                          value={deptQ}
                          onChange={(e) => setDeptQ(e.target.value)}
                          placeholder="Search department..."
                          className="h-11 rounded-xl pl-10 border-zc-border bg-zc-card"
                          disabled={!branchId}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">Selected: {mappedIds.length}</Badge>
                      {primaryId ? <Badge variant="ok">Primary set</Badge> : <Badge variant="secondary">Primary not set</Badge>}
                      {mappingDirty ? <Badge variant="warning">Unsaved changes</Badge> : <Badge variant="ok">Saved</Badge>}
                    </div>

                    <Button
                      variant="primary"
                      className="gap-2"
                      onClick={() => void saveMapping()}
                      disabled={!branchId || !departmentId || busy || mapLoading || !mappingDirty}
                    >
                      <Check className="h-4 w-4" />
                      Save Mapping
                    </Button>
                  </div>

                  {!branchId ? (
                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                      Select a branch first.
                    </div>
                  ) : !departmentId ? (
                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                      Select a department to map specialties.
                    </div>
                  ) : mapLoading ? (
                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                      Loading mapping...
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Primary Specialty</Label>
                        <Select
                          value={primaryId ?? ""}
                          onValueChange={(v) => setPrimaryId(v || undefined)}
                          disabled={mappedIds.length === 0}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                            <SelectValue placeholder={mappedIds.length ? "Select primary..." : "Select specialties first"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[320px] overflow-y-auto">
                            {rows
                              .filter((s) => s.isActive && mappedIds.includes(s.id))
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} <span className="font-mono text-xs text-zc-muted">({s.code})</span>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-zc-muted">
                          Backend rule: primarySpecialtyId must be included in specialtyIds.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[80px]">Pick</TableHead>
                              <TableHead className="w-[160px]">Code</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead className="w-[120px]">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows
                              .slice()
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((s) => {
                                const checked = mappedIds.includes(s.id);
                                const disabled = !s.isActive;
                                return (
                                  <TableRow key={s.id} className={cn(disabled && "opacity-60")}>
                                    <TableCell>
                                      <Switch checked={checked} disabled={disabled} onCheckedChange={() => toggleMapped(s.id)} />
                                    </TableCell>
                                    <TableCell className="font-mono text-xs font-semibold text-zc-text">{s.code}</TableCell>
                                    <TableCell className="font-semibold text-zc-text">{s.name}</TableCell>
                                    <TableCell>
                                      {s.isActive ? <Badge variant="ok">ACTIVE</Badge> : <Badge variant="secondary">INACTIVE</Badge>}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editorOpen} onOpenChange={(v) => !busy && setEditorOpen(v)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Specialty" : "New Specialty"}</DialogTitle>
            <DialogDescription>Specialties are branch-scoped.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Code</div>
                <Input
                  className="h-11 rounded-xl border-zc-border bg-zc-panel/20 font-mono"
                  placeholder="e.g. CARD"
                  value={fCode}
                  onChange={(e) => setFCode(e.target.value)}
                  disabled={!!editing}
                />
                {editing ? <div className="text-xs text-zc-muted">Code cannot be changed after creation.</div> : null}
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">Name</div>
                <Input
                  className="h-11 rounded-xl border-zc-border bg-zc-panel/20"
                  placeholder="e.g. Cardiology"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-zc-muted">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[rgb(var(--zc-accent))]"
                checked={fActive}
                onChange={(e) => setFActive(e.target.checked)}
              />
              Active
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditorOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" className="rounded-xl" onClick={() => void saveSpecialty()} disabled={busy || !branchId}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </RequirePerm>
</AppShell>
  );
}
