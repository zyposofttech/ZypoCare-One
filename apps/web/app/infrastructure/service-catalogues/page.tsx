"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
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

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
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
  Eye,
  Trash2,
  CheckCircle2,
  Send,
  UploadCloud,
  Archive,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };
type DepartmentRow = { id: string; code: string; name: string };

type CatalogueStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "RETIRED";
type CatalogueChannel = "DEFAULT" | "QUICK_ORDER" | "ORDER_SET" | "OT_PICKLIST";
type CatalogueScope = "ENTERPRISE" | "BRANCH";
type CareContext = "OPD" | "IPD" | "ER" | "OT" | "DAYCARE" | "TELECONSULT" | "HOMECARE";

type ServiceItemRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive?: boolean;
  isBillable?: boolean;
  lifecycleStatus?: string | null; // typically PUBLISHED
  chargeUnit?: string | null;
  type?: string | null;
};

type ServiceCatalogueItemRow = {
  id: string;
  catalogueId: string;
  serviceItemId: string;
  sortOrder: number;
  isVisible: boolean;
  overrides?: any;
  serviceItem?: ServiceItemRow;
  createdAt?: string;
  updatedAt?: string;
};

type ServiceCatalogueRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  description?: string | null;

  scope: CatalogueScope;
  channel: CatalogueChannel;

  departmentId?: string | null;
  department?: DepartmentRow | null;

  context?: CareContext | null;
  payerGroup?: string | null;

  status: CatalogueStatus;
  version: number;

  effectiveFrom?: string;
  effectiveTo?: string | null;

  createdAt?: string;
  updatedAt?: string;

  items?: ServiceCatalogueItemRow[];
};

type CatalogueVersionRow = {
  id: string;
  catalogueId: string;
  version: number;
  status: CatalogueStatus;
  snapshot: any;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt?: string;
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

function statusBadge(status: CatalogueStatus) {
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

function ModalHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
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

export default function SuperAdminServiceCataloguesPage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [activeTab, setActiveTab] = React.useState<"catalogues" | "guide">("catalogues");
  const [showFilters, setShowFilters] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "service-catalogues",
    enabled: !!branchId,
  });

  const [departments, setDepartments] = React.useState<DepartmentRow[]>([]);
  const [rows, setRows] = React.useState<ServiceCatalogueRow[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [selected, setSelected] = React.useState<ServiceCatalogueRow | null>(null);

  // filters
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<CatalogueStatus | "all">("all");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  // modals
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<ServiceCatalogueRow | null>(null);

  const [itemsOpen, setItemsOpen] = React.useState(false);

  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [versions, setVersions] = React.useState<CatalogueVersionRow[]>([]);
  const [snapshotOpen, setSnapshotOpen] = React.useState(false);
  const [snapshotPayload, setSnapshotPayload] = React.useState<any>(null);

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

  async function loadDepartments(forBranchId?: string) {
    const bid = forBranchId ?? branchId;
    if (!bid) return;
    try {
      const deps = (await apiFetch<DepartmentRow[]>(
        `/api/departments?${buildQS({ branchId: bid })}`,
      )) || [];
      setDepartments(deps);
    } catch {
      setDepartments([]);
    }
  }

  async function loadCatalogues(showToast = false, forBranchId?: string) {
    const bid = forBranchId ?? branchId;
    if (!bid) return;
    setErr(null);
    setLoading(true);
    try {
      const res = (await apiFetch<ServiceCatalogueRow[]>(
        `/api/infrastructure/service-catalogues?${buildQS({
          branchId: bid,
          q: q.trim() || undefined,
          status: status !== "all" ? status : undefined,
          includeInactive: includeInactive ? "true" : undefined,
        })}`,
      )) as any;

      const list: ServiceCatalogueRow[] = Array.isArray(res) ? res : (res?.rows || []);
      setRows(list);

      // auto-pick selected
      const nextSelected = selectedId && list.some((x) => x.id === selectedId) ? selectedId : list[0]?.id || "";
      setSelectedId(nextSelected);
      setSelected(nextSelected ? list.find((x) => x.id === nextSelected) || null : null);

      if (showToast) toast({ title: "Catalogues refreshed", description: "Loaded latest catalogues for this branch." });
    } catch (e: any) {
      const msg = e?.message || "Failed to load service catalogues";
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
      await Promise.all([loadDepartments(bid), loadCatalogues(false, bid)]);
      if (showToast) toast({ title: "Ready", description: "Branch scope and catalogues are up to date." });
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
    void loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    if (!branchId) return;
    setSelectedId("");
    setSelected(null);
    void loadCatalogues(false, branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, includeInactive]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadCatalogues(false, branchId), 250);
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
      await Promise.all([loadDepartments(nextId), loadCatalogues(false, nextId)]);
      toast({ title: "Branch scope changed", description: "Loaded catalogues for selected branch." });
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

    const totalItems = rows.reduce((n, r) => n + (r.items?.length || 0), 0);
    return { total, published, draft, review, approved, retired, totalItems };
  }, [rows]);

  function openCreate() {
    setEditMode("create");
    setEditing(null);
    setEditOpen(true);
  }

  function openEdit(row: ServiceCatalogueRow) {
    setEditMode("edit");
    setEditing(row);
    setEditOpen(true);
  }

  async function openVersions(row: ServiceCatalogueRow) {
    setVersionsOpen(true);
    setVersions([]);
    if (!row?.id) return;
    try {
      const v = (await apiFetch<CatalogueVersionRow[]>(
        `/api/infrastructure/service-catalogues/${encodeURIComponent(row.id)}/versions`,
      )) || [];
      setVersions(v);
    } catch (e: any) {
      toast({ title: "Failed to load versions", description: e?.message || "Request failed", variant: "destructive" as any });
      setVersions([]);
    }
  }

  async function workflow(row: ServiceCatalogueRow, action: "submit" | "approve" | "publish" | "retire") {
    if (!row?.id) return;
    const note = window.prompt(`Optional note for ${action.toUpperCase()} (leave blank for none):`) || "";
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/service-catalogues/${encodeURIComponent(row.id)}/workflow/${action}`, {
        method: "POST",
        body: JSON.stringify({ note: note.trim() ? note.trim() : undefined }),
      });
      toast({ title: "Workflow updated", description: `Action ${action.toUpperCase()} applied.` });
      await loadCatalogues(false);
    } catch (e: any) {
      toast({ title: "Workflow failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure • Service Catalogues">
      <RequirePerm perm="INFRA_SERVICE_CATALOGUE_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ClipboardList className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Service Catalogues</div>
              <div className="mt-1 text-sm text-zc-muted">
                Create branch-specific catalogues and choose which services appear in ordering screens.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
            <Button variant="outline" className="px-5 gap-2 whitespace-nowrap shrink-0" onClick={() => refreshAll(true)} disabled={loading || busy}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {/* <Button variant="outline" asChild className="px-5 gap-2 whitespace-nowrap shrink-0">
              <Link href="/infrastructure/golive">
                <ShieldCheck className="h-4 w-4" />
                GoLive
              </Link>
            </Button> */}

            <Button variant="outline" asChild className="px-5 gap-2 whitespace-nowrap shrink-0">
              <Link href="/infrastructure/fixit">
                <Wrench className="h-4 w-4" />
                FixIt Inbox
              </Link>
            </Button>

            <Button variant="primary" className="px-5 gap-2 whitespace-nowrap shrink-0" onClick={openCreate} disabled={mustSelectBranch}>
              <Plus className="h-4 w-4" />
              New Catalogue
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load catalogues</CardTitle>
                  <CardDescription className="mt-1">{err}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Pick a branch → create catalogue → add service items → publish. Published catalogues are what downstream ordering UIs should consume.
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
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Catalogues</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Published</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.published}</div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Total Catalogue Items</div>
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
                <CardTitle className="text-base">Catalogue Workspace</CardTitle>
                <CardDescription>Create catalogues and curate service items inside each catalogue.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="catalogues"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Catalogues
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
              <TabsContent value="catalogues" className="mt-0">
                <div className="grid gap-4 lg:grid-cols-12">
                  {/* Left list */}
                  <div className="lg:col-span-5">
                    <div className="rounded-xl border border-zc-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[160px]">Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[140px]">Status</TableHead>
                            <TableHead className="w-[56px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell colSpan={4}>
                                  <Skeleton className="h-6 w-full" />
                                </TableCell>
                              </TableRow>
                            ))
                          ) : rows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4}>
                                <div className="flex items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                                  <ClipboardList className="h-4 w-4" />
                                  No catalogues found. Create one to begin.
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            rows.map((r) => (
                              <TableRow
                                key={r.id}
                                className={cn("cursor-pointer", selectedId === r.id ? "bg-zc-panel/30" : "")}
                                onClick={() => setSelectedId(r.id)}
                              >
                                <TableCell className="font-mono text-xs">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-zc-text">{r.code}</span>
                                    <span className="text-[11px] text-zc-muted">v{r.version ?? 1}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-zc-text">{r.name}</span>
                                    <span className="text-xs text-zc-muted">
                                      Items: <span className="font-semibold text-zc-text">{r.items?.length || 0}</span>{" "}
                                      • Channel: <span className="font-semibold text-zc-text">{r.channel}</span>
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>{statusBadge(r.status)}</TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
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
                                        Edit catalogue
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedId(r.id);
                                          setItemsOpen(true);
                                        }}
                                      >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Manage items
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openVersions(r)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        View versions
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
                            <Link href="/infrastructure/service-library">
                              Service Library <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2" asChild>
                            <Link href="/infrastructure/service-mapping">
                              Service Mapping <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right detail */}
                  <div className="lg:col-span-7">
                    {!selected ? (
                      <Card className="border-zc-border">
                        <CardHeader className="py-4">
                          <CardTitle className="text-base">Select a catalogue</CardTitle>
                          <CardDescription>Pick a catalogue from the left list to view details and manage items.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                            Tip: create separate catalogues for <span className="font-semibold">QUICK_ORDER</span> and{" "}
                            <span className="font-semibold">OT_PICKLIST</span> so screens stay clean.
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <CatalogueDetail
                        branchId={branchId}
                        departments={departments}
                        row={selected}
                        busy={busy}
                        onEdit={() => openEdit(selected)}
                        onManageItems={() => setItemsOpen(true)}
                        onVersions={() => openVersions(selected)}
                        onWorkflow={(a) => workflow(selected, a)}
                        onAfterChange={() => loadCatalogues(false)}
                      />
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="guide" className="mt-0">
                <Card className="border-zc-border">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">How to use Service Catalogues</CardTitle>
                    <CardDescription>Keep admins unconfused: catalogues are “what shows up where” for ordering screens.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">1</Badge> Create catalogue (branch scoped)
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Use channels to indicate where it will be consumed: DEFAULT / QUICK_ORDER / ORDER_SET / OT_PICKLIST.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">2</Badge> Add service items
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Add only <span className="font-semibold">billable published</span> services to keep ordering stable.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">3</Badge> Publish (version snapshot)
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Publishing creates a version snapshot. Downstream UIs should prefer <span className="font-semibold">PUBLISHED</span>.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">4</Badge> Billing readiness
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Catalogue only controls visibility. Billing still needs Service ↔ Charge mapping + tariffs (GoLive checks).
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                        <AlertTriangle className="h-4 w-4 text-zc-warn" />
                        Recommended naming convention
                      </div>
                      <div className="mt-1 text-sm text-zc-muted">
                        Code: <span className="font-mono font-semibold text-zc-text">OPD-DEFAULT</span>,{" "}
                        <span className="font-mono font-semibold text-zc-text">OT-PICKLIST</span>,{" "}
                        <span className="font-mono font-semibold text-zc-text">ER-QUICK</span>. Keep it obvious.
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
      <CatalogueEditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode={editMode}
        branchId={branchId}
        departments={departments}
        editing={editing}
        onSaved={async () => {
          toast({ title: "Saved", description: "Catalogue saved successfully." });
          await loadCatalogues(false);
        }}
      />

      {/* Items drawer */}
      <CatalogueItemsDrawer
        open={itemsOpen}
        onOpenChange={setItemsOpen}
        branchId={branchId}
        catalogue={selected}
        onSaved={async () => {
          toast({ title: "Updated", description: "Catalogue items updated." });
          await loadCatalogues(false);
        }}
      />

      {/* Versions modal */}
      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="sm:max-w-[860px]">
          <ModalHeader
            title="Catalogue Versions"
            description="Each publish creates a snapshot. Use this for audit and rollback planning."
            onClose={() => setVersionsOpen(false)}
          />

          <div className="grid gap-4">
            <div className="rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">Version</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[200px]">Effective From</TableHead>
                    <TableHead className="w-[200px]">Effective To</TableHead>
                    <TableHead className="w-[110px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                          <Eye className="h-4 w-4" />
                          No versions found (publish creates versions).
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    versions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs font-semibold">v{v.version}</TableCell>
                        <TableCell>{statusBadge(v.status)}</TableCell>
                        <TableCell className="text-sm text-zc-muted">{fmtDateTime(v.effectiveFrom)}</TableCell>
                        <TableCell className="text-sm text-zc-muted">{fmtDateTime(v.effectiveTo || null)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              setSnapshotPayload(v.snapshot);
                              setSnapshotOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            Snapshot
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setVersionsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Snapshot modal */}
      <Dialog open={snapshotOpen} onOpenChange={setSnapshotOpen}>
        <DialogContent className="sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-zc-accent" />
              Version Snapshot
            </DialogTitle>
            <DialogDescription>Read-only JSON snapshot stored at publish time.</DialogDescription>
          </DialogHeader>

          <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
            <pre className="max-h-[60vh] overflow-auto text-xs leading-relaxed text-zc-text">
              {JSON.stringify(snapshotPayload ?? {}, null, 2)}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapshotOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </RequirePerm>
</AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Detail Right Panel                               */
/* -------------------------------------------------------------------------- */

function CatalogueDetail({
  branchId,
  departments,
  row,
  busy,
  onEdit,
  onManageItems,
  onVersions,
  onWorkflow,
  onAfterChange,
}: {
  branchId: string;
  departments: DepartmentRow[];
  row: ServiceCatalogueRow;
  busy: boolean;
  onEdit: () => void;
  onManageItems: () => void;
  onVersions: () => void;
  onWorkflow: (a: "submit" | "approve" | "publish" | "retire") => void;
  onAfterChange: () => void;
}) {
  const dep = row.departmentId ? departments.find((d) => d.id === row.departmentId) : null;

  return (
    <div className="grid gap-4">
      <Card className="border-zc-border">
        <CardHeader className="py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-base">
                <span className="font-mono">{row.code}</span> • {row.name}
              </CardTitle>
              <CardDescription>
                {statusBadge(row.status)} <span className="mx-2 text-zc-muted">•</span>
                Channel: <span className="font-semibold text-zc-text">{row.channel}</span>{" "}
                <span className="mx-2 text-zc-muted">•</span>
                Scope: <span className="font-semibold text-zc-text">{row.scope}</span>{" "}
                <span className="mx-2 text-zc-muted">•</span>
                Version: <span className="font-semibold text-zc-text">v{row.version ?? 1}</span>
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={onEdit} disabled={busy}>
                <Wrench className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="primary" className="gap-2" onClick={onManageItems} disabled={busy}>
                <Plus className="h-4 w-4" />
                Manage Items
              </Button>
              <Button variant="outline" className="gap-2" onClick={onVersions} disabled={busy}>
                <Eye className="h-4 w-4" />
                Versions
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={busy}>
                    Workflow <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[220px]">
                  <DropdownMenuLabel>Workflow actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onWorkflow("submit")}>
                    <Send className="mr-2 h-4 w-4" />
                    Submit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onWorkflow("approve")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onWorkflow("publish")}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Publish
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onWorkflow("retire")}>
                    <Archive className="mr-2 h-4 w-4" />
                    Retire
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          {row.description ? (
            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">{row.description}</div>
          ) : (
            <div className="rounded-xl border border-dashed border-zc-border bg-zc-panel/5 p-4 text-sm text-zc-muted">
              No description. Add one to help admins understand where this catalogue is used.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
              <div className="text-xs font-semibold text-zc-muted">Department</div>
              <div className="mt-1 text-sm font-semibold text-zc-text">{dep ? `${dep.code} • ${dep.name}` : "—"}</div>
              <div className="mt-2 text-xs text-zc-muted">Context: {row.context || "—"}</div>
            </div>

            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
              <div className="text-xs font-semibold text-zc-muted">Payer Group</div>
              <div className="mt-1 text-sm font-semibold text-zc-text">{row.payerGroup || "—"}</div>
              <div className="mt-2 text-xs text-zc-muted">
                Effective: {fmtDateTime(row.effectiveFrom)} → {fmtDateTime(row.effectiveTo || null)}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-zc-text">Items</div>
              <div className="text-sm text-zc-muted">
                {row.items?.length || 0} services in this catalogue.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link href="/infrastructure/service-library">
                  Service Library <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link href="/infrastructure/service-mapping">
                  Service Mapping <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-zc-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Service</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[120px]">Visible</TableHead>
                  <TableHead className="w-[120px]">Sort</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(row.items || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                        <AlertTriangle className="h-4 w-4 text-zc-warn" />
                        No items yet. Use “Manage Items”.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  (row.items || []).slice(0, 12).map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-mono text-xs font-semibold">{it.serviceItem?.code || it.serviceItemId}</TableCell>
                      <TableCell className="text-sm text-zc-muted">{it.serviceItem?.name || "—"}</TableCell>
                      <TableCell>{it.isVisible ? <Badge variant="ok">YES</Badge> : <Badge variant="secondary">NO</Badge>}</TableCell>
                      <TableCell className="text-sm text-zc-muted">{it.sortOrder ?? 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {(row.items || []).length > 12 ? (
            <div className="text-xs text-zc-muted">
              Showing 12 of {row.items?.length}. Open “Manage Items” to view all and edit.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Create/Edit Modal                              */
/* -------------------------------------------------------------------------- */

function CatalogueEditModal({
  open,
  onOpenChange,
  mode,
  branchId,
  departments,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  branchId: string;
  departments: DepartmentRow[];
  editing: ServiceCatalogueRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState<any>({
    code: "",
    name: "",
    description: "",
    scope: "BRANCH",
    channel: "DEFAULT",
    departmentId: "",
    context: "",
    payerGroup: "",
    filterCategory: "",
    filterMinPrice: "",
    filterMaxPrice: "",
    visibility: "",
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editing) {
      setForm({
        code: editing.code || "",
        name: editing.name || "",
        description: editing.description || "",
        scope: editing.scope || "BRANCH",
        channel: editing.channel || "DEFAULT",
        departmentId: editing.departmentId || "",
        context: editing.context || "",
        payerGroup: editing.payerGroup || "",
        filterCategory: Array.isArray((editing as any).filterRules?.category) ? (editing as any).filterRules.category.join(", ") : ((editing as any).filterRules?.category || ""),
        filterMinPrice: (editing as any).filterRules?.minPrice != null ? String((editing as any).filterRules.minPrice) : "",
        filterMaxPrice: (editing as any).filterRules?.maxPrice != null ? String((editing as any).filterRules.maxPrice) : "",
        visibility: (editing as any).visibility || "",
      });
    } else {
      setForm({
        code: "",
        name: "",
        description: "",
        scope: "BRANCH",
        channel: "DEFAULT",
        departmentId: "",
        context: "",
        payerGroup: "",
        filterCategory: "",
        filterMinPrice: "",
        filterMaxPrice: "",
        visibility: "",
      });
    }
  }, [open, mode, editing]);

  function patch(p: Partial<any>) {
    setForm((prev: any) => ({ ...prev, ...p }));
  }

  async function save() {
    if (!branchId) return;

    const payload: any = {
      code: String(form.code || "").trim(),
      name: String(form.name || "").trim(),
      description: form.description?.trim() ? String(form.description).trim() : null,
      scope: form.scope || "BRANCH",
      channel: form.channel || "DEFAULT",
      departmentId: form.departmentId ? form.departmentId : null,
      context: form.context ? form.context : null,
      payerGroup: form.payerGroup?.trim() ? String(form.payerGroup).trim() : null,
      filterRules: (() => {
        const cats = (form.filterCategory || "").split(",").map((s: string) => s.trim()).filter(Boolean);
        const minP = form.filterMinPrice ? Number(form.filterMinPrice) : undefined;
        const maxP = form.filterMaxPrice ? Number(form.filterMaxPrice) : undefined;
        if (!cats.length && minP === undefined && maxP === undefined) return undefined;
        return {
          ...(cats.length ? { category: cats } : {}),
          ...(minP !== undefined ? { minPrice: minP } : {}),
          ...(maxP !== undefined ? { maxPrice: maxP } : {}),
        };
      })(),
      visibility: form.visibility?.trim() || null,
    };

    if (!payload.code || !payload.name) {
      toast({ title: "Missing fields", description: "Code and Name are required." });
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        await apiFetch(`/api/infrastructure/service-catalogues?${buildQS({ branchId })}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!editing?.id) throw new Error("Invalid editing row");
        await apiFetch(`/api/infrastructure/service-catalogues/${encodeURIComponent(editing.id)}`, {
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
        <ModalHeader
          title={mode === "create" ? "New Service Catalogue" : "Edit Service Catalogue"}
          description="Catalogues are branch-scoped. Use channel/context to control where the catalogue is consumed."
          onClose={() => onOpenChange(false)}
        />

        <div className="px-6 pb-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Code</Label>
              <Input value={form.code || ""} onChange={(e) => patch({ code: e.target.value })} placeholder="e.g., OPD-DEFAULT" />
            </div>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name || ""} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g., OPD Default Catalogue" />
            </div>

            <div className="grid gap-2">
              <Label>Channel</Label>
              <Select value={form.channel || "DEFAULT"} onValueChange={(v) => patch({ channel: v })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEFAULT">DEFAULT</SelectItem>
                  <SelectItem value="QUICK_ORDER">QUICK_ORDER</SelectItem>
                  <SelectItem value="ORDER_SET">ORDER_SET</SelectItem>
                  <SelectItem value="OT_PICKLIST">OT_PICKLIST</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Scope</Label>
              <Select value={form.scope || "BRANCH"} onValueChange={(v) => patch({ scope: v })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRANCH">BRANCH</SelectItem>
                  <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                </SelectContent>
              </Select>
              {/* <div className="text-xs text-zc-muted">If you keep ENTERPRISE, ensure your backend enforces it properly (you said branch-specific, so BRANCH is recommended).</div> */}
            </div>

            <div className="grid gap-2">
              <Label>Department (optional)</Label>
              <Select value={form.departmentId || ""} onValueChange={(v) => patch({ departmentId: v === "none" ? "" : v })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.code} • {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Context (optional)</Label>
              <Select value={form.context || ""} onValueChange={(v) => patch({ context: v === "none" ? "" : v })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select context (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="OPD">OPD</SelectItem>
                  <SelectItem value="IPD">IPD</SelectItem>
                  <SelectItem value="ER">ER</SelectItem>
                  <SelectItem value="OT">OT</SelectItem>
                  <SelectItem value="DAYCARE">DAYCARE</SelectItem>
                  <SelectItem value="TELECONSULT">TELECONSULT</SelectItem>
                  <SelectItem value="HOMECARE">HOMECARE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label>Payer Group (optional)</Label>
              <Input value={form.payerGroup || ""} onChange={(e) => patch({ payerGroup: e.target.value })} placeholder="e.g., CASH / INSURANCE / CORPORATE" />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label>Description (optional)</Label>
              <Textarea value={form.description || ""} onChange={(e) => patch({ description: e.target.value })} placeholder="Explain where this catalogue is used…" />
            </div>

            <div className="grid gap-2">
              <Label>Visibility</Label>
              <Select value={form.visibility || "_none"} onValueChange={(v) => patch({ visibility: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Default</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                  <SelectItem value="RESTRICTED">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
              <div className="text-sm font-semibold text-amber-700">Filter Rules (optional)</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Category Filter</Label>
                  <Input
                    value={form.filterCategory || ""}
                    onChange={(e) => patch({ filterCategory: e.target.value })}
                    placeholder="e.g., LAB, RADIOLOGY"
                  />
                  <div className="text-xs text-zc-muted">Comma-separated categories</div>
                </div>
                <div className="grid gap-2">
                  <Label>Min Price</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.filterMinPrice || ""}
                    onChange={(e) => patch({ filterMinPrice: e.target.value })}
                    placeholder="e.g., 100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Max Price</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.filterMaxPrice || ""}
                    onChange={(e) => patch({ filterMaxPrice: e.target.value })}
                    placeholder="e.g., 5000"
                  />
                </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Items Drawer                                  */
/* -------------------------------------------------------------------------- */

function CatalogueItemsDrawer({
  open,
  onOpenChange,
  branchId,
  catalogue,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  catalogue: ServiceCatalogueRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<ServiceCatalogueRow | null>(null);

  // add/search
  const [svcQ, setSvcQ] = React.useState("");
  const [svcLoading, setSvcLoading] = React.useState(false);
  const [svcRows, setSvcRows] = React.useState<ServiceItemRow[]>([]);
  const [pickedSvc, setPickedSvc] = React.useState<ServiceItemRow | null>(null);

  const [sortOrder, setSortOrder] = React.useState<string>("0");
  const [isVisible, setIsVisible] = React.useState<boolean>(true);
  const [overrideTatHours, setOverrideTatHours] = React.useState("");
  const [overrideNotes, setOverrideNotes] = React.useState("");
  const [overrideFasting, setOverrideFasting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDetail(null);
    setSvcQ("");
    setSvcRows([]);
    setPickedSvc(null);
    setSortOrder("0");
    setIsVisible(true);
    setOverrideTatHours("");
    setOverrideNotes("");
    setOverrideFasting(false);
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, catalogue?.id]);

  async function loadDetail() {
    if (!catalogue?.id) return;
    setLoading(true);
    try {
      const d = await apiFetch<ServiceCatalogueRow>(
        `/api/infrastructure/service-catalogues/${encodeURIComponent(catalogue.id)}`,
      );
      setDetail(d || null);
    } catch (e: any) {
      toast({ title: "Failed to load catalogue", description: e?.message || "Request failed", variant: "destructive" as any });
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

      // Keep list clean: billable + published services are best candidates for catalogues.
      const filtered = list.filter((r) => {
        const billableOk = r.isBillable === undefined ? true : Boolean(r.isBillable);
        const publishedOk = r.lifecycleStatus ? String(r.lifecycleStatus).toUpperCase() === "PUBLISHED" : true;
        return billableOk && publishedOk;
      });

      setSvcRows(filtered.slice(0, 80));
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

  function parseOverrides(): any {
    const hasAny = overrideTatHours || overrideNotes || overrideFasting;
    if (!hasAny) return undefined;
    return {
      ...(overrideTatHours ? { tatHours: Number(overrideTatHours) || 0 } : {}),
      ...(overrideNotes ? { notes: overrideNotes.trim() } : {}),
      ...(overrideFasting ? { fasting: true } : {}),
    };
  }

  async function upsertItem() {
    if (!catalogue?.id || !pickedSvc?.id) return;
    const overrides = parseOverrides();

    const payload: any = {
      serviceItemId: pickedSvc.id,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      isVisible: Boolean(isVisible),
      overrides,
    };

    setLoading(true);
    try {
      await apiFetch(`/api/infrastructure/service-catalogues/${encodeURIComponent(catalogue.id)}/items`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({ title: "Item saved", description: "Service item added/updated in catalogue." });

      // reset small form
      setPickedSvc(null);
      setSortOrder("0");
      setIsVisible(true);
      setOverrideTatHours("");
      setOverrideNotes("");
      setOverrideFasting(false);

      await loadDetail();
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(serviceItemId: string) {
    if (!catalogue?.id) return;
    const ok = window.confirm("Remove this service from the catalogue?");
    if (!ok) return;

    setLoading(true);
    try {
      await apiFetch(
        `/api/infrastructure/service-catalogues/${encodeURIComponent(catalogue.id)}/items/${encodeURIComponent(serviceItemId)}`,
        { method: "DELETE" },
      );
      toast({ title: "Removed", description: "Service removed from catalogue." });
      await loadDetail();
      onSaved();
    } catch (e: any) {
      toast({ title: "Remove failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function quickToggle(it: ServiceCatalogueItemRow, nextVisible: boolean) {
    if (!catalogue?.id) return;
    setLoading(true);
    try {
      await apiFetch(`/api/infrastructure/service-catalogues/${encodeURIComponent(catalogue.id)}/items`, {
        method: "POST",
        body: JSON.stringify({
          serviceItemId: it.serviceItemId,
          sortOrder: it.sortOrder ?? 0,
          isVisible: nextVisible,
          overrides: it.overrides ?? undefined,
        }),
      });
      await loadDetail();
      onSaved();
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function quickSort(it: ServiceCatalogueItemRow, nextSort: number) {
    if (!catalogue?.id) return;
    setLoading(true);
    try {
      await apiFetch(`/api/infrastructure/service-catalogues/${encodeURIComponent(catalogue.id)}/items`, {
        method: "POST",
        body: JSON.stringify({
          serviceItemId: it.serviceItemId,
          sortOrder: nextSort,
          isVisible: it.isVisible,
          overrides: it.overrides ?? undefined,
        }),
      });
      await loadDetail();
      onSaved();
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  const items = detail?.items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={`Manage Items • ${catalogue?.code || ""}`}
          description="Add/curate service items inside this catalogue. These control visibility for ordering screens."
          onClose={() => onOpenChange(false)}
        />

        <div className="px-6 pb-6 grid gap-6">
          {/* Add section */}
          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zc-text">Add / Update Item</div>
                <div className="text-xs text-zc-muted">Search billable published services and add them to this catalogue.</div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link href="/infrastructure/service-library">
                  Service Library <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-2">
              <Label>Find Service</Label>
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
                      <TableHead className="w-[140px]">Charge Unit</TableHead>
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
                                <span className="text-xs text-zc-muted">{s.type || "—"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{s.chargeUnit || "—"}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant={picked ? "primary" : "outline"} size="sm" onClick={() => setPickedSvc(s)}>
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
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="grid gap-2">
                <Label>Sort Order</Label>
                <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Visible</Label>
                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={isVisible} onCheckedChange={setIsVisible} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">{isVisible ? "Visible" : "Hidden"}</div>
                    <div className="text-xs text-zc-muted">Controls UI visibility</div>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>TAT (hours)</Label>
                <Input
                  type="number"
                  min={0}
                  value={overrideTatHours}
                  onChange={(e) => setOverrideTatHours(e.target.value)}
                  placeholder="e.g., 24"
                />
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Input
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="e.g., Fasting required"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-zc-muted">
                Selected:{" "}
                <span className="font-mono font-semibold text-zc-text">{pickedSvc ? pickedSvc.code : "—"}</span>
              </div>
              <Button onClick={upsertItem} disabled={loading || !pickedSvc}>
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Save Item
              </Button>
            </div>
          </div>

          {/* Items list */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zc-text">Catalogue Items</div>
                <div className="text-xs text-zc-muted">
                  Total: <span className="font-semibold text-zc-text">{items.length}</span>
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
                    <TableHead className="w-[180px]">Service</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[120px]">Visible</TableHead>
                    <TableHead className="w-[160px]">Sort</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                          <AlertTriangle className="h-4 w-4 text-zc-warn" />
                          No items yet.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-mono text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-zc-text">{it.serviceItem?.code || it.serviceItemId}</span>
                            <span className="text-[11px] text-zc-muted">{String(it.serviceItemId).slice(0, 8)}…</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-zc-muted">{it.serviceItem?.name || "—"}</TableCell>
                        <TableCell>
                          <Button
                            variant={it.isVisible ? "outline" : "outline"}
                            size="sm"
                            className="gap-2"
                            onClick={() => quickToggle(it, !it.isVisible)}
                          >
                            {it.isVisible ? <Badge variant="ok">YES</Badge> : <Badge variant="secondary">NO</Badge>}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              className="h-9 w-[90px]"
                              defaultValue={String(it.sortOrder ?? 0)}
                              onBlur={(e) => {
                                const next = Number(e.target.value);
                                if (Number.isFinite(next) && next !== it.sortOrder) quickSort(it, next);
                              }}
                            />
                            <span className="text-xs text-zc-muted">(blur to save)</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => removeItem(it.serviceItemId)}>
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="text-xs text-zc-muted">
              Note: overrides are stored per catalogue-item. Use them later for UI hints (TAT, fasting flags) or future pricing/availability overrides.
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
