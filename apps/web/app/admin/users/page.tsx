"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, RefreshCw, Search, ShieldAlert, UserCog, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
const CLEAR_SELECT = "__clear__";

type Branch = { id: string; code: string; name: string; city?: string | null };
type Role = { roleCode: string; roleName: string; scope: "GLOBAL" | "BRANCH"; version: number; permissions: string[] };

type UserRow = {
  id: string;
  email: string;
  name: string;
  roleCode: string;
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserDetail = UserRow & {
  staffId: string | null;
  staffName: string | null;
};

type CreateUserResponse = { userId: string; email: string; tempPassword?: string };
type ResetPasswordResponse = { ok: true; tempPassword?: string };
type OkResponse = { ok: true };

function safeCopy(text: string) {
  try {
    void navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function roleScope(roles: Role[], code: string) {
  const r = roles.find((x) => x.roleCode === code);
  return r?.scope ?? "GLOBAL";
}

function roleName(roles: Role[], code: string) {
  const r = roles.find((x) => x.roleCode === code);
  return r?.roleName ?? code;
}

export default function AccessUsersPage() {
  const me = useAuthStore((s) => s.user);

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  // Create dialog
  const [openCreate, setOpenCreate] = React.useState(false);
  const [cName, setCName] = React.useState("");
  const [cEmail, setCEmail] = React.useState("");
  const [cRole, setCRole] = React.useState<string>("SUPER_ADMIN");
  const [cBranch, setCBranch] = React.useState<string>(me?.branchId || "");
  const [creating, setCreating] = React.useState(false);

  // Edit dialog
  const [openEdit, setOpenEdit] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editLoading, setEditLoading] = React.useState(false);
  const [eName, setEName] = React.useState("");
  const [eRole, setERole] = React.useState<string>("");
  const [eBranch, setEBranch] = React.useState<string>("");
  const [eActive, setEActive] = React.useState<boolean>(true);
  const [eStaffId, setEStaffId] = React.useState<string>("");
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Password reveal dialog (create/reset)
  const [openPw, setOpenPw] = React.useState(false);
  const [pwTitle, setPwTitle] = React.useState("");
  const [pwEmail, setPwEmail] = React.useState("");
  const [pwValue, setPwValue] = React.useState<string | null>(null);

  // Reset confirm dialog
  const [openReset, setOpenReset] = React.useState(false);
  const [resetTarget, setResetTarget] = React.useState<UserRow | null>(null);
  const [resetting, setResetting] = React.useState(false);

  const load = React.useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const [u, r, b] = await Promise.all([
        apiFetch<UserRow[]>(`/api/iam/users${qs}`),
        apiFetch<Role[]>("/api/iam/roles"),
        apiFetch<Branch[]>("/api/iam/branches"),
      ]);
      setRows(u);
      setRoles(r);
      setBranches(b);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [q]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const stats = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((x) => x.isActive).length;
    const disabled = total - active;
    const mustChange = rows.filter((x) => x.mustChangePassword).length;
    return { total, active, disabled, mustChange };
  }, [rows]);

  const createRoleScope = React.useMemo(() => roleScope(roles, cRole), [roles, cRole]);
  const editRoleScope = React.useMemo(() => roleScope(roles, eRole), [roles, eRole]);

  async function createUser() {
    setErr(null);

    const name = cName.trim();
    const email = cEmail.trim();
    if (!name) return setErr("Name is required.");
    if (!email) return setErr("Email is required.");
    if (!cRole) return setErr("Role is required.");

    if (createRoleScope === "BRANCH" && !cBranch) return setErr("Branch is required for a branch-scoped role.");

    setCreating(true);
    try {
      const res = await apiFetch<CreateUserResponse>("/api/iam/users", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          roleCode: cRole,
          branchId: cBranch ? cBranch : null,
        }),
      });

      setOpenCreate(false);

      setPwTitle("Temporary password (new user)");
      setPwEmail(res.email);
      setPwValue(res.tempPassword ?? null);
      setOpenPw(true);

      // reset form
      setCName("");
      setCEmail("");
      setCRole("SUPER_ADMIN");
      setCBranch(me?.branchId || "");

      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  }

  async function openEditUser(u: UserRow) {
    setErr(null);
    setOpenEdit(true);
    setEditId(u.id);
    setEditLoading(true);

    try {
      const d = await apiFetch<UserDetail>(`/api/iam/users/${u.id}`);
      setEName(d.name ?? "");
      setERole(d.roleCode ?? u.roleCode);
      setEBranch(d.branchId ?? "");
      setEActive(Boolean(d.isActive));
      setEStaffId(d.staffId ?? "");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Unable to load user details.");
      setOpenEdit(false);
      setEditId(null);
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEdit() {
    if (!editId) return;

    setErr(null);

    const name = eName.trim();
    if (!name) return setErr("Name is required.");
    if (!eRole) return setErr("Role is required.");
    if (editRoleScope === "BRANCH" && !eBranch) return setErr("Branch is required for a branch-scoped role.");

    const patch: any = {};
    patch.name = name;
    patch.roleCode = eRole;
    patch.branchId = eBranch ? eBranch : null;
    patch.isActive = eActive;
    // staffId: optional; only send if user touched it (we always send current text)
    patch.staffId = eStaffId.trim() ? eStaffId.trim() : null;

    setSavingEdit(true);
    try {
      await apiFetch<OkResponse>(`/api/iam/users/${editId}`, { method: "PATCH", body: JSON.stringify(patch) });
      setOpenEdit(false);
      setEditId(null);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSavingEdit(false);
    }
  }

  function askReset(u: UserRow) {
    setResetTarget(u);
    setOpenReset(true);
  }

  async function doReset() {
    if (!resetTarget) return;
    setErr(null);
    setResetting(true);
    try {
      const res = await apiFetch<ResetPasswordResponse>(`/api/iam/users/${resetTarget.id}/reset-password`, { method: "POST" });
      setOpenReset(false);

      setPwTitle("Temporary password (reset)");
      setPwEmail(resetTarget.email);
      setPwValue(res.tempPassword ?? null);
      setOpenPw(true);

      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setResetting(false);
    }
  }

  async function toggleActive(u: UserRow) {
    setErr(null);
    try {
      await apiFetch<OkResponse>(`/api/iam/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Update failed.");
    }
  }

  return (
    <AppShell title="Users & Access · App Users">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>App Users</CardTitle>
                <CardDescription>
                  Provision users, assign roles, and manage access. Deactivation and password resets revoke sessions immediately.
                </CardDescription>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-xc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name or email"
                    className="w-[280px] pl-9"
                  />
                </div>

                <Button variant="outline" onClick={load} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>

                <Button onClick={() => setOpenCreate(true)}>
                  <Plus className="h-4 w-4" />
                  Create user
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-xc-border bg-xc-panel p-3">
                <div className="text-xs text-xc-muted">Total</div>
                <div className="mt-1 text-lg font-semibold">{stats.total}</div>
              </div>
              <div className="rounded-xl border border-xc-border bg-xc-panel p-3">
                <div className="text-xs text-xc-muted">Active</div>
                <div className="mt-1 text-lg font-semibold">{stats.active}</div>
              </div>
              <div className="rounded-xl border border-xc-border bg-xc-panel p-3">
                <div className="text-xs text-xc-muted">Disabled</div>
                <div className="mt-1 text-lg font-semibold">{stats.disabled}</div>
              </div>
              <div className="rounded-xl border border-xc-border bg-xc-panel p-3">
                <div className="text-xs text-xc-muted">Must change password</div>
                <div className="mt-1 text-lg font-semibold">{stats.mustChange}</div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {err ? (
              <div className="mb-4 rounded-xl border border-xc-danger/30 bg-xc-danger/10 px-4 py-3 text-sm text-xc-danger">
                {err}
              </div>
            ) : null}

            <div className="rounded-xl border border-xc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-xc-muted">
                        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : rows.length ? (
                    rows.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium">{u.name}</div>
                          <div className="font-mono text-xs text-xc-muted">{u.email}</div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium">{roleName(roles, u.roleCode)}</div>
                          <div className="font-mono text-xs text-xc-muted">{u.roleCode}</div>
                        </TableCell>

                        <TableCell className="text-sm">
                          {u.branchName ? (
                            <div>
                              <div className="font-medium">{u.branchName}</div>
                              <div className="text-xs text-xc-muted">{u.branchId}</div>
                            </div>
                          ) : (
                            <span className="text-xc-muted">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {u.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="destructive">Disabled</Badge>}
                        </TableCell>

                        <TableCell>
                          {u.mustChangePassword ? <Badge variant="warning">Must change password</Badge> : <Badge variant="secondary">Normal</Badge>}
                        </TableCell>

                        <TableCell className="text-sm text-xc-muted">{fmt(u.updatedAt)}</TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditUser(u)}>
                              <UserCog className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => askReset(u)}>
                              <ShieldAlert className="h-4 w-4" />
                              Reset
                            </Button>
                            <Button
                              variant={u.isActive ? "outline" : "secondary"}
                              size="sm"
                              onClick={() => void toggleActive(u)}
                            >
                              {u.isActive ? "Disable" : "Enable"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-xc-muted">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create User */}
        <Dialog open={openCreate} onOpenChange={(v) => { setOpenCreate(v); setErr(null); }}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create user
              </DialogTitle>
              <DialogDescription>Creates a user with a temporary password and forces password change on first login.</DialogDescription>
            </DialogHeader>

            <Separator className="my-4" />

            {err ? (
              <div className="mb-3 rounded-xl border border-xc-danger/30 bg-xc-danger/10 px-4 py-3 text-sm text-xc-danger">
                {err}
              </div>
            ) : null}

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Full name" />
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="name@excelcare.local" />
              </div>

              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={cRole} onValueChange={setCRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={`${r.roleCode}:${r.version}`} value={r.roleCode}>
                        {r.roleName} ({r.roleCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-xc-muted">
                  Scope: <span className="font-medium text-xc-text">{createRoleScope}</span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Branch</Label>
                <Select
  value={cBranch || undefined}
  onValueChange={(v) => setCBranch(v === CLEAR_SELECT ? "" : v)}
>
  <SelectTrigger>
    <SelectValue
      placeholder={createRoleScope === "BRANCH" ? "Select branch (required)" : "Select branch (optional)"}
    />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={CLEAR_SELECT}>(Not set)</SelectItem>
    {branches.map((b) => (
      <SelectItem key={b.id} value={b.id}>
        {b.name}{b.city ? ` · ${b.city}` : ""}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
                {createRoleScope === "BRANCH" ? (
                  <div className="text-xs text-xc-muted">Branch is required for branch-scoped roles.</div>
                ) : (
                  <div className="text-xs text-xc-muted">Optional for global roles.</div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={creating}>Cancel</Button>
              <Button onClick={() => void createUser()} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User */}
        <Dialog open={openEdit} onOpenChange={(v) => { setOpenEdit(v); if (!v) setEditId(null); setErr(null); }}>
          <DialogContent className="sm:max-w-[620px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Edit user
              </DialogTitle>
              <DialogDescription>Update identity, role, branch mapping and activation status.</DialogDescription>
            </DialogHeader>

            <Separator className="my-4" />

            {editLoading ? (
              <div className="py-10 text-center text-sm text-xc-muted">
                <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                Loading user...
              </div>
            ) : (
              <>
                {err ? (
                  <div className="mb-3 rounded-xl border border-xc-danger/30 bg-xc-danger/10 px-4 py-3 text-sm text-xc-danger">
                    {err}
                  </div>
                ) : null}

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input value={eName} onChange={(e) => setEName(e.target.value)} />
                  </div>

                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <Select value={eRole} onValueChange={setERole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={`${r.roleCode}:${r.version}`} value={r.roleCode}>
                            {r.roleName} ({r.roleCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-xc-muted">
                      Scope: <span className="font-medium text-xc-text">{editRoleScope}</span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Branch</Label>
                   <Select
  value={eBranch || undefined}
  onValueChange={(v) => setEBranch(v === CLEAR_SELECT ? "" : v)}
>
  <SelectTrigger>
    <SelectValue
      placeholder={editRoleScope === "BRANCH" ? "Select branch (required)" : "Select branch (optional)"}
    />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={CLEAR_SELECT}>(Not set)</SelectItem>
    {branches.map((b) => (
      <SelectItem key={b.id} value={b.id}>
        {b.name}{b.city ? ` · ${b.city}` : ""}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

                    {editRoleScope === "BRANCH" ? (
                      <div className="text-xs text-xc-muted">Branch is required for branch-scoped roles.</div>
                    ) : (
                      <div className="text-xs text-xc-muted">Optional for global roles.</div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label>Staff ID (optional)</Label>
                    <Input value={eStaffId} onChange={(e) => setEStaffId(e.target.value)} placeholder="(optional) staff uuid" />
                    <div className="text-xs text-xc-muted">You can wire a staff picker later; this keeps the field usable now.</div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-xc-border bg-xc-panel px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold">Account status</div>
                      <div className="text-xs text-xc-muted">Disabling blocks login and revokes sessions immediately.</div>
                    </div>
                    <Button
                      variant={eActive ? "outline" : "secondary"}
                      onClick={() => setEActive((v) => !v)}
                    >
                      {eActive ? "Active" : "Disabled"}
                    </Button>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={savingEdit}>Cancel</Button>
                  <Button onClick={() => void saveEdit()} disabled={savingEdit}>
                    {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Reset Password Confirm */}
        <Dialog open={openReset} onOpenChange={(v) => { setOpenReset(v); if (!v) setResetTarget(null); setErr(null); }}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>
                This revokes active sessions immediately and forces a password change on next login.
              </DialogDescription>
            </DialogHeader>

            <Separator className="my-4" />

            <div className="rounded-xl border border-xc-border bg-xc-panel px-4 py-3 text-sm">
              <div className="font-medium">{resetTarget?.email ?? "—"}</div>
              <div className="text-xs text-xc-muted">{resetTarget?.name ?? ""}</div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenReset(false)} disabled={resetting}>Cancel</Button>
              <Button onClick={() => void doReset()} disabled={resetting}>
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Reset now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Result */}
        <Dialog open={openPw} onOpenChange={setOpenPw}>
          <DialogContent className="sm:max-w-[640px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                {pwTitle}
              </DialogTitle>
              <DialogDescription>
                Share securely with <span className="font-medium text-xc-text">{pwEmail}</span>. The user must change it on next login.
              </DialogDescription>
            </DialogHeader>

            <Separator className="my-4" />

            {pwValue ? (
              <div className="rounded-xl border border-xc-border bg-xc-panel p-4">
                <div className="text-sm font-semibold">Temporary password</div>
                <div className="mt-2 rounded-lg border border-xc-border bg-xc-card px-3 py-2 font-mono text-sm">
                  {pwValue}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button variant="outline" onClick={() => safeCopy(pwValue)}>Copy</Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-xc-border bg-xc-panel p-4 text-sm text-xc-muted">
                Temporary password is not returned in production unless <span className="font-mono">IAM_RETURN_TEMP_PASSWORD=true</span>.
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setOpenPw(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
