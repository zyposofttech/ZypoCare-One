"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { usePermissions } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api";
import { AlertTriangle, RefreshCw, Search as IconSearch, Plus as IconPlus, ChevronRight as IconChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const REACTION_TYPES = [
  { value: "FEBRILE", label: "Febrile Non-Hemolytic" },
  { value: "ALLERGIC", label: "Allergic" },
  { value: "ANAPHYLAXIS", label: "Anaphylaxis" },
  { value: "HEMOLYTIC_ACUTE", label: "Acute Hemolytic" },
  { value: "TRALI", label: "TRALI" },
  { value: "TACO", label: "TACO" },
  { value: "BACTERIAL", label: "Bacterial/Sepsis" },
  { value: "OTHER", label: "Other" },
] as const;

const SEVERITY_OPTIONS = [
  { value: "MILD", label: "Mild" },
  { value: "MODERATE", label: "Moderate" },
  { value: "SEVERE", label: "Severe" },
  { value: "LIFE_THREATENING", label: "Life threatening" },
  { value: "FATAL", label: "Fatal" },
] as const;

const reactionTypeLabel: Record<string, string> = Object.fromEntries(REACTION_TYPES.map((t) => [t.value, t.label]));

function severityColor(severity: string) {
  switch (String(severity ?? "").toUpperCase()) {
    case "MILD":
      return "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200";
    case "MODERATE":
      return "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    case "LIFE_THREATENING":
    case "SEVERE":
      return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
    case "FATAL":
      return "border-red-300/70 bg-red-100/70 text-red-900 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-100";
    default:
      return "border-zc-border bg-zc-panel/30 text-zc-muted";
  }
}

type ReactionForm = {
  issueId: string;
  reactionType: string;
  severity: string;
  onsetTime: string;
  description: string;
  managementNotes: string;
  investigationResults: string;
  doctorNotified: boolean;
  stopTemp: string;
  stopPulse: string;
  stopBP: string;
  stopRR: string;
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
  onSaved: () => void;
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
    onsetTime: "",
    description: "",
    managementNotes: "",
    investigationResults: "",
    doctorNotified: true,
    stopTemp: "",
    stopPulse: "",
    stopBP: "",
    stopRR: "",
  });

  const set = <K extends keyof ReactionForm>(k: K, v: ReactionForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  React.useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setForm({
      issueId: "",
      reactionType: "",
      severity: "",
      onsetTime: "",
      description: "",
      managementNotes: "",
      investigationResults: "",
      doctorNotified: true,
      stopTemp: "",
      stopPulse: "",
      stopBP: "",
      stopRR: "",
    });
  }, [open]);

  async function submit() {
    if (!canSubmit) {
      toast({ variant: "destructive", title: "Not allowed", description: deniedMessage });
      return;
    }

    setErr(null);
    if (!form.issueId.trim()) return setErr("Issue ID is required");
    if (!form.reactionType) return setErr("Reaction type is required");
    if (!form.severity) return setErr("Severity is required");
    if (!form.managementNotes.trim()) return setErr("Management notes are required");

    setBusy(true);
    try {
      let investigationResults: any = undefined;
      if (form.investigationResults.trim()) {
        try {
          investigationResults = JSON.parse(form.investigationResults.trim());
        } catch {
          investigationResults = { raw: form.investigationResults.trim() };
        }
      }

      const stopVitals: any = {};
      if (form.stopTemp.trim()) stopVitals.temperature = form.stopTemp.trim();
      if (form.stopPulse.trim()) stopVitals.pulseRate = form.stopPulse.trim();
      if (form.stopBP.trim()) stopVitals.bloodPressure = form.stopBP.trim();
      if (form.stopRR.trim()) stopVitals.respiratoryRate = form.stopRR.trim();

      await apiFetch(`/api/blood-bank/issue/${form.issueId.trim()}/reaction`, {
        method: "POST",
        body: JSON.stringify({
          reactionType: form.reactionType,
          severity: form.severity,
          description: form.description.trim() || null,
          onsetTime: form.onsetTime.trim() || null,
          managementNotes: form.managementNotes.trim(),
          investigationResults,

          // PRD S9 hard-stop workflow
          transfusionStopped: true,
          doctorNotified: form.doctorNotified,
          doctorNotifiedAt: form.doctorNotified ? new Date().toISOString() : null,
          stopVitals: Object.keys(stopVitals).length ? stopVitals : undefined,
        }),
      });

      toast({ title: "Reaction reported", description: `Saved reaction for ${form.issueId} (${form.reactionType})` });
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Failed to report reaction";
      setErr(msg);
      toast({ variant: "destructive", title: "Save failed", description: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Report Adverse Reaction</DialogTitle>
          <DialogDescription>
            PRD S9 hard-stop: This will stop transfusion immediately and quarantine the unit (if still ISSUED).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Reaction Details */}
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

              <div className="grid gap-2">
                <Label>Onset Time (optional)</Label>
                <Input
                  value={form.onsetTime}
                  onChange={(e) => set("onsetTime", e.target.value)}
                  placeholder="ISO timestamp or leave blank"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">
                <div className="font-semibold">Hard-stop workflow (S9)</div>
                <div className="mt-0.5 text-[12px]">
                  Submitting this form will <span className="font-semibold">stop the transfusion immediately</span> and
                  quarantine the unit (if still in ISSUED state). Subsequent vitals entry and “End transfusion” are blocked.
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="doctorNotified"
                    type="checkbox"
                    className="h-4 w-4 rounded border-zc-border"
                    checked={form.doctorNotified}
                    onChange={(e) => set("doctorNotified", e.target.checked)}
                  />
                  <Label htmlFor="doctorNotified" className="text-sm font-semibold">Physician notified</Label>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Management & Investigation */}
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Management & Investigation</div>

            <div className="grid gap-2">
              <Label>Immediate actions / management notes</Label>
              <Textarea
                value={form.managementNotes}
                onChange={(e) => set("managementNotes", e.target.value)}
                placeholder="Stop transfusion, maintain IV line, meds given, send sample, etc."
                className="min-h-[110px]"
              />
            </div>

            <div className="grid gap-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Symptoms: fever/chills, rash, dyspnea, hypotension, hemoglobinuria, etc."
                className="min-h-[90px]"
              />
            </div>

            <div className="grid gap-2">
              <Label>Vitals at stop (optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input value={form.stopTemp} onChange={(e) => set("stopTemp", e.target.value)} placeholder="Temperature" />
                <Input value={form.stopPulse} onChange={(e) => set("stopPulse", e.target.value)} placeholder="Pulse" />
                <Input value={form.stopBP} onChange={(e) => set("stopBP", e.target.value)} placeholder="Blood Pressure" />
                <Input value={form.stopRR} onChange={(e) => set("stopRR", e.target.value)} placeholder="Respiratory Rate" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Investigation Results (optional)</Label>
              <Textarea
                value={form.investigationResults}
                onChange={(e) => set("investigationResults", e.target.value)}
                placeholder='JSON recommended. Example: {"DAT":"POS","hemolysis":"YES"} or free-text.'
                className="min-h-[90px]"
              />
            </div>

            {err ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy || !canSubmit}>
            {busy ? "Saving..." : "Report Reaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReactionsPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const branchId = perms.user?.branchId ?? "";

  const canReport = perms.canAny(["BB_TRANSFUSION_REACTION", "BB_ADMIN"]);

  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return (rows ?? []).filter((r: any) => {
      const hay = `${r.patientName ?? r.patient ?? ""} ${r.unitNumber ?? ""} ${r.reactionType ?? ""} ${r.severity ?? ""} ${r.reportedBy ?? ""} ${r.managementNotes ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function refresh(showToast: boolean) {
    if (!branchId) return;
    setLoading(true);
    setErr(null);
    try {
      const data: any = await apiFetch(`/api/blood-bank/reports/haemovigilance?branchId=${branchId}`);
      const items = Array.isArray(data?.reactions)
        ? data.reactions
        : Array.isArray(data)
          ? data
          : [];
      setRows(items);
      if (showToast) toast({ title: "Refreshed", description: "Loaded haemovigilance reactions." });
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
  const severeCritical = rows.filter((r: any) => ["SEVERE", "LIFE_THREATENING", "FATAL"].includes(String(r.severity ?? "").toUpperCase())).length;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent30Days = rows.filter((r: any) => {
    const dt = r.createdAt ?? r.onsetAt ?? r.reportedAt ?? null;
    if (!dt) return false;
    return new Date(dt) >= thirtyDaysAgo;
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
                      {(() => {
                        const dt = r.createdAt ?? r.onsetAt ?? r.reportedAt ?? null;
                        return dt ? new Date(dt).toLocaleDateString() : "-";
                      })()}
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

                    <td className="px-4 py-3 text-zc-muted max-w-[200px] truncate" title={r.managementNotes ?? ""}>
                      {r.managementNotes ?? "-"}
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
