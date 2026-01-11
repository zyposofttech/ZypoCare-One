"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";
import { apiFetch, ApiError } from "@/lib/api";
import { Plus, Pencil, RefreshCw } from "lucide-react";

type Department = { id: string; code: string; name: string; isActive: boolean };

type Specialty = {
  id: string;
  branchId: string;
  departmentId?: string | null;
  department?: { id: string; code: string; name: string } | null;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Principal = {
  roleScope: "GLOBAL" | "BRANCH";
  branchId?: string | null;
};

export default function SpecialtiesPage() {
  const [principal, setPrincipal] = React.useState<Principal | null>(null);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [rows, setRows] = React.useState<Specialty[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Specialty | null>(null);
  const [form, setForm] = React.useState<Partial<Specialty>>({ isActive: true });

  async function load() {
    setLoading(true);
    try {
      const me = await apiFetch<Principal>("/iam/me");
      setPrincipal(me);

      const [specs, depts] = await Promise.all([
        apiFetch<Specialty[]>("/specialties" + (me.roleScope === "GLOBAL" ? "" : "")),
        apiFetch<Department[]>("/departments" + (me.roleScope === "GLOBAL" ? "" : "")),
      ]);
      setRows(specs);
      setDepartments(depts.filter((d) => d.isActive));
    } catch (e: any) {
      toast({ title: "Load failed", description: e instanceof ApiError ? e.message : "Failed to load", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    const t = `${r.code} ${r.name} ${r.department?.name ?? ""}`.toLowerCase();
    return t.includes(q.toLowerCase());
  });

  function openCreate() {
    setEditing(null);
    setForm({ isActive: true, departmentId: null });
    setModalOpen(true);
  }

  function openEdit(r: Specialty) {
    setEditing(r);
    setForm({ ...r, departmentId: r.departmentId ?? null });
    setModalOpen(true);
  }

  async function save() {
    try {
      const payload: any = {
        branchId: principal?.roleScope === "GLOBAL" ? form.branchId : undefined,
        departmentId: form.departmentId || undefined,
        code: String(form.code ?? "").trim(),
        name: String(form.name ?? "").trim(),
        isActive: form.isActive,
      };

      if (editing) {
        await apiFetch(`/specialties/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast({ title: "Specialty updated", description: `${payload.name} (${payload.code})` });
      } else {
        await apiFetch(`/specialties`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Specialty created", description: `${payload.name} (${payload.code})` });
      }

      setModalOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e instanceof ApiError ? e.message : "Save failed", variant: "destructive" });
    }
  }

  return (
    <AppShell title="Specialties">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Facility Setup → Specialties</div>
            <h1 className="text-xl font-semibold">Specialties</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search specialties..." className="w-full sm:w-[320px]" />
            <Button variant="outline" onClick={load}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Specialty
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Specialty Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Create clinical specialties and optionally map them to a department.</div>
            <Separator className="my-3" />

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Department</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        No specialties found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2">{r.department?.name ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className={r.isActive ? "text-emerald-600" : "text-zinc-500"}>{r.isActive ? "ACTIVE" : "INACTIVE"}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Modal
          open={modalOpen}
          title={editing ? "Edit Specialty" : "New Specialty"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>{editing ? "Save Changes" : "Create"}</Button>
            </>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {principal?.roleScope === "GLOBAL" ? (
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Branch Id (GLOBAL only)</label>
                <Input value={String(form.branchId ?? "")} onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))} placeholder="Branch UUID" />
              </div>
            ) : null}

            <div>
              <label className="text-xs text-muted-foreground">Code</label>
              <Input value={String(form.code ?? "")} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="CARD-INT" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={String(form.name ?? "")} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Interventional Cardiology" />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Department (optional)</label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.departmentId ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value || null }))}
              >
                <option value="">— Not linked —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.isActive ? "ACTIVE" : "INACTIVE"}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "ACTIVE" }))}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
