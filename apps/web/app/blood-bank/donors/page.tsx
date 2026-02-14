"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, Plus, Search, Users } from "lucide-react";
import Link from "next/link";

const BLOOD_GROUPS = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"];
const STATUS_COLORS: Record<string, string> = { ELIGIBLE: "default", TEMPORARILY_DEFERRED: "secondary", PERMANENTLY_DEFERRED: "destructive" };

export default function DonorRegistryPage() {
  const { branchId } = useBranchContext();
  const { toast } = useToast();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [dlg, setDlg] = React.useState(false);
  const [form, setForm] = React.useState<any>({});

  const load = React.useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const q = search ? `&q=${encodeURIComponent(search)}` : "";
      setItems(await apiFetch(`/api/blood-bank/donors?branchId=${branchId}${q}`) ?? []);
    } catch { /* empty */ }
    setLoading(false);
  }, [branchId, search]);

  React.useEffect(() => { load(); }, [load]);

  async function save() {
    try {
      await apiFetch("/api/blood-bank/donors", { method: "POST", body: JSON.stringify({ ...form, branchId }) });
      toast({ title: "Donor registered" });
      setDlg(false);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  return (
    <AppShell title="Donor Registry">
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Users className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Donor Registry</div></div>
          <Button onClick={() => { setForm({}); setDlg(true); }}><Plus className="mr-1 h-4 w-4" />Register Donor</Button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search donors..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
        <Card>
          <CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Donor #</TableHead><TableHead>Name</TableHead><TableHead>Blood Group</TableHead><TableHead>Mobile</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Donations</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell><Link href={`/blood-bank/donors/${d.id}`} className="text-blue-600 hover:underline">{d.donorNumber}</Link></TableCell>
                      <TableCell className="font-medium">{d.firstName} {d.lastName}</TableCell>
                      <TableCell><Badge variant="outline">{d.bloodGroup?.replace("_", " ") ?? "-"}</Badge></TableCell>
                      <TableCell>{d.mobile ?? "-"}</TableCell>
                      <TableCell>{d.donorType}</TableCell>
                      <TableCell><Badge variant={STATUS_COLORS[d.status] as any ?? "secondary"}>{d.status}</Badge></TableCell>
                      <TableCell>{d.totalDonations ?? 0}</TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No donors found</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dlg} onOpenChange={setDlg}>
          <DialogContent>
            <DialogHeader><DialogTitle>Register Donor</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name</Label><Input value={form.firstName ?? ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div><Label>Last Name</Label><Input value={form.lastName ?? ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth ?? ""} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
                <div><Label>Gender</Label>
                  <Select value={form.gender ?? ""} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Blood Group</Label>
                  <Select value={form.bloodGroup ?? ""} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Donor Type</Label>
                  <Select value={form.donorType ?? "VOLUNTARY"} onValueChange={(v) => setForm({ ...form, donorType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="VOLUNTARY">Voluntary</SelectItem><SelectItem value="REPLACEMENT">Replacement</SelectItem><SelectItem value="DIRECTED">Directed</SelectItem><SelectItem value="AUTOLOGOUS">Autologous</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Mobile</Label><Input value={form.mobile ?? ""} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Register</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
