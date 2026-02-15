"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { IconChevronRight } from "@/components/icons";
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
  Beaker,
  Bot,
  CheckCircle2,
  ClipboardList,
  Compass,
  FlaskConical,
  Layers,
  LayoutTemplate,
  MapPin,
  Package,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Upload,
} from "lucide-react";

// Types

type GoLiveSummary = {
  total: number;
  passed: number;
  blockers: number;
  warnings: number;
  score: number;
};

// Helpers

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-zinc-200 dark:bg-zinc-800",
        className,
      )}
    />
  );
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const pillTones = {
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
  red:
    "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200",
  sky:
    "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200",
  indigo:
    "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200",
  violet:
    "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200",
  zinc:
    "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200",
};

type TileBadge = "Core" | "AI";

const badgeTone: Record<TileBadge, string> = {
  Core: pillTones.emerald,
  AI: pillTones.violet,
};

type Tile = {
  title: string;
  desc: string;
  href: string;
  badge: TileBadge;
  icon: React.ReactNode;
  step?: number;
};

const tiles: Tile[] = [
  {
    title: "Quick Start (Packs)",
    desc: "Apply a bootstrap pack to seed sections, tests, templates, and routing defaults.",
    href: "/infrastructure/diagnostics/packs",
    badge: "Core",
    icon: <Package className="h-4 w-4 text-zc-accent" />,
    step: 1,
  },
  {
    title: "Service Points",
    desc: "Create labs, radiology units, and map rooms, resources, and equipment.",
    href: "/infrastructure/diagnostics/service-points",
    badge: "Core",
    icon: <MapPin className="h-4 w-4 text-zc-accent" />,
    step: 2,
  },
  {
    title: "Test Library",
    desc: "Define sections, categories, specimens, and diagnostic items (tests).",
    href: "/infrastructure/diagnostics/catalog",
    badge: "Core",
    icon: <FlaskConical className="h-4 w-4 text-zc-accent" />,
    step: 3,
  },
  {
    title: "Panels",
    desc: "Build profiles and panels by composing multiple tests together.",
    href: "/infrastructure/diagnostics/panels",
    badge: "Core",
    icon: <Layers className="h-4 w-4 text-zc-accent" />,
    step: 4,
  },
  {
    title: "Result Schema",
    desc: "For lab tests: define parameters, units, and reference ranges.",
    href: "/infrastructure/diagnostics/parameters",
    badge: "Core",
    icon: <Beaker className="h-4 w-4 text-zc-accent" />,
    step: 5,
  },
  {
    title: "Report Templates",
    desc: "Create report templates for lab, imaging, and procedure items.",
    href: "/infrastructure/diagnostics/templates",
    badge: "Core",
    icon: <LayoutTemplate className="h-4 w-4 text-zc-accent" />,
    step: 6,
  },
  {
    title: "Routing Rules",
    desc: "Map items to service points (capabilities) with modality and constraints.",
    href: "/infrastructure/diagnostics/capabilities",
    badge: "Core",
    icon: <Compass className="h-4 w-4 text-zc-accent" />,
    step: 7,
  },
  {
    title: "AI Copilot",
    desc: "AI-powered LOINC/SNOMED mapping, gap analysis, and compliance checks.",
    href: "/infrastructure/diagnostics/copilot",
    badge: "AI",
    icon: <Bot className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Import / Export",
    desc: "Bulk import/export diagnostic configuration as JSON.",
    href: "/infrastructure/diagnostics/import-export",
    badge: "Core",
    icon: <Upload className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Go-Live Check",
    desc: "Validate readiness with 16 automated checks before going live.",
    href: "/infrastructure/diagnostics/go-live",
    badge: "Core",
    icon: <Rocket className="h-4 w-4 text-zc-accent" />,
  },
];

// Sub-components

function StatusPill({ status }: { status: TileBadge }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
        badgeTone[status],
      )}
    >
      {status}
    </span>
  );
}

function ModuleCard({ title, desc, href, badge, icon, step }: Tile) {
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill status={badge} />
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

function SummaryCard({
  label,
  value,
  sub,
  icon,
  tone = "zinc",
  isLoading,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone?: keyof typeof pillTones;
  isLoading?: boolean;
}) {
  const toneCls =
    tone === "emerald"
      ? "border-emerald-200/50 bg-emerald-50/40 dark:border-emerald-900/35 dark:bg-emerald-900/15"
      : tone === "indigo"
        ? "border-indigo-200/50 bg-indigo-50/40 dark:border-indigo-900/35 dark:bg-indigo-900/15"
        : tone === "sky"
          ? "border-sky-200/50 bg-sky-50/40 dark:border-sky-900/35 dark:bg-sky-900/15"
          : tone === "amber"
            ? "border-amber-200/50 bg-amber-50/40 dark:border-amber-900/35 dark:bg-amber-900/15"
            : tone === "violet"
              ? "border-violet-200/50 bg-violet-50/40 dark:border-violet-900/35 dark:bg-violet-900/15"
              : tone === "red"
                ? "border-red-200/50 bg-red-50/40 dark:border-red-900/35 dark:bg-red-900/15"
                : "border-zc-border bg-zc-panel/15";

  return (
    <div className={cn("rounded-xl border p-4", toneCls)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zc-muted">
        <span className="text-zc-muted">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-2">
        {isLoading ? (
          <Skeleton className="h-8 w-20 rounded-lg" />
        ) : (
          <div className="text-2xl font-semibold tabular-nums text-zc-text">
            {value}
          </div>
        )}
      </div>
      {sub && !isLoading && (
        <div className="mt-1 text-xs text-zc-muted">{sub}</div>
      )}
    </div>
  );
}

// Page

export default function DiagnosticsOverviewPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [sectionCount, setSectionCount] = React.useState(0);
  const [itemCount, setItemCount] = React.useState(0);
  const [servicePointCount, setServicePointCount] = React.useState(0);
  const [goLive, setGoLive] = React.useState<GoLiveSummary | null>(null);

  const reqSeq = React.useRef(0);

  const loadSummary = React.useCallback(
    async (showToast = false) => {
      if (!branchId) return;
      const seq = ++reqSeq.current;
      setError(null);
      setLoading(true);

      try {
        const qs = `branchId=${encodeURIComponent(branchId)}`;
        const [sectionsRes, itemsRes, spRes, goLiveRes] =
          await Promise.allSettled([
            apiFetch<any[]>(`/api/infrastructure/diagnostics/sections?${qs}`),
            apiFetch<any[]>(`/api/infrastructure/diagnostics/items?${qs}`),
            apiFetch<any[]>(`/api/infrastructure/diagnostics/service-points?${qs}`),
            apiFetch<GoLiveSummary>(`/api/infrastructure/diagnostics/go-live-validation?${qs}`),
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

        if (goLiveRes.status === "fulfilled") {
          setGoLive(goLiveRes.value || null);
        } else {
          setGoLive(null);
          partialErrors.push("Go-Live readiness unavailable.");
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

  const goLiveScore = safeNum(goLive?.score);
  const goLiveBlockers = safeNum(goLive?.blockers);
  const goLiveWarnings = safeNum(goLive?.warnings);
  const isGoLiveReady = goLiveBlockers === 0 && goLiveScore >= 80;

  return (
    <AppShell title="Infrastructure - Diagnostics">
      <RequirePerm perm="INFRA_DIAGNOSTICS_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <ClipboardList className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">
                  Diagnostics Configuration
                </div>
                <div className="mt-1 text-sm text-zc-muted">
                  Configure catalog, panels, lab parameters, templates, service points, capabilities, and packs.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-zc-border text-xs text-zc-muted"
                onClick={() => void loadSummary(true)}
                disabled={loading}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading ? "animate-spin" : "")} />
                Refresh
              </Button>
              <Button asChild className="gap-2 bg-zc-accent px-5 text-white hover:bg-zc-accent/90">
                <Link href={"/infrastructure/diagnostics/catalog" as any}>
                  <FlaskConical className="h-4 w-4" />
                  Test Library
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2 border-zc-border px-5">
                <Link href={"/infrastructure/diagnostics/go-live" as any}>
                  <Rocket className="h-4 w-4" />
                  Go-Live Check
                </Link>
              </Button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">Partial data loaded</div>
                <div className="mt-0.5 text-xs opacity-80">{error}</div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Sections"
              value={sectionCount}
              sub="diagnostic sections configured"
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              tone="indigo"
              isLoading={loading}
            />

            <SummaryCard
              label="Test Items"
              value={itemCount}
              sub="diagnostic items in catalog"
              icon={<FlaskConical className="h-3.5 w-3.5" />}
              tone="emerald"
              isLoading={loading}
            />

            <SummaryCard
              label="Service Points"
              value={servicePointCount}
              sub="labs & radiology units"
              icon={<MapPin className="h-3.5 w-3.5" />}
              tone="sky"
              isLoading={loading}
            />

            <SummaryCard
              label="Go-Live Readiness"
              value={
                loading ? null : (
                  <span className="flex items-center gap-2">
                    <span>{goLiveScore}%</span>
                    {isGoLiveReady ? (
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>
                        <CheckCircle2 className="h-3 w-3" />
                        Ready
                      </span>
                    ) : (
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]", goLiveBlockers > 0 ? pillTones.red : pillTones.amber)}>
                        <AlertTriangle className="h-3 w-3" />
                        {goLiveBlockers > 0 ? "Blocked" : "Warnings"}
                      </span>
                    )}
                  </span>
                )
              }
              sub={!loading ? `${goLiveBlockers} blocker${goLiveBlockers !== 1 ? "s" : ""} \u00b7 ${goLiveWarnings} warning${goLiveWarnings !== 1 ? "s" : ""}` : undefined}
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              tone={isGoLiveReady ? "emerald" : goLiveBlockers > 0 ? "red" : "amber"}
              isLoading={loading}
            />
          </div>

          {/* Module Tiles */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-zc-text">
              Setup Modules
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tiles.map((t) => (
                <ModuleCard key={t.href} {...t} />
              ))}
            </div>
          </div>

          {/* How It Works */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Recommended Setup Flow</CardTitle>
              <CardDescription className="text-sm">
                Follow these steps in order for a smooth diagnostics configuration. Each step builds on the previous one.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 text-sm text-zc-muted">
              <ul className="list-disc space-y-2 pl-5">
                <li><span className="font-medium text-zc-text">1. Quick Start (Packs)</span> &mdash; Apply a bootstrap pack to seed sections, tests, templates, and routing defaults.</li>
                <li><span className="font-medium text-zc-text">2. Service Points</span> &mdash; Create lab and radiology units, map rooms, resources, and equipment.</li>
                <li><span className="font-medium text-zc-text">3. Test Library</span> &mdash; Define sections, categories, specimens, and diagnostic items (tests).</li>
                <li><span className="font-medium text-zc-text">4. Panels</span> &mdash; Build profiles and panels by composing multiple tests together.</li>
                <li><span className="font-medium text-zc-text">5. Result Schema</span> &mdash; For lab tests: define parameters, units, and reference ranges.</li>
                <li><span className="font-medium text-zc-text">6. Report Templates</span> &mdash; Create report templates for lab, imaging, and procedure items.</li>
                <li><span className="font-medium text-zc-text">7. Routing Rules</span> &mdash; Map items to service points (capabilities) with modality and constraints.</li>
                <li><span className="font-medium text-zc-text">Go-Live Check</span> &mdash; Validate readiness with 16 automated checks before going live.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
