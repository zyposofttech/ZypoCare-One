"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconPlus } from "@/components/icons";
import { AlertTriangle, Loader2, Pencil, RefreshCw, IndianRupee } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type TariffRow = {
  id: string;
  componentMasterId?: string;
  componentMaster?: { name: string; code: string };
  chargeType: string;
  amount: number;
  currency: string;
  gstPercent?: number;
  govSchemeCode?: string;
  createdAt?: string;
};

type TariffForm = {
  componentMasterId: string;
  chargeType: string;
  amount: string;
  currency: string;
  gstPercent: string;
  govSchemeCode: string;
};

type ComponentOption = {
  id: string;
  name: string;
  code: string;
};

const EMPTY_FORM: TariffForm = {
  componentMasterId: "",
  chargeType: "PROCESSING",
  amount: "",
  currency: "INR",
  gstPercent: "",
  govSchemeCode: "",
};

const CHARGE_TYPES = [
  "PROCESSING",
  "CROSS_MATCH",
  "STORAGE",
  "ISSUE",
  "SPECIAL",
] as const;

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function BBTariffConfigPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "BB_TARIFF_READ");
  const canUpdate = hasPerm(user, "BB_TARIFF_UPDATE");

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [rows, setRows] = React.useState<TariffRow[]>([]);
  const [components, setComponents] = React.useState<ComponentOption[]>([]);

  // filters
  const [q, setQ] = React.useState("");

  // dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<TariffForm>(EMPTY_FORM);

  /* ---- data loading ---- */
  async function loadTariffs(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch<any>(`/api/blood-bank/tariff?branchId=${branchId}`);
      const list: TariffRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);
      if (showToast) {
        toast({ title: "Tariffs refreshed", description: "Loaded latest tariff configuration." });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load tariffs";
      setErr(msg);
      setRows([]);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function loadComponents() {
    if (!branchId) return;
    try {
      const res = await apiFetch<any>(`/api/blood-bank/components?branchId=${branchId}`);
      const list: ComponentOption[] = Array.isArray(res) ? res : res?.rows || [];
      setComponents(list);
    } catch {
      /* silently ignore — components list is best-effort */
    }
  }

  async function refreshAll(showToast = false) {
    setLoading(true);
    setErr(null);
    try {
      await Promise.all([loadTariffs(false), loadComponents()]);
      if (showToast) toast({ title: "Ready", description: "Tariff data is up to date." });
    } catch (e: any) {
      const msg = e?.message || "Refresh failed";
      setErr(msg);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (branchId) void refreshAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  /* ---- filtered rows ---- */
  const filtered = React.useMemo(() => {
    if (!q.trim()) return rows;
    const lower = q.toLowerCase();
    return rows.filter((r) => {
      const compName = r.componentMaster?.name?.toLowerCase() ?? "";
      const compCode = r.componentMaster?.code?.toLowerCase() ?? "";
      const chargeType = r.chargeType?.toLowerCase() ?? "";
      const scheme = r.govSchemeCode?.toLowerCase() ?? "";
      return compName.includes(lower) || compCode.includes(lower) || chargeType.includes(lower) || scheme.includes(lower);
    });
  }, [rows, q]);

  /* ---- stats ---- */
  const stats = React.useMemo(() => {
    const total = rows.length;
    const avgAmount = total > 0 ? rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) / total : 0;
    const schemeLinked = rows.filter((r) => r.govSchemeCode && r.govSchemeCode.trim() !== "").length;
    return { total, avgAmount, schemeLinked };
  }, [rows]);

  /* ---- create / edit ---- */
  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(row: TariffRow) {
    setEditingId(row.id);
    setForm({
      componentMasterId: row.componentMasterId ?? "",
      chargeType: row.chargeType ?? "PROCESSING",
      amount: row.amount != null ? String(row.amount) : "",
      currency: row.currency ?? "INR",
      gstPercent: row.gstPercent != null ? String(row.gstPercent) : "",
      govSchemeCode: row.govSchemeCode ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!branchId) return;
    setBusy(true);
    try {
      const payload: any = {
        branchId,
        componentMasterId: form.componentMasterId || undefined,
        chargeType: form.chargeType,
        amount: form.amount ? Number(form.amount) : 0,
        currency: form.currency || "INR",
        gstPercent: form.gstPercent ? Number(form.gstPercent) : undefined,
        govSchemeCode: form.govSchemeCode.trim() || undefined,
      };

      if (editingId) {
        payload.id = editingId;
      }

      await apiFetch("/api/blood-bank/tariff", {
        method: "POST",
        body: JSON.stringify(payload),
      } as any);

      toast({
        title: editingId ? "Tariff updated" : "Tariff created",
        description: `Tariff entry has been ${editingId ? "updated" : "created"} successfully.`,
      });

      setDialogOpen(false);
      void loadTariffs(false);
    } catch (e: any) {
      const msg = e?.message || "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  function updateForm<K extends keyof TariffForm>(key: K, value: TariffForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* ---- render ---- */
  return (
    <AppShell title="BB Tariff Config">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <IndianRupee className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">BB Tariff Config</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage blood bank component pricing, charge types, and government scheme rates.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => refreshAll(true)} disabled={loading || busy}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canUpdate && (
              <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={!branchId}>
                <IconPlus className="h-4 w-4" />
                New Tariff
              </Button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load tariff data</CardTitle>
                  <CardDescription className="mt-1">{err}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        {/* Stats */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Tariffs</div>
            <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
            <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Avg Charge Amount</div>
            <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">
              {stats.avgAmount > 0 ? `\u20B9${stats.avgAmount.toFixed(2)}` : "\u2014"}
            </div>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
            <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Scheme-linked</div>
            <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{stats.schemeLinked}</div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative w-full lg:max-w-md">
          <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by component, charge type, or scheme..."
            className="pl-10"
            disabled={!branchId}
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Tariff Registry</CardTitle>
                <CardDescription>All tariff entries for the current branch.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <div className="rounded-xl border border-zc-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zc-border bg-zc-panel/20">
                    <th className="px-4 py-3 text-left font-medium text-zc-muted">Component</th>
                    <th className="px-4 py-3 text-left font-medium text-zc-muted">Charge Type</th>
                    <th className="px-4 py-3 text-right font-medium text-zc-muted">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-zc-muted">Currency</th>
                    <th className="px-4 py-3 text-right font-medium text-zc-muted">GST %</th>
                    <th className="px-4 py-3 text-left font-medium text-zc-muted">Govt Scheme</th>
                    <th className="px-4 py-3 text-right font-medium text-zc-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-zc-border">
                        <td colSpan={7} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                          <div className="flex items-center gap-2">
                            <IndianRupee className="h-4 w-4" />
                            No tariff entries found.
                          </div>
                          {canUpdate && (
                            <Button size="sm" onClick={openCreate} disabled={!branchId}>
                              New Tariff
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-zc-border transition-colors hover:bg-zc-panel/10"
                      >
                        <td className="px-4 py-3 font-medium text-zc-text">
                          {r.componentMaster?.name ?? r.componentMasterId ?? "\u2014"}
                          {r.componentMaster?.code ? (
                            <span className="ml-1 text-xs text-zc-muted">({r.componentMaster.code})</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-zc-text">{r.chargeType}</td>
                        <td className="px-4 py-3 text-right font-mono text-zc-text">
                          {Number(r.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-zc-text">{r.currency ?? "INR"}</td>
                        <td className="px-4 py-3 text-right text-zc-text">
                          {r.gstPercent != null ? `${r.gstPercent}%` : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-zc-text">{r.govSchemeCode || "\u2014"}</td>
                        <td className="px-4 py-3 text-right">
                          {canUpdate && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => openEdit(r)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="flex flex-col gap-3 border-t border-zc-border p-4 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-zc-muted">
                  Total: <span className="font-semibold text-zc-text">{filtered.length}</span>
                  {q.trim() && filtered.length !== rows.length && (
                    <span className="ml-1">(of {rows.length})</span>
                  )}
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
                <IndianRupee className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {editingId ? "Edit Tariff Entry" : "Create Tariff Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the pricing details for this tariff entry."
                : "Add a new tariff / pricing entry for a blood component."}
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="grid gap-6">
            {/* Component & Charge */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Component & Charge</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Component</Label>
                  <Select
                    value={form.componentMasterId}
                    onValueChange={(v) => updateForm("componentMasterId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select component..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px] overflow-y-auto">
                      {components.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} - {c.name}
                        </SelectItem>
                      ))}
                      {components.length === 0 && (
                        <div className="px-3 py-2 text-xs text-zc-muted">No components loaded</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Charge Type</Label>
                  <Select
                    value={form.chargeType}
                    onValueChange={(v) => updateForm("chargeType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select charge type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHARGE_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {ct}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Pricing</div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => updateForm("amount", e.target.value)}
                    placeholder="e.g. 1500.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Currency</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) => updateForm("currency", e.target.value)}
                    placeholder="INR"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>GST %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.gstPercent}
                    onChange={(e) => updateForm("gstPercent", e.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Government Scheme */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Government Scheme</div>

              <div className="grid gap-2">
                <Label>Govt Scheme Code</Label>
                <Input
                  value={form.govSchemeCode}
                  onChange={(e) => updateForm("govSchemeCode", e.target.value)}
                  placeholder="e.g. PMJAY-BB-001 (optional)"
                />
                <p className="text-[11px] text-zc-muted">
                  Link this tariff entry to a government scheme code if applicable.
                </p>
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
                disabled={busy || !form.componentMasterId || !form.chargeType || !form.amount}
                className="gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Saving..." : editingId ? "Update Tariff" : "Create Tariff"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
