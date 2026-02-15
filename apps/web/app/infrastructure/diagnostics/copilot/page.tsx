"use client";

import * as React from "react";

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
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import { IconBrain } from "@/components/icons";
import { safeArray } from "../_shared/utils";
import {
  NoBranchGuard,
  PageHeader,
  ErrorAlert,
  StatBox,
  OnboardingCallout,
} from "../_shared/components";

import { RefreshCw } from "lucide-react";

/* =========================================================
   Local types
   ========================================================= */

type CopilotMapping = {
  itemId: string;
  name: string;
  loincCode: string;
  display: string;
  confidence: number;
};

type CopilotGap = {
  category: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

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

type PanelSuggestion = {
  panelName: string;
  members: string[];
  matchedExisting: string[];
  missing: string[];
};

type TubeGroup = {
  container: string;
  specimenName: string;
  tests: string[];
};

/* =========================================================
   AI Copilot page
   ========================================================= */

type SectionKey = "readiness" | "panels" | "tubes" | "gaps" | "loinc" | "lookup";

export default function CopilotPage() {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Diagnostics - AI Copilot">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        {branchId ? <CopilotContent branchId={branchId} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

function CopilotContent({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canRead = hasPerm(user, "INFRA_DIAGNOSTICS_READ");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<SectionKey>("readiness");

  // AI page insights
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "diagnostics-copilot" });

  // Readiness score state
  const [readiness, setReadiness] = React.useState<ReadinessScore | null>(null);

  // Panel suggestions state
  const [panelSuggestions, setPanelSuggestions] = React.useState<PanelSuggestion[]>([]);
  const [panelsLoaded, setPanelsLoaded] = React.useState(false);

  // Tube consolidation state
  const [tubeGroups, setTubeGroups] = React.useState<TubeGroup[]>([]);

  // Gap analysis state
  const [gaps, setGaps] = React.useState<CopilotGap[]>([]);
  const [stats, setStats] = React.useState<any>(null);

  // LOINC auto-mapping state
  const [mappings, setMappings] = React.useState<CopilotMapping[]>([]);
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const [selectedMappings, setSelectedMappings] = React.useState<Set<string>>(new Set());
  const [applying, setApplying] = React.useState(false);

  // Lookup state
  const [lookupName, setLookupName] = React.useState("");
  const [loincResults, setLoincResults] = React.useState<any[]>([]);
  const [snomedResults, setSnomedResults] = React.useState<any[]>([]);
  const [pcpndtResult, setPcpndtResult] = React.useState<any>(null);

  /* ---- Readiness Score ---- */

  async function loadReadinessScore() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<ReadinessScore>(
        `/api/infrastructure/diagnostics/copilot/readiness-score?branchId=${encodeURIComponent(branchId)}`,
      );
      setReadiness(data);
    } catch (e: any) {
      setErr(e?.message || "Failed to load readiness score");
    } finally {
      setLoading(false);
    }
  }

  /* ---- Panel Suggestions ---- */

  async function loadPanelSuggestions() {
    setLoading(true);
    setErr(null);
    try {
      const itemsData = await apiFetch<any>(
        `/api/infrastructure/diagnostics/items?branchId=${encodeURIComponent(branchId)}`,
      );
      const items = safeArray<{ id: string; name: string }>(itemsData?.rows ?? itemsData);
      const body = items.map((it) => ({ id: it.id, name: it.name }));

      const data = await apiFetch<any>(
        `/api/infrastructure/diagnostics/copilot/suggest-panels?branchId=${encodeURIComponent(branchId)}`,
        {
          method: "POST",
          body: JSON.stringify({ items: body }),
        },
      );
      setPanelSuggestions(safeArray<PanelSuggestion>(data.suggestions));
      setPanelsLoaded(true);
    } catch (e: any) {
      setErr(e?.message || "Failed to load panel suggestions");
    } finally {
      setLoading(false);
    }
  }

  /* ---- Tube Consolidation ---- */

  async function loadTubeConsolidation() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<any>(
        `/api/infrastructure/diagnostics/copilot/tube-consolidation?branchId=${encodeURIComponent(branchId)}`,
      );
      setTubeGroups(safeArray<TubeGroup>(data.groups));
    } catch (e: any) {
      setErr(e?.message || "Failed to load tube consolidation");
    } finally {
      setLoading(false);
    }
  }

  /* ---- Gap Analysis ---- */

  async function loadGaps() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<any>(
        `/api/infrastructure/diagnostics/copilot/analyze-gaps?branchId=${encodeURIComponent(branchId)}`,
      );
      setGaps(data.gaps ?? []);
      setStats(data.stats ?? null);
    } catch (e: any) {
      setErr(e?.message || "Failed to analyze gaps");
    } finally {
      setLoading(false);
    }
  }

  /* ---- LOINC Auto-Map ---- */

  async function loadLoincMappings() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<any>(
        `/api/infrastructure/diagnostics/copilot/auto-map-loinc?branchId=${encodeURIComponent(branchId)}`,
      );
      setMappings(data.mapped ?? []);
      setSkipped(data.skipped ?? []);
      setSelectedMappings(new Set((data.mapped ?? []).map((m: CopilotMapping) => m.itemId)));
    } catch (e: any) {
      setErr(e?.message || "Failed to auto-map LOINC");
    } finally {
      setLoading(false);
    }
  }

  async function applySelected() {
    const toApply = mappings.filter((m) => selectedMappings.has(m.itemId));
    if (toApply.length === 0) return;
    setApplying(true);
    try {
      const result = await apiFetch<any>(
        `/api/infrastructure/diagnostics/copilot/apply-loinc-mappings?branchId=${encodeURIComponent(branchId)}`,
        {
          method: "POST",
          body: JSON.stringify({ mappings: toApply.map((m) => ({ itemId: m.itemId, loincCode: m.loincCode })) }),
        },
      );
      toast({ title: `Applied LOINC codes to ${result.updated} item(s)` });
      setMappings((prev) => prev.filter((m) => !selectedMappings.has(m.itemId)));
      setSelectedMappings(new Set());
    } catch (e: any) {
      toast({ title: "Apply failed", description: e?.message || "Error", variant: "destructive" as any });
    } finally {
      setApplying(false);
    }
  }

  /* ---- Code Lookup ---- */

  async function runLookup() {
    if (!lookupName.trim()) return;
    setLoading(true);
    try {
      const [loinc, snomed, pcpndt] = await Promise.all([
        apiFetch<any>(`/api/infrastructure/diagnostics/copilot/suggest-loinc?testName=${encodeURIComponent(lookupName)}`),
        apiFetch<any>(`/api/infrastructure/diagnostics/copilot/suggest-snomed?testName=${encodeURIComponent(lookupName)}`),
        apiFetch<any>(`/api/infrastructure/diagnostics/copilot/detect-pcpndt?testName=${encodeURIComponent(lookupName)}`),
      ]);
      setLoincResults(loinc.suggestions ?? []);
      setSnomedResults(snomed.suggestions ?? []);
      setPcpndtResult(pcpndt);
    } catch (e: any) {
      toast({ title: "Lookup failed", description: e?.message || "Error", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (activeSection === "readiness") void loadReadinessScore();
    if (activeSection === "panels") void loadPanelSuggestions();
    if (activeSection === "tubes") void loadTubeConsolidation();
    if (activeSection === "gaps") void loadGaps();
    if (activeSection === "loinc") void loadLoincMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, activeSection]);

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

  function handleRefresh() {
    if (activeSection === "readiness") void loadReadinessScore();
    else if (activeSection === "panels") void loadPanelSuggestions();
    else if (activeSection === "tubes") void loadTubeConsolidation();
    else if (activeSection === "gaps") void loadGaps();
    else if (activeSection === "loinc") void loadLoincMappings();
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <PageHeader
        icon={<IconBrain className="h-5 w-5 text-zc-accent" />}
        title="AI Copilot"
        description="AI-assisted tools for LOINC/SNOMED suggestions, PCPNDT detection, and bulk operations."
        loading={loading}
        onRefresh={activeSection !== "lookup" ? handleRefresh : undefined}
      />

      {/* AI Insights */}
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Error */}
      <ErrorAlert message={err} />

      {/* Section switcher */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tools</CardTitle>
          <CardDescription>Select a copilot tool to run against the current branch configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {([
              { key: "readiness" as const, label: "Readiness Score" },
              { key: "panels" as const, label: "Panel Suggestions" },
              { key: "tubes" as const, label: "Tube Consolidation" },
              { key: "gaps" as const, label: "Gap Analysis" },
              { key: "loinc" as const, label: "LOINC Auto-Map" },
              { key: "lookup" as const, label: "Code Lookup" },
            ]).map((s) => (
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

      {/* Readiness Score */}
      {activeSection === "readiness" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Readiness Score</CardTitle>
            <CardDescription>Overall configuration readiness for the current branch.</CardDescription>
          </CardHeader>
          <CardContent>
            {readiness ? (
              <div>
                {/* Overall score display */}
                <div className="mb-4 rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className={cn("text-4xl font-bold", scoreColor(readiness.percentage))}>
                        {readiness.percentage}%
                      </div>
                      <div className="text-xs text-zc-muted mt-1">
                        {readiness.score} / {readiness.maxScore} points
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", scoreBg(readiness.percentage))}
                          style={{ width: `${readiness.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="text-sm font-semibold mb-2">Breakdown</div>
                <div className="grid gap-2">
                  {safeArray<ReadinessBreakdown>(readiness.breakdown).map((b, idx) => {
                    const bPct = b.maxPoints > 0 ? Math.round((b.points / b.maxPoints) * 100) : 0;
                    return (
                      <div key={idx} className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold">{b.category}</span>
                          <span className={cn("text-xs font-semibold", scoreColor(bPct))}>
                            {b.points} / {b.maxPoints}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden mb-1">
                          <div
                            className={cn("h-full rounded-full transition-all", scoreBg(bPct))}
                            style={{ width: `${bPct}%` }}
                          />
                        </div>
                        <div className="text-xs text-zc-muted">{b.detail}</div>
                      </div>
                    );
                  })}
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

      {/* Panel Suggestions */}
      {activeSection === "panels" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Panel Suggestions ({panelSuggestions.length})</CardTitle>
            <CardDescription>AI-suggested test panels based on your current catalog items.</CardDescription>
          </CardHeader>
          <CardContent>
            {panelSuggestions.length === 0 ? (
              <div className={cn(
                "rounded-xl border border-dashed p-4 text-sm",
                panelsLoaded
                  ? "border-emerald-300 bg-emerald-50/40 text-emerald-700"
                  : "border-zc-border text-zc-muted",
              )}>
                {panelsLoaded
                  ? "No new panel suggestions found. Your panels look well configured."
                  : loading
                    ? "Analyzing items and generating panel suggestions..."
                    : "Click Refresh to analyze items."}
              </div>
            ) : (
              <div className="grid gap-3">
                {panelSuggestions.map((ps, idx) => (
                  <div key={idx} className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                    <div className="text-sm font-semibold mb-2">{ps.panelName}</div>

                    {/* Members */}
                    <div className="mb-2">
                      <div className="text-xs font-semibold text-zc-muted mb-1">Suggested Members</div>
                      <div className="flex flex-wrap gap-1">
                        {safeArray<string>(ps.members).map((m, mIdx) => (
                          <span key={mIdx} className="inline-flex items-center rounded-full border border-zc-border bg-white px-2 py-0.5 text-[11px]">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Matched existing */}
                    {safeArray(ps.matchedExisting).length > 0 ? (
                      <div className="mb-2">
                        <div className="text-xs font-semibold text-emerald-700 mb-1">Already in Catalog</div>
                        <div className="flex flex-wrap gap-1">
                          {safeArray<string>(ps.matchedExisting).map((m, mIdx) => (
                            <span key={mIdx} className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/80 px-2 py-0.5 text-[11px] text-emerald-700">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Missing */}
                    {safeArray(ps.missing).length > 0 ? (
                      <div>
                        <div className="text-xs font-semibold text-amber-700 mb-1">Missing from Catalog</div>
                        <div className="flex flex-wrap gap-1">
                          {safeArray<string>(ps.missing).map((m, mIdx) => (
                            <span key={mIdx} className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/80 px-2 py-0.5 text-[11px] text-amber-700">
                              {m}
                            </span>
                          ))}
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

      {/* Tube Consolidation */}
      {activeSection === "tubes" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tube Consolidation ({tubeGroups.length} groups)</CardTitle>
            <CardDescription>Recommended specimen tube groupings to minimize blood draws.</CardDescription>
          </CardHeader>
          <CardContent>
            {tubeGroups.length === 0 ? (
              <div className={cn(
                "rounded-xl border border-dashed p-4 text-sm",
                loading
                  ? "border-zc-border text-zc-muted"
                  : "border-emerald-300 bg-emerald-50/40 text-emerald-700",
              )}>
                {loading
                  ? "Loading tube consolidation data..."
                  : "No tube groups found. Ensure specimens are configured with containers."}
              </div>
            ) : (
              <div className="grid gap-3">
                {tubeGroups.map((g, idx) => (
                  <div key={idx} className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold">{g.container}</span>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 uppercase">
                        {g.specimenName}
                      </span>
                      <span className="ml-auto text-xs text-zc-muted">
                        {safeArray(g.tests).length} test{safeArray(g.tests).length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {safeArray<string>(g.tests).map((t, tIdx) => (
                        <span key={tIdx} className="inline-flex items-center rounded-full border border-sky-200/70 bg-sky-50/80 px-2 py-0.5 text-[11px] text-sky-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Gap Analysis */}
      {activeSection === "gaps" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gap Analysis</CardTitle>
            <CardDescription>Configuration gaps and coverage statistics for the current branch.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="mb-4 grid gap-3 md:grid-cols-4">
                <StatBox label="Total Items" value={stats.totalItems} color="blue" />
                <StatBox
                  label="LOINC Coverage"
                  value={`${stats.loincCoverage}%`}
                  color={stats.loincCoverage >= 80 ? "emerald" : "amber"}
                />
                <StatBox label="With LOINC" value={stats.itemsWithLoinc} color="sky" />
                <StatBox label="With Templates" value={stats.itemsWithTemplates} color="violet" />
              </div>
            ) : null}

            <div className="text-sm font-semibold mb-3">Configuration Gaps ({gaps.length})</div>

            <div className="grid gap-2">
              {gaps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4 text-sm text-emerald-700">
                  No configuration gaps detected. Configuration looks complete.
                </div>
              ) : (
                gaps.map((g, idx) => (
                  <div key={idx} className={cn(
                    "rounded-xl border p-3",
                    g.severity === "high"
                      ? "border-rose-200/70 bg-rose-50/60"
                      : g.severity === "medium"
                        ? "border-amber-200/70 bg-amber-50/60"
                        : "border-blue-200/70 bg-blue-50/60",
                  )}>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        g.severity === "high"
                          ? "bg-rose-100 text-rose-700"
                          : g.severity === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700",
                      )}>
                        {g.severity}
                      </span>
                      <span className="text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 bg-gray-100 text-gray-600">
                        {g.category}
                      </span>
                      <span className="text-sm font-semibold">{g.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-zc-muted">{g.detail}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* LOINC Auto-Map */}
      {activeSection === "loinc" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">LOINC Auto-Map</CardTitle>
                <CardDescription className="mt-1">
                  {mappings.length} items can be auto-mapped. {skipped.length} skipped (no match found).
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={applySelected}
                disabled={applying || selectedMappings.size === 0}
              >
                Apply Selected ({selectedMappings.size})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {mappings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4 text-sm text-emerald-700">
                All items already have LOINC codes or no matches found.
              </div>
            ) : (
              <div className="grid gap-2">
                {mappings.map((m) => (
                  <div key={m.itemId} className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                    <input
                      type="checkbox"
                      checked={selectedMappings.has(m.itemId)}
                      onChange={(e) => {
                        const next = new Set(selectedMappings);
                        if (e.target.checked) next.add(m.itemId);
                        else next.delete(m.itemId);
                        setSelectedMappings(next);
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{m.name}</div>
                      <div className="text-xs text-zc-muted">
                        LOINC: <span className="font-mono text-zc-text">{m.loincCode}</span> - {m.display}
                      </div>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold rounded-full px-2 py-0.5",
                      m.confidence >= 0.9 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                    )}>
                      {Math.round(m.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {skipped.length > 0 ? (
              <div className="mt-4">
                <div className="text-sm font-semibold text-zc-muted mb-2">Skipped (no match)</div>
                <div className="text-xs text-zc-muted">{skipped.join(", ")}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Code Lookup */}
      {activeSection === "lookup" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Code Lookup</CardTitle>
            <CardDescription>Search LOINC, SNOMED, and PCPNDT codes by test name.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2">
              <Input
                value={lookupName}
                onChange={(e) => setLookupName(e.target.value)}
                placeholder="Enter test name (e.g. CBC, Hemoglobin, X-Ray Chest)"
                className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") void runLookup(); }}
              />
              <Button onClick={() => void runLookup()} disabled={loading || !lookupName.trim()}>
                Search
              </Button>
            </div>

            {loincResults.length > 0 ? (
              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">LOINC Suggestions</div>
                <div className="grid gap-2">
                  {loincResults.map((r: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                      <div>
                        <div className="text-sm font-mono font-semibold">{r.code}</div>
                        <div className="text-xs text-zc-muted">{r.display}</div>
                      </div>
                      <span className={cn(
                        "text-xs font-semibold rounded-full px-2 py-0.5",
                        r.confidence >= 0.9 ? "bg-emerald-100 text-emerald-700" : r.confidence >= 0.7 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600",
                      )}>
                        {Math.round(r.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {snomedResults.length > 0 ? (
              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">SNOMED Suggestions</div>
                <div className="grid gap-2">
                  {snomedResults.map((r: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                      <div>
                        <div className="text-sm font-mono font-semibold">{r.code}</div>
                        <div className="text-xs text-zc-muted">{r.display}</div>
                      </div>
                      <span className={cn(
                        "text-xs font-semibold rounded-full px-2 py-0.5",
                        r.confidence >= 0.9 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                      )}>
                        {Math.round(r.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {pcpndtResult ? (
              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">PCPNDT Detection</div>
                <div className={cn(
                  "rounded-xl border p-3",
                  pcpndtResult.requiresPcpndt
                    ? "border-rose-200/70 bg-rose-50/60"
                    : "border-emerald-200/70 bg-emerald-50/40",
                )}>
                  <div className="text-sm font-semibold">
                    {pcpndtResult.requiresPcpndt ? "PCPNDT Flag Required" : "No PCPNDT requirement detected"}
                  </div>
                  {pcpndtResult.matchedKeyword ? (
                    <div className="text-xs text-zc-muted mt-1">
                      Matched keyword: <span className="font-mono">{pcpndtResult.matchedKeyword}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {lookupName && loincResults.length === 0 && snomedResults.length === 0 && !loading ? (
              <div className="rounded-xl border border-dashed border-zc-border p-4 text-sm text-zc-muted">
                No results found. Try a different test name.
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Onboarding callout */}
      <OnboardingCallout
        title="AI Copilot setup tips"
        description="1) Run Readiness Score to assess your configuration, 2) Use Gap Analysis to find missing LOINC codes and templates, 3) Apply LOINC Auto-Map to bulk-assign codes, 4) Use Code Lookup for individual test lookups."
      />
    </div>
  );
}
