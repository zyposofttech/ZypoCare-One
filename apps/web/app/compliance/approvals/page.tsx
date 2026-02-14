"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RequirePerm } from "@/components/RequirePerm";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { CompliancePageHead, CompliancePageInsights } from "@/components/copilot/ComplianceHelpInline";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type ApprovalStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

type ApprovalRow = {
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
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ----------------------------- Helpers ----------------------------- */

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

/* ----------------------------- Page ----------------------------- */

export default function ApprovalsPage() {
  const { toast } = useToast();
  const { activeBranchId } = useBranchContext();

  const [tab, setTab] = React.useState<"pending" | "history">("pending");
  const [err, setErr] = React.useState<string | null>(null);

  const [pendingRows, setPendingRows] = React.useState<ApprovalRow[]>([]);
  const [historyRows, setHistoryRows] = React.useState<ApprovalRow[]>([]);
  const [loadingPending, setLoadingPending] = React.useState(true);
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  // Approve confirm dialog
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [approveId, setApproveId] = React.useState<string | null>(null);
  const [approveBusy, setApproveBusy] = React.useState(false);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectId, setRejectId] = React.useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = React.useState("");
  const [rejectBusy, setRejectBusy] = React.useState(false);

  // Payload preview dialog
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewPayload, setPreviewPayload] = React.useState<string>("");

  /* ---- Derived stats ---- */

  const totalCount = pendingRows.length + historyRows.length;
  const pendingCount = pendingRows.length;
  const approvedCount = historyRows.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = historyRows.filter((r) => r.status === "REJECTED").length;

  /* ---- Fetch ---- */

  const refreshPending = React.useCallback(async () => {
    setLoadingPending(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      qs.set("status", "SUBMITTED");
      if (activeBranchId) qs.set("branchId", activeBranchId);
      const data = await apiFetch<ApprovalRow[] | { items: ApprovalRow[] }>(
        `/api/compliance/approvals?${qs.toString()}`,
      );
      const rows = Array.isArray(data) ? data : (data?.items ?? []);
      setPendingRows(rows);
    } catch (e) {
      const msg = errorMessage(e, "Failed to load approvals");
      setErr(msg);
      toast({ title: "Error loading pending approvals", description: msg, variant: "destructive" });
    } finally {
      setLoadingPending(false);
    }
  }, [activeBranchId]);

  const refreshHistory = React.useCallback(async () => {
    setLoadingHistory(true);
    try {
      const qs = new URLSearchParams();
      if (activeBranchId) qs.set("branchId", activeBranchId);
      const data = await apiFetch<ApprovalRow[] | { items: ApprovalRow[] }>(
        `/api/compliance/approvals?${qs.toString()}`,
      );
      const rows = Array.isArray(data) ? data : (data?.items ?? []);
      setHistoryRows(rows);
    } catch (e) {
      toast({
        title: "Error loading approval history",
        description: errorMessage(e, "Failed to load approval history"),
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [activeBranchId]);

  React.useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  React.useEffect(() => {
    if (tab === "history") refreshHistory();
  }, [tab, refreshHistory]);

  function refreshAll() {
    refreshPending();
    if (tab === "history") refreshHistory();
  }

  /* ---- Approve ---- */

  function openApprove(id: string) {
    setApproveId(id);
    setApproveOpen(true);
  }

  async function handleApprove() {
    if (!approveId) return;
    setApproveBusy(true);
    try {
      await apiFetch(`/api/compliance/approvals/${approveId}/decide`, {
        method: "POST",
        body: { decision: "APPROVED", decisionNotes: "" },
      });
      toast({ title: "Approval granted" });
      setApproveOpen(false);
      refreshPending();
      if (tab === "history") refreshHistory();
    } catch (e) {
      toast({ title: "Error", description: errorMessage(e, "Failed to approve"), variant: "destructive" });
    } finally {
      setApproveBusy(false);
    }
  }

  /* ---- Reject ---- */

  function openReject(id: string) {
    setRejectId(id);
    setRejectNotes("");
    setRejectOpen(true);
  }

  async function handleReject() {
    if (!rejectId) return;
    if (!rejectNotes.trim()) {
      toast({ title: "Validation", description: "Please provide rejection notes", variant: "destructive" });
      return;
    }
    setRejectBusy(true);
    try {
      await apiFetch(`/api/compliance/approvals/${rejectId}/decide`, {
        method: "POST",
        body: { decision: "REJECTED", decisionNotes: rejectNotes.trim() },
      });
      toast({ title: "Approval rejected" });
      setRejectOpen(false);
      refreshPending();
      if (tab === "history") refreshHistory();
    } catch (e) {
      toast({ title: "Error", description: errorMessage(e, "Failed to reject"), variant: "destructive" });
    } finally {
      setRejectBusy(false);
    }
  }

  /* ---- Preview Payload ---- */

  function openPreview(payload: Record<string, unknown> | null) {
    setPreviewPayload(payload ? JSON.stringify(payload, null, 2) : "No payload");
    setPreviewOpen(true);
  }

  /* ---- Status badge ---- */

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

  /* ---- Render Table ---- */

  function renderTable(data: ApprovalRow[], isLoading: boolean, showActions: boolean) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{showActions ? "Pending Approvals" : "Approval History"}</CardTitle>
          <CardDescription className="text-sm">
            {showActions ? "Change requests awaiting review." : "Completed approval decisions."}
          </CardDescription>
        </CardHeader>
        <Separator />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zc-panel/20 text-xs text-zc-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Change Type</th>
                <th className="px-4 py-3 text-left font-semibold">Entity Type</th>
                <th className="px-4 py-3 text-left font-semibold">Requested By</th>
                <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Payload</th>
                {showActions ? (
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                ) : (
                  <th className="px-4 py-3 text-left font-semibold">Decision Notes</th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zc-muted" />
                  </td>
                </tr>
              ) : !data.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zc-muted">
                    {showActions ? "No pending approvals." : "No approval history found."}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="border-t border-zc-border hover:bg-zc-panel/20">
                    <td className="px-4 py-3 font-medium text-zc-text">{row.changeType}</td>
                    <td className="px-4 py-3 text-zc-muted">{row.entityType}</td>
                    <td className="px-4 py-3 text-zc-text">
                      {row.requestedByName || row.requestedById.slice(0, 8) + "..."}
                    </td>
                    <td className="px-4 py-3 text-zc-muted">{fmtDateTime(row.createdAt)}</td>
                    <td className="px-4 py-3">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openPreview(row.payloadDraft)}>
                        View
                      </Button>
                    </td>
                    {showActions ? (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="success"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => openApprove(row.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => openReject(row.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    ) : (
                      <td className="px-4 py-3 max-w-[200px] truncate text-xs text-zc-muted">
                        {row.decisionNotes || "-"}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  /* ---- Page Render ---- */

  return (
    <AppShell title="Compliance Approvals">
      <RequirePerm perm="COMPLIANCE_APPROVAL_READ">
      <div className="grid gap-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <CheckCircle2 className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Compliance Approvals</div>
              <div className="mt-1 text-sm text-zc-muted">
                Review and manage compliance change requests (maker-checker workflow).
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompliancePageHead pageId="compliance-approvals" />
            <Button variant="outline" className="px-5 gap-2" onClick={refreshAll} disabled={loadingPending}>
              <RefreshCw className={cn("h-4 w-4", loadingPending && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* AI Insights */}
        <CompliancePageInsights pageId="compliance-approvals" />

        {/* ── Error banner ── */}
        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* ── Stat Boxes ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Requests</div>
            <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totalCount}</div>
            <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">All change requests</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending</div>
            <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{pendingCount}</div>
            <div className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-300/80">Awaiting review</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Approved</div>
            <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{approvedCount}</div>
            <div className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">Changes accepted</div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
            <div className="text-xs font-medium text-rose-600 dark:text-rose-400">Rejected</div>
            <div className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-300">{rejectedCount}</div>
            <div className="mt-1 text-[11px] text-rose-700/80 dark:text-rose-300/80">Changes declined</div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "history")}>
          <TabsList
            className={cn(
              "h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1",
            )}
          >
            <TabsTrigger
              value="pending"
              className={cn(
                "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
              )}
            >
              <Clock className="mr-2 h-4 w-4" />
              Pending
              {pendingRows.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                  {pendingRows.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className={cn(
                "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
              )}
            >
              <History className="mr-2 h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {renderTable(pendingRows, loadingPending, true)}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {renderTable(historyRows, loadingHistory, false)}
          </TabsContent>
        </Tabs>

        {/* ── Info Callout ── */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="text-sm font-semibold text-zc-text">Maker-Checker Workflow</div>
          <div className="mt-1 text-sm text-zc-muted">
            All compliance configuration changes require approval before taking effect. Pending requests must be reviewed and either approved or rejected with notes.
          </div>
        </div>
      </div>

      {/* ── Approve Confirmation Dialog ── */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this change request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={approveBusy}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleApprove} disabled={approveBusy}>
              {approveBusy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ── */}
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
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejectBusy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectBusy}>
              {rejectBusy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Payload Preview Dialog ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payload Preview</DialogTitle>
            <DialogDescription>Draft payload for this change request.</DialogDescription>
          </DialogHeader>

          <pre className="rounded-xl border border-zc-border bg-zc-panel/30 p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap text-zc-text">
            {previewPayload}
          </pre>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </RequirePerm>
    </AppShell>
  );
}
