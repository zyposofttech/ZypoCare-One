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

import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import {
  AlertTriangle,
  ExternalLink,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Wrench,
  Eye,
  Trash2,
  CheckCircle2,
  BadgePercent,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type TaxType = "GST" | "TDS" | "OTHER";

type TaxCodeRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;

  taxType: TaxType;
  ratePercent: string | number; // Decimal from API can arrive as string

  hsnSac?: string | null;
  components?: any | null;

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;

  _count?: {
    chargeMasterItems?: number;
    tariffRates?: number;
    serviceItems?: number;
    servicePackages?: number;
  };
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

function toNumber(v: any) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
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

function activeBadge(isActive: boolean) {
  return isActive ? <Badge variant="ok">ACTIVE</Badge> : <Badge variant="secondary">INACTIVE</Badge>;
}

function taxTypeBadge(t: TaxType) {
  if (t === "GST") return <Badge variant="secondary">GST</Badge>;
  if (t === "TDS") return <Badge variant="warning">TDS</Badge>;
  return <Badge variant="secondary">OTHER</Badge>;
}

function ModalHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <BadgePercent className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>

      <Separator className="my-4" />
    </>
  );
}

async function apiTry<T>(primary: string, fallback: string, init?: RequestInit): Promise<T> {
  try {
    return await apiFetch<T>(primary, init as any);
  } catch (e: any) {
    // Fallback for legacy endpoints / permission differences
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
      return await apiFetch<T>(fallback, init as any);
    }
    throw e;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function SuperAdminTaxCodesPage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";


  const [activeTab, setActiveTab] = React.useState<"taxCodes" | "guide">("taxCodes");
  const [showFilters, setShowFilters] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [rows, setRows] = React.useState<TaxCodeRow[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [selected, setSelected] = React.useState<TaxCodeRow | null>(null);

  // filters
  const [q, setQ] = React.useState("");
  const [taxType, setTaxType] = React.useState<TaxType | "all">("all");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  // modals
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<TaxCodeRow | null>(null);

  const [componentsOpen, setComponentsOpen] = React.useState(false);
  const [componentsPayload, setComponentsPayload] = React.useState<any>(null);

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

  async function loadTaxCodes(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const qs = buildQS({
        branchId,
        q: q.trim() || undefined,
        taxType: taxType !== "all" ? taxType : undefined,
        includeInactive: includeInactive ? "true" : undefined,
        includeCounts: "true",
      });

      // Prefer infra endpoints (matches this module). Keep billing fallback for legacy compatibility.
      const res = await apiTry<any>(
        `/api/infrastructure/tax-codes?${qs}`,
        `/api/billing/tax-codes?${qs}`,
      );

      const list: TaxCodeRow[] = Array.isArray(res) ? res : (res?.rows || []);
      setRows(list);

      const nextSelected =
        selectedId && list.some((x) => x.id === selectedId) ? selectedId : list[0]?.id || "";
      setSelectedId(nextSelected);
      setSelected(nextSelected ? list.find((x) => x.id === nextSelected) || null : null);

      if (showToast) {
        toast({
          title: "Tax codes refreshed",
          description: "Loaded latest tax codes for this branch.",
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load tax codes";
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
      await loadTaxCodes(false);
      if (showToast) toast({ title: "Ready", description: "Branch scope and tax codes are up to date." });
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
    void loadTaxCodes(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, includeInactive]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadTaxCodes(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, taxType]);

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
    setTaxType("all");
    setIncludeInactive(false);
    setSelectedId("");
    setSelected(null);

    setErr(null);
    setLoading(true);
    try {
      await loadTaxCodes(false);
      toast({ title: "Branch scope changed", description: "Loaded tax codes for selected branch." });
    } catch (e: any) {
      toast({ title: "Load failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  const stats = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const inactive = total - active;

    const usedInactive = rows.filter((r) => {
      const c = r._count || {};
      const used = (c.chargeMasterItems || 0) + (c.tariffRates || 0) + (c.serviceItems || 0) + (c.servicePackages || 0);
      return !r.isActive && used > 0;
    }).length;

    return { total, active, inactive, usedInactive };
  }, [rows]);

  function openCreate() {
    setEditMode("create");
    setEditing(null);
    setEditOpen(true);
  }

  function openEdit(row: TaxCodeRow) {
    setEditMode("edit");
    setEditing(row);
    setEditOpen(true);
  }

  async function quickToggle(row: TaxCodeRow, nextActive: boolean) {
    if (!row?.id) return;
    const ok = window.confirm(
      nextActive
        ? "Activate this tax code? (This can auto-resolve FixIts.)"
        : "Deactivate this tax code? (This may create FixIts if used.)",
    );
    if (!ok) return;

    setBusy(true);
    try {
      await apiTry(
        `/api/infrastructure/tax-codes/${encodeURIComponent(row.id)}`,
        `/api/billing/tax-codes/${encodeURIComponent(row.id)}`,
        { method: "PATCH", body: JSON.stringify({ isActive: nextActive }) },
      );
      toast({ title: "Updated", description: `Tax code is now ${nextActive ? "ACTIVE" : "INACTIVE"}.` });
      await loadTaxCodes(false);
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: TaxCodeRow) {
    if (!row?.id) return;
    const ok = window.confirm("Delete this tax code? (Only safe if not referenced anywhere.)");
    if (!ok) return;

    setBusy(true);
    try {
      await apiTry(
        `/api/infrastructure/tax-codes/${encodeURIComponent(row.id)}`,
        `/api/billing/tax-codes/${encodeURIComponent(row.id)}`,
        { method: "DELETE" },
      );
      toast({ title: "Deleted", description: "Tax code deleted." });
      await loadTaxCodes(false);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure • Tax Codes">
      <RequirePerm perm="INFRA_TAX_CODE_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <BadgePercent className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Tax Codes</div>
              <div className="mt-1 text-sm text-zc-muted">
                Branch-scoped GST/TDS tax definitions used by Charge Master Items and Tariff Rates.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
            <Button
              variant="outline"
              className="px-5 gap-2 whitespace-nowrap shrink-0"
              onClick={() => refreshAll(true)}
              disabled={loading || busy}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button variant="outline" asChild className="px-5 gap-2 whitespace-nowrap shrink-0">
              <Link href="/infrastructure/fixit">
                <Wrench className="h-4 w-4" />
                FixIt Inbox
              </Link>
            </Button>

            <Button
              variant="primary"
              className="px-5 gap-2 whitespace-nowrap shrink-0"
              onClick={openCreate}
              disabled={mustSelectBranch}
            >
              <Plus className="h-4 w-4" />
              New Tax Code
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load tax codes</CardTitle>
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
              Tax codes must be <span className="font-semibold text-zc-text">active</span> to be used in Charge Master and Tariffs.
              If you deactivate a tax code that is referenced, FixIt rules should flag it.
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

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Tax Codes</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-900/50 dark:bg-slate-900/10">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Inactive</div>
                <div className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-300">{stats.inactive}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Inactive but used</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{stats.usedInactive}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code/name/HSN…"
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
                    <Label className="text-xs text-zc-muted">Tax Type</Label>
                    <Select value={taxType} onValueChange={(v) => setTaxType(v as any)} disabled={mustSelectBranch}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="GST">GST</SelectItem>
                        <SelectItem value="TDS">TDS</SelectItem>
                        <SelectItem value="OTHER">OTHER</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Branch scoped</Badge>
              <Badge variant="ok">Active required for usage</Badge>
              <Badge variant="warning">Inactive used → FixIt</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Workspace */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Tax Code Workspace</CardTitle>
                <CardDescription>Create, maintain, and activate tax codes used in billing.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="taxCodes"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <BadgePercent className="mr-2 h-4 w-4" />
                    Tax Codes
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
              <TabsContent value="taxCodes" className="mt-0">
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
                                  <BadgePercent className="h-4 w-4" />
                                  No tax codes found. Create one to begin.
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            rows.map((r) => {
                              const used =
                                (r._count?.chargeMasterItems || 0) +
                                (r._count?.tariffRates || 0) +
                                (r._count?.serviceItems || 0) +
                                (r._count?.servicePackages || 0);

                              const isWarn = !r.isActive && used > 0;

                              return (
                                <TableRow
                                  key={r.id}
                                  className={cn("cursor-pointer", selectedId === r.id ? "bg-zc-panel/30" : "")}
                                  onClick={() => setSelectedId(r.id)}
                                >
                                  <TableCell className="font-mono text-xs">
                                    <div className="flex flex-col gap-1">
                                      <span className="font-semibold text-zc-text">{r.code}</span>
                                      <span className="text-[11px] text-zc-muted">{r.taxType}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      <span className="font-semibold text-zc-text">{r.name}</span>
                                      <span className={cn("text-xs", isWarn ? "text-amber-700 dark:text-amber-300" : "text-zc-muted")}>
                                        Rate: <span className="font-semibold text-zc-text">{String(r.ratePercent)}%</span>
                                        {r.hsnSac ? (
                                          <>
                                            {" "}
                                            • HSN/SAC: <span className="font-semibold text-zc-text">{r.hsnSac}</span>
                                          </>
                                        ) : null}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{isWarn ? <Badge variant="warning">USED+INACTIVE</Badge> : activeBadge(r.isActive)}</TableCell>
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
                                          Edit tax code
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setComponentsPayload(r.components ?? null);
                                            setComponentsOpen(true);
                                          }}
                                        >
                                          <Eye className="mr-2 h-4 w-4" />
                                          View components
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => quickToggle(r, !r.isActive)}>
                                          <CheckCircle2 className="mr-2 h-4 w-4" />
                                          {r.isActive ? "Deactivate" : "Activate"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => remove(r)}>
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
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
                          <CardTitle className="text-base">Select a tax code</CardTitle>
                          <CardDescription>Pick a tax code from the left list to view details and take actions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                            Tip: Create separate GST codes like GST-0, GST-5, GST-12, GST-18, GST-28 with optional HSN/SAC defaults.
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <TaxCodeDetail
                        row={selected}
                        busy={busy}
                        onEdit={() => openEdit(selected)}
                        onToggle={() => quickToggle(selected, !selected.isActive)}
                        onViewComponents={() => {
                          setComponentsPayload(selected.components ?? null);
                          setComponentsOpen(true);
                        }}
                      />
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="guide" className="mt-0">
                <Card className="border-zc-border">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">How to use Tax Codes</CardTitle>
                    <CardDescription>Tax codes are referenced by billing items and tariff rates.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">1</Badge> Create branch tax codes
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Example: <span className="font-mono font-semibold text-zc-text">GST-18</span> (rate 18.0000).
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">2</Badge> Link to Charge Master Items
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Charge master should enforce <span className="font-semibold text-zc-text">active tax code</span>.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="ok">3</Badge> Tariff Rates can override
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Tariff rate can inherit tax code from Charge Master or override as per plan rules.
                        </div>
                      </div>

                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <Badge variant="warning">4</Badge> Deactivation creates FixIts
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          If inactive tax code is still referenced, FixIt should alert until you reactivate or remap.
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                        <AlertTriangle className="h-4 w-4 text-zc-warn" />
                        Recommended practice
                      </div>
                      <div className="mt-1 text-sm text-zc-muted">
                        Avoid editing the meaning of an existing tax code used in billing. Prefer creating a new code/version and updating mappings.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit drawer */}
      <TaxCodeEditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode={editMode}
        branchId={branchId}
        editing={editing}
        onSaved={async () => {
          toast({ title: "Saved", description: "Tax code saved successfully." });
          await loadTaxCodes(false);
        }}
      />

      {/* Components viewer */}
      <Dialog open={componentsOpen} onOpenChange={setComponentsOpen}>
        <DialogContent className="sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-zc-accent" />
              Tax Components JSON
            </DialogTitle>
            <DialogDescription>Optional breakdown (CGST/SGST/IGST), exemptions, notes, etc.</DialogDescription>
          </DialogHeader>

          <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
            <pre className="max-h-[60vh] overflow-auto text-xs leading-relaxed text-zc-text">
              {JSON.stringify(componentsPayload ?? {}, null, 2)}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComponentsOpen(false)}>
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

function TaxCodeDetail({
  row,
  busy,
  onEdit,
  onToggle,
  onViewComponents,
}: {
  row: TaxCodeRow;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onViewComponents: () => void;
}) {
  const c = row._count || {};
  const usedTotal =
    (c.chargeMasterItems || 0) + (c.tariffRates || 0) + (c.serviceItems || 0) + (c.servicePackages || 0);

  const warnInactiveUsed = !row.isActive && usedTotal > 0;

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
                {activeBadge(row.isActive)} <span className="mx-2 text-zc-muted">•</span>
                {taxTypeBadge(row.taxType)} <span className="mx-2 text-zc-muted">•</span>
                Rate: <span className="font-semibold text-zc-text">{String(row.ratePercent)}%</span>
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={onEdit} disabled={busy}>
                <Wrench className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" className="gap-2" onClick={onViewComponents} disabled={busy}>
                <Eye className="h-4 w-4" />
                Components
              </Button>
              <Button variant={row.isActive ? "outline" : "primary"} className="gap-2" onClick={onToggle} disabled={busy}>
                <CheckCircle2 className="h-4 w-4" />
                {row.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          {warnInactiveUsed ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-300" />
                <div>
                  <div className="font-semibold">Inactive tax code is still referenced</div>
                  <div className="mt-1 text-sm opacity-90">
                    This should generate FixIts until you reactivate or remap the dependent items/rates.
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
              <div className="text-xs font-semibold text-zc-muted">HSN/SAC (default)</div>
              <div className="mt-1 text-sm font-semibold text-zc-text">{row.hsnSac || "—"}</div>
              <div className="mt-2 text-xs text-zc-muted">Updated: {fmtDateTime(row.updatedAt || null)}</div>
            </div>

            <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
              <div className="text-xs font-semibold text-zc-muted">Usage</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="secondary">ChargeMaster: {c.chargeMasterItems || 0}</Badge>
                <Badge variant="secondary">TariffRates: {c.tariffRates || 0}</Badge>
                <Badge variant="secondary">ServiceItems: {c.serviceItems || 0}</Badge>
                <Badge variant="secondary">Packages: {c.servicePackages || 0}</Badge>
              </div>
              <div className="mt-2 text-xs text-zc-muted">Total refs: {usedTotal}</div>
            </div>
          </div>

          <Separator />

          <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
            <div className="text-sm font-semibold text-zc-text">Notes</div>
            <div className="mt-1 text-sm text-zc-muted">
              Use <span className="font-semibold text-zc-text">components</span> to store breakdown JSON
              (CGST/SGST/IGST) or exemptions. Keep tax codes stable; prefer creating a new code for major changes.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Create/Edit Drawer                             */
/* -------------------------------------------------------------------------- */

function TaxCodeEditModal({
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
  editing: TaxCodeRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState<any>({
    code: "",
    name: "",
    taxType: "GST" as TaxType,
    ratePercent: "18.0000",
    hsnSac: "",
    isActive: true,
    componentsText: "",
  });

  React.useEffect(() => {
    if (!open) return;

    if (mode === "edit" && editing) {
      setForm({
        code: editing.code || "",
        name: editing.name || "",
        taxType: (editing.taxType || "GST") as TaxType,
        ratePercent: String(editing.ratePercent ?? ""),
        hsnSac: editing.hsnSac || "",
        isActive: Boolean(editing.isActive),
        componentsText:
          editing.components != null ? JSON.stringify(editing.components, null, 2) : "",
      });
    } else {
      setForm({
        code: "",
        name: "",
        taxType: "GST",
        ratePercent: "18.0000",
        hsnSac: "",
        isActive: true,
        componentsText: "",
      });
    }
  }, [open, mode, editing]);

  function patch(p: Partial<any>) {
    setForm((prev: any) => ({ ...prev, ...p }));
  }

  async function save() {
    if (!branchId) return;

    const code = String(form.code || "").trim();
    const name = String(form.name || "").trim();
    const rateStr = String(form.ratePercent || "").trim();

    if (!code || !name) {
      toast({ title: "Missing fields", description: "Code and Name are required." });
      return;
    }

    const rateNum = toNumber(rateStr);
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      toast({ title: "Invalid rate", description: "ratePercent must be a valid number (e.g., 18.0000)." });
      return;
    }

    let components: any = null;
    const ct = String(form.componentsText || "").trim();
    if (ct) {
      try {
        components = JSON.parse(ct);
      } catch {
        toast({ title: "Invalid JSON", description: "Components must be valid JSON (or leave blank)." });
        return;
      }
    }

    const payload: any = {
      code,
      name,
      taxType: (form.taxType || "GST") as TaxType,
      // Backend DTO expects number (ValidationPipe does not do implicit conversion)
      ratePercent: rateNum,
      hsnSac: String(form.hsnSac || "").trim() || null,
      isActive: Boolean(form.isActive),
      components,
    };

    setSaving(true);
    try {
      if (mode === "create") {
        const qs = buildQS({ branchId });
        await apiTry(
          `/api/infrastructure/tax-codes?${qs}`,
          `/api/billing/tax-codes?${qs}`,
          { method: "POST", body: JSON.stringify(payload) },
        );
      } else {
        if (!editing?.id) throw new Error("Invalid editing row");
        await apiTry(
          `/api/infrastructure/tax-codes/${encodeURIComponent(editing.id)}`,
          `/api/billing/tax-codes/${encodeURIComponent(editing.id)}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
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
          title={mode === "create" ? "New Tax Code" : "Edit Tax Code"}
          description="Branch-scoped. Active tax codes are required for Charge Master and Tariff Rates."
        />

        <div className="px-6 pb-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Code</Label>
              <Input value={form.code || ""} onChange={(e) => patch({ code: e.target.value })} placeholder="e.g., GST-18" />
            </div>

            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name || ""} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g., GST @ 18%" />
            </div>

            <div className="grid gap-2">
              <Label>Tax Type</Label>
              <Select value={form.taxType} onValueChange={(v) => patch({ taxType: v as TaxType })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GST">GST</SelectItem>
                  <SelectItem value="TDS">TDS</SelectItem>
                  <SelectItem value="OTHER">OTHER</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Rate Percent</Label>
              <Input
                value={form.ratePercent || ""}
                onChange={(e) => patch({ ratePercent: e.target.value })}
                placeholder="18.0000"
              />
              <div className="text-xs text-zc-muted">Store with precision (Decimal). Example: 18.0000</div>
            </div>

            <div className="grid gap-2">
              <Label>Default HSN/SAC (optional)</Label>
              <Input value={form.hsnSac || ""} onChange={(e) => patch({ hsnSac: e.target.value })} placeholder="e.g., 999312" />
            </div>

            <div className="grid gap-2">
              <Label>Active</Label>
              <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                <Switch checked={Boolean(form.isActive)} onCheckedChange={(v) => patch({ isActive: v })} />
                <div className="text-sm">
                  <div className="font-semibold text-zc-text">{form.isActive ? "Active" : "Inactive"}</div>
                  <div className="text-xs text-zc-muted">Inactive tax codes should not be used</div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label>Components JSON (optional)</Label>
              <Textarea
                value={form.componentsText || ""}
                onChange={(e) => patch({ componentsText: e.target.value })}
                placeholder={`{\n  "cgst": 9,\n  "sgst": 9,\n  "notes": "GST split example"\n}`}
                className="min-h-[180px]"
              />
              <div className="text-xs text-zc-muted">
                Example fields: cgst/sgst/igst, exemptions, notes, effective rules (if any).
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
