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
import {
  AlertTriangle,
  BookMarked,
  ClipboardList,
  ExternalLink,
  Filter,
  Link2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Wrench,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type StandardCodeSetRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  system?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type StandardCodeEntryRow = {
  id: string;
  codeSetId: string;
  code: string;
  display: string;
  attributes?: any;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ServiceItemMiniRow = {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  isActive?: boolean;
};

type ServiceItemStandardMappingRow = {
  id: string;
  branchId: string;
  serviceItemId: string;
  entryId: string;
  isPrimary: boolean;
  createdAt?: string;
  entry: {
    id: string;
    code: string;
    display: string;
    codeSet: StandardCodeSetRow;
  };
  serviceItem: {
    id: string;
    code: string;
    name: string;
    category?: string | null;
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
  if (!v) return "â€”";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "â€”";
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

function modalClassName(extra?: string) {
  return cn(
    "rounded-2xl border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card shadow-2xl shadow-indigo-500/10",
    extra,
  );
}

function ModalHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            {icon ?? <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <Separator className="my-4" />
    </>
  );
}

function safeParseJson(text: string) {
  const t = (text ?? "").trim();
  if (!t) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    return "__INVALID__";
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function SuperAdminServiceLibraryPage() {
  const { toast } = useToast();
  // âœ… Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";


  const [activeTab, setActiveTab] = React.useState<"codeSets" | "mappings" | "guide">("codeSets");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  // Code sets
  const [codeSets, setCodeSets] = React.useState<StandardCodeSetRow[]>([]);
  const [csQ, setCsQ] = React.useState("");
  const [csIncludeInactive, setCsIncludeInactive] = React.useState(false);

  // Mappings
  const [mappings, setMappings] = React.useState<ServiceItemStandardMappingRow[]>([]);
  const [mapQ, setMapQ] = React.useState("");
  const [mapCodeSetId, setMapCodeSetId] = React.useState<string | "all">("all");

  // Pagination (client-side)
  const [csPage, setCsPage] = React.useState(1);
  const [csPageSize, setCsPageSize] = React.useState(50);

  const [mapPage, setMapPage] = React.useState(1);
  const [mapPageSize, setMapPageSize] = React.useState(50);

  // dialogs
  const [codeSetDialogOpen, setCodeSetDialogOpen] = React.useState(false);
  const [editingCodeSet, setEditingCodeSet] = React.useState<StandardCodeSetRow | null>(null);

  const [manageOpen, setManageOpen] = React.useState(false);
  const [manageCodeSet, setManageCodeSet] = React.useState<StandardCodeSetRow | null>(null);

  const [entryDialogOpen, setEntryDialogOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<StandardCodeEntryRow | null>(null);

  const [addMappingOpen, setAddMappingOpen] = React.useState(false);

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

  async function loadCodeSets(showToast = false) {
    if (!branchId) return;
    try {
      const resp = await apiFetch<StandardCodeSetRow[]>(
        `/api/infrastructure/service-library/code-sets?${buildQS({
          branchId,
          q: csQ.trim() || undefined,
          includeInactive: csIncludeInactive ? "true" : undefined,
        })}`,
      );
      setCodeSets(resp || []);
      if (showToast) toast({ title: "Service Library refreshed", description: "Code sets loaded." });
    } catch (e: any) {
      throw new Error(e?.message || "Failed to load code sets");
    }
  }

  async function loadMappings(showToast = false) {
    if (!branchId) return;
    try {
      const resp = await apiFetch<ServiceItemStandardMappingRow[]>(
        `/api/infrastructure/service-library/mappings?${buildQS({
          branchId,
          q: mapQ.trim() || undefined,
          codeSetId: mapCodeSetId !== "all" ? mapCodeSetId : undefined,
        })}`,
      );
      setMappings(resp || []);
      if (showToast) toast({ title: "Mappings loaded", description: "Service â†” Standard code mappings updated." });
    } catch (e: any) {
      throw new Error(e?.message || "Failed to load mappings");
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
      await Promise.all([loadCodeSets(false), loadMappings(false)]);
      if (showToast) toast({ title: "Service Library ready", description: "Branch scope and library data are up to date." });
    } catch (e: any) {
      setErr(e?.message || "Refresh failed");
      if (showToast) toast({ title: "Refresh failed", description: e?.message || "Request failed", variant: "destructive" as any });
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
    setCsPage(1);
    setMapPage(1);
    void refreshAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    if (!branchId) return;
    setCsPage(1);
    const t = setTimeout(() => void loadCodeSets(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csQ, csIncludeInactive]);

  React.useEffect(() => {
    if (!branchId) return;
    setMapPage(1);
    const t = setTimeout(() => void loadMappings(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapQ, mapCodeSetId]);

  async function onBranchChange(nextId: string) {
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
setErr(null);
    setLoading(true);
    try {
      await Promise.all([loadCodeSets(false), loadMappings(false)]);
      toast({ title: "Branch scope changed", description: "Service Library loaded for selected branch context." });
    } catch (e: any) {
      setErr(e?.message || "Failed to load branch scope");
      toast({ variant: "destructive", title: "Load failed", description: e?.message || "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  function openCreateCodeSet() {
    setEditingCodeSet(null);
    setCodeSetDialogOpen(true);
  }

  function openEditCodeSet(cs: StandardCodeSetRow) {
    setEditingCodeSet(cs);
    setCodeSetDialogOpen(true);
  }

  function openManage(cs: StandardCodeSetRow) {
    setManageCodeSet(cs);
    setManageOpen(true);
  }

  function openAddEntry(entry?: StandardCodeEntryRow | null) {
    setEditingEntry(entry || null);
    setEntryDialogOpen(true);
  }

  const totals = React.useMemo(() => {
    const totalCodeSets = codeSets.length;
    const inactiveCodeSets = codeSets.filter((x) => !x.isActive).length;
    const totalMappings = mappings.length;
    const primaryMappings = mappings.filter((m) => m.isPrimary).length;
    return { totalCodeSets, inactiveCodeSets, totalMappings, primaryMappings };
  }, [codeSets, mappings]);

  const filteredCodeSets = React.useMemo(() => {
    // backend already filters by q/includeInactive; keep stable sort in UI
    return [...(codeSets || [])].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [codeSets]);

  const csTotalPages = React.useMemo(() => Math.max(1, Math.ceil(filteredCodeSets.length / csPageSize)), [filteredCodeSets.length, csPageSize]);
  const csPageRows = React.useMemo(() => {
    const start = (csPage - 1) * csPageSize;
    return filteredCodeSets.slice(start, start + csPageSize);
  }, [filteredCodeSets, csPage, csPageSize]);

  const filteredMappings = React.useMemo(() => {
    // backend already filters by q and codeSetId; keep as-is
    return [...(mappings || [])];
  }, [mappings]);

  const mapTotalPages = React.useMemo(() => Math.max(1, Math.ceil(filteredMappings.length / mapPageSize)), [filteredMappings.length, mapPageSize]);
  const mapPageRows = React.useMemo(() => {
    const start = (mapPage - 1) * mapPageSize;
    return filteredMappings.slice(start, start + mapPageSize);
  }, [filteredMappings, mapPage, mapPageSize]);

  return (
    <AppShell title="Infrastructure â€¢ Service Library">
      <RequirePerm perm="INFRA_CODE_SET_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ShieldCheck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Service Library</div>
              <div className="mt-1 text-sm text-zc-muted">
                Maintain standard code sets (LOINC/CPT/internal), code entries, and map them to branch service items.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => refreshAll(true)} disabled={loading || busy}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {activeTab === "codeSets" ? (
              <Button variant="primary" className="px-5 gap-2" onClick={openCreateCodeSet} disabled={mustSelectBranch || busy}>
                <Plus className="h-4 w-4" />
                New Code Set
              </Button>
            ) : null}

            {activeTab === "mappings" ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setAddMappingOpen(true)} disabled={mustSelectBranch || busy}>
                <Plus className="h-4 w-4" />
                New Mapping
              </Button>
            ) : null}
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load service library</CardTitle>
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
              Select a branch, manage code sets & entries, then map codes to services for clean interoperability.
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
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Code Sets</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totals.totalCodeSets}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
                <div className="text-xs font-medium text-rose-600 dark:text-rose-400">Inactive Code Sets</div>
                <div className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-300">{totals.inactiveCodeSets}</div>
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Mappings</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{totals.totalMappings}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Primary Mappings</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{totals.primaryMappings}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Branch scoped access</Badge>
              <Badge variant="ok">Standard codes ready</Badge>
              <Badge variant="accent">Map for integrations</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Main tabs */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Manage Service Library</CardTitle>
                <CardDescription>Code sets, entries, and mappings to service items.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="codeSets"
                    className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                  >
                    <BookMarked className="mr-2 h-4 w-4" />
                    Code Sets
                  </TabsTrigger>
                  <TabsTrigger
                    value="mappings"
                    className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Mappings
                  </TabsTrigger>
                  <TabsTrigger
                    value="guide"
                    className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Quick Guide
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <Tabs value={activeTab}>
              {/* --------------------------- Code Sets Tab --------------------------- */}
              <TabsContent value="codeSets" className="mt-0">
                <div className="grid gap-4">
                  <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                      <Filter className="h-4 w-4 text-zc-accent" />
                      Filters
                    </div>

                    <div className="grid gap-3 md:grid-cols-12">
                      <div className="md:col-span-6">
                        <Label className="text-xs text-zc-muted">Search Code Sets</Label>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                          <Input
                            value={csQ}
                            onChange={(e) => setCsQ(e.target.value)}
                            placeholder="Search by code, name, description..."
                            className="pl-10"
                            disabled={mustSelectBranch}
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6 flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/10 px-3 py-2">
                        <Switch checked={csIncludeInactive} onCheckedChange={setCsIncludeInactive} disabled={mustSelectBranch} />
                        <div className="text-sm">
                          <div className="font-semibold text-zc-text">Include inactive</div>
                          <div className="text-xs text-zc-muted">Show retired code sets too</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zc-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[220px]">Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[360px]">Description</TableHead>
                          <TableHead className="w-[120px]">Active</TableHead>
                          <TableHead className="w-[180px]">Updated</TableHead>
                          <TableHead className="w-[70px]"></TableHead>
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
                        ) : csPageRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <div className="flex items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                                <BookMarked className="h-4 w-4" />
                                No code sets found.
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          csPageRows.map((cs) => (
                            <TableRow key={cs.id}>
                              <TableCell className="font-mono text-xs">
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-zc-text">{cs.code}</span>
                                  <span className="text-[11px] text-zc-muted">{String(cs.id).slice(0, 8)}â€¦</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-zc-text">{cs.name}</span>
                                  <span className="text-xs text-zc-muted">{cs.system || "INTERNAL"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-zc-muted">
                                <span className="line-clamp-2">{cs.description || "â€”"}</span>
                              </TableCell>
                              <TableCell>
                                {cs.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                              </TableCell>
                              <TableCell className="text-sm text-zc-muted">{fmtDateTime(cs.updatedAt || cs.createdAt || null)}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[260px]">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>

                                    <DropdownMenuItem onClick={() => openManage(cs)}>
                                      <ClipboardList className="mr-2 h-4 w-4" />
                                      Manage entries
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => openEditCodeSet(cs)}>
                                      <Wrench className="mr-2 h-4 w-4" />
                                      Edit code set
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      onClick={async () => {
                                        setBusy(true);
                                        try {
                                          await apiFetch(`/api/infrastructure/service-library/code-sets/${encodeURIComponent(cs.id)}?${buildQS({ branchId })}`, {
                                            method: "PATCH",
                                            body: JSON.stringify({ isActive: !cs.isActive }),
                                          });
                                          toast({ title: "Updated", description: `Code set marked ${!cs.isActive ? "Active" : "Inactive"}.` });
                                          await loadCodeSets(false);
                                        } catch (e: any) {
                                          toast({ title: "Update failed", description: e?.message || "Request failed", variant: "destructive" as any });
                                        } finally {
                                          setBusy(false);
                                        }
                                      }}
                                    >
                                      <Filter className="mr-2 h-4 w-4" />
                                      {cs.isActive ? "Set inactive" : "Set active"}
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      onClick={() => {
                                        navigator.clipboard?.writeText(cs.id).then(
                                          () => toast({ title: "Copied", description: "Code set id copied to clipboard." }),
                                          () => toast({ title: "Copy failed", description: "Could not access clipboard." }),
                                        );
                                      }}
                                    >
                                      Copy id
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
                        Showing <span className="font-semibold text-zc-text">{csPageRows.length}</span> of{" "}
                        <span className="font-semibold text-zc-text">{filteredCodeSets.length}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={String(csPageSize)}
                          onValueChange={(v) => {
                            setCsPage(1);
                            setCsPageSize(Number(v));
                          }}
                          disabled={mustSelectBranch}
                        >
                          <SelectTrigger className="h-9 w-[140px]">
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

                        <Button variant="outline" className="h-9" disabled={mustSelectBranch || csPage <= 1} onClick={() => setCsPage((p) => Math.max(1, p - 1))}>
                          Prev
                        </Button>
                        <Button variant="outline" className="h-9" disabled={mustSelectBranch || csPage >= csTotalPages} onClick={() => setCsPage((p) => Math.min(csTotalPages, p + 1))}>
                          Next
                        </Button>

                        <Badge variant="secondary">
                          Page {csPage} / {csTotalPages}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* --------------------------- Mappings Tab --------------------------- */}
              <TabsContent value="mappings" className="mt-0">
                <div className="grid gap-4">
                  <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                      <Filter className="h-4 w-4 text-zc-accent" />
                      Filters
                    </div>

                    <div className="grid gap-3 md:grid-cols-12">
                      <div className="md:col-span-6">
                        <Label className="text-xs text-zc-muted">Search Mappings</Label>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                          <Input
                            value={mapQ}
                            onChange={(e) => setMapQ(e.target.value)}
                            placeholder="Search service code/name or entry code/display..."
                            className="pl-10"
                            disabled={mustSelectBranch}
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6">
                        <Label className="text-xs text-zc-muted">Code Set</Label>
                        <Select value={mapCodeSetId} onValueChange={(v) => setMapCodeSetId(v as any)} disabled={mustSelectBranch}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="All code sets" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[320px] overflow-y-auto">
                            <SelectItem value="all">All</SelectItem>
                            {codeSets.map((cs) => (
                              <SelectItem key={cs.id} value={cs.id}>
                                {cs.code} â€¢ {cs.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zc-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[260px]">Service</TableHead>
                          <TableHead className="w-[220px]">Code Set</TableHead>
                          <TableHead>Entry</TableHead>
                          <TableHead className="w-[140px]">Primary</TableHead>
                          <TableHead className="w-[180px]">Created</TableHead>
                          <TableHead className="w-[70px]"></TableHead>
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
                        ) : mapPageRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <div className="flex items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                                <Link2 className="h-4 w-4" />
                                No mappings found.
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          mapPageRows.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-mono">{m.serviceItem.code}</Badge>
                                    <span className="font-semibold text-zc-text">{m.serviceItem.name}</span>
                                  </div>
                                  <div className="text-xs text-zc-muted">{m.serviceItem.category || "â€”"}</div>
                                </div>
                              </TableCell>

                              <TableCell className="text-sm">
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-zc-text">{m.entry.codeSet.code}</span>
                                  <span className="text-xs text-zc-muted">{m.entry.codeSet.name}</span>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <span className="font-mono text-xs font-semibold text-zc-text">{m.entry.code}</span>
                                  <span className="text-xs text-zc-muted line-clamp-1">{m.entry.display}</span>
                                </div>
                              </TableCell>

                              <TableCell>
                                {m.isPrimary ? (
                                  <Badge variant="ok" className="gap-1"><Star className="h-3 w-3" /> Primary</Badge>
                                ) : (
                                  <Badge variant="secondary">No</Badge>
                                )}
                              </TableCell>

                              <TableCell className="text-sm text-zc-muted">{fmtDateTime(m.createdAt || null)}</TableCell>

                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[260px]">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>

                                    <DropdownMenuItem
                                      onClick={async () => {
                                        setBusy(true);
                                        try {
                                          await apiFetch(`/api/infrastructure/service-library/mappings?${buildQS({ branchId })}`, {
                                            method: "POST",
                                            body: JSON.stringify({
                                              serviceItemId: m.serviceItemId,
                                              codeEntryId: m.entryId,
                                              isPrimary: true,
                                            }),
                                          });
                                          toast({ title: "Updated", description: "Marked as primary mapping." });
                                          await loadMappings(false);
                                        } catch (e: any) {
                                          toast({ title: "Update failed", description: e?.message || "Request failed", variant: "destructive" as any });
                                        } finally {
                                          setBusy(false);
                                        }
                                      }}
                                    >
                                      <Star className="mr-2 h-4 w-4" />
                                      Make primary
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      className="text-zc-danger focus:text-zc-danger"
                                      onClick={async () => {
                                        if (!confirm("Delete this mapping?")) return;
                                        setBusy(true);
                                        try {
                                          await apiFetch(`/api/infrastructure/service-library/mappings/${encodeURIComponent(m.id)}?${buildQS({ branchId })}`, {
                                            method: "DELETE",
                                          });
                                          toast({ title: "Deleted", description: "Mapping removed." });
                                          await loadMappings(false);
                                        } catch (e: any) {
                                          toast({ title: "Delete failed", description: e?.message || "Request failed", variant: "destructive" as any });
                                        } finally {
                                          setBusy(false);
                                        }
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete mapping
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem asChild>
                                      <Link href={`/infrastructure/service-items` as any}>
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open Service Items
                                      </Link>
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
                        Showing <span className="font-semibold text-zc-text">{mapPageRows.length}</span> of{" "}
                        <span className="font-semibold text-zc-text">{filteredMappings.length}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={String(mapPageSize)}
                          onValueChange={(v) => {
                            setMapPage(1);
                            setMapPageSize(Number(v));
                          }}
                          disabled={mustSelectBranch}
                        >
                          <SelectTrigger className="h-9 w-[140px]">
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

                        <Button variant="outline" className="h-9" disabled={mustSelectBranch || mapPage <= 1} onClick={() => setMapPage((p) => Math.max(1, p - 1))}>
                          Prev
                        </Button>
                        <Button variant="outline" className="h-9" disabled={mustSelectBranch || mapPage >= mapTotalPages} onClick={() => setMapPage((p) => Math.min(mapTotalPages, p + 1))}>
                          Next
                        </Button>

                        <Badge variant="secondary">
                          Page {mapPage} / {mapTotalPages}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* --------------------------- Guide Tab --------------------------- */}
              <TabsContent value="guide" className="mt-0">
                <div className="grid gap-4">
                  <Card className="border-zc-border">
                    <CardHeader className="py-4">
                      <CardTitle className="text-base">Recommended usage</CardTitle>
                      <CardDescription>Keep interoperability clean and consistent.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                            <Badge variant="ok">1</Badge> Create Code Sets
                          </div>
                          <div className="mt-1 text-sm text-zc-muted">
                            Create internal or standard code sets (e.g., LOINC/CPT/internal catalog).
                          </div>
                        </div>

                        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                            <Badge variant="ok">2</Badge> Add Code Entries
                          </div>
                          <div className="mt-1 text-sm text-zc-muted">
                            Add entries (code + display). Keep codes stable so integrations remain consistent.
                          </div>
                        </div>

                        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                            <Badge variant="ok">3</Badge> Map to Service Items
                          </div>
                          <div className="mt-1 text-sm text-zc-muted">
                            Map entries to branch Service Items. Mark one mapping primary per service item where needed.
                          </div>
                        </div>

                        <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                            <Badge variant="ok">4</Badge> Use in integrations
                          </div>
                          <div className="mt-1 text-sm text-zc-muted">
                            Standard mappings help downstream billing, analytics, and external data exchange.
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                          <AlertTriangle className="h-4 w-4 text-zc-warn" />
                          Tip: Keep mapping â€œPrimaryâ€ meaningful
                        </div>
                        <div className="mt-1 text-sm text-zc-muted">
                          If a service can map to multiple standards, mark the one most important for reporting/integration as Primary.
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setActiveTab("codeSets")} className="gap-2">
                          <BookMarked className="h-4 w-4" /> Go to Code Sets
                        </Button>
                        <Button variant="outline" onClick={() => setActiveTab("mappings")} className="gap-2">
                          <Link2 className="h-4 w-4" /> Go to Mappings
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* CodeSet create/edit */}
      <CodeSetDialog
        open={codeSetDialogOpen}
        onOpenChange={setCodeSetDialogOpen}
        branchId={branchId}
        editing={editingCodeSet}
        onSaved={async () => {
          toast({ title: editingCodeSet ? "Code set updated" : "Code set created", description: "Saved successfully." });
          await loadCodeSets(false);
        }}
      />

      {/* Manage CodeSet (drawer) */}
      <CodeSetManageDrawer
        open={manageOpen}
        onOpenChange={setManageOpen}
        branchId={branchId}
        codeSet={manageCodeSet}
        onAddEntry={() => openAddEntry(null)}
        onEditEntry={(e) => openAddEntry(e)}
        onUpdated={async () => {
          await Promise.all([loadCodeSets(false), loadMappings(false)]);
        }}
      />

      {/* Entry create/edit */}
      <EntryDialog
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        branchId={branchId}
        codeSetId={manageCodeSet?.id || ""}
        editing={editingEntry}
        onSaved={async () => {
          toast({ title: editingEntry ? "Entry updated" : "Entry saved", description: "Saved successfully." });
          // Drawer will reload its list itself via key refresh, but also refresh code sets/mappings if needed
        }}
      />

      {/* New Mapping */}
      <AddMappingDialog
        open={addMappingOpen}
        onOpenChange={setAddMappingOpen}
        branchId={branchId}
        codeSets={codeSets}
        onSaved={async () => {
          toast({ title: "Mapping saved", description: "Service â†” standard code mapping created." });
          await loadMappings(false);
        }}
      />
          </RequirePerm>
</AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Code Set Create/Edit Dialog                        */
/* -------------------------------------------------------------------------- */

function CodeSetDialog({
  open,
  onOpenChange,
  branchId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  editing: StandardCodeSetRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState<{ code: string; name: string; description: string; isActive: boolean }>({
    code: "",
    name: "",
    description: "",
    isActive: true,
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      code: editing?.code || "",
      name: editing?.name || "",
      description: editing?.description || "",
      isActive: Boolean(editing?.isActive ?? true),
    });
  }, [open, editing]);

  function patch(p: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    if (!branchId) return;

    const payload: any = {
      code: String(form.code || "").trim(),
      name: String(form.name || "").trim(),
      description: form.description?.trim() ? String(form.description).trim() : null,
      ...(editing ? { isActive: Boolean(form.isActive) } : {}),
    };

    if (!payload.code || !payload.name) {
      toast({ title: "Missing fields", description: "Code and Name are required." });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/infrastructure/service-library/code-sets/${encodeURIComponent(editing.id)}?${buildQS({ branchId })}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/infrastructure/service-library/code-sets?${buildQS({ branchId })}`, {
          method: "POST",
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
      <DialogContent className={modalClassName("max-w-[720px]")}>
        <ModalHeader
          title={editing ? "Edit Code Set" : "New Code Set"}
          description="Create a standard code set used to tag services (e.g., LOINC/CPT/Internal)."
          icon={<BookMarked className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => patch({ code: e.target.value })} placeholder="e.g., LOINC, CPT, INTERNAL" />
            <div className="text-xs text-zc-muted min-h-[16px]">Keep stable (used in audit/integrations).</div>
          </div>

          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g., LOINC Codes" />
            <div className="text-xs text-zc-muted min-h-[16px] invisible" aria-hidden="true">
              Placeholder helper
            </div>
          </div>

          <div className="md:col-span-2 grid gap-2">
            <Label>Description (optional)</Label>
            <Textarea value={form.description} onChange={(e) => patch({ description: e.target.value })} placeholder="What is this code set used for?" className="min-h-[90px]" />
          </div>

          {editing ? (
            <div className="md:col-span-2 flex items-start gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
              <Switch checked={form.isActive} onCheckedChange={(v) => patch({ isActive: v })} />
              <div>
                <div className="text-sm font-semibold text-zc-text">Active</div>
                <div className="text-sm text-zc-muted">Inactive code sets stay for history but will be hidden by default.</div>
              </div>
            </div>
          ) : null}
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

/* -------------------------------------------------------------------------- */
/*                          Code Set Manage Drawer                             */
/* -------------------------------------------------------------------------- */

function CodeSetManageDrawer({
  open,
  onOpenChange,
  branchId,
  codeSet,
  onAddEntry,
  onEditEntry,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  codeSet: StandardCodeSetRow | null;
  onAddEntry: () => void;
  onEditEntry: (e: StandardCodeEntryRow) => void;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = React.useState<"entries" | "mappings">("entries");

  const [loading, setLoading] = React.useState(false);
  const [entries, setEntries] = React.useState<StandardCodeEntryRow[]>([]);
  const [entryQ, setEntryQ] = React.useState("");

  const [mapLoading, setMapLoading] = React.useState(false);
  const [codeSetMappings, setCodeSetMappings] = React.useState<ServiceItemStandardMappingRow[]>([]);
  const [mapQ, setMapQ] = React.useState("");

  async function loadEntries() {
    if (!branchId || !codeSet?.id) return;
    setLoading(true);
    try {
      const resp = await apiFetch<StandardCodeEntryRow[]>(
        `/api/infrastructure/service-library/code-sets/${encodeURIComponent(codeSet.id)}/entries?${buildQS({
          branchId,
          q: entryQ.trim() || undefined,
        })}`,
      );
      setEntries(resp || []);
    } catch (e: any) {
      toast({ title: "Failed to load entries", description: e?.message || "Request failed", variant: "destructive" as any });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMappings() {
    if (!branchId || !codeSet?.id) return;
    setMapLoading(true);
    try {
      const resp = await apiFetch<ServiceItemStandardMappingRow[]>(
        `/api/infrastructure/service-library/mappings?${buildQS({
          branchId,
          codeSetId: codeSet.id,
          q: mapQ.trim() || undefined,
        })}`,
      );
      setCodeSetMappings(resp || []);
    } catch (e: any) {
      toast({ title: "Failed to load mappings", description: e?.message || "Request failed", variant: "destructive" as any });
      setCodeSetMappings([]);
    } finally {
      setMapLoading(false);
    }
  }

  React.useEffect(() => {
    if (!open) return;
    setTab("entries");
    setEntryQ("");
    setMapQ("");
    void loadEntries();
    void loadMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, codeSet?.id]);

  React.useEffect(() => {
    if (!open || tab !== "entries") return;
    const t = setTimeout(() => void loadEntries(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryQ, tab]);

  React.useEffect(() => {
    if (!open || tab !== "mappings") return;
    const t = setTimeout(() => void loadMappings(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapQ, tab]);

  async function deleteEntry(e: StandardCodeEntryRow) {
    if (!codeSet?.id) return;
    if (!confirm(`Retire entry "${e.code}"?`)) return;

    try {
      await apiFetch(
        `/api/infrastructure/service-library/code-sets/${encodeURIComponent(codeSet.id)}/entries/${encodeURIComponent(e.code)}?${buildQS({
          branchId,
        })}`,
        { method: "DELETE" },
      );
      toast({ title: "Entry retired", description: "Entry marked inactive." });
      await loadEntries();
      onUpdated();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Request failed", variant: "destructive" as any });
    }
  }

  if (!codeSet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <ModalHeader
          title={`Manage: ${codeSet.code}`}
          description={`${codeSet.name} â€¢ Add entries and see mapped services.`}
          icon={<BookMarked className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
        />

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={codeSet.isActive ? "success" : "secondary"}>{codeSet.isActive ? "Active" : "Inactive"}</Badge>
            <Badge variant="secondary">System: {codeSet.system || "INTERNAL"}</Badge>
            {codeSet.description ? <Badge variant="accent" className="max-w-[540px] truncate">{codeSet.description}</Badge> : null}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
              <TabsTrigger
                value="entries"
                className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white")}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Entries
              </TabsTrigger>
              <TabsTrigger
                value="mappings"
                className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white")}
              >
                <Link2 className="mr-2 h-4 w-4" />
                Mappings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="entries" className="mt-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input value={entryQ} onChange={(e) => setEntryQ(e.target.value)} placeholder="Search entries..." className="pl-10" />
                </div>
                <Button variant="primary" className="gap-2" onClick={onAddEntry}>
                  <Plus className="h-4 w-4" />
                  Add entry
                </Button>
              </div>

              <div className="mt-3 rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[220px]">Code</TableHead>
                      <TableHead>Display</TableHead>
                      <TableHead className="w-[220px]">Attributes</TableHead>
                      <TableHead className="w-[180px]">Updated</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                            <ClipboardList className="h-4 w-4" /> No entries found.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-xs">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-zc-text">{e.code}</span>
                              <span className="text-[11px] text-zc-muted">{String(e.id).slice(0, 8)}â€¦</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="font-semibold text-zc-text">{e.display}</span>
                          </TableCell>
                          <TableCell className="text-xs text-zc-muted">
                            {e.attributes ? <span className="line-clamp-2">{JSON.stringify(e.attributes)}</span> : "â€”"}
                          </TableCell>
                          <TableCell className="text-sm text-zc-muted">{fmtDateTime(e.updatedAt || e.createdAt || null)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[220px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => onEditEntry(e)}>
                                  <Wrench className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-zc-danger focus:text-zc-danger" onClick={() => void deleteEntry(e)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Retire
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="mappings" className="mt-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input value={mapQ} onChange={(e) => setMapQ(e.target.value)} placeholder="Search mapped services..." className="pl-10" />
                </div>
                <Button variant="outline" asChild className="gap-2">
                  <Link href={`/infrastructure/service-library` as any}>
                    Open full mappings <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-3 rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[260px]">Service</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead className="w-[140px]">Primary</TableHead>
                      <TableHead className="w-[180px]">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : codeSetMappings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                            <Link2 className="h-4 w-4" /> No mappings for this code set.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      codeSetMappings.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono">{m.serviceItem.code}</Badge>
                                <span className="font-semibold text-zc-text">{m.serviceItem.name}</span>
                              </div>
                              <div className="text-xs text-zc-muted">{m.serviceItem.category || "â€”"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-xs font-semibold text-zc-text">{m.entry.code}</span>
                              <span className="text-xs text-zc-muted line-clamp-1">{m.entry.display}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {m.isPrimary ? (
                              <Badge variant="ok" className="gap-1"><Star className="h-3 w-3" /> Primary</Badge>
                            ) : (
                              <Badge variant="secondary">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-zc-muted">{fmtDateTime(m.createdAt || null)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
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

/* -------------------------------------------------------------------------- */
/*                              Entry Upsert Dialog                            */
/* -------------------------------------------------------------------------- */

function EntryDialog({
  open,
  onOpenChange,
  branchId,
  codeSetId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  codeSetId: string;
  editing: StandardCodeEntryRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState<{ code: string; display: string; description: string; status: string; metaJson: string }>({
    code: "",
    display: "",
    description: "",
    status: "",
    metaJson: "",
  });

  React.useEffect(() => {
    if (!open) return;
    const attrs = editing?.attributes || {};
    setForm({
      code: editing?.code || "",
      display: editing?.display || "",
      description: (attrs?.description as any) || "",
      status: (attrs?.status as any) || "",
      metaJson: attrs && Object.keys(attrs || {}).length ? JSON.stringify(attrs, null, 2) : "",
    });
  }, [open, editing]);

  function patch(p: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    if (!branchId || !codeSetId) return;

    const payload: any = {
      code: String(form.code || "").trim(),
      display: String(form.display || "").trim(),
    };

    if (!payload.code || !payload.display) {
      toast({ title: "Missing fields", description: "Code and Display are required." });
      return;
    }

    // Optional helpers: description/status/meta
    const meta = safeParseJson(form.metaJson);
    if (meta === "__INVALID__") {
      toast({ title: "Invalid JSON", description: "Meta JSON is not valid. Fix it or clear the box." });
      return;
    }

    // If user filled specific fields, send them too
    if (String(form.description || "").trim()) payload.description = String(form.description).trim();
    if (String(form.status || "").trim()) payload.status = String(form.status).trim();
    if (meta && meta !== "__INVALID__") payload.meta = meta;

    setSaving(true);
    try {
      await apiFetch(
        `/api/infrastructure/service-library/code-sets/${encodeURIComponent(codeSetId)}/entries?${buildQS({
          branchId,
        })}`,
        { method: "POST", body: JSON.stringify(payload) },
      );

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
      <DialogContent className={modalClassName("max-w-[860px]")}>
        <ModalHeader
          title={editing ? "Edit Code Entry" : "New Code Entry"}
          description="Upsert entry into the selected code set."
          icon={<ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input
              value={form.code}
              onChange={(e) => patch({ code: e.target.value })}
              placeholder="e.g., 4548-4"
              disabled={Boolean(editing)} // safest: don't change code on edit
            />
            {editing ? (
              <div className="text-xs text-zc-muted">Code is fixed on edit (keeps history stable).</div>
            ) : (
              <div className="text-xs text-zc-muted">Keep stable for interoperability.</div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Display</Label>
            <Input value={form.display} onChange={(e) => patch({ display: e.target.value })} placeholder="e.g., Hemoglobin [Mass/volume] in Blood" />
            <div className="text-xs text-zc-muted min-h-[16px] invisible" aria-hidden="true">
              Placeholder helper
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Description (optional)</Label>
            <Input value={form.description} onChange={(e) => patch({ description: e.target.value })} placeholder="Optional description" />
          </div>

          <div className="grid gap-2">
            <Label>Status (optional)</Label>
            <Input value={form.status} onChange={(e) => patch({ status: e.target.value })} placeholder="e.g., active, retired, draft" />
          </div>

          <div className="md:col-span-2 grid gap-2">
            <Label>Meta JSON (optional)</Label>
            <Textarea value={form.metaJson} onChange={(e) => patch({ metaJson: e.target.value })} placeholder='{"source":"loinc","note":"..." }' className="min-h-[140px] font-mono text-xs" />
            <div className="text-xs text-zc-muted">If provided, must be valid JSON.</div>
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

/* -------------------------------------------------------------------------- */
/*                              Add Mapping Dialog                             */
/* -------------------------------------------------------------------------- */

function AddMappingDialog({
  open,
  onOpenChange,
  branchId,
  codeSets,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  codeSets: StandardCodeSetRow[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [svcQ, setSvcQ] = React.useState("");
  const [svcLoading, setSvcLoading] = React.useState(false);
  const [services, setServices] = React.useState<ServiceItemMiniRow[]>([]);
  const [serviceItemId, setServiceItemId] = React.useState<string>("");

  const [codeSetId, setCodeSetId] = React.useState<string>("");
  const [entryQ, setEntryQ] = React.useState("");
  const [entryLoading, setEntryLoading] = React.useState(false);
  const [entries, setEntries] = React.useState<StandardCodeEntryRow[]>([]);
  const [entryId, setEntryId] = React.useState<string>("");

  const [isPrimary, setIsPrimary] = React.useState(true);

  async function loadServices(q?: string) {
    if (!branchId) return;
    setSvcLoading(true);
    try {
      const resp = await apiFetch<ServiceItemMiniRow[]>(
        `/api/infrastructure/services?${buildQS({ branchId, q: (q ?? "").trim() || undefined, includeInactive: "true" })}`,
      );
      setServices(resp || []);
    } catch (e: any) {
      toast({ title: "Failed to load services", description: e?.message || "Request failed", variant: "destructive" as any });
      setServices([]);
    } finally {
      setSvcLoading(false);
    }
  }

  async function loadEntries(codeSetIdParam: string, q?: string) {
    if (!branchId || !codeSetIdParam) return;
    setEntryLoading(true);
    try {
      const resp = await apiFetch<StandardCodeEntryRow[]>(
        `/api/infrastructure/service-library/code-sets/${encodeURIComponent(codeSetIdParam)}/entries?${buildQS({
          branchId,
          q: (q ?? "").trim() || undefined,
        })}`,
      );
      setEntries(resp || []);
    } catch (e: any) {
      toast({ title: "Failed to load entries", description: e?.message || "Request failed", variant: "destructive" as any });
      setEntries([]);
    } finally {
      setEntryLoading(false);
    }
  }

  React.useEffect(() => {
    if (!open) return;
    setSvcQ("");
    setServices([]);
    setServiceItemId("");
    setCodeSetId("");
    setEntryQ("");
    setEntries([]);
    setEntryId("");
    setIsPrimary(true);

    void loadServices("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void loadServices(svcQ), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcQ, open]);

  React.useEffect(() => {
    if (!open || !codeSetId) return;
    setEntryId("");
    void loadEntries(codeSetId, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeSetId, open]);

  React.useEffect(() => {
    if (!open || !codeSetId) return;
    const t = setTimeout(() => void loadEntries(codeSetId, entryQ), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryQ, codeSetId, open]);

  async function save() {
    if (!branchId) return;
    if (!serviceItemId || !entryId) {
      toast({ title: "Missing selection", description: "Select a Service and an Entry." });
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/api/infrastructure/service-library/mappings?${buildQS({ branchId })}`, {
        method: "POST",
        body: JSON.stringify({ serviceItemId, codeEntryId: entryId, isPrimary }),
      });
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
          title="New Mapping"
          description="Map a Service Item to a Standard Code Entry (and optionally mark it primary)."
          icon={<Link2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
        />

        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label>Service search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
              <Input value={svcQ} onChange={(e) => setSvcQ(e.target.value)} placeholder="Search service code/name..." className="pl-10" />
            </div>

            <div className="rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[180px]">Category</TableHead>
                    <TableHead className="w-[120px]">Pick</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {svcLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-zc-muted">
                          <ClipboardList className="h-4 w-4" /> No services found.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.slice(0, 80).map((s) => {
                      const selected = s.id === serviceItemId;
                      return (
                        <TableRow key={s.id} className={selected ? "bg-zc-panel/20" : ""}>
                          <TableCell className="font-mono text-xs">
                            <span className={cn("font-semibold", selected ? "text-zc-accent" : "text-zc-text")}>{s.code}</span>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="font-semibold text-zc-text">{s.name}</span>
                          </TableCell>
                          <TableCell className="text-sm text-zc-muted">{s.category || "â€”"}</TableCell>
                          <TableCell>
                            <Button variant={selected ? "primary" : "outline"} size="sm" onClick={() => setServiceItemId(s.id)}>
                              {selected ? "Selected" : "Select"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="text-xs text-zc-muted">Tip: if you have many services, search by code prefix.</div>
          </div>

          <Separator />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Code Set</Label>
              <Select value={codeSetId} onValueChange={setCodeSetId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select code set..." />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {codeSets.filter((x) => x.isActive).map((cs) => (
                    <SelectItem key={cs.id} value={cs.id}>
                      {cs.code} â€¢ {cs.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
              <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
              <div>
                <div className="text-sm font-semibold text-zc-text">Primary mapping</div>
                <div className="text-sm text-zc-muted">If enabled, this becomes the primary code for that service item.</div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Entry search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
              <Input
                value={entryQ}
                onChange={(e) => setEntryQ(e.target.value)}
                placeholder={codeSetId ? "Search entry code/display..." : "Select a code set first"}
                className="pl-10"
                disabled={!codeSetId}
              />
            </div>

            <div className="rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Code</TableHead>
                    <TableHead>Display</TableHead>
                    <TableHead className="w-[120px]">Pick</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!codeSetId ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-zc-muted">
                          <AlertTriangle className="h-4 w-4 text-zc-warn" /> Select a code set to load entries.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : entryLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={3}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-zc-muted">
                          <ClipboardList className="h-4 w-4" /> No entries found.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.slice(0, 120).map((e) => {
                      const selected = e.id === entryId;
                      return (
                        <TableRow key={e.id} className={selected ? "bg-zc-panel/20" : ""}>
                          <TableCell className="font-mono text-xs">
                            <span className={cn("font-semibold", selected ? "text-zc-accent" : "text-zc-text")}>{e.code}</span>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="text-zc-text">{e.display}</span>
                          </TableCell>
                          <TableCell>
                            <Button variant={selected ? "primary" : "outline"} size="sm" onClick={() => setEntryId(e.id)}>
                              {selected ? "Selected" : "Select"}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
