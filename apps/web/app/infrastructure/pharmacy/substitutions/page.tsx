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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { IconPlus, IconSearch } from "@/components/icons";
import { Loader2, RefreshCw, Repeat2, Trash2 } from "lucide-react";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SubstitutionRow = {
  id: string;
  sourceDrug: {
    id: string;
    drugCode: string;
    genericName: string;
    brandName: string | null;
  };
  targetDrug: {
    id: string;
    drugCode: string;
    genericName: string;
    brandName: string | null;
  };
  notes: string | null;
  isActive: boolean;
  createdAt: string;
};

type CreateForm = {
  sourceDrugId: string;
  targetDrugId: string;
  notes: string;
  isActive: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const EMPTY_FORM: CreateForm = {
  sourceDrugId: "",
  targetDrugId: "",
  notes: "",
  isActive: true,
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SubstitutionsPage() {
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "INFRA_PHARMACY_FORMULARY_READ");
  const canUpdate = hasPerm(user, "INFRA_PHARMACY_FORMULARY_UPDATE");

  const {
    insights,
    loading: insightsLoading,
    dismiss: dismissInsight,
  } = usePageInsights({
    module: "pharmacy-substitutions",
    enabled: !!branchId,
  });

  /* ---- data state ---- */
  const [rows, setRows] = React.useState<SubstitutionRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const pageSize = 50;

  /* ---- dialog state ---- */
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [dialogErr, setDialogErr] = React.useState<string | null>(null);

  /* ---- load data ---- */
  const load = React.useCallback(
    async (showToast = false) => {
      if (!branchId) return;
      setErr(null);
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));

        const data = await apiFetch(
          `/infrastructure/pharmacy/substitutions?${params}`,
        );
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);

        if (showToast) {
          toast({
            title: "Substitutions refreshed",
            description: `Loaded ${data.total ?? 0} rules.`,
          });
        }
      } catch (e: any) {
        const msg = e?.message || "Failed to load substitutions";
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
    [branchId, q, page],
  );

  React.useEffect(() => {
    load();
  }, [load]);

  /* ---- filtered rows (client-side status filter) ---- */
  const filtered = React.useMemo(() => {
    if (!statusFilter) return rows;
    if (statusFilter === "ACTIVE") return rows.filter((r) => r.isActive);
    if (statusFilter === "INACTIVE") return rows.filter((r) => !r.isActive);
    return rows;
  }, [rows, statusFilter]);

  /* ---- computed stats ---- */
  const activeCount = rows.filter((r) => r.isActive).length;
  const inactiveCount = rows.filter((r) => !r.isActive).length;
  const totalPages = Math.ceil(total / pageSize);

  /* ---- create ---- */
  function openCreate() {
    setForm(EMPTY_FORM);
    setDialogErr(null);
    setDialogOpen(true);
  }

  async function handleCreate() {
    setDialogErr(null);

    if (!form.sourceDrugId.trim())
      return setDialogErr("Source Drug ID is required");
    if (!form.targetDrugId.trim())
      return setDialogErr("Target Drug ID is required");
    if (form.sourceDrugId.trim() === form.targetDrugId.trim())
      return setDialogErr("Source and target drug cannot be the same");

    setSaving(true);
    try {
      await apiFetch(`/infrastructure/pharmacy/substitutions`, {
        method: "POST",
        body: JSON.stringify({
          sourceDrugId: form.sourceDrugId.trim(),
          targetDrugId: form.targetDrugId.trim(),
          notes: form.notes.trim() || null,
          isActive: form.isActive,
        }),
      });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      toast({
        title: "Substitution Created",
        description: "Therapeutic substitution rule added successfully.",
        variant: "success",
      });
      load();
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

  /* ---- toggle active ---- */
  async function handleToggleActive(row: SubstitutionRow) {
    try {
      await apiFetch(`/infrastructure/pharmacy/substitutions/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      toast({
        title: row.isActive ? "Rule Deactivated" : "Rule Activated",
        description: `Substitution rule ${row.isActive ? "deactivated" : "activated"} successfully.`,
        variant: "success",
      });
      load();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: e?.message || "Toggle failed",
      });
    }
  }

  /* ---- delete ---- */
  async function handleDelete(row: SubstitutionRow) {
    if (
      !window.confirm(
        `Delete substitution rule: ${row.sourceDrug.drugCode} → ${row.targetDrug.drugCode}?`,
      )
    )
      return;
    try {
      await apiFetch(`/infrastructure/pharmacy/substitutions/${row.id}`, {
        method: "DELETE",
      });
      toast({
        title: "Substitution Deleted",
        description: "Therapeutic substitution rule removed.",
        variant: "success",
      });
      load();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: e?.message || "Delete failed",
      });
    }
  }

  function set<K extends keyof CreateForm>(key: K, value: CreateForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <AppShell title="Infrastructure - Therapeutic Substitutions">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Repeat2 className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                Therapeutic Substitutions
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Define drug equivalents for out-of-stock or formulary
                substitution.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => void load(true)}
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
                Add Substitution
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
              Search and manage therapeutic substitution rules. Active rules
              appear during dispensing when a prescribed drug is unavailable.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Total Rules
                </div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                  {total}
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                  Active Rules
                </div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">
                  {activeCount}
                </div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
                  Inactive Rules
                </div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
                  {inactiveCount}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search by drug code, generic name..."
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={statusFilter || "ALL"}
                  onValueChange={(v) => {
                    setStatusFilter(v === "ALL" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-xs text-zc-muted">
                  Showing{" "}
                  <span className="font-semibold tabular-nums text-zc-text">
                    {filtered.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold tabular-nums text-zc-text">
                    {total}
                  </span>
                </div>
              </div>
            </div>

            {err ? (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Substitution Rules ({total} rules)
            </CardTitle>
            <CardDescription className="text-sm">
              Therapeutic equivalents for drug substitution during dispensing.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Source Drug
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Target Drug
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Notes</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-zc-muted"
                    >
                      {loading
                        ? "Loading substitution rules..."
                        : "No substitution rules found. Create your first rule."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-zc-border hover:bg-zc-panel/20"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-zc-text">
                        {r.sourceDrug.drugCode}
                      </div>
                      <div className="mt-0.5 text-xs text-zc-muted">
                        {r.sourceDrug.genericName}
                        {r.sourceDrug.brandName
                          ? ` (${r.sourceDrug.brandName})`
                          : ""}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-zc-text">
                        {r.targetDrug.drugCode}
                      </div>
                      <div className="mt-0.5 text-xs text-zc-muted">
                        {r.targetDrug.genericName}
                        {r.targetDrug.brandName
                          ? ` (${r.targetDrug.brandName})`
                          : ""}
                      </div>
                    </td>

                    <td className="px-4 py-3 max-w-[200px] truncate text-zc-muted">
                      {r.notes || "\u2014"}
                    </td>

                    <td className="px-4 py-3">
                      {r.isActive ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                          INACTIVE
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-zc-muted whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleToggleActive(r)}
                              title={
                                r.isActive
                                  ? "Deactivate rule"
                                  : "Activate rule"
                              }
                            >
                              {r.isActive ? "Deactivate" : "Activate"}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleDelete(r)}
                              title="Delete substitution rule"
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : null}
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

        {/* Guidance */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">
                Substitution guide
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Define therapeutic equivalents so pharmacists can suggest
                alternatives when a prescribed drug is unavailable. Active rules
                appear during dispensing.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Create Substitution Dialog                                    */}
      {/* ============================================================ */}
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
          className={drawerClassName("max-w-xl")}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Repeat2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Add Substitution Rule
            </DialogTitle>
            <DialogDescription>
              Define a therapeutic equivalent pair. When the source drug is
              unavailable, the target drug will be suggested as a substitute
              during dispensing.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {dialogErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <div className="min-w-0">{dialogErr}</div>
            </div>
          ) : null}

          <div className="grid gap-6">
            {/* Drug Pair */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">
                Drug Pair
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Source Drug ID *</Label>
                  <Input
                    value={form.sourceDrugId}
                    onChange={(e) => set("sourceDrugId", e.target.value)}
                    placeholder="Drug ID (prescribed)"
                    className="font-mono"
                  />
                  <p className="text-[11px] text-zc-muted">
                    The originally prescribed drug.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>Target Drug ID *</Label>
                  <Input
                    value={form.targetDrugId}
                    onChange={(e) => set("targetDrugId", e.target.value)}
                    placeholder="Drug ID (substitute)"
                    className="font-mono"
                  />
                  <p className="text-[11px] text-zc-muted">
                    The therapeutic equivalent to substitute.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Details */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Details</div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Optional clinical notes or justification for this substitution"
                  className="min-h-[84px]"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => set("isActive", checked)}
                />
                <Label className="cursor-pointer">
                  Active
                  <span className="ml-1.5 text-xs font-normal text-zc-muted">
                    — rule is available during dispensing
                  </span>
                </Label>
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
                title={
                  !canUpdate
                    ? "Missing permission: INFRA_PHARMACY_FORMULARY_UPDATE"
                    : undefined
                }
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Create Rule
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
