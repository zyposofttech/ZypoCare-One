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

type InsuranceType =
  | "PROFESSIONAL_INDEMNITY"
  | "MEDICAL_MALPRACTICE"
  | "HEALTH_INSURANCE"
  | "LIFE_INSURANCE"
  | "PERSONAL_ACCIDENT"
  | "GROUP_INSURANCE"
  | "OTHER";

type PremiumFrequency = "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";
type InsuranceStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "LAPSED" | "PENDING_RENEWAL";
type PremiumPaidBy = "EMPLOYER" | "EMPLOYEE" | "SHARED";

type InsuranceDraft = {
  id: string;

  insurance_type: InsuranceType;

  insurance_provider?: string;
  policy_number?: string;

  coverage_amount?: number | string; // keep string-friendly for input
  currency?: string; // INR by default
  coverage_details?: string;

  policy_start_date?: string; // YYYY-MM-DD
  policy_end_date?: string; // YYYY-MM-DD

  premium_amount?: number | string;
  premium_frequency?: PremiumFrequency;
  premium_paid_by?: PremiumPaidBy;

  policy_document_url?: string;

  claims_made?: number | string;
  last_claim_date?: string; // YYYY-MM-DD

  status?: InsuranceStatus;
  is_active?: boolean;

  renewal_reminder_days?: number[]; // [30, 7, 1]
};

type EmploymentDetailsDraft = Record<string, any> & {
  staff_category?: string;
  insurances?: InsuranceDraft[];
};

type StaffOnboardingDraft = {
  personal_details?: Record<string, any>;
  contact_details?: Record<string, any>;
  employment_details?: EmploymentDetailsDraft;
  medical_details?: Record<string, any>;
  assignments?: any[];
  system_access?: Record<string, any>;
  background_verification?: Record<string, any>;
  police_verification?: Record<string, any>;
};

type FieldErrorMap = Record<string, string>;

export default function HrStaffOnboardingInsurancePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);

  const [errors, setErrors] = React.useState<FieldErrorMap>({});
  const [policies, setPolicies] = React.useState<InsuranceDraft[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const emptyForm: InsuranceDraft = React.useMemo(
    () => ({
      id: makeId(),
      insurance_type: "PROFESSIONAL_INDEMNITY",
      insurance_provider: "",
      policy_number: "",
      coverage_amount: "",
      currency: "INR",
      coverage_details: "",
      policy_start_date: "",
      policy_end_date: "",
      premium_amount: "",
      premium_frequency: "ANNUAL",
      premium_paid_by: "EMPLOYER",
      policy_document_url: "",
      claims_made: "",
      last_claim_date: "",
      status: "ACTIVE",
      is_active: true,
      renewal_reminder_days: [30, 7, 1],
    }),
    []
  );

  const [form, setForm] = React.useState<InsuranceDraft>(emptyForm);
  const [remindersCsv, setRemindersCsv] = React.useState<string>("30, 7, 1");

  // Ensure stable draftId
  React.useEffect(() => {
    if (draftId) return;
    router.replace("/infrastructure/staff/onboarding/start" as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

// Load draft
  React.useEffect(() => {
    const id = draftId;
    if (!id) return;

    setLoading(true);
    try {
      const d = readDraft(id);
      const ed = (d.employment_details ?? {}) as EmploymentDetailsDraft;
      const list = (ed.insurances ?? []) as InsuranceDraft[];

      setPolicies(Array.isArray(list) ? list : []);

      setEditingId(null);
      const next = { ...emptyForm, id: makeId() };
      setForm(next);
      setRemindersCsv("30, 7, 1");
      setErrors({});
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, [draftId, emptyForm]);

  const staffCategory = React.useMemo(() => {
    if (!draftId) return "";
    const d = readDraft(draftId);
    return String((d.employment_details as any)?.staff_category ?? "").toUpperCase();
  }, [draftId]);

  const isClinical = React.useMemo(() => {
    return ["DOCTOR", "NURSE", "PARAMEDIC", "PHARMACIST", "TECHNICIAN"].includes(staffCategory);
  }, [staffCategory]);

  const isDoctor = staffCategory === "DOCTOR";

  function update<K extends keyof InsuranceDraft>(key: K, value: InsuranceDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[String(key)];
      return next;
    });
  }

  function validatePolicy(p: InsuranceDraft): FieldErrorMap {
    const e: FieldErrorMap = {};

    if (!p.insurance_type) e.insurance_type = "Insurance type is required.";

    const provider = String(p.insurance_provider ?? "").trim();
    const policyNo = String(p.policy_number ?? "").trim();
    const currency = String(p.currency ?? "").trim();

    const start = String(p.policy_start_date ?? "").trim();
    const end = String(p.policy_end_date ?? "").trim();

    const hasAnyCore =
      provider ||
      policyNo ||
      String(p.coverage_amount ?? "").trim() ||
      start ||
      end ||
      String(p.policy_document_url ?? "").trim();

    // For doctors: Professional indemnity is strongly expected (as per workflow),
    // but we won't hard-block unless they add a policy and leave it incomplete.
    if (hasAnyCore || editingId || p.insurance_type) {
      if (!provider) e.insurance_provider = "Provider is required.";
      if (!policyNo) e.policy_number = "Policy number is required.";
      if (!currency) e.currency = "Currency is required.";

      const cov = parseNumber(p.coverage_amount);
      if (cov === null || cov <= 0) e.coverage_amount = "Coverage amount must be a positive number.";

      if (!start) e.policy_start_date = "Start date is required.";
      if (!end) e.policy_end_date = "End date is required.";

      if (start && !isValidYmd(start)) e.policy_start_date = "Invalid date.";
      if (end && !isValidYmd(end)) e.policy_end_date = "Invalid date.";

      if (start && end && isValidYmd(start) && isValidYmd(end)) {
        if (new Date(start + "T00:00:00Z").getTime() > new Date(end + "T00:00:00Z").getTime()) {
          e.policy_end_date = "End date must be after start date.";
        }
      }

      if (p.policy_document_url && !looksLikeUrl(String(p.policy_document_url))) {
        e.policy_document_url = "Please enter a valid URL (or leave blank).";
      }
    }

    // Optional numbers
    const prem = parseNumber(p.premium_amount);
    if (String(p.premium_amount ?? "").trim() && (prem === null || prem < 0)) e.premium_amount = "Invalid premium amount.";

    const claims = parseIntSafe(p.claims_made);
    if (String(p.claims_made ?? "").trim() && (claims === null || claims < 0)) e.claims_made = "Invalid claims count.";

    if (p.last_claim_date && !isValidYmd(String(p.last_claim_date))) e.last_claim_date = "Invalid date.";

    // Reminder days parsing (we store array)
    const reminders = parseReminderDays(remindersCsv);
    if (remindersCsv.trim() && reminders.length === 0) e.renewal_reminder_days = "Enter comma-separated days like 30,7,1.";

    return e;
  }

  function startAdd(type?: InsuranceType) {
    setEditingId(null);
    const next: InsuranceDraft = {
      ...emptyForm,
      id: makeId(),
      insurance_type: type ?? "PROFESSIONAL_INDEMNITY",
    };
    setForm(next);
    setRemindersCsv(String((next.renewal_reminder_days ?? [30, 7, 1]).join(", ")));
    setErrors({});
    setDirty(false);
  }

  function startEdit(id: string) {
    const existing = policies.find((x) => x.id === id);
    if (!existing) return;

    setEditingId(id);

    const normalized: InsuranceDraft = {
      ...existing,
      insurance_provider: String(existing.insurance_provider ?? "").trim(),
      policy_number: String(existing.policy_number ?? "").trim(),
      currency: String(existing.currency ?? "INR").trim(),
      coverage_details: String(existing.coverage_details ?? "").trim(),
      policy_start_date: existing.policy_start_date ? String(existing.policy_start_date).slice(0, 10) : "",
      policy_end_date: existing.policy_end_date ? String(existing.policy_end_date).slice(0, 10) : "",
      policy_document_url: String(existing.policy_document_url ?? "").trim(),
      premium_amount: existing.premium_amount ?? "",
      claims_made: existing.claims_made ?? "",
      last_claim_date: existing.last_claim_date ? String(existing.last_claim_date).slice(0, 10) : "",
      is_active: existing.is_active !== false,
      status: (existing.status ?? "ACTIVE") as InsuranceStatus,
      renewal_reminder_days: Array.isArray(existing.renewal_reminder_days) ? existing.renewal_reminder_days : [30, 7, 1],
    };

    setForm(normalized);
    setRemindersCsv(String((normalized.renewal_reminder_days ?? [30, 7, 1]).join(", ")));
    setErrors({});
    setDirty(false);
  }

  function removePolicy(id: string) {
    setPolicies((prev) => prev.filter((x) => x.id !== id));
    setDirty(true);
    if (editingId === id) startAdd();
  }

  function upsertPolicy() {
    const candidate: InsuranceDraft = {
      ...form,
      insurance_provider: form.insurance_provider?.trim() || undefined,
      policy_number: form.policy_number?.trim() || undefined,
      currency: (form.currency?.trim() || "INR").toUpperCase(),
      coverage_details: form.coverage_details?.trim() || undefined,

      policy_start_date: form.policy_start_date?.trim() ? form.policy_start_date.trim() : undefined,
      policy_end_date: form.policy_end_date?.trim() ? form.policy_end_date.trim() : undefined,

      premium_amount: String(form.premium_amount ?? "").trim() ? parseNumber(form.premium_amount) ?? form.premium_amount : undefined,
      premium_frequency: form.premium_frequency || undefined,
      premium_paid_by: form.premium_paid_by || undefined,

      policy_document_url: form.policy_document_url?.trim() || undefined,

      coverage_amount: parseNumber(form.coverage_amount) ?? form.coverage_amount,

      claims_made: String(form.claims_made ?? "").trim() ? parseIntSafe(form.claims_made) ?? form.claims_made : undefined,
      last_claim_date: form.last_claim_date?.trim() ? form.last_claim_date.trim() : undefined,

      status: form.status ?? "ACTIVE",
      is_active: form.is_active !== false,

      renewal_reminder_days: parseReminderDays(remindersCsv),
    };

    const ve = validatePolicy(candidate);
    setErrors(ve);
    if (Object.keys(ve).length) {
      toast({
        variant: "destructive",
        title: "Fix insurance fields",
        description: "Please fix the highlighted fields before adding/updating the policy.",
      });
      return;
    }

    setPolicies((prev) => {
      const idx = prev.findIndex((x) => x.id === editingId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = candidate;
        return next;
      }
      return [...prev, candidate];
    });

    toast({ title: editingId ? "Updated" : "Added", description: "Insurance policy saved in this draft." });

    setDirty(true);
    startAdd();
  }

  function saveDraftOrThrow() {
    if (!draftId) return;

    const existing = readDraft(draftId);
    const ed = (existing.employment_details ?? {}) as EmploymentDetailsDraft;

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      employment_details: {
        ...ed,
        insurances: policies,
      },
    };

    writeDraft(draftId, nextDraft);
    setDirty(false);
    toast({ title: "Saved", description: "Insurance & indemnity saved to draft." });
  }

  function onSaveOnly() {
    try {
      saveDraftOrThrow();
    } catch {
      // handled by toast
    }
  }

  function onSaveAndNext() {
    try {
      saveDraftOrThrow();
      router.push(withDraftId("/infrastructure/staff/onboarding/financial", draftId) as any);
    } catch {
      // handled
    }
  }

  return (
    <OnboardingShell
      stepKey="insurance"
      title="Insurance & indemnity"
      description="Professional indemnity (doctors) and other staff insurance coverages (group health, PA, etc.)."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/health", draftId) as any)}
            disabled={loading}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-zc-border" onClick={onSaveOnly} disabled={loading}>
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
            <div className="text-sm font-medium text-zc-foreground">Step 13: Insurance & indemnity</div>
            <div className="mt-1 text-xs text-zc-muted">
              Add one or more insurance policies for this staff. For doctors, professional indemnity is strongly recommended.
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDoctor ? (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400" variant="secondary">
                Doctor: indemnity recommended
              </Badge>
            ) : isClinical ? (
              <Badge variant="secondary" className="border border-zc-border">
                Clinical: optional
              </Badge>
            ) : (
              <Badge variant="secondary" className="border border-zc-border">
                Non-clinical: optional
              </Badge>
            )}

            <Badge variant="secondary" className="border border-zc-border">
              Policies: {policies.length}
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

        {/* Existing policies */}
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Current policies</div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-8 border-zc-border px-3 text-xs"
                onClick={() => startAdd("PROFESSIONAL_INDEMNITY")}
                disabled={loading}
              >
                Add indemnity
              </Button>
              <Button variant="outline" className="h-8 border-zc-border px-3 text-xs" onClick={() => startAdd()} disabled={loading}>
                Add new
              </Button>
            </div>
          </div>

          {policies.length === 0 ? (
            <div className="rounded-md border border-zc-border bg-zc-panel/40 p-4 text-sm text-zc-muted">
              No insurance policies added yet.
              {isDoctor ? " Doctors should add at least one professional indemnity policy." : ""}
            </div>
          ) : (
            <div className="grid gap-3">
              {policies.map((p) => (
                <div key={p.id} className="rounded-md border border-zc-border bg-zc-panel/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="border border-zc-border">
                          {labelInsuranceType(p.insurance_type)}
                        </Badge>
                        <Badge variant="secondary" className="border border-zc-border">
                          {String(p.status ?? "ACTIVE")}
                        </Badge>
                        {p.is_active === false ? (
                          <Badge variant="secondary" className="border border-zc-border text-zc-muted">
                            Inactive
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-2 text-sm font-medium text-zc-foreground">
                        {String(p.insurance_provider ?? "").trim() || "(Provider)"}{" "}
                        {p.policy_number ? <span className="text-zc-muted">• {p.policy_number}</span> : null}
                      </div>

                      <div className="mt-1 text-xs text-zc-muted">
                        Coverage:{" "}
                        <span className="font-mono">
                          {String(p.currency ?? "INR")} {fmtNumber(p.coverage_amount)}
                        </span>
                        {p.policy_end_date ? ` • Valid until: ${String(p.policy_end_date).slice(0, 10)}` : ""}
                      </div>

                      {p.policy_document_url ? (
                        <div className="mt-2 text-xs text-zc-muted">
                          Document: <span className="font-mono">{p.policy_document_url}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="h-8 border-zc-border px-3 text-xs" onClick={() => startEdit(p.id)}>
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 border-zc-border px-3 text-xs text-red-600 hover:text-red-600"
                        onClick={() => removePolicy(p.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="bg-zc-border" />

        {/* Add/Edit form */}
        <div className={cn("rounded-md border border-zc-border bg-zc-panel/40 p-4", loading ? "opacity-60" : "opacity-100")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
              {editingId ? "Edit policy" : "Add policy"}
            </div>
            {editingId ? (
              <Button variant="outline" className="h-8 border-zc-border px-3 text-xs" onClick={() => startAdd()}>
                Cancel edit
              </Button>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Insurance type" required error={errors.insurance_type}>
                <Select value={String(form.insurance_type)} onValueChange={(v) => update("insurance_type", v as InsuranceType)}>
                  <SelectTrigger className={cn("border-zc-border", errors.insurance_type ? "border-red-500" : "")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROFESSIONAL_INDEMNITY">Professional Indemnity</SelectItem>
                    <SelectItem value="MEDICAL_MALPRACTICE">Medical Malpractice</SelectItem>
                    <SelectItem value="HEALTH_INSURANCE">Health Insurance</SelectItem>
                    <SelectItem value="GROUP_INSURANCE">Group Insurance</SelectItem>
                    <SelectItem value="PERSONAL_ACCIDENT">Personal Accident</SelectItem>
                    <SelectItem value="LIFE_INSURANCE">Life Insurance</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Insurance provider" required error={errors.insurance_provider}>
                <Input
                  className={cn("border-zc-border", errors.insurance_provider ? "border-red-500" : "")}
                  value={String(form.insurance_provider ?? "")}
                  onChange={(e) => update("insurance_provider", e.target.value)}
                  placeholder="e.g., XYZ Insurance Co."
                />
              </Field>

              <Field label="Policy number" required error={errors.policy_number}>
                <Input
                  className={cn("border-zc-border", errors.policy_number ? "border-red-500" : "")}
                  value={String(form.policy_number ?? "")}
                  onChange={(e) => update("policy_number", e.target.value)}
                  placeholder="e.g., IND-2025-123456"
                />
              </Field>

              <Field label="Status" required>
                <Select value={String(form.status ?? "ACTIVE")} onValueChange={(v) => update("status", v as InsuranceStatus)}>
                  <SelectTrigger className="border-zc-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING_RENEWAL">Pending renewal</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="LAPSED">Lapsed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Coverage amount" required error={errors.coverage_amount}>
                <Input
                  inputMode="decimal"
                  className={cn("border-zc-border", errors.coverage_amount ? "border-red-500" : "")}
                  value={String(form.coverage_amount ?? "")}
                  onChange={(e) => update("coverage_amount", e.target.value)}
                  placeholder="e.g., 10000000"
                />
              </Field>

              <Field label="Currency" required error={errors.currency} help="INR/USD/etc.">
                <Input
                  className={cn("border-zc-border", errors.currency ? "border-red-500" : "")}
                  value={String(form.currency ?? "INR")}
                  onChange={(e) => update("currency", e.target.value)}
                  placeholder="INR"
                />
              </Field>

              <Field label="Valid from" required error={errors.policy_start_date}>
                <Input
                  type="date"
                  className={cn("border-zc-border", errors.policy_start_date ? "border-red-500" : "")}
                  value={String(form.policy_start_date ?? "")}
                  onChange={(e) => update("policy_start_date", e.target.value)}
                />
              </Field>

              <Field label="Valid until" required error={errors.policy_end_date}>
                <Input
                  type="date"
                  className={cn("border-zc-border", errors.policy_end_date ? "border-red-500" : "")}
                  value={String(form.policy_end_date ?? "")}
                  onChange={(e) => update("policy_end_date", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Coverage details" help="Optional notes / inclusions / exclusions">
              <Textarea
                className="min-h-[84px] border-zc-border"
                value={String(form.coverage_details ?? "")}
                onChange={(e) => update("coverage_details", e.target.value)}
                placeholder="Optional"
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Premium amount" error={errors.premium_amount}>
                <Input
                  inputMode="decimal"
                  className={cn("border-zc-border", errors.premium_amount ? "border-red-500" : "")}
                  value={String(form.premium_amount ?? "")}
                  onChange={(e) => update("premium_amount", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Premium frequency">
                <Select
                  value={String(form.premium_frequency ?? "ANNUAL")}
                  onValueChange={(v) => update("premium_frequency", v as PremiumFrequency)}
                >
                  <SelectTrigger className="border-zc-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="SEMI_ANNUAL">Semi-annual</SelectItem>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Premium paid by">
                <Select value={String(form.premium_paid_by ?? "EMPLOYER")} onValueChange={(v) => update("premium_paid_by", v as PremiumPaidBy)}>
                  <SelectTrigger className="border-zc-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYER">Employer (Hospital)</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="SHARED">Shared</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Active flag">
                <div className="flex items-center gap-2 rounded-md border border-zc-border bg-zc-panel/30 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={form.is_active !== false}
                    onChange={(e) => update("is_active", e.target.checked)}
                  />
                  <span className="text-sm text-zc-foreground">Is active</span>
                </div>
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Policy document URL" error={errors.policy_document_url}>
                <Input
                  className={cn("border-zc-border", errors.policy_document_url ? "border-red-500" : "")}
                  value={String(form.policy_document_url ?? "")}
                  onChange={(e) => update("policy_document_url", e.target.value)}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Claims made" error={errors.claims_made}>
                <Input
                  inputMode="numeric"
                  className={cn("border-zc-border", errors.claims_made ? "border-red-500" : "")}
                  value={String(form.claims_made ?? "")}
                  onChange={(e) => update("claims_made", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Last claim date" error={errors.last_claim_date}>
                <Input
                  type="date"
                  className={cn("border-zc-border", errors.last_claim_date ? "border-red-500" : "")}
                  value={String(form.last_claim_date ?? "")}
                  onChange={(e) => update("last_claim_date", e.target.value)}
                />
              </Field>

              <Field label="Renewal reminder days" error={errors.renewal_reminder_days} help="Comma-separated e.g., 30,7,1">
                <Input
                  className={cn("border-zc-border", errors.renewal_reminder_days ? "border-red-500" : "")}
                  value={remindersCsv}
                  onChange={(e) => {
                    setRemindersCsv(e.target.value);
                    setDirty(true);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.renewal_reminder_days;
                      return next;
                    });
                  }}
                  placeholder="30, 7, 1"
                />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" className="border-zc-border" onClick={() => startAdd()} disabled={loading}>
                Reset
              </Button>
              <Button className="bg-zc-accent text-white hover:bg-zc-accent/90" onClick={upsertPolicy} disabled={loading}>
                {editingId ? "Update policy" : "Add policy"}
              </Button>
            </div>

            <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
              <div className="font-medium text-zc-foreground">Contract notes</div>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  Saved into draft as <span className="font-mono">employment_details.insurances[]</span> (snake_case).
                </li>
                <li>
                  This maps cleanly to <span className="font-mono">StaffInsurance</span> records on the backend after staff creation.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

/* ---------------------------- UI Helpers ---------------------------- */

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

function labelInsuranceType(t: InsuranceType) {
  switch (t) {
    case "PROFESSIONAL_INDEMNITY":
      return "Professional Indemnity";
    case "MEDICAL_MALPRACTICE":
      return "Medical Malpractice";
    case "HEALTH_INSURANCE":
      return "Health Insurance";
    case "GROUP_INSURANCE":
      return "Group Insurance";
    case "PERSONAL_ACCIDENT":
      return "Personal Accident";
    case "LIFE_INSURANCE":
      return "Life Insurance";
    case "OTHER":
    default:
      return "Other";
  }
}

function fmtNumber(v: any): string {
  const n = parseNumber(v);
  if (n === null) return "—";
  try {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
  } catch {
    return String(n);
  }
}

function parseNumber(v: any): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseIntSafe(v: any): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function parseReminderDays(csv: string): number[] {
  const s = String(csv ?? "").trim();
  if (!s) return [];
  const out = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => parseInt(x, 10))
    .filter((n) => Number.isFinite(n) && n >= 0);

  // de-dupe preserving order
  const seen = new Set<number>();
  const uniq: number[] = [];
  for (const n of out) {
    if (!seen.has(n)) {
      seen.add(n);
      uniq.push(n);
    }
  }
  return uniq;
}

function looksLikeUrl(v: string): boolean {
  const s = String(v || "").trim();
  if (!s) return true;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
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

function makeId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {}
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function withDraftId(href: string, draftId: string | null): string {
  if (!draftId) return href;
  const u = new URL(href, "http://local");
  u.searchParams.set("draftId", draftId);
  return u.pathname + "?" + u.searchParams.toString();
}

/* ------------------------- Draft Storage ------------------------- */

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
