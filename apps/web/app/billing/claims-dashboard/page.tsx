"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type DashboardSummary = {
  totalOpen: number;
  preauthPending: number;
  claimsPending: number;
  slaBreaches: number;
  agingBuckets: {
    days0to7: number;
    days8to15: number;
    days16to30: number;
    days30plus: number;
  };
};

type ReconciliationSummary = {
  totalReceivable: number;
  totalReceived: number;
  pendingReconciliation: number;
};

type PendingQueryRow = {
  id: string;
  requestNumber?: string;
  patient?: { uhid?: string; name?: string };
  payer?: { code?: string; name?: string };
  queryDate?: string;
  deadline?: string;
  status?: string;
};

type SlaBreachRow = {
  id: string;
  caseNumber?: string;
  patient?: { uhid?: string; name?: string };
  payer?: { code?: string; name?: string };
  slaDeadline?: string;
  daysOverdue?: number;
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

/** Format number as Indian currency: ₹ X,XX,XXX */
function formatINR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "\u20B9 0";
  return "\u20B9 " + value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  try {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function ClaimsDashboardPage() {
  const { toast } = useToast();
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [loading, setLoading] = React.useState(true);

  // Dashboard data
  const [dashboard, setDashboard] = React.useState<DashboardSummary | null>(null);
  const [reconSummary, setReconSummary] = React.useState<ReconciliationSummary | null>(null);
  const [pendingQueries, setPendingQueries] = React.useState<PendingQueryRow[]>([]);
  const [slaBreaches, setSlaBreaches] = React.useState<SlaBreachRow[]>([]);

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "billing-claims-dashboard",
    enabled: !!effectiveBranchId,
  });

  async function loadAll(showToast = false) {
    if (!effectiveBranchId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const results = await Promise.allSettled([
      apiFetch<DashboardSummary>(
        `/api/billing/insurance-cases/dashboard?branchId=${effectiveBranchId}`,
        { showLoader: false },
      ),
      apiFetch<ReconciliationSummary>(
        `/api/billing/reconciliation/summary?branchId=${effectiveBranchId}`,
        { showLoader: false },
      ),
      apiFetch<any>(
        `/api/billing/preauth?branchId=${effectiveBranchId}&status=PREAUTH_QUERY_RAISED&limit=10&sort=deadline:asc`,
        { showLoader: false },
      ),
      apiFetch<any>(
        `/api/billing/insurance-cases?branchId=${effectiveBranchId}&slaBreached=true&limit=10&sort=slaDeadline:asc`,
        { showLoader: false },
      ),
    ]);

    // Dashboard summary
    if (results[0].status === "fulfilled") {
      setDashboard(results[0].value);
    } else {
      setDashboard(null);
    }

    // Reconciliation summary
    if (results[1].status === "fulfilled") {
      setReconSummary(results[1].value);
    } else {
      setReconSummary(null);
    }

    // Pending queries
    if (results[2].status === "fulfilled") {
      const raw = results[2].value;
      setPendingQueries(Array.isArray(raw) ? raw : raw?.rows ?? []);
    } else {
      setPendingQueries([]);
    }

    // SLA breaches
    if (results[3].status === "fulfilled") {
      const raw = results[3].value;
      setSlaBreaches(Array.isArray(raw) ? raw : raw?.rows ?? []);
    } else {
      setSlaBreaches([]);
    }

    setLoading(false);
    if (showToast) {
      toast({ title: "Dashboard refreshed", description: "Loaded latest claims data." });
    }
  }

  React.useEffect(() => {
    void loadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranchId]);

  const aging = dashboard?.agingBuckets ?? { days0to7: 0, days8to15: 0, days16to30: 0, days30plus: 0 };

  return (
    <AppShell title="Billing - Claims Dashboard">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <LayoutDashboard className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Claims Dashboard</div>
              <div className="mt-1 text-sm text-zc-muted">
                Aggregated view of insurance cases, preauth queries, SLA breaches, and reconciliation.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => loadAll(true)}
              disabled={loading}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </div>

        <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

        {/* ---- Top Stats Row (6 cards) ---- */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* 1. Open Cases */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Open Cases</span>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
                {dashboard?.totalOpen ?? 0}
              </div>
            )}
          </div>

          {/* 2. Preauth Pending */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Preauth Pending</span>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
                {dashboard?.preauthPending ?? 0}
              </div>
            )}
          </div>

          {/* 3. Claims Pending */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/50 dark:bg-purple-900/10">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Claims Pending</span>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-purple-700 dark:text-purple-300">
                {dashboard?.claimsPending ?? 0}
              </div>
            )}
          </div>

          {/* 4. SLA Breaches */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-900/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">SLA Breaches</span>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-red-700 dark:text-red-300">
                {dashboard?.slaBreaches ?? 0}
              </div>
            )}
          </div>

          {/* 5. Amount Receivable */}
          <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 dark:border-green-900/50 dark:bg-green-900/10">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Amount Receivable</span>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-green-700 dark:text-green-300">
                {formatINR(reconSummary?.totalReceivable)}
              </div>
            )}
          </div>

          {/* 6. Settled This Month */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Settled This Month</span>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatINR(reconSummary?.totalReceived)}
              </div>
            )}
          </div>
        </div>

        {/* ---- Aging Buckets ---- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Case Aging Buckets</CardTitle>
            <CardDescription>Open cases grouped by age since creation.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 dark:border-green-900/50 dark:bg-green-900/10">
                <div className="text-xs font-medium text-green-600 dark:text-green-400">0 - 7 days</div>
                {loading ? (
                  <Skeleton className="mt-2 h-7 w-12" />
                ) : (
                  <div className="mt-2 text-2xl font-bold text-green-700 dark:text-green-300">{aging.days0to7}</div>
                )}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">8 - 15 days</div>
                {loading ? (
                  <Skeleton className="mt-2 h-7 w-12" />
                ) : (
                  <div className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">{aging.days8to15}</div>
                )}
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/50 dark:bg-orange-900/10">
                <div className="text-xs font-medium text-orange-600 dark:text-orange-400">16 - 30 days</div>
                {loading ? (
                  <Skeleton className="mt-2 h-7 w-12" />
                ) : (
                  <div className="mt-2 text-2xl font-bold text-orange-700 dark:text-orange-300">{aging.days16to30}</div>
                )}
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-900/10">
                <div className="text-xs font-medium text-red-600 dark:text-red-400">30+ days</div>
                {loading ? (
                  <Skeleton className="mt-2 h-7 w-12" />
                ) : (
                  <div className="mt-2 text-2xl font-bold text-red-700 dark:text-red-300">{aging.days30plus}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ---- Two-Column: Pending Queries + SLA Breaches ---- */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Pending Queries */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Pending Queries</CardTitle>
                  <CardDescription>Preauth queries awaiting response (most urgent first).</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/billing/preauth">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-b-xl border-t border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Request No</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead className="w-[100px]">Query Date</TableHead>
                      <TableHead className="w-[100px]">Deadline</TableHead>
                      <TableHead className="w-[90px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : pendingQueries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <div className="flex items-center justify-center gap-2 py-8 text-sm text-zc-muted">
                            <CheckCircle2 className="h-4 w-4" />
                            No pending queries. All clear!
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingQueries.slice(0, 10).map((row) => {
                        const daysLeft = daysUntil(row.deadline);
                        const isUrgent = daysLeft !== null && daysLeft <= 1;

                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-mono text-xs font-semibold">
                              {row.requestNumber ?? "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.patient?.name ?? "-"}
                              {row.patient?.uhid && (
                                <span className="ml-1 text-xs text-zc-muted">({row.patient.uhid})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{row.payer?.name ?? "-"}</TableCell>
                            <TableCell className="text-xs">{formatDate(row.queryDate)}</TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "text-xs font-semibold",
                                  isUrgent
                                    ? "text-red-700 dark:text-red-300"
                                    : "text-zc-text",
                                )}
                              >
                                {formatDate(row.deadline)}
                              </span>
                              {daysLeft !== null && (
                                <div className={cn(
                                  "text-[10px]",
                                  isUrgent ? "text-red-500" : "text-zc-muted",
                                )}>
                                  {daysLeft <= 0 ? "Overdue" : `${daysLeft}d left`}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="warning">QUERY</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Right: SLA Breaches */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent SLA Breaches</CardTitle>
              <CardDescription>Cases past their SLA deadline (most overdue first).</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-b-xl border-t border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Case No</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead className="w-[100px]">SLA Deadline</TableHead>
                      <TableHead className="w-[100px]">Days Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : slaBreaches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="flex items-center justify-center gap-2 py-8 text-sm text-zc-muted">
                            <CheckCircle2 className="h-4 w-4" />
                            No SLA breaches. Great work!
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      slaBreaches.slice(0, 10).map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {row.caseNumber ?? "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.patient?.name ?? "-"}
                            {row.patient?.uhid && (
                              <span className="ml-1 text-xs text-zc-muted">({row.patient.uhid})</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{row.payer?.name ?? "-"}</TableCell>
                          <TableCell className="text-xs">{formatDate(row.slaDeadline)}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {row.daysOverdue != null ? `${row.daysOverdue}d` : "-"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---- Reconciliation Summary ---- */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Reconciliation Summary</CardTitle>
                <CardDescription>Overall receivables and payment reconciliation status.</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/billing/reconciliation">Go to Reconciliation</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Receivable</div>
                {loading ? (
                  <Skeleton className="mt-2 h-7 w-24" />
                ) : (
                  <div className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatINR(reconSummary?.totalReceivable)}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Received</div>
                {loading ? (
                  <Skeleton className="mt-2 h-7 w-24" />
                ) : (
                  <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatINR(reconSummary?.totalReceived)}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending Reconciliation</div>
                {loading ? (
                  <Skeleton className="mt-2 h-7 w-12" />
                ) : (
                  <div className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {reconSummary?.pendingReconciliation ?? 0}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Branch scoped</Badge>
          <Badge variant="ok">Read-only dashboard</Badge>
          <Badge variant="warning">SLA breaches need attention</Badge>
        </div>
      </div>
    </AppShell>
  );
}
