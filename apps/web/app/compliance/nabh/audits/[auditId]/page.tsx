"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type AuditType = "INTERNAL" | "EXTERNAL" | "PRE_ASSESSMENT" | "FINAL_ASSESSMENT";
type AuditStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
type Severity = "CRITICAL" | "MAJOR" | "MINOR" | "OBSERVATION";

type Finding = {
  id: string;
  nabhItemId: string;
  nabhItemStandardNumber: string | null;
  severity: Severity;
  description: string;
  recommendation: string | null;
  auditorName: string | null;
  createdAt: string;
};

type AuditDetail = {
  id: string;
  name: string;
  type: AuditType;
  status: AuditStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  leadAuditorName: string | null;
  leadAuditorStaffId: string | null;
  scope: string | null;
  notes: string | null;
  findings: Finding[];
  createdAt: string;
  updatedAt: string;
};

type NabhItemOption = {
  id: string;
  standardNumber: string;
  description: string;
};

/* ----------------------------- Helpers ----------------------------- */

function fmtDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function getNextAuditStatuses(current: AuditStatus): AuditStatus[] {
  switch (current) {
    case "PLANNED":
      return ["IN_PROGRESS"];
    case "IN_PROGRESS":
      return ["COMPLETED"];
    case "COMPLETED":
      return ["CLOSED"];
    case "CLOSED":
      return [];
    default:
      return [];
  }
}

function AuditStatusBadge({ status }: { status: AuditStatus }) {
  const map: Record<AuditStatus, string> = {
    PLANNED:
      "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-700/50 dark:bg-gray-800/30 dark:text-gray-300",
    IN_PROGRESS:
      "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-300",
    COMPLETED:
      "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-300",
    CLOSED:
      "border-slate-200/70 bg-slate-50/70 text-slate-600 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-400",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", map[status])}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, string> = {
    CRITICAL:
      "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300",
    MAJOR:
      "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-300",
    MINOR:
      "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-800/50 dark:bg-sky-900/30 dark:text-sky-300",
    OBSERVATION:
      "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", map[severity])}>
      {severity}
    </span>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { activeBranchId } = useBranchContext();
  const auditId = params.auditId as string;

  const [audit, setAudit] = React.useState<AuditDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Add Finding dialog
  const [findingOpen, setFindingOpen] = React.useState(false);
  const [findingSaving, setFindingSaving] = React.useState(false);
  const [fNabhItemId, setFNabhItemId] = React.useState("");
  const [fSeverity, setFSeverity] = React.useState<Severity>("MAJOR");
  const [fDescription, setFDescription] = React.useState("");
  const [fRecommendation, setFRecommendation] = React.useState("");

  // NABH items for the finding picker
  const [nabhItems, setNabhItems] = React.useState<NabhItemOption[]>([]);

  /* ---- Fetch audit ---- */

  const fetchAudit = React.useCallback(async () => {
    if (!auditId) return;
    setLoading(true);
    try {
      const data = await apiFetch<AuditDetail>(
        `/api/compliance/nabh/audits/${auditId}`,
      );
      setAudit(data);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to load audit details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  React.useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  /* ---- Fetch NABH items for finding picker ---- */

  const fetchNabhItems = React.useCallback(async () => {
    if (!activeBranchId) return;
    try {
      const data = await apiFetch<NabhItemOption[]>(
        `/api/compliance/nabh/items?branchId=${activeBranchId}&limit=500`,
      );
      setNabhItems(Array.isArray(data) ? data : []);
    } catch {
      // Non-critical
    }
  }, [activeBranchId]);

  React.useEffect(() => {
    fetchNabhItems();
  }, [fetchNabhItems]);

  /* ---- Update status ---- */

  async function updateStatus(newStatus: AuditStatus) {
    if (!audit) return;
    setSaving(true);
    try {
      await apiFetch(`/api/compliance/nabh/audits/${audit.id}`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      toast({ title: `Audit status updated to ${newStatus.replace(/_/g, " ")}` });
      fetchAudit();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  /* ---- Add Finding ---- */

  function openAddFinding() {
    setFNabhItemId("");
    setFSeverity("MAJOR");
    setFDescription("");
    setFRecommendation("");
    setFindingOpen(true);
  }

  async function handleAddFinding() {
    if (!fDescription.trim()) {
      toast({
        title: "Validation",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }

    setFindingSaving(true);
    try {
      await apiFetch(`/api/compliance/nabh/audits/${auditId}/findings`, {
        method: "POST",
        body: {
          auditId,
          nabhItemId: fNabhItemId || null,
          severity: fSeverity,
          description: fDescription.trim(),
          recommendation: fRecommendation.trim() || null,
        },
      });
      toast({ title: "Finding added" });
      setFindingOpen(false);
      fetchAudit();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to add finding",
        variant: "destructive",
      });
    } finally {
      setFindingSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Audit Detail">
        <RequirePerm perm="COMPLIANCE_NABH_AUDIT">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
        </div>
        </RequirePerm>
      </AppShell>
    );
  }

  if (!audit) {
    return (
      <AppShell title="Audit Detail">
        <RequirePerm perm="COMPLIANCE_NABH_AUDIT">
        <div className="text-center py-24">
          <p className="text-zc-muted">Audit not found.</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={() => router.push("/compliance/nabh/audits")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Audits
          </Button>
        </div>
        </RequirePerm>
      </AppShell>
    );
  }

  const nextStatuses = getNextAuditStatuses(audit.status);

  return (
    <AppShell
      title={audit.name}
      breadcrumbs={[
        { label: "Compliance", href: "/compliance" },
        { label: "NABH", href: "/compliance/nabh" },
        { label: "Audits", href: "/compliance/nabh/audits" },
        { label: audit.name },
      ]}
    >
      <RequirePerm perm="COMPLIANCE_NABH_AUDIT">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/compliance/nabh/audits")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ClipboardCheck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">{audit.name}</div>
              <div className="mt-1 text-sm text-zc-muted">
                {audit.type.replace(/_/g, " ")} Audit
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAudit}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 grid gap-6">
            {/* Audit Info */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Audit Information</CardTitle>
                  <AuditStatusBadge status={audit.status} />
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-zc-muted">Type</Label>
                    <p className="text-sm mt-1">
                      {audit.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-zc-muted">Lead Auditor</Label>
                    <p className="text-sm mt-1">
                      {audit.leadAuditorName ?? (
                        <span className="text-zc-muted">Not assigned</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-zc-muted">Start Date</Label>
                    <p className="text-sm mt-1">
                      {fmtDate(audit.plannedStartDate)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-zc-muted">End Date</Label>
                    <p className="text-sm mt-1">
                      {fmtDate(audit.plannedEndDate)}
                    </p>
                  </div>
                </div>

                {audit.scope && (
                  <div>
                    <Label className="text-xs text-zc-muted">Scope</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {audit.scope}
                    </p>
                  </div>
                )}

                {audit.notes && (
                  <div>
                    <Label className="text-xs text-zc-muted">Notes</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {audit.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Workflow */}
            {nextStatuses.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Update Status</CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zc-muted">Current:</span>
                    <AuditStatusBadge status={audit.status} />
                    <ArrowRight className="h-4 w-4 text-zc-muted" />
                    {nextStatuses.map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(s)}
                        disabled={saving}
                      >
                        {s.replace(/_/g, " ")}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Findings */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Findings</CardTitle>
                    <CardDescription>
                      {audit.findings.length} finding(s) recorded
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="primary" onClick={openAddFinding}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Finding
                  </Button>
                </div>
              </CardHeader>
              <Separator />
              {audit.findings.length === 0 ? (
                <div className="text-center text-zc-muted py-8">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No findings recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Standard #</th>
                        <th className="px-4 py-3 text-left font-semibold">Severity</th>
                        <th className="px-4 py-3 text-left font-semibold">Description</th>
                        <th className="px-4 py-3 text-left font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.findings.map((f) => (
                        <tr
                          key={f.id}
                          className="border-t border-zc-border hover:bg-zc-panel/20 cursor-pointer transition-colors"
                          onClick={() =>
                            router.push(
                              `/compliance/nabh/findings/${f.id}`,
                            )
                          }
                        >
                          <td className="px-4 py-3 font-mono text-sm">
                            {f.nabhItemStandardNumber ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            <SeverityBadge severity={f.severity} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="line-clamp-2 text-sm">
                              {f.description}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {fmtDate(f.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="grid gap-4 content-start">
            <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5 space-y-4">
              <h3 className="text-sm font-semibold">Summary</h3>

              <div>
                <Label className="text-xs text-zc-muted">
                  Total Findings
                </Label>
                <p className="text-2xl font-bold mt-1">
                  {audit.findings.length}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-zc-muted">By Severity</Label>
                {(
                  ["CRITICAL", "MAJOR", "MINOR", "OBSERVATION"] as Severity[]
                ).map((sev) => {
                  const count = audit.findings.filter(
                    (f) => f.severity === sev,
                  ).length;
                  if (count === 0) return null;
                  return (
                    <div
                      key={sev}
                      className="flex items-center justify-between"
                    >
                      <SeverityBadge severity={sev} />
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  );
                })}
                {audit.findings.length === 0 && (
                  <p className="text-sm text-zc-muted">No findings yet</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-zc-muted">Created</Label>
                <p className="text-sm mt-1">{fmtDate(audit.createdAt)}</p>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">Last Updated</Label>
                <p className="text-sm mt-1">{fmtDate(audit.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Finding Dialog */}
      <Dialog open={findingOpen} onOpenChange={setFindingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Finding</DialogTitle>
            <DialogDescription>
              Record a new audit finding linked to a NABH checklist item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>NABH Item (Optional)</Label>
              <Select value={fNabhItemId} onValueChange={setFNabhItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select checklist item" />
                </SelectTrigger>
                <SelectContent>
                  {nabhItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.standardNumber} - {item.description.slice(0, 60)}
                      {item.description.length > 60 ? "..." : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Severity <span className="text-red-500">*</span>
              </Label>
              <Select
                value={fSeverity}
                onValueChange={(v) => setFSeverity(v as Severity)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="MAJOR">Major</SelectItem>
                  <SelectItem value="MINOR">Minor</SelectItem>
                  <SelectItem value="OBSERVATION">Observation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Describe the finding..."
                rows={4}
                value={fDescription}
                onChange={(e) => setFDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Recommendation</Label>
              <Textarea
                placeholder="Recommended corrective action..."
                rows={3}
                value={fRecommendation}
                onChange={(e) => setFRecommendation(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFindingOpen(false)}
              disabled={findingSaving}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddFinding} disabled={findingSaving}>
              {findingSaving && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Add Finding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </RequirePerm>
    </AppShell>
  );
}
