"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, GitCompareArrows } from "lucide-react";

const URGENCY_VARIANT: Record<string, string> = {
  ROUTINE: "secondary",
  URGENT: "default",
  EMERGENCY: "destructive",
  MTP: "destructive",
};

export default function CrossMatchPage() {
  const { branchId } = useBranchContext();
  const [pending, setPending] = React.useState<any[]>([]);
  const [completed, setCompleted] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/blood-bank/requests?branchId=${branchId}&status=SAMPLE_RECEIVED,CROSS_MATCHING`),
      apiFetch(`/api/blood-bank/requests?branchId=${branchId}&status=READY`),
    ])
      .then(([p, c]: any[]) => {
        setPending(p ?? []);
        setCompleted(c ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <AppShell title="Cross-Match Workbench">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          <GitCompareArrows className="h-6 w-6 text-purple-600" />
          <div className="text-2xl font-semibold">Cross-Match Workbench</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                Pending Requests ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed Cross-Matches ({completed.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request #</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Blood Group</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pending.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.requestNumber}
                          </TableCell>
                          <TableCell>
                            {r.patient?.firstName} {r.patient?.lastName} (
                            {r.patient?.uhid})
                          </TableCell>
                          <TableCell>{r.componentType ?? "Any"}</TableCell>
                          <TableCell>
                            {r.bloodGroup?.replace("_", " ") ?? "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                (URGENCY_VARIANT[r.urgency] as any) ??
                                "secondary"
                              }
                            >
                              {r.urgency}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {pending.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground"
                          >
                            No pending cross-match requests
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request #</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Unit #</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Certificate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completed.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.requestNumber}
                          </TableCell>
                          <TableCell>
                            {r.patient?.firstName} {r.patient?.lastName}
                          </TableCell>
                          <TableCell>
                            {r.crossMatch?.unitNumber ?? r.unitNumber ?? "-"}
                          </TableCell>
                          <TableCell>
                            {r.crossMatch?.method ?? "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                r.crossMatch?.result === "COMPATIBLE"
                                  ? "default"
                                  : "destructive"
                              }
                              className={
                                r.crossMatch?.result === "COMPATIBLE"
                                  ? "bg-green-600 hover:bg-green-700"
                                  : ""
                              }
                            >
                              {r.crossMatch?.result ?? "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.crossMatch?.validUntil
                              ? new Date(
                                  r.crossMatch.validUntil
                                ).toLocaleString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {r.crossMatch?.certificateNumber ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {completed.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground"
                          >
                            No completed cross-matches
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
