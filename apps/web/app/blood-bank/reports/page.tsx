"use client";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch, IconChevronRight } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw, FileBarChart, Download, Calendar } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReportCard {
  key: string;
  title: string;
  description: string;
  endpoint: string;
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const REPORTS: ReportCard[] = [
  {
    key: "naco-annual",
    title: "NACO Annual Return",
    description: "Annual return as per National AIDS Control Organisation format",
    endpoint: "/api/blood-bank/reports/naco-annual",
  },
  {
    key: "sbtc-quarterly",
    title: "SBTC Quarterly Return",
    description: "Quarterly report for State Blood Transfusion Council",
    endpoint: "/api/blood-bank/reports/sbtc-quarterly",
  },
  {
    key: "utilization",
    title: "Blood Utilization",
    description: "Component-wise utilization analysis and C/T ratios",
    endpoint: "/api/blood-bank/reports/utilization",
  },
  {
    key: "haemovigilance",
    title: "Haemovigilance",
    description: "Adverse reaction summary and haemovigilance reporting",
    endpoint: "/api/blood-bank/reports/haemovigilance",
  },
  {
    key: "discard-analysis",
    title: "Discard Analysis",
    description: "Wastage analysis by reason, component type, and period",
    endpoint: "/api/blood-bank/reports/discard-analysis",
  },
  {
    key: "donor-deferral",
    title: "Donor Deferral",
    description: "Donor deferral analysis by reason and demographics",
    endpoint: "/api/blood-bank/reports/donor-deferral",
  },
  {
    key: "tti-seroprevalence",
    title: "TTI Seroprevalence",
    description: "TTI seroprevalence trending and statistics",
    endpoint: "/api/blood-bank/reports/tti-seroprevalence",
  },
  {
    key: "daily-summary",
    title: "Daily Summary",
    description: "Daily operations summary report",
    endpoint: "/api/blood-bank/reports/daily-summary",
  },
];

const FORMAT_OPTIONS = ["PDF", "Excel", "CSV"] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[980px] translate-x-0 translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_REPORT_READ");
  const canExport = hasPerm(user, "BB_REPORT_EXPORT");

  /* ---- local state ---- */
  const [q, setQ] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  /* dialog state */
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeReport, setActiveReport] = React.useState<ReportCard | null>(null);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [format, setFormat] = React.useState<string>("PDF");
  const [generating, setGenerating] = React.useState(false);
  const [dialogErr, setDialogErr] = React.useState<string | null>(null);

  /* ---- filtered reports ---- */
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return REPORTS;
    return REPORTS.filter((r) => {
      const hay = `${r.title} ${r.description}`.toLowerCase();
      return hay.includes(s);
    });
  }, [q]);

  /* ---- open report dialog ---- */
  function openReportDialog(report: ReportCard) {
    setActiveReport(report);
    setDateFrom("");
    setDateTo("");
    setFormat("PDF");
    setDialogErr(null);
    setGenerating(false);
    setDialogOpen(true);
  }

  /* ---- generate report ---- */
  async function handleGenerate() {
    if (!activeReport) return;
    if (!branchId) {
      setDialogErr("No branch selected. Please select a branch first.");
      return;
    }
    if (!dateFrom) {
      setDialogErr("Start date is required.");
      return;
    }
    if (!dateTo) {
      setDialogErr("End date is required.");
      return;
    }

    setDialogErr(null);
    setGenerating(true);
    try {
      const res: any = await apiFetch(
        `${activeReport.endpoint}?branchId=${branchId}&from=${dateFrom}&to=${dateTo}&format=${format}`,
      );
      toast({
        title: "Report Generated",
        description: `Successfully generated "${activeReport.title}" report.`,
        variant: "success",
      });
      setDialogOpen(false);
    } catch (e: any) {
      setDialogErr(e?.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppShell title="Blood Bank Reports">
      <div className="grid gap-6">
        {/* ---- Header ---- */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <FileBarChart className="h-5 w-5 text-blue-600" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-zc-text">Blood Bank Reports</div>
              <div className="mt-1 text-sm text-zc-muted">
                Generate regulatory and analytical reports
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" disabled>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* ---- Error banner ---- */}
        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* ---- Stats overview ---- */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Blood bank report generation hub. Select a report card below to configure and generate.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Reports Available</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{REPORTS.length}</div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700/50 dark:bg-gray-800/10">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Last Generated</div>
                <div className="mt-1 text-lg font-bold text-gray-700 dark:text-gray-300">--</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Export Formats</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{FORMAT_OPTIONS.length}</div>
              </div>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search reports by title or description..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{REPORTS.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ---- Report cards grid ---- */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((report) => (
            <div
              key={report.key}
              className="rounded-xl border border-zc-border bg-zc-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20">
                  <FileBarChart className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zc-text">{report.title}</h3>
                  <p className="text-xs text-zc-muted">{report.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => openReportDialog(report)}>
                  <Download className="mr-2 h-3.5 w-3.5" /> Generate
                </Button>
              </div>
            </div>
          ))}

          {!filtered.length ? (
            <div className="col-span-full py-10 text-center text-sm text-zc-muted">
              No reports match your search.
            </div>
          ) : null}
        </div>

        {/* ---- Bottom tip ---- */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Report generation tips</div>
              <div className="mt-1 text-sm text-zc-muted">
                Select a report card, configure the date range and export format, then click Generate. NACO and SBTC reports follow regulatory formats and are typically generated quarterly or annually.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Report Generation Dialog (drawer-style) ---- */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setDialogErr(null);
            setDialogOpen(false);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <FileBarChart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {activeReport?.title ?? "Generate Report"}
            </DialogTitle>
            <DialogDescription>
              {activeReport?.description ?? "Configure and generate a blood bank report."}
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {dialogErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{dialogErr}</div>
            </div>
          ) : null}

          <div className="grid gap-6">
            {/* Date range */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Date Range</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Format */}
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-zc-text">Export Format</div>
              <div className="grid gap-2">
                <Label>Format</Label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-zc-border bg-zc-card px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {FORMAT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={generating}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleGenerate()}
                disabled={generating || !canExport}
                title={!canExport ? "Missing permission: BB_REPORT_EXPORT" : undefined}
                className="gap-2"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {generating ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
