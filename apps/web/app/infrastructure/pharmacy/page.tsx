"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { IconChevronRight } from "@/components/icons";
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
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderTree,
  Package,
  Pill,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  Truck,
  Upload,
} from "lucide-react";

// Types

type StoreSummary = {
  total: number;
  active: number;
  inactive: number;
  mainStore: number;
  subStore: number;
};

type DrugSummary = {
  totalDrugs: number;
  activeDrugs: number;
  narcotics: number;
  withReorderLevel: number;
};

type FormularySummary = {
  status: "PUBLISHED" | "DRAFT" | "NONE";
  version: number | null;
  itemCount: number;
};

type SupplierSummary = {
  total: number;
  active: number;
};

type GoLiveSummary = {
  score: number;
  blockers: number;
  warnings: number;
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

type TileBadge = "Core" | "Planned";

const badgeTone: Record<TileBadge, string> = {
  Core: pillTones.emerald,
  Planned: pillTones.zinc,
};

type Tile = {
  title: string;
  desc: string;
  href: string;
  badge: TileBadge;
  icon: React.ReactNode;
};

const tiles: Tile[] = [
  {
    title: "Stores",
    desc: "Configure pharmacy store locations, types (main/sub), and operational status.",
    href: "/infrastructure/pharmacy/stores",
    badge: "Core",
    icon: <Building2 className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Drug Master",
    desc: "Manage the drug catalog: generics, brands, categories, dosage forms, and schedules.",
    href: "/infrastructure/pharmacy/drugs",
    badge: "Core",
    icon: <Pill className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Formulary",
    desc: "Publish and version hospital formularies with tier-based drug inclusion rules.",
    href: "/infrastructure/pharmacy/formulary",
    badge: "Core",
    icon: <FileText className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Suppliers",
    desc: "Onboard and manage pharmaceutical suppliers, contracts, and lead times.",
    href: "/infrastructure/pharmacy/suppliers",
    badge: "Core",
    icon: <Truck className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Inventory Configuration",
    desc: "Set reorder levels, safety stock, bin locations, and ABC analysis parameters.",
    href: "/infrastructure/pharmacy/inventory",
    badge: "Planned",
    icon: <Package className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Narcotics & Controlled Substances",
    desc: "Track Schedule H / H1 / X drugs with enhanced audit trails and register management.",
    href: "/infrastructure/pharmacy/narcotics",
    badge: "Planned",
    icon: <ShieldCheck className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Indent Mapping",
    desc: "Define indent routes between stores and departments for automated requisitions.",
    href: "/infrastructure/pharmacy/indent-mapping",
    badge: "Planned",
    icon: <ClipboardList className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Drug Interactions",
    desc: "Manage drug-drug interaction alerts.",
    href: "/infrastructure/pharmacy/interactions",
    badge: "Planned",
    icon: <AlertTriangle className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Therapeutic Substitutions",
    desc: "Define drug equivalents.",
    href: "/infrastructure/pharmacy/substitutions",
    badge: "Planned",
    icon: <Repeat2 className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Drug Categories",
    desc: "Hierarchical drug classification.",
    href: "/infrastructure/pharmacy/categories",
    badge: "Planned",
    icon: <FolderTree className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Bulk Import",
    desc: "Import drugs and suppliers in bulk.",
    href: "/infrastructure/pharmacy/bulk-import",
    badge: "Planned",
    icon: <Upload className="h-4 w-4 text-zc-accent" />,
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

function ModuleCard({ title, desc, href, badge, icon }: Tile) {
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
                <div className="text-sm font-semibold text-zc-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {title}
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

export default function PharmacyOverviewPage() {
  const { toast } = useToast();
  const { branchId } = useBranchContext();

  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "pharmacy",
    enabled: !!branchId,
  });

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [storeSummary, setStoreSummary] = React.useState<StoreSummary | null>(null);
  const [drugSummary, setDrugSummary] = React.useState<DrugSummary | null>(null);
  const [formularySummary, setFormularySummary] = React.useState<FormularySummary | null>(null);
  const [supplierSummary, setSupplierSummary] = React.useState<SupplierSummary | null>(null);
  const [goLive, setGoLive] = React.useState<GoLiveSummary | null>(null);

  const reqSeq = React.useRef(0);

  const loadSummary = React.useCallback(
    async (showToast = false) => {
      const seq = ++reqSeq.current;
      setError(null);
      setLoading(true);

      try {
        const [storeRes, drugRes, formularyRes, supplierRes, goLiveRes] =
          await Promise.allSettled([
            apiFetch<StoreSummary>("/infrastructure/pharmacy/stores/summary"),
            apiFetch<DrugSummary>("/infrastructure/pharmacy/drugs/summary"),
            apiFetch<FormularySummary>("/infrastructure/pharmacy/formulary"),
            apiFetch<SupplierSummary>("/infrastructure/pharmacy/suppliers?pageSize=1"),
            apiFetch<GoLiveSummary>("/infrastructure/pharmacy/go-live-checks"),
          ]);

        if (seq !== reqSeq.current) return;

        const partialErrors: string[] = [];

        if (storeRes.status === "fulfilled") {
          setStoreSummary(storeRes.value || null);
        } else {
          setStoreSummary(null);
          partialErrors.push("Store summary unavailable.");
        }

        if (drugRes.status === "fulfilled") {
          setDrugSummary(drugRes.value || null);
        } else {
          setDrugSummary(null);
          partialErrors.push("Drug summary unavailable.");
        }

        if (formularyRes.status === "fulfilled") {
          setFormularySummary(formularyRes.value || null);
        } else {
          setFormularySummary(null);
          partialErrors.push("Formulary summary unavailable.");
        }

        if (supplierRes.status === "fulfilled") {
          setSupplierSummary(supplierRes.value || null);
        } else {
          setSupplierSummary(null);
          partialErrors.push("Supplier summary unavailable.");
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
              ? "Some pharmacy signals are not available yet."
              : "Loaded latest pharmacy summary.",
            duration: 1800,
          });
        }
      } catch (e: any) {
        if (seq !== reqSeq.current) return;
        const msg = e?.message || "Unable to load pharmacy summary.";
        setError(msg);
        if (showToast) {
          toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
        }
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    },
    [toast],
  );

  React.useEffect(() => {
    void loadSummary(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // Derived values

  const storeTotal = safeNum(storeSummary?.total);
  const storeActive = safeNum(storeSummary?.active);
  const storeInactive = safeNum(storeSummary?.inactive);

  const drugTotal = safeNum(drugSummary?.totalDrugs);
  const drugActive = safeNum(drugSummary?.activeDrugs);
  const narcoticsCount = safeNum(drugSummary?.narcotics);
  const drugsWithReorder = safeNum(drugSummary?.withReorderLevel);

  const formularyStatus = formularySummary?.status ?? "NONE";
  const formularyVersion = formularySummary?.version;
  const formularyItemCount = safeNum(formularySummary?.itemCount);

  const supplierTotal = safeNum(supplierSummary?.total);
  const supplierActive = safeNum(supplierSummary?.active);

  const goLiveScore = safeNum(goLive?.score);
  const goLiveBlockers = safeNum(goLive?.blockers);
  const goLiveWarnings = safeNum(goLive?.warnings);

  const isGoLiveReady = goLiveBlockers === 0 && goLiveScore >= 80;

  return (
    <AppShell title="Infrastructure - Pharmacy">
      <RequirePerm perm="INFRA_PHARMACY_STORE_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <Pill className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-3xl font-semibold tracking-tight">
                    Pharmacy Infrastructure
                  </div>
                </div>
                <div className="mt-1 text-sm text-zc-muted">
                  Configure pharmacy stores, drug master data, formulary management, supplier.
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
                <Link href={"/infrastructure/pharmacy/stores" as any}>
                  <Building2 className="h-4 w-4" />
                  Manage Stores
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2 border-zc-border px-5">
                <Link href={"/infrastructure/pharmacy/drugs" as any}>
                  <Pill className="h-4 w-4" />
                  Drug Catalog
                </Link>
              </Button>
            </div>
          </div>

          {/* AI Insights Banner */}
          <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              label="Total Stores"
              value={storeTotal}
              sub={<>{storeActive} active &middot; {storeInactive} inactive</>}
              icon={<Building2 className="h-3.5 w-3.5" />}
              tone="indigo"
              isLoading={loading}
            />

            <SummaryCard
              label="Drug Master"
              value={drugActive}
              sub={<>{drugTotal} total &middot; {narcoticsCount} narcotics</>}
              icon={<Pill className="h-3.5 w-3.5" />}
              tone="emerald"
              isLoading={loading}
            />

            <SummaryCard
              label="Formulary Status"
              value={
                formularyStatus === "PUBLISHED" ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Published</span>
                    {formularyVersion != null && (
                      <Badge variant="secondary" className="ml-1 text-[10px]">v{formularyVersion}</Badge>
                    )}
                  </span>
                ) : formularyStatus === "DRAFT" ? (
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span>Draft</span>
                  </span>
                ) : (
                  <span className="text-zc-muted">No formulary</span>
                )
              }
              sub={formularyItemCount > 0 ? `${formularyItemCount} item${formularyItemCount !== 1 ? "s" : ""} included` : undefined}
              icon={<FileText className="h-3.5 w-3.5" />}
              tone={formularyStatus === "PUBLISHED" ? "emerald" : formularyStatus === "DRAFT" ? "amber" : "zinc"}
              isLoading={loading}
            />

            <SummaryCard
              label="Suppliers"
              value={supplierActive}
              sub={`${supplierTotal} total registered`}
              icon={<Truck className="h-3.5 w-3.5" />}
              tone="sky"
              isLoading={loading}
            />

            <SummaryCard
              label="Inventory Config"
              value={drugsWithReorder}
              sub="drugs with reorder levels set"
              icon={<Package className="h-3.5 w-3.5" />}
              tone="violet"
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

          {/* Pharmacy Modules */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-zc-text">
              Pharmacy Modules
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
              <CardTitle className="text-base">How It Works</CardTitle>
              <CardDescription className="text-sm">
                The Pharmacy Infrastructure module provides the foundation for all pharmacy operations in the hospital. Start by configuring stores, then build the drug master catalog. Publish a formulary to control which drugs are available, onboard suppliers for procurement, and set inventory policies to automate reorder workflows.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 text-sm text-zc-muted">
              <ul className="list-disc space-y-2 pl-5">
                <li><span className="font-medium text-zc-text">Stores</span>{" "}&mdash; Define main and sub-stores with location mapping, operational hours, and dispensing rules.</li>
                <li><span className="font-medium text-zc-text">Drug Master</span>{" "}&mdash; Maintain a comprehensive drug catalog with generic names, brands, categories, dosage forms, and scheduling info.</li>
                <li><span className="font-medium text-zc-text">Formulary</span>{" "}&mdash; Publish versioned formularies with tier-based inclusion to control drug availability per branch.</li>
                <li><span className="font-medium text-zc-text">Suppliers</span>{" "}&mdash; Onboard vendors, manage contracts, rate cards, and track lead times for purchase orders.</li>
                <li><span className="font-medium text-zc-text">Inventory Config</span>{" "}&mdash; Set reorder points, safety stock, bin locations, and ABC/VED classification parameters.</li>
                <li><span className="font-medium text-zc-text">Narcotics</span>{" "}&mdash; Enhanced tracking for Schedule H/H1/X drugs with audit trails and register management.</li>
                <li><span className="font-medium text-zc-text">Indent Mapping</span>{" "}&mdash; Configure indent routes between stores and departments for automated requisition workflows.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
