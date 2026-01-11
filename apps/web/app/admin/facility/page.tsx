"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";
import { apiFetch, ApiError } from "@/lib/api";
import { Building2, Layers, Stethoscope, Bed, Plus, Pencil, RefreshCw } from "lucide-react";

type Facility = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  type?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Principal = {
  userId: string;
  roleCode: string;
  roleScope: "GLOBAL" | "BRANCH";
  branchId?: string | null;
  permissions: string[];
};

function fmtActive(isActive: boolean) {
  return isActive ? "ACTIVE" : "INACTIVE";
}

export default function FacilitySetupPage() {
  const [principal, setPrincipal] = React.useState<Principal | null>(null);
  const [rows, setRows] = React.useState<Facility[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Facility | null>(null);
  const [form, setForm] = React.useState<Partial<Facility>>({ isActive: true });

  async function load() {
    setLoading(true);
    try {
      const me = await apiFetch<Principal>("/iam/me");
      setPrincipal(me);

      const facilities = await apiFetch<Facility[]>("/facilities" + (me.roleScope === "GLOBAL" ? "" : ""));
      setRows(facilities);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to load facilities";
      toast({ title: "Load failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    const t = `${r.code} ${r.name} ${r.city}`.toLowerCase();
    return t.includes(q.toLowerCase());
  });

  function openCreate() {
    setEditing(null);
    setForm({ isActive: true, city: "Bengaluru", state: "Karnataka" } as any);
    setModalOpen(true);
  }

  function openEdit(r: Facility) {
    setEditing(r);
    setForm({ ...r });
    setModalOpen(true);
  }

  async function save() {
    try {
      const payload: any = {
        branchId: principal?.roleScope === "GLOBAL" ? form.branchId : undefined,
        code: String(form.code ?? "").trim(),
        name: String(form.name ?? "").trim(),
        type: form.type ?? undefined,
        addressLine1: form.addressLine1 ?? undefined,
        addressLine2: form.addressLine2 ?? undefined,
        city: String(form.city ?? "").trim(),
        state: form.state ?? undefined,
        postalCode: form.postalCode ?? undefined,
        phone: form.phone ?? undefined,
        email: form.email ?? undefined,
        isActive: form.isActive,
      };

      if (editing) {
        await apiFetch(`/facilities/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast({ title: "Facility updated", description: `${payload.name} (${payload.code})` });
      } else {
        await apiFetch(`/facilities`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Facility created", description: `${payload.name} (${payload.code})` });
      }

      setModalOpen(false);
      await load();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Save failed";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    }
  }

  return (
    <AppShell title="Facility Setup">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Branch → Facility registry → Masters</div>
            <h1 className="text-xl font-semibold">Facility Setup</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search facilities..." className="w-full sm:w-[320px]" />
            </div>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Facility
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Link href="/admin/facility" className="block">
            <Card className="hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Facilities</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rows.length}</div>
                <p className="text-xs text-muted-foreground">Registered under your branch scope</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/departments" className="block">
            <Card className="hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Departments</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Configure</div>
                <p className="text-xs text-muted-foreground">Clinical, non-clinical departments</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/specialties" className="block">
            <Card className="hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Specialties</CardTitle>
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Configure</div>
                <p className="text-xs text-muted-foreground">Link specialties to departments</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/wards" className="block">
            <Card className="hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wards, Rooms & Beds</CardTitle>
                <Bed className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Configure</div>
                <p className="text-xs text-muted-foreground">Ward topology & capacity</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Facility Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Facilities are registered under a Branch. Branch Admins will see only their branch facilities; Super Admin can manage all.
            </div>
            <Separator className="my-3" />

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">City</th>
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
                        No facilities found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">{r.type || "—"}</div>
                        </td>
                        <td className="px-3 py-2">{r.city}</td>
                        <td className="px-3 py-2">
                          <span className={r.isActive ? "text-emerald-600" : "text-zinc-500"}>{fmtActive(r.isActive)}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </div>
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
          title={editing ? "Edit Facility" : "New Facility"}
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
              <Input value={String(form.code ?? "")} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="MAIN" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={String(form.name ?? "")} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Main Campus" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <Input value={String(form.type ?? "")} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} placeholder="HOSPITAL" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">City</label>
              <Input value={String(form.city ?? "")} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Bengaluru" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">State</label>
              <Input value={String(form.state ?? "")} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} placeholder="Karnataka" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Postal Code</label>
              <Input value={String(form.postalCode ?? "")} onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))} placeholder="560001" />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Address Line 1</label>
              <Input value={String(form.addressLine1 ?? "")} onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))} placeholder="Richmond Road" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Address Line 2</label>
              <Input value={String(form.addressLine2 ?? "")} onChange={(e) => setForm((p) => ({ ...p, addressLine2: e.target.value }))} placeholder="Bengaluru, Karnataka" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input value={String(form.phone ?? "")} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+91..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <Input value={String(form.email ?? "")} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="contact@excelcare..." />
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
