"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";

import { OnboardingShell } from "../_components/OnboardingShell";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/cn";
import { apiFetch, ApiError } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { toast } from "@/components/ui/use-toast";

/**
 * Step: Clinical Privileges (Doctors only)
 * Stored in:
 *   medical_details.clinical_privileges: ClinicalPrivilegeDraft[]
 *
 * ✅ Updates as requested:
 * - Department: dropdown from departments in selected branch (single-select, required per privilege record)
 * - Specialties: based on selected department (multi-select, optional)
 * - Granted By / Reviewed By / Supervisor / Assessor: dropdown from existing staff (ACTIVE)
 * - Role: auto-derived from Granted By (read-only field)
 */

type PrivilegeType =
  | "ADMITTING"
  | "SURGICAL"
  | "ANESTHESIA"
  | "PRESCRIPTION"
  | "PROCEDURE"
  | "SUPERVISION"
  | "TEACHING"
  | "TELEMEDICINE"
  | "EMERGENCY"
  | "ICU"
  | "NICU"
  | "HIGH_RISK_OB"
  | "INTERVENTIONAL"
  | "ENDOSCOPY"
  | "DIAGNOSTIC"
  | "PAIN_MANAGEMENT";

type ReviewCycle = "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | "BIENNIAL";

type PrivilegeStatus = "ACTIVE" | "SUSPENDED" | "REVOKED" | "EXPIRED" | "PENDING_REVIEW" | "PROVISIONAL";

type ClinicalPrivilegeDraft = {
  id: string;

  privilege_type: PrivilegeType | string;
  privilege_name: string;
  privilege_description?: string;

  // NOTE: we store single department as departments[0] (string id),
  // kept as string[] to stay backward compatible with earlier draft structure.
  departments: string[]; // [departmentId]
  specialties: string[]; // [specialtyId] (optional multi)
  procedures: string[]; // Procedure names/codes (comma list)

  // store staffId in these fields (string), backward compatible with older “name/code” drafts
  granted_by: string; // staffId
  granted_by_role?: string;
  granted_date?: string;

  effective_date?: string;
  expiry_date?: string;
  is_lifetime: boolean;

  review_required: boolean;
  review_cycle: ReviewCycle;
  last_review_date?: string;
  next_review_date?: string;
  reviewed_by?: string; // staffId
  review_remarks?: string;

  conditions: string[];
  restrictions: string[];
  supervision_required: boolean;
  supervisor?: string; // staffId

  competency_assessment_required: boolean;
  last_assessment_date?: string;
  assessment_score?: number | null;
  assessor?: string; // staffId

  minimum_case_volume?: number | null;
  current_case_volume?: number | null;

  status: PrivilegeStatus;
  is_active: boolean;

  credential_documents: string[];
};

type StaffOnboardingDraft = {
  personal_details?: Record<string, any>;
  contact_details?: Record<string, any>;
  employment_details?: Record<string, any>;
  medical_details?: Record<string, any>;
  system_access?: Record<string, any>;
  assignments?: any[];
};

type FieldErrorMap = Record<string, string>;

type DepartmentMini = { id: string; code?: string; name?: string; isActive?: boolean; active?: boolean };
type SpecialtyMini = { id: string; code?: string; name?: string; kind?: string; isActive?: boolean; active?: boolean };

type StaffMini = {
  id: string;
  empCode?: string;
  code?: string;
  name?: string;
  designation?: string;
  departmentId?: string;
  department?: string;
  roleName?: string;
  roleCode?: string;
  systemRole?: string;
  system_access?: any;
  systemAccess?: any;
};

const PRIVILEGE_TYPES: PrivilegeType[] = [
  "ADMITTING",
  "SURGICAL",
  "ANESTHESIA",
  "PRESCRIPTION",
  "PROCEDURE",
  "SUPERVISION",
  "TEACHING",
  "TELEMEDICINE",
  "EMERGENCY",
  "ICU",
  "NICU",
  "HIGH_RISK_OB",
  "INTERVENTIONAL",
  "ENDOSCOPY",
  "DIAGNOSTIC",
  "PAIN_MANAGEMENT",
];

const REVIEW_CYCLES: ReviewCycle[] = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "BIENNIAL"];
const PRIV_STATUS: PrivilegeStatus[] = ["ACTIVE", "PROVISIONAL", "PENDING_REVIEW", "SUSPENDED", "REVOKED", "EXPIRED"];

async function apiFetchWithFallback<T>(primary: string, legacy: string): Promise<T> {
  try {
    return await apiFetch<T>(primary);
  } catch (e: any) {
    // If the route doesn't exist (or old deployments), try legacy.
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
      return await apiFetch<T>(legacy);
    }
    throw e;
  }
}

function formatDeptLabel(d: DepartmentMini) {
  const code = d.code ? String(d.code) : "";
  const name = d.name ? String(d.name) : "";
  return code && name ? `${code} · ${name}` : name || code || d.id;
}

function formatSpecLabel(s: SpecialtyMini) {
  const code = s.code ? String(s.code) : "";
  const name = s.name ? String(s.name) : "";
  return code && name ? `${code} · ${name}` : name || code || s.id;
}

function formatStaffLabel(s: StaffMini) {
  const code = (s.empCode || s.code || "").toString().trim();
  const name = (s.name || "").toString().trim();
  const des = (s.designation || "").toString().trim();
  const left = code ? `${code} · ${name || "—"}` : name || s.id;
  return des ? `${left} — ${des}` : left;
}

function inferStaffRole(s?: StaffMini | null): string {
  if (!s) return "";
  const direct =
    s.roleName ||
    s.roleCode ||
    s.systemRole ||
    s.systemAccess?.role?.name ||
    s.systemAccess?.roleName ||
    s.systemAccess?.role_code ||
    s.system_access?.role?.name ||
    s.system_access?.roleName ||
    s.system_access?.role_code ||
    "";
  const d = String(direct || "").trim();
  if (d) return d;
  return String(s.designation || "").trim();
}

/** Lightweight MultiSelect (no Command dependency) */
function MultiSelectPopover({
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  value: string[];
  options: { value: string; label: string }[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const set = React.useMemo(() => new Set(value ?? []), [value]);

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) => o.label.toLowerCase().includes(qq));
  }, [options, q]);

  function toggle(v: string) {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  }

  const summary = value?.length ? `${value.length} selected` : (placeholder ?? "Select");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-10 w-full justify-between border-zc-border bg-transparent px-3 font-normal", disabled && "opacity-50")}
          disabled={disabled}
        >
          <span className={cn("truncate text-left", !value?.length && "text-zc-muted")}>{summary}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-zc-muted" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="h-9 border-zc-border"
        />

        <div className="mt-2 max-h-56 overflow-auto rounded-md border border-zc-border bg-transparent">
          {filtered.length ? (
            filtered.map((o) => {
              const selected = set.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zc-border/30",
                    selected && "bg-zc-border/20"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 place-items-center rounded border",
                      selected ? "border-zc-accent bg-zc-accent text-white" : "border-zc-border text-transparent"
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })
          ) : (
            <div className="p-3 text-xs text-zc-muted">No results</div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={() => onChange([])}
            disabled={disabled || (value?.length ?? 0) === 0}
          >
            Clear
          </Button>
          <Button type="button" variant="outline" className="h-8 px-3 text-xs border-zc-border" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function HrStaffOnboardingPrivilegesPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const { branchId: branchCtxId, isReady: branchReady } = useBranchContext();

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});
  const [items, setItems] = React.useState<ClinicalPrivilegeDraft[]>([]);

  const [departments, setDepartments] = React.useState<DepartmentMini[]>([]);
  const [deptLoading, setDeptLoading] = React.useState(false);

  const [specialtiesByDept, setSpecialtiesByDept] = React.useState<Record<string, SpecialtyMini[]>>({});
  const [staffOptions, setStaffOptions] = React.useState<StaffMini[]>([]);
  const [staffLoading, setStaffLoading] = React.useState(false);

  const staffCategory = React.useMemo(() => {
    if (!draftId) return "";
    const d = readDraft(draftId);
    const sc =
      d?.employment_details?.professional_details?.staff_category ??
      d?.employment_details?.staff_category ??
      d?.employment_details?.category ??
      "";
    return String(sc || "").toUpperCase();
  }, [draftId]);

  const isDoctor = staffCategory === "DOCTOR";

  // Branch id resolution: prefer current selected branch context; fallback to draft (if present)
  const effectiveBranchId = React.useMemo(() => {
    if (branchReady && branchCtxId) return branchCtxId;
    if (!draftId) return "";
    const d = readDraft(draftId);
    const fromDraft =
      d?.employment_details?.branchId ??
      d?.employment_details?.branch_id ??
      d?.system_access?.home_branch_id ??
      d?.system_access?.branchId ??
      "";
    return String(fromDraft || "").trim();
  }, [branchReady, branchCtxId, draftId]);

  // Ensure draftId
  React.useEffect(() => {
    if (draftId) return;
    router.replace("/infrastructure/human-resource/staff/onboarding/personal" as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  // Load draft
  React.useEffect(() => {
    if (!draftId) return;

    setLoading(true);
    try {
      const draft = readDraft(draftId);
      const md: any = draft.medical_details ?? {};
      const raw = md.clinical_privileges;

      const list: ClinicalPrivilegeDraft[] = Array.isArray(raw)
        ? raw
            .filter((x: any) => x && typeof x === "object")
            .map((x: any) => ({
              id: String(x.id || makeId()),

              privilege_type: String(x.privilege_type || "ADMITTING").toUpperCase(),
              privilege_name: String(x.privilege_name || "").trim(),
              privilege_description: x.privilege_description ? String(x.privilege_description) : "",

              departments: Array.isArray(x.departments)
                ? x.departments.map((v: any) => String(v).trim()).filter(Boolean)
                : [],
              specialties: Array.isArray(x.specialties) ? x.specialties.map((v: any) => String(v).trim()).filter(Boolean) : [],
              procedures: Array.isArray(x.procedures) ? x.procedures.map((v: any) => String(v).trim()).filter(Boolean) : [],

              granted_by: String(x.granted_by || "").trim(),
              granted_by_role: x.granted_by_role ? String(x.granted_by_role).trim() : "",
              granted_date: x.granted_date ? String(x.granted_date).slice(0, 10) : "",

              effective_date: x.effective_date ? String(x.effective_date).slice(0, 10) : "",
              expiry_date: x.expiry_date ? String(x.expiry_date).slice(0, 10) : "",
              is_lifetime: !!x.is_lifetime,

              review_required: x.review_required === undefined ? true : !!x.review_required,
              review_cycle: (String(x.review_cycle || "ANNUAL").toUpperCase() as ReviewCycle) || "ANNUAL",
              last_review_date: x.last_review_date ? String(x.last_review_date).slice(0, 10) : "",
              next_review_date: x.next_review_date ? String(x.next_review_date).slice(0, 10) : "",
              reviewed_by: x.reviewed_by ? String(x.reviewed_by).trim() : "",
              review_remarks: x.review_remarks ? String(x.review_remarks) : "",

              conditions: Array.isArray(x.conditions) ? x.conditions.map((v: any) => String(v).trim()).filter(Boolean) : [],
              restrictions: Array.isArray(x.restrictions) ? x.restrictions.map((v: any) => String(v).trim()).filter(Boolean) : [],
              supervision_required: !!x.supervision_required,
              supervisor: x.supervisor ? String(x.supervisor).trim() : "",

              competency_assessment_required: !!x.competency_assessment_required,
              last_assessment_date: x.last_assessment_date ? String(x.last_assessment_date).slice(0, 10) : "",
              assessment_score:
                x.assessment_score === null || x.assessment_score === undefined || x.assessment_score === ""
                  ? null
                  : Number(x.assessment_score),
              assessor: x.assessor ? String(x.assessor).trim() : "",

              minimum_case_volume:
                x.minimum_case_volume === null || x.minimum_case_volume === undefined || x.minimum_case_volume === ""
                  ? null
                  : Number(x.minimum_case_volume),
              current_case_volume:
                x.current_case_volume === null || x.current_case_volume === undefined || x.current_case_volume === ""
                  ? null
                  : Number(x.current_case_volume),

              status: (String(x.status || "ACTIVE").toUpperCase() as PrivilegeStatus) || "ACTIVE",
              is_active: x.is_active === undefined ? true : !!x.is_active,

              credential_documents: Array.isArray(x.credential_documents)
                ? x.credential_documents.map((v: any) => String(v).trim()).filter(Boolean)
                : [],
            }))
        : [];

      setItems(list);
      setDirty(false);
      setErrors({});
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  // Fetch departments for selected branch
  React.useEffect(() => {
    if (!effectiveBranchId) {
      setDepartments([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setDeptLoading(true);
        const params = new URLSearchParams();
        params.set("branchId", effectiveBranchId);
        params.set("take", "200");

        // This endpoint exists in your codebase (used elsewhere):
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

        if (!cancelled) setDepartments(cleaned);
      } catch {
        if (!cancelled) setDepartments([]);
      } finally {
        if (!cancelled) setDeptLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveBranchId]);

  async function ensureSpecialtiesLoaded(deptId: string) {
    const did = String(deptId || "").trim();
    if (!did) return;
    if (Array.isArray(specialtiesByDept[did])) return;

    try {
      const q = effectiveBranchId ? `?branchId=${encodeURIComponent(effectiveBranchId)}` : "";
      const res: any = await apiFetch(`/api/departments/${encodeURIComponent(did)}/specialties${q}`);
      const rows: any[] = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      const cleaned: SpecialtyMini[] = rows
        .filter(Boolean)
        .map((s) => ({
          id: String(s.id),
          code: s.code ? String(s.code) : undefined,
          name: s.name ? String(s.name) : undefined,
          kind: s.kind ? String(s.kind) : undefined,
          isActive: s.isActive,
          active: s.active,
        }))
        .filter((s) => s.id);

      setSpecialtiesByDept((prev) => ({ ...prev, [did]: cleaned }));
    } catch {
      setSpecialtiesByDept((prev) => ({ ...prev, [did]: [] }));
    }
  }

  // Fetch staff (for Granted By / Reviewed By / Supervisor / Assessor)
  React.useEffect(() => {
    if (!effectiveBranchId) {
      setStaffOptions([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setStaffLoading(true);
        const params = new URLSearchParams();
        params.set("branchId", effectiveBranchId);
        params.set("status", "ACTIVE");
        params.set("onboarding", "BOARDED");
        params.set("take", "250");

        // primary + legacy, because some deployments use either
        const res: any = await apiFetchWithFallback(
          `/api/infrastructure/human-resource/staff?${params.toString()}`,
          `/api/infrastructure/staff?${params.toString()}`
        );

        const rows: any[] = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
        const cleaned: StaffMini[] = rows
          .filter(Boolean)
          .map((r) => ({
            id: String(r.id),
            empCode: r.empCode ? String(r.empCode) : r.emp_code ? String(r.emp_code) : undefined,
            code: r.code ? String(r.code) : undefined,
            name: r.name ? String(r.name) : undefined,
            designation: r.designation ? String(r.designation) : undefined,
            departmentId: r.departmentId ? String(r.departmentId) : r.department_id ? String(r.department_id) : undefined,
            department: r.department ? String(r.department) : undefined,
            roleName: r.roleName ? String(r.roleName) : undefined,
            roleCode: r.roleCode ? String(r.roleCode) : undefined,
            systemRole: r.systemRole ? String(r.systemRole) : undefined,
            system_access: r.system_access,
            systemAccess: r.systemAccess,
          }))
          .filter((s) => s.id);

        cleaned.sort((a, b) => formatStaffLabel(a).localeCompare(formatStaffLabel(b)));

        if (!cancelled) setStaffOptions(cleaned);
      } catch {
        if (!cancelled) setStaffOptions([]);
      } finally {
        if (!cancelled) setStaffLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveBranchId]);

  function setAt(idx: number, next: ClinicalPrivilegeDraft) {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
    setDirty(true);
  }

  function addPrivilege() {
    const id = makeId();
    setItems((prev) => [
      ...prev,
      {
        id,
        privilege_type: "ADMITTING",
        privilege_name: "Admitting privilege",
        privilege_description: "",

        departments: [],
        specialties: [],
        procedures: [],

        granted_by: "",
        granted_by_role: "",
        granted_date: "",

        effective_date: "",
        expiry_date: "",
        is_lifetime: true,

        review_required: true,
        review_cycle: "ANNUAL",
        last_review_date: "",
        next_review_date: "",
        reviewed_by: "",
        review_remarks: "",

        conditions: [],
        restrictions: [],
        supervision_required: false,
        supervisor: "",

        competency_assessment_required: false,
        last_assessment_date: "",
        assessment_score: null,
        assessor: "",

        minimum_case_volume: null,
        current_case_volume: null,

        status: "ACTIVE",
        is_active: true,

        credential_documents: [],
      },
    ]);
    setDirty(true);
  }

  function removePrivilege(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
    setDirty(true);
  }

  function toList(csv: string) {
    return String(csv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function toLines(txt: string) {
    return String(txt || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};

    items.forEach((p, idx) => {
      const pref = `items.${idx}`;

      const t = String(p.privilege_type || "").trim();
      const n = String(p.privilege_name || "").trim();
      const deptId = String(p.departments?.[0] || "").trim();

      if (!t) e[`${pref}.privilege_type`] = "Type is required.";
      if (!n) e[`${pref}.privilege_name`] = "Privilege name is required.";
      if (!deptId) e[`${pref}.department`] = "Department is required.";

      if (!String(p.effective_date || "").trim()) e[`${pref}.effective_date`] = "Effective date is required.";
      if (!p.is_lifetime && !String(p.expiry_date || "").trim()) e[`${pref}.expiry_date`] = "Expiry date is required (or set Lifetime).";

      const gd = String(p.granted_date || "").trim();
      if (gd && !isISODate(gd)) e[`${pref}.granted_date`] = "Use YYYY-MM-DD.";
      const eff = String(p.effective_date || "").trim();
      if (eff && !isISODate(eff)) e[`${pref}.effective_date`] = "Use YYYY-MM-DD.";
      const exp = String(p.expiry_date || "").trim();
      if (exp && !isISODate(exp)) e[`${pref}.expiry_date`] = "Use YYYY-MM-DD.";
      if (eff && exp && eff > exp) e[`${pref}.expiry_date`] = "Expiry cannot be before effective date.";

      if (!String(p.granted_by || "").trim()) e[`${pref}.granted_by`] = "Granted by is required.";

      if (String(p.privilege_type || "").toUpperCase() === "PROCEDURE" && (!p.procedures || p.procedures.length === 0)) {
        e[`${pref}.procedures`] = "Add at least one procedure for PROCEDURE privileges.";
      }

      if (p.supervision_required && !String(p.supervisor || "").trim()) {
        e[`${pref}.supervisor`] = "Supervisor is required when supervision is required.";
      }

      if (p.review_required && !p.review_cycle) {
        e[`${pref}.review_cycle`] = "Review cycle is required when review is required.";
      }

      if (p.competency_assessment_required) {
        const score = p.assessment_score;
        if (score !== null && score !== undefined && String(score) !== "") {
          const nScore = Number(score);
          if (Number.isNaN(nScore) || nScore < 0 || nScore > 100) e[`${pref}.assessment_score`] = "Score must be 0–100.";
        }
      }

      const mv = p.minimum_case_volume;
      if (mv !== null && mv !== undefined && String(mv) !== "") {
        const nMv = Number(mv);
        if (Number.isNaN(nMv) || nMv < 0) e[`${pref}.minimum_case_volume`] = "Minimum case volume must be ≥ 0.";
      }
    });

    return e;
  }

  function normalize(p: ClinicalPrivilegeDraft): ClinicalPrivilegeDraft {
    const t = String(p.privilege_type || "").toUpperCase();
    const defaultName =
      t === "ADMITTING"
        ? "Admitting privilege"
        : t === "PRESCRIPTION"
        ? "Prescription privilege"
        : t === "SURGICAL"
        ? "Surgical privilege"
        : t === "ANESTHESIA"
        ? "Anesthesia privilege"
        : t === "PROCEDURE"
        ? "Procedure privilege"
        : t
        ? `${t.replace(/_/g, " ").toLowerCase()} privilege`
        : "";

    return {
      ...p,
      privilege_type: (t as any) || p.privilege_type,
      privilege_name: String(p.privilege_name || "").trim() || defaultName,
      privilege_description: cleanOpt(p.privilege_description) ?? "",

      departments: Array.isArray(p.departments) ? p.departments.map((x) => String(x).trim()).filter(Boolean) : [],
      specialties: Array.isArray(p.specialties) ? p.specialties.map((x) => String(x).trim()).filter(Boolean) : [],
      procedures: Array.isArray(p.procedures) ? p.procedures.map((x) => String(x).trim()).filter(Boolean) : [],

      granted_by: String(p.granted_by || "").trim(),
      granted_by_role: cleanOpt(p.granted_by_role) ?? "",
      granted_date: cleanDateOpt(p.granted_date) ?? "",

      effective_date: cleanDateOpt(p.effective_date) ?? "",
      expiry_date: p.is_lifetime ? "" : cleanDateOpt(p.expiry_date) ?? "",
      is_lifetime: !!p.is_lifetime,

      review_required: !!p.review_required,
      review_cycle: (String(p.review_cycle || "ANNUAL").toUpperCase() as ReviewCycle) || "ANNUAL",
      last_review_date: cleanDateOpt(p.last_review_date) ?? "",
      next_review_date: cleanDateOpt(p.next_review_date) ?? "",
      reviewed_by: cleanOpt(p.reviewed_by) ?? "",
      review_remarks: cleanOpt(p.review_remarks) ?? "",

      conditions: Array.isArray(p.conditions) ? p.conditions.map((x) => String(x).trim()).filter(Boolean) : [],
      restrictions: Array.isArray(p.restrictions) ? p.restrictions.map((x) => String(x).trim()).filter(Boolean) : [],
      supervision_required: !!p.supervision_required,
      supervisor: p.supervision_required ? (cleanOpt(p.supervisor) ?? "") : "",

      competency_assessment_required: !!p.competency_assessment_required,
      last_assessment_date: cleanDateOpt(p.last_assessment_date) ?? "",
      assessment_score:
        p.assessment_score === null || p.assessment_score === undefined || String(p.assessment_score) === ""
          ? null
          : Number(p.assessment_score),
      assessor: cleanOpt(p.assessor) ?? "",

      minimum_case_volume:
        p.minimum_case_volume === null || p.minimum_case_volume === undefined || String(p.minimum_case_volume) === ""
          ? null
          : Number(p.minimum_case_volume),
      current_case_volume:
        p.current_case_volume === null || p.current_case_volume === undefined || String(p.current_case_volume) === ""
          ? null
          : Number(p.current_case_volume),

      status: (String(p.status || "ACTIVE").toUpperCase() as PrivilegeStatus) || "ACTIVE",
      is_active: !!p.is_active,

      credential_documents: Array.isArray(p.credential_documents)
        ? p.credential_documents.map((x) => String(x).trim()).filter(Boolean)
        : [],
    };
  }

  function saveDraftOrThrow() {
    if (!draftId) return;

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast({
        variant: "destructive",
        title: "Fix required fields",
        description: "Please fix the highlighted items to continue.",
      });
      throw new Error("validation_failed");
    }

    const existing = readDraft(draftId);
    const md: any = existing.medical_details ?? {};
    const normalized = items.map(normalize);

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      medical_details: {
        ...md,
        clinical_privileges: normalized,
      },
    };

    writeDraft(draftId, nextDraft);
    setDirty(false);
    toast({ title: "Saved", description: "Clinical privileges saved to draft." });
  }

  function onSave() {
    try {
      saveDraftOrThrow();
    } catch {
      // handled
    }
  }

  function onSaveAndNext() {
    try {
      saveDraftOrThrow();
      router.push(withDraftId("/infrastructure/human-resource/staff/onboarding/system-access", draftId) as any);
    } catch {
      // handled
    }
  }

  const deptOptions = React.useMemo(
    () =>
      departments
        .filter((d) => d && d.id)
        .map((d) => ({ value: d.id, label: formatDeptLabel(d) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [departments]
  );

  function getDeptValue(p: ClinicalPrivilegeDraft) {
    return String(p.departments?.[0] || "").trim();
  }

  function getLegacySelectItemIfMissing(currentValue: string, options: { value: string; label: string }[]) {
    if (!currentValue) return null;
    if (options.some((o) => o.value === currentValue)) return null;
    return { value: currentValue, label: `Legacy: ${currentValue}` };
  }

  return (
    <OnboardingShell
      stepKey="privileges"
      title="Clinical privileges"
      description="Privilege grants (admitting/procedure/etc.), approvals, validity and review cycles."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/human-resource/staff/onboarding/credentials", draftId) as any)}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-zc-border" onClick={onSave} disabled={loading}>
              Save
            </Button>
            <Button className="bg-zc-accent text-white hover:bg-zc-accent/90" onClick={onSaveAndNext} disabled={loading}>
              Save &amp; Next
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zc-foreground">Step 5: Clinical privileges</div>
            <div className="mt-1 text-xs text-zc-muted">
              Doctors only. You can add privileges now (recommended) or skip and finalize later in the full Privilege Management module.
            </div>
            <div className="mt-2 text-[11px] text-zc-muted">
              Branch: <span className="font-mono">{effectiveBranchId || "—"}</span>{" "}
              {deptLoading ? <span className="ml-2">• Loading departments…</span> : null}
              {staffLoading ? <span className="ml-2">• Loading staff…</span> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="border border-zc-border">
              Staff category: {staffCategory || "—"}
            </Badge>

            {dirty ? (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400" variant="secondary">
                Unsaved changes
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                Saved
              </Badge>
            )}
          </div>
        </div>

        {!isDoctor ? (
          <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-sm text-zc-muted">
            This step is intended for <span className="text-zc-foreground">Doctors</span>. Your current staff category is{" "}
            <span className="text-zc-foreground">{staffCategory || "—"}</span>. You can proceed without adding privileges.
          </div>
        ) : null}

        <Separator className="bg-zc-border" />

        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Privilege grants</div>
          <Button className="bg-zc-accent text-white hover:bg-zc-accent/90" onClick={addPrivilege} disabled={loading}>
            + Add privilege
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-sm text-zc-muted">No privileges added yet.</div>
        ) : (
          <div className="grid gap-3">
            {items.map((p, idx) => {
              const pref = `items.${idx}`;
              const typeErr = errors[`${pref}.privilege_type`];
              const nameErr = errors[`${pref}.privilege_name`];
              const deptErr = errors[`${pref}.department`];
              const effErr = errors[`${pref}.effective_date`];
              const expErr = errors[`${pref}.expiry_date`];
              const grantErr = errors[`${pref}.granted_by`];
              const procErr = errors[`${pref}.procedures`];
              const supErr = errors[`${pref}.supervisor`];
              const scoreErr = errors[`${pref}.assessment_score`];
              const mvErr = errors[`${pref}.minimum_case_volume`];
              const rcErr = errors[`${pref}.review_cycle`];

              const deptId = getDeptValue(p);
              const deptLegacy = getLegacySelectItemIfMissing(deptId, deptOptions);

              const specRows = deptId ? specialtiesByDept[deptId] : undefined;
              const specOptions =
                deptId && Array.isArray(specRows)
                  ? specRows
                      .filter((s) => s && s.id)
                      .map((s) => ({ value: s.id, label: formatSpecLabel(s) }))
                      .sort((a, b) => a.label.localeCompare(b.label))
                  : [];

              const grantedStaff = staffOptions.find((s) => s.id === p.granted_by) || null;
              const reviewedStaff = staffOptions.find((s) => s.id === p.reviewed_by) || null;
              const supervisorStaff = staffOptions.find((s) => s.id === p.supervisor) || null;
              const assessorStaff = staffOptions.find((s) => s.id === p.assessor) || null;

              return (
                <div key={p.id} className="rounded-md border border-zc-border bg-zc-panel/40 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="border border-zc-border">
                          Privilege #{idx + 1}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "border border-zc-border",
                            p.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : p.status === "PROVISIONAL" || p.status === "PENDING_REVIEW"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          )}
                        >
                          {p.status}
                        </Badge>
                        {p.is_active ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-zc-border/40 text-zc-muted" variant="secondary">
                            Inactive
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 text-xs text-zc-muted">
                        Type + scope + validity + grantor + department/specialty + review cycle.
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 border-zc-border px-3 text-xs"
                      onClick={() => removePrivilege(p.id)}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Field label="Type" required error={typeErr}>
                      <Select
                        value={String(p.privilege_type || "")}
                        onValueChange={(v) => {
                          const t = String(v).toUpperCase();
                          const suggested =
                            t === "ADMITTING"
                              ? "Admitting privilege"
                              : t === "PRESCRIPTION"
                              ? "Prescription privilege"
                              : t === "SURGICAL"
                              ? "Surgical privilege"
                              : t === "ANESTHESIA"
                              ? "Anesthesia privilege"
                              : t === "PROCEDURE"
                              ? "Procedure privilege"
                              : "";
                          setAt(idx, {
                            ...p,
                            privilege_type: t,
                            privilege_name: p.privilege_name?.trim() ? p.privilege_name : suggested,
                          });
                          setErrors((e) => {
                            const n = { ...e };
                            delete n[`${pref}.privilege_type`];
                            delete n[`${pref}.procedures`];
                            return n;
                          });
                        }}
                      >
                        <SelectTrigger className={cn("border-zc-border", typeErr ? "border-red-500" : "")}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIVILEGE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Privilege name" required error={nameErr}>
                      <Input
                        className={cn("border-zc-border", nameErr ? "border-red-500" : "")}
                        value={p.privilege_name ?? ""}
                        onChange={(e) => {
                          setAt(idx, { ...p, privilege_name: e.target.value });
                          setErrors((er) => {
                            const n = { ...er };
                            delete n[`${pref}.privilege_name`];
                            return n;
                          });
                        }}
                        placeholder="e.g., Admitting privilege"
                      />
                    </Field>

                    <Field label="Department" required error={deptErr} help={deptLoading ? "Loading…" : "Branch-scoped"}>
                      <Select
                        value={deptId}
                        onValueChange={async (v) => {
                          const nextDeptId = String(v || "").trim();
                          // set dept and clear specialties when dept changes
                          setAt(idx, { ...p, departments: nextDeptId ? [nextDeptId] : [], specialties: [] });
                          setErrors((er) => {
                            const n = { ...er };
                            delete n[`${pref}.department`];
                            return n;
                          });
                          if (nextDeptId) await ensureSpecialtiesLoaded(nextDeptId);
                        }}
                      >
                        <SelectTrigger className={cn("border-zc-border", deptErr ? "border-red-500" : "")} disabled={!effectiveBranchId}>
                          <SelectValue placeholder={effectiveBranchId ? "Select department" : "Select branch first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {deptLegacy ? (
                            <SelectItem value={deptLegacy.value}>{deptLegacy.label}</SelectItem>
                          ) : null}
                          {deptOptions.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Specialties" help={deptId ? "Optional (based on department)" : "Select department first"}>
                      <div className="grid gap-2">
                        <MultiSelectPopover
                          disabled={!deptId}
                          value={Array.isArray(p.specialties) ? p.specialties : []}
                          options={specOptions}
                          onChange={(next) => setAt(idx, { ...p, specialties: next })}
                          placeholder={deptId ? (specRows ? "Select specialties" : "Loading…") : "Select department first"}
                        />
                        {p.specialties?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {p.specialties.slice(0, 6).map((sid) => {
                              const lbl = specOptions.find((x) => x.value === sid)?.label || sid;
                              return (
                                <Badge key={sid} variant="secondary" className="border border-zc-border">
                                  {lbl}
                                </Badge>
                              );
                            })}
                            {p.specialties.length > 6 ? (
                              <Badge variant="secondary" className="border border-zc-border">
                                +{p.specialties.length - 6} more
                              </Badge>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </Field>

                    <Field label="Procedures" help="Comma separated" error={procErr}>
                      <Input
                        className={cn("border-zc-border", procErr ? "border-red-500" : "")}
                        value={(p.procedures ?? []).join(", ")}
                        onChange={(e) => {
                          setAt(idx, { ...p, procedures: toList(e.target.value) });
                          setErrors((er) => {
                            const n = { ...er };
                            delete n[`${pref}.procedures`];
                            return n;
                          });
                        }}
                        placeholder="e.g., Angioplasty, Pacemaker implantation"
                      />
                    </Field>

                    <Field label="Description" help="Optional">
                      <Textarea
                        className="border-zc-border"
                        value={p.privilege_description ?? ""}
                        onChange={(e) => setAt(idx, { ...p, privilege_description: e.target.value })}
                        placeholder="Optional notes"
                      />
                    </Field>
                  </div>

                  <Separator className="my-3 bg-zc-border" />

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-zc-border bg-transparent p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Validity</div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="grid gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs text-zc-muted">
                              Effective date <span className="text-red-500">*</span>
                            </Label>
                          </div>
                          <Input
                            className={cn("border-zc-border", effErr ? "border-red-500" : "")}
                            value={p.effective_date ?? ""}
                            onChange={(e) => {
                              setAt(idx, { ...p, effective_date: e.target.value });
                              setErrors((er) => {
                                const n = { ...er };
                                delete n[`${pref}.effective_date`];
                                return n;
                              });
                            }}
                            placeholder="YYYY-MM-DD"
                          />
                          {effErr ? <div className="mt-1 text-xs text-red-500">{effErr}</div> : null}
                        </div>

                        <div className="grid gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs text-zc-muted">Lifetime</Label>
                          </div>
                          <div className="flex items-center justify-between rounded-md border border-zc-border px-3 py-2">
                            <span className="text-xs text-zc-muted">is_lifetime</span>
                            <Switch
                              checked={!!p.is_lifetime}
                              onCheckedChange={(v) => {
                                setAt(idx, { ...p, is_lifetime: v, expiry_date: v ? "" : p.expiry_date });
                                setErrors((er) => {
                                  const n = { ...er };
                                  delete n[`${pref}.expiry_date`];
                                  return n;
                                });
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid gap-1 md:col-span-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs text-zc-muted">
                              Expiry date {!p.is_lifetime ? <span className="text-red-500">*</span> : null}
                            </Label>
                          </div>
                          <Input
                            className={cn("border-zc-border", expErr ? "border-red-500" : "")}
                            value={p.expiry_date ?? ""}
                            onChange={(e) => {
                              setAt(idx, { ...p, expiry_date: e.target.value });
                              setErrors((er) => {
                                const n = { ...er };
                                delete n[`${pref}.expiry_date`];
                                return n;
                              });
                            }}
                            placeholder={p.is_lifetime ? "—" : "YYYY-MM-DD"}
                            disabled={p.is_lifetime}
                          />
                          {expErr ? <div className="mt-1 text-xs text-red-500">{expErr}</div> : null}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-zc-border bg-transparent p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Authorization</div>

                      <div className="mt-3 grid gap-3">
                        <Field label="Granted by" required error={grantErr} help={staffLoading ? "Loading…" : "Staff list"}>
                          <Select
                            value={String(p.granted_by || "")}
                            onValueChange={(v) => {
                              const staffId = String(v || "").trim();
                              const staff = staffOptions.find((s) => s.id === staffId) || null;
                              setAt(idx, {
                                ...p,
                                granted_by: staffId,
                                granted_by_role: inferStaffRole(staff),
                              });
                              setErrors((er) => {
                                const n = { ...er };
                                delete n[`${pref}.granted_by`];
                                return n;
                              });
                            }}
                          >
                            <SelectTrigger className={cn("border-zc-border", grantErr ? "border-red-500" : "")} disabled={!staffOptions.length}>
                              <SelectValue placeholder={staffOptions.length ? "Select grantor" : "No staff found"} />
                            </SelectTrigger>
                            <SelectContent>
                              {/* If legacy value exists (name/code) keep selectable */}
                              {!staffOptions.some((s) => s.id === p.granted_by) && p.granted_by ? (
                                <SelectItem value={p.granted_by}>Legacy: {p.granted_by}</SelectItem>
                              ) : null}
                              {staffOptions.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {formatStaffLabel(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Role (auto from Granted By)" help="Read-only">
                          <Input className="border-zc-border" value={p.granted_by_role ?? inferStaffRole(grantedStaff)} disabled />
                        </Field>

                        <Field label="Granted date" help="YYYY-MM-DD">
                          <Input
                            className={cn("border-zc-border", errors[`${pref}.granted_date`] ? "border-red-500" : "")}
                            value={p.granted_date ?? ""}
                            onChange={(e) => {
                              setAt(idx, { ...p, granted_date: e.target.value });
                              setErrors((er) => {
                                const n = { ...er };
                                delete n[`${pref}.granted_date`];
                                return n;
                              });
                            }}
                            placeholder="YYYY-MM-DD"
                          />
                          {errors[`${pref}.granted_date`] ? (
                            <div className="text-xs text-red-500">{errors[`${pref}.granted_date`]}</div>
                          ) : null}
                        </Field>

                        <Field label="Reviewed by" help="Optional (staff)">
                          <Select
                            value={String(p.reviewed_by || "")}
                            onValueChange={(v) => setAt(idx, { ...p, reviewed_by: String(v || "").trim() })}
                          >
                            <SelectTrigger className="border-zc-border" disabled={!staffOptions.length || !p.review_required}>
                              <SelectValue placeholder={!p.review_required ? "Review not required" : staffOptions.length ? "Select reviewer" : "No staff"} />
                            </SelectTrigger>
                            <SelectContent>
                              {!staffOptions.some((s) => s.id === p.reviewed_by) && p.reviewed_by ? (
                                <SelectItem value={p.reviewed_by}>Legacy: {p.reviewed_by}</SelectItem>
                              ) : null}
                              {staffOptions.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {formatStaffLabel(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {reviewedStaff ? (
                            <div className="mt-1 text-[11px] text-zc-muted">Selected: {formatStaffLabel(reviewedStaff)}</div>
                          ) : null}
                        </Field>

                        <Field label="Supervisor" help={p.supervision_required ? "Required when supervision is ON" : "Optional"} error={supErr}>
                          <Select
                            value={String(p.supervisor || "")}
                            onValueChange={(v) => {
                              setAt(idx, { ...p, supervisor: String(v || "").trim() });
                              setErrors((er) => {
                                const n = { ...er };
                                delete n[`${pref}.supervisor`];
                                return n;
                              });
                            }}
                          >
                            <SelectTrigger className={cn("border-zc-border", supErr ? "border-red-500" : "")} disabled={!staffOptions.length}>
                              <SelectValue placeholder={staffOptions.length ? "Select supervisor" : "No staff"} />
                            </SelectTrigger>
                            <SelectContent>
                              {!staffOptions.some((s) => s.id === p.supervisor) && p.supervisor ? (
                                <SelectItem value={p.supervisor}>Legacy: {p.supervisor}</SelectItem>
                              ) : null}
                              {staffOptions.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {formatStaffLabel(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {supervisorStaff ? (
                            <div className="mt-1 text-[11px] text-zc-muted">Selected: {formatStaffLabel(supervisorStaff)}</div>
                          ) : null}
                        </Field>

                        <Field label="Assessor" help="Optional (staff)">
                          <Select
                            value={String(p.assessor || "")}
                            onValueChange={(v) => setAt(idx, { ...p, assessor: String(v || "").trim() })}
                          >
                            <SelectTrigger className="border-zc-border" disabled={!staffOptions.length || !p.competency_assessment_required}>
                              <SelectValue
                                placeholder={!p.competency_assessment_required ? "Assessment not required" : staffOptions.length ? "Select assessor" : "No staff"}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {!staffOptions.some((s) => s.id === p.assessor) && p.assessor ? (
                                <SelectItem value={p.assessor}>Legacy: {p.assessor}</SelectItem>
                              ) : null}
                              {staffOptions.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {formatStaffLabel(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {assessorStaff ? (
                            <div className="mt-1 text-[11px] text-zc-muted">Selected: {formatStaffLabel(assessorStaff)}</div>
                          ) : null}
                        </Field>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-3 bg-zc-border" />

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-zc-border bg-transparent p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Review cycle</div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-zc-muted">Required</Label>
                          <Switch
                            checked={!!p.review_required}
                            onCheckedChange={(v) => {
                              setAt(idx, { ...p, review_required: v });
                              setErrors((er) => {
                                const n = { ...er };
                                delete n[`${pref}.review_cycle`];
                                return n;
                              });
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3">
                        <Field label="Review cycle" error={rcErr} help="If review required">
                          <Select
                            value={p.review_cycle}
                            onValueChange={(v) => {
                              setAt(idx, { ...p, review_cycle: String(v).toUpperCase() as ReviewCycle });
                              setErrors((er) => {
                                const n = { ...er };
                                delete n[`${pref}.review_cycle`];
                                return n;
                              });
                            }}
                          >
                            <SelectTrigger className={cn("border-zc-border", rcErr ? "border-red-500" : "")} disabled={!p.review_required}>
                              <SelectValue placeholder="Select cycle" />
                            </SelectTrigger>
                            <SelectContent>
                              {REVIEW_CYCLES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="Last review" help="YYYY-MM-DD">
                            <Input
                              className="border-zc-border"
                              value={p.last_review_date ?? ""}
                              onChange={(e) => setAt(idx, { ...p, last_review_date: e.target.value })}
                              placeholder="YYYY-MM-DD"
                              disabled={!p.review_required}
                            />
                          </Field>
                          <Field label="Next review" help="YYYY-MM-DD">
                            <Input
                              className="border-zc-border"
                              value={p.next_review_date ?? ""}
                              onChange={(e) => setAt(idx, { ...p, next_review_date: e.target.value })}
                              placeholder="YYYY-MM-DD"
                              disabled={!p.review_required}
                            />
                          </Field>
                        </div>

                        <Field label="Review remarks" help="Optional">
                          <Textarea
                            className="border-zc-border"
                            value={p.review_remarks ?? ""}
                            onChange={(e) => setAt(idx, { ...p, review_remarks: e.target.value })}
                            placeholder="Optional"
                            disabled={!p.review_required}
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="rounded-md border border-zc-border bg-transparent p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Conditions & checks</div>

                      <div className="mt-3 grid gap-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="grid gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <Label className="text-xs text-zc-muted">Supervision required</Label>
                            </div>
                            <div className="flex items-center justify-between rounded-md border border-zc-border px-3 py-2">
                              <span className="text-xs text-zc-muted">supervision_required</span>
                              <Switch
                                checked={!!p.supervision_required}
                                onCheckedChange={(v) => {
                                  setAt(idx, { ...p, supervision_required: v, supervisor: v ? p.supervisor : "" });
                                  setErrors((er) => {
                                    const n = { ...er };
                                    delete n[`${pref}.supervisor`];
                                    return n;
                                  });
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <Label className="text-xs text-zc-muted">Competency assessment required</Label>
                            </div>
                            <div className="flex items-center justify-between rounded-md border border-zc-border px-3 py-2">
                              <span className="text-xs text-zc-muted">competency_assessment_required</span>
                              <Switch
                                checked={!!p.competency_assessment_required}
                                onCheckedChange={(v) =>
                                  setAt(idx, { ...p, competency_assessment_required: v, assessor: v ? p.assessor : "" })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <Field label="Conditions" help="Comma separated">
                          <Input
                            className="border-zc-border"
                            value={(p.conditions ?? []).join(", ")}
                            onChange={(e) => setAt(idx, { ...p, conditions: toList(e.target.value) })}
                            placeholder="e.g., Under supervision first 10 cases"
                          />
                        </Field>

                        <Field label="Restrictions" help="Comma separated">
                          <Input
                            className="border-zc-border"
                            value={(p.restrictions ?? []).join(", ")}
                            onChange={(e) => setAt(idx, { ...p, restrictions: toList(e.target.value) })}
                            placeholder="e.g., Not for pediatric patients"
                          />
                        </Field>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="Last assessment" help="YYYY-MM-DD">
                            <Input
                              className="border-zc-border"
                              value={p.last_assessment_date ?? ""}
                              onChange={(e) => setAt(idx, { ...p, last_assessment_date: e.target.value })}
                              placeholder="YYYY-MM-DD"
                              disabled={!p.competency_assessment_required}
                            />
                          </Field>

                          <Field label="Assessment score" help="0–100" error={scoreErr}>
                            <Input
                              className={cn("border-zc-border", scoreErr ? "border-red-500" : "")}
                              value={p.assessment_score === null || p.assessment_score === undefined ? "" : String(p.assessment_score)}
                              onChange={(e) => {
                                const v = e.target.value;
                                setAt(idx, { ...p, assessment_score: v === "" ? null : Number(v) });
                                setErrors((er) => {
                                  const n = { ...er };
                                  delete n[`${pref}.assessment_score`];
                                  return n;
                                });
                              }}
                              placeholder="e.g., 85"
                              disabled={!p.competency_assessment_required}
                            />
                          </Field>

                          <Field label="Minimum case volume" help="Optional" error={mvErr}>
                            <Input
                              className={cn("border-zc-border", mvErr ? "border-red-500" : "")}
                              value={p.minimum_case_volume === null || p.minimum_case_volume === undefined ? "" : String(p.minimum_case_volume)}
                              onChange={(e) => {
                                const v = e.target.value;
                                setAt(idx, { ...p, minimum_case_volume: v === "" ? null : Number(v) });
                                setErrors((er) => {
                                  const n = { ...er };
                                  delete n[`${pref}.minimum_case_volume`];
                                  return n;
                                });
                              }}
                              placeholder="e.g., 20"
                            />
                          </Field>

                          <Field label="Current case volume" help="Optional">
                            <Input
                              className="border-zc-border"
                              value={p.current_case_volume === null || p.current_case_volume === undefined ? "" : String(p.current_case_volume)}
                              onChange={(e) => {
                                const v = e.target.value;
                                setAt(idx, { ...p, current_case_volume: v === "" ? null : Number(v) });
                              }}
                              placeholder="e.g., 12"
                            />
                          </Field>
                        </div>

                        <Field label="Supporting documents" help="One URL/ref per line">
                          <Textarea
                            className="border-zc-border"
                            value={(p.credential_documents ?? []).join("\n")}
                            onChange={(e) => setAt(idx, { ...p, credential_documents: toLines(e.target.value) })}
                            placeholder="https://... (one per line)"
                          />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-3 bg-zc-border" />

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Status" required>
                      <Select value={p.status} onValueChange={(v) => setAt(idx, { ...p, status: String(v).toUpperCase() as PrivilegeStatus })}>
                        <SelectTrigger className="border-zc-border">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIV_STATUS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <div className="grid gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs text-zc-muted">Active</Label>
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-zc-border bg-transparent px-3 py-2">
                        <span className="text-xs text-zc-muted">is_active</span>
                        <Switch checked={!!p.is_active} onCheckedChange={(v) => setAt(idx, { ...p, is_active: v })} />
                      </div>
                    </div>
                  </div>

                  {/* preload specialties if dept selected and not loaded yet */}
                  {deptId && !Array.isArray(specRows) ? (
                    <div className="mt-2 text-[11px] text-zc-muted">
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        onClick={() => void ensureSpecialtiesLoaded(deptId)}
                      >
                        Load specialties for selected department
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
          <div className="font-medium text-zc-foreground">Next step</div>
          <div className="mt-1">
            System Access: <span className="font-mono">/onboarding/system-access</span>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

/* ---------- UI helper ---------- */

function Field({
  label,
  required,
  help,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-zc-muted">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </Label>
        {help ? <span className="text-[10px] text-zc-muted">{help}</span> : null}
      </div>
      {children}
      {error ? <div className="text-xs text-red-500">{error}</div> : null}
    </div>
  );
}

/* ---------- draft storage ---------- */

function withDraftId(href: string, draftId: string | null): string {
  if (!draftId) return href;
  const u = new URL(href, "http://local");
  u.searchParams.set("draftId", draftId);
  return u.pathname + "?" + u.searchParams.toString();
}

function storageKey(draftId: string) {
  return `hrStaffOnboardingDraft:${draftId}`;
}

function readDraft(draftId: string): StaffOnboardingDraft {
  try {
    const raw = localStorage.getItem(storageKey(draftId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StaffOnboardingDraft;
  } catch {
    return {};
  }
}

function writeDraft(draftId: string, draft: StaffOnboardingDraft) {
  try {
    localStorage.setItem(storageKey(draftId), JSON.stringify(draft));
  } catch {
    // ignore
  }
}

/* ---------- misc ---------- */

function isISODate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());
}

function cleanOpt(v: any): string | undefined {
  const s = String(v ?? "").trim();
  return s ? s : undefined;
}

function cleanDateOpt(v: any): string | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function makeId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    // ignore
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
