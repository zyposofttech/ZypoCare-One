"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { IconPlus } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* -------------------------------- Types -------------------------------- */

type RegisterEntry = {
  id: string;
  transactionType: string;
  quantity: number;
  batchNumber: string | null;
  balanceBefore: number;
  balanceAfter: number;
  witnessName: string | null;
  notes: string | null;
  createdAt: string;
  drugMaster?: { drugCode: string; genericName: string };
  pharmacyStore?: { storeCode: string; storeName: string };
};

type StoreOption = {
  id: string;
  storeCode: string;
  storeName: string;
  storeType: string;
};

type EntryForm = {
  drugMasterId: string;
  transactionType: string;
  quantity: string;
  batchNumber: string;
  balanceBefore: string;
  balanceAfter: string;
  witnessName: string;
  notes: string;
};

/* ------------------------------- Helpers -------------------------------- */

const EMPTY_FORM: EntryForm = {
  drugMasterId: "",
  transactionType: "",
  quantity: "",
  batchNumber: "",
  balanceBefore: "",
  balanceAfter: "",
  witnessName: "",
  notes: "",
};

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

function txPill(type: string) {
  switch (type) {
    case "RECEIPT":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "ISSUE":
      return "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200";
    case "WASTAGE":
      return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    case "ADJUSTMENT":
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-muted";
  }
}

function txLabel(type: string) {
  switch (type) {
    case "RECEIPT":
      return "Receipt";
    case "ISSUE":
      return "Issue";
    case "WASTAGE":
      return "Wastage";
    case "ADJUSTMENT":
      return "Adjustment";
    default:
      return type;
  }
}

/* -------------------------------- Page --------------------------------- */

export default function NarcoticsPage() {
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canUpdate = hasPerm(user, "INFRA_PHARMACY_NARCOTICS_UPDATE");

  const {
    insights,
    loading: insightsLoading,
    dismiss: dismissInsight,
  } = usePageInsights({ module: "pharmacy-narcotics", enabled: !!branchId });

  /* ---- data state ---- */
  const [entries, setEntries] = React.useState<RegisterEntry[]>([]);
  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [selectedStore, setSelectedStore] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const pageSize = 50;

  /* ---- dialog state ---- */
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<EntryForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [dialogErr, setDialogErr] = React.useState<string | null>(null);

  const narcoticsVault = stores.find((s) => s.storeType === "NARCOTICS");

  /* ---- load stores ---- */
  React.useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    apiFetch(`/infrastructure/pharmacy/stores?pageSize=200`)
      .then((data: any) => {
        if (cancelled) return;
        const list: StoreOption[] = data.rows ?? [];
        setStores(list);
        const vault = list.find((s) => s.storeType === "NARCOTICS");
        if (vault) setSelectedStore(vault.id);
        else if (list.length > 0) setSelectedStore(list[0].id);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [branchId]);

  /* ---- load register ---- */
  const loadRegister = React.useCallback(
    async (showToast = false) => {
      if (!selectedStore) return;
      setErr(null);
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("storeId", selectedStore);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        const data = await apiFetch<{ rows: any[]; total: number }>(
          `/infrastructure/pharmacy/narcotics-register?${params}`,
        );
        setEntries(data.rows ?? []);
        setTotal(data.total ?? 0);

        if (showToast) {
          toast({
            title: "Register refreshed",
            description: `Loaded ${data.total ?? 0} entries.`,
          });
        }
      } catch (e: any) {
        const msg = e?.message || "Failed to load narcotics register";
        setErr(msg);
        toast({
          variant: "destructive",
          title: "Refresh failed",
          description: msg,
        });
      } finally {
        setLoading(false);
      }
    },
    [selectedStore, page],
  );

  /* Re-fetch when store or page changes */
  React.useEffect(() => {
    if (!selectedStore) return;
    let cancelled = false;
    (async () => {
      setErr(null);
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("storeId", selectedStore);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        const data = await apiFetch<{ rows: any[]; total: number }>(
          `/infrastructure/pharmacy/narcotics-register?${params}`,
        );
        if (cancelled) return;
        setEntries(data.rows ?? []);
        setTotal(data.total ?? 0);
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message || "Failed to load narcotics register");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedStore, page]);

  /* ---- create entry ---- */
  function openCreate() {
    setForm(EMPTY_FORM);
    setDialogErr(null);
    setDialogOpen(true);
  }

  async function handleCreate() {
    setDialogErr(null);

    if (!form.drugMasterId.trim()) return setDialogErr("Drug Master ID is required");
    if (!form.transactionType) return setDialogErr("Transaction type is required");
    if (!form.quantity.trim() || Number(form.quantity) <= 0)
      return setDialogErr("Quantity must be a positive number");
    if (!form.balanceBefore.trim())
      return setDialogErr("Balance before is required");
    if (!form.balanceAfter.trim())
      return setDialogErr("Balance after is required");

    setSaving(true);
    try {
      await apiFetch(`/infrastructure/pharmacy/narcotics-register`, {
        method: "POST",
        body: JSON.stringify({
          drugMasterId: form.drugMasterId.trim(),
          transactionType: form.transactionType,
          quantity: Number(form.quantity),
          batchNumber: form.batchNumber.trim() || null,
          balanceBefore: Number(form.balanceBefore),
          balanceAfter: Number(form.balanceAfter),
          witnessName: form.witnessName.trim() || null,
          notes: form.notes.trim() || null,
          pharmacyStoreId: selectedStore,
        }),
      });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      toast({
        title: "Entry Created",
        description: "Narcotics register entry added successfully.",
        variant: "success",
      });
      loadRegister();
    } catch (e: any) {
      setDialogErr(e?.message || "Create failed");
      toast({
        variant: "destructive",
        title: "Create failed",
        description: e?.message || "Create failed",
      });
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof EntryForm>(key: K, value: EntryForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  /* ---- computed ---- */
  const totalPages = Math.ceil(total / pageSize);
  const receiptsThisPage = entries.filter(
    (e) => e.transactionType === "RECEIPT",
  ).length;
  const issuesThisPage = entries.filter(
    (e) => e.transactionType === "ISSUE",
  ).length;

  return (
    <AppShell title="Infrastructure - Narcotics Register">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ShieldCheck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                Narcotics &amp; Controlled Substances
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Digital narcotics register — immutable transaction log for NDPS
                compliance.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => void loadRegister(true)}
              disabled={loading}
            >
              <RefreshCw
                className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Refresh
            </Button>

            {canUpdate ? (
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={openCreate}
              >
                <IconPlus className="h-4 w-4" />
                Add Entry
              </Button>
            ) : null}
          </div>
        </div>

        {/* AI Insights */}
        <PageInsightBanner
          insights={insights}
          loading={insightsLoading}
          onDismiss={dismissInsight}
        />

        {/* Warning if no narcotics vault */}
        {!narcoticsVault && stores.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">No Narcotics Vault configured</div>
              <div className="mt-0.5 text-xs opacity-80">
                Create a store with type &ldquo;NARCOTICS&rdquo; in Pharmacy
                Stores first. The narcotics register is designed to track
                controlled substances in a dedicated vault store.
              </div>
            </div>
          </div>
        )}

        {/* Store selector */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-2">
            <Label>Store</Label>
            <Select value={selectedStore} onValueChange={(v) => { setSelectedStore(v); setPage(1); }}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.storeCode} — {s.storeName}
                    {s.storeType === "NARCOTICS" ? " (Vault)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              View the narcotics register for the selected store. All entries
              are immutable and form part of the regulatory audit trail.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Total Entries
                </div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                  {total}
                </div>
                <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  Page {page} of {totalPages || 1}
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                  Receipts (this page)
                </div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">
                  {receiptsThisPage}
                </div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
                  Issues (this page)
                </div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
                  {issuesThisPage}
                </div>
              </div>
            </div>

            {err ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Narcotics Register ({total} entries)
            </CardTitle>
            <CardDescription className="text-sm">
              All entries are immutable and form part of the regulatory audit
              trail.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Date/Time
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Drug</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Transaction
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold">Batch</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Balance Before
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Balance After
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Witness
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Notes</th>
                </tr>
              </thead>

              <tbody>
                {!entries.length ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-sm text-zc-muted"
                    >
                      {loading
                        ? "Loading register entries..."
                        : "No register entries found."}
                    </td>
                  </tr>
                ) : null}

                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-zc-border hover:bg-zc-panel/20"
                  >
                    <td className="px-4 py-3 text-zc-muted whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-zc-text">
                        {e.drugMaster?.drugCode ?? "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-zc-muted">
                        {e.drugMaster?.genericName ?? ""}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          txPill(e.transactionType),
                        )}
                      >
                        {txLabel(e.transactionType)}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono tabular-nums text-zc-text">
                      {e.quantity}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {e.batchNumber || "—"}
                    </td>

                    <td className="px-4 py-3 font-mono tabular-nums text-zc-text">
                      {e.balanceBefore}
                    </td>

                    <td className="px-4 py-3 font-mono tabular-nums text-zc-text">
                      {e.balanceAfter}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {e.witnessName || "—"}
                    </td>

                    <td className="px-4 py-3 text-zc-muted max-w-[180px] truncate">
                      {e.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zc-border px-4 py-3">
              <p className="text-xs text-zc-muted">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Guidance callout */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">
                NDPS compliance guidance
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Ensure a dedicated NARCOTICS vault store is configured, then
                2) Record every receipt, issue and wastage with a witness, then
                3) Periodically reconcile physical stock with the register
                balance.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Entry Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setDialogErr(null);
            setDialogOpen(false);
          }
        }}
      >
        <DialogContent
          className={drawerClassName()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Add Narcotics Register Entry
            </DialogTitle>
            <DialogDescription>
              Record a narcotics transaction. All entries are immutable once
              saved and form part of the NDPS compliance audit trail.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {dialogErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{dialogErr}</div>
            </div>
          ) : null}

          <div className="grid gap-6">
            {/* Drug Info */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">
                Drug Info
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Drug Master ID *</Label>
                  <Input
                    value={form.drugMasterId}
                    onChange={(e) => set("drugMasterId", e.target.value)}
                    placeholder="Drug ID"
                    className="font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Transaction Type *</Label>
                  <Select
                    value={form.transactionType}
                    onValueChange={(v) => set("transactionType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECEIPT">Receipt</SelectItem>
                      <SelectItem value="ISSUE">Issue</SelectItem>
                      <SelectItem value="WASTAGE">Wastage</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Quantities */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">
                Quantities
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => set("quantity", e.target.value)}
                    placeholder="e.g. 10"
                    inputMode="numeric"
                    className="font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Batch Number</Label>
                  <Input
                    value={form.batchNumber}
                    onChange={(e) => set("batchNumber", e.target.value)}
                    placeholder="e.g. BTH-2025-001"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Balance Before *</Label>
                  <Input
                    type="number"
                    value={form.balanceBefore}
                    onChange={(e) => set("balanceBefore", e.target.value)}
                    placeholder="Current stock before transaction"
                    inputMode="numeric"
                    className="font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Balance After *</Label>
                  <Input
                    type="number"
                    value={form.balanceAfter}
                    onChange={(e) => set("balanceAfter", e.target.value)}
                    placeholder="Stock after transaction"
                    inputMode="numeric"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Compliance */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">
                Compliance
              </div>

              <div className="grid gap-2">
                <Label>Witness Name</Label>
                <Input
                  value={form.witnessName}
                  onChange={(e) => set("witnessName", e.target.value)}
                  placeholder="Required for narcotics — name of witnessing staff"
                />
                <p className="text-[11px] text-zc-muted">
                  NDPS regulations require a witness for all narcotics
                  transactions.
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Additional remarks or justification"
                  className="min-h-[84px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                onClick={() => void handleCreate()}
                disabled={saving || !canUpdate}
                title={!canUpdate ? "Missing permission: INFRA_PHARMACY_NARCOTICS_UPDATE" : undefined}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add Entry
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
