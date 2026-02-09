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

type ProfessionalTrack = "CLINICAL" | "NON_CLINICAL";

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

type ProfessionalDetailsDraft = {
  track: ProfessionalTrack | string; // allow future values
  staff_category: StaffCategory | string;

  designation: string;
  department: string;

  primary_specialty?: string;
  secondary_specialties?: string[];

  reporting_manager?: string; // name/code text
  reporting_manager_code?: string;

  years_experience?: number | null;
  qualifications?: string; // free text
  languages?: string[]; // optional

  profile_summary?: string;
  notes?: string;
};

type IdentityDocumentDraft = {
  id: string;
  doc_type: string;
  doc_number: string;
  is_primary: boolean;
  verification_status?: string;
};

type StaffOnboardingDraft = {
  personal_details?: {
    identity_consent_acknowledged?: boolean;
    identity_documents?: IdentityDocumentDraft[];
    [k: string]: any;
  };
  contact_details?: Record<string, any>;
  employment_details?: Record<string, any>;
  medical_details?: Record<string, any>;
  system_access?: Record<string, any>;
  assignments?: any[];
};

type FieldErrorMap = Record<string, string>;

const CLINICAL_CATEGORIES = new Set(["DOCTOR", "NURSE", "PARAMEDIC", "PHARMACIST", "TECHNICIAN"]);

export default function HrStaffOnboardingProfessionalPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [form, setForm] = React.useState<ProfessionalDetailsDraft>({
    track: "NON_CLINICAL",
    staff_category: "STAFF",
    designation: "",
    department: "",
    primary_specialty: "",
    secondary_specialties: [],
    reporting_manager: "",
    reporting_manager_code: "",
    years_experience: null,
    qualifications: "",
    languages: [],
    profile_summary: "",
    notes: "",
  });

  // Ensure stable draftId
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
      const ed: any = draft.employment_details ?? {};
      const pd: any = ed.professional_details ?? {};

      // If employment step already stored staff_category/designation/department, prefer them.
      const staff_category = String(pd.staff_category ?? ed.staff_category ?? "STAFF").toUpperCase();
      const inferredTrack: ProfessionalTrack =
        CLINICAL_CATEGORIES.has(staff_category) ? "CLINICAL" : "NON_CLINICAL";

      const track = String(pd.track ?? inferredTrack).toUpperCase();
      const secondary = Array.isArray(pd.secondary_specialties)
        ? pd.secondary_specialties.map((x: any) => String(x).trim()).filter(Boolean)
        : [];

      const langs = Array.isArray(pd.languages)
        ? pd.languages.map((x: any) => String(x).trim()).filter(Boolean)
        : [];

      setForm({
        track: (track as any) || inferredTrack,
        staff_category: (staff_category as any) || "STAFF",

        designation: String(pd.designation ?? ed.designation ?? "").trim(),
        department: String(pd.department ?? ed.department ?? "").trim(),

        primary_specialty: String(pd.primary_specialty ?? "").trim(),
        secondary_specialties: secondary,

        reporting_manager: String(pd.reporting_manager ?? ed.reporting_manager ?? "").trim(),
        reporting_manager_code: String(pd.reporting_manager_code ?? "").trim(),

        years_experience:
          pd.years_experience === null || pd.years_experience === undefined || pd.years_experience === ""
            ? null
            : Number(pd.years_experience),

        qualifications: String(pd.qualifications ?? "").trim(),
        languages: langs,

        profile_summary: String(pd.profile_summary ?? "").trim(),
        notes: String(pd.notes ?? "").trim(),
      });

      setDirty(false);
      setErrors({});
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  const isClinical = React.useMemo(() => {
    const sc = String(form.staff_category ?? "").toUpperCase();
    const t = String(form.track ?? "").toUpperCase();
    // treat as clinical if either says clinical, or if category is clinical
    return t === "CLINICAL" || CLINICAL_CATEGORIES.has(sc);
  }, [form.staff_category, form.track]);

  const identityGate = React.useMemo(() => {
    if (!draftId) return { ok: true, reason: "" };
    const d = readDraft(draftId);
    const consent = !!d.personal_details?.identity_consent_acknowledged;
    const docs = Array.isArray(d.personal_details?.identity_documents) ? d.personal_details?.identity_documents : [];
    const hasPrimary = docs.some((x) => x && x.is_primary && String(x.doc_number || "").trim());
    const ok = consent && docs.length > 0 && hasPrimary;
    return {
      ok,
      reason: ok ? "" : "Identity step is incomplete (consent + at least one primary ID document required).",
    };
  }, [draftId]);

  function update<K extends keyof ProfessionalDetailsDraft>(key: K, value: ProfessionalDetailsDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[String(key)];
      return next;
    });
  }

  function updateCategory(v: string) {
    const staff_category = String(v || "").toUpperCase();
    const inferredTrack: ProfessionalTrack =
      CLINICAL_CATEGORIES.has(staff_category) ? "CLINICAL" : "NON_CLINICAL";

    setForm((prev) => ({
      ...prev,
      staff_category: staff_category as any,
      track: inferredTrack,
      // if switching to non-clinical, clear specialties
      primary_specialty: inferredTrack === "NON_CLINICAL" ? "" : prev.primary_specialty,
      secondary_specialties: inferredTrack === "NON_CLINICAL" ? [] : prev.secondary_specialties,
    }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next.staff_category;
      delete next.track;
      delete next.primary_specialty;
      return next;
    });
  }

  function updateSecondarySpecialties(csv: string) {
    const arr = String(csv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    update("secondary_specialties", arr);
  }

  function updateLanguages(csv: string) {
    const arr = String(csv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    update("languages", arr);
  }

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};

    const track = String(form.track ?? "").trim();
    const staff_category = String(form.staff_category ?? "").trim();
    const designation = String(form.designation ?? "").trim();
    const department = String(form.department ?? "").trim();

    if (!track) e.track = "Track is required.";
    if (!staff_category) e.staff_category = "Staff category is required.";

    if (!designation) e.designation = "Designation is required.";
    if (!department) e.department = "Department is required.";

    if (isClinical) {
      const ps = String(form.primary_specialty ?? "").trim();
      if (!ps) e.primary_specialty = "Primary specialty is required for clinical staff.";
    }

    const ye = form.years_experience;
    if (ye !== null && ye !== undefined && String(ye) !== "") {
      const n = Number(ye);
      if (Number.isNaN(n) || n < 0 || n > 80) e.years_experience = "Years of experience must be between 0 and 80.";
    }

    return e;
  }

  function normalize(): ProfessionalDetailsDraft {
    const track = String(form.track ?? "").toUpperCase();
    const staff_category = String(form.staff_category ?? "").toUpperCase();

    return {
      track: (track as any) || (CLINICAL_CATEGORIES.has(staff_category) ? "CLINICAL" : "NON_CLINICAL"),
      staff_category: (staff_category as any) || "STAFF",

      designation: String(form.designation ?? "").trim(),
      department: String(form.department ?? "").trim(),

      primary_specialty: isClinical ? String(form.primary_specialty ?? "").trim() || undefined : undefined,
      secondary_specialties: isClinical
        ? (Array.isArray(form.secondary_specialties) ? form.secondary_specialties.map((x) => String(x).trim()).filter(Boolean) : [])
        : [],

      reporting_manager: String(form.reporting_manager ?? "").trim() || undefined,
      reporting_manager_code: String(form.reporting_manager_code ?? "").trim() || undefined,

      years_experience:
        form.years_experience === null || form.years_experience === undefined || String(form.years_experience) === ""
          ? null
          : Number(form.years_experience),

      qualifications: String(form.qualifications ?? "").trim() || undefined,
      languages: Array.isArray(form.languages) ? form.languages.map((x) => String(x).trim()).filter(Boolean) : [],

      profile_summary: String(form.profile_summary ?? "").trim() || undefined,
      notes: String(form.notes ?? "").trim() || undefined,
    };
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
    const ed: any = existing.employment_details ?? {};

    const pd = normalize();

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      employment_details: {
        ...ed,

        // keep top-level convenience fields for other pages + review
        staff_category: pd.staff_category,
        designation: pd.designation,
        department: pd.department,
        reporting_manager: pd.reporting_manager ?? ed.reporting_manager ?? "",

        // structured professional payload for backend
        professional_details: pd,
      },
    };

    writeDraft(id, nextDraft);
    setDirty(false);

    toast({
      title: "Saved",
      description: "Professional details saved to draft.",
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
      if (!identityGate.ok) {
        toast({
          variant: "destructive",
          title: "Complete Identity step first",
          description: identityGate.reason,
        });
        return;
      }
      router.push(withDraftId("/infrastructure/staff/onboarding/employment", draftId) as any);
    } catch {
      // handled
    }
  }

  const secondaryCsv = (form.secondary_specialties ?? []).join(", ");
  const langCsv = (form.languages ?? []).join(", ");

  return (
    <OnboardingShell
      stepKey="professional"
      title="Professional details"
      description="Clinical vs non-clinical classification, designation, department/specialty mapping, reporting structure."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/identity", draftId) as any)}
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
            <div className="text-sm font-medium text-zc-foreground">Step 6: Professional</div>
            <div className="mt-1 text-xs text-zc-muted">
              Required: track + staff category + designation + department. Clinical staff also require a primary specialty.
            </div>
            {!identityGate.ok ? (
              <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
                {identityGate.reason}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {isClinical ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                Clinical
              </Badge>
            ) : (
              <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400" variant="secondary">
                Non-clinical
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
          {/* Required */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Core (required)</div>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Track" required error={errors.track}>
                <Select value={String(form.track ?? "")} onValueChange={(v) => update("track", v as any)}>
                  <SelectTrigger className={cn("border-zc-border", errors.track ? "border-red-500" : "")}>
                    <SelectValue placeholder="Select track" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLINICAL">Clinical</SelectItem>
                    <SelectItem value="NON_CLINICAL">Non-clinical</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Staff category" required error={errors.staff_category} help="Auto-sets track">
                <Select value={String(form.staff_category ?? "")} onValueChange={updateCategory}>
                  <SelectTrigger className={cn("border-zc-border", errors.staff_category ? "border-red-500" : "")}>
                    <SelectValue placeholder="Select category" />
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

              <Field label="Years of experience" error={errors.years_experience} help="Optional">
                <Input
                  className={cn("border-zc-border", errors.years_experience ? "border-red-500" : "")}
                  value={form.years_experience === null || form.years_experience === undefined ? "" : String(form.years_experience)}
                  onChange={(e) => {
                    const v = e.target.value;
                    update("years_experience", v === "" ? null : Number(v));
                  }}
                  inputMode="numeric"
                  placeholder="e.g., 5"
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Designation" required error={errors.designation}>
                <Input
                  className={cn("border-zc-border", errors.designation ? "border-red-500" : "")}
                  value={String(form.designation ?? "")}
                  onChange={(e) => update("designation", e.target.value)}
                  placeholder="e.g., Consultant / Staff Nurse / Technician"
                />
              </Field>

              <Field label="Department" required error={errors.department}>
                <Input
                  className={cn("border-zc-border", errors.department ? "border-red-500" : "")}
                  value={String(form.department ?? "")}
                  onChange={(e) => update("department", e.target.value)}
                  placeholder="e.g., Cardiology / OT / Admin"
                />
              </Field>
            </div>

            {isClinical ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Primary specialty" required error={errors.primary_specialty}>
                  <Input
                    className={cn("border-zc-border", errors.primary_specialty ? "border-red-500" : "")}
                    value={String(form.primary_specialty ?? "")}
                    onChange={(e) => update("primary_specialty", e.target.value)}
                    placeholder="e.g., Interventional Cardiology"
                  />
                </Field>

                <Field label="Secondary specialties" help="Comma separated">
                  <Input
                    className="border-zc-border"
                    value={secondaryCsv}
                    onChange={(e) => updateSecondarySpecialties(e.target.value)}
                    placeholder="e.g., Echocardiography, Critical Care"
                  />
                </Field>
              </div>
            ) : (
              <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
                <div className="font-medium text-zc-foreground">Clinical specialties</div>
                <div className="mt-1">Not applicable for non-clinical staff categories.</div>
              </div>
            )}
          </div>

          <Separator className="bg-zc-border" />

          {/* Reporting */}
          <div className="grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Reporting / profile (optional)</div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Reporting manager" help="Name / employee code">
                <Input
                  className="border-zc-border"
                  value={String(form.reporting_manager ?? "")}
                  onChange={(e) => update("reporting_manager", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Reporting manager code" help="Optional">
                <Input
                  className="border-zc-border"
                  value={String(form.reporting_manager_code ?? "")}
                  onChange={(e) => update("reporting_manager_code", e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Qualifications" help="Free text">
                <Textarea
                  className="border-zc-border"
                  value={String(form.qualifications ?? "")}
                  onChange={(e) => update("qualifications", e.target.value)}
                  placeholder="e.g., MBBS, MD (Cardiology) / BSc Nursing / Diploma etc."
                />
              </Field>

              <Field label="Languages" help="Comma separated">
                <Input
                  className="border-zc-border"
                  value={langCsv}
                  onChange={(e) => updateLanguages(e.target.value)}
                  placeholder="e.g., English, Hindi, Kannada"
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Profile summary" help="Optional (1–3 lines)">
                <Textarea
                  className="border-zc-border"
                  value={String(form.profile_summary ?? "")}
                  onChange={(e) => update("profile_summary", e.target.value)}
                  placeholder="Short professional summary…"
                />
              </Field>

              <Field label="Notes" help="Optional">
                <Textarea
                  className="border-zc-border"
                  value={String(form.notes ?? "")}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Internal notes…"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
            <div className="font-medium text-zc-foreground">Next step</div>
            <div className="mt-1">
              Employment: <span className="font-mono">/onboarding/employment</span>
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

function makeId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {}
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
