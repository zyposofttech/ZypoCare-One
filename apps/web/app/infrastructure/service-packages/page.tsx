"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";

import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Filter,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UploadCloud,
  Wrench,
  Trash2,
  Eye,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city?: string };

type PackageStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "RETIRED";

type ChargeMasterMini = {
  id: string;
  code: string;
  name: string;
  chargeUnit?: string | null;
};

type ServiceItemRow = {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  unit?: string | null;
  isOrderable?: boolean;
  isActive?: boolean;
};

type ServicePackageComponentRow = {
  id: string;
  packageId: string;

  componentType: "SERVICE_ITEM" | "DIAGNOSTIC_ITEM" | "CHARGE_MASTER_ITEM";

  serviceItemId?: string | null;
  diagnosticItemId?: string | null;
  chargeMasterItemId?: string | null;

  serviceItem?: ServiceItemRow | null;
  chargeMaster?: ChargeMasterMini | null;

  quantity: number;
  isIncluded: boolean;
  condition?: any;
  sortOrder: number;
  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
};

type ServicePackageRow = {
  id: string;
  branchId: string;

  code: string;
  name: string;
  description?: string | null;

  status: PackageStatus;
  version: number;

  effectiveFrom?: string;
  effectiveTo?: string | null;

  components?: ServicePackageComponentRow[];

  createdAt?: string;
  updatedAt?: string;
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

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

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
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

function statusBadge(status: PackageStatus) {
  switch (status) {
    case "PUBLISHED":
      return <Badge variant="ok">PUBLISHED</Badge>;
    case "APPROVED":
      return <Badge variant="secondary">APPROVED</Badge>;
    case "IN_REVIEW":
      return <Badge variant="warning">IN REVIEW</Badge>;
    case "RETIRED":
      return <Badge variant="destructive">RETIRED</Badge>;
    default:
      return <Badge variant="secondary">DRAFT</Badge>;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function SuperAdminServicePackagesPage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";


  const [activeTab, setActiveTab] = React.useState<"packages" | "guide">("packages");
  const [showFilters, setShowFilters] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [rows, setRows] = React.useState<ServicePackageRow[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [selected, setSelected] = React.useState<ServicePackageRow | null>(null);

  // filters
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<PackageStatus | "all">("all");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  // modals/drawers
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<ServicePackageRow | null>(null);

  const [itemsOpen, setItemsOpen] = React.useState(false);

  const mustSelectBranch = !branchId;

  async function loadBranches(): Promise<string | null> {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = (effectiveBranchId || null);
    const first = list[0]?.id || null;
    const next = (stored && list.some((b) => b.id === stored) ? stored : null) || first;

    if (next) if (isGlobalScope) setActiveBranchId(next || null);
setBranchId(next || "");
    return next;
  }

  async function loadPackages(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const list =
        (await apiFetch<ServicePackageRow[]>(
          `/api/infrastructure/service-packages?${buildQS({
            branchId,
            q: q.trim() || undefined,
            status: status !== "all" ? status : undefined,
          })}`,
        )) || [];

      // Client-side toggle for RETIRED visibility (backend list endpoint doesn't support includeInactive)
      const visible = includeInactive ? list : list.filter((r) => r.status !== "RETIRED");

      setRows(visible);

      const nextSelected = selectedId && visible.some((x) => x.id === selectedId) ? selectedId : visible[0]?.id || "";
      setSelectedId(nextSelected);
      setSelected(nextSelected ? visible.find((x) => x.id === nextSelected) || null : null);

      if (showToast) toast({ title: "Packages refreshed", description: "Loaded latest packages for this branch." });
    } catch (e: any) {
      const msg = e?.message || "Failed to load service packages";
      setErr(msg);
      setRows([]);
      setSelectedId("");
      setSelected(null);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll(showToast = false) {
    setLoading(true);
    setErr(null);
    try {
      const bid = branchId || (await loadBranches());
      if (!bid) {
        setLoading(false);
        return;
      }
      await loadPackages(false);
      if (showToast) toast({ title: "Ready", description: "Branch scope and packages are up to date." });
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
    setSelectedId("");
    setSelected(null);
    void loadPackages(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, includeInactive]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadPackages(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  React.useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    setSelected(rows.find((x) => x.id === selectedId) || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, rows]);

  async function onBranchChange(nextId: string) {
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
setQ("");
    setStatus("all");
    setIncludeInactive(false);
    setSelectedId("");
    setSelected(null);

    setErr(null);
    setLoading(true);
    try {
      await loadPackages(false);
      toast({ title: "Branch scope changed", description: "Loaded packages for selected branch." });
    } catch (e: any) {
      toast({ title: "Load failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  const stats = React.useMemo(() => {
    const total = rows.length;
    const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    const published = byStatus.PUBLISHED || 0;
    const draft = byStatus.DRAFT || 0;
    const review = byStatus.IN_REVIEW || 0;
    const approved = byStatus.APPROVED || 0;
    const retired = byStatus.RETIRED || 0;
    const totalItems = rows.reduce((n, r) => n + ((r.components || []).filter((c) => c.isActive !== false).length || 0), 0);
    return { total, published, draft, review, approved, retired, totalItems };
  }, [rows]);

  function openCreate() {
    setEditMode("create");
    setEditing(null);
    setEditOpen(true);
  }

  function openEdit(row: ServicePackageRow) {
    setEditMode("edit");
    setEditing(row);
    setEditOpen(true);
  }

  async function workflow(row: ServicePackageRow, action: "submit" | "approve" | "publish" | "retire") {
    if (!row?.id) return;
    const note = window.prompt(`Optional note for ${action.toUpperCase()} (leave blank for none):`) || "";
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/service-packages/${encodeURIComponent(row.id)}/workflow/${action}`, {
        method: "POST",
        body: JSON.stringify({ note: note.trim() ? note.trim() : undefined }),
      });
      toast({ title: "Workflow updated", description: `Action ${action.toUpperCase()} applied.` });
      await loadPackages(false);
    } catch (e: any) {
      toast({ title: "Workflow failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure • Service Packages">
      <RequirePerm perm="INFRA_SERVICE_PACKAGE_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Package className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Service Packages</div>
              <div className="mt-1 text-sm text-zc-muted">Curate package details and add components inside each package.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => refreshAll(true)} disabled={loading || busy}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {/* <Button variant="outline" asChild className="px-5 gap-2">
              <Link href="/infrastructure/golive">
                <ShieldCheck className="h-4 w-4" />
                GoLive
              </Link>
            </Button> */}

            <Button variant="outline" asChild className="px-5 gap-2">
              <Link href="/infrastructure/fixit">
                <Wrench className="h-4 w-4" />
                FixIt Inbox
              </Link>
            </Button>

            <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={mustSelectBranch}>
              <Plus className="h-4 w-4" />
              New Package
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load packages</CardTitle>
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
              Pick a branch → create package → add service items as components → publish. Billing & GoLive validations rely on each service’s charge mapping.
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
                  {branches
                    .filter((b) => b.id)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.code} - {b.name} {b.city ? `(${b.city})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Packages</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Published</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.published}</div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Total Package Items</div>
                <div className="mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-300">{stats.totalItems}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code/name…"
                  className="pl-10"
                  disabled={mustSelectBranch}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={mustSelectBranch} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">Include inactive</div>
                    <div className="text-xs text-zc-muted">Usually keep off</div>
                  </div>
                </div>

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
                    <Select value={status} onValueChange={(v) => setStatus(v as any)} disabled={mustSelectBranch}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="DRAFT">DRAFT</SelectItem>
                        <SelectItem value="IN_REVIEW">IN_REVIEW</SelectItem>
                        <SelectItem value="APPROVED">APPROVED</SelectItem>
                        <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                        <SelectItem value="RETIRED">RETIRED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Branch scoped</Badge>
              <Badge variant="secondary">Draft: {stats.draft}</Badge>
              <Badge variant="warning">In review: {stats.review}</Badge>
              <Badge variant="secondary">Approved: {stats.approved}</Badge>
              <Badge variant="ok">Published: {stats.published}</Badge>
              <Badge variant="destructive">Retired: {stats.retired}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Workspace */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Package Workspace</CardTitle>
                <CardDescription>Create packages and curate service components inside each package.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="packages"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Packages
                  </TabsTrigger>
                  <TabsTrigger
                    value="guide"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Guide
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <Tabs value={activeTab}>
              <TabsContent value="packages" className="mt-0">
                <div className="rounded-xl border border-zc-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead className="w-[180px]">Effective From</TableHead>
                        <TableHead className="w-[120px]">Components</TableHead>
                        <TableHead className="w-[72px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={6}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div className="flex items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                              <ClipboardList className="h-4 w-4" />
                              No packages found. Create one to begin.
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-xs">
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-zc-text">{r.code}</span>
                                <span className="text-[11px] text-zc-muted">v{r.version ?? 1}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-zc-text">{r.name}</span>
                                <span className="text-xs text-zc-muted">{r.description?.trim() ? r.description : "—"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{statusBadge(r.status)}</TableCell>
                            <TableCell className="text-sm text-zc-muted">{fmtDateTime(r.effectiveFrom)}</TableCell>
                            <TableCell className="text-sm text-zc-muted">
                              {(r.components || []).filter((c) => c.isActive !== false).length}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[240px]">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelected(r);
                                      setSelectedId(r.id);
                                      setItemsOpen(true);
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Open
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEdit(r)}>
                                    <Wrench className="mr-2 h-4 w-4" />
                                    Edit package
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelected(r);
                                      setSelectedId(r.id);
                                      setItemsOpen(true);
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Manage components
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => workflow(r, "submit")}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Submit for review
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => workflow(r, "approve")}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => workflow(r, "publish")}>
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    Publish
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => workflow(r, "retire")}>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Retire
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
                        <Link href="/infrastructure/charge-master">
                          Charge Master <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <Link href="/infrastructure/tariff-plans">
                          Tariff Plans <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="guide" className="mt-0">
                <Card className="border-zc-border">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">How to use Service Packages</CardTitle>
                    <CardDescription>Packages are governed bundles: they group orderable services into a single package.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">1</Badge> Create package (branch scoped)
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Define package code/name and description. Package starts as <span className="font-semibold">DRAFT</span>; add
                          components, then publish via workflow.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">2</Badge> Add service items
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Each package component references a <span className="font-semibold">Service Item</span>. Billing is derived from
                          that service’s Charge Mapping.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">3</Badge> Publish (version snapshot)
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Publishing locks the version. Future edits should create a new version with effectiveFrom/To closing.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">4</Badge> Billing readiness
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          GoLive validations should flag: missing tariff rates, tax inactive, charge unit mismatches, and missing package pricing
                          rules.
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                        <AlertTriangle className="h-4 w-4 text-zc-warn" />
                        Practical tip
                      </div>
                      <div className="mt-1 text-sm text-zc-muted">
                        Keep package items ordered (sortOrder) and mark optional items explicitly. Use overrides JSON for future rules (caps,
                        constraints).
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit modal */}
      <PackageEditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode={editMode}
        branchId={branchId}
        editing={editing}
        onSaved={async () => {
          toast({ title: "Saved", description: "Package saved successfully." });
          await loadPackages(false);
        }}
      />

      {/* Items drawer */}
      <PackageItemsDrawer
        open={itemsOpen}
        onOpenChange={setItemsOpen}
        branchId={branchId}
        pkg={selected}
        onSaved={async () => {
          toast({ title: "Updated", description: "Package items updated." });
          await loadPackages(false);
        }}
      />
          </RequirePerm>
</AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Create/Edit Modal                              */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */

function PackageEditModal({
  open,
  onOpenChange,
  mode,
  branchId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  branchId: string;
  editing: ServicePackageRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState<{ code: string; name: string; description: string }>({
    code: "",
    name: "",
    description: "",
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editing) {
      setForm({
        code: editing.code || "",
        name: editing.name || "",
        description: editing.description || "",
      });
    } else {
      setForm({ code: "", name: "", description: "" });
    }
  }, [open, mode, editing]);

  function patch(p: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    if (!branchId) return;

    const payload: any = {
      code: String(form.code || "").trim(),
      name: String(form.name || "").trim(),
      description: form.description?.trim() ? String(form.description).trim() : null,
    };

    if (!payload.code || !payload.name) {
      toast({ title: "Missing fields", description: "Code and Name are required." });
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        await apiFetch(`/api/infrastructure/service-packages?${buildQS({ branchId })}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!editing?.id) throw new Error("Invalid editing row");
        await apiFetch(`/api/infrastructure/service-packages/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }

      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "New Service Package" : "Edit Service Package"}
          </DialogTitle>
          <DialogDescription>
            Packages are branch scoped and governed by workflow actions (Submit → Approve → Publish → Retire).
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="px-6 pb-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => patch({ code: e.target.value })} placeholder="e.g., WELLNESS-BASIC" />
              <div className="text-xs text-zc-muted min-h-[16px]">Unique within branch.</div>
            </div>

            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g., Basic Wellness Package" />
              <div className="text-xs text-zc-muted min-h-[16px] invisible" aria-hidden="true">
                Placeholder helper
              </div>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={(e) => patch({ description: e.target.value })} placeholder="What does this package include?" />
              <div className="text-xs text-zc-muted min-h-[16px]">Keep it short — visible in ordering UI.</div>
            </div>

            {mode === "edit" && editing ? (
              <div className="md:col-span-2 grid gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Status: {editing.status}</Badge>
                  <Badge variant="secondary">Version: v{editing.version ?? 1}</Badge>
                  <Badge variant="secondary">Effective: {fmtDateTime(editing.effectiveFrom)}</Badge>
                </div>
                <div className="text-xs text-zc-muted">
                  To move status forward/backward, use the workflow actions from the package list (Submit/Approve/Publish/Retire).
                </div>
              </div>
            ) : (
              <div className="md:col-span-2 grid gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                  <Badge variant="secondary">DRAFT</Badge>
                  <span>Package starts in draft.</span>
                </div>
                <div className="text-xs text-zc-muted">After creation, add components and then publish via workflow.</div>
              </div>
            )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Items Drawer                                  */
/* -------------------------------------------------------------------------- */

function PackageItemsDrawer({
  open,
  onOpenChange,
  branchId,
  pkg,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  pkg: ServicePackageRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<ServicePackageRow | null>(null);

  // component picker (SERVICE_ITEM)
  const [svcQ, setSvcQ] = React.useState("");
  const [svcLoading, setSvcLoading] = React.useState(false);
  const [svcRows, setSvcRows] = React.useState<ServiceItemRow[]>([]);
  const [pickedSvc, setPickedSvc] = React.useState<ServiceItemRow | null>(null);

  // component fields
  const [qty, setQty] = React.useState<string>("1");
  const [isIncluded, setIsIncluded] = React.useState(true);
  const [rulesText, setRulesText] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setDetail(null);
    setSvcQ("");
    setSvcRows([]);
    setPickedSvc(null);
    setQty("1");
    setIsIncluded(true);
    setRulesText("");
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pkg?.id]);

  async function loadDetail() {
    if (!pkg?.id) return;
    setLoading(true);
    try {
      const d = await apiFetch<ServicePackageRow>(`/api/infrastructure/service-packages/${encodeURIComponent(pkg.id)}`);
      setDetail(d || null);
    } catch (e: any) {
      toast({ title: "Failed to load package", description: e?.message || "Request failed", variant: "destructive" as any });
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  async function searchServices(query: string) {
    if (!branchId) return;
    setSvcLoading(true);
    try {
      const list =
        (await apiFetch<ServiceItemRow[]>(
          `/api/infrastructure/services?${buildQS({
            branchId,
            q: query.trim() || undefined,
            includeInactive: "false",
          })}`,
        )) || [];

      setSvcRows(list.slice(0, 80));
    } catch (e: any) {
      toast({ title: "Service search failed", description: e?.message || "Request failed", variant: "destructive" as any });
      setSvcRows([]);
    } finally {
      setSvcLoading(false);
    }
  }

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void searchServices(svcQ), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcQ, open]);

  function parseRules(): any {
    const t = (rulesText || "").trim();
    if (!t) return undefined;
    try {
      return JSON.parse(t);
    } catch {
      throw new Error("Rules must be valid JSON.");
    }
  }

  async function upsertComponent() {
    if (!pkg?.id) return;
    if (!pickedSvc?.id) {
      toast({ title: "Pick a Service Item", description: "Select a service item to add to this package." });
      return;
    }

    let rules: any = undefined;
    try {
      rules = parseRules();
    } catch (e: any) {
      toast({ title: "Invalid rules JSON", description: e?.message || "Fix JSON and try again." });
      return;
    }

    const payload: any = {
      serviceItemId: pickedSvc.id,
      quantity: Math.max(1, Number(qty) || 1),
      isIncluded: Boolean(isIncluded),
      rules,
    };

    setLoading(true);
    try {
      await apiFetch(`/api/infrastructure/service-packages/${encodeURIComponent(pkg.id)}/components`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast({ title: "Component saved", description: "Service item added/updated in package." });

      setPickedSvc(null);
      setQty("1");
      setIsIncluded(true);
      setRulesText("");

      await loadDetail();
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function removeComponent(serviceItemId: string) {
    if (!pkg?.id) return;
    const ok = window.confirm("Remove this component from the package?");
    if (!ok) return;

    setLoading(true);
    try {
      await apiFetch(
        `/api/infrastructure/service-packages/${encodeURIComponent(pkg.id)}/components/${encodeURIComponent(serviceItemId)}`,
        { method: "DELETE" },
      );
      toast({ title: "Removed", description: "Component removed from package." });
      await loadDetail();
      onSaved();
    } catch (e: any) {
      toast({ title: "Remove failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  const components = (detail?.components || []).filter((c) => c.isActive !== false);
  const svcComponents = components.filter((c) => c.componentType === "SERVICE_ITEM" && !!c.serviceItemId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Manage Components • {pkg?.code || ""}
          </DialogTitle>
          <DialogDescription>
            Add service items as package components. Billing is derived from each service’s charge mapping.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="px-6 pb-6 grid gap-6">
          {/* Add/Update */}
          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zc-text">Add / Update Component</div>
                <div className="text-xs text-zc-muted">Current backend supports SERVICE_ITEM components.</div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link href="/infrastructure/service-items">
                  Service Items <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-2">
              <Label>Find Service Item</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input value={svcQ} onChange={(e) => setSvcQ(e.target.value)} placeholder="Search by code/name…" className="pl-10" />
              </div>

              <div className="rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[180px]">Category</TableHead>
                      <TableHead className="w-[120px]">Pick</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {svcLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : svcRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <div className="flex items-center justify-center gap-2 py-8 text-sm text-zc-muted">
                            <AlertTriangle className="h-4 w-4 text-zc-warn" />
                            No services found.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      svcRows.map((s) => {
                        const picked = pickedSvc?.id === s.id;
                        return (
                          <TableRow key={s.id} className={picked ? "bg-zc-panel/30" : ""}>
                            <TableCell className="font-mono text-xs">
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-zc-text">{s.code}</span>
                                <span className="text-[11px] text-zc-muted">{String(s.id).slice(0, 8)}…</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-zc-text">{s.name}</span>
                                <span className="text-xs text-zc-muted">{s.isActive === false ? "Inactive" : "Active"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{s.category || "—"}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant={picked ? "primary" : "outline"} size="sm" onClick={() => setPickedSvc(picked ? null : s)}>
                                {picked ? "Picked" : "Pick"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="text-xs text-zc-muted">Tip: ensure the service item is charge-mapped before publishing package.</div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="1" />
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2 md:col-span-2">
                <Switch checked={isIncluded} onCheckedChange={setIsIncluded} />
                <div className="text-sm">
                  <div className="font-semibold text-zc-text">{isIncluded ? "Included" : "Not included"}</div>
                  <div className="text-xs text-zc-muted">Controls whether component is part of package</div>
                </div>
              </div>

              <div className="grid gap-2 md:col-span-3">
                <Label>Rules (JSON, optional)</Label>
                <Textarea
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  placeholder='e.g., {"maxQty": 1, "note": "Only once per visit"}'
                  className="min-h-[42px]"
                />
                <div className="text-xs text-zc-muted">Stored as component.condition in backend.</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-zc-muted">
                Selected: <span className="font-mono font-semibold text-zc-text">{pickedSvc ? pickedSvc.code : "—"}</span>
              </div>
              <Button onClick={upsertComponent} disabled={loading || !pickedSvc}>
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Save Component
              </Button>
            </div>
          </div>

          {/* Components list */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zc-text">Package Components</div>
                <div className="text-xs text-zc-muted">
                  Total: <span className="font-semibold text-zc-text">{svcComponents.length}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={loadDetail} disabled={loading}>
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Reload
              </Button>
            </div>

            <div className="rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Service</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[90px]">Qty</TableHead>
                    <TableHead className="w-[110px]">Included</TableHead>
                    <TableHead className="w-[120px]">Rules</TableHead>
                    <TableHead className="w-[160px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : svcComponents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                          <AlertTriangle className="h-4 w-4 text-zc-warn" />
                          No components yet.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    svcComponents.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-zc-text">{c.serviceItem?.code || c.serviceItemId}</span>
                            <span className="text-[11px] text-zc-muted">{String(c.id).slice(0, 8)}…</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-zc-muted">{c.serviceItem?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-zc-muted">{c.quantity ?? 1}</TableCell>
                        <TableCell>{c.isIncluded ? <Badge variant="ok">YES</Badge> : <Badge variant="secondary">NO</Badge>}</TableCell>
                        <TableCell>{c.condition ? <Badge variant="warning">YES</Badge> : <Badge variant="secondary">NO</Badge>}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          {c.serviceItem ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setPickedSvc(c.serviceItem || null);
                                setQty(String(c.quantity ?? 1));
                                setIsIncluded(Boolean(c.isIncluded));
                                setRulesText(c.condition ? JSON.stringify(c.condition, null, 2) : "");
                              }}
                            >
                              <Wrench className="h-4 w-4" />
                              Edit
                            </Button>
                          ) : null}
                          {c.serviceItemId ? (
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => removeComponent(c.serviceItemId as string)}>
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="text-xs text-zc-muted">
              Note: use Service ↔ Charge Mapping to ensure every service in the package has a valid billing mapping.
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
