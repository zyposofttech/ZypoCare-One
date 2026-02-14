"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, FileBarChart, Download } from "lucide-react";

interface ReportCard {
  key: string;
  title: string;
  description: string;
  endpoint: string;
}

const REPORTS: ReportCard[] = [
  {
    key: "naco-annual",
    title: "NACO Annual Return",
    endpoint: "/api/blood-bank/reports/naco-annual",
    description: "Annual return as per National AIDS Control Organisation format",
  },
  {
    key: "sbtc-quarterly",
    title: "SBTC Quarterly Return",
    endpoint: "/api/blood-bank/reports/sbtc-quarterly",
    description: "Quarterly report for State Blood Transfusion Council",
  },
  {
    key: "utilization",
    title: "Blood Utilization",
    endpoint: "/api/blood-bank/reports/utilization",
    description: "Component-wise utilization analysis and C/T ratios",
  },
  {
    key: "haemovigilance",
    title: "Haemovigilance",
    endpoint: "/api/blood-bank/reports/haemovigilance",
    description: "Adverse reaction summary and haemovigilance reporting",
  },
  {
    key: "discard-analysis",
    title: "Discard Analysis",
    endpoint: "/api/blood-bank/reports/discard-analysis",
    description: "Wastage analysis by reason, component type, and period",
  },
  {
    key: "donor-deferral",
    title: "Donor Deferral",
    endpoint: "/api/blood-bank/reports/donor-deferral",
    description: "Deferral analysis by reason and trends",
  },
  {
    key: "tti-seroprevalence",
    title: "TTI Seroprevalence",
    endpoint: "/api/blood-bank/reports/tti-seroprevalence",
    description: "TTI marker prevalence trending and analysis",
  },
  {
    key: "daily-summary",
    title: "Daily Summary",
    endpoint: "/api/blood-bank/reports/daily-summary",
    description: "Daily operations summary for blood bank",
  },
];

export default function ReportsPage() {
  const { branchId } = useBranchContext();
  const [loadingReport, setLoadingReport] = React.useState<string | null>(null);

  async function handleGenerate(report: ReportCard) {
    if (!branchId) return;
    setLoadingReport(report.key);
    try {
      const res = await apiFetch<Blob>(
        `${report.endpoint}?branchId=${branchId}`,
        {
          method: "GET",
          showLoader: false,
          headers: { Accept: "application/pdf,application/octet-stream,*/*" },
        },
      );

      // If the response is a Blob or has downloadable content, trigger download
      if (res instanceof Blob) {
        const url = URL.createObjectURL(res);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${report.key}-report.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        // JSON response - open in new tab as fallback
        const blob = new Blob([JSON.stringify(res, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        URL.revokeObjectURL(url);
      }
    } catch {
      // Error handling is managed by apiFetch (global loader / toast)
    } finally {
      setLoadingReport(null);
    }
  }

  return (
    <AppShell title="Blood Bank Reports">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          <FileBarChart className="h-6 w-6 text-blue-600" />
          <div className="text-2xl font-semibold">Blood Bank Reports</div>
        </div>

        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((report) => {
            const isLoading = loadingReport === report.key;
            return (
              <Card key={report.key}>
                <CardHeader>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={isLoading || !branchId}
                    onClick={() => handleGenerate(report)}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? "Generating..." : "Generate Report"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
