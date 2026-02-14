"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, Package } from "lucide-react";
import Link from "next/link";

const BG_LABELS: Record<string, string> = { A_POS: "A+", A_NEG: "A-", B_POS: "B+", B_NEG: "B-", AB_POS: "AB+", AB_NEG: "AB-", O_POS: "O+", O_NEG: "O-" };

export default function InventoryDashboardPage() {
  const { branchId } = useBranchContext();
  const [data, setData] = React.useState<any>(null);
  const [stockLevels, setStockLevels] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/blood-bank/inventory/dashboard?branchId=${branchId}`),
      apiFetch(`/api/blood-bank/inventory/stock-levels?branchId=${branchId}`),
    ]).then(([d, s]: any[]) => { setData(d); setStockLevels(s ?? []); }).catch(() => undefined).finally(() => setLoading(false));
  }, [branchId]);

  return (
    <AppShell title="Inventory Dashboard">
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Package className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Blood Inventory Dashboard</div></div>
          <div className="flex gap-2">
            <Link href="/blood-bank/inventory/expiring"><Badge variant="outline" className="cursor-pointer hover:bg-amber-100">Expiring Units</Badge></Link>
            <Link href="/blood-bank/inventory/discard"><Badge variant="outline" className="cursor-pointer hover:bg-red-100">Discard</Badge></Link>
          </div>
        </div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <Card><CardContent className="pt-6"><div className="text-3xl font-bold">{data?.totalAvailable ?? 0}</div><div className="text-sm text-muted-foreground">Total Available Units</div></CardContent></Card>
              {stockLevels.filter((s: any) => s.isLow).map((s: any) => (
                <Card key={s.bloodGroup} className="border-red-300 bg-red-50/30 dark:border-red-800">
                  <CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">{s.available}</div><div className="text-sm text-muted-foreground">{BG_LABELS[s.bloodGroup] ?? s.bloodGroup} - LOW STOCK</div></CardContent>
                </Card>
              ))}
            </div>

            {data?.grid && (
              <Card>
                <CardHeader><CardTitle className="text-base">Inventory Grid</CardTitle><CardDescription>Available units by blood group and component type.</CardDescription></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b"><th className="p-2 text-left">Group</th>{data.componentTypes.map((ct: string) => <th key={ct} className="p-2 text-center">{ct.replace(/_/g, " ")}</th>)}<th className="p-2 text-center">Total</th></tr>
                      </thead>
                      <tbody>
                        {data.bloodGroups.map((bg: string) => {
                          const row = data.grid[bg] ?? {};
                          const total = Object.values(row as Record<string, number>).reduce((s: number, v: any) => s + (v as number), 0);
                          return (
                            <tr key={bg} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium">{BG_LABELS[bg] ?? bg}</td>
                              {data.componentTypes.map((ct: string) => {
                                const count = row[ct] ?? 0;
                                return <td key={ct} className={`p-2 text-center ${count === 0 ? "text-muted-foreground" : count < 3 ? "text-red-600 font-semibold" : ""}`}>{count}</td>;
                              })}
                              <td className="p-2 text-center font-semibold">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
