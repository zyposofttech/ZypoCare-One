"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import { useCopilot } from "@/lib/copilot/CopilotProvider";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { CompliancePageHead, QuickStartBanner } from "@/components/copilot/ComplianceHelpInline";

type DashboardData = {
  workspaces: number;
  pendingApprovals: number;
  expiringEvidence: number;
  auditCycles: number;
};

/* ═══════════════════════════════════════════════════════════════════════════
   Score Gauge — circular progress for area scores
   ═══════════════════════════════════════════════════════════════════════════ */

function ScoreGauge({ label, score }: { label: string; score: number }) {
  const color =
    score >= 80 ? "text-emerald-600 dark:text-emerald-400" :
    score >= 50 ? "text-amber-600 dark:text-amber-400" :
    "text-red-600 dark:text-red-400";

  const ringColor =
    score >= 80 ? "stroke-emerald-500" :
    score >= 50 ? "stroke-amber-500" :
    "stroke-red-500";

  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-zc-border bg-zc-panel/15 p-3">
      <div className="relative h-12 w-12">
        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="3" />
          <circle
            cx="24" cy="24" r="20" fill="none"
            className={ringColor}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold", color)}>
          {score}
        </span>
      </div>
      <span className="text-[10px] font-medium text-zc-muted text-center">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI Health Summary Card
   ═══════════════════════════════════════════════════════════════════════════ */

function ComplianceAIHealthCard() {
  const { complianceHealth, complianceHealthLoading, refreshComplianceHealth } = useCopilot();

  if (!complianceHealth && !complianceHealthLoading) return null;

  const topBlockers = complianceHealth?.topIssues?.filter((i) => i.severity === "BLOCKER") ?? [];
  const topWarnings = complianceHealth?.topIssues?.filter((i) => i.severity === "WARNING") ?? [];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            AI Compliance Summary
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-zc-muted"
            onClick={refreshComplianceHealth}
            disabled={complianceHealthLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", complianceHealthLoading ? "animate-spin" : "")} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          AI-powered compliance analysis: ABDM, Government Schemes, NABH readiness, and evidence coverage.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        {complianceHealthLoading && !complianceHealth ? (
          <div className="grid gap-3">
            <div className="h-20 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ) : complianceHealth ? (
          <div className="grid gap-4">
            {/* Overall status banner */}
            <div
              className={cn(
                "flex items-center justify-between rounded-xl border p-4",
                complianceHealth.overallHealth === "EXCELLENT" || complianceHealth.overallHealth === "GOOD"
                  ? "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-900/15"
                  : complianceHealth.overallHealth === "NEEDS_ATTENTION"
                    ? "border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-900/15"
                    : "border-red-200/60 bg-red-50/40 dark:border-red-900/40 dark:bg-red-900/15"
              )}
            >
              <div className="flex items-center gap-3">
                {complianceHealth.overallHealth === "EXCELLENT" || complianceHealth.overallHealth === "GOOD" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle
                    className={cn(
                      "h-5 w-5",
                      complianceHealth.overallHealth === "NEEDS_ATTENTION"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  />
                )}
                <div>
                  <div className="text-sm font-semibold">
                    {complianceHealth.overallHealth === "EXCELLENT"
                      ? "Excellent"
                      : complianceHealth.overallHealth === "GOOD"
                        ? "Good"
                        : complianceHealth.overallHealth === "NEEDS_ATTENTION"
                          ? "Needs Attention"
                          : "Critical Issues"}
                  </div>
                  <div className="text-xs text-zc-muted">{complianceHealth.summary}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {complianceHealth.complianceScore >= 80 && complianceHealth.totalBlockers === 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    Go-Live Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200/70 bg-red-50/70 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                    <AlertTriangle className="h-3 w-3" />
                    Not Ready
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold",
                    complianceHealth.complianceScore >= 80
                      ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                      : complianceHealth.complianceScore >= 50
                        ? "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200"
                        : "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                  )}
                >
                  Score {complianceHealth.complianceScore}%
                </span>
              </div>
            </div>

            {/* Area scores */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {complianceHealth.areas.abdm && (
                <ScoreGauge label="ABDM" score={complianceHealth.areas.abdm.score} />
              )}
              {complianceHealth.areas.schemes && (
                <ScoreGauge label="Schemes" score={complianceHealth.areas.schemes.score} />
              )}
              {complianceHealth.areas.nabh && (
                <ScoreGauge label="NABH" score={complianceHealth.areas.nabh.score} />
              )}
              {complianceHealth.areas.evidence && (
                <ScoreGauge label="Evidence" score={complianceHealth.areas.evidence.score} />
              )}
            </div>

            {/* Workflow progress bar */}
            <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/30 dark:border-indigo-900/40 dark:bg-indigo-900/10 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                    Setup Progress
                  </span>
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {complianceHealth.workflowProgress}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-indigo-200/60 dark:bg-indigo-900/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${complianceHealth.workflowProgress}%` }}
                />
              </div>
            </div>

            {/* Issue summary */}
            <div className="flex items-center gap-4 text-sm text-zc-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                {complianceHealth.totalBlockers} blocker{complianceHealth.totalBlockers !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                {complianceHealth.totalWarnings} warning{complianceHealth.totalWarnings !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Top issues */}
            {(topBlockers.length > 0 || topWarnings.length > 0) && (
              <div className="rounded-xl border border-zc-border bg-zc-panel/15 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Top Issues</div>
                <div className="mt-2 grid gap-1.5">
                  {topBlockers.slice(0, 4).map((issue) => (
                    <div key={issue.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      <div className="min-w-0">
                        <span className="font-medium text-zc-text">{issue.title}</span>
                        <span className="ml-2 text-xs text-zc-muted">{issue.fixHint}</span>
                      </div>
                    </div>
                  ))}
                  {topWarnings.slice(0, 3).map((issue) => (
                    <div key={issue.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      <div className="min-w-0">
                        <span className="font-medium text-zc-text">{issue.title}</span>
                        <span className="ml-2 text-xs text-zc-muted">{issue.fixHint}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Dashboard Page
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ComplianceDashboardPage() {
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!activeBranchId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<DashboardData>(
        `/api/compliance/dashboard?branchId=${activeBranchId}`,
      );
      setData(res);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load dashboard");
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AppShell title="Compliance & Governance">
      <RequirePerm perm="COMPLIANCE_DASHBOARD_READ">
      <div className="grid gap-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ShieldCheck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Compliance &amp; Governance</div>
              <div className="mt-1 text-sm text-zc-muted">
                Centralized compliance workspace for ABDM, Government Schemes, NABH, and Go-Live readiness.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompliancePageHead pageId="compliance-dashboard" />
            <Button variant="outline" className="px-5 gap-2" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" className="px-5 gap-2" asChild>
              <Link href="/compliance/validator">
                <ShieldCheck className="h-4 w-4" />
                Run Validator
              </Link>
            </Button>
            <Button variant="primary" className="px-5 gap-2" asChild>
              <Link href="/compliance/workspaces">
                <Shield className="h-4 w-4" />
                Workspaces
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* ── Stat Boxes ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Workspaces - blue */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Active Workspaces</div>
            <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
              {loading ? "--" : data?.workspaces ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
              <Link href="/compliance/workspaces" className="inline-flex items-center gap-1 hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Pending Approvals - sky */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
            <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Pending Approvals</div>
            <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">
              {loading ? "--" : data?.pendingApprovals ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-sky-700/80 dark:text-sky-300/80">
              <Link href="/compliance/approvals" className="inline-flex items-center gap-1 hover:underline">
                Review <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Expiring Evidence - amber */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Expiring Evidence (30d)</div>
            <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">
              {loading ? "--" : data?.expiringEvidence ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-300/80">
              <Link href="/compliance/evidence" className="inline-flex items-center gap-1 hover:underline">
                Evidence vault <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Audit Cycles - violet */}
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
            <div className="text-xs font-medium text-violet-600 dark:text-violet-400">Active Audit Cycles</div>
            <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
              {loading ? "--" : data?.auditCycles ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-violet-700/80 dark:text-violet-300/80">
              <Link href="/compliance/nabh/audits" className="inline-flex items-center gap-1 hover:underline">
                View audits <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── AI Compliance Health Summary ── */}
        <ComplianceAIHealthCard />

        <Separator />

        {/* ── Quick Navigation ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* ABDM */}
          <Link href="/compliance/abdm" className="group">
            <Card className="overflow-hidden transition hover:border-blue-300 dark:hover:border-blue-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-900/20">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">ABDM Configuration</CardTitle>
                    <CardDescription>ABHA, HFR, HPR setup</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zc-muted opacity-0 transition group-hover:opacity-100" />
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Government Schemes */}
          <Link href="/compliance/schemes" className="group">
            <Card className="overflow-hidden transition hover:border-emerald-300 dark:hover:border-emerald-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-900/20">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">Government Schemes</CardTitle>
                    <CardDescription>PMJAY, CGHS, ECHS</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zc-muted opacity-0 transition group-hover:opacity-100" />
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* NABH */}
          <Link href="/compliance/nabh" className="group">
            <Card className="overflow-hidden transition hover:border-violet-300 dark:hover:border-violet-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-violet-200 bg-violet-50/70 dark:border-violet-900/50 dark:bg-violet-900/20">
                    <ClipboardCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">NABH Readiness</CardTitle>
                    <CardDescription>6th Edition checklist &amp; audits</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zc-muted opacity-0 transition group-hover:opacity-100" />
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Evidence Vault */}
          <Link href="/compliance/evidence" className="group">
            <Card className="overflow-hidden transition hover:border-amber-300 dark:hover:border-amber-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-900/20">
                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">Evidence Vault</CardTitle>
                    <CardDescription>Upload, link &amp; track documents</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zc-muted opacity-0 transition group-hover:opacity-100" />
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Approvals */}
          <Link href="/compliance/approvals" className="group">
            <Card className="overflow-hidden transition hover:border-rose-300 dark:hover:border-rose-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-900/20">
                    <CheckCircle2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">Approvals</CardTitle>
                    <CardDescription>Maker-checker workflow</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zc-muted opacity-0 transition group-hover:opacity-100" />
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Audit Log */}
          <Link href="/compliance/audit-log" className="group">
            <Card className="overflow-hidden transition hover:border-sky-300 dark:hover:border-sky-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-sky-200 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-900/20">
                    <ClipboardCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">Audit Log</CardTitle>
                    <CardDescription>Immutable compliance trail</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zc-muted opacity-0 transition group-hover:opacity-100" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* ── AI-Powered Quick Start ── */}
        <QuickStartBanner
          title="New to Compliance? AI Help is here!"
          description="The AI Help assistant can guide you through every step of the compliance setup process."
          steps={[
            "Create a Workspace for your branch",
            "Configure ABDM (ABHA, HFR, HPR)",
            "Set up Government Schemes (PMJAY, CGHS, ECHS)",
            "Upload Evidence documents to the vault",
            "Complete the NABH 10-chapter checklist",
            "Run the Validator to check readiness",
          ]}

        />
      </div>
      </RequirePerm>
    </AppShell>
  );
}
