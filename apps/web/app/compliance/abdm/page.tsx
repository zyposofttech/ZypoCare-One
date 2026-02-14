"use client";

import * as React from "react";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RequirePerm } from "@/components/RequirePerm";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { CompliancePageHead, CompliancePageInsights } from "@/components/copilot/ComplianceHelpInline";
import {
  ArrowRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";

/* --------------------------------- Types --------------------------------- */

type Workspace = {
  id: string;
  name: string;
  branchId: string;
};

type AbdmConfig = {
  id: string;
  status: "NOT_CONFIGURED" | "CONFIGURED" | "TESTED";
  environment: string;
};

type HfrProfile = {
  id: string;
  facilityName: string;
  verificationStatus: "DRAFT" | "SUBMITTED" | "VERIFIED" | "REJECTED";
  hfrId?: string | null;
};

type HprSummary = {
  total: number;
  verified: number;
  unverified: number;
};

/* --------------------------------- Helpers -------------------------------- */

function configStatusText(config: AbdmConfig | null) {
  if (!config) return { label: "Not Configured", color: "red" as const };
  if (config.status === "TESTED") return { label: "Tested", color: "emerald" as const };
  return { label: "Configured", color: "blue" as const };
}

function hfrStatusText(hfr: HfrProfile | null) {
  if (!hfr) return { label: "No Profile", color: "gray" as const };
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "amber" },
    SUBMITTED: { label: "Submitted", color: "blue" },
    VERIFIED: { label: "Verified", color: "emerald" },
    REJECTED: { label: "Rejected", color: "red" },
  };
  return map[hfr.verificationStatus] ?? map.DRAFT;
}

/* --------------------------------- Page ---------------------------------- */

export default function AbdmOverviewPage() {
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [config, setConfig] = React.useState<AbdmConfig | null>(null);
  const [hfr, setHfr] = React.useState<HfrProfile | null>(null);
  const [hprSummary, setHprSummary] = React.useState<HprSummary | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!activeBranchId) return;
    setLoading(true);
    try {
      const data = await apiFetch<Workspace[] | { items: Workspace[] }>(
        `/api/compliance/workspaces?branchId=${activeBranchId}`,
      );
      const workspaces = Array.isArray(data) ? data : (data?.items ?? []);
      const ws = workspaces?.[0];
      if (!ws) {
        setWorkspaceId(null);
        setConfig(null);
        setHfr(null);
        setHprSummary(null);
        return;
      }
      setWorkspaceId(ws.id);

      const [configRes, hfrRes, hprRes] = await Promise.allSettled([
        apiFetch<AbdmConfig>(
          `/api/compliance/abdm/config?workspaceId=${ws.id}`,
        ),
        apiFetch<HfrProfile>(
          `/api/compliance/abdm/hfr?workspaceId=${ws.id}`,
        ),
        apiFetch<HprSummary>(
          `/api/compliance/abdm/hpr/summary?workspaceId=${ws.id}`,
        ),
      ]);

      setConfig(configRes.status === "fulfilled" ? configRes.value : null);
      setHfr(hfrRes.status === "fulfilled" ? hfrRes.value : null);
      setHprSummary(hprRes.status === "fulfilled" ? hprRes.value : null);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to load ABDM data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cfgStatus = configStatusText(config);
  const hfrStatus = hfrStatusText(hfr);

  return (
    <AppShell title="ABDM Configuration">
      <RequirePerm perm="COMPLIANCE_ABDM_CONFIG">
      <div className="grid gap-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Shield className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">ABDM Configuration</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage ABHA integration, Health Facility Registry, and Health Professional Registry.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CompliancePageHead pageId="compliance-abdm" />
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => void fetchData()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </div>

        {/* AI Insights */}
        <CompliancePageInsights pageId="compliance-abdm" />

        {/* ── Guard states ───────────────────────────────────────────── */}
        {!activeBranchId ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-zc-muted">
              <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
              Select a branch to view ABDM configuration.
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
          </div>
        ) : !workspaceId ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-zc-muted">
              <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
              No compliance workspace found for this branch. Create one in{" "}
              <Link href="/compliance/workspaces" className="text-zc-accent hover:underline">
                Workspaces
              </Link>{" "}
              first.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Stat boxes ───────────────────────────────────────── */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">ABHA Status</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                  {cfgStatus.label}
                </div>
                <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  {config ? `Environment: ${config.environment}` : "Not yet configured"}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">HFR Profile</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {hfrStatus.label}
                </div>
                <div className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                  {hfr?.hfrId ? `HFR ID: ${hfr.hfrId}` : "No HFR ID assigned"}
                </div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">HPR Links</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">
                  {hprSummary?.total ?? 0}
                </div>
                <div className="mt-1 text-[11px] text-violet-700/80 dark:text-violet-300/80">
                  Verified: <span className="font-semibold tabular-nums">{hprSummary?.verified ?? 0}</span> | Pending:{" "}
                  <span className="font-semibold tabular-nums">{hprSummary?.unverified ?? 0}</span>
                </div>
              </div>
            </div>

            {/* ── Navigation cards ─────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ABHA Config Card */}
              <Link href="/compliance/abdm/abha" className="group">
                <Card className="h-full transition hover:border-blue-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20">
                        <Shield className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">ABHA Configuration</CardTitle>
                        <CardDescription>API credentials & feature toggles</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-3">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        cfgStatus.color === "red" && "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200",
                        cfgStatus.color === "emerald" && "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
                        cfgStatus.color === "blue" && "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200",
                      )}>
                        {cfgStatus.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-zc-muted transition group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* HFR Profile Card */}
              <Link href="/compliance/abdm/hfr" className="group">
                <Card className="h-full transition hover:border-emerald-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20">
                        <Building2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">HFR Facility Profile</CardTitle>
                        <CardDescription>Health Facility Registry</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-3">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        hfrStatus.color === "amber" && "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
                        hfrStatus.color === "blue" && "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200",
                        hfrStatus.color === "emerald" && "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
                        hfrStatus.color === "red" && "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200",
                        hfrStatus.color === "gray" && "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-900/40 dark:bg-gray-900/20 dark:text-gray-200",
                      )}>
                        {hfrStatus.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-zc-muted transition group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* HPR Links Card */}
              <Link href="/compliance/abdm/hpr" className="group">
                <Card className="h-full transition hover:border-violet-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-900/50 dark:bg-violet-900/20">
                        <UserCheck className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">HPR Professional Links</CardTitle>
                        <CardDescription>Health Professional Registry</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zc-muted">
                        <span className="font-semibold text-zc-text">{hprSummary?.total ?? 0}</span> links
                      </span>
                      <ArrowRight className="h-4 w-4 text-zc-muted transition group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* ── Info callout ─────────────────────────────────────── */}
            <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 text-zc-accent" />
                <div>
                  <p className="text-sm font-medium text-zc-text">ABDM Onboarding Order</p>
                  <p className="mt-1 text-sm text-zc-muted">
                    Complete onboarding in this order: 1) Configure ABHA API credentials and test the connection.
                    2) Register your facility on HFR and obtain a HFR ID.
                    3) Link healthcare professionals via HPR for compliance.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      </RequirePerm>
    </AppShell>
  );
}
