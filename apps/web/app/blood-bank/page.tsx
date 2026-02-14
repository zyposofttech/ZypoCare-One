"use client";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, Settings, Users, FlaskConical, Package, GitBranch, FileBarChart, Shield } from "lucide-react";
import Link from "next/link";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

const MODULE_LINKS = [
  { label: "Facility Setup", href: "/blood-bank/facility", icon: Settings, desc: "License, SBTC/NACO registration, operating hours" },
  { label: "Component Types", href: "/blood-bank/components", icon: Package, desc: "Define blood components, shelf life, storage" },
  { label: "Equipment", href: "/blood-bank/equipment", icon: Settings, desc: "Fridges, freezers, agitators, temp monitoring" },
  { label: "Reagents", href: "/blood-bank/reagents", icon: FlaskConical, desc: "Reagent inventory, lot tracking, expiry" },
  { label: "Tariff Config", href: "/blood-bank/tariff", icon: FileBarChart, desc: "Processing charges, govt scheme rates" },
  { label: "Donor Registry", href: "/blood-bank/donors", icon: Users, desc: "Donor management, screening, deferrals" },
  { label: "Blood Collection", href: "/blood-bank/collection", icon: Droplet, desc: "Collection worklist, adverse events" },
  { label: "Component Separation", href: "/blood-bank/separation", icon: GitBranch, desc: "Separate whole blood into components" },
  { label: "Testing Lab", href: "/blood-bank/testing", icon: FlaskConical, desc: "Blood grouping, TTI testing, verification" },
  { label: "Inventory Dashboard", href: "/blood-bank/inventory", icon: Package, desc: "Real-time stock by group & component" },
  { label: "Blood Requests", href: "/blood-bank/requests", icon: FileBarChart, desc: "Clinical blood request dashboard" },
  { label: "Cross-Match Workbench", href: "/blood-bank/cross-match", icon: Shield, desc: "Cross-matching, compatibility certificates" },
  { label: "Issue Desk", href: "/blood-bank/issue", icon: Droplet, desc: "Blood issue, bedside verification" },
  { label: "Transfusion Monitor", href: "/blood-bank/transfusion", icon: Droplet, desc: "Transfusion tracking, vitals, reactions" },
  { label: "MTP Dashboard", href: "/blood-bank/mtp", icon: Shield, desc: "Massive Transfusion Protocol management" },
  { label: "Quality Control", href: "/blood-bank/qc", icon: FlaskConical, desc: "IQC, EQAS, equipment calibration" },
  { label: "Reports", href: "/blood-bank/reports", icon: FileBarChart, desc: "NACO, SBTC, utilization, haemovigilance" },
  { label: "Donation Camps", href: "/blood-bank/camps", icon: Users, desc: "Outdoor donation camp management" },
  { label: "Adverse Reactions", href: "/blood-bank/reactions", icon: Shield, desc: "Transfusion reaction reporting" },
  { label: "Audit Trail", href: "/blood-bank/audit", icon: FileBarChart, desc: "Blood bank activity audit log" },
];

export default function BloodBankOverviewPage() {
  const branchCtx = useBranchContext();
  const branchId = branchCtx.branchId ?? "";

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "blood-bank-overview",
    enabled: !!branchId,
  });

  return (
    <AppShell title="Blood Bank">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
            <Droplet className="h-5 w-5 text-red-500" />
          </span>
          <div className="min-w-0">
            <div className="text-3xl font-semibold tracking-tight">Blood Bank Management</div>
            <div className="mt-1 text-sm text-zc-muted">
              Donor management, collection, testing, inventory, cross-matching, issue, transfusion monitoring, and regulatory reporting.
            </div>
          </div>
        </div>

        <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Blood Bank Modules</CardTitle>
            <CardDescription>Navigate to specific blood bank workflows and management screens.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {MODULE_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href as any}
                    className="group rounded-xl border border-zc-border bg-zc-card p-4 transition-colors hover:border-red-300 hover:bg-red-50/30 dark:hover:border-red-700 dark:hover:bg-red-900/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zc-panel/40 group-hover:bg-red-100 dark:group-hover:bg-red-900/30">
                        <Icon className="h-4 w-4 text-zc-muted group-hover:text-red-600 dark:group-hover:text-red-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{link.label}</div>
                        <div className="text-xs text-zc-muted">{link.desc}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
