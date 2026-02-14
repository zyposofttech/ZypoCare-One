"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, Clock } from "lucide-react";

export default function ExpiringUnitsPage() {
  const { branchId } = useBranchContext();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    apiFetch(`/api/blood-bank/inventory/expiring?branchId=${branchId}&days=7`).then((d: any) => setItems(d ?? [])).catch(() => undefined).finally(() => setLoading(false));
  }, [branchId]);

  return (
    <AppShell title="Expiring Units">
      <div className="grid gap-6">
        <div className="flex items-center gap-3"><Clock className="h-6 w-6 text-amber-500" /><div className="text-2xl font-semibold">Units Expiring Within 7 Days</div></div>
        <Card>
          <CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Unit #</TableHead><TableHead>Blood Group</TableHead><TableHead>Component</TableHead><TableHead>Expiry Date</TableHead><TableHead>Days Left</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((u: any) => {
                    const daysLeft = Math.ceil((new Date(u.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.unitNumber}</TableCell>
                        <TableCell><Badge variant="outline">{u.bloodGroup?.replace("_", " ")}</Badge></TableCell>
                        <TableCell>{u.componentType ?? "Whole Blood"}</TableCell>
                        <TableCell>{new Date(u.expiryDate).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant={daysLeft <= 1 ? "destructive" : daysLeft <= 3 ? "secondary" : "outline"}>{daysLeft}d</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                  {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No expiring units</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
