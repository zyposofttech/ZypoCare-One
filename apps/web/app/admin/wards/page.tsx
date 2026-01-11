"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";
import { apiFetch, ApiError } from "@/lib/api";
import { Bed, DoorOpen, Hospital, Layers, Plus, Pencil, RefreshCw } from "lucide-react";

type Principal = {
  userId: string;
  roleCode: string;
  roleScope: "GLOBAL" | "BRANCH";
  branchId?: string | null;
  permissions: string[];
};

type BedRow = {
  id: string;
  branchId: string;
  roomId: string;
  code: string;
  state: "VACANT" | "OCCUPIED" | "CLEANING" | "MAINTENANCE";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RoomRow = {
  id: string;
  branchId: string;
  wardId: string;
  code: string;
  name: string;
  floor?: string | null;
  type?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  beds: BedRow[];
};

type WardRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  specialty?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rooms: RoomRow[];
};

function tallyBeds(rooms: RoomRow[]) {
  const beds = rooms.flatMap((r) => r.beds ?? []);
  const total = beds.length;
  const byState = beds.reduce(
    (acc, b) => {
      acc[b.state] = (acc[b.state] ?? 0) + 1;
      return acc;
    },
    {} as Record<BedRow["state"], number>,
  );
  return { total, byState };
}

export default function WardsPage() {
  const [principal, setPrincipal] = React.useState<Principal | null>(null);
  const [wards, setWards] = React.useState<WardRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");

  const [selectedWardId, setSelectedWardId] = React.useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = React.useState<string | null>(null);

  // Ward modal
  const [wardModalOpen, setWardModalOpen] = React.useState(false);
  const [editingWard, setEditingWard] = React.useState<WardRow | null>(null);
  const [wardForm, setWardForm] = React.useState<Partial<WardRow>>({ isActive: true });

  // Room modal
  const [roomModalOpen, setRoomModalOpen] = React.useState(false);
  const [editingRoom, setEditingRoom] = React.useState<RoomRow | null>(null);
  const [roomForm, setRoomForm] = React.useState<Partial<RoomRow>>({ isActive: true });

  // Bed modal
  const [bedModalOpen, setBedModalOpen] = React.useState(false);
  const [bedForm, setBedForm] = React.useState<{ code?: string }>({});

  async function load() {
    setLoading(true);
    try {
      const me = await apiFetch<Principal>("/iam/me");
      setPrincipal(me);

      const rows = await apiFetch<WardRow[]>("/wards" + (me.roleScope === "GLOBAL" ? "" : ""));
      setWards(rows);

      // keep selection stable if possible
      const nextWardId = selectedWardId && rows.some((w) => w.id === selectedWardId) ? selectedWardId : rows[0]?.id ?? null;
      setSelectedWardId(nextWardId);
      const nextWard = rows.find((w) => w.id === nextWardId) ?? null;
      const nextRoomId =
        selectedRoomId && nextWard?.rooms?.some((r) => r.id === selectedRoomId)
          ? selectedRoomId
          : nextWard?.rooms?.[0]?.id ?? null;
      setSelectedRoomId(nextRoomId);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to load wards";
      toast({ title: "Load failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredWards = wards.filter((w) => {
    const t = `${w.code} ${w.name} ${w.specialty ?? ""}`.toLowerCase();
    return t.includes(q.toLowerCase());
  });

  const selectedWard = wards.find((w) => w.id === selectedWardId) ?? null;
  const selectedRoom = selectedWard?.rooms?.find((r) => r.id === selectedRoomId) ?? null;

  const roomCount = wards.reduce((acc, w) => acc + (w.rooms?.length ?? 0), 0);
  const bedCount = wards.reduce((acc, w) => acc + tallyBeds(w.rooms ?? []).total, 0);
  const wardBedTally = selectedWard ? tallyBeds(selectedWard.rooms ?? []) : { total: 0, byState: {} as any };

  function openCreateWard() {
    setEditingWard(null);
    setWardForm({ isActive: true } as any);
    setWardModalOpen(true);
  }

  function openEditWard(w: WardRow) {
    setEditingWard(w);
    setWardForm({ ...w });
    setWardModalOpen(true);
  }

  async function saveWard() {
    try {
      const payload: any = {
        branchId: principal?.roleScope === "GLOBAL" ? wardForm.branchId : undefined,
        code: String(wardForm.code ?? "").trim(),
        name: String(wardForm.name ?? "").trim(),
        specialty: wardForm.specialty ?? undefined,
        isActive: wardForm.isActive,
      };
      if (editingWard) {
        await apiFetch(`/wards/${editingWard.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast({ title: "Ward updated", description: `${payload.name} (${payload.code})` });
      } else {
        await apiFetch(`/wards`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Ward created", description: `${payload.name} (${payload.code})` });
      }
      setWardModalOpen(false);
      await load();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Save failed";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    }
  }

  function openCreateRoom() {
    if (!selectedWard) {
      toast({ title: "Select a ward", description: "Choose a ward before adding a room.", variant: "destructive" });
      return;
    }
    setEditingRoom(null);
    setRoomForm({ isActive: true } as any);
    setRoomModalOpen(true);
  }

  function openEditRoom(r: RoomRow) {
    setEditingRoom(r);
    setRoomForm({ ...r });
    setRoomModalOpen(true);
  }

  async function saveRoom() {
    if (!selectedWard && !editingRoom) return;
    try {
      const payload: any = {
        code: String(roomForm.code ?? "").trim(),
        name: String(roomForm.name ?? "").trim(),
        floor: roomForm.floor ?? undefined,
        type: roomForm.type ?? undefined,
        isActive: roomForm.isActive,
      };

      if (editingRoom) {
        await apiFetch(`/rooms/${editingRoom.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast({ title: "Room updated", description: `${payload.name} (${payload.code})` });
      } else {
        await apiFetch(`/wards/${selectedWard!.id}/rooms`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Room created", description: `${payload.name} (${payload.code})` });
      }
      setRoomModalOpen(false);
      await load();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Save failed";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    }
  }

  function openCreateBed() {
    if (!selectedRoom) {
      toast({ title: "Select a room", description: "Choose a room before adding beds.", variant: "destructive" });
      return;
    }
    setBedForm({});
    setBedModalOpen(true);
  }

  async function createBed() {
    if (!selectedRoom) return;
    try {
      const payload = { code: String(bedForm.code ?? "").trim() };
      await apiFetch(`/rooms/${selectedRoom.id}/beds`, { method: "POST", body: JSON.stringify(payload) });
      toast({ title: "Bed created", description: `${payload.code}` });
      setBedModalOpen(false);
      await load();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Create failed";
      toast({ title: "Create failed", description: msg, variant: "destructive" });
    }
  }

  async function updateBedState(bedId: string, state: BedRow["state"]) {
    try {
      await apiFetch(`/beds/${bedId}`, { method: "PATCH", body: JSON.stringify({ state }) });
      toast({ title: "Bed updated", description: `State set to ${state}` });
      await load();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Update failed";
      toast({ title: "Update failed", description: msg, variant: "destructive" });
    }
  }

  return (
    <AppShell title="Wards, Rooms & Beds">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Branch → Facility Setup → Ward Topology</div>
            <h1 className="text-xl font-semibold">Wards, Rooms & Beds</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search wards..." className="w-full sm:w-[320px]" />
            <Button variant="outline" onClick={load}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreateWard}>
              <Plus className="mr-2 h-4 w-4" />
              New Ward
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Link href="/admin/facility" className="block">
            <Card className="hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Facility Setup</CardTitle>
                <Hospital className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Configure</div>
                <p className="text-xs text-muted-foreground">Facilities, departments, specialties</p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wards</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{wards.length}</div>
              <p className="text-xs text-muted-foreground">Across your scope</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rooms</CardTitle>
              <DoorOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roomCount}</div>
              <p className="text-xs text-muted-foreground">Under all wards</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beds</CardTitle>
              <Bed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bedCount}</div>
              <p className="text-xs text-muted-foreground">All rooms combined</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Wards</CardTitle>
              <div className="text-xs text-muted-foreground">{loading ? "Loading..." : `${filteredWards.length} shown`}</div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Ward</th>
                      <th className="px-3 py-2">Rooms</th>
                      <th className="px-3 py-2">Beds</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td className="px-3 py-6 text-muted-foreground" colSpan={6}>
                          Loading...
                        </td>
                      </tr>
                    ) : filteredWards.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-muted-foreground" colSpan={6}>
                          No wards found.
                        </td>
                      </tr>
                    ) : (
                      filteredWards.map((w) => {
                        const beds = tallyBeds(w.rooms ?? []).total;
                        const selected = w.id === selectedWardId;
                        return (
                          <tr
                            key={w.id}
                            className={selected ? "bg-muted/30" : "hover:bg-muted/20"}
                            onClick={() => {
                              setSelectedWardId(w.id);
                              setSelectedRoomId(w.rooms?.[0]?.id ?? null);
                            }}
                            role="button"
                          >
                            <td className="px-3 py-2 font-mono text-xs">{w.code}</td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{w.name}</div>
                              {w.specialty ? <div className="text-xs text-muted-foreground">{w.specialty}</div> : null}
                            </td>
                            <td className="px-3 py-2">{w.rooms?.length ?? 0}</td>
                            <td className="px-3 py-2">{beds}</td>
                            <td className="px-3 py-2">
                              <span className={w.isActive ? "text-emerald-600" : "text-muted-foreground"}>{w.isActive ? "ACTIVE" : "INACTIVE"}</span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditWard(w);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ward Details</CardTitle>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selectedWard ? `${selectedWard.name} (${selectedWard.code})` : "Select a ward to manage rooms and beds"}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={openCreateRoom} disabled={!selectedWard}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Room
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedWard ? (
                <div className="text-sm text-muted-foreground">Pick a ward from the list to start.</div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-4">
                    <Card className="md:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Ward Capacity</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Rooms</span>
                          <span className="font-medium">{selectedWard.rooms?.length ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Beds</span>
                          <span className="font-medium">{wardBedTally.total}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Vacant</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{wardBedTally.byState?.VACANT ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Available now</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Occupied</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{wardBedTally.byState?.OCCUPIED ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Currently assigned</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">Rooms</div>
                        <div className="text-xs text-muted-foreground">Select a room to manage beds</div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid gap-3 md:grid-cols-2">
                      {(selectedWard.rooms ?? []).length === 0 ? (
                        <div className="text-sm text-muted-foreground md:col-span-2">No rooms yet. Create the first room for this ward.</div>
                      ) : (
                        (selectedWard.rooms ?? []).map((r) => {
                          const selected = r.id === selectedRoomId;
                          return (
                            <Card key={r.id} className={selected ? "border-primary" : "hover:bg-muted/20"}>
                              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div>
                                  <CardTitle className="text-sm">{r.name}</CardTitle>
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-mono">{r.code}</span>
                                    {r.floor ? <span> • Floor {r.floor}</span> : null}
                                    {r.type ? <span> • {r.type}</span> : null}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditRoom(r);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div
                                  className="flex items-center justify-between text-sm"
                                  onClick={() => setSelectedRoomId(r.id)}
                                  role="button"
                                >
                                  <span className="text-muted-foreground">Beds</span>
                                  <span className="font-medium">{r.beds?.length ?? 0}</span>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  {r.isActive ? "ACTIVE" : "INACTIVE"}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Beds</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedRoom ? `Room: ${selectedRoom.name} (${selectedRoom.code})` : "Select a room to view beds"}
                      </div>
                    </div>
                    <Button onClick={openCreateBed} disabled={!selectedRoom}>
                      <Plus className="mr-2 h-4 w-4" />
                      New Bed
                    </Button>
                  </div>

                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left">
                        <tr>
                          <th className="px-3 py-2">Bed</th>
                          <th className="px-3 py-2">State</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!selectedRoom ? (
                          <tr>
                            <td className="px-3 py-6 text-muted-foreground" colSpan={3}>
                              Select a room to see beds.
                            </td>
                          </tr>
                        ) : (selectedRoom.beds ?? []).length === 0 ? (
                          <tr>
                            <td className="px-3 py-6 text-muted-foreground" colSpan={3}>
                              No beds yet in this room.
                            </td>
                          </tr>
                        ) : (
                          (selectedRoom.beds ?? []).map((b) => (
                            <tr key={b.id} className="hover:bg-muted/20">
                              <td className="px-3 py-2 font-mono text-xs">{b.code}</td>
                              <td className="px-3 py-2">
                                <select
                                  className="h-9 rounded-md border bg-background px-2 text-sm"
                                  value={b.state}
                                  onChange={(e) => updateBedState(b.id, e.target.value as any)}
                                >
                                  <option value="VACANT">VACANT</option>
                                  <option value="OCCUPIED">OCCUPIED</option>
                                  <option value="CLEANING">CLEANING</option>
                                  <option value="MAINTENANCE">MAINTENANCE</option>
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <span className={b.isActive ? "text-emerald-600" : "text-muted-foreground"}>{b.isActive ? "ACTIVE" : "INACTIVE"}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Modal
          open={wardModalOpen}
          title={editingWard ? "Edit Ward" : "New Ward"}
          onClose={() => setWardModalOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setWardModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveWard}>{editingWard ? "Save Changes" : "Create"}</Button>
            </>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {principal?.roleScope === "GLOBAL" ? (
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Branch Id (GLOBAL only)</label>
                <Input value={String(wardForm.branchId ?? "")} onChange={(e) => setWardForm((p) => ({ ...p, branchId: e.target.value }))} placeholder="Branch UUID" />
              </div>
            ) : null}

            <div>
              <label className="text-xs text-muted-foreground">Code</label>
              <Input value={String(wardForm.code ?? "")} onChange={(e) => setWardForm((p) => ({ ...p, code: e.target.value }))} placeholder="ICU" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ward Name</label>
              <Input value={String(wardForm.name ?? "")} onChange={(e) => setWardForm((p) => ({ ...p, name: e.target.value }))} placeholder="Intensive Care Unit" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Specialty (optional)</label>
              <Input value={String(wardForm.specialty ?? "")} onChange={(e) => setWardForm((p) => ({ ...p, specialty: e.target.value }))} placeholder="Cardiology" />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={wardForm.isActive ? "ACTIVE" : "INACTIVE"}
                onChange={(e) => setWardForm((p) => ({ ...p, isActive: e.target.value === "ACTIVE" }))}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
        </Modal>

        <Modal
          open={roomModalOpen}
          title={editingRoom ? "Edit Room" : "New Room"}
          onClose={() => setRoomModalOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setRoomModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveRoom}>{editingRoom ? "Save Changes" : "Create"}</Button>
            </>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Code</label>
              <Input value={String(roomForm.code ?? "")} onChange={(e) => setRoomForm((p) => ({ ...p, code: e.target.value }))} placeholder="R101" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Room Name</label>
              <Input value={String(roomForm.name ?? "")} onChange={(e) => setRoomForm((p) => ({ ...p, name: e.target.value }))} placeholder="Room 101" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Floor (optional)</label>
              <Input value={String(roomForm.floor ?? "")} onChange={(e) => setRoomForm((p) => ({ ...p, floor: e.target.value }))} placeholder="1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type (optional)</label>
              <Input value={String(roomForm.type ?? "")} onChange={(e) => setRoomForm((p) => ({ ...p, type: e.target.value }))} placeholder="GENERAL" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={roomForm.isActive ? "ACTIVE" : "INACTIVE"}
                onChange={(e) => setRoomForm((p) => ({ ...p, isActive: e.target.value === "ACTIVE" }))}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
        </Modal>

        <Modal
          open={bedModalOpen}
          title="New Bed"
          onClose={() => setBedModalOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setBedModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createBed}>Create</Button>
            </>
          }
        >
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Bed Code</label>
              <Input value={String(bedForm.code ?? "")} onChange={(e) => setBedForm((p) => ({ ...p, code: e.target.value }))} placeholder="B01" />
              <div className="mt-1 text-xs text-muted-foreground">Unique per room (e.g., B01, B02 or 01, 02).</div>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
