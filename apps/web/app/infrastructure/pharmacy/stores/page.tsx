"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { IconBuilding, IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import { Building2, Loader2, RefreshCw } from "lucide-react";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import { useFieldCopilot } from "@/lib/copilot/useFieldCopilot";
import { AIFieldWrapper } from "@/components/copilot/AIFieldWrapper";

/* -------------------------------- Types -------------------------------- */

type StoreType =
  | "MAIN"
  | "IP_PHARMACY"
  | "OP_PHARMACY"
  | "EMERGENCY"
  | "OT_STORE"
  | "ICU_STORE"
  | "WARD_STORE"
  | "NARCOTICS";

type StoreStatus = "ACTIVE" | "INACTIVE" | "UNDER_SETUP";

type StoreRow = {
  id: string;
  storeCode: string;
  storeName: string;
  storeType: StoreType;
  status: StoreStatus;
  parentStore?: { id: string; storeCode: string; storeName: string } | null;
  pharmacistInCharge?: { id: string; empCode: string; name: string } | null;
  is24x7: boolean;
  canDispense: boolean;
  createdAt: string;
};

/* ------------------------------- Constants ------------------------------ */

const STORE_TYPES: StoreType[] = [
  "MAIN", "IP_PHARMACY", "OP_PHARMACY", "EMERGENCY",
  "OT_STORE", "ICU_STORE", "WARD_STORE", "NARCOTICS",
];

const TYPE_LABELS: Record<StoreType, string> = {
  MAIN: "Main Store",
  IP_PHARMACY: "IP Pharmacy",
  OP_PHARMACY: "OP Pharmacy",
  EMERGENCY: "Emergency",
  OT_STORE: "OT Store",
  ICU_STORE: "ICU Store",
  WARD_STORE: "Ward Store",
  NARCOTICS: "Narcotics Vault",
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

/* -------------------------------- Page --------------------------------- */

export default function PharmacyStoresPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "INFRA_PHARMACY_STORE_READ");
  const canCreate = hasPerm(user, "INFRA_PHARMACY_STORE_CREATE");

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "pharmacy-stores",
    enabled: !!branchId,
  });

  const [stores, setStores] = React.useState<StoreRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  // Create dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [allStores, setAllStores] = React.useState<StoreRow[]>([]);
  const [form, setForm] = React.useState<any>({});
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const storeCodeCopilot = useFieldCopilot({
    module: "pharmacy-store",
    field: "storeCode",
    value: form.storeCode ?? "",
    enabled: !!branchId && dialogOpen,
  });
  const storeNameCopilot = useFieldCopilot({
    module: "pharmacy-store",
    field: "storeName",
    value: form.storeName ?? "",
    enabled: !!branchId && dialogOpen,
  });

  const load = React.useCallback(async (showToast = false) => {
    if (!branchId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (q) params.set("q", q);

      const data = await apiFetch(`/infrastructure/pharmacy/stores?${params}`);
      setStores(data.rows ?? []);
      setTotal(data.total ?? 0);

      if (showToast) {
        toast({ title: "Stores refreshed", description: `Loaded ${data.total ?? 0} stores.` });
      }
    } catch (e: any) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [branchId, page, q]);

  React.useEffect(() => { load(); }, [load]);

  const loadAllStores = React.useCallback(async () => {
    if (!branchId) return;
    try {
      const data = await apiFetch(`/infrastructure/pharmacy/stores?pageSize=200`);
      setAllStores(data.rows ?? []);
    } catch {}
  }, [branchId]);

  const openCreate = () => {
    setForm({ storeType: "OP_PHARMACY", is24x7: false, canDispense: false, canIndent: true, canReceiveStock: false, canReturnVendor: false, autoIndentEnabled: false });
    setErr(null);
    loadAllStores();
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    setErr(null);
    if (!form.storeCode?.trim()) return setErr("Store code is required");
    if (!form.storeName?.trim()) return setErr("Store name is required");

    setSaving(true);
    try {
      await apiFetch(`/infrastructure/pharmacy/stores`, {
        method: "POST",
        body: form,
      });
      setDialogOpen(false);
      setForm({});
      toast({ title: "Store Created", description: `Successfully created store "${form.storeName}"`, variant: "success" });
      load();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
      toast({ title: "Create failed", description: e?.message || "Create failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // Overview stats
  const activeStores = stores.filter((s) => s.status === "ACTIVE").length;
  const dispensing = stores.filter((s) => s.canDispense).length;
  const stores24x7 = stores.filter((s) => s.is24x7).length;

  return (
    <AppShell title="Infrastructure - Pharmacy Stores">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Building2 className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Pharmacy Stores</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage pharmacy store locations, types, licensing, and operational status.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void load(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button variant="primary" className="px-5 gap-2" onClick={openCreate}>
                <IconPlus className="h-4 w-4" />
                Add Store
              </Button>
            ) : null}
          </div>
        </div>

        {/* AI Insights */}
        <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search stores and view operational details. Add new stores to expand pharmacy infrastructure.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Stores</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{total}</div>
                <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  Active: <span className="font-semibold tabular-nums">{activeStores}</span>
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Dispensing Stores</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{dispensing}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">24x7 Operations</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{stores24x7}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  placeholder="Search by code, name, type..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{stores.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{total}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Store Registry</CardTitle>
            <CardDescription className="text-sm">All pharmacy stores configured for this branch</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Store</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Parent</th>
                  <th className="px-4 py-3 text-left font-semibold">Pharmacist</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!stores.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading stores..." : "No stores found. Create your first pharmacy store."}
                    </td>
                  </tr>
                ) : null}

                {stores.map((s) => (
                  <tr key={s.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {s.storeCode}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{s.storeName}</div>
                      <div className="mt-1 flex items-center gap-2">
                        {s.is24x7 ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                            24x7
                          </span>
                        ) : null}
                        {s.canDispense ? (
                          <span className="inline-flex items-center rounded-full border border-sky-200/70 bg-sky-50/70 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200">
                            Dispense
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", "border-zc-border bg-zc-panel/30 text-zc-muted")}>
                        {TYPE_LABELS[s.storeType] ?? s.storeType}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {s.status === "ACTIVE" ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                          ACTIVE
                        </span>
                      ) : s.status === "UNDER_SETUP" ? (
                        <span className="inline-flex items-center rounded-full border border-sky-200/70 bg-sky-50/70 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200">
                          UNDER SETUP
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                          INACTIVE
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {s.parentStore ? `${s.parentStore.storeCode} — ${s.parentStore.storeName}` : "—"}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {s.pharmacistInCharge?.name ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="success" size="icon">
                          <Link href={`/infrastructure/pharmacy/stores/${s.id}` as any} title="View details" aria-label="View details">
                            <IconChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
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
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Guidance */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Store setup guide</div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Create stores (Main, IP, OP, OT, etc.), then 2) Assign pharmacists and licenses, then 3) Configure indent mappings between stores.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Store Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setErr(null);
            setDialogOpen(false);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Create Pharmacy Store
            </DialogTitle>
            <DialogDescription>
              Configure the store location, type, licensing and operational capabilities.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {err ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <div className="min-w-0">{err}</div>
            </div>
          ) : null}

          <div className="grid gap-6">
            {/* Basics */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Basics</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Store Code *</Label>
                  <AIFieldWrapper warnings={storeCodeCopilot.warnings} suggestion={storeCodeCopilot.suggestion} validating={storeCodeCopilot.validating}>
                    <Input
                      value={form.storeCode ?? ""}
                      onChange={(e) => setForm({ ...form, storeCode: e.target.value })}
                      placeholder="e.g., PH-MAIN-01"
                      className="font-mono"
                    />
                  </AIFieldWrapper>
                </div>

                <div className="grid gap-2">
                  <Label>Store Type *</Label>
                  <Select
                    value={form.storeType ?? ""}
                    onValueChange={(v) => setForm({ ...form, storeType: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {STORE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Store Name *</Label>
                <AIFieldWrapper warnings={storeNameCopilot.warnings} suggestion={storeNameCopilot.suggestion} validating={storeNameCopilot.validating}>
                  <Input
                    value={form.storeName ?? ""}
                    onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                    placeholder="e.g., Main Pharmacy Store"
                  />
                </AIFieldWrapper>
              </div>

              {form.storeType !== "MAIN" && (
                <div className="grid gap-2">
                  <Label>Parent Store</Label>
                  <Select
                    value={form.parentStoreId ?? ""}
                    onValueChange={(v) => setForm({ ...form, parentStoreId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select parent store" /></SelectTrigger>
                    <SelectContent>
                      {allStores
                        .filter((s) => s.storeType === "MAIN" || s.id !== form.parentStoreId)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.storeCode} — {s.storeName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* Licensing */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Licensing</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Drug License Number</Label>
                  <Input
                    value={form.drugLicenseNumber ?? ""}
                    onChange={(e) => setForm({ ...form, drugLicenseNumber: e.target.value })}
                    placeholder="License number"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Drug License Expiry</Label>
                  <Input
                    type="date"
                    value={form.drugLicenseExpiry ?? ""}
                    onChange={(e) => setForm({ ...form, drugLicenseExpiry: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Capabilities */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Capabilities</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zc-text">24x7 Operation</div>
                    <div className="text-xs text-zc-muted">Store operates round the clock.</div>
                  </div>
                  <Switch checked={form.is24x7 ?? false} onCheckedChange={(v) => setForm({ ...form, is24x7: v })} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zc-text">Can Dispense</div>
                    <div className="text-xs text-zc-muted">Dispense drugs to patients.</div>
                  </div>
                  <Switch checked={form.canDispense ?? false} onCheckedChange={(v) => setForm({ ...form, canDispense: v })} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zc-text">Can Indent</div>
                    <div className="text-xs text-zc-muted">Raise indent requests to parent.</div>
                  </div>
                  <Switch checked={form.canIndent ?? true} onCheckedChange={(v) => setForm({ ...form, canIndent: v })} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zc-text">Can Receive Stock</div>
                    <div className="text-xs text-zc-muted">Receive GRN from suppliers.</div>
                  </div>
                  <Switch checked={form.canReceiveStock ?? false} onCheckedChange={(v) => setForm({ ...form, canReceiveStock: v })} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zc-text">Can Return to Vendor</div>
                    <div className="text-xs text-zc-muted">Process vendor returns.</div>
                  </div>
                  <Switch checked={form.canReturnVendor ?? false} onCheckedChange={(v) => setForm({ ...form, canReturnVendor: v })} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zc-text">Auto-Indent</div>
                    <div className="text-xs text-zc-muted">Auto-raise indents on low stock.</div>
                  </div>
                  <Switch checked={form.autoIndentEnabled ?? false} onCheckedChange={(v) => setForm({ ...form, autoIndentEnabled: v })} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleCreate()}
                disabled={saving || !canCreate}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create Store
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
