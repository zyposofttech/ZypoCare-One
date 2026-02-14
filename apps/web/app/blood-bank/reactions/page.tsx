"use client";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconPlus, IconChevronRight } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw, Pencil } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const REACTION_TYPES = [
  { value: "FEBRILE", label: "Febrile" },
  { value: "ALLERGIC", label: "Allergic" },
  { value: "HEMOLYTIC_ACUTE", label: "Hemolytic (Acute)" },
  { value: "HEMOLYTIC_DELAYED", label: "Hemolytic (Delayed)" },
  { value: "TRALI", label: "TRALI" },
  { value: "TACO", label: "TACO" },
  { value: "ANAPHYLAXIS", label: "Anaphylaxis" },
  { value: "BACTERIAL", label: "Bacterial" },
  { value: "OTHER", label: "Other" },
] as const;

const SEVERITY_OPTIONS = [
  { value: "MILD", label: "Mild" },
  { value: "MODERATE", label: "Moderate" },
  { value: "SEVERE", label: "Severe" },
  { value: "FATAL", label: "Fatal" },
] as const;

const reactionTypeLabel: Record<string, string> = Object.fromEntries(
  REACTION_TYPES.map((t) => [t.value, t.label]),
);

function severityColor(severity: string) {
  switch (severity) {
    case "MILD":
      return "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200";
    case "MODERATE":
      return "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "SEVERE":
      return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    case "FATAL":
      return "border-red-300/70 bg-red-100/70 text-red-900 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-100";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-muted";
  }
}

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
/*  Report Reaction Dialog                                             */
/* ------------------------------------------------------------------ */

type ReactionForm = {
  issueId: string;
  reactionType: string;
  severity: string;
  management: string;
  investigationResults: string;
  notes: string;
};

function ReportReactionDialog({
  open,
  onClose,
  onSaved,
  canSubmit,
  deniedMessage,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canSubmit: boolean;
  deniedMessage: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<ReactionForm>({
    issueId: "",
    reactionType: "",
    severity: "",
    management: "",
    investigationResults: "",
    notes: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setForm({
      issueId: "",
      reactionType: "",
      severity: "",
      management: "",
      investigationResults: "",
      notes: "",
    });
  }, [open]);

  function set<K extends keyof ReactionForm>(key: K, value: ReactionForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return setErr(deniedMessage);

    if (!form.issueId.trim()) return setErr("Issue ID is required");
    if (!form.reactionType) return setErr("Reaction type is required");
    if (!form.severity) return setErr("Severity is required");
    if (!form.management.trim()) return setErr("Management details are required");

    setBusy(true);
    try {
      await apiFetch(`/api/blood-bank/issue/${form.issueId.trim()}/reaction`, {
        method: "POST",
        body: JSON.stringify({
          reactionType: form.reactionType,
          severity: form.severity,
          management: form.management.trim(),
          investigationResults: form.investigationResults.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });

      await onSaved();

      toast({
        title: "Reaction Reported",
        description: `Successfully reported ${reactionTypeLabel[form.reactionType] ?? form.reactionType} reaction`,
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
          <DialogTitle className="flex items-center gap-3 text-orange-700 dark:text-orange-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            Report Reaction
          </DialogTitle>
          <DialogDescription>
            Report a transfusion adverse reaction. Provide the issue ID, reaction details and management actions taken.
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
          {/* Issue & Type */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Reaction Details</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Issue ID</Label>
                <Input value={form.issueId} onChange={(e) => set("issueId", e.target.value)} placeholder="e.g. ISS-001" />
              </div>

              <div className="grid gap-2">
                <Label>Reaction Type</Label>
                <Select value={form.reactionType} onValueChange={(v) => set("reactionType", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reaction type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REACTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Management & Investigation */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Management & Investigation</div>

            <div className="grid gap-2">
              <Label>Management</Label>
              <Textarea
                value={form.management}
                onChange={(e) => set("management", e.target.value)}
                placeholder="Describe management actions taken..."
                className="min-h-[84px]"
              />
            </div>

            <div className="grid gap-2">
              <Label>Investigation Results (optional)</Label>
              <Input
                value={form.investigationResults}
                onChange={(e) => set("investigationResults", e.target.value)}
                placeholder="Lab findings, imaging results, etc."
              />
            </div>

            <div className="grid gap-2">
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Additional notes or observations"
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
              Report Reaction
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

export default function ReactionsPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();
  const user = useAuthStore((s) => s.user);

  const canRead = hasPerm(user, "BB_TRANSFUSION_READ");
  const canReport = hasPerm(user, "BB_TRANSFUSION_REACTION");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return (rows ?? []).filter((r: any) => {
      const hay = `${r.patientName ?? r.patient ?? ""} ${r.unitNumber ?? ""} ${r.reactionType ?? ""} ${r.severity ?? ""} ${r.reportedBy ?? ""} ${r.management ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const data: any = await apiFetch(`/api/blood-bank/reports/haemovigilance?branchId=${branchId}`);
      const items = Array.isArray(data) ? data : [];
      setRows(items);

      if (showToast) {
        toast({ title: "Reactions refreshed", description: `Loaded ${items.length} reactions.` });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load reactions";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!branchId) return;
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  /* Stats */
  const totalReactions = rows.length;
  const severeCritical = rows.filter((r: any) => r.severity === "SEVERE" || r.severity === "FATAL").length;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent30Days = rows.filter((r: any) => {
    if (!r.date) return false;
    return new Date(r.date) >= thirtyDaysAgo;
  }).length;

  return (
    <AppShell title="Adverse Reactions">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-zc-text">Adverse Reactions</div>
              <div className="mt-1 text-sm text-zc-muted">
                Report and manage transfusion adverse reactions
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canReport ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setCreateOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Report Reaction
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Haemovigilance data for reported transfusion adverse reactions.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                <div className="text-xs font-medium text-red-600 dark:text-red-400">Total Reactions</div>
                <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{totalReactions}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Severe / Fatal</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{severeCritical}</div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Recent 30 Days</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{recent30Days}</div>
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
                  placeholder="Search by patient, unit, reaction type, severity..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
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
            <CardTitle className="text-base">Reaction Registry</CardTitle>
            <CardDescription className="text-sm">All reported transfusion adverse reactions for this branch.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold">Unit #</th>
                  <th className="px-4 py-3 text-left font-semibold">Reaction Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Severity</th>
                  <th className="px-4 py-3 text-left font-semibold">Management</th>
                  <th className="px-4 py-3 text-left font-semibold">Reported By</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                      {loading ? "Loading reactions..." : "No adverse reactions recorded."}
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r: any) => (
                  <tr key={r.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3 text-zc-muted">
                      {r.date ? new Date(r.date).toLocaleDateString() : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-zc-text">{r.patientName ?? r.patient ?? "-"}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zc-text">{r.unitNumber ?? "-"}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold border-zc-border bg-zc-panel/30 text-zc-text">
                        {reactionTypeLabel[r.reactionType] ?? r.reactionType ?? "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          severityColor(r.severity),
                        )}
                      >
                        {r.severity ?? "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-zc-muted max-w-[200px] truncate" title={r.management ?? ""}>
                      {r.management ?? "-"}
                    </td>

                    <td className="px-4 py-3 text-zc-muted">{r.reportedBy ?? "-"}</td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="success" size="icon" title="View details" aria-label="View details">
                          <IconChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom tip */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Haemovigilance reporting</div>
              <div className="mt-1 text-sm text-zc-muted">
                All adverse reactions are tracked for haemovigilance compliance. Report reactions promptly to ensure patient safety and regulatory adherence.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReportReactionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refresh(false)}
        canSubmit={canReport}
        deniedMessage="Missing permission: BB_TRANSFUSION_REACTION"
      />
    </AppShell>
  );
}
