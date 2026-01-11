"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiFetch, ApiError } from "@/lib/api";
import { Bed, Layers, RefreshCw } from "lucide-react";

type BedState = "VACANT" | "OCCUPIED" | "CLEANING" | "MAINTENANCE";

type BedRow = {
  id: string;
  branchId: string;
  roomId: string;
  code: string;
  state: BedState;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RoomRow = {
  id: string;
  wardId: string;
  code: string;
  name: string;
  isActive: boolean;
  beds: BedRow[];
};

type WardRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  rooms: RoomRow[];
};

export default function BedsPage() {
  const [rows, setRows] = React.useState<WardRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");

  async function load() {
    setLoading(true);
    try {
      const wards = await apiFetch<WardRow[]>("/wards");
      setRows(wards);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to load beds";
      toast({ title: "Load failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  const flat = React.useMemo(() => {
    const out: Array<{ ward: WardRow; room: RoomRow; bed: BedRow }> = [];
    for (const w of rows) {
      for (const r of w.rooms ?? []) {
        for (const b of r.beds ?? []) out.push({ ward: w, room: r, bed: b });
      }
    }
    return out;
  }, [rows]);

  const filtered = flat.filter(({ ward, room, bed }) => {
    const t = `${ward.code} ${ward.name} ${room.code} ${room.name} ${bed.code} ${bed.state}`.toLowerCase();
    return t.includes(q.toLowerCase());
  });

  async function updateBedState(bedId: string, state: BedState) {
    try {
      await apiFetch(`/beds/${bedId}`, { method: "PATCH", body: JSON.stringify({ state }) });
      toast({ title: "Bed updated", description: `State set to ${state}` });
      await load();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Update failed";
      toast({ title: "Update failed", description: msg, variant: "destructive" });
    }
  }

  const bedCount = flat.length;

  return (
    <AppShell title="Beds">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Facility Setup → Bed Explorer</div>
            <h1 className="text-xl font-semibold">Beds</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search beds, rooms, wards..." className="w-full sm:w-[360px]" />
            <Button variant="outline" onClick={load}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Link href="/admin/wards" className="block">
            <Card className="hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wards</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Manage topology</div>
                <p className="text-xs text-muted-foreground">Ward → Room → Bed</p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
              <Bed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bedCount}</div>
              <p className="text-xs text-muted-foreground">Across all wards</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bed List</CardTitle>
            <div className="text-xs text-muted-foreground">{loading ? "Loading..." : `${filtered.length} shown`}</div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2">Ward</th>
                    <th className="px-3 py-2">Room</th>
                    <th className="px-3 py-2">Bed</th>
                    <th className="px-3 py-2">State</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                        Loading...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                        No beds found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(({ ward, room, bed }) => (
                      <tr key={bed.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <div className="font-medium">{ward.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{ward.code}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{room.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{room.code}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{bed.code}</td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 rounded-md border bg-background px-2 text-sm"
                            value={bed.state}
                            onChange={(e) => updateBedState(bed.id, e.target.value as BedState)}
                          >
                            <option value="VACANT">VACANT</option>
                            <option value="OCCUPIED">OCCUPIED</option>
                            <option value="CLEANING">CLEANING</option>
                            <option value="MAINTENANCE">MAINTENANCE</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <span className={bed.isActive ? "text-emerald-600" : "text-muted-foreground"}>{bed.isActive ? "ACTIVE" : "INACTIVE"}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
