"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, PackageCheck } from "lucide-react";

const URGENCY_COLORS: Record<string, string> = {
  ROUTINE: "secondary",
  URGENT: "default",
  EMERGENCY: "destructive",
  MTP: "destructive",
};

const STATUS_COLORS: Record<string, string> = {
  ISSUED: "default",
  RETURNED: "secondary",
  TRANSFUSED: "default",
  DISCARDED: "destructive",
};

export default function IssueDeskPage() {
  const { branchId } = useBranchContext();
  const [readyItems, setReadyItems] = React.useState<any[]>([]);
  const [issuedToday, setIssuedToday] = React.useState<any[]>([]);
  const [returns, setReturns] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/blood-bank/requests?branchId=${branchId}&status=READY`),
      apiFetch(`/api/blood-bank/issue?branchId=${branchId}&today=true`),
      apiFetch(`/api/blood-bank/issue?branchId=${branchId}&returned=true`),
    ])
      .then(([ready, issued, ret]: any[]) => {
        setReadyItems(ready ?? []);
        setIssuedToday(issued ?? []);
        setReturns(ret ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <AppShell title="Blood Issue Desk">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          <PackageCheck className="h-6 w-6 text-emerald-600" />
          <div className="text-2xl font-semibold">Blood Issue Desk</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="ready">
            <TabsList>
              <TabsTrigger value="ready">
                Ready to Issue ({readyItems.length})
              </TabsTrigger>
              <TabsTrigger value="issued">
                Issued Today ({issuedToday.length})
              </TabsTrigger>
              <TabsTrigger value="returns">
                Returns ({returns.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1 - Ready to Issue */}
            <TabsContent value="ready">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request #</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Unit(s) Matched</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readyItems.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.requestNumber}
                          </TableCell>
                          <TableCell>
                            {r.patient?.firstName} {r.patient?.lastName}{" "}
                            ({r.patient?.uhid})
                          </TableCell>
                          <TableCell>{r.componentType ?? "Any"}</TableCell>
                          <TableCell>{r.unitsMatched ?? 0}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                (URGENCY_COLORS[r.urgency] as any) ??
                                "secondary"
                              }
                            >
                              {r.urgency}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="cursor-pointer hover:bg-emerald-100"
                            >
                              Issue
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {readyItems.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground"
                          >
                            No requests ready to issue
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2 - Issued Today */}
            <TabsContent value="issued">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Issue #</TableHead>
                        <TableHead>Unit #</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Issued To</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issuedToday.map((i: any) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">
                            {i.issueNumber}
                          </TableCell>
                          <TableCell>{i.unitNumber}</TableCell>
                          <TableCell>
                            {i.patient?.firstName} {i.patient?.lastName}{" "}
                            ({i.patient?.uhid})
                          </TableCell>
                          <TableCell>{i.componentType ?? "—"}</TableCell>
                          <TableCell>{i.issuedToWard ?? "—"}</TableCell>
                          <TableCell>
                            {i.issuedAt
                              ? new Date(i.issuedAt).toLocaleTimeString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                (STATUS_COLORS[i.status] as any) ?? "outline"
                              }
                            >
                              {i.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {issuedToday.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground"
                          >
                            No blood units issued today
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3 - Returns */}
            <TabsContent value="returns">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Issue #</TableHead>
                        <TableHead>Unit #</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Returned At</TableHead>
                        <TableHead>Condition</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returns.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.issueNumber}
                          </TableCell>
                          <TableCell>{r.unitNumber}</TableCell>
                          <TableCell>{r.returnReason ?? "—"}</TableCell>
                          <TableCell>
                            {r.returnedAt
                              ? new Date(r.returnedAt).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {r.returnCondition ?? "Unknown"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {returns.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            No returned units
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
