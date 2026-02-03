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

import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  User,
  Wrench,
  XCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type FixItSeverity = "INFO" | "WARN" | "BLOCKER" | string;
type FixItStatus = "OPEN" | "RESOLVED" | "IGNORED" | "DISMISSED" | "SNOOZED" | string;

type FixItRow = {
  id: string;
  branchId: string;

  module?: string | null; // BILLING / INFRA / DIAGNOSTICS ...
  category?: string | null; // TARIFF_COVERAGE / TAX_INACTIVE / CHARGE_UNIT_MISMATCH ...
  code?: string | null;

  title: string;
  message?: string | null;

  severity: FixItSeverity;
  status: FixItStatus;

  entityType?: string | null; // TariffPlan / TariffRate / ChargeMasterItem / TaxCode / ServiceItem ...
  entityId?: string | null;
  entityCode?: string | null;

  autoResolvable?: boolean | null;
  suggestedFix?: string | null;
  meta?: any;

  openedById?: string | null;
  openedByName?: string | null;

  resolvedById?: string | null;
  resolvedByName?: string | null;
  resolutionNote?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
  resolvedAt?: string | null;
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

function severityBadge(sev: FixItSeverity) {
  const s = String(sev || "").toUpperCase();
  if (s === "BLOCKER" || s === "CRITICAL" || s === "P0") return <Badge variant="warning">BLOCKER</Badge>;
  if (s === "WARN" || s === "WARNING" || s === "P1") return <Badge variant="secondary">WARN</Badge>;
  return <Badge variant="ok">INFO</Badge>;
}

function statusBadge(st: FixItStatus) {
  const s = String(st || "").toUpperCase();
  if (s === "OPEN") return <Badge variant="warning">OPEN</Badge>;
  if (s === "RESOLVED") return <Badge variant="ok">RESOLVED</Badge>;
  if (s === "SNOOZED") return <Badge variant="secondary">SNOOZED</Badge>;
  return <Badge variant="secondary">{s || "—"}</Badge>;
}

function looksLikeWhitelistError(msg?: string) {
  const s = (msg || "").toLowerCase();
  return (
    (s.includes("property") && s.includes("should not exist")) ||
    s.includes("whitelist") ||
    s.includes("non-whitelisted")
  );
}

async function apiTryMany<T>(urls: { url: string; init?: RequestInit }[]) {
  let lastErr: any = null;
  for (const u of urls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await apiFetch<T>(u.url, u.init as any);
    } catch (e: any) {
      lastErr = e;
      if (!(e instanceof ApiError && e.status === 404)) break;
    }
  }
  throw lastErr || new Error("Request failed");
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function SuperAdminFixItPage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";


  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [tab, setTab] = React.useState<"open" | "resolved" | "all">("open");

  const [q, setQ] = React.useState("");
  const [severity, setSeverity] = React.useState<string>("all");
  const [module, setModule] = React.useState<string>("all");
  const [category, setCategory] = React.useState<string>("all");
  const [includeSnoozed, setIncludeSnoozed] = React.useState(false);

  const [rows, setRows] = React.useState<FixItRow[]>([]);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<FixItRow | null>(null);

  const [note, setNote] = React.useState<string>("");

  const mustSelectBranch = !branchId;

  async function loadBranches(): Promise<string | null> {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = (effectiveBranchId || null);
    const firstId = list[0]?.id || null;
    const next = (stored && list.some((b) => b.id === stored) ? stored : null) || firstId;

    if (next) if (isGlobalScope) setActiveBranchId(next || null);
setBranchId(next || "");
    return next;
  }

  function buildStatusFilter() {
    if (tab === "open") return includeSnoozed ? "OPEN,SNOOZED" : "OPEN";
    if (tab === "resolved") return "RESOLVED";
    return "ALL";
  }

  async function loadFixIts(bid: string, showToast = false) {
    setErr(null);
    setLoading(true);
    try {
      const qs = buildQS({
        branchId: bid,
        status: buildStatusFilter(),
        q: q.trim() || undefined,
        severity: severity !== "all" ? severity : undefined,
        module: module !== "all" ? module : undefined,
        category: category !== "all" ? category : undefined,
        take: 200,
      });

      const res = await apiTryMany<any>([
        { url: `/api/infrastructure/fixit?${qs}` },
        { url: `/api/infrastructure/fixits?${qs}` },
        { url: `/api/infra/fixit?${qs}` },
        { url: `/api/infra/fixits?${qs}` },
      ]);

      const list: FixItRow[] = Array.isArray(res) ? res : (res?.rows || res?.items || []);
      setRows(list);

      if (showToast) toast({ title: "FixIt refreshed", description: "Loaded latest issues for this branch." });
    } catch (e: any) {
      const msg = e?.message || "Failed to load FixIt inbox";
      setErr(msg);
      setRows([]);
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
      await loadFixIts(bid, showToast);
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
    void loadFixIts(branchId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, tab, includeSnoozed, severity, module, category]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadFixIts(branchId, false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function onBranchChange(nextId: string) {
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
setSelected(null);
    setDetailOpen(false);
    setNote("");
    setQ("");
    setSeverity("all");
    setModule("all");
    setCategory("all");
    setIncludeSnoozed(false);
    setTab("open");

    await loadFixIts(nextId, true);
  }

  const stats = React.useMemo(() => {
    const open = rows.filter((r) => String(r.status).toUpperCase() === "OPEN").length;
    const snoozed = rows.filter((r) => String(r.status).toUpperCase() === "SNOOZED").length;
    const resolved = rows.filter((r) => String(r.status).toUpperCase() === "RESOLVED").length;
    const blocker = rows.filter((r) => String(r.severity).toUpperCase() === "BLOCKER").length;
    const auto = rows.filter((r) => Boolean(r.autoResolvable)).length;
    return { open, snoozed, resolved, blocker, auto, total: rows.length };
  }, [rows]);

  function openDetail(r: FixItRow) {
    setSelected(r);
    setNote(r.resolutionNote || "");
    setDetailOpen(true);
  }

  async function actResolve(id: string) {
    if (!branchId) return;
    setBusy(true);
    try {
      const payloadFull: any = { note: note?.trim() || null, resolutionNote: note?.trim() || null, status: "RESOLVED" };
      const payloadMin: any = { status: "RESOLVED" };

      try {
        await apiTryMany([
          { url: `/api/infrastructure/fixit/${encodeURIComponent(id)}/resolve`, init: { method: "POST", body: JSON.stringify(payloadFull) } },
          { url: `/api/infra/fixit/${encodeURIComponent(id)}/resolve`, init: { method: "POST", body: JSON.stringify(payloadFull) } },
          { url: `/api/infrastructure/fixit/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify(payloadFull) } },
          { url: `/api/infra/fixit/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify(payloadFull) } },
          { url: `/api/infrastructure/fixits/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify(payloadFull) } },
          { url: `/api/infra/fixits/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify(payloadFull) } },
        ]);
      } catch (e: any) {
        const msg = e?.message || "";
        if (e instanceof ApiError && e.status === 400 && looksLikeWhitelistError(msg)) {
          await apiTryMany([
            { url: `/api/infrastructure/fixit/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify(payloadMin) } },
            { url: `/api/infra/fixit/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify(payloadMin) } },
            { url: `/api/infrastructure/fixits/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify(payloadMin) } },
            { url: `/api/infra/fixits/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify(payloadMin) } },
          ]);
        } else {
          throw e;
        }
      }

      toast({ title: "Resolved", description: "FixIt marked as resolved." });
      setDetailOpen(false);
      setSelected(null);
      setNote("");
      await loadFixIts(branchId, false);
    } catch (e: any) {
      toast({ title: "Resolve failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function actReopen(id: string) {
    if (!branchId) return;
    setBusy(true);
    try {
      await apiTryMany([
        { url: `/api/infrastructure/fixit/${encodeURIComponent(id)}/reopen`, init: { method: "POST" } },
        { url: `/api/infra/fixit/${encodeURIComponent(id)}/reopen`, init: { method: "POST" } },
        { url: `/api/infrastructure/fixit/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify({ status: "OPEN" }) } },
        { url: `/api/infra/fixit/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify({ status: "OPEN" }) } },
        { url: `/api/infrastructure/fixits/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify({ status: "OPEN" }) } },
        { url: `/api/infra/fixits/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify({ status: "OPEN" }) } },
      ]);
      toast({ title: "Reopened", description: "FixIt is open again." });
      await loadFixIts(branchId, false);
    } catch (e: any) {
      toast({ title: "Reopen failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function actDismiss(id: string) {
    if (!branchId) return;
    const ok = window.confirm("Dismiss/ignore this FixIt? (Use only when it is not applicable.)");
    if (!ok) return;

    setBusy(true);
    try {
      await apiTryMany([
        { url: `/api/infrastructure/fixit/${encodeURIComponent(id)}/dismiss`, init: { method: "POST" } },
        { url: `/api/infra/fixit/${encodeURIComponent(id)}/dismiss`, init: { method: "POST" } },
        { url: `/api/infrastructure/fixit/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify({ status: "DISMISSED" }) } },
        { url: `/api/infra/fixit/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify({ status: "DISMISSED" }) } },
        { url: `/api/infrastructure/fixits/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify({ status: "DISMISSED" }) } },
        { url: `/api/infra/fixits/${encodeURIComponent(id)}`, init: { method: "PATCH", body: JSON.stringify({ status: "DISMISSED" }) } },
      ]);
      toast({ title: "Dismissed", description: "FixIt dismissed." });
      setDetailOpen(false);
      setSelected(null);
      setNote("");
      await loadFixIts(branchId, false);
    } catch (e: any) {
      toast({ title: "Dismiss failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function actDeleteHard(id: string) {
    if (!branchId) return;
    const ok = window.confirm("Hard delete this FixIt? (Not recommended in production; you lose audit history.)");
    if (!ok) return;

    setBusy(true);
    try {
      await apiTryMany([
        { url: `/api/infrastructure/fixit/${encodeURIComponent(id)}`, init: { method: "DELETE" } },
        { url: `/api/infra/fixit/${encodeURIComponent(id)}`, init: { method: "DELETE" } },
        { url: `/api/infrastructure/fixits/${encodeURIComponent(id)}`, init: { method: "DELETE" } },
        { url: `/api/infra/fixits/${encodeURIComponent(id)}`, init: { method: "DELETE" } },
      ]);
      toast({ title: "Deleted", description: "FixIt deleted." });
      setDetailOpen(false);
      setSelected(null);
      setNote("");
      await loadFixIts(branchId, false);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  const modules = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const m = String(r.module || "").trim();
      if (m) set.add(m);
    });
    return Array.from(set).sort();
  }, [rows]);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const c = String(r.category || "").trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [rows]);

  return (
    <AppShell title="Infrastructure • FixIt Inbox">
      <RequirePerm perm="INFRA_FIXIT_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Wrench className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">FixIt Inbox</div>
              <div className="mt-1 text-sm text-zc-muted">
                System-generated issues that block GoLive or cause billing/runtime inconsistencies. Resolve here, then re-run GoLive.
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
                <CheckCircle2 className="h-4 w-4" />
                GoLive
              </Link>
            </Button> */}

            <Button variant="outline" asChild className="px-5 gap-2 whitespace-nowrap shrink-0">
              <Link href="/infrastructure/tariff-plans">
                <ExternalLink className="h-4 w-4" />
                Tariff Plans
              </Link>
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load FixIt inbox</CardTitle>
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
              FixIts should be audit-safe and branch-scoped. Prefer resolve / reopen / dismiss over hard delete.
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

            <div className="grid gap-3 md:grid-cols-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Open</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{stats.open}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-900/50 dark:bg-slate-900/10">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Snoozed</div>
                <div className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-300">{stats.snoozed}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Resolved</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.resolved}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
                <div className="text-xs font-medium text-rose-700 dark:text-rose-300">Blockers</div>
                <div className="mt-1 text-lg font-bold text-rose-800 dark:text-rose-200">{stats.blocker}</div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Auto-resolvable</div>
                <div className="mt-1 text-lg font-bold text-indigo-800 dark:text-indigo-200">{stats.auto}</div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by title, code, entity…"
                  className="pl-10"
                  disabled={mustSelectBranch}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2" disabled>
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>

                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={includeSnoozed} onCheckedChange={setIncludeSnoozed} disabled={mustSelectBranch || tab !== "open"} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">Include snoozed</div>
                    <div className="text-xs text-zc-muted">Open tab only</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity} disabled={mustSelectBranch}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="BLOCKER">BLOCKER</SelectItem>
                    <SelectItem value="WARN">WARN</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Module</Label>
                <Select value={module} onValueChange={setModule} disabled={mustSelectBranch}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {modules.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory} disabled={mustSelectBranch}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Branch scoped</Badge>
              <Badge variant="warning">Blockers stop GoLive</Badge>
              <Badge variant="ok">Resolve creates audit trail</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Inbox */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Inbox</CardTitle>
                <CardDescription>Click a row to open details and take action.</CardDescription>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full md:w-auto">
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="open"
                    className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                  >
                    Open
                  </TabsTrigger>
                  <TabsTrigger
                    value="resolved"
                    className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                  >
                    Resolved
                  </TabsTrigger>
                  <TabsTrigger
                    value="all"
                    className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                  >
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <div className="rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Severity</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead className="w-[220px]">Entity</TableHead>
                    <TableHead className="w-[160px]">Module</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[56px]" />
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
                          <ShieldAlert className="h-4 w-4" />
                          No FixIts found for current filters.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => openDetail(r)}>
                        <TableCell>{severityBadge(r.severity)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-zc-text">{r.title}</span>
                              {r.autoResolvable ? <Badge variant="ok">AUTO</Badge> : null}
                              {r.code ? <Badge variant="secondary" className="font-mono">{r.code}</Badge> : null}
                              {r.category ? <Badge variant="secondary">{r.category}</Badge> : null}
                            </div>
                            <div className="text-sm text-zc-muted line-clamp-1">{r.message || r.suggestedFix || "—"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-zc-muted">
                            <div className="font-semibold text-zc-text">{r.entityType || "—"}</div>
                            <div className="font-mono text-xs">{r.entityCode || r.entityId || "—"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-zc-muted">{r.module || "—"}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[240px]">
                              <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelected(r);
                                  setNote(r.resolutionNote || "");
                                  setDetailOpen(true);
                                }}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => actResolve(r.id)}
                                disabled={busy || String(r.status).toUpperCase() === "RESOLVED"}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Resolve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => actReopen(r.id)}
                                disabled={busy || String(r.status).toUpperCase() === "OPEN"}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reopen
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => actDismiss(r.id)} disabled={busy}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Dismiss
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

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Last refresh: {fmtDateTime(new Date().toISOString())}</Badge>
              <Badge variant="ok">Tip: resolve blockers first</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Drawer */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className={drawerClassName()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              FixIt Details
            </DialogTitle>
            <DialogDescription>
              Review the issue, suggested fix, and mark it resolved (audit-safe).
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="px-6 pb-6 grid gap-5">
            {!selected ? (
              <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                Select a FixIt row from the table.
              </div>
            ) : (
              <>
                <div className="grid gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {severityBadge(selected.severity)}
                    {statusBadge(selected.status)}
                    {selected.module ? <Badge variant="secondary">{selected.module}</Badge> : null}
                    {selected.category ? <Badge variant="secondary">{selected.category}</Badge> : null}
                    {selected.code ? <Badge variant="secondary" className="font-mono">{selected.code}</Badge> : null}
                    {selected.autoResolvable ? <Badge variant="ok">AUTO</Badge> : null}
                  </div>

                  <div className="text-lg font-semibold text-zc-text">{selected.title}</div>
                  <div className="text-sm text-zc-muted">{selected.message || "—"}</div>

                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                      <div className="text-xs font-medium text-zc-muted">Entity</div>
                      <div className="mt-1 text-sm font-semibold text-zc-text">{selected.entityType || "—"}</div>
                      <div className="mt-1 text-xs font-mono text-zc-muted">{selected.entityCode || selected.entityId || "—"}</div>
                    </div>

                    <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                      <div className="text-xs font-medium text-zc-muted">Audit</div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-zc-muted">
                        <User className="h-4 w-4" />
                        Opened:{" "}
                        <span className="font-semibold text-zc-text">{selected.openedByName || selected.openedById || "System"}</span>
                      </div>
                      <div className="mt-1 text-xs text-zc-muted">Created: {fmtDateTime(selected.createdAt)}</div>
                      <div className="mt-1 text-xs text-zc-muted">Updated: {fmtDateTime(selected.updatedAt)}</div>
                      <div className="mt-1 text-xs text-zc-muted">Resolved: {fmtDateTime(selected.resolvedAt)}</div>
                    </div>
                  </div>

                  {selected.suggestedFix ? (
                    <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-sm text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-900/10 dark:text-indigo-200">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="mt-0.5 h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                        <div>
                          <div className="font-semibold">Suggested fix</div>
                          <div className="mt-1 opacity-90">{selected.suggestedFix}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {selected.meta ? (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.alert(JSON.stringify(selected.meta, null, 2))}
                      >
                        <ExternalLink className="h-4 w-4" />
                        View meta JSON
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label>Resolution note (optional)</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[120px]" />
                  <div className="text-xs text-zc-muted">
                    Keep it short: what you changed (tariff mapping updated, tax activated, charge unit corrected, etc.).
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    className="gap-2"
                    onClick={() => actResolve(selected.id)}
                    disabled={busy || String(selected.status).toUpperCase() === "RESOLVED"}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve
                  </Button>

                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => actReopen(selected.id)}
                    disabled={busy || String(selected.status).toUpperCase() === "OPEN"}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reopen
                  </Button>

                  <Button variant="outline" className="gap-2" onClick={() => actDismiss(selected.id)} disabled={busy}>
                    <XCircle className="h-4 w-4" />
                    Dismiss
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2" disabled={busy}>
                        <MoreHorizontal className="h-4 w-4" />
                        More
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[240px]">
                      <DropdownMenuLabel>Danger zone</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => actDeleteHard(selected.id)} className="text-zc-danger">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hard delete (not recommended)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Separator />

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <Link href="/infrastructure/golive">
                      <CheckCircle2 className="h-4 w-4" />
                      GoLive checks
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <Link href="/infrastructure/tax-codes">
                      <ExternalLink className="h-4 w-4" />
                      Tax Codes
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <Link href="/infrastructure/charge-master">
                      <ExternalLink className="h-4 w-4" />
                      Charge Master
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <Link href="/infrastructure/tariff-plans">
                      <ExternalLink className="h-4 w-4" />
                      Tariff Plans
                    </Link>
                  </Button>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)} disabled={busy}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
          </RequirePerm>
</AppShell>
  );
}
