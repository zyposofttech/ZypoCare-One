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
  Loader2,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Wrench,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type GoLiveSeverity = "INFO" | "WARN" | "BLOCKER" | string;
type GoLiveStatus = "PASS" | "FAIL" | "WARN" | "SKIP" | string;

type GoLiveCheckRow = {
  id?: string;
  code: string; // e.g., BILLING_TARIFF_COVERAGE
  title: string;
  description?: string | null;

  module?: string | null; // BILLING / INFRA / DIAGNOSTICS ...
  severity: GoLiveSeverity;
  status: GoLiveStatus;

  // counts / helpful info
  metric?: string | null; // e.g. "128/144 mapped"
  missingCount?: number | null;
  totalCount?: number | null;

  // FixIt linkage
  fixItCount?: number | null;
  fixItIds?: string[] | null;

  // actions
  canAutoFix?: boolean | null;
  autoFixHint?: string | null;

  // raw details
  details?: any;
};

type GoLiveRunResult = {
  branchId: string;
  ranAt: string;
  summary?: {
    blockers?: number;
    warns?: number;
    passes?: number;
    total?: number;
  };
  checks: GoLiveCheckRow[];
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

function severityBadge(sev: GoLiveSeverity) {
  const s = String(sev || "").toUpperCase();
  if (s === "BLOCKER" || s === "CRITICAL" || s === "P0") return <Badge variant="warning">BLOCKER</Badge>;
  if (s === "WARN" || s === "WARNING" || s === "P1") return <Badge variant="secondary">WARN</Badge>;
  return <Badge variant="ok">INFO</Badge>;
}

function statusBadge(st: GoLiveStatus) {
  const s = String(st || "").toUpperCase();
  if (s === "PASS") return <Badge variant="ok">PASS</Badge>;
  if (s === "FAIL") return <Badge variant="warning">FAIL</Badge>;
  if (s === "WARN") return <Badge variant="secondary">WARN</Badge>;
  return <Badge variant="secondary">{s || "—"}</Badge>;
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

function normalizeRunResult(payload: any, branchId: string): GoLiveRunResult {
  // support multiple shapes:
  // - {checks:[...], summary:{...}, ranAt:""}
  // - [...checks]
  // - {rows:[...]} etc
  if (Array.isArray(payload)) {
    return { branchId, ranAt: new Date().toISOString(), checks: payload };
  }
  const checks = payload?.checks || payload?.rows || payload?.items || [];
  const summary = payload?.summary || payload?.result || null;
  const ranAt = payload?.ranAt || payload?.createdAt || new Date().toISOString();
  return { branchId, ranAt, summary: summary || undefined, checks };
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function SuperAdminGoLivePage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";


  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [tab, setTab] = React.useState<"all" | "blockers" | "warns" | "passed">("all");
  const [q, setQ] = React.useState("");
  const [module, setModule] = React.useState<string>("all");
  const [onlyActionable, setOnlyActionable] = React.useState(false);

  const [result, setResult] = React.useState<GoLiveRunResult | null>(null);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<GoLiveCheckRow | null>(null);
  const [note, setNote] = React.useState("");

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

  async function runChecks(bid: string, showToast = false) {
    setErr(null);
    setRunning(true);
    try {
      const qs = buildQS({ branchId: bid });

      // Try common endpoint variants (matches your Infra/FixIt pattern).
      const payload = await apiTryMany<any>([
        { url: `/api/infrastructure/golive/run?${qs}`, init: { method: "POST" } },
        { url: `/api/infra/golive/run?${qs}`, init: { method: "POST" } },
        { url: `/api/infrastructure/golive?${qs}` },
        { url: `/api/infra/golive?${qs}` },
        { url: `/api/infrastructure/golive/checks?${qs}` },
        { url: `/api/infra/golive/checks?${qs}` },
      ]);

      const normalized = normalizeRunResult(payload, bid);
      setResult(normalized);

      if (showToast) toast({ title: "GoLive checks completed", description: "Review blockers and fix them via FixIt." });
    } catch (e: any) {
      const msg = e?.message || "Failed to run GoLive checks";
      setErr(msg);
      setResult(null);
      if (showToast) toast({ title: "GoLive run failed", description: msg, variant: "destructive" as any });
    } finally {
      setRunning(false);
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
      await runChecks(bid, showToast);
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
    void runChecks(branchId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function onBranchChange(nextId: string) {
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
setSelected(null);
    setDetailOpen(false);
    setNote("");
    setQ("");
    setModule("all");
    setOnlyActionable(false);
    setTab("all");

    await runChecks(nextId, true);
  }

  const checks = result?.checks || [];

  const modules = React.useMemo(() => {
    const set = new Set<string>();
    checks.forEach((c) => {
      const m = String(c.module || "").trim();
      if (m) set.add(m);
    });
    return Array.from(set).sort();
  }, [checks]);

  const filtered = React.useMemo(() => {
    let list = [...checks];

    if (tab === "blockers") {
      list = list.filter((c) => String(c.severity).toUpperCase() === "BLOCKER" || String(c.status).toUpperCase() === "FAIL");
    } else if (tab === "warns") {
      list = list.filter((c) => String(c.severity).toUpperCase() === "WARN" || String(c.status).toUpperCase() === "WARN");
    } else if (tab === "passed") {
      list = list.filter((c) => String(c.status).toUpperCase() === "PASS");
    }

    if (module !== "all") {
      list = list.filter((c) => String(c.module || "").toUpperCase() === module.toUpperCase());
    }

    if (onlyActionable) {
      list = list.filter((c) => (c.fixItCount ?? 0) > 0 || Boolean(c.canAutoFix));
    }

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((c) => {
        const hay = `${c.code} ${c.title} ${c.description || ""} ${c.module || ""}`.toLowerCase();
        return hay.includes(needle);
      });
    }

    return list;
  }, [checks, tab, module, onlyActionable, q]);

  const summary = React.useMemo(() => {
    const total = checks.length;
    const blockers = checks.filter((c) => String(c.severity).toUpperCase() === "BLOCKER" || String(c.status).toUpperCase() === "FAIL").length;
    const warns = checks.filter((c) => String(c.severity).toUpperCase() === "WARN" || String(c.status).toUpperCase() === "WARN").length;
    const passes = checks.filter((c) => String(c.status).toUpperCase() === "PASS").length;

    const fixits = checks.reduce((acc, c) => acc + (c.fixItCount ?? 0), 0);
    const actionable = checks.filter((c) => (c.fixItCount ?? 0) > 0 || Boolean(c.canAutoFix)).length;

    return {
      total,
      blockers,
      warns,
      passes,
      fixits,
      actionable,
      ranAt: result?.ranAt || null,
    };
  }, [checks, result]);

  function openDetail(c: GoLiveCheckRow) {
    setSelected(c);
    setNote("");
    setDetailOpen(true);
  }

  async function autoFixSelected() {
    if (!selected || !branchId) return;
    if (!selected.canAutoFix) {
      toast({ title: "Not supported", description: "This check does not support auto-fix." });
      return;
    }

    setBusy(true);
    try {
      // Try auto-fix endpoints (optional backend support)
      const payload = { branchId, code: selected.code, note: note?.trim() || null };
      await apiTryMany([
        { url: `/api/infrastructure/golive/autofix`, init: { method: "POST", body: JSON.stringify(payload) } },
        { url: `/api/infra/golive/autofix`, init: { method: "POST", body: JSON.stringify(payload) } },
        { url: `/api/infrastructure/golive/${encodeURIComponent(selected.code)}/autofix?${buildQS({ branchId })}`, init: { method: "POST", body: JSON.stringify({ note: note?.trim() || null }) } },
        { url: `/api/infra/golive/${encodeURIComponent(selected.code)}/autofix?${buildQS({ branchId })}`, init: { method: "POST", body: JSON.stringify({ note: note?.trim() || null }) } },
      ]);

      toast({ title: "Auto-fix executed", description: "Re-running GoLive checks now." });
      setDetailOpen(false);
      setSelected(null);
      setNote("");
      await runChecks(branchId, false);
    } catch (e: any) {
      toast({ title: "Auto-fix failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure • GoLive">
      <RequirePerm perm="INFRA_GOLIVE_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ShieldCheck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">GoLive</div>
              <div className="mt-1 text-sm text-zc-muted">
                Pre-launch validation. Blockers must be resolved before enabling operational workflows.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
            <Button variant="outline" className="px-5 gap-2 whitespace-nowrap shrink-0" onClick={() => refreshAll(true)} disabled={loading || running || busy}>
              <RefreshCw className={running ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Run checks
            </Button>

            <Button variant="outline" asChild className="px-5 gap-2 whitespace-nowrap shrink-0">
              <Link href="/infrastructure/fixit">
                <Wrench className="h-4 w-4" />
                FixIt Inbox
              </Link>
            </Button>

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
                  <CardTitle className="text-base">Could not run GoLive checks</CardTitle>
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
              Run this after configuration changes. If blockers exist, fix them in FixIt and re-run.
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
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
                <div className="text-xs font-medium text-rose-700 dark:text-rose-300">Blockers</div>
                <div className="mt-1 text-lg font-bold text-rose-800 dark:text-rose-200">{summary.blockers}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Warnings</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{summary.warns}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Passed</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{summary.passes}</div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Checks</div>
                <div className="mt-1 text-lg font-bold text-indigo-800 dark:text-indigo-200">{summary.total}</div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">FixIts linked</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{summary.fixits}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-900/50 dark:bg-slate-900/10">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Actionable</div>
                <div className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-300">{summary.actionable}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search checks…" disabled={mustSelectBranch} />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="grid gap-2">
                  <Label className="sr-only">Module</Label>
                  <Select value={module} onValueChange={setModule} disabled={mustSelectBranch}>
                    <SelectTrigger className="h-10 w-[220px]">
                      <SelectValue placeholder="Module" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All modules</SelectItem>
                      {modules.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={onlyActionable} onCheckedChange={setOnlyActionable} disabled={mustSelectBranch} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">Only actionable</div>
                    <div className="text-xs text-zc-muted">FixIt or AutoFix</div>
                  </div>
                </div>

                <Badge variant="secondary">Last run: {fmtDateTime(summary.ranAt)}</Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">Blockers stop GoLive</Badge>
              <Badge variant="secondary">Warnings are recommended fixes</Badge>
              <Badge variant="ok">Pass means safe</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Checks */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Checks</CardTitle>
                <CardDescription>Click a check to view details and next actions.</CardDescription>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full md:w-auto">
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="all"
                    className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="blockers"
                    className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                  >
                    Blockers
                  </TabsTrigger>
                  <TabsTrigger
                    value="warns"
                    className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                  >
                    Warns
                  </TabsTrigger>
                  <TabsTrigger
                    value="passed"
                    className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}
                  >
                    Passed
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
                    <TableHead>Check</TableHead>
                    <TableHead className="w-[160px]">Status</TableHead>
                    <TableHead className="w-[180px]">Module</TableHead>
                    <TableHead className="w-[190px]">Metric</TableHead>
                    <TableHead className="w-[120px]">FixIt</TableHead>
                    <TableHead className="w-[56px]" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading || running ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                          <ShieldCheck className="h-4 w-4" />
                          No checks match current filters.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.code} className="cursor-pointer" onClick={() => openDetail(c)}>
                        <TableCell>{severityBadge(c.severity)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-zc-text">{c.title}</span>
                              <Badge variant="secondary" className="font-mono">
                                {c.code}
                              </Badge>
                              {c.canAutoFix ? <Badge variant="ok">AUTO</Badge> : null}
                            </div>
                            <div className="text-sm text-zc-muted line-clamp-1">{c.description || "—"}</div>
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(c.status)}</TableCell>
                        <TableCell className="text-sm text-zc-muted">{c.module || "—"}</TableCell>
                        <TableCell className="text-sm text-zc-muted">
                          {c.metric || (c.totalCount != null ? `${c.totalCount - (c.missingCount ?? 0)}/${c.totalCount}` : "—")}
                        </TableCell>
                        <TableCell className="text-sm text-zc-muted">
                          {(c.fixItCount ?? 0) > 0 ? <Badge variant="warning">{c.fixItCount}</Badge> : <Badge variant="secondary">0</Badge>}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
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
                                  setSelected(c);
                                  setDetailOpen(true);
                                }}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open details
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href="/infrastructure/fixit">
                                  <Wrench className="mr-2 h-4 w-4" />
                                  View FixIt inbox
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
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Last run: {fmtDateTime(summary.ranAt)}</Badge>
              {summary.blockers > 0 ? <Badge variant="warning">Resolve blockers to proceed</Badge> : <Badge variant="ok">No blockers</Badge>}
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
                {selected && (String(selected.status).toUpperCase() === "PASS") ? (
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <ShieldX className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              GoLive Check Details
            </DialogTitle>
            <DialogDescription>
              Understand what’s blocking GoLive and jump to FixIt or (optional) AutoFix.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="px-6 pb-6 grid gap-5">
            {!selected ? (
              <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                Select a check from the list.
              </div>
            ) : (
              <>
                <div className="grid gap-2 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {severityBadge(selected.severity)}
                    {statusBadge(selected.status)}
                    {selected.module ? <Badge variant="secondary">{selected.module}</Badge> : null}
                    <Badge variant="secondary" className="font-mono">{selected.code}</Badge>
                    {selected.canAutoFix ? <Badge variant="ok">AUTO</Badge> : null}
                  </div>

                  <div className="text-lg font-semibold text-zc-text">{selected.title}</div>
                  <div className="text-sm text-zc-muted">{selected.description || "—"}</div>

                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                      <div className="text-xs font-medium text-zc-muted">Metric</div>
                      <div className="mt-1 text-sm font-semibold text-zc-text">
                        {selected.metric || (selected.totalCount != null ? `${selected.totalCount - (selected.missingCount ?? 0)}/${selected.totalCount}` : "—")}
                      </div>
                      <div className="mt-1 text-xs text-zc-muted">
                        Missing: <span className="font-semibold text-zc-text">{selected.missingCount ?? 0}</span>
                        <span className="mx-2">•</span>
                        FixIts: <span className="font-semibold text-zc-text">{selected.fixItCount ?? 0}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                      <div className="text-xs font-medium text-zc-muted">Run info</div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-zc-muted">
                        <Loader2 className={running ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                        Last run: <span className="font-semibold text-zc-text">{fmtDateTime(summary.ranAt)}</span>
                      </div>
                      <div className="mt-1 text-xs text-zc-muted">Branch: {branchId || "—"}</div>
                    </div>
                  </div>

                  {selected.autoFixHint ? (
                    <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-sm text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-900/10 dark:text-indigo-200">
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                        <div>
                          <div className="font-semibold">AutoFix hint</div>
                          <div className="mt-1 opacity-90">{selected.autoFixHint}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {selected.details ? (
                    <div className="mt-2">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => window.alert(JSON.stringify(selected.details, null, 2))}>
                        <ExternalLink className="h-4 w-4" />
                        View details JSON
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label>Note (optional)</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[110px]" />
                  <div className="text-xs text-zc-muted">
                    Optional: why you ran AutoFix or what you plan to change (keeps operator intent visible).
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="gap-2" asChild>
                    <Link href="/infrastructure/fixit">
                      <Wrench className="h-4 w-4" />
                      Open FixIt Inbox
                    </Link>
                  </Button>

                  <Button variant="outline" className="gap-2" onClick={() => runChecks(branchId, true)} disabled={!branchId || running || busy}>
                    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Re-run checks
                  </Button>

                  <Button
                    variant="primary"
                    className="gap-2"
                    onClick={autoFixSelected}
                    disabled={!selected.canAutoFix || busy || running}
                    title={selected.canAutoFix ? "Execute auto-fix (if backend supports it)" : "AutoFix not supported"}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    AutoFix (if enabled)
                  </Button>
                </div>

                <Separator />

                <div className="flex flex-wrap items-center gap-2">
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
