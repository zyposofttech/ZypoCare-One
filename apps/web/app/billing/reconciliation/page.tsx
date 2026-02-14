"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  CheckCircle2,
  CreditCard,
  Eye,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type PaymentAdviceRow = {
  id: string;
  branchId: string;
  claimId: string;
  claim?: {
    claimNumber: string;
    insuranceCase?: {
      caseNumber: string;
      patient?: { uhid: string; name: string };
      payer?: { code: string; name: string };
    };
  };
  adviceNumber?: string;
  utrNumber?: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  status: string;
  bankReference?: string;
  shortPaymentReason?: string;
  reconciledAt?: string;
  reconciledByUserId?: string;
  createdAt: string;
  updatedAt: string;
};

type ReconciliationSummary = {
  totalReceivable: number;
  totalReceived: number;
  pendingReconciliation: number;
};

type PaymentMode = "NEFT" | "RTGS" | "CHEQUE" | "UPI" | "CASH_PAYMENT" | "OTHER_MODE";

type PaymentStatus = "PA_RECEIVED" | "PA_RECONCILED" | "PA_DISPUTED" | "PA_PARTIAL";

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

const STATUS_CONFIG: Record<string, { label: string; variant: string; className: string }> = {
  PA_RECEIVED: {
    label: "Received",
    variant: "secondary",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300",
  },
  PA_RECONCILED: {
    label: "Reconciled",
    variant: "ok",
    className: "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300",
  },
  PA_DISPUTED: {
    label: "Disputed",
    variant: "destructive",
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300",
  },
  PA_PARTIAL: {
    label: "Partial",
    variant: "warning",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300",
  },
};

const MODE_CONFIG: Record<string, { label: string; className: string }> = {
  NEFT: {
    label: "NEFT",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300",
  },
  RTGS: {
    label: "RTGS",
    className: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300",
  },
  CHEQUE: {
    label: "Cheque",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300",
  },
  UPI: {
    label: "UPI",
    className: "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300",
  },
  CASH_PAYMENT: {
    label: "Cash",
    className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-900/50 dark:bg-slate-900/20 dark:text-slate-300",
  },
  OTHER_MODE: {
    label: "Other",
    className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-900/50 dark:bg-slate-900/20 dark:text-slate-400",
  },
};

function statusBadge(status: string) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: "secondary", className: "" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

function modeBadge(mode: string) {
  const cfg = MODE_CONFIG[mode] ?? { label: mode, className: "" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                         Create Payment Form State                          */
/* -------------------------------------------------------------------------- */

const EMPTY_FORM = {
  claimId: "",
  adviceNumber: "",
  utrNumber: "",
  paymentDate: "",
  amount: "",
  paymentMode: "NEFT" as PaymentMode,
  bankReference: "",
  shortPaymentReason: "",
};

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function ReconciliationPage() {
  const { toast } = useToast();
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  // Data
  const [rows, setRows] = React.useState<PaymentAdviceRow[]>([]);
  const [summary, setSummary] = React.useState<ReconciliationSummary | null>(null);

  // Filters
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  // Create dialog
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({ ...EMPTY_FORM });

  // Reconcile confirmation dialog
  const [reconcileTarget, setReconcileTarget] = React.useState<PaymentAdviceRow | null>(null);

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "billing-reconciliation",
    enabled: !!effectiveBranchId,
  });

  /* ---- Data loading ---- */

  async function loadRows(showToast = false) {
    if (!effectiveBranchId) return;
    setLoading(true);
    try {
      const qs = buildQS({
        branchId: effectiveBranchId,
        q: q.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });

      const res = await apiFetch<any>(
        `/api/billing/reconciliation/payment-advice?${qs}`,
        { showLoader: false },
      );
      const list: PaymentAdviceRow[] = Array.isArray(res) ? res : res?.rows ?? [];
      setRows(list);
      if (showToast) {
        toast({ title: "Payment advice refreshed", description: `Loaded ${list.length} records.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load payment advice";
      toast({ title: "Load failed", description: msg, variant: "destructive" as any });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    if (!effectiveBranchId) return;
    try {
      const res = await apiFetch<ReconciliationSummary>(
        `/api/billing/reconciliation/summary?branchId=${effectiveBranchId}`,
        { showLoader: false },
      );
      setSummary(res);
    } catch {
      setSummary(null);
    }
  }

  async function refreshAll(showToast = false) {
    await Promise.all([loadRows(showToast), loadSummary()]);
  }

  React.useEffect(() => {
    void refreshAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranchId]);

  // Re-fetch when filters change
  React.useEffect(() => {
    if (!effectiveBranchId) return;
    const t = setTimeout(() => void loadRows(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter, dateFrom, dateTo]);

  /* ---- Stats computed from rows ---- */

  const stats = React.useMemo(() => {
    const total = rows.length;
    const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const reconciled = rows.filter((r) => r.status === "PA_RECONCILED").length;
    const pending = rows.filter((r) => r.status === "PA_RECEIVED").length;
    return { total, totalAmount, reconciled, pending };
  }, [rows]);

  /* ---- Create payment ---- */

  async function handleCreate() {
    if (!form.claimId.trim()) {
      toast({ title: "Validation error", description: "Claim ID is required.", variant: "destructive" as any });
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: "Validation error", description: "Amount must be greater than zero.", variant: "destructive" as any });
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/api/billing/reconciliation/payment-advice", {
        method: "POST",
        body: {
          branchId: effectiveBranchId,
          claimId: form.claimId.trim(),
          adviceNumber: form.adviceNumber.trim() || undefined,
          utrNumber: form.utrNumber.trim() || undefined,
          paymentDate: form.paymentDate || undefined,
          amount: Number(form.amount),
          paymentMode: form.paymentMode,
          bankReference: form.bankReference.trim() || undefined,
          shortPaymentReason: form.shortPaymentReason.trim() || undefined,
        },
      });

      toast({ title: "Payment recorded", description: "Payment advice created successfully." });
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      void refreshAll(false);
    } catch (e: any) {
      const msg = e?.message || "Failed to create payment advice";
      toast({ title: "Create failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  /* ---- Reconcile ---- */

  async function handleReconcile() {
    if (!reconcileTarget) return;
    setBusy(true);
    try {
      await apiFetch(`/api/billing/reconciliation/payment-advice/${reconcileTarget.id}/reconcile`, {
        method: "POST",
        body: {},
      });

      toast({ title: "Reconciled", description: `Payment ${reconcileTarget.adviceNumber || reconcileTarget.id} marked as reconciled.` });
      setReconcileTarget(null);
      void refreshAll(false);
    } catch (e: any) {
      const msg = e?.message || "Failed to reconcile payment";
      toast({ title: "Reconcile failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Billing - Reconciliation">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <CreditCard className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Reconciliation</div>
              <div className="mt-1 text-sm text-zc-muted">
                Record payer payments and reconcile them against insurance claims.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => refreshAll(true)}
              disabled={loading || busy}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button
              variant="primary"
              className="px-5 gap-2"
              onClick={() => {
                setForm({ ...EMPTY_FORM });
                setShowCreate(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Record Payment
            </Button>
          </div>
        </div>

        <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

        {/* ---- Top Stats (4 cards) ---- */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Payments</div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-12" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
            )}
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Amount Received</div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatINR(stats.totalAmount)}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 dark:border-green-900/50 dark:bg-green-900/10">
            <div className="text-xs font-medium text-green-600 dark:text-green-400">Reconciled</div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-12" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-green-700 dark:text-green-300">{stats.reconciled}</div>
            )}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending</div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-12" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.pending}</div>
            )}
          </div>
        </div>

        {/* ---- Filters ---- */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by UTR, advice number, or claim number..."
                  className="pl-10"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-zc-muted">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-[180px] rounded-xl border-zc-border bg-zc-card">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PA_RECEIVED">Received</SelectItem>
                    <SelectItem value="PA_RECONCILED">Reconciled</SelectItem>
                    <SelectItem value="PA_DISPUTED">Disputed</SelectItem>
                    <SelectItem value="PA_PARTIAL">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-zc-muted">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 w-[160px]"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-zc-muted">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 w-[160px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ---- Payment Advice Table ---- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Advice</CardTitle>
            <CardDescription>All payment records from payers for insurance claims.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-xl border-t border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Advice No</TableHead>
                    <TableHead className="w-[130px]">UTR</TableHead>
                    <TableHead className="w-[120px]">Claim No</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead className="w-[110px] text-right">Amount</TableHead>
                    <TableHead className="w-[100px]">Payment Date</TableHead>
                    <TableHead className="w-[80px]">Mode</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={10}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                          <CreditCard className="h-5 w-5" />
                          No payment records found.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {row.adviceNumber || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.utrNumber || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          {row.claim?.claimNumber || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.claim?.insuranceCase?.patient?.name ?? "-"}
                          {row.claim?.insuranceCase?.patient?.uhid && (
                            <span className="ml-1 text-xs text-zc-muted">
                              ({row.claim.insuranceCase.patient.uhid})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.claim?.insuranceCase?.payer?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatINR(row.amount)}
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(row.paymentDate)}</TableCell>
                        <TableCell>{modeBadge(row.paymentMode)}</TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {row.status === "PA_RECEIVED" && (
                                <DropdownMenuItem
                                  onClick={() => setReconcileTarget(row)}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Reconcile
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between border-t border-zc-border p-4">
                <div className="text-sm text-zc-muted">
                  Total: <span className="font-semibold text-zc-text">{rows.length}</span> records
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/billing/claims-dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ---- Reconciliation Summary ---- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reconciliation Summary</CardTitle>
            <CardDescription>Overall receivables and payment reconciliation status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Receivable</div>
                {loading ? (
                  <Skeleton className="mt-2 h-7 w-24" />
                ) : (
                  <div className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatINR(summary?.totalReceivable)}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Received</div>
                {loading ? (
                  <Skeleton className="mt-2 h-7 w-24" />
                ) : (
                  <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatINR(summary?.totalReceived)}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending Reconciliation</div>
                {loading ? (
                  <Skeleton className="mt-2 h-7 w-12" />
                ) : (
                  <div className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {summary?.pendingReconciliation ?? 0}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Branch scoped</Badge>
          <Badge variant="ok">Payment reconciliation</Badge>
        </div>
      </div>

      {/* ================================================================== */}
      {/*                    CREATE PAYMENT DIALOG                            */}
      {/* ================================================================== */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment advice received from a payer against an insurance claim.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pa-claimId">Claim ID *</Label>
              <Input
                id="pa-claimId"
                value={form.claimId}
                onChange={(e) => setForm((f) => ({ ...f, claimId: e.target.value }))}
                placeholder="Enter claim ID or claim number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pa-adviceNumber">Advice Number</Label>
                <Input
                  id="pa-adviceNumber"
                  value={form.adviceNumber}
                  onChange={(e) => setForm((f) => ({ ...f, adviceNumber: e.target.value }))}
                  placeholder="PA-2026-001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pa-utrNumber">UTR Number</Label>
                <Input
                  id="pa-utrNumber"
                  value={form.utrNumber}
                  onChange={(e) => setForm((f) => ({ ...f, utrNumber: e.target.value }))}
                  placeholder="UTR reference"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pa-paymentDate">Payment Date</Label>
                <Input
                  id="pa-paymentDate"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pa-amount">Amount (INR) *</Label>
                <Input
                  id="pa-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Payment Mode</Label>
                <Select
                  value={form.paymentMode}
                  onValueChange={(v) => setForm((f) => ({ ...f, paymentMode: v as PaymentMode }))}
                >
                  <SelectTrigger className="h-10 rounded-xl border-zc-border bg-zc-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CASH_PAYMENT">Cash</SelectItem>
                    <SelectItem value="OTHER_MODE">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pa-bankRef">Bank Reference</Label>
                <Input
                  id="pa-bankRef"
                  value={form.bankReference}
                  onChange={(e) => setForm((f) => ({ ...f, bankReference: e.target.value }))}
                  placeholder="Bank ref / cheque no."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pa-shortReason">Short Payment Reason</Label>
              <Input
                id="pa-shortReason"
                value={form.shortPaymentReason}
                onChange={(e) => setForm((f) => ({ ...f, shortPaymentReason: e.target.value }))}
                placeholder="If amount differs from claim, explain here"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={busy}>
              {busy ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/*                    RECONCILE CONFIRMATION DIALOG                    */}
      {/* ================================================================== */}
      <Dialog open={!!reconcileTarget} onOpenChange={(open) => { if (!open) setReconcileTarget(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Confirm Reconciliation</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this payment as reconciled? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {reconcileTarget && (
            <div className="grid gap-3 py-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-zc-border bg-zc-panel/20 p-3 text-sm">
                <div>
                  <div className="text-xs text-zc-muted">Advice No</div>
                  <div className="font-semibold">{reconcileTarget.adviceNumber || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-zc-muted">UTR</div>
                  <div className="font-semibold">{reconcileTarget.utrNumber || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-zc-muted">Claim</div>
                  <div className="font-semibold">{reconcileTarget.claim?.claimNumber || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-zc-muted">Amount</div>
                  <div className="font-semibold">{formatINR(reconcileTarget.amount)}</div>
                </div>
                <div>
                  <div className="text-xs text-zc-muted">Patient</div>
                  <div className="font-semibold">
                    {reconcileTarget.claim?.insuranceCase?.patient?.name || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zc-muted">Payer</div>
                  <div className="font-semibold">
                    {reconcileTarget.claim?.insuranceCase?.payer?.name || "-"}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcileTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReconcile} disabled={busy}>
              {busy ? "Reconciling..." : "Confirm Reconcile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
