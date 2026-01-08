"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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

export default function AccessAuditPage() {
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<AuditEvent[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [entity, setEntity] = React.useState("");
  const [entityId, setEntityId] = React.useState("");
  const [actorUserId, setActorUserId] = React.useState("");
  const [action, setAction] = React.useState("");
  const [take, setTake] = React.useState("100");

  const [openView, setOpenView] = React.useState(false);
  const [selected, setSelected] = React.useState<AuditEvent | null>(null);

  const load = React.useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (entity.trim()) qs.set("entity", entity.trim());
      if (entityId.trim()) qs.set("entityId", entityId.trim());
      if (actorUserId.trim()) qs.set("actorUserId", actorUserId.trim());
      if (action.trim()) qs.set("action", action.trim());
      if (take.trim()) qs.set("take", take.trim());

      const data = await apiFetch<AuditEvent[]>(`/api/iam/audit?${qs.toString()}`);
      setRows(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Unable to load audit events.");
    } finally {
      setLoading(false);
    }
  }, [entity, entityId, actorUserId, action, take]);

  React.useEffect(() => {
    void load();
  }, [load]);

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
                <Label className="text-xs text-xc-muted">Entity</Label>
                <Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="User" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-xc-muted">Entity ID</Label>
                <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="uuid" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-xc-muted">Actor User ID</Label>
                <Input value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} placeholder="uuid" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-xc-muted">Action</Label>
                <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="IAM_USER_*" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-xc-muted">Rows</Label>
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
              <div className="mb-4 rounded-xl border border-xc-danger/30 bg-xc-danger/10 px-4 py-3 text-sm text-xc-danger">
                {err}
              </div>
            ) : null}

            <div className="rounded-xl border border-xc-border">
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
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-xc-muted">
                        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                        Loading audit events...
                      </TableCell>
                    </TableRow>
                  ) : rows.length ? (
                    rows.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap text-sm">{fmt(e.createdAt)}</TableCell>
                        <TableCell className="text-sm">{e.branchName || "—"}</TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{e.actorName || "—"}</div>
                          <div className="font-mono text-xs text-xc-muted">{e.actorEmail || e.actorUserId || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {e.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{e.entity}</div>
                          <div className="font-mono text-xs text-xc-muted">{e.entityId || "—"}</div>
                        </TableCell>
                        <TableCell className="max-w-[420px] truncate font-mono text-xs text-xc-muted">
                          {compactMeta(e.meta)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => view(e)}>
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-xc-muted">
                        No audit events found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
                    <span className="text-xc-muted">Time:</span>{" "}
                    <span className="font-medium">{fmt(selected.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-xc-muted">Branch:</span>{" "}
                    <span className="font-medium">{selected.branchName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xc-muted">Actor:</span>{" "}
                    <span className="font-medium">{selected.actorName || "—"}</span>{" "}
                    <span className="text-xc-muted">({selected.actorEmail || selected.actorUserId || "—"})</span>
                  </div>
                  <div>
                    <span className="text-xc-muted">Action:</span>{" "}
                    <span className="font-mono">{selected.action}</span>
                  </div>
                  <div>
                    <span className="text-xc-muted">Entity:</span>{" "}
                    <span className="font-medium">{selected.entity}</span>{" "}
                    <span className="text-xc-muted">({selected.entityId || "—"})</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-xc-border bg-xc-panel p-3">
                  <div className="text-sm font-semibold">Meta</div>
                  <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg border border-xc-border bg-xc-card p-3 text-xs">
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