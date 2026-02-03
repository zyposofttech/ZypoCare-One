"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";
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
  Building2,
  CheckCircle2,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Wrench,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type FacilityCategory = "CLINICAL" | "SERVICE" | "SUPPORT";

type FacilityCatalog = {
  id: string;
  code: string;
  name: string;
  category: FacilityCategory;
  isActive: boolean;
  sortOrder: number;
};

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type BranchFacility = {
  id: string;
  branchId: string;
  facilityId: string;
  enabledAt: string;
  facility: Pick<FacilityCatalog, "id" | "code" | "name" | "category">;
};

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

/* ----------------------------- UI Helpers ----------------------------- */

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

function fmtDateTime(value?: string | Date | null) {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const ALL_FACILITIES = "__ALL__";

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

/* ----------------------------- Page ----------------------------- */

export default function InfrastructureDepartmentsPage() {
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
  const [branchId, setBranchId] = React.useState<string | undefined>();

  const [branchFacilities, setBranchFacilities] = React.useState<BranchFacility[]>([]);
  const [facilityId, setFacilityId] = React.useState("");

  const [rows, setRows] = React.useState<DepartmentRow[]>([]);

  const [q, setQ] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [activeTab, setActiveTab] = React.useState<"departments" | "guide">("departments");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DepartmentRow | null>(null);
  const [fFacilityId, setFFacilityId] = React.useState("");
  const [fCode, setFCode] = React.useState("");
  const [fName, setFName] = React.useState("");
  const [fActive, setFActive] = React.useState(true);

  const facilityOptions = React.useMemo(
    () =>
      branchFacilities.map((bf) => ({
        id: bf.facilityId,
        code: bf.facility.code,
        name: bf.facility.name,
        category: bf.facility.category,
      })),
    [branchFacilities],
  );

  const selectedFacility = React.useMemo(
    () => facilityOptions.find((f) => f.id === facilityId) ?? null,
    [facilityOptions, facilityId],
  );

  const noFacilitiesEnabled = !!branchId && facilityOptions.length === 0;

  const activeCount = rows.filter((r) => r.isActive).length;
  const inactiveCount = rows.length - activeCount;

  async function loadBranches() {
    const data = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(data);

    const stored = qpBranchId ?? (effectiveBranchId || null) ?? data[0]?.id;
    if (stored) setBranchId(stored);
  }

  async function loadEnabledFacilities(bid: string, currentFacilityId?: string) {
    const data = (await apiFetch<BranchFacility[]>(`/api/branches/${encodeURIComponent(bid)}/facilities`)) || [];
    setBranchFacilities(data);

    const ids = data.map((bf) => bf.facilityId);
    const nextFacilityId = currentFacilityId && ids.includes(currentFacilityId) ? currentFacilityId : "";
    setFacilityId(nextFacilityId);
    return nextFacilityId;
  }

  async function loadDepartments(args: {
    branchId: string;
    facilityId?: string;
    includeInactive: boolean;
    q: string;
    statusFilter: "all" | "active" | "inactive";
  }) {
    setLoading(true);
    setErr(null);

    try {
      const params = new URLSearchParams();
      params.set("branchId", args.branchId);
      if (args.facilityId) params.set("facilityId", args.facilityId);
      if (args.includeInactive) params.set("includeInactive", "true");

      const qq = args.q.trim();
      if (qq) params.set("q", qq);

      const data = (await apiFetch<DepartmentRow[]>(`/api/departments?${params.toString()}`)) || [];
      let filtered = data;
      if (args.statusFilter === "active") filtered = data.filter((d) => d.isActive);
      if (args.statusFilter === "inactive") filtered = data.filter((d) => !d.isActive);

      setRows(filtered);
    } catch (e) {
      setRows([]);
      setErr(errorMessage(e, "Failed to load departments"));
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!branchId) return;

    setBusy(true);
    setErr(null);
    try {
      const nextFacilityId = await loadEnabledFacilities(branchId, facilityId);
      await loadDepartments({
        branchId,
        facilityId: nextFacilityId || undefined,
        includeInactive,
        q,
        statusFilter,
      });
    } catch (e) {
      const message = errorMessage(e, "Failed to refresh departments");
      setErr(message);
      toast({ title: "Refresh failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFFacilityId(facilityId || facilityOptions[0]?.id || "");
    setFCode("");
    setFName("");
    setFActive(true);
    setModalOpen(true);
  }

  function openEdit(row: DepartmentRow) {
    setEditing(row);
    setFFacilityId(row.facilityId);
    setFCode(row.code);
    setFName(row.name);
    setFActive(row.isActive);
    setModalOpen(true);
  }

  async function saveDepartment() {
    if (!branchId) {
      toast({ title: "Branch is required", description: "Select a branch first.", variant: "destructive" });
      return;
    }

    if (!fFacilityId) {
      toast({ title: "Facility is required", description: "Select an enabled facility.", variant: "destructive" });
      return;
    }

    const code = fCode.trim().toUpperCase();
    const name = fName.trim();

    if (!code) {
      toast({ title: "Code is required", description: "Enter a department code.", variant: "destructive" });
      return;
    }

    if (!name) {
      toast({ title: "Name is required", description: "Enter a department name.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        await apiFetch(`/api/departments/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, isActive: fActive }),
        });
      } else {
        await apiFetch("/api/departments", {
          method: "POST",
          body: JSON.stringify({ branchId, facilityId: fFacilityId, code, name, isActive: fActive }),
        });
      }

      toast({ title: editing ? "Department updated" : "Department created" });
      setModalOpen(false);
      setEditing(null);

      if (!editing && fFacilityId && fFacilityId !== facilityId) {
        setFacilityId(fFacilityId);
        return;
      }

      if (branchId && facilityId) {
        await loadDepartments({ branchId, facilityId, includeInactive, q, statusFilter });
      }
    } catch (e) {
      const message = errorMessage(e, "Failed to save department");
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: DepartmentRow) {
    if (!branchId) return;

    setBusy(true);
    try {
      await apiFetch(`/api/departments/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !row.isActive }),
      });

      toast({ title: row.isActive ? "Department deactivated" : "Department activated" });
      await loadDepartments({ branchId, facilityId, includeInactive, q, statusFilter });
    } catch (e) {
      const message = errorMessage(e, "Failed to update department");
      toast({ title: "Update failed", description: message, variant: "destructive" });
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
      setBranchFacilities([]);
      setFacilityId("");
      setRows([]);
      return;
    }

    if (isGlobalScope) setActiveBranchId(branchId || null);
setFacilityId("");
    setRows([]);

    setLoading(true);
    void loadEnabledFacilities(branchId, "")
      .catch((e) => {
        setErr(errorMessage(e, "Failed to load facilities"));
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  React.useEffect(() => {
    if (!includeInactive && statusFilter !== "all") setStatusFilter("all");
  }, [includeInactive, statusFilter]);

  React.useEffect(() => {
    if (!branchId) return;
    const handle = setTimeout(() => {
      void loadDepartments({
        branchId,
        facilityId: facilityId || undefined,
        includeInactive,
        q,
        statusFilter,
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [branchId, facilityId, includeInactive, q, statusFilter]);

  return (
    <AppShell title="Infrastructure - Departments">
      <RequirePerm perm="DEPARTMENT_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Building2 className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Departments</div>
              <div className="mt-1 text-sm text-zc-muted">
                Create departments under enabled facilities. Facility / Department linking is enforced by backend.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => void refresh()}
              disabled={loading || busy || !branchId}
            >
              <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
            <Button
              variant="primary"
              className="px-5 gap-2"
              onClick={openCreate}
              disabled={loading || busy || !branchId || noFacilitiesEnabled}
            >
              <Plus className="h-4 w-4" />
              New Department
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load departments</CardTitle>
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
              Select a branch and enabled facility, then create and manage departments.
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
              </div>

              <div className="grid gap-2">
                <Label>Facility (enabled)</Label>
                <Select value={facilityId} onValueChange={setFacilityId} disabled={!branchId || noFacilitiesEnabled}>
                  <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                    <SelectValue placeholder={noFacilitiesEnabled ? "Enable facilities first" : "Select facility..."} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    {facilityOptions.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} <span className="font-mono text-xs text-zc-muted">({f.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {noFacilitiesEnabled ? (
                  <div className="text-xs text-amber-700 dark:text-amber-200">
                    No facilities enabled for this branch. Enable them in Infrastructure - Facilities.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Departments</div>
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
                    <div className="text-xs text-zc-muted">Disabled departments</div>
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
              {selectedFacility ? <Badge variant="secondary">Facility: {selectedFacility.code}</Badge> : null}
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
                <CardTitle className="text-base">Department Workspace</CardTitle>
                <CardDescription>Create and manage departments under enabled facilities.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "departments" | "guide")}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="departments"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    Departments
                  </TabsTrigger>
                  <TabsTrigger
                    value="guide"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    Guide
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <Tabs value={activeTab}>
              <TabsContent value="departments" className="mt-0">
                <div className="rounded-xl border border-zc-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[220px]">Facility</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="w-[180px]">Updated</TableHead>
                        <TableHead className="w-[72px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={6}>
                              <Skeleton className="h-10 w-full" />
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
                      ) : noFacilitiesEnabled ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div className="flex items-center justify-center gap-2 py-10 text-sm text-amber-700 dark:text-amber-200">
                              <AlertTriangle className="h-4 w-4" />
                              No facilities enabled for this branch. Enable facilities in Infrastructure - Facilities.
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                              <AlertTriangle className="h-4 w-4 text-zc-warn" />
                              No departments found.
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((d) => (
                          <TableRow key={d.id} className={d.isActive ? "" : "opacity-70"}>
                            <TableCell className="font-mono text-xs font-semibold text-zc-text">{d.code}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-zc-text">{d.name}</span>
                                <span className="text-xs text-zc-muted">{d.facility?.category || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-zc-muted">
                              {d.facility ? `${d.facility.code} - ${d.facility.name}` : "-"}
                            </TableCell>
                            <TableCell>
                              {d.isActive ? <Badge variant="ok">ACTIVE</Badge> : <Badge variant="secondary">INACTIVE</Badge>}
                            </TableCell>
                            <TableCell className="text-sm text-zc-muted">{fmtDateTime(d.updatedAt)}</TableCell>
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
                                  <DropdownMenuItem onClick={() => openEdit(d)}>
                                    <Wrench className="mr-2 h-4 w-4" />
                                    Edit department
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void toggleActive(d)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {d.isActive ? "Deactivate" : "Activate"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  <div className="flex flex-col gap-3 border-t border-zc-border p-4 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-zc-muted">
                      Total: <span className="font-semibold text-zc-text">{rows.length}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <Link href="/infrastructure/facilities">Facilities</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="guide" className="mt-0">
                <Card className="border-zc-border">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">How to use Departments</CardTitle>
                    <CardDescription>Departments are scoped to enabled facilities in a branch.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">1</Badge> Enable facilities
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Facilities must be enabled per branch before departments can be created.
                        </div>
                      </div>
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">2</Badge> Create departments
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Codes are unique per facility. Use clear, short names.
                        </div>
                      </div>
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">3</Badge> Keep them active
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Deactivate instead of delete to preserve audit history.
                        </div>
                      </div>
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">4</Badge> Use consistent codes
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Short, mnemonic codes make searching and mapping easier.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Dialog Box (replaces modal) */}
      <Dialog open={modalOpen} onOpenChange={(v) => !busy && setModalOpen(v)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Department" : "New Department"}</DialogTitle>
            <DialogDescription>
              Departments are branch-scoped and must be linked to an enabled facility.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Facility</div>
              <Select value={fFacilityId} onValueChange={setFFacilityId} disabled={!!editing}>
                <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-panel/20">
                  <SelectValue placeholder="Select facility..." />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {facilityOptions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} <span className="font-mono text-xs text-zc-muted">({f.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editing ? <div className="text-xs text-zc-muted">Facility cannot be changed after creation.</div> : null}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Code</div>
                <Input
                  className="h-11 rounded-xl border-zc-border bg-zc-panel/20 font-mono"
                  placeholder="e.g. CARDIO"
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
            <Button variant="outline" className="rounded-xl" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="rounded-xl"
              onClick={() => void saveDepartment()}
              disabled={busy || !branchId}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </RequirePerm>
</AppShell>
  );
}
