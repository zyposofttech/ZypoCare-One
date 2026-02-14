"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import { IconChevronRight, IconSearch } from "@/components/icons";
import { CompliancePageHead, CompliancePageInsights } from "@/components/copilot/ComplianceHelpInline";
import {
  AlertTriangle,
  ClipboardCheck,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type AuditType =
  | "INTERNAL"
  | "EXTERNAL"
  | "PRE_ASSESSMENT"
  | "FINAL_ASSESSMENT";
type AuditStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";

type AuditCycle = {
  id: string;
  name: string;
  type: AuditType;
  status: AuditStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  leadAuditorName: string | null;
  findingsCount: number;
  createdAt: string;
};

type StaffMember = {
  id: string;
  name: string;
};

/* ----------------------------- Helpers ----------------------------- */

function fmtDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function typeLabel(type: AuditType): string {
  return type.replace(/_/g, " ");
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

function TypeBadge({ type }: { type: AuditType }) {
  const map: Record<AuditType, string> = {
    INTERNAL:
      "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-300",
    EXTERNAL:
      "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-800/50 dark:bg-violet-900/30 dark:text-violet-300",
    PRE_ASSESSMENT:
      "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-300",
    FINAL_ASSESSMENT:
      "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        map[type],
      )}
    >
      {typeLabel(type)}
    </span>
  );
}

function AuditStatusBadge({ status }: { status: AuditStatus }) {
  const map: Record<AuditStatus, string> = {
    PLANNED:
      "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-700/50 dark:bg-gray-800/30 dark:text-gray-300",
    IN_PROGRESS:
      "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-300",
    COMPLETED:
      "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-300",
    CLOSED:
      "border-slate-200/70 bg-slate-50/70 text-slate-600 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        map[status],
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ----------------------------- Create Dialog ----------------------------- */

function CreateAuditDialog({
  open,
  onClose,
  activeBranchId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  activeBranchId: string | null;
  onCreated: (auditId: string) => void;
}) {
  const { toast } = useToast();

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [auditType, setAuditType] = React.useState<AuditType>("INTERNAL");
  const [plannedStartDate, setPlannedStartDate] = React.useState("");
  const [plannedEndDate, setPlannedEndDate] = React.useState("");
  const [leadAuditorStaffId, setLeadAuditorStaffId] = React.useState("");
  const [scope, setScope] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);

  const resetForm = React.useCallback(() => {
    setErr(null);
    setName("");
    setAuditType("INTERNAL");
    setPlannedStartDate("");
    setPlannedEndDate("");
    setLeadAuditorStaffId("");
    setScope("");
    setNotes("");
  }, []);

  const fetchStaff = React.useCallback(async () => {
    if (!activeBranchId) {
      setStaffList([]);
      return;
    }
    try {
      const data = await apiFetch<StaffMember[] | { items: StaffMember[] }>(
        `/api/infrastructure/human-resource/staff?branchId=${activeBranchId}&limit=100`,
      );
      const rows = Array.isArray(data) ? data : (data?.items ?? []);
      setStaffList(rows);
    } catch {
      setStaffList([]);
    }
  }, [activeBranchId]);

  React.useEffect(() => {
    if (!open) return;
    resetForm();
    void fetchStaff();
  }, [open, resetForm, fetchStaff]);

  async function handleSubmit() {
    if (!activeBranchId) {
      const msg = "Active branch is required";
      setErr(msg);
      toast({ title: "Validation", description: msg, variant: "destructive" });
      return;
    }

    if (!name.trim()) {
      const msg = "Audit name is required";
      setErr(msg);
      toast({ title: "Validation", description: msg, variant: "destructive" });
      return;
    }

    if (!plannedStartDate) {
      const msg = "Planned start date is required";
      setErr(msg);
      toast({ title: "Validation", description: msg, variant: "destructive" });
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      const result = await apiFetch<{ id: string }>("/api/compliance/nabh/audits", {
        method: "POST",
        body: {
          name: name.trim(),
          type: auditType,
          plannedStartDate,
          plannedEndDate: plannedEndDate || null,
          leadAuditorStaffId: leadAuditorStaffId || null,
          scope: scope.trim() || null,
          notes: notes.trim() || null,
          branchId: activeBranchId,
        },
      });

      toast({ title: "Audit cycle created" });
      onClose();
      onCreated(result.id);
    } catch (e: any) {
      const msg = e?.message || "Failed to create audit cycle";
      setErr(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent
        className={drawerClassName("max-w-[860px]")}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Create Audit Cycle
          </DialogTitle>
          <DialogDescription>
            Create a NABH audit cycle and assign schedule, auditor, scope, and notes.
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
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Basics</div>

            <div className="grid gap-2">
              <Label htmlFor="audit-name">Audit Name</Label>
              <Input
                id="audit-name"
                placeholder="e.g. Internal Audit Q1 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="audit-type">Audit Type</Label>
                <Select
                  value={auditType}
                  onValueChange={(v) => setAuditType(v as AuditType)}
                >
                  <SelectTrigger id="audit-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="EXTERNAL">External</SelectItem>
                    <SelectItem value="PRE_ASSESSMENT">Pre-Assessment</SelectItem>
                    <SelectItem value="FINAL_ASSESSMENT">Final Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lead-auditor">Lead Auditor</Label>
                <Select value={leadAuditorStaffId} onValueChange={setLeadAuditorStaffId}>
                  <SelectTrigger id="lead-auditor">
                    <SelectValue placeholder="Select lead auditor" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                    {staffList.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No staff found for this branch.
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-date">Planned Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={plannedStartDate}
                  onChange={(e) => setPlannedStartDate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end-date">Planned End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={plannedEndDate}
                  onChange={(e) => setPlannedEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="text-sm font-semibold text-zc-text">Details</div>

            <div className="grid gap-2">
              <Label htmlFor="scope">Scope</Label>
              <Textarea
                id="scope"
                placeholder="Define audit scope..."
                rows={4}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes for this cycle..."
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              onClick={() => void handleSubmit()}
              disabled={busy}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Audit Cycle
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function AuditCyclesPage() {
  const router = useRouter();
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [audits, setAudits] = React.useState<AuditCycle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return audits;
    return audits.filter((audit) => {
      const haystack = `${audit.name} ${audit.type} ${audit.status} ${audit.leadAuditorName ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [audits, q]);

  const plannedCount = audits.filter((a) => a.status === "PLANNED").length;
  const inProgressCount = audits.filter((a) => a.status === "IN_PROGRESS").length;
  const completedCount = audits.filter((a) => a.status === "COMPLETED").length;
  const closedCount = audits.filter((a) => a.status === "CLOSED").length;
  const findingsCount = audits.reduce((acc, row) => acc + (row.findingsCount || 0), 0);

  const refresh = React.useCallback(
    async (showToast = false) => {
      if (!activeBranchId) {
        setAudits([]);
        setLoading(false);
        return;
      }
      setErr(null);
      setLoading(true);
      try {
        const data = await apiFetch<AuditCycle[] | { items: AuditCycle[] }>(
          `/api/compliance/nabh/audits?branchId=${activeBranchId}`,
        );
        const rows = Array.isArray(data) ? data : (data?.items ?? []);
        setAudits(rows);

        if (showToast) {
          toast({
            title: "Audits refreshed",
            description: `Loaded ${rows.length} audit cycles.`,
          });
        }
      } catch (e: any) {
        const msg = e?.message || "Failed to load audit cycles";
        setErr(msg);
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [activeBranchId, toast],
  );

  React.useEffect(() => {
    void refresh(false);
  }, [refresh]);

  return (
    <AppShell
      title="NABH Audit Cycles"
      breadcrumbs={[
        { label: "Compliance", href: "/compliance" },
        { label: "NABH", href: "/compliance/nabh" },
        { label: "Audits" },
      ]}
    >
      <RequirePerm perm="COMPLIANCE_NABH_AUDIT">
        <div className="grid gap-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <ClipboardCheck className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Audit Cycles</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Manage internal and external NABH audit cycles and track readiness findings.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CompliancePageHead pageId="compliance-nabh-audits" />
              <Button
                variant="outline"
                className="px-5 gap-2"
                onClick={() => void refresh(true)}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New Audit
              </Button>
            </div>
          </div>

          {/* AI Insights */}
          <CompliancePageInsights pageId="compliance-nabh-audits" />

          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription className="text-sm">
                Search audit cycles, monitor lifecycle status, and open details for findings and closure.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Audits</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{audits.length}</div>
                  <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                    Planned: <span className="font-semibold tabular-nums">{plannedCount}</span> | In Progress: <span className="font-semibold tabular-nums">{inProgressCount}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                  <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Completed / Closed</div>
                  <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{completedCount + closedCount}</div>
                  <div className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-300/80">
                    Completed: <span className="font-semibold tabular-nums">{completedCount}</span> | Closed: <span className="font-semibold tabular-nums">{closedCount}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                  <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Total Findings</div>
                  <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{findingsCount}</div>
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
                    placeholder="Search by audit name, type, status, or lead auditor..."
                    className="pl-10"
                  />
                </div>

                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                  <span className="font-semibold tabular-nums text-zc-text">{audits.length}</span>
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

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Audit Registry</CardTitle>
              <CardDescription className="text-sm">
                Open an audit cycle to update status and add findings.
              </CardDescription>
            </CardHeader>
            <Separator />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Audit Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Start Date</th>
                    <th className="px-4 py-3 text-left font-semibold">End Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Lead Auditor</th>
                    <th className="px-4 py-3 text-center font-semibold">Findings</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {!filtered.length ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-zc-muted">
                        {loading ? "Loading audit cycles..." : "No audit cycles found."}
                      </td>
                    </tr>
                  ) : null}

                  {filtered.map((audit) => (
                    <tr
                      key={audit.id}
                      className="border-t border-zc-border hover:bg-zc-panel/20 cursor-pointer transition-colors"
                      onClick={() => router.push(`/compliance/nabh/audits/${audit.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zc-text">{audit.name}</div>
                        <div className="mt-0.5 text-xs text-zc-muted">Created {fmtDate(audit.createdAt)}</div>
                      </td>

                      <td className="px-4 py-3">
                        <TypeBadge type={audit.type} />
                      </td>

                      <td className="px-4 py-3">
                        <AuditStatusBadge status={audit.status} />
                      </td>

                      <td className="px-4 py-3 text-zc-muted">{fmtDate(audit.plannedStartDate)}</td>
                      <td className="px-4 py-3 text-zc-muted">{fmtDate(audit.plannedEndDate)}</td>

                      <td className="px-4 py-3">
                        {audit.leadAuditorName ? (
                          <span className="text-sm">{audit.leadAuditorName}</span>
                        ) : (
                          <span className="text-xs text-zc-muted">Not assigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50/70 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:border-gray-700/50 dark:bg-gray-800/30 dark:text-gray-300">
                          {audit.findingsCount}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="success"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/compliance/nabh/audits/${audit.id}`);
                            }}
                            title="View details"
                            aria-label="View details"
                          >
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

          <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zc-text">Recommended flow</div>
                <div className="mt-1 text-sm text-zc-muted">
                  1) Create audit cycle, then 2) move status from Planned to In Progress, then 3) add findings and close with CAPA actions.
                </div>
              </div>
            </div>
          </div>
        </div>

        <CreateAuditDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          activeBranchId={activeBranchId}
          onCreated={(auditId) => {
            router.push(`/compliance/nabh/audits/${auditId}`);
          }}
        />
      </RequirePerm>
    </AppShell>
  );
}
