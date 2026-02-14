"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, ScrollText } from "lucide-react";

export default function AuditPage() {
  const { branchId } = useBranchContext();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    apiFetch(`/api/blood-bank/reports/daily-summary?branchId=${branchId}`)
      .then((data: any) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <AppShell title="Blood Bank Audit Trail">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-gray-600" />
          <div className="text-2xl font-semibold">Blood Bank Audit Trail</div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No audit records found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Branch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((a: any, idx: number) => (
                    <TableRow key={a.id ?? idx}>
                      <TableCell>{a.timestamp ? new Date(a.timestamp).toLocaleString() : "-"}</TableCell>
                      <TableCell>{a.action ?? "-"}</TableCell>
                      <TableCell>{a.entity ?? "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{a.details ?? "-"}</TableCell>
                      <TableCell>{a.actor ?? "-"}</TableCell>
                      <TableCell>{a.branch ?? "-"}</TableCell>
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
