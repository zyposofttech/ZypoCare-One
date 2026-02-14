"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { Loader2, Shield } from "lucide-react";

export default function QualityControlPage() {
  const { branchId } = useBranchContext();

  const [iqcRecords, setIqcRecords] = React.useState<any[]>([]);
  const [eqasRecords, setEqasRecords] = React.useState<any[]>([]);
  const [calibrationRecords, setCalibrationRecords] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!branchId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [iqcRes, eqasRes, calibrationRes]: any[] = await Promise.all([
          apiFetch(`/api/blood-bank/qc/iqc?branchId=${branchId}`),
          apiFetch(`/api/blood-bank/qc/eqas?branchId=${branchId}`),
          apiFetch(`/api/blood-bank/qc/calibration?branchId=${branchId}`),
        ]);

        setIqcRecords(Array.isArray(iqcRes) ? iqcRes : []);
        setEqasRecords(Array.isArray(eqasRes) ? eqasRes : []);
        setCalibrationRecords(Array.isArray(calibrationRes) ? calibrationRes : []);
      } catch (error) {
        console.error("Failed to fetch QC data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [branchId]);

  return (
    <AppShell title="Quality Control">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Quality Control (IQC / EQAS)</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="iqc" className="space-y-4">
            <TabsList>
              <TabsTrigger value="iqc">IQC ({iqcRecords.length})</TabsTrigger>
              <TabsTrigger value="eqas">EQAS ({eqasRecords.length})</TabsTrigger>
              <TabsTrigger value="calibration">Calibration ({calibrationRecords.length})</TabsTrigger>
            </TabsList>

            {/* IQC Tab */}
            <TabsContent value="iqc">
              <Card>
                <CardHeader>
                  <CardTitle>Internal Quality Control</CardTitle>
                </CardHeader>
                <CardContent>
                  {iqcRecords.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No IQC records found.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Test System</TableHead>
                          <TableHead>QC Level</TableHead>
                          <TableHead>Expected Value</TableHead>
                          <TableHead>Observed Value</TableHead>
                          <TableHead>Pass/Fail</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {iqcRecords.map((record: any, index: number) => (
                          <TableRow key={record.id ?? index}>
                            <TableCell>{record.date}</TableCell>
                            <TableCell>{record.testSystem}</TableCell>
                            <TableCell>{record.qcLevel}</TableCell>
                            <TableCell>{record.expectedValue}</TableCell>
                            <TableCell>{record.observedValue}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  record.status === "pass" ? "default" : "destructive"
                                }
                              >
                                {record.status === "pass" ? "Pass" : "Fail"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* EQAS Tab */}
            <TabsContent value="eqas">
              <Card>
                <CardHeader>
                  <CardTitle>External Quality Assessment Scheme</CardTitle>
                </CardHeader>
                <CardContent>
                  {eqasRecords.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No EQAS records found.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Program</TableHead>
                          <TableHead>Cycle</TableHead>
                          <TableHead>Sample ID</TableHead>
                          <TableHead>Result Submitted</TableHead>
                          <TableHead>Performance Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eqasRecords.map((record: any, index: number) => (
                          <TableRow key={record.id ?? index}>
                            <TableCell>{record.program}</TableCell>
                            <TableCell>{record.cycle}</TableCell>
                            <TableCell>{record.sampleId}</TableCell>
                            <TableCell>{record.resultSubmitted}</TableCell>
                            <TableCell>{record.performanceScore}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Calibration Tab */}
            <TabsContent value="calibration">
              <Card>
                <CardHeader>
                  <CardTitle>Equipment Calibration</CardTitle>
                </CardHeader>
                <CardContent>
                  {calibrationRecords.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No calibration records found.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Equipment</TableHead>
                          <TableHead>Calibration Date</TableHead>
                          <TableHead>Next Due</TableHead>
                          <TableHead>Technician</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calibrationRecords.map((record: any, index: number) => (
                          <TableRow key={record.id ?? index}>
                            <TableCell>{record.equipment}</TableCell>
                            <TableCell>{record.calibrationDate}</TableCell>
                            <TableCell>{record.nextDue}</TableCell>
                            <TableCell>{record.technician}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  record.status === "valid" ? "default" : "destructive"
                                }
                              >
                                {record.status === "valid" ? "Valid" : "Expired"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
