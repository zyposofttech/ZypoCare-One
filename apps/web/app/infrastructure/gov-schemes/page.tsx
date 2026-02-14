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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import {
  AlertTriangle,
  Eye,
  Landmark,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type SchemeType = "PMJAY" | "CGHS" | "ECHS" | "STATE_SCHEME" | "OTHER";

type EmpanelmentLink = {
  id: string;
  scheme: string;
  status: string;
  lastSyncedAt: string | null;
};

type GovSchemeRow = {
  id: string;
  branchId: string;
  schemeType: SchemeType;
  schemeName: string;
  schemeCode: string;
  registrationNumber: string;
  registrationDate: string;
  validTill: string;
  shaCode?: string | null;
  nhaCode?: string | null;
  nhaHospitalCode?: string | null;
  empaneledSpecialtyIds: string[];
  preauthRequired: boolean;
  verificationMethod?: string | null;
  packageMapping?: any | null;
  claimSubmissionWindowDays?: number | null;
  claimProcessingTimeDays?: number | null;
  requiredDocuments: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  empanelment?: EmpanelmentLink | null;
};

type SchemeFormData = {
  schemeType: SchemeType;
  schemeName: string;
  schemeCode: string;
  registrationNumber: string;
  registrationDate: string;
  validTill: string;
  shaCode: string;
  nhaCode: string;
  nhaHospitalCode: string;
  preauthRequired: boolean;
  preauthAutoApprovalLimit: string;
  verificationMethod: string;
  claimSubmissionWindowDays: string;
  claimProcessingTimeDays: string;
  claimSubmissionUrl: string;
  claimSubmissionMethod: string;
  empaneledSpecialtyIds: string;
  requiredDocuments: string;
  pkgMapSchemeCodes: string;
  pkgMapHospitalCodes: string;
  pkgMapRates: string;
  isActive: boolean;
};

const EMPTY_FORM: SchemeFormData = {
  schemeType: "PMJAY",
  schemeName: "",
  schemeCode: "",
  registrationNumber: "",
  registrationDate: "",
  validTill: "",
  shaCode: "",
  nhaCode: "",
  nhaHospitalCode: "",
  preauthRequired: false,
  preauthAutoApprovalLimit: "",
  verificationMethod: "",
  claimSubmissionWindowDays: "",
  claimProcessingTimeDays: "",
  claimSubmissionUrl: "",
  claimSubmissionMethod: "",
  empaneledSpecialtyIds: "",
  requiredDocuments: "",
  pkgMapSchemeCodes: "",
  pkgMapHospitalCodes: "",
  pkgMapRates: "",
  isActive: true,
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

function activeBadge(isActive: boolean) {
  return isActive ? <Badge variant="ok">ACTIVE</Badge> : <Badge variant="secondary">INACTIVE</Badge>;
}

function schemeTypeBadge(t: SchemeType) {
  switch (t) {
    case "PMJAY":
      return <Badge variant="ok">PMJAY</Badge>;
    case "CGHS":
      return <Badge variant="warning">CGHS</Badge>;
    case "ECHS":
      return <Badge variant="secondary">ECHS</Badge>;
    case "STATE_SCHEME":
      return <Badge className="border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300">State</Badge>;
    case "OTHER":
      return <Badge variant="secondary">Other</Badge>;
    default:
      return <Badge variant="secondary">{t}</Badge>;
  }
}

function preauthBadge(required: boolean) {
  return required
    ? <Badge variant="warning">Required</Badge>
    : <Badge variant="secondary">Not Required</Badge>;
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

export default function GovSchemesPage() {
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

  const [rows, setRows] = React.useState<GovSchemeRow[]>([]);

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "gov-schemes",
    enabled: !!branchId,
  });

  // filters
  const [q, setQ] = React.useState("");
  const [schemeTypeFilter, setSchemeTypeFilter] = React.useState<string>("all");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  // dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<SchemeFormData>(EMPTY_FORM);

  const mustSelectBranch = !branchId;

  /* ---- branch loading ---- */
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

  /* ---- data loading ---- */
  async function loadSchemes(showToast = false, targetBranchId?: string) {
    const target = targetBranchId || branchId;
    if (!target) return;
    setErr(null);
    setLoading(true);
    try {
      const qs = buildQS({
        branchId: target,
        q: q.trim() || undefined,
        schemeType: schemeTypeFilter !== "all" ? schemeTypeFilter : undefined,
        includeInactive: includeInactive ? "true" : undefined,
      });

      const res = await apiTry<any>(
        `/api/infrastructure/gov-schemes?${qs}`,
        `/api/infra/gov-schemes?${qs}`,
      );

      const list: GovSchemeRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);

      if (showToast) {
        toast({ title: "Schemes refreshed", description: "Loaded latest government schemes for this branch." });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load government schemes";
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
      await loadSchemes(false, bid);
      if (showToast) toast({ title: "Ready", description: "Branch scope and government schemes are up to date." });
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
    void loadSchemes(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, includeInactive, schemeTypeFilter]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadSchemes(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function onBranchChange(nextId: string) {
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
    setQ("");
    setSchemeTypeFilter("all");
    setIncludeInactive(false);
    setErr(null);
    void loadSchemes(false, nextId);
  }

  /* ---- stats ---- */
  const stats = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const pmjay = rows.filter((r) => r.schemeType === "PMJAY").length;
    const cghs = rows.filter((r) => r.schemeType === "CGHS").length;
    const echs = rows.filter((r) => r.schemeType === "ECHS").length;
    const state = rows.filter((r) => r.schemeType === "STATE_SCHEME").length;
    return { total, active, pmjay, cghs, echs, state };
  }, [rows]);

  /* ---- create / edit ---- */
  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(row: GovSchemeRow) {
    setEditingId(row.id);
    setForm({
      schemeType: row.schemeType,
      schemeName: row.schemeName,
      schemeCode: row.schemeCode,
      registrationNumber: row.registrationNumber,
      registrationDate: row.registrationDate ? row.registrationDate.slice(0, 10) : "",
      validTill: row.validTill ? row.validTill.slice(0, 10) : "",
      shaCode: row.shaCode || "",
      nhaCode: row.nhaCode || "",
      nhaHospitalCode: row.nhaHospitalCode || "",
      preauthRequired: row.preauthRequired,
      preauthAutoApprovalLimit: (row as any).preauthAutoApprovalLimit != null ? String((row as any).preauthAutoApprovalLimit) : "",
      verificationMethod: row.verificationMethod || "",
      claimSubmissionWindowDays: row.claimSubmissionWindowDays != null ? String(row.claimSubmissionWindowDays) : "",
      claimProcessingTimeDays: row.claimProcessingTimeDays != null ? String(row.claimProcessingTimeDays) : "",
      claimSubmissionUrl: (row as any).claimSubmissionUrl || "",
      claimSubmissionMethod: (row as any).claimSubmissionMethod || "",
      empaneledSpecialtyIds: (row.empaneledSpecialtyIds || []).join(", "),
      requiredDocuments: (row.requiredDocuments || []).join(", "),
      pkgMapSchemeCodes: (() => {
        if (!row.packageMapping || typeof row.packageMapping !== "object") return "";
        return Object.keys(row.packageMapping).join(", ");
      })(),
      pkgMapHospitalCodes: (() => {
        if (!row.packageMapping || typeof row.packageMapping !== "object") return "";
        return Object.values(row.packageMapping).map((v: any) => typeof v === "object" ? (v.hospitalCode || v.name || "") : String(v)).join(", ");
      })(),
      pkgMapRates: (() => {
        if (!row.packageMapping || typeof row.packageMapping !== "object") return "";
        return Object.values(row.packageMapping).map((v: any) => typeof v === "object" ? (v.rate || "") : "").join(", ");
      })(),
      isActive: row.isActive,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!branchId) return;
    setBusy(true);
    try {
      // Parse package mapping JSON
      let packageMapping: any = undefined;
      const schemeCodes = form.pkgMapSchemeCodes.split(",").map((s) => s.trim()).filter(Boolean);
      const hospitalCodes = form.pkgMapHospitalCodes.split(",").map((s) => s.trim()).filter(Boolean);
      const rates = form.pkgMapRates.split(",").map((s) => s.trim()).filter(Boolean);
      if (schemeCodes.length > 0 && hospitalCodes.length > 0) {
        packageMapping = {};
        schemeCodes.forEach((code, i) => {
          packageMapping[code] = {
            hospitalCode: hospitalCodes[i] || "",
            ...(rates[i] ? { rate: Number(rates[i]) || rates[i] } : {}),
          };
        });
      }

      const empaneledSpecialtyIds = form.empaneledSpecialtyIds
        .split(",").map(s => s.trim()).filter(Boolean);
      const requiredDocuments = form.requiredDocuments
        .split(",").map(s => s.trim()).filter(Boolean);

      const payload: any = {
        branchId,
        schemeType: form.schemeType,
        schemeName: form.schemeName.trim(),
        schemeCode: form.schemeCode.trim(),
        registrationNumber: form.registrationNumber.trim(),
        registrationDate: form.registrationDate || undefined,
        validTill: form.validTill || undefined,
        shaCode: form.shaCode.trim() || undefined,
        nhaCode: form.nhaCode.trim() || undefined,
        nhaHospitalCode: form.nhaHospitalCode.trim() || undefined,
        preauthRequired: form.preauthRequired,
        preauthAutoApprovalLimit: form.preauthAutoApprovalLimit ? Number(form.preauthAutoApprovalLimit) : undefined,
        verificationMethod: form.verificationMethod.trim() || undefined,
        claimSubmissionWindowDays: form.claimSubmissionWindowDays ? Number(form.claimSubmissionWindowDays) : undefined,
        claimProcessingTimeDays: form.claimProcessingTimeDays ? Number(form.claimProcessingTimeDays) : undefined,
        claimSubmissionUrl: form.claimSubmissionUrl.trim() || undefined,
        claimSubmissionMethod: form.claimSubmissionMethod.trim() || undefined,
        empaneledSpecialtyIds,
        requiredDocuments,
        packageMapping,
        isActive: form.isActive,
      };

      if (editingId) {
        await apiFetch(`/api/infrastructure/gov-schemes/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        } as any);
        toast({ title: "Scheme updated", description: `"${payload.schemeName}" has been updated.` });
      } else {
        await apiFetch("/api/infrastructure/gov-schemes", {
          method: "POST",
          body: JSON.stringify(payload),
        } as any);
        toast({ title: "Scheme created", description: `"${payload.schemeName}" has been created.` });
      }

      setDialogOpen(false);
      void loadSchemes(false);
    } catch (e: any) {
      const msg = e?.message || "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row: GovSchemeRow) {
    if (!confirm(`Delete scheme "${row.schemeName}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/infrastructure/gov-schemes/${row.id}`, { method: "DELETE" } as any);
      toast({ title: "Scheme deleted", description: `"${row.schemeName}" has been removed.` });
      void loadSchemes(false);
    } catch (e: any) {
      const msg = e?.message || "Delete failed";
      toast({ title: "Error", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  function updateForm<K extends keyof SchemeFormData>(key: K, value: SchemeFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* ---- render ---- */
  return (
    <AppShell title="Infrastructure - Government Schemes">
      <RequirePerm perm="INFRA_GOV_SCHEME_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Landmark className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Government Schemes</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage PMJAY, CGHS, ECHS, state and other government empanelment schemes.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => refreshAll(true)} disabled={loading || busy}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={mustSelectBranch}>
              <Plus className="h-4 w-4" />
              New Scheme
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load government schemes</CardTitle>
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
              Pick a branch, search schemes, and review empanelment status.
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

            <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

            {/* Stats cards */}
            <div className="grid gap-3 md:grid-cols-6">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</div>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900/50 dark:bg-orange-900/10">
                <div className="text-xs font-medium text-orange-600 dark:text-orange-400">PMJAY</div>
                <div className="mt-1 text-lg font-bold text-orange-700 dark:text-orange-300">{stats.pmjay}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">CGHS</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{stats.cghs}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-900/50 dark:bg-slate-900/10">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">ECHS</div>
                <div className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-300">{stats.echs}</div>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900/50 dark:bg-purple-900/10">
                <div className="text-xs font-medium text-purple-600 dark:text-purple-400">State</div>
                <div className="mt-1 text-lg font-bold text-purple-700 dark:text-purple-300">{stats.state}</div>
              </div>
            </div>

            {/* Filters row */}
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
                <div className="grid gap-1">
                  <Select value={schemeTypeFilter} onValueChange={setSchemeTypeFilter} disabled={mustSelectBranch}>
                    <SelectTrigger className="h-9 w-[160px] rounded-xl border-zc-border bg-zc-card">
                      <SelectValue placeholder="Scheme type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="PMJAY">PMJAY</SelectItem>
                      <SelectItem value="CGHS">CGHS</SelectItem>
                      <SelectItem value="ECHS">ECHS</SelectItem>
                      <SelectItem value="STATE_SCHEME">State Scheme</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={mustSelectBranch} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">Include inactive</div>
                    <div className="text-xs text-zc-muted">Show expired / disabled schemes</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Branch scoped</Badge>
              <Badge variant="ok">Empanelment tracking</Badge>
              <Badge variant="warning">Check validity dates</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Scheme Registry</CardTitle>
                <CardDescription>All registered government schemes for the selected branch.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <div className="rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[110px]">Type</TableHead>
                    <TableHead className="w-[140px]">Registration #</TableHead>
                    <TableHead className="w-[110px]">Valid Till</TableHead>
                    <TableHead className="w-[120px]">Preauth</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[110px]">Compliance</TableHead>
                    <TableHead className="w-[140px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={9}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                          <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4" />
                            No schemes found.
                          </div>
                          <Button size="sm" onClick={openCreate} disabled={mustSelectBranch}>
                            New Scheme
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
                      const isExpired = r.validTill && new Date(r.validTill) < new Date();

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">
                            <span className="font-semibold text-zc-text">{r.schemeCode}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-zc-text">{r.schemeName}</span>
                              {r.nhaCode ? (
                                <span className="text-xs text-zc-muted">NHA: {r.nhaCode}</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>{schemeTypeBadge(r.schemeType)}</TableCell>
                          <TableCell className="text-sm text-zc-text">{r.registrationNumber || "-"}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "text-sm",
                                isExpired ? "font-semibold text-rose-600 dark:text-rose-400" : "text-zc-text",
                              )}
                            >
                              {r.validTill ? new Date(r.validTill).toLocaleDateString() : "-"}
                            </span>
                          </TableCell>
                          <TableCell>{preauthBadge(r.preauthRequired)}</TableCell>
                          <TableCell>{activeBadge(r.isActive)}</TableCell>
                          <TableCell>
                            {r.empanelment ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                                <Link2 className="h-3 w-3" />Linked
                              </span>
                            ) : (
                              <span className="text-xs text-zc-muted">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-zc-danger hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                onClick={() => handleDelete(r)}
                                disabled={busy}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setDialogOpen(false);
            setEditingId(null);
            setForm(EMPTY_FORM);
          } else {
            setDialogOpen(true);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Landmark className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {editingId ? "Edit Government Scheme" : "Create Government Scheme"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the details of this government scheme registration."
                : "Register a new government empanelment scheme for this branch."}
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="grid gap-6">
            {/* Basics */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Basics</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Scheme Type</Label>
                  <Select value={form.schemeType} onValueChange={(v) => updateForm("schemeType", v as SchemeType)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PMJAY">PMJAY</SelectItem>
                      <SelectItem value="CGHS">CGHS</SelectItem>
                      <SelectItem value="ECHS">ECHS</SelectItem>
                      <SelectItem value="STATE_SCHEME">State Scheme</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Scheme Code</Label>
                  <Input
                    value={form.schemeCode}
                    onChange={(e) => updateForm("schemeCode", e.target.value)}
                    placeholder="e.g. PMJAY-MH-2024"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Scheme Name</Label>
                <Input
                  value={form.schemeName}
                  onChange={(e) => updateForm("schemeName", e.target.value)}
                  placeholder="e.g. Ayushman Bharat - PMJAY"
                />
              </div>
            </div>

            <Separator />

            {/* Registration */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Registration</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Registration Number</Label>
                  <Input
                    value={form.registrationNumber}
                    onChange={(e) => updateForm("registrationNumber", e.target.value)}
                    placeholder="Registration / empanelment number"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Verification Method</Label>
                  <Input
                    value={form.verificationMethod}
                    onChange={(e) => updateForm("verificationMethod", e.target.value)}
                    placeholder="e.g. Aadhaar OTP, Biometric"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Registration Date</Label>
                  <Input
                    type="date"
                    value={form.registrationDate}
                    onChange={(e) => updateForm("registrationDate", e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Valid Till</Label>
                  <Input
                    type="date"
                    value={form.validTill}
                    onChange={(e) => updateForm("validTill", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>SHA Code</Label>
                  <Input
                    value={form.shaCode}
                    onChange={(e) => updateForm("shaCode", e.target.value)}
                    placeholder="State Health Agency code"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>NHA Code</Label>
                  <Input
                    value={form.nhaCode}
                    onChange={(e) => updateForm("nhaCode", e.target.value)}
                    placeholder="National Health Authority code"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>NHA Hospital Code</Label>
                  <Input
                    value={form.nhaHospitalCode}
                    onChange={(e) => updateForm("nhaHospitalCode", e.target.value)}
                    placeholder="Hospital code in NHA portal"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Claims & Authorization */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Claims & Authorization</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Claim Submission Window (days)</Label>
                  <Input
                    type="number"
                    value={form.claimSubmissionWindowDays}
                    onChange={(e) => updateForm("claimSubmissionWindowDays", e.target.value)}
                    placeholder="e.g. 30"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Claim Processing Time (days)</Label>
                  <Input
                    type="number"
                    value={form.claimProcessingTimeDays}
                    onChange={(e) => updateForm("claimProcessingTimeDays", e.target.value)}
                    placeholder="e.g. 15"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">Pre-authorization Required</div>
                  <div className="text-xs text-zc-muted">Whether this scheme requires preauth before treatment</div>
                </div>
                <Switch checked={form.preauthRequired} onCheckedChange={(v) => updateForm("preauthRequired", v)} />
              </div>

              {form.preauthRequired ? (
                <div className="grid gap-2">
                  <Label>Pre-auth Auto-Approval Limit (INR)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.preauthAutoApprovalLimit}
                    onChange={(e) => updateForm("preauthAutoApprovalLimit", e.target.value)}
                    placeholder="e.g. 25000"
                  />
                  <p className="text-[11px] text-zc-muted">Claims below this amount are auto-approved.</p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Claim Submission URL</Label>
                  <Input
                    value={form.claimSubmissionUrl}
                    onChange={(e) => updateForm("claimSubmissionUrl", e.target.value)}
                    placeholder="https://claims.pmjay.gov.in"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Claim Submission Method</Label>
                  <Input
                    value={form.claimSubmissionMethod}
                    onChange={(e) => updateForm("claimSubmissionMethod", e.target.value)}
                    placeholder="e.g. PORTAL, API, PHYSICAL"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Empanelment & Documents */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Empanelment & Documents</div>

              <div className="grid gap-2">
                <Label>Empaneled Specialty IDs</Label>
                <Input
                  value={form.empaneledSpecialtyIds}
                  onChange={(e) => updateForm("empaneledSpecialtyIds", e.target.value)}
                  placeholder="Comma-separated specialty IDs"
                />
                <p className="text-[11px] text-zc-muted">Comma-separated list of specialty IDs that are empaneled under this scheme.</p>
              </div>

              <div className="grid gap-2">
                <Label>Required Documents</Label>
                <Input
                  value={form.requiredDocuments}
                  onChange={(e) => updateForm("requiredDocuments", e.target.value)}
                  placeholder="e.g. AADHAAR, BPL_CARD, REFERRAL_LETTER"
                />
                <p className="text-[11px] text-zc-muted">Comma-separated list of required documents for this scheme.</p>
              </div>

              {/* Package Mapping (structured) */}
              <div className="rounded-xl border border-blue-200/50 bg-blue-50/30 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">Package Mapping</div>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mb-3">
                  Map government scheme package codes to your hospital package codes. Enter values in the same order, separated by commas.
                </p>
                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">Scheme Package Codes</Label>
                    <Input
                      value={form.pkgMapSchemeCodes}
                      onChange={(e) => updateForm("pkgMapSchemeCodes", e.target.value)}
                      placeholder="e.g., HBP-10010001, HBP-10010002, HBP-10020001"
                    />
                    <p className="text-[11px] text-zc-muted">Government scheme package codes (comma-separated).</p>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Hospital Package Codes</Label>
                    <Input
                      value={form.pkgMapHospitalCodes}
                      onChange={(e) => updateForm("pkgMapHospitalCodes", e.target.value)}
                      placeholder="e.g., PKG-LAPCHO-001, PKG-APPEN-001, PKG-HERNIA-001"
                    />
                    <p className="text-[11px] text-zc-muted">Corresponding hospital package codes (same order as above).</p>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Package Rates (optional)</Label>
                    <Input
                      value={form.pkgMapRates}
                      onChange={(e) => updateForm("pkgMapRates", e.target.value)}
                      placeholder="e.g., 30000, 25000, 20000"
                    />
                    <p className="text-[11px] text-zc-muted">Government package rates in ₹ (comma-separated, same order).</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Status</div>

              <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">{form.isActive ? "Active" : "Inactive"}</div>
                  <div className="text-xs text-zc-muted">Inactive schemes will not be available for patient registration</div>
                </div>
                <Switch checked={form.isActive} onCheckedChange={(v) => updateForm("isActive", v)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={busy || !form.schemeName.trim() || !form.schemeCode.trim()}
                className="gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Saving..." : editingId ? "Update Scheme" : "Create Scheme"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </RequirePerm>
    </AppShell>
  );
}

