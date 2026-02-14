"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function ReactionsPage() {
  const { branchId } = useBranchContext();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    apiFetch(`/api/blood-bank/reports/haemovigilance?branchId=${branchId}`)
      .then((data: any) => setItems(Array.isArray(data) ? data : []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <AppShell title="Adverse Reactions">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          <div className="text-2xl font-semibold">Adverse Reactions</div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No adverse reactions recorded</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Unit #</TableHead>
                    <TableHead>Reaction Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Management</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Investigation Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.date ? new Date(r.date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell className="font-medium">{r.patientName ?? r.patient ?? "-"}</TableCell>
                      <TableCell>{r.unitNumber ?? "-"}</TableCell>
                      <TableCell><Badge>{r.reactionType ?? "-"}</Badge></TableCell>
                      <TableCell>{r.severity ?? "-"}</TableCell>
                      <TableCell>{r.management ?? "-"}</TableCell>
                      <TableCell>{r.reportedBy ?? "-"}</TableCell>
                      <TableCell><Badge variant="outline">{r.investigationStatus ?? "Pending"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
