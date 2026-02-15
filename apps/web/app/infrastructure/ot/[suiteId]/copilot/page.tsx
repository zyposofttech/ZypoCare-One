"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import {
  NoBranchGuard,
  SuiteContextBar,
  OtPageHeader,
  ErrorAlert,
  StatBox,
  OnboardingCallout,
} from "../../_shared/components";
import { safeArray } from "../../_shared/utils";

import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

/* =========================================================
   Local types
   ========================================================= */

type ReadinessBreakdown = {
  category: string;
  points: number;
  maxPoints: number;
  detail: string;
};

type ReadinessScore = {
  score: number;
  maxScore: number;
  percentage: number;
  breakdown: ReadinessBreakdown[];
};

type Gap = {
  category: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  fixRoute?: string;
};

type GapResult = {
  gaps: Gap[];
  stats: {
    totalSpaces: number;
    totalTheatres: number;
    totalEquipment: number;
    totalStaff: number;
    validationScore: number;
  };
};

type EquipmentItem = {
  name: string;
  category: string;
  present: boolean;
  reason?: string;
};

type TheatreEquipment = {
  theatreName: string;
  theatreType: string;
  mandatory: EquipmentItem[];
  recommended: EquipmentItem[];
};

type StaffRecommendation = {
  role: string;
  currentCount: number;
  recommendedMin: number;
  gap: number;
  detail: string;
};

type StaffResult = {
  recommendations: StaffRecommendation[];
  totalGap: number;
};

type SchedulingSuggestion = {
  category: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

type ComplianceCheck = {
  configType: string;
  label: string;
  configured: boolean;
  detail: string;
  severity: "high" | "medium" | "low";
};

type ComplianceResult = {
  checks: ComplianceCheck[];
  overallStatus: "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT";
};

/* =========================================================
   Section key type
   ========================================================= */

type SectionKey =
  | "readiness"
  | "gaps"
  | "equipment"
  | "staffing"
  | "scheduling"
  | "compliance";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "readiness", label: "Readiness Score" },
  { key: "gaps", label: "Gap Analysis" },
  { key: "equipment", label: "Equipment Suggestions" },
  { key: "staffing", label: "Staffing Analysis" },
  { key: "scheduling", label: "Scheduling Review" },
  { key: "compliance", label: "Compliance Checkup" },
];

/* =========================================================
   AI Copilot page
   ========================================================= */

export default function CopilotPage(props: {
  params: Promise<{ suiteId: string }>;
}) {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="OT Setup - AI Copilot">
      <RequirePerm perm="ot.suite.read">
        {branchId ? (
          <CopilotContent branchId={branchId} params={props.params} />
        ) : (
          <NoBranchGuard />
        )}
      </RequirePerm>
    </AppShell>
  );
}

/* =========================================================
   Main content
   ========================================================= */

function CopilotContent({
  branchId,
  params,
}: {
  branchId: string;
  params: Promise<{ suiteId: string }>;
}) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canRead = hasPerm(user, "ot.suite.read");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] =
    React.useState<SectionKey>("readiness");

  // AI page insights
  const {
    insights,
    loading: insightsLoading,
    dismiss: dismissInsight,
  } = usePageInsights({ module: "ot-copilot" });

  // Suite context
  const [suiteName, setSuiteName] = React.useState<string | undefined>();
  const [suiteCode, setSuiteCode] = React.useState<string | undefined>();
  const [suiteStatus, setSuiteStatus] = React.useState<string | undefined>();

  // Section-specific state
  const [readiness, setReadiness] = React.useState<ReadinessScore | null>(null);
  const [gapResult, setGapResult] = React.useState<GapResult | null>(null);
  const [theatreEquipment, setTheatreEquipment] = React.useState<
    TheatreEquipment[]
  >([]);
  const [staffResult, setStaffResult] = React.useState<StaffResult | null>(
    null,
  );
  const [schedulingSuggestions, setSchedulingSuggestions] = React.useState<
    SchedulingSuggestion[]
  >([]);
  const [complianceResult, setComplianceResult] =
    React.useState<ComplianceResult | null>(null);

  // Track what has been loaded
  const [loadedSections, setLoadedSections] = React.useState<
    Set<SectionKey>
  >(new Set());

  /* ---- Query string helper ---- */

  const qs = React.useCallback(
    () =>
      `?branchId=${encodeURIComponent(branchId)}&suiteId=${encodeURIComponent(suiteId)}`,
    [branchId, suiteId],
  );

  /* ---- Load suite context ---- */

  React.useEffect(() => {
    async function loadSuiteContext() {
      try {
        const suite = await apiFetch<any>(
          `/api/infrastructure/ot/suites/${suiteId}?branchId=${encodeURIComponent(branchId)}`,
        );
        setSuiteName(suite?.name);
        setSuiteCode(suite?.code);
        setSuiteStatus(suite?.status);
      } catch {
        // Non-critical: context bar just shows "Loading suite..."
      }
    }
    void loadSuiteContext();
  }, [branchId, suiteId]);

  /* ---- Data loaders ---- */

  async function loadReadinessScore() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<ReadinessScore>(
        `/api/infrastructure/ot/copilot/readiness-score${qs()}`,
      );
      setReadiness(data);
      setLoadedSections((prev) => new Set(prev).add("readiness"));
    } catch (e: any) {
      setErr(e?.message || "Failed to load readiness score");
    } finally {
      setLoading(false);
    }
  }

  async function loadGaps() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<GapResult>(
        `/api/infrastructure/ot/copilot/analyze-gaps${qs()}`,
      );
      setGapResult(data);
      setLoadedSections((prev) => new Set(prev).add("gaps"));
    } catch (e: any) {
      setErr(e?.message || "Failed to analyze gaps");
    } finally {
      setLoading(false);
    }
  }

  async function loadEquipment() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<any>(
        `/api/infrastructure/ot/copilot/suggest-equipment${qs()}`,
      );
      setTheatreEquipment(safeArray<TheatreEquipment>(data?.theatres ?? data));
      setLoadedSections((prev) => new Set(prev).add("equipment"));
    } catch (e: any) {
      setErr(e?.message || "Failed to load equipment suggestions");
    } finally {
      setLoading(false);
    }
  }

  async function loadStaffing() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<StaffResult>(
        `/api/infrastructure/ot/copilot/suggest-staffing${qs()}`,
      );
      setStaffResult(data);
      setLoadedSections((prev) => new Set(prev).add("staffing"));
    } catch (e: any) {
      setErr(e?.message || "Failed to load staffing analysis");
    } finally {
      setLoading(false);
    }
  }

  async function loadScheduling() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<any>(
        `/api/infrastructure/ot/copilot/suggest-scheduling${qs()}`,
      );
      setSchedulingSuggestions(
        safeArray<SchedulingSuggestion>(data?.suggestions ?? data),
      );
      setLoadedSections((prev) => new Set(prev).add("scheduling"));
    } catch (e: any) {
      setErr(e?.message || "Failed to load scheduling review");
    } finally {
      setLoading(false);
    }
  }

  async function loadCompliance() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<ComplianceResult>(
        `/api/infrastructure/ot/copilot/compliance-checkup${qs()}`,
      );
      setComplianceResult(data);
      setLoadedSections((prev) => new Set(prev).add("compliance"));
    } catch (e: any) {
      setErr(e?.message || "Failed to load compliance checkup");
    } finally {
      setLoading(false);
    }
  }

  /* ---- Load active section on change ---- */

  React.useEffect(() => {
    if (activeSection === "readiness") void loadReadinessScore();
    else if (activeSection === "gaps") void loadGaps();
    else if (activeSection === "equipment") void loadEquipment();
    else if (activeSection === "staffing") void loadStaffing();
    else if (activeSection === "scheduling") void loadScheduling();
    else if (activeSection === "compliance") void loadCompliance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, suiteId, activeSection]);

  /* ---- Helpers ---- */

  function scoreColor(pct: number) {
    if (pct >= 80) return "text-emerald-600";
    if (pct >= 50) return "text-amber-600";
    return "text-rose-600";
  }

  function scoreBg(pct: number) {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-rose-500";
  }

  function severityBadgeClass(severity: "high" | "medium" | "low") {
    if (severity === "high") return "bg-rose-100 text-rose-700";
    if (severity === "medium") return "bg-amber-100 text-amber-700";
    return "bg-blue-100 text-blue-700";
  }

  function severityBorderClass(severity: "high" | "medium" | "low") {
    if (severity === "high")
      return "border-rose-200/70 bg-rose-50/60";
    if (severity === "medium")
      return "border-amber-200/70 bg-amber-50/60";
    return "border-blue-200/70 bg-blue-50/60";
  }

  function handleRefresh() {
    if (activeSection === "readiness") void loadReadinessScore();
    else if (activeSection === "gaps") void loadGaps();
    else if (activeSection === "equipment") void loadEquipment();
    else if (activeSection === "staffing") void loadStaffing();
    else if (activeSection === "scheduling") void loadScheduling();
    else if (activeSection === "compliance") void loadCompliance();
  }

  /* ---- Render ---- */

  return (
    <div className="grid gap-6">
      {/* Suite context bar */}
      <SuiteContextBar
        suiteId={suiteId}
        suiteName={suiteName}
        suiteCode={suiteCode}
        suiteStatus={suiteStatus}
      />

      {/* Page header */}
      <OtPageHeader
        icon={<Sparkles className="h-5 w-5 text-zc-accent" />}
        title="AI Copilot"
        description="AI-assisted tools for OT suite configuration analysis, gap detection, and optimization recommendations."
        loading={loading}
        onRefresh={handleRefresh}
      />

      {/* AI Insights */}
      <PageInsightBanner
        insights={insights}
        loading={insightsLoading}
        onDismiss={dismissInsight}
      />

      {/* Error */}
      <ErrorAlert message={err} />

      {/* Section switcher */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tools</CardTitle>
          <CardDescription>
            Select a copilot tool to run against the current OT suite
            configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <Button
                key={s.key}
                variant={activeSection === s.key ? "primary" : "outline"}
                size="sm"
                onClick={() => setActiveSection(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ============================================================
         SECTION: Readiness Score
         ============================================================ */}
      {activeSection === "readiness" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Readiness Score</CardTitle>
            <CardDescription>
              Overall configuration readiness with breakdown by category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {readiness ? (
              <div>
                {/* Overall score display */}
                <div className="mb-4 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div
                        className={cn(
                          "text-4xl font-bold",
                          scoreColor(readiness.percentage),
                        )}
                      >
                        {readiness.percentage}%
                      </div>
                      <div className="mt-1 text-xs text-zc-muted">
                        {readiness.score} / {readiness.maxScore} points
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            scoreBg(readiness.percentage),
                          )}
                          style={{ width: `${readiness.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Breakdown grid */}
                <div className="mb-2 text-sm font-semibold">Breakdown</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {safeArray<ReadinessBreakdown>(readiness.breakdown).map(
                    (b, idx) => {
                      const bPct =
                        b.maxPoints > 0
                          ? Math.round((b.points / b.maxPoints) * 100)
                          : 0;
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-zc-border bg-zc-panel/10 p-3"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              {b.category}
                            </span>
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                scoreColor(bPct),
                              )}
                            >
                              {b.points} / {b.maxPoints}
                            </span>
                          </div>
                          <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                scoreBg(bPct),
                              )}
                              style={{ width: `${bPct}%` }}
                            />
                          </div>
                          <div className="text-xs text-zc-muted">{b.detail}</div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            ) : loading ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">
                Loading readiness score...
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* ============================================================
         SECTION: Gap Analysis
         ============================================================ */}
      {activeSection === "gaps" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gap Analysis</CardTitle>
            <CardDescription>
              Configuration gaps with severity and fix links for the current
              suite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Stats row */}
            {gapResult?.stats ? (
              <div className="mb-4 grid gap-3 md:grid-cols-5">
                <StatBox
                  label="Total Spaces"
                  value={gapResult.stats.totalSpaces}
                  color="blue"
                />
                <StatBox
                  label="Total Theatres"
                  value={gapResult.stats.totalTheatres}
                  color="sky"
                />
                <StatBox
                  label="Total Equipment"
                  value={gapResult.stats.totalEquipment}
                  color="violet"
                />
                <StatBox
                  label="Total Staff"
                  value={gapResult.stats.totalStaff}
                  color="indigo"
                />
                <StatBox
                  label="Validation Score"
                  value={`${gapResult.stats.validationScore}%`}
                  color={
                    gapResult.stats.validationScore >= 80
                      ? "emerald"
                      : gapResult.stats.validationScore >= 50
                        ? "amber"
                        : "rose"
                  }
                />
              </div>
            ) : null}

            <div className="mb-3 text-sm font-semibold">
              Configuration Gaps (
              {gapResult ? safeArray(gapResult.gaps).length : 0})
            </div>

            <div className="grid gap-2">
              {gapResult && safeArray(gapResult.gaps).length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4 text-sm text-emerald-700">
                  No configuration gaps detected. Your OT suite looks well
                  configured.
                </div>
              ) : gapResult ? (
                safeArray<Gap>(gapResult.gaps).map((g, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-xl border p-3",
                      severityBorderClass(g.severity),
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          severityBadgeClass(g.severity),
                        )}
                      >
                        {g.severity}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                        {g.category}
                      </span>
                      <span className="text-sm font-semibold">{g.title}</span>
                      {g.fixRoute ? (
                        <Link
                          href={g.fixRoute as any}
                          className="ml-auto flex items-center gap-1 text-xs font-medium text-zc-accent hover:underline"
                        >
                          Fix <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-zc-muted">{g.detail}</div>
                  </div>
                ))
              ) : loading ? (
                <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">
                  Analyzing configuration gaps...
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ============================================================
         SECTION: Equipment Suggestions
         ============================================================ */}
      {activeSection === "equipment" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Equipment Suggestions ({theatreEquipment.length} theatre
              {theatreEquipment.length !== 1 ? "s" : ""})
            </CardTitle>
            <CardDescription>
              Mandatory and recommended equipment per theatre type.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {theatreEquipment.length === 0 ? (
              <div
                className={cn(
                  "rounded-xl border border-dashed p-4 text-sm",
                  loadedSections.has("equipment")
                    ? "border-emerald-300 bg-emerald-50/40 text-emerald-700"
                    : "border-zc-border text-zc-muted",
                )}
              >
                {loadedSections.has("equipment")
                  ? "No theatres found to analyze equipment for."
                  : loading
                    ? "Loading equipment suggestions..."
                    : "Click Refresh to analyze equipment."}
              </div>
            ) : (
              <div className="grid gap-4">
                {theatreEquipment.map((te, tIdx) => (
                  <div
                    key={tIdx}
                    className="rounded-xl border border-zc-border bg-zc-panel/10 p-4"
                  >
                    {/* Theatre header */}
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-semibold">{te.theatreName}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase"
                      >
                        {te.theatreType.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {/* Mandatory equipment */}
                    {safeArray(te.mandatory).length > 0 ? (
                      <div className="mb-3">
                        <div className="mb-2 text-xs font-semibold text-zc-muted">
                          Mandatory Equipment
                        </div>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {safeArray<EquipmentItem>(te.mandatory).map(
                            (eq, eIdx) => (
                              <div
                                key={eIdx}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                                  eq.present
                                    ? "border-emerald-200/70 bg-emerald-50/40 text-emerald-800"
                                    : "border-rose-200/70 bg-rose-50/40 text-rose-800",
                                )}
                              >
                                {eq.present ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium">{eq.name}</div>
                                  {eq.reason ? (
                                    <div className="text-[11px] opacity-80">
                                      {eq.reason}
                                    </div>
                                  ) : null}
                                </div>
                                <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                                  {eq.category}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* Recommended equipment */}
                    {safeArray(te.recommended).length > 0 ? (
                      <div>
                        <div className="mb-2 text-xs font-semibold text-zc-muted">
                          Recommended Equipment
                        </div>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {safeArray<EquipmentItem>(te.recommended).map(
                            (eq, eIdx) => (
                              <div
                                key={eIdx}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                                  eq.present
                                    ? "border-emerald-200/70 bg-emerald-50/40 text-emerald-800"
                                    : "border-rose-200/70 bg-rose-50/40 text-rose-800",
                                )}
                              >
                                {eq.present ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium">{eq.name}</div>
                                  {eq.reason ? (
                                    <div className="text-[11px] opacity-80">
                                      {eq.reason}
                                    </div>
                                  ) : null}
                                </div>
                                <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                                  {eq.category}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* ============================================================
         SECTION: Staffing Analysis
         ============================================================ */}
      {activeSection === "staffing" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Staffing Analysis</CardTitle>
            <CardDescription>
              Staff gaps and recommendations based on suite configuration and
              theatre count.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {staffResult ? (
              <div>
                {/* Summary */}
                <div className="mb-4 flex items-center gap-3">
                  <StatBox
                    label="Total Gap"
                    value={staffResult.totalGap}
                    color={staffResult.totalGap > 0 ? "rose" : "emerald"}
                    detail={
                      staffResult.totalGap > 0
                        ? `${staffResult.totalGap} additional staff needed`
                        : "Staffing levels adequate"
                    }
                  />
                </div>

                {/* Staffing table */}
                <div className="overflow-x-auto rounded-xl border border-zc-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zc-border bg-zc-panel/20">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">
                          Role
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zc-muted">
                          Current
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zc-muted">
                          Recommended
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zc-muted">
                          Gap
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zc-muted">
                          Detail
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zc-border">
                      {safeArray<StaffRecommendation>(
                        staffResult.recommendations,
                      ).map((sr, idx) => (
                        <tr
                          key={idx}
                          className="transition-colors hover:bg-zc-panel/10"
                        >
                          <td className="px-4 py-2.5 font-medium text-zc-text">
                            {sr.role}
                          </td>
                          <td className="px-4 py-2.5 text-center tabular-nums">
                            {sr.currentCount}
                          </td>
                          <td className="px-4 py-2.5 text-center tabular-nums">
                            {sr.recommendedMin}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                                sr.gap > 0
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700",
                              )}
                            >
                              {sr.gap > 0 ? `+${sr.gap}` : sr.gap}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-zc-muted">
                            {sr.detail}
                          </td>
                        </tr>
                      ))}
                      {safeArray(staffResult.recommendations).length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-sm text-zc-muted"
                          >
                            No staffing data available.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : loading ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">
                Analyzing staffing requirements...
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* ============================================================
         SECTION: Scheduling Review
         ============================================================ */}
      {activeSection === "scheduling" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Scheduling Review ({schedulingSuggestions.length} suggestion
              {schedulingSuggestions.length !== 1 ? "s" : ""})
            </CardTitle>
            <CardDescription>
              Scheduling configuration analysis and optimization suggestions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {schedulingSuggestions.length === 0 ? (
              <div
                className={cn(
                  "rounded-xl border border-dashed p-4 text-sm",
                  loadedSections.has("scheduling")
                    ? "border-emerald-300 bg-emerald-50/40 text-emerald-700"
                    : "border-zc-border text-zc-muted",
                )}
              >
                {loadedSections.has("scheduling")
                  ? "No scheduling issues found. Your scheduling configuration looks good."
                  : loading
                    ? "Analyzing scheduling configuration..."
                    : "Click Refresh to analyze scheduling."}
              </div>
            ) : (
              <div className="grid gap-2">
                {schedulingSuggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-xl border p-3",
                      severityBorderClass(s.severity),
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          severityBadgeClass(s.severity),
                        )}
                      >
                        {s.severity}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                        {s.category.replace(/-/g, " ")}
                      </span>
                      <span className="text-sm font-semibold">{s.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-zc-muted">{s.detail}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* ============================================================
         SECTION: Compliance Checkup
         ============================================================ */}
      {activeSection === "compliance" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Compliance Checkup</CardTitle>
                <CardDescription className="mt-1">
                  NABH compliance status for the current OT suite configuration.
                </CardDescription>
              </div>
              {complianceResult ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-semibold uppercase",
                    complianceResult.overallStatus === "COMPLIANT"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : complianceResult.overallStatus === "PARTIAL"
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-rose-300 bg-rose-50 text-rose-700",
                  )}
                >
                  {complianceResult.overallStatus.replace(/_/g, " ")}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {complianceResult ? (
              <div className="grid gap-2">
                {safeArray<ComplianceCheck>(complianceResult.checks).length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4 text-sm text-emerald-700">
                    All compliance checks passed.
                  </div>
                ) : (
                  safeArray<ComplianceCheck>(complianceResult.checks).map(
                    (check, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3",
                          check.configured
                            ? "border-emerald-200/70 bg-emerald-50/30"
                            : severityBorderClass(check.severity),
                        )}
                      >
                        {check.configured ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <AlertTriangle
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              check.severity === "high"
                                ? "text-rose-600"
                                : check.severity === "medium"
                                  ? "text-amber-600"
                                  : "text-blue-600",
                            )}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {check.label}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                              {check.configType.replace(/_/g, " ")}
                            </span>
                            {!check.configured ? (
                              <span
                                className={cn(
                                  "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                                  severityBadgeClass(check.severity),
                                )}
                              >
                                {check.severity}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-zc-muted">
                            {check.detail}
                          </div>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            ) : loading ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">
                Running compliance checks...
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Onboarding callout */}
      <OnboardingCallout
        title="AI Copilot tips"
        description="1) Start with Readiness Score for an overall health check, 2) Use Gap Analysis to find missing configuration, 3) Check Equipment Suggestions per theatre type, 4) Review Staffing Analysis for role-based gaps, 5) Run Scheduling Review for timing optimization, 6) Verify Compliance Checkup for NABH readiness."
      />
    </div>
  );
}
