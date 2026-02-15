"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import { IconChevronRight } from "@/components/icons";

import {
  ArrowLeft,
  BedDouble,
  Calendar,
  CheckCircle2,
  DollarSign,
  Hospital,
  Microscope,
  RefreshCw,
  Shield,
  Sparkles,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";

import type { OtSuiteRow } from "../_shared/types";
import { NoBranchGuard, StatBox, ErrorAlert, OnboardingCallout, CodeBadge } from "../_shared/components";
import { statusBadge, readinessBadge } from "../_shared/utils";

/* =========================================================
   Suite Overview Page — OTS-001 through OTS-005
   Hub for navigating to all 9 configuration sub-pages
   ========================================================= */

export default function SuiteOverviewPage(props: { params: Promise<{ suiteId: string }> }) {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="OT Suite Overview">
      <RequirePerm perm="ot.suite.read">
        {branchId ? <OverviewContent branchId={branchId} params={props.params} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

/* ---- Nav tile type ---- */

type NavTile = {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  color: "blue" | "sky" | "violet" | "emerald" | "amber" | "rose" | "indigo";
  stat?: string | number;
  step: number;
};

/* ---- Content ---- */

function OverviewContent({ branchId, params }: { branchId: string; params: Promise<{ suiteId: string }> }) {
  const { suiteId } = React.use(params);
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [suite, setSuite] = React.useState<OtSuiteRow | null>(null);

  // Counts for stat cards
  const [counts, setCounts] = React.useState({
    spaces: 0, theatres: 0, equipment: 0, staff: 0,
    storeLinked: false, validationScore: 0,
  });

  // AI insights
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "ot-suite-overview" });

  const loadSuite = React.useCallback(async (showToast = false) => {
    setError(null);
    setLoading(true);
    try {
      const qs = `?branchId=${encodeURIComponent(branchId)}`;
      const [suiteData, spacesData, equipData, staffData, storeData, validationData] = await Promise.allSettled([
        apiFetch<OtSuiteRow>(`/api/infrastructure/ot/suites/${suiteId}${qs}`),
        apiFetch<any[]>(`/api/infrastructure/ot/suites/${suiteId}/spaces${qs}`),
        apiFetch<any[]>(`/api/infrastructure/ot/suites/${suiteId}/equipment${qs}`),
        apiFetch<any[]>(`/api/infrastructure/ot/staff/suites/${suiteId}/assignments${qs}`),
        apiFetch<any[]>(`/api/infrastructure/ot/store/suites/${suiteId}/store-links${qs}`),
        apiFetch<any>(`/api/infrastructure/ot/validation/suites/${suiteId}/go-live${qs}`),
      ]);

      if (suiteData.status === "fulfilled") setSuite(suiteData.value);
      else setError("Failed to load suite.");

      const spaces = spacesData.status === "fulfilled" ? (Array.isArray(spacesData.value) ? spacesData.value : []) : [];
      const equip = equipData.status === "fulfilled" ? (Array.isArray(equipData.value) ? equipData.value : []) : [];
      const staff = staffData.status === "fulfilled" ? (Array.isArray(staffData.value) ? staffData.value : []) : [];
      const store = storeData.status === "fulfilled" ? (Array.isArray(storeData.value) ? storeData.value : []) : [];
      const validation = validationData.status === "fulfilled" ? validationData.value : null;

      setCounts({
        spaces: spaces.length,
        theatres: spaces.filter((s: any) => s.type === "THEATRE").length,
        equipment: equip.length,
        staff: staff.length,
        storeLinked: store.length > 0,
        validationScore: validation?.score ?? (suiteData.status === "fulfilled" ? suiteData.value?.lastValidationScore ?? 0 : 0),
      });

      if (showToast) toast({ title: "Suite refreshed" });
    } catch (e: any) {
      setError(e?.message || "Failed to load suite overview.");
    } finally {
      setLoading(false);
    }
  }, [branchId, suiteId, toast]);

  React.useEffect(() => { void loadSuite(false); }, [loadSuite]);

  const baseHref = `/infrastructure/ot/${suiteId}`;

  const tiles: NavTile[] = [
    { title: "Spaces", desc: "Theatres, recovery bays, scrub rooms, induction rooms, and stores.", href: `${baseHref}/spaces`, icon: <BedDouble className="h-4 w-4" />, color: "blue", stat: counts.spaces, step: 1 },
    { title: "Theatres", desc: "Engineering specs, specialties, scheduling params, operating hours.", href: `${baseHref}/theatres`, icon: <Microscope className="h-4 w-4" />, color: "indigo", stat: counts.theatres, step: 2 },
    { title: "Equipment", desc: "Inventory, mandatory checks, maintenance tracking, downtime impact.", href: `${baseHref}/equipment`, icon: <Wrench className="h-4 w-4" />, color: "violet", stat: counts.equipment, step: 3 },
    { title: "Staff & Access", desc: "Assignments, surgeon/anesthetist privileges, zone access, staffing rules.", href: `${baseHref}/staff-access`, icon: <Users className="h-4 w-4" />, color: "sky", stat: counts.staff, step: 4 },
    { title: "Store & Consumables", desc: "Pharmacy store links, consumable templates, implant rules, par levels.", href: `${baseHref}/store-consumables`, icon: <Warehouse className="h-4 w-4" />, color: "amber", stat: counts.storeLinked ? "Linked" : "Not Linked", step: 5 },
    { title: "Scheduling", desc: "Operating hours, surgery defaults, cancellation, booking approval, recovery.", href: `${baseHref}/scheduling`, icon: <Calendar className="h-4 w-4" />, color: "emerald", step: 6 },
    { title: "Billing", desc: "Service links, charge components, tariff mapping, surgical packages.", href: `${baseHref}/billing`, icon: <DollarSign className="h-4 w-4" />, color: "rose", step: 7 },
    { title: "Compliance", desc: "WHO checklist, infection control, fumigation, biomedical waste, fire safety.", href: `${baseHref}/compliance`, icon: <Shield className="h-4 w-4" />, color: "amber", step: 8 },
    { title: "Validation", desc: "Go-Live checks, review workflow, activation, decommission, reports.", href: `${baseHref}/validation`, icon: <CheckCircle2 className="h-4 w-4" />, color: "emerald", stat: `${counts.validationScore}%`, step: 9 },
    { title: "AI Copilot", desc: "Readiness scoring, gap analysis, equipment & staffing suggestions, compliance checkup.", href: `${baseHref}/copilot`, icon: <Sparkles className="h-4 w-4" />, color: "indigo", step: 10 },
  ];

  const rBadge = readinessBadge(counts.validationScore);

  return (
    <div className="grid gap-6">
      {/* Back link */}
      <div className="flex items-center gap-3">
        <Link href="/infrastructure/ot" className="flex items-center gap-2 text-sm text-zc-muted hover:text-zc-text transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to OT Suites
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
            <Hospital className="h-5 w-5 text-zc-accent" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-semibold tracking-tight">{suite?.name ?? "Loading..."}</div>
              {suite?.code ? <CodeBadge>{suite.code}</CodeBadge> : null}
            </div>
            <div className="mt-1 flex items-center gap-2">
              {suite?.status ? (
                <Badge variant="outline" className={cn("text-[10px]", statusBadge(suite.status))}>
                  {suite.status.replace(/_/g, " ")}
                </Badge>
              ) : null}
              <Badge variant="outline" className={cn("text-[10px]", rBadge.cls)}>
                Readiness: {rBadge.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2 px-5" onClick={() => void loadSuite(true)} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {suite ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-zc-muted">
            <span>Setup Progress</span>
            <span className="font-semibold text-zc-text">{counts.validationScore}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zc-panel/40">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                counts.validationScore >= 90 ? "bg-emerald-500" : counts.validationScore >= 60 ? "bg-amber-500" : "bg-rose-500",
              )}
              style={{ width: `${Math.min(counts.validationScore, 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* AI Insights */}
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Error */}
      <ErrorAlert message={error} />

      {/* Quick stats grid */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Configuration Summary</CardTitle>
          <CardDescription className="text-sm">Click any section to navigate to its configuration page.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatBox label="Spaces" value={loading ? "\u2014" : counts.spaces} color="blue" detail="total spaces" onClick={() => router.push(`${baseHref}/spaces`)} />
            <StatBox label="Theatres" value={loading ? "\u2014" : counts.theatres} color="indigo" detail="active theatres" onClick={() => router.push(`${baseHref}/theatres`)} />
            <StatBox label="Equipment" value={loading ? "\u2014" : counts.equipment} color="violet" detail="inventory items" onClick={() => router.push(`${baseHref}/equipment`)} />
            <StatBox label="Staff" value={loading ? "\u2014" : counts.staff} color="sky" detail="assigned" onClick={() => router.push(`${baseHref}/staff-access`)} />
            <StatBox label="Validation" value={loading ? "\u2014" : `${counts.validationScore}%`} color="emerald" detail="go-live score" onClick={() => router.push(`${baseHref}/validation`)} />
          </div>
        </CardContent>
      </Card>

      {/* Navigation tiles */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Setup Modules</CardTitle>
          <CardDescription className="text-sm">Navigate to each configuration area. Follow the numbered steps for a smooth setup.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tiles.map((tile) => (
              <NavCard key={tile.href} {...tile} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Onboarding callout */}
      <OnboardingCallout
        title="Recommended Setup Order"
        description="1) Spaces, 2) Theatres, 3) Equipment, 4) Staff & Access, 5) Store & Consumables, 6) Scheduling, 7) Billing, 8) Compliance, then 9) Run Validation to activate."
      />
    </div>
  );
}

/* ---- NavCard ---- */

function NavCard({ title, desc, href, icon, color, stat, step }: NavTile) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    sky: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
  };

  return (
    <Link href={href as any} className="block">
      <div className="group rounded-2xl border border-zc-border bg-zc-panel/20 p-4 transition-all hover:-translate-y-0.5 hover:bg-zc-panel/35 hover:shadow-elev-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("grid h-9 w-9 place-items-center rounded-xl border border-zc-border bg-zc-panel/25", colorMap[color])}>
                {icon}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-md border border-zc-border bg-zc-card text-[10px] font-bold text-zc-muted">
                    {step}
                  </span>
                  <div className="text-sm font-semibold text-zc-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {title}
                  </div>
                  {stat !== undefined ? (
                    <Badge variant="outline" className="text-[10px] ml-1">{stat}</Badge>
                  ) : null}
                </div>
                <div className="mt-1 text-sm text-zc-muted">{desc}</div>
              </div>
            </div>
          </div>
          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition-colors group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50">
            <IconChevronRight className="h-4 w-4 text-zc-muted transition-all group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
          </div>
        </div>
      </div>
    </Link>
  );
}
