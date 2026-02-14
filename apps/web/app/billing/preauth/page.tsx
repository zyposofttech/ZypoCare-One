"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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
  Clock,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type PreauthRow = {
  id: string;
  branchId: string;
  insuranceCaseId: string;
  insuranceCase?: {
    caseNumber: string;
    patient?: { uhid: string; name: string };
    payer?: { code: string; name: string };
  };
  requestNumber: string;
  version: number;
  status: string;
  requestedAmount?: number;
  approvedAmount?: number;
  packageCode?: string;
  procedureSummary?: string;
  clinicalNotes?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  validTill?: string;
  enhancementAmount?: number;
  enhancementReason?: string;
  gatewayRefId?: string;
  queries?: PreauthQueryRow[];
  primaryDiagnosisCode?: string;
  primaryDiagnosisDescription?: string;
  secondaryDiagnosisCodes?: string;
  procedureCodes?: string;
  hbpPackageCode?: string;
  implantDetails?: string;
  investigationSummary?: string;
  otNotes?: string;
  createdAt: string;
  updatedAt: string;
};

type PreauthQueryRow = {
  id: string;
  queryText: string;
  querySource: string;
  queriedAt: string;
  responseText?: string;
  respondedAt?: string;
  deadline?: string;
  attachmentUrls: string[];
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
  return (
    <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />
  );
}

function fmtCurrency(v?: number | null) {
  if (v == null) return "--";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtDT(v?: string | null) {
  if (!v) return "--";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function fmtDate(v?: string | null) {
  if (!v) return "--";
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return String(v);
  }
}

const PREAUTH_STATUSES = [
  "PREAUTH_DRAFT",
  "PREAUTH_SUBMITTED",
  "PREAUTH_QUERY_RAISED",
  "PREAUTH_RESPONDED",
  "PREAUTH_APPROVED",
  "PREAUTH_REJECTED",
  "PREAUTH_ENHANCEMENT_REQUESTED",
  "PREAUTH_ENHANCEMENT_APPROVED",
  "PREAUTH_EXPIRED",
] as const;

function preauthStatusBadge(status: string) {
  const colors: Record<string, string> = {
    PREAUTH_DRAFT: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
    PREAUTH_SUBMITTED: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    PREAUTH_QUERY_RAISED: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
    PREAUTH_RESPONDED: "bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700",
    PREAUTH_APPROVED: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    PREAUTH_REJECTED: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
    PREAUTH_ENHANCEMENT_REQUESTED: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
    PREAUTH_ENHANCEMENT_APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
    PREAUTH_EXPIRED: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight",
        colors[status] || colors.PREAUTH_DRAFT,
      )}
    >
      {status.replace(/^PREAUTH_/, "").replace(/_/g, " ")}
    </span>
  );
}

function querySourceBadge(source: string) {
  const upper = source.toUpperCase();
  if (upper === "TPA" || upper === "PAYER") {
    return <Badge className="bg-violet-600 text-white text-[10px]">TPA</Badge>;
  }
  return <Badge className="bg-blue-600 text-white text-[10px]">HOSPITAL</Badge>;
}

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[1020px] translate-x-0 translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function PreauthPage() {
  const { toast } = useToast();
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const [rows, setRows] = React.useState<PreauthRow[]>([]);

  // Filters
  const [q, setQ] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [showFilters, setShowFilters] = React.useState(false);

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "billing-preauth",
    enabled: true,
  });

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [fInsuranceCaseId, setFInsuranceCaseId] = React.useState("");
  const [fRequestNumber, setFRequestNumber] = React.useState("");
  const [fRequestedAmount, setFRequestedAmount] = React.useState("");
  const [fPackageCode, setFPackageCode] = React.useState("");
  const [fProcedureSummary, setFProcedureSummary] = React.useState("");
  const [fClinicalNotes, setFClinicalNotes] = React.useState("");
  const [fPrimaryDiagnosisCode, setFPrimaryDiagnosisCode] = React.useState("");
  const [fPrimaryDiagnosisDescription, setFPrimaryDiagnosisDescription] = React.useState("");
  const [fSecondaryDiagnosisCodes, setFSecondaryDiagnosisCodes] = React.useState("");
  const [fProcedureCodes, setFProcedureCodes] = React.useState("");
  const [fHbpPackageCode, setFHbpPackageCode] = React.useState("");
  const [fImplantDetails, setFImplantDetails] = React.useState("");
  const [fInvestigationSummary, setFInvestigationSummary] = React.useState("");
  const [fOtNotes, setFOtNotes] = React.useState("");

  // Detail drawer
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailRow, setDetailRow] = React.useState<PreauthRow | null>(null);
  const [detailTab, setDetailTab] = React.useState<"info" | "queries">("info");

  // Approve dialog
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [approveId, setApproveId] = React.useState("");
  const [approveAmount, setApproveAmount] = React.useState("");
  const [approveValidTill, setApproveValidTill] = React.useState("");

  // Reject dialog
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectId, setRejectId] = React.useState("");
  const [rejectReason, setRejectReason] = React.useState("");

  // Add query dialog
  const [queryOpen, setQueryOpen] = React.useState(false);
  const [queryPreauthId, setQueryPreauthId] = React.useState("");
  const [queryText, setQueryText] = React.useState("");
  const [querySource, setQuerySource] = React.useState("TPA");
  const [queryDeadline, setQueryDeadline] = React.useState("");

  /* ---- data loading ---- */

  async function loadPreauths(showToast = false) {
    setLoading(true);
    try {
      const params = buildQS({
        q: q.trim() || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
      });
      const res = await apiFetch<any>(`/api/billing/preauth?${params}`);
      const list: PreauthRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);
      if (showToast) toast({ title: "Refreshed", description: "Pre-authorizations reloaded." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load failed", description: e?.message || "Unknown error" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadPreauths(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => void loadPreauths(false), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filterStatus]);

  /* ---- stats ---- */

  const stats = React.useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) =>
      r.status === "PREAUTH_SUBMITTED" || r.status === "PREAUTH_QUERY_RAISED" || r.status === "PREAUTH_RESPONDED",
    ).length;
    const approved = rows.filter((r) =>
      r.status === "PREAUTH_APPROVED" || r.status === "PREAUTH_ENHANCEMENT_APPROVED",
    ).length;
    const rejected = rows.filter((r) => r.status === "PREAUTH_REJECTED").length;
    const enhancementPending = rows.filter(
      (r) => r.status === "PREAUTH_ENHANCEMENT_REQUESTED",
    ).length;
    const totalRequested = rows.reduce((acc, r) => acc + (r.requestedAmount || 0), 0);
    const totalApproved = rows.reduce((acc, r) => acc + (r.approvedAmount || 0), 0);
    return { total, pending, approved, rejected, enhancementPending, totalRequested, totalApproved };
  }, [rows]);

  /* ---- create ---- */

  function openCreate() {
    setFInsuranceCaseId("");
    setFRequestNumber("");
    setFRequestedAmount("");
    setFPackageCode("");
    setFProcedureSummary("");
    setFClinicalNotes("");
    setFPrimaryDiagnosisCode("");
    setFPrimaryDiagnosisDescription("");
    setFSecondaryDiagnosisCodes("");
    setFProcedureCodes("");
    setFHbpPackageCode("");
    setFImplantDetails("");
    setFInvestigationSummary("");
    setFOtNotes("");
    setCreateOpen(true);
  }

  async function savePreauth() {
    if (!fInsuranceCaseId.trim() || !fRequestNumber.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Insurance Case ID and Request Number are required." });
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        insuranceCaseId: fInsuranceCaseId.trim(),
        requestNumber: fRequestNumber.trim(),
        requestedAmount: fRequestedAmount ? Number(fRequestedAmount) : undefined,
        packageCode: fPackageCode.trim() || undefined,
        procedureSummary: fProcedureSummary.trim() || undefined,
        clinicalNotes: fClinicalNotes.trim() || undefined,
        primaryDiagnosisCode: fPrimaryDiagnosisCode.trim() || undefined,
        primaryDiagnosisDescription: fPrimaryDiagnosisDescription.trim() || undefined,
        secondaryDiagnosisCodes: fSecondaryDiagnosisCodes.trim() || undefined,
        procedureCodes: fProcedureCodes.trim() || undefined,
        hbpPackageCode: fHbpPackageCode.trim() || undefined,
        implantDetails: fImplantDetails.trim() || undefined,
        investigationSummary: fInvestigationSummary.trim() || undefined,
        otNotes: fOtNotes.trim() || undefined,
      };
      await apiFetch("/api/billing/preauth", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({ title: "Pre-authorization created" });
      setCreateOpen(false);
      await loadPreauths(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Create failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  /* ---- actions ---- */

  async function submitPreauth(id: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/billing/preauth/${id}/submit`, { method: "POST" });
      toast({ title: "Preauth submitted" });
      await loadPreauths(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Submit failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  function openApprove(id: string, requestedAmt?: number) {
    setApproveId(id);
    setApproveAmount(requestedAmt != null ? String(requestedAmt) : "");
    setApproveValidTill("");
    setApproveOpen(true);
  }

  async function confirmApprove() {
    if (!approveAmount) {
      toast({ variant: "destructive", title: "Validation", description: "Approved amount is required." });
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/billing/preauth/${approveId}/approve`, {
        method: "POST",
        body: JSON.stringify({
          approvedAmount: Number(approveAmount),
          validTill: approveValidTill || undefined,
        }),
      });
      toast({ title: "Preauth approved" });
      setApproveOpen(false);
      await loadPreauths(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Approve failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  function openReject(id: string) {
    setRejectId(id);
    setRejectReason("");
    setRejectOpen(true);
  }

  async function confirmReject() {
    if (!rejectReason.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Rejection reason is required." });
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/billing/preauth/${rejectId}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejectionReason: rejectReason.trim() }),
      });
      toast({ title: "Preauth rejected" });
      setRejectOpen(false);
      await loadPreauths(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Reject failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  function openAddQuery(preauthId: string) {
    setQueryPreauthId(preauthId);
    setQueryText("");
    setQuerySource("TPA");
    setQueryDeadline("");
    setQueryOpen(true);
  }

  async function saveQuery() {
    if (!queryText.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Query text is required." });
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/billing/preauth/${queryPreauthId}/queries`, {
        method: "POST",
        body: JSON.stringify({
          queryText: queryText.trim(),
          querySource,
          deadline: queryDeadline || undefined,
        }),
      });
      toast({ title: "Query added" });
      setQueryOpen(false);
      await loadPreauths(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Add query failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  /* ---- detail ---- */

  function openDetail(row: PreauthRow) {
    setDetailRow(row);
    setDetailTab("info");
    setDetailOpen(true);
  }

  /* ---- render ---- */

  return (
    <AppShell title="Billing - Pre-authorization">
      <RequirePerm perm="BILLING_PREAUTH_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <ShieldCheck className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Pre-authorization</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Manage preauth requests, approvals, queries, and enhancements.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="px-5 gap-2"
                onClick={() => void loadPreauths(true)}
                disabled={loading || busy}
              >
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={openCreate}
                disabled={busy}
              >
                <Plus className="h-4 w-4" />
                New Preauth
              </Button>
            </div>
          </div>

          <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Requests</div>
              <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Pending</div>
              <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{stats.pending}</div>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 dark:border-green-900/50 dark:bg-green-900/10">
              <div className="text-xs font-medium text-green-700 dark:text-green-300">Approved</div>
              <div className="mt-1 text-lg font-bold text-green-800 dark:text-green-200">{stats.approved}</div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
              <div className="text-xs font-medium text-red-700 dark:text-red-300">Rejected</div>
              <div className="mt-1 text-lg font-bold text-red-800 dark:text-red-200">{stats.rejected}</div>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900/50 dark:bg-orange-900/10">
              <div className="text-xs font-medium text-orange-700 dark:text-orange-300">Enhancement Pending</div>
              <div className="mt-1 text-lg font-bold text-orange-800 dark:text-orange-200">{stats.enhancementPending}</div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
              <div className="text-xs font-medium text-sky-700 dark:text-sky-300">Total Requested</div>
              <div className="mt-1 text-lg font-bold text-sky-800 dark:text-sky-200">{fmtCurrency(stats.totalRequested)}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Total Approved</div>
              <div className="mt-1 text-lg font-bold text-emerald-800 dark:text-emerald-200">{fmtCurrency(stats.totalApproved)}</div>
            </div>
          </div>

          {/* Filters + Search */}
          <Card className="overflow-hidden">
            <CardContent className="grid gap-4 pt-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search request number, case, or patient..."
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowFilters((s) => !s)}
                  >
                    <Filter className="h-4 w-4" />
                    {showFilters ? "Hide Filters" : "Filters"}
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {PREAUTH_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace(/^PREAUTH_/, "").replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Pre-authorization Requests</CardTitle>
                  <CardDescription>
                    {rows.length} request{rows.length !== 1 ? "s" : ""} found
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="overflow-auto rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Request No</TableHead>
                      <TableHead className="w-[120px]">Case No</TableHead>
                      <TableHead className="w-[160px]">Patient</TableHead>
                      <TableHead className="w-[130px]">Payer</TableHead>
                      <TableHead className="w-[100px] text-right">Requested</TableHead>
                      <TableHead className="w-[100px] text-right">Approved</TableHead>
                      <TableHead className="w-[160px]">Status</TableHead>
                      <TableHead className="w-[120px]">Submitted</TableHead>
                      <TableHead className="w-[100px]">Valid Till</TableHead>
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={10}><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                            <ShieldCheck className="h-6 w-6" />
                            No pre-authorization requests found.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer hover:bg-zc-panel/20"
                          onClick={() => openDetail(r)}
                        >
                          <TableCell className="font-mono text-xs font-semibold">{r.requestNumber}</TableCell>
                          <TableCell className="font-mono text-xs text-zc-muted">{r.insuranceCase?.caseNumber || "--"}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{r.insuranceCase?.patient?.name || "--"}</div>
                            {r.insuranceCase?.patient?.uhid && (
                              <div className="text-xs text-zc-muted">UHID: {r.insuranceCase.patient.uhid}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{r.insuranceCase?.payer?.name || "--"}</div>
                            {r.insuranceCase?.payer?.code && (
                              <div className="text-xs text-zc-muted">{r.insuranceCase.payer.code}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{fmtCurrency(r.requestedAmount)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums font-semibold">{fmtCurrency(r.approvedAmount)}</TableCell>
                          <TableCell>{preauthStatusBadge(r.status)}</TableCell>
                          <TableCell className="text-xs">{fmtDT(r.submittedAt)}</TableCell>
                          <TableCell className="text-xs">{fmtDate(r.validTill)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[220px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openDetail(r)}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {r.status === "PREAUTH_DRAFT" && (
                                  <DropdownMenuItem onClick={() => void submitPreauth(r.id)}>
                                    <Send className="mr-2 h-4 w-4" /> Submit
                                  </DropdownMenuItem>
                                )}
                                {(r.status === "PREAUTH_SUBMITTED" || r.status === "PREAUTH_RESPONDED") && (
                                  <>
                                    <DropdownMenuItem onClick={() => openApprove(r.id, r.requestedAmount)}>
                                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openReject(r.id)}>
                                      <XCircle className="mr-2 h-4 w-4 text-red-600" /> Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openAddQuery(r.id)}>
                                  <MessageSquare className="mr-2 h-4 w-4" /> Add Query
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
            </CardContent>
          </Card>

          {/* ---------- Create Dialog ---------- */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className={drawerClassName("max-w-[720px]")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Create Pre-authorization
                </DialogTitle>
                <DialogDescription>
                  Submit a new preauth request linked to an insurance case.
                </DialogDescription>
              </DialogHeader>
              <Separator className="my-4" />

              <div className="max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Insurance Case ID</Label>
                    <Input className="mt-1 font-mono" value={fInsuranceCaseId} onChange={(e) => setFInsuranceCaseId(e.target.value)} placeholder="Case UUID" />
                  </div>
                  <div>
                    <Label>Request Number</Label>
                    <Input className="mt-1 font-mono" value={fRequestNumber} onChange={(e) => setFRequestNumber(e.target.value)} placeholder="PA-2026-0001" />
                  </div>
                  <div>
                    <Label>Requested Amount</Label>
                    <Input className="mt-1" type="number" min="0" step="0.01" value={fRequestedAmount} onChange={(e) => setFRequestedAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Package Code</Label>
                    <Input className="mt-1 font-mono" value={fPackageCode} onChange={(e) => setFPackageCode(e.target.value)} placeholder="PKG-001" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Procedure Summary</Label>
                    <Textarea className="mt-1" rows={2} value={fProcedureSummary} onChange={(e) => setFProcedureSummary(e.target.value)} placeholder="Summary of procedures..." />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Clinical Notes</Label>
                    <Textarea className="mt-1" rows={3} value={fClinicalNotes} onChange={(e) => setFClinicalNotes(e.target.value)} placeholder="Clinical justification..." />
                  </div>
                </div>

                {/* Clinical Information Section */}
                <div className="mt-5 rounded-xl border border-indigo-200/50 bg-indigo-50/30 p-4 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                  <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3">Clinical Information</div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>Primary Diagnosis Code (ICD-10)</Label>
                      <Input className="mt-1 font-mono" value={fPrimaryDiagnosisCode} onChange={(e) => setFPrimaryDiagnosisCode(e.target.value)} placeholder="e.g. J18.9" />
                    </div>
                    <div>
                      <Label>Primary Diagnosis Description</Label>
                      <Input className="mt-1" value={fPrimaryDiagnosisDescription} onChange={(e) => setFPrimaryDiagnosisDescription(e.target.value)} placeholder="Pneumonia, unspecified organism" />
                    </div>
                    <div>
                      <Label>Secondary Diagnosis Codes</Label>
                      <Input className="mt-1 font-mono" value={fSecondaryDiagnosisCodes} onChange={(e) => setFSecondaryDiagnosisCodes(e.target.value)} placeholder="e.g. E11.9, I10" />
                      <span className="text-xs text-zc-muted">Comma-separated ICD-10 codes</span>
                    </div>
                    <div>
                      <Label>Procedure Codes</Label>
                      <Input className="mt-1 font-mono" value={fProcedureCodes} onChange={(e) => setFProcedureCodes(e.target.value)} placeholder="e.g. 99213, 36415" />
                      <span className="text-xs text-zc-muted">Comma-separated CPT/procedure codes</span>
                    </div>
                    <div>
                      <Label>HBP Package Code (PM-JAY)</Label>
                      <Input className="mt-1 font-mono" value={fHbpPackageCode} onChange={(e) => setFHbpPackageCode(e.target.value)} placeholder="e.g. BP-123" />
                    </div>
                    <div>
                      <Label>Implant Details (optional)</Label>
                      <Input className="mt-1" value={fImplantDetails} onChange={(e) => setFImplantDetails(e.target.value)} placeholder="Implant name, make, serial no..." />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Investigation Summary (optional)</Label>
                      <Textarea className="mt-1" rows={2} value={fInvestigationSummary} onChange={(e) => setFInvestigationSummary(e.target.value)} placeholder="Summary of investigations and findings..." />
                    </div>
                    <div className="md:col-span-2">
                      <Label>OT Notes (optional)</Label>
                      <Textarea className="mt-1" rows={2} value={fOtNotes} onChange={(e) => setFOtNotes(e.target.value)} placeholder="Operation theatre notes..." />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void savePreauth()} disabled={busy}>
                  {busy ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating...</span>
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ---------- Approve Dialog ---------- */}
          <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
            <DialogContent className="max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" /> Approve Pre-authorization
                </DialogTitle>
                <DialogDescription>Set the approved amount and validity period.</DialogDescription>
              </DialogHeader>
              <Separator className="my-3" />
              <div className="grid gap-4">
                <div>
                  <Label>Approved Amount</Label>
                  <Input className="mt-1" type="number" min="0" step="0.01" value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Valid Till</Label>
                  <Input className="mt-1" type="date" value={approveValidTill} onChange={(e) => setApproveValidTill(e.target.value)} />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void confirmApprove()} disabled={busy} className="bg-green-600 hover:bg-green-700 text-white">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ---------- Reject Dialog ---------- */}
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogContent className="max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <XCircle className="h-5 w-5" /> Reject Pre-authorization
                </DialogTitle>
                <DialogDescription>Provide a reason for the rejection.</DialogDescription>
              </DialogHeader>
              <Separator className="my-3" />
              <div className="grid gap-4">
                <div>
                  <Label>Rejection Reason</Label>
                  <Textarea className="mt-1" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void confirmReject()} disabled={busy} variant="destructive">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ---------- Add Query Dialog ---------- */}
          <Dialog open={queryOpen} onOpenChange={setQueryOpen}>
            <DialogContent className="max-w-[520px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-zc-accent" /> Add Query
                </DialogTitle>
                <DialogDescription>Raise a query on this preauth request.</DialogDescription>
              </DialogHeader>
              <Separator className="my-3" />
              <div className="grid gap-4">
                <div>
                  <Label>Query Source</Label>
                  <Select value={querySource} onValueChange={setQuerySource}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TPA">TPA / Payer</SelectItem>
                      <SelectItem value="HOSPITAL">Hospital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Query Text</Label>
                  <Textarea className="mt-1" rows={3} value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Describe the query..." />
                </div>
                <div>
                  <Label>Response Deadline (optional)</Label>
                  <Input className="mt-1" type="datetime-local" value={queryDeadline} onChange={(e) => setQueryDeadline(e.target.value)} />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setQueryOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void saveQuery()} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Query"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ---------- Detail Drawer ---------- */}
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className={drawerClassName("max-w-[1020px]")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <FileCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Preauth: {detailRow?.requestNumber}
                </DialogTitle>
                <DialogDescription>
                  Pre-authorization details and query thread
                </DialogDescription>
              </DialogHeader>
              <Separator className="my-4" />

              {detailRow && (
                <div className="flex-1 overflow-y-auto">
                  {/* Status bar */}
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    {preauthStatusBadge(detailRow.status)}
                    <span className="text-xs text-zc-muted">v{detailRow.version}</span>
                    {detailRow.gatewayRefId && (
                      <span className="text-xs text-zc-muted">Gateway: {detailRow.gatewayRefId}</span>
                    )}
                  </div>

                  <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as any)}>
                    <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                      <TabsTrigger value="info" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm">
                        Details
                      </TabsTrigger>
                      <TabsTrigger value="queries" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm">
                        Queries ({detailRow.queries?.length || 0})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="mt-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Insurance Case</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            <div className="font-mono text-xs">{detailRow.insuranceCase?.caseNumber || detailRow.insuranceCaseId}</div>
                            <div className="mt-1 font-semibold">{detailRow.insuranceCase?.patient?.name || "--"}</div>
                            {detailRow.insuranceCase?.patient?.uhid && (
                              <div className="text-xs text-zc-muted">UHID: {detailRow.insuranceCase.patient.uhid}</div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Payer</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            <div className="font-semibold">{detailRow.insuranceCase?.payer?.name || "--"}</div>
                            {detailRow.insuranceCase?.payer?.code && (
                              <div className="text-xs text-zc-muted">{detailRow.insuranceCase.payer.code}</div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Financials</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-xs text-zc-muted">Requested</div>
                                <div className="font-semibold tabular-nums">{fmtCurrency(detailRow.requestedAmount)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-zc-muted">Approved</div>
                                <div className="font-semibold tabular-nums text-green-700 dark:text-green-300">{fmtCurrency(detailRow.approvedAmount)}</div>
                              </div>
                              {detailRow.enhancementAmount != null && (
                                <div>
                                  <div className="text-xs text-zc-muted">Enhancement</div>
                                  <div className="font-semibold tabular-nums text-orange-700 dark:text-orange-300">{fmtCurrency(detailRow.enhancementAmount)}</div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Timeline</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            <div className="grid gap-1">
                              <div className="flex justify-between"><span className="text-xs text-zc-muted">Submitted:</span><span className="text-xs">{fmtDT(detailRow.submittedAt)}</span></div>
                              <div className="flex justify-between"><span className="text-xs text-zc-muted">Approved:</span><span className="text-xs">{fmtDT(detailRow.approvedAt)}</span></div>
                              <div className="flex justify-between"><span className="text-xs text-zc-muted">Rejected:</span><span className="text-xs">{fmtDT(detailRow.rejectedAt)}</span></div>
                              <div className="flex justify-between"><span className="text-xs text-zc-muted">Valid Till:</span><span className="text-xs">{fmtDate(detailRow.validTill)}</span></div>
                            </div>
                          </CardContent>
                        </Card>
                        {detailRow.packageCode && (
                          <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Package</CardTitle></CardHeader>
                            <CardContent className="text-sm font-mono">{detailRow.packageCode}</CardContent>
                          </Card>
                        )}
                        {detailRow.procedureSummary && (
                          <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Procedure Summary</CardTitle></CardHeader>
                            <CardContent className="text-sm whitespace-pre-wrap">{detailRow.procedureSummary}</CardContent>
                          </Card>
                        )}
                        {detailRow.clinicalNotes && (
                          <Card className="md:col-span-2">
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Clinical Notes</CardTitle></CardHeader>
                            <CardContent className="text-sm whitespace-pre-wrap text-zc-muted">{detailRow.clinicalNotes}</CardContent>
                          </Card>
                        )}
                        {(detailRow.primaryDiagnosisCode || detailRow.secondaryDiagnosisCodes || detailRow.procedureCodes || detailRow.hbpPackageCode) && (
                          <Card className="md:col-span-2 border-indigo-200/50 dark:border-indigo-800/50">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-indigo-700 dark:text-indigo-300">Clinical Information</CardTitle></CardHeader>
                            <CardContent>
                              <div className="grid gap-3 md:grid-cols-2 text-sm">
                                {detailRow.primaryDiagnosisCode && (
                                  <div>
                                    <div className="text-xs text-zc-muted">Primary Diagnosis (ICD-10)</div>
                                    <div className="font-semibold font-mono">{detailRow.primaryDiagnosisCode}</div>
                                    {detailRow.primaryDiagnosisDescription && (
                                      <div className="text-xs text-zc-muted">{detailRow.primaryDiagnosisDescription}</div>
                                    )}
                                  </div>
                                )}
                                {detailRow.secondaryDiagnosisCodes && (
                                  <div>
                                    <div className="text-xs text-zc-muted">Secondary Diagnoses</div>
                                    <div className="font-mono text-xs">{detailRow.secondaryDiagnosisCodes}</div>
                                  </div>
                                )}
                                {detailRow.procedureCodes && (
                                  <div>
                                    <div className="text-xs text-zc-muted">Procedure Codes</div>
                                    <div className="font-mono text-xs">{detailRow.procedureCodes}</div>
                                  </div>
                                )}
                                {detailRow.hbpPackageCode && (
                                  <div>
                                    <div className="text-xs text-zc-muted">HBP Package Code (PM-JAY)</div>
                                    <div className="font-semibold font-mono">{detailRow.hbpPackageCode}</div>
                                  </div>
                                )}
                                {detailRow.implantDetails && (
                                  <div className="md:col-span-2">
                                    <div className="text-xs text-zc-muted">Implant Details</div>
                                    <div className="text-sm">{detailRow.implantDetails}</div>
                                  </div>
                                )}
                                {detailRow.investigationSummary && (
                                  <div className="md:col-span-2">
                                    <div className="text-xs text-zc-muted">Investigation Summary</div>
                                    <div className="text-sm whitespace-pre-wrap text-zc-muted">{detailRow.investigationSummary}</div>
                                  </div>
                                )}
                                {detailRow.otNotes && (
                                  <div className="md:col-span-2">
                                    <div className="text-xs text-zc-muted">OT Notes</div>
                                    <div className="text-sm whitespace-pre-wrap text-zc-muted">{detailRow.otNotes}</div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        {detailRow.rejectionReason && (
                          <Card className="md:col-span-2 border-red-200 dark:border-red-800">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">Rejection Reason</CardTitle></CardHeader>
                            <CardContent className="text-sm text-red-700 dark:text-red-300">{detailRow.rejectionReason}</CardContent>
                          </Card>
                        )}
                        {detailRow.enhancementReason && (
                          <Card className="md:col-span-2">
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Enhancement Reason</CardTitle></CardHeader>
                            <CardContent className="text-sm text-zc-muted">{detailRow.enhancementReason}</CardContent>
                          </Card>
                        )}
                      </div>
                      <div className="mt-4 text-xs text-zc-muted">
                        Created: {fmtDT(detailRow.createdAt)} | Updated: {fmtDT(detailRow.updatedAt)}
                      </div>
                    </TabsContent>

                    <TabsContent value="queries" className="mt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-semibold">Query Thread</div>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => openAddQuery(detailRow.id)}>
                          <Plus className="h-3.5 w-3.5" /> Add Query
                        </Button>
                      </div>

                      {(!detailRow.queries || detailRow.queries.length === 0) ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                          <MessageSquare className="h-6 w-6" />
                          No queries on this preauth request.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {detailRow.queries.map((qr) => (
                            <div key={qr.id} className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                {querySourceBadge(qr.querySource)}
                                <span className="text-xs text-zc-muted">{fmtDT(qr.queriedAt)}</span>
                                {qr.deadline && (
                                  <span className="text-xs text-amber-600 dark:text-amber-400">
                                    Deadline: {fmtDT(qr.deadline)}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm">{qr.queryText}</div>
                              {qr.responseText && (
                                <div className="mt-2 rounded-lg border border-zc-border bg-zc-card p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-[10px]">Response</Badge>
                                    <span className="text-xs text-zc-muted">{fmtDT(qr.respondedAt)}</span>
                                  </div>
                                  <div className="text-sm">{qr.responseText}</div>
                                </div>
                              )}
                              {qr.attachmentUrls && qr.attachmentUrls.length > 0 && (
                                <div className="mt-2 text-xs text-zc-muted">
                                  {qr.attachmentUrls.length} attachment{qr.attachmentUrls.length !== 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              <Separator className="my-4" />
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
