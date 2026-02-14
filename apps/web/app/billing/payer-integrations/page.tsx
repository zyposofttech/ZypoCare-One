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
  Eye,
  MoreHorizontal,
  Network,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Wifi,
  Zap,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type IntegrationRow = {
  id: string;
  branchId: string;
  payerId: string;
  payer?: { id: string; code: string; name: string; kind: string };
  integrationMode: string;
  hcxParticipantCode?: string;
  hcxEndpointUrl?: string;
  apiBaseUrl?: string;
  apiAuthMethod?: string;
  sftpHost?: string;
  sftpPort?: number;
  sftpPath?: string;
  portalUrl?: string;
  portalNotes?: string;
  webhookUrl?: string;
  retryMaxAttempts: number;
  retryBackoffMs: number;
  pollingIntervalMs?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type IntegrationFormData = {
  payerId: string;
  integrationMode: string;
  hcxParticipantCode: string;
  hcxEndpointUrl: string;
  apiBaseUrl: string;
  apiAuthMethod: string;
  sftpHost: string;
  sftpPort: string;
  sftpPath: string;
  portalUrl: string;
  portalNotes: string;
  webhookUrl: string;
  webhookSecret: string;
  retryMaxAttempts: string;
  retryBackoffMs: string;
  pollingIntervalMs: string;
  isActive: boolean;
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

function modeBadge(mode: string) {
  switch (mode) {
    case "HCX":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">HCX</Badge>;
    case "NHCX":
      return <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">NHCX</Badge>;
    case "DIRECT_API":
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Direct API</Badge>;
    case "SFTP_BATCH":
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">SFTP Batch</Badge>;
    case "PORTAL_ASSISTED":
      return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Portal</Badge>;
    case "MANUAL":
      return <Badge variant="secondary">Manual</Badge>;
    default:
      return <Badge variant="secondary">{mode}</Badge>;
  }
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

function emptyForm(): IntegrationFormData {
  return {
    payerId: "",
    integrationMode: "HCX",
    hcxParticipantCode: "",
    hcxEndpointUrl: "",
    apiBaseUrl: "",
    apiAuthMethod: "",
    sftpHost: "",
    sftpPort: "",
    sftpPath: "",
    portalUrl: "",
    portalNotes: "",
    webhookUrl: "",
    webhookSecret: "",
    retryMaxAttempts: "3",
    retryBackoffMs: "1000",
    pollingIntervalMs: "",
    isActive: true,
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function PayerIntegrationsPage() {
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
  const [rows, setRows] = React.useState<IntegrationRow[]>([]);
  const [q, setQ] = React.useState("");

  // Create/Edit modal
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = React.useState<IntegrationRow | null>(null);

  // Detail drawer
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailRow, setDetailRow] = React.useState<IntegrationRow | null>(null);

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "billing-payer-integrations",
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

  async function loadIntegrations(showToast = false, targetBranchId?: string) {
    const target = targetBranchId || branchId;
    if (!target) return;
    setErr(null);
    setLoading(true);
    try {
      const qs = buildQS({
        branchId: target,
        q: q.trim() || undefined,
        includeRefs: "true",
      });
      const res = await apiFetch<any>(`/api/billing/payer-integrations?${qs}`);
      const list: IntegrationRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);
      if (showToast) toast({ title: "Integrations refreshed" });
    } catch (e: any) {
      const msg = e?.message || "Failed to load payer integrations";
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
      await loadIntegrations(false, bid);
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
  React.useEffect(() => { if (branchId) void loadIntegrations(false); }, [branchId]);
  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadIntegrations(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function onBranchChange(nextId: string) {
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
    setQ("");
    void loadIntegrations(false, nextId);
  }

  /* ---- Actions ---- */

  function openCreate() {
    setEditMode("create");
    setEditingRow(null);
    setEditOpen(true);
  }

  function openEdit(row: IntegrationRow) {
    setEditMode("edit");
    setEditingRow(row);
    setEditOpen(true);
  }

  function openDetail(row: IntegrationRow) {
    setDetailRow(row);
    setDetailOpen(true);
  }

  async function testConnectivity(row: IntegrationRow) {
    if (!row?.id) return;
    setBusy(true);
    try {
      const res = await apiFetch<any>(`/api/billing/payer-integrations/${encodeURIComponent(row.id)}/test`, {
        method: "POST",
      });
      const ok = res?.success ?? res?.connected ?? true;
      if (ok) {
        toast({ title: "Connectivity Test Passed", description: res?.message || "Connection is working." });
      } else {
        toast({ title: "Connectivity Test Failed", description: res?.message || "Connection failed.", variant: "destructive" as any });
      }
    } catch (e: any) {
      toast({ title: "Test failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  /* ---- Stats ---- */

  const stats = React.useMemo(() => {
    const total = rows.length;
    const hcx = rows.filter((r) => r.integrationMode === "HCX").length;
    const nhcx = rows.filter((r) => r.integrationMode === "NHCX").length;
    const directApi = rows.filter((r) => r.integrationMode === "DIRECT_API").length;
    const sftp = rows.filter((r) => r.integrationMode === "SFTP_BATCH").length;
    const portal = rows.filter((r) => r.integrationMode === "PORTAL_ASSISTED").length;
    const manual = rows.filter((r) => r.integrationMode === "MANUAL").length;
    return { total, hcx, nhcx, directApi, sftp, portal, manual };
  }, [rows]);

  /* ---- Render ---- */

  return (
    <AppShell title="Billing - Payer Integrations">
      <RequirePerm perm="BILLING_INTEGRATION_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <Plug className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Payer Integrations</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Configure how each payer connects to the system: HCX, API, SFTP, or manual workflows.
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
                New Integration
              </Button>
            </div>
          </div>

          {err && (
            <Card className="border-zc-danger/40">
              <CardHeader className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                  <div>
                    <CardTitle className="text-base">Could not load integrations</CardTitle>
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

              <div className="grid gap-3 grid-cols-3 md:grid-cols-7">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">HCX</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.hcx}</div>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">NHCX</div>
                  <div className="mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-300">{stats.nhcx}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Direct API</div>
                  <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.directApi}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-300">SFTP</div>
                  <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{stats.sftp}</div>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900/50 dark:bg-purple-900/10">
                  <div className="text-xs font-medium text-purple-600 dark:text-purple-400">Portal</div>
                  <div className="mt-1 text-lg font-bold text-purple-700 dark:text-purple-300">{stats.portal}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-900/50 dark:bg-slate-900/10">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Manual</div>
                  <div className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-300">{stats.manual}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by payer name or code..." className="pl-10" disabled={!branchId} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Integration Configs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payer</TableHead>
                      <TableHead className="w-[120px]">Mode</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                      <TableHead className="w-[140px]">HCX Code</TableHead>
                      <TableHead className="w-[180px]">Webhook URL</TableHead>
                      <TableHead className="w-[120px]">Retry Config</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                      ))
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                            <Plug className="h-4 w-4" /> No integration configs found.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => (
                        <TableRow key={r.id} className="cursor-pointer hover:bg-zc-panel/20" onClick={() => openDetail(r)}>
                          <TableCell>
                            {r.payer ? (
                              <div>
                                <div className="font-semibold text-zc-text">{r.payer.name}</div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-xs text-zc-muted font-mono">{r.payer.code}</span>
                                  <Badge variant="secondary" className="text-[10px]">{r.payer.kind}</Badge>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-zc-muted">{r.payerId?.slice(0, 8)}</span>
                            )}
                          </TableCell>
                          <TableCell>{modeBadge(r.integrationMode)}</TableCell>
                          <TableCell>
                            {r.isActive ? (
                              <Badge variant="ok">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {r.hcxParticipantCode || <span className="text-zc-muted">\u2014</span>}
                          </TableCell>
                          <TableCell className="text-xs truncate max-w-[180px]">
                            {r.webhookUrl || <span className="text-zc-muted">\u2014</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.retryMaxAttempts}x / {r.retryBackoffMs}ms
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
                                <DropdownMenuItem onClick={() => openDetail(r)}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(r)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => testConnectivity(r)}>
                                  <Wifi className="mr-2 h-4 w-4" /> Test Connectivity
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
                    Total: <span className="font-semibold text-zc-text">{rows.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Dialog */}
        <IntegrationEditModal
          open={editOpen}
          onOpenChange={setEditOpen}
          mode={editMode}
          branchId={branchId}
          editing={editingRow}
          onSaved={async () => {
            toast({ title: "Saved", description: "Integration config saved successfully." });
            await loadIntegrations(false);
          }}
        />

        {/* Detail Viewer */}
        <IntegrationDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          integration={detailRow}
        />
      </RequirePerm>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Create/Edit Dialog                               */
/* -------------------------------------------------------------------------- */

function IntegrationEditModal({
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
  editing: IntegrationRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<IntegrationFormData>(emptyForm());

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editing) {
      setForm({
        payerId: editing.payerId || "",
        integrationMode: editing.integrationMode || "HCX",
        hcxParticipantCode: editing.hcxParticipantCode || "",
        hcxEndpointUrl: editing.hcxEndpointUrl || "",
        apiBaseUrl: editing.apiBaseUrl || "",
        apiAuthMethod: editing.apiAuthMethod || "",
        sftpHost: editing.sftpHost || "",
        sftpPort: editing.sftpPort != null ? String(editing.sftpPort) : "",
        sftpPath: editing.sftpPath || "",
        portalUrl: editing.portalUrl || "",
        portalNotes: editing.portalNotes || "",
        webhookUrl: editing.webhookUrl || "",
        webhookSecret: "",
        retryMaxAttempts: String(editing.retryMaxAttempts ?? 3),
        retryBackoffMs: String(editing.retryBackoffMs ?? 1000),
        pollingIntervalMs: editing.pollingIntervalMs != null ? String(editing.pollingIntervalMs) : "",
        isActive: editing.isActive ?? true,
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, mode, editing]);

  function patch(p: Partial<IntegrationFormData>) {
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
    if (!form.payerId.trim()) {
      toast({ title: "Missing fields", description: "Payer ID is required." });
      return;
    }
    if (!form.integrationMode) {
      toast({ title: "Missing fields", description: "Integration Mode is required." });
      return;
    }

    const payload: any = {
      branchId,
      payerId: form.payerId.trim(),
      integrationMode: form.integrationMode,
      hcxParticipantCode: form.hcxParticipantCode.trim() || null,
      hcxEndpointUrl: form.hcxEndpointUrl.trim() || null,
      apiBaseUrl: form.apiBaseUrl.trim() || null,
      apiAuthMethod: form.apiAuthMethod.trim() || null,
      sftpHost: form.sftpHost.trim() || null,
      sftpPort: toNumOrNull(form.sftpPort),
      sftpPath: form.sftpPath.trim() || null,
      portalUrl: form.portalUrl.trim() || null,
      portalNotes: form.portalNotes.trim() || null,
      webhookUrl: form.webhookUrl.trim() || null,
      retryMaxAttempts: toNumOrNull(form.retryMaxAttempts) ?? 3,
      retryBackoffMs: toNumOrNull(form.retryBackoffMs) ?? 1000,
      pollingIntervalMs: toNumOrNull(form.pollingIntervalMs),
      isActive: form.isActive,
    };

    // Only send webhookSecret if it was provided
    if (form.webhookSecret.trim()) {
      payload.webhookSecret = form.webhookSecret.trim();
    }

    setSaving(true);
    try {
      if (mode === "create") {
        await apiFetch(`/api/billing/payer-integrations`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!editing?.id) throw new Error("Invalid editing row");
        await apiFetch(`/api/billing/payer-integrations/${encodeURIComponent(editing.id)}`, {
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

  const showHcx = form.integrationMode === "HCX" || form.integrationMode === "NHCX";
  const showApi = form.integrationMode === "DIRECT_API";
  const showSftp = form.integrationMode === "SFTP_BATCH";
  const showPortal = form.integrationMode === "PORTAL_ASSISTED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Plug className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "New Payer Integration" : "Edit Payer Integration"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Configure how a payer connects to the system for claims processing."
              : `Editing integration for payer: ${editing?.payer?.name || editing?.payerId || ""}`}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="max-h-[65vh] overflow-y-auto px-1">
          <div className="grid gap-5">
            {/* Row 1: Payer + Mode */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Payer ID *</Label>
                <Input value={form.payerId} onChange={(e) => patch({ payerId: e.target.value })} placeholder="Enter Payer ID" />
              </div>
              <div className="grid gap-2">
                <Label>Integration Mode *</Label>
                <Select value={form.integrationMode} onValueChange={(v) => patch({ integrationMode: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HCX">HCX</SelectItem>
                    <SelectItem value="NHCX">NHCX</SelectItem>
                    <SelectItem value="DIRECT_API">Direct API</SelectItem>
                    <SelectItem value="SFTP_BATCH">SFTP Batch</SelectItem>
                    <SelectItem value="PORTAL_ASSISTED">Portal Assisted</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* HCX / NHCX fields */}
            {showHcx && (
              <div className="rounded-xl border border-blue-200/50 bg-blue-50/30 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">
                  {form.integrationMode === "HCX" ? "HCX" : "NHCX"} Configuration
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Participant Code</Label>
                    <Input value={form.hcxParticipantCode} onChange={(e) => patch({ hcxParticipantCode: e.target.value })} placeholder="e.g., hcx-payer-001" className="font-mono" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Endpoint URL</Label>
                    <Input value={form.hcxEndpointUrl} onChange={(e) => patch({ hcxEndpointUrl: e.target.value })} placeholder="https://hcx-gateway.example.com" />
                  </div>
                </div>
              </div>
            )}

            {/* Direct API fields */}
            {showApi && (
              <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/30 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3">Direct API Configuration</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>API Base URL</Label>
                    <Input value={form.apiBaseUrl} onChange={(e) => patch({ apiBaseUrl: e.target.value })} placeholder="https://api.payer.example.com/v1" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Auth Method</Label>
                    <Input value={form.apiAuthMethod} onChange={(e) => patch({ apiAuthMethod: e.target.value })} placeholder="e.g., BEARER, OAUTH2, API_KEY" />
                  </div>
                </div>
              </div>
            )}

            {/* SFTP fields */}
            {showSftp && (
              <div className="rounded-xl border border-amber-200/50 bg-amber-50/30 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3">SFTP Configuration</div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>SFTP Host</Label>
                    <Input value={form.sftpHost} onChange={(e) => patch({ sftpHost: e.target.value })} placeholder="sftp.payer.example.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Port</Label>
                    <Input type="number" min={1} max={65535} value={form.sftpPort} onChange={(e) => patch({ sftpPort: e.target.value })} placeholder="22" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Remote Path</Label>
                    <Input value={form.sftpPath} onChange={(e) => patch({ sftpPath: e.target.value })} placeholder="/claims/outbound" />
                  </div>
                </div>
              </div>
            )}

            {/* Portal fields */}
            {showPortal && (
              <div className="rounded-xl border border-purple-200/50 bg-purple-50/30 p-4 dark:border-purple-900/50 dark:bg-purple-900/10">
                <div className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3">Portal Configuration</div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Portal URL</Label>
                    <Input value={form.portalUrl} onChange={(e) => patch({ portalUrl: e.target.value })} placeholder="https://portal.payer.example.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Portal Notes</Label>
                    <Textarea value={form.portalNotes} onChange={(e) => patch({ portalNotes: e.target.value })} placeholder="Login instructions, process notes..." rows={3} />
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Webhook */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Webhook URL</Label>
                <Input value={form.webhookUrl} onChange={(e) => patch({ webhookUrl: e.target.value })} placeholder="https://your-system.com/webhooks/payer" />
              </div>
              <div className="grid gap-2">
                <Label>Webhook Secret</Label>
                <Input type="password" value={form.webhookSecret} onChange={(e) => patch({ webhookSecret: e.target.value })} placeholder={mode === "edit" ? "Leave blank to keep existing" : "Enter secret"} />
              </div>
            </div>

            {/* Retry Config */}
            <div className="rounded-xl border border-slate-200/50 bg-slate-50/30 p-4 dark:border-slate-900/50 dark:bg-slate-900/10">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Retry &amp; Polling Configuration</div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label className="text-xs">Max Attempts</Label>
                  <Input type="number" min={0} max={20} value={form.retryMaxAttempts} onChange={(e) => patch({ retryMaxAttempts: e.target.value })} placeholder="3" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Backoff (ms)</Label>
                  <Input type="number" min={100} step={100} value={form.retryBackoffMs} onChange={(e) => patch({ retryBackoffMs: e.target.value })} placeholder="1000" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Polling Interval (ms)</Label>
                  <Input type="number" min={0} step={1000} value={form.pollingIntervalMs} onChange={(e) => patch({ pollingIntervalMs: e.target.value })} placeholder="Optional" />
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div className="grid gap-2">
              <Label>Active</Label>
              <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2 h-10">
                <Switch checked={form.isActive} onCheckedChange={(v) => patch({ isActive: v })} />
                <span className="text-sm">{form.isActive ? "Active" : "Inactive"}</span>
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
            {mode === "create" ? "Create Integration" : "Update Integration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Detail Viewer Dialog                             */
/* -------------------------------------------------------------------------- */

function IntegrationDetailDialog({
  open,
  onOpenChange,
  integration,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  integration: IntegrationRow | null;
}) {
  if (!integration) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-zc-accent" />
            Integration Details
          </DialogTitle>
          <DialogDescription>
            {integration.payer?.name || integration.payerId} \u2014 {integration.integrationMode}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="max-h-[65vh] overflow-y-auto grid gap-4">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            {modeBadge(integration.integrationMode)}
            {integration.isActive ? (
              <Badge variant="ok">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>

          {/* Payer info */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zc-muted">Payer</div>
              <div className="font-semibold">{integration.payer?.name || "\u2014"}</div>
              {integration.payer?.code && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-zc-muted font-mono">{integration.payer.code}</span>
                  <Badge variant="secondary" className="text-[10px]">{integration.payer.kind}</Badge>
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-zc-muted">Integration Mode</div>
              <div className="font-semibold">{integration.integrationMode.replace(/_/g, " ")}</div>
            </div>
          </div>

          <Separator />

          {/* HCX details */}
          {(integration.hcxParticipantCode || integration.hcxEndpointUrl) && (
            <div className="rounded-xl border border-blue-200/50 bg-blue-50/30 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
              <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">HCX Configuration</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs text-zc-muted">Participant Code</div>
                  <div className="font-semibold font-mono">{integration.hcxParticipantCode || "\u2014"}</div>
                </div>
                <div>
                  <div className="text-xs text-zc-muted">Endpoint URL</div>
                  <div className="font-semibold text-sm break-all">{integration.hcxEndpointUrl || "\u2014"}</div>
                </div>
              </div>
            </div>
          )}

          {/* API details */}
          {(integration.apiBaseUrl || integration.apiAuthMethod) && (
            <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/30 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">API Configuration</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs text-zc-muted">Base URL</div>
                  <div className="font-semibold text-sm break-all">{integration.apiBaseUrl || "\u2014"}</div>
                </div>
                <div>
                  <div className="text-xs text-zc-muted">Auth Method</div>
                  <div className="font-semibold">{integration.apiAuthMethod || "\u2014"}</div>
                </div>
              </div>
            </div>
          )}

          {/* SFTP details */}
          {(integration.sftpHost || integration.sftpPath) && (
            <div className="rounded-xl border border-amber-200/50 bg-amber-50/30 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
              <div className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">SFTP Configuration</div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-xs text-zc-muted">Host</div>
                  <div className="font-semibold font-mono">{integration.sftpHost || "\u2014"}</div>
                </div>
                <div>
                  <div className="text-xs text-zc-muted">Port</div>
                  <div className="font-semibold font-mono">{integration.sftpPort ?? "\u2014"}</div>
                </div>
                <div>
                  <div className="text-xs text-zc-muted">Path</div>
                  <div className="font-semibold font-mono">{integration.sftpPath || "\u2014"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Portal details */}
          {(integration.portalUrl || integration.portalNotes) && (
            <div className="rounded-xl border border-purple-200/50 bg-purple-50/30 p-4 dark:border-purple-900/50 dark:bg-purple-900/10">
              <div className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">Portal Configuration</div>
              <div className="grid gap-3">
                <div>
                  <div className="text-xs text-zc-muted">Portal URL</div>
                  <div className="font-semibold text-sm break-all">{integration.portalUrl || "\u2014"}</div>
                </div>
                {integration.portalNotes && (
                  <div>
                    <div className="text-xs text-zc-muted">Notes</div>
                    <div className="text-sm mt-1 whitespace-pre-wrap">{integration.portalNotes}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Webhook + Retry */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zc-muted">Webhook URL</div>
              <div className="font-semibold text-sm break-all">{integration.webhookUrl || "\u2014"}</div>
            </div>
            <div>
              <div className="text-xs text-zc-muted">Retry Config</div>
              <div className="font-semibold">
                {integration.retryMaxAttempts} attempts, {integration.retryBackoffMs}ms backoff
                {integration.pollingIntervalMs ? `, ${integration.pollingIntervalMs}ms polling` : ""}
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zc-muted">Created At</div>
              <div className="font-semibold">{new Date(integration.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-zc-muted">Updated At</div>
              <div className="font-semibold">{new Date(integration.updatedAt).toLocaleString()}</div>
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
