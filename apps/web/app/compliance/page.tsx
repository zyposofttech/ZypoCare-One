"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  RefreshCw,
  Shield,
  ShieldCheck,
} from "lucide-react";

type DashboardData = {
  workspaces: number;
  pendingApprovals: number;
  expiringEvidence: number;
  auditCycles: number;
};

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

        {/* ── Info Callout ── */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="text-sm font-semibold text-zc-text">Recommended Setup Order</div>
          <div className="mt-1 text-sm text-zc-muted">
            Start with Workspaces, then configure ABDM &amp; Government Schemes, upload Evidence documents, set up NABH checklists, and finally review Approvals. Use the Validator to check readiness at any stage.
          </div>
        </div>
      </div>
      </RequirePerm>
    </AppShell>
  );
}
