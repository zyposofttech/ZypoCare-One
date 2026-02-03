"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  Users,
  Shield,
  Key,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Lock,
  Activity,
  FileText,
  Search,
  Loader2,
} from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  name: string;
  roleCode: string;
  branchName?: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  updatedAt: string;
};

type Role = {
  roleCode: string;
  roleName: string;
  scope: "GLOBAL" | "BRANCH";
  version: number;
  permissions: string[];
};

type Permission = {
  id?: string;
  code: string;
  name: string;
  category?: string | null;
  description?: string | null;
};

type Counts = {
  users: number | null;
  roles: number | null;
  permissions: number | null;
  loading: boolean;
  error: string | null;
};

type TabData<T> = {
  rows: T[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

function fmtTs(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
      <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[rgb(var(--zc-danger-rgb)/0.5)] text-[10px] font-bold">
        !
      </span>
      <div className="min-w-0">{message}</div>
    </div>
  );
}

export default function Page() {
  const [tab, setTab] = React.useState<"users" | "roles" | "permissions">("users");

  const [counts, setCounts] = React.useState<Counts>({
    users: null,
    roles: null,
    permissions: null,
    loading: true,
    error: null,
  });

  const [users, setUsers] = React.useState<TabData<UserRow>>({
    rows: [],
    loading: false,
    loaded: false,
    error: null,
  });
  const [roles, setRoles] = React.useState<TabData<Role>>({
    rows: [],
    loading: false,
    loaded: false,
    error: null,
  });
  const [perms, setPerms] = React.useState<TabData<Permission>>({
    rows: [],
    loading: false,
    loaded: false,
    error: null,
  });

  const [qUsers, setQUsers] = React.useState("");
  const [qRoles, setQRoles] = React.useState("");
  const [qPerms, setQPerms] = React.useState("");
  const [permPage, setPermPage] = React.useState(1);
  const permPageSize = 10;

  const loadCounts = React.useCallback(async () => {
    setCounts((c) => ({ ...c, loading: true, error: null }));
    try {
      const [u, r, p] = await Promise.all([
        apiFetch<any[]>("/api/iam/users"),
        apiFetch<any[]>("/api/iam/roles"),
        apiFetch<any[]>("/api/iam/permissions"),
      ]);

      setCounts({
        users: Array.isArray(u) ? u.length : 0,
        roles: Array.isArray(r) ? r.length : 0,
        permissions: Array.isArray(p) ? p.length : 0,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      setCounts({
        users: null,
        roles: null,
        permissions: null,
        loading: false,
        error: e?.message || "Unable to load access summary.",
      });
    }
  }, []);

  const loadUsers = React.useCallback(async () => {
    setUsers((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await apiFetch<UserRow[]>("/api/iam/users");
      const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) =>
        String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
      );
      setUsers({ rows: sorted, loading: false, loaded: true, error: null });
    } catch (e: any) {
      setUsers({ rows: [], loading: false, loaded: true, error: e?.message || "Unable to load users." });
    }
  }, []);

  const loadRoles = React.useCallback(async () => {
    setRoles((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await apiFetch<Role[]>("/api/iam/roles");
      const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) =>
        `${a.scope}:${a.roleName}`.localeCompare(`${b.scope}:${b.roleName}`)
      );
      setRoles({ rows: sorted, loading: false, loaded: true, error: null });
    } catch (e: any) {
      setRoles({ rows: [], loading: false, loaded: true, error: e?.message || "Unable to load roles." });
    }
  }, []);

  const loadPerms = React.useCallback(async () => {
    setPerms((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await apiFetch<Permission[]>("/api/iam/permissions");
      const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) =>
        `${a.category || ""}:${a.name}`.localeCompare(`${b.category || ""}:${b.name}`)
      );
      setPerms({ rows: sorted, loading: false, loaded: true, error: null });
    } catch (e: any) {
      setPerms({ rows: [], loading: false, loaded: true, error: e?.message || "Unable to load permissions." });
    }
  }, []);

  // initial summary
  React.useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  // lazy-load tab content
  React.useEffect(() => {
    if (tab === "users" && !users.loaded && !users.loading) void loadUsers();
    if (tab === "roles" && !roles.loaded && !roles.loading) void loadRoles();
    if (tab === "permissions" && !perms.loaded && !perms.loading) void loadPerms();
  }, [tab, users.loaded, users.loading, roles.loaded, roles.loading, perms.loaded, perms.loading, loadUsers, loadRoles, loadPerms]);

  const usersFiltered = React.useMemo(() => {
    const needle = qUsers.trim().toLowerCase();
    const rows = users.rows.slice(0, 50); // preview only (fast)
    if (!needle) return rows;
    return rows.filter((u) => `${u.name} ${u.email} ${u.roleCode} ${u.branchName || ""}`.toLowerCase().includes(needle));
  }, [users.rows, qUsers]);

  const rolesFiltered = React.useMemo(() => {
    const needle = qRoles.trim().toLowerCase();
    const rows = roles.rows.slice(0, 50);
    if (!needle) return rows;
    return rows.filter((r) => `${r.roleName} ${r.roleCode} ${r.scope}`.toLowerCase().includes(needle));
  }, [roles.rows, qRoles]);

  
  const permsFiltered = React.useMemo(() => {
    const needle = qPerms.trim().toLowerCase();
    const rows = perms.rows.slice(0, 200);
    if (!needle) return rows;
    return rows.filter((p) =>
      `${p.code} ${p.name} ${p.category || ""} ${p.description || ""}`.toLowerCase().includes(needle)
    );
  }, [perms.rows, qPerms]);

  const permTotalPages = React.useMemo(
    () => Math.max(1, Math.ceil(permsFiltered.length / permPageSize)),
    [permsFiltered.length]
  );

  const permPageRows = React.useMemo(() => {
    const start = (permPage - 1) * permPageSize;
    return permsFiltered.slice(start, start + permPageSize);
  }, [permsFiltered, permPage]);

  React.useEffect(() => {
    setPermPage(1);
  }, [qPerms]);

  React.useEffect(() => {
    if (permPage > permTotalPages) setPermPage(permTotalPages);
  }, [permPage, permTotalPages]);


  return (
    <AppShell title="Users & Access">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Lock className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Users & Access</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage users, roles, and permission grants with audit-ready governance.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={loadCounts} disabled={counts.loading}>
              <RefreshCw className={counts.loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh summary
            </Button>
            <Button asChild className="px-5 gap-2">
              <Link href="/access/audit">
                View audit
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Snapshot of the access catalog. Use the tabs below for previews or open the full pages.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Users</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                  {counts.loading ? "—" : counts.users ?? "—"}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Roles</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {counts.loading ? "—" : counts.roles ?? "—"}
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Permissions</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">
                  {counts.loading ? "—" : counts.permissions ?? "—"}
                </div>
              </div>
            </div>

            {counts.error ? <ErrorBanner message={counts.error} /> : null}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList
              className={cn(
                "h-10 w-full rounded-2xl border border-zc-border bg-zc-panel/20 p-1 sm:w-[560px]",
              )}
            >
              <TabsTrigger
                value="users"
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-3",
                  "data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                )}
              >
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger
                value="roles"
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-3",
                  "data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                )}
              >
                <Shield className="h-4 w-4" />
                Roles
              </TabsTrigger>
              <TabsTrigger
                value="permissions"
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-3",
                  "data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                )}
              >
                <Key className="h-4 w-4" />
                Permissions
              </TabsTrigger>
            </TabsList>
          </div>

          {/* USERS TAB CONTENT */}
          <TabsContent value="users" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-12">
              <Card className="lg:col-span-8">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <CardTitle>Users</CardTitle>
                      <CardDescription>Recently updated users (preview). Manage full list from Users page.</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zc-muted" />
                        <Input value={qUsers} onChange={(e) => setQUsers(e.target.value)} placeholder="Search users" className="w-[280px] pl-9" />
                      </div>
                      <Button asChild>
                        <Link href="/access/users">
                          Open Users
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {users.error ? (
                    <div className="mb-4 rounded-xl border border-zc-danger/25 bg-zc-danger/10 px-4 py-3 text-sm text-zc-danger">
                      {users.error}
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-zc-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Branch</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Security</TableHead>
                          <TableHead>Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.loading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-10 text-center text-sm text-zc-muted">
                              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                              Loading users…
                            </TableCell>
                          </TableRow>
                        ) : usersFiltered.length ? (
                          usersFiltered.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell>
                                <div className="font-medium">{u.name}</div>
                                <div className="font-mono text-xs text-zc-muted">{u.email}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{u.roleCode}</div>
                              </TableCell>
                              <TableCell className="text-sm">{u.branchName || <span className="text-zc-muted">—</span>}</TableCell>
                              <TableCell>
                                {u.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="destructive">Disabled</Badge>}
                              </TableCell>
                              <TableCell>
                                {u.mustChangePassword ? <Badge variant="warning">Must change</Badge> : <Badge variant="secondary">Normal</Badge>}
                              </TableCell>
                              <TableCell className="text-sm text-zc-muted">{fmtTs(u.updatedAt)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="py-10 text-center text-sm text-zc-muted">
                              No users found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                </CardContent>
              </Card>

              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Quick actions</CardTitle>
                  <CardDescription>Operational access workflows</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-between">
                    <Link href="/access/users">
                      Create / Edit users
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-between">
                    <Link href="/access/audit">
                      Review audit trails
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Separator className="my-2" />

                  <div className="space-y-2 text-sm">
                    <div className="font-semibold">Guidance</div>
                    <ul className="space-y-2 text-zc-muted">
                      <li className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zc-accent" />
                        Always keep “must change password” enabled for reset/new accounts.
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zc-accent" />
                        Use branch roles for branch staff; keep global roles limited.
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zc-accent" />
                        Disable users instead of deleting (preserves audit lineage).
                      </li>
                    </ul>
                  </div>

                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ROLES TAB CONTENT */}
          <TabsContent value="roles" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-12">
              <Card className="lg:col-span-8">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <CardTitle>Roles</CardTitle>
                      <CardDescription>Active role templates (preview). View full details from Roles page.</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zc-muted" />
                        <Input value={qRoles} onChange={(e) => setQRoles(e.target.value)} placeholder="Search roles" className="w-[280px] pl-9" />
                      </div>
                      <Button asChild>
                        <Link href="/access/roles">
                          Open Roles
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {roles.error ? (
                    <div className="mb-4 rounded-xl border border-zc-danger/25 bg-zc-danger/10 px-4 py-3 text-sm text-zc-danger">
                      {roles.error}
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-zc-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Scope</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Permissions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roles.loading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center text-sm text-zc-muted">
                              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                              Loading roles…
                            </TableCell>
                          </TableRow>
                        ) : rolesFiltered.length ? (
                          rolesFiltered.map((r) => (
                            <TableRow key={`${r.roleCode}:${r.version}`}>
                              <TableCell className="font-medium">{r.roleName}</TableCell>
                              <TableCell className="font-mono text-xs">{r.roleCode}</TableCell>
                              <TableCell>
                                {r.scope === "GLOBAL" ? <Badge variant="accent">Global</Badge> : <Badge variant="secondary">Branch</Badge>}
                              </TableCell>
                              <TableCell>{r.version}</TableCell>
                              <TableCell>{Array.isArray(r.permissions) ? r.permissions.length : 0}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center text-sm text-zc-muted">
                              No roles found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-zc-muted">
                      Showing{" "}
                      <span className="font-semibold tabular-nums text-zc-text">
                        {permsFiltered.length === 0 ? 0 : (permPage - 1) * permPageSize + 1}
                      </span>{" "}
                      -{" "}
                      <span className="font-semibold tabular-nums text-zc-text">
                        {Math.min(permPage * permPageSize, permsFiltered.length)}
                      </span>{" "}
                      of <span className="font-semibold tabular-nums text-zc-text">{permsFiltered.length}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        onClick={() => setPermPage((p) => Math.max(1, p - 1))}
                        disabled={permPage <= 1}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        onClick={() => setPermPage((p) => Math.min(permTotalPages, p + 1))}
                        disabled={permPage >= permTotalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>

                </CardContent>
              </Card>

              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Role design</CardTitle>
                  <CardDescription>Keep roles clean and auditable</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-between">
                    <Link href="/access/roles">
                      Review role permissions
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Separator className="my-2" />

                  <div className="rounded-xl border border-zc-border bg-zc-panel p-3 text-sm text-zc-muted">
                    Prefer <span className="font-medium text-zc-text">job-function</span> roles (Doctor/Nurse/Billing)
                    over per-person roles. Use <span className="font-medium text-zc-text">branch scope</span> for operational staff.
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel px-3 py-2">
                      <span className="text-sm font-medium">Global roles</span>
                      <Badge variant="accent">System-wide</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel px-3 py-2">
                      <span className="text-sm font-medium">Branch roles</span>
                      <Badge variant="secondary">Scoped</Badge>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PERMISSIONS TAB CONTENT */}
          <TabsContent value="permissions" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-12">
              <Card className="lg:col-span-8">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <CardTitle>Permissions</CardTitle>
                      <CardDescription>Fine-grained capabilities (preview). Map these into roles.</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zc-muted" />
                        <Input value={qPerms} onChange={(e) => setQPerms(e.target.value)} placeholder="Search permissions" className="w-[280px] pl-9" />
                      </div>
                      <Button asChild>
                        <Link href="/access/permissions">
                          Open Permissions
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {perms.error ? (
                    <div className="mb-4 rounded-xl border border-zc-danger/25 bg-zc-danger/10 px-4 py-3 text-sm text-zc-danger">
                      {perms.error}
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-zc-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[220px]">Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[180px]">Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {perms.loading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-10 text-center text-sm text-zc-muted">
                              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                              Loading permissions…
                            </TableCell>
                          </TableRow>
                        ) : permPageRows.length ? (
                          permPageRows.map((p) => (
                            <TableRow key={p.code}>
                              <TableCell className="font-mono text-xs">{p.code}</TableCell>
                              <TableCell className="text-sm">
                                <div className="font-medium">{p.name}</div>
                                <div className="text-xs text-zc-muted">{p.description ?? "—"}</div>
                              </TableCell>
                              <TableCell className="text-sm text-zc-muted">{p.category ?? "—"}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="py-10 text-center text-sm text-zc-muted">
                              No permissions found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                </CardContent>
              </Card>

              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Change safety</CardTitle>
                  <CardDescription>Prevent accidental privilege escalation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-between">
                    <Link href="/access/audit">
                      Audit impact
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Separator className="my-2" />

                  <div className="space-y-2 text-sm">
                    <div className="font-semibold">Guidance</div>
                    <ul className="space-y-2 text-zc-muted">
                      <li className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zc-accent" />
                        Prefer least-privilege: add permissions only when required.
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zc-accent" />
                        Keep permission codes stable; evolve behavior via role versions.
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zc-accent" />
                        Validate changes through audit trails for compliance.
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-zc-border bg-zc-panel p-3 text-sm text-zc-muted">
                    Tip: permissions should be <span className="font-medium text-zc-text">engineering-owned</span>, roles should be{" "}
                    <span className="font-medium text-zc-text">ops-owned</span>.
                  </div>

                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Kpi({
  icon,
  label,
  value,
  loading,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  loading: boolean;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-zc-border bg-zc-panel p-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zc-border bg-zc-card">
            {icon}
          </span>
          {label}
        </div>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          Summary
        </Badge>
      </div>

      <div className="mt-3 text-2xl font-semibold tracking-tight">
        {loading ? <span className="text-zc-muted">—</span> : value ?? <span className="text-zc-muted">—</span>}
      </div>

      <div className="mt-1 text-xs text-zc-muted">{hint}</div>
    </div>
  );
}
