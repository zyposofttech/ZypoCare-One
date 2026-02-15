"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { cn } from "@/lib/utils";
import { Brain, RefreshCw, AlertTriangle, TrendingDown, Package, Clock } from "lucide-react";

type Insight = {
  branchId: string;
  generatedAt: string;
  stockLevels: Array<{ bloodGroup: string; componentType: string; available: number }>;
  expiring: { withinDays: number; count: number; units: Array<any> };
  transfers: Record<string, number>;
  aiStubs: {
    lowStock: Array<{ bloodGroup: string; componentType: string; available: number; threshold: number; isLow: boolean }>;
    recommendations: Array<{ severity: "INFO" | "WARN" | "CRITICAL"; title: string; detail: string }>;
    note: string;
  };
};

function sevBadge(sev: string) {
  if (sev === "CRITICAL") return <Badge variant="destructive">Critical</Badge>;
  if (sev === "WARN") return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Warn</Badge>;
  return <Badge variant="secondary">Info</Badge>;
}

export default function BloodBankAiPage() {
  const { toast } = useToast();
  //const { selectedBranch } = useBranchContext();
  const branchId = useBranchContext();

  const [data, setData] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const res = await apiFetch<Insight>(`/api/blood-bank/ai/insights?branchId=${branchId}`);
      setData(res);
    } catch (e: any) {
      toast({ title: "Failed to load insights", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const topStock = useMemo(() => {
    const arr = data?.stockLevels ?? [];
    return [...arr].sort((a, b) => b.available - a.available).slice(0, 12);
  }, [data]);

  return (
    <AppShell title="AI Insights">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
            <p className="text-muted-foreground">Heuristic insights (phase-1). Forecasting & anomaly models can be added later.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {!data ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Insights
              </CardTitle>
              <CardDescription>{loading ? "Loading…" : "No data"}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" /> Stock buckets
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{data.stockLevels.length}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Expiring (≤{data.expiring.withinDays}d)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{data.expiring.count}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" /> Low stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{data.aiStubs.lowStock.length}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{data.aiStubs.recommendations.length}</CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                  <CardDescription>Actionable prompts based on current inventory and transfers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.aiStubs.recommendations.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No recommendations</div>
                  ) : (
                    data.aiStubs.recommendations.map((r, idx) => (
                      <div key={idx} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{r.title}</div>
                          {sevBadge(r.severity)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{r.detail}</div>
                      </div>
                    ))
                  )}
                  <Separator />
                  <div className="text-xs text-muted-foreground">{data.aiStubs.note}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Low stock buckets</CardTitle>
                  <CardDescription>Below threshold (default 5).</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.aiStubs.lowStock.length === 0 ? (
                      <div className="text-sm text-muted-foreground">None</div>
                    ) : (
                      data.aiStubs.lowStock.map((x, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <div>
                            <div className="font-medium">{x.bloodGroup} • {x.componentType}</div>
                            <div className="text-xs text-muted-foreground">Threshold {x.threshold}</div>
                          </div>
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">{x.available}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Expiring units</CardTitle>
                  <CardDescription>First 50 units expiring soon.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[420px] overflow-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background border-b">
                        <tr className="text-left">
                          <th className="p-2">Unit</th>
                          <th className="p-2">Group</th>
                          <th className="p-2">Component</th>
                          <th className="p-2">Expiry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.expiring.units.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-muted-foreground">None</td>
                          </tr>
                        ) : (
                          data.expiring.units.map((u: any) => (
                            <tr key={u.id} className="border-b last:border-0">
                              <td className="p-2 font-medium">{u.unitNumber}</td>
                              <td className="p-2">{u.bloodGroup}</td>
                              <td className="p-2">{u.componentType}</td>
                              <td className="p-2">{u.expiryDate ? new Date(u.expiryDate).toLocaleDateString() : "—"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top stock buckets</CardTitle>
                  <CardDescription>Highest availability groups/components.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[420px] overflow-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background border-b">
                        <tr className="text-left">
                          <th className="p-2">Group</th>
                          <th className="p-2">Component</th>
                          <th className="p-2 text-right">Available</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topStock.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-6 text-center text-muted-foreground">None</td>
                          </tr>
                        ) : (
                          topStock.map((r, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="p-2 font-medium">{r.bloodGroup}</td>
                              <td className="p-2">{r.componentType}</td>
                              <td className="p-2 text-right">{r.available}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
