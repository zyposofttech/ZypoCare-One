"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { IconChevronRight, IconFlask } from "@/components/icons";
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
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

import {
  Beaker,
  Bot,
  Compass,
  FlaskConical,
  Layers,
  LayoutTemplate,
  MapPin,
  Package,
  Rocket,
  Upload,
} from "lucide-react";

import {
  PageHeader,
  ErrorAlert,
  StatBox,
  NoBranchGuard,
  OnboardingCallout,
} from "./_shared/components";

/* =========================================================
   Types
   ========================================================= */

type NavTile = {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  step?: number;
};

const NAV_TILES: NavTile[] = [
  {
    title: "Quick Start (Packs)",
    desc: "Apply a bootstrap pack to seed sections, tests, templates, and routing defaults.",
    href: "/infrastructure/diagnostics/packs",
    icon: <Package className="h-4 w-4 text-zc-accent" />,
    step: 1,
  },
  {
    title: "Service Points",
    desc: "Create labs, radiology units, and map rooms, resources, and equipment.",
    href: "/infrastructure/diagnostics/service-points",
    icon: <MapPin className="h-4 w-4 text-zc-accent" />,
    step: 2,
  },
  {
    title: "Test Library",
    desc: "Define sections, categories, specimens, and diagnostic items (tests).",
    href: "/infrastructure/diagnostics/catalog",
    icon: <FlaskConical className="h-4 w-4 text-zc-accent" />,
    step: 3,
  },
  {
    title: "Panels",
    desc: "Build profiles and panels by composing multiple tests together.",
    href: "/infrastructure/diagnostics/panels",
    icon: <Layers className="h-4 w-4 text-zc-accent" />,
    step: 4,
  },
  {
    title: "Result Schema",
    desc: "For lab tests: define parameters, units, and reference ranges.",
    href: "/infrastructure/diagnostics/parameters",
    icon: <Beaker className="h-4 w-4 text-zc-accent" />,
    step: 5,
  },
  {
    title: "Report Templates",
    desc: "Create report templates for lab, imaging, and procedure items.",
    href: "/infrastructure/diagnostics/templates",
    icon: <LayoutTemplate className="h-4 w-4 text-zc-accent" />,
    step: 6,
  },
  {
    title: "Routing Rules",
    desc: "Map items to service points (capabilities) with modality and constraints.",
    href: "/infrastructure/diagnostics/capabilities",
    icon: <Compass className="h-4 w-4 text-zc-accent" />,
    step: 7,
  },
  {
    title: "AI Copilot",
    desc: "AI-powered LOINC/SNOMED mapping, gap analysis, and compliance checks.",
    href: "/infrastructure/diagnostics/copilot",
    icon: <Bot className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Import / Export",
    desc: "Bulk import/export diagnostic configuration as JSON.",
    href: "/infrastructure/diagnostics/import-export",
    icon: <Upload className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Go-Live Check",
    desc: "Validate readiness with 16 automated checks before going live.",
    href: "/infrastructure/diagnostics/go-live",
    icon: <Rocket className="h-4 w-4 text-zc-accent" />,
  },
];

/* =========================================================
   Page
   ========================================================= */

export default function DiagnosticsOverviewPage() {
  const { branchId } = useBranchContext();

  return (
    <AppShell title="Infrastructure - Diagnostics">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        {branchId ? <OverviewContent branchId={branchId} /> : <NoBranchGuard />}
      </RequirePerm>
    </AppShell>
  );
}

/* =========================================================
   OverviewContent
   ========================================================= */

function OverviewContent({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canRead = hasPerm(user, "INFRA_DIAGNOSTICS_READ");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [sectionCount, setSectionCount] = React.useState(0);
  const [itemCount, setItemCount] = React.useState(0);
  const [servicePointCount, setServicePointCount] = React.useState(0);
  const [capabilityCount, setCapabilityCount] = React.useState(0);
  const [panelCount, setPanelCount] = React.useState(0);
  const [templateCount, setTemplateCount] = React.useState(0);

  // AI page insights
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({ module: "diagnostics-overview" });

  const reqSeq = React.useRef(0);

  const loadSummary = React.useCallback(
    async (showToast = false) => {
      const seq = ++reqSeq.current;
      setError(null);
      setLoading(true);

      try {
        const qs = `branchId=${encodeURIComponent(branchId)}`;
        const [sectionsRes, itemsRes, spRes, capsRes, panelsRes, templatesRes] =
          await Promise.allSettled([
            apiFetch<any[]>(`/api/infrastructure/diagnostics/sections?${qs}`),
            apiFetch<any[]>(`/api/infrastructure/diagnostics/items?${qs}`),
            apiFetch<any[]>(`/api/infrastructure/diagnostics/service-points?${qs}`),
            apiFetch<any[]>(`/api/infrastructure/diagnostics/capabilities?${qs}`),
            apiFetch<any[]>(`/api/infrastructure/diagnostics/panels?${qs}`),
            apiFetch<any[]>(`/api/infrastructure/diagnostics/templates?${qs}`),
          ]);

        if (seq !== reqSeq.current) return;

        const partialErrors: string[] = [];

        if (sectionsRes.status === "fulfilled") {
          setSectionCount(Array.isArray(sectionsRes.value) ? sectionsRes.value.length : 0);
        } else {
          setSectionCount(0);
          partialErrors.push("Sections unavailable.");
        }

        if (itemsRes.status === "fulfilled") {
          setItemCount(Array.isArray(itemsRes.value) ? itemsRes.value.length : 0);
        } else {
          setItemCount(0);
          partialErrors.push("Items unavailable.");
        }

        if (spRes.status === "fulfilled") {
          setServicePointCount(Array.isArray(spRes.value) ? spRes.value.length : 0);
        } else {
          setServicePointCount(0);
          partialErrors.push("Service points unavailable.");
        }

        if (capsRes.status === "fulfilled") {
          setCapabilityCount(Array.isArray(capsRes.value) ? capsRes.value.length : 0);
        } else {
          setCapabilityCount(0);
          partialErrors.push("Capabilities unavailable.");
        }

        if (panelsRes.status === "fulfilled") {
          setPanelCount(Array.isArray(panelsRes.value) ? panelsRes.value.length : 0);
        } else {
          setPanelCount(0);
          partialErrors.push("Panels unavailable.");
        }

        if (templatesRes.status === "fulfilled") {
          setTemplateCount(Array.isArray(templatesRes.value) ? templatesRes.value.length : 0);
        } else {
          setTemplateCount(0);
          partialErrors.push("Templates unavailable.");
        }

        if (partialErrors.length) setError(partialErrors.join(" "));

        if (showToast) {
          toast({
            title: partialErrors.length ? "Refreshed (partial)" : "Refreshed",
            description: partialErrors.length
              ? "Some diagnostics signals are not available yet."
              : "Loaded latest diagnostics summary.",
            duration: 1800,
          });
        }
      } catch (e: any) {
        if (seq !== reqSeq.current) return;
        const msg = e?.message || "Unable to load diagnostics summary.";
        setError(msg);
        if (showToast) {
          toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
        }
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    },
    [branchId, toast],
  );

  React.useEffect(() => {
    void loadSummary(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  return (
    <div className="grid gap-6">
      {/* Header */}
      <PageHeader
        icon={<IconFlask className="h-5 w-5 text-zc-accent" />}
        title="Diagnostics Overview"
        description="Dashboard view of your diagnostic configuration module."
        loading={loading}
        onRefresh={() => void loadSummary(true)}
      />

      {/* AI Insights */}
      <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

      {/* Error */}
      <ErrorAlert message={error} />

      {/* Overview Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription className="text-sm">
            Summary of all configured diagnostic entities for this branch.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatBox label="Sections" value={loading ? "\u2014" : sectionCount} color="blue" detail="diagnostic sections" />
            <StatBox label="Test Items" value={loading ? "\u2014" : itemCount} color="emerald" detail="in catalog" />
            <StatBox label="Service Points" value={loading ? "\u2014" : servicePointCount} color="sky" detail="labs & radiology" />
            <StatBox label="Capabilities" value={loading ? "\u2014" : capabilityCount} color="violet" detail="routing rules" />
            <StatBox label="Panels" value={loading ? "\u2014" : panelCount} color="amber" detail="profiles & packages" />
            <StatBox label="Templates" value={loading ? "\u2014" : templateCount} color="rose" detail="report templates" />
          </div>
        </CardContent>
      </Card>

      {/* Navigation Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Setup Modules</CardTitle>
          <CardDescription className="text-sm">
            Navigate to each configuration area. Follow the numbered steps for a smooth setup.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {NAV_TILES.map((tile) => (
              <NavCard key={tile.href} {...tile} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Callout */}
      <OnboardingCallout
        title="Recommended Setup Order"
        description="1) Quick Start (Packs), 2) Service Points, 3) Test Library, 4) Panels, 5) Result Schema, 6) Report Templates, 7) Routing Rules, then run Go-Live Check."
      />
    </div>
  );
}

/* =========================================================
   NavCard
   ========================================================= */

function NavCard({ title, desc, href, icon, step }: NavTile) {
  return (
    <Link href={href as any} className="block">
      <div className="group rounded-2xl border border-zc-border bg-zc-panel/20 p-4 transition-all hover:-translate-y-0.5 hover:bg-zc-panel/35 hover:shadow-elev-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-zc-border bg-zc-panel/25">
                {icon}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {step ? (
                    <span className="grid h-5 w-5 place-items-center rounded-md border border-zc-border bg-zc-card text-[10px] font-bold text-zc-muted">
                      {step}
                    </span>
                  ) : null}
                  <div className="text-sm font-semibold text-zc-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {title}
                  </div>
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
