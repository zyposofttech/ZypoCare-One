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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RequirePerm } from "@/components/RequirePerm";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type ApprovalStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

type ApprovalDetail = {
  id: string;
  changeType: string;
  entityType: string;
  entityId: string;
  requestedById: string;
  requestedByName?: string;
  status: ApprovalStatus;
  payloadDraft: Record<string, unknown> | null;
  decisionNotes: string | null;
  decidedById: string | null;
  decidedByName?: string;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ----------------------------- Helpers ----------------------------- */

function fmtDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function fmtDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function statusBadge(status: ApprovalStatus) {
  switch (status) {
    case "SUBMITTED":
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          PENDING
        </span>
      );
    case "APPROVED":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
          APPROVED
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          REJECTED
        </span>
      );
    default:
      return null;
  }
}

function statusIcon(status: ApprovalStatus) {
  switch (status) {
    case "SUBMITTED":
      return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    case "APPROVED":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case "REJECTED":
      return <X className="h-4 w-4 text-red-600 dark:text-red-400" />;
    default:
      return null;
  }
}

/* ----------------------------- Page ----------------------------- */

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { activeBranchId } = useBranchContext();

  const approvalId = params.id as string;

  const [approval, setApproval] = React.useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  // Approve confirm dialog
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [approveBusy, setApproveBusy] = React.useState(false);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectNotes, setRejectNotes] = React.useState("");
  const [rejectBusy, setRejectBusy] = React.useState(false);

  /* ---- Fetch ---- */

  const load = React.useCallback(async () => {
    if (!approvalId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<ApprovalDetail>(
        `/api/compliance/approvals/${approvalId}`,
      );
      setApproval(data);
    } catch (e) {
      const msg = errorMessage(e, "Failed to load approval");
      setErr(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [approvalId]);

  React.useEffect(() => {
    load();
  }, [load]);

  /* ---- Approve ---- */

  async function handleApprove() {
    if (!approvalId) return;
    setApproveBusy(true);
    try {
      await apiFetch(`/api/compliance/approvals/${approvalId}/decide`, {
        method: "POST",
        body: { decision: "APPROVED", decisionNotes: "" },
      });
      toast({ title: "Approval granted" });
      setApproveOpen(false);
      load();
    } catch (e) {
      toast({
        title: "Error",
        description: errorMessage(e, "Failed to approve"),
        variant: "destructive",
      });
    } finally {
      setApproveBusy(false);
    }
  }

  /* ---- Reject ---- */

  async function handleReject() {
    if (!approvalId) return;
    if (!rejectNotes.trim()) {
      toast({
        title: "Validation",
        description: "Please provide rejection notes",
        variant: "destructive",
      });
      return;
    }
    setRejectBusy(true);
    try {
      await apiFetch(`/api/compliance/approvals/${approvalId}/decide`, {
        method: "POST",
        body: { decision: "REJECTED", decisionNotes: rejectNotes.trim() },
      });
      toast({ title: "Approval rejected" });
      setRejectOpen(false);
      load();
    } catch (e) {
      toast({
        title: "Error",
        description: errorMessage(e, "Failed to reject"),
        variant: "destructive",
      });
    } finally {
      setRejectBusy(false);
    }
  }

  /* ---- Loading state ---- */

  if (loading) {
    return (
      <AppShell title="Approval Detail">
        <RequirePerm perm="COMPLIANCE_APPROVAL_READ">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
          </div>
        </RequirePerm>
      </AppShell>
    );
  }

  /* ---- Not found / error state ---- */

  if (!approval) {
    return (
      <AppShell title="Approval Detail">
        <RequirePerm perm="COMPLIANCE_APPROVAL_READ">
          <div className="grid gap-6">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/compliance/approvals")}
                title="Back to Approvals"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="text-3xl font-semibold tracking-tight">
                Approval Detail
              </div>
            </div>
            {err ? (
              <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0">{err}</div>
              </div>
            ) : (
              <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
                <p className="py-12 text-center text-sm text-zc-muted">
                  Approval not found.
                </p>
              </div>
            )}
          </div>
        </RequirePerm>
      </AppShell>
    );
  }

  /* ---- Main render ---- */

  return (
    <AppShell title="Approval Detail">
      <RequirePerm perm="COMPLIANCE_APPROVAL_READ">
        <div className="grid gap-6">
          {/* ---- Header ---- */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/compliance/approvals")}
                title="Back to Approvals"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <CheckCircle2 className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-semibold tracking-tight">
                    {approval.changeType} - {approval.entityType}
                  </div>
                  {statusBadge(approval.status)}
                </div>
                <div className="mt-1 text-sm text-zc-muted">
                  Approval Request
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="px-5 gap-2" onClick={load}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* ---- Main Content (left 2/3) ---- */}
            <div className="grid gap-6 lg:col-span-2">
              {/* Approval Metadata Card */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Approval Information
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Details about this change request.
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-xs font-medium text-zc-muted">
                        Change Type
                      </div>
                      <div className="mt-0.5 text-sm font-medium text-zc-text">
                        {approval.changeType}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zc-muted">
                        Entity Type
                      </div>
                      <div className="mt-0.5 text-sm font-medium text-zc-text">
                        {approval.entityType}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zc-muted">
                        Entity ID
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-zc-text">
                        {approval.entityId}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zc-muted">
                        Requested By
                      </div>
                      <div className="mt-0.5 text-sm text-zc-text">
                        {approval.requestedByName ||
                          approval.requestedById.slice(0, 8) + "..."}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zc-muted">
                        Submitted
                      </div>
                      <div className="mt-0.5 text-sm text-zc-text">
                        {fmtDateTime(approval.createdAt)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zc-muted">
                        Status
                      </div>
                      <div className="mt-0.5">
                        {statusBadge(approval.status)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payload Preview Card */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Payload Preview</CardTitle>
                  <CardDescription className="text-sm">
                    Draft payload for this change request.
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  {approval.payloadDraft ? (
                    <pre className="rounded-xl border border-zc-border bg-zc-panel/30 p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap text-zc-text">
                      {JSON.stringify(approval.payloadDraft, null, 2)}
                    </pre>
                  ) : (
                    <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
                      <p className="py-4 text-center text-sm text-zc-muted">
                        No payload data.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Decision Card (only when decided) */}
              {approval.status !== "SUBMITTED" && (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {statusIcon(approval.status)}
                      Decision
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {approval.status === "APPROVED"
                        ? "This request was approved."
                        : "This request was rejected."}
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-zc-muted">
                          Decided By
                        </div>
                        <div className="mt-0.5 text-sm text-zc-text">
                          {approval.decidedByName ||
                            (approval.decidedById
                              ? approval.decidedById.slice(0, 8) + "..."
                              : "-")}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-zc-muted">
                          Decision Date
                        </div>
                        <div className="mt-0.5 text-sm text-zc-text">
                          {fmtDateTime(approval.decidedAt)}
                        </div>
                      </div>
                    </div>
                    {approval.decisionNotes && (
                      <div className="mt-4">
                        <div className="text-xs font-medium text-zc-muted">
                          Decision Notes
                        </div>
                        <div className="mt-1 rounded-xl border border-zc-border bg-zc-panel/20 p-3 text-sm text-zc-text whitespace-pre-wrap">
                          {approval.decisionNotes}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ---- Sidebar (right 1/3) ---- */}
            <div className="grid content-start gap-6">
              {/* Action Card (only when SUBMITTED) */}
              {approval.status === "SUBMITTED" && (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Actions</CardTitle>
                    <CardDescription className="text-sm">
                      Review and decide on this request.
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-4">
                    <div className="grid gap-3">
                      <Button
                        variant="success"
                        className="w-full gap-2"
                        onClick={() => setApproveOpen(true)}
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full gap-2"
                        onClick={() => {
                          setRejectNotes("");
                          setRejectOpen(true);
                        }}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timeline Card */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="relative space-y-4">
                    {/* Created event */}
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-900/20">
                          <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </span>
                        {(approval.status !== "SUBMITTED" || true) && (
                          <div className="mt-1 w-px flex-1 bg-zc-border" />
                        )}
                      </div>
                      <div className="min-w-0 pb-4">
                        <div className="text-sm font-medium text-zc-text">
                          Request Submitted
                        </div>
                        <div className="mt-0.5 text-xs text-zc-muted">
                          {fmtDateTime(approval.createdAt)}
                        </div>
                        <div className="mt-0.5 text-xs text-zc-muted">
                          by{" "}
                          {approval.requestedByName ||
                            approval.requestedById.slice(0, 8) + "..."}
                        </div>
                      </div>
                    </div>

                    {/* Decision event */}
                    {approval.status !== "SUBMITTED" ? (
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              "grid h-7 w-7 shrink-0 place-items-center rounded-full border",
                              approval.status === "APPROVED"
                                ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-900/20"
                                : "border-red-200 bg-red-50/70 dark:border-red-900/40 dark:bg-red-900/20",
                            )}
                          >
                            {approval.status === "APPROVED" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                            )}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zc-text">
                            {approval.status === "APPROVED"
                              ? "Approved"
                              : "Rejected"}
                          </div>
                          <div className="mt-0.5 text-xs text-zc-muted">
                            {fmtDateTime(approval.decidedAt)}
                          </div>
                          <div className="mt-0.5 text-xs text-zc-muted">
                            by{" "}
                            {approval.decidedByName ||
                              (approval.decidedById
                                ? approval.decidedById.slice(0, 8) + "..."
                                : "-")}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-900/20">
                            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zc-text">
                            Awaiting Decision
                          </div>
                          <div className="mt-0.5 text-xs text-zc-muted">
                            Pending review
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Metadata Card */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Metadata</CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="grid gap-3 pt-4 text-sm">
                  <div>
                    <div className="text-xs font-medium text-zc-muted">ID</div>
                    <div className="mt-0.5 font-mono text-xs">
                      {approval.id}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zc-muted">
                      Last Updated
                    </div>
                    <div className="mt-0.5 text-sm">
                      {fmtDateTime(approval.updatedAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* ---- Approve Confirmation Dialog ---- */}
        <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Approval</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve this change request? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setApproveOpen(false)}
                disabled={approveBusy}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                onClick={handleApprove}
                disabled={approveBusy}
              >
                {approveBusy && (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                )}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- Reject Dialog ---- */}
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Change Request</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this change request.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="reject-notes">Decision Notes</Label>
                <Textarea
                  id="reject-notes"
                  placeholder="Reason for rejection..."
                  rows={4}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRejectOpen(false)}
                disabled={rejectBusy}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectBusy}
              >
                {rejectBusy && (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                )}
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </RequirePerm>
    </AppShell>
  );
}
