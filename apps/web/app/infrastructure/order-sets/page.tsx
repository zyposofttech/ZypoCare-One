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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ExternalLink,
  Eye,
  Filter,
  Layers,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  UploadCloud,
  Wrench,
  X,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type OrderSetStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "RETIRED";

/**
 * Backend expects Prisma enum: CatalogueChannel
 * In your app this is used across Service Catalogue + Order Sets.
 * Keep these as the UI defaults (and we also merge any channels seen from API).
 */
const DEFAULT_CHANNELS = ["DEFAULT", "QUICK_ORDER", "ORDER_SET", "OT_PICKLIST"] as const;

type ServiceItemRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive?: boolean;
  isBillable?: boolean;
  lifecycleStatus?: string | null;
  chargeUnit?: string | null;
  type?: string | null;
};

type DiagnosticItemLite = { id: string; code: string; name: string };
type PackageLite = { id: string; code: string; name: string };

type OrderSetItemRow = {
  id: string;
  orderSetId: string;

  itemType: "SERVICE_ITEM" | "DIAGNOSTIC_ITEM" | "PACKAGE" | string;

  serviceItemId?: string | null;
  diagnosticItemId?: string | null;
  pkgId?: string | null;

  sortOrder: number;
  quantity?: number; // DB has it; UI doesn't edit it
  isActive: boolean;

  serviceItem?: ServiceItemRow | null;
  diagnosticItem?: DiagnosticItemLite | null;
  pkg?: PackageLite | null;

  createdAt?: string;
  updatedAt?: string;
};

type OrderSetRow = {
  id: string;
  branchId: string;

  code: string;
  name: string;
  description?: string | null;

  channel: string; // CatalogueChannel (string)
  status: OrderSetStatus;
  version: number;

  effectiveFrom?: string | null;
  effectiveTo?: string | null;

  createdAt?: string;
  updatedAt?: string;

  items?: OrderSetItemRow[];
};

type OrderSetVersionRow = {
  id: string;
  orderSetId: string;
  version: number;
  status?: string | null;
  effectiveFrom?: string | null;
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

function statusBadge(s: OrderSetStatus) {
  switch (s) {
    case "PUBLISHED":
      return <Badge variant="ok">PUBLISHED</Badge>;
    case "IN_REVIEW":
      return <Badge variant="warning">IN REVIEW</Badge>;
    case "RETIRED":
      return <Badge variant="destructive">RETIRED</Badge>;
    case "APPROVED":
      return <Badge variant="secondary">APPROVED</Badge>;
    case "DRAFT":
    default:
      return <Badge variant="secondary">DRAFT</Badge>;
  }
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

function itemLabel(it: OrderSetItemRow) {
  const code = it.serviceItem?.code || it.diagnosticItem?.code || it.pkg?.code || "—";
  const name = it.serviceItem?.name || it.diagnosticItem?.name || it.pkg?.name || "—";
  return { code, name };
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/* -------------------------------------------------------------------------- */
/*                             Page: Order Sets                                */
/* -------------------------------------------------------------------------- */

export default function Page() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";


  const [activeTab, setActiveTab] = React.useState<"orderSets" | "guide">("orderSets");
  const [showFilters, setShowFilters] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [rows, setRows] = React.useState<OrderSetRow[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [selected, setSelected] = React.useState<OrderSetRow | null>(null);

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<OrderSetStatus | "all">("all");
  const [channel, setChannel] = React.useState<string | "all">("all");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [itemsOpen, setItemsOpen] = React.useState(false);
  const [versionsOpen, setVersionsOpen] = React.useState(false);

  const [editing, setEditing] = React.useState<OrderSetRow | null>(null);
  const [versionsFor, setVersionsFor] = React.useState<OrderSetRow | null>(null);

  const mustSelectBranch = !branchId;

  const channelOptions = React.useMemo<string[]>(() => {
    const seen = rows.map((r) => r.channel).filter(isNonEmptyString);
    const base: string[] = [...DEFAULT_CHANNELS, ...seen];
    return uniq(base).filter(isNonEmptyString);
  }, [rows]);

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
    const totalItems = rows.reduce((n, r) => n + (r.items || []).filter((it) => it.isActive !== false).length, 0);
    return { total, published, draft, review, approved, retired, totalItems };
  }, [rows]);

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

  async function loadOrderSets(showToast = false, targetBranchId?: string) {
    const bid = targetBranchId || branchId;
    if (!bid) return;
    setErr(null);
    setLoading(true);
    try {
      const list =
        (await apiFetch<OrderSetRow[]>(
          `/api/infrastructure/order-sets?${buildQS({
            branchId: bid,
            q: q.trim() || undefined,
            status: status !== "all" ? status : undefined,
          })}`,
        )) || [];

      let visible = list;
      if (!includeInactive) visible = visible.filter((r) => r.status !== "RETIRED");
      if (channel !== "all") visible = visible.filter((r) => String(r.channel) === String(channel));

      setRows(visible);

      const nextSelected = selectedId && visible.some((x) => x.id === selectedId) ? selectedId : visible[0]?.id || "";
      setSelectedId(nextSelected);
      setSelected(nextSelected ? visible.find((x) => x.id === nextSelected) || null : null);

      if (showToast) toast({ title: "Order sets refreshed", description: "Loaded latest order sets for this branch." });
    } catch (e: any) {
      const msg = e?.message || "Failed to load order sets";
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
      await loadOrderSets(false, bid);
      if (showToast) toast({ title: "Ready", description: "Branch scope and order sets are up to date." });
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
    void loadOrderSets(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, includeInactive]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadOrderSets(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, channel]);

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
    setChannel("all");
    setIncludeInactive(false);
    setSelectedId("");
    setSelected(null);

    setErr(null);
    setLoading(true);
    try {
      await loadOrderSets(false, nextId);
      toast({ title: "Branch scope changed", description: "Loaded order sets for selected branch." });
    } catch (e: any) {
      toast({ title: "Load failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(row: OrderSetRow) {
    setEditing(row);
    setEditorOpen(true);
  }

  function openItems(row: OrderSetRow) {
    setSelected(row);
    setSelectedId(row.id);
    setItemsOpen(true);
  }

  function openVersions(row: OrderSetRow) {
    setVersionsFor(row);
    setVersionsOpen(true);
  }

  async function workflow(row: OrderSetRow, action: "submit" | "approve" | "publish" | "retire") {
    if (!row?.id) return;
    const note = window.prompt(`Optional note for ${action.toUpperCase()} (leave blank for none):`) || "";
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/order-sets/${encodeURIComponent(row.id)}/workflow/${action}`, {
        method: "POST",
        body: JSON.stringify({ note: note.trim() ? note.trim() : undefined }),
      });
      toast({ title: "Workflow updated", description: `Action ${action.toUpperCase()} applied.` });
      await loadOrderSets(false);
    } catch (e: any) {
      toast({ title: "Workflow failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure ??? Order Sets">
      <RequirePerm perm="INFRA_ORDER_SET_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Layers className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Order Sets</div>
              <div className="mt-1 text-sm text-zc-muted">Create order sets and manage their service items.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => refreshAll(true)} disabled={loading || busy}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button variant="outline" asChild className="px-5 gap-2">
              <Link href="/infrastructure/fixit">
                <Wrench className="h-4 w-4" />
                FixIt Inbox
              </Link>
            </Button>

            <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={mustSelectBranch}>
              <Plus className="h-4 w-4" />
              New Order Set
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load order sets</CardTitle>
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
              Pick a branch {"->"} create order set {"->"} add service items {"->"} publish. Order sets should stay lean for quick ordering.
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
                        {b.code} - {b.name} ({b.city})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Order Sets</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Published</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.published}</div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Total Set Items</div>
                <div className="mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-300">{stats.totalItems}</div>
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
                  disabled={mustSelectBranch}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={mustSelectBranch} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">Include retired</div>
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

                  <div className="md:col-span-4">
                    <Label className="text-xs text-zc-muted">Channel</Label>
                    <Select value={channel} onValueChange={(v) => setChannel(v)} disabled={mustSelectBranch}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[320px] overflow-y-auto">
                        <SelectItem value="all">Any</SelectItem>
                        {channelOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
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
                <CardTitle className="text-base">Order Set Workspace</CardTitle>
                <CardDescription>Create order sets and curate service items inside each set.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "orderSets" | "guide")}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="orderSets"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    Order Sets
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
              <TabsContent value="orderSets" className="mt-0">
                <div className="rounded-xl border border-zc-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead className="w-[180px]">Effective From</TableHead>
                        <TableHead className="w-[120px]">Items</TableHead>
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
                              <Layers className="h-4 w-4" />
                              No order sets found. Create one to begin.
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((r) => {
                          const itemsCount = (r.items || []).filter((it) => it.isActive !== false).length;
                          return (
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
                                  <span className="text-xs text-zc-muted">
                                    {r.description?.trim() ? r.description : `Channel: ${r.channel || "--"}`}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{statusBadge(r.status)}</TableCell>
                              <TableCell className="text-sm text-zc-muted">{fmtDateTime(r.effectiveFrom)}</TableCell>
                              <TableCell className="text-sm text-zc-muted">{itemsCount}</TableCell>
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
                                      Edit order set
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openItems(r)}>
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
                          );
                        })
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
                        <Link href="/infrastructure/service-catalogues">
                          Service Catalogues <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="guide" className="mt-0">
                <Card className="border-zc-border">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">How to use Order Sets</CardTitle>
                    <CardDescription>Order sets group commonly ordered services into quick panels.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">1</Badge> Create order set (branch scoped)
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Define code/name and channel. Order sets start as <span className="font-semibold">DRAFT</span>.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">2</Badge> Add service items
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Each order set item references a <span className="font-semibold">Service Item</span>.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">3</Badge> Publish (versioned)
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Publish for clinical use. Retire instead of delete to preserve audit history.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">4</Badge> Keep sets lean
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Use 10-20 items per set for speed. Use Service Packages for pricing bundles.
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
                        Keep sortOrder consistent and retire older sets when new versions are published.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Editor Drawer */}
      <OrderSetEditorDrawer
        open={editorOpen}
        onOpenChange={setEditorOpen}
        branchId={branchId}
        editing={editing}
        channels={channelOptions}
        onSaved={async () => {
          toast({ title: "Saved", description: "Order set saved successfully." });
          await loadOrderSets(false);
        }}
      />

      {/* Items Drawer */}
      <OrderSetItemsDrawer
        open={itemsOpen}
        onOpenChange={setItemsOpen}
        branchId={branchId}
        orderSet={selected}
        onSaved={async () => {
          toast({ title: "Updated", description: "Order set items updated." });
          await loadOrderSets(false);
        }}
      />

      {/* Versions */}
      <OrderSetVersionsDialog
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        orderSet={versionsFor}
      />
          </RequirePerm>
</AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Editor Drawer                                 */
/* -------------------------------------------------------------------------- */

function OrderSetEditorDrawer({
  open,
  onOpenChange,
  branchId,
  editing,
  channels,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  editing: OrderSetRow | null;
  channels: string[];
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const isEdit = Boolean(editing?.id);

  const [busy, setBusy] = React.useState(false);

  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [channel, setChannel] = React.useState<string>("ORDER_SET");

  const channelOptions = React.useMemo<string[]>(() => {
    const base: string[] = [...DEFAULT_CHANNELS, ...channels];
    // ensure current value appears
    if (editing?.channel) base.push(editing.channel);
    return uniq(base).filter(isNonEmptyString);
  }, [channels, editing?.channel]);

  React.useEffect(() => {
    if (!open) return;

    if (editing) {
      setCode(editing.code || "");
      setName(editing.name || "");
      setDescription(editing.description || "");
      setChannel(editing.channel || "ORDER_SET");
    } else {
      setCode("");
      setName("");
      setDescription("");
      setChannel("ORDER_SET");
    }
    setBusy(false);
  }, [open, editing]);

  async function save() {
    if (!branchId) {
      toast({ title: "Select a branch first" });
      return;
    }

    const c = (code || "").trim();
    const n = (name || "").trim();
    const ch = (channel || "").trim() || "ORDER_SET"; // never send null/empty

    if (!c) {
      toast({ title: "Code is required" });
      return;
    }
    if (!n) {
      toast({ title: "Name is required" });
      return;
    }

    setBusy(true);
    try {
      if (isEdit && editing?.id) {
        await apiFetch(`/api/infrastructure/order-sets/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            code: c,
            name: n,
            description: description.trim() ? description.trim() : null,
            channel: ch,
          }),
        });
        toast({ title: "Saved", description: "Order set updated." });
      } else {
        await apiFetch(`/api/infrastructure/order-sets?${buildQS({ branchId })}`, {
          method: "POST",
          body: JSON.stringify({
            code: c,
            name: n,
            description: description.trim() ? description.trim() : null,
            channel: ch,
          }),
        });
        toast({ title: "Created", description: "Order set created." });
      }

      await onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <DialogHeader className="sr-only">
          <DialogTitle>{isEdit ? "Edit Order Set" : "New Order Set"}</DialogTitle>
          <DialogDescription>Channel is required (CatalogueChannel). Default is ORDER_SET.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 border-b border-zc-border bg-zc-panel/20 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-2xl border border-zc-border bg-white/40 p-2">
              <Wrench className="h-5 w-5 text-indigo-700" />
            </div>
            <div>
              <div className="text-base font-semibold text-zc-text">{isEdit ? "Edit Order Set" : "New Order Set"}</div>
              <div className="text-sm text-zc-muted">
                Channel is required (CatalogueChannel). Default is <span className="font-semibold">ORDER_SET</span>.
              </div>
            </div>
          </div>

          {/* <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button> */}
        </div>

        <div className="grid gap-4 px-6 py-5">
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="OPD-FEVER" />
          </div>

          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="OPD Fever Set" />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes…" rows={3} />
          </div>

          <div className="grid gap-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {channelOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-zc-muted">
              If backend enum differs, you’ll get “Invalid channel … Allowed values …” from API.
            </div>
          </div>

          {isEdit && editing ? (
            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
              Current status: <span className="font-semibold text-zc-text">{editing.status}</span> • Version{" "}
              <span className="font-semibold text-zc-text">v{editing.version ?? 1}</span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-zc-border px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Items Drawer                                 */
/* -------------------------------------------------------------------------- */

function OrderSetItemsDrawer({
  open,
  onOpenChange,
  branchId,
  orderSet,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  orderSet: OrderSetRow | null;
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<OrderSetRow | null>(null);

  const [svcQ, setSvcQ] = React.useState("");
  const [svcLoading, setSvcLoading] = React.useState(false);
  const [svcRows, setSvcRows] = React.useState<ServiceItemRow[]>([]);
  const [pickedSvc, setPickedSvc] = React.useState<ServiceItemRow | null>(null);

  const [sortOrder, setSortOrder] = React.useState<string>("0");

  React.useEffect(() => {
    if (!open) return;

    setDetail(null);
    setSvcQ("");
    setSvcRows([]);
    setPickedSvc(null);
    setSortOrder("0");

    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderSet?.id]);

  async function loadDetail() {
    if (!orderSet?.id) return;
    setLoading(true);
    try {
      const d = await apiFetch<OrderSetRow>(`/api/infrastructure/order-sets/${encodeURIComponent(orderSet.id)}`);
      setDetail(d || null);
    } catch (e: any) {
      toast({ title: "Failed to load order set", description: e?.message || "Request failed", variant: "destructive" as any });
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

      // Keep list usable but not too strict (so it never looks "empty")
      const trimmed = list
        .filter((s) => s && s.id)
        .slice(0, 80);

      setSvcRows(trimmed);
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

  async function addServiceItem() {
    if (!orderSet?.id || !pickedSvc?.id) return;

    const sort = Number(sortOrder);
    const payload: any = {
      serviceItemId: pickedSvc.id,
      sortOrder: Number.isFinite(sort) ? sort : 0,
    };

    setLoading(true);
    try {
      await apiFetch(`/api/infrastructure/order-sets/${encodeURIComponent(orderSet.id)}/items`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({ title: "Item saved", description: "Service item added/updated in order set." });

      setPickedSvc(null);
      setSortOrder("0");

      await loadDetail();
      await onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(serviceItemId: string) {
    if (!orderSet?.id) return;
    const ok = window.confirm("Remove this service from the order set?");
    if (!ok) return;

    setLoading(true);
    try {
      await apiFetch(
        `/api/infrastructure/order-sets/${encodeURIComponent(orderSet.id)}/items/${encodeURIComponent(serviceItemId)}`,
        { method: "DELETE" },
      );
      toast({ title: "Removed", description: "Service removed from order set." });
      await loadDetail();
      await onSaved();
    } catch (e: any) {
      toast({ title: "Remove failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  const itemsAll = detail?.items || [];
  const items = itemsAll.filter((it) => it.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <DialogHeader className="sr-only">
          <DialogTitle>Manage Items</DialogTitle>
          <DialogDescription>Search Service Library and add items into this Order Set.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 border-b border-zc-border bg-zc-panel/20 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-2xl border border-zc-border bg-white/40 p-2">
              <Plus className="h-5 w-5 text-indigo-700" />
            </div>
            <div>
              <div className="text-base font-semibold text-zc-text">
                Manage Items • {orderSet?.code || ""}
              </div>
              <div className="text-sm text-zc-muted">
                Search Service Library and add items into this Order Set.
              </div>
            </div>
          </div>

          {/* <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button> */}
        </div>

        <div className="grid gap-6 overflow-auto px-6 py-5">
          {/* Add section */}
          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zc-text">Add / Update Service Item</div>
                <div className="text-xs text-zc-muted">Pick one item and save. Re-picking the same item updates sort order.</div>
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
                <Input
                  value={svcQ}
                  onChange={(e) => setSvcQ(e.target.value)}
                  placeholder="Search by code/name…"
                  className="pl-10"
                />
              </div>

              <div className="rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
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
                        const isActive = s.isActive !== false;
                        const published = (s.lifecycleStatus || "").toUpperCase() === "PUBLISHED";
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
                            <TableCell className="space-x-2">
                              {isActive ? <Badge variant="ok">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                              {published ? <Badge variant="secondary">Published</Badge> : <Badge variant="secondary">—</Badge>}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant={picked ? "primary" : "outline"}
                                size="sm"
                                onClick={() => setPickedSvc(s)}
                              >
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

            <div className="grid gap-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <Label>Sort Order</Label>
                <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
                <div className="mt-1 text-xs text-zc-muted">Lower comes first. Use 0/10/20…</div>
              </div>

              <div className="md:col-span-8 flex items-end justify-end gap-2">
                <Button variant="outline" onClick={() => setPickedSvc(null)} disabled={!pickedSvc}>
                  Clear
                </Button>
                <Button variant="primary" onClick={addServiceItem} disabled={!pickedSvc || loading}>
                  {loading ? "Saving…" : "Save Item"}
                </Button>
              </div>
            </div>
          </div>

          {/* Existing items */}
          <div className="rounded-xl border border-zc-border">
            <div className="flex items-center justify-between gap-3 border-b border-zc-border p-4">
              <div>
                <div className="text-sm font-semibold text-zc-text">Current Items</div>
                <div className="text-xs text-zc-muted">Total: {items.length}</div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[120px]">Sort</TableHead>
                  <TableHead className="w-[120px]">Active</TableHead>
                  <TableHead className="w-[90px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !detail ? (
                  Array.from({ length: 6 }).map((_, i) => (
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
                  items.map((it) => {
                    const lbl = itemLabel(it);
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="font-mono text-xs font-semibold text-zc-text">{lbl.code}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-zc-text">{lbl.name}</span>
                            <span className="text-xs text-zc-muted">{it.itemType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{it.sortOrder ?? 0}</TableCell>
                        <TableCell>{it.isActive ? <Badge variant="ok">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                        <TableCell>
                          {it.serviceItemId ? (
                            <Button variant="outline" size="sm" onClick={() => removeItem(it.serviceItemId!)} disabled={loading}>
                              Remove
                            </Button>
                          ) : (
                            <Badge variant="secondary">—</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            <div className="border-t border-zc-border p-4 text-xs text-zc-muted">
              Removal marks item inactive (soft remove) — consistent with audit trail.
            </div>
          </div>
        </div>

        <div className="border-t border-zc-border px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Versions Dialog                               */
/* -------------------------------------------------------------------------- */

function OrderSetVersionsDialog({
  open,
  onOpenChange,
  orderSet,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderSet: OrderSetRow | null;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<OrderSetVersionRow[]>([]);

  React.useEffect(() => {
    if (!open) return;
    if (!orderSet?.id) return;

    setRows([]);
    setLoading(true);

    (async () => {
      try {
        const list =
          (await apiFetch<OrderSetVersionRow[]>(
            `/api/infrastructure/order-sets/${encodeURIComponent(orderSet.id)}/versions`,
          )) || [];
        setRows(list);
      } catch (e: any) {
        toast({ title: "Failed to load versions", description: e?.message || "Request failed", variant: "destructive" as any });
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderSet?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[980px]">
        <DialogHeader>
          <DialogTitle>Versions • {orderSet?.code || ""}</DialogTitle>
          <DialogDescription>Each publish creates a snapshot version.</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-zc-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Version</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead className="w-[220px]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                      <AlertTriangle className="h-4 w-4 text-zc-warn" />
                      No versions yet. Publish to create version history.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs font-semibold text-zc-text">v{v.version}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{v.status || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zc-text">
                      From: <span className="font-semibold">{fmtDateTime(v.effectiveFrom)}</span> • To:{" "}
                      <span className="font-semibold">{fmtDateTime(v.effectiveTo)}</span>
                    </TableCell>
                    <TableCell className="text-sm text-zc-muted">{fmtDateTime(v.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
