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
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Shield,
  X,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type CaseRow = {
  id: string;
  branchId: string;
  caseNumber: string;
  patientId: string;
  patient?: { id: string; uhid: string; name: string };
  encounterId: string;
  encounter?: { id: string; type: string; status: string; startedAt: string };
  admissionId?: string;
  policyId: string;
  policy?: { policyNumber: string; memberId: string };
  payerId: string;
  payer?: { id: string; code: string; name: string };
  contractId?: string;
  schemeConfigId?: string;
  caseType: string;
  status: string;
  treatingDoctorId?: string;
  primaryDiagnosis?: string;
  procedures: string[];
  packageCode?: string;
  packageName?: string;
  estimatedAmount?: number;
  approvedAmount?: number;
  claimedAmount?: number;
  settledAmount?: number;
  assignedToUserId?: string;
  slaDeadline?: string;
  escalatedAt?: string;
  notes?: string;
  preauthRequests?: any[];
  claims?: any[];
  createdAt: string;
  updatedAt: string;
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
    <div
      className={cn("animate-pulse rounded-md bg-zc-panel/30", className)}
    />
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

const CASE_STATUSES = [
  "DRAFT",
  "POLICY_VERIFIED",
  "PREAUTH_PENDING",
  "PREAUTH_APPROVED",
  "ADMITTED",
  "DISCHARGE_PENDING",
  "CLAIM_SUBMITTED",
  "CLAIM_APPROVED",
  "SETTLED",
  "CLOSED",
  "CANCELLED",
] as const;

type CaseStatus = (typeof CASE_STATUSES)[number];

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
    POLICY_VERIFIED: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    PREAUTH_PENDING: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
    PREAUTH_APPROVED: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    ADMITTED: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700",
    DISCHARGE_PENDING: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
    CLAIM_SUBMITTED: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
    CLAIM_APPROVED: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700",
    SETTLED: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
    CLOSED: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
    CANCELLED: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight",
        colors[status] || colors.DRAFT,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function caseTypeBadge(t: string) {
  const m: Record<string, string> = {
    CASHLESS: "bg-blue-600 text-white",
    REIMBURSEMENT: "bg-violet-600 text-white",
    PACKAGE: "bg-amber-600 text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        m[t] || "bg-gray-600 text-white",
      )}
    >
      {t}
    </span>
  );
}

function encounterBadge(t?: string) {
  if (!t) return null;
  const m: Record<string, string> = {
    OPD: "bg-sky-600 text-white",
    IPD: "bg-indigo-600 text-white",
    ER: "bg-red-600 text-white",
    EMERGENCY: "bg-red-600 text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        m[t.toUpperCase()] || "bg-gray-600 text-white",
      )}
    >
      {t.toUpperCase()}
    </span>
  );
}

function slaIndicator(deadline?: string | null) {
  if (!deadline) return null;
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  const hoursLeft = (dl - now) / (1000 * 60 * 60);
  if (hoursLeft < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
        <Clock className="h-3 w-3" /> Overdue
      </span>
    );
  }
  if (hoursLeft < 24) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
        <Clock className="h-3 w-3" /> {Math.round(hoursLeft)}h left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
      <Clock className="h-3 w-3" /> {Math.round(hoursLeft / 24)}d left
    </span>
  );
}

/** Allowed next states from a given status */
function allowedTransitions(current: string): string[] {
  const map: Record<string, string[]> = {
    DRAFT: ["POLICY_VERIFIED", "CANCELLED"],
    POLICY_VERIFIED: ["PREAUTH_PENDING", "ADMITTED", "CANCELLED"],
    PREAUTH_PENDING: ["PREAUTH_APPROVED", "CANCELLED"],
    PREAUTH_APPROVED: ["ADMITTED", "CANCELLED"],
    ADMITTED: ["DISCHARGE_PENDING"],
    DISCHARGE_PENDING: ["CLAIM_SUBMITTED"],
    CLAIM_SUBMITTED: ["CLAIM_APPROVED", "CANCELLED"],
    CLAIM_APPROVED: ["SETTLED"],
    SETTLED: ["CLOSED"],
    CLOSED: [],
    CANCELLED: [],
  };
  return map[current] || [];
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

export default function InsuranceCasesPage() {
  const { toast } = useToast();
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const [rows, setRows] = React.useState<CaseRow[]>([]);

  // filters
  const [q, setQ] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterPayer, setFilterPayer] = React.useState("all");
  const [filterCaseType, setFilterCaseType] = React.useState("all");
  const [showFilters, setShowFilters] = React.useState(false);

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "billing-insurance-cases",
    enabled: true,
  });

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [fCaseNumber, setFCaseNumber] = React.useState("");
  const [fPatientId, setFPatientId] = React.useState("");
  const [fEncounterId, setFEncounterId] = React.useState("");
  const [fPolicyId, setFPolicyId] = React.useState("");
  const [fPayerId, setFPayerId] = React.useState("");
  const [fCaseType, setFCaseType] = React.useState("CASHLESS");
  const [fTreatingDoctorId, setFTreatingDoctorId] = React.useState("");
  const [fPrimaryDiagnosis, setFPrimaryDiagnosis] = React.useState("");
  const [fProcedures, setFProcedures] = React.useState("");
  const [fPackageCode, setFPackageCode] = React.useState("");
  const [fPackageName, setFPackageName] = React.useState("");
  const [fEstimatedAmount, setFEstimatedAmount] = React.useState("");
  const [fSlaDeadline, setFSlaDeadline] = React.useState("");
  const [fNotes, setFNotes] = React.useState("");

  // Detail drawer
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailCase, setDetailCase] = React.useState<CaseRow | null>(null);
  const [detailTab, setDetailTab] = React.useState<"overview" | "preauth" | "claims">("overview");

  /* ---- data loading ---- */

  async function loadCases(showToast = false) {
    setLoading(true);
    try {
      const params = buildQS({
        q: q.trim() || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        payerId: filterPayer !== "all" ? filterPayer : undefined,
        caseType: filterCaseType !== "all" ? filterCaseType : undefined,
      });
      const res = await apiFetch<any>(`/api/billing/insurance-cases?${params}`);
      const list: CaseRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);
      if (showToast) toast({ title: "Refreshed", description: "Insurance cases reloaded." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load failed", description: e?.message || "Unknown error" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadCases(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => void loadCases(false), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filterStatus, filterPayer, filterCaseType]);

  /* ---- stats ---- */

  const stats = React.useMemo(() => {
    const total = rows.length;
    const open = rows.filter(
      (r) => r.status !== "CLOSED" && r.status !== "CANCELLED",
    ).length;
    const preauthPending = rows.filter(
      (r) => r.status === "PREAUTH_PENDING",
    ).length;
    const claimPending = rows.filter(
      (r) => r.status === "CLAIM_SUBMITTED",
    ).length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const settledThisMonth = rows.filter(
      (r) => r.status === "SETTLED" && new Date(r.updatedAt) >= monthStart,
    ).length;
    const totalApproved = rows.reduce(
      (acc, r) => acc + (r.approvedAmount || 0),
      0,
    );
    return { total, open, preauthPending, claimPending, settledThisMonth, totalApproved };
  }, [rows]);

  const uniquePayers = React.useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.payer) map.set(r.payer.id, `${r.payer.code} - ${r.payer.name}`);
    });
    return Array.from(map.entries());
  }, [rows]);

  /* ---- create ---- */

  function openCreate() {
    setFCaseNumber("");
    setFPatientId("");
    setFEncounterId("");
    setFPolicyId("");
    setFPayerId("");
    setFCaseType("CASHLESS");
    setFTreatingDoctorId("");
    setFPrimaryDiagnosis("");
    setFProcedures("");
    setFPackageCode("");
    setFPackageName("");
    setFEstimatedAmount("");
    setFSlaDeadline("");
    setFNotes("");
    setCreateOpen(true);
  }

  async function saveCase() {
    if (!fCaseNumber.trim() || !fPatientId.trim() || !fEncounterId.trim() || !fPolicyId.trim() || !fPayerId.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Case Number, Patient ID, Encounter ID, Policy ID, and Payer ID are required." });
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        caseNumber: fCaseNumber.trim(),
        patientId: fPatientId.trim(),
        encounterId: fEncounterId.trim(),
        policyId: fPolicyId.trim(),
        payerId: fPayerId.trim(),
        caseType: fCaseType,
        treatingDoctorId: fTreatingDoctorId.trim() || undefined,
        primaryDiagnosis: fPrimaryDiagnosis.trim() || undefined,
        procedures: fProcedures
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        packageCode: fPackageCode.trim() || undefined,
        packageName: fPackageName.trim() || undefined,
        estimatedAmount: fEstimatedAmount ? Number(fEstimatedAmount) : undefined,
        slaDeadline: fSlaDeadline || undefined,
        notes: fNotes.trim() || undefined,
      };
      await apiFetch("/api/billing/insurance-cases", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({ title: "Insurance case created" });
      setCreateOpen(false);
      await loadCases(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Create failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  /* ---- detail ---- */

  function openDetail(row: CaseRow) {
    setDetailCase(row);
    setDetailTab("overview");
    setDetailOpen(true);
  }

  /* ---- state transition ---- */

  async function transitionCase(id: string, targetStatus: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/billing/insurance-cases/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ targetStatus }),
      });
      toast({ title: "Status updated", description: `Case moved to ${targetStatus.replace(/_/g, " ")}.` });
      await loadCases(false);
      // update detail drawer if open
      if (detailCase?.id === id) {
        const updated = rows.find((r) => r.id === id);
        if (updated) setDetailCase({ ...updated, status: targetStatus });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Transition failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  /* ---- render ---- */

  return (
    <AppShell title="Billing - Insurance Cases">
      <RequirePerm perm="BILLING_CASE_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <Shield className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Insurance Cases</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Track insurance cases from policy verification through claim settlement.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="px-5 gap-2"
                onClick={() => void loadCases(true)}
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
                New Case
              </Button>
            </div>
          </div>

          <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Cases</div>
              <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
              <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Open</div>
              <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{stats.open}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Preauth Pending</div>
              <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{stats.preauthPending}</div>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900/50 dark:bg-purple-900/10">
              <div className="text-xs font-medium text-purple-700 dark:text-purple-300">Claim Pending</div>
              <div className="mt-1 text-lg font-bold text-purple-800 dark:text-purple-200">{stats.claimPending}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Settled This Month</div>
              <div className="mt-1 text-lg font-bold text-emerald-800 dark:text-emerald-200">{stats.settledThisMonth}</div>
            </div>
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900/50 dark:bg-teal-900/10">
              <div className="text-xs font-medium text-teal-700 dark:text-teal-300">Total Approved</div>
              <div className="mt-1 text-lg font-bold text-teal-800 dark:text-teal-200">{fmtCurrency(stats.totalApproved)}</div>
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
                    placeholder="Search case number or patient..."
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowFilters((s) => !s)}
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Button>
              </div>

              {showFilters && (
                <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4 md:grid-cols-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {CASE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Payer</Label>
                    <Select value={filterPayer} onValueChange={setFilterPayer}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Payers</SelectItem>
                        {uniquePayers.map(([id, label]) => (
                          <SelectItem key={id} value={id}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Case Type</Label>
                    <Select value={filterCaseType} onValueChange={setFilterCaseType}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="CASHLESS">Cashless</SelectItem>
                        <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                        <SelectItem value="PACKAGE">Package</SelectItem>
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
                  <CardTitle className="text-base">Cases</CardTitle>
                  <CardDescription>
                    {rows.length} case{rows.length !== 1 ? "s" : ""} found
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="overflow-auto rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Case No</TableHead>
                      <TableHead className="w-[180px]">Patient</TableHead>
                      <TableHead className="w-[80px]">Encounter</TableHead>
                      <TableHead className="w-[140px]">Payer</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="w-[100px] text-right">Est. Amt</TableHead>
                      <TableHead className="w-[100px] text-right">Approved</TableHead>
                      <TableHead className="w-[90px]">SLA</TableHead>
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
                            <Briefcase className="h-6 w-6" />
                            No insurance cases found.
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
                          <TableCell className="font-mono text-xs font-semibold">{r.caseNumber}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{r.patient?.name || r.patientId}</div>
                            {r.patient?.uhid && (
                              <div className="text-xs text-zc-muted">UHID: {r.patient.uhid}</div>
                            )}
                          </TableCell>
                          <TableCell>{encounterBadge(r.encounter?.type)}</TableCell>
                          <TableCell>
                            <div className="text-sm">{r.payer?.name || r.payerId}</div>
                            {r.payer?.code && (
                              <div className="text-xs text-zc-muted">{r.payer.code}</div>
                            )}
                          </TableCell>
                          <TableCell>{caseTypeBadge(r.caseType)}</TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {fmtCurrency(r.estimatedAmount)}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums font-semibold">
                            {fmtCurrency(r.approvedAmount)}
                          </TableCell>
                          <TableCell>{slaIndicator(r.slaDeadline)}</TableCell>
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
                                <DropdownMenuLabel>Transition To</DropdownMenuLabel>
                                {allowedTransitions(r.status).length === 0 ? (
                                  <DropdownMenuItem disabled>No transitions available</DropdownMenuItem>
                                ) : (
                                  allowedTransitions(r.status).map((ts) => (
                                    <DropdownMenuItem key={ts} onClick={() => void transitionCase(r.id, ts)}>
                                      <ChevronRight className="mr-2 h-4 w-4" />
                                      {ts.replace(/_/g, " ")}
                                    </DropdownMenuItem>
                                  ))
                                )}
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
            <DialogContent className={drawerClassName("max-w-[820px]")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Create Insurance Case
                </DialogTitle>
                <DialogDescription>
                  Initiate a new insurance case for a patient encounter.
                </DialogDescription>
              </DialogHeader>
              <Separator className="my-4" />

              <div className="max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Case Number</Label>
                    <Input className="mt-1 font-mono" value={fCaseNumber} onChange={(e) => setFCaseNumber(e.target.value)} placeholder="IC-2026-0001" />
                  </div>
                  <div>
                    <Label>Patient ID</Label>
                    <Input className="mt-1 font-mono" value={fPatientId} onChange={(e) => setFPatientId(e.target.value)} placeholder="Patient UUID" />
                  </div>
                  <div>
                    <Label>Encounter ID</Label>
                    <Input className="mt-1 font-mono" value={fEncounterId} onChange={(e) => setFEncounterId(e.target.value)} placeholder="Encounter UUID" />
                  </div>
                  <div>
                    <Label>Policy ID</Label>
                    <Input className="mt-1 font-mono" value={fPolicyId} onChange={(e) => setFPolicyId(e.target.value)} placeholder="Policy UUID" />
                  </div>
                  <div>
                    <Label>Payer ID</Label>
                    <Input className="mt-1 font-mono" value={fPayerId} onChange={(e) => setFPayerId(e.target.value)} placeholder="Payer UUID" />
                  </div>
                  <div>
                    <Label>Case Type</Label>
                    <Select value={fCaseType} onValueChange={setFCaseType}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASHLESS">Cashless</SelectItem>
                        <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                        <SelectItem value="PACKAGE">Package</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Treating Doctor ID (optional)</Label>
                    <Input className="mt-1" value={fTreatingDoctorId} onChange={(e) => setFTreatingDoctorId(e.target.value)} placeholder="Doctor UUID" />
                  </div>
                  <div>
                    <Label>Primary Diagnosis</Label>
                    <Input className="mt-1" value={fPrimaryDiagnosis} onChange={(e) => setFPrimaryDiagnosis(e.target.value)} placeholder="e.g. Acute appendicitis" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Procedures (comma-separated)</Label>
                    <Input className="mt-1" value={fProcedures} onChange={(e) => setFProcedures(e.target.value)} placeholder="Appendectomy, Anesthesia" />
                  </div>
                  <div>
                    <Label>Package Code</Label>
                    <Input className="mt-1 font-mono" value={fPackageCode} onChange={(e) => setFPackageCode(e.target.value)} placeholder="PKG-001" />
                  </div>
                  <div>
                    <Label>Package Name</Label>
                    <Input className="mt-1" value={fPackageName} onChange={(e) => setFPackageName(e.target.value)} placeholder="Appendectomy Package" />
                  </div>
                  <div>
                    <Label>Estimated Amount</Label>
                    <Input className="mt-1" type="number" min="0" step="0.01" value={fEstimatedAmount} onChange={(e) => setFEstimatedAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>SLA Deadline</Label>
                    <Input className="mt-1" type="datetime-local" value={fSlaDeadline} onChange={(e) => setFSlaDeadline(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea className="mt-1" rows={3} value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Any additional notes..." />
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void saveCase()} disabled={busy}>
                  {busy ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating...</span>
                  ) : (
                    "Create Case"
                  )}
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
                    <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Case: {detailCase?.caseNumber}
                </DialogTitle>
                <DialogDescription>
                  Full details for insurance case {detailCase?.caseNumber}
                </DialogDescription>
              </DialogHeader>
              <Separator className="my-4" />

              {detailCase && (
                <div className="flex-1 overflow-y-auto">
                  {/* Status + transition bar */}
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    {statusBadge(detailCase.status)}
                    {caseTypeBadge(detailCase.caseType)}
                    {slaIndicator(detailCase.slaDeadline)}
                    <div className="flex-1" />
                    {allowedTransitions(detailCase.status).length > 0 && (
                      <Select
                        value=""
                        onValueChange={(v) => {
                          if (v) void transitionCase(detailCase.id, v);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[200px] text-xs">
                          <SelectValue placeholder="Transition to..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedTransitions(detailCase.status).map((ts) => (
                            <SelectItem key={ts} value={ts}>{ts.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as any)}>
                    <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                      <TabsTrigger value="overview" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm">
                        Overview
                      </TabsTrigger>
                      <TabsTrigger value="preauth" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm">
                        Preauth ({detailCase.preauthRequests?.length || 0})
                      </TabsTrigger>
                      <TabsTrigger value="claims" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm">
                        Claims ({detailCase.claims?.length || 0})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Patient</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            <div className="font-semibold">{detailCase.patient?.name || detailCase.patientId}</div>
                            {detailCase.patient?.uhid && <div className="text-xs text-zc-muted">UHID: {detailCase.patient.uhid}</div>}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Encounter</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            <div className="flex items-center gap-2">
                              {encounterBadge(detailCase.encounter?.type)}
                              <span className="text-xs text-zc-muted">{detailCase.encounter?.status}</span>
                            </div>
                            <div className="mt-1 text-xs text-zc-muted">Started: {fmtDT(detailCase.encounter?.startedAt)}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Payer / Policy</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            <div className="font-semibold">{detailCase.payer?.name || detailCase.payerId}</div>
                            {detailCase.payer?.code && <div className="text-xs text-zc-muted">Code: {detailCase.payer.code}</div>}
                            {detailCase.policy && (
                              <div className="mt-1 text-xs text-zc-muted">
                                Policy: {detailCase.policy.policyNumber} | Member: {detailCase.policy.memberId}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Diagnosis / Procedures</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            <div className="font-semibold">{detailCase.primaryDiagnosis || "--"}</div>
                            {detailCase.procedures && detailCase.procedures.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {detailCase.procedures.map((p, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Package</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm">
                            {detailCase.packageCode ? (
                              <>
                                <div className="font-mono text-xs">{detailCase.packageCode}</div>
                                <div>{detailCase.packageName || "--"}</div>
                              </>
                            ) : (
                              <span className="text-zc-muted">No package</span>
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
                                <div className="text-xs text-zc-muted">Estimated</div>
                                <div className="font-semibold tabular-nums">{fmtCurrency(detailCase.estimatedAmount)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-zc-muted">Approved</div>
                                <div className="font-semibold tabular-nums text-green-700 dark:text-green-300">{fmtCurrency(detailCase.approvedAmount)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-zc-muted">Claimed</div>
                                <div className="font-semibold tabular-nums">{fmtCurrency(detailCase.claimedAmount)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-zc-muted">Settled</div>
                                <div className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{fmtCurrency(detailCase.settledAmount)}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      {detailCase.notes && (
                        <Card className="mt-4">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Notes</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-zc-muted whitespace-pre-wrap">
                            {detailCase.notes}
                          </CardContent>
                        </Card>
                      )}
                      <div className="mt-4 text-xs text-zc-muted">
                        Created: {fmtDT(detailCase.createdAt)} | Updated: {fmtDT(detailCase.updatedAt)}
                      </div>
                    </TabsContent>

                    <TabsContent value="preauth" className="mt-4">
                      {(!detailCase.preauthRequests || detailCase.preauthRequests.length === 0) ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                          <FileText className="h-6 w-6" />
                          No preauth requests linked to this case.
                        </div>
                      ) : (
                        <div className="overflow-auto rounded-xl border border-zc-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Request No</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Requested</TableHead>
                                <TableHead className="text-right">Approved</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Valid Till</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailCase.preauthRequests.map((pr: any) => (
                                <TableRow key={pr.id}>
                                  <TableCell className="font-mono text-xs">{pr.requestNumber}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">{pr.status?.replace(/_/g, " ")}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{fmtCurrency(pr.requestedAmount)}</TableCell>
                                  <TableCell className="text-right tabular-nums">{fmtCurrency(pr.approvedAmount)}</TableCell>
                                  <TableCell className="text-xs">{fmtDT(pr.submittedAt)}</TableCell>
                                  <TableCell className="text-xs">{fmtDate(pr.validTill)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="claims" className="mt-4">
                      {(!detailCase.claims || detailCase.claims.length === 0) ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                          <FileText className="h-6 w-6" />
                          No claims linked to this case.
                        </div>
                      ) : (
                        <div className="overflow-auto rounded-xl border border-zc-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Claim No</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Approved</TableHead>
                                <TableHead className="text-right">Paid</TableHead>
                                <TableHead>Submitted</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailCase.claims.map((cl: any) => (
                                <TableRow key={cl.id}>
                                  <TableCell className="font-mono text-xs">{cl.claimNumber}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">{cl.claimType}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">{cl.status?.replace(/_/g, " ")}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{fmtCurrency(cl.totalAmount)}</TableCell>
                                  <TableCell className="text-right tabular-nums">{fmtCurrency(cl.approvedAmount)}</TableCell>
                                  <TableCell className="text-right tabular-nums">{fmtCurrency(cl.paidAmount)}</TableCell>
                                  <TableCell className="text-xs">{fmtDT(cl.submittedAt)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
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
