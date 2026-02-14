"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Wrench,
  Eye,
  Trash2,
  CheckCircle2,
  BadgePercent,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type TaxType = "GST" | "TDS" | "OTHER";

type TaxCodeRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;

  taxType: TaxType;
  ratePercent: string | number; // Decimal from API can arrive as string

  hsnSac?: string | null;
  components?: any | null;

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;

  _count?: {
    chargeMasterItems?: number;
    tariffRates?: number;
    serviceItems?: number;
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

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function toNumber(v: any) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
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

function ModalHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <BadgePercent className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>

      <Separator className="my-4" />
    </>
  );
}

async function apiTry<T>(primary: string, fallback: string, init?: RequestInit): Promise<T> {
  try {
    return await apiFetch<T>(primary, init as any);
  } catch (e: any) {
    // Fallback for legacy endpoints / permission differences
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
      return await apiFetch<T>(fallback, init as any);
    }
    throw e;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function SuperAdminTaxCodesPage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";


  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "tax-codes",
    enabled: !!branchId,
  });

  const [rows, setRows] = React.useState<TaxCodeRow[]>([]);
  // filters
  const [q, setQ] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  // modals
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<TaxCodeRow | null>(null);

  const [componentsOpen, setComponentsOpen] = React.useState(false);
  const [componentsPayload, setComponentsPayload] = React.useState<any>(null);

  const mustSelectBranch = !branchId;

  async function loadBranches(): Promise<string | null> {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = (effectiveBranchId || null);
    const first = list[0]?.id || null;
    const next = (stored && list.some((b) => b.id === stored) ? stored : null) || first;

    if (next && isGlobalScope) setActiveBranchId(next || null);
    setBranchId(next || "");
    return next;
  }

  async function loadTaxCodes(showToast = false) {
    if (!branchId) return;
    setLoading(true);
    try {
      const qs = buildQS({
        branchId,
        q: q.trim() || undefined,
        includeInactive: includeInactive ? "true" : undefined,
        includeCounts: "true",
      });

      // Prefer infra endpoints (matches this module). Keep billing fallback for legacy compatibility.
      const res = await apiTry<any>(
        `/api/infrastructure/tax-codes?${qs}`,
        `/api/billing/tax-codes?${qs}`,
      );

      const list: TaxCodeRow[] = Array.isArray(res) ? res : (res?.rows || []);
      setRows(list);

      if (showToast) {
        toast({
          title: "Tax codes refreshed",
          description: "Loaded latest tax codes for this branch.",
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load tax codes";
      setRows([]);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll(showToast = false) {
    setLoading(true);
    try {
      const bid = branchId || (await loadBranches());
      if (!bid) {
        setLoading(false);
        return;
      }
      await loadTaxCodes(false);
      if (showToast) toast({ title: "Ready", description: "Branch scope and tax codes are up to date." });
    } catch (e: any) {
      const msg = e?.message || "Refresh failed";
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
    if (isGlobalScope) setActiveBranchId(branchId || null);
    void loadTaxCodes(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!branchId) return;
      void loadTaxCodes(false);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, includeInactive, branchId]);

  const metrics = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const inactive = total - active;

    const usedInactive = rows.filter((r) => {
      const c = r._count || {};
      const used = (c.chargeMasterItems || 0) + (c.tariffRates || 0) + (c.serviceItems || 0) + (c.servicePackages || 0);
      return !r.isActive && used > 0;
    }).length;

    return { total, active, inactive, usedInactive };
  }, [rows]);

  function openCreate() {
    setEditMode("create");
    setEditing(null);
    setEditOpen(true);
  }

  function openEdit(row: TaxCodeRow) {
    setEditMode("edit");
    setEditing(row);
    setEditOpen(true);
  }

  async function quickToggle(row: TaxCodeRow, nextActive: boolean) {
    if (!row?.id) return;
    const ok = window.confirm(
      nextActive
        ? "Activate this tax code? (This can auto-resolve FixIts.)"
        : "Deactivate this tax code? (This may create FixIts if used.)",
    );
    if (!ok) return;

    setBusy(true);
    try {
      await apiTry(
        `/api/infrastructure/tax-codes/${encodeURIComponent(row.id)}`,
        `/api/billing/tax-codes/${encodeURIComponent(row.id)}`,
        { method: "PATCH", body: JSON.stringify({ isActive: nextActive }) },
      );
      toast({ title: "Updated", description: `Tax code is now ${nextActive ? "ACTIVE" : "INACTIVE"}.` });
      await loadTaxCodes(false);
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: TaxCodeRow) {
    if (!row?.id) return;
    const ok = window.confirm("Delete this tax code? (Only safe if not referenced anywhere.)");
    if (!ok) return;

    setBusy(true);
    try {
      await apiTry(
        `/api/infrastructure/tax-codes/${encodeURIComponent(row.id)}`,
        `/api/billing/tax-codes/${encodeURIComponent(row.id)}`,
        { method: "DELETE" },
      );
      toast({ title: "Deleted", description: "Tax code deleted." });
      await loadTaxCodes(false);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure - Tax Codes">
      <RequirePerm perm="INFRA_TAX_CODE_READ">
        <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <BadgePercent className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Tax Codes</div>
              <div className="mt-1 text-sm text-zc-muted">
                Branch-scoped GST/TDS tax definitions used by Charge Master Items and Tariff Rates.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => refreshAll(true)} disabled={busy || loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button
              variant="primary"
              className="px-5 gap-2"
              onClick={openCreate}
              disabled={mustSelectBranch || busy || loading}
            >
              <Plus className="h-4 w-4" />
              New Tax Code
            </Button>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Tax codes must be <span className="font-semibold text-zc-text">active</span> to be used in Charge Master and Tariffs.
              If you deactivate a tax code that is referenced, FixIt rules should flag it.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branchId || ""} onValueChange={(v) => setBranchId(v)}>
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {branches.filter((b) => b.id).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code}){b.city ? ` - ${b.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{metrics.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{metrics.active}</div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Inactive</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{metrics.inactive}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Inactive used</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{metrics.usedInactive}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search code/name/HSN..."
                  className="pl-10"
                  disabled={!branchId}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(!!v)} disabled={!branchId} />
                  <span className="text-sm text-zc-muted">Include inactive</span>
                </div>
              </div>
            </div>


          </CardContent>
        </Card>

        {/* Manage */}
        <Card>
          <CardHeader className="py-4">
            <div>
              <CardTitle className="text-base">Manage Tax Codes</CardTitle>
              <CardDescription>Update tax definitions and activation status.</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-auto rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[160px]">Type</TableHead>
                    <TableHead className="w-[120px]">Flags</TableHead>
                    <TableHead className="w-[240px]">Usage</TableHead>
                    <TableHead className="w-[260px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={`skel-${i}`}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /><Skeleton className="mt-1 h-3 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-8 rounded-lg" /></TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-zc-muted">
                        No tax codes found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
                      const counts = r._count || {};
                      const used =
                        (counts.chargeMasterItems || 0) +
                        (counts.tariffRates || 0) +
                        (counts.serviceItems || 0) +
                        (counts.servicePackages || 0);
                      const isWarn = !r.isActive && used > 0;

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.code}</TableCell>
                          <TableCell>
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-zc-muted">
                              Rate: {String(r.ratePercent)}%
                              {r.hsnSac ? ` • HSN/SAC: ${r.hsnSac}` : ""}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{r.taxType}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {r.isActive ? (
                                <Badge className="w-fit bg-emerald-600 text-white">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="w-fit">
                                  Inactive
                                </Badge>
                              )}
                              {used > 0 ? (
                                <Badge className={cn("w-fit", isWarn ? "bg-amber-600 text-white" : "bg-sky-600 text-white")}>
                                  Used
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="w-fit">
                                  Unused
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {used > 0 ? (
                              <div>
                                <div className="text-xs font-mono text-zc-muted">Refs: {used}</div>
                                <div className={cn("text-sm", isWarn ? "text-amber-700 dark:text-amber-300" : "text-zc-text")}>
                                  {isWarn ? "Inactive but referenced" : "Referenced in billing"}
                                </div>
                                <div className="text-xs text-zc-muted">
                                  CM {counts.chargeMasterItems || 0} · Tariff {counts.tariffRates || 0} · Services{" "}
                                  {counts.serviceItems || 0} · Packs {counts.servicePackages || 0}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-zc-muted">
                                Not used
                                <div className="text-xs text-zc-muted">No references yet</div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[220px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEdit(r)}>
                                  <Wrench className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setComponentsPayload(r.components ?? null);
                                    setComponentsOpen(true);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View components
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => quickToggle(r, !r.isActive)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  {r.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => remove(r)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
      </div>

      {/* Create/Edit drawer */}
      <TaxCodeEditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode={editMode}
        branchId={branchId}
        editing={editing}
        onSaved={async () => {
          toast({ title: "Saved", description: "Tax code saved successfully." });
          await loadTaxCodes(false);
        }}
      />

      {/* Components viewer */}
      <Dialog open={componentsOpen} onOpenChange={setComponentsOpen}>
        <DialogContent className="sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-zc-accent" />
              Tax Components JSON
            </DialogTitle>
            <DialogDescription>Optional breakdown (CGST/SGST/IGST), exemptions, notes, etc.</DialogDescription>
          </DialogHeader>

          <div className="mt-3 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
            <pre className="max-h-[60vh] overflow-auto text-xs leading-relaxed text-zc-text">
              {JSON.stringify(componentsPayload ?? {}, null, 2)}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComponentsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </RequirePerm>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Create/Edit Drawer                             */
/* -------------------------------------------------------------------------- */

function TaxCodeEditModal({
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
  editing: TaxCodeRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState<any>({
    code: "",
    name: "",
    taxType: "GST" as TaxType,
    ratePercent: "18.0000",
    hsnSac: "",
    isActive: true,
    cgstRate: "",
    sgstRate: "",
    igstRate: "",
    exemptions: "",
    legalReference: "",
    notificationNumber: "",
    applicableCategories: "",
    notes: "",
  });

  React.useEffect(() => {
    if (!open) return;

    if (mode === "edit" && editing) {
      const comp = editing.components as any;
      setForm({
        code: editing.code || "",
        name: editing.name || "",
        taxType: (editing.taxType || "GST") as TaxType,
        ratePercent: String(editing.ratePercent ?? ""),
        hsnSac: editing.hsnSac || "",
        isActive: Boolean(editing.isActive),
        cgstRate: comp?.cgst != null ? String(comp.cgst) : "",
        sgstRate: comp?.sgst != null ? String(comp.sgst) : "",
        igstRate: comp?.igst != null ? String(comp.igst) : "",
        exemptions: Array.isArray(comp?.exemptions) ? comp.exemptions.join(", ") : (comp?.exemptions || ""),
        legalReference: comp?.legal_reference || comp?.legalReference || "",
        notificationNumber: comp?.notification_number || comp?.notificationNumber || "",
        applicableCategories: Array.isArray(comp?.applicableCategories) ? comp.applicableCategories.join(", ") : (comp?.applicableCategories || ""),
        notes: comp?.notes || "",
      });
    } else {
      setForm({
        code: "",
        name: "",
        taxType: "GST",
        ratePercent: "18.0000",
        hsnSac: "",
        isActive: true,
        cgstRate: "",
        sgstRate: "",
        igstRate: "",
        exemptions: "",
        legalReference: "",
        notificationNumber: "",
        applicableCategories: "",
        notes: "",
      });
    }
  }, [open, mode, editing]);

  function patch(p: Partial<any>) {
    setForm((prev: any) => ({ ...prev, ...p }));
  }

  async function save() {
    if (!branchId) return;

    const code = String(form.code || "").trim();
    const name = String(form.name || "").trim();
    const rateStr = String(form.ratePercent || "").trim();

    if (!code || !name) {
      toast({ title: "Missing fields", description: "Code and Name are required." });
      return;
    }

    const rateNum = toNumber(rateStr);
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      toast({ title: "Invalid rate", description: "ratePercent must be a valid number (e.g., 18.0000)." });
      return;
    }

    // Build components from structured fields
    let components: any = null;

    // Merge explicit GST component fields
    const cgst = form.cgstRate ? Number(form.cgstRate) : null;
    const sgst = form.sgstRate ? Number(form.sgstRate) : null;
    const igst = form.igstRate ? Number(form.igstRate) : null;
    if (cgst != null || sgst != null || igst != null) {
      components = { ...(components || {}), cgst, sgst, igst };
    }

    // Merge metadata fields
    const exemptions = (form.exemptions || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const applicableCategories = (form.applicableCategories || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const legalRef = (form.legalReference || "").trim();
    const notifNum = (form.notificationNumber || "").trim();
    const notesStr = (form.notes || "").trim();
    if (exemptions.length > 0 || legalRef || notifNum || applicableCategories.length > 0 || notesStr) {
      components = {
        ...(components || {}),
        ...(exemptions.length > 0 ? { exemptions } : {}),
        ...(legalRef ? { legal_reference: legalRef } : {}),
        ...(notifNum ? { notification_number: notifNum } : {}),
        ...(applicableCategories.length > 0 ? { applicableCategories } : {}),
        ...(notesStr ? { notes: notesStr } : {}),
      };
    }

    const payload: any = {
      code,
      name,
      taxType: (form.taxType || "GST") as TaxType,
      // Backend DTO expects number (ValidationPipe does not do implicit conversion)
      ratePercent: rateNum,
      hsnSac: String(form.hsnSac || "").trim() || null,
      isActive: Boolean(form.isActive),
      components,
    };

    setSaving(true);
    try {
      if (mode === "create") {
        const qs = buildQS({ branchId });
        await apiTry(
          `/api/infrastructure/tax-codes?${qs}`,
          `/api/billing/tax-codes?${qs}`,
          { method: "POST", body: JSON.stringify(payload) },
        );
      } else {
        if (!editing?.id) throw new Error("Invalid editing row");
        await apiTry(
          `/api/infrastructure/tax-codes/${encodeURIComponent(editing.id)}`,
          `/api/billing/tax-codes/${encodeURIComponent(editing.id)}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
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
        <ModalHeader
          title={mode === "create" ? "New Tax Code" : "Edit Tax Code"}
          description="Branch-scoped. Active tax codes are required for Charge Master and Tariff Rates."
        />

        <div className="px-6 pb-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Code</Label>
              <Input value={form.code || ""} onChange={(e) => patch({ code: e.target.value })} placeholder="e.g., GST-18" />
            </div>

            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name || ""} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g., GST @ 18%" />
            </div>

            <div className="grid gap-2">
              <Label>Tax Type</Label>
              <Select value={form.taxType} onValueChange={(v) => patch({ taxType: v as TaxType })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GST">GST</SelectItem>
                  <SelectItem value="TDS">TDS</SelectItem>
                  <SelectItem value="OTHER">OTHER</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Rate Percent</Label>
              <Input
                value={form.ratePercent || ""}
                onChange={(e) => patch({ ratePercent: e.target.value })}
                placeholder="18.0000"
              />
              <div className="text-xs text-zc-muted">Store with precision (Decimal). Example: 18.0000</div>
            </div>

            {/* GST Component Rates */}
            {form.taxType === "GST" && (
              <div className="grid gap-4 md:grid-cols-3 md:col-span-2">
                <div className="grid gap-2">
                  <Label>CGST Rate %</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.cgstRate || ""}
                    onChange={(e) => patch({ cgstRate: e.target.value })}
                    placeholder="e.g., 9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>SGST Rate %</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.sgstRate || ""}
                    onChange={(e) => patch({ sgstRate: e.target.value })}
                    placeholder="e.g., 9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>IGST Rate %</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.igstRate || ""}
                    onChange={(e) => patch({ igstRate: e.target.value })}
                    placeholder="e.g., 18"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Default HSN/SAC (optional)</Label>
              <Input value={form.hsnSac || ""} onChange={(e) => patch({ hsnSac: e.target.value })} placeholder="e.g., 999312" />
            </div>

            <div className="grid gap-2">
              <Label>Active</Label>
              <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                <Switch checked={Boolean(form.isActive)} onCheckedChange={(v) => patch({ isActive: v })} />
                <div className="text-sm">
                  <div className="font-semibold text-zc-text">{form.isActive ? "Active" : "Inactive"}</div>
                  <div className="text-xs text-zc-muted">Inactive tax codes should not be used</div>
                </div>
              </div>
            </div>

            {/* ── Additional Metadata (structured) ── */}
            <div className="md:col-span-2 rounded-xl border border-purple-200 bg-purple-50/30 p-4 space-y-4">
              <div className="text-sm font-semibold text-purple-700">Additional Metadata (optional)</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Legal Reference</Label>
                  <Input
                    value={form.legalReference || ""}
                    onChange={(e) => patch({ legalReference: e.target.value })}
                    placeholder="e.g., Section 9(1) of CGST Act"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Notification Number</Label>
                  <Input
                    value={form.notificationNumber || ""}
                    onChange={(e) => patch({ notificationNumber: e.target.value })}
                    placeholder="e.g., 11/2017-CT(Rate)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Exemptions</Label>
                  <Input
                    value={form.exemptions || ""}
                    onChange={(e) => patch({ exemptions: e.target.value })}
                    placeholder="e.g., healthcare, education, charity"
                  />
                  <div className="text-xs text-zc-muted">Comma-separated list of exemption categories</div>
                </div>
                <div className="grid gap-2">
                  <Label>Applicable Categories</Label>
                  <Input
                    value={form.applicableCategories || ""}
                    onChange={(e) => patch({ applicableCategories: e.target.value })}
                    placeholder="e.g., consultation, pharmacy, lab"
                  />
                  <div className="text-xs text-zc-muted">Comma-separated list of applicable service categories</div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Input
                  value={form.notes || ""}
                  onChange={(e) => patch({ notes: e.target.value })}
                  placeholder="e.g., Exemption applicable for healthcare services under Notification 12/2017"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
