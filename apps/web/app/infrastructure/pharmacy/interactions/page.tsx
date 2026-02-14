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

import { IconPlus, IconSearch } from "@/components/icons";
import { AlertTriangle, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* -------------------------------- Types -------------------------------- */

type InteractionRow = {
  id: string;
  drugA: { id: string; drugCode: string; genericName: string; brandName: string | null };
  drugB: { id: string; drugCode: string; genericName: string; brandName: string | null };
  severity: "MAJOR" | "MODERATE" | "MINOR";
  source: "STANDARD" | "CUSTOM";
  description: string | null;
  recommendation: string | null;
  createdAt: string;
};

/* ------------------------------- Helpers ------------------------------- */

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

function severityPill(severity: InteractionRow["severity"]) {
  switch (severity) {
    case "MAJOR":
      return (
        <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          MAJOR
        </span>
      );
    case "MODERATE":
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          MODERATE
        </span>
      );
    case "MINOR":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
          MINOR
        </span>
      );
    default:
      return <span className="text-xs text-zc-muted">{severity}</span>;
  }
}

function sourcePill(source: InteractionRow["source"]) {
  if (source === "CUSTOM") {
    return (
      <span className="inline-flex items-center rounded-full border border-violet-200/70 bg-violet-50/70 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200">
        CUSTOM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-50/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-200">
      STANDARD
    </span>
  );
}

function truncate(text: string | null, max = 60) {
  if (!text) return "\u2014";
  return text.length > max ? text.slice(0, max) + "\u2026" : text;
}

/* -------------------------------- Page --------------------------------- */

export default function InteractionsPage() {
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "INFRA_PHARMACY_DRUG_READ");
  const canUpdate = hasPerm(user, "INFRA_PHARMACY_DRUG_UPDATE");

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "pharmacy-interactions",
    enabled: !!branchId,
  });

  const [rows, setRows] = React.useState<InteractionRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 50;

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<any>({});
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Delete state
  const [deleting, setDeleting] = React.useState<string | null>(null);

  /* ----------------------------- Data load ------------------------------ */

  const load = React.useCallback(async (showToast = false) => {
    if (!branchId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (severityFilter) params.set("severity", severityFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const data: any = await apiFetch(`/infrastructure/pharmacy/interactions?${params}`);
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);

      if (showToast) {
        toast({ title: "Interactions refreshed", description: `Loaded ${data.total ?? 0} interactions.` });
      }
    } catch (e: any) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [branchId, q, severityFilter, sourceFilter, page]);

  React.useEffect(() => { load(); }, [load]);

  /* ----------------------------- Create -------------------------------- */

  const openCreate = () => {
    setEditingId(null);
    setForm({});
    setErr(null);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    setErr(null);
    if (!form.drugAId?.trim()) return setErr("Drug A ID is required");
    if (!form.drugBId?.trim()) return setErr("Drug B ID is required");
    if (!form.severity) return setErr("Severity is required");

    setSaving(true);
    try {
      await apiFetch(`/infrastructure/pharmacy/interactions`, {
        method: "POST",
        body: {
          drugAId: form.drugAId,
          drugBId: form.drugBId,
          severity: form.severity,
          description: form.description || null,
          recommendation: form.recommendation || null,
          source: form.source || "CUSTOM",
        },
      });
      setDialogOpen(false);
      setForm({});
      toast({ title: "Interaction Created", description: "Drug interaction rule has been created successfully.", variant: "success" });
      load();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
      toast({ title: "Create failed", description: e?.message || "Create failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------- Edit ---------------------------------- */

  const openEdit = (row: InteractionRow) => {
    setEditingId(row.id);
    setForm({
      drugAId: row.drugA.id,
      drugBId: row.drugB.id,
      severity: row.severity,
      source: row.source,
      description: row.description ?? "",
      recommendation: row.recommendation ?? "",
    });
    setErr(null);
    setDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setErr(null);
    if (!form.severity) return setErr("Severity is required");

    setSaving(true);
    try {
      await apiFetch(`/infrastructure/pharmacy/interactions/${editingId}`, {
        method: "PATCH",
        body: {
          severity: form.severity,
          description: form.description || null,
          recommendation: form.recommendation || null,
        },
      });
      setDialogOpen(false);
      setEditingId(null);
      setForm({});
      toast({ title: "Interaction Updated", description: "Drug interaction rule has been updated successfully.", variant: "success" });
      load();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
      toast({ title: "Update failed", description: e?.message || "Update failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------- Delete -------------------------------- */

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this interaction rule?")) return;
    setDeleting(id);
    try {
      await apiFetch(`/infrastructure/pharmacy/interactions/${id}`, { method: "DELETE" });
      toast({ title: "Interaction Deleted", description: "Drug interaction rule has been removed.", variant: "success" });
      load();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  /* ----------------------------- Derived ------------------------------- */

  const totalPages = Math.ceil(total / pageSize);
  const majorCount = rows.filter((r) => r.severity === "MAJOR").length;
  const customCount = rows.filter((r) => r.source === "CUSTOM").length;

  /* ----------------------------- Render -------------------------------- */

  return (
    <AppShell title="Infrastructure - Drug Interactions">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <AlertTriangle className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Drug Interactions</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage drug-drug interaction alerts and safety checks.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void load(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canUpdate ? (
              <Button variant="primary" className="px-5 gap-2" onClick={openCreate}>
                <IconPlus className="h-4 w-4" />
                Add Interaction
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
              Search drug interactions and manage safety rules. Add custom interaction alerts to enhance prescribing safety.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Interactions</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{total}</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Major Interactions</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{majorCount}</div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Custom Rules</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{customCount}</div>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  placeholder="Search by drug code, name..."
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-3">
                <Select value={severityFilter || "ALL"} onValueChange={(v) => { setSeverityFilter(v === "ALL" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Severities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Severities</SelectItem>
                    <SelectItem value="MAJOR">Major</SelectItem>
                    <SelectItem value="MODERATE">Moderate</SelectItem>
                    <SelectItem value="MINOR">Minor</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter || "ALL"} onValueChange={(v) => { setSourceFilter(v === "ALL" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Sources" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sources</SelectItem>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span> of{" "}
                  <span className="font-semibold tabular-nums text-zc-text">{total}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Interaction Registry</CardTitle>
            <CardDescription className="text-sm">All registered drug-drug interactions for this branch</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Drug A</th>
                  <th className="px-4 py-3 text-left font-semibold">Drug B</th>
                  <th className="px-4 py-3 text-left font-semibold">Severity</th>
                  <th className="px-4 py-3 text-left font-semibold">Source</th>
                  <th className="px-4 py-3 text-left font-semibold">Description</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!rows.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading interactions..." : "No interactions found. Create your first interaction rule."}
                    </td>
                  </tr>
                ) : null}

                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {r.drugA.drugCode}
                      </span>
                      <div className="mt-1 text-sm font-semibold text-zc-text">{r.drugA.genericName}</div>
                      {r.drugA.brandName ? (
                        <div className="mt-0.5 text-xs text-zc-muted">{r.drugA.brandName}</div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                        {r.drugB.drugCode}
                      </span>
                      <div className="mt-1 text-sm font-semibold text-zc-text">{r.drugB.genericName}</div>
                      {r.drugB.brandName ? (
                        <div className="mt-0.5 text-xs text-zc-muted">{r.drugB.brandName}</div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">{severityPill(r.severity)}</td>

                    <td className="px-4 py-3">{sourcePill(r.source)}</td>

                    <td className="px-4 py-3 text-zc-muted max-w-[200px]">
                      <span title={r.description ?? undefined}>{truncate(r.description)}</span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate ? (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEdit(r)}
                              title="Edit interaction"
                              aria-label="Edit interaction"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDelete(r.id)}
                              disabled={deleting === r.id}
                              title="Delete interaction"
                              aria-label="Delete interaction"
                            >
                              {deleting === r.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
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
              <div className="text-sm font-semibold text-zc-text">Drug interaction guide</div>
              <div className="mt-1 text-sm text-zc-muted">
                Define drug-drug interactions to enable safety alerts during prescribing and dispensing. Major interactions will trigger hard stops.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setErr(null);
            setEditingId(null);
            setDialogOpen(false);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <AlertTriangle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {editingId ? "Edit Interaction" : "Add Interaction"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update severity, description, or recommendation for this interaction rule."
                : "Define a new drug-drug interaction rule with severity and clinical guidance."}
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {err ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <div className="min-w-0">{err}</div>
            </div>
          ) : null}

          <div className="grid gap-6">
            {/* Drug Pair */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Drug Pair</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Drug A ID *</Label>
                  <Input
                    value={form.drugAId ?? ""}
                    onChange={(e) => setForm({ ...form, drugAId: e.target.value })}
                    placeholder="Enter Drug A identifier"
                    disabled={!!editingId}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Drug B ID *</Label>
                  <Input
                    value={form.drugBId ?? ""}
                    onChange={(e) => setForm({ ...form, drugBId: e.target.value })}
                    placeholder="Enter Drug B identifier"
                    disabled={!!editingId}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Classification */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Classification</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Severity *</Label>
                  <Select value={form.severity ?? ""} onValueChange={(v) => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAJOR">Major</SelectItem>
                      <SelectItem value="MODERATE">Moderate</SelectItem>
                      <SelectItem value="MINOR">Minor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Source</Label>
                  <Select value={form.source ?? "CUSTOM"} onValueChange={(v) => setForm({ ...form, source: v })} disabled={!!editingId}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Clinical Details */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Clinical Details</div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the nature of this drug interaction..."
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label>Recommendation</Label>
                <Textarea
                  value={form.recommendation ?? ""}
                  onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
                  placeholder="Clinical recommendation for handling this interaction..."
                  rows={3}
                />
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
                onClick={() => void (editingId ? handleEdit() : handleCreate())}
                disabled={saving || !canUpdate}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingId ? "Update Interaction" : "Create Interaction"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
