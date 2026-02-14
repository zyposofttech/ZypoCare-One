"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, Droplet, Play } from "lucide-react";

export default function CollectionPage() {
  const { branchId } = useBranchContext();
  const { toast } = useToast();
  const [worklist, setWorklist] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try { setWorklist(await apiFetch(`/api/blood-bank/collection/worklist?branchId=${branchId}`) ?? []); } catch { /* empty */ }
    setLoading(false);
  }, [branchId]);

  React.useEffect(() => { load(); }, [load]);

  async function startCollection(donorId: string) {
    try {
      await apiFetch("/api/blood-bank/collection/start", { method: "POST", body: JSON.stringify({ donorId, branchId, bagType: "TRIPLE", collectionType: "WHOLE_BLOOD_450" }) });
      toast({ title: "Collection started" });
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  return (
    <AppShell title="Blood Collection">
      <div className="grid gap-6">
        <div className="flex items-center gap-3"><Droplet className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Blood Collection Worklist</div></div>
        <Card>
          <CardHeader><CardTitle className="text-base">Eligible Donors Ready for Collection</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Donor</TableHead><TableHead>Blood Group</TableHead><TableHead>Hb</TableHead><TableHead>Weight</TableHead><TableHead>Screened At</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {worklist.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.donor?.firstName} {s.donor?.lastName} ({s.donor?.donorNumber})</TableCell>
                      <TableCell><Badge variant="outline">{s.donor?.bloodGroup?.replace("_", " ")}</Badge></TableCell>
                      <TableCell>{s.hemoglobin ?? "-"} g/dL</TableCell>
                      <TableCell>{s.weight ?? "-"} kg</TableCell>
                      <TableCell>{new Date(s.createdAt).toLocaleTimeString()}</TableCell>
                      <TableCell><Button size="sm" onClick={() => startCollection(s.donorId)}><Play className="mr-1 h-3 w-3" />Start</Button></TableCell>
                    </TableRow>
                  ))}
                  {worklist.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No eligible donors in worklist</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
