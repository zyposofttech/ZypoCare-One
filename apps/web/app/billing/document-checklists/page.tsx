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
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type PayerRef = {
  id: string;
  code: string;
  name: string;
};

type TemplateRuleRow = {
  id: string;
  docRole: string;
  label: string;
  description?: string;
  required: boolean;
  requiredAt?: string;
  sortOrder: number;
};

type TemplateRow = {
  id: string;
  branchId: string;
  payerId: string;
  payer?: PayerRef;
  templateName: string;
  scope: string;
  caseTypes: string[];
  description?: string;
  active: boolean;
  rules?: TemplateRuleRow[];
  _count?: { rules: number };
  createdAt: string;
  updatedAt: string;
};

type CompletenessDoc = {
  docRole: string;
  label: string;
  required: boolean;
  requiredAt?: string;
  uploaded: boolean;
};

type CompletenessResult = {
  templateName: string;
  totalRequired: number;
  totalUploaded: number;
  docs: CompletenessDoc[];
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

function fmtDT(v?: string | null) {
  if (!v) return "--";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

const SCOPES = [
  { value: "ALL_CASES", label: "All Cases" },
  { value: "CASHLESS_ONLY", label: "Cashless Only" },
  { value: "REIMBURSEMENT_ONLY", label: "Reimbursement Only" },
  { value: "PACKAGE_ONLY", label: "Package Only" },
] as const;

const CASE_TYPES = [
  { value: "CASHLESS", label: "Cashless" },
  { value: "REIMBURSEMENT", label: "Reimbursement" },
  { value: "PACKAGE", label: "Package" },
] as const;

const DOC_ROLES = [
  "PREAUTH_FORM",
  "DISCHARGE_SUMMARY",
  "INVESTIGATION_REPORT",
  "PRESCRIPTION",
  "BILL_SUMMARY",
  "CLAIM_FORM",
  "ID_PROOF",
  "INSURANCE_CARD",
  "QUERY_RESPONSE",
  "ENHANCEMENT_FORM",
  "DOC_OTHER",
] as const;

const REQUIRED_AT_OPTIONS = [
  { value: "", label: "Always" },
  { value: "PREAUTH_SUBMIT", label: "Preauth Submit" },
  { value: "CLAIM_SUBMIT", label: "Claim Submit" },
  { value: "DISCHARGE", label: "Discharge" },
] as const;

function scopeBadge(scope: string) {
  const m: Record<string, string> = {
    ALL_CASES: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    CASHLESS_ONLY: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    REIMBURSEMENT_ONLY: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    PACKAGE_ONLY: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        m[scope] || "bg-gray-100 text-gray-700 border-gray-200",
      )}
    >
      {scope.replace(/_/g, " ")}
    </span>
  );
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

export default function DocumentChecklistsPage() {
  const { toast } = useToast();
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const [rows, setRows] = React.useState<TemplateRow[]>([]);
  const [payers, setPayers] = React.useState<PayerRef[]>([]);

  // Filters
  const [q, setQ] = React.useState("");
  const [filterPayer, setFilterPayer] = React.useState("all");

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "billing-document-checklists",
    enabled: true,
  });

  // Create/Edit dialog
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = React.useState<TemplateRow | null>(null);
  const [fPayerId, setFPayerId] = React.useState("");
  const [fTemplateName, setFTemplateName] = React.useState("");
  const [fScope, setFScope] = React.useState("ALL_CASES");
  const [fCaseTypes, setFCaseTypes] = React.useState<string[]>([]);
  const [fDescription, setFDescription] = React.useState("");
  const [fActive, setFActive] = React.useState(true);

  // Expanded template (detail / rules)
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [expandedRow, setExpandedRow] = React.useState<TemplateRow | null>(null);
  const [expandLoading, setExpandLoading] = React.useState(false);

  // Add rule dialog
  const [ruleOpen, setRuleOpen] = React.useState(false);
  const [ruleTemplateId, setRuleTemplateId] = React.useState("");
  const [ruleDocRole, setRuleDocRole] = React.useState("PREAUTH_FORM");
  const [ruleLabel, setRuleLabel] = React.useState("");
  const [ruleDescription, setRuleDescription] = React.useState("");
  const [ruleRequired, setRuleRequired] = React.useState(true);
  const [ruleRequiredAt, setRuleRequiredAt] = React.useState("");
  const [ruleSortOrder, setRuleSortOrder] = React.useState("0");

  // Completeness check
  const [caseIdInput, setCaseIdInput] = React.useState("");
  const [completeness, setCompleteness] = React.useState<CompletenessResult | null>(null);
  const [completenessLoading, setCompletenessLoading] = React.useState(false);

  /* ---- data loading ---- */

  async function loadPayers() {
    try {
      const res = await apiFetch<any>("/api/infrastructure/payers");
      const list: PayerRef[] = Array.isArray(res) ? res : res?.rows || [];
      setPayers(list);
    } catch {
      setPayers([]);
    }
  }

  async function loadTemplates(showToast = false) {
    setLoading(true);
    try {
      const params = buildQS({
        q: q.trim() || undefined,
        payerId: filterPayer !== "all" ? filterPayer : undefined,
      });
      const res = await apiFetch<any>(`/api/billing/document-checklists?${params}`);
      const list: TemplateRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);
      if (showToast) toast({ title: "Refreshed", description: "Document checklists reloaded." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load failed", description: e?.message || "Unknown error" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadPayers();
    void loadTemplates(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => void loadTemplates(false), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filterPayer]);

  /* ---- stats ---- */

  const stats = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.active).length;
    const inactive = total - active;
    const totalRules = rows.reduce((sum, r) => sum + (r._count?.rules || r.rules?.length || 0), 0);
    return { total, active, inactive, totalRules };
  }, [rows]);

  /* ---- create/edit ---- */

  function openCreate() {
    setEditMode("create");
    setEditingRow(null);
    setFPayerId("");
    setFTemplateName("");
    setFScope("ALL_CASES");
    setFCaseTypes([]);
    setFDescription("");
    setFActive(true);
    setEditOpen(true);
  }

  function openEdit(row: TemplateRow) {
    setEditMode("edit");
    setEditingRow(row);
    setFPayerId(row.payerId);
    setFTemplateName(row.templateName);
    setFScope(row.scope);
    setFCaseTypes(row.caseTypes || []);
    setFDescription(row.description || "");
    setFActive(row.active);
    setEditOpen(true);
  }

  function toggleCaseType(ct: string) {
    setFCaseTypes((prev) =>
      prev.includes(ct) ? prev.filter((v) => v !== ct) : [...prev, ct],
    );
  }

  async function saveTemplate() {
    if (!fPayerId.trim() || !fTemplateName.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Payer and Template Name are required." });
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        payerId: fPayerId.trim(),
        templateName: fTemplateName.trim(),
        scope: fScope,
        caseTypes: fCaseTypes,
        description: fDescription.trim() || undefined,
        active: fActive,
      };
      if (editMode === "create") {
        await apiFetch("/api/billing/document-checklists", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Template created" });
      } else {
        if (!editingRow?.id) throw new Error("Invalid template");
        await apiFetch(`/api/billing/document-checklists/${editingRow.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Template updated" });
      }
      setEditOpen(false);
      await loadTemplates(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  /* ---- expand template (load rules) ---- */

  async function toggleExpand(row: TemplateRow) {
    if (expandedId === row.id) {
      setExpandedId(null);
      setExpandedRow(null);
      return;
    }
    setExpandedId(row.id);
    setExpandLoading(true);
    try {
      const full = await apiFetch<TemplateRow>(`/api/billing/document-checklists/${row.id}`);
      setExpandedRow(full);
    } catch {
      setExpandedRow({ ...row, rules: [] });
    } finally {
      setExpandLoading(false);
    }
  }

  /* ---- rules ---- */

  function openAddRule(templateId: string) {
    setRuleTemplateId(templateId);
    setRuleDocRole("PREAUTH_FORM");
    setRuleLabel("");
    setRuleDescription("");
    setRuleRequired(true);
    setRuleRequiredAt("");
    setRuleSortOrder("0");
    setRuleOpen(true);
  }

  async function saveRule() {
    if (!ruleLabel.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Label is required." });
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        docRole: ruleDocRole,
        label: ruleLabel.trim(),
        description: ruleDescription.trim() || undefined,
        required: ruleRequired,
        requiredAt: ruleRequiredAt && ruleRequiredAt !== "__blank" ? ruleRequiredAt : undefined,
        sortOrder: ruleSortOrder ? Number(ruleSortOrder) : 0,
      };
      await apiFetch(`/api/billing/document-checklists/${ruleTemplateId}/rules`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({ title: "Rule added" });
      setRuleOpen(false);
      // Refresh expanded
      if (expandedId === ruleTemplateId) {
        try {
          const full = await apiFetch<TemplateRow>(`/api/billing/document-checklists/${ruleTemplateId}`);
          setExpandedRow(full);
        } catch { /* keep current */ }
      }
      await loadTemplates(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Add rule failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteRule(templateId: string, ruleId: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/billing/document-checklists/${templateId}/rules/${ruleId}`, { method: "DELETE" });
      toast({ title: "Rule removed" });
      if (expandedId === templateId) {
        try {
          const full = await apiFetch<TemplateRow>(`/api/billing/document-checklists/${templateId}`);
          setExpandedRow(full);
        } catch { /* keep current */ }
      }
      await loadTemplates(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  /* ---- completeness check ---- */

  async function checkCompleteness() {
    if (!caseIdInput.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Insurance Case ID is required." });
      return;
    }
    setCompletenessLoading(true);
    setCompleteness(null);
    try {
      const res = await apiFetch<CompletenessResult>(
        `/api/billing/document-checklists/completeness/${encodeURIComponent(caseIdInput.trim())}`,
      );
      setCompleteness(res);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Check failed", description: e?.message || "Unknown error" });
    } finally {
      setCompletenessLoading(false);
    }
  }

  /* ---- render ---- */

  return (
    <AppShell title="Billing - Document Checklists">
      <RequirePerm perm="BILLING_DOCUMENT_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <ClipboardCheck className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Document Checklists</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Manage payer-specific document requirement templates and check case completeness.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="px-5 gap-2"
                onClick={() => void loadTemplates(true)}
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
                New Template
              </Button>
            </div>
          </div>

          <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Templates</div>
              <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 dark:border-green-900/50 dark:bg-green-900/10">
              <div className="text-xs font-medium text-green-700 dark:text-green-300">Active</div>
              <div className="mt-1 text-lg font-bold text-green-800 dark:text-green-200">{stats.active}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/30">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Inactive</div>
              <div className="mt-1 text-lg font-bold text-gray-700 dark:text-gray-300">{stats.inactive}</div>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-900/10">
              <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Total Rules</div>
              <div className="mt-1 text-lg font-bold text-indigo-800 dark:text-indigo-200">{stats.totalRules}</div>
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
                    placeholder="Search template name..."
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={filterPayer} onValueChange={setFilterPayer}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Payers" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payers</SelectItem>
                      {payers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Payer Document Templates</CardTitle>
                  <CardDescription>
                    {rows.length} template{rows.length !== 1 ? "s" : ""} found
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="overflow-auto rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]" />
                      <TableHead className="w-[200px]">Template Name</TableHead>
                      <TableHead className="w-[140px]">Payer</TableHead>
                      <TableHead className="w-[140px]">Scope</TableHead>
                      <TableHead className="w-[180px]">Case Types</TableHead>
                      <TableHead className="w-[80px] text-right">Rules</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                      <TableHead className="w-[70px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                            <ClipboardCheck className="h-6 w-6" />
                            No document checklist templates found.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => (
                        <React.Fragment key={r.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-zc-panel/20"
                            onClick={() => void toggleExpand(r)}
                          >
                            <TableCell className="text-center">
                              {expandedId === r.id ? (
                                <ChevronDown className="h-4 w-4 text-zc-muted" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-zc-muted" />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-semibold">{r.templateName}</div>
                              {r.description && (
                                <div className="text-xs text-zc-muted truncate max-w-[180px]">{r.description}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{r.payer?.name || "--"}</div>
                              {r.payer?.code && (
                                <div className="text-xs text-zc-muted">{r.payer.code}</div>
                              )}
                            </TableCell>
                            <TableCell>{scopeBadge(r.scope)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(r.caseTypes || []).map((ct) => (
                                  <Badge key={ct} variant="secondary" className="text-[10px]">{ct}</Badge>
                                ))}
                                {(!r.caseTypes || r.caseTypes.length === 0) && (
                                  <span className="text-xs text-zc-muted">--</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums font-semibold">
                              {r._count?.rules ?? r.rules?.length ?? 0}
                            </TableCell>
                            <TableCell>
                              {r.active ? (
                                <Badge variant="ok" className="text-[10px]">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px]">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => void toggleExpand(r)}>
                                    <Eye className="mr-2 h-4 w-4" /> View Rules
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEdit(r)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Template
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openAddRule(r.id)}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Rule
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Rules */}
                          {expandedId === r.id && (
                            <TableRow>
                              <TableCell colSpan={8} className="p-0">
                                <div className="border-t border-zc-border bg-zc-panel/10 p-4">
                                  <div className="mb-3 flex items-center justify-between">
                                    <div className="text-sm font-semibold">Rules for: {r.templateName}</div>
                                    <Button size="sm" variant="outline" className="gap-2" onClick={() => openAddRule(r.id)}>
                                      <Plus className="h-3.5 w-3.5" /> Add Rule
                                    </Button>
                                  </div>

                                  {expandLoading ? (
                                    <div className="py-6 text-center">
                                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-zc-muted" />
                                    </div>
                                  ) : (!expandedRow?.rules || expandedRow.rules.length === 0) ? (
                                    <div className="flex flex-col items-center justify-center gap-3 py-8 text-sm text-zc-muted">
                                      <FileText className="h-5 w-5" />
                                      No rules defined yet. Add rules to build the checklist.
                                    </div>
                                  ) : (
                                    <div className="overflow-auto rounded-xl border border-zc-border bg-zc-card">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="w-[160px]">Doc Role</TableHead>
                                            <TableHead>Label</TableHead>
                                            <TableHead className="w-[80px]">Required?</TableHead>
                                            <TableHead className="w-[130px]">Required At</TableHead>
                                            <TableHead className="w-[80px] text-right">Sort Order</TableHead>
                                            <TableHead className="w-[50px]" />
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {expandedRow.rules
                                            .sort((a, b) => a.sortOrder - b.sortOrder)
                                            .map((rule) => (
                                              <TableRow key={rule.id}>
                                                <TableCell>
                                                  <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                    {rule.docRole}
                                                  </span>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="text-sm font-medium">{rule.label}</div>
                                                  {rule.description && (
                                                    <div className="text-xs text-zc-muted">{rule.description}</div>
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {rule.required ? (
                                                    <Badge variant="ok" className="text-[10px]">Yes</Badge>
                                                  ) : (
                                                    <Badge variant="secondary" className="text-[10px]">No</Badge>
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                  {rule.requiredAt ? rule.requiredAt.replace(/_/g, " ") : "Always"}
                                                </TableCell>
                                                <TableCell className="text-right text-sm tabular-nums">{rule.sortOrder}</TableCell>
                                                <TableCell>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-500 hover:text-red-600"
                                                    onClick={() => void deleteRule(r.id, rule.id)}
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
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Completeness Check Section */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Completeness Check</CardTitle>
              <CardDescription>
                Select an insurance case to check document upload completeness against the applicable template.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Label>Insurance Case ID or Case Number</Label>
                    <Input
                      className="mt-1 font-mono"
                      value={caseIdInput}
                      onChange={(e) => setCaseIdInput(e.target.value)}
                      placeholder="Enter Insurance Case ID..."
                    />
                  </div>
                  <Button
                    variant="primary"
                    className="gap-2"
                    onClick={() => void checkCompleteness()}
                    disabled={completenessLoading || !caseIdInput.trim()}
                  >
                    {completenessLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ClipboardCheck className="h-4 w-4" />
                    )}
                    Check Completeness
                  </Button>
                </div>

                {completeness && (
                  <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold">{completeness.templateName}</div>
                      <div className="text-sm font-semibold tabular-nums">
                        {completeness.totalUploaded} / {completeness.totalRequired} uploaded
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4 h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={cn(
                          "h-2.5 rounded-full transition-all",
                          completeness.totalRequired > 0 && completeness.totalUploaded >= completeness.totalRequired
                            ? "bg-emerald-500"
                            : "bg-blue-500",
                        )}
                        style={{
                          width: completeness.totalRequired > 0
                            ? `${Math.min(100, (completeness.totalUploaded / completeness.totalRequired) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>

                    {/* Document list */}
                    <div className="space-y-2">
                      {completeness.docs.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-zc-border bg-zc-card px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            {doc.uploaded ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                            )}
                            <div>
                              <div className="text-sm font-medium">{doc.label}</div>
                              <div className="flex items-center gap-2 text-xs text-zc-muted">
                                <span className="font-mono">{doc.docRole}</span>
                                {doc.requiredAt && <span>at {doc.requiredAt.replace(/_/g, " ")}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.required && (
                              <Badge variant="secondary" className="text-[10px]">Required</Badge>
                            )}
                            {doc.uploaded ? (
                              <Badge variant="ok" className="text-[10px]">Uploaded</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">Missing</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ---------- Create/Edit Template Dialog ---------- */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className={drawerClassName("max-w-[720px]")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    {editMode === "create" ? (
                      <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Pencil className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                  {editMode === "create" ? "Create Template" : "Edit Template"}
                </DialogTitle>
                <DialogDescription>
                  {editMode === "create"
                    ? "Define a new payer-specific document requirement template."
                    : `Editing: ${editingRow?.templateName || ""}`}
                </DialogDescription>
              </DialogHeader>
              <Separator className="my-4" />

              <div className="max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Payer *</Label>
                    <Select value={fPayerId} onValueChange={setFPayerId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select payer..." /></SelectTrigger>
                      <SelectContent>
                        {payers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Template Name *</Label>
                    <Input className="mt-1" value={fTemplateName} onChange={(e) => setFTemplateName(e.target.value)} placeholder="e.g. Star Health - Cashless Docs" />
                  </div>
                  <div>
                    <Label>Scope</Label>
                    <Select value={fScope} onValueChange={setFScope}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SCOPES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Case Types</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {CASE_TYPES.map((ct) => (
                        <button
                          key={ct.value}
                          type="button"
                          onClick={() => toggleCaseType(ct.value)}
                          className={cn(
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                            fCaseTypes.includes(ct.value)
                              ? "border-zc-accent bg-zc-accent/10 text-zc-accent"
                              : "border-zc-border bg-zc-panel/20 text-zc-muted hover:text-zc-text",
                          )}
                        >
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea className="mt-1" rows={2} value={fDescription} onChange={(e) => setFDescription(e.target.value)} placeholder="Optional template description..." />
                  </div>
                  <div className="md:col-span-2">
                    <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Active</div>
                          <div className="text-xs text-zc-muted">Enable or disable this template</div>
                        </div>
                        <Switch checked={fActive} onCheckedChange={(v) => setFActive(!!v)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void saveTemplate()} disabled={busy}>
                  {busy ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span>
                  ) : (
                    editMode === "create" ? "Create Template" : "Update Template"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ---------- Add Rule Dialog ---------- */}
          <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
            <DialogContent className="max-w-[560px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-zc-accent" /> Add Document Rule
                </DialogTitle>
                <DialogDescription>Define a required document for this template.</DialogDescription>
              </DialogHeader>
              <Separator className="my-3" />
              <div className="grid gap-4">
                <div>
                  <Label>Doc Role</Label>
                  <Select value={ruleDocRole} onValueChange={setRuleDocRole}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>{role.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Label *</Label>
                  <Input className="mt-1" value={ruleLabel} onChange={(e) => setRuleLabel(e.target.value)} placeholder="e.g. Pre-authorization Form (signed)" />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Input className="mt-1" value={ruleDescription} onChange={(e) => setRuleDescription(e.target.value)} placeholder="Additional details..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Required At</Label>
                    <Select value={ruleRequiredAt} onValueChange={setRuleRequiredAt}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Always" /></SelectTrigger>
                      <SelectContent>
                        {REQUIRED_AT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value || "__blank"} value={opt.value || "__blank"}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sort Order</Label>
                    <Input className="mt-1" type="number" min="0" value={ruleSortOrder} onChange={(e) => setRuleSortOrder(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="rounded-xl border border-zc-border bg-zc-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Required</div>
                      <div className="text-xs text-zc-muted">Is this document mandatory?</div>
                    </div>
                    <Switch checked={ruleRequired} onCheckedChange={(v) => setRuleRequired(!!v)} />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setRuleOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void saveRule()} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Rule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
