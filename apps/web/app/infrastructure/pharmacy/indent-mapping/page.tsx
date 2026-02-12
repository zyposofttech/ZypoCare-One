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
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { IconPlus } from "@/components/icons";
import {
  AlertTriangle,
  ClipboardList,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StoreOption = {
  id: string;
  storeCode: string;
  storeName: string;
  storeType: string;
};

type MappingRow = {
  id: string;
  requestingStoreId: string;
  supplyingStoreId: string;
  approvalRole: string | null;
  slaDurationMinutes: number | null;
  isEmergencyOverride: boolean;
  requestingStore?: {
    storeCode: string;
    storeName: string;
    storeType: string;
  };
  supplyingStore?: {
    storeCode: string;
    storeName: string;
    storeType: string;
  };
};

type MappingForm = {
  requestingStoreId: string;
  supplyingStoreId: string;
  approvalRole: string;
  slaDurationMinutes: string;
  isEmergencyOverride: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
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

function formatSla(mins: number | null) {
  if (!mins) return "\u2014";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const EMPTY_FORM: MappingForm = {
  requestingStoreId: "",
  supplyingStoreId: "",
  approvalRole: "",
  slaDurationMinutes: "",
  isEmergencyOverride: false,
};

/* ------------------------------------------------------------------ */
/*  Create Dialog                                                      */
/* ------------------------------------------------------------------ */

function CreateMappingDialog({
  open,
  stores,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
}: {
  open: boolean;
  stores: StoreOption[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<MappingForm>({ ...EMPTY_FORM });

  React.useEffect(() => {
    if (open) {
      setErr(null);
      setBusy(false);
      setForm({ ...EMPTY_FORM });
    }
  }, [open]);

  function set<K extends keyof MappingForm>(key: K, value: MappingForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);

    if (!form.requestingStoreId) return setErr("Requesting store is required");
    if (!form.supplyingStoreId) return setErr("Supplying store is required");
    if (form.requestingStoreId === form.supplyingStoreId)
      return setErr("Requesting and supplying stores must be different");

    const sla = form.slaDurationMinutes.trim()
      ? Number(form.slaDurationMinutes)
      : null;
    if (sla !== null && (!Number.isFinite(sla) || sla < 0))
      return setErr("SLA must be a non-negative number");

    setBusy(true);
    try {
      await apiFetch("/infrastructure/pharmacy/indent-mappings", {
        method: "POST",
        body: JSON.stringify({
          requestingStoreId: form.requestingStoreId,
          supplyingStoreId: form.supplyingStoreId,
          approvalRole: form.approvalRole.trim() || null,
          slaDurationMinutes: sla,
          isEmergencyOverride: form.isEmergencyOverride,
        }),
      });

      await onSaved();

      toast({
        title: "Mapping Created",
        description: "Indent mapping created successfully.",
        variant: "success",
      });

      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      toast({
        variant: "destructive",
        title: "Save failed",
        description: e?.message || "Save failed",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const supplyingOptions = stores.filter(
    (s) => s.id !== form.requestingStoreId,
  );

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
      <DialogContent
        className={drawerClassName()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Add Indent Mapping
          </DialogTitle>
          <DialogDescription>
            Define a store-to-store indent flow rule with optional approval
            roles, SLA and emergency override settings.
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
          {/* Store Selection */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">
              Store Selection
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Requesting Store *</Label>
                <Select
                  value={form.requestingStoreId}
                  onValueChange={(v) => set("requestingStoreId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select requesting store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.storeCode} — {s.storeName} ({s.storeType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Supplying Store *</Label>
                <Select
                  value={form.supplyingStoreId}
                  onValueChange={(v) => set("supplyingStoreId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplying store" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplyingOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.storeCode} — {s.storeName} ({s.storeType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Rules */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Rules</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Approval Role</Label>
                <Input
                  value={form.approvalRole}
                  onChange={(e) => set("approvalRole", e.target.value)}
                  placeholder="e.g. Pharmacist, Sr. Pharmacist"
                />
                <p className="text-[11px] text-zc-muted">
                  Role required to approve indent requests on this route.
                </p>
              </div>

              <div className="grid gap-2">
                <Label>SLA Duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.slaDurationMinutes}
                  onChange={(e) => set("slaDurationMinutes", e.target.value)}
                  placeholder="e.g. 60 for 1 hour"
                  inputMode="numeric"
                />
                <p className="text-[11px] text-zc-muted">
                  Maximum time allowed to fulfil the indent request.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Settings</div>

            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zc-text">
                  Emergency Override
                </div>
                <div className="text-xs text-zc-muted">
                  Bypass approval workflow for critical/emergency drug requests.
                </div>
              </div>
              <Switch
                checked={form.isEmergencyOverride}
                onCheckedChange={(v) => set("isEmergencyOverride", v)}
              />
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
              Create Mapping
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function IndentMappingPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "INFRA_PHARMACY_STORE_READ");
  const canUpdate = hasPerm(user, "INFRA_PHARMACY_STORE_UPDATE");

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<MappingRow[]>([]);
  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);

  // AI page-level insights
  const {
    insights,
    loading: insightsLoading,
    dismiss: dismissInsight,
  } = usePageInsights({ module: "pharmacy-indent-mapping" });

  /* ---- data loading ---- */

  async function refresh(showToast = false) {
    setErr(null);
    setLoading(true);
    try {
      const [mappingData, storeData] = await Promise.all([
        apiFetch<MappingRow[] | { rows: MappingRow[] }>(
          "/infrastructure/pharmacy/indent-mappings",
        ),
        apiFetch<{ rows: StoreOption[] }>(
          "/infrastructure/pharmacy/stores?pageSize=200",
        ),
      ]);

      const list = Array.isArray(mappingData)
        ? mappingData
        : (mappingData.rows ?? []);
      setRows(list);
      setStores(storeData.rows ?? []);

      if (showToast) {
        toast({
          title: "Mappings refreshed",
          description: `Loaded ${list.length} indent mappings.`,
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load indent mappings";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- delete ---- */

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/infrastructure/pharmacy/indent-mappings/${id}`, {
        method: "DELETE",
      });
      toast({
        title: "Mapping Removed",
        description: "Indent mapping deleted successfully.",
        variant: "success",
      });
      await refresh(false);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: e?.message || "Delete failed",
      });
    }
  }

  /* ---- computed stats ---- */

  const totalMappings = rows.length;
  const emergencyOverrides = rows.filter((r) => r.isEmergencyOverride).length;
  const withSla = rows.filter((r) => r.slaDurationMinutes !== null).length;

  return (
    <AppShell title="Infrastructure - Indent Mapping">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ClipboardList className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                Store-to-Store Indent Mapping
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Configure which stores can raise indents to which parent stores,
                with approval rules and SLAs.
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
              <RefreshCw
                className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Refresh
            </Button>

            {canUpdate ? (
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={() => setCreateOpen(true)}
              >
                <IconPlus className="h-4 w-4" />
                Add Mapping
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

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Summary of indent flow rules configured between pharmacy stores.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Total Mappings
                </div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                  {totalMappings}
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                  Emergency Overrides
                </div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">
                  {emergencyOverrides}
                </div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
                  With SLA
                </div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
                  {withSla}
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
              Indent Flow Rules ({totalMappings})
            </CardTitle>
            <CardDescription className="text-sm">
              Each mapping defines how drugs flow between stores within the
              hospital.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Requesting Store
                  </th>
                  <th className="w-8 px-4 py-3 text-center font-semibold">
                    &rarr;
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Supplying Store
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Approval Role
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">SLA</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Emergency Override
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {!rows.length ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-zc-muted"
                    >
                      {loading
                        ? "Loading indent mappings..."
                        : "No indent mappings configured. Add store-to-store flow rules."}
                    </td>
                  </tr>
                ) : null}

                {rows.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t border-zc-border hover:bg-zc-panel/20"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">
                        {m.requestingStore?.storeName ?? m.requestingStoreId}
                      </div>
                      <div className="mt-0.5 text-xs font-mono text-zc-muted">
                        {m.requestingStore?.storeCode} (
                        {m.requestingStore?.storeType})
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center text-zc-muted">
                      &rarr;
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">
                        {m.supplyingStore?.storeName ?? m.supplyingStoreId}
                      </div>
                      <div className="mt-0.5 text-xs font-mono text-zc-muted">
                        {m.supplyingStore?.storeCode} (
                        {m.supplyingStore?.storeType})
                      </div>
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {m.approvalRole || "\u2014"}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {formatSla(m.slaDurationMinutes)}
                    </td>

                    <td className="px-4 py-3">
                      {m.isEmergencyOverride ? (
                        <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                          No
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate ? (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(m.id)}
                            title="Remove mapping"
                            aria-label="Remove mapping"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Bottom guidance callout */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">
                Indent mapping guidance
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Create pharmacy stores first (Main Store, Sub-stores,
                Satellite), then 2) Map requesting stores to their supplying
                stores with approval rules and SLAs, then 3) Enable emergency
                override for critical drug routes.
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateMappingDialog
        open={createOpen}
        stores={stores}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canUpdate}
        deniedMessage="Missing permission: INFRA_PHARMACY_STORE_UPDATE"
      />
    </AppShell>
  );
}
