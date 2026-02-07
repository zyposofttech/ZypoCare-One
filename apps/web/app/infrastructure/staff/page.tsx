"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { AppLink as Link } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";

import {
  AlertTriangle,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Users,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type DepartmentRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
};

type StaffAssignmentLite = {
  id: string;
  branchId: string;
  departmentId?: string | null;
  facilityId?: string | null;
  unitId?: string | null;
  specialtyId?: string | null;
  designation?: string | null;
  branchEmpCode?: string | null;
  assignmentType?: string | null; // PERMANENT | TEMPORARY | ROTATION | ...
  status?: string | null; // ACTIVE | PLANNED | SUSPENDED | ENDED
  effectiveFrom: string;
  effectiveTo?: string | null;
  isPrimary: boolean;
};

type StaffListItem = {
  id: string;
  empCode: string;
  name: string;
  designation: string;
  category: "MEDICAL" | "NON_MEDICAL";
  engagementType: "EMPLOYEE" | "CONSULTANT" | "VISITING" | "LOCUM" | "CONTRACTOR" | "INTERN" | "TRAINEE" | "VENDOR";
  status: "ACTIVE" | "SUSPENDED" | "OFFBOARDED";
  phone?: string | null;
  email?: string | null;
  hprId?: string | null;
  homeBranchId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email?: string | null; isActive: boolean; source?: string | null } | null;
  assignments: StaffAssignmentLite[];
};

type StaffListResponse = {
  items: StaffListItem[];
  nextCursor: string | null;
  take: number;
};

type DedupePreviewResponse = {
  matches: Array<{
    id: string;
    empCode: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    hprId?: string | null;
    status?: string | null;
    isActive?: boolean | null;
    matchSource?: string;
  }>;
  identifierHits: Array<{ staffId: string; type: string; valueLast4?: string | null }>;
};

/* ----------------------------- UI Helpers ----------------------------- */

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[980px] translate-x-0 translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

function ModalHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  // onClose is kept for API compatibility with existing call sites.
  // DialogContent already renders its own close button.
  void onClose;
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>

      <Separator className="my-4" />
    </>
  );
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function fmtDate(value?: string | Date | null) {
  if (!value) return "--";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);
}

function fmtRange(from?: string | null, to?: string | null) {
  const a = from ? fmtDate(from) : "--";
  const b = to ? fmtDate(to) : "Open";
  return `${a} -> ${b}`;
}

function primaryAssignment(assignments: StaffAssignmentLite[]) {
  if (!Array.isArray(assignments) || assignments.length === 0) return null;
  return assignments.find((a) => a.isPrimary) ?? assignments[0];
}

function statusBadgeVariant(s?: string | null) {
  const v = String(s || "").toUpperCase();
  if (v === "ACTIVE") return "success" as const;
  if (v === "PLANNED") return "info" as const;
  if (v === "SUSPENDED") return "warning" as const;
  if (v === "OFFBOARDED" || v === "ENDED") return "destructive" as const;
  return "secondary" as const;
}

function categoryLabel(c: string) {
  return c === "MEDICAL" ? "Medical" : "Non-medical";
}

function engagementLabel(e: string) {
  const m: Record<string, string> = {
    EMPLOYEE: "Employee",
    CONSULTANT: "Consultant",
    VISITING: "Visiting",
    LOCUM: "Locum",
    CONTRACTOR: "Contractor",
    INTERN: "Intern",
    TRAINEE: "Trainee",
    VENDOR: "Vendor",
  };
  return m[e] ?? e;
}

function assignmentTypeLabel(t?: string | null) {
  const m: Record<string, string> = {
    PERMANENT: "Permanent",
    TEMPORARY: "Temporary",
    ROTATION: "Rotation",
    VISITING: "Visiting",
    LOCUM: "Locum",
    CONTRACTOR: "Contractor",
    DEPUTATION: "Deputation",
    TRANSFER: "Transfer",
  };
  return t ? (m[t] ?? t) : "--";
}

// -------- Validation helpers (requested) --------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
function isValidEmail(email: string) {
  return EMAIL_RE.test(String(email || "").trim());
}


function isHttpUrl(url: string) {
  const s = String(url || "").trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
// Accept: 10-digit, or 0-prefixed (11 digits), or +91/91-prefixed (12 digits)
function normalizeIndianMobile10(input: string): string | null {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return null;
}

function toE164India(input: string): string | null {
  const d = normalizeIndianMobile10(input);
  return d ? `+91${d}` : null;
}

/* ----------------------------- Page ----------------------------- */

const ALL = "__ALL__";
const NO_DEPARTMENT = "__NO_DEPARTMENT__";

export default function InfrastructureStaffDirectoryPage() {
  const { toast } = useToast();
  const sp = useSearchParams();

  // Unified branch context (same pattern as other infra pages)
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const qpBranchId = sp.get("branchId") || undefined;

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [deptByBranch, setDeptByBranch] = React.useState<Record<string, DepartmentRow[]>>({});

  // Filters
  const [q, setQ] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);

  const [branchId, setBranchId] = React.useState<string>(ALL); // global filter only
  const [departmentId, setDepartmentId] = React.useState<string>(ALL);

  const [status, setStatus] = React.useState<string>(ALL); // ACTIVE/SUSPENDED/OFFBOARDED
  const [category, setCategory] = React.useState<string>(ALL); // MEDICAL/NON_MEDICAL
  const [engagementType, setEngagementType] = React.useState<string>(ALL); // EMPLOYEE/...
  const [designation, setDesignation] = React.useState<string>("");

  const [credentialStatus, setCredentialStatus] = React.useState<string>(ALL); // VALID/EXPIRED/NONE

  // List
  const [items, setItems] = React.useState<StaffListItem[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);

  // Add Staff dialog
  const [addOpen, setAddOpen] = React.useState(false);

  type AssignmentDraft = {
    id: string;
    branchId: string;
    departmentId?: string;
    assignmentType: string;
    status: string;
    effectiveFrom: string;
    effectiveTo?: string;
    isPrimary: boolean;
    designation?: string;
  };

  const todayISO = React.useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [fEmpCode, setFEmpCode] = React.useState("");

  // -------- Creation schema (requested) --------
  // personal_details
  const [pFirstName, setPFirstName] = React.useState("");
  const [pLastName, setPLastName] = React.useState("");
  const [pDob, setPDob] = React.useState(""); // YYYY-MM-DD
  const [pGender, setPGender] = React.useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [nationalIdType, setNationalIdType] = React.useState<"AADHAAR" | "PAN" | "PASSPORT" | "OTHER">("AADHAAR");
  const [nationalIdValue, setNationalIdValue] = React.useState("");

  // contact_details
  const [cMobilePrimary, setCMobilePrimary] = React.useState("");
  const [cEmailOfficial, setCEmailOfficial] = React.useState("");
  const [cAddress, setCAddress] = React.useState("");
  const [cEmergencyName, setCEmergencyName] = React.useState("");
  const [cEmergencyPhone, setCEmergencyPhone] = React.useState("");

  // employment_details
  const [eStaffCategory, setEStaffCategory] = React.useState<
    "DOCTOR" | "NURSE" | "PARAMEDIC" | "ADMIN" | "IT" | "SUPPORT" | "HR"
  >("DOCTOR");
  const [eDesignation, setEDesignation] = React.useState("");
  const [eDateOfJoining, setEDateOfJoining] = React.useState(""); // YYYY-MM-DD
  const [eEmploymentStatus, setEEmploymentStatus] = React.useState<"PERMANENT" | "CONTRACT" | "VISITING">("PERMANENT");

  // medical_details (conditional)
  const [mLicenseNumber, setMLicenseNumber] = React.useState("");
  const [mIssuingCouncil, setMIssuingCouncil] = React.useState("");
  const [mSpecialization, setMSpecialization] = React.useState("");
  const [mQualification, setMQualification] = React.useState("");
  const [mPrivOPD, setMPrivOPD] = React.useState(true);
  const [mPrivIPD, setMPrivIPD] = React.useState(false);
  const [mPrivSURGERY, setMPrivSURGERY] = React.useState(false);
  const [mPrivER, setMPrivER] = React.useState(false);

  // system_access (optional)
  const [sysLoginEnabled, setSysLoginEnabled] = React.useState(false);
  const [sysRoleId, setSysRoleId] = React.useState("");

  // Optional extras (kept for existing backend profile fields)
  const [fHprId, setFHprId] = React.useState("");
  const [fNotes, setFNotes] = React.useState("");


  const [fProfilePhotoUrl, setFProfilePhotoUrl] = React.useState("");
  const [assignments, setAssignments] = React.useState<AssignmentDraft[]>([]);

  // Dedupe preview
  const [dedupeBusy, setDedupeBusy] = React.useState(false);
  const [dedupe, setDedupe] = React.useState<DedupePreviewResponse | null>(null);
  const [existingStaffId, setExistingStaffId] = React.useState<string>("");
  const [forceCreate, setForceCreate] = React.useState(false);

  const branchMap = React.useMemo(() => {
    const m = new Map<string, BranchRow>();
    for (const b of branches) m.set(b.id, b);
    return m;
  }, [branches]);

  const departmentOptions = React.useMemo(() => {
    const bid =
      isGlobalScope
        ? branchId && branchId !== ALL
          ? branchId
          : ""
        : effectiveBranchId;

    if (!bid) return [];
    return deptByBranch[bid] ?? [];
  }, [deptByBranch, isGlobalScope, branchId, effectiveBranchId]);

  // If user selects an existing staff from dedupe matches, prefill contact (helps add-assignment flow)
  React.useEffect(() => {
    if (!existingStaffId) return;
    const m = dedupe?.matches?.find((x) => x.id === existingStaffId);
    if (!m) return;

    if (m.email && !cEmailOfficial) setCEmailOfficial(m.email);

    if (m.phone && !cMobilePrimary) {
      const n = normalizeIndianMobile10(m.phone);
      setCMobilePrimary(n ?? m.phone);
    }
  }, [existingStaffId, dedupe, cEmailOfficial, cMobilePrimary]);


  function resetAddDialog() {
    setFEmpCode("");

    // personal_details
    setPFirstName("");
    setPLastName("");
    setPDob("");
    setPGender("MALE");
    setNationalIdType("AADHAAR");
    setNationalIdValue("");

    // contact_details
    setCMobilePrimary("");
    setCEmailOfficial("");
    setCAddress("");
    setCEmergencyName("");
    setCEmergencyPhone("");

    // employment_details
    setEStaffCategory("DOCTOR");
    setEDesignation("");
    setEDateOfJoining(todayISO);
    setEEmploymentStatus("PERMANENT");

    // medical_details
    setMLicenseNumber("");
    setMIssuingCouncil("");
    setMSpecialization("");
    setMQualification("");
    setMPrivOPD(true);
    setMPrivIPD(false);
    setMPrivSURGERY(false);
    setMPrivER(false);

    // system_access
    setSysLoginEnabled(false);
    setSysRoleId("");

    // optional extras
    setFHprId("");
    setFNotes("");
    setFProfilePhotoUrl("");

    const defaultBranch = isGlobalScope ? (branchId !== ALL ? branchId : "") : effectiveBranchId;
    if (defaultBranch) void loadDepartmentsForBranch(defaultBranch);

    setAssignments([
      {
        id: crypto.randomUUID(),
        branchId: defaultBranch,
        departmentId: "",
        assignmentType: "PERMANENT",
        status: "ACTIVE",
        effectiveFrom: todayISO,
        effectiveTo: "",
        isPrimary: true,
        designation: "",
      },
    ]);

    setDedupe(null);
    setExistingStaffId("");
    setForceCreate(false);
  }

  async function loadBranches() {
    const data = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(data);

    // initial branch filter:
    // - BRANCH scope: we don't use branchId filter (backend scopes by principal),
    //   but we still keep global-filter UI hidden.
    // - GLOBAL scope: allow "All" unless URL branchId present.
    const pick = qpBranchId ?? "";
    if (isGlobalScope) {
      if (pick) setBranchId(pick);
      else setBranchId(ALL);
    }
  }

  async function loadDepartmentsForBranch(bid: string) {
    if (!bid) return;
    if (deptByBranch[bid]) return;

    try {
      // Departments are root-level in this project (not /infrastructure)
      const rows = (await apiFetch<DepartmentRow[]>(`/api/departments?branchId=${encodeURIComponent(bid)}&includeInactive=true`)) || [];
      setDeptByBranch((prev) => ({ ...prev, [bid]: rows }));
    } catch {
      // non-fatal
      setDeptByBranch((prev) => ({ ...prev, [bid]: [] }));
    }
  }

  function buildListQuery(args: { cursor?: string | null; append?: boolean } = {}) {
    const params = new URLSearchParams();

    const qq = q.trim();
    if (qq) params.set("q", qq);

    const desig = designation.trim();
    if (desig) params.set("designation", desig);

    if (status !== ALL) params.set("status", status);
    if (category !== ALL) params.set("category", category);
    if (engagementType !== ALL) params.set("engagementType", engagementType);
    if (credentialStatus !== ALL) params.set("credentialStatus", credentialStatus);

    // IMPORTANT: staff directory is enterprise-level -> do NOT force activeBranch injection.
    // Pass branchId only if user explicitly filters it (GLOBAL scope).
    if (isGlobalScope) {
      if (branchId !== ALL && branchId) params.set("branchId", branchId);
      if (departmentId !== ALL && departmentId) params.set("departmentId", departmentId);
    } else {
      // branch-scoped users can still filter department (within their branch scope)
      if (departmentId !== ALL && departmentId) params.set("departmentId", departmentId);
    }

    if (args.cursor) params.set("cursor", args.cursor);

    return `/api/infrastructure/staff?${params.toString()}`;
  }

  async function loadStaff(opts: { cursor?: string | null; append?: boolean } = {}) {
    setErr(null);
    if (!opts.append) setLoading(true);
    else setBusy(true);

    try {
      const url = buildListQuery({ cursor: opts.cursor ?? null });
      const res = await apiFetch<StaffListResponse>(url, { branch: "none" });
      const next = res?.items ?? [];

      setItems((prev) => (opts.append ? [...prev, ...next] : next));
      setNextCursor(res?.nextCursor ?? null);
    } catch (e) {
      const message = errorMessage(e, "Failed to load staff");
      setErr(message);
      if (!opts.append) setItems([]);
      toast({ title: "Load failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }

  async function refresh() {
    await loadStaff({ cursor: null, append: false });
  }

  function openAdd() {
    resetAddDialog();
    setAddOpen(true);
  }

  async function runDedupePreview() {
    const employeeId = fEmpCode.trim().toUpperCase();
    const firstName = pFirstName.trim();
    const lastName = pLastName.trim();
    const email = cEmailOfficial.trim().toLowerCase();
    const phone = cMobilePrimary.trim();

    if (!employeeId) {
      toast({ title: "Employee ID required", description: "Enter employee_id (unique staff/employee code)." });
      return;
    }
    if (!firstName || !lastName) {
      toast({ title: "Name required", description: "Enter first and last name." });
      return;
    }
    const e164 = toE164India(phone);
    if (!e164) {
      toast({ title: "Invalid mobile", description: "Mobile number must be 10 digits." });
      return;
    }
    if (!email || !isValidEmail(email)) {
      toast({ title: "Invalid email", description: "Enter a valid official email address." });
      return;
    }

    if (!assignments.length || !assignments[0]?.branchId) {
      toast({ title: "Assignment required", description: "Add at least one assignment with a branch." });
      return;
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const isMedical = ["DOCTOR", "NURSE", "PARAMEDIC"].includes(eStaffCategory);
    const mappedCategory = isMedical ? ("MEDICAL" as const) : ("NON_MEDICAL" as const);
    const mappedEngagement =
      eEmploymentStatus === "VISITING"
        ? ("VISITING" as const)
        : eEmploymentStatus === "CONTRACT"
          ? ("CONTRACTOR" as const)
          : ("EMPLOYEE" as const);

    setDedupeBusy(true);
    try {
      const payload: any = {
        empCode: employeeId,
        name: fullName,
        category: mappedCategory,
        engagementType: mappedEngagement,
        designation: eDesignation.trim() || null,
        email: email || null,
        phone: e164 || null,
        hprId: fHprId.trim() || null,
        assignments: assignments.map((a) => ({
          branchId: a.branchId,
          departmentId: a.departmentId || null,
          assignmentType: a.assignmentType,
          status: a.status,
          effectiveFrom: a.effectiveFrom || null,
          effectiveTo: a.effectiveTo || null,
          isPrimary: !!a.isPrimary,
          designation: a.designation?.trim() || null,
        })),
      };

      const natId = nationalIdValue.trim();
      if (natId) {
        payload.identifiers = [
          {
            type: nationalIdType,
            value: natId,
          },
        ];
      }

      const preview = await apiFetch<DedupePreviewResponse>("/api/infrastructure/staff/dedupe/preview", {
        method: "POST",
        body: JSON.stringify(payload),
        branch: "none",
      });

      setDedupe(preview ?? { matches: [], identifierHits: [] });
      if ((preview?.matches?.length ?? 0) === 0) {
        toast({ title: "No duplicates found", description: "You can proceed to create this staff record." });
      } else {
        toast({ title: "Possible duplicates found", description: "Review matches before creating a new record." });
      }
    } catch (e) {
      const message = errorMessage(e, "Failed to run dedupe preview");
      toast({ title: "Dedupe preview failed", description: message, variant: "destructive" });
    } finally {
      setDedupeBusy(false);
    }
  }


  async function saveStaff() {
    const employeeId = fEmpCode.trim().toUpperCase();
    const firstName = pFirstName.trim();
    const lastName = pLastName.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const dob = pDob.trim();
    const gender = pGender;
    const nationalId = nationalIdValue.trim();

    const email = cEmailOfficial.trim().toLowerCase();
    const phone = cMobilePrimary.trim();
    const address = cAddress.trim();

    if (!employeeId) {
      toast({ title: "Employee ID required", description: "Enter employee_id (unique staff/employee code)." });
      return;
    }
    if (!firstName || !lastName) {
      toast({ title: "Name required", description: "Enter first and last name." });
      return;
    }

    if (!assignments.length) {
      toast({ title: "Assignment required", description: "Add at least one assignment." });
      return;
    }

    // normalize primary
    const primaries = assignments.filter((a) => a.isPrimary);
    const normalized = [...assignments];
    if (primaries.length === 0) normalized[0].isPrimary = true;
    if (primaries.length > 1) {
      toast({ title: "Only one primary assignment", description: "Set exactly one assignment as primary." });
      return;
    }

    const primary = normalized.find((a) => a.isPrimary) ?? normalized[0];

    // branch restriction in UI for BRANCH scope
    if (!isGlobalScope) {
      const bad = normalized.find((a) => a.branchId && a.branchId !== effectiveBranchId);
      if (bad) {
        toast({ title: "Branch restricted", description: "You can only assign staff to your branch." });
        return;
      }
    }

    // If user selected an existing staff from duplicate-check, reuse existing onboarding endpoint to add assignments
    const isMedical = ["DOCTOR", "NURSE", "PARAMEDIC"].includes(eStaffCategory);
    const mappedCategory = isMedical ? ("MEDICAL" as const) : ("NON_MEDICAL" as const);
    const mappedEngagement =
      eEmploymentStatus === "VISITING" ? ("VISITING" as const) : eEmploymentStatus === "CONTRACT" ? ("CONTRACTOR" as const) : ("EMPLOYEE" as const);
    const photoUrl = fProfilePhotoUrl.trim();
    if (photoUrl && !isHttpUrl(photoUrl)) {
      toast({ title: "Invalid profile photo URL", description: "Please enter a valid http(s) URL." });
      return;
    }


    if (existingStaffId) {
      const e164 = phone ? toE164India(phone) : null;
      if (phone && !e164) {
        toast({ title: "Invalid mobile", description: "Mobile number must be 10 digits." });
        return;
      }
      if (email && !isValidEmail(email)) {
        toast({ title: "Invalid email", description: "Enter a valid official email address." });
        return;
      }
      if (!email && !e164) {
        toast({ title: "Contact required", description: "Provide at least one: phone or email." });
        return;
      }

      setBusy(true);
      try {
        const payload: any = {
          existingStaffId,
          empCode: employeeId,
          name: fullName,
          category: mappedCategory,
          engagementType: mappedEngagement,
          designation: eDesignation.trim() || null,
          email: email || null,
          phone: e164 || null,
          hprId: fHprId.trim() || null,
          assignments: normalized.map((a) => ({
            branchId: a.branchId,
            departmentId: a.departmentId || null,
            assignmentType: a.assignmentType,
            status: a.status,
            effectiveFrom: a.effectiveFrom || null,
            effectiveTo: a.effectiveTo || null,
            isPrimary: !!a.isPrimary,
            designation: a.designation?.trim() || null,
          })),
        };

        if (nationalId) {
          payload.identifiers = [{ type: nationalIdType, value: nationalId }];
        }

        await apiFetch<any>("/api/infrastructure/staff/onboard", {
          method: "POST",
          body: JSON.stringify(payload),
          branch: "none",
        });

        toast({ title: "Staff updated", description: "Saved successfully." });

        setAddOpen(false);
        setExistingStaffId("");
        setForceCreate(false);
        setDedupe(null);

        await loadStaff({ cursor: null, append: false });
      } catch (e: any) {
        const message = errorMessage(e, "Failed to add assignments");
        toast({ title: "Save failed", description: message, variant: "destructive" });
      } finally {
        setBusy(false);
      }
      return;
    }

    // For NEW staff creation, enforce the requested creation schema requirements
    if (!dob) {
      toast({ title: "DOB required", description: "Enter date of birth (dob)." });
      return;
    }
    if (!nationalId) {
      toast({ title: "National ID required", description: "Enter national_id (Aadhaar/PAN/Passport etc)." });
      return;
    }
    const e164New = toE164India(phone);
    if (!e164New) {
      toast({ title: "Invalid mobile", description: "Mobile number must be 10 digits." });
      return;
    }
    if (!email || !isValidEmail(email)) {
      toast({ title: "Invalid email", description: "Enter a valid official email address." });
      return;
    }
    if (!address) {
      toast({ title: "Address required", description: "Enter current_address." });
      return;
    }
    if (!eDateOfJoining.trim()) {
      toast({ title: "Joining date required", description: "Enter date_of_joining." });
      return;
    }

    if (!primary?.departmentId) {
      toast({ title: "Department required", description: "Select a department in the PRIMARY assignment (used as employment_details.department)." });
      return;
    }

    if (isMedical) {
      if (!mLicenseNumber.trim() || !mIssuingCouncil.trim() || !mSpecialization.trim()) {
        toast({
          title: "Medical details required",
          description: "For DOCTOR / NURSE / PARAMEDIC you must provide license_number, issuing_council, and specialization.",
        });
        return;
      }
    }


    const ecp = cEmergencyPhone.trim();
    if (ecp) {
      const ok = normalizeIndianMobile10(ecp);
      if (!ok) {
        toast({ title: "Invalid emergency phone", description: "Emergency phone must be 10 digits." });
        return;
      }
    }
    setBusy(true);
    try {
      const clinicalPrivs: string[] = [];
      if (mPrivOPD) clinicalPrivs.push("OPD");
      if (mPrivIPD) clinicalPrivs.push("IPD");
      if (mPrivSURGERY) clinicalPrivs.push("SURGERY");
      if (mPrivER) clinicalPrivs.push("ER");

      // IMPORTANT: Your current backend supports onboarding via POST /infrastructure/staff/onboard
      // (StaffOnboardDto). We map the requested creation schema into this DTO so the frontend
      // matches backend and does not error.

      const onboardPayload: any = {
        empCode: employeeId,
        name: fullName,
        category: mappedCategory,
        engagementType: mappedEngagement,
        designation: eDesignation.trim() || "STAFF",
        email,
        phone: e164New,
        hprId: fHprId.trim() || null,
        forceCreate: !!forceCreate,
        assignments: normalized.map((a) => ({
          branchId: a.branchId,
          departmentId: a.departmentId || null,
          assignmentType: a.assignmentType,
          status: a.status,
          effectiveFrom: a.effectiveFrom || null,
          effectiveTo: a.effectiveTo || null,
          isPrimary: !!a.isPrimary,
          designation: a.designation?.trim() || null,
        })),
        identifiers: [{ type: nationalIdType, value: nationalId }],
      };

      const created = await apiFetch<any>("/api/infrastructure/staff/onboard", {
        method: "POST",
        body: JSON.stringify(onboardPayload),
        branch: "none",
      });

      const staffId = created?.staff?.id;
      if (!staffId) throw new Error("Onboard succeeded but response had no staff.id");

      // Persist structured onboarding fields into Staff JSON columns (notes stays free text only).
const emergencyPhoneE164 = cEmergencyPhone.trim()
  ? (toE164India(cEmergencyPhone.trim()) || cEmergencyPhone.trim())
  : null;

const personal_details: any = { first_name: firstName, last_name: lastName, dob, gender };
const contact_details: any = {
  mobile_primary: e164New,
  email_official: email,
  current_address: address,
  emergency_contact:
    cEmergencyName.trim() || cEmergencyPhone.trim()
      ? { name: cEmergencyName.trim() || null, phone: emergencyPhoneE164 }
      : null,
};
const employment_details: any = {
  staff_category: eStaffCategory,
  department: primary.departmentId,
  designation: eDesignation.trim() || null,
  date_of_joining: eDateOfJoining.trim(),
  employment_status: eEmploymentStatus,
};
const system_access: any = { is_login_enabled: !!sysLoginEnabled, role_id: sysRoleId.trim() || null };
const medical_details: any = isMedical
  ? {
      license_number: mLicenseNumber.trim() || null,
      issuing_council: mIssuingCouncil.trim() || null,
      specialization: mSpecialization.trim() || null,
      qualification: mQualification.trim() || null,
      clinical_privileges: clinicalPrivs,
    }
  : null;

try {
  await apiFetch<any>("/api/infrastructure/staff/" + staffId, {
    method: "PATCH",
    body: JSON.stringify({
      notes: fNotes.trim() || null,
      personal_details,
      contact_details,
      employment_details,
      system_access,
      medical_details,
    }),
    branch: "none",
  });
} catch (e) {
  // Non-fatal: onboarding already succeeded; profile blocks can be saved later in Staff Profile.
}

const photoUrl = fProfilePhotoUrl.trim();
if (photoUrl) {
  if (!isHttpUrl(photoUrl)) {
    toast({ title: "Invalid profile photo URL", description: "Please enter a valid http(s) URL." });
  } else {
    try {
      await apiFetch<any>(`/api/infrastructure/staff/${staffId}/documents`, {
        method: "POST",
        body: JSON.stringify({
          type: "PROFILE_PHOTO",
          title: "Profile Photo",
          fileUrl: photoUrl,
          setAsStaffPointer: true,
        }),
        branch: "none",
      });
    } catch (e) {
      // Non-fatal: staff created, doc can be added later
    }
  }
}

if (isMedical && mLicenseNumber.trim()) {
        const credType = eStaffCategory === "DOCTOR" ? "MEDICAL_REG" : eStaffCategory === "NURSE" ? "NURSING_REG" : "TECH_CERT";
        try {
          await apiFetch<any>("/api/infrastructure/staff/" + staffId + "/credentials", {
            method: "POST",
            body: JSON.stringify({
              type: credType,
              authority: mIssuingCouncil.trim() || null,
              registrationNumber: mLicenseNumber.trim(),
              verificationStatus: "UNVERIFIED",
              validFrom: null,
              validTo: null,
              notes: mSpecialization.trim() ? `specialization=${mSpecialization.trim()}` : null,
            }),
            branch: "none",
          });
        } catch (e) {
          // Non-fatal: onboarding already succeeded; credential can be added later in profile
        }
      }

      toast({ title: "Staff created", description: "Saved successfully." });

      setAddOpen(false);
      setExistingStaffId("");
      setForceCreate(false);
      setDedupe(null);

      await loadStaff({ cursor: null, append: false });
    } catch (e: any) {
      const message = errorMessage(e, "Failed to create staff");

      if (e instanceof ApiError && e.status === 409) {
        // If backend returns matches, surface them in the duplicate-check grid
        const matches = (e.data as any)?.matches;
        if (Array.isArray(matches)) {
          setDedupe({ matches, identifierHits: [] } as any);
        }
        toast({
          title: "Possible duplicate",
          description: "Run \"Check duplicates\" and select an existing staff, or enable Force create if you are sure.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Save failed", description: message, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }


  React.useEffect(() => {
    setLoading(true);
    void loadBranches()
      .catch((e) => setErr(errorMessage(e, "Failed to load branches")))
      .finally(() => setLoading(false));
  }, []);

  // Load departments for selected/global branch (so filters + dialog dropdowns are useful)
  React.useEffect(() => {
    const bid = isGlobalScope ? (branchId !== ALL ? branchId : "") : effectiveBranchId;
    if (!bid) return;
    void loadDepartmentsForBranch(bid);
  }, [isGlobalScope, branchId, effectiveBranchId]);

  // When branch filter changes, reset department filter
  React.useEffect(() => {
    setDepartmentId(ALL);
  }, [branchId]);

  // Load list when filters change (debounced)
  React.useEffect(() => {
    const handle = setTimeout(() => {
      void loadStaff({ cursor: null, append: false });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, category, engagementType, designation, credentialStatus, branchId, departmentId, isGlobalScope]);

  const total = items.length;

  return (
    <AppShell title="Infrastructure • Staff Directory">
      <RequirePerm perm="STAFF_READ">
        <div className="grid gap-6">
          {/* Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <Users className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight">Staff Directory</div>
                <div className="mt-1 text-sm text-zc-muted">
                  Enterprise staff master (one person, multiple branch assignments) with dedupe-first onboarding.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="gap-2 px-5"
                onClick={() => void refresh()}
                disabled={loading || busy}
              >
                <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </Button>

              <Button variant="primary" className="gap-2 px-5" onClick={openAdd} disabled={loading || busy}>
                <Plus className="h-4 w-4" />
                Add Staff
              </Button>
            </div>
          </div>

          {err ? (
            <Card className="border-zc-danger/40">
              <CardHeader className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                  <div>
                    <CardTitle className="text-base">Could not load staff</CardTitle>
                    <CardDescription className="mt-1">{err}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-base">Overview</CardTitle>
                  <CardDescription className="text-sm">
                    Search staff records, apply filters, and onboard with dedupe-first flow.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowFilters((v) => !v)}
                    disabled={loading}
                  >
                    <Filter className="h-4 w-4" />
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4">
              {/* Search + quick filters */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by name / staff code / phone / email..."
                    className="pl-10"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-11 w-[200px] rounded-xl border-zc-border bg-zc-card">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="OFFBOARDED">Offboarded</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-11 w-[200px] rounded-xl border-zc-border bg-zc-card">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All categories</SelectItem>
                      <SelectItem value="MEDICAL">Medical</SelectItem>
                      <SelectItem value="NON_MEDICAL">Non-medical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Expanded filters */}
              {showFilters ? (
                <div className="grid gap-3 rounded-2xl border border-zc-border bg-zc-panel/15 p-4 md:grid-cols-2 lg:grid-cols-3">
                  {isGlobalScope ? (
                    <div className="grid gap-2">
                      <Label>Branch assignment</Label>
                      <Select
                        value={branchId}
                        onValueChange={(v) => {
                          setBranchId(v);
                          if (v && v !== ALL) setActiveBranchId(v);
                        }}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                          <SelectValue placeholder="All branches" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[320px] overflow-y-auto">
                          <SelectItem value={ALL}>All branches</SelectItem>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name} <span className="font-mono text-xs text-zc-muted">({b.code})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label>Branch</Label>
                      <div className="h-11 rounded-xl border border-zc-border bg-zc-card px-3 flex items-center text-sm">
                        {effectiveBranchId ? (
                          <span className="text-zc-text">
                            {branchMap.get(effectiveBranchId)?.name ?? effectiveBranchId}
                          </span>
                        ) : (
                          <span className="text-zc-muted">Not selected</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label>Department</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                        <SelectValue placeholder="All departments" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[320px] overflow-y-auto">
                        <SelectItem value={ALL}>All departments</SelectItem>
                        {departmentOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} <span className="font-mono text-xs text-zc-muted">({d.code})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                  </div>

                  <div className="grid gap-2">
                    <Label>Engagement</Label>
                    <Select value={engagementType} onValueChange={setEngagementType}>
                      <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                        <SelectValue placeholder="All engagement types" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[320px] overflow-y-auto">
                        <SelectItem value={ALL}>All</SelectItem>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        <SelectItem value="CONSULTANT">Consultant</SelectItem>
                        <SelectItem value="VISITING">Visiting</SelectItem>
                        <SelectItem value="LOCUM">Locum</SelectItem>
                        <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                        <SelectItem value="INTERN">Intern</SelectItem>
                        <SelectItem value="TRAINEE">Trainee</SelectItem>
                        <SelectItem value="VENDOR">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Credential status</Label>
                    <Select value={credentialStatus} onValueChange={setCredentialStatus}>
                      <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All</SelectItem>
                        <SelectItem value="VALID">Valid</SelectItem>
                        <SelectItem value="EXPIRED">Expired</SelectItem>
                        <SelectItem value="NONE">No credentials</SelectItem>
                      </SelectContent>
                    </Select>
                   
                  </div>

                  <div className="grid gap-2 lg:col-span-2">
                    <Label>Designation contains</Label>
                    <Input
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g., Doctor, Nurse, Technician..."
                    />
                  </div>
                </div>
              ) : null}

              {/* Stats */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Visible staff</div>
                  <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{total}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Next page</div>
                  <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {nextCursor ? "Available" : "--"}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-200">Scope</div>
                  <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-200">
                    {isGlobalScope ? "GLOBAL" : "BRANCH"}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-2xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zc-panel/10">
                      <TableHead className="w-[340px]">Staff</TableHead>
                      <TableHead>Primary assignment</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="w-[180px]">System access</TableHead>
                      <TableHead className="w-[70px]" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}>
                            <div className="grid gap-2">
                              <Skeleton className="h-5 w-[55%]" />
                              <Skeleton className="h-4 w-[35%]" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="py-10 text-center">
                            <div className="text-sm font-semibold text-zc-text">No staff found</div>
                            <div className="mt-1 text-sm text-zc-muted">
                              Try changing filters, or onboard a new staff member.
                            </div>
                            <div className="mt-4">
                              <Button variant="primary" className="gap-2" onClick={openAdd}>
                                <Plus className="h-4 w-4" />
                                Add Staff
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((s) => {
                        const pa = primaryAssignment(s.assignments);
                        const b = pa?.branchId ? branchMap.get(pa.branchId) : null;
                        const deptName = pa?.departmentId
                          ? (deptByBranch[pa.branchId || ""]?.find((d) => d.id === pa.departmentId)?.name ?? pa.departmentId)
                          : "--";

                        return (
                          <TableRow key={s.id}>
                            <TableCell>
                              <div className="grid gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="font-semibold text-zc-text">{s.name}</div>
                                  <Badge variant="secondary" className="font-mono">
                                    {s.empCode}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-zc-muted">
                                  <span>{categoryLabel(s.category)}</span>
                                  <span className="text-zc-muted/60">|</span>
                                  <span>{engagementLabel(s.engagementType)}</span>
                                  <span className="text-zc-muted/60">|</span>
                                  <span>{s.designation || "STAFF"}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-zc-muted">
                                  <span>{s.phone || "--"}</span>
                                  <span className="text-zc-muted/60">|</span>
                                  <span>{s.email || "--"}</span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              {pa ? (
                                <div className="grid gap-1">
                                  <div className="text-sm font-medium text-zc-text">
                                    {b ? (
                                      <>
                                        {b.name}{" "}
                                        <span className="font-mono text-xs text-zc-muted">({b.code})</span>
                                      </>
                                    ) : (
                                      <span>{pa.branchId}</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-zc-muted">
                                    Dept: <span className="text-zc-text/80">{deptName}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-zc-muted">
                                    <Badge variant="secondary">{assignmentTypeLabel(pa.assignmentType)}</Badge>
                                    <Badge variant={statusBadgeVariant(pa.status)}>{String(pa.status || "--")}</Badge>
                                    <span className="text-zc-muted/60">|</span>
                                    <span>{fmtRange(pa.effectiveFrom, pa.effectiveTo || null)}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-zc-muted">No active/planned assignment</div>
                              )}
                            </TableCell>

                            <TableCell>
                              <Badge variant={statusBadgeVariant(s.status)}>{s.status}</Badge>
                            </TableCell>

                            <TableCell>
                              {s.user ? (
                                <div className="grid gap-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={s.user.isActive ? "success" : "warning"}>
                                      {s.user.isActive ? "Enabled" : "Disabled"}
                                    </Badge>
                                    <Badge variant="secondary">Staff-managed</Badge>
                                  </div>
                                  <div className="text-xs text-zc-muted">{s.user.email || "--"}</div>
                                </div>
                              ) : (
                                <div className="grid gap-1">
                                  <Badge variant="secondary">No user linked</Badge>
                                  <div className="text-xs text-zc-muted">Provision access from profile</div>
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="rounded-xl">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[220px]">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <Link href={`/infrastructure/staff/${s.id}`} className="flex items-center gap-2">
                                      <ExternalLink className="h-4 w-4" />
                                      Open profile
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      navigator.clipboard?.writeText(s.id).catch(() => {});
                                      toast({ title: "Copied", description: "Staff ID copied to clipboard." });
                                    }}
                                  >
                                    Copy Staff ID
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Load more */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-zc-muted">
                  Showing <span className="font-semibold text-zc-text">{items.length}</span> records
                </div>

                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!nextCursor || busy || loading}
                  onClick={() => void loadStaff({ cursor: nextCursor, append: true })}
                >
                  <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                  Load more
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add Staff Dialog */}
          <Dialog open={addOpen} onOpenChange={(v) => setAddOpen(v)}>
            <DialogContent className={drawerClassName()}>
              <ModalHeader
                title="Add Staff"
                description='Create an enterprise Staff Master + initial assignment(s). Use "Check duplicates" before creating a new record.'
                onClose={() => setAddOpen(false)}
              />

              <div className="grid gap-6">
                {/* Staff master (Creation schema) */}
                <div className="grid gap-3 rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-zc-text">Staff Master</div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="grid gap-2">
                      <Label>Employee ID *</Label>
                      <Input value={fEmpCode} onChange={(e) => setFEmpCode(e.target.value)} placeholder="e.g., DOC0001" />
                    </div>

                    <div className="grid gap-2">
                      <Label>First name *</Label>
                      <Input value={pFirstName} onChange={(e) => setPFirstName(e.target.value)} placeholder="e.g., Amit" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Last name *</Label>
                      <Input value={pLastName} onChange={(e) => setPLastName(e.target.value)} placeholder="e.g., Sharma" />
                    </div>

                    <div className="grid gap-2">
                      <Label>DOB *</Label>
                      <Input type="date" value={pDob} onChange={(e) => setPDob(e.target.value)} className="h-11" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Gender *</Label>
                      <Select value={pGender} onValueChange={(v) => setPGender(v as any)}>
                        <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>National ID type *</Label>
                      <Select value={nationalIdType} onValueChange={(v) => setNationalIdType(v as any)}>
                        <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AADHAAR">Aadhaar</SelectItem>
                          <SelectItem value="PAN">PAN</SelectItem>
                          <SelectItem value="PASSPORT">Passport</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>National ID value *</Label>
                      <Input value={nationalIdValue} onChange={(e) => setNationalIdValue(e.target.value)} placeholder="Enter Aadhaar/PAN/Passport no." />
                    </div>

                    <div className="grid gap-2">
                      <Label>Mobile (10 digits) *</Label>
                      <Input type="tel" inputMode="numeric" value={cMobilePrimary} onChange={(e) => setCMobilePrimary(e.target.value)} placeholder="e.g., 9876543210" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Official Email *</Label>
                      <Input type="email" value={cEmailOfficial} onChange={(e) => setCEmailOfficial(e.target.value)} placeholder="e.g., name@hospital.com" />
                    </div>

                    <div className="grid gap-2 md:col-span-3">
                      <Label>Current Address *</Label>
                      <Textarea value={cAddress} onChange={(e) => setCAddress(e.target.value)} placeholder="Enter current address..." />
                    </div>

                    <div className="grid gap-2">
                      <Label>Emergency contact name</Label>
                      <Input value={cEmergencyName} onChange={(e) => setCEmergencyName(e.target.value)} placeholder="e.g., Spouse / Parent" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Emergency contact phone</Label>
                      <Input type="tel" inputMode="numeric" value={cEmergencyPhone} onChange={(e) => setCEmergencyPhone(e.target.value)} placeholder="e.g., 9876543210" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Staff category *</Label>
                      <Select value={eStaffCategory} onValueChange={(v) => setEStaffCategory(v as any)}>
                        <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DOCTOR">Doctor</SelectItem>
                          <SelectItem value="NURSE">Nurse</SelectItem>
                          <SelectItem value="PARAMEDIC">Paramedic</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="SUPPORT">Support</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Date of joining *</Label>
                      <Input type="date" value={eDateOfJoining} onChange={(e) => setEDateOfJoining(e.target.value)} className="h-11" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Employment status *</Label>
                      <Select value={eEmploymentStatus} onValueChange={(v) => setEEmploymentStatus(v as any)}>
                        <SelectTrigger className="h-11 rounded-xl border-zc-border bg-zc-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERMANENT">Permanent</SelectItem>
                          <SelectItem value="CONTRACT">Contract</SelectItem>
                          <SelectItem value="VISITING">Visiting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2 md:col-span-2">
                      <Label>Designation</Label>
                      <Input value={eDesignation} onChange={(e) => setEDesignation(e.target.value)} placeholder="e.g., Consultant Cardiologist" />
                    </div>

                    <div className="grid gap-2">
                      <Label>HPR ID (optional)</Label>
                      <Input value={fHprId} onChange={(e) => setFHprId(e.target.value)} placeholder="ABDM HPR identifier" />
                    </div>
                  </div>
                </div>

                {/* Medical details (required for DOCTOR/NURSE/PARAMEDIC) */}
                {(["DOCTOR", "NURSE", "PARAMEDIC"] as const).includes(eStaffCategory as any) ? (
                  <div className="grid gap-3 rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-zc-text">Medical Details</div>
                      <div className="text-xs text-zc-muted">Required for DOCTOR / NURSE / PARAMEDIC</div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="grid gap-2">
                        <Label>License number *</Label>
                        <Input value={mLicenseNumber} onChange={(e) => setMLicenseNumber(e.target.value)} placeholder="e.g., MCI / NMC" />
                      </div>

                      <div className="grid gap-2">
                        <Label>Issuing council *</Label>
                        <Input value={mIssuingCouncil} onChange={(e) => setMIssuingCouncil(e.target.value)} placeholder="e.g., NMC / State Nursing Council" />
                      </div>

                      <div className="grid gap-2">
                        <Label>Specialization *</Label>
                        <Input value={mSpecialization} onChange={(e) => setMSpecialization(e.target.value)} placeholder="e.g., Cardiology" />
                      </div>

                      <div className="grid gap-2 md:col-span-3">
                        <Label>Qualification (optional)</Label>
                        <Input value={mQualification} onChange={(e) => setMQualification(e.target.value)} placeholder="e.g., MBBS, MD" />
                      </div>

                      <div className="md:col-span-3 grid gap-2">
                        <Label>Clinical privileges</Label>
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                            <span className="text-sm">OPD</span>
                            <Switch checked={mPrivOPD} onCheckedChange={setMPrivOPD} />
                          </div>
                          <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                            <span className="text-sm">IPD</span>
                            <Switch checked={mPrivIPD} onCheckedChange={setMPrivIPD} />
                          </div>
                          <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                            <span className="text-sm">Surgery</span>
                            <Switch checked={mPrivSURGERY} onCheckedChange={setMPrivSURGERY} />
                          </div>
                          <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-3 py-2">
                            <span className="text-sm">ER</span>
                            <Switch checked={mPrivER} onCheckedChange={setMPrivER} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* System access + notes (optional; provisioning still happens on Profile tab) */}
                <div className="grid gap-3 rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-zc-text">System Access & Notes</div>
                    <div className="text-xs text-zc-muted">Optional</div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-3 md:col-span-1">
                      <Label className="m-0">Login enabled</Label>
                      <Switch checked={sysLoginEnabled} onCheckedChange={setSysLoginEnabled} />
                    </div>

                    <div className="grid gap-2 md:col-span-2">
                      <Label>Role template ID (optional)</Label>
                      <Input value={sysRoleId} onChange={(e) => setSysRoleId(e.target.value)} placeholder="RoleTemplateVersion ID" />
                      <div className="text-xs text-zc-muted">If left empty, you can provision access later from Profile → System Access.</div>
                    </div>

                    <div className="grid gap-2 md:col-span-3">
                      <Label>Profile Photo URL (optional)</Label>
                      <Input
                        value={fProfilePhotoUrl}
                        onChange={(e) => setFProfilePhotoUrl(e.target.value)}
                        placeholder="https://…"
                      />
                      <div className="text-xs text-zc-muted">
                        Paste a secure URL. You can also add or replace later in Staff Profile → Documents.
                      </div>
                    </div>

                    <div className="grid gap-2 md:col-span-3">
                      <Label>Notes (optional)</Label>
                      <Textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Internal notes for onboarding..." />
                    </div>
                  </div>
                </div>


                {/* Assignments */}
                <div className="grid gap-3 rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-zc-text">Initial Assignment(s)</div>
                      <div className="text-xs text-zc-muted">
                        At least one assignment is required. Primary assignment sets the default context.
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        const defaultBranch = !isGlobalScope ? effectiveBranchId : (branchId !== ALL ? branchId : "");
                        setAssignments((prev) => [
                          ...prev,
                          {
                            id: crypto.randomUUID(),
                            branchId: defaultBranch,
                            departmentId: "",
                            assignmentType: "PERMANENT",
                            status: "ACTIVE",
                            effectiveFrom: todayISO,
                            effectiveTo: "",
                            isPrimary: false,
                            designation: "",
                          },
                        ]);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add assignment
                    </Button>
                  </div>

                  <div className="grid gap-3">
                    {assignments.map((a, idx) => {
                      const branchDisabled = !isGlobalScope;
                      const bid = !isGlobalScope ? effectiveBranchId : a.branchId;
                      const deptOptions = bid ? (deptByBranch[bid] ?? []) : [];
                      const selectedBranch = branches.find((b) => b.id === a.branchId);
                      const selectedDept = deptOptions.find((d) => d.id === a.departmentId);

                      return (
                        <div key={a.id} className="rounded-2xl border border-zc-border bg-zc-panel/5 p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Assignment {idx + 1}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg text-zc-muted hover:text-red-400"
                              disabled={assignments.length === 1}
                              onClick={() => {
                                setAssignments((prev) => prev.filter((x) => x.id !== a.id));
                              }}
                            >
                              Remove
                            </Button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-12">
                            <div className="grid gap-2 md:col-span-5">
                              <Label>Branch</Label>
                              <Select
                                value={a.branchId || ""}
                                onValueChange={(v) => {
                                  if (!v) return;
                                  setAssignments((prev) =>
                                    prev.map((x) => (x.id === a.id ? { ...x, branchId: v, departmentId: "" } : x)),
                                  );
                                  void loadDepartmentsForBranch(v);
                                }}
                                disabled={branchDisabled}
                              >
                                <SelectTrigger
                                  className="h-10 min-w-0 rounded-xl border-zc-border bg-zc-card [&>span]:min-w-0 [&>span]:truncate"
                                  title={selectedBranch ? `${selectedBranch.name} (${selectedBranch.code})` : undefined}
                                >
                                  <SelectValue placeholder={branchDisabled ? "Branch locked" : "Select branch..."} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[320px] overflow-y-auto">
                                  {branches.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>
                                      <span className="block truncate" title={`${b.name} (${b.code})`}>
                                        {b.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-2 md:col-span-5">
                              <Label>Department</Label>
                              <Select
                                value={a.departmentId || ""}
                                onValueChange={(v) => {
                                  const nextDepartmentId = v === NO_DEPARTMENT ? "" : v;
                                  setAssignments((prev) =>
                                    prev.map((x) => (x.id === a.id ? { ...x, departmentId: nextDepartmentId } : x)),
                                  );
                                }}
                                disabled={!bid}
                              >
                                <SelectTrigger
                                  className="h-10 min-w-0 rounded-xl border-zc-border bg-zc-card [&>span]:min-w-0 [&>span]:truncate"
                                  title={selectedDept ? `${selectedDept.name} (${selectedDept.code})` : undefined}
                                >
                                  <SelectValue placeholder={bid ? "Optional" : "Select branch first"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[320px] overflow-y-auto">
                                  <SelectItem value={NO_DEPARTMENT}>None</SelectItem>
                                  {deptOptions.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                      <span className="block truncate" title={`${d.name} (${d.code})`}>
                                        {d.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-2 md:col-span-2">
                              <Label>Type</Label>
                              <Select
                                value={a.assignmentType}
                                onValueChange={(v) =>
                                  setAssignments((prev) => prev.map((x) => (x.id === a.id ? { ...x, assignmentType: v } : x)))
                                }
                              >
                                <SelectTrigger className="h-10 rounded-xl border-zc-border bg-zc-card">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PERMANENT">Permanent</SelectItem>
                                  <SelectItem value="TEMPORARY">Temporary</SelectItem>
                                  <SelectItem value="ROTATION">Rotation</SelectItem>
                                  <SelectItem value="VISITING">Visiting</SelectItem>
                                  <SelectItem value="LOCUM">Locum</SelectItem>
                                  <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                                  <SelectItem value="DEPUTATION">Deputation</SelectItem>
                                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-2 md:col-span-4">
                              <Label>From</Label>
                              <Input
                                type="date"
                                value={a.effectiveFrom || ""}
                                onChange={(e) =>
                                  setAssignments((prev) => prev.map((x) => (x.id === a.id ? { ...x, effectiveFrom: e.target.value } : x)))
                                }
                                className="h-10"
                              />
                            </div>

                            <div className="grid gap-2 md:col-span-4">
                              <Label>To</Label>
                              <Input
                                type="date"
                                value={a.effectiveTo || ""}
                                onChange={(e) =>
                                  setAssignments((prev) => prev.map((x) => (x.id === a.id ? { ...x, effectiveTo: e.target.value } : x)))
                                }
                                className="h-10"
                              />
                            </div>

                            <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-card px-3 md:col-span-4">
                              <Label className="m-0">Primary</Label>
                              <Switch
                                checked={a.isPrimary}
                                onCheckedChange={(v) => {
                                  setAssignments((prev) =>
                                    prev.map((x) => {
                                      if (x.id === a.id) return { ...x, isPrimary: v };
                                      // only one primary
                                      return v ? { ...x, isPrimary: false } : x;
                                    }),
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-xs text-zc-muted">
                    Tip: For rotating/visiting staff, set an end date so access can auto-expire (policy-driven).
                  </div>
                </div>

                {/* Dedupe preview */}
                <div className="grid gap-3 rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-zc-text">Duplicate check</div>
                      <div className="text-xs text-zc-muted">
                        Uses phone/email/empCode/hprId and identifiers to suggest existing staff.
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => void runDedupePreview()}
                        disabled={dedupeBusy || busy}
                      >
                        <CheckCircle2 className={dedupeBusy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                        Check duplicates
                      </Button>
                    </div>
                  </div>

                  {dedupe && (dedupe.matches?.length ?? 0) > 0 ? (
                    <div className="grid gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm text-zc-text">
                          Found <span className="font-semibold">{dedupe.matches.length}</span> possible match(es)
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={forceCreate} onCheckedChange={setForceCreate} />
                          <div className="text-xs">
                            <div className="font-semibold text-zc-text">Force create</div>
                            <div className="text-zc-muted">Create new even if duplicates exist</div>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-zc-border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-zc-panel/10">
                              <TableHead className="w-[40px]" />
                              <TableHead>Match</TableHead>
                              <TableHead className="w-[160px]">Code</TableHead>
                              <TableHead className="w-[220px]">Contact</TableHead>
                              <TableHead className="w-[140px]">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dedupe.matches.map((m) => (
                              <TableRow key={m.id}>
                                <TableCell className="text-center">
                                  <input
                                    type="radio"
                                    name="existingStaff"
                                    checked={existingStaffId === m.id}
                                    onChange={() => setExistingStaffId(m.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="grid gap-1">
                                    <div className="font-semibold text-zc-text">{m.name}</div>
                                    <div className="text-xs text-zc-muted">{m.matchSource || "MATCH"}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="font-mono">
                                    {m.empCode}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-zc-muted">
                                  {(m.phone || "--") + " | " + (m.email || "--")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={statusBadgeVariant(m.status || "ACTIVE")}>
                                    {String(m.status || "ACTIVE")}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="text-xs text-zc-muted">
                        Select a match to <span className="font-semibold">add assignment(s) to existing staff</span>. Otherwise enable "Force create".
                      </div>
                    </div>
                  ) : dedupe && (dedupe.matches?.length ?? 0) === 0 ? (
                    <div className="text-sm text-emerald-700 dark:text-emerald-300">
                      No duplicates detected based on the entered identifiers.
                    </div>
                  ) : (
                    <div className="text-xs text-zc-muted">Run a check before saving (recommended).</div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void saveStaff()} disabled={busy}>
                  {existingStaffId ? "Add to existing staff" : "Create staff"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RequirePerm>
    </AppShell>
  );
}


