"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Edit,
} from "lucide-react";

type Role = {
  roleCode: string;
  roleName: string;
  scope: "GLOBAL" | "BRANCH";
  version: number;
  permissions: string[];
};

type Permission = {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  description?: string | null;
};

type CreateRoleResponse = { roleCode: string };
type OkResponse = { ok: true };

function formatScope(scope: Role["scope"]) {
  return scope === "GLOBAL"
    ? { label: "Global", variant: "accent" as const }
    : { label: "Branch", variant: "secondary" as const };
}

export default function AccessRolesPage() {
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [perms, setPerms] = React.useState<Permission[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [cName, setCName] = React.useState("");
  const [cCode, setCCode] = React.useState("");
  const [cScope, setCScope] = React.useState<"GLOBAL" | "BRANCH">("GLOBAL");
  const [cPerms, setCPerms] = React.useState<string[]>([]);
  const [cPermQ, setCPermQ] = React.useState(""); 

  const [openEdit, setOpenEdit] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Role | null>(null);
  const [eName, setEName] = React.useState("");
  const [ePerms, setEPerms] = React.useState<string[]>([]);
  const [ePermQ, setEPermQ] = React.useState("");

  const load = React.useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        apiFetch<Role[]>("/api/iam/roles"),
        apiFetch<Permission[]>("/api/iam/permissions"),
      ]);
      setRoles(r);
      setPerms(p);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Unable to load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const stats = React.useMemo(() => {
    const total = roles.length;
    const global = roles.filter((r) => r.scope === "GLOBAL").length;
    const branch = roles.filter((r) => r.scope === "BRANCH").length;
    return { total, global, branch };
  }, [roles]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return roles;
    return roles.filter((r) => {
      const hay = `${r.roleName} ${r.roleCode} ${r.scope}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [roles, q]);

  function generateCode(name: string) {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_")
      .replace(/_+/g, "_");
  }

  async function createRole() {
    setErr(null);
    const name = cName.trim();
    const code = cCode.trim();

    if (!name) return setErr("Role name is required.");
    if (!code) return setErr("Role code is required.");
    if (cPerms.length === 0) return setErr("Select at least one permission.");

    setCreating(true);
    try {
      await apiFetch<CreateRoleResponse>("/api/iam/roles", {
        method: "POST",
        body: JSON.stringify({
          roleName: name,
          roleCode: code,
          scope: cScope,
          permissions: cPerms,
        }),
      });
      setOpenCreate(false);
      resetCreateForm();
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  }

  function resetCreateForm() {
    setCName("");
    setCCode("");
    setCScope("GLOBAL");
    setCPerms([]);
    setCPermQ("");
  }

  function openEditDialog(role: Role) {
    setEditTarget(role);
    setEName(role.roleName);
    setEPerms([...role.permissions]);
    setEPermQ("");
    setOpenEdit(true);
  }

  async function saveEdit() {
    if (!editTarget) return;
    setErr(null);
    const name = eName.trim();
    if (!name) return setErr("Role name is required.");

    setEditing(true);
    try {
      await apiFetch<OkResponse>(`/api/iam/roles/${editTarget.roleCode}`, {
        method: "PATCH",
        body: JSON.stringify({
          roleName: name,
          permissions: ePerms,
        }),
      });
      setOpenEdit(false);
      setEditTarget(null);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setEditing(false);
    }
  }

  const renderPermissionSelector = (
    selected: string[],
    setSelected: (v: string[]) => void,
    search: string,
    setSearch: (v: string) => void
  ) => {
    const needle = search.trim().toLowerCase();
    const list = needle
      ? perms.filter(
          (p) =>
            p.name.toLowerCase().includes(needle) ||
            p.code.toLowerCase().includes(needle) ||
            (p.category && p.category.toLowerCase().includes(needle))
        )
      : perms;

    return (
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zc-muted" />
          <Input
            placeholder="Filter permissions..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="h-[280px] overflow-y-auto rounded-md border border-zc-border bg-zc-card p-2">
          {list.length === 0 ? (
            <div className="py-8 text-center text-xs text-zc-muted">
              No permissions found.
            </div>
          ) : (
            <div className="space-y-1">
              {list.map((p) => {
                const isChecked = selected.includes(p.code);
                return (
                  <label
                    key={p.code}
                    className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-zc-panel transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) setSelected([...selected, p.code]);
                        else setSelected(selected.filter((x) => x !== p.code));
                      }}
                    />
                    <div className="grid gap-0.5">
                      <div className="text-sm font-medium leading-none">
                        {p.name}
                      </div>
                      <div className="text-xs text-zc-muted font-mono">
                        {p.code}
                      </div>
                    </div>
                    {p.category && (
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {p.category}
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="text-xs text-zc-muted text-right">
          Selected: <span className="font-medium text-zc-text">{selected.length}</span>
        </div>
      </div>
    );
  };

  return (
    <AppShell title="Users & Access · Roles">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Roles</CardTitle>
                <CardDescription>
                  Define roles and assign fine-grained permissions to control access.
                </CardDescription>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search roles"
                    className="w-[280px] pl-9"
                  />
                </div>

                <Button variant="outline" onClick={load} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>

                <Button onClick={() => setOpenCreate(true)}>
                  <Plus className="h-4 w-4" />
                  Create role
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Roles</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Global Scope</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.global}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Branch Scope</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">{stats.branch}</div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {err ? (
              <div className="mb-4 rounded-xl border border-zc-danger/30 bg-zc-danger/10 px-4 py-3 text-sm text-zc-danger">
                {err}
              </div>
            ) : null}

            <div className="rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-zc-muted"
                      >
                        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                        Loading roles...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length ? (
                    filtered.map((r) => {
                      const s = formatScope(r.scope);
                      return (
                        <TableRow key={`${r.roleCode}:${r.version}`}>
                          <TableCell className="font-medium">
                            {r.roleName}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zc-muted">
                            {r.roleCode}
                          </TableCell>
                          <TableCell>
                            <Badge variant={s.variant}>{s.label}</Badge>
                          </TableCell>
                          <TableCell className="text-zc-muted">
                            {r.permissions.length} grants
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(r)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-zc-muted"
                      >
                        No roles found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* --- CREATE ROLE DIALOG (BLUE GLOW) --- */}
        <Dialog
          open={openCreate}
          onOpenChange={(v) => {
            setOpenCreate(v);
            if (!v) resetCreateForm();
            setErr(null);
          }}
        >
          <DialogContent 
            className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col border-blue-200/50 dark:border-blue-800/50 shadow-2xl shadow-blue-500/10"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-blue-700 dark:text-blue-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Create Role
              </DialogTitle>
              <DialogDescription>
                Create a new role template. Role code must be unique and uppercase.
              </DialogDescription>
            </DialogHeader>

            <Separator className="my-2" />

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Role Name</Label>
                    <Input
                      value={cName}
                      onChange={(e) => {
                        setCName(e.target.value);
                        if (!cCode) setCCode(generateCode(e.target.value));
                      }}
                      placeholder="e.g. Senior Nurse"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Role Code</Label>
                    <Input
                      value={cCode}
                      onChange={(e) => setCCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SENIOR_NURSE"
                      className="font-mono bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Scope</Label>
                  <Select
                    value={cScope}
                    onValueChange={(v: any) => setCScope(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GLOBAL">Global (All Branches)</SelectItem>
                      <SelectItem value="BRANCH">Branch Specific</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-zc-muted">
                    {cScope === "GLOBAL"
                      ? "User assigned this role will have these permissions across the entire organization."
                      : "User must be assigned to a specific branch to use this role."}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Permissions</Label>
                  {renderPermissionSelector(cPerms, setCPerms, cPermQ, setCPermQ)}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button
                variant="outline"
                onClick={() => setOpenCreate(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={() => void createRole()} disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- EDIT ROLE DIALOG (EMERALD GLOW) --- */}
        <Dialog
          open={openEdit}
          onOpenChange={(v) => {
            setOpenEdit(v);
            if (!v) setEditTarget(null);
            setErr(null);
          }}
        >
          <DialogContent 
            className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col border-emerald-200/50 dark:border-emerald-800/50 shadow-2xl shadow-emerald-500/10"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Edit Role: {editTarget?.roleCode}
              </DialogTitle>
              <DialogDescription>
                Modify the role name and update permission grants. Code and Scope cannot be changed.
              </DialogDescription>
            </DialogHeader>

            <Separator className="my-2" />

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Role Name</Label>
                  <Input
                    value={eName}
                    onChange={(e) => setEName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Scope</Label>
                  <div className="flex items-center gap-2 rounded-md border border-zc-border bg-zc-panel px-3 py-2 text-sm text-zc-muted">
                    <Badge variant={editTarget?.scope === "GLOBAL" ? "accent" : "secondary"}>
                      {editTarget?.scope}
                    </Badge>
                    <span>(Cannot be changed after creation)</span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Permissions</Label>
                  {renderPermissionSelector(ePerms, setEPerms, ePermQ, setEPermQ)}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button
                variant="outline"
                onClick={() => setOpenEdit(false)}
                disabled={editing}
              >
                Cancel
              </Button>
              <Button onClick={() => void saveEdit()} disabled={editing} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                {editing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}