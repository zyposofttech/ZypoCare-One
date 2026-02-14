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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import { IconShield } from "@/components/icons";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type GapSeverity = "BLOCKING" | "WARNING";

type Gap = {
  area: string;
  severity: GapSeverity;
  message: string;
  entityType: string;
  entityId: string;
};

type CategoryScore = {
  label: string;
  weight: string;
  score: number;
  maxScore: number;
  color: string;
  borderColor: string;
  bgColor: string;
  icon: React.ReactNode;
};

type ValidationResult = {
  score: number;
  maxScore: number;
  percentage: number;
  gaps: Gap[];
  categories?: {
    nabh?: { score: number; maxScore: number };
    schemes?: { score: number; maxScore: number };
    abdm?: { score: number; maxScore: number };
    evidence?: { score: number; maxScore: number };
  };
};

/* ----------------------------- Helpers ----------------------------- */

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function scoreColor(pct: number): string {
  if (pct >= 80) return "text-green-600";
  if (pct >= 50) return "text-amber-500";
  return "text-red-600";
}

function scoreTrackColor(pct: number): string {
  if (pct >= 80) return "stroke-green-500";
  if (pct >= 50) return "stroke-amber-500";
  return "stroke-red-500";
}

const GAP_AREAS = ["All", "ABDM", "Schemes", "NABH", "Evidence"] as const;
type GapAreaFilter = (typeof GAP_AREAS)[number];

const AREA_LINK_MAP: Record<string, string> = {
  ABDM: "/compliance/abdm",
  Schemes: "/compliance/schemes",
  NABH: "/compliance/nabh",
  Evidence: "/compliance/evidence",
};

/* ----------------------------- Score Gauge ----------------------------- */

function ScoreGauge({
  percentage,
  score,
  maxScore,
}: {
  percentage: number;
  score: number;
  maxScore: number;
}) {
  const radius = 80;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-48 w-48">
        <svg className="h-48 w-48 -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={scoreTrackColor(percentage)}
            style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-4xl font-bold", scoreColor(percentage))}>
            {Math.round(percentage)}%
          </span>
          <span className="mt-1 text-sm text-zc-muted">
            {score} / {maxScore} pts
          </span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function ValidatorPage() {
  const { toast } = useToast();
  const { activeBranchId } = useBranchContext();

  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ValidationResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  // Filter state
  const [severityFilter, setSeverityFilter] = React.useState<
    "All" | "BLOCKING" | "WARNING"
  >("All");
  const [areaFilter, setAreaFilter] = React.useState<GapAreaFilter>("All");

  /* ---- Resolve workspaceId from branch ---- */

  React.useEffect(() => {
    if (!activeBranchId) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiFetch<any[] | { items: any[] }>(
          "/api/compliance/workspaces?branchId=" + activeBranchId,
        );
        const rows = Array.isArray(resp) ? resp : resp?.items ?? [];
        if (!cancelled && rows[0]) setWorkspaceId(rows[0].id);
      } catch {
        // workspace resolution failed – leave null
      }
    })();
    return () => { cancelled = true; };
  }, [activeBranchId]);

  /* ---- Load cached results ---- */

  const loadDashboard = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await apiFetch<ValidationResult>(
        `/api/compliance/validator/dashboard?workspaceId=${workspaceId}`,
      );
      setResult(res);
    } catch {
      // No cached results yet - that's OK
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ---- Run Validation ---- */

  async function handleRunValidation() {
    if (!workspaceId) {
      toast({
        title: "Workspace Required",
        description: "No workspace found for this branch. Please select a branch with a compliance workspace.",
        variant: "destructive",
      });
      return;
    }

    setRunning(true);
    try {
      const res = await apiFetch<ValidationResult>(
        `/api/compliance/validator/run`,
        { method: "POST", body: { workspaceId } },
      );
      setResult(res);
      toast({ title: "Validation complete" });
    } catch (e) {
      toast({
        title: "Validation failed",
        description: errorMessage(e, "Failed to run validation"),
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  }

  /* ---- Export ---- */

  async function handleExport() {
    if (!workspaceId) {
      toast({
        title: "Workspace Required",
        description: "No workspace found for this branch. Please select a branch with a compliance workspace.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const qs = new URLSearchParams();
      qs.set("workspaceId", workspaceId);

      const response = await fetch(
        `/api/compliance/validator/export-pack?${qs.toString()}`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({ title: "Export downloaded" });
    } catch (e) {
      toast({
        title: "Export failed",
        description: errorMessage(e, "Failed to export compliance pack"),
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  /* ---- Derived data ---- */

  const categoryCards: CategoryScore[] = React.useMemo(() => {
    const cats = result?.categories;
    return [
      {
        label: "NABH Readiness",
        weight: "40%",
        score: cats?.nabh?.score ?? 0,
        maxScore: cats?.nabh?.maxScore ?? 0,
        color: "text-purple-700 dark:text-purple-400",
        borderColor:
          "border-purple-200 dark:border-purple-900/50",
        bgColor:
          "bg-purple-50/50 dark:bg-purple-900/10",
        icon: <ShieldCheck className="h-5 w-5 text-purple-600" />,
      },
      {
        label: "Government Schemes",
        weight: "25%",
        score: cats?.schemes?.score ?? 0,
        maxScore: cats?.schemes?.maxScore ?? 0,
        color: "text-green-700 dark:text-green-400",
        borderColor:
          "border-green-200 dark:border-green-900/50",
        bgColor:
          "bg-green-50/50 dark:bg-green-900/10",
        icon: <Shield className="h-5 w-5 text-green-600" />,
      },
      {
        label: "ABDM Configuration",
        weight: "20%",
        score: cats?.abdm?.score ?? 0,
        maxScore: cats?.abdm?.maxScore ?? 0,
        color: "text-blue-700 dark:text-blue-400",
        borderColor:
          "border-blue-200 dark:border-blue-900/50",
        bgColor: "bg-blue-50/50 dark:bg-blue-900/10",
        icon: <Shield className="h-5 w-5 text-blue-600" />,
      },
      {
        label: "Evidence Completeness",
        weight: "15%",
        score: cats?.evidence?.score ?? 0,
        maxScore: cats?.evidence?.maxScore ?? 0,
        color: "text-amber-700 dark:text-amber-400",
        borderColor:
          "border-amber-200 dark:border-amber-900/50",
        bgColor:
          "bg-amber-50/50 dark:bg-amber-900/10",
        icon: <CheckCircle2 className="h-5 w-5 text-amber-600" />,
      },
    ];
  }, [result]);

  const filteredGaps = React.useMemo(() => {
    if (!result?.gaps) return [];
    let gaps = result.gaps;
    if (severityFilter !== "All") {
      gaps = gaps.filter((g) => g.severity === severityFilter);
    }
    if (areaFilter !== "All") {
      gaps = gaps.filter((g) => g.area === areaFilter);
    }
    return gaps;
  }, [result, severityFilter, areaFilter]);

  const gapsByArea = React.useMemo(() => {
    const grouped: Record<string, Gap[]> = {};
    for (const gap of filteredGaps) {
      if (!grouped[gap.area]) grouped[gap.area] = [];
      grouped[gap.area].push(gap);
    }
    return grouped;
  }, [filteredGaps]);

  const blockingCount =
    result?.gaps?.filter((g) => g.severity === "BLOCKING").length ?? 0;
  const warningCount =
    result?.gaps?.filter((g) => g.severity === "WARNING").length ?? 0;

  /* ---- Render ---- */

  return (
    <AppShell title="Go-Live Validator">
      <RequirePerm perm="COMPLIANCE_VALIDATOR_RUN">
      <div className="grid gap-6">
        {/* ---- Header ---- */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <IconShield className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                Go-Live Validator
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Run compliance checks and assess readiness for go-live across
                ABDM, Government Schemes, NABH, and Evidence.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || !result}
            >
              {exporting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Export Pack
            </Button>
            <Button size="sm" onClick={handleRunValidation} disabled={running}>
              {running ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              Run Validation
            </Button>
          </div>
        </div>

        {/* ---- Workspace selector row ---- */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="val-ws" className="text-xs text-zc-muted">
              Workspace ID (auto-resolved)
            </Label>
            <Input
              id="val-ws"
              placeholder="Resolving workspace..."
              className="w-64"
              value={workspaceId ?? ""}
              onChange={(e) => setWorkspaceId(e.target.value || null)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadDashboard}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* ---- Loading / Empty / Results ---- */}
        {loading && !result ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
          </div>
        ) : !result ? (
          <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
            <div className="flex flex-col items-center py-8 text-center text-zc-muted">
              <ShieldAlert className="mb-4 h-12 w-12 opacity-40" />
              <p className="text-lg font-medium">No validation results</p>
              <p className="mt-1 text-sm">
                Click &ldquo;Run Validation&rdquo; to check compliance
                readiness.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ---- Score Gauge Card ---- */}
            <Card className="overflow-hidden">
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center gap-8 md:flex-row">
                  <ScoreGauge
                    percentage={result.percentage}
                    score={result.score}
                    maxScore={result.maxScore}
                  />
                  <div className="space-y-3 text-center md:text-left">
                    <h2 className="text-xl font-semibold">
                      {result.percentage >= 80
                        ? "Ready for Go-Live"
                        : result.percentage >= 50
                          ? "Partially Ready"
                          : "Not Ready"}
                    </h2>
                    <div className="flex gap-4">
                      {/* Blocking stat */}
                      <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                        <div className="flex items-center gap-1.5">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm">
                            <span className="font-semibold text-red-600">
                              {blockingCount}
                            </span>{" "}
                            Blocking
                          </span>
                        </div>
                      </div>
                      {/* Warning stat */}
                      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-sm">
                            <span className="font-semibold text-amber-500">
                              {warningCount}
                            </span>{" "}
                            Warnings
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ---- Category Breakdown Cards ---- */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {categoryCards.map((cat) => {
                const catPct =
                  cat.maxScore > 0
                    ? Math.round((cat.score / cat.maxScore) * 100)
                    : 0;
                return (
                  <div
                    key={cat.label}
                    className={cn(
                      "rounded-xl border p-4",
                      cat.borderColor,
                      cat.bgColor,
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {cat.icon}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{cat.label}</p>
                        <p className="text-[10px] text-zc-muted">
                          {cat.weight} weight
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-baseline gap-1">
                        <span className={cn("text-2xl font-bold", cat.color)}>
                          {cat.score}
                        </span>
                        <span className="text-sm text-zc-muted">
                          / {cat.maxScore}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            catPct >= 80
                              ? "bg-green-500"
                              : catPct >= 50
                                ? "bg-amber-500"
                                : "bg-red-500",
                          )}
                          style={{ width: `${catPct}%` }}
                        />
                      </div>
                      <p className="text-right text-xs text-zc-muted">
                        {catPct}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ---- Gaps Section ---- */}
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Compliance Gaps</h2>
                <span className="text-sm text-zc-muted">
                  {filteredGaps.length} gap
                  {filteredGaps.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Filter tabs */}
              <div className="flex flex-wrap gap-2">
                {/* Severity filter */}
                <div className="flex overflow-hidden rounded-lg border border-zc-border">
                  {(["All", "BLOCKING", "WARNING"] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverityFilter(sev)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium transition-colors",
                        severityFilter === sev
                          ? "bg-zc-accent text-white"
                          : "bg-zc-panel text-zc-muted hover:text-zc-text",
                      )}
                    >
                      {sev === "All"
                        ? "All"
                        : sev === "BLOCKING"
                          ? `Blocking (${blockingCount})`
                          : `Warnings (${warningCount})`}
                    </button>
                  ))}
                </div>

                {/* Area filter */}
                <div className="flex overflow-hidden rounded-lg border border-zc-border">
                  {GAP_AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setAreaFilter(area)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium transition-colors",
                        areaFilter === area
                          ? "bg-zc-accent text-white"
                          : "bg-zc-panel text-zc-muted hover:text-zc-text",
                      )}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gap list grouped by area */}
              {filteredGaps.length === 0 ? (
                <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
                  <div className="flex flex-col items-center py-4 text-center text-zc-muted">
                    <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" />
                    <p className="text-sm">
                      No gaps found with the current filters.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {Object.entries(gapsByArea).map(([area, gaps]) => (
                    <Card key={area} className="overflow-hidden">
                      <CardHeader className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold">
                            {area}
                          </CardTitle>
                          <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50/70 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                            {gaps.length}
                          </span>
                        </div>
                      </CardHeader>
                      <Separator />
                      <CardContent className="p-0">
                        <div className="divide-y divide-zc-border">
                          {gaps.map((gap, idx) => (
                            <div
                              key={`${gap.area}-${gap.entityId}-${idx}`}
                              className={cn(
                                "flex items-start gap-3 px-4 py-3",
                                gap.severity === "BLOCKING"
                                  ? "border-l-4 border-l-red-500"
                                  : "border-l-4 border-l-amber-400",
                              )}
                            >
                              {gap.severity === "BLOCKING" ? (
                                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                              ) : (
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm">{gap.message}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                      gap.severity === "BLOCKING"
                                        ? "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
                                        : "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400",
                                    )}
                                  >
                                    {gap.severity}
                                  </span>
                                  <span className="text-xs text-zc-muted">
                                    {gap.entityType} &middot;{" "}
                                    {gap.entityId.slice(0, 8)}...
                                  </span>
                                </div>
                              </div>
                              {AREA_LINK_MAP[gap.area] && (
                                <Link
                                  href={AREA_LINK_MAP[gap.area]}
                                  className="shrink-0 text-xs text-zc-accent hover:underline"
                                >
                                  Fix
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </RequirePerm>
    </AppShell>
  );
}
