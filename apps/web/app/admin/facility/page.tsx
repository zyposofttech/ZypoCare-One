"use client";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

type FacilityCatalog = {
  id: string;
  code: string;
  name: string;
  category: "SERVICE" | "CLINICAL";
  sortOrder: number;
  isActive: boolean;
};

export default function FacilityCatalogPage() {
  const { toast } = useToast();
  const [facilities, setFacilities] = React.useState<FacilityCatalog[]>([]);
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    category: "SERVICE" as "SERVICE" | "CLINICAL",
  });

  const load = async () => {
    const data = await apiFetch<FacilityCatalog[]>("/facilities/master?includeInactive=true");
    setFacilities(data);
  };

  React.useEffect(() => {
    load();
  }, []);

  const filtered = facilities.filter((f) =>
    f.name.toLowerCase().includes(q.toLowerCase()) ||
    f.code.toLowerCase().includes(q.toLowerCase())
  );

  const create = async () => {
    try {
      await apiFetch("/facilities/master", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast({ title: "Facility added", description: form.name });
      setOpen(false);
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppShell title="Facility Catalog">
      <div className="flex justify-between items-center mb-4">
        <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={() => setOpen(true)}>
          <PlusCircle className="w-4 h-4 mr-1" /> New Facility
        </Button>
      </div>

      <div className="bg-card rounded-md shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-2">Code</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Active</th>
              <th className="text-left p-2">Sort</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id} className="border-b">
                <td className="p-2 font-mono">{f.code}</td>
                <td className="p-2">{f.name}</td>
                <td className="p-2">{f.category}</td>
                <td className="p-2">{f.isActive ? "Yes" : "No"}</td>
                <td className="p-2">{f.sortOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Facility</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Code (UPPERCASE)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="w-full border rounded-md p-2"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as any })}
            >
              <option value="SERVICE">Service</option>
              <option value="CLINICAL">Clinical</option>
            </select>
            <Button onClick={create}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
