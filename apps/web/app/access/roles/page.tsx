"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Copy, Eye, Loader2, RefreshCw, Search } from "lucide-react";

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

function safeCopy(text: string) {
  try {
    void navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

function formatScope(scope: Role["scope"]) {
  return scope === "GLOBAL" ? { label: "Global", variant: "accent" as const } : { label: "Branch", variant: "secondary" as const };
}

export default function AccessRolesPage() {
  const [q, setQ] = React.useState("");
  const [permQ, setPermQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [perms, setPerms] = React.useState<Permission[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const permMap = React.useMemo(() => {
    const m = new Map<string, Permission>();
    for (const p of perms) m.set(p.code, p);
    return m;
  }, [perms]);

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

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return roles;
    return roles.filter((r) => {
      const hay = `${r.roleName} ${r.roleCode} ${r.scope}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [roles, q]);

  return (
    <AppShell title="Users & Access · Roles">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Roles</CardTitle>
                <CardDescription>
                  View active role templates and their permission grants.
                </CardDescription>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-xc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search roles"
                    className="w-[280px] pl-9"
                  />
                </div>

                <Button variant="outline" onClick={load} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
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
                    <TableHead>Role</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-xc-muted">
                        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                        Loading roles...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length ? (
                    filtered.map((r) => {
                      const s = formatScope(r.scope);
                      return (
                        <TableRow key={`${r.roleCode}:${r.version}`}>
                          <TableCell className="font-medium">{r.roleName}</TableCell>
                          <TableCell className="font-mono text-xs">{r.roleCode}</TableCell>
                          <TableCell>
                            <Badge variant={s.variant}>{s.label}</Badge>
                          </TableCell>
                          <TableCell>{r.version}</TableCell>
                          <TableCell>{r.permissions.length}</TableCell>
                          <TableCell className="text-right">
                            <Dialog onOpenChange={(open) => { if (!open) setPermQ(""); }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                              </DialogTrigger>

                              <DialogContent className="sm:max-w-[860px]">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center justify-between gap-3">
                                    <span>
                                      {r.roleName} <span className="text-xc-muted">({r.roleCode})</span>
                                    </span>
                                  </DialogTitle>
                                  <DialogDescription>
                                    Scope: <span className="font-medium text-xc-text">{s.label}</span> · Version:{" "}
                                    <span className="font-medium text-xc-text">{r.version}</span>
                                  </DialogDescription>
                                </DialogHeader>

                                <Separator className="my-4" />

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="text-sm font-semibold">
                                    Permissions <span className="text-xc-muted">({r.permissions.length})</span>
                                  </div>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <div className="relative">
                                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-xc-muted" />
                                      <Input
                                        value={permQ}
                                        onChange={(e) => setPermQ(e.target.value)}
                                        placeholder="Search permissions"
                                        className="w-[280px] pl-9"
                                      />
                                    </div>
                                    <Button variant="outline" onClick={() => safeCopy(r.permissions.join("\n"))}>
                                      <Copy className="h-4 w-4" />
                                      Copy codes
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-xc-border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[220px]">Code</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="w-[180px]">Category</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {r.permissions
                                        .filter((code) => {
                                          const needle = permQ.trim().toLowerCase();
                                          if (!needle) return true;
                                          const p = permMap.get(code);
                                          const hay = `${code} ${p?.name ?? ""} ${p?.category ?? ""}`.toLowerCase();
                                          return hay.includes(needle);
                                        })
                                        .map((code) => {
                                          const p = permMap.get(code);
                                          return (
                                            <TableRow key={code}>
                                              <TableCell className="font-mono text-xs">{code}</TableCell>
                                              <TableCell className="text-sm">
                                                <div className="font-medium">{p?.name ?? "—"}</div>
                                                <div className="text-xs text-xc-muted">{p?.description ?? "—"}</div>
                                              </TableCell>
                                              <TableCell className="text-sm text-xc-muted">{p?.category ?? "—"}</TableCell>
                                            </TableRow>
                                          );
                                        })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-xc-muted">
                        No roles found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
