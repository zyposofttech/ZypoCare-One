"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/use-toast";

import { useAuthStore, hasPerm } from "@/lib/auth/store";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck, Pencil, Wand2 } from "lucide-react";

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

function normalizeCode(input: string) {
  return String(input || "").trim().toUpperCase();
}

function generateCodeFromName(name: string) {
  return normalizeCode(name)
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[980px] translate-x-0 translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

function scopePill(scope: Role["scope"]) {
  if (scope === "GLOBAL") {
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
  }
  return "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200";
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
      <AlertTriangle className="mt-0.5 h-4 w-4" />
      <div className="min-w-0">{message}</div>
    </div>
  );
}

function PermissionSelector({
  perms,
  selected,
  onChange,
  search,
  setSearch,
  disabled,
}: {
  perms: Permission[];
  selected: string[];
  onChange: (next: string[]) => void;
  search: string;
  setSearch: (v: string) => void;
  disabled?: boolean;
}) {
  const [activeCategory, setActiveCategory] = React.useState("All");

  function catLabel(p: Permission) {
    return String(p.category || "").trim() || "Uncategorized";
  }

  const needle = search.trim().toLowerCase();
  const list = needle
    ? perms.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.code.toLowerCase().includes(needle) ||
          (p.category && p.category.toLowerCase().includes(needle)),
      )
    : perms;

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    (perms || []).forEach((p) => set.add(catLabel(p)));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [perms]);

  const categoryCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    list.forEach((p) => {
      const cat = catLabel(p);
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [list]);

  React.useEffect(() => {
    if (!categories.includes(activeCategory)) setActiveCategory("All");
  }, [categories, activeCategory]);

  const filtered = React.useMemo(() => {
    if (activeCategory === "All") return list;
    return list.filter((p) => catLabel(p) === activeCategory);
  }, [list, activeCategory]);

  return (
    <div className="grid gap-2">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
        <Input
          placeholder="Filter permissions…"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full space-y-2">
        <TabsList className="h-auto w-full flex-wrap rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs data-[state=active]:bg-zc-accent data-[state=active]:text-white",
                "data-[state=active]:shadow-none",
              )}
            >
              {cat}
              {cat !== "All" ? (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                  {categoryCounts[cat] ?? 0}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeCategory} className="mt-0" />
      </Tabs>

      <div className="h-[360px] overflow-y-auto rounded-xl border border-zc-border bg-zc-panel/10 p-2">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-xs text-zc-muted">No permissions found.</div>
        ) : (
          <div className="space-y-1">
            {filtered.map((p) => {
              const checked = selected.includes(p.code);
              return (
                <label
                  key={p.code}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors",
                    "hover:bg-zc-panel/40",
                    disabled && "cursor-not-allowed opacity-80",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(v) => {
                      if (disabled) return;
                      const next = Boolean(v)
                        ? [...selected, p.code]
                        : selected.filter((x) => x !== p.code);
                      onChange(next);
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-none text-zc-text">{p.name}</div>
                    <div className="mt-1 font-mono text-xs text-zc-muted">{p.code}</div>
                    {p.category ? (
                      <div className="mt-1 text-[11px] text-zc-muted">
                        Category: <span className="font-semibold">{catLabel(p)}</span>
                      </div>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-right text-xs text-zc-muted">
        Selected: <span className="font-semibold tabular-nums text-zc-text">{selected.length}</span>
      </div>
    </div>
  );
}

export default function AccessRolesPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  // ✅ Treat permissions as "ready" only after /api/iam/me has hydrated them.
  // This prevents a one-time fetch from running too early (right after login) and never re-running.
  const permsReady = Array.isArray(user?.permissions);

  // ✅ Permission-first gating (enterprise RBAC)
  const canRead = hasPerm(user, "IAM_ROLE_READ");
  const canCreate = hasPerm(user, "IAM_ROLE_CREATE");
  const canUpdate = hasPerm(user, "IAM_ROLE_UPDATE");

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<Role[]>([]);
  const [perms, setPerms] = React.useState<Permission[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"view" | "edit">("view");
  const [selected, setSelected] = React.useState<Role | null>(null);

  // Create form
  const [cName, setCName] = React.useState("");
  const [cCode, setCCode] = React.useState("");
  const [cScope, setCScope] = React.useState<Role["scope"]>("GLOBAL");
  const [cPerms, setCPerms] = React.useState<string[]>([]);
  const [cPermQ, setCPermQ] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Edit/View form
  const [eName, setEName] = React.useState("");
  const [ePerms, setEPerms] = React.useState<string[]>([]);
  const [ePermQ, setEPermQ] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => `${r.roleName} ${r.roleCode} ${r.scope}`.toLowerCase().includes(needle));
  }, [rows, q]);

  const stats = React.useMemo(() => {
    const total = rows.length;
    const global = rows.filter((r) => r.scope === "GLOBAL").length;
    const branch = rows.filter((r) => r.scope === "BRANCH").length;
    return { total, global, branch };
  }, [rows]);

  async function refresh(showToast: boolean) {
    // ✅ If permissions are not hydrated yet, wait (prevents empty first paint that never recovers)
    if (!permsReady) return;

    // ✅ Don’t call backend if user can’t read roles.
    if (!canRead) {
      setRows([]);
      setPerms([]);
      setErr(null);
      return;
    }

    setErr(null);
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        apiFetch<Role[]>("/api/iam/roles"),
        apiFetch<Permission[]>("/api/iam/permissions"),
      ]);
      setRows(r);
      setPerms(p);
    } catch (e: any) {
      const msg = e?.message || "Failed to load roles";
      setErr(msg);
      if (showToast) toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    // ✅ Run once permissions are ready and re-run if IAM_ROLE_READ becomes available.
    if (!permsReady) return;
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permsReady, canRead]);

  function resetCreate() {
    setCName("");
    setCCode("");
    setCScope("GLOBAL");
    setCPerms([]);
    setCPermQ("");
  }

  function openDetails(role: Role) {
    setSelected(role);
    setEditMode("view");
    setEName(role.roleName);
    setEPerms([...role.permissions]);
    setEPermQ("");
    setEditOpen(true);
  }

  function openEdit(role: Role) {
    setSelected(role);
    setEditMode("edit");
    setEName(role.roleName);
    setEPerms([...role.permissions]);
    setEPermQ("");
    setEditOpen(true);
  }

  async function createRole() {
    if (!canCreate) {
      setErr("You don’t have permission to create roles.");
      return;
    }
    setErr(null);

    const name = cName.trim();
    const code = normalizeCode(cCode);
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

      toast({ variant: "success", title: "Role created", description: `Created "${name}" (${code})` });

      setCreateOpen(false);
      resetCreate();
      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Create failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Create failed", description: msg });
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit() {
    if (!selected) return;
    if (!canUpdate) {
      setErr("You don’t have permission to update roles.");
      return;
    }

    setErr(null);
    const name = eName.trim();
    if (!name) return setErr("Role name is required.");

    setSaving(true);
    try {
      await apiFetch<OkResponse>(`/api/iam/roles/${selected.roleCode}`, {
        method: "PATCH",
        body: JSON.stringify({
          roleName: name,
          permissions: ePerms,
        }),
      });

      toast({
        variant: "success",
        title: "Role updated",
        description: `Updated "${name}" (${selected.roleCode})`,
      });

      setEditOpen(false);
      setSelected(null);
      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Update failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Update failed", description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Roles">
      <div className="grid gap-6">
        {/* Header (standard) */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ShieldCheck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Roles</div>
              <div className="mt-1 text-sm text-zc-muted">
                Define role templates and permission grants. Corporate admins can view; privileged admins can create and edit.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button variant="primary" className="px-5 gap-2" onClick={() => setCreateOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Create Role
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview (standard) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search roles and inspect permission grants. Updates create a new active version on the backend.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Roles</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Global Scope</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.global}</div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Branch Scope</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{stats.branch}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code, or scope…" className="pl-10" />
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{rows.length}</span>
              </div>
            </div>

            {err ? <ErrorBanner message={err} /> : null}

            {!canRead ? (
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                You may not have permission to view roles. If the list is empty and you see 403 errors, request <span className="font-semibold">IAM_ROLE_READ</span>.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Registry (standard) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Role Registry</CardTitle>
            <CardDescription className="text-sm">Open details to review permissions. Edit is available only with IAM_ROLE_UPDATE.</CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Role</th>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Scope</th>
                  <th className="px-4 py-3 text-left font-semibold">Permissions</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-zc-muted">
                      <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                      Loading roles…
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((r) => (
                    <tr key={`${r.roleCode}:${r.version}`} className="border-t border-zc-border/60">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zc-text">{r.roleName}</div>
                        <div className="mt-1 text-[11px] text-zc-muted">
                          Version: <span className="font-semibold tabular-nums">{r.version}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-zc-text">{r.roleCode}</span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", scopePill(r.scope))}>
                          {r.scope}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-zc-muted">
                        <span className="font-semibold tabular-nums text-zc-text">{r.permissions.length}</span> grants
                      </td>

                     <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="success"
                            size="icon"
                            onClick={() => openDetails(r)}
                            title="View details"
                            aria-label="View details"
                          >
                            <IconChevronRight className="h-4 w-4" />
                          </Button>

                          {canUpdate ? (
                            <Button
                              variant="info"
                              size="icon"
                              onClick={() => openEdit(r)}
                              title="Edit role"
                              aria-label="Edit role"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-zc-muted">
                      No roles found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ---------------- Create Role Drawer ---------------- */}
        <Dialog
          open={createOpen}
          onOpenChange={(v) => {
            if (!v) {
              resetCreate();
              setErr(null);
            }
            setCreateOpen(v);
          }}
        >
          <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Create Role
              </DialogTitle>
              <DialogDescription>Create a new role template. Role code must be unique and uppercase.</DialogDescription>
            </DialogHeader>

            <Separator className="my-4" />

            {err ? <ErrorBanner message={err} /> : null}

            <div className="grid gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Role Name</Label>
                  <Input
                    value={cName}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCName(v);
                      if (!cCode) setCCode(generateCodeFromName(v));
                    }}
                    placeholder="e.g. Corporate Billing Admin"
                    disabled={!canCreate || creating}
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Role Code</Label>
                    {!cCode ? null : (
                      <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                        <Wand2 className="h-3 w-3" /> Suggested
                      </span>
                    )}
                  </div>

                  <Input
                    value={cCode}
                    onChange={(e) => setCCode(normalizeCode(e.target.value))}
                    placeholder="e.g. CORPORATE_BILLING_ADMIN"
                    disabled={!canCreate || creating}
                    className={cn(
                      "font-mono bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500",
                      (!canCreate || creating) && "opacity-80",
                    )}
                  />

                  <p className="text-[11px] text-zc-muted">
                    Tip: use stable codes. Example: <span className="font-mono">CORPORATE_ADMIN</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Scope</Label>
                <Select value={cScope} onValueChange={(v: any) => setCScope(v)} disabled={!canCreate || creating}>
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
                    ? "Users assigned this role can act across the organization (subject to branch context)."
                    : "Users must be assigned to a branch to use this role."}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Permissions</Label>
                <PermissionSelector
                  perms={perms}
                  selected={cPerms}
                  onChange={setCPerms}
                  search={cPermQ}
                  setSearch={setCPermQ}
                  disabled={!canCreate || creating}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void createRole()} disabled={!canCreate || creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : (
                  "Create Role"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---------------- Details/Edit Drawer ---------------- */}
        <Dialog
          open={editOpen}
          onOpenChange={(v) => {
            if (!v) {
              setSelected(null);
              setErr(null);
              setSaving(false);
            }
            setEditOpen(v);
          }}
        >
          <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                {editMode === "edit" ? "Edit Role" : "Role Details"}
              </DialogTitle>
              <DialogDescription>
                {selected ? (
                  <>
                    <span className="font-mono text-xs">{selected.roleCode}</span> • Scope:{" "}
                    <span className="font-semibold">{selected.scope}</span> • Version:{" "}
                    <span className="font-semibold tabular-nums">{selected.version}</span>
                  </>
                ) : (
                  "Inspect role information."
                )}
              </DialogDescription>
            </DialogHeader>

            <Separator className="my-4" />

            {err ? <ErrorBanner message={err} /> : null}

            {selected ? (
              <div className="grid gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Role Name</Label>
                    <Input
                      value={eName}
                      onChange={(e) => setEName(e.target.value)}
                      disabled={editMode !== "edit" || !canUpdate || saving}
                      placeholder="Role name"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Role Code</Label>
                    <Input
                      value={selected.roleCode}
                      disabled
                      className="font-mono bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 opacity-80"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Scope</Label>
                  <Input
                    value={selected.scope}
                    disabled
                    className="bg-zc-panel/10 border-zc-border opacity-80"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Permissions</Label>
                  <PermissionSelector
                    perms={perms}
                    selected={ePerms}
                    onChange={setEPerms}
                    search={ePermQ}
                    setSearch={setEPermQ}
                    disabled={editMode !== "edit" || !canUpdate || saving}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-zc-muted">No role selected.</div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Close
              </Button>

              {editMode === "edit" ? (
                <Button variant="info" onClick={() => void saveEdit()} disabled={!canUpdate || saving || !selected}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
