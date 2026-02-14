"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, Plus, Tent } from "lucide-react";

export default function CampsPage() {
  const { branchId } = useBranchContext();
  const { toast } = useToast();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dlg, setDlg] = React.useState(false);
  const [form, setForm] = React.useState<any>({});

  const load = React.useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try { setItems(await apiFetch(`/api/blood-bank/camps?branchId=${branchId}`) ?? []); } catch { /* empty */ }
    setLoading(false);
  }, [branchId]);

  React.useEffect(() => { load(); }, [load]);

  async function save() {
    try {
      const method = form.id ? "PATCH" : "POST";
      const url = form.id ? `/api/blood-bank/camps/${form.id}` : "/api/blood-bank/camps";
      await apiFetch(url, { method, body: JSON.stringify({ ...form, branchId }) });
      toast({ title: "Saved" });
      setDlg(false);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  return (
    <AppShell title="Donation Camps">
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Tent className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Blood Donation Camps</div></div>
          <Button onClick={() => { setForm({}); setDlg(true); }}><Plus className="mr-1 h-4 w-4" />Register Camp</Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Camp Name</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead>Organizer</TableHead><TableHead>Est. Donors</TableHead><TableHead>Actual</TableHead><TableHead>Units</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setForm(c); setDlg(true); }}>
                      <TableCell className="font-medium">{c.campName}</TableCell>
                      <TableCell>{new Date(c.campDate).toLocaleDateString()}</TableCell>
                      <TableCell>{c.location}</TableCell>
                      <TableCell>{c.organizer ?? "-"}</TableCell>
                      <TableCell>{c.estimatedDonors}</TableCell>
                      <TableCell>{c.actualDonors ?? "-"}</TableCell>
                      <TableCell>{c.unitsCollected ?? "-"}</TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No camps</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dlg} onOpenChange={setDlg}>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "Register"} Camp</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Camp Name</Label><Input value={form.campName ?? ""} onChange={(e) => setForm({ ...form, campName: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.campDate?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, campDate: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Organizer</Label><Input value={form.organizer ?? ""} onChange={(e) => setForm({ ...form, organizer: e.target.value })} /></div>
                <div><Label>Team Lead</Label><Input value={form.teamLead ?? ""} onChange={(e) => setForm({ ...form, teamLead: e.target.value })} /></div>
              </div>
              <div><Label>Estimated Donors</Label><Input type="number" value={form.estimatedDonors ?? 0} onChange={(e) => setForm({ ...form, estimatedDonors: Number(e.target.value) })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
