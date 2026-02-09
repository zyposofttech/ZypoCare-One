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

type CredentialType =
  | "MEDICAL_REGISTRATION"
  | "NURSING_REGISTRATION"
  | "PHARMACY_REGISTRATION"
  | "PARAMEDICAL_REGISTRATION"
  | "EDUCATION"
  | "TRAINING"
  | "EXPERIENCE"
  | "GOVT_ID"
  | "IMMUNIZATION"
  | "OTHER";

type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED" | "RENEWAL_DUE";

type CredentialDraft = {
  id: string;

  credential_type: CredentialType;
  title?: string; // e.g., "MBBS", "B.Sc Nursing", "Aadhar"
  issuing_authority?: string; // e.g., "MCI / State Medical Council"
  credential_number?: string; // registration / ID number

  issued_on?: string; // YYYY-MM-DD
  valid_from?: string; // YYYY-MM-DD
  valid_to?: string; // YYYY-MM-DD

  verification_status?: VerificationStatus;
  verification_notes?: string;

  evidence_urls?: string[]; // URLs or storage keys
};

type StaffOnboardingDraft = {
  personal_details?: Record<string, any>;
  contact_details?: Record<string, any>;
  employment_details?: Record<string, any>;
  medical_details?: {
    credentials?: CredentialDraft[];
  };
  system_access?: Record<string, any>;
};

type FieldErrorMap = Record<string, string>;

export default function HrStaffOnboardingCredentialsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);

  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [credentials, setCredentials] = React.useState<CredentialDraft[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const emptyForm: CredentialDraft = React.useMemo(
    () => ({
      id: makeId(),
      credential_type: "MEDICAL_REGISTRATION",
      title: "",
      issuing_authority: "",
      credential_number: "",
      issued_on: "",
      valid_from: "",
      valid_to: "",
      verification_status: "PENDING",
      verification_notes: "",
      evidence_urls: [],
    }),
    []
  );

  const [form, setForm] = React.useState<CredentialDraft>(emptyForm);
  const [evidenceCsv, setEvidenceCsv] = React.useState<string>("");

  // Ensure stable draftId
  React.useEffect(() => {
    if (draftId) return;
    router.replace("/infrastructure/staff/onboarding/start" as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

// Load draft from localStorage
  React.useEffect(() => {
    const id = draftId;
    if (!id) return;

    setLoading(true);
    try {
      const draft = readDraft(id);
      const list = (draft.medical_details?.credentials ?? []) as CredentialDraft[];
      setCredentials(Array.isArray(list) ? list : []);

      // reset editor
      setEditingId(null);
      const next = { ...emptyForm, id: makeId() };
      setForm(next);
      setEvidenceCsv("");
      setErrors({});
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, [draftId, emptyForm]);

  const isClinical = React.useMemo(() => {
    if (!draftId) return false;
    const d = readDraft(draftId);
    const sc = String((d.employment_details as any)?.staff_category ?? "").toUpperCase();
    return ["DOCTOR", "NURSE", "PARAMEDIC", "PHARMACIST", "TECHNICIAN"].includes(sc);
  }, [draftId]);

  function update<K extends keyof CredentialDraft>(key: K, value: CredentialDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      const next = { ...e };
      delete next[String(key)];
      return next;
    });
  }

  function validateCredential(c: CredentialDraft): FieldErrorMap {
    const e: FieldErrorMap = {};

    if (!c.credential_type) e.credential_type = "Credential type is required.";

    // Minimal required fields for clean downstream API:
    // - type
    // - number (strongly recommended for registrations/IDs)
    // - issuing authority (recommended)
    const needsNumber =
      c.credential_type === "MEDICAL_REGISTRATION" ||
      c.credential_type === "NURSING_REGISTRATION" ||
      c.credential_type === "PHARMACY_REGISTRATION" ||
      c.credential_type === "PARAMEDICAL_REGISTRATION" ||
      c.credential_type === "GOVT_ID";

    if (needsNumber && !String(c.credential_number ?? "").trim()) {
      e.credential_number = "Credential/Registration number is required for this type.";
    }

    if (c.issued_on && !isValidYmd(c.issued_on)) e.issued_on = "Invalid date.";
    if (c.valid_from && !isValidYmd(c.valid_from)) e.valid_from = "Invalid date.";
    if (c.valid_to && !isValidYmd(c.valid_to)) e.valid_to = "Invalid date.";

    if (c.valid_from && c.valid_to && isValidYmd(c.valid_from) && isValidYmd(c.valid_to)) {
      if (new Date(c.valid_from + "T00:00:00Z").getTime() > new Date(c.valid_to + "T00:00:00Z").getTime()) {
        e.valid_to = "Valid To must be after Valid From.";
      }
    }

    return e;
  }

  function startAdd() {
    setEditingId(null);
    const next = { ...emptyForm, id: makeId() };
    setForm(next);
    setEvidenceCsv("");
    setErrors({});
  }

  function startEdit(id: string) {
    const existing = credentials.find((x) => x.id === id);
    if (!existing) return;
    setEditingId(id);

    const normalized: CredentialDraft = {
      ...existing,
      issued_on: existing.issued_on ? String(existing.issued_on).slice(0, 10) : "",
      valid_from: existing.valid_from ? String(existing.valid_from).slice(0, 10) : "",
      valid_to: existing.valid_to ? String(existing.valid_to).slice(0, 10) : "",
      evidence_urls: Array.isArray(existing.evidence_urls) ? existing.evidence_urls : [],
    };

    setForm(normalized);
    setEvidenceCsv((normalized.evidence_urls ?? []).join(", "));
    setErrors({});
    setDirty(false);
  }

  function removeCredential(id: string) {
    setCredentials((prev) => prev.filter((x) => x.id !== id));
    setDirty(true);
    if (editingId === id) startAdd();
  }

  function upsertCredential() {
    const parsedEvidence = evidenceCsv
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const candidate: CredentialDraft = {
      ...form,
      title: form.title?.trim() || undefined,
      issuing_authority: form.issuing_authority?.trim() || undefined,
      credential_number: form.credential_number?.trim() || undefined,

      issued_on: form.issued_on?.trim() ? form.issued_on.trim() : undefined,
      valid_from: form.valid_from?.trim() ? form.valid_from.trim() : undefined,
      valid_to: form.valid_to?.trim() ? form.valid_to.trim() : undefined,

      verification_status: form.verification_status ?? "PENDING",
      verification_notes: form.verification_notes?.trim() || undefined,
      evidence_urls: parsedEvidence.length ? parsedEvidence : [],
    };

    const ve = validateCredential(candidate);
    setErrors(ve);
    if (Object.keys(ve).length) {
      toast({
        variant: "destructive",
        title: "Fix credential fields",
        description: "Please fix the highlighted fields before adding/updating the credential.",
      });
      return;
    }

    setCredentials((prev) => {
      const idx = prev.findIndex((x) => x.id === (editingId ?? candidate.id));
      if (idx >= 0) {
        const copy = prev.slice();
        copy[idx] = { ...candidate, id: prev[idx].id };
        return copy;
      }
      return [...prev, candidate];
    });

    toast({ title: editingId ? "Updated" : "Added", description: "Credential saved in this draft step." });

    // reset editor
    setEditingId(null);
    const next = { ...emptyForm, id: makeId() };
    setForm(next);
    setEvidenceCsv("");
    setErrors({});
    setDirty(true);
  }

  function validateStepOrThrow() {
    // If clinical, must have at least one credential before proceeding.
    if (isClinical && credentials.length === 0) {
      toast({
        variant: "destructive",
        title: "Credentials required",
        description: "Clinical staff must have at least one credential (registration/license) before proceeding.",
      });
      throw new Error("credentials_required");
    }
  }

  function saveDraftOrThrow() {
    const id = draftId;
    if (!id) return;

    validateStepOrThrow();

    const existing = readDraft(id);

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      medical_details: {
        ...(existing.medical_details ?? {}),
        credentials: credentials,
      },
    };

    writeDraft(id, nextDraft);
    setDirty(false);

    toast({ title: "Saved", description: "Credentials saved to draft." });
  }

  function onSaveOnly() {
    try {
      saveDraftOrThrow();
    } catch {
      // handled via toast
    }
  }

  function onSaveAndNext() {
    try {
      saveDraftOrThrow();
      router.push(withDraftId("/infrastructure/staff/onboarding/assignments", draftId) as any);
    } catch {
      // handled via toast
    }
  }

  return (
    <OnboardingShell
      stepKey="credentials"
      title="Credentials"
      description="Add licenses, registrations, certificates, ID proofs and evidence links for verification."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/employment", draftId) as any)}
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
            <div className="text-sm font-medium text-zc-foreground">Step 5: Credentials</div>
            <div className="mt-1 text-xs text-zc-muted">
              Clinical staff must add at least one credential. Evidence links are optional placeholders (upload wiring can be added later).
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isClinical ? (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400" variant="secondary">
                Clinical: credentials required
              </Badge>
            ) : (
              <Badge variant="secondary" className="border border-zc-border">
                Non-clinical: optional
              </Badge>
            )}

            <Badge variant="secondary" className="border border-zc-border">
              Count: {credentials.length}
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

        {/* Existing credentials */}
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Current credentials</div>
            <Button variant="outline" className="h-8 border-zc-border px-3 text-xs" onClick={startAdd} disabled={loading}>
              Add new
            </Button>
          </div>

          {credentials.length === 0 ? (
            <div className="rounded-md border border-zc-border bg-zc-panel/40 p-4 text-sm text-zc-muted">
              No credentials added yet.
              {isClinical ? " Clinical staff must add at least one registration/license." : ""}
            </div>
          ) : (
            <div className="grid gap-3">
              {credentials.map((c) => (
                <div key={c.id} className="rounded-md border border-zc-border bg-zc-panel/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="border border-zc-border">
                          {labelCredentialType(c.credential_type)}
                        </Badge>
                        <Badge variant="secondary" className="border border-zc-border">
                          {String(c.verification_status ?? "PENDING")}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm font-medium text-zc-foreground">
                        {c.title?.trim() || "(Untitled)"}{" "}
                        {c.credential_number ? <span className="text-zc-muted">• {c.credential_number}</span> : null}
                      </div>
                      <div className="mt-1 text-xs text-zc-muted">
                        {c.issuing_authority ? `Issued by: ${c.issuing_authority}` : "Issuing authority: —"}{" "}
                        {c.valid_to ? `• Valid to: ${String(c.valid_to).slice(0, 10)}` : ""}
                      </div>
                      {Array.isArray(c.evidence_urls) && c.evidence_urls.length ? (
                        <div className="mt-2 text-xs text-zc-muted">
                          Evidence: <span className="font-mono">{c.evidence_urls.join(", ")}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-8 border-zc-border px-3 text-xs"
                        onClick={() => startEdit(c.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 border-zc-border px-3 text-xs text-red-600 hover:text-red-600"
                        onClick={() => removeCredential(c.id)}
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
              {editingId ? "Edit credential" : "Add credential"}
            </div>
            {editingId ? (
              <Button variant="outline" className="h-8 border-zc-border px-3 text-xs" onClick={startAdd}>
                Cancel edit
              </Button>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Credential type" required error={errors.credential_type}>
                <Select
                  value={String(form.credential_type)}
                  onValueChange={(v) => update("credential_type", v as CredentialType)}
                >
                  <SelectTrigger className={cn("border-zc-border", errors.credential_type ? "border-red-500" : "")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEDICAL_REGISTRATION">Medical Registration</SelectItem>
                    <SelectItem value="NURSING_REGISTRATION">Nursing Registration</SelectItem>
                    <SelectItem value="PHARMACY_REGISTRATION">Pharmacy Registration</SelectItem>
                    <SelectItem value="PARAMEDICAL_REGISTRATION">Paramedical Registration</SelectItem>
                    <SelectItem value="EDUCATION">Education</SelectItem>
                    <SelectItem value="TRAINING">Training</SelectItem>
                    <SelectItem value="EXPERIENCE">Experience</SelectItem>
                    <SelectItem value="GOVT_ID">Government ID</SelectItem>
                    <SelectItem value="IMMUNIZATION">Immunization</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Title / Name" help="e.g., MBBS, B.Sc Nursing, Aadhar" error={errors.title}>
                <Input
                  className={cn("border-zc-border", errors.title ? "border-red-500" : "")}
                  value={String(form.title ?? "")}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Issuing authority" help="e.g., State Medical Council" error={errors.issuing_authority}>
                <Input
                  className={cn("border-zc-border", errors.issuing_authority ? "border-red-500" : "")}
                  value={String(form.issuing_authority ?? "")}
                  onChange={(e) => update("issuing_authority", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Credential / Reg. number" required={needsNumber(form.credential_type)} error={errors.credential_number}>
                <Input
                  className={cn("border-zc-border", errors.credential_number ? "border-red-500" : "")}
                  value={String(form.credential_number ?? "")}
                  onChange={(e) => update("credential_number", e.target.value)}
                  placeholder={needsNumber(form.credential_type) ? "Required" : "Optional"}
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Issued on" error={errors.issued_on}>
                <Input
                  type="date"
                  className={cn("border-zc-border", errors.issued_on ? "border-red-500" : "")}
                  value={String(form.issued_on ?? "")}
                  onChange={(e) => update("issued_on", e.target.value)}
                />
              </Field>

              <Field label="Valid from" error={errors.valid_from}>
                <Input
                  type="date"
                  className={cn("border-zc-border", errors.valid_from ? "border-red-500" : "")}
                  value={String(form.valid_from ?? "")}
                  onChange={(e) => update("valid_from", e.target.value)}
                />
              </Field>

              <Field label="Valid to" error={errors.valid_to}>
                <Input
                  type="date"
                  className={cn("border-zc-border", errors.valid_to ? "border-red-500" : "")}
                  value={String(form.valid_to ?? "")}
                  onChange={(e) => update("valid_to", e.target.value)}
                />
              </Field>

              <Field label="Verification status" help="Workflow will update later" error={errors.verification_status}>
                <Select
                  value={String(form.verification_status ?? "PENDING")}
                  onValueChange={(v) => update("verification_status", v as VerificationStatus)}
                >
                  <SelectTrigger className="border-zc-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="VERIFIED">Verified</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="RENEWAL_DUE">Renewal Due</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Evidence links" help="Comma-separated URLs/keys" error={errors.evidence_urls}>
                <Input
                  className="border-zc-border"
                  value={evidenceCsv}
                  onChange={(e) => {
                    setEvidenceCsv(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="https://... , s3://... , file-key-123"
                />
              </Field>

              <Field label="Verification notes" help="Optional reviewer notes" error={errors.verification_notes}>
                <Textarea
                  className="border-zc-border"
                  value={String(form.verification_notes ?? "")}
                  onChange={(e) => update("verification_notes", e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" className="border-zc-border" onClick={upsertCredential} disabled={loading}>
                {editingId ? "Update credential" : "Add credential"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
          <div className="font-medium text-zc-foreground">Next step</div>
          <div className="mt-1">
            Assignments: <span className="font-mono">/onboarding/assignments</span>
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

function labelCredentialType(t: CredentialType) {
  switch (t) {
    case "MEDICAL_REGISTRATION":
      return "Medical Registration";
    case "NURSING_REGISTRATION":
      return "Nursing Registration";
    case "PHARMACY_REGISTRATION":
      return "Pharmacy Registration";
    case "PARAMEDICAL_REGISTRATION":
      return "Paramedical Registration";
    case "EDUCATION":
      return "Education";
    case "TRAINING":
      return "Training";
    case "EXPERIENCE":
      return "Experience";
    case "GOVT_ID":
      return "Government ID";
    case "IMMUNIZATION":
      return "Immunization";
    case "OTHER":
      return "Other";
    default:
      return String(t);
  }
}

function needsNumber(t: CredentialType) {
  return (
    t === "MEDICAL_REGISTRATION" ||
    t === "NURSING_REGISTRATION" ||
    t === "PHARMACY_REGISTRATION" ||
    t === "PARAMEDICAL_REGISTRATION" ||
    t === "GOVT_ID"
  );
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
