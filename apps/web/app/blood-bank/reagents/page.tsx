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
import { Loader2, Plus, FlaskConical } from "lucide-react";

export default function ReagentsPage() {
  const { branchId } = useBranchContext();
  const { toast } = useToast();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dlg, setDlg] = React.useState(false);
  const [form, setForm] = React.useState<any>({});

  const load = React.useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try { setItems(await apiFetch(`/api/blood-bank/reagents?branchId=${branchId}`) ?? []); } catch { /* empty */ }
    setLoading(false);
  }, [branchId]);

  React.useEffect(() => { load(); }, [load]);

  async function save() {
    try {
      const method = form.id ? "PATCH" : "POST";
      const url = form.id ? `/api/blood-bank/reagents/${form.id}` : "/api/blood-bank/reagents";
      await apiFetch(url, { method, body: JSON.stringify({ ...form, branchId }) });
      toast({ title: "Saved" });
      setDlg(false);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  return (
    <AppShell title="Reagents">
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><FlaskConical className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Blood Bank Reagents</div></div>
          <Button onClick={() => { setForm({}); setDlg(true); }}><Plus className="mr-1 h-4 w-4" />Add Reagent</Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Lot</TableHead><TableHead>Expiry</TableHead><TableHead>Stock</TableHead><TableHead>Min Stock</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((r: any) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setForm(r); setDlg(true); }}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.code ?? "-"}</TableCell>
                      <TableCell>{r.reagentType ?? "-"}</TableCell>
                      <TableCell>{r.lotNumber ?? "-"}</TableCell>
                      <TableCell>{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell><Badge variant={r.currentStock <= r.minStock ? "destructive" : "secondary"}>{r.currentStock}</Badge></TableCell>
                      <TableCell>{r.minStock}</TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No reagents</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dlg} onOpenChange={setDlg}>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} Reagent</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label>Type</Label><Input value={form.reagentType ?? ""} onChange={(e) => setForm({ ...form, reagentType: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Manufacturer</Label><Input value={form.manufacturer ?? ""} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
                <div><Label>Lot Number</Label><Input value={form.lotNumber ?? ""} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Expiry Date</Label><Input type="date" value={form.expiryDate?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
                <div><Label>Current Stock</Label><Input type="number" value={form.currentStock ?? 0} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Min Stock Level</Label><Input type="number" value={form.minStock ?? 0} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
