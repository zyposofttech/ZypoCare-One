"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Trash2 } from "lucide-react";

const DISCARD_REASONS = ["EXPIRED", "TTI_REACTIVE", "BAG_LEAK", "CLOT", "LIPEMIC", "HEMOLYZED", "QC_FAILURE", "RETURN_TIMEOUT", "OTHER"];

export default function DiscardPage() {
  const { branchId } = useBranchContext();
  const { toast } = useToast();
  const [dlg, setDlg] = React.useState(false);
  const [form, setForm] = React.useState<any>({});

  async function discard() {
    try {
      await apiFetch("/api/blood-bank/inventory/discard", { method: "POST", body: JSON.stringify(form) });
      toast({ title: "Unit discarded" });
      setDlg(false);
      setForm({});
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  return (
    <AppShell title="Discard Management">
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Trash2 className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Blood Unit Discard</div></div>
          <Button variant="destructive" onClick={() => setDlg(true)}>Discard Unit</Button>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Discard Process</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">To discard a blood unit, click the button above and provide the unit ID and reason. All discards are audited for regulatory compliance.</p>
          </CardContent>
        </Card>

        <Dialog open={dlg} onOpenChange={setDlg}>
          <DialogContent>
            <DialogHeader><DialogTitle>Discard Blood Unit</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Unit ID</Label><Input value={form.unitId ?? ""} onChange={(e) => setForm({ ...form, unitId: e.target.value })} placeholder="Enter unit ID or scan barcode" /></div>
              <div><Label>Reason</Label>
                <Select value={form.reason ?? ""} onValueChange={(v) => setForm({ ...form, reason: v })}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>{DISCARD_REASONS.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="destructive" onClick={discard}>Confirm Discard</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
