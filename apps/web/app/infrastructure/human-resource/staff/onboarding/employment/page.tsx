"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/use-toast";

type EngagementType = "EMPLOYEE" | "CONSULTANT" | "VISITING" | "CONTRACTOR" | "INTERN";
type EmploymentStatus = "PERMANENT" | "CONTRACT" | "VISITING" | "TEMPORARY";
type StaffCategory =
  | "DOCTOR"
  | "NURSE"
  | "PARAMEDIC"
  | "PHARMACIST"
  | "TECHNICIAN"
  | "ADMIN"
  | "STAFF"
  | "SECURITY"
  | "HOUSEKEEPING";

type EmploymentDetailsDraft = {
  staff_category?: StaffCategory | string; // allow future custom values
  engagement_type?: EngagementType | string;
  employment_status?: EmploymentStatus | string;

  date_of_joining?: string; // YYYY-MM-DD
  designation?: string;
  department?: string;

  grade?: string;
  payroll_code?: string;
  cost_center?: string;
  reporting_manager?: string;

  notes?: string;
};

type StaffOnboardingDraft = {
  personal_details?: Record<string, any>;
  contact_details?: Record<string, any>;
  employment_details?: EmploymentDetailsDraft;
  medical_details?: Record<string, any>;
  system_access?: Record<string, any>;
};

type FieldErrorMap = Record<string, string>;

export default function HrStaffOnboardingEmploymentPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [form, setForm] = React.useState<EmploymentDetailsDraft>({
    staff_category: "STAFF",
    engagement_type: "EMPLOYEE",
    employment_status: "PERMANENT",
    date_of_joining: "",
    designation: "",
    department: "",
    grade: "",
    payroll_code: "",
    cost_center: "",
    reporting_manager: "",
    notes: "",
  });

  // Require draftId (staffId). If missing, go back to Start.
  React.useEffect(() => {
    if (draftId) return;
    router.replace("/infrastructure/staff/onboarding/start" as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

// Load local draft
  React.useEffect(() => {
    const id = draftId;
    if (!id) return;

    setLoading(true);
    try {
      const draft = readDraft(id);
      const ed = (draft.employment_details ?? {}) as EmploymentDetailsDraft;

      setForm({
        staff_category: (ed.staff_category ?? "STAFF") as any,
        engagement_type: (ed.engagement_type ?? "EMPLOYEE") as any,
        employment_status: (ed.employment_status ?? "PERMANENT") as any,

        date_of_joining: String(ed.date_of_joining ?? "").slice(0, 10),

        designation: String(ed.designation ?? "").trim(),
        department: String(ed.department ?? "").trim(),

        grade: String(ed.grade ?? "").trim(),
        payroll_code: String(ed.payroll_code ?? "").trim(),
        cost_center: String(ed.cost_center ?? "").trim(),
        reporting_manager: String(ed.reporting_manager ?? "").trim(),

        notes: String(ed.notes ?? "").trim(),
      });
    } finally {
      setLoading(false);
      setDirty(false);
      setErrors({});
    }
  }, [draftId]);

  const derivedCategory = React.useMemo(() => deriveCategory(String(form.staff_category || "")), [form.staff_category]);

  const contactGate = React.useMemo(() => {
    // Gate progression based on workflow minimums being present from Contact step
    if (!draftId) return { ok: true, reason: "" };
    const draft = readDraft(draftId);
    const cd = (draft.contact_details ?? {}) as any;

    const phone = normalizePhone(String(cd.mobile_primary ?? ""));
    const email = String(cd.email_official ?? "").trim().toLowerCase();
    const addr = String(cd.current_address ?? "").trim();

    const ok = /^\d{10}$/.test(phone) && isEmail(email) && !!addr;
    return {
      ok,
      reason: ok ? "" : "Contact step is incomplete (primary mobile + official email + current address are required).",
    };
  }, [draftId]);

  function update<K extends keyof EmploymentDetailsDraft>(key: K, value: EmploymentDetailsDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[String(key)];
      return next;
    });
  }

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};

    if (!String(form.staff_category ?? "").trim()) e.staff_category = "Staff category is required.";
    if (!String(form.engagement_type ?? "").trim()) e.engagement_type = "Engagement type is required.";
    if (!String(form.employment_status ?? "").trim()) e.employment_status = "Employment status is required.";

    if (!String(form.date_of_joining ?? "").trim()) e.date_of_joining = "Date of joining is required.";
    else if (!isValidYmd(String(form.date_of_joining))) e.date_of_joining = "Invalid date.";

    return e;
  }

  function saveDraftOrThrow() {
    const id = draftId;
    if (!id) return;

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: "Please fix the highlighted fields to continue.",
      });
      throw new Error("validation_failed");
    }

    const existing = readDraft(id);

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      employment_details: normalizeEmploymentDraft(form),
    };

    writeDraft(id, nextDraft);
    setDirty(false);

    toast({
      title: "Saved",
      description: "Employment details saved to draft.",
    });
  }

  function onSaveOnly() {
    try {
      saveDraftOrThrow();
    } catch {
      // handled
    }
  }

  function onSaveAndNext() {
    try {
      saveDraftOrThrow();
      if (!contactGate.ok) {
        toast({
          variant: "destructive",
          title: "Complete Contact step first",
          description: contactGate.reason,
        });
        return;
      }
      router.push(withDraftId("/infrastructure/staff/onboarding/credentials", draftId) as any);
    } catch {
      // handled
    }
  }

  return (
    <OnboardingShell
      stepKey="employment"
      title="Employment details"
      description="Capture staff category, engagement and employment info."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/contact", draftId) as any)}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-zc-border" onClick={onSaveOnly} disabled={loading}>
              Save
            </Button>
            <Button
              className="bg-zc-accent text-white hover:bg-zc-accent/90"
              onClick={onSaveAndNext}
              disabled={loading}
            >
              Save &amp; Next
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zc-foreground">Step 4: Employment</div>
            <div className="mt-1 text-xs text-zc-muted">
              Required: staff category + engagement + employment status + date of joining.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="border border-zc-border">
              Derived category: {derivedCategory}
            </Badge>

            {contactGate.ok ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                Contact complete
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400" variant="secondary">
                Contact incomplete
              </Badge>
            )}

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

        <Separator className="bg-zc-border" />

        <div className={cn("grid gap-4", loading ? "opacity-60" : "opacity-100")}>
          {/* Core */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Core employment (required)</div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Staff category" required error={errors.staff_category}>
                <Select
                  value={String(form.staff_category ?? "")}
                  onValueChange={(v) => update("staff_category", v)}
                >
                  <SelectTrigger className={cn("border-zc-border", errors.staff_category ? "border-red-500" : "")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                    <SelectItem value="NURSE">Nurse</SelectItem>
                    <SelectItem value="PARAMEDIC">Paramedic</SelectItem>
                    <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                    <SelectItem value="TECHNICIAN">Technician</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="SECURITY">Security</SelectItem>
                    <SelectItem value="HOUSEKEEPING">Housekeeping</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Engagement type" required error={errors.engagement_type}>
                <Select
                  value={String(form.engagement_type ?? "")}
                  onValueChange={(v) => update("engagement_type", v)}
                >
                  <SelectTrigger className={cn("border-zc-border", errors.engagement_type ? "border-red-500" : "")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="CONSULTANT">Consultant</SelectItem>
                    <SelectItem value="VISITING">Visiting</SelectItem>
                    <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Employment status" required error={errors.employment_status}>
                <Select
                  value={String(form.employment_status ?? "")}
                  onValueChange={(v) => update("employment_status", v)}
                >
                  <SelectTrigger className={cn("border-zc-border", errors.employment_status ? "border-red-500" : "")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERMANENT">Permanent</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="VISITING">Visiting</SelectItem>
                    <SelectItem value="TEMPORARY">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Date of joining" required error={errors.date_of_joining}>
                <Input
                  type="date"
                  className={cn("border-zc-border", errors.date_of_joining ? "border-red-500" : "")}
                  value={String(form.date_of_joining ?? "")}
                  onChange={(e) => update("date_of_joining", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Designation" help="Optional (e.g., Consultant / Staff Nurse)" error={errors.designation}>
                <Input
                  className={cn("border-zc-border", errors.designation ? "border-red-500" : "")}
                  value={String(form.designation ?? "")}
                  onChange={(e) => update("designation", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Department" help="Optional (e.g., Cardiology / Admin)" error={errors.department}>
                <Input
                  className={cn("border-zc-border", errors.department ? "border-red-500" : "")}
                  value={String(form.department ?? "")}
                  onChange={(e) => update("department", e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
              <div className="font-medium text-zc-foreground">Clinical note</div>
              <div className="mt-1">
                If staff category is clinical (Doctor/Nurse/Paramedic), the next steps will include credential capture and verification.
              </div>
            </div>
          </div>

          <Separator className="bg-zc-border" />

          {/* HR/Payroll tags */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">HR / payroll tags (optional)</div>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Grade" error={errors.grade}>
                <Input
                  className={cn("border-zc-border", errors.grade ? "border-red-500" : "")}
                  value={String(form.grade ?? "")}
                  onChange={(e) => update("grade", e.target.value)}
                  placeholder="e.g., G5"
                />
              </Field>

              <Field label="Payroll code" error={errors.payroll_code}>
                <Input
                  className={cn("border-zc-border", errors.payroll_code ? "border-red-500" : "")}
                  value={String(form.payroll_code ?? "")}
                  onChange={(e) => update("payroll_code", e.target.value)}
                  placeholder="e.g., PAY-0012"
                />
              </Field>

              <Field label="Cost center" error={errors.cost_center}>
                <Input
                  className={cn("border-zc-border", errors.cost_center ? "border-red-500" : "")}
                  value={String(form.cost_center ?? "")}
                  onChange={(e) => update("cost_center", e.target.value)}
                  placeholder="e.g., CC-CARDIO"
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Reporting manager" help="Name or employee code" error={errors.reporting_manager}>
                <Input
                  className={cn("border-zc-border", errors.reporting_manager ? "border-red-500" : "")}
                  value={String(form.reporting_manager ?? "")}
                  onChange={(e) => update("reporting_manager", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Notes" error={errors.notes}>
                <Textarea
                  className={cn("border-zc-border", errors.notes ? "border-red-500" : "")}
                  value={String(form.notes ?? "")}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Optional notes…"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
            <div className="font-medium text-zc-foreground">Next step</div>
            <div className="mt-1">
              Credentials: <span className="font-mono">/onboarding/credentials</span>
            </div>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

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

function makeDraftId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    // ignore
  }
  return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

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

function isValidYmd(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}` === v;
}

function normalizeEmploymentDraft(d: EmploymentDetailsDraft): EmploymentDetailsDraft {
  const staffCategory = String(d.staff_category ?? "").trim().toUpperCase();
  const engagementType = String(d.engagement_type ?? "").trim().toUpperCase();
  const employmentStatus = String(d.employment_status ?? "").trim().toUpperCase();

  return {
    staff_category: staffCategory || undefined,
    engagement_type: engagementType || undefined,
    employment_status: employmentStatus || undefined,

    date_of_joining: String(d.date_of_joining ?? "").trim() || undefined,

    designation: String(d.designation ?? "").trim() || undefined,
    department: String(d.department ?? "").trim() || undefined,

    grade: String(d.grade ?? "").trim() || undefined,
    payroll_code: String(d.payroll_code ?? "").trim() || undefined,
    cost_center: String(d.cost_center ?? "").trim() || undefined,
    reporting_manager: String(d.reporting_manager ?? "").trim() || undefined,

    notes: String(d.notes ?? "").trim() || undefined,
  };
}

function deriveCategory(staffCategory: string): "CLINICAL" | "NON_CLINICAL" {
  const s = String(staffCategory || "").toUpperCase();
  if (["DOCTOR", "NURSE", "PARAMEDIC", "PHARMACIST", "TECHNICIAN"].includes(s)) return "CLINICAL";
  return "NON_CLINICAL";
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim().toLowerCase());
}

function normalizePhone(v: string) {
  return String(v || "")
    .replace(/[^\d]/g, "")
    .trim();
}
