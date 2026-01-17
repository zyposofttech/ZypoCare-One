"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city?: string;
};

type BranchInfraConfig = {
  id: string;
  branchId: string;
  housekeepingGateEnabled: boolean;
};

type UnitResourceState = "AVAILABLE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "INACTIVE";

type UnitResource = {
  id: string;
  resourceType: string;
  state: UnitResourceState;
  isActive?: boolean;
};

const LS_KEY = "zc.superadmin.infrastructure.bedPolicy.branchId";

function readLS(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "zinc" | "emerald" | "amber" | "sky";
}) {
  const tones: Record<string, string> = {
    zinc: "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200",
    emerald:
      "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
    amber:
      "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
    sky: "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200",
  };

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", tones[tone])}>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="opacity-90">{label}</span>
    </span>
  );
}

export default function SuperAdminBedPolicyPage() {
  const { toast } = useToast();

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>(readLS(LS_KEY) || "");

  const [config, setConfig] = React.useState<BranchInfraConfig | null>(null);
  const [bedCounts, setBedCounts] = React.useState<Record<UnitResourceState, number>>({
    AVAILABLE: 0,
    OCCUPIED: 0,
    CLEANING: 0,
    MAINTENANCE: 0,
    INACTIVE: 0,
  });

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const loadBranches = React.useCallback(async () => {
    const rows = await apiFetch<BranchRow[]>("/api/branches");
    setBranches(rows || []);

    if (!branchId && rows?.length) {
      const first = rows[0].id;
      setBranchId(first);
      writeLS(LS_KEY, first);
    }
  }, [branchId]);

  const loadConfig = React.useCallback(async (bId: string) => {
    const cfg = await apiFetch<BranchInfraConfig>(`/api/infrastructure/branches/${bId}/infra-config`);
    setConfig(cfg);
  }, []);

  const loadBedCounts = React.useCallback(async (bId: string) => {
    const beds = await apiFetch<UnitResource[]>(
      `/api/infrastructure/resources?branchId=${bId}&resourceType=BED&includeInactive=true`,
    );

    const counts: Record<UnitResourceState, number> = {
      AVAILABLE: 0,
      OCCUPIED: 0,
      CLEANING: 0,
      MAINTENANCE: 0,
      INACTIVE: 0,
    };

    for (const r of beds || []) {
      const s = (r.state || "AVAILABLE") as UnitResourceState;
      if (counts[s] == null) counts[s] = 0;
      counts[s] += 1;
    }

    setBedCounts(counts);
  }, []);

  const refreshAll = React.useCallback(
    async (bId: string) => {
      setLoading(true);
      try {
        await Promise.all([loadConfig(bId), loadBedCounts(bId)]);
      } finally {
        setLoading(false);
      }
    },
    [loadConfig, loadBedCounts],
  );

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadBranches();
      } catch (e: any) {
        if (!mounted) return;
        toast({
          title: "Failed to load branches",
          description: e?.message ?? "Please try again.",
          variant: "destructive",
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadBranches, toast]);

  React.useEffect(() => {
    if (!branchId) return;
    writeLS(LS_KEY, branchId);
    refreshAll(branchId).catch((e: any) => {
      toast({
        title: "Failed to load bed policy",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    });
  }, [branchId, refreshAll, toast]);

  const onToggleGate = async (next: boolean) => {
    if (!branchId) return;
    setSaving(true);
    try {
      const updated = await apiFetch<BranchInfraConfig>(`/api/infrastructure/branches/${branchId}/infra-config`, {
        method: "PUT",
        body: JSON.stringify({ housekeepingGateEnabled: next }),
      });
      setConfig(updated);
      toast({
        title: "Policy updated",
        description: next
          ? "Housekeeping gate is now enabled for beds."
          : "Housekeeping gate is now disabled for beds.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to update policy",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalBeds = Object.values(bedCounts).reduce((a, b) => a + b, 0);
  const gateEnabled = !!config?.housekeepingGateEnabled;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
              <h1 className="text-xl font-semibold">Bed States + Housekeeping Gate</h1>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Setup-only policy: controls whether a bed can move from OCCUPIED to AVAILABLE directly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => branchId && refreshAll(branchId)} disabled={!branchId || loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "")} />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Branch</CardTitle>
            <CardDescription>Select a branch to configure bed policies and review current bed states.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-1">
                <Select value={branchId} onValueChange={(v) => setBranchId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                <StatPill label="Beds (total)" value={totalBeds} tone="zinc" />
                <StatPill label="Available" value={bedCounts.AVAILABLE} tone="emerald" />
                <StatPill label="Occupied" value={bedCounts.OCCUPIED} tone="sky" />
                <StatPill label="Cleaning" value={bedCounts.CLEANING} tone="amber" />
                <StatPill label="Maintenance" value={bedCounts.MAINTENANCE} tone="zinc" />
                <StatPill label="Inactive" value={bedCounts.INACTIVE} tone="zinc" />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-medium">Housekeeping Gate</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  {gateEnabled
                    ? "Enabled: OCCUPIED → AVAILABLE is blocked; bed must go through CLEANING."
                    : "Disabled: Direct state changes are allowed (including OCCUPIED → AVAILABLE)."}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={gateEnabled} onCheckedChange={onToggleGate} disabled={!config || saving || loading} />
                <div className="text-sm">
                  {gateEnabled ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" /> Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4" /> Disabled
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200/70 bg-zinc-50/60 p-4 text-sm text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/20 dark:text-zinc-200">
              <div className="font-medium">What this affects</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  When enabled, beds cannot move from <b>OCCUPIED</b> directly to <b>AVAILABLE</b>. They must move to{" "}
                  <b>CLEANING</b> first.
                </li>
                {/* <li>
                  This is a setup policy only. The operational housekeeping workflow will be implemented later in the
                  Operations modules.
                </li>
                <li>
                  The gate is enforced in backend on <code>/api/infrastructure/resources/:id/state</code> for <b>BED</b>{" "}
                  resources.
                </li> */}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
