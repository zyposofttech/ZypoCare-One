"use client";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Receipt,
  FileText,
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

const BILLING_LINKS = [
  { label: "Pre-authorization", href: "/billing/preauth", icon: ShieldCheck, desc: "Manage pre-auth requests with payers" },
  { label: "Claims", href: "/billing/claims", icon: FileText, desc: "Submit and track insurance claims" },
  { label: "Claims Dashboard", href: "/billing/claims-dashboard", icon: TrendingUp, desc: "Overview of billing activity and KPIs" },
  { label: "Insurance Policies", href: "/billing/insurance-policies", icon: ClipboardList, desc: "Patient insurance policy registry" },
  { label: "Insurance Cases", href: "/billing/insurance-cases", icon: Receipt, desc: "Per-encounter insurance case management" },
  { label: "Reconciliation", href: "/billing/reconciliation", icon: CheckCircle2, desc: "Settle and reconcile payer payments" },
  { label: "Document Checklists", href: "/billing/document-checklists", icon: ClipboardList, desc: "Payer-specific document requirements" },
  { label: "Payer Integrations", href: "/billing/payer-integrations", icon: AlertTriangle, desc: "Configure API/HCX/SFTP integrations" },
];

export default function BillingOverviewPage() {
  const branchCtx = useBranchContext();
  const branchId = branchCtx.branchId ?? "";

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "billing-overview",
    enabled: !!branchId,
  });

  return (
    <AppShell title="Billing & TPA">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
            <Receipt className="h-5 w-5 text-zc-accent" />
          </span>
          <div className="min-w-0">
            <div className="text-3xl font-semibold tracking-tight">Billing, Finance & TPA</div>
            <div className="mt-1 text-sm text-zc-muted">
              Insurance workflows, claims processing, pre-authorizations, and financial reconciliation.
            </div>
          </div>
        </div>

        {/* AI Insights Banner */}
        <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

        {/* Quick Navigation */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Billing Modules</CardTitle>
            <CardDescription>Navigate to specific billing and insurance workflows.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {BILLING_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group rounded-xl border border-zc-border bg-zc-card p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zc-panel/40 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30">
                        <Icon className="h-4 w-4 text-zc-muted group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
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

        {/* Setup Links */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Billing Setup</CardTitle>
            <CardDescription>Configure payers, tax codes, tariff plans, and charge master before processing claims.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Tax Codes (GST)", href: "/infrastructure/tax-codes" },
                { label: "Charge Master", href: "/infrastructure/charge-master" },
                { label: "Tariff Plans", href: "/infrastructure/tariff-plans" },
                { label: "Payer Management", href: "/infrastructure/payers" },
                { label: "Payer Contracts", href: "/infrastructure/payer-contracts" },
                { label: "Government Schemes", href: "/infrastructure/gov-schemes" },
                { label: "Pricing Tiers", href: "/infrastructure/pricing-tiers" },
              ].map((link) => (
                <Link key={link.href} href={link.href}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30">
                    {link.label}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
