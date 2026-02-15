"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Badge } from "@/components/ui/badge";
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
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/cn";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Printer,
  RefreshCw,
  XCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GoLiveCheck = {
  id: string;
  title: string;
  severity: "BLOCKER" | "WARNING";
  passed: boolean;
  detail: string;
};

type GoLiveSummary = {
  total: number;
  passed: number;
  blockers: number;
  warnings: number;
  score: number;
};

type GoLiveResult = { checks: GoLiveCheck[]; summary: GoLiveSummary };

type GoLiveFix =
  | { kind: "catalog" }
  | { kind: "servicePoint"; servicePointId: string }
  | { kind: "panel"; panelId: string }
  | { kind: "labParams"; itemId: string }
  | { kind: "templates"; itemId: string }
  | { kind: "capability"; itemId: string; servicePointId?: string | null };

// ---------------------------------------------------------------------------
// Fix → route mapping
// ---------------------------------------------------------------------------

function fixRoute(fix: GoLiveFix): string {
  switch (fix.kind) {
    case "catalog":
      return "/infrastructure/diagnostics/catalog";
    case "servicePoint":
      return "/infrastructure/diagnostics/service-points";
    case "panel":
      return "/infrastructure/diagnostics/panels";
    case "labParams":
      return "/infrastructure/diagnostics/parameters";
    case "templates":
      return "/infrastructure/diagnostics/templates";
    case "capability":
      return "/infrastructure/diagnostics/capabilities";
  }
}

function fixForCheck(check: GoLiveCheck): GoLiveFix | undefined {
  const id = check.id;
  if (id === "sections-exist") return { kind: "catalog" };
  if (id === "lab-params" || id === "lab-specimen") return { kind: "catalog" };
  if (id === "numeric-ranges" || id === "critical-ranges")
    return { kind: "catalog" };
  if (
    id === "section-service-points" ||
    id === "sp-staff" ||
    id === "sp-equipment"
  )
    return { kind: "servicePoint", servicePointId: "" };
  if (id === "imaging-equipment" || id === "pcpndt-flag")
    return { kind: "catalog" };
  if (id === "report-templates") return { kind: "catalog" };
  if (id === "service-catalog" || id === "tat-configured")
    return { kind: "catalog" };
  return undefined;
}

// ---------------------------------------------------------------------------
// Score colour helpers
// ---------------------------------------------------------------------------

function scoreColorClass(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function scoreBgClass(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

function scoreRingClass(score: number) {
  if (score >= 80)
    return "border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20";
  if (score >= 60)
    return "border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20";
  return "border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Good";
  if (score >= 60) return "Needs Work";
  return "Critical";
}

// ---------------------------------------------------------------------------
// GoLiveContent
// ---------------------------------------------------------------------------

function GoLiveContent({ branchId }: { branchId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<GoLiveResult | null>(null);
  const [showReport, setShowReport] = React.useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<GoLiveResult>(
        `/api/infrastructure/diagnostics/go-live-validation?branchId=${encodeURIComponent(branchId)}`,
      );
      setResult(data);
    } catch (e: any) {
      setErr(e?.message || "Failed to run go-live validation");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const checks = result?.checks ?? [];
  const failedBlockers = checks.filter(
    (c) => !c.passed && c.severity === "BLOCKER",
  );
  const failedWarnings = checks.filter(
    (c) => !c.passed && c.severity === "WARNING",
  );
  const passedChecks = checks.filter((c) => c.passed);
  const blockers = result?.summary.blockers ?? 0;
  const warns = result?.summary.warnings ?? 0;
  const score = result?.summary.score ?? 0;
  const ready = blockers === 0 && result != null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Go-Live Validation (16 Checks)
          </CardTitle>
          <CardDescription>
            Comprehensive readiness validation powered by backend engine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {err ? (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {err}
            </div>
          ) : null}

          <div
            className={cn(
              "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4",
              ready
                ? "border-emerald-200/70 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100"
                : "border-amber-200/70 bg-amber-50/70 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100",
            )}
          >
            <div className="flex items-center gap-3">
              {ready ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <div>
                <div className="text-sm font-semibold">
                  {ready ? "Ready to go live" : "Needs attention"}
                </div>
                <div className="text-xs opacity-80">
                  {blockers} blocker(s), {warns} warning(s)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void load();
                  toast({ title: "Re-running checks" });
                }}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw
                  className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                />{" "}
                Re-run
              </Button>
            </div>
          </div>

          {result ? (
            <>
              {/* ---- Prominent score + stats ---- */}
              <div className="mb-4 grid gap-3 md:grid-cols-5">
                {/* Large score card */}
                <div
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border p-4 md:col-span-1",
                    scoreRingClass(score),
                  )}
                >
                  <div
                    className={cn(
                      "text-5xl font-extrabold tabular-nums leading-none",
                      scoreColorClass(score),
                    )}
                  >
                    {score}
                    <span className="text-2xl">%</span>
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-xs font-semibold uppercase tracking-wider",
                      scoreColorClass(score),
                    )}
                  >
                    {scoreLabel(score)}
                  </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3 md:col-span-4 md:grid-cols-4">
                  <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                    <div className="text-xs text-zc-muted">Total Checks</div>
                    <div className="mt-1 text-2xl font-semibold">
                      {result.summary.total}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                    <div className="text-xs text-zc-muted">Passed</div>
                    <div className="mt-1 text-2xl font-semibold text-emerald-600">
                      {result.summary.passed}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                    <div className="text-xs text-zc-muted">Blockers</div>
                    <div className="mt-1 text-2xl font-semibold text-rose-600">
                      {blockers}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-3">
                    <div className="text-xs text-zc-muted">Warnings</div>
                    <div className="mt-1 text-2xl font-semibold text-amber-600">
                      {warns}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    scoreBgClass(score),
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>

              <Separator className="my-4" />

              {/* ---- Failed checks grouped by severity ---- */}

              {/* Blockers */}
              {failedBlockers.length > 0 ? (
                <div className="mb-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
                    <XCircle className="h-4 w-4" />
                    Blockers ({failedBlockers.length})
                  </div>
                  <div className="grid gap-2">
                    {failedBlockers.map((check) => (
                      <CheckRow
                        key={check.id}
                        check={check}
                        router={router}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Warnings */}
              {failedWarnings.length > 0 ? (
                <div className="mb-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings ({failedWarnings.length})
                  </div>
                  <div className="grid gap-2">
                    {failedWarnings.map((check) => (
                      <CheckRow
                        key={check.id}
                        check={check}
                        router={router}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Passed checks */}
              {passedChecks.length > 0 ? (
                <div className="mb-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Passed ({passedChecks.length})
                  </div>
                  <div className="grid gap-2">
                    {passedChecks.map((check) => (
                      <div
                        key={check.id}
                        className="flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/10"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="text-sm text-emerald-800 dark:text-emerald-200">
                            {check.title}
                          </span>
                          <Badge variant="success" className="shrink-0">
                            PASS
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <Separator className="my-4" />

              {/* ---- Generate Readiness Report ---- */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-zc-text">
                  <FileText className="h-4 w-4" />
                  Readiness Report
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReport((v) => !v)}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {showReport ? "Hide Report" : "Generate Readiness Report"}
                  </Button>
                  {showReport ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => window.print()}
                      className="gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Print Report
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* ---- Printable Readiness Report ---- */}
      {showReport && result ? (
        <ReadinessReport result={result} branchId={branchId} />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// CheckRow (used in both Blockers and Warnings groups)
// ---------------------------------------------------------------------------

function CheckRow({
  check,
  router,
}: {
  check: GoLiveCheck;
  router: ReturnType<typeof useRouter>;
}) {
  const fix = fixForCheck(check);
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3",
        check.severity === "BLOCKER"
          ? "border-rose-200/70 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20"
          : "border-amber-200/70 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              check.severity === "BLOCKER" ? "destructive" : "warning"
            }
          >
            {check.severity}
          </Badge>
          <Badge variant="destructive" className="text-[10px]">
            FAIL
          </Badge>
          <span
            className={cn(
              "text-sm font-semibold",
              check.severity === "BLOCKER"
                ? "text-rose-800 dark:text-rose-200"
                : "text-amber-800 dark:text-amber-200",
            )}
          >
            {check.title}
          </span>
        </div>
        <div className="mt-1 text-xs text-zc-muted">{check.detail}</div>
      </div>
      {fix ? (
        <Button
          size="sm"
          variant={check.severity === "BLOCKER" ? "primary" : "outline"}
          onClick={() => router.push(fixRoute(fix))}
          className="gap-2 print:hidden"
        >
          Fix <ChevronRight className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReadinessReport (print-friendly)
// ---------------------------------------------------------------------------

function ReadinessReport({
  result,
  branchId,
}: {
  result: GoLiveResult;
  branchId: string;
}) {
  const { summary, checks } = result;
  const blockerChecks = checks.filter((c) => c.severity === "BLOCKER");
  const warningChecks = checks.filter((c) => c.severity === "WARNING");
  const sortedChecks = [...blockerChecks, ...warningChecks];
  const now = new Date().toLocaleString();

  return (
    <div className="go-live-report mt-6">
      {/* Print-only styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              /* Hide everything outside the report */
              body * { visibility: hidden !important; }
              .go-live-report, .go-live-report * { visibility: visible !important; }
              .go-live-report {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 20px !important;
              }
              /* Hide interactive elements when printing */
              .print\\:hidden { display: none !important; }
              /* Clean table styles */
              .go-live-report table {
                width: 100% !important;
                border-collapse: collapse !important;
              }
              .go-live-report th,
              .go-live-report td {
                border: 1px solid #d1d5db !important;
                padding: 8px 12px !important;
                text-align: left !important;
                font-size: 12px !important;
              }
              .go-live-report th {
                background-color: #f3f4f6 !important;
                font-weight: 600 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              /* Status colours in print */
              .print-pass { color: #059669 !important; font-weight: 600 !important; }
              .print-fail { color: #dc2626 !important; font-weight: 600 !important; }
              .print-blocker { color: #dc2626 !important; }
              .print-warning { color: #d97706 !important; }
            }
          `,
        }}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Go-Live Readiness Report
          </CardTitle>
          <CardDescription>
            Branch: {branchId} &middot; Generated: {now}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ---- Summary card ---- */}
          <div
            className={cn(
              "mb-6 flex flex-wrap items-center gap-6 rounded-xl border p-5",
              scoreRingClass(summary.score),
            )}
          >
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "text-6xl font-extrabold tabular-nums leading-none",
                  scoreColorClass(summary.score),
                )}
              >
                {summary.score}
                <span className="text-3xl">%</span>
              </div>
              <div
                className={cn(
                  "mt-1 text-xs font-semibold uppercase tracking-wider",
                  scoreColorClass(summary.score),
                )}
              >
                {scoreLabel(summary.score)}
              </div>
            </div>
            <Separator orientation="vertical" className="hidden h-16 md:block" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
              <div>
                <div className="text-xs text-zc-muted">Total</div>
                <div className="text-lg font-semibold">{summary.total}</div>
              </div>
              <div>
                <div className="text-xs text-zc-muted">Passed</div>
                <div className="text-lg font-semibold text-emerald-600">
                  {summary.passed}
                </div>
              </div>
              <div>
                <div className="text-xs text-zc-muted">Blockers</div>
                <div className="text-lg font-semibold text-rose-600">
                  {summary.blockers}
                </div>
              </div>
              <div>
                <div className="text-xs text-zc-muted">Warnings</div>
                <div className="text-lg font-semibold text-amber-600">
                  {summary.warnings}
                </div>
              </div>
            </div>
          </div>

          {/* ---- Validation results table ---- */}
          <div className="overflow-x-auto rounded-lg border border-zc-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zc-border bg-zc-panel/30">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zc-muted">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zc-muted">
                    Check
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zc-muted">
                    Severity
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zc-muted">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zc-muted">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedChecks.map((check, idx) => (
                  <tr
                    key={check.id}
                    className={cn(
                      "border-b border-zc-border last:border-b-0",
                      !check.passed &&
                        check.severity === "BLOCKER" &&
                        "bg-rose-50/40 dark:bg-rose-950/10",
                      !check.passed &&
                        check.severity === "WARNING" &&
                        "bg-amber-50/30 dark:bg-amber-950/10",
                    )}
                  >
                    <td className="px-4 py-2 tabular-nums text-zc-muted">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2 font-medium">{check.title}</td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          check.severity === "BLOCKER"
                            ? "print-blocker"
                            : "print-warning",
                        )}
                      >
                        <Badge
                          variant={
                            check.severity === "BLOCKER"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {check.severity}
                        </Badge>
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {check.passed ? (
                        <span className="print-pass">
                          <Badge variant="success">PASS</Badge>
                        </span>
                      ) : (
                        <span className="print-fail">
                          <Badge variant="destructive">FAIL</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-zc-muted">
                      {check.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between text-xs text-zc-muted">
            <div>
              Readiness score: {summary.score}% &middot;{" "}
              {summary.passed}/{summary.total} checks passed
            </div>
            <div>Generated: {now}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GoLiveCheckPage() {
  const { branchId } = useBranchContext();

  return (
    <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
      <AppShell title="Diagnostics - Go-Live Check">
        <GoLiveContent branchId={branchId} />
      </AppShell>
    </RequirePerm>
  );
}
