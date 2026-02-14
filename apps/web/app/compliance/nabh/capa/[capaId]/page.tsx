"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconChevronRight } from "@/components/icons";
import { RequirePerm } from "@/components/RequirePerm";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type CapaStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VERIFIED"
  | "CLOSED";

type EvidenceLink = {
  id: string;
  evidenceId: string;
  title: string;
  fileName: string;
  linkedAt: string;
};

type StatusChange = {
  id: string;
  fromStatus: CapaStatus | null;
  toStatus: CapaStatus;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string;
  comment: string | null;
};

type CapaDetail = {
  id: string;
  findingId: string;
  findingDescription: string | null;
  findingSeverity: string | null;
  auditId: string | null;
  auditName: string | null;
  description: string;
  actionPlan: string | null;
  responsibleStaffId: string | null;
  responsibleStaffName: string | null;
  targetDate: string | null;
  status: CapaStatus;
  evidenceLinks: EvidenceLink[];
  statusChanges: StatusChange[];
  createdAt: string;
  updatedAt: string;
};

/* ----------------------------- Helpers ----------------------------- */

function fmtDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function fmtDateShort(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function getNextCapaStatuses(current: CapaStatus): CapaStatus[] {
  switch (current) {
    case "OPEN":
      return ["IN_PROGRESS"];
    case "IN_PROGRESS":
      return ["COMPLETED"];
    case "COMPLETED":
      return ["VERIFIED"];
    case "VERIFIED":
      return ["CLOSED"];
    case "CLOSED":
      return [];
    default:
      return [];
  }
}

function statusIcon(status: CapaStatus) {
  switch (status) {
    case "OPEN":
      return <Clock className="h-4 w-4 text-gray-500" />;
    case "IN_PROGRESS":
      return <Clock className="h-4 w-4 text-blue-600" />;
    case "COMPLETED":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "VERIFIED":
      return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
    case "CLOSED":
      return <XCircle className="h-4 w-4 text-slate-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function CapaStatusBadge({ status }: { status: CapaStatus }) {
  const map: Record<CapaStatus, string> = {
    OPEN:
      "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-700/50 dark:bg-gray-800/30 dark:text-gray-300",
    IN_PROGRESS:
      "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-300",
    COMPLETED:
      "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-300",
    VERIFIED:
      "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-300",
    CLOSED:
      "border-slate-200/70 bg-slate-50/70 text-slate-600 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        map[status],
      )}
    >
      {statusIcon(status)}
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function CapaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { activeBranchId } = useBranchContext();
  const capaId = params.capaId as string;

  const [capa, setCapa] = React.useState<CapaDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Action plan
  const [actionPlan, setActionPlan] = React.useState("");
  const [actionPlanDirty, setActionPlanDirty] = React.useState(false);

  /* ---- Fetch ---- */

  const fetchCapa = React.useCallback(async () => {
    if (!capaId) return;
    setLoading(true);
    try {
      const data = await apiFetch<CapaDetail>(
        `/api/compliance/nabh/capa/${capaId}`,
      );
      setCapa(data);
      setActionPlan(data.actionPlan ?? "");
      setActionPlanDirty(false);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to load CAPA details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [capaId]);

  React.useEffect(() => {
    fetchCapa();
  }, [fetchCapa]);

  /* ---- Update Status ---- */

  async function updateStatus(newStatus: CapaStatus) {
    if (!capa) return;
    setSaving(true);
    try {
      await apiFetch(`/api/compliance/nabh/capa/${capa.id}`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      toast({
        title: `CAPA status updated to ${newStatus.replace(/_/g, " ")}`,
      });
      fetchCapa();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to update CAPA status",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  /* ---- Save Action Plan ---- */

  async function saveActionPlan() {
    if (!capa) return;
    setSaving(true);
    try {
      await apiFetch(`/api/compliance/nabh/capa/${capa.id}`, {
        method: "PATCH",
        body: { actionPlan },
      });
      toast({ title: "Action plan saved" });
      setActionPlanDirty(false);
      fetchCapa();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to save action plan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="CAPA Detail">
        <RequirePerm perm="COMPLIANCE_NABH_CAPA">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
        </div>
        </RequirePerm>
      </AppShell>
    );
  }

  if (!capa) {
    return (
      <AppShell title="CAPA Detail">
        <RequirePerm perm="COMPLIANCE_NABH_CAPA">
        <div className="text-center py-24">
          <p className="text-zc-muted">CAPA not found.</p>
          <Button
            variant="outline"
            size="icon"
            className="mt-4"
            onClick={() => router.push("/compliance/nabh/audits")}
            title="Back to Audits"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        </RequirePerm>
      </AppShell>
    );
  }

  const nextStatuses = getNextCapaStatuses(capa.status);

  return (
    <AppShell
      title="CAPA Detail"
      breadcrumbs={[
        { label: "Compliance", href: "/compliance" },
        { label: "NABH", href: "/compliance/nabh" },
        { label: "Audits", href: "/compliance/nabh/audits" },
        ...(capa.auditId
          ? [
              {
                label: capa.auditName ?? "Audit",
                href: `/compliance/nabh/audits/${capa.auditId}`,
              },
            ]
          : []),
        { label: "CAPA" },
      ]}
    >
      <RequirePerm perm="COMPLIANCE_NABH_CAPA">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (capa.findingId) {
                  router.push(
                    `/compliance/nabh/findings/${capa.findingId}`,
                  );
                } else {
                  router.push("/compliance/nabh/audits");
                }
              }}
              title="Back to Finding"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ShieldCheck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                Corrective & Preventive Action
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                CAPA tracking for audit finding
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchCapa}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 grid gap-6">
            {/* CAPA Info */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">CAPA Details</CardTitle>
                  <CapaStatusBadge status={capa.status} />
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div>
                  <Label className="text-xs text-zc-muted">Description</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {capa.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-zc-muted">
                      Responsible Staff
                    </Label>
                    <p className="text-sm mt-1">
                      {capa.responsibleStaffName ?? (
                        <span className="text-zc-muted">Not assigned</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-zc-muted">Target Date</Label>
                    <p className="text-sm mt-1">
                      {fmtDateShort(capa.targetDate)}
                    </p>
                  </div>
                </div>

                {/* Related finding */}
                {capa.findingDescription && (
                  <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-4">
                    <Label className="text-xs text-zc-muted">
                      Related Finding
                    </Label>
                    <p className="text-sm mt-1">{capa.findingDescription}</p>
                    {capa.findingSeverity && (
                      <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50/70 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:border-gray-700/50 dark:bg-gray-800/30 dark:text-gray-300 mt-2">
                        {capa.findingSeverity}
                      </span>
                    )}
                    <div className="mt-2">
                      <Link
                        href={`/compliance/nabh/findings/${capa.findingId}`}
                        className="text-sm text-zc-accent hover:underline inline-flex items-center gap-1"
                      >
                        View Finding
                        <IconChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Workflow */}
            {nextStatuses.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Update Status</CardTitle>
                  <CardDescription>
                    Progress this CAPA through the workflow stages.
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zc-muted">Current:</span>
                    <CapaStatusBadge status={capa.status} />
                    <ArrowRight className="h-4 w-4 text-zc-muted" />
                    {nextStatuses.map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(s)}
                        disabled={saving}
                      >
                        {statusIcon(s)}
                        <span className="ml-1.5">
                          {s.replace(/_/g, " ")}
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Plan */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Action Plan</CardTitle>
                <CardDescription>
                  Document the steps to resolve this CAPA.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-3">
                <Textarea
                  placeholder="Describe the action plan, implementation steps, and expected outcomes..."
                  rows={6}
                  value={actionPlan}
                  onChange={(e) => {
                    setActionPlan(e.target.value);
                    setActionPlanDirty(true);
                  }}
                />
                {actionPlanDirty && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={saveActionPlan}
                      disabled={saving}
                    >
                      {saving && (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      )}
                      Save Action Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Closure Evidence */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Closure Evidence
                    </CardTitle>
                    <CardDescription>
                      Link evidence artifacts to support CAPA closure.
                    </CardDescription>
                  </div>
                  <Link href={`/compliance/evidence?capaId=${capa.id}`}>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1.5" />
                      Link Evidence
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <Separator />
              {capa.evidenceLinks.length === 0 ? (
                <div className="text-center text-zc-muted py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No closure evidence linked yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Title</th>
                        <th className="px-4 py-3 text-left font-semibold">File Name</th>
                        <th className="px-4 py-3 text-left font-semibold">Linked At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capa.evidenceLinks.map((ev) => (
                        <tr key={ev.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                          <td className="px-4 py-3 font-medium">
                            {ev.title}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono">
                            {ev.fileName}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {fmtDate(ev.linkedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Status Timeline */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status Timeline</CardTitle>
                <CardDescription>
                  History of status changes for this CAPA.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5">
                {capa.statusChanges.length === 0 ? (
                  <div className="text-center text-zc-muted py-6">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No status changes recorded yet.</p>
                  </div>
                ) : (
                  <div className="relative space-y-0">
                    {capa.statusChanges.map((change, idx) => (
                      <div key={change.id} className="flex gap-4 pb-4">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zc-border bg-white dark:bg-gray-900">
                            {statusIcon(change.toStatus)}
                          </div>
                          {idx < capa.statusChanges.length - 1 && (
                            <div className="w-px flex-1 bg-zc-border mt-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-2">
                          <div className="flex items-center gap-2">
                            <CapaStatusBadge status={change.toStatus} />
                            {change.fromStatus && (
                              <span className="text-xs text-zc-muted">
                                from{" "}
                                {change.fromStatus.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zc-muted mt-1">
                            {change.changedByName ?? "System"} -{" "}
                            {fmtDate(change.changedAt)}
                          </p>
                          {change.comment && (
                            <p className="text-sm mt-1 text-zc-muted">
                              {change.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="grid gap-4 content-start">
            <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5 space-y-4">
              <h3 className="text-sm font-semibold">Summary</h3>

              <div>
                <Label className="text-xs text-zc-muted">Status</Label>
                <div className="mt-1">
                  <CapaStatusBadge status={capa.status} />
                </div>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">
                  Responsible Staff
                </Label>
                <p className="text-sm mt-1">
                  {capa.responsibleStaffName ?? (
                    <span className="text-zc-muted">Not assigned</span>
                  )}
                </p>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">Target Date</Label>
                <p className="text-sm mt-1">
                  {fmtDateShort(capa.targetDate)}
                </p>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">
                  Evidence Count
                </Label>
                <p className="text-sm mt-1">{capa.evidenceLinks.length}</p>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">
                  Status Changes
                </Label>
                <p className="text-sm mt-1">{capa.statusChanges.length}</p>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">Created</Label>
                <p className="text-sm mt-1">{fmtDate(capa.createdAt)}</p>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">Last Updated</Label>
                <p className="text-sm mt-1">{fmtDate(capa.updatedAt)}</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5 space-y-3">
              <h3 className="text-sm font-semibold">Related</h3>
              {capa.findingId && (
                <Link
                  href={`/compliance/nabh/findings/${capa.findingId}`}
                  className="text-sm text-zc-accent hover:underline flex items-center gap-1"
                >
                  View Finding
                  <IconChevronRight className="h-3 w-3" />
                </Link>
              )}
              {capa.auditId && (
                <Link
                  href={`/compliance/nabh/audits/${capa.auditId}`}
                  className="text-sm text-zc-accent hover:underline flex items-center gap-1"
                >
                  View Audit
                  <IconChevronRight className="h-3 w-3" />
                </Link>
              )}
              <Link
                href="/compliance/nabh"
                className="text-sm text-zc-accent hover:underline flex items-center gap-1"
              >
                NABH Overview
                <IconChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      </RequirePerm>
    </AppShell>
  );
}
