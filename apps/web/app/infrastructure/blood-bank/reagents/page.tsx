"use client";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconPlus } from "@/components/icons";
import { AlertTriangle, Loader2, Pencil, RefreshCw, TestTubes } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type ReagentRow = {
  id: string;
  name: string;
  code: string;
  category: string;
  lotNumber?: string;
  expiryDate?: string;
  stockQty: number;
  minStockQty: number;
  createdAt?: string;
};

type ReagentForm = {
  name: string;
  code: string;
  category: string;
  lotNumber: string;
  expiryDate: string;
  stockQty: string;
  minStockQty: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

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

const EMPTY_FORM: ReagentForm = {
  name: "",
  code: "",
  category: "",
  lotNumber: "",
  expiryDate: "",
  stockQty: "",
  minStockQty: "",
};

const CATEGORY_OPTIONS = [
  { value: "BLOOD_GROUPING", label: "Blood Grouping" },
  { value: "TTI_TESTING", label: "TTI Testing" },
  { value: "CROSSMATCH", label: "Crossmatch" },
  { value: "ANTIBODY_SCREENING", label: "Antibody Screening" },
  { value: "OTHER", label: "Other" },
] as const;

function isExpiringWithin30Days(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);
  return expiry > now && expiry <= thirtyDaysFromNow;
}

function isExpired(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) <= new Date();
}

function formFromRow(row: ReagentRow): ReagentForm {
  return {
    name: row.name ?? "",
    code: row.code ?? "",
    category: row.category ?? "",
    lotNumber: row.lotNumber ?? "",
    expiryDate: row.expiryDate ? String(row.expiryDate).slice(0, 10) : "",
    stockQty: String(row.stockQty ?? ""),
    minStockQty: String(row.minStockQty ?? ""),
  };
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                      */
/* ------------------------------------------------------------------ */

function StockStatusBadge({ row }: { row: ReagentRow }) {
  if (row.stockQty <= row.minStockQty) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
        LOW STOCK
      </span>
    );
  }

  if (isExpiringWithin30Days(row.expiryDate)) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
        EXPIRING
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
      OK
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Editor Modal                                                      */
/* ------------------------------------------------------------------ */

function EditorModal({
  mode,
  open,
  initial,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
  branchId,
}: {
  mode: "create" | "edit";
  open: boolean;
  initial?: ReagentRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
  branchId: string | null;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<ReagentForm>(EMPTY_FORM);

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);

    if (mode === "edit" && initial) {
      setForm(formFromRow(initial));
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [open, initial, mode]);

  function set<K extends keyof ReagentForm>(key: K, value: ReagentForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);

    if (!form.name.trim()) return setErr("Reagent name is required");
    if (!form.code.trim()) return setErr("Reagent code is required");
    if (!form.category) return setErr("Category is required");

    const stockQty = Number(form.stockQty);
    if (form.stockQty.trim() === "" || !Number.isFinite(stockQty) || stockQty < 0)
      return setErr("Stock quantity must be a non-negative number");

    const minStockQty = Number(form.minStockQty);
    if (form.minStockQty.trim() === "" || !Number.isFinite(minStockQty) || minStockQty < 0)
      return setErr("Min stock quantity must be a non-negative number");

    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        category: form.category,
        lotNumber: form.lotNumber.trim() || null,
        expiryDate: form.expiryDate || null,
        stockQty,
        minStockQty,
        ...(mode === "create" ? { branchId } : {}),
      };

      if (mode === "create") {
        await apiFetch("/api/blood-bank/reagents", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!initial?.id) throw new Error("Missing reagent id");
        await apiFetch(`/api/blood-bank/reagents/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }

      await onSaved();

      toast({
        title: mode === "create" ? "Reagent Created" : "Reagent Updated",
        description: `Successfully ${mode === "create" ? "created" : "updated"} reagent "${form.name}"`,
        variant: "success",
      });

      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      toast({ variant: "destructive", title: "Save failed", description: e?.message || "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setErr(null);
          onClose();
        }
      }}
    >
      <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <TestTubes className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "Add Reagent" : "Edit Reagent"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Register a new reagent in the blood bank inventory."
              : "Update reagent details, lot information and stock levels."}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {err ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        <div className="grid gap-6">
          {/* Reagent Details */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Reagent Details</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Anti-A Monoclonal"
                />
              </div>

              <div className="grid gap-2">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="e.g. RGT-ANTI-A"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Lot & Expiry */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Lot & Expiry</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Lot Number</Label>
                <Input
                  value={form.lotNumber}
                  onChange={(e) => set("lotNumber", e.target.value)}
                  placeholder="e.g. LOT-2024-0001"
                  className="font-mono"
                />
              </div>

              <div className="grid gap-2">
                <Label>Expiry Date</Label>
                <Input
                  value={form.expiryDate}
                  onChange={(e) => set("expiryDate", e.target.value)}
                  type="date"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Stock Levels */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Stock Levels</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Stock Qty</Label>
                <Input
                  value={form.stockQty}
                  onChange={(e) => set("stockQty", e.target.value)}
                  placeholder="e.g. 100"
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-2">
                <Label>Min Stock Qty</Label>
                <Input
                  value={form.minStockQty}
                  onChange={(e) => set("minStockQty", e.target.value)}
                  placeholder="e.g. 10"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={() => void onSubmit()}
              disabled={busy || !canSubmit}
              title={!canSubmit ? deniedMessage : undefined}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Add Reagent" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function BBReagentsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_REAGENT_READ");
  const canCreate = hasPerm(user, "BB_REAGENT_CREATE");
  const canUpdate = hasPerm(user, "BB_REAGENT_UPDATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<ReagentRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ReagentRow | null>(null);

  /* ---- derived stats ---- */

  const lowStockCount = React.useMemo(
    () => rows.filter((r) => r.stockQty <= r.minStockQty).length,
    [rows],
  );

  const expiringCount = React.useMemo(
    () => rows.filter((r) => isExpiringWithin30Days(r.expiryDate)).length,
    [rows],
  );

  /* ---- filter ---- */

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return (rows ?? []).filter((r) => {
      const hay = `${r.code} ${r.name} ${r.category} ${r.lotNumber ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  /* ---- data loading ---- */

  async function refresh(showToast = false) {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<ReagentRow[]>(
        `/api/blood-bank/reagents?branchId=${branchId}`,
      );
      const sorted = [...(data ?? [])].sort((a, b) =>
        (a.name || "").localeCompare(b.name || ""),
      );
      setRows(sorted);

      if (showToast) {
        toast({
          title: "Reagents refreshed",
          description: `Loaded ${sorted.length} reagents.`,
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load reagents";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (branchId) void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  /* ---- render ---- */

  return (
    <AppShell title="BB Reagents">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <TestTubes className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">BB Reagents</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage blood bank reagent inventory, track lot numbers, expiry dates and stock levels.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => void refresh(true)}
              disabled={loading}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={() => setCreateOpen(true)}
              >
                <IconPlus className="h-4 w-4" />
                Add Reagent
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search reagents and manage stock levels. Monitor expiry dates and low-stock alerts.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              {/* Total Reagents */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Reagents</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{rows.length}</div>
              </div>

              {/* Low Stock */}
              <div
                className={cn(
                  "rounded-xl border p-3",
                  lowStockCount > 0
                    ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10"
                    : "border-sky-200 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-900/10",
                )}
              >
                <div
                  className={cn(
                    "text-xs font-medium",
                    lowStockCount > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-sky-600 dark:text-sky-400",
                  )}
                >
                  Low Stock
                </div>
                <div
                  className={cn(
                    "mt-1 text-lg font-bold",
                    lowStockCount > 0
                      ? "text-red-700 dark:text-red-300"
                      : "text-sky-700 dark:text-sky-300",
                  )}
                >
                  {lowStockCount}
                </div>
              </div>

              {/* Expiring within 30d */}
              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Expiring within 30d</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{expiringCount}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search by code, name, category, lot number..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing{" "}
                <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span>{" "}
                of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
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
            <CardTitle className="text-base">Reagent Inventory</CardTitle>
            <CardDescription className="text-sm">
              All registered reagents with lot tracking, expiry monitoring and stock status.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-left font-semibold">Lot Number</th>
                  <th className="px-4 py-3 text-left font-semibold">Expiry Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Stock Qty</th>
                  <th className="px-4 py-3 text-left font-semibold">Min Stock</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading reagents..." : "No reagents found."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {r.code}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{r.name}</div>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{r.category}</td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">{r.lotNumber || "-"}</span>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold tabular-nums text-zc-text">{r.stockQty}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="tabular-nums text-zc-muted">{r.minStockQty}</span>
                    </td>

                    <td className="px-4 py-3">
                      <StockStatusBadge row={r} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate ? (
                          <Button
                            variant="info"
                            size="icon"
                            onClick={() => {
                              setSelected(r);
                              setEditOpen(true);
                            }}
                            title="Edit reagent"
                            aria-label="Edit reagent"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <EditorModal
        mode="create"
        open={createOpen}
        initial={null}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canCreate}
        deniedMessage="Missing permission: BB_REAGENT_CREATE"
        branchId={branchId ?? ""}
      />

      <EditorModal
        mode="edit"
        open={editOpen}
        initial={selected}
        onClose={() => setEditOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canUpdate}
        deniedMessage="Missing permission: BB_REAGENT_UPDATE"
        branchId={branchId ?? ""}
      />
    </AppShell>
  );
}
