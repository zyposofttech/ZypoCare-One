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
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { IconSearch, IconPlus } from "@/components/icons";
import { AlertTriangle, FileText, Loader2, RefreshCw } from "lucide-react";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FormularyRow = {
  id: string;
  version: number;
  status: string;
  effectiveDate: string | null;
  publishedAt: string | null;
  notes: string | null;
  _count?: { items: number };
};

type DrugRow = {
  id: string;
  drugCode: string;
  genericName: string;
  brandName: string | null;
  category: string;
  formularyStatus: string;
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FormularyPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "INFRA_PHARMACY_FORMULARY_READ");
  const canCreate = hasPerm(user, "INFRA_PHARMACY_FORMULARY_CREATE");
  const canPublish = hasPerm(user, "INFRA_PHARMACY_FORMULARY_PUBLISH");

  // AI page-level insights
  const {
    insights,
    loading: insightsLoading,
    dismiss: dismissInsight,
  } = usePageInsights({ module: "pharmacy-formulary" });

  /* --- data state --- */
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<FormularyRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  /* --- dialog state --- */
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createBusy, setCreateBusy] = React.useState(false);
  const [createErr, setCreateErr] = React.useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [manageOpen, setManageOpen] = React.useState(false);
  const [manageBusy, setManageBusy] = React.useState(false);
  const [manageErr, setManageErr] = React.useState<string | null>(null);
  const [selectedFormulary, setSelectedFormulary] = React.useState<FormularyRow | null>(null);
  const [drugs, setDrugs] = React.useState<DrugRow[]>([]);
  const [drugSearch, setDrugSearch] = React.useState("");
  const [bulkTier, setBulkTier] = React.useState("APPROVED");

  /* --- filtered rows --- */
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = `v${r.version} ${r.status} ${r.notes ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  /* --- overview stats --- */
  const totalVersions = rows.length;
  const publishedCount = rows.filter((r) => r.status === "PUBLISHED").length;
  const draftCount = rows.filter((r) => r.status === "DRAFT").length;

  /* --- data fetching --- */
  async function refresh(showToast = false) {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<FormularyRow[] | { rows: FormularyRow[] }>(
        "/infrastructure/pharmacy/formulary",
      );
      const list = Array.isArray(data) ? data : (data as any).rows ?? [];
      const sorted = [...list].sort((a, b) => b.version - a.version);
      setRows(sorted);

      if (showToast) {
        toast({
          title: "Formulary refreshed",
          description: `Loaded ${sorted.length} versions.`,
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load formulary versions";
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

  /* --- create handler --- */
  async function handleCreate() {
    setCreateErr(null);
    setCreateBusy(true);
    try {
      await apiFetch("/infrastructure/pharmacy/formulary", {
        method: "POST",
        body: {
          effectiveDate: effectiveDate || undefined,
          notes: notes || undefined,
        },
      });
      toast({
        title: "Formulary Created",
        description: "New formulary draft created successfully.",
        variant: "success",
      });
      setCreateOpen(false);
      setEffectiveDate("");
      setNotes("");
      await refresh(false);
    } catch (e: any) {
      setCreateErr(e?.message || "Create failed");
    } finally {
      setCreateBusy(false);
    }
  }

  /* --- publish handler --- */
  async function handlePublish(id: string) {
    try {
      await apiFetch(`/infrastructure/pharmacy/formulary/${id}/publish`, {
        method: "POST",
      });
      toast({
        title: "Formulary Published",
        description: "Formulary version published successfully.",
        variant: "success",
      });
      await refresh(false);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Publish failed",
        description: e?.message || "Publish failed",
      });
    }
  }

  /* --- manage items --- */
  async function openManage(f: FormularyRow) {
    setSelectedFormulary(f);
    setDrugSearch("");
    setBulkTier("APPROVED");
    setManageErr(null);
    try {
      const data = await apiFetch<{ rows: DrugRow[] }>(
        "/infrastructure/pharmacy/drugs?pageSize=500",
      );
      setDrugs(data.rows ?? []);
    } catch {
      setDrugs([]);
    }
    setManageOpen(true);
  }

  const filteredDrugs = React.useMemo(() => {
    const s = drugSearch.trim().toLowerCase();
    if (!s) return drugs;
    return drugs.filter(
      (d) =>
        d.genericName.toLowerCase().includes(s) ||
        (d.brandName ?? "").toLowerCase().includes(s) ||
        d.drugCode.toLowerCase().includes(s),
    );
  }, [drugs, drugSearch]);

  async function handleBulkAssign() {
    if (!selectedFormulary) return;
    setManageErr(null);
    setManageBusy(true);
    const items = filteredDrugs.map((d) => ({
      drugMasterId: d.id,
      tier: bulkTier,
    }));
    try {
      await apiFetch(
        `/infrastructure/pharmacy/formulary/${selectedFormulary.id}/items`,
        {
          method: "POST",
          body: { items },
        },
      );
      toast({
        title: "Items Assigned",
        description: `${items.length} items assigned as ${bulkTier}.`,
        variant: "success",
      });
      setManageOpen(false);
      await refresh(false);
    } catch (e: any) {
      setManageErr(e?.message || "Assign failed");
    } finally {
      setManageBusy(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <AppShell title="Infrastructure - Formulary">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <FileText className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                Formulary Management
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage drug formulary versions, tier assignments, and publish
                approved formularies for dispensing.
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

            {canCreate ? (
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={() => {
                  setCreateErr(null);
                  setEffectiveDate("");
                  setNotes("");
                  setCreateOpen(true);
                }}
              >
                <IconPlus className="h-4 w-4" />
                New Formulary Draft
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
              Search formulary versions and manage drug tier assignments. Publish
              a draft to activate it for dispensing.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Total Versions
                </div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                  {totalVersions}
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                  Published
                </div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">
                  {publishedCount}
                </div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
                  Draft
                </div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
                  {draftCount}
                </div>
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
                  placeholder="Search by version, status, notes..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing{" "}
                <span className="font-semibold tabular-nums text-zc-text">
                  {filtered.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold tabular-nums text-zc-text">
                  {rows.length}
                </span>
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
            <CardTitle className="text-base">Formulary Versions</CardTitle>
            <CardDescription className="text-sm">
              Versioned drug formularies. Create a draft, assign items, then
              publish.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Version</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Effective Date
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Published
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Items</th>
                  <th className="px-4 py-3 text-left font-semibold">Notes</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-zc-muted"
                    >
                      {loading
                        ? "Loading formulary versions..."
                        : "No formulary versions found. Create your first draft."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((f) => (
                  <tr
                    key={f.id}
                    className="border-t border-zc-border hover:bg-zc-panel/20"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        v{f.version}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {f.status === "PUBLISHED" ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                          PUBLISHED
                        </span>
                      ) : f.status === "DRAFT" ? (
                        <span className="inline-flex items-center rounded-full border border-sky-200/70 bg-sky-50/70 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200">
                          DRAFT
                        </span>
                      ) : f.status === "ARCHIVED" ? (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                          ARCHIVED
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-zc-border bg-zc-panel/30 px-2 py-0.5 text-[11px] font-semibold text-zc-muted">
                          {f.status}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {f.effectiveDate
                        ? new Date(f.effectiveDate).toLocaleDateString()
                        : "\u2014"}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">
                      {f.publishedAt
                        ? new Date(f.publishedAt).toLocaleString()
                        : "\u2014"}
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">
                        {f._count?.items ?? "\u2014"}
                      </span>
                    </td>

                    <td className="px-4 py-3 max-w-[200px] truncate text-zc-muted">
                      {f.notes || "\u2014"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {f.status === "DRAFT" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void openManage(f)}
                            >
                              Manage Items
                            </Button>

                            {canPublish ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => void handlePublish(f.id)}
                              >
                                Publish
                              </Button>
                            ) : null}
                          </>
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
                Formulary workflow
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Create a new draft version, 2) Assign drugs with tier levels
                (Approved / Restricted / Non-Formulary), 3) Publish when ready.
                Only one published version is active at a time.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Create Formulary Dialog                                      */}
      {/* ============================================================ */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          if (!v) {
            setCreateErr(null);
            setCreateOpen(false);
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
                <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Create Formulary Draft
            </DialogTitle>
            <DialogDescription>
              Create a new formulary draft version. You can assign drug items and
              publish it when ready.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {createErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{createErr}</div>
            </div>
          ) : null}

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
              <p className="text-[11px] text-zc-muted">
                The date from which this formulary version takes effect.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this formulary version"
                className="min-h-[84px]"
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createBusy}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                onClick={() => void handleCreate()}
                disabled={createBusy || !canCreate}
                title={!canCreate ? "Missing permission: INFRA_PHARMACY_FORMULARY_CREATE" : undefined}
                className="gap-2"
              >
                {createBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Create Draft
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/*  Manage Items Dialog                                          */}
      {/* ============================================================ */}
      <Dialog
        open={manageOpen}
        onOpenChange={(v) => {
          if (!v) {
            setManageErr(null);
            setManageOpen(false);
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
                <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Manage Formulary Items &mdash; v{selectedFormulary?.version}
            </DialogTitle>
            <DialogDescription>
              Search drugs and assign tier levels in bulk. Filtered drugs will be
              assigned the selected tier.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {manageErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{manageErr}</div>
            </div>
          ) : null}

          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Search Drugs</Label>
                <div className="relative">
                  <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input
                    value={drugSearch}
                    onChange={(e) => setDrugSearch(e.target.value)}
                    placeholder="Filter by name or code..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Assign Tier</Label>
                <Select value={bulkTier} onValueChange={setBulkTier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="RESTRICTED">Restricted</SelectItem>
                    <SelectItem value="NON_FORMULARY">Non-Formulary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-4">
              <div className="text-sm text-zc-muted">
                <span className="font-semibold tabular-nums text-zc-text">
                  {filteredDrugs.length}
                </span>{" "}
                drugs matching filter will be assigned as{" "}
                <span className="font-semibold text-zc-text">{bulkTier}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setManageOpen(false)}
                disabled={manageBusy}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                onClick={() => void handleBulkAssign()}
                disabled={manageBusy || filteredDrugs.length === 0}
                className="gap-2"
              >
                {manageBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Assign to Formulary
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
