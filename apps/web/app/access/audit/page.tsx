"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Loader2, RefreshCw } from "lucide-react";

type AuditEvent = {
  id: string;
  createdAt: string;
  branchId: string | null;
  branchName: string | null;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: any;
};

type UserLite = {
  id: string;
  email: string;
  name: string;
};

type BranchLite = {
  id: string;
  code: string;
  name: string;
  city?: string | null;
};


function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function compactMeta(meta: any) {
  if (!meta) return "—";
  try {
    const s = JSON.stringify(meta);
    return s.length > 140 ? `${s.slice(0, 140)}…` : s;
  } catch {
    return "—";
  }
}

function getBranchLabel(e: AuditEvent) {
  if (e.branchName) return e.branchName;
  if (e.branchId) return "Unknown branch";
  return "Corporate";
}

function getActorLabel(e: AuditEvent) {
  return e.actorEmail || e.actorName || "Unknown actor";
}

function getActorSubLabel(e: AuditEvent) {
  if (e.actorEmail && e.actorName) return e.actorName;
  return "-";
}

function actionBadgeClass(action: string) {
  const a = String(action || "").toLowerCase();
  if (a.includes("create") || a.includes("add")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (a.includes("update") || a.includes("edit")) return "bg-sky-100 text-sky-700 border-sky-200";
  if (a.includes("delete") || a.includes("remove")) return "bg-rose-100 text-rose-700 border-rose-200";
  if (a.includes("reset") || a.includes("password")) return "bg-amber-100 text-amber-800 border-amber-200";
  if (a.includes("sync") || a.includes("import")) return "bg-violet-100 text-violet-700 border-violet-200";
  return "bg-zc-panel/30 text-zc-text border-zc-border";
}



export default function AccessAuditPage() {
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<AuditEvent[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [activeCategory, setActiveCategory] = React.useState("All");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [entity, setEntity] = React.useState("ALL");
  const [entitySearch, setEntitySearch] = React.useState("");
  const [entityId, setEntityId] = React.useState("");
  const [actorUserId, setActorUserId] = React.useState("");
  const [action, setAction] = React.useState("ALL");
  const [actionSearch, setActionSearch] = React.useState("");
  const [take, setTake] = React.useState("100");

  const [openView, setOpenView] = React.useState(false);
  const [selected, setSelected] = React.useState<AuditEvent | null>(null);

  const load = React.useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (entity.trim() && entity !== "ALL") qs.set("entity", entity.trim());
      if (entityId.trim()) qs.set("entityId", entityId.trim());
      if (actorUserId.trim()) qs.set("actorUserId", actorUserId.trim());
      if (action.trim() && action !== "ALL") qs.set("action", action.trim());
      if (take.trim()) qs.set("take", take.trim());

      const [data, users, branches] = await Promise.all([
        apiFetch<AuditEvent[]>(`/api/iam/audit?${qs.toString()}`),
        apiFetch<UserLite[]>(`/api/iam/users`).catch(() => [] as UserLite[]),
        apiFetch<BranchLite[]>(`/api/branches`).catch(() => [] as BranchLite[]),
      ]);

      const userMap = new Map(users.map((u) => [u.id, u]));
      const branchMap = new Map(branches.map((b) => [b.id, b]));

      const enriched = (data || []).map((e) => {
        const user = e.actorUserId ? userMap.get(e.actorUserId) : undefined;
        const branch = e.branchId ? branchMap.get(e.branchId) : undefined;
        const branchLabel = branch
          ? `${branch.name}${branch.code ? ` (${branch.code})` : ""}`
          : null;
        return {
          ...e,
          actorEmail: e.actorEmail || user?.email || null,
          actorName: e.actorName || user?.name || null,
          branchName: e.branchName || branchLabel || null,
        };
      });

      setRows(enriched);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Unable to load audit events.");
    } finally {
      setLoading(false);
    }
  }, [entity, entityId, actorUserId, action, take]);

  React.useEffect(() => {
    void load();
  }, [load]);


  const entityOptions = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const val = String(r.entity || "").trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const actionOptions = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const val = String(r.action || "").trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const cat = String(r.entity || "").trim();
      if (cat) set.add(cat);
    });
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = React.useMemo(() => {
    if (activeCategory === "All") return rows;
    return rows.filter((r) => r.entity === activeCategory);
  }, [rows, activeCategory]);

  const totalPages = React.useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  React.useEffect(() => {
    if (!categories.includes(activeCategory)) setActiveCategory("All");
  }, [categories, activeCategory]);

  React.useEffect(() => {
    setPage(1);
  }, [activeCategory, pageSize, rows.length]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function view(e: AuditEvent) {
    setSelected(e);
    setOpenView(true);
  }

  return (
    <AppShell title="Users & Access · Audit Trails">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Audit Trails</CardTitle>
                <CardDescription>
                  Immutable ledger of IAM actions: provisioning, role changes, password resets, deactivation and more.
                </CardDescription>
              </div>

              <Button variant="outline" onClick={load} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="grid gap-3 md:grid-cols-5">
              <div className="grid gap-2">
                <Label className="text-xs text-zc-muted">Entity</Label>
                <Select value={entity} onValueChange={setEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="All entities" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    <div className="px-2 pb-2">
                      <Input value={entitySearch} onChange={(e) => setEntitySearch(e.target.value)} placeholder="Search entities..." />
                    </div>
                    <SelectItem value="ALL">All entities</SelectItem>
                    {entityOptions
                      .filter((v) => v.toLowerCase().includes(entitySearch.trim().toLowerCase()))
                      .map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-zc-muted">Entity ID</Label>
                <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="uuid" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-zc-muted">Actor User ID</Label>
                <Input value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} placeholder="uuid" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-zc-muted">Action</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    <div className="px-2 pb-2">
                      <Input value={actionSearch} onChange={(e) => setActionSearch(e.target.value)} placeholder="Search actions..." />
                    </div>
                    <SelectItem value="ALL">All actions</SelectItem>
                    {actionOptions
                      .filter((v) => v.toLowerCase().includes(actionSearch.trim().toLowerCase()))
                      .map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-zc-muted">Rows</Label>
                <Select value={take} onValueChange={setTake}>
                  <SelectTrigger>
                    <SelectValue placeholder="Take" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="150">150</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button onClick={load} disabled={loading}>
                Apply filters
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {err ? (
              <div className="mb-4 rounded-xl border border-zc-danger/30 bg-zc-danger/10 px-4 py-3 text-sm text-zc-danger">
                {err}
              </div>
            ) : null}

            <div className="rounded-xl border border-zc-border">

              <div className="px-4 pt-4">
                <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full space-y-3">
                  <TabsList className="h-auto w-full flex-wrap rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                    {categories.map((cat) => (
                      <TabsTrigger
                        key={cat}
                        value={cat}
                        className="rounded-xl px-3 py-1.5 text-xs data-[state=active]:bg-zc-accent data-[state=active]:text-white"
                      >
                        {cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value={activeCategory} className="mt-0" />
                </Tabs>
              </div>

              <Separator className="my-4" />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-zc-muted">
                        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                        Loading audit events...
                      </TableCell>
                    </TableRow>
                  ) : pageRows.length ? (
                    pageRows.map((e) => (
                      <TableRow
                        key={e.id}
                        className="cursor-pointer"
                        onClick={() => view(e)}
                      >
                        <TableCell className="whitespace-nowrap text-sm">{fmt(e.createdAt)}</TableCell>
                        <TableCell className="text-sm">{getBranchLabel(e)}</TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{getActorLabel(e)}</div>
                          <div className="font-mono text-xs text-zc-muted">{getActorSubLabel(e)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-mono text-xs border", actionBadgeClass(e.action))}>
                            {e.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{e.entity}</div>
                          <div className="font-mono text-xs text-zc-muted">{e.entityId || "—"}</div>
                        </TableCell>
                        <TableCell className="max-w-[420px] truncate font-mono text-xs text-zc-muted">
                          {compactMeta(e.meta)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(evt) => {
                              evt.stopPropagation();
                              view(e);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            View Activity
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-zc-muted">
                        No audit events found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-zc-muted">
                Showing <span className="font-semibold tabular-nums text-zc-text">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> - {" "}
                <span className="font-semibold tabular-nums text-zc-text">{Math.min(page * pageSize, filtered.length)}</span> of {" "}
                <span className="font-semibold tabular-nums text-zc-text">{filtered.length}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zc-muted">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[90px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Prev
                </Button>
                <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* View dialog */}
        <Dialog open={openView} onOpenChange={(v) => { setOpenView(v); if (!v) setSelected(null); }}>
          <DialogContent className="sm:max-w-[880px]">
            <DialogHeader>
              <DialogTitle>Audit event</DialogTitle>
              <DialogDescription>Full metadata for this action (immutable).</DialogDescription>
            </DialogHeader>

            <Separator className="my-4" />

            {selected ? (
              <>
                <div className="grid gap-2 text-sm">
                  <div>
                    <span className="text-zc-muted">Time:</span>{" "}
                    <span className="font-medium">{fmt(selected.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-zc-muted">Branch:</span>{" "}
                    <span className="font-medium">{getBranchLabel(selected)}</span>
                  </div>
                  <div>
                    <span className="text-zc-muted">Actor:</span>{" "}
                    <span className="font-medium">{getActorLabel(selected)}</span>{" "}
                    <span className="text-zc-muted">({getActorSubLabel(selected)})</span>
                  </div>
                  <div>
                    <span className="text-zc-muted">Action:</span>{" "}
                    <span className="font-mono">{selected.action}</span>
                  </div>
                  <div>
                    <span className="text-zc-muted">Entity:</span>{" "}
                    <span className="font-medium">{selected.entity}</span>{" "}
                    <span className="text-zc-muted">({selected.entityId || "—"})</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-zc-border bg-zc-panel p-3">
                  <div className="text-sm font-semibold">Meta</div>
                  <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg border border-zc-border bg-zc-card p-3 text-xs">
{JSON.stringify(selected.meta ?? null, null, 2)}
                  </pre>
                </div>
              </>
            ) : null}

            <DialogFooter>
              <Button onClick={() => setOpenView(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
