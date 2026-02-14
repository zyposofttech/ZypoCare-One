"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, Plus, Thermometer, AlertTriangle } from "lucide-react";

const EQUIPMENT_TYPES = [
  "BLOOD_BANK_FRIDGE", "PLATELET_AGITATOR", "PLASMA_FREEZER", "CENTRIFUGE",
  "BLOOD_WARMER", "TUBE_SEALER", "CELL_WASHER", "IRRADIATOR", "OTHER",
];

export default function EquipmentPage() {
  const { branchId } = useBranchContext();
  const { toast } = useToast();
  const [items, setItems] = React.useState<any[]>([]);
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dlg, setDlg] = React.useState(false);
  const [form, setForm] = React.useState<any>({});

  const load = React.useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [eq, al]: any[] = await Promise.all([
        apiFetch(`/api/blood-bank/equipment?branchId=${branchId}`),
        apiFetch(`/api/blood-bank/equipment/temp-alerts?branchId=${branchId}`),
      ]);
      setItems(eq ?? []);
      setAlerts(al ?? []);
    } catch { /* empty */ }
    setLoading(false);
  }, [branchId]);

  React.useEffect(() => { load(); }, [load]);

  async function save() {
    try {
      const method = form.id ? "PATCH" : "POST";
      const url = form.id ? `/api/blood-bank/equipment/${form.id}` : "/api/blood-bank/equipment";
      await apiFetch(url, { method, body: JSON.stringify({ ...form, branchId }) });
      toast({ title: "Saved" });
      setDlg(false);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  return (
    <AppShell title="Equipment">
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Thermometer className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Blood Bank Equipment</div></div>
          <Button onClick={() => { setForm({}); setDlg(true); }}><Plus className="mr-1 h-4 w-4" />Add Equipment</Button>
        </div>

        {alerts.length > 0 && (
          <Card className="border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Temperature Breach Alerts</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {alerts.map((a: any) => (
                  <div key={a.id} className="text-sm">{a.equipment?.name}: <span className="font-semibold text-red-600">{a.temperature}&deg;C</span> at {new Date(a.recordedAt).toLocaleString()}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Manufacturer</TableHead><TableHead>Temp Range</TableHead><TableHead>Location</TableHead><TableHead>Next Calibration</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((eq: any) => (
                    <TableRow key={eq.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setForm(eq); setDlg(true); }}>
                      <TableCell className="font-medium">{eq.name}</TableCell>
                      <TableCell><Badge variant="outline">{eq.equipmentType}</Badge></TableCell>
                      <TableCell>{eq.manufacturer ?? "-"}</TableCell>
                      <TableCell>{eq.minTemp != null ? `${eq.minTemp} to ${eq.maxTemp}&deg;C` : "-"}</TableCell>
                      <TableCell>{eq.location ?? "-"}</TableCell>
                      <TableCell>{eq.nextCalibrationDate ? new Date(eq.nextCalibrationDate).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No equipment registered</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dlg} onOpenChange={setDlg}>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} Equipment</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.equipmentType ?? ""} onValueChange={(v) => setForm({ ...form, equipmentType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{EQUIPMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Manufacturer</Label><Input value={form.manufacturer ?? ""} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
                <div><Label>Model</Label><Input value={form.model ?? ""} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min Temp (&deg;C)</Label><Input type="number" value={form.minTemp ?? ""} onChange={(e) => setForm({ ...form, minTemp: Number(e.target.value) })} /></div>
                <div><Label>Max Temp (&deg;C)</Label><Input type="number" value={form.maxTemp ?? ""} onChange={(e) => setForm({ ...form, maxTemp: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Location</Label><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Serial Number</Label><Input value={form.serialNumber ?? ""} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
