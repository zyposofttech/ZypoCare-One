"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

type Role = {
  roleCode: string;
  roleName: string;
  scope: "GLOBAL" | "BRANCH";
  version: number;
  permissions: string[];
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  roleCode: string;
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
};

export default function UsersPage() {
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState({ email: "", name: "", roleCode: "BRANCH_ADMIN", branchId: "" });
  const [createdTemp, setCreatedTemp] = React.useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const [r, u] = await Promise.all([
        apiFetch<Role[]>("/api/iam/roles"),
        apiFetch<UserRow[]>(`/api/iam/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
      ]);
      setRoles(r);
      setUsers(u);
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate() {
    setErr(null);
    setCreatedTemp(null);
    try {
      const payload: any = {
        email: form.email,
        name: form.name,
        roleCode: form.roleCode,
      };
      if (form.branchId.trim()) payload.branchId = form.branchId.trim();

      const res = await apiFetch<{ userId: string; email: string; tempPassword?: string }>("/api/iam/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.tempPassword) setCreatedTemp(res.tempPassword);
      setCreateOpen(false);
      setForm({ email: "", name: "", roleCode: "BRANCH_ADMIN", branchId: "" });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    }
  }

  async function toggleActive(u: UserRow) {
    setErr(null);
    try {
      await apiFetch(`/api/iam/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    }
  }

  async function resetPassword(u: UserRow) {
    setErr(null);
    try {
      const res = await apiFetch<{ ok: true; tempPassword?: string }>(`/api/iam/users/${u.id}/reset-password`, {
        method: "POST",
      });
      if (res.tempPassword) {
        alert(`Temporary password for ${u.email}:\n\n${res.tempPassword}\n\nUser must change on first login.`);
      } else {
        alert("Password reset completed. Temporary password is not returned in production.");
      }
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Reset failed");
    }
  }

  return (
    <AppShell title="Users & Roles">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Create users, assign roles, and reset passwords.</CardDescription>
        </CardHeader>
        <CardContent>
          {err && (
            <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          {createdTemp && (
            <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Temporary password (copy now): <span className="font-mono font-semibold">{createdTemp}</span>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" />
            <Button onClick={refresh} disabled={loading}>Search</Button>
            <Button onClick={() => setCreateOpen(true)}>Create User</Button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-zinc-600">
                <tr className="border-b">
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2 font-medium">{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.roleCode}</td>
                    <td>{u.branchName || u.branchId || "-"}</td>
                    <td>
                      {u.isActive ? "Active" : "Inactive"}
                      {u.mustChangePassword ? " · MCP" : ""}
                    </td>
                    <td className="py-2 text-right space-x-2">
                      <Button variant="outline" onClick={() => toggleActive(u)}>
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="outline" onClick={() => resetPassword(u)}>
                        Reset Password
                      </Button>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-600">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {createOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-lg bg-white p-4">
                <div className="text-lg font-semibold">Create User</div>
                <div className="mt-3 grid gap-2">
                  <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <div>
                    <label className="text-xs text-zinc-600">Role</label>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2"
                      value={form.roleCode}
                      onChange={(e) => setForm({ ...form, roleCode: e.target.value })}
                    >
                      {roles.map((r) => (
                        <option key={r.roleCode} value={r.roleCode}>
                          {r.roleCode} (v{r.version}) · {r.scope}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    placeholder="Branch ID (optional; required for BRANCH roles)"
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={onCreate}>Create</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
