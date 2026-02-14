"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2 } from "lucide-react";

export default function DonorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { branchId } = useBranchContext();
  const [donor, setDonor] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId || !id) return;
    setLoading(true);
    apiFetch(`/api/blood-bank/donors/${id}`).then(setDonor).catch(() => undefined).finally(() => setLoading(false));
  }, [branchId, id]);

  if (loading) return <AppShell title="Donor"><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div></AppShell>;
  if (!donor) return <AppShell title="Donor"><div className="py-12 text-center text-muted-foreground">Donor not found</div></AppShell>;

  return (
    <AppShell title={`Donor: ${donor.donorNumber}`}>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{donor.firstName} {donor.lastName}</CardTitle>
            <CardDescription>Donor #{donor.donorNumber}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-3">
            <div><span className="text-sm text-muted-foreground">Blood Group:</span> <Badge variant="outline">{donor.bloodGroup?.replace("_", " ")}</Badge></div>
            <div><span className="text-sm text-muted-foreground">Status:</span> <Badge>{donor.status}</Badge></div>
            <div><span className="text-sm text-muted-foreground">Type:</span> {donor.donorType}</div>
            <div><span className="text-sm text-muted-foreground">Mobile:</span> {donor.mobile ?? "-"}</div>
            <div><span className="text-sm text-muted-foreground">Total Donations:</span> {donor.totalDonations ?? 0}</div>
            <div><span className="text-sm text-muted-foreground">Last Donation:</span> {donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString() : "Never"}</div>
          </CardContent>
        </Card>

        {donor.deferrals?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Deferral History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead>Until</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {donor.deferrals.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell><Badge variant={d.deferralType === "PERMANENT" ? "destructive" : "secondary"}>{d.deferralType}</Badge></TableCell>
                      <TableCell>{d.reason}</TableCell>
                      <TableCell>{d.deferUntil ? new Date(d.deferUntil).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {donor.bloodUnits?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Donation History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Unit #</TableHead><TableHead>Date</TableHead><TableHead>Blood Group</TableHead><TableHead>Volume</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {donor.bloodUnits.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.unitNumber}</TableCell>
                      <TableCell>{new Date(u.collectionDate).toLocaleDateString()}</TableCell>
                      <TableCell>{u.bloodGroup?.replace("_", " ")}</TableCell>
                      <TableCell>{u.volumeMl ? `${u.volumeMl} ml` : "-"}</TableCell>
                      <TableCell><Badge variant="outline">{u.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
