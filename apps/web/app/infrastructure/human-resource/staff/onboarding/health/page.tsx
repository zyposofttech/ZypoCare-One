"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/cn";

/**
 * Workflow alignment: 2.1.6 Employee Health Records
 * We store draft payload (snake_case) under:
 *   medical_details.employee_health_record
 *
 * Note: earlier pages stored drafts in localStorage using `hrStaffOnboardingDraft:${draftId}`.
 * One earlier page used a different key; this page reads both keys and writes to both
 * to keep the flow stable.
 */

type BloodGroup = "A_POS" | "A_NEG" | "B_POS" | "B_NEG" | "AB_POS" | "AB_NEG" | "O_POS" | "O_NEG";
type VaccineType =
  | "HEPATITIS_B"
  | "COVID_19"
  | "INFLUENZA"
  | "TETANUS"
  | "MMR"
  | "CHICKENPOX"
  | "TYPHOID"
  | "RABIES"
  | "OTHER";

type InjuryType =
  | "NEEDLE_STICK"
  | "SHARP_INJURY"
  | "SPLASH_EXPOSURE"
  | "SLIP_FALL"
  | "BACK_INJURY"
  | "BURN"
  | "RADIATION_EXPOSURE"
  | "CHEMICAL_EXPOSURE"
  | "BIOLOGICAL_EXPOSURE"
  | "OTHER";

type FitnessCertificateType = "PRE_EMPLOYMENT" | "PERIODIC" | "POST_ILLNESS" | "POST_INJURY";

type VaccinationRecordDraft = {
  id: string;
  vaccine_type: VaccineType | string;
  vaccine_name: string;
  manufacturer?: string;
  batch_number?: string;

  dose_number: number | null;
  total_doses: number | null;

  administered_date?: string; // YYYY-MM-DD
  administered_by?: string;
  administration_site?: string;

  next_dose_date?: string; // YYYY-MM-DD
  certificate_url?: string;

  adverse_reaction: boolean;
  reaction_details?: string;

  is_active: boolean;
};

type OccupationalInjuryDraft = {
  id: string;
  incident_date?: string; // YYYY-MM-DD
  incident_time?: string;
  incident_location: string;

  injury_type: InjuryType | string;
  injury_description: string;
  body_part_affected: string;

  treatment_given: string;
  treating_physician?: string;

  days_lost_due_to_injury: number | null;

  incident_report_filed: boolean;
  incident_report_number?: string;
  incident_report_url?: string;

  compensation_claimed: boolean;
  compensation_amount: number | null;
};

type FitnessCertificateDraft = {
  id: string;
  certificate_type: FitnessCertificateType | string;

  examination_date?: string; // YYYY-MM-DD
  examining_physician: string;

  fit_for_duty: boolean;
  restrictions: string[];
  remarks?: string;

  valid_from?: string; // YYYY-MM-DD
  valid_upto?: string; // YYYY-MM-DD

  certificate_url?: string;
};

type EmployeeHealthRecordDraft = {
  // Pre-employment medical
  pre_employment_medical_done: boolean;
  pre_employment_medical_date?: string;
  pre_employment_medical_report?: string;
  fit_for_duty: boolean;
  medical_restrictions: string[];

  // Periodic exam
  last_medical_checkup_date?: string;
  next_medical_checkup_due?: string;
  annual_checkup_frequency: number | null; // months

  // History
  chronic_conditions: string[];
  allergies: string[];
  blood_group?: BloodGroup | string;

  // Vaccinations
  vaccinations: VaccinationRecordDraft[];

  // Occupational exposure
  has_blood_exposure_risk: boolean;
  has_radiation_exposure: boolean;
  has_chemical_exposure: boolean;
  has_biological_exposure: boolean;

  // Injury / illness
  injuries: OccupationalInjuryDraft[];

  // Fitness certs
  fitness_certificates: FitnessCertificateDraft[];

  // Leave history
  total_medical_leave_days: number | null;

  // Status
  is_active: boolean;
};

type StaffOnboardingDraft = {
  medical_details?: Record<string, any>;
  [k: string]: any;
};

type FieldErrorMap = Record<string, string>;

const BLOOD_GROUPS: { value: BloodGroup; label: string }[] = [
  { value: "A_POS", label: "A+" },
  { value: "A_NEG", label: "A-" },
  { value: "B_POS", label: "B+" },
  { value: "B_NEG", label: "B-" },
  { value: "AB_POS", label: "AB+" },
  { value: "AB_NEG", label: "AB-" },
  { value: "O_POS", label: "O+" },
  { value: "O_NEG", label: "O-" },
];

const VACCINE_TYPES: VaccineType[] = [
  "HEPATITIS_B",
  "COVID_19",
  "INFLUENZA",
  "TETANUS",
  "MMR",
  "CHICKENPOX",
  "TYPHOID",
  "RABIES",
  "OTHER",
];

const INJURY_TYPES: InjuryType[] = [
  "NEEDLE_STICK",
  "SHARP_INJURY",
  "SPLASH_EXPOSURE",
  "SLIP_FALL",
  "BACK_INJURY",
  "BURN",
  "RADIATION_EXPOSURE",
  "CHEMICAL_EXPOSURE",
  "BIOLOGICAL_EXPOSURE",
  "OTHER",
];

const CERT_TYPES: FitnessCertificateType[] = ["PRE_EMPLOYMENT", "PERIODIC", "POST_ILLNESS", "POST_INJURY"];

function defaultHealth(): EmployeeHealthRecordDraft {
  return {
    pre_employment_medical_done: false,
    pre_employment_medical_date: "",
    pre_employment_medical_report: "",
    fit_for_duty: true,
    medical_restrictions: [],

    last_medical_checkup_date: "",
    next_medical_checkup_due: "",
    annual_checkup_frequency: 12,

    chronic_conditions: [],
    allergies: [],
    blood_group: "",

    vaccinations: [],

    has_blood_exposure_risk: false,
    has_radiation_exposure: false,
    has_chemical_exposure: false,
    has_biological_exposure: false,

    injuries: [],
    fitness_certificates: [],

    total_medical_leave_days: null,
    is_active: true,
  };
}

export default function HrStaffOnboardingHealthPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});
  const [rec, setRec] = React.useState<EmployeeHealthRecordDraft>(defaultHealth());

  // Ensure draftId
  React.useEffect(() => {
    if (draftId) return;
    router.replace("/infrastructure/staff/onboarding/start" as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

// Load draft
  React.useEffect(() => {
    if (!draftId) return;
    setLoading(true);
    try {
      const d = readDraftAnyKey(draftId);
      const md: any = d.medical_details ?? {};
      const raw = md.employee_health_record;

      if (raw && typeof raw === "object") {
        const v = raw as any;

        setRec({
          pre_employment_medical_done: !!v.pre_employment_medical_done,
          pre_employment_medical_date: v.pre_employment_medical_date ? String(v.pre_employment_medical_date).slice(0, 10) : "",
          pre_employment_medical_report: v.pre_employment_medical_report ? String(v.pre_employment_medical_report) : "",
          fit_for_duty: v.fit_for_duty === undefined ? true : !!v.fit_for_duty,
          medical_restrictions: Array.isArray(v.medical_restrictions)
            ? v.medical_restrictions.map((x: any) => String(x).trim()).filter(Boolean)
            : [],

          last_medical_checkup_date: v.last_medical_checkup_date ? String(v.last_medical_checkup_date).slice(0, 10) : "",
          next_medical_checkup_due: v.next_medical_checkup_due ? String(v.next_medical_checkup_due).slice(0, 10) : "",
          annual_checkup_frequency:
            v.annual_checkup_frequency === null || v.annual_checkup_frequency === undefined || v.annual_checkup_frequency === ""
              ? 12
              : Number(v.annual_checkup_frequency),

          chronic_conditions: Array.isArray(v.chronic_conditions)
            ? v.chronic_conditions.map((x: any) => String(x).trim()).filter(Boolean)
            : [],
          allergies: Array.isArray(v.allergies) ? v.allergies.map((x: any) => String(x).trim()).filter(Boolean) : [],
          blood_group: v.blood_group ? String(v.blood_group) : "",

          vaccinations: Array.isArray(v.vaccinations)
            ? v.vaccinations.map((x: any) => normalizeVaccinationDraft(x))
            : [],

          has_blood_exposure_risk: !!v.has_blood_exposure_risk,
          has_radiation_exposure: !!v.has_radiation_exposure,
          has_chemical_exposure: !!v.has_chemical_exposure,
          has_biological_exposure: !!v.has_biological_exposure,

          injuries: Array.isArray(v.injuries) ? v.injuries.map((x: any) => normalizeInjuryDraft(x)) : [],
          fitness_certificates: Array.isArray(v.fitness_certificates)
            ? v.fitness_certificates.map((x: any) => normalizeCertDraft(x))
            : [],

          total_medical_leave_days:
            v.total_medical_leave_days === null || v.total_medical_leave_days === undefined || v.total_medical_leave_days === ""
              ? null
              : Number(v.total_medical_leave_days),

          is_active: v.is_active === undefined ? true : !!v.is_active,
        });
      } else {
        setRec(defaultHealth());
      }

      setDirty(false);
      setErrors({});
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  function setField<K extends keyof EmployeeHealthRecordDraft>(key: K, val: EmployeeHealthRecordDraft[K]) {
    setRec((p) => ({ ...p, [key]: val }));
    setDirty(true);
    setErrors((e) => {
      const n = { ...e };
      delete n[String(key)];
      return n;
    });
  }

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};

    if (rec.pre_employment_medical_done) {
      if (!String(rec.pre_employment_medical_date || "").trim()) e.pre_employment_medical_date = "Required when pre-employment medical is done.";
      if (rec.pre_employment_medical_date && !isISODate(rec.pre_employment_medical_date)) e.pre_employment_medical_date = "Use YYYY-MM-DD.";
    }
    if (rec.annual_checkup_frequency === null || rec.annual_checkup_frequency === undefined || Number.isNaN(Number(rec.annual_checkup_frequency))) {
      e.annual_checkup_frequency = "Annual checkup frequency (months) is required.";
    } else {
      const m = Number(rec.annual_checkup_frequency);
      if (m < 1 || m > 60) e.annual_checkup_frequency = "Frequency must be between 1 and 60 months.";
    }

    if (rec.last_medical_checkup_date && !isISODate(rec.last_medical_checkup_date)) e.last_medical_checkup_date = "Use YYYY-MM-DD.";
    if (rec.next_medical_checkup_due && !isISODate(rec.next_medical_checkup_due)) e.next_medical_checkup_due = "Use YYYY-MM-DD.";
    if (rec.last_medical_checkup_date && rec.next_medical_checkup_due && rec.last_medical_checkup_date > rec.next_medical_checkup_due) {
      e.next_medical_checkup_due = "Next due cannot be before last checkup date.";
    }

    // Vaccinations validations (only if entered)
    rec.vaccinations.forEach((v, idx) => {
      const base = `vaccinations.${idx}`;
      if (!String(v.vaccine_type || "").trim()) e[`${base}.vaccine_type`] = "Type is required.";
      if (!String(v.vaccine_name || "").trim()) e[`${base}.vaccine_name`] = "Vaccine name is required.";
      if (!v.administered_date) e[`${base}.administered_date`] = "Administered date is required.";
      else if (!isISODate(v.administered_date)) e[`${base}.administered_date`] = "Use YYYY-MM-DD.";

      const dn = v.dose_number;
      if (dn === null || dn === undefined || Number.isNaN(Number(dn)) || Number(dn) < 1) e[`${base}.dose_number`] = "Dose number must be ≥ 1.";
      const td = v.total_doses;
      if (td === null || td === undefined || Number.isNaN(Number(td)) || Number(td) < 1) e[`${base}.total_doses`] = "Total doses must be ≥ 1.";
      if (dn !== null && td !== null && Number(dn) > Number(td)) e[`${base}.dose_number`] = "Dose number cannot exceed total doses.";

      if (v.next_dose_date && !isISODate(v.next_dose_date)) e[`${base}.next_dose_date`] = "Use YYYY-MM-DD.";
    });

    // Certificates validations (only if entered)
    rec.fitness_certificates.forEach((c, idx) => {
      const base = `fitness_certificates.${idx}`;
      if (!String(c.certificate_type || "").trim()) e[`${base}.certificate_type`] = "Type is required.";
      if (!String(c.examining_physician || "").trim()) e[`${base}.examining_physician`] = "Examining physician is required.";
      if (!String(c.examination_date || "").trim()) e[`${base}.examination_date`] = "Examination date is required.";
      else if (c.examination_date && !isISODate(c.examination_date)) e[`${base}.examination_date`] = "Use YYYY-MM-DD.";
      if (!String(c.valid_from || "").trim()) e[`${base}.valid_from`] = "Valid from is required.";
      else if (c.valid_from && !isISODate(c.valid_from)) e[`${base}.valid_from`] = "Use YYYY-MM-DD.";
      if (c.valid_upto && !isISODate(c.valid_upto)) e[`${base}.valid_upto`] = "Use YYYY-MM-DD.";
      if (c.valid_from && c.valid_upto && c.valid_from > c.valid_upto) e[`${base}.valid_upto`] = "Valid upto cannot be before valid from.";
      if (!c.fit_for_duty && (!c.restrictions || c.restrictions.length === 0)) e[`${base}.restrictions`] = "Add at least one restriction if not fit for duty.";
    });

    // Injuries (optional) — validate minimal when entered
    rec.injuries.forEach((inj, idx) => {
      const base = `injuries.${idx}`;
      if (!String(inj.incident_location || "").trim()) e[`${base}.incident_location`] = "Location is required.";
      if (!String(inj.injury_type || "").trim()) e[`${base}.injury_type`] = "Type is required.";
      if (!String(inj.injury_description || "").trim()) e[`${base}.injury_description`] = "Description is required.";
      if (!String(inj.body_part_affected || "").trim()) e[`${base}.body_part_affected`] = "Body part is required.";
      if (!String(inj.treatment_given || "").trim()) e[`${base}.treatment_given`] = "Treatment is required.";
      if (inj.incident_date && !isISODate(inj.incident_date)) e[`${base}.incident_date`] = "Use YYYY-MM-DD.";
    });

    if (rec.total_medical_leave_days !== null && rec.total_medical_leave_days !== undefined) {
      const n = Number(rec.total_medical_leave_days);
      if (Number.isNaN(n) || n < 0 || n > 3660) e.total_medical_leave_days = "Total medical leave days must be between 0 and 3660.";
    }

    return e;
  }

  function saveDraftOrThrow() {
    if (!draftId) return;

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast({
        variant: "destructive",
        title: "Fix required fields",
        description: "Please fix highlighted fields and try again.",
      });
      throw new Error("validation_failed");
    }

    const existing = readDraftAnyKey(draftId);
    const md: any = existing.medical_details ?? {};

    const payload = normalizeHealth(rec);

    const next: StaffOnboardingDraft = {
      ...existing,
      medical_details: {
        ...md,
        employee_health_record: payload,
      },
    };

    writeDraftBothKeys(draftId, next);
    setDirty(false);

    toast({ title: "Saved", description: "Employee health record saved to draft." });
  }

  function onSave() {
    try {
      saveDraftOrThrow();
    } catch {
      // toast already shown
    }
  }

  function onSaveAndNext() {
    try {
      saveDraftOrThrow();
      router.push(withDraftId("/infrastructure/staff/onboarding/insurance", draftId) as any);
    } catch {
      // handled
    }
  }

  // Lists as CSV UI
  const restrictionsCsv = rec.medical_restrictions.join(", ");
  const chronicCsv = rec.chronic_conditions.join(", ");
  const allergiesCsv = rec.allergies.join(", ");

  const healthBadge =
    rec.pre_employment_medical_done && rec.fit_for_duty
      ? { text: "Fit for duty", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" }
      : rec.pre_employment_medical_done && !rec.fit_for_duty
      ? { text: "Restrictions", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" }
      : { text: "Pending medical", cls: "border border-zc-border" };

  return (
    <OnboardingShell
      stepKey="health"
      title="Employee health records"
      description="Pre-employment medical, periodic exam cadence, vaccinations, exposures, injuries, and fitness certificates."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/background", draftId) as any)}
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
            <div className="text-sm font-medium text-zc-foreground">Employee Health Record</div>
            <div className="mt-1 text-xs text-zc-muted">
              Captures the exact structure from workflow: pre-employment medical, vaccinations, exposures, injuries, and fitness certificates.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={healthBadge.cls}>
              {healthBadge.text}
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

        <Separator className="bg-zc-border" />

        <div className={cn("grid gap-4", loading ? "opacity-60" : "opacity-100")}>
          {/* Pre-employment + periodic medical */}
          <Card className="border-zc-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Medical examinations</CardTitle>
              <CardDescription>Pre-employment medical + periodic checkup frequency (months).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border border-zc-border bg-zc-panel/40 p-3">
                  <div>
                    <div className="text-sm font-medium text-zc-foreground">Pre-employment medical done</div>
                    <div className="mt-1 text-xs text-zc-muted">Set once the screening is completed.</div>
                  </div>
                  <Switch
                    checked={!!rec.pre_employment_medical_done}
                    onCheckedChange={(v) => {
                      setField("pre_employment_medical_done", !!v);
                      if (!v) {
                        setRec((p) => ({
                          ...p,
                          pre_employment_medical_date: "",
                          pre_employment_medical_report: "",
                        }));
                        setDirty(true);
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border border-zc-border bg-zc-panel/40 p-3">
                  <div>
                    <div className="text-sm font-medium text-zc-foreground">Fit for duty</div>
                    <div className="mt-1 text-xs text-zc-muted">If false, add restrictions.</div>
                  </div>
                  <Switch checked={!!rec.fit_for_duty} onCheckedChange={(v) => setField("fit_for_duty", !!v)} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Pre-employment medical date" error={errors.pre_employment_medical_date} help="YYYY-MM-DD">
                  <Input
                    type="date"
                    className={cn("border-zc-border", errors.pre_employment_medical_date ? "border-red-500/60" : "")}
                    value={rec.pre_employment_medical_date ?? ""}
                    onChange={(e) => setField("pre_employment_medical_date", e.target.value)}
                    disabled={!rec.pre_employment_medical_done}
                  />
                </Field>

                <Field label="Annual checkup frequency (months)" error={errors.annual_checkup_frequency} help="e.g., 12">
                  <Input
                    className={cn("border-zc-border", errors.annual_checkup_frequency ? "border-red-500/60" : "")}
                    value={rec.annual_checkup_frequency === null || rec.annual_checkup_frequency === undefined ? "" : String(rec.annual_checkup_frequency)}
                    onChange={(e) => setField("annual_checkup_frequency", e.target.value === "" ? null : Number(e.target.value))}
                    inputMode="numeric"
                    placeholder="12"
                  />
                </Field>

                <Field label="Total medical leave days (optional)" error={errors.total_medical_leave_days}>
                  <Input
                    className={cn("border-zc-border", errors.total_medical_leave_days ? "border-red-500/60" : "")}
                    value={rec.total_medical_leave_days === null || rec.total_medical_leave_days === undefined ? "" : String(rec.total_medical_leave_days)}
                    onChange={(e) => setField("total_medical_leave_days", e.target.value === "" ? null : Number(e.target.value))}
                    inputMode="numeric"
                    placeholder="Optional"
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Pre-employment medical report (URL / filename)" help="Optional">
                  <Input
                    className="border-zc-border"
                    value={rec.pre_employment_medical_report ?? ""}
                    onChange={(e) => setField("pre_employment_medical_report", e.target.value)}
                    placeholder="report.pdf or https://..."
                    disabled={!rec.pre_employment_medical_done}
                  />
                </Field>

                <Field label="Medical restrictions" help="Comma separated (optional)">
                  <Input
                    className="border-zc-border"
                    value={restrictionsCsv}
                    onChange={(e) => {
                      const list = toList(e.target.value);
                      setField("medical_restrictions", list);
                    }}
                    placeholder="e.g., No night duty, Avoid chemical exposure"
                    disabled={rec.fit_for_duty}
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Last medical checkup date" error={errors.last_medical_checkup_date} help="YYYY-MM-DD">
                  <Input
                    type="date"
                    className={cn("border-zc-border", errors.last_medical_checkup_date ? "border-red-500/60" : "")}
                    value={rec.last_medical_checkup_date ?? ""}
                    onChange={(e) => setField("last_medical_checkup_date", e.target.value)}
                  />
                </Field>

                <Field label="Next medical checkup due" error={errors.next_medical_checkup_due} help="YYYY-MM-DD">
                  <Input
                    type="date"
                    className={cn("border-zc-border", errors.next_medical_checkup_due ? "border-red-500/60" : "")}
                    value={rec.next_medical_checkup_due ?? ""}
                    onChange={(e) => setField("next_medical_checkup_due", e.target.value)}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* History + exposures */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-zc-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Medical history</CardTitle>
                <CardDescription>Chronic conditions, allergies, blood group.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Blood group" help="Optional">
                    <Select value={String(rec.blood_group ?? "")} onValueChange={(v) => setField("blood_group", v)}>
                      <SelectTrigger className="border-zc-border">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map((b) => (
                          <SelectItem key={b.value} value={b.value}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="flex items-center justify-between rounded-md border border-zc-border bg-zc-panel/40 p-3">
                    <div>
                      <div className="text-sm font-medium text-zc-foreground">Record active</div>
                      <div className="mt-1 text-xs text-zc-muted">Disable only if record is archived.</div>
                    </div>
                    <Switch checked={!!rec.is_active} onCheckedChange={(v) => setField("is_active", !!v)} />
                  </div>
                </div>

                <Field label="Chronic conditions" help="Comma separated">
                  <Textarea
                    className="min-h-[90px] border-zc-border"
                    value={chronicCsv}
                    onChange={(e) => setField("chronic_conditions", toList(e.target.value))}
                    placeholder="e.g., Diabetes, Hypertension"
                  />
                </Field>

                <Field label="Allergies" help="Comma separated">
                  <Textarea
                    className="min-h-[90px] border-zc-border"
                    value={allergiesCsv}
                    onChange={(e) => setField("allergies", toList(e.target.value))}
                    placeholder="e.g., Penicillin, Latex"
                  />
                </Field>
              </CardContent>
            </Card>

            <Card className="border-zc-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Occupational exposure</CardTitle>
                <CardDescription>Risk flags (blood/radiation/chemical/biological).</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <ToggleRow
                  label="Blood exposure risk"
                  value={rec.has_blood_exposure_risk}
                  onChange={(v) => setField("has_blood_exposure_risk", v)}
                />
                <ToggleRow
                  label="Radiation exposure"
                  value={rec.has_radiation_exposure}
                  onChange={(v) => setField("has_radiation_exposure", v)}
                />
                <ToggleRow
                  label="Chemical exposure"
                  value={rec.has_chemical_exposure}
                  onChange={(v) => setField("has_chemical_exposure", v)}
                />
                <ToggleRow
                  label="Biological exposure"
                  value={rec.has_biological_exposure}
                  onChange={(v) => setField("has_biological_exposure", v)}
                />

                <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
                  These flags help drive mandatory vaccinations/training (e.g., Hep B, needle stick SOPs, radiation badge monitoring).
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vaccinations */}
          <Card className="border-zc-border">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">Vaccination records</CardTitle>
                  <CardDescription>Add multiple vaccination entries with dose tracking.</CardDescription>
                </div>
                <Button
                  className="bg-zc-accent text-white hover:bg-zc-accent/90"
                  onClick={() => {
                    setRec((p) => ({
                      ...p,
                      vaccinations: [
                        ...p.vaccinations,
                        {
                          id: makeId(),
                          vaccine_type: "HEPATITIS_B",
                          vaccine_name: "Hepatitis B",
                          manufacturer: "",
                          batch_number: "",
                          dose_number: 1,
                          total_doses: 3,
                          administered_date: "",
                          administered_by: "",
                          administration_site: "",
                          next_dose_date: "",
                          certificate_url: "",
                          adverse_reaction: false,
                          reaction_details: "",
                          is_active: true,
                        },
                      ],
                    }));
                    setDirty(true);
                  }}
                >
                  + Add vaccination
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {rec.vaccinations.length === 0 ? (
                <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-sm text-zc-muted">
                  No vaccination records added.
                </div>
              ) : (
                <div className="grid gap-3">
                  {rec.vaccinations.map((v, idx) => {
                    const base = `vaccinations.${idx}`;
                    const tErr = errors[`${base}.vaccine_type`];
                    const nErr = errors[`${base}.vaccine_name`];
                    const dErr = errors[`${base}.administered_date`];
                    const dnErr = errors[`${base}.dose_number`];
                    const tdErr = errors[`${base}.total_doses`];
                    const ndErr = errors[`${base}.next_dose_date`];

                    return (
                      <div key={v.id} className="rounded-md border border-zc-border bg-zc-panel/40 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="border border-zc-border">
                                Vaccination #{idx + 1}
                              </Badge>
                              {v.is_active ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-zc-border/40 text-zc-muted" variant="secondary">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-zc-muted">Store certificate URL/filename (upload wiring later).</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 border-zc-border px-3 text-xs"
                              onClick={() => {
                                setRec((p) => ({
                                  ...p,
                                  vaccinations: p.vaccinations.filter((x) => x.id !== v.id),
                                }));
                                setDirty(true);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <Field label="Vaccine type" required error={tErr}>
                            <Select
                              value={String(v.vaccine_type ?? "")}
                              onValueChange={(val) => {
                                setRec((p) => {
                                  const copy = [...p.vaccinations];
                                  copy[idx] = { ...copy[idx], vaccine_type: val };
                                  return { ...p, vaccinations: copy };
                                });
                                setDirty(true);
                              }}
                            >
                              <SelectTrigger className={cn("border-zc-border", tErr ? "border-red-500/60" : "")}>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {VACCINE_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {tErr ? <div className="text-xs text-red-600">{tErr}</div> : null}
                          </Field>

                          <Field label="Vaccine name" required error={nErr}>
                            <Input
                              className={cn("border-zc-border", nErr ? "border-red-500/60" : "")}
                              value={v.vaccine_name ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.vaccinations];
                                  copy[idx] = { ...copy[idx], vaccine_name: value };
                                  return { ...p, vaccinations: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="e.g., Hepatitis B"
                            />
                            {nErr ? <div className="text-xs text-red-600">{nErr}</div> : null}
                          </Field>

                          <Field label="Administered date" required error={dErr}>
                            <Input
                              type="date"
                              className={cn("border-zc-border", dErr ? "border-red-500/60" : "")}
                              value={v.administered_date ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.vaccinations];
                                  copy[idx] = { ...copy[idx], administered_date: value };
                                  return { ...p, vaccinations: copy };
                                });
                                setDirty(true);
                              }}
                            />
                            {dErr ? <div className="text-xs text-red-600">{dErr}</div> : null}
                          </Field>

                          <Field label="Dose number" required error={dnErr}>
                            <Input
                              className={cn("border-zc-border", dnErr ? "border-red-500/60" : "")}
                              value={v.dose_number === null || v.dose_number === undefined ? "" : String(v.dose_number)}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : Number(e.target.value);
                                setRec((p) => {
                                  const copy = [...p.vaccinations];
                                  copy[idx] = { ...copy[idx], dose_number: value };
                                  return { ...p, vaccinations: copy };
                                });
                                setDirty(true);
                              }}
                              inputMode="numeric"
                              placeholder="1"
                            />
                            {dnErr ? <div className="text-xs text-red-600">{dnErr}</div> : null}
                          </Field>

                          <Field label="Total doses" required error={tdErr}>
                            <Input
                              className={cn("border-zc-border", tdErr ? "border-red-500/60" : "")}
                              value={v.total_doses === null || v.total_doses === undefined ? "" : String(v.total_doses)}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : Number(e.target.value);
                                setRec((p) => {
                                  const copy = [...p.vaccinations];
                                  copy[idx] = { ...copy[idx], total_doses: value };
                                  return { ...p, vaccinations: copy };
                                });
                                setDirty(true);
                              }}
                              inputMode="numeric"
                              placeholder="3"
                            />
                            {tdErr ? <div className="text-xs text-red-600">{tdErr}</div> : null}
                          </Field>

                          <Field label="Next dose date" error={ndErr} help="Optional">
                            <Input
                              type="date"
                              className={cn("border-zc-border", ndErr ? "border-red-500/60" : "")}
                              value={v.next_dose_date ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.vaccinations];
                                  copy[idx] = { ...copy[idx], next_dose_date: value };
                                  return { ...p, vaccinations: copy };
                                });
                                setDirty(true);
                              }}
                            />
                            {ndErr ? <div className="text-xs text-red-600">{ndErr}</div> : null}
                          </Field>

                          <Field label="Manufacturer" help="Optional">
                            <Input
                              className="border-zc-border"
                              value={v.manufacturer ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.vaccinations];
                                  copy[idx] = { ...copy[idx], manufacturer: value };
                                  return { ...p, vaccinations: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="Optional"
                            />
                          </Field>

                          <Field label="Batch number" help="Optional">
                            <Input
                              className="border-zc-border"
                              value={v.batch_number ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.vaccinations];
                                  copy[idx] = { ...copy[idx], batch_number: value };
                                  return { ...p, vaccinations: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="Optional"
                            />
                          </Field>

                          <Field label="Certificate (URL / filename)" help="Optional">
                            <Input
                              className="border-zc-border"
                              value={v.certificate_url ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.vaccinations];
                                  copy[idx] = { ...copy[idx], certificate_url: value };
                                  return { ...p, vaccinations: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="cert.pdf or https://..."
                            />
                          </Field>
                        </div>

                        <Separator className="my-3 bg-zc-border" />

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="flex items-center justify-between rounded-md border border-zc-border bg-transparent p-3">
                            <div>
                              <div className="text-sm font-medium text-zc-foreground">Adverse reaction</div>
                              <div className="mt-1 text-xs text-zc-muted">If yes, capture reaction details.</div>
                            </div>
                            <Switch
                              checked={!!v.adverse_reaction}
                              onCheckedChange={(val) => {
                                setRec((p) => {
                                  const copy = [...p.vaccinations];
                                  copy[idx] = { ...copy[idx], adverse_reaction: !!val, reaction_details: val ? copy[idx].reaction_details : "" };
                                  return { ...p, vaccinations: copy };
                                });
                                setDirty(true);
                              }}
                            />
                          </div>

                          <Field label="Reaction details" help="Optional (recommended if adverse reaction)">
                            <Textarea
                              className="min-h-[60px] border-zc-border"
                              value={v.reaction_details ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.vaccinations];
                                  copy[idx] = { ...copy[idx], reaction_details: value };
                                  return { ...p, vaccinations: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="Optional"
                              disabled={!v.adverse_reaction}
                            />
                          </Field>
                        </div>

                        <div className="mt-3 flex items-center justify-between rounded-md border border-zc-border bg-transparent p-3">
                          <span className="text-xs text-zc-muted">is_active</span>
                          <Switch
                            checked={!!v.is_active}
                            onCheckedChange={(val) => {
                              setRec((p) => {
                                const copy = [...p.vaccinations];
                                copy[idx] = { ...copy[idx], is_active: !!val };
                                return { ...p, vaccinations: copy };
                              });
                              setDirty(true);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fitness certificates */}
          <Card className="border-zc-border">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">Fitness certificates</CardTitle>
                  <CardDescription>Pre-employment / periodic / post-illness / post-injury certificates.</CardDescription>
                </div>
                <Button
                  className="bg-zc-accent text-white hover:bg-zc-accent/90"
                  onClick={() => {
                    setRec((p) => ({
                      ...p,
                      fitness_certificates: [
                        ...p.fitness_certificates,
                        {
                          id: makeId(),
                          certificate_type: "PRE_EMPLOYMENT",
                          examination_date: "",
                          examining_physician: "",
                          fit_for_duty: true,
                          restrictions: [],
                          remarks: "",
                          valid_from: "",
                          valid_upto: "",
                          certificate_url: "",
                        },
                      ],
                    }));
                    setDirty(true);
                  }}
                >
                  + Add certificate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {rec.fitness_certificates.length === 0 ? (
                <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-sm text-zc-muted">
                  No fitness certificates added.
                </div>
              ) : (
                <div className="grid gap-3">
                  {rec.fitness_certificates.map((c, idx) => {
                    const base = `fitness_certificates.${idx}`;
                    const tErr = errors[`${base}.certificate_type`];
                    const pErr = errors[`${base}.examining_physician`];
                    const eErr = errors[`${base}.examination_date`];
                    const vfErr = errors[`${base}.valid_from`];
                    const vuErr = errors[`${base}.valid_upto`];
                    const rErr = errors[`${base}.restrictions`];

                    return (
                      <div key={c.id} className="rounded-md border border-zc-border bg-zc-panel/40 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="border border-zc-border">
                                Certificate #{idx + 1}
                              </Badge>
                              {c.fit_for_duty ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                                  Fit
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400" variant="secondary">
                                  Not fit
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-zc-muted">Stores validity window + URL/filename.</div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 border-zc-border px-3 text-xs"
                            onClick={() => {
                              setRec((p) => ({
                                ...p,
                                fitness_certificates: p.fitness_certificates.filter((x) => x.id !== c.id),
                              }));
                              setDirty(true);
                            }}
                          >
                            Remove
                          </Button>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <Field label="Certificate type" required error={tErr}>
                            <Select
                              value={String(c.certificate_type ?? "")}
                              onValueChange={(val) => {
                                setRec((p) => {
                                  const copy = [...p.fitness_certificates];
                                  copy[idx] = { ...copy[idx], certificate_type: val };
                                  return { ...p, fitness_certificates: copy };
                                });
                                setDirty(true);
                              }}
                            >
                              <SelectTrigger className={cn("border-zc-border", tErr ? "border-red-500/60" : "")}>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {CERT_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {tErr ? <div className="text-xs text-red-600">{tErr}</div> : null}
                          </Field>

                          <Field label="Examining physician" required error={pErr}>
                            <Input
                              className={cn("border-zc-border", pErr ? "border-red-500/60" : "")}
                              value={c.examining_physician ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.fitness_certificates];
                                  copy[idx] = { ...copy[idx], examining_physician: value };
                                  return { ...p, fitness_certificates: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="Name"
                            />
                            {pErr ? <div className="text-xs text-red-600">{pErr}</div> : null}
                          </Field>

                          <Field label="Examination date" required error={eErr}>
                            <Input
                              type="date"
                              className={cn("border-zc-border", eErr ? "border-red-500/60" : "")}
                              value={c.examination_date ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.fitness_certificates];
                                  copy[idx] = { ...copy[idx], examination_date: value };
                                  return { ...p, fitness_certificates: copy };
                                });
                                setDirty(true);
                              }}
                            />
                            {eErr ? <div className="text-xs text-red-600">{eErr}</div> : null}
                          </Field>

                          <div className="flex items-center justify-between rounded-md border border-zc-border bg-transparent p-3 md:col-span-1">
                            <div>
                              <div className="text-sm font-medium text-zc-foreground">Fit for duty</div>
                              <div className="mt-1 text-xs text-zc-muted">If false, add restrictions.</div>
                            </div>
                            <Switch
                              checked={!!c.fit_for_duty}
                              onCheckedChange={(val) => {
                                setRec((p) => {
                                  const copy = [...p.fitness_certificates];
                                  copy[idx] = {
                                    ...copy[idx],
                                    fit_for_duty: !!val,
                                    restrictions: val ? [] : copy[idx].restrictions,
                                  };
                                  return { ...p, fitness_certificates: copy };
                                });
                                setDirty(true);
                              }}
                            />
                          </div>

                          <Field label="Valid from" required error={vfErr}>
                            <Input
                              type="date"
                              className={cn("border-zc-border", vfErr ? "border-red-500/60" : "")}
                              value={c.valid_from ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.fitness_certificates];
                                  copy[idx] = { ...copy[idx], valid_from: value };
                                  return { ...p, fitness_certificates: copy };
                                });
                                setDirty(true);
                              }}
                            />
                            {vfErr ? <div className="text-xs text-red-600">{vfErr}</div> : null}
                          </Field>

                          <Field label="Valid upto" error={vuErr} help="Optional">
                            <Input
                              type="date"
                              className={cn("border-zc-border", vuErr ? "border-red-500/60" : "")}
                              value={c.valid_upto ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.fitness_certificates];
                                  copy[idx] = { ...copy[idx], valid_upto: value };
                                  return { ...p, fitness_certificates: copy };
                                });
                                setDirty(true);
                              }}
                            />
                            {vuErr ? <div className="text-xs text-red-600">{vuErr}</div> : null}
                          </Field>

                          <Field label="Restrictions" error={rErr} help="Comma separated">
                            <Input
                              className={cn("border-zc-border", rErr ? "border-red-500/60" : "")}
                              value={(c.restrictions ?? []).join(", ")}
                              onChange={(e) => {
                                const value = toList(e.target.value);
                                setRec((p) => {
                                  const copy = [...p.fitness_certificates];
                                  copy[idx] = { ...copy[idx], restrictions: value };
                                  return { ...p, fitness_certificates: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="e.g., Avoid heavy lifting"
                              disabled={c.fit_for_duty}
                            />
                            {rErr ? <div className="text-xs text-red-600">{rErr}</div> : null}
                          </Field>

                          <Field label="Certificate URL / filename" help="Optional">
                            <Input
                              className="border-zc-border"
                              value={c.certificate_url ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.fitness_certificates];
                                  copy[idx] = { ...copy[idx], certificate_url: value };
                                  return { ...p, fitness_certificates: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="cert.pdf or https://..."
                            />
                          </Field>

                          <Field label="Remarks" help="Optional">
                            <Textarea
                              className="min-h-[60px] border-zc-border"
                              value={c.remarks ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.fitness_certificates];
                                  copy[idx] = { ...copy[idx], remarks: value };
                                  return { ...p, fitness_certificates: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="Optional"
                            />
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Injuries (optional) */}
          <Card className="border-zc-border">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">Occupational injuries (optional)</CardTitle>
                  <CardDescription>Track needle sticks / radiation incidents / other injuries.</CardDescription>
                </div>
                <Button
                  variant="outline"
                  className="border-zc-border"
                  onClick={() => {
                    setRec((p) => ({
                      ...p,
                      injuries: [
                        ...p.injuries,
                        {
                          id: makeId(),
                          incident_date: "",
                          incident_time: "",
                          incident_location: "",
                          injury_type: "NEEDLE_STICK",
                          injury_description: "",
                          body_part_affected: "",
                          treatment_given: "",
                          treating_physician: "",
                          days_lost_due_to_injury: 0,
                          incident_report_filed: false,
                          incident_report_number: "",
                          incident_report_url: "",
                          compensation_claimed: false,
                          compensation_amount: null,
                        },
                      ],
                    }));
                    setDirty(true);
                  }}
                >
                  + Add injury
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {rec.injuries.length === 0 ? (
                <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-sm text-zc-muted">No injuries added.</div>
              ) : (
                <div className="grid gap-3">
                  {rec.injuries.map((inj, idx) => {
                    const base = `injuries.${idx}`;
                    const locErr = errors[`${base}.incident_location`];
                    const typeErr = errors[`${base}.injury_type`];
                    const descErr = errors[`${base}.injury_description`];
                    const bodyErr = errors[`${base}.body_part_affected`];
                    const trtErr = errors[`${base}.treatment_given`];
                    const dateErr = errors[`${base}.incident_date`];

                    return (
                      <div key={inj.id} className="rounded-md border border-zc-border bg-zc-panel/40 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Badge variant="secondary" className="border border-zc-border">
                              Injury #{idx + 1}
                            </Badge>
                            <div className="mt-1 text-xs text-zc-muted">Keep minimal details; extend later with incident workflows if needed.</div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 border-zc-border px-3 text-xs"
                            onClick={() => {
                              setRec((p) => ({ ...p, injuries: p.injuries.filter((x) => x.id !== inj.id) }));
                              setDirty(true);
                            }}
                          >
                            Remove
                          </Button>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <Field label="Incident date" error={dateErr} help="YYYY-MM-DD">
                            <Input
                              type="date"
                              className={cn("border-zc-border", dateErr ? "border-red-500/60" : "")}
                              value={inj.incident_date ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.injuries];
                                  copy[idx] = { ...copy[idx], incident_date: value };
                                  return { ...p, injuries: copy };
                                });
                                setDirty(true);
                              }}
                            />
                            {dateErr ? <div className="text-xs text-red-600">{dateErr}</div> : null}
                          </Field>

                          <Field label="Incident time" help="Optional">
                            <Input
                              className="border-zc-border"
                              value={inj.incident_time ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.injuries];
                                  copy[idx] = { ...copy[idx], incident_time: value };
                                  return { ...p, injuries: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="e.g., 14:30"
                            />
                          </Field>

                          <Field label="Location" required error={locErr}>
                            <Input
                              className={cn("border-zc-border", locErr ? "border-red-500/60" : "")}
                              value={inj.incident_location ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.injuries];
                                  copy[idx] = { ...copy[idx], incident_location: value };
                                  return { ...p, injuries: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="e.g., ICU / OT / Ward"
                            />
                            {locErr ? <div className="text-xs text-red-600">{locErr}</div> : null}
                          </Field>

                          <Field label="Injury type" required error={typeErr}>
                            <Select
                              value={String(inj.injury_type ?? "")}
                              onValueChange={(val) => {
                                setRec((p) => {
                                  const copy = [...p.injuries];
                                  copy[idx] = { ...copy[idx], injury_type: val };
                                  return { ...p, injuries: copy };
                                });
                                setDirty(true);
                              }}
                            >
                              <SelectTrigger className={cn("border-zc-border", typeErr ? "border-red-500/60" : "")}>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {INJURY_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {typeErr ? <div className="text-xs text-red-600">{typeErr}</div> : null}
                          </Field>

                          <Field label="Description" required error={descErr}>
                            <Input
                              className={cn("border-zc-border", descErr ? "border-red-500/60" : "")}
                              value={inj.injury_description ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.injuries];
                                  copy[idx] = { ...copy[idx], injury_description: value };
                                  return { ...p, injuries: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="Short description"
                            />
                            {descErr ? <div className="text-xs text-red-600">{descErr}</div> : null}
                          </Field>

                          <Field label="Body part affected" required error={bodyErr}>
                            <Input
                              className={cn("border-zc-border", bodyErr ? "border-red-500/60" : "")}
                              value={inj.body_part_affected ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.injuries];
                                  copy[idx] = { ...copy[idx], body_part_affected: value };
                                  return { ...p, injuries: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="e.g., Left index finger"
                            />
                            {bodyErr ? <div className="text-xs text-red-600">{bodyErr}</div> : null}
                          </Field>

                          <Field label="Treatment given" required error={trtErr}>
                            <Input
                              className={cn("border-zc-border", trtErr ? "border-red-500/60" : "")}
                              value={inj.treatment_given ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setRec((p) => {
                                  const copy = [...p.injuries];
                                  copy[idx] = { ...copy[idx], treatment_given: value };
                                  return { ...p, injuries: copy };
                                });
                                setDirty(true);
                              }}
                              placeholder="e.g., First aid, PEP started"
                            />
                            {trtErr ? <div className="text-xs text-red-600">{trtErr}</div> : null}
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
            Next step: <span className="font-mono text-zc-foreground">/onboarding/insurance</span>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

/* ---------------- UI helpers ---------------- */

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
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-zc-border bg-transparent px-3 py-2">
      <div className="text-sm text-zc-foreground">{label}</div>
      <Switch checked={!!value} onCheckedChange={(v) => onChange(!!v)} />
    </div>
  );
}

/* ---------------- data normalization ---------------- */

function normalizeHealth(v: EmployeeHealthRecordDraft): EmployeeHealthRecordDraft {
  return {
    ...v,
    pre_employment_medical_done: !!v.pre_employment_medical_done,
    pre_employment_medical_date: cleanDate(v.pre_employment_medical_date),
    pre_employment_medical_report: cleanStr(v.pre_employment_medical_report),
    fit_for_duty: !!v.fit_for_duty,
    medical_restrictions: Array.isArray(v.medical_restrictions) ? v.medical_restrictions.map(cleanStr).filter(Boolean) as string[] : [],

    last_medical_checkup_date: cleanDate(v.last_medical_checkup_date),
    next_medical_checkup_due: cleanDate(v.next_medical_checkup_due),
    annual_checkup_frequency:
      v.annual_checkup_frequency === null || v.annual_checkup_frequency === undefined || Number.isNaN(Number(v.annual_checkup_frequency))
        ? 12
        : Number(v.annual_checkup_frequency),

    chronic_conditions: Array.isArray(v.chronic_conditions) ? v.chronic_conditions.map(cleanStr).filter(Boolean) as string[] : [],
    allergies: Array.isArray(v.allergies) ? v.allergies.map(cleanStr).filter(Boolean) as string[] : [],
    blood_group: cleanStr(v.blood_group),

    vaccinations: Array.isArray(v.vaccinations) ? v.vaccinations.map((x) => normalizeVaccinationDraft(x)) : [],
    has_blood_exposure_risk: !!v.has_blood_exposure_risk,
    has_radiation_exposure: !!v.has_radiation_exposure,
    has_chemical_exposure: !!v.has_chemical_exposure,
    has_biological_exposure: !!v.has_biological_exposure,

    injuries: Array.isArray(v.injuries) ? v.injuries.map((x) => normalizeInjuryDraft(x)) : [],
    fitness_certificates: Array.isArray(v.fitness_certificates) ? v.fitness_certificates.map((x) => normalizeCertDraft(x)) : [],

    total_medical_leave_days:
      v.total_medical_leave_days === null || v.total_medical_leave_days === undefined || String(v.total_medical_leave_days) === ""
        ? null
        : Number(v.total_medical_leave_days),

    is_active: !!v.is_active,
  };
}

function normalizeVaccinationDraft(x: any): VaccinationRecordDraft {
  const v = x && typeof x === "object" ? x : {};
  return {
    id: String(v.id || makeId()),
    vaccine_type: String(v.vaccine_type || "OTHER").toUpperCase(),
    vaccine_name: String(v.vaccine_name || "").trim(),
    manufacturer: cleanStr(v.manufacturer),
    batch_number: cleanStr(v.batch_number),

    dose_number: v.dose_number === null || v.dose_number === undefined || v.dose_number === "" ? null : Number(v.dose_number),
    total_doses: v.total_doses === null || v.total_doses === undefined || v.total_doses === "" ? null : Number(v.total_doses),

    administered_date: cleanDate(v.administered_date),
    administered_by: cleanStr(v.administered_by),
    administration_site: cleanStr(v.administration_site),

    next_dose_date: cleanDate(v.next_dose_date),
    certificate_url: cleanStr(v.certificate_url),

    adverse_reaction: !!v.adverse_reaction,
    reaction_details: cleanStr(v.reaction_details),

    is_active: v.is_active === undefined ? true : !!v.is_active,
  };
}

function normalizeInjuryDraft(x: any): OccupationalInjuryDraft {
  const v = x && typeof x === "object" ? x : {};
  return {
    id: String(v.id || makeId()),
    incident_date: cleanDate(v.incident_date),
    incident_time: cleanStr(v.incident_time),
    incident_location: String(v.incident_location || "").trim(),
    injury_type: String(v.injury_type || "OTHER").toUpperCase(),
    injury_description: String(v.injury_description || "").trim(),
    body_part_affected: String(v.body_part_affected || "").trim(),
    treatment_given: String(v.treatment_given || "").trim(),
    treating_physician: cleanStr(v.treating_physician),
    days_lost_due_to_injury:
      v.days_lost_due_to_injury === null || v.days_lost_due_to_injury === undefined || v.days_lost_due_to_injury === ""
        ? null
        : Number(v.days_lost_due_to_injury),
    incident_report_filed: !!v.incident_report_filed,
    incident_report_number: cleanStr(v.incident_report_number),
    incident_report_url: cleanStr(v.incident_report_url),
    compensation_claimed: !!v.compensation_claimed,
    compensation_amount:
      v.compensation_amount === null || v.compensation_amount === undefined || v.compensation_amount === ""
        ? null
        : Number(v.compensation_amount),
  };
}

function normalizeCertDraft(x: any): FitnessCertificateDraft {
  const v = x && typeof x === "object" ? x : {};
  return {
    id: String(v.id || makeId()),
    certificate_type: String(v.certificate_type || "PRE_EMPLOYMENT").toUpperCase(),
    examination_date: cleanDate(v.examination_date),
    examining_physician: String(v.examining_physician || "").trim(),
    fit_for_duty: v.fit_for_duty === undefined ? true : !!v.fit_for_duty,
    restrictions: Array.isArray(v.restrictions) ? v.restrictions.map(cleanStr).filter(Boolean) as string[] : [],
    remarks: cleanStr(v.remarks),
    valid_from: cleanDate(v.valid_from),
    valid_upto: cleanDate(v.valid_upto),
    certificate_url: cleanStr(v.certificate_url),
  };
}

/* ---------------- local draft storage ---------------- */

function withDraftId(href: string, draftId: string | null): string {
  if (!draftId) return href;
  const u = new URL(href, "http://local");
  u.searchParams.set("draftId", draftId);
  return u.pathname + "?" + u.searchParams.toString();
}

function primaryKey(draftId: string) {
  return `hrStaffOnboardingDraft:${draftId}`;
}
function legacyKey(draftId: string) {
  return `zc.hr.staff.onboarding.${draftId}`;
}

function readDraftAnyKey(draftId: string): StaffOnboardingDraft {
  try {
    const a = localStorage.getItem(primaryKey(draftId));
    if (a) return JSON.parse(a);
  } catch {}
  try {
    const b = localStorage.getItem(legacyKey(draftId));
    if (b) return JSON.parse(b);
  } catch {}
  return {};
}

function writeDraftBothKeys(draftId: string, draft: StaffOnboardingDraft) {
  try {
    localStorage.setItem(primaryKey(draftId), JSON.stringify(draft ?? {}));
  } catch {}
  try {
    localStorage.setItem(legacyKey(draftId), JSON.stringify(draft ?? {}));
  } catch {}
}

/* ---------------- misc helpers ---------------- */

function toList(csv: string): string[] {
  return String(csv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isISODate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());
}

function cleanDate(v: any): string | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function cleanStr(v: any): string | undefined {
  const s = String(v ?? "").trim();
  return s ? s : undefined;
}

function makeId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {}
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
