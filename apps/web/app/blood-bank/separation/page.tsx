"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, GitBranch } from "lucide-react";

export default function SeparationPage() {
  const { branchId } = useBranchContext();
  const [worklist, setWorklist] = React.useState<any[]>([]);
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/blood-bank/separation/worklist?branchId=${branchId}`),
      apiFetch(`/api/blood-bank/separation/alerts?branchId=${branchId}`),
    ]).then(([w, a]: any[]) => { setWorklist(w ?? []); setAlerts(a ?? []); }).catch(() => undefined).finally(() => setLoading(false));
  }, [branchId]);

  return (
    <AppShell title="Component Separation">
      <div className="grid gap-6">
        <div className="flex items-center gap-3"><GitBranch className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Component Separation</div></div>
        {alerts.length > 0 && (
          <Card className="border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-700">Separation Window Closing ({alerts.length} units)</CardTitle></CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">These units were collected &gt;6 hours ago and need separation soon.</p></CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle className="text-base">Units Awaiting Separation</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Unit #</TableHead><TableHead>Donor</TableHead><TableHead>Blood Group</TableHead><TableHead>Bag Type</TableHead><TableHead>Collected</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {worklist.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.unitNumber}</TableCell>
                      <TableCell>{u.donor?.firstName} {u.donor?.lastName}</TableCell>
                      <TableCell><Badge variant="outline">{u.bloodGroup?.replace("_", " ")}</Badge></TableCell>
                      <TableCell>{u.bagType}</TableCell>
                      <TableCell>{new Date(u.collectionDate).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="secondary">{u.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {worklist.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No units awaiting separation</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
