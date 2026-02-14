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
import { Switch } from "@/components/ui/switch";
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
  ArrowUpRight,
  BookCopy,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  Eye,
  FileText,
  Filter,
  History,
  Loader2,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type ClaimRow = {
  id: string;
  branchId: string;
  insuranceCaseId: string;
  insuranceCase?: {
    caseNumber: string;
    patient?: { uhid: string; name: string };
    payer?: { code: string; name: string };
  };
  claimNumber: string;
  claimType: string;
  version: number;
  status: string;
  totalAmount?: number;
  approvedAmount?: number;
  deductedAmount?: number;
  paidAmount?: number;
  submittedAt?: string;
  acknowledgedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  paidAt?: string;
  rejectionReason?: string;
  gatewayRefId?: string;
  resubmissionOfId?: string;
  notes?: string;
  lineItems?: ClaimLineRow[];
  deductions?: ClaimDeductionRow[];
  versions?: ClaimVersionRow[];
  _count?: { lineItems: number };
  createdAt: string;
  updatedAt: string;
};

type ClaimLineRow = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  approvedQuantity?: number;
  approvedUnitPrice?: number;
  approvedTotal?: number;
  deniedAmount?: number;
  denialReasonCode?: string;
  denialNotes?: string;
  serviceItem?: { code: string; name: string };
  chargeMasterItem?: { code: string; name: string };
  packageCode?: string;
  hsnSac?: string;
  icdCode?: string;
  icdDescription?: string;
  cptCode?: string;
  cptDescription?: string;
  snomedCode?: string;
  modifiers?: string[];
  placeOfService?: string;
  diagnosisRef?: string;
};

type ClaimDeductionRow = {
  id: string;
  reasonCode: string;
  reasonCategory: string;
  description: string;
  amount: number;
  isDisputed: boolean;
  disputeNotes?: string;
};

type ClaimVersionRow = {
  id: string;
  versionNumber: number;
  createdAt: string;
  changeReason?: string;
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

const CLAIM_STATUSES = [
  "CLAIM_DRAFT",
  "CLAIM_SUBMITTED",
  "CLAIM_ACKNOWLEDGED",
  "CLAIM_QUERY_RAISED",
  "CLAIM_RESPONDED",
  "CLAIM_UNDER_REVIEW",
  "CLAIM_APPROVED",
  "CLAIM_PARTIALLY_APPROVED",
  "CLAIM_REJECTED",
  "CLAIM_DEDUCTED",
  "CLAIM_PAID",
  "CLAIM_CLOSED",
  "CLAIM_RESUBMITTED",
] as const;

function claimStatusBadge(status: string) {
  const colors: Record<string, string> = {
    CLAIM_DRAFT: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
    CLAIM_SUBMITTED: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    CLAIM_ACKNOWLEDGED: "bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700",
    CLAIM_QUERY_RAISED: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
    CLAIM_RESPONDED: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700",
    CLAIM_UNDER_REVIEW: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700",
    CLAIM_APPROVED: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    CLAIM_PARTIALLY_APPROVED: "bg-lime-100 text-lime-700 border-lime-300 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-700",
    CLAIM_REJECTED: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
    CLAIM_DEDUCTED: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
    CLAIM_PAID: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
    CLAIM_CLOSED: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
    CLAIM_RESUBMITTED: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight",
        colors[status] || colors.CLAIM_DRAFT,
      )}
    >
      {status.replace(/^CLAIM_/, "").replace(/_/g, " ")}
    </span>
  );
}

function claimTypeBadge(t: string) {
  const m: Record<string, string> = {
    FINAL: "bg-blue-600 text-white",
    INTERIM: "bg-amber-600 text-white",
    ENHANCEMENT: "bg-violet-600 text-white",
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

function deductionCategoryBadge(cat: string) {
  const m: Record<string, string> = {
    NON_PAYABLE: "bg-red-100 text-red-700 border-red-200",
    EXCESS: "bg-amber-100 text-amber-700 border-amber-200",
    COPAY: "bg-blue-100 text-blue-700 border-blue-200",
    DISCOUNT: "bg-green-100 text-green-700 border-green-200",
    OTHER: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", m[cat] || m.OTHER)}>
      {cat}
    </span>
  );
}

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[1100px] translate-x-0 translate-y-0",
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

export default function ClaimsPage() {
  const { toast } = useToast();
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const [rows, setRows] = React.useState<ClaimRow[]>([]);

  // Filters
  const [q, setQ] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterType, setFilterType] = React.useState("all");
  const [showFilters, setShowFilters] = React.useState(false);

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "billing-claims",
    enabled: true,
  });

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [fInsuranceCaseId, setFInsuranceCaseId] = React.useState("");
  const [fClaimNumber, setFClaimNumber] = React.useState("");
  const [fClaimType, setFClaimType] = React.useState("FINAL");
  const [fTotalAmount, setFTotalAmount] = React.useState("");
  const [fNotes, setFNotes] = React.useState("");

  // Detail drawer
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailRow, setDetailRow] = React.useState<ClaimRow | null>(null);
  const [detailTab, setDetailTab] = React.useState<"lines" | "deductions" | "versions">("lines");

  // Add line item dialog
  const [lineOpen, setLineOpen] = React.useState(false);
  const [lineClaimId, setLineClaimId] = React.useState("");
  const [lineDescription, setLineDescription] = React.useState("");
  const [lineServiceItemId, setLineServiceItemId] = React.useState("");
  const [lineChargeMasterItemId, setLineChargeMasterItemId] = React.useState("");
  const [lineQty, setLineQty] = React.useState("1");
  const [lineUnitPrice, setLineUnitPrice] = React.useState("");
  const [lineTotalPrice, setLineTotalPrice] = React.useState("");
  const [linePackageCode, setLinePackageCode] = React.useState("");
  const [lineHsnSac, setLineHsnSac] = React.useState("");
  const [lineIcdCode, setLineIcdCode] = React.useState("");
  const [lineIcdDescription, setLineIcdDescription] = React.useState("");
  const [lineCptCode, setLineCptCode] = React.useState("");
  const [lineCptDescription, setLineCptDescription] = React.useState("");
  const [lineSnomedCode, setLineSnomedCode] = React.useState("");
  const [linePlaceOfService, setLinePlaceOfService] = React.useState("");
  const [lineClinicalOpen, setLineClinicalOpen] = React.useState(false);

  // Add deduction dialog
  const [deductionOpen, setDeductionOpen] = React.useState(false);
  const [deductionClaimId, setDeductionClaimId] = React.useState("");
  const [deductionReasonCode, setDeductionReasonCode] = React.useState("");
  const [deductionCategory, setDeductionCategory] = React.useState("NON_PAYABLE");
  const [deductionDescription, setDeductionDescription] = React.useState("");
  const [deductionAmount, setDeductionAmount] = React.useState("");
  const [deductionDisputed, setDeductionDisputed] = React.useState(false);
  const [deductionDisputeNotes, setDeductionDisputeNotes] = React.useState("");

  /* ---- data loading ---- */

  async function loadClaims(showToast = false) {
    setLoading(true);
    try {
      const params = buildQS({
        q: q.trim() || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        claimType: filterType !== "all" ? filterType : undefined,
      });
      const res = await apiFetch<any>(`/api/billing/claims?${params}`);
      const list: ClaimRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);
      if (showToast) toast({ title: "Refreshed", description: "Claims reloaded." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load failed", description: e?.message || "Unknown error" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadClaims(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => void loadClaims(false), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filterStatus, filterType]);

  /* ---- stats ---- */

  const stats = React.useMemo(() => {
    const total = rows.length;
    const draft = rows.filter((r) => r.status === "CLAIM_DRAFT").length;
    const submitted = rows.filter((r) => r.status === "CLAIM_SUBMITTED" || r.status === "CLAIM_ACKNOWLEDGED" || r.status === "CLAIM_UNDER_REVIEW").length;
    const approved = rows.filter((r) => r.status === "CLAIM_APPROVED" || r.status === "CLAIM_PARTIALLY_APPROVED").length;
    const paid = rows.filter((r) => r.status === "CLAIM_PAID").length;
    const totalClaimed = rows.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
    const totalApproved = rows.reduce((acc, r) => acc + (r.approvedAmount || 0), 0);
    const totalPaid = rows.reduce((acc, r) => acc + (r.paidAmount || 0), 0);
    return { total, draft, submitted, approved, paid, totalClaimed, totalApproved, totalPaid };
  }, [rows]);

  /* ---- create ---- */

  function openCreate() {
    setFInsuranceCaseId("");
    setFClaimNumber("");
    setFClaimType("FINAL");
    setFTotalAmount("");
    setFNotes("");
    setCreateOpen(true);
  }

  async function saveClaim() {
    if (!fInsuranceCaseId.trim() || !fClaimNumber.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Insurance Case ID and Claim Number are required." });
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        insuranceCaseId: fInsuranceCaseId.trim(),
        claimNumber: fClaimNumber.trim(),
        claimType: fClaimType,
        totalAmount: fTotalAmount ? Number(fTotalAmount) : undefined,
        notes: fNotes.trim() || undefined,
      };
      await apiFetch("/api/billing/claims", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({ title: "Claim created" });
      setCreateOpen(false);
      await loadClaims(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Create failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  /* ---- detail ---- */

  async function openDetail(row: ClaimRow) {
    setDetailTab("lines");
    setDetailOpen(true);
    // Fetch full claim with line items, deductions, versions
    try {
      const full = await apiFetch<ClaimRow>(`/api/billing/claims/${row.id}`);
      setDetailRow(full);
    } catch {
      setDetailRow(row);
    }
  }

  /* ---- actions ---- */

  async function submitClaim(id: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/billing/claims/${id}/submit`, { method: "POST" });
      toast({ title: "Claim submitted" });
      await loadClaims(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Submit failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function resubmitClaim(id: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/billing/claims/${id}/resubmit`, { method: "POST" });
      toast({ title: "Claim resubmitted", description: "A new version has been created." });
      await loadClaims(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Resubmit failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function createSnapshot(id: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/billing/claims/${id}/snapshot`, { method: "POST" });
      toast({ title: "Snapshot created" });
      // Reload detail
      if (detailRow?.id === id) {
        try {
          const full = await apiFetch<ClaimRow>(`/api/billing/claims/${id}`);
          setDetailRow(full);
        } catch { /* keep current */ }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Snapshot failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  /* ---- line items ---- */

  function openAddLine(claimId: string) {
    setLineClaimId(claimId);
    setLineDescription("");
    setLineServiceItemId("");
    setLineChargeMasterItemId("");
    setLineQty("1");
    setLineUnitPrice("");
    setLineTotalPrice("");
    setLinePackageCode("");
    setLineHsnSac("");
    setLineIcdCode("");
    setLineIcdDescription("");
    setLineCptCode("");
    setLineCptDescription("");
    setLineSnomedCode("");
    setLinePlaceOfService("");
    setLineClinicalOpen(false);
    setLineOpen(true);
  }

  async function saveLine() {
    if (!lineDescription.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Description is required." });
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        description: lineDescription.trim(),
        serviceItemId: lineServiceItemId.trim() || undefined,
        chargeMasterItemId: lineChargeMasterItemId.trim() || undefined,
        quantity: lineQty ? Number(lineQty) : 1,
        unitPrice: lineUnitPrice ? Number(lineUnitPrice) : 0,
        totalPrice: lineTotalPrice ? Number(lineTotalPrice) : 0,
        packageCode: linePackageCode.trim() || undefined,
        hsnSac: lineHsnSac.trim() || undefined,
        icdCode: lineIcdCode.trim() || undefined,
        icdDescription: lineIcdDescription.trim() || undefined,
        cptCode: lineCptCode.trim() || undefined,
        cptDescription: lineCptDescription.trim() || undefined,
        snomedCode: lineSnomedCode.trim() || undefined,
        placeOfService: linePlaceOfService || undefined,
      };
      await apiFetch(`/api/billing/claims/${lineClaimId}/line-items`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({ title: "Line item added" });
      setLineOpen(false);
      // refresh detail
      if (detailRow?.id === lineClaimId) {
        try {
          const full = await apiFetch<ClaimRow>(`/api/billing/claims/${lineClaimId}`);
          setDetailRow(full);
        } catch { /* keep current */ }
      }
      await loadClaims(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Add line failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteLine(claimId: string, lineId: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/billing/claims/${claimId}/line-items/${lineId}`, { method: "DELETE" });
      toast({ title: "Line item removed" });
      if (detailRow?.id === claimId) {
        try {
          const full = await apiFetch<ClaimRow>(`/api/billing/claims/${claimId}`);
          setDetailRow(full);
        } catch { /* keep current */ }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  /* ---- deductions ---- */

  function openAddDeduction(claimId: string) {
    setDeductionClaimId(claimId);
    setDeductionReasonCode("");
    setDeductionCategory("NON_PAYABLE");
    setDeductionDescription("");
    setDeductionAmount("");
    setDeductionDisputed(false);
    setDeductionDisputeNotes("");
    setDeductionOpen(true);
  }

  async function saveDeduction() {
    if (!deductionReasonCode.trim() || !deductionDescription.trim() || !deductionAmount) {
      toast({ variant: "destructive", title: "Validation", description: "Reason code, description, and amount are required." });
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        reasonCode: deductionReasonCode.trim(),
        reasonCategory: deductionCategory,
        description: deductionDescription.trim(),
        amount: Number(deductionAmount),
        isDisputed: deductionDisputed,
        disputeNotes: deductionDisputeNotes.trim() || undefined,
      };
      await apiFetch(`/api/billing/claims/${deductionClaimId}/deductions`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({ title: "Deduction added" });
      setDeductionOpen(false);
      if (detailRow?.id === deductionClaimId) {
        try {
          const full = await apiFetch<ClaimRow>(`/api/billing/claims/${deductionClaimId}`);
          setDetailRow(full);
        } catch { /* keep current */ }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Add deduction failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  /* ---- render ---- */

  return (
    <AppShell title="Billing - Claims">
      <RequirePerm perm="BILLING_CLAIM_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <FileText className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Claims</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Submit, track, and manage insurance claims with line items, deductions, and versioning.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="px-5 gap-2"
                onClick={() => void loadClaims(true)}
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
                New Claim
              </Button>
            </div>
          </div>

          <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-8">
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</div>
              <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/30">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Draft</div>
              <div className="mt-1 text-lg font-bold text-gray-700 dark:text-gray-300">{stats.draft}</div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
              <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Submitted</div>
              <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{stats.submitted}</div>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 dark:border-green-900/50 dark:bg-green-900/10">
              <div className="text-xs font-medium text-green-700 dark:text-green-300">Approved</div>
              <div className="mt-1 text-lg font-bold text-green-800 dark:text-green-200">{stats.approved}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Paid</div>
              <div className="mt-1 text-lg font-bold text-emerald-800 dark:text-emerald-200">{stats.paid}</div>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-900/10">
              <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Total Claimed</div>
              <div className="mt-1 text-lg font-bold text-indigo-800 dark:text-indigo-200">{fmtCurrency(stats.totalClaimed)}</div>
            </div>
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900/50 dark:bg-teal-900/10">
              <div className="text-xs font-medium text-teal-700 dark:text-teal-300">Total Approved</div>
              <div className="mt-1 text-lg font-bold text-teal-800 dark:text-teal-200">{fmtCurrency(stats.totalApproved)}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Total Paid</div>
              <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{fmtCurrency(stats.totalPaid)}</div>
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
                    placeholder="Search claim number, case, or patient..."
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
                  {showFilters ? "Hide Filters" : "Filters"}
                </Button>
              </div>

              {showFilters && (
                <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {CLAIM_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace(/^CLAIM_/, "").replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Claim Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="FINAL">Final</SelectItem>
                        <SelectItem value="INTERIM">Interim</SelectItem>
                        <SelectItem value="ENHANCEMENT">Enhancement</SelectItem>
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
                  <CardTitle className="text-base">Claims</CardTitle>
                  <CardDescription>
                    {rows.length} claim{rows.length !== 1 ? "s" : ""} found
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="overflow-auto rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Claim No</TableHead>
                      <TableHead className="w-[110px]">Case No</TableHead>
                      <TableHead className="w-[150px]">Patient</TableHead>
                      <TableHead className="w-[120px]">Payer</TableHead>
                      <TableHead className="w-[90px]">Type</TableHead>
                      <TableHead className="w-[90px] text-right">Total</TableHead>
                      <TableHead className="w-[90px] text-right">Approved</TableHead>
                      <TableHead className="w-[90px] text-right">Deducted</TableHead>
                      <TableHead className="w-[90px] text-right">Paid</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="w-[70px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11}>
                          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                            <FileText className="h-6 w-6" />
                            No claims found.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer hover:bg-zc-panel/20"
                          onClick={() => void openDetail(r)}
                        >
                          <TableCell className="font-mono text-xs font-semibold">{r.claimNumber}</TableCell>
                          <TableCell className="font-mono text-xs text-zc-muted">{r.insuranceCase?.caseNumber || "--"}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{r.insuranceCase?.patient?.name || "--"}</div>
                            {r.insuranceCase?.patient?.uhid && (
                              <div className="text-xs text-zc-muted">UHID: {r.insuranceCase.patient.uhid}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{r.insuranceCase?.payer?.name || "--"}</div>
                          </TableCell>
                          <TableCell>{claimTypeBadge(r.claimType)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{fmtCurrency(r.totalAmount)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums font-semibold">{fmtCurrency(r.approvedAmount)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-orange-600 dark:text-orange-400">{fmtCurrency(r.deductedAmount)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">{fmtCurrency(r.paidAmount)}</TableCell>
                          <TableCell>{claimStatusBadge(r.status)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[220px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => void openDetail(r)}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {r.status === "CLAIM_DRAFT" && (
                                  <DropdownMenuItem onClick={() => void submitClaim(r.id)}>
                                    <Send className="mr-2 h-4 w-4" /> Submit Claim
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openAddLine(r.id)}>
                                  <Plus className="mr-2 h-4 w-4" /> Add Line Item
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openAddDeduction(r.id)}>
                                  <Minus className="mr-2 h-4 w-4" /> Add Deduction
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void createSnapshot(r.id)}>
                                  <Copy className="mr-2 h-4 w-4" /> Create Snapshot
                                </DropdownMenuItem>
                                {(r.status === "CLAIM_REJECTED" || r.status === "CLAIM_DEDUCTED" || r.status === "CLAIM_PARTIALLY_APPROVED") && (
                                  <DropdownMenuItem onClick={() => void resubmitClaim(r.id)}>
                                    <ArrowUpRight className="mr-2 h-4 w-4" /> Resubmit
                                  </DropdownMenuItem>
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
            <DialogContent className={drawerClassName("max-w-[680px]")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Create Claim
                </DialogTitle>
                <DialogDescription>
                  File a new claim linked to an insurance case.
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
                    <Label>Claim Number</Label>
                    <Input className="mt-1 font-mono" value={fClaimNumber} onChange={(e) => setFClaimNumber(e.target.value)} placeholder="CLM-2026-0001" />
                  </div>
                  <div>
                    <Label>Claim Type</Label>
                    <Select value={fClaimType} onValueChange={setFClaimType}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FINAL">Final</SelectItem>
                        <SelectItem value="INTERIM">Interim</SelectItem>
                        <SelectItem value="ENHANCEMENT">Enhancement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <Input className="mt-1" type="number" min="0" step="0.01" value={fTotalAmount} onChange={(e) => setFTotalAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea className="mt-1" rows={3} value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Additional notes..." />
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void saveClaim()} disabled={busy}>
                  {busy ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating...</span>
                  ) : (
                    "Create Claim"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ---------- Add Line Item Dialog ---------- */}
          <Dialog open={lineOpen} onOpenChange={setLineOpen}>
            <DialogContent className="max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-zc-accent" /> Add Line Item
                </DialogTitle>
                <DialogDescription>Add a billable line item to this claim.</DialogDescription>
              </DialogHeader>
              <Separator className="my-3" />
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input className="mt-1" value={lineDescription} onChange={(e) => setLineDescription(e.target.value)} placeholder="Service description" />
                  </div>
                  <div>
                    <Label>Service Item ID (optional)</Label>
                    <Input className="mt-1 font-mono" value={lineServiceItemId} onChange={(e) => setLineServiceItemId(e.target.value)} placeholder="UUID" />
                  </div>
                  <div>
                    <Label>Charge Master Item ID (optional)</Label>
                    <Input className="mt-1 font-mono" value={lineChargeMasterItemId} onChange={(e) => setLineChargeMasterItemId(e.target.value)} placeholder="UUID" />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input className="mt-1" type="number" min="1" value={lineQty} onChange={(e) => setLineQty(e.target.value)} />
                  </div>
                  <div>
                    <Label>Unit Price</Label>
                    <Input className="mt-1" type="number" min="0" step="0.01" value={lineUnitPrice} onChange={(e) => setLineUnitPrice(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Total Price</Label>
                    <Input className="mt-1" type="number" min="0" step="0.01" value={lineTotalPrice} onChange={(e) => setLineTotalPrice(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Package Code (optional)</Label>
                    <Input className="mt-1 font-mono" value={linePackageCode} onChange={(e) => setLinePackageCode(e.target.value)} placeholder="PKG-001" />
                  </div>
                  <div>
                    <Label>HSN/SAC (optional)</Label>
                    <Input className="mt-1 font-mono" value={lineHsnSac} onChange={(e) => setLineHsnSac(e.target.value)} placeholder="998311" />
                  </div>
                </div>

                {/* Collapsible Clinical Coding Section */}
                <div className="mt-4 rounded-xl border border-zc-border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-zc-text hover:bg-zc-panel/20 transition-colors"
                    onClick={() => setLineClinicalOpen((v) => !v)}
                  >
                    <span>Clinical Coding</span>
                    {lineClinicalOpen ? (
                      <ChevronDown className="h-4 w-4 text-zc-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zc-muted" />
                    )}
                  </button>
                  {lineClinicalOpen && (
                    <div className="border-t border-zc-border px-4 pb-4 pt-3">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label>ICD-10 Code</Label>
                          <Input className="mt-1 font-mono" value={lineIcdCode} onChange={(e) => setLineIcdCode(e.target.value)} placeholder="e.g. J18.9" />
                        </div>
                        <div>
                          <Label>ICD-10 Description</Label>
                          <Input className="mt-1" value={lineIcdDescription} onChange={(e) => setLineIcdDescription(e.target.value)} placeholder="Pneumonia, unspecified organism" />
                        </div>
                        <div>
                          <Label>CPT/Procedure Code</Label>
                          <Input className="mt-1 font-mono" value={lineCptCode} onChange={(e) => setLineCptCode(e.target.value)} placeholder="e.g. 99213" />
                        </div>
                        <div>
                          <Label>CPT Description</Label>
                          <Input className="mt-1" value={lineCptDescription} onChange={(e) => setLineCptDescription(e.target.value)} placeholder="Office visit, established patient" />
                        </div>
                        <div>
                          <Label>SNOMED Code (optional)</Label>
                          <Input className="mt-1 font-mono" value={lineSnomedCode} onChange={(e) => setLineSnomedCode(e.target.value)} placeholder="e.g. 233604007" />
                        </div>
                        <div>
                          <Label>Place of Service</Label>
                          <Select value={linePlaceOfService} onValueChange={setLinePlaceOfService}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IP">IP - Inpatient</SelectItem>
                              <SelectItem value="OP">OP - Outpatient</SelectItem>
                              <SelectItem value="ER">ER - Emergency</SelectItem>
                              <SelectItem value="DC">DC - Day Care</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setLineOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void saveLine()} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Line"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ---------- Add Deduction Dialog ---------- */}
          <Dialog open={deductionOpen} onOpenChange={setDeductionOpen}>
            <DialogContent className="max-w-[560px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Minus className="h-5 w-5 text-orange-600" /> Add Deduction
                </DialogTitle>
                <DialogDescription>Record a deduction against this claim.</DialogDescription>
              </DialogHeader>
              <Separator className="my-3" />
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Reason Code</Label>
                    <Input className="mt-1 font-mono" value={deductionReasonCode} onChange={(e) => setDeductionReasonCode(e.target.value)} placeholder="DED-001" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={deductionCategory} onValueChange={setDeductionCategory}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NON_PAYABLE">Non-Payable</SelectItem>
                        <SelectItem value="EXCESS">Excess</SelectItem>
                        <SelectItem value="COPAY">Copay</SelectItem>
                        <SelectItem value="DISCOUNT">Discount</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input className="mt-1" value={deductionDescription} onChange={(e) => setDeductionDescription(e.target.value)} placeholder="Reason for deduction" />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input className="mt-1" type="number" min="0" step="0.01" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Disputed</div>
                      <div className="text-xs text-zc-muted">Mark this deduction as disputed</div>
                    </div>
                    <Switch checked={deductionDisputed} onCheckedChange={(v) => setDeductionDisputed(!!v)} />
                  </div>
                </div>
                {deductionDisputed && (
                  <div>
                    <Label>Dispute Notes</Label>
                    <Textarea className="mt-1" rows={2} value={deductionDisputeNotes} onChange={(e) => setDeductionDisputeNotes(e.target.value)} placeholder="Reason for disputing this deduction..." />
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setDeductionOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void saveDeduction()} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Deduction"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ---------- Detail Drawer ---------- */}
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className={drawerClassName("max-w-[1100px]")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Claim: {detailRow?.claimNumber}
                </DialogTitle>
                <DialogDescription>
                  Full claim details with line items, deductions, and version history
                </DialogDescription>
              </DialogHeader>
              <Separator className="my-4" />

              {detailRow && (
                <div className="flex-1 overflow-y-auto">
                  {/* Status bar */}
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    {claimStatusBadge(detailRow.status)}
                    {claimTypeBadge(detailRow.claimType)}
                    <span className="text-xs text-zc-muted">v{detailRow.version}</span>
                    {detailRow.gatewayRefId && (
                      <span className="text-xs text-zc-muted">Gateway: {detailRow.gatewayRefId}</span>
                    )}
                    {detailRow.resubmissionOfId && (
                      <Badge variant="secondary" className="text-[10px]">Resubmission</Badge>
                    )}
                  </div>

                  {/* Summary cards */}
                  <div className="grid gap-3 mb-4 md:grid-cols-4">
                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                      <div className="text-xs text-zc-muted">Total</div>
                      <div className="text-lg font-bold tabular-nums">{fmtCurrency(detailRow.totalAmount)}</div>
                    </div>
                    <div className="rounded-xl border border-green-200 bg-green-50/30 p-3 dark:border-green-900/40 dark:bg-green-900/10">
                      <div className="text-xs text-green-600 dark:text-green-400">Approved</div>
                      <div className="text-lg font-bold tabular-nums text-green-700 dark:text-green-300">{fmtCurrency(detailRow.approvedAmount)}</div>
                    </div>
                    <div className="rounded-xl border border-orange-200 bg-orange-50/30 p-3 dark:border-orange-900/40 dark:bg-orange-900/10">
                      <div className="text-xs text-orange-600 dark:text-orange-400">Deducted</div>
                      <div className="text-lg font-bold tabular-nums text-orange-700 dark:text-orange-300">{fmtCurrency(detailRow.deductedAmount)}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">Paid</div>
                      <div className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{fmtCurrency(detailRow.paidAmount)}</div>
                    </div>
                  </div>

                  {/* Case + payer info */}
                  <div className="grid gap-3 mb-4 md:grid-cols-2">
                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                      <div className="text-xs text-zc-muted mb-1">Insurance Case</div>
                      <div className="font-mono text-xs">{detailRow.insuranceCase?.caseNumber || detailRow.insuranceCaseId}</div>
                      <div className="text-sm font-semibold mt-1">{detailRow.insuranceCase?.patient?.name || "--"}</div>
                      {detailRow.insuranceCase?.patient?.uhid && (
                        <div className="text-xs text-zc-muted">UHID: {detailRow.insuranceCase.patient.uhid}</div>
                      )}
                    </div>
                    <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                      <div className="text-xs text-zc-muted mb-1">Payer</div>
                      <div className="text-sm font-semibold">{detailRow.insuranceCase?.payer?.name || "--"}</div>
                      {detailRow.insuranceCase?.payer?.code && (
                        <div className="text-xs text-zc-muted">{detailRow.insuranceCase.payer.code}</div>
                      )}
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-zc-muted">
                        <div>Submitted: {fmtDT(detailRow.submittedAt)}</div>
                        <div>Acknowledged: {fmtDT(detailRow.acknowledgedAt)}</div>
                        <div>Approved: {fmtDT(detailRow.approvedAt)}</div>
                        <div>Paid: {fmtDT(detailRow.paidAt)}</div>
                      </div>
                    </div>
                  </div>

                  {detailRow.rejectionReason && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50/30 p-3 dark:border-red-800 dark:bg-red-900/10">
                      <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Rejection Reason</div>
                      <div className="text-sm text-red-700 dark:text-red-300">{detailRow.rejectionReason}</div>
                    </div>
                  )}

                  {detailRow.notes && (
                    <div className="mb-4 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                      <div className="text-xs font-semibold text-zc-muted mb-1">Notes</div>
                      <div className="text-sm whitespace-pre-wrap">{detailRow.notes}</div>
                    </div>
                  )}

                  {/* Tabs */}
                  <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as any)}>
                    <TabsList className="h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                      <TabsTrigger value="lines" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm">
                        Line Items ({detailRow.lineItems?.length || detailRow._count?.lineItems || 0})
                      </TabsTrigger>
                      <TabsTrigger value="deductions" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm">
                        Deductions ({detailRow.deductions?.length || 0})
                      </TabsTrigger>
                      <TabsTrigger value="versions" className="rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm">
                        Versions ({detailRow.versions?.length || 0})
                      </TabsTrigger>
                    </TabsList>

                    {/* Line Items Tab */}
                    <TabsContent value="lines" className="mt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-semibold">Claim Line Items</div>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => openAddLine(detailRow.id)}>
                          <Plus className="h-3.5 w-3.5" /> Add Line
                        </Button>
                      </div>

                      {(!detailRow.lineItems || detailRow.lineItems.length === 0) ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                          <ClipboardList className="h-6 w-6" />
                          No line items yet. Add items to build the claim.
                        </div>
                      ) : (
                        <div className="overflow-auto rounded-xl border border-zc-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[60px] text-right">Qty</TableHead>
                                <TableHead className="w-[90px] text-right">Unit Price</TableHead>
                                <TableHead className="w-[90px] text-right">Total</TableHead>
                                <TableHead className="w-[70px] text-right">Appr Qty</TableHead>
                                <TableHead className="w-[90px] text-right">Appr Price</TableHead>
                                <TableHead className="w-[90px] text-right">Appr Total</TableHead>
                                <TableHead className="w-[80px] text-right">Denied</TableHead>
                                <TableHead className="w-[100px]">Reason</TableHead>
                                <TableHead className="w-[50px]" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailRow.lineItems.map((li) => (
                                <TableRow key={li.id}>
                                  <TableCell>
                                    <div className="text-sm font-medium">{li.description}</div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-zc-muted">
                                      {li.serviceItem && <span>Svc: {li.serviceItem.code}</span>}
                                      {li.chargeMasterItem && <span>CM: {li.chargeMasterItem.code}</span>}
                                      {li.packageCode && <span>Pkg: {li.packageCode}</span>}
                                      {li.hsnSac && <span>HSN: {li.hsnSac}</span>}
                                      {li.icdCode && (
                                        <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                          ICD: {li.icdCode}
                                        </span>
                                      )}
                                      {li.cptCode && (
                                        <span className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                          CPT: {li.cptCode}
                                        </span>
                                      )}
                                      {li.placeOfService && <span>POS: {li.placeOfService}</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{li.quantity}</TableCell>
                                  <TableCell className="text-right tabular-nums">{fmtCurrency(li.unitPrice)}</TableCell>
                                  <TableCell className="text-right tabular-nums font-semibold">{fmtCurrency(li.totalPrice)}</TableCell>
                                  <TableCell className="text-right tabular-nums text-green-700 dark:text-green-300">{li.approvedQuantity ?? "--"}</TableCell>
                                  <TableCell className="text-right tabular-nums text-green-700 dark:text-green-300">{fmtCurrency(li.approvedUnitPrice)}</TableCell>
                                  <TableCell className="text-right tabular-nums font-semibold text-green-700 dark:text-green-300">{fmtCurrency(li.approvedTotal)}</TableCell>
                                  <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">{fmtCurrency(li.deniedAmount)}</TableCell>
                                  <TableCell>
                                    {li.denialReasonCode && (
                                      <span className="text-xs text-zc-muted" title={li.denialNotes || undefined}>
                                        {li.denialReasonCode}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-500 hover:text-red-600"
                                      onClick={() => void deleteLine(detailRow.id, li.id)}
                                      disabled={busy}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    {/* Deductions Tab */}
                    <TabsContent value="deductions" className="mt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-semibold">Claim Deductions</div>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => openAddDeduction(detailRow.id)}>
                          <Plus className="h-3.5 w-3.5" /> Add Deduction
                        </Button>
                      </div>

                      {(!detailRow.deductions || detailRow.deductions.length === 0) ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                          <Minus className="h-6 w-6" />
                          No deductions recorded.
                        </div>
                      ) : (
                        <div className="overflow-auto rounded-xl border border-zc-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[120px]">Reason Code</TableHead>
                                <TableHead className="w-[110px]">Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[100px] text-right">Amount</TableHead>
                                <TableHead className="w-[90px]">Disputed</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailRow.deductions.map((d) => (
                                <TableRow key={d.id}>
                                  <TableCell className="font-mono text-xs">{d.reasonCode}</TableCell>
                                  <TableCell>{deductionCategoryBadge(d.reasonCategory)}</TableCell>
                                  <TableCell>
                                    <div className="text-sm">{d.description}</div>
                                    {d.disputeNotes && (
                                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                        Dispute: {d.disputeNotes}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums font-semibold text-orange-600 dark:text-orange-400">
                                    {fmtCurrency(d.amount)}
                                  </TableCell>
                                  <TableCell>
                                    {d.isDisputed ? (
                                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Disputed</Badge>
                                    ) : (
                                      <span className="text-xs text-zc-muted">No</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    {/* Version History Tab */}
                    <TabsContent value="versions" className="mt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-semibold">Version History</div>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => void createSnapshot(detailRow.id)} disabled={busy}>
                          <Copy className="h-3.5 w-3.5" /> Create Snapshot
                        </Button>
                      </div>

                      {(!detailRow.versions || detailRow.versions.length === 0) ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                          <History className="h-6 w-6" />
                          No version history available yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {detailRow.versions
                            .sort((a, b) => b.versionNumber - a.versionNumber)
                            .map((v) => (
                              <div
                                key={v.id}
                                className="rounded-xl border border-zc-border bg-zc-panel/10 p-4"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zc-panel/40 font-mono text-sm font-bold">
                                      v{v.versionNumber}
                                    </span>
                                    <div>
                                      <div className="text-sm font-semibold">Version {v.versionNumber}</div>
                                      <div className="text-xs text-zc-muted">
                                        {new Date(v.createdAt).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  {v.changeReason && (
                                    <span className="text-xs text-zc-muted max-w-[300px] text-right">
                                      {v.changeReason}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <div className="mt-4 text-xs text-zc-muted">
                    Created: {fmtDT(detailRow.createdAt)} | Updated: {fmtDT(detailRow.updatedAt)}
                  </div>
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
