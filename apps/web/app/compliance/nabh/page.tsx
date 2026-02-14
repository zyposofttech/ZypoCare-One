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
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type Workspace = { id: string; name: string; branchId: string };

/** Backend returns these status counts per chapter */
type ChapterSummaryRaw = {
  chapter: string;
  total: number;
  NOT_STARTED: number;
  IN_PROGRESS: number;
  IMPLEMENTED: number;
  VERIFIED: number;
  NON_COMPLIANT: number;
};

/** Normalised for display */
type ChapterSummary = {
  chapter: string;
  total: number;
  compliant: number;
  nonCompliant: number;
  inProgress: number;
  notStarted: number;
};

/* ----------------------------- Constants ----------------------------- */

const CHAPTERS = [
  "Access, Assessment and Continuity of Care (AAC)",
  "Care of Patients (COP)",
  "Management of Medication (MOM)",
  "Patient Rights and Education (PRE)",
  "Hospital Infection Control (HIC)",
  "Continuous Quality Improvement (CQI)",
  "Responsibilities of Management (ROM)",
  "Facility Management and Safety (FMS)",
  "Human Resource Management (HRM)",
  "Information Management System (IMS)",
];

const CHAPTER_SHORT: Record<string, string> = {
  "Access, Assessment and Continuity of Care (AAC)": "AAC",
  "Care of Patients (COP)": "COP",
  "Management of Medication (MOM)": "MOM",
  "Patient Rights and Education (PRE)": "PRE",
  "Hospital Infection Control (HIC)": "HIC",
  "Continuous Quality Improvement (CQI)": "CQI",
  "Responsibilities of Management (ROM)": "ROM",
  "Facility Management and Safety (FMS)": "FMS",
  "Human Resource Management (HRM)": "HRM",
  "Information Management System (IMS)": "IMS",
};

function normaliseChapter(raw: ChapterSummaryRaw): ChapterSummary {
  return {
    chapter: raw.chapter,
    total: raw.total,
    compliant: (raw.VERIFIED ?? 0) + (raw.IMPLEMENTED ?? 0),
    nonCompliant: raw.NON_COMPLIANT ?? 0,
    inProgress: raw.IN_PROGRESS ?? 0,
    notStarted: raw.NOT_STARTED ?? 0,
  };
}

/* ----------------------------- Helpers ----------------------------- */

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

/* ----------------------------- Page ----------------------------- */

export default function NabhOverviewPage() {
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [noWorkspace, setNoWorkspace] = React.useState(false);
  const [chapters, setChapters] = React.useState<ChapterSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingChapters, setLoadingChapters] = React.useState(false);

  // Resolve workspace from branch
  React.useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);
    (async () => {
      try {
        const data = await apiFetch<Workspace[] | { items: Workspace[] }>(
          `/api/compliance/workspaces?branchId=${activeBranchId}`,
        );
        const workspaces = Array.isArray(data) ? data : (data?.items ?? []);
        const ws = workspaces[0];
        if (ws) {
          setWorkspaceId(ws.id);
          setNoWorkspace(false);
        } else {
          setWorkspaceId(null);
          setNoWorkspace(true);
        }
      } catch {
        setWorkspaceId(null);
        setNoWorkspace(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeBranchId]);

  // Fetch chapter summary when workspace is resolved
  const fetchChapterSummary = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoadingChapters(true);
    try {
      const data = await apiFetch<
        | { workspaceId: string; chapters: ChapterSummaryRaw[]; totalItems: number }
        | ChapterSummaryRaw[]
      >(
        `/api/compliance/nabh/items/chapter-summary?workspaceId=${workspaceId}`,
      );
      const rawRows = Array.isArray(data) ? data : (data as any)?.chapters ?? [];
      setChapters(rawRows.map(normaliseChapter));
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to load chapter summary",
        variant: "destructive",
      });
    } finally {
      setLoadingChapters(false);
    }
  }, [workspaceId]);

  React.useEffect(() => {
    if (workspaceId) fetchChapterSummary();
  }, [fetchChapterSummary, workspaceId]);

  // Computed totals
  const totals = React.useMemo(() => {
    const t = {
      total: 0,
      compliant: 0,
      nonCompliant: 0,
      inProgress: 0,
      notStarted: 0,
    };
    for (const ch of chapters) {
      t.total += ch.total;
      t.compliant += ch.compliant;
      t.nonCompliant += ch.nonCompliant;
      t.inProgress += ch.inProgress;
      t.notStarted += ch.notStarted;
    }
    return t;
  }, [chapters]);

  return (
    <AppShell title="NABH Readiness">
      <RequirePerm perm="COMPLIANCE_NABH_ITEM_UPDATE">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ShieldAlert className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">NABH Readiness Overview</div>
              <div className="mt-1 text-sm text-zc-muted">
                Track compliance readiness across all 10 NABH chapters.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchChapterSummary()}
              disabled={!workspaceId}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            <Link href="/compliance/nabh/checklist">
              <Button size="sm" variant="primary">
                <ClipboardCheck className="h-4 w-4 mr-1.5" />
                Full Checklist
              </Button>
            </Link>
          </div>
        </div>

        {/* Guard: no branch */}
        {!activeBranchId ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-zc-muted">
              <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
              Select a branch to view NABH readiness.
            </CardContent>
          </Card>
        ) : noWorkspace && !loading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-zc-muted">
              <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
              No compliance workspace found for this branch. Create one in{" "}
              <Link href="/compliance/workspaces" className="text-zc-accent hover:underline">
                Workspaces
              </Link>{" "}
              first, then initialize the NABH checklist.
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900/50 dark:bg-purple-900/10">
                <div className="text-xs font-medium text-purple-600 dark:text-purple-400">Total Standards</div>
                <div className="mt-1 text-lg font-bold text-purple-700 dark:text-purple-300">{totals.total}</div>
                <div className="mt-0.5 text-[11px] text-purple-600/70 dark:text-purple-400/70">Across {chapters.length} chapters</div>
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 dark:border-green-900/50 dark:bg-green-900/10">
                <div className="text-xs font-medium text-green-600 dark:text-green-400">Compliant</div>
                <div className="mt-1 text-lg font-bold text-green-700 dark:text-green-300">{totals.compliant}</div>
                <div className="mt-0.5 text-[11px] text-green-600/70 dark:text-green-400/70">{pct(totals.compliant, totals.total)}% completion</div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">In Progress</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{totals.inProgress}</div>
                <div className="mt-0.5 text-[11px] text-blue-600/70 dark:text-blue-400/70">{totals.notStarted} not started</div>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                <div className="text-xs font-medium text-red-600 dark:text-red-400">Non-Compliant</div>
                <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{totals.nonCompliant}</div>
                <div className="mt-0.5 text-[11px] text-red-600/70 dark:text-red-400/70">Require immediate attention</div>
              </div>
            </div>

            {/* Chapter Progress */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Chapter Completion</CardTitle>
                <CardDescription>
                  Progress across all 10 NABH chapters
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5">
                {loadingChapters ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-zc-muted" />
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="text-center text-zc-muted py-8">
                    No chapter data available. Ensure a template is selected and
                    checklist items have been loaded.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chapters.map((ch) => {
                      const completionPct = pct(ch.compliant, ch.total);
                      const shortCode =
                        CHAPTER_SHORT[ch.chapter] ?? ch.chapter.slice(0, 3);

                      return (
                        <div key={ch.chapter} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full border border-purple-200/70 bg-purple-50/70 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:border-purple-800/50 dark:bg-purple-900/30 dark:text-purple-300">
                                {shortCode}
                              </span>
                              <span className="font-medium truncate max-w-[280px]">
                                {ch.chapter}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zc-muted">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                {ch.compliant}
                              </span>
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-red-500" />
                                {ch.nonCompliant}
                              </span>
                              <span>
                                {ch.compliant}/{ch.total}
                              </span>
                              <span className="font-medium text-zc-text">
                                {completionPct}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500 transition-all duration-500"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                          {/* Status breakdown */}
                          {(ch.notStarted > 0 || ch.inProgress > 0 || ch.nonCompliant > 0) && (
                            <div className="flex gap-2 ml-1">
                              {ch.notStarted > 0 && (
                                <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50/70 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:border-gray-700/50 dark:bg-gray-800/30 dark:text-gray-300">
                                  {ch.notStarted} Not Started
                                </span>
                              )}
                              {ch.inProgress > 0 && (
                                <span className="inline-flex items-center rounded-full border border-blue-200/70 bg-blue-50/70 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-300">
                                  {ch.inProgress} In Progress
                                </span>
                              )}
                              {ch.nonCompliant > 0 && (
                                <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300">
                                  {ch.nonCompliant} Non-Compliant
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/compliance/nabh/checklist">
                <Card className="hover:border-zc-accent/40 transition cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-purple-200 bg-purple-50/50 dark:border-purple-900/50 dark:bg-purple-900/10">
                        <ClipboardCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          Full Checklist
                        </CardTitle>
                        <CardDescription>
                          Review all standards by chapter
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/compliance/nabh/audits">
                <Card className="hover:border-zc-accent/40 transition cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10">
                        <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          Audit Cycles
                        </CardTitle>
                        <CardDescription>
                          Internal & external audit management
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/compliance/evidence">
                <Card className="hover:border-zc-accent/40 transition cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/10">
                        <ArrowRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          Evidence Vault
                        </CardTitle>
                        <CardDescription>
                          Upload & link compliance documents
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </>
        )}
      </div>
      </RequirePerm>
    </AppShell>
  );
}
