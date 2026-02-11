"use client";

import * as React from "react";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { toast } from "@/components/ui/use-toast";

type EngagementType = "EMPLOYEE" | "CONSULTANT" | "VISITING" | "CONTRACTOR" | "INTERN" | "TRAINEE" | string;
type EmploymentStatus = "PERMANENT" | "CONTRACT" | "VISITING" | "TEMPORARY" | string;
type ProfessionalTrack = "CLINICAL" | "NON_CLINICAL" | string;

type StaffCategory =
  | "DOCTOR"
  | "NURSE"
  | "PARAMEDIC"
  | "PHARMACIST"
  | "TECHNICIAN"
  | "ADMIN"
  | "STAFF"
  | "SECURITY"
  | "HOUSEKEEPING"
  | string;

type DepartmentMini = { id: string; code?: string; name?: string; isActive?: boolean; active?: boolean };
type DeptSpecialtyItem = {
  specialtyId: string;
  isPrimary?: boolean;
  specialty?: { id: string; code?: string; name?: string; kind?: string; isActive?: boolean };
};
type StaffMini = { id: string; name?: string; empCode?: string; designation?: string };

type EmploymentDetailsDraft = {
  staff_category?: StaffCategory;
  engagement_type?: EngagementType;
  employment_status?: EmploymentStatus;
  date_of_joining?: string;

  designation?: string;
  department?: string;
  departmentId?: string;

  track?: ProfessionalTrack;

  // ✅ HOD + reporting structure
  isHeadOfDepartment?: boolean;
  reportingManagerId?: string;

  // ✅ Specialties (requested)
  primarySpecialtyId?: string; // required (clinical)
  secondarySpecialtyIds?: string[]; // optional

  // ✅ Qualifications
  qualifications?: string[];

  years_experience?: number | null;
  languages?: string[];
  profile_summary?: string;
  notes?: string;
};

type StaffOnboardingDraft = {
  employment_details?: EmploymentDetailsDraft;
  [k: string]: any;
};

type FieldErrorMap = Record<string, string>;

type Option = { value: string; label: string };

const BASE = "/infrastructure/human-resource/staff/onboarding";
const CLINICAL_CATEGORIES = new Set(["DOCTOR", "NURSE", "PARAMEDIC", "PHARMACIST", "TECHNICIAN"]);

const DESIGNATIONS: Option[] = [
  { value: "CHAIRMAN", label: "Chairman" },
  { value: "MEDICAL_DIRECTOR", label: "Medical Director" },
  { value: "CLINICAL_DIRECTOR", label: "Clinical Director" },
  { value: "HOD", label: "Head of Department (HOD)" },
  { value: "SENIOR_CONSULTANT", label: "Senior Consultant" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "ASSOCIATE_CONSULTANT", label: "Associate Consultant" },
  { value: "JUNIOR_CONSULTANT", label: "Junior Consultant" },
  { value: "SPECIALIST", label: "Specialist" },
  { value: "MEDICAL_OFFICER", label: "Medical Officer" },
  { value: "CASUALTY_MEDICAL_OFFICER", label: "Casualty Medical Officer (CMO)" },
  { value: "RESIDENT_DOCTOR", label: "Resident Doctor" },
  { value: "JUNIOR_RESIDENT", label: "Junior Resident" },
  { value: "SENIOR_RESIDENT", label: "Senior Resident" },
  { value: "REGISTRAR", label: "Registrar" },
  { value: "SENIOR_REGISTRAR", label: "Senior Registrar" },
  { value: "FELLOW", label: "Fellow" },
  { value: "INTERN", label: "Intern" },

  { value: "CHIEF_NURSING_OFFICER", label: "Chief Nursing Officer (CNO)" },
  { value: "NURSING_SUPERINTENDENT", label: "Nursing Superintendent" },
  { value: "NURSING_MANAGER", label: "Nursing Manager" },
  { value: "NURSING_SUPERVISOR", label: "Nursing Supervisor" },
  { value: "HEAD_NURSE", label: "Head Nurse / Ward In-charge" },
  { value: "SENIOR_STAFF_NURSE", label: "Senior Staff Nurse" },
  { value: "STAFF_NURSE", label: "Staff Nurse" },
  { value: "TRAINEE_NURSE", label: "Trainee Nurse" },

  { value: "LAB_MANAGER", label: "Lab Manager" },
  { value: "LAB_TECHNOLOGIST", label: "Lab Technologist" },
  { value: "LAB_TECHNICIAN", label: "Lab Technician" },
  { value: "RADIOLOGY_MANAGER", label: "Radiology Manager" },
  { value: "RADIOGRAPHER", label: "Radiographer" },
  { value: "XRAY_TECHNICIAN", label: "X-Ray Technician" },
  { value: "MRI_TECHNICIAN", label: "MRI Technician" },
  { value: "CT_TECHNICIAN", label: "CT Technician" },
  { value: "OT_TECHNICIAN", label: "OT Technician" },
  { value: "ANAESTHESIA_TECHNICIAN", label: "Anaesthesia Technician" },
  { value: "DIALYSIS_TECHNICIAN", label: "Dialysis Technician" },
  { value: "RESPIRATORY_THERAPIST", label: "Respiratory Therapist" },
  { value: "PHYSIOTHERAPIST", label: "Physiotherapist" },
  { value: "DIETICIAN", label: "Dietician" },
  { value: "PHARMACIST", label: "Pharmacist" },

  { value: "ADMIN_MANAGER", label: "Admin Manager" },
  { value: "HR_MANAGER", label: "HR Manager" },
  { value: "HR_EXECUTIVE", label: "HR Executive" },
  { value: "FRONT_OFFICE_EXECUTIVE", label: "Front Office Executive" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "BILLING_EXECUTIVE", label: "Billing Executive" },
  { value: "INSURANCE_EXECUTIVE", label: "Insurance Executive" },
  { value: "ACCOUNTS_EXECUTIVE", label: "Accounts Executive" },
  { value: "IT_ADMIN", label: "IT Admin" },
  { value: "IT_SUPPORT", label: "IT Support" },

  { value: "HOUSEKEEPING_SUPERVISOR", label: "Housekeeping Supervisor" },
  { value: "HOUSEKEEPING_STAFF", label: "Housekeeping Staff" },
  { value: "SECURITY_SUPERVISOR", label: "Security Supervisor" },
  { value: "SECURITY_GUARD", label: "Security Guard" },

  { value: "TRAINEE", label: "Trainee" },
  { value: "OTHER", label: "Other" },
];

const QUALIFICATIONS: Option[] = [
  { value: "MBBS", label: "MBBS" },
  { value: "MD", label: "MD" },
  { value: "MS", label: "MS" },
  { value: "DNB", label: "DNB" },
  { value: "DM", label: "DM" },
  { value: "MCH", label: "MCh" },
  { value: "FNB", label: "FNB" },
  { value: "BDS", label: "BDS" },
  { value: "MDS", label: "MDS" },
  { value: "GNM", label: "GNM" },
  { value: "ANM", label: "ANM" },
  { value: "BSC_NURSING", label: "B.Sc Nursing" },
  { value: "MSC_NURSING", label: "M.Sc Nursing" },
  { value: "DMLT", label: "DMLT" },
  { value: "BMLT", label: "BMLT" },
  { value: "MMLT", label: "MMLT" },
  { value: "DPHARM", label: "D.Pharm" },
  { value: "BPHARM", label: "B.Pharm" },
  { value: "MPHARM", label: "M.Pharm" },
  { value: "BPT", label: "BPT" },
  { value: "MPT", label: "MPT" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "BSC", label: "B.Sc" },
  { value: "MSC", label: "M.Sc" },
  { value: "MBA", label: "MBA" },
];

function storageKey(draftId: string) {
  return `hrStaffOnboardingDraft:${draftId}`;
}
function readLocalDraft(draftId: string): StaffOnboardingDraft {
  try {
    const raw = localStorage.getItem(storageKey(draftId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function writeLocalDraft(draftId: string, patch: Partial<StaffOnboardingDraft>) {
  const prev = readLocalDraft(draftId);
  const next = { ...prev, ...patch };
  localStorage.setItem(storageKey(draftId), JSON.stringify(next));
}

function MultiSelectDropdown({
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label?: string;
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [q, setQ] = React.useState("");
  const selected = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, q]);

  function toggle(v: string) {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  }

  const summary = value.length === 0 ? (placeholder ?? "Select...") : `${value.length} selected`;

  return (
    <div className="space-y-2">
      {label ? <Label>{label}</Label> : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between" disabled={disabled}>
            <span className="truncate">{summary}</span>
            <span className="ml-2 opacity-70">▾</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-[360px] max-w-[90vw]">
          <DropdownMenuLabel className="flex items-center justify-between gap-2">
            <span className="text-sm">Select</span>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => onChange([])}
              disabled={value.length === 0}
            >
              Clear
            </Button>
          </DropdownMenuLabel>

          <div className="px-2 pb-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
          </div>

          <DropdownMenuSeparator />

          <div className="max-h-64 overflow-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-2 text-sm text-zc-muted">No results</div>
            ) : (
              filtered.map((o) => (
                <DropdownMenuCheckboxItem
                  key={o.value}
                  checked={selected.has(o.value)}
                  onCheckedChange={() => toggle(o.value)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {o.label}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((v, idx) => {
            const opt = options.find((x) => x.value === v);
            const badgeTone =
              [
                "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
                "border-sky-400/50 bg-sky-500/15 text-sky-100",
                "border-violet-400/50 bg-violet-500/15 text-violet-100",
                "border-amber-400/50 bg-amber-500/15 text-amber-100",
                "border-rose-400/50 bg-rose-500/15 text-rose-100",
                "border-cyan-400/50 bg-cyan-500/15 text-cyan-100",
              ][idx % 6];
            return (
              <Badge
                key={v}
                variant="secondary"
                className={cn("cursor-pointer border", badgeTone)}
                title="Click to remove"
                onClick={() => toggle(v)}
              >
                {opt?.label ?? v} x
              </Badge>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function HrStaffOnboardingEmploymentPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId") || undefined;

  const { branchId, isReady: branchReady } = useBranchContext();

  const [departments, setDepartments] = React.useState<DepartmentMini[]>([]);
  const [deptSpecialtyItems, setDeptSpecialtyItems] = React.useState<DeptSpecialtyItem[]>([]);
  const [deptStaff, setDeptStaff] = React.useState<StaffMini[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [deptQuery, setDeptQuery] = React.useState("");
  const [designationQuery, setDesignationQuery] = React.useState("");

  const [form, setForm] = React.useState<EmploymentDetailsDraft>({
    staff_category: "STAFF",
    engagement_type: "EMPLOYEE",
    employment_status: "PERMANENT",
    date_of_joining: "",
    track: "NON_CLINICAL",

    designation: "",
    department: "",
    departmentId: "",

    isHeadOfDepartment: false,
    reportingManagerId: "",

    primarySpecialtyId: "",
    secondarySpecialtyIds: [],

    qualifications: [],

    years_experience: null,
    languages: [],
    profile_summary: "",
    notes: "",
  });

  const isClinical = useMemo(() => {
    const cat = String(form.staff_category || "").toUpperCase();
    const tr = String(form.track || "").toUpperCase();
    return tr === "CLINICAL" || CLINICAL_CATEGORIES.has(cat);
  }, [form.staff_category, form.track]);

  const departmentOptions = useMemo(() => {
    const active = departments.filter((d) => (d.isActive ?? d.active ?? true) !== false);
    return active.map((d) => ({
      value: d.id,
      label: d.code ? `${d.name || "Department"} (${d.code})` : d.name || "Department",
    }));
  }, [departments]);

  const filteredDepartmentOptions = useMemo(() => {
    const q = deptQuery.trim().toLowerCase();
    if (!q) return departmentOptions;
    return departmentOptions.filter((d) => d.label.toLowerCase().includes(q));
  }, [departmentOptions, deptQuery]);

  const filteredDesignationOptions = useMemo(() => {
    const q = designationQuery.trim().toLowerCase();
    if (!q) return DESIGNATIONS;
    return DESIGNATIONS.filter((d) => d.label.toLowerCase().includes(q));
  }, [designationQuery]);

  const specialtyOptions = useMemo<Option[]>(() => {
    const items = deptSpecialtyItems
      .map((x) => x?.specialty)
      .filter(Boolean) as NonNullable<DeptSpecialtyItem["specialty"]>[];
    return items.map((s) => ({
      value: s.id,
      label: s.code ? `${s.name || "Specialty"} (${s.code})` : s.name || "Specialty",
    }));
  }, [deptSpecialtyItems]);

  const primarySpecialtyOptions = specialtyOptions;

  const secondarySpecialtyOptions = useMemo(() => {
    const primary = String(form.primarySpecialtyId || "").trim();
    return specialtyOptions.filter((o) => o.value !== primary);
  }, [specialtyOptions, form.primarySpecialtyId]);

  const managerOptions = useMemo(() => {
    return deptStaff
      .filter((s) => s?.id)
      .map((s) => ({
        value: s.id,
        label: `${s.name || "Staff"}${s.empCode ? ` • ${s.empCode}` : ""}${s.designation ? ` • ${s.designation}` : ""}`,
      }));
  }, [deptStaff]);

  // Load local draft on mount
  React.useEffect(() => {
    if (!draftId) {
      setLoading(false);
      return;
    }
    try {
      const local = readLocalDraft(draftId);
      const ed = (local?.employment_details || {}) as EmploymentDetailsDraft;

      setForm((prev) => ({
        ...prev,
        ...ed,
        secondarySpecialtyIds: Array.isArray(ed.secondarySpecialtyIds) ? ed.secondarySpecialtyIds : [],
        qualifications: Array.isArray(ed.qualifications) ? ed.qualifications : [],
        languages: Array.isArray(ed.languages) ? ed.languages : [],
      }));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  // Fetch departments
  React.useEffect(() => {
    if (!branchReady) return;

    (async () => {
      try {
        const params = new URLSearchParams();
        if (branchId) params.set("branchId", String(branchId));
        params.set("take", "200");

        // ✅ correct facility-setup alias route
        const res: any = await apiFetch(`/api/departments?${params.toString()}`);
        const rows: any[] = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
        const cleaned: DepartmentMini[] = rows
          .filter(Boolean)
          .map((d) => ({
            id: String(d.id),
            code: d.code ? String(d.code) : undefined,
            name: d.name ? String(d.name) : undefined,
            isActive: d.isActive,
            active: d.active,
          }))
          .filter((d) => d.id);

        setDepartments(cleaned);
      } catch (e: any) {
        toast({ variant: "destructive", title: "Departments", description: e?.message || "Failed to load departments" });
        setDepartments([]);
      }
    })();
  }, [branchReady, branchId]);

  // Fetch specialties mapping + staff list for selected department
  React.useEffect(() => {
    const deptId = String(form.departmentId || "").trim();
    if (!deptId) {
      setDeptSpecialtyItems([]);
      setDeptStaff([]);
      return;
    }

    (async () => {
      // ✅ Department specialties (this fixes your “no specialty shown” bug)
      try {
        const res: any = await apiFetch(`/api/departments/${encodeURIComponent(deptId)}/specialties`);
        const items: DeptSpecialtyItem[] = Array.isArray(res?.items) ? res.items : [];
        setDeptSpecialtyItems(items);

        // auto-pick default primary (department primary) if not set / not valid
        const available = new Set(items.map((i) => i?.specialty?.id).filter(Boolean) as string[]);
        setForm((p) => {
          const curPrimary = String(p.primarySpecialtyId || "").trim();
          const isCurValid = curPrimary && available.has(curPrimary);
          if (isCurValid) return p;

          const deptPrimary = items.find((i) => i?.isPrimary)?.specialty?.id;
          const nextPrimary = deptPrimary && available.has(deptPrimary) ? deptPrimary : "";
          return {
            ...p,
            primarySpecialtyId: nextPrimary,
            secondarySpecialtyIds: Array.isArray(p.secondarySpecialtyIds)
              ? p.secondarySpecialtyIds.filter((x) => x && x !== nextPrimary && available.has(x))
              : [],
          };
        });
      } catch {
        setDeptSpecialtyItems([]);
      }

      // Reporting manager list only if NOT HOD
      if (!form.isHeadOfDepartment) {
        try {
          const params = new URLSearchParams();
          if (branchId) params.set("branchId", String(branchId));
          params.set("departmentId", deptId);
          params.set("status", "ACTIVE");
          params.set("onboarding", "BOARDED"); // avoids drafts
          params.set("take", "200");

          const res: any = await apiFetch(`/api/infrastructure/staff?${params.toString()}`);
          const rows: any[] = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
          const cleaned: StaffMini[] = rows
            .filter(Boolean)
            .map((s) => ({
              id: String(s.id),
              name: s.name ? String(s.name) : undefined,
              empCode: s.empCode ? String(s.empCode) : undefined,
              designation: s.designation ? String(s.designation) : undefined,
            }))
            .filter((s) => s.id);

          setDeptStaff(cleaned);
        } catch {
          setDeptStaff([]);
        }
      } else {
        setDeptStaff([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.departmentId, form.isHeadOfDepartment, branchId]);

  function setField<K extends keyof EmploymentDetailsDraft>(k: K, v: EmploymentDetailsDraft[K]) {
    setDirty(true);
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => {
      const next = { ...e };
      delete next[String(k)];
      return next;
    });
  }

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};
    if (!String(form.designation || "").trim()) e.designation = "Designation is required.";
    if (!String(form.departmentId || "").trim()) e.departmentId = "Department is required.";

    if (isClinical) {
      if (!String(form.primarySpecialtyId || "").trim()) e.primarySpecialtyId = "Primary specialty is required.";
    }

    // manager is required only if not HOD and managers exist
    if (!form.isHeadOfDepartment && managerOptions.length > 0 && !String(form.reportingManagerId || "").trim()) {
      e.reportingManagerId = "Reporting manager is required (for non-HOD).";
    }

    return e;
  }

  async function onSaveDraft() {
    if (!draftId) return;

    const e = validate();
    setErrors(e);

    const dept = departments.find((d) => d.id === form.departmentId);
    const deptName = dept?.name || form.department || "";

    // Ensure secondary doesn't include primary
    const primary = String(form.primarySpecialtyId || "").trim();
    const secondary = Array.isArray(form.secondarySpecialtyIds)
      ? form.secondarySpecialtyIds.filter((x) => x && x !== primary)
      : [];

    const nextEmployment: EmploymentDetailsDraft = {
      ...form,
      department: deptName,
      departmentId: form.departmentId || "",
      designation: form.designation || "",
      primarySpecialtyId: primary || "",
      secondarySpecialtyIds: secondary,
      qualifications: Array.isArray(form.qualifications) ? form.qualifications : [],
      languages: Array.isArray(form.languages) ? form.languages : [],
      reportingManagerId: form.isHeadOfDepartment ? "" : form.reportingManagerId || "",
    };

    writeLocalDraft(draftId, { employment_details: nextEmployment });
    setDirty(false);
  }

  const footer = (
    <div className="flex items-center justify-between w-full">
      <Button
        type="button"
        variant="outline"
        onClick={() => router.push(`${BASE}/identity?draftId=${encodeURIComponent(draftId || "")}`)}
      >
        Back
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const e = validate();
          setErrors(e);
          if (Object.keys(e).length) {
            toast({ variant: "destructive", title: "Fix errors", description: "Please correct the highlighted fields." });
            return;
          }
          router.push(`${BASE}/credentials?draftId=${encodeURIComponent(draftId || "")}`);
        }}
      >
        Continue
      </Button>
    </div>
  );

  return (
    <OnboardingShell
      title="Employment"
      description="Department, designation, specialties, reporting structure, and qualifications."
      stepId="employment"
      draftId={draftId}
      onSaveDraft={onSaveDraft}
      footer={footer}
    >
      <div className="grid gap-6">
        <div className="rounded-2xl border border-zc-border bg-zc-card p-6">
          <div className="grid gap-6">
            {/* Department + Designation */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={String(form.departmentId || "")}
                  onOpenChange={(open) => {
                    if (!open) setDeptQuery("");
                  }}
                  onValueChange={(v) => {
                    const dept = departments.find((d) => d.id === v);
                    setDirty(true);
                    setForm((p) => ({
                      ...p,
                      departmentId: v,
                      department: dept?.name || "",
                      // reset dept-dependent fields
                      primarySpecialtyId: "",
                      secondarySpecialtyIds: [],
                      reportingManagerId: "",
                    }));
                    setErrors((e) => {
                      const next = { ...e };
                      delete next.departmentId;
                      delete next.primarySpecialtyId;
                      delete next.reportingManagerId;
                      return next;
                    });
                  }}
                >
                  <SelectTrigger className={cn(errors.departmentId && "border-red-500")}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    <div className="sticky top-0 z-10 bg-zc-card p-2">
                      <Input
                        value={deptQuery}
                        onChange={(e) => setDeptQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Escape") e.stopPropagation();
                        }}
                        placeholder="Search department..."
                        className="h-9"
                      />
                    </div>
                    {filteredDepartmentOptions.length ? (
                      filteredDepartmentOptions.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-zc-muted">No departments found.</div>
                    )}
                  </SelectContent>
                </Select>
                {errors.departmentId ? <div className="text-xs text-red-500">{errors.departmentId}</div> : null}
              </div>

              <div className="space-y-2">
                <Label>Designation</Label>
                <Select
                  value={String(form.designation || "")}
                  onOpenChange={(open) => {
                    if (!open) setDesignationQuery("");
                  }}
                  onValueChange={(v) => setField("designation", v)}
                >
                  <SelectTrigger className={cn(errors.designation && "border-red-500")}>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    <div className="sticky top-0 z-10 bg-zc-card p-2">
                      <Input
                        value={designationQuery}
                        onChange={(e) => setDesignationQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Escape") e.stopPropagation();
                        }}
                        placeholder="Search designation..."
                        className="h-9"
                      />
                    </div>
                    {filteredDesignationOptions.length ? (
                      filteredDesignationOptions.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-zc-muted">No designations found.</div>
                    )}
                  </SelectContent>
                </Select>
                {errors.designation ? <div className="text-xs text-red-500">{errors.designation}</div> : null}
              </div>
            </div>

            {/* HOD */}
            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card/30 px-4 py-3">
              <div className="min-w-0">
                <div className="font-medium">Head of Department (HOD)</div>
                <div className="text-sm text-zc-muted">
                  If enabled, reporting manager is not required.
                </div>
              </div>
              <Switch
                checked={!!form.isHeadOfDepartment}
                onCheckedChange={(v) => {
                  setDirty(true);
                  setForm((p) => ({
                    ...p,
                    isHeadOfDepartment: v,
                    reportingManagerId: v ? "" : p.reportingManagerId,
                  }));
                  setErrors((e) => {
                    const next = { ...e };
                    delete next.reportingManagerId;
                    return next;
                  });
                }}
                disabled={!String(form.departmentId || "").trim()}
              />
            </div>

            {/* Specialties */}
            {isClinical ? (
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Primary Specialty <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={String(form.primarySpecialtyId || "")}
                    onValueChange={(v) => {
                      setDirty(true);
                      setForm((p) => ({
                        ...p,
                        primarySpecialtyId: v,
                        secondarySpecialtyIds: Array.isArray(p.secondarySpecialtyIds)
                          ? p.secondarySpecialtyIds.filter((x) => x && x !== v)
                          : [],
                      }));
                      setErrors((e) => {
                        const next = { ...e };
                        delete next.primarySpecialtyId;
                        return next;
                      });
                    }}
                    disabled={!String(form.departmentId || "").trim() || primarySpecialtyOptions.length === 0}
                  >
                    <SelectTrigger className={cn(errors.primarySpecialtyId && "border-red-500")}>
                      <SelectValue
                        placeholder={
                          !form.departmentId
                            ? "Select department first"
                            : primarySpecialtyOptions.length
                              ? "Select primary specialty"
                              : "No specialties mapped"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      {primarySpecialtyOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.primarySpecialtyId ? (
                    <div className="text-xs text-red-500">{errors.primarySpecialtyId}</div>
                  ) : null}
                  {form.departmentId && primarySpecialtyOptions.length === 0 ? (
                    <div className="text-xs text-zc-muted">
                      No specialties are mapped to this department. Map them in Department → Specialties.
                    </div>
                  ) : null}
                </div>

                <MultiSelectDropdown
                  label="Secondary Specialties (optional)"
                  options={secondarySpecialtyOptions}
                  value={Array.isArray(form.secondarySpecialtyIds) ? form.secondarySpecialtyIds : []}
                  onChange={(next) => setField("secondarySpecialtyIds", next)}
                  placeholder={!form.departmentId ? "Select department first" : "Select secondary specialties"}
                  disabled={!String(form.departmentId || "").trim() || secondarySpecialtyOptions.length === 0}
                />
              </div>
            ) : null}

            {/* Qualifications */}
            <MultiSelectDropdown
              label="Qualifications"
              options={QUALIFICATIONS}
              value={Array.isArray(form.qualifications) ? form.qualifications : []}
              onChange={(next) => setField("qualifications", next)}
              placeholder="Select qualifications"
            />

            {/* Reporting manager */}
            {!form.isHeadOfDepartment ? (
              <div className="space-y-2">
                <Label>Reporting Manager (same Department)</Label>
                <Select
                  value={String(form.reportingManagerId || "")}
                  onValueChange={(v) => setField("reportingManagerId", v)}
                  disabled={!String(form.departmentId || "").trim() || managerOptions.length === 0}
                >
                  <SelectTrigger className={cn(errors.reportingManagerId && "border-red-500")}>
                    <SelectValue
                      placeholder={
                        !form.departmentId
                          ? "Select department first"
                          : managerOptions.length
                            ? "Select manager"
                            : "No boarded staff in this department"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    {managerOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reportingManagerId ? (
                  <div className="text-xs text-red-500">{errors.reportingManagerId}</div>
                ) : (
                  form.departmentId && managerOptions.length === 0 ? (
                    <div className="text-xs text-zc-muted">
                      No boarded/active staff found in this department yet — reporting manager can be set later.
                    </div>
                  ) : null
                )}
              </div>
            ) : null}

            <Separator />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date of Joining</Label>
                <Input
                  type="date"
                  value={String(form.date_of_joining || "")}
                  onChange={(e) => setField("date_of_joining", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Input
                  type="number"
                  value={form.years_experience == null ? "" : String(form.years_experience)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setField("years_experience", v === "" ? null : Number(v));
                  }}
                  placeholder="e.g., 5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Profile Summary</Label>
              <Textarea
                value={String(form.profile_summary || "")}
                onChange={(e) => setField("profile_summary", e.target.value)}
                placeholder="Short profile summary..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={String(form.notes || "")}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Internal notes..."
              />
            </div>

            {dirty ? (
              <div className="text-xs text-zc-muted">
                Changes not saved to draft yet. Click <b>Save draft</b> in the header.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
