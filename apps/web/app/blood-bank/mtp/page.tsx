"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, Siren } from "lucide-react";

export default function MTPDashboardPage() {
  const { branchId } = useBranchContext();
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    apiFetch(`/api/blood-bank/issue/mtp?branchId=${branchId}`)
      .then((data: any) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [branchId]);

  const activeSessions = sessions.filter((s: any) => s.status === "ACTIVE");
  const historySessions = sessions.filter((s: any) => s.status !== "ACTIVE");

  return (
    <AppShell title="MTP Dashboard">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          <Siren className="h-6 w-6 text-red-600" />
          <div className="text-2xl font-semibold">MTP Dashboard</div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 font-semibold">Active MTP Sessions</div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : activeSessions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No active MTP sessions</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MTP ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Activated At</TableHead>
                    <TableHead>Units Issued</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.mtpId ?? s.id}</TableCell>
                      <TableCell>{s.patientName ?? s.patient ?? "-"}</TableCell>
                      <TableCell>{s.activatedAt ? new Date(s.activatedAt).toLocaleString() : "-"}</TableCell>
                      <TableCell>
                        PRBC: {s.prbcCount ?? 0} / FFP: {s.ffpCount ?? 0} / Plt: {s.pltCount ?? 0}
                      </TableCell>
                      <TableCell><Badge variant="destructive">ACTIVE</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 font-semibold">MTP History</div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : historySessions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No MTP history</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MTP ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Activated At</TableHead>
                    <TableHead>Units Issued</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historySessions.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.mtpId ?? s.id}</TableCell>
                      <TableCell>{s.patientName ?? s.patient ?? "-"}</TableCell>
                      <TableCell>{s.activatedAt ? new Date(s.activatedAt).toLocaleString() : "-"}</TableCell>
                      <TableCell>
                        PRBC: {s.prbcCount ?? 0} / FFP: {s.ffpCount ?? 0} / Plt: {s.pltCount ?? 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === "COMPLETED" ? "default" : "secondary"}>
                          {s.status}
                        </Badge>
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
