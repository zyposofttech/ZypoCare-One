"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, Plus, FileBarChart } from "lucide-react";

export default function TariffConfigPage() {
  const { branchId } = useBranchContext();
  const { toast } = useToast();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dlg, setDlg] = React.useState(false);
  const [form, setForm] = React.useState<any>({});

  const load = React.useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try { setItems(await apiFetch(`/api/blood-bank/tariff?branchId=${branchId}`) ?? []); } catch { /* empty */ }
    setLoading(false);
  }, [branchId]);

  React.useEffect(() => { load(); }, [load]);

  async function save() {
    try {
      await apiFetch("/api/blood-bank/tariff", { method: "POST", body: JSON.stringify({ ...form, branchId }) });
      toast({ title: "Saved" });
      setDlg(false);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  return (
    <AppShell title="Tariff Config">
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><FileBarChart className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Blood Bank Tariff Configuration</div></div>
          <Button onClick={() => { setForm({}); setDlg(true); }}><Plus className="mr-1 h-4 w-4" />Add Tariff</Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Processing Charge</TableHead><TableHead>Cross-Match Charge</TableHead><TableHead>Govt Scheme Rate</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((t: any) => (
                    <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setForm(t); setDlg(true); }}>
                      <TableCell className="font-medium">{t.componentMaster?.name ?? t.componentMasterId}</TableCell>
                      <TableCell>{t.processingCharge}</TableCell>
                      <TableCell>{t.crossMatchCharge}</TableCell>
                      <TableCell>{t.govSchemeRate ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No tariff configs</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dlg} onOpenChange={setDlg}>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} Tariff</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              {!form.id && <div><Label>Component Master ID</Label><Input value={form.componentMasterId ?? ""} onChange={(e) => setForm({ ...form, componentMasterId: e.target.value })} placeholder="Select component..." /></div>}
              <div><Label>Processing Charge</Label><Input type="number" value={form.processingCharge ?? 0} onChange={(e) => setForm({ ...form, processingCharge: Number(e.target.value) })} /></div>
              <div><Label>Cross-Match Charge</Label><Input type="number" value={form.crossMatchCharge ?? 0} onChange={(e) => setForm({ ...form, crossMatchCharge: Number(e.target.value) })} /></div>
              <div><Label>Govt Scheme Rate</Label><Input type="number" value={form.govSchemeRate ?? 0} onChange={(e) => setForm({ ...form, govSchemeRate: Number(e.target.value) })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
