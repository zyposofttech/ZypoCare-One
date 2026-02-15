"use client";
import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm } from "@/lib/auth/store";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { IconSearch } from "@/components/icons";
import { AlertTriangle, Droplets, Loader2, RefreshCw, Users, FlaskConical, PackageCheck, Activity, GitCompareArrows, Siren, TestTubes, Warehouse, ScrollText, ChevronRight, Thermometer } from "lucide-react";

type NavItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
};

const NAV_ITEMS: NavItem[] = [
  { title: "Donor Registry", description: "Manage donors, screenings, and deferrals", href: "/blood-bank/donors", icon: Users, color: "red" },
  { title: "Blood Collection", description: "Collection worklist and phlebotomy", href: "/blood-bank/collection", icon: Droplets, color: "rose" },
  { title: "Component Separation", description: "Separate whole blood into components", href: "/blood-bank/separation", icon: FlaskConical, color: "purple" },
  { title: "Donation Camps", description: "Organize and track donation camps", href: "/blood-bank/camps", icon: Users, color: "orange" },
  { title: "Testing Lab", description: "Blood grouping and TTI testing", href: "/blood-bank/testing", icon: TestTubes, color: "cyan" },
  { title: "Inventory", description: "Real-time stock and storage", href: "/blood-bank/inventory", icon: Warehouse, color: "emerald" },
  { title: "Blood Requests", description: "Clinical blood requests", href: "/blood-bank/requests", icon: GitCompareArrows, color: "blue" },
  { title: "Cross-Match", description: "Cross-match workbench", href: "/blood-bank/cross-match", icon: GitCompareArrows, color: "indigo" },
  { title: "Issue Desk", description: "Issue blood units", href: "/blood-bank/issue", icon: PackageCheck, color: "teal" },
  { title: "Equipment & Cold Chain", description: "Equipment setup, calibration and temperature monitoring", href: "/blood-bank/equipment", icon: Thermometer, color: "amber" },
  { title: "Transfusion", description: "Monitor active transfusions", href: "/blood-bank/transfusion", icon: Activity, color: "green" },
  { title: "MTP Dashboard", description: "Massive Transfusion Protocol", href: "/blood-bank/mtp", icon: Siren, color: "red" },
  { title: "Quality Control", description: "IQC, EQAS, and calibration", href: "/blood-bank/qc", icon: TestTubes, color: "violet" },
  { title: "Reports", description: "NACO, SBTC, and analytics", href: "/blood-bank/reports", icon: ScrollText, color: "slate" },
];

function iconBg(color: string) {
  const map: Record<string, string> = {
    red: "bg-red-100 dark:bg-red-900/20 text-red-600",
    rose: "bg-rose-100 dark:bg-rose-900/20 text-rose-600",
    purple: "bg-purple-100 dark:bg-purple-900/20 text-purple-600",
    orange: "bg-orange-100 dark:bg-orange-900/20 text-orange-600",
    cyan: "bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600",
    emerald: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600",
    blue: "bg-blue-100 dark:bg-blue-900/20 text-blue-600",
    indigo: "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600",
    teal: "bg-teal-100 dark:bg-teal-900/20 text-teal-600",
    green: "bg-green-100 dark:bg-green-900/20 text-green-600",
    violet: "bg-violet-100 dark:bg-violet-900/20 text-violet-600",
    slate: "bg-slate-100 dark:bg-slate-900/20 text-slate-600",
  };
  return map[color] ?? map.slate;
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function BloodBankOverviewPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { branchId } = useBranchContext();

  const canRead = hasPerm(user, "BB_DONOR_READ");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [totalDonors, setTotalDonors] = React.useState(0);
  const [availableUnits, setAvailableUnits] = React.useState(0);
  const [pendingRequests, setPendingRequests] = React.useState(0);
  const [completedTransfusions, setCompletedTransfusions] = React.useState(0);

  const [q, setQ] = React.useState("");

  const filteredNav = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) => {
      const hay = `${item.title} ${item.description}`.toLowerCase();
      return hay.includes(s);
    });
  }, [q]);

  async function refresh(showToast = false) {
    if (!branchId) return;
    setErr(null);
    setLoading(true);
    try {
      const [donors, inventory, requests, transfusions] = await Promise.all([
        apiFetch(`/api/blood-bank/donors?branchId=${branchId}`).catch(() => undefined),
        apiFetch(`/api/blood-bank/inventory/dashboard?branchId=${branchId}`).catch(() => undefined),
        apiFetch(`/api/blood-bank/requests?branchId=${branchId}`).catch(() => undefined),
        apiFetch(`/api/blood-bank/issue?branchId=${branchId}`).catch(() => undefined),
      ]) as any[];

      setTotalDonors(safeNum(Array.isArray(donors) ? donors.length : donors?.total ?? donors?.count ?? 0));
      setAvailableUnits(safeNum(Array.isArray(inventory) ? inventory.length : inventory?.totalUnits ?? inventory?.available ?? inventory?.count ?? 0));
      setPendingRequests(safeNum(Array.isArray(requests) ? requests.filter((r: any) => r?.status === "PENDING" || r?.status === "pending").length : requests?.pending ?? requests?.count ?? 0));
      setCompletedTransfusions(safeNum(Array.isArray(transfusions) ? transfusions.filter((t: any) => t?.status === "COMPLETED" || t?.status === "completed").length : transfusions?.completedToday ?? transfusions?.count ?? 0));

      if (showToast) {
        toast({ title: "Blood Bank refreshed", description: "Dashboard statistics reloaded." });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load blood bank data";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  return (
    <AppShell title="Blood Bank">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Droplets className="h-5 w-5 text-red-500" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Blood Bank</div>
              <div className="mt-1 text-sm text-zc-muted">
                Operational dashboard for blood bank services — donors, collection, testing, inventory, issue, and transfusion monitoring.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* Stats */}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
            <div className="text-xs font-medium text-red-600 dark:text-red-400">Total Donors</div>
            <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : totalDonors}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Available Units</div>
            <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : availableUnits}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending Requests</div>
            <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : pendingRequests}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Completed Transfusions Today</div>
            <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : completedTransfusions}
            </div>
          </div>
        </div>

        {/* Overview Card with Search */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Quick Navigation</CardTitle>
            <CardDescription className="text-sm">
              Access blood bank workflows and operational areas. Use the search to filter modules.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  placeholder="Search modules..."
                  className="pl-10"
                />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filteredNav.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{NAV_ITEMS.length}</span>
              </div>
            </div>

            <Separator />

            {/* Navigation Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href as any}>
                    <div className="group flex items-center gap-4 rounded-2xl border border-zc-border bg-zc-panel/20 p-4 transition-colors hover:border-zc-accent/30 hover:bg-zc-accent/5">
                      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", iconBg(item.color))}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-zc-text">{item.title}</div>
                        <div className="text-xs text-zc-muted">{item.description}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zc-muted group-hover:text-zc-accent" />
                    </div>
                  </Link>
                );
              })}

              {!filteredNav.length ? (
                <div className="col-span-full py-10 text-center text-sm text-zc-muted">
                  No modules match your search.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Bottom tip section */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Setup & Configuration</div>
              <div className="mt-1 text-sm text-zc-muted">
                Blood Bank setup is managed under Infrastructure &rarr; Blood Bank Setup. Configure facility, components, equipment, reagents, and tariffs there first.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
