"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Send,
  Power,
  PowerOff,
  FileText,
  RefreshCw,
  ExternalLink,
  Loader2,
} from "lucide-react";

import type {
  OtGoLiveCheckRow,
  OtReviewRecordRow,
  OtSuiteRow,
  OtDecommissionType,
  OtReviewAction,
} from "../../_shared/types";
import {
  SuiteContextBar,
  OtPageHeader,
  StatBox,
  EmptyRow,
  ErrorAlert,
  NoBranchGuard,
  OnboardingCallout,
  SectionHeader,
} from "../../_shared/components";
import { DECOMMISSION_TYPES } from "../../_shared/constants";
import { humanize } from "../../_shared/utils";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

/* =========================================================
   EPIC 10 — Validation & Activation Page
   OTS-059  Go-Live Validation
   OTS-060  Submit for Review
   OTS-061  Review Suite (Approve/Reject/Conditional)
   OTS-062  Activate Suite
   OTS-063  Decommission Suite
   OTS-064  Completion Report
   ========================================================= */

type GoLiveResult = {
  score: number;
  checks: OtGoLiveCheckRow[];
  blockerCount: number;
  warningCount: number;
  passedCount: number;
};

export default function ValidationPage(props: {
  params: Promise<{ suiteId: string }>;
}) {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Validation & Activation">
      <RequirePerm perm="ot.validation.read">
        {branchId ? (
          <ValidationContent branchId={branchId} params={props.params} />
        ) : (
          <NoBranchGuard />
        )}
      </RequirePerm>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Main content                                                       */
/* ------------------------------------------------------------------ */

function ValidationContent({
  branchId,
  params,
}: {
  branchId: string;
  params: Promise<{ suiteId: string }>;
}) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();

  /* ---- state ---- */
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [suite, setSuite] = React.useState<OtSuiteRow | null>(null);
  const [goLive, setGoLive] = React.useState<GoLiveResult | null>(null);
  const [reviews, setReviews] = React.useState<OtReviewRecordRow[]>([]);
  const [busy, setBusy] = React.useState(false);

  /* dialogs */
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [activateOpen, setActivateOpen] = React.useState(false);
  const [decommissionOpen, setDecommissionOpen] = React.useState(false);

  /* review form */
  const [reviewAction, setReviewAction] = React.useState<OtReviewAction>("APPROVED");
  const [reviewComments, setReviewComments] = React.useState("");

  /* decommission form */
  const [decommType, setDecommType] = React.useState<OtDecommissionType>("TEMPORARY");
  const [decommReason, setDecommReason] = React.useState("");

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "ot-validation" });

  const qs = `?branchId=${encodeURIComponent(branchId)}`;
  const baseUrl = `/api/infrastructure/ot`;

  /* ---- data loading ---- */
  const loadAll = React.useCallback(
    async (showToast = false) => {
      setError(null);
      setLoading(true);
      try {
        const [suiteRes, goLiveRes, reviewsRes] = await Promise.allSettled([
          apiFetch<OtSuiteRow>(`${baseUrl}/suites/${suiteId}${qs}`),
          apiFetch<GoLiveResult>(
            `${baseUrl}/validation/suites/${suiteId}/go-live${qs}`,
          ),
          apiFetch<OtReviewRecordRow[]>(
            `${baseUrl}/validation/suites/${suiteId}/review-history${qs}`,
          ),
        ]);

        if (suiteRes.status === "fulfilled") setSuite(suiteRes.value);
        else setError("Failed to load suite information.");

        if (goLiveRes.status === "fulfilled") setGoLive(goLiveRes.value);
        if (reviewsRes.status === "fulfilled")
          setReviews(Array.isArray(reviewsRes.value) ? reviewsRes.value : []);

        if (showToast) toast({ title: "Validation data refreshed" });
      } catch (e: any) {
        setError(e?.message || "Failed to load validation data.");
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, suiteId, qs, toast],
  );

  React.useEffect(() => {
    void loadAll(false);
  }, [loadAll]);

  /* ---- Run Validation (re-fetch go-live) ---- */
  const runValidation = async () => {
    setBusy(true);
    try {
      const result = await apiFetch<GoLiveResult>(
        `${baseUrl}/validation/suites/${suiteId}/go-live${qs}`,
      );
      setGoLive(result);
      toast({ title: "Validation complete", description: `Score: ${result.score}%` });
    } catch (e: any) {
      toast({ title: "Validation failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /* ---- OTS-060  Submit for Review ---- */
  const submitForReview = async () => {
    setBusy(true);
    try {
      await apiFetch(`${baseUrl}/validation/suites/${suiteId}/submit-review${qs}`, {
        method: "POST",
      });
      toast({ title: "Submitted for review" });
      setSubmitOpen(false);
      void loadAll(false);
    } catch (e: any) {
      toast({ title: "Submit failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /* ---- OTS-061  Review Suite ---- */
  const reviewSuite = async () => {
    setBusy(true);
    try {
      await apiFetch(`${baseUrl}/validation/suites/${suiteId}/review${qs}`, {
        method: "POST",
        body: {
          action: reviewAction,
          comments: reviewComments || undefined,
        },
      });
      toast({ title: `Suite ${humanize(reviewAction).toLowerCase()}` });
      setReviewOpen(false);
      setReviewComments("");
      void loadAll(false);
    } catch (e: any) {
      toast({ title: "Review failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /* ---- OTS-062  Activate Suite ---- */
  const activateSuite = async () => {
    setBusy(true);
    try {
      await apiFetch(`${baseUrl}/validation/suites/${suiteId}/activate${qs}`, {
        method: "POST",
      });
      toast({ title: "Suite activated successfully" });
      setActivateOpen(false);
      void loadAll(false);
    } catch (e: any) {
      toast({ title: "Activation failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /* ---- OTS-063  Decommission Suite ---- */
  const decommissionSuite = async () => {
    setBusy(true);
    try {
      await apiFetch(`${baseUrl}/validation/suites/${suiteId}/decommission${qs}`, {
        method: "POST",
        body: {
          type: decommType,
          reason: decommReason || undefined,
        },
      });
      toast({
        title:
          decommType === "TEMPORARY"
            ? "Suite placed under maintenance"
            : "Suite decommissioned",
      });
      setDecommissionOpen(false);
      setDecommReason("");
      void loadAll(false);
    } catch (e: any) {
      toast({ title: "Decommission failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /* ---- OTS-064  Completion Report ---- */
  const downloadReport = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `${baseUrl}/validation/suites/${suiteId}/completion-report${qs}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ot-suite-${suite?.code ?? suiteId}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Report downloaded" });
    } catch (e: any) {
      toast({ title: "Report generation failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /* ---- derived ---- */
  const status = suite?.status;
  const blockers = goLive?.checks.filter((c) => c.severity === "BLOCKER") ?? [];
  const warnings = goLive?.checks.filter((c) => c.severity === "WARNING") ?? [];
  const totalChecks = goLive?.checks.length ?? 0;
  const passedChecks = goLive?.passedCount ?? 0;
  const hasBlockersFailing = blockers.some((c) => !c.passed);

  const canSubmitForReview = status === "DRAFT";
  const canReview = status === "IN_REVIEW";
  const canActivate = status === "VALIDATED" && !hasBlockersFailing;
  const canDecommission =
    status === "ACTIVE" || status === "UNDER_MAINTENANCE" || status === "VALIDATED";

  return (
    <div className="grid gap-6">
      {/* 1. Suite Context Bar */}
      <SuiteContextBar
        suiteId={suiteId}
        suiteName={suite?.name}
        suiteCode={suite?.code}
        suiteStatus={suite?.status}
      />

      {/* 2. Page Header */}
      <OtPageHeader
        icon={<ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        title="Validation & Activation"
        description="Run go-live checks, submit for review, activate, or decommission this OT suite."
        loading={loading}
        onRefresh={() => void loadAll(true)}
      />

      <ErrorAlert message={error} />
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* 3. Go-Live Validator  (OTS-059) */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Go-Live Validation</CardTitle>
            <Button
              variant="outline"
              className="gap-2 px-5"
              onClick={runValidation}
              disabled={busy || loading}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Run Validation
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {/* Score summary */}
          <div className="mb-6 grid gap-3 md:grid-cols-4">
            <StatBox
              label="Validation Score"
              value={goLive ? `${goLive.score}%` : "\u2014"}
              color={
                (goLive?.score ?? 0) >= 90
                  ? "emerald"
                  : (goLive?.score ?? 0) >= 60
                    ? "amber"
                    : "rose"
              }
              detail={
                goLive
                  ? `${passedChecks}/${totalChecks} checks passed`
                  : "Run validation to see results"
              }
            />
            <StatBox
              label="Passed"
              value={goLive?.passedCount ?? "\u2014"}
              color="emerald"
            />
            <StatBox
              label="Blockers"
              value={goLive?.blockerCount ?? "\u2014"}
              color="rose"
              detail="Must fix before activation"
            />
            <StatBox
              label="Warnings"
              value={goLive?.warningCount ?? "\u2014"}
              color="amber"
              detail="Recommended to fix"
            />
          </div>

          {/* Check list */}
          {goLive && goLive.checks.length > 0 ? (
            <div className="space-y-4">
              {/* Blockers first */}
              {blockers.length > 0 && (
                <div>
                  <SectionHeader title="Blocker Checks" count={blockers.length} />
                  <div className="mt-2 space-y-1">
                    {blockers.map((check) => (
                      <CheckRow
                        key={check.code}
                        check={check}
                        suiteId={suiteId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div>
                  <SectionHeader title="Warning Checks" count={warnings.length} />
                  <div className="mt-2 space-y-1">
                    {warnings.map((check) => (
                      <CheckRow
                        key={check.code}
                        check={check}
                        suiteId={suiteId}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : !loading ? (
            <div className="py-10 text-center text-sm text-zc-muted">
              No validation results yet. Click &quot;Run Validation&quot; to check
              readiness.
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 4. Action Buttons Section */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Suite Actions</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {/* OTS-060  Submit for Review */}
            <Button
              variant="outline"
              className="gap-2"
              disabled={!canSubmitForReview || busy}
              onClick={() => setSubmitOpen(true)}
            >
              <Send className="h-4 w-4" />
              Submit for Review
            </Button>

            {/* OTS-061  Review (Approve / Reject / Conditional) */}
            <Button
              variant="outline"
              className="gap-2"
              disabled={!canReview || busy}
              onClick={() => setReviewOpen(true)}
            >
              <ShieldCheck className="h-4 w-4" />
              Review Suite
            </Button>

            {/* OTS-062  Activate */}
            <Button
              variant="primary"
              className="gap-2"
              disabled={!canActivate || busy}
              onClick={() => setActivateOpen(true)}
            >
              <Power className="h-4 w-4" />
              Activate Suite
            </Button>

            {/* OTS-063  Decommission */}
            <Button
              variant="destructive"
              className="gap-2"
              disabled={!canDecommission || busy}
              onClick={() => setDecommissionOpen(true)}
            >
              <PowerOff className="h-4 w-4" />
              Decommission
            </Button>

            {/* OTS-064  Generate Report */}
            <Button
              variant="outline"
              className="gap-2"
              disabled={busy}
              onClick={downloadReport}
            >
              <FileText className="h-4 w-4" />
              Generate Report
            </Button>
          </div>

          {/* Status helpers */}
          {status && (
            <div className="mt-4 text-xs text-zc-muted">
              Current status:{" "}
              <Badge variant="outline" className="text-[10px]">
                {status.replace(/_/g, " ")}
              </Badge>
              {status === "DRAFT" && " \u2014 Submit for review to begin the approval process."}
              {status === "IN_REVIEW" && " \u2014 Awaiting reviewer action."}
              {status === "VALIDATED" && !hasBlockersFailing && " \u2014 Ready for activation."}
              {status === "VALIDATED" && hasBlockersFailing && " \u2014 Fix blockers before activation."}
              {status === "ACTIVE" && " \u2014 Suite is live and operational."}
              {status === "UNDER_MAINTENANCE" && " \u2014 Temporarily decommissioned."}
              {status === "DECOMMISSIONED" && " \u2014 Permanently decommissioned."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviewer Panel (shown inline when IN_REVIEW) */}
      {status === "IN_REVIEW" && (
        <Card className="overflow-hidden border-blue-200/60 dark:border-blue-900/40">
          <CardHeader className="pb-4 bg-blue-50/40 dark:bg-blue-900/10">
            <CardTitle className="text-base text-blue-700 dark:text-blue-300">
              Reviewer Action Required
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <p className="mb-4 text-sm text-zc-muted">
              This suite has been submitted for review. As a reviewer, select an action
              below and optionally provide comments.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Decision
                </label>
                <Select
                  value={reviewAction}
                  onValueChange={(v) => setReviewAction(v as OtReviewAction)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">Approve</SelectItem>
                    <SelectItem value="REJECTED">Reject</SelectItem>
                    <SelectItem value="CONDITIONAL">Conditional Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  Comments
                </label>
                <Textarea
                  placeholder="Optional reviewer comments..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="primary"
                className="gap-2"
                disabled={busy}
                onClick={reviewSuite}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Review History Table (OTS-061) */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <SectionHeader title="Review History" count={reviews.length} />
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/20 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">
                  <th className="px-4 py-3">Reviewer</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Comments</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zc-border">
                {loading ? (
                  <EmptyRow colSpan={4} loading />
                ) : reviews.length === 0 ? (
                  <EmptyRow colSpan={4} message="No review records yet." />
                ) : (
                  reviews.map((r) => (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-zc-panel/15"
                    >
                      <td className="px-4 py-3 font-medium text-zc-text">
                        {r.reviewerId}
                      </td>
                      <td className="px-4 py-3">
                        <ReviewActionBadge action={r.action} />
                      </td>
                      <td className="px-4 py-3 text-zc-muted">
                        {r.comments || "\u2014"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zc-muted">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 6. Onboarding Callout */}
      <OnboardingCallout
        title="Activation Workflow"
        description="Draft \u2192 Submit for Review \u2192 Reviewer Approves \u2192 Activate. All blocker checks must pass before activation. Use Decommission to temporarily or permanently take a suite offline."
      />

      {/* ---- Dialogs ---- */}

      {/* Submit for Review Confirmation (OTS-060) */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for Review</DialogTitle>
            <DialogDescription>
              This will change the suite status from Draft to In Review. Reviewers
              will be notified to inspect and approve the configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Ensure all configuration sections are complete before submitting.
                Incomplete setups may be rejected during review.
              </div>
            </div>
          </div>
          {goLive && goLive.blockerCount > 0 && (
            <div className="rounded-lg border border-rose-200/70 bg-rose-50/50 p-3 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-200">
              <div className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  {goLive.blockerCount} blocker check(s) are currently failing.
                  Consider fixing them before submitting.
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={submitForReview}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog (OTS-061) */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Suite</DialogTitle>
            <DialogDescription>
              Select an action and optionally provide comments for the review record.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                Decision <span className="text-rose-600">*</span>
              </label>
              <Select
                value={reviewAction}
                onValueChange={(v) => setReviewAction(v as OtReviewAction)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Approve</SelectItem>
                  <SelectItem value="REJECTED">Reject</SelectItem>
                  <SelectItem value="CONDITIONAL">Conditional Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                Comments
              </label>
              <Textarea
                placeholder="Optional comments..."
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={reviewSuite}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Confirmation (OTS-062) */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Suite</DialogTitle>
            <DialogDescription>
              This will set the suite status to Active, making it available for
              surgical scheduling and operations.
            </DialogDescription>
          </DialogHeader>
          {hasBlockersFailing && (
            <div className="rounded-lg border border-rose-200/70 bg-rose-50/50 p-3 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-200">
              <div className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  Cannot activate: there are failing blocker checks. Please fix all
                  blockers before activating.
                </div>
              </div>
            </div>
          )}
          {!hasBlockersFailing && (
            <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  All blocker checks have passed. The suite is ready for activation.
                  {goLive && goLive.warningCount > 0 && (
                    <span className="block mt-1 text-amber-700 dark:text-amber-300">
                      Note: {goLive.warningCount} warning(s) remain. These are not
                      blocking but recommended to address.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={activateSuite}
              disabled={busy || hasBlockersFailing}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Activation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decommission Dialog (OTS-063) */}
      <Dialog open={decommissionOpen} onOpenChange={setDecommissionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decommission Suite</DialogTitle>
            <DialogDescription>
              Take this OT suite offline temporarily (maintenance) or permanently.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                Type <span className="text-rose-600">*</span>
              </label>
              <Select
                value={decommType}
                onValueChange={(v) => setDecommType(v as OtDecommissionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECOMMISSION_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
                Reason
              </label>
              <Textarea
                placeholder="Reason for decommissioning..."
                value={decommReason}
                onChange={(e) => setDecommReason(e.target.value)}
                rows={3}
              />
            </div>
            {decommType === "PERMANENT" && (
              <div className="rounded-lg border border-rose-200/70 bg-rose-50/50 p-3 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    Permanent decommission cannot be easily reversed. The suite will
                    be removed from scheduling and all active bookings may need to be
                    reassigned.
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecommissionOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={decommissionSuite}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Decommission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Check Row                                                          */
/* ------------------------------------------------------------------ */

function CheckRow({
  check,
  suiteId,
}: {
  check: OtGoLiveCheckRow;
  suiteId: string;
}) {
  const icon = check.passed ? (
    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
  ) : check.severity === "BLOCKER" ? (
    <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
  ) : (
    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
  );

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
        check.passed
          ? "border-emerald-200/40 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-900/5"
          : check.severity === "BLOCKER"
            ? "border-rose-200/40 bg-rose-50/30 dark:border-rose-900/30 dark:bg-rose-900/5"
            : "border-amber-200/40 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-900/5",
      )}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zc-muted">{check.code}</span>
          <span className="font-medium text-zc-text">{check.label}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px]",
              check.severity === "BLOCKER"
                ? "border-rose-200/70 text-rose-700 dark:border-rose-900/40 dark:text-rose-300"
                : "border-amber-200/70 text-amber-700 dark:border-amber-900/40 dark:text-amber-300",
            )}
          >
            {check.severity}
          </Badge>
        </div>
        {check.detail && (
          <div className="mt-1 text-xs text-zc-muted">{check.detail}</div>
        )}
      </div>
      {check.fixRoute && (
        <Link
          href={`/infrastructure/ot/${suiteId}/${check.fixRoute}` as any}
          className="flex items-center gap-1 rounded-md border border-zc-border px-2 py-1 text-xs text-zc-muted transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
        >
          Fix
          <ExternalLink className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review Action Badge                                                */
/* ------------------------------------------------------------------ */

function ReviewActionBadge({ action }: { action: OtReviewAction }) {
  const cls =
    action === "APPROVED"
      ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
      : action === "REJECTED"
        ? "border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200"
        : "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";

  return (
    <Badge variant="outline" className={cn("text-[10px]", cls)}>
      {humanize(action)}
    </Badge>
  );
}
