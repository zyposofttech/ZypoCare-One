"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import {
  AlertTriangle,
  ExternalLink,
  Filter,
  Eye,
  Plus,
  RefreshCw,
  Receipt,
  Search,
  Wrench,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type ServiceChargeUnit =
  | "PER_UNIT"
  | "PER_VISIT"
  | "PER_TEST"
  | "PER_HOUR"
  | "PER_DAY"
  | "PER_SIDE"
  | "PER_LEVEL"
  | "PER_SESSION"
  | "PER_PROCEDURE"
  | "PER_PACKAGE";

type TaxType = "GST" | "TDS" | "OTHER";

type TaxCodeRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  taxType: TaxType;
  ratePercent: string | number;
  isActive: boolean;
  hsnSac?: string | null;
};

type ChargeMasterRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;

  category?: string | null;
  unit?: string | null;

  // Advanced billing (may be missing if backend not updated yet)
  chargeUnit?: ServiceChargeUnit | null;
  taxCodeId?: string | null;
  taxCode?: TaxCodeRow | null;
  isTaxInclusive?: boolean | null;
  hsnSac?: string | null;
  billingPolicy?: any | null;

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;

  _count?: {
    tariffRates?: number;
    mappings?: number;
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

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

function activeBadge(isActive: boolean) {
  return isActive ? <Badge variant="ok">ACTIVE</Badge> : <Badge variant="secondary">INACTIVE</Badge>;
}

function unitLabel(u?: ServiceChargeUnit | null) {
  const x = u || "PER_UNIT";
  switch (x) {
    case "PER_UNIT":
      return "Per Unit";
    case "PER_VISIT":
      return "Per Visit";
    case "PER_TEST":
      return "Per Test";
    case "PER_HOUR":
      return "Per Hour";
    case "PER_DAY":
      return "Per Day";
    case "PER_SIDE":
      return "Per Side";
    case "PER_LEVEL":
      return "Per Level";
    case "PER_SESSION":
      return "Per Session";
    case "PER_PROCEDURE":
      return "Per Procedure";
    case "PER_PACKAGE":
      return "Per Package";
    default:
      return x;
  }
}

async function apiTry<T>(primary: string, fallback: string, init?: RequestInit): Promise<T> {
  try {
    return await apiFetch<T>(primary, init as any);
  } catch (e: any) {
    if (e instanceof ApiError && e.status === 404) {
      return await apiFetch<T>(fallback, init as any);
    }
    throw e;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function SuperAdminChargeMasterPage() {
  const { toast } = useToast();
  // âœ… Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";


  const [activeTab, setActiveTab] = React.useState<"items" | "guide">("items");
  const [showFilters, setShowFilters] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [rows, setRows] = React.useState<ChargeMasterRow[]>([]);

  // filters
  const [q, setQ] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);

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

  async function loadChargeMaster(showToast = false, targetBranchId?: string) {
    const target = targetBranchId || branchId;
    if (!target) return;
    setErr(null);
    setLoading(true);
    try {
      const qs = buildQS({
        branchId: target,
        q: q.trim() || undefined,
        includeInactive: includeInactive ? "true" : undefined,
        includeCounts: "true",
        includeTax: "true",
      });

      const res = await apiTry<any>(
        `/api/infrastructure/charge-master?${qs}`,
        `/api/infra/charge-master?${qs}`,
      );

      const list: ChargeMasterRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);

      if (showToast) {
        toast({ title: "Charge master refreshed", description: "Loaded latest items for this branch." });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load charge master";
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
      await loadChargeMaster(false, bid);
      if (showToast) toast({ title: "Ready", description: "Branch scope and charge master are up to date." });
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
    void loadChargeMaster(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, includeInactive]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadChargeMaster(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function onBranchChange(nextId: string) {
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
setQ("");
    setIncludeInactive(false);

    setErr(null);
    void loadChargeMaster(false, nextId);
  }

  const stats = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const inactive = total - active;

    const missingTax = rows.filter((r) => r.isActive && !r.taxCodeId).length;
    const missingUnit = rows.filter((r) => r.isActive && !r.chargeUnit).length;

    return { total, active, inactive, missingTax, missingUnit };
  }, [rows]);

  return (
    <AppShell title="Infrastructure - Charge Master">
      <RequirePerm perm="INFRA_CHARGE_MASTER_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Receipt className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Charge Master</div>
              <div className="mt-1 text-sm text-zc-muted">
                Branch-scoped billable items used by tariff plans and packages.
              </div>
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

            <Button variant="primary" className="px-5 gap-2" asChild>
              <Link href="/infrastructure/charge-master/new">
                <Plus className="h-4 w-4" />
                New Item
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
                  <CardTitle className="text-base">Could not load charge master</CardTitle>
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
              Pick a branch, search items, and review billing completeness.
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

            <div className="grid gap-3 md:grid-cols-5">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Items</div>
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
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Active missing Tax</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{stats.missingTax}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
                <div className="text-xs font-medium text-rose-700 dark:text-rose-300">Active missing Unit</div>
                <div className="mt-1 text-lg font-bold text-rose-800 dark:text-rose-200">{stats.missingUnit}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code or name..."
                  className="pl-10"
                  disabled={mustSelectBranch}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={mustSelectBranch} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">Include inactive</div>
                    <div className="text-xs text-zc-muted">Needs backend support</div>
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
                  {showFilters ? "Hide Help" : "Show Help"}
                </Button>
              </div>
            </div>

            {showFilters ? (
              <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                  <Filter className="h-4 w-4 text-zc-accent" />
                  What belongs in Charge Master
                </div>
                <div className="text-sm text-zc-muted">
                  Create items that appear in billing: investigations, procedures, bed or ward charges, consultations,
                  packages, consumables billing heads, OT charges, and more.
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Branch scoped</Badge>
              <Badge variant="ok">Tariff uses ChargeMasterItem</Badge>
              <Badge variant="warning">Missing tax or unit {"->"} FixIt</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Main tabs */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Manage Charge Master</CardTitle>
                <CardDescription>Items and guidance for billing and tariffs.</CardDescription>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger
                    value="items"
                    className={cn(
                      "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                    )}
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    Items
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
              <TabsContent value="items" className="mt-0">
                <div className="rounded-xl border border-zc-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead className="w-[120px]" />
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
                            <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                              <div className="flex items-center gap-2">
                                <Receipt className="h-4 w-4" />
                                No items found.
                              </div>
                              <Button size="sm" asChild>
                                <Link href="/infrastructure/charge-master/new">New Item</Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((r) => {
                          const missingTax = r.isActive && !r.taxCodeId;
                          const missingUnit = r.isActive && !r.chargeUnit;

                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-mono text-xs">
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-zc-text">{r.code}</span>
                                  <span className="text-[11px] text-zc-muted">
                                    {r.chargeUnit ? unitLabel(r.chargeUnit) : "-"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-zc-text">{r.name}</span>
                                  <span className="text-xs text-zc-muted">
                                    {r.category ? (
                                      <>
                                        <span className="font-semibold text-zc-text">{r.category}</span>
                                        <span className="mx-2">-</span>
                                      </>
                                    ) : null}
                                    Tax:{" "}
                                    <span
                                      className={cn(
                                        "font-semibold",
                                        missingTax ? "text-amber-700 dark:text-amber-300" : "text-zc-text",
                                      )}
                                    >
                                      {r.taxCode?.code || (r.taxCodeId ? "Linked" : "Missing")}
                                    </span>
                                    {missingUnit ? (
                                      <>
                                        <span className="mx-2">-</span>
                                        <span className="font-semibold text-rose-700 dark:text-rose-300">Unit missing</span>
                                      </>
                                    ) : null}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{activeBadge(r.isActive)}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" className="gap-2" asChild>
                                  <Link href={`/infrastructure/charge-master/${encodeURIComponent(r.id)}` as any}>
                                    <Eye className="h-4 w-4" />
                                    View
                                  </Link>
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
                      Total: <span className="font-semibold text-zc-text">{rows.length}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <Link href="/infrastructure/tariff-plans">
                          Tariff Plans <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <Link href="/infrastructure/tax-codes">
                          Tax Codes <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="guide" className="mt-0">
                <Card className="border-zc-border">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">How Charge Master works</CardTitle>
                    <CardDescription>Use Charge Master as the only anchor for pricing and tariffs.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="text-sm font-semibold text-zc-text">1) Create billable heads</div>
                        <div className="mt-1 text-sm text-zc-muted">These are the items that appear in billing.</div>
                      </div>
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="text-sm font-semibold text-zc-text">2) Enforce charge unit</div>
                        <div className="mt-1 text-sm text-zc-muted">
                          Per day, per session, or per procedure should be consistent end-to-end.
                        </div>
                      </div>
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="text-sm font-semibold text-zc-text">3) Set tax code</div>
                        <div className="mt-1 text-sm text-zc-muted">Use active tax codes. Inactive usage should create FixIts.</div>
                      </div>
                      <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
                        <div className="text-sm font-semibold text-zc-text">4) Tariff plans set prices</div>
                        <div className="mt-1 text-sm text-zc-muted">Tariff rates reference charge master item, not service codes.</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">
                      If edit, toggle, or delete are not working, it means backend endpoints are not added yet.
                      Tell me and I will give you the backend controllers and services next.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
          </RequirePerm>
</AppShell>
  );
}
