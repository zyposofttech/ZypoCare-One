"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Activity, Loader2 } from "lucide-react";

function elapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
}

export default function TransfusionMonitorPage() {
  const { branchId } = useBranchContext();
  const [active, setActive] = React.useState<any[]>([]);
  const [completed, setCompleted] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/blood-bank/issue?branchId=${branchId}&transfusing=true`),
      apiFetch(`/api/blood-bank/issue?branchId=${branchId}&transfused_today=true`),
    ])
      .then(([a, c]: any[]) => {
        setActive(a ?? []);
        setCompleted(c ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <AppShell title="Transfusion Monitor">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-red-500" />
          <div className="text-2xl font-semibold">Transfusion Monitor</div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 font-semibold">Active Transfusions</div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : active.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No active transfusions</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Unit #</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Elapsed</TableHead>
                    <TableHead>Last Vitals</TableHead>
                    <TableHead>Reaction Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.patientName ?? t.patient ?? "-"}</TableCell>
                      <TableCell>{t.unitNumber ?? "-"}</TableCell>
                      <TableCell>{t.component ?? "-"}</TableCell>
                      <TableCell>{t.startedAt ? new Date(t.startedAt).toLocaleTimeString() : "-"}</TableCell>
                      <TableCell>{t.startedAt ? elapsed(t.startedAt) : "-"}</TableCell>
                      <TableCell>{t.lastVitals ?? "-"}</TableCell>
                      <TableCell>
                        {t.reactionFlagged ? (
                          <Badge variant="destructive">Flagged</Badge>
                        ) : (
                          <Badge variant="outline">None</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 font-semibold">Completed Today</div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : completed.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No transfusions completed today</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Unit #</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Reaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completed.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.patientName ?? t.patient ?? "-"}</TableCell>
                      <TableCell>{t.unitNumber ?? "-"}</TableCell>
                      <TableCell>{t.component ?? "-"}</TableCell>
                      <TableCell>{t.duration ?? "-"}</TableCell>
                      <TableCell>
                        {t.reaction ? (
                          <Badge variant="destructive">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
