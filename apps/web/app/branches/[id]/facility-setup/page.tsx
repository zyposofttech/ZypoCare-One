"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  Wrench,
  X,
  Link2,
  Star,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type FacilityCategory = "CLINICAL" | "SERVICE" | "SUPPORT";

type FacilityCatalog = {
  id: string;
  code: string;
  name: string;
  category: FacilityCategory;
  isActive: boolean;
  sortOrder: number;
};

type BranchFacility = {
  id: string;
  branchId: string;
  facilityId: string;
  enabledAt: string;
  facility: Pick<FacilityCatalog, "id" | "code" | "name" | "category">;
};

type DepartmentSpecialtyLink = {
  specialtyId: string;
  isPrimary: boolean;
  specialty: { id: string; code: string; name: string; isActive: boolean };
};

type Department = {
  id: string;
  branchId: string;
  facilityId: string;
  facility: { id: string; code: string; name: string; category: FacilityCategory };
  code: string;
  name: string;
  isActive: boolean;
  // Backward/forward compatible: old API may return `specialties`, new API may return `departmentSpecialties`
  specialties?: DepartmentSpecialtyLink[];
  departmentSpecialties?: DepartmentSpecialtyLink[];
  createdAt: string;
  updatedAt: string;
};

type Specialty = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Backend shape compatibility:
// - Legacy/flat: [ { specialtyId, isPrimary, specialty } ]
// - Current: { department: {...}, items: [ { specialtyId, isPrimary, specialty, ... } ] }
type DeptSpecialtiesItem = {
  specialtyId: string;
  isPrimary: boolean;
  specialty: { id: string; code: string; name: string; isActive: boolean };
};

type DeptSpecialtiesResponse =
  | DeptSpecialtiesItem[]
  | {
      department?: any;
      items?: DeptSpecialtiesItem[];
    }
  | any;

/* ----------------------------- Small UI Helpers ----------------------------- */

type Tone = "indigo" | "emerald" | "cyan" | "amber" | "zinc" | "rose";

const pillTones: Record<Tone, string> = {
  indigo:
    "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  cyan: "border-cyan-200/70 bg-cyan-50/70 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
  zinc: "border-zc-border bg-zc-panel/20 text-zc-text",
  rose: "border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200",
};

function MetricPill(props: { label: string; value: React.ReactNode; tone: Tone; icon?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", pillTones[props.tone])}>
      {props.icon ? <span className="grid place-items-center">{props.icon}</span> : null}
      <span className="font-medium">{props.label}</span>
      <span className="text-zc-muted/70">•</span>
      <span className="font-mono font-semibold">{props.value}</span>
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

function SoftCheckbox(props: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      className={cn(
        "grid h-5 w-5 place-items-center rounded-md border transition-all",
        "border-zc-border bg-zc-panel/30",
        props.checked && "border-[rgb(var(--zc-accent-rgb)/0.55)] bg-[rgb(var(--zc-accent-rgb)/0.18)]",
        props.disabled && "opacity-50",
      )}
    >
      {props.checked ? <Check className="h-4 w-4 text-[rgb(var(--zc-accent))]" /> : null}
    </span>
  );
}

function scoreLabel(score: number): { label: string; tone: Tone; icon: React.ReactNode } {
  if (score >= 90) return { label: "Go-Live Ready", tone: "emerald", icon: <Sparkles className="h-4 w-4" /> };
  if (score >= 70) return { label: "Nearly Ready", tone: "indigo", icon: <Check className="h-4 w-4" /> };
  if (score >= 45) return { label: "Needs Setup", tone: "amber", icon: <Wrench className="h-4 w-4" /> };
  return { label: "Blocked", tone: "rose", icon: <AlertTriangle className="h-4 w-4" /> };
}

function groupFacilities(items: FacilityCatalog[]) {
  const groups: Record<FacilityCategory, FacilityCatalog[]> = { CLINICAL: [], SERVICE: [], SUPPORT: [] };
  for (const f of items) groups[f.category]?.push(f);
  for (const k of Object.keys(groups) as FacilityCategory[]) {
    groups[k] = groups[k]
      .slice()
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name));
  }
  return groups;
}

function toggleAllInCategory(args: {
  categoryItems: FacilityCatalog[];
  enabledIds: string[];
  setEnabledIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const activeIds = args.categoryItems.filter((f) => f.isActive).map((f) => f.id);
  const enabledSet = new Set(args.enabledIds);
  const allSelected = activeIds.length > 0 && activeIds.every((id) => enabledSet.has(id));

  args.setEnabledIds((prev) => {
    const s = new Set(prev);
    if (allSelected) for (const id of activeIds) s.delete(id);
    else for (const id of activeIds) s.add(id);
    return Array.from(s);
  });

  return !allSelected;
}

/* ----------------------------- Modal Shell ----------------------------- */

function ModalShell({
  title,
  description,
  children,
  onClose,
  maxW = "max-w-2xl",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  maxW?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-in fade-in duration-200">
      <div
        className={cn(
          "w-full rounded-2xl border border-zc-border bg-zc-card shadow-elev-2 animate-in zoom-in-95 duration-200",
          maxW,
        )}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-zc-text">{title}</div>
              {description ? <div className="mt-1 text-sm text-zc-muted">{description}</div> : null}
            </div>

            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zc-border bg-zc-panel/25 text-zc-muted hover:bg-zc-panel hover:text-zc-text transition-colors"
              aria-label="Close"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Wizard ----------------------------- */

type StepId = "facilities" | "departments" | "specialties" | "mapping" | "review";

const steps: Array<{ id: StepId; title: string; subtitle: string }> = [
  { id: "facilities", title: "Enable facilities", subtitle: "Choose what this branch offers" },
  { id: "departments", title: "Create departments", subtitle: "Departments under enabled facilities" },
  { id: "specialties", title: "Specialties catalog", subtitle: "Branch-level specialty master list" },
  { id: "mapping", title: "Map specialties", subtitle: "Department ↔ Specialty mapping + Primary" },
  { id: "review", title: "Review & finish", subtitle: "Validate setup completeness (Super Admin scope)" },
];

function Stepper(props: { step: StepId; onGo: (s: StepId) => void }) {
  const idx = steps.findIndex((s) => s.id === props.step);

  return (
    <div className="rounded-2xl border border-zc-border bg-zc-card shadow-elev-1 overflow-hidden">
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zc-text">{steps[idx]?.title}</div>
            <div className="mt-1 text-sm text-zc-muted">{steps[idx]?.subtitle}</div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zc-muted">
            <span className="rounded-full border border-zc-border bg-zc-panel/20 px-3 py-1">
              Step <span className="font-semibold text-zc-text">{idx + 1}</span> of{" "}
              <span className="font-semibold text-zc-text">{steps.length}</span>
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-2">
          {steps.map((s, i) => {
            const active = s.id === props.step;
            const done = i < idx;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => props.onGo(s.id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition-all",
                  "border-zc-border bg-zc-panel/16 hover:bg-zc-panel/24",
                  active &&
                    "border-[rgb(var(--zc-accent-rgb)/0.55)] bg-[rgb(var(--zc-accent-rgb)/0.18)] shadow-elev-2",
                  done && !active && "bg-emerald-50/40 dark:bg-emerald-900/10",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn("text-sm font-semibold", active ? "text-[rgb(var(--zc-accent))]" : "text-zc-text")}>
                    {i + 1}. {s.title}
                  </div>
                  {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" /> : null}
                </div>
                <div className="mt-1 text-xs text-zc-muted">{s.subtitle}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function BranchFacilitySetupWizardPage() {
  const { toast } = useToast();
  const params = useParams();
  const branchId = (params?.branchId ?? params?.id) as string;

  const [step, setStep] = React.useState<StepId>("facilities");

  const [loading, setLoading] = React.useState(true);
  const [savingFacilities, setSavingFacilities] = React.useState(false);

  const [catalog, setCatalog] = React.useState<FacilityCatalog[]>([]);
  const [enabledRows, setEnabledRows] = React.useState<BranchFacility[]>([]);
  const [enabledIds, setEnabledIds] = React.useState<string[]>([]);
  const enabledSet = React.useMemo(() => new Set(enabledIds), [enabledIds]);

  // Facilities UX
  const [facilityCat, setFacilityCat] = React.useState<FacilityCategory>("CLINICAL");
  const [facilityQ, setFacilityQ] = React.useState("");

  // Departments
  const [deptQ, setDeptQ] = React.useState("");
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [deptOpen, setDeptOpen] = React.useState(false);
  const [deptMode, setDeptMode] = React.useState<"create" | "edit">("create");
  const [deptForm, setDeptForm] = React.useState({
    id: "",
    facilityId: "",
    code: "",
    name: "",
    isActive: true,
  });

  // Specialties
  const [specQ, setSpecQ] = React.useState("");
  const [specialties, setSpecialties] = React.useState<Specialty[]>([]);
  const [specOpen, setSpecOpen] = React.useState(false);
  const [specMode, setSpecMode] = React.useState<"create" | "edit">("create");
  const [specForm, setSpecForm] = React.useState({
    id: "",
    code: "",
    name: "",
    isActive: true,
  });

  // Mapping modal
  const [mapOpen, setMapOpen] = React.useState(false);
  const [mapDept, setMapDept] = React.useState<Department | null>(null);
  const [mapLoading, setMapLoading] = React.useState(false);
  const [mapQ, setMapQ] = React.useState("");
  const [selectedSpecIds, setSelectedSpecIds] = React.useState<string[]>([]);
  const [primarySpecId, setPrimarySpecId] = React.useState<string | null>(null);

  const facilitiesByCat = React.useMemo(() => groupFacilities(catalog), [catalog]);

  // Backward/forward compatible access to Department ↔ Specialty mappings
  const deptLinks = React.useCallback((d: Department): DepartmentSpecialtyLink[] => {
    return (d.specialties ?? d.departmentSpecialties ?? []) as DepartmentSpecialtyLink[];
  }, []);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const [cat, enabled, depts, specs] = await Promise.all([
        apiFetch<FacilityCatalog[]>("/api/facilities/master?includeInactive=true"),
        apiFetch<BranchFacility[]>(`/api/branches/${branchId}/facilities`),
        apiFetch<Department[]>(`/api/departments?branchId=${branchId}&includeInactive=true&includeMappings=true`),
        apiFetch<Specialty[]>(`/api/specialties?branchId=${branchId}&includeInactive=true`),
      ]);

      setCatalog(cat ?? []);
      setEnabledRows(enabled ?? []);
      setEnabledIds((enabled ?? []).map((x) => x.facilityId));
      setDepartments(depts ?? []);
      setSpecialties(specs ?? []);
    } catch (e: any) {
      toast({
        title: "Failed to load setup data",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [branchId, toast]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  /* ----------------------------- Facilities actions ----------------------------- */

  const savedFacilityIds = React.useMemo(
    () => (enabledRows ?? []).map((x) => x.facilityId).slice().sort(),
    [enabledRows],
  );
  const currentFacilityIds = React.useMemo(() => enabledIds.slice().sort(), [enabledIds]);
  const facilitiesDirty = React.useMemo(
    () => savedFacilityIds.join("|") !== currentFacilityIds.join("|"),
    [savedFacilityIds, currentFacilityIds],
  );

  const saveFacilities = async () => {
    setSavingFacilities(true);
    try {
      await apiFetch(`/api/branches/${branchId}/facilities`, {
        method: "PUT",
        body: JSON.stringify({ facilityIds: enabledIds }),
      });
      toast({ title: "Facilities updated", description: `${enabledIds.length} enabled for this branch` });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSavingFacilities(false);
    }
  };

  /* ----------------------------- Department modal actions ----------------------------- */

  const openCreateDept = () => {
    const enabledFacilityList = catalog.filter((f) => enabledSet.has(f.id) && f.isActive);
    setDeptMode("create");
    setDeptForm({
      id: "",
      facilityId: enabledFacilityList[0]?.id ?? "",
      code: "",
      name: "",
      isActive: true,
    });
    setDeptOpen(true);
  };

  const openEditDept = (d: Department) => {
    setDeptMode("edit");
    setDeptForm({
      id: d.id,
      facilityId: d.facilityId,
      code: d.code,
      name: d.name,
      isActive: d.isActive,
    });
    setDeptOpen(true);
  };

  const saveDepartment = async () => {
    try {
      if (!deptForm.facilityId) throw new Error("Please select a facility.");
      if (!deptForm.code.trim()) throw new Error("Department code is required.");
      if (!deptForm.name.trim()) throw new Error("Department name is required.");

      if (deptMode === "create") {
        await apiFetch("/api/departments", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            facilityId: deptForm.facilityId,
            code: deptForm.code.trim().toUpperCase(),
            name: deptForm.name.trim(),
            isActive: deptForm.isActive,
          }),
        });
        toast({ title: "Department created", description: deptForm.name });
      } else {
        await apiFetch(`/api/departments/${deptForm.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: deptForm.name.trim(),
            isActive: deptForm.isActive,
          }),
        });
        toast({ title: "Department updated", description: deptForm.name });
      }

      setDeptOpen(false);
      await loadAll();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  };

  /* ----------------------------- Specialties modal actions ----------------------------- */

  const openCreateSpec = () => {
    setSpecMode("create");
    setSpecForm({ id: "", code: "", name: "", isActive: true });
    setSpecOpen(true);
  };

  const openEditSpec = (s: Specialty) => {
    setSpecMode("edit");
    setSpecForm({
      id: s.id,
      code: s.code,
      name: s.name,
      isActive: s.isActive,
    });
    setSpecOpen(true);
  };

  const saveSpecialty = async () => {
    try {
      if (!specForm.code.trim()) throw new Error("Specialty code is required.");
      if (!specForm.name.trim()) throw new Error("Specialty name is required.");

      if (specMode === "create") {
        await apiFetch("/api/specialties", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            code: specForm.code.trim().toUpperCase(),
            name: specForm.name.trim(),
            isActive: specForm.isActive,
          }),
        });
        toast({ title: "Specialty created", description: specForm.name });
      } else {
        await apiFetch(`/api/specialties/${specForm.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: specForm.name.trim(),
            isActive: specForm.isActive,
          }),
        });
        toast({ title: "Specialty updated", description: specForm.name });
      }

      setSpecOpen(false);
      await loadAll();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  };

  /* ----------------------------- Mapping actions ----------------------------- */

  const openMapping = async (d: Department) => {
    setMapDept(d);
    setMapQ("");
    setSelectedSpecIds([]);
    setPrimarySpecId(null);
    setMapOpen(true);

    setMapLoading(true);
    try {
      const raw = await apiFetch<DeptSpecialtiesResponse>(`/api/departments/${d.id}/specialties`);

      // Normalize response to an array of mapping items.
      // Backend may return either:
      //  - an array (legacy)
      //  - { department, items: [...] } (current)
      //  - { data/items: [...] } (future wrappers)
      const rows: DeptSpecialtiesItem[] = Array.isArray(raw)
        ? (raw as any)
        : Array.isArray((raw as any)?.items)
          ? ((raw as any).items as any)
          : Array.isArray((raw as any)?.data)
            ? ((raw as any).data as any)
            : [];

      const ids = rows.map((x) => x.specialtyId);
      const primary = rows.find((x) => x.isPrimary)?.specialtyId ?? null;
      setSelectedSpecIds(ids);
      setPrimarySpecId(primary);
    } catch (e: any) {
      toast({ title: "Failed to load mapping", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setMapLoading(false);
    }
  };

  const saveMapping = async () => {
    if (!mapDept) return;
    try {
      if (primarySpecId && !selectedSpecIds.includes(primarySpecId)) {
        throw new Error("Primary specialty must be selected from the mapped specialties.");
      }

      await apiFetch(`/api/departments/${mapDept.id}/specialties`, {
        method: "PUT",
        body: JSON.stringify({ specialtyIds: selectedSpecIds, primarySpecialtyId: primarySpecId }),
      });

      toast({ title: "Mapping updated", description: mapDept.name });
      setMapOpen(false);
      setMapDept(null);
      await loadAll();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  };

  /* ----------------------------- Derived ----------------------------- */

  const enabledCount = savedFacilityIds.length; // saved state
  const activeDepartments = React.useMemo(() => departments.filter((d) => d.isActive), [departments]);
  const activeSpecialties = React.useMemo(() => specialties.filter((s) => s.isActive), [specialties]);

  const unmappedActiveDeptCount = React.useMemo(() => {
    const hasActiveSpec = (d: Department) =>
      deptLinks(d).some((x) => (x.specialty?.isActive ?? true) === true);
    return activeDepartments.filter((d) => !hasActiveSpec(d)).length;
  }, [activeDepartments, deptLinks]);

  const mappedActiveDeptCount = activeDepartments.length - unmappedActiveDeptCount;

  const setupScore = React.useMemo(() => {
    const a = enabledCount > 0 ? 25 : 0;
    const b = activeDepartments.length > 0 ? 25 : 0;
    const c = activeSpecialties.length > 0 ? 25 : 0;
    const d = activeDepartments.length > 0 && unmappedActiveDeptCount === 0 ? 25 : 0;
    return a + b + c + d;
  }, [enabledCount, activeDepartments.length, activeSpecialties.length, unmappedActiveDeptCount]);

  const setupScoreMeta = scoreLabel(setupScore);

  const blockers = React.useMemo(() => {
    const b: string[] = [];
    if (enabledCount === 0) b.push("No facilities enabled.");
    if (activeDepartments.length === 0) b.push("No active departments created.");
    if (activeSpecialties.length === 0) b.push("No active specialties created.");
    if (activeDepartments.length > 0 && unmappedActiveDeptCount > 0) b.push("Some departments have no specialty mapping.");
    return b;
  }, [enabledCount, activeDepartments.length, activeSpecialties.length, unmappedActiveDeptCount]);

  const warnings = React.useMemo(() => {
    const w: string[] = [];
    const inactiveMapped = activeDepartments.some((d) => deptLinks(d).some((x) => x.specialty?.isActive === false));
    if (inactiveMapped) w.push("Some departments are mapped to inactive specialties. Consider cleanup.");
    return w;
  }, [activeDepartments, deptLinks]);

  const selectedCatList = facilitiesByCat[facilityCat] ?? [];
  const selectedCatListFiltered = React.useMemo(() => {
    const q = facilityQ.trim().toLowerCase();
    if (!q) return selectedCatList;
    return selectedCatList.filter((f) => f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q));
  }, [selectedCatList, facilityQ]);

  const activeIdsInCat = React.useMemo(
    () => (selectedCatList ?? []).filter((f) => f.isActive).map((f) => f.id),
    [selectedCatList],
  );
  const allActiveSelectedInCat = activeIdsInCat.length > 0 && activeIdsInCat.every((id) => enabledSet.has(id));
  const selectedCountInCat = (selectedCatList ?? []).filter((f) => enabledSet.has(f.id)).length;

  const filteredDepartments = React.useMemo(() => {
    const q = deptQ.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.facility?.name ?? "").toLowerCase().includes(q),
    );
  }, [departments, deptQ]);

  const filteredSpecialties = React.useMemo(() => {
    const q = specQ.trim().toLowerCase();
    if (!q) return specialties;
    return specialties.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }, [specialties, specQ]);

  const stepIndex = steps.findIndex((x) => x.id === step);
  const prevStep = stepIndex > 0 ? steps[stepIndex - 1].id : null;
  const nextStep = stepIndex < steps.length - 1 ? steps[stepIndex + 1].id : null;

  const canProceedFacilities = enabledCount > 0 && !facilitiesDirty;
  const canProceedDepartments = activeDepartments.length > 0;
  const canProceedSpecialties = activeSpecialties.length > 0;
  const canProceedMapping = activeDepartments.length > 0 && activeSpecialties.length > 0;
  const canFinish = blockers.length === 0;

  const canNext =
    step === "facilities"
      ? canProceedFacilities
      : step === "departments"
        ? canProceedDepartments
        : step === "specialties"
          ? canProceedSpecialties
          : step === "mapping"
            ? canProceedMapping
            : step === "review"
              ? canFinish
              : false;

  /* ----------------------------- Render ----------------------------- */

  return (
    <AppShell title="Facility Setup Wizard">
      <RequirePerm perm="BRANCH_FACILITY_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-900/20">
                <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              </span>

              <div className="min-w-0">
                <div className="text-sm text-zc-muted">
                  <Link href="/branches" className="hover:underline">
                    Branches
                  </Link>
                  <span className="mx-2 text-zc-muted/60">/</span>
                  <span className="text-zc-text">Facility Setup Wizard</span>
                </div>

                <div className="mt-1 text-3xl font-semibold tracking-tight text-zc-text">
                  {loading ? <Skeleton className="h-9 w-72" /> : "Branch Setup"}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zc-muted">
                  <span className="rounded-md border border-zc-border bg-zc-panel/25 px-2 py-0.5 font-mono text-[12px] text-zc-text">
                    {branchId}
                  </span>
                  <span className="text-zc-muted/60">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Wrench className="h-4 w-4" /> Super Admin: Facilities → Departments → Specialties → Mapping
                  </span>
                </div>

                {!loading ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetricPill label="Enabled Facilities" value={enabledCount} tone="indigo" icon={<Layers className="h-3.5 w-3.5" />} />
                    <MetricPill label="Departments" value={activeDepartments.length} tone="emerald" icon={<Layers className="h-3.5 w-3.5" />} />
                    <MetricPill label="Specialties" value={activeSpecialties.length} tone="cyan" icon={<Stethoscope className="h-3.5 w-3.5" />} />
                    <MetricPill label="Mapped Depts" value={`${mappedActiveDeptCount}/${activeDepartments.length}`} tone="amber" icon={<Link2 className="h-3.5 w-3.5" />} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void loadAll()} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
              Refresh
            </Button>

            <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm", pillTones[setupScoreMeta.tone])}>
              {setupScoreMeta.icon}
              <span className="font-semibold">{setupScoreMeta.label}</span>
              <span className="text-zc-muted/70">•</span>
              <span className="font-mono">{setupScore}/100</span>
            </span>
          </div>
        </div>

        <Stepper step={step} onGo={setStep} />
        <Separator />

        {/* Step: Facilities */}
        {step === "facilities" ? (
          <div className="rounded-2xl border border-zc-border bg-zc-card shadow-elev-1 overflow-hidden">
            <div className="p-4 md:p-5 border-b border-zc-border">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">Enable facilities for this branch</div>
                  <div className="mt-1 text-sm text-zc-muted">
                    Select facilities and <span className="font-semibold text-zc-text">Save</span> before continuing.
                  </div>

                  {facilitiesDirty ? (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      <div className="min-w-0">You have unsaved facility changes. Save to proceed.</div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <MetricPill label="Selected" value={enabledIds.length} tone="indigo" />
                  <Button
                    variant="outline"
                    onClick={() => setEnabledIds(savedFacilityIds)}
                    disabled={!facilitiesDirty || savingFacilities}
                    title="Revert to saved selection"
                  >
                    Revert
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEnabledIds([])}
                    disabled={enabledIds.length === 0 || savingFacilities}
                    title="Clear selection (then Save)"
                  >
                    Clear
                  </Button>
                  <Button className="gap-2" onClick={() => void saveFacilities()} disabled={savingFacilities}>
                    {savingFacilities ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save facilities
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {/* Segmented switch */}
                <div className="inline-flex rounded-2xl border border-zc-border bg-zc-panel/20 p-1">
                  {([
                    { id: "CLINICAL", label: "Clinical", icon: <Stethoscope className="h-4 w-4" /> },
                    { id: "SERVICE", label: "Service", icon: <Wrench className="h-4 w-4" /> },
                    { id: "SUPPORT", label: "Support", icon: <Layers className="h-4 w-4" /> },
                  ] as Array<{ id: FacilityCategory; label: string; icon: React.ReactNode }>).map((c) => {
                    const active = facilityCat === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFacilityCat(c.id)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                          active
                            ? "bg-[rgb(var(--zc-accent-rgb)/0.18)] text-[rgb(var(--zc-accent))] shadow-elev-1 border border-[rgb(var(--zc-accent-rgb)/0.45)]"
                            : "text-zc-text hover:bg-zc-panel/25",
                        )}
                      >
                        <span className={cn("opacity-90", active ? "text-[rgb(var(--zc-accent))]" : "text-zc-muted")}>
                          {c.icon}
                        </span>
                        {c.label}
                        <span className="ml-1 rounded-full border border-zc-border bg-zc-panel/25 px-2 py-0.5 text-[11px] font-mono text-zc-muted">
                          {(facilitiesByCat[c.id] ?? []).length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full md:w-[360px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zc-muted" />
                    <Input
                      value={facilityQ}
                      onChange={(e) => setFacilityQ(e.target.value)}
                      placeholder="Search facilities by name or code…"
                      className="pl-9"
                    />
                  </div>

                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => toggleAllInCategory({ categoryItems: selectedCatList, enabledIds, setEnabledIds })}
                    disabled={selectedCatList.filter((f) => f.isActive).length === 0}
                    title={allActiveSelectedInCat ? "Deselect all active facilities in this category" : "Select all active facilities in this category"}
                  >
                    {allActiveSelectedInCat ? "Deselect all" : "Select all"}
                    <span className="rounded-full border border-zc-border bg-zc-panel/25 px-2 py-0.5 text-[11px] font-mono text-zc-muted">
                      {selectedCountInCat}
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5">
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {selectedCatListFiltered.map((f) => {
                    const checked = enabledSet.has(f.id);
                    const disabled = !f.isActive;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (disabled) return;
                          setEnabledIds((prev) => {
                            const s = new Set(prev);
                            if (s.has(f.id)) s.delete(f.id);
                            else s.add(f.id);
                            return Array.from(s);
                          });
                        }}
                        className={cn(
                          "group flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                          "border-zc-border bg-zc-panel/10 hover:bg-zc-panel/18",
                          checked && "border-[rgb(var(--zc-accent-rgb)/0.55)] bg-[rgb(var(--zc-accent-rgb)/0.18)] shadow-elev-2",
                          disabled && "opacity-55 cursor-not-allowed hover:bg-zc-panel/10",
                        )}
                      >
                        <SoftCheckbox checked={checked} disabled={disabled} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className={cn("truncate text-sm font-semibold", checked ? "text-[rgb(var(--zc-accent))]" : "text-zc-text")}>
                              {f.name}
                            </div>
                            <span className="rounded-md border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] font-mono text-zc-muted">
                              {f.code}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-zc-muted">
                            {disabled ? (
                              <span className="inline-flex items-center gap-1">
                                <X className="h-3.5 w-3.5" /> Inactive
                              </span>
                            ) : checked ? (
                              <span className="inline-flex items-center gap-1">
                                <Check className="h-3.5 w-3.5 text-[rgb(var(--zc-accent))]" /> Selected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <ChevronRight className="h-3.5 w-3.5" /> Click to select
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {!loading && selectedCatListFiltered.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-zc-border bg-zc-panel/12 p-4 text-sm text-zc-muted">
                  No facilities match your search in this category.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Step: Departments */}
        {step === "departments" ? (
          <div className="rounded-2xl border border-zc-border bg-zc-card shadow-elev-1 overflow-hidden">
            <div className="p-4 md:p-5 border-b border-zc-border">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">Departments</div>
                  <div className="mt-1 text-sm text-zc-muted">Create departments under enabled facilities.</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-[320px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zc-muted" />
                    <Input value={deptQ} onChange={(e) => setDeptQ(e.target.value)} placeholder="Search departments…" className="pl-9" />
                  </div>
                  <Button
                    onClick={openCreateDept}
                    disabled={enabledCount === 0}
                    className="gap-2"
                    title={enabledCount === 0 ? "Enable facilities first (and Save)" : "Create a department"}
                  >
                    <Layers className="h-4 w-4" />
                    Create department
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5">
              {loading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-2xl" />
                  ))}
                </div>
              ) : filteredDepartments.length === 0 ? (
                <div className="rounded-2xl border border-zc-border bg-zc-panel/12 p-4 text-sm text-zc-muted">
                  No departments found. Create one to continue.
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredDepartments.map((d) => {
                    const mapped = deptLinks(d).filter((x) => x.specialty?.isActive !== false);
                    const primary = deptLinks(d).find((x) => x.isPrimary)?.specialty;
                    return (
                      <div key={d.id} className="rounded-2xl border border-zc-border bg-zc-panel/10 p-4 hover:bg-zc-panel/16 transition-all">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-zc-text">{d.name}</div>
                              <span className="rounded-md border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] font-mono text-zc-muted">{d.code}</span>
                              <span className="rounded-md border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] text-zc-muted">
                                {d.facility?.name ?? "Facility"}
                              </span>
                              {!d.isActive ? (
                                <span className="rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] text-zc-muted">
                                  Inactive
                                </span>
                              ) : null}

                              <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", mapped.length ? pillTones.emerald : pillTones.amber)}>
                                {mapped.length ? `${mapped.length} specialties` : "No specialties"}
                              </span>

                              {primary ? (
                                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]", pillTones.cyan)}>
                                  <Star className="h-3.5 w-3.5" />
                                  Primary: {primary.name}
                                </span>
                              ) : null}
                            </div>

                            {mapped.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {mapped.slice(0, 4).map((x) => (
                                  <span
                                    key={x.specialtyId}
                                    className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]", pillTones.zinc)}
                                    title={`${x.specialty.name} (${x.specialty.code})`}
                                  >
                                    {x.specialty.name}
                                  </span>
                                ))}
                                {mapped.length > 4 ? <span className="text-xs text-zc-muted">+{mapped.length - 4} more</span> : null}
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-zc-muted">Map specialties in the next step.</div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" onClick={() => openEditDept(d)}>
                              Edit
                            </Button>
                            <Button variant="outline" className="gap-2" onClick={() => void openMapping(d)} disabled={activeSpecialties.length === 0}>
                              <Link2 className="h-4 w-4" />
                              Map specialties
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Step: Specialties */}
        {step === "specialties" ? (
          <div className="rounded-2xl border border-zc-border bg-zc-card shadow-elev-1 overflow-hidden">
            <div className="p-4 md:p-5 border-b border-zc-border">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zc-text">Specialties Catalog (Branch-level)</div>
                  <div className="mt-1 text-sm text-zc-muted">Create the master specialty list for this branch.</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-[320px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zc-muted" />
                    <Input value={specQ} onChange={(e) => setSpecQ(e.target.value)} placeholder="Search specialties…" className="pl-9" />
                  </div>
                  <Button onClick={openCreateSpec} className="gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Add specialty
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5">
              {loading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-2xl" />
                  ))}
                </div>
              ) : filteredSpecialties.length === 0 ? (
                <div className="rounded-2xl border border-zc-border bg-zc-panel/12 p-4 text-sm text-zc-muted">
                  No specialties found. Add at least one to proceed to mapping.
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredSpecialties.map((s) => (
                    <div key={s.id} className="rounded-2xl border border-zc-border bg-zc-panel/10 p-4 hover:bg-zc-panel/16 transition-all">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zc-text">{s.name}</div>
                            <span className="rounded-md border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] font-mono text-zc-muted">{s.code}</span>
                            {!s.isActive ? (
                              <span className="rounded-full border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] text-zc-muted">
                                Inactive
                              </span>
                            ) : (
                              <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>Active</span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-zc-muted">Branch-level specialty. Map it to departments in the next step.</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="outline" onClick={() => openEditSpec(s)}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Step: Mapping */}
        {step === "mapping" ? (
          <div className="rounded-2xl border border-zc-border bg-zc-card shadow-elev-1 overflow-hidden">
            <div className="p-4 md:p-5 border-b border-zc-border">
              <div className="text-sm font-semibold text-zc-text">Department ↔ Specialty Mapping</div>
              <div className="mt-1 text-sm text-zc-muted">
                Map one or more specialties to each active department and optionally mark a Primary specialty.
              </div>
            </div>

            <div className="p-4 md:p-5 grid gap-3">
              {loading ? (
                <Skeleton className="h-16 rounded-2xl" />
              ) : activeDepartments.length === 0 ? (
                <div className="rounded-2xl border border-zc-border bg-zc-panel/12 p-4 text-sm text-zc-muted">
                  Create at least one active department first.
                </div>
              ) : activeSpecialties.length === 0 ? (
                <div className="rounded-2xl border border-zc-border bg-zc-panel/12 p-4 text-sm text-zc-muted">
                  Create at least one active specialty first.
                </div>
              ) : (
                activeDepartments.map((d) => {
                  const mapped = deptLinks(d).filter((x) => x.specialty?.isActive !== false);
                  const primary = deptLinks(d).find((x) => x.isPrimary)?.specialty;
                  return (
                    <div key={d.id} className="rounded-2xl border border-zc-border bg-zc-panel/10 p-4 hover:bg-zc-panel/16 transition-all">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zc-text">{d.name}</div>
                            <span className="rounded-md border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] font-mono text-zc-muted">{d.code}</span>
                            <span className="rounded-md border border-zc-border bg-zc-panel/20 px-2 py-0.5 text-[11px] text-zc-muted">
                              {d.facility?.name}
                            </span>

                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", mapped.length ? pillTones.emerald : pillTones.rose)}>
                              {mapped.length ? `${mapped.length} mapped` : "Not mapped"}
                            </span>

                            {primary ? (
                              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]", pillTones.cyan)}>
                                <Star className="h-3.5 w-3.5" />
                                Primary: {primary.name}
                              </span>
                            ) : null}
                          </div>

                          {mapped.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {mapped.slice(0, 6).map((x) => (
                                <span key={x.specialtyId} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]", pillTones.zinc)}>
                                  {x.specialty.name}
                                </span>
                              ))}
                              {mapped.length > 6 ? <span className="text-xs text-zc-muted">+{mapped.length - 6} more</span> : null}
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-zc-muted">No specialties mapped. Open mapping to assign.</div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="outline" className="gap-2" onClick={() => void openMapping(d)}>
                            <Link2 className="h-4 w-4" />
                            Manage mapping
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        {/* Step: Review */}
        {step === "review" ? (
          <div className="rounded-2xl border border-zc-border bg-zc-card shadow-elev-1 overflow-hidden">
            <div className="p-4 md:p-5 border-b border-zc-border">
              <div className="text-sm font-semibold text-zc-text">Review & Finish (Super Admin)</div>
              <div className="mt-1 text-sm text-zc-muted">
                This validates only the Super Admin setup scope (Facilities, Departments, Specialties, Mapping).
              </div>
            </div>

            <div className="p-4 md:p-5 grid gap-4">
              <div className="flex flex-wrap gap-2">
                <MetricPill label="Score" value={setupScore} tone={setupScoreMeta.tone} icon={setupScoreMeta.icon} />
                <MetricPill label="Enabled Facilities" value={enabledCount} tone="indigo" />
                <MetricPill label="Active Departments" value={activeDepartments.length} tone="emerald" />
                <MetricPill label="Active Specialties" value={activeSpecialties.length} tone="cyan" />
                <MetricPill label="Mapped Depts" value={`${mappedActiveDeptCount}/${activeDepartments.length}`} tone="amber" icon={<Link2 className="h-3.5 w-3.5" />} />
              </div>

              {blockers.length ? (
                <div className="rounded-2xl border border-rose-200/60 bg-rose-50/60 dark:border-rose-900/30 dark:bg-rose-900/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-200">
                    <AlertTriangle className="h-4 w-4" /> Blockers
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-rose-700/90 dark:text-rose-200/90">
                    {blockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-900/30 dark:bg-emerald-900/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" /> No blockers detected
                  </div>
                  <div className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-200/90">
                    Super Admin setup is complete. Next: Branch Admin will configure operational modules under facilities.
                  </div>
                </div>
              )}

              {warnings.length ? (
                <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 dark:border-amber-900/30 dark:bg-amber-900/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                    <Wrench className="h-4 w-4" /> Warnings
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-amber-800/90 dark:text-amber-200/90">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Footer navigation */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zc-muted">
            {step === "facilities" && facilitiesDirty ? "Save facility selection to continue." : null}
            {step === "facilities" && !facilitiesDirty && enabledCount === 0 ? "Enable at least one facility to continue." : null}
            {step === "departments" && activeDepartments.length === 0 ? "Create at least one active department to continue." : null}
            {step === "specialties" && activeSpecialties.length === 0 ? "Create at least one active specialty to continue." : null}
            {step === "review" && blockers.length > 0 ? "Clear blockers to finish setup." : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => prevStep && setStep(prevStep)} disabled={!prevStep}>
              Back
            </Button>

            {step !== "review" ? (
              <Button className="gap-2" onClick={() => nextStep && setStep(nextStep)} disabled={!nextStep || !canNext}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={!canFinish} className="gap-2">
                <Sparkles className="h-4 w-4" /> Finish setup
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------- MODALS ----------------------------- */}

      {/* Department Create/Edit Modal */}
      {deptOpen ? (
        <ModalShell
          title={deptMode === "create" ? "Create Department" : "Edit Department"}
          description="Departments are created under an enabled facility for this branch."
          onClose={() => setDeptOpen(false)}
          maxW="max-w-2xl"
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-zc-border bg-zc-panel/12 p-4">
              <div className="text-sm font-semibold text-zc-text">Department Details</div>
              <div className="mt-1 text-sm text-zc-muted">Use a short code and a clear name.</div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <div className="text-sm font-medium text-zc-text">Facility</div>
                  <select
                    className="w-full rounded-xl border border-zc-border bg-zc-card px-3 py-2 text-sm text-zc-text shadow-sm focus:outline-none focus:ring-2 focus:ring-zc-ring"
                    value={deptForm.facilityId}
                    onChange={(e) => setDeptForm((p) => ({ ...p, facilityId: e.target.value }))}
                    disabled={deptMode === "edit"}
                  >
                    <option value="" disabled>
                      Select facility
                    </option>
                    {catalog
                      .filter((f) => savedFacilityIds.includes(f.id))
                      .filter((f) => f.isActive)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.category})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium text-zc-text">Code</div>
                  <Input
                    placeholder="E.g. CARDIO"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    disabled={deptMode === "edit"}
                  />
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium text-zc-text">Status</div>
                  <select
                    className="w-full rounded-xl border border-zc-border bg-zc-card px-3 py-2 text-sm text-zc-text shadow-sm focus:outline-none focus:ring-2 focus:ring-zc-ring"
                    value={deptForm.isActive ? "true" : "false"}
                    onChange={(e) => setDeptForm((p) => ({ ...p, isActive: e.target.value === "true" }))}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <div className="text-sm font-medium text-zc-text">Name</div>
                  <Input
                    placeholder="E.g. Cardiology Department"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeptOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveDepartment()} className="gap-2">
                <Check className="h-4 w-4" />
                {deptMode === "create" ? "Create" : "Save Changes"}
              </Button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {/* Specialty Create/Edit Modal */}
      {specOpen ? (
        <ModalShell
          title={specMode === "create" ? "Create Specialty" : "Edit Specialty"}
          description="Specialties are branch-level and mapped to departments in the Mapping step."
          onClose={() => setSpecOpen(false)}
          maxW="max-w-2xl"
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-zc-border bg-zc-panel/12 p-4">
              <div className="text-sm font-semibold text-zc-text">Specialty Details</div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-sm font-medium text-zc-text">Code</div>
                  <Input
                    placeholder="E.g. CARD"
                    value={specForm.code}
                    onChange={(e) => setSpecForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    disabled={specMode === "edit"}
                  />
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium text-zc-text">Status</div>
                  <select
                    className="w-full rounded-xl border border-zc-border bg-zc-card px-3 py-2 text-sm text-zc-text shadow-sm focus:outline-none focus:ring-2 focus:ring-zc-ring"
                    value={specForm.isActive ? "true" : "false"}
                    onChange={(e) => setSpecForm((p) => ({ ...p, isActive: e.target.value === "true" }))}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <div className="text-sm font-medium text-zc-text">Name</div>
                  <Input
                    value={specForm.name}
                    onChange={(e) => setSpecForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="E.g. Cardiology"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSpecOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveSpecialty()} className="gap-2">
                <Check className="h-4 w-4" />
                {specMode === "create" ? "Create" : "Save Changes"}
              </Button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {/* Mapping Modal */}
      {mapOpen ? (
        <ModalShell
          title="Map Specialties to Department"
          description="Select one or more specialties for this department and optionally set a Primary specialty."
          onClose={() => {
            setMapOpen(false);
            setMapDept(null);
          }}
          maxW="max-w-5xl"
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-zc-border bg-zc-panel/12 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="text-sm text-zc-muted">Department</div>
                  <div className="mt-1 text-lg font-semibold text-zc-text">{mapDept?.name ?? "—"}</div>
                  <div className="mt-1 text-xs text-zc-muted">Pick specialties from the branch catalog below.</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <MetricPill label="Selected" value={selectedSpecIds.length} tone="indigo" icon={<Link2 className="h-3.5 w-3.5" />} />
                  <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs", primarySpecId ? pillTones.emerald : pillTones.zinc)}>
                    {primarySpecId ? "Primary selected" : "No primary"}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zc-muted" />
                  <Input placeholder="Search specialties…" value={mapQ} onChange={(e) => setMapQ(e.target.value)} className="pl-9" />
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    // bulk select filtered active specialties
                    const q = mapQ.trim().toLowerCase();
                    const filtered = activeSpecialties.filter((s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
                    setSelectedSpecIds((prev) => {
                      const set = new Set(prev);
                      for (const s of filtered) set.add(s.id);
                      return Array.from(set);
                    });
                  }}
                  disabled={activeSpecialties.length === 0}
                >
                  Select filtered
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const q = mapQ.trim().toLowerCase();
                    const filteredIds = activeSpecialties
                      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
                      .map((s) => s.id);
                    setSelectedSpecIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                    setPrimarySpecId((p) => (p && filteredIds.includes(p) ? null : p));
                  }}
                  disabled={activeSpecialties.length === 0}
                >
                  Deselect filtered
                </Button>
              </div>

              {primarySpecId && !selectedSpecIds.includes(primarySpecId) ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200/60 bg-rose-50/60 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div className="min-w-0">Primary must be selected from the mapped specialties.</div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-zc-border bg-zc-card overflow-hidden">
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zc-panel/25 backdrop-blur">
                    <tr>
                      <th className="text-left p-3">Map</th>
                      <th className="text-left p-3">Primary</th>
                      <th className="text-left p-3">Specialty</th>
                      <th className="text-left p-3">Code</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {mapLoading ? (
                      <tr className="border-t">
                        <td className="p-3" colSpan={5}>
                          <Skeleton className="h-12" />
                        </td>
                      </tr>
                    ) : (
                      activeSpecialties
                        .filter((s) => {
                          const q = mapQ.trim().toLowerCase();
                          if (!q) return true;
                          return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
                        })
                        .map((s) => {
                          const mapped = selectedSpecIds.includes(s.id);
                          return (
                            <tr key={s.id} className="border-t hover:bg-zc-panel/15 transition-colors">
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSpecIds((prev) => {
                                      const next = prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id];
                                      if (primarySpecId === s.id && !next.includes(s.id)) setPrimarySpecId(null);
                                      return next;
                                    });
                                  }}
                                  className={cn(
                                    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zc-border bg-zc-panel/20 transition-all",
                                    "hover:bg-zc-panel hover:shadow-elev-2",
                                    mapped && "border-[rgb(var(--zc-accent-rgb)/0.55)] bg-[rgb(var(--zc-accent-rgb)/0.18)]",
                                  )}
                                  title={mapped ? "Unmap" : "Map"}
                                >
                                  {mapped ? <Check className="h-4 w-4 text-[rgb(var(--zc-accent))]" /> : <Link2 className="h-4 w-4 text-zc-muted" />}
                                </button>
                              </td>

                              <td className="p-3">
                                <button
                                  type="button"
                                  disabled={!mapped}
                                  onClick={() => setPrimarySpecId(s.id)}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-all",
                                    !mapped
                                      ? "cursor-not-allowed opacity-50 border-zc-border bg-zc-panel/10 text-zc-muted"
                                      : "border-[rgb(var(--zc-accent-rgb)/0.55)] bg-[rgb(var(--zc-accent-rgb)/0.18)] text-[rgb(var(--zc-accent))]",
                                    primarySpecId === s.id && pillTones.emerald,
                                  )}
                                  title={!mapped ? "Map first" : "Set as primary"}
                                >
                                  <Star className="h-3.5 w-3.5" />
                                  {primarySpecId === s.id ? "Primary" : "Set"}
                                </button>
                              </td>

                              <td className="p-3">
                                <div className="font-semibold text-zc-text">{s.name}</div>
                              </td>

                              <td className="p-3">
                                <span className="rounded-md border border-zc-border bg-zc-panel/25 px-2 py-0.5 font-mono text-[12px] text-zc-text">
                                  {s.code}
                                </span>
                              </td>

                              <td className="p-3">
                                {s.isActive ? (
                                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]", pillTones.emerald)}>
                                    Active
                                  </span>
                                ) : (
                                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]", pillTones.zinc)}>
                                    Inactive
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMapOpen(false);
                  setMapDept(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => void saveMapping()} className="gap-2">
                <Check className="h-4 w-4" />
                Save Mapping
              </Button>
            </div>
          </div>
        </ModalShell>
      ) : null}
          </RequirePerm>
</AppShell>
  );
}
