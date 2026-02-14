"use client";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, FileText } from "lucide-react";

const URGENCY_COLORS: Record<string, string> = { ROUTINE: "secondary", URGENT: "default", EMERGENCY: "destructive", MTP: "destructive" };

export default function BloodRequestsPage() {
  const { branchId } = useBranchContext();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    apiFetch(`/api/blood-bank/requests?branchId=${branchId}`).then((d: any) => setItems(d ?? [])).catch(() => undefined).finally(() => setLoading(false));
  }, [branchId]);

  return (
    <AppShell title="Blood Requests">
      <div className="grid gap-6">
        <div className="flex items-center gap-3"><FileText className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Blood Request Dashboard</div></div>
        <Card><CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Request #</TableHead><TableHead>Patient</TableHead><TableHead>Component</TableHead><TableHead>Qty</TableHead><TableHead>Urgency</TableHead><TableHead>Status</TableHead><TableHead>Requested</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((r: any) => (
                  <TableRow key={r.id}><TableCell className="font-medium">{r.requestNumber}</TableCell><TableCell>{r.patient?.firstName} {r.patient?.lastName} ({r.patient?.uhid})</TableCell><TableCell>{r.componentType ?? "Any"}</TableCell><TableCell>{r.quantityRequested}</TableCell><TableCell><Badge variant={URGENCY_COLORS[r.urgency] as any}>{r.urgency}</Badge></TableCell><TableCell><Badge variant="outline">{r.status}</Badge></TableCell><TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell></TableRow>
                ))}
                {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No pending requests</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      </div>
    </AppShell>
  );
}
