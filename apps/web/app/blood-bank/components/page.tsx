"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, Plus, Package } from "lucide-react";

const COMPONENT_TYPES = [
  { value: "WHOLE_BLOOD", label: "Whole Blood" },
  { value: "PRBC", label: "Packed RBC" },
  { value: "FFP", label: "Fresh Frozen Plasma" },
  { value: "PLATELET_RDP", label: "Platelet (RDP)" },
  { value: "PLATELET_SDP", label: "Platelet (SDP)" },
  { value: "CRYOPRECIPITATE", label: "Cryoprecipitate" },
  { value: "CRYO_POOR_PLASMA", label: "Cryo-poor Plasma" },
];

export default function ComponentTypesPage() {
  const { branchId } = useBranchContext();
  const { toast } = useToast();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dlg, setDlg] = React.useState(false);
  const [form, setForm] = React.useState<any>({});

  const load = React.useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try { setItems(await apiFetch(`/api/blood-bank/components?branchId=${branchId}`) ?? []); } catch { /* empty */ }
    setLoading(false);
  }, [branchId]);

  React.useEffect(() => { load(); }, [load]);

  async function save() {
    try {
      const method = form.id ? "PATCH" : "POST";
      const url = form.id ? `/api/blood-bank/components/${form.id}` : "/api/blood-bank/components";
      await apiFetch(url, { method, body: JSON.stringify({ ...form, branchId }) });
      toast({ title: "Saved" });
      setDlg(false);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  return (
    <AppShell title="Component Types">
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Package className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Blood Component Types</div></div>
          <Button onClick={() => { setForm({}); setDlg(true); }}><Plus className="mr-1 h-4 w-4" />Add Component</Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Shelf Life (days)</TableHead><TableHead>Storage Temp</TableHead><TableHead>Volume (ml)</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setForm(c); setDlg(true); }}>
                      <TableCell><Badge variant="outline">{c.componentType}</Badge></TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.code}</TableCell>
                      <TableCell>{c.shelfLifeDays}</TableCell>
                      <TableCell>{c.storageMinTemp}&deg; to {c.storageMaxTemp}&deg;C</TableCell>
                      <TableCell>{c.minVolumeMl ? `${c.minVolumeMl}-${c.maxVolumeMl}` : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No component types defined</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dlg} onOpenChange={setDlg}>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} Component Type</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Component Type</Label>
                <Select value={form.componentType ?? ""} onValueChange={(v) => setForm({ ...form, componentType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{COMPONENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Code</Label><Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Shelf Life (days)</Label><Input type="number" value={form.shelfLifeDays ?? ""} onChange={(e) => setForm({ ...form, shelfLifeDays: Number(e.target.value) })} /></div>
                <div><Label>Prep Method</Label><Input value={form.preparationMethod ?? ""} onChange={(e) => setForm({ ...form, preparationMethod: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min Temp (&deg;C)</Label><Input type="number" value={form.storageMinTemp ?? ""} onChange={(e) => setForm({ ...form, storageMinTemp: Number(e.target.value) })} /></div>
                <div><Label>Max Temp (&deg;C)</Label><Input type="number" value={form.storageMaxTemp ?? ""} onChange={(e) => setForm({ ...form, storageMaxTemp: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min Volume (ml)</Label><Input type="number" value={form.minVolumeMl ?? ""} onChange={(e) => setForm({ ...form, minVolumeMl: Number(e.target.value) })} /></div>
                <div><Label>Max Volume (ml)</Label><Input type="number" value={form.maxVolumeMl ?? ""} onChange={(e) => setForm({ ...form, maxVolumeMl: Number(e.target.value) })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
