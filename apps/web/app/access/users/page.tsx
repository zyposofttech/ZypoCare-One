"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore, hasPerm, getRoleCode } from "@/lib/auth/store";

import { IconChevronRight, IconPlus, IconSearch } from "@/components/icons";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users2,
} from "lucide-react";

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

type BranchLite = {
  id: string;
  code: string;
  name: string;
  city?: string;
};

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

function tonePill(kind: "active" | "inactive" | "mcp") {
  if (kind === "active")
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200";
  if (kind === "inactive")
    return "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/25 dark:text-zinc-200";
  return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200";
}

function StatusPill({ label, kind }: { label: string; kind: "active" | "inactive" | "mcp" }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", tonePill(kind))}>
      {label}
    </span>
  );
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
      <AlertTriangle className="mt-0.5 h-4 w-4" />
      <div className="min-w-0">{message}</div>
    </div>
  );
}

export default function UsersPage() {
  const { toast } = useToast();
  const authUser = useAuthStore((s) => s.user);

  // ✅ Treat permissions as "ready" only after /api/iam/me has hydrated them.
  // Fixes: after login, this page used to run refresh() once with no permissions → empty lists,
  // and never re-run until a full browser refresh.
  const permsReady = Array.isArray(authUser?.permissions);

  // ✅ Permission-first gating
  const canRead = hasPerm(authUser, "IAM_USER_READ");
  const canCreate = hasPerm(authUser, "IAM_USER_CREATE");
  const canUpdate = hasPerm(authUser, "IAM_USER_UPDATE");
  const canReset = hasPerm(authUser, "IAM_USER_RESET_PASSWORD");

  const canRoleRead = hasPerm(authUser, "IAM_ROLE_READ");
  const canBranchRead = hasPerm(authUser, "BRANCH_READ");

  const currentRoleCode = getRoleCode(authUser);
  const isSuperAdmin = currentRoleCode === "SUPER_ADMIN"; // only used to hide SUPER_ADMIN option in dropdown (non-superadmins)

  const [q, setQ] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState<string>("ALL");
  const [loading, setLoading] = React.useState(false);

  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [branches, setBranches] = React.useState<BranchLite[]>([]);

  const [err, setErr] = React.useState<string | null>(null);

  // Create drawer
  const [createOpen, setCreateOpen] = React.useState(false);
  const [busyCreate, setBusyCreate] = React.useState(false);
  const [form, setForm] = React.useState({
    email: "",
    name: "",
    roleCode: "BRANCH_ADMIN",
    branchId: "",
  });

  // Details/Edit drawer
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsMode, setDetailsMode] = React.useState<"view" | "edit">("view");
  const [detailsUser, setDetailsUser] = React.useState<UserRow | null>(null);
  const [detailsForm, setDetailsForm] = React.useState({
    name: "",
    email: "",
    roleCode: "",
    branchId: "",
  });
  const [busyDetails, setBusyDetails] = React.useState(false);

  // Password dialog (create + reset)
  const [pwOpen, setPwOpen] = React.useState(false);
  const [pwCtx, setPwCtx] = React.useState<{ title: string; email: string; password: string } | null>(null);

  // Row action busy
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);

  const roleOptions = React.useMemo(() => {
    const sorted = [...(roles ?? [])].sort((a, b) => (a.roleCode || "").localeCompare(b.roleCode || ""));
    if (isSuperAdmin) return sorted;
    return sorted.filter((r) => r.roleCode !== "SUPER_ADMIN");
  }, [roles, isSuperAdmin]);

  const selectedRole = React.useMemo(() => roles.find((r) => r.roleCode === form.roleCode) || null, [roles, form.roleCode]);
  const needsBranch = selectedRole?.scope === "BRANCH" || form.roleCode.toUpperCase().includes("BRANCH");

  const selectedDetailsRole = React.useMemo(
    () => roles.find((r) => r.roleCode === detailsForm.roleCode) || null,
    [roles, detailsForm.roleCode],
  );
  const detailsNeedsBranch =
    selectedDetailsRole?.scope === "BRANCH" || detailsForm.roleCode.toUpperCase().includes("BRANCH");

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    const bySearch = !s
      ? users
      : (users ?? []).filter((u) => {
          const hay = `${u.name} ${u.email} ${u.roleCode} ${u.branchName ?? ""} ${u.branchId ?? ""}`.toLowerCase();
          return hay.includes(s);
        });

    if (branchFilter === "ALL") return bySearch;
    if (branchFilter === "CORPORATE") return bySearch.filter((u) => !u.branchId);
    return bySearch.filter((u) => u.branchId === branchFilter);
  }, [users, q, branchFilter]);

  const activeCount = React.useMemo(() => filtered.filter((u) => u.isActive).length, [filtered]);
  const mcpCount = React.useMemo(() => filtered.filter((u) => u.mustChangePassword).length, [filtered]);

  async function refresh(showToast = false) {
    // ✅ Do nothing until /api/iam/me has hydrated permissions.
    // Prevents empty first paint (no perms yet) from overwriting state and never recovering.
    if (!permsReady) return;

    setErr(null);
    setLoading(true);

    const issues: string[] = [];

    try {
      // Don’t call APIs user can’t access (enterprise-grade UX)
      const rolesPromise = canRoleRead
        ? apiFetch<Role[]>("/api/iam/roles").catch((e: any) => {
            issues.push(e?.message || "Failed to load roles.");
            return [] as Role[];
          })
        : Promise.resolve([] as Role[]);

      const usersPromise = canRead
        ? apiFetch<UserRow[]>("/api/iam/users").catch((e: any) => {
            issues.push(e?.message || "Failed to load users.");
            return [] as UserRow[];
          })
        : Promise.resolve([] as UserRow[]);

      const branchesPromise = canBranchRead
        ? apiFetch<BranchLite[]>("/api/iam/branches").catch((e: any) => {
            issues.push(e?.message || "Failed to load branches.");
            return [] as BranchLite[];
          })
        : Promise.resolve([] as BranchLite[]);

      const [r, u, b] = await Promise.all([rolesPromise, usersPromise, branchesPromise]);

      const rolesSorted = [...(r ?? [])].sort((a, b) => (a.roleCode || "").localeCompare(b.roleCode || ""));
      const usersSorted = [...(u ?? [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      const branchesSorted = [...(b ?? [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      setRoles(rolesSorted);
      setUsers(usersSorted);
      setBranches(branchesSorted);

      if (issues.length) {
        setErr(issues[0]);
        toast({ variant: "destructive", title: "Partial load", description: issues[0] });
      }

      if (showToast && issues.length === 0) {
        toast({
          title: "Users refreshed",
          description: `Loaded ${usersSorted.length} users and ${rolesSorted.length} roles.`,
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load users";
      setErr(msg);
      toast({ variant: "destructive", title: "Refresh failed", description: msg });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!permsReady) return;
    void refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permsReady, canRead, canRoleRead, canBranchRead]);

  function openDetails(u: UserRow) {
    setErr(null);
    setDetailsMode("view");
    setDetailsUser(u);
    setDetailsForm({
      name: u.name ?? "",
      email: u.email ?? "",
      roleCode: u.roleCode ?? "",
      branchId: u.branchId ?? "",
    });
    setDetailsOpen(true);
  }

  function openEdit(u: UserRow) {
    setErr(null);
    setDetailsMode("edit");
    setDetailsUser(u);
    setDetailsForm({
      name: u.name ?? "",
      email: u.email ?? "",
      roleCode: u.roleCode ?? "",
      branchId: u.branchId ?? "",
    });
    setDetailsOpen(true);
  }

  async function onCreate() {
    if (!canCreate) {
      setErr("You don't have permission to create users.");
      return;
    }
    if (!canRoleRead) {
      setErr("Missing IAM_ROLE_READ: role list is required to create users from UI.");
      return;
    }
    if (needsBranch && !canBranchRead) {
      setErr("Missing BRANCH_READ: branch list is required for BRANCH-scoped roles.");
      return;
    }

    setErr(null);

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const roleCode = form.roleCode.trim();
    const branchId = form.branchId.trim();

    if (!name) return setErr("Full name is required");
    if (!email || !isEmail(email)) return setErr("A valid email is required");
    if (!roleCode) return setErr("Role is required");
    if (needsBranch && !branchId) return setErr("Branch is required for BRANCH-scoped roles");

    setBusyCreate(true);
    try {
      const payload: any = { email, name, roleCode };
      if (needsBranch) payload.branchId = branchId;

      const res = await apiFetch<{ userId: string; email: string; tempPassword?: string }>("/api/iam/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast({
        title: "User created",
        description: `Created ${res.email}.`,
        variant: "success" as any,
      });

      setCreateOpen(false);
      setForm({ email: "", name: "", roleCode: "BRANCH_ADMIN", branchId: "" });

      if (res?.tempPassword) {
        setPwCtx({ title: "Temporary Password", email: res.email, password: res.tempPassword });
        setPwOpen(true);
      }

      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Create failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Create failed", description: msg });
    } finally {
      setBusyCreate(false);
    }
  }

  async function onUpdateUser() {
    if (!canUpdate) {
      setErr("You don't have permission to update users.");
      return;
    }
    if (!detailsUser) return;
    if (!canRoleRead) {
      setErr("Missing IAM_ROLE_READ: role list is required to update role from UI.");
      return;
    }
    if (detailsNeedsBranch && !canBranchRead) {
      setErr("Missing BRANCH_READ: branch list is required for BRANCH-scoped roles.");
      return;
    }

    setErr(null);
    const name = detailsForm.name.trim();
    const roleCode = detailsForm.roleCode.trim();
    const branchId = detailsForm.branchId.trim();

    if (!name) return setErr("Full name is required");
    if (!roleCode) return setErr("Role is required");
    if (detailsNeedsBranch && !branchId) return setErr("Branch is required for BRANCH-scoped roles");

    setBusyDetails(true);
    try {
      const payload: any = { name, roleCode, branchId: detailsNeedsBranch ? branchId : null };

      await apiFetch(`/api/iam/users/${detailsUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      toast({
        title: "User updated",
        description: `Updated ${detailsUser.email}.`,
        variant: "success" as any,
      });

      setDetailsOpen(false);
      setDetailsUser(null);
      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Update failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Update failed", description: msg });
    } finally {
      setBusyDetails(false);
    }
  }

  async function toggleActive(u: UserRow) {
    if (!canUpdate) return;
    setErr(null);
    setBusyUserId(u.id);
    try {
      await apiFetch(`/api/iam/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !u.isActive }),
      });

      toast({
        title: u.isActive ? "User deactivated" : "User activated",
        description: `${u.email} is now ${u.isActive ? "inactive" : "active"}.`,
        variant: "success" as any,
      });

      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Update failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Update failed", description: msg });
    } finally {
      setBusyUserId(null);
    }
  }

  async function resetPassword(u: UserRow) {
    if (!canReset) return;
    setErr(null);
    setBusyUserId(u.id);
    try {
      const res = await apiFetch<{ ok: true; tempPassword?: string }>(`/api/iam/users/${u.id}/reset-password`, {
        method: "POST",
      });

      toast({
        title: "Password reset requested",
        description: res?.tempPassword ? `Temporary password generated for ${u.email}.` : `Reset completed for ${u.email}.`,
        variant: "success" as any,
      });

      if (res?.tempPassword) {
        setPwCtx({ title: "Temporary Password (Reset)", email: u.email, password: res.tempPassword });
        setPwOpen(true);
      }

      await refresh(false);
    } catch (e: any) {
      const msg = e?.message || "Reset failed";
      setErr(msg);
      toast({ variant: "destructive", title: "Reset failed", description: msg });
    } finally {
      setBusyUserId(null);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Copied to clipboard." });
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Clipboard permission blocked by browser." });
    }
  }

  return (
    <AppShell title="Users">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Users2 className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">User Management</div>
              <div className="mt-1 text-sm text-zc-muted">
                Create users, assign roles, and manage access. Corporate can view; privileged admins can create and edit.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refresh(true)} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            {canCreate ? (
              <Button
                variant="primary"
                className="px-5 gap-2"
                onClick={() => {
                  setErr(null);
                  setForm((s) => ({ ...s, roleCode: s.roleCode || "BRANCH_ADMIN", branchId: s.branchId || "" }));
                  setCreateOpen(true);
                }}
              >
                <IconPlus className="h-4 w-4" />
                Create User
              </Button>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Search and manage users across branches. BRANCH-scoped roles require selecting a branch.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Users (filtered)</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{filtered.length}</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Active</div>
                <div className="mt-1 text-lg font-bold text-emerald-800 dark:text-emerald-200">{activeCount}</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-800 dark:text-amber-300">Must Change Password</div>
                <div className="mt-1 text-lg font-bold text-amber-900 dark:text-amber-200">{mcpCount}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-md">
                  <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    placeholder="Search by name, email, role, branch…"
                    className="pl-10"
                  />
                </div>

                <div className="w-full lg:w-[320px]">
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card text-sm">
                      <SelectValue placeholder="Filter by branch..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px] overflow-y-auto">
                      <SelectItem value="ALL">All branches</SelectItem>
                      <SelectItem value="CORPORATE">Corporate (no branch)</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-zc-text">{users.length}</span> users
              </div>
            </div>

            {err ? <ErrorBanner message={err} /> : null}

            {!canRead ? (
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                You may not have permission to view users. Request <span className="font-semibold">IAM_USER_READ</span>.
              </div>
            ) : null}

            {canRead && !canRoleRead ? (
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                Role list is not accessible. Request <span className="font-semibold">IAM_ROLE_READ</span> to assign/update roles from UI.
              </div>
            ) : null}

            {canRead && needsBranch && !canBranchRead ? (
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                Branch list is not accessible. Request <span className="font-semibold">BRANCH_READ</span> to assign BRANCH-scoped users.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Registry */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Users</CardTitle>
            <CardDescription className="text-sm">
              Open details to review. Edit/toggle requires IAM_USER_UPDATE. Reset requires IAM_USER_RESET_PASSWORD.
            </CardDescription>
          </CardHeader>
          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Role</th>
                  <th className="px-4 py-3 text-left font-semibold">Branch</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zc-muted">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      <div className="mt-2">Loading…</div>
                    </td>
                  </tr>
                ) : !canRead ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zc-muted">
                      No access to user registry.
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zc-muted">
                      No users match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const rowBusy = busyUserId === u.id;
                    return (
                      <tr key={u.id} className="border-t border-zc-border/60">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zc-text">{u.name}</div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-zc-text">{u.email}</span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-lg border border-zc-border bg-zc-accent/20 px-2.5 py-1 font-mono text-xs text-zc-text">
                            {u.roleCode}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-zc-muted">
                          {u.branchName || (u.branchId ? <span className="font-mono text-xs">{u.branchId}</span> : "-")}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {u.isActive ? <StatusPill label="Active" kind="active" /> : <StatusPill label="Inactive" kind="inactive" />}
                            {u.mustChangePassword ? <StatusPill label="MCP" kind="mcp" /> : null}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="success"
                              size="icon"
                              onClick={() => openDetails(u)}
                              title="View details"
                              aria-label="View details"
                            >
                              <IconChevronRight className="h-4 w-4" />
                            </Button>

                            {canUpdate ? (
                              <Button
                                variant="info"
                                size="icon"
                                onClick={() => openEdit(u)}
                                title="Edit user"
                                aria-label="Edit user"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : null}

                            <Button
                              variant={u.isActive ? "secondary" : "success"}
                              size="icon"
                              disabled={rowBusy || !canUpdate}
                              onClick={() => void toggleActive(u)}
                              title={u.isActive ? "Deactivate user" : "Activate user"}
                              aria-label={u.isActive ? "Deactivate user" : "Activate user"}
                            >
                              {rowBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : u.isActive ? (
                                <ToggleLeft className="h-4 w-4" />
                              ) : (
                                <ToggleRight className="h-4 w-4" />
                              )}
                            </Button>

                            {canReset ? (
                              <Button
                                variant="warning"
                                size="icon"
                                disabled={rowBusy}
                                onClick={() => void resetPassword(u)}
                                title="Reset password"
                                aria-label="Reset password"
                              >
                                {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ---------------- Create User Drawer ---------------- */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          if (!v) {
            setErr(null);
            setBusyCreate(false);
            setCreateOpen(false);
          } else {
            setCreateOpen(true);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Create User
            </DialogTitle>
            <DialogDescription>Create a user account and assign the correct role. A temporary password may be generated.</DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {err ? <ErrorBanner message={err} /> : null}

          <div className="grid gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Dr. Ananya Sharma"
                  disabled={!canCreate || busyCreate}
                />
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="e.g. ananya@hospital.com"
                  disabled={!canCreate || busyCreate}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={form.roleCode}
                onValueChange={(next) => {
                  const nextRole = roles.find((r) => r.roleCode === next);
                  setForm((s) => ({
                    ...s,
                    roleCode: next,
                    branchId: nextRole?.scope === "GLOBAL" ? "" : s.branchId,
                  }));
                }}
                disabled={!canCreate || busyCreate || !canRoleRead}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card text-sm">
                  <SelectValue placeholder={canRoleRead ? "Select role..." : "Missing IAM_ROLE_READ"} />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {roleOptions.map((r) => (
                    <SelectItem key={r.roleCode} value={r.roleCode}>
                      {r.roleCode} (v{r.version}) · {r.scope}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedRole ? (
                <div className="flex items-center gap-2 text-[11px] text-zc-muted">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>
                    {selectedRole.roleName} · <span className="font-mono">{selectedRole.scope}</span> scope
                  </span>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select
                value={form.branchId}
                onValueChange={(next) => setForm((s) => ({ ...s, branchId: next }))}
                disabled={!canCreate || busyCreate || !needsBranch || !canBranchRead}
              >
                <SelectTrigger
                  className={cn(
                    "h-11 w-full rounded-xl border-zc-border bg-zc-card text-sm",
                    needsBranch && !form.branchId ? "border-amber-300/70 dark:border-amber-700/60" : "",
                  )}
                >
                  <SelectValue
                    placeholder={
                      !needsBranch
                        ? "Branch not required for GLOBAL roles"
                        : canBranchRead
                          ? "Select branch (required)"
                          : "Missing BRANCH_READ"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zc-muted">
                {needsBranch ? "Required for BRANCH-scoped roles." : "Only BRANCH roles can have a branch."}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busyCreate}>
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={() => void onCreate()}
              disabled={!canCreate || busyCreate || !canRoleRead || (needsBranch && !canBranchRead)}
              className="gap-2"
            >
              {busyCreate ? <Loader2 className="h-4 w-4 animate-spin" /> : <IconPlus className="h-4 w-4" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Details/Edit Drawer ---------------- */}
      <Dialog
        open={detailsOpen}
        onOpenChange={(v) => {
          if (!v) {
            setDetailsOpen(false);
            setDetailsUser(null);
            setBusyDetails(false);
          } else {
            setDetailsOpen(true);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Users2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {detailsMode === "edit" ? "Edit User" : "User Details"}
            </DialogTitle>
            <DialogDescription>Review account details and update role assignments as needed.</DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {err ? <ErrorBanner message={err} /> : null}

          {detailsUser ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zc-muted">
              {detailsUser.isActive ? <StatusPill label="Active" kind="active" /> : <StatusPill label="Inactive" kind="inactive" />}
              {detailsUser.mustChangePassword ? <StatusPill label="MCP" kind="mcp" /> : null}
            </div>
          ) : null}

          <div className="grid gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <Input
                  value={detailsForm.name}
                  onChange={(e) => setDetailsForm((s) => ({ ...s, name: e.target.value }))}
                  disabled={detailsMode !== "edit" || !canUpdate || busyDetails}
                />
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={detailsForm.email} readOnly disabled />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={detailsForm.roleCode}
                onValueChange={(next) => {
                  const nextRole = roles.find((r) => r.roleCode === next);
                  setDetailsForm((s) => ({
                    ...s,
                    roleCode: next,
                    branchId: nextRole?.scope === "GLOBAL" ? "" : s.branchId,
                  }));
                }}
                disabled={detailsMode !== "edit" || !canUpdate || busyDetails || !canRoleRead}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card text-sm">
                  <SelectValue placeholder={canRoleRead ? "Select role..." : "Missing IAM_ROLE_READ"} />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {roleOptions.map((r) => (
                    <SelectItem key={r.roleCode} value={r.roleCode}>
                      {r.roleCode} (v{r.version}) · {r.scope}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedDetailsRole ? (
                <div className="flex items-center gap-2 text-[11px] text-zc-muted">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>
                    {selectedDetailsRole.roleName} · <span className="font-mono">{selectedDetailsRole.scope}</span> scope
                  </span>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select
                value={detailsForm.branchId}
                onValueChange={(next) => setDetailsForm((s) => ({ ...s, branchId: next }))}
                disabled={detailsMode !== "edit" || !canUpdate || busyDetails || !detailsNeedsBranch || !canBranchRead}
              >
                <SelectTrigger
                  className={cn(
                    "h-11 w-full rounded-xl border-zc-border bg-zc-card text-sm",
                    detailsNeedsBranch && !detailsForm.branchId ? "border-amber-300/70 dark:border-amber-700/60" : "",
                  )}
                >
                  <SelectValue
                    placeholder={
                      !detailsNeedsBranch
                        ? "Branch not required for GLOBAL roles"
                        : canBranchRead
                          ? "Select branch (required)"
                          : "Missing BRANCH_READ"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zc-muted">
                {detailsNeedsBranch ? "Required for BRANCH-scoped roles." : "Only BRANCH roles can have a branch."}
              </p>
            </div>

            {detailsMode !== "edit" ? (
              <div className="rounded-xl border border-zc-border bg-zc-panel/20 p-3 text-xs text-zc-muted">
                Tip: Click <span className="font-semibold">Edit</span> from the table to modify user attributes.
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDetailsOpen(false);
                setDetailsUser(null);
              }}
              disabled={busyDetails}
            >
              Close
            </Button>

            {detailsMode === "edit" ? (
              <Button
                variant="primary"
                onClick={() => void onUpdateUser()}
                disabled={!canUpdate || busyDetails || !canRoleRead || (detailsNeedsBranch && !canBranchRead)}
                className="gap-2"
              >
                {busyDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save Changes
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temp Password Dialog */}
      <Dialog
        open={pwOpen}
        onOpenChange={(v) => {
          if (!v) {
            setPwOpen(false);
            setPwCtx(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <KeyRound className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              {pwCtx?.title || "Temporary Password"}
            </DialogTitle>
            <DialogDescription>
              {pwCtx?.email ? (
                <>
                  For <span className="font-mono text-xs">{pwCtx.email}</span>. Copy and share securely.
                </>
              ) : (
                "Copy and share securely."
              )}
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-3" />

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-200">Temporary password</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0 truncate font-mono text-sm font-semibold text-zc-text">{pwCtx?.password || "-"}</div>
              <Button variant="outline" className="gap-2" onClick={() => pwCtx?.password && void copyToClipboard(pwCtx.password)}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="primary" onClick={() => setPwOpen(false)} className="px-6">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
