"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
// Updated imports for Dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Updated import for toast
import { useToast } from "@/components/ui/use-toast";
import { apiFetch, ApiError } from "@/lib/api";
import { Check, RefreshCw, Save, Plus, Pencil, Users, Building2 } from "lucide-react";

type Principal = {
  userId: string;
  roleCode: string;
  roleScope: "GLOBAL" | "BRANCH";
  branchId?: string | null;
  permissions: string[];
};

type Branch = {
  id: string;
  code: string;
  name: string;
  city: string;
  createdAt: string;
  updatedAt: string;
};

type FacilityCategory = "SERVICE" | "CLINICAL";

type FacilityCatalog = {
  id: string;
  code: string;
  name: string;
  category: FacilityCategory;
  isActive: boolean;
  sortOrder?: number | null;
};

type BranchFacility = {
  id: string;
  branchId: string;
  facilityId: string;
  enabledAt: string;
  facility: Pick<FacilityCatalog, "id" | "code" | "name" | "category">;
};

type Doctor = {
  id: string;
  empCode?: string | null;
  name: string;
  designation?: string | null;
  specialty?: { id: string; code: string; name: string } | null;
};

type Department = {
  id: string;
  branchId: string;
  facilityId: string;
  facility: { id: string; code: string; name: string; category: FacilityCategory };
  code: string;
  name: string;
  isActive: boolean;
  headStaff?: { id: string; name: string; designation?: string | null } | null;
  doctors: Array<{
    staffId: string;
    isPrimary: boolean;
    staff: Doctor;
  }>;
  createdAt: string;
  updatedAt: string;
};

const LS_BRANCH_FILTER = "zc.admin.branchFilter";

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function groupLabel(cat: FacilityCategory) {
  return cat === "SERVICE" ? "Service Facilities" : "Clinical Facilities";
}

function badgeTone(cat: FacilityCategory) {
  return cat === "SERVICE" ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
}

export default function BranchSetupPage() {
  const searchParams = useSearchParams();
  // Initialize the toast hook
  const { toast } = useToast();

  const [me, setMe] = React.useState<Principal | null>(null);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [branchId, setBranchId] = React.useState<string | null>(null);

  const [masterFacilities, setMasterFacilities] = React.useState<FacilityCatalog[]>([]);
  const [branchFacilities, setBranchFacilities] = React.useState<BranchFacility[]>([]);

  const [facSearch, setFacSearch] = React.useState("");
  const [selectedFacilityIds, setSelectedFacilityIds] = React.useState<Set<string>>(new Set());
  const [savedFacilityIds, setSavedFacilityIds] = React.useState<Set<string>>(new Set());
  const [savingFacilities, setSavingFacilities] = React.useState(false);

  const [deptRows, setDeptRows] = React.useState<Department[]>([]);
  const [deptSearch, setDeptSearch] = React.useState("");
  const [deptFacilityFilter, setDeptFacilityFilter] = React.useState<string>("__ALL__");
  const [deptLoading, setDeptLoading] = React.useState(false);

  const [deptModalOpen, setDeptModalOpen] = React.useState(false);
  const [deptEditing, setDeptEditing] = React.useState<Department | null>(null);
  const [deptForm, setDeptForm] = React.useState<Partial<Department>>({ isActive: true });

  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignDept, setAssignDept] = React.useState<Department | null>(null);
  const [doctorQ, setDoctorQ] = React.useState("");
  const [doctorRows, setDoctorRows] = React.useState<Doctor[]>([]);
  const [doctorLoading, setDoctorLoading] = React.useState(false);
  const [selectedDoctorIds, setSelectedDoctorIds] = React.useState<Set<string>>(new Set());
  const [hodId, setHodId] = React.useState<string>(""); // empty means none

  const enabledFacilities = React.useMemo(() => {
    return branchFacilities.map((bf) => bf.facility).sort((a, b) => a.name.localeCompare(b.name));
  }, [branchFacilities]);

  const branchObj = React.useMemo(() => branches.find((b) => b.id === branchId) ?? null, [branches, branchId]);

  const facilitiesByCat = React.useMemo(() => {
    const active = masterFacilities.filter((f) => f.isActive);
    const service = active.filter((f) => f.category === "SERVICE");
    const clinical = active.filter((f) => f.category === "CLINICAL");
    const order = (a: FacilityCatalog, b: FacilityCatalog) => (Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999)) || a.name.localeCompare(b.name);
    service.sort(order);
    clinical.sort(order);
    return { SERVICE: service, CLINICAL: clinical };
  }, [masterFacilities]);

  const facilitiesDirty = React.useMemo(() => {
    if (selectedFacilityIds.size !== savedFacilityIds.size) return true;
    for (const id of selectedFacilityIds) if (!savedFacilityIds.has(id)) return true;
    return false;
  }, [selectedFacilityIds, savedFacilityIds]);

  async function bootstrap() {
    try {
      const principal = await apiFetch<Principal>("/iam/me");
      setMe(principal);

      // branches list (GLOBAL gets all, BRANCH gets only their branch)
      const b = await apiFetch<Branch[]>("/branches");
      setBranches(b);

      // resolve branchId:
      if (principal.roleScope === "BRANCH") {
        setBranchId(principal.branchId ?? null);
        return;
      }

      // GLOBAL scope:
      const fromUrl = searchParams.get("branchId");
      if (fromUrl && b.some((x) => x.id === fromUrl)) {
        localStorage.setItem(LS_BRANCH_FILTER, fromUrl);
        setBranchId(fromUrl);
        return;
      }

      const fromLS = typeof window !== "undefined" ? localStorage.getItem(LS_BRANCH_FILTER) : null;
      if (fromLS && b.some((x) => x.id === fromLS)) {
        setBranchId(fromLS);
        return;
      }

      setBranchId(b[0]?.id ?? null);
    } catch (e: any) {
      toast({ title: "Failed to initialize", description: e instanceof ApiError ? e.message : "Auth/branch load failed", variant: "destructive" });
    }
  }

  async function loadFacilities(currentBranchId: string) {
    try {
      const [catalog, enabled] = await Promise.all([
        apiFetch<FacilityCatalog[]>("/facilities/master?includeInactive=false"),
        apiFetch<BranchFacility[]>(`/branches/${currentBranchId}/facilities`),
      ]);

      setMasterFacilities(catalog);
      setBranchFacilities(enabled);

      const saved = new Set(enabled.map((x) => x.facilityId));
      setSavedFacilityIds(saved);
      setSelectedFacilityIds(new Set(saved));
    } catch (e: any) {
      toast({ title: "Failed to load facilities", description: e instanceof ApiError ? e.message : "Facility load failed", variant: "destructive" });
    }
  }

  async function loadDepartments(currentBranchId: string, facilityId: string | null) {
    setDeptLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("branchId", currentBranchId);
      if (facilityId) qs.set("facilityId", facilityId);
      if (deptSearch.trim()) qs.set("q", deptSearch.trim());

      const data = await apiFetch<Department[]>(`/departments?${qs.toString()}`);
      setDeptRows(data);
    } catch (e: any) {
      toast({ title: "Failed to load departments", description: e instanceof ApiError ? e.message : "Department load failed", variant: "destructive" });
    } finally {
      setDeptLoading(false);
    }
  }

  React.useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!me || !branchId) return;

    if (me.roleScope === "GLOBAL") {
      try {
        localStorage.setItem(LS_BRANCH_FILTER, branchId);
      } catch {}
    }

    loadFacilities(branchId);

    // departments: default to ALL facilities (no filter)
    loadDepartments(branchId, deptFacilityFilter === "__ALL__" ? null : deptFacilityFilter);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, branchId]);

  React.useEffect(() => {
    if (!branchId) return;
    loadDepartments(branchId, deptFacilityFilter === "__ALL__" ? null : deptFacilityFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptFacilityFilter]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => {
      loadDepartments(branchId, deptFacilityFilter === "__ALL__" ? null : deptFacilityFilter);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptSearch]);

  function toggleFacility(id: string) {
    setSelectedFacilityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkSelect(cat: FacilityCategory, mode: "all" | "none") {
    const ids = facilitiesByCat[cat].map((x) => x.id);
    setSelectedFacilityIds((prev) => {
      const next = new Set(prev);
      if (mode === "all") ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  async function saveBranchFacilities() {
    if (!branchId) return;
    setSavingFacilities(true);
    try {
      const payload = { facilityIds: Array.from(selectedFacilityIds) };
      await apiFetch(`/branches/${branchId}/facilities`, { method: "PUT", body: JSON.stringify(payload) });
      toast({ title: "Facilities updated", description: "Branch facilities saved successfully." });
      await loadFacilities(branchId);

      // if current facility filter is now disabled, reset
      if (deptFacilityFilter !== "__ALL__" && !payload.facilityIds.includes(deptFacilityFilter)) {
        setDeptFacilityFilter("__ALL__");
      }
    } catch (e: any) {
      toast({ title: "Save failed", description: e instanceof ApiError ? e.message : "Failed to save facilities", variant: "destructive" });
    } finally {
      setSavingFacilities(false);
    }
  }

  function openCreateDept() {
    setDeptEditing(null);
    setDeptForm({ isActive: true, facilityId: enabledFacilities[0]?.id });
    setDeptModalOpen(true);
  }

  function openEditDept(d: Department) {
    setDeptEditing(d);
    setDeptForm({ ...d });
    setDeptModalOpen(true);
  }

  async function saveDept() {
    if (!branchId) return;

    try {
      const isEdit = Boolean(deptEditing);
      const facilityId = String(deptForm.facilityId ?? "").trim();

      if (!facilityId) {
        toast({ title: "Missing facility", description: "Select a facility for this department.", variant: "destructive" });
        return;
      }

      if (!enabledFacilities.some((f) => f.id === facilityId)) {
        toast({ title: "Facility not enabled", description: "Enable this facility for the branch first.", variant: "destructive" });
        return;
      }

      if (isEdit) {
        const payload: any = {
          name: String(deptForm.name ?? "").trim(),
          isActive: Boolean(deptForm.isActive),
        };
        await apiFetch(`/departments/${deptEditing!.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast({ title: "Department updated", description: payload.name || deptEditing!.name });
      } else {
        const payload: any = {
          branchId: me?.roleScope === "GLOBAL" ? branchId : undefined,
          facilityId,
          code: String(deptForm.code ?? "").trim().toUpperCase(),
          name: String(deptForm.name ?? "").trim(),
          isActive: Boolean(deptForm.isActive),
        };
        await apiFetch(`/departments`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Department created", description: `${payload.name} (${payload.code})` });
      }

      setDeptModalOpen(false);
      await loadDepartments(branchId, deptFacilityFilter === "__ALL__" ? null : deptFacilityFilter);
    } catch (e: any) {
      toast({ title: "Save failed", description: e instanceof ApiError ? e.message : "Department save failed", variant: "destructive" });
    }
  }

  async function openAssignDoctors(d: Department) {
    if (!branchId) return;
    setAssignDept(d);
    setAssignOpen(true);

    // initialize selection from current department
    const init = new Set(d.doctors.map((x) => x.staffId));
    setSelectedDoctorIds(init);
    setHodId(d.headStaff?.id ?? "");

    // load doctor list
    await loadDoctors(branchId, "");
  }

  async function loadDoctors(currentBranchId: string, q: string) {
    setDoctorLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("branchId", currentBranchId);
      if (q.trim()) qs.set("q", q.trim());
      const list = await apiFetch<Doctor[]>(`/staff/doctors?${qs.toString()}`);
      setDoctorRows(list);
    } catch (e: any) {
      toast({ title: "Failed to load doctors", description: e instanceof ApiError ? e.message : "Doctor list failed", variant: "destructive" });
    } finally {
      setDoctorLoading(false);
    }
  }

  async function saveAssignments() {
    if (!branchId || !assignDept) return;

    // enforce: HOD must be inside doctorIds, or empty
    if (hodId && !selectedDoctorIds.has(hodId)) {
      toast({ title: "Invalid HOD", description: "HOD must be one of the selected doctors.", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        doctorIds: Array.from(selectedDoctorIds),
        headStaffId: hodId ? hodId : null,
      };

      await apiFetch(`/departments/${assignDept.id}/doctors`, { method: "PUT", body: JSON.stringify(payload) });
      toast({ title: "Assignments updated", description: "Doctors and HOD saved." });
      setAssignOpen(false);

      await loadDepartments(branchId, deptFacilityFilter === "__ALL__" ? null : deptFacilityFilter);
    } catch (e: any) {
      toast({ title: "Save failed", description: e instanceof ApiError ? e.message : "Assignment save failed", variant: "destructive" });
    }
  }

  const filteredFacilityGroup = (cat: FacilityCategory) => {
    const list = facilitiesByCat[cat];
    const needle = facSearch.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((f) => `${f.code} ${f.name}`.toLowerCase().includes(needle));
  };

  return (
    <AppShell title="Branch Setup">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Branch → Facilities → Departments → Doctor Assignment</div>
            <h1 className="text-xl font-semibold">Branch Setup</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              {branchObj ? (
                <>
                  <span className="font-medium text-foreground">{branchObj.name}</span> · <span className="font-mono text-xs">{branchObj.code}</span> ·{" "}
                  <span>{branchObj.city}</span>
                </>
              ) : (
                <span>Select a branch to begin.</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {me?.roleScope === "GLOBAL" ? (
              <div className="min-w-[280px]">
                <label className="text-xs text-muted-foreground">Branch (Super Admin)</label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={branchId ?? ""}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <Button variant="outline" onClick={() => branchId && loadFacilities(branchId)} disabled={!branchId}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Facilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Facilities (Enable for this Branch)
            </CardTitle>
            <CardDescription>
              Select service facilities and clinical facilities available at this branch. Departments can be created only under enabled facilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl flex-1">
                <label className="text-xs text-muted-foreground">Search facilities</label>
                <Input value={facSearch} onChange={(e) => setFacSearch(e.target.value)} placeholder="Search by code or name…" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{selectedFacilityIds.size}</span>
                </div>
                <Button
                  variant="primary"
                  onClick={saveBranchFacilities}
                  disabled={!branchId || savingFacilities || !facilitiesDirty}
                  title={facilitiesDirty ? "Save changes" : "No changes"}
                >
                  <Save className="h-4 w-4" />
                  Save Facilities
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid gap-4 lg:grid-cols-2">
              {(["SERVICE", "CLINICAL"] as FacilityCategory[]).map((cat) => {
                const list = filteredFacilityGroup(cat);
                return (
                  <div key={cat} className="rounded-xl border bg-card">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cx("rounded-full border px-2 py-0.5 text-xs", badgeTone(cat))}>{groupLabel(cat)}</span>
                        <span className="text-xs text-muted-foreground">{list.length} items</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => bulkSelect(cat, "all")}>
                          Select all
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => bulkSelect(cat, "none")}>
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-[360px] overflow-auto p-3">
                      {list.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">No facilities match your search.</div>
                      ) : (
                        <div className="space-y-2">
                          {list.map((f) => {
                            const checked = selectedFacilityIds.has(f.id);
                            return (
                              <label
                                key={f.id}
                                className={cx(
                                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 hover:bg-muted/30",
                                  checked && "border-emerald-500/30"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4"
                                  checked={checked}
                                  onChange={() => toggleFacility(f.id)}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium">{f.name}</div>
                                    {checked ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                                        <Check className="h-3 w-3" /> Enabled
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-0.5 font-mono text-xs text-muted-foreground">{f.code}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {facilitiesDirty ? (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                You have unsaved facility changes for this branch. Click <span className="font-semibold">Save Facilities</span>.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Departments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Departments (Under Enabled Facilities)
            </CardTitle>
            <CardDescription>Create departments under enabled facilities. Assign one or more doctors and select Head of Department (HOD).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">Facility filter</label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={deptFacilityFilter}
                    onChange={(e) => setDeptFacilityFilter(e.target.value)}
                    disabled={!branchId}
                  >
                    <option value="__ALL__">All enabled facilities</option>
                    {enabledFacilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Search departments</label>
                  <Input value={deptSearch} onChange={(e) => setDeptSearch(e.target.value)} placeholder="Search by code or name…" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => branchId && loadDepartments(branchId, deptFacilityFilter === "__ALL__" ? null : deptFacilityFilter)}
                  disabled={!branchId}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button onClick={openCreateDept} disabled={!branchId || enabledFacilities.length === 0}>
                  <Plus className="h-4 w-4" />
                  New Department
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            {enabledFacilities.length === 0 ? (
              <div className="rounded-lg border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                Enable at least one facility above before creating departments.
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left">Code</th>
                      <th className="px-3 py-2 text-left">Department</th>
                      <th className="px-3 py-2 text-left">Facility</th>
                      <th className="px-3 py-2 text-left">HOD</th>
                      <th className="px-3 py-2 text-left">Doctors</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptLoading ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                          Loading...
                        </td>
                      </tr>
                    ) : deptRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                          No departments found.
                        </td>
                      </tr>
                    ) : (
                      deptRows.map((d) => {
                        const doctorCount = d.doctors?.length ?? 0;
                        return (
                          <tr key={d.id} className="border-b hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono text-xs">{d.code}</td>
                            <td className="px-3 py-2 font-medium">{d.name}</td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{d.facility?.name}</div>
                              <div className="text-xs text-muted-foreground">{d.facility?.category}</div>
                            </td>
                            <td className="px-3 py-2">
                              {d.headStaff ? (
                                <div>
                                  <div className="font-medium">{d.headStaff.name}</div>
                                  <div className="text-xs text-muted-foreground">{d.headStaff.designation ?? "HOD"}</div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded-full border bg-muted/20 px-2 py-0.5 text-xs">{doctorCount} assigned</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={d.isActive ? "text-emerald-600" : "text-zinc-500"}>{d.isActive ? "ACTIVE" : "INACTIVE"}</span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditDept(d)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openAssignDoctors(d)}>
                                  <Users className="h-3.5 w-3.5" />
                                  Assign Doctors
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Create/Edit Modal */}
        <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{deptEditing ? "Edit Department" : "New Department"}</DialogTitle>
              <DialogDescription>
                {deptEditing
                  ? "Update department details. Note that Facility and Code cannot be changed."
                  : "Create a new department under an enabled facility."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2 py-4">
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Facility</label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={String(deptForm.facilityId ?? "")}
                  onChange={(e) => setDeptForm((p) => ({ ...p, facilityId: e.target.value }))}
                  disabled={Boolean(deptEditing)}
                  title={deptEditing ? "Facility cannot be changed after creation" : "Select facility"}
                >
                  {enabledFacilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.category})
                    </option>
                  ))}
                </select>
                {deptEditing ? <div className="mt-1 text-xs text-muted-foreground">Facility is locked after creation.</div> : null}
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Code</label>
                <Input
                  value={String(deptForm.code ?? "")}
                  onChange={(e) => setDeptForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder="CARDIO_OPD"
                  disabled={Boolean(deptEditing)}
                />
                {deptEditing ? <div className="mt-1 text-xs text-muted-foreground">Code is locked after creation.</div> : null}
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <Input value={String(deptForm.name ?? "")} onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))} placeholder="Cardiology OPD" />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={deptForm.isActive ? "ACTIVE" : "INACTIVE"}
                  onChange={(e) => setDeptForm((p) => ({ ...p, isActive: e.target.value === "ACTIVE" }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeptModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveDept}>{deptEditing ? "Save Changes" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Doctor Assignment Modal */}
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{assignDept ? `Assign Doctors — ${assignDept.name}` : "Assign Doctors"}</DialogTitle>
              <DialogDescription>
                Search for doctors and assign them to this department. You can also designate a Head of Department (HOD).
              </DialogDescription>
            </DialogHeader>

            {!assignDept ? (
              <div className="text-sm text-muted-foreground py-6">Select a department.</div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <label className="text-xs text-muted-foreground">Search doctors</label>
                    <div className="mt-1 flex gap-2">
                      <Input value={doctorQ} onChange={(e) => setDoctorQ(e.target.value)} placeholder="Search doctor name / emp code / designation…" />
                      <Button
                        variant="outline"
                        onClick={() => branchId && loadDoctors(branchId, doctorQ)}
                        disabled={!branchId}
                        title="Search"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Search
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Selected: <span className="font-medium text-foreground">{selectedDoctorIds.size}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Head of Department (HOD)</label>
                    <select
                      className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={hodId}
                      onChange={(e) => setHodId(e.target.value)}
                    >
                      <option value="">No HOD</option>
                      {Array.from(selectedDoctorIds).map((id) => {
                        const doc = doctorRows.find((x) => x.id === id) || assignDept.doctors.find((x) => x.staffId === id)?.staff;
                        const label = doc ? `${doc.name}${doc.specialty?.name ? ` — ${doc.specialty.name}` : ""}` : id;
                        return (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    <div className="mt-1 text-xs text-muted-foreground">HOD must be one of the selected doctors.</div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border bg-card">
                    <div className="border-b px-4 py-3 text-sm font-semibold">Available Doctors</div>
                    <div className="max-h-[420px] overflow-auto p-3">
                      {doctorLoading ? (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">Loading…</div>
                      ) : doctorRows.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">No doctors found.</div>
                      ) : (
                        <div className="space-y-2">
                          {doctorRows.map((doc) => {
                            const checked = selectedDoctorIds.has(doc.id);
                            return (
                              <label
                                key={doc.id}
                                className={cx(
                                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 hover:bg-muted/30",
                                  checked && "border-emerald-500/30"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4"
                                  checked={checked}
                                  onChange={() => {
                                    setSelectedDoctorIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(doc.id)) {
                                        next.delete(doc.id);
                                        if (hodId === doc.id) setHodId(""); // auto-clear HOD if removed
                                      } else {
                                        next.add(doc.id);
                                      }
                                      return next;
                                    });
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium">{doc.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {doc.empCode ? `${doc.empCode} · ` : ""}
                                    {doc.designation ?? "Doctor"}
                                    {doc.specialty?.name ? ` · ${doc.specialty.name}` : ""}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card">
                    <div className="border-b px-4 py-3 text-sm font-semibold">Currently Selected</div>
                    <div className="max-h-[420px] overflow-auto p-3">
                      {selectedDoctorIds.size === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">No doctors selected.</div>
                      ) : (
                        <div className="space-y-2">
                          {Array.from(selectedDoctorIds).map((id) => {
                            const doc =
                              doctorRows.find((x) => x.id === id) || assignDept.doctors.find((x) => x.staffId === id)?.staff || null;
                            const isHod = hodId === id;
                            return (
                              <div key={id} className={cx("rounded-lg border px-3 py-2", isHod && "border-emerald-500/30")}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-medium">{doc?.name ?? id}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {doc?.specialty?.name ? doc.specialty.name : doc?.designation ?? "Doctor"}
                                    </div>
                                  </div>
                                  {isHod ? (
                                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                                      HOD
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Tip: Assign doctors first, then choose the HOD from the dropdown.
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveAssignments} disabled={!assignDept}>
                Save Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}