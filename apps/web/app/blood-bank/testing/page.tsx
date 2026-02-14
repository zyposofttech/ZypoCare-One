"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, FlaskConical } from "lucide-react";

export default function TestingLabPage() {
  const { branchId } = useBranchContext();
  const [worklist, setWorklist] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    apiFetch(`/api/blood-bank/testing/worklist?branchId=${branchId}`).then((d: any) => setWorklist(d ?? [])).catch(() => undefined).finally(() => setLoading(false));
  }, [branchId]);

  const needsGrouping = worklist.filter((u) => !u.groupingResult);
  const needsTTI = worklist.filter((u) => u.groupingResult && u.ttiTests.length < 5);
  const pendingVerification = worklist.filter((u) => u.groupingResult && !u.groupingResult.verifiedBy);

  return (
    <AppShell title="Testing Lab">
      <div className="grid gap-6">
        <div className="flex items-center gap-3"><FlaskConical className="h-6 w-6 text-red-500" /><div className="text-2xl font-semibold">Blood Testing Laboratory</div></div>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Tabs defaultValue="grouping">
            <TabsList><TabsTrigger value="grouping">Grouping ({needsGrouping.length})</TabsTrigger><TabsTrigger value="tti">TTI Testing ({needsTTI.length})</TabsTrigger><TabsTrigger value="verify">Verification ({pendingVerification.length})</TabsTrigger><TabsTrigger value="all">All ({worklist.length})</TabsTrigger></TabsList>
            <TabsContent value="grouping">
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Unit #</TableHead><TableHead>Donor</TableHead><TableHead>Blood Group</TableHead><TableHead>Collected</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {needsGrouping.map((u: any) => (
                      <TableRow key={u.id}><TableCell className="font-medium">{u.unitNumber}</TableCell><TableCell>{u.donor?.firstName} {u.donor?.lastName}</TableCell><TableCell><Badge variant="outline">{u.bloodGroup?.replace("_", " ")}</Badge></TableCell><TableCell>{new Date(u.collectionDate).toLocaleString()}</TableCell></TableRow>
                    ))}
                    {needsGrouping.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">All units grouped</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="tti">
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Unit #</TableHead><TableHead>Donor</TableHead><TableHead>Group</TableHead><TableHead>TTI Tests Done</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {needsTTI.map((u: any) => (
                      <TableRow key={u.id}><TableCell className="font-medium">{u.unitNumber}</TableCell><TableCell>{u.donor?.firstName} {u.donor?.lastName}</TableCell><TableCell><Badge variant="outline">{u.bloodGroup?.replace("_", " ")}</Badge></TableCell><TableCell>{u.ttiTests.length}/5</TableCell></TableRow>
                    ))}
                    {needsTTI.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">All TTI tests complete</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="verify">
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Unit #</TableHead><TableHead>Donor</TableHead><TableHead>Group</TableHead><TableHead>Discrepancy</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {pendingVerification.map((u: any) => (
                      <TableRow key={u.id}><TableCell className="font-medium">{u.unitNumber}</TableCell><TableCell>{u.donor?.firstName} {u.donor?.lastName}</TableCell><TableCell><Badge variant="outline">{u.groupingResult?.confirmedBloodGroup?.replace("_", " ")}</Badge></TableCell><TableCell>{u.groupingResult?.hasDiscrepancy ? <Badge variant="destructive">Yes</Badge> : "No"}</TableCell></TableRow>
                    ))}
                    {pendingVerification.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">All verified</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="all">
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Unit #</TableHead><TableHead>Donor</TableHead><TableHead>Group</TableHead><TableHead>Grouping</TableHead><TableHead>TTI</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {worklist.map((u: any) => (
                      <TableRow key={u.id}><TableCell className="font-medium">{u.unitNumber}</TableCell><TableCell>{u.donor?.firstName} {u.donor?.lastName}</TableCell><TableCell><Badge variant="outline">{u.bloodGroup?.replace("_", " ")}</Badge></TableCell><TableCell>{u.groupingResult ? <Badge variant="default">Done</Badge> : <Badge variant="secondary">Pending</Badge>}</TableCell><TableCell>{u.ttiTests.length}/5</TableCell><TableCell><Badge variant="outline">{u.status}</Badge></TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
