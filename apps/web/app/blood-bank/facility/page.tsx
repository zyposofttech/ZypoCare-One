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
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, Plus, Save, Settings } from "lucide-react";

export default function FacilitySetupPage() {
  const { branchId } = useBranchContext();
  const { toast } = useToast();
  const [facility, setFacility] = React.useState<any>(null);
  const [msbos, setMsbos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<any>({});
  const [msbosDlg, setMsbosDlg] = React.useState(false);
  const [msbosForm, setMsbosForm] = React.useState<any>({});

  const load = React.useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [f, m]: any[] = await Promise.all([
        apiFetch(`/api/blood-bank/facility?branchId=${branchId}`),
        apiFetch(`/api/blood-bank/msbos?branchId=${branchId}`),
      ]);
      setFacility(f);
      setForm(f ?? {});
      setMsbos(m ?? []);
    } catch { /* empty */ }
    setLoading(false);
  }, [branchId]);

  React.useEffect(() => { load(); }, [load]);

  async function saveFacility() {
    setSaving(true);
    try {
      await apiFetch("/api/blood-bank/facility", { method: "POST", body: JSON.stringify({ ...form, branchId }) });
      toast({ title: "Facility saved" });
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setSaving(false);
  }

  async function saveMSBOS() {
    try {
      await apiFetch("/api/blood-bank/msbos", { method: "POST", body: JSON.stringify({ ...msbosForm, branchId }) });
      toast({ title: "MSBOS saved" });
      setMsbosDlg(false);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  return (
    <AppShell title="Facility Setup">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-red-500" />
          <div className="text-2xl font-semibold">Blood Bank Facility Setup</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Facility Configuration</CardTitle>
                <CardDescription>Blood bank license, registration, and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>License Number</Label><Input value={form.licenseNumber ?? ""} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></div>
                <div><Label>License Expiry</Label><Input type="date" value={form.licenseExpiryDate?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, licenseExpiryDate: e.target.value })} /></div>
                <div><Label>SBTS Registration ID</Label><Input value={form.sbtsRegistrationId ?? ""} onChange={(e) => setForm({ ...form, sbtsRegistrationId: e.target.value })} /></div>
                <div><Label>NACO ID</Label><Input value={form.nacoId ?? ""} onChange={(e) => setForm({ ...form, nacoId: e.target.value })} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type ?? ""} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOSPITAL_BASED">Hospital Based</SelectItem>
                      <SelectItem value="STANDALONE">Standalone</SelectItem>
                      <SelectItem value="STORAGE_CENTRE">Storage Centre</SelectItem>
                      <SelectItem value="COMPONENT_SEPARATION_CENTRE">Component Separation Centre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Contact Phone</Label><Input value={form.contactPhone ?? ""} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
                <div><Label>Contact Email</Label><Input value={form.contactEmail ?? ""} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
                <div><Label>Medical Director</Label><Input value={form.medicalDirectorName ?? ""} onChange={(e) => setForm({ ...form, medicalDirectorName: e.target.value })} /></div>
                <div className="md:col-span-2 flex justify-end">
                  <Button onClick={saveFacility} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Facility</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle className="text-base">MSBOS Configuration</CardTitle><CardDescription>Maximum Surgical Blood Order Schedule — recommended units per procedure.</CardDescription></div>
                <Button size="sm" onClick={() => { setMsbosForm({}); setMsbosDlg(true); }}><Plus className="mr-1 h-4 w-4" />Add</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Procedure Code</TableHead><TableHead>Procedure</TableHead><TableHead>PRBC</TableHead><TableHead>FFP</TableHead><TableHead>Platelet</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {msbos.map((m: any) => (
                      <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setMsbosForm(m); setMsbosDlg(true); }}>
                        <TableCell>{m.procedureCode}</TableCell><TableCell>{m.procedureName}</TableCell>
                        <TableCell>{m.recommendedPRBC}</TableCell><TableCell>{m.recommendedFFP}</TableCell><TableCell>{m.recommendedPlatelet}</TableCell>
                      </TableRow>
                    ))}
                    {msbos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No MSBOS configs</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={msbosDlg} onOpenChange={setMsbosDlg}>
          <DialogContent>
            <DialogHeader><DialogTitle>{msbosForm.id ? "Edit" : "Add"} MSBOS</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Procedure Code</Label><Input value={msbosForm.procedureCode ?? ""} onChange={(e) => setMsbosForm({ ...msbosForm, procedureCode: e.target.value })} /></div>
              <div><Label>Procedure Name</Label><Input value={msbosForm.procedureName ?? ""} onChange={(e) => setMsbosForm({ ...msbosForm, procedureName: e.target.value })} /></div>
              <div><Label>Recommended PRBC</Label><Input type="number" value={msbosForm.recommendedPRBC ?? 0} onChange={(e) => setMsbosForm({ ...msbosForm, recommendedPRBC: Number(e.target.value) })} /></div>
              <div><Label>Recommended FFP</Label><Input type="number" value={msbosForm.recommendedFFP ?? 0} onChange={(e) => setMsbosForm({ ...msbosForm, recommendedFFP: Number(e.target.value) })} /></div>
              <div><Label>Recommended Platelet</Label><Input type="number" value={msbosForm.recommendedPlatelet ?? 0} onChange={(e) => setMsbosForm({ ...msbosForm, recommendedPlatelet: Number(e.target.value) })} /></div>
            </div>
            <DialogFooter><Button onClick={saveMSBOS}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
