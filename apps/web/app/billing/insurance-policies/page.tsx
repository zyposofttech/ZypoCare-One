"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type PolicyRow = {
  id: string;
  branchId: string;
  patientId: string;
  patient?: { id: string; uhid: string; name: string };
  payerId: string;
  payer?: { id: string; code: string; name: string; kind: string };
  contractId?: string;
  contract?: { id: string; code: string; name: string };
  policyNumber: string;
  memberId: string;
  groupId?: string;
  employerName?: string;
  planName?: string;
  relationship: string;
  status: string;
  validFrom: string;
  validTo: string;
  sumInsured?: number;
  balanceRemaining?: number;
  cardNumber?: string;
  cardImageUrl?: string;
  verifiedAt?: string;
  verifiedByUserId?: string;
  meta?: any;
  createdAt: string;
  updatedAt: string;
};

type PolicyFormData = {
  patientId: string;
  payerId: string;
  contractId: string;
  policyNumber: string;
  memberId: string;
  groupId: string;
  employerName: string;
  planName: string;
  relationship: string;
  validFrom: string;
  validTo: string;
  sumInsured: string;
  balanceRemaining: string;
  cardNumber: string;
  cardImageUrl: string;
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

function statusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="ok">ACTIVE</Badge>;
    case "EXPIRED":
      return <Badge variant="destructive">EXPIRED</Badge>;
    case "CANCELLED":
      return <Badge variant="secondary">CANCELLED</Badge>;
    case "SUSPENDED":
      return <Badge variant="warning">SUSPENDED</Badge>;
    case "LAPSED":
      return (
        <Badge variant="warning" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          LAPSED
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function fmtDate(v?: string | null) {
  if (!v) return "\u2014";
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return String(v);
  }
}

function fmtMoney(v?: number | string | null): string {
  if (v === null || v === undefined || v === "") return "\u2014";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "\u2014";
}

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[900px] translate-x-0 translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

function emptyForm(): PolicyFormData {
  return {
    patientId: "",
    payerId: "",
    contractId: "",
    policyNumber: "",
    memberId: "",
    groupId: "",
    employerName: "",
    planName: "",
    relationship: "SELF",
    validFrom: "",
    validTo: "",
    sumInsured: "",
    balanceRemaining: "",
    cardNumber: "",
    cardImageUrl: "",
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function InsurancePoliciesPage() {
  const { toast } = useToast();
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
  const [rows, setRows] = React.useState<PolicyRow[]>([]);
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [payerFilter, setPayerFilter] = React.useState<string>("all");

  // Create/Edit modal
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = React.useState<PolicyRow | null>(null);

  // Detail drawer
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailRow, setDetailRow] = React.useState<PolicyRow | null>(null);

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "billing-insurance-policies",
    enabled: !!branchId,
  });

  /* ---- Data loading ---- */

  async function loadBranches(): Promise<string | null> {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);
    const stored = effectiveBranchId || null;
    const first = list[0]?.id || null;
    const next = (stored && list.some((b) => b.id === stored) ? stored : null) || first;
    if (next) if (isGlobalScope) setActiveBranchId(next || null);
    setBranchId(next || "");
    return next;
  }

  async function loadPolicies(showToast = false, targetBranchId?: string) {
    const target = targetBranchId || branchId;
    if (!target) return;
    setErr(null);
    setLoading(true);
    try {
      const qs = buildQS({
        branchId: target,
        q: q.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        payerId: payerFilter !== "all" ? payerFilter : undefined,
        includeRefs: "true",
      });
      const res = await apiFetch<any>(`/api/billing/insurance-policies?${qs}`);
      const list: PolicyRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);
      if (showToast) toast({ title: "Policies refreshed" });
    } catch (e: any) {
      const msg = e?.message || "Failed to load insurance policies";
      setErr(msg);
      setRows([]);
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
      await loadPolicies(false, bid);
      if (showToast) toast({ title: "Ready" });
    } catch (e: any) {
      setErr(e?.message || "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { void refreshAll(false); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (branchId) void loadPolicies(false); }, [branchId, statusFilter, payerFilter]);
  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadPolicies(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function onBranchChange(nextId: string) {
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
    setQ("");
    setStatusFilter("all");
    setPayerFilter("all");
    void loadPolicies(false, nextId);
  }

  /* ---- Actions ---- */

  function openCreate() {
    setEditMode("create");
    setEditingRow(null);
    setEditOpen(true);
  }

  function openEdit(row: PolicyRow) {
    setEditMode("edit");
    setEditingRow(row);
    setEditOpen(true);
  }

  function openDetail(row: PolicyRow) {
    setDetailRow(row);
    setDetailOpen(true);
  }

  async function verifyPolicy(row: PolicyRow) {
    if (!row?.id) return;
    setBusy(true);
    try {
      await apiFetch(`/api/billing/insurance-policies/${encodeURIComponent(row.id)}/verify`, {
        method: "POST",
      });
      toast({ title: "Verified", description: "Policy has been verified." });
      await loadPolicies(false);
    } catch (e: any) {
      toast({ title: "Verification failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  /* ---- Stats ---- */

  const stats = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const expired = rows.filter((r) => r.status === "EXPIRED").length;
    const verified = rows.filter((r) => !!r.verifiedAt).length;
    const totalSumInsured = rows.reduce((sum, r) => sum + (r.sumInsured ?? 0), 0);
    return { total, active, expired, verified, totalSumInsured };
  }, [rows]);

  /* ---- Unique payers for filter ---- */

  const uniquePayers = React.useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    rows.forEach((r) => {
      if (r.payer && !map.has(r.payer.id)) {
        map.set(r.payer.id, { id: r.payer.id, code: r.payer.code, name: r.payer.name });
      }
    });
    return Array.from(map.values());
  }, [rows]);

  /* ---- Render ---- */

  return (
    <AppShell title="Billing - Insurance Policies">
      <RequirePerm perm="BILLING_POLICY_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <Shield className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Insurance Policies</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Manage patient insurance policies, verify coverage and track balances.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="px-5 gap-2" onClick={() => refreshAll(true)} disabled={loading || busy}>
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>
              <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={!branchId || busy || loading}>
                <Plus className="h-4 w-4" />
                New Policy
              </Button>
            </div>
          </div>

          {err && (
            <Card className="border-zc-danger/40">
              <CardHeader className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                  <div>
                    <CardTitle className="text-base">Could not load policies</CardTitle>
                    <CardDescription className="mt-1">{err}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Overview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Overview</CardTitle>
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

              <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Policies</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</div>
                  <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                  <div className="text-xs font-medium text-red-600 dark:text-red-400">Expired</div>
                  <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{stats.expired}</div>
                </div>
                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                  <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Verified</div>
                  <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{stats.verified}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Total Sum Insured</div>
                  <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{fmtMoney(stats.totalSumInsured)}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by patient name, UHID, or policy number..." className="pl-10" disabled={!branchId} />
                </div>
                <div className="flex items-center gap-3">
                  <Select value={payerFilter} onValueChange={setPayerFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Payers" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payers</SelectItem>
                      {uniquePayers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="LAPSED">Lapsed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead className="w-[130px]">Payer</TableHead>
                      <TableHead className="w-[120px]">Policy No</TableHead>
                      <TableHead className="w-[100px]">Member ID</TableHead>
                      <TableHead className="w-[100px]">Relationship</TableHead>
                      <TableHead className="w-[90px]">Status</TableHead>
                      <TableHead className="w-[90px]">Valid From</TableHead>
                      <TableHead className="w-[90px]">Valid To</TableHead>
                      <TableHead className="w-[100px] text-right">Sum Insured</TableHead>
                      <TableHead className="w-[60px]">Verified</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                      ))
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11}>
                          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                            <Shield className="h-4 w-4" /> No insurance policies found.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => (
                        <TableRow key={r.id} className="cursor-pointer hover:bg-zc-panel/20" onClick={() => openDetail(r)}>
                          <TableCell>
                            <div className="font-semibold text-zc-text">{r.patient?.name || "\u2014"}</div>
                            {r.patient?.uhid && (
                              <div className="text-xs text-zc-muted font-mono">{r.patient.uhid}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.payer ? (
                              <div>
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{r.payer.name}</span>
                                <div className="text-[10px] text-zc-muted">{r.payer.code}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-zc-muted">{r.payerId?.slice(0, 8)}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">{r.policyNumber}</TableCell>
                          <TableCell className="font-mono text-xs">{r.memberId}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">{r.relationship}</Badge>
                          </TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-xs">{fmtDate(r.validFrom)}</TableCell>
                          <TableCell className="text-xs">{fmtDate(r.validTo)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmtMoney(r.sumInsured)}</TableCell>
                          <TableCell className="text-center">
                            {r.verifiedAt ? (
                              <CheckCircle2 className="inline h-4 w-4 text-emerald-500" />
                            ) : (
                              <span className="text-xs text-zc-muted">\u2014</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[180px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openDetail(r)}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(r)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                {!r.verifiedAt && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => verifyPolicy(r)}>
                                      <ShieldCheck className="mr-2 h-4 w-4" /> Verify
                                    </DropdownMenuItem>
                                  </>
                                )}
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
                    Total: <span className="font-semibold text-zc-text">{rows.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Dialog */}
        <PolicyEditModal
          open={editOpen}
          onOpenChange={setEditOpen}
          mode={editMode}
          branchId={branchId}
          editing={editingRow}
          onSaved={async () => {
            toast({ title: "Saved", description: "Insurance policy saved successfully." });
            await loadPolicies(false);
          }}
        />

        {/* Detail Viewer */}
        <PolicyDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          policy={detailRow}
        />
      </RequirePerm>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Create/Edit Dialog                               */
/* -------------------------------------------------------------------------- */

function PolicyEditModal({
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
  editing: PolicyRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<PolicyFormData>(emptyForm());

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editing) {
      setForm({
        patientId: editing.patientId || "",
        payerId: editing.payerId || "",
        contractId: editing.contractId || "",
        policyNumber: editing.policyNumber || "",
        memberId: editing.memberId || "",
        groupId: editing.groupId || "",
        employerName: editing.employerName || "",
        planName: editing.planName || "",
        relationship: editing.relationship || "SELF",
        validFrom: editing.validFrom ? editing.validFrom.slice(0, 10) : "",
        validTo: editing.validTo ? editing.validTo.slice(0, 10) : "",
        sumInsured: editing.sumInsured != null ? String(editing.sumInsured) : "",
        balanceRemaining: editing.balanceRemaining != null ? String(editing.balanceRemaining) : "",
        cardNumber: editing.cardNumber || "",
        cardImageUrl: editing.cardImageUrl || "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, mode, editing]);

  function patch(p: Partial<PolicyFormData>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  function toNumOrNull(v: string): number | null {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  async function save() {
    if (!branchId) return;
    if (!form.patientId.trim()) {
      toast({ title: "Missing fields", description: "Patient ID is required." });
      return;
    }
    if (!form.payerId.trim()) {
      toast({ title: "Missing fields", description: "Payer ID is required." });
      return;
    }
    if (!form.policyNumber.trim()) {
      toast({ title: "Missing fields", description: "Policy Number is required." });
      return;
    }
    if (!form.memberId.trim()) {
      toast({ title: "Missing fields", description: "Member ID is required." });
      return;
    }

    const payload: any = {
      branchId,
      patientId: form.patientId.trim(),
      payerId: form.payerId.trim(),
      contractId: form.contractId.trim() || null,
      policyNumber: form.policyNumber.trim(),
      memberId: form.memberId.trim(),
      groupId: form.groupId.trim() || null,
      employerName: form.employerName.trim() || null,
      planName: form.planName.trim() || null,
      relationship: form.relationship || "SELF",
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
      validTo: form.validTo ? new Date(form.validTo).toISOString() : null,
      sumInsured: toNumOrNull(form.sumInsured),
      balanceRemaining: toNumOrNull(form.balanceRemaining),
      cardNumber: form.cardNumber.trim() || null,
      cardImageUrl: form.cardImageUrl.trim() || null,
    };

    setSaving(true);
    try {
      if (mode === "create") {
        await apiFetch(`/api/billing/insurance-policies`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!editing?.id) throw new Error("Invalid editing row");
        await apiFetch(`/api/billing/insurance-policies/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
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
      <DialogContent className={drawerClassName()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "New Insurance Policy" : "Edit Insurance Policy"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new patient insurance policy with payer and coverage details."
              : `Editing policy: ${editing?.policyNumber || ""}`}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="max-h-[65vh] overflow-y-auto px-1">
          <div className="grid gap-5">
            {/* Row 1: Patient + Payer */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Patient ID *</Label>
                <Input value={form.patientId} onChange={(e) => patch({ patientId: e.target.value })} placeholder="Enter Patient ID" />
                <span className="text-xs text-zc-muted">Will be replaced with patient picker.</span>
              </div>
              <div className="grid gap-2">
                <Label>Payer ID *</Label>
                <Input value={form.payerId} onChange={(e) => patch({ payerId: e.target.value })} placeholder="Enter Payer ID" />
              </div>
            </div>

            {/* Row 2: Contract + Relationship */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Contract ID</Label>
                <Input value={form.contractId} onChange={(e) => patch({ contractId: e.target.value })} placeholder="Optional contract ID" />
              </div>
              <div className="grid gap-2">
                <Label>Relationship</Label>
                <Select value={form.relationship} onValueChange={(v) => patch({ relationship: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELF">Self</SelectItem>
                    <SelectItem value="SPOUSE">Spouse</SelectItem>
                    <SelectItem value="CHILD">Child</SelectItem>
                    <SelectItem value="PARENT">Parent</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Policy Number + Member ID */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Policy Number *</Label>
                <Input value={form.policyNumber} onChange={(e) => patch({ policyNumber: e.target.value })} placeholder="e.g., POL-2026-001" className="font-mono" />
              </div>
              <div className="grid gap-2">
                <Label>Member ID *</Label>
                <Input value={form.memberId} onChange={(e) => patch({ memberId: e.target.value })} placeholder="e.g., MEM-001" className="font-mono" />
              </div>
            </div>

            {/* Row 4: Group ID + Employer + Plan */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Group ID</Label>
                <Input value={form.groupId} onChange={(e) => patch({ groupId: e.target.value })} placeholder="Optional" />
              </div>
              <div className="grid gap-2">
                <Label>Employer Name</Label>
                <Input value={form.employerName} onChange={(e) => patch({ employerName: e.target.value })} placeholder="Optional" />
              </div>
              <div className="grid gap-2">
                <Label>Plan Name</Label>
                <Input value={form.planName} onChange={(e) => patch({ planName: e.target.value })} placeholder="Optional" />
              </div>
            </div>

            <Separator />

            {/* Row 5: Validity dates */}
            <div className="rounded-xl border border-blue-200/50 bg-blue-50/30 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
              <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">Coverage Period</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Valid From</Label>
                  <Input type="date" value={form.validFrom} onChange={(e) => patch({ validFrom: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Valid To</Label>
                  <Input type="date" value={form.validTo} onChange={(e) => patch({ validTo: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Row 6: Financial */}
            <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/30 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3">Financial Details</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Sum Insured</Label>
                  <Input type="number" min={0} step={0.01} value={form.sumInsured} onChange={(e) => patch({ sumInsured: e.target.value })} placeholder="e.g., 500000" />
                </div>
                <div className="grid gap-2">
                  <Label>Balance Remaining</Label>
                  <Input type="number" min={0} step={0.01} value={form.balanceRemaining} onChange={(e) => patch({ balanceRemaining: e.target.value })} placeholder="e.g., 450000" />
                </div>
              </div>
            </div>

            {/* Row 7: Card details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Card Number</Label>
                <Input value={form.cardNumber} onChange={(e) => patch({ cardNumber: e.target.value })} placeholder="Insurance card number" />
              </div>
              <div className="grid gap-2">
                <Label>Card Image URL</Label>
                <Input value={form.cardImageUrl} onChange={(e) => patch({ cardImageUrl: e.target.value })} placeholder="https://..." />
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Create Policy" : "Update Policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Detail Viewer Dialog                             */
/* -------------------------------------------------------------------------- */

function PolicyDetailDialog({
  open,
  onOpenChange,
  policy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  policy: PolicyRow | null;
}) {
  if (!policy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-zc-accent" />
            Policy Details
          </DialogTitle>
          <DialogDescription>
            {policy.policyNumber} {policy.patient?.name ? `\u2014 ${policy.patient.name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="max-h-[65vh] overflow-y-auto grid gap-4">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            {statusBadge(policy.status)}
            {policy.verifiedAt && <Badge variant="ok">Verified</Badge>}
            <Badge variant="secondary">{policy.relationship}</Badge>
          </div>

          {/* Patient info */}
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs text-zc-muted">Patient</div>
              <div className="font-semibold">{policy.patient?.name || "\u2014"}</div>
              {policy.patient?.uhid && <div className="text-xs text-zc-muted font-mono">{policy.patient.uhid}</div>}
            </div>
            <div>
              <div className="text-xs text-zc-muted">Payer</div>
              <div className="font-semibold">{policy.payer?.name || "\u2014"}</div>
              {policy.payer?.code && <div className="text-xs text-zc-muted">{policy.payer.code}</div>}
            </div>
            <div>
              <div className="text-xs text-zc-muted">Contract</div>
              <div className="font-semibold">{policy.contract?.name || "\u2014"}</div>
              {policy.contract?.code && <div className="text-xs text-zc-muted">{policy.contract.code}</div>}
            </div>
          </div>

          {/* Policy identifiers */}
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs text-zc-muted">Policy Number</div>
              <div className="font-semibold font-mono">{policy.policyNumber}</div>
            </div>
            <div>
              <div className="text-xs text-zc-muted">Member ID</div>
              <div className="font-semibold font-mono">{policy.memberId}</div>
            </div>
            <div>
              <div className="text-xs text-zc-muted">Group ID</div>
              <div className="font-semibold">{policy.groupId || "\u2014"}</div>
            </div>
          </div>

          {/* Employer / Plan */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zc-muted">Employer</div>
              <div className="font-semibold">{policy.employerName || "\u2014"}</div>
            </div>
            <div>
              <div className="text-xs text-zc-muted">Plan Name</div>
              <div className="font-semibold">{policy.planName || "\u2014"}</div>
            </div>
          </div>

          <Separator />

          {/* Coverage Period */}
          <div className="rounded-xl border border-blue-200/50 bg-blue-50/30 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
            <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">Coverage Period</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-zc-muted">Valid From</div>
                <div className="font-semibold">{fmtDate(policy.validFrom)}</div>
              </div>
              <div>
                <div className="text-xs text-zc-muted">Valid To</div>
                <div className="font-semibold">{fmtDate(policy.validTo)}</div>
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/30 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
            <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Financial Details</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-zc-muted">Sum Insured</div>
                <div className="font-semibold">{fmtMoney(policy.sumInsured)}</div>
              </div>
              <div>
                <div className="text-xs text-zc-muted">Balance Remaining</div>
                <div className="font-semibold">{fmtMoney(policy.balanceRemaining)}</div>
              </div>
            </div>
          </div>

          {/* Card details */}
          {(policy.cardNumber || policy.cardImageUrl) && (
            <div className="grid gap-3 md:grid-cols-2">
              {policy.cardNumber && (
                <div>
                  <div className="text-xs text-zc-muted">Card Number</div>
                  <div className="font-semibold font-mono">{policy.cardNumber}</div>
                </div>
              )}
              {policy.cardImageUrl && (
                <div>
                  <div className="text-xs text-zc-muted">Card Image</div>
                  <a href={policy.cardImageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                    View Card Image
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Verification */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zc-muted">Verified At</div>
              <div className="font-semibold">{policy.verifiedAt ? fmtDate(policy.verifiedAt) : "\u2014"}</div>
            </div>
            <div>
              <div className="text-xs text-zc-muted">Created At</div>
              <div className="font-semibold">{fmtDate(policy.createdAt)}</div>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
