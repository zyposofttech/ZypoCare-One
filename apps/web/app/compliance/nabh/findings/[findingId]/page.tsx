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
import { IconChevronRight } from "@/components/icons";
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

type Severity = "CRITICAL" | "MAJOR" | "MINOR" | "OBSERVATION";

type CapaStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VERIFIED"
  | "CLOSED";

type Capa = {
  id: string;
  description: string;
  responsibleStaffId: string | null;
  responsibleStaffName: string | null;
  targetDate: string | null;
  status: CapaStatus;
  createdAt: string;
};

type FindingDetail = {
  id: string;
  auditId: string;
  auditName: string | null;
  nabhItemId: string | null;
  nabhItemStandardNumber: string | null;
  nabhItemDescription: string | null;
  severity: Severity;
  description: string;
  recommendation: string | null;
  auditorName: string | null;
  capa: Capa | null;
  createdAt: string;
  updatedAt: string;
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
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", map[status])}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { activeBranchId } = useBranchContext();
  const findingId = params.findingId as string;

  const [finding, setFinding] = React.useState<FindingDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Create CAPA dialog
  const [capaOpen, setCapaOpen] = React.useState(false);
  const [capaSaving, setCapaSaving] = React.useState(false);
  const [capaDescription, setCapaDescription] = React.useState("");
  const [capaResponsibleStaffId, setCapaResponsibleStaffId] =
    React.useState("");
  const [capaTargetDate, setCapaTargetDate] = React.useState("");

  // Staff for CAPA responsible picker
  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);

  /* ---- Fetch finding ---- */

  const fetchFinding = React.useCallback(async () => {
    if (!findingId) return;
    setLoading(true);
    try {
      const data = await apiFetch<FindingDetail>(
        `/api/compliance/nabh/findings/${findingId}`,
      );
      setFinding(data);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to load finding",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [findingId]);

  React.useEffect(() => {
    fetchFinding();
  }, [fetchFinding]);

  /* ---- Fetch staff ---- */

  const fetchStaff = React.useCallback(async () => {
    if (!activeBranchId) return;
    try {
      const data = await apiFetch<StaffMember[]>(
        `/api/infrastructure/human-resource/staff?branchId=${activeBranchId}&limit=100`,
      );
      setStaffList(Array.isArray(data) ? data : []);
    } catch {
      // Non-critical
    }
  }, [activeBranchId]);

  React.useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  /* ---- Create CAPA ---- */

  function openCreateCapa() {
    setCapaDescription("");
    setCapaResponsibleStaffId("");
    setCapaTargetDate("");
    setCapaOpen(true);
  }

  async function handleCreateCapa() {
    if (!capaDescription.trim()) {
      toast({
        title: "Validation",
        description: "CAPA description is required",
        variant: "destructive",
      });
      return;
    }

    setCapaSaving(true);
    try {
      const result = await apiFetch<{ id: string }>(
        `/api/compliance/nabh/findings/${findingId}/capa`,
        {
          method: "POST",
          body: {
            findingId,
            description: capaDescription.trim(),
            responsibleStaffId: capaResponsibleStaffId || null,
            targetDate: capaTargetDate || null,
          },
        },
      );
      toast({ title: "CAPA created" });
      setCapaOpen(false);
      fetchFinding();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to create CAPA",
        variant: "destructive",
      });
    } finally {
      setCapaSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Finding Detail">
        <RequirePerm perm="COMPLIANCE_NABH_FINDING">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
        </div>
        </RequirePerm>
      </AppShell>
    );
  }

  if (!finding) {
    return (
      <AppShell title="Finding Detail">
        <RequirePerm perm="COMPLIANCE_NABH_FINDING">
        <div className="text-center py-24">
          <p className="text-zc-muted">Finding not found.</p>
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

  return (
    <AppShell
      title="Finding Detail"
      breadcrumbs={[
        { label: "Compliance", href: "/compliance" },
        { label: "NABH", href: "/compliance/nabh" },
        { label: "Audits", href: "/compliance/nabh/audits" },
        {
          label: finding.auditName ?? "Audit",
          href: `/compliance/nabh/audits/${finding.auditId}`,
        },
        { label: "Finding" },
      ]}
    >
      <RequirePerm perm="COMPLIANCE_NABH_FINDING">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push(`/compliance/nabh/audits/${finding.auditId}`)
              }
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ShieldAlert className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Audit Finding</div>
              <div className="mt-1 text-sm text-zc-muted">
                From audit: {finding.auditName ?? finding.auditId}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchFinding}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 grid gap-6">
            {/* Finding Info */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Finding Details</CardTitle>
                  <SeverityBadge severity={finding.severity} />
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div>
                  <Label className="text-xs text-zc-muted">Description</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {finding.description}
                  </p>
                </div>

                {finding.recommendation && (
                  <div>
                    <Label className="text-xs text-zc-muted">
                      Recommendation
                    </Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {finding.recommendation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Linked NABH Item */}
            {finding.nabhItemId && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Linked NABH Standard
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <ClipboardCheck className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {finding.nabhItemStandardNumber}
                      </p>
                      <p className="text-sm text-zc-muted mt-1">
                        {finding.nabhItemDescription}
                      </p>
                      <Link
                        href={`/compliance/nabh/checklist/${finding.nabhItemId}`}
                        className="text-sm text-zc-accent hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        View Checklist Item
                        <IconChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CAPA Section */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Corrective & Preventive Action (CAPA)
                    </CardTitle>
                    <CardDescription>
                      {finding.capa
                        ? "CAPA has been created for this finding."
                        : "No CAPA has been created yet."}
                    </CardDescription>
                  </div>
                  {!finding.capa && (
                    <Button size="sm" variant="primary" onClick={openCreateCapa}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Create CAPA
                    </Button>
                  )}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5">
                {finding.capa ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CapaStatusBadge status={finding.capa.status} />
                    </div>
                    <div>
                      <Label className="text-xs text-zc-muted">
                        Description
                      </Label>
                      <p className="text-sm mt-1">
                        {finding.capa.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-zc-muted">
                          Responsible
                        </Label>
                        <p className="text-sm mt-1">
                          {finding.capa.responsibleStaffName ?? (
                            <span className="text-zc-muted">Not assigned</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-zc-muted">
                          Target Date
                        </Label>
                        <p className="text-sm mt-1">
                          {fmtDate(finding.capa.targetDate)}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <Link
                        href={`/compliance/nabh/capa/${finding.capa.id}`}
                        className="text-sm text-zc-accent hover:underline inline-flex items-center gap-1"
                      >
                        View CAPA Details
                        <IconChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-zc-muted py-6">
                    <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      Create a CAPA to track corrective actions for this
                      finding.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="grid gap-4 content-start">
            <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5 space-y-4">
              <h3 className="text-sm font-semibold">Metadata</h3>

              <div>
                <Label className="text-xs text-zc-muted">Severity</Label>
                <div className="mt-1">
                  <SeverityBadge severity={finding.severity} />
                </div>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">Auditor</Label>
                <p className="text-sm mt-1">
                  {finding.auditorName ?? (
                    <span className="text-zc-muted">-</span>
                  )}
                </p>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">Audit</Label>
                <p className="text-sm mt-1">
                  <Link
                    href={`/compliance/nabh/audits/${finding.auditId}`}
                    className="text-zc-accent hover:underline"
                  >
                    {finding.auditName ?? finding.auditId}
                  </Link>
                </p>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">
                  Linked Standard
                </Label>
                <p className="text-sm mt-1">
                  {finding.nabhItemStandardNumber ?? (
                    <span className="text-zc-muted">None</span>
                  )}
                </p>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">Created</Label>
                <p className="text-sm mt-1">{fmtDate(finding.createdAt)}</p>
              </div>

              <div>
                <Label className="text-xs text-zc-muted">Last Updated</Label>
                <p className="text-sm mt-1">{fmtDate(finding.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create CAPA Dialog */}
      <Dialog open={capaOpen} onOpenChange={setCapaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create CAPA</DialogTitle>
            <DialogDescription>
              Define the corrective and preventive action for this finding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Describe the corrective action to be taken..."
                rows={4}
                value={capaDescription}
                onChange={(e) => setCapaDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Responsible Staff</Label>
              <Select
                value={capaResponsibleStaffId}
                onValueChange={setCapaResponsibleStaffId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select responsible staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input
                type="date"
                value={capaTargetDate}
                onChange={(e) => setCapaTargetDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCapaOpen(false)}
              disabled={capaSaving}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateCapa} disabled={capaSaving}>
              {capaSaving && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Create CAPA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </RequirePerm>
    </AppShell>
  );
}
