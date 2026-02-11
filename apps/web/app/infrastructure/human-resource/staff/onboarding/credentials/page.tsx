"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";
import { EvidenceUpload } from "../_components/EvidenceUpload";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/cn";

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
  title?: string;
  issuing_authority?: string;
  credential_number?: string;

  issued_on?: string; // YYYY-MM-DD
  valid_from?: string; // YYYY-MM-DD
  valid_to?: string; // YYYY-MM-DD

  verification_status?: VerificationStatus;
  verification_notes?: string;

  evidence_urls?: string[]; // generated automatically via upload
};

type StaffOnboardingDraft = {
  personal_details?: Record<string, any>;
  contact_details?: Record<string, any>;
  employment_details?: Record<string, any>;
  medical_details?: { credentials?: CredentialDraft[] };
  system_access?: Record<string, any>;
  assignments?: any[];
};

type FieldErrorMap = Record<string, string>;

const STORAGE_PREFIX = "hrStaffOnboardingDraft:";
const storageKey = (draftId: string) => `${STORAGE_PREFIX}${draftId}`;

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function readDraft(draftId: string): StaffOnboardingDraft {
  if (typeof window === "undefined") return {};
  return safeParse<StaffOnboardingDraft>(localStorage.getItem(storageKey(draftId))) ?? {};
}

function writeDraft(draftId: string, patch: Partial<StaffOnboardingDraft>) {
  const prev = readDraft(draftId);
  const next: StaffOnboardingDraft = {
    ...prev,
    ...patch,
    medical_details: { ...(prev.medical_details ?? {}), ...(patch.medical_details ?? {}) },
  };
  localStorage.setItem(storageKey(draftId), JSON.stringify(next));
}

function makeId(): string {
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isValidYmd(v?: string) {
  if (!v) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
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
    default:
      return "Other";
  }
}

const CREDENTIAL_TONE: Record<string, string> = {
  MEDICAL_REGISTRATION: "border-emerald-200/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  NURSING_REGISTRATION: "border-sky-200/70 bg-sky-50/70 text-sky-800 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200",
  PHARMACY_REGISTRATION: "border-violet-200/70 bg-violet-50/70 text-violet-800 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200",
  PARAMEDICAL_REGISTRATION: "border-cyan-200/70 bg-cyan-50/70 text-cyan-800 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-200",
  EDUCATION: "border-indigo-200/70 bg-indigo-50/70 text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200",
  TRAINING: "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
  EXPERIENCE: "border-lime-200/70 bg-lime-50/70 text-lime-800 dark:border-lime-900/40 dark:bg-lime-900/20 dark:text-lime-200",
  GOVT_ID: "border-fuchsia-200/70 bg-fuchsia-50/70 text-fuchsia-800 dark:border-fuchsia-900/40 dark:bg-fuchsia-900/20 dark:text-fuchsia-200",
  IMMUNIZATION: "border-rose-200/70 bg-rose-50/70 text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200",
  OTHER: "border-zc-border bg-zc-panel/30 text-zc-muted",
};

function credentialBadgeClass(t?: CredentialType) {
  return CREDENTIAL_TONE[String(t ?? "")] ?? "border-zc-border bg-zc-panel/30 text-zc-muted";
}

function statusBadgeClass(status?: VerificationStatus) {
  switch (status) {
    case "VERIFIED":
      return "border-emerald-200/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200";
    case "REJECTED":
      return "border-rose-200/70 bg-rose-50/70 text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200";
    case "EXPIRED":
      return "border-slate-200/70 bg-slate-50/70 text-slate-800 dark:border-slate-900/40 dark:bg-slate-900/20 dark:text-slate-200";
    case "RENEWAL_DUE":
      return "border-violet-200/70 bg-violet-50/70 text-violet-800 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200";
    default:
      return "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
  }
}

/**
 * ✅ Critical: draftId can change via history.replaceState inside OnboardingShell (migration).
 * useSearchParams often doesn't re-render on replaceState.
 * This hook reads the URL directly and reacts to changes.
 */
function useLiveDraftId() {
  const sp = useSearchParams();
  const spDraftId = sp.get("draftId");
  const [draftId, setDraftId] = React.useState<string | null>(spDraftId);

  React.useEffect(() => {
    const readFromUrl = () => {
      try {
        const v = new URLSearchParams(window.location.search).get("draftId");
        setDraftId(v);
      } catch {
        // ignore
      }
    };

    // Patch history once to emit an event on replace/push
    const w = window as any;
    if (!w.__zypo_history_patched) {
      w.__zypo_history_patched = true;

      const origReplace = history.replaceState.bind(history);
      history.replaceState = (...args: Parameters<History["replaceState"]>) => {
        origReplace(...args);
        window.dispatchEvent(new Event("zypo:urlchange"));
      };

      const origPush = history.pushState.bind(history);
      history.pushState = (...args: Parameters<History["pushState"]>) => {
        origPush(...args);
        window.dispatchEvent(new Event("zypo:urlchange"));
      };
    }

    readFromUrl();

    const onChange = () => readFromUrl();
    window.addEventListener("zypo:urlchange", onChange);
    window.addEventListener("popstate", onChange);

    // Also poll briefly (covers the initial “draftId injected” case)
    const t = window.setInterval(readFromUrl, 250);
    const stop = window.setTimeout(() => window.clearInterval(t), 4000);

    return () => {
      window.removeEventListener("zypo:urlchange", onChange);
      window.removeEventListener("popstate", onChange);
      window.clearInterval(t);
      window.clearTimeout(stop);
    };
  }, []);

  React.useEffect(() => {
    if (spDraftId && spDraftId !== draftId) setDraftId(spDraftId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spDraftId]);

  return draftId;
}

export default function HrStaffOnboardingCredentialsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const draftId = useLiveDraftId(); // ✅ live draftId (handles migration)

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [credentials, setCredentials] = React.useState<CredentialDraft[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const emptyForm = React.useMemo<CredentialDraft>(
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
    [],
  );

  const [form, setForm] = React.useState<CredentialDraft>({ ...emptyForm, id: makeId() });

  // Load from local draft when draftId becomes available / changes
  React.useEffect(() => {
    if (!draftId) return;

    setLoading(true);
    try {
      const d = readDraft(draftId);
      const list = d.medical_details?.credentials ?? [];
      setCredentials(Array.isArray(list) ? list : []);
      setEditingId(null);
      setForm({ ...emptyForm, id: makeId(), evidence_urls: [] });
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
    setForm((p) => ({ ...p, [key]: value }));
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

    if (needsNumber(c.credential_type) && !String(c.credential_number ?? "").trim()) {
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

  // ✅ FIXED: Add new always resets + remounts the form
  function startAdd() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      id: makeId(),
      evidence_urls: [],
    });
    setErrors({});
    setDirty(true);

    requestAnimationFrame(() => {
      document.getElementById("credential-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function startEdit(id: string) {
    const existing = credentials.find((x) => x.id === id);
    if (!existing) return;

    setEditingId(id);
    setForm({
      ...existing,
      issued_on: existing.issued_on ? String(existing.issued_on).slice(0, 10) : "",
      valid_from: existing.valid_from ? String(existing.valid_from).slice(0, 10) : "",
      valid_to: existing.valid_to ? String(existing.valid_to).slice(0, 10) : "",
      evidence_urls: Array.isArray(existing.evidence_urls) ? existing.evidence_urls : [],
      id: existing.id,
    });
    setErrors({});
    setDirty(false);

    requestAnimationFrame(() => {
      document.getElementById("credential-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function removeCredential(id: string) {
    setCredentials((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) startAdd();
    setDirty(true);
  }

  function upsertCredential() {
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
      evidence_urls: Array.isArray(form.evidence_urls) ? form.evidence_urls : [],
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
      const targetId = editingId ?? candidate.id;
      const idx = prev.findIndex((x) => x.id === targetId);
      if (idx >= 0) {
        const copy = prev.slice();
        copy[idx] = { ...candidate, id: prev[idx].id };
        return copy;
      }
      return [...prev, { ...candidate, id: candidate.id || makeId() }];
    });

    toast({ title: editingId ? "Updated" : "Added", description: "Credential saved in this step (not yet in draft)." });

    setEditingId(null);
    setForm({ ...emptyForm, id: makeId(), evidence_urls: [] });
    setErrors({});
    setDirty(true);
  }

  function validateStepOrThrow() {
    if (isClinical && credentials.length === 0) {
      toast({
        variant: "destructive",
        title: "Credentials required",
        description: "Clinical staff must have at least one credential (registration/license) before proceeding.",
      });
      throw new Error("credentials_required");
    }
  }

  /**
   * ✅ This is the missing piece:
   * It persists this page's state into localStorage so OnboardingShell's "Save draft" includes it.
   */
  async function persistStepToLocalDraft() {
    const id = draftId || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("draftId") : null);
    if (!id) return;

    validateStepOrThrow();

    writeDraft(id, {
      medical_details: {
        credentials,
      },
    });

    setDirty(false);
  }

  // Footer buttons (optional) still work and now also persist properly
  async function onSaveOnly() {
    try {
      await persistStepToLocalDraft();
      toast({ title: "Saved", description: "Credentials saved to draft." });
    } catch {}
  }

  async function onSaveAndNext() {
    try {
      await persistStepToLocalDraft();
      const id = draftId || new URLSearchParams(window.location.search).get("draftId") || "";
      router.push(`${BASE}/assignments?draftId=${encodeURIComponent(id)}` as any);
    } catch {}
  }

  const BASE = "/infrastructure/human-resource/staff/onboarding";

  return (
    <OnboardingShell
      stepKey="credentials"
      title="Credentials"
      description="Add registrations, certificates, ID proofs and upload evidence files."
      onSaveDraft={persistStepToLocalDraft} // ✅ FIX: header Save Draft now persists credentials
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            className="border-zc-border"
            onClick={() => {
              const id = draftId || new URLSearchParams(window.location.search).get("draftId") || "";
              router.push(`${BASE}/employment?draftId=${encodeURIComponent(id)}` as any);
            }}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="border-zc-border" onClick={onSaveOnly} disabled={loading}>
              Save
            </Button>
            <Button
              type="button"
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
            <div className="text-sm font-medium text-zc-foreground">Credentials</div>
            <div className="mt-1 text-xs text-zc-muted">
              {isClinical ? "Clinical staff must have at least one credential." : "Optional for non-clinical staff."}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="border border-sky-200/70 bg-sky-50/70 text-sky-800 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200"
            >
              Count: {credentials.length}
            </Badge>
            {dirty ? (
              <Badge
                className="border border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200"
                variant="secondary"
              >
                Unsaved changes
              </Badge>
            ) : (
              <Badge
                className="border border-emerald-200/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                variant="secondary"
              >
                Saved
              </Badge>
            )}
          </div>
        </div>

        <Separator className="bg-zc-border" />

        {/* Current credentials */}
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Current credentials</div>
            <Button
              type="button"
              variant="outline"
              className="h-8 border-zc-border px-3 text-xs"
              onClick={startAdd}
              disabled={loading}
            >
              Add new
            </Button>
          </div>

          {credentials.length === 0 ? (
            <div className="rounded-md border border-zc-border bg-zc-card/40 p-4 text-sm text-zc-muted">
              No credentials added yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {credentials.map((c) => (
                <div key={c.id} className="rounded-md border border-zc-border bg-zc-card/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className={cn("border", credentialBadgeClass(c.credential_type))}>
                          {labelCredentialType(c.credential_type)}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn("border", statusBadgeClass(c.verification_status ?? "PENDING"))}
                        >
                          {String(c.verification_status ?? "PENDING")}
                        </Badge>
                        {Array.isArray(c.evidence_urls) && c.evidence_urls.length ? (
                          <Badge
                            variant="secondary"
                            className="border border-indigo-200/70 bg-indigo-50/70 text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200"
                          >
                            Evidence: {c.evidence_urls.length}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-2 text-sm font-medium text-zc-foreground">
                        {c.title?.trim() || "(Untitled)"}{" "}
                        {c.credential_number ? <span className="text-zc-muted">• {c.credential_number}</span> : null}
                      </div>

                      <div className="mt-1 text-xs text-zc-muted">
                        {c.issuing_authority ? `Issued by: ${c.issuing_authority}` : "Issuing authority: —"}{" "}
                        {c.valid_to ? `• Valid to: ${String(c.valid_to).slice(0, 10)}` : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 border-zc-border px-3 text-xs"
                        onClick={() => startEdit(c.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="warning"
                        className="h-8 border-zc-border px-3 text-xs text-white-600 hover:text-white-400"
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

        {/* Add/Edit Form */}
        <div
          id="credential-form"
          key={form.id}
          className={cn(
            "rounded-md border border-zc-border bg-zc-card/40 p-4",
            loading ? "opacity-60" : "opacity-100",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
              {editingId ? "Edit credential" : "Add credential"}
            </div>
            {editingId ? (
              <Button type="button" variant="outline" className="h-8 border-zc-border px-3 text-xs" onClick={startAdd}>
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

              <Field label="Title / Name" help="e.g., MBBS, B.Sc Nursing, Aadhaar">
                <Input
                  className="border-zc-border"
                  value={String(form.title ?? "")}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Issuing authority" help="e.g., State Medical Council">
                <Input
                  className="border-zc-border"
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
              <Field label="Verification status">
                <Select
                  value={String(form.verification_status ?? "PENDING")}
                  onValueChange={(v) => update("verification_status", v as VerificationStatus)}
                >
                  <SelectTrigger className="border-zc-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="VERIFIED">VERIFIED</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                    <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                    <SelectItem value="RENEWAL_DUE">RENEWAL_DUE</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Verification notes"
                help={form.verification_status === "REJECTED" ? "Recommended when rejected" : "Optional"}
              >
                <Textarea
                  className="border-zc-border"
                  value={String(form.verification_notes ?? "")}
                  onChange={(e) => update("verification_notes", e.target.value)}
                  placeholder="Optional notes for verifier..."
                />
              </Field>

              <div className="grid gap-2">
                <Label className="text-xs text-zc-muted">Evidence files</Label>
                <EvidenceUpload
                  draftId={draftId ?? null}
                  kind="IDENTITY_DOC"
                  value={Array.isArray(form.evidence_urls) ? form.evidence_urls : []}
                  onChange={(next) => setForm((p) => ({ ...p, evidence_urls: next }))}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" className="bg-zc-accent text-white hover:bg-zc-accent/90" onClick={upsertCredential}>
                {editingId ? "Update credential" : "Add credential"}
              </Button>
            </div>
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
