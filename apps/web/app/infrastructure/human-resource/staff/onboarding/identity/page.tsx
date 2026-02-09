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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/use-toast";

type IdentityDocType = "AADHAAR" | "PAN" | "PASSPORT" | "DRIVING_LICENSE" | "VOTER_ID" | "OTHER";
type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

type IdentityDocumentDraft = {
  id: string;
  doc_type: IdentityDocType;
  doc_number: string;

  name_on_document?: string;
  issuing_authority?: string;

  issued_on?: string; // YYYY-MM-DD
  valid_to?: string; // YYYY-MM-DD

  is_primary: boolean;

  verification_status: VerificationStatus;
  verification_notes?: string;

  evidence_urls?: string[]; // urls, one per line in UI
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

const DOC_LABEL: Record<IdentityDocType, string> = {
  AADHAAR: "Aadhaar",
  PAN: "PAN",
  PASSPORT: "Passport",
  DRIVING_LICENSE: "Driving License",
  VOTER_ID: "Voter ID",
  OTHER: "Other",
};

const DOC_HELP: Record<IdentityDocType, string> = {
  AADHAAR: "12 digits",
  PAN: "10 chars (e.g., ABCDE1234F)",
  PASSPORT: "Usually 8–9 alphanumeric",
  DRIVING_LICENSE: "State RTO format varies",
  VOTER_ID: "EPIC format varies",
  OTHER: "Any valid government/organization ID",
};

export default function HrStaffOnboardingIdentityPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [consent, setConsent] = React.useState<boolean>(false);
  const [docs, setDocs] = React.useState<IdentityDocumentDraft[]>([]);

  // Ensure a stable draftId in URL
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
      const draft = readDraft(draftId);
      const pd: any = draft.personal_details ?? {};

      const existingDocsRaw = pd.identity_documents;
      const existingDocs: IdentityDocumentDraft[] = Array.isArray(existingDocsRaw)
        ? existingDocsRaw
            .filter((x: any) => x && typeof x === "object")
            .map((x: any) => ({
              id: String(x.id || makeId()),
              doc_type: (String(x.doc_type || "AADHAAR").toUpperCase() as IdentityDocType) || "AADHAAR",
              doc_number: String(x.doc_number || "").trim(),
              name_on_document: x.name_on_document ? String(x.name_on_document).trim() : undefined,
              issuing_authority: x.issuing_authority ? String(x.issuing_authority).trim() : undefined,
              issued_on: x.issued_on ? String(x.issued_on).slice(0, 10) : undefined,
              valid_to: x.valid_to ? String(x.valid_to).slice(0, 10) : undefined,
              is_primary: !!x.is_primary,
              verification_status: (String(x.verification_status || "PENDING").toUpperCase() as VerificationStatus) || "PENDING",
              verification_notes: x.verification_notes ? String(x.verification_notes) : undefined,
              evidence_urls: Array.isArray(x.evidence_urls) ? x.evidence_urls.map((u: any) => String(u).trim()).filter(Boolean) : [],
            }))
        : [];

      // normalize primary selection if needed
      const normalized = normalizePrimary(existingDocs);

      setDocs(normalized);
      setConsent(!!pd.identity_consent_acknowledged);

      setDirty(false);
      setErrors({});
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  function setDocAt(idx: number, next: IdentityDocumentDraft) {
    setDocs((prev) => {
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
    setDirty(true);
  }

  function addDoc() {
    const id = makeId();
    setDocs((prev) => {
      const next: IdentityDocumentDraft[] = [
        ...prev,
        {
          id,
          doc_type: "AADHAAR",
          doc_number: "",
          name_on_document: "",
          issuing_authority: "",
          issued_on: "",
          valid_to: "",
          is_primary: prev.length === 0, // first one becomes primary
          verification_status: "PENDING",
          verification_notes: "",
          evidence_urls: [],
        },
      ];
      return normalizePrimary(next);
    });
    setDirty(true);
  }

  function removeDoc(id: string) {
    setDocs((prev) => normalizePrimary(prev.filter((d) => d.id !== id)));
    setDirty(true);
  }

  function markPrimary(id: string) {
    setDocs((prev) => normalizePrimary(prev.map((d) => ({ ...d, is_primary: d.id === id }))));
    setDirty(true);
  }

  function updateEvidence(idx: number, multiline: string) {
    const urls = String(multiline || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const d = docs[idx];
    setDocAt(idx, { ...d, evidence_urls: urls });
    setErrors((e) => {
      const next = { ...e };
      delete next[`docs.${idx}.evidence_urls`];
      return next;
    });
  }

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};

    if (docs.length === 0) {
      e["docs"] = "Add at least one identity document.";
      return e;
    }

    const primaryCount = docs.filter((d) => d.is_primary).length;
    if (primaryCount !== 1) {
      e["docs.primary"] = "Exactly one document must be marked as Primary.";
    }

    docs.forEach((d, idx) => {
      const type = d.doc_type;
      const num = String(d.doc_number || "").trim();
      if (!type) e[`docs.${idx}.doc_type`] = "Document type is required.";
      if (!num) e[`docs.${idx}.doc_number`] = "Document number is required.";
      else {
        const msg = validateDocNumber(type, num);
        if (msg) e[`docs.${idx}.doc_number`] = msg;
      }

      // Optional but quality checks
      const issued = String(d.issued_on || "").trim();
      const validTo = String(d.valid_to || "").trim();
      if (issued && !isISODate(issued)) e[`docs.${idx}.issued_on`] = "Use YYYY-MM-DD format.";
      if (validTo && !isISODate(validTo)) e[`docs.${idx}.valid_to`] = "Use YYYY-MM-DD format.";
      if (issued && validTo && issued > validTo) e[`docs.${idx}.valid_to`] = "Valid-to cannot be before issued-on.";

      const status = d.verification_status;
      if (!status) e[`docs.${idx}.verification_status`] = "Verification status is required.";
      if (status === "REJECTED" && !String(d.verification_notes || "").trim()) {
        e[`docs.${idx}.verification_notes`] = "Rejection notes are required when status is REJECTED.";
      }
    });

    if (!consent) {
      e["consent"] = "Consent acknowledgement is required.";
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
        description: "Please fix the highlighted items to continue.",
      });
      throw new Error("validation_failed");
    }

    const existing = readDraft(draftId);
    const pd: any = existing.personal_details ?? {};

    const normalizedDocs = normalizePrimary(
      docs.map((d) => ({
        ...d,
        doc_number: normalizeDocNumber(d.doc_type, d.doc_number),
        name_on_document: cleanOpt(d.name_on_document),
        issuing_authority: cleanOpt(d.issuing_authority),
        issued_on: cleanDateOpt(d.issued_on),
        valid_to: cleanDateOpt(d.valid_to),
        verification_notes: cleanOpt(d.verification_notes),
        evidence_urls: Array.isArray(d.evidence_urls) ? d.evidence_urls.map((u) => String(u).trim()).filter(Boolean) : [],
      }))
    );

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      personal_details: {
        ...pd,
        identity_consent_acknowledged: true,
        identity_documents: normalizedDocs,
      },
    };

    writeDraft(draftId, nextDraft);
    setDirty(false);

    toast({ title: "Saved", description: "Identity documents saved to draft." });
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
      router.push(withDraftId("/infrastructure/staff/onboarding/professional", draftId) as any);
    } catch {
      // handled
    }
  }

  return (
    <OnboardingShell
      stepKey="identity"
      title="Identity & KYC"
      description="Capture primary identity documents with validation and evidence links."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/address", draftId) as any)}
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
            <div className="text-sm font-medium text-zc-foreground">Step 5: Identity documents</div>
            <div className="mt-1 text-xs text-zc-muted">
              Add at least one ID. Mark exactly one as Primary. Evidence URLs are optional (one per line).
            </div>
            {errors["docs"] ? (
              <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300">
                {errors["docs"]}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {docs.length ? (
              <Badge variant="secondary" className="border border-zc-border">
                Documents: {docs.length}
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400" variant="secondary">
                Add a document
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

        {/* Consent */}
        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-zc-foreground">Consent acknowledgement</div>
              <div className="mt-1 text-xs text-zc-muted">
                Confirm that the staff member has provided consent to store and process identity information.
              </div>
              {errors["consent"] ? <div className="mt-2 text-xs text-red-500">{errors["consent"]}</div> : null}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-zc-muted">Acknowledged</Label>
              <Switch
                checked={consent}
                onCheckedChange={(v) => {
                  setConsent(v);
                  setDirty(true);
                  setErrors((e) => {
                    const next = { ...e };
                    delete next["consent"];
                    return next;
                  });
                }}
              />
            </div>
          </div>
        </div>

        {/* Docs list */}
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Documents</div>
            <Button type="button" className="bg-zc-accent text-white hover:bg-zc-accent/90" onClick={addDoc} disabled={loading}>
              Add document
            </Button>
          </div>

          {errors["docs.primary"] ? <div className="text-xs text-red-500">{errors["docs.primary"]}</div> : null}

          {docs.length === 0 ? (
            <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-sm text-zc-muted">
              No identity documents added yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {docs.map((d, idx) => {
                const isPrimary = d.is_primary;
                const typeLabel = DOC_LABEL[d.doc_type] ?? d.doc_type;
                const help = DOC_HELP[d.doc_type] ?? "";

                const numErr = errors[`docs.${idx}.doc_number`];
                const issuedErr = errors[`docs.${idx}.issued_on`];
                const validToErr = errors[`docs.${idx}.valid_to`];
                const notesErr = errors[`docs.${idx}.verification_notes`];

                return (
                  <div key={d.id} className="rounded-md border border-zc-border bg-zc-panel/40 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="border border-zc-border">
                            {typeLabel}
                          </Badge>
                          {isPrimary ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                              Primary
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="border border-zc-border">
                              Secondary
                            </Badge>
                          )}

                          <Badge
                            variant="secondary"
                            className={cn(
                              "border border-zc-border",
                              d.verification_status === "VERIFIED"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : d.verification_status === "REJECTED"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {d.verification_status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-zc-muted">{help}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isPrimary ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 border-zc-border px-3 text-xs"
                            onClick={() => markPrimary(d.id)}
                          >
                            Make primary
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 border-zc-border px-3 text-xs"
                          onClick={() => removeDoc(d.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Field label="Document type" required error={errors[`docs.${idx}.doc_type`]}>
                        <Select
                          value={d.doc_type}
                          onValueChange={(v) => {
                            const doc_type = (String(v).toUpperCase() as IdentityDocType) || "OTHER";
                            // reset number only if it becomes invalid? keep user value; just normalize later
                            setDocAt(idx, { ...d, doc_type });
                            setErrors((e) => {
                              const next = { ...e };
                              delete next[`docs.${idx}.doc_type`];
                              delete next[`docs.${idx}.doc_number`];
                              return next;
                            });
                          }}
                        >
                          <SelectTrigger className={cn("border-zc-border", errors[`docs.${idx}.doc_type`] ? "border-red-500" : "")}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AADHAAR">Aadhaar</SelectItem>
                            <SelectItem value="PAN">PAN</SelectItem>
                            <SelectItem value="PASSPORT">Passport</SelectItem>
                            <SelectItem value="DRIVING_LICENSE">Driving License</SelectItem>
                            <SelectItem value="VOTER_ID">Voter ID</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Document number" required error={numErr}>
                        <Input
                          className={cn("border-zc-border", numErr ? "border-red-500" : "")}
                          value={d.doc_number ?? ""}
                          onChange={(e) => {
                            setDocAt(idx, { ...d, doc_number: e.target.value });
                            setErrors((er) => {
                              const next = { ...er };
                              delete next[`docs.${idx}.doc_number`];
                              return next;
                            });
                          }}
                          placeholder={d.doc_type === "PAN" ? "ABCDE1234F" : d.doc_type === "AADHAAR" ? "123412341234" : "Enter document number"}
                        />
                      </Field>

                      <Field label="Name on document" error={errors[`docs.${idx}.name_on_document`]}>
                        <Input
                          className="border-zc-border"
                          value={d.name_on_document ?? ""}
                          onChange={(e) => setDocAt(idx, { ...d, name_on_document: e.target.value })}
                          placeholder="Optional"
                        />
                      </Field>

                      <Field label="Issuing authority" error={errors[`docs.${idx}.issuing_authority`]}>
                        <Input
                          className="border-zc-border"
                          value={d.issuing_authority ?? ""}
                          onChange={(e) => setDocAt(idx, { ...d, issuing_authority: e.target.value })}
                          placeholder="Optional"
                        />
                      </Field>

                      <Field label="Issued on" error={issuedErr} help="YYYY-MM-DD">
                        <Input
                          className={cn("border-zc-border", issuedErr ? "border-red-500" : "")}
                          value={d.issued_on ?? ""}
                          onChange={(e) => {
                            setDocAt(idx, { ...d, issued_on: e.target.value });
                            setErrors((er) => {
                              const next = { ...er };
                              delete next[`docs.${idx}.issued_on`];
                              return next;
                            });
                          }}
                          placeholder="YYYY-MM-DD"
                        />
                      </Field>

                      <Field label="Valid to" error={validToErr} help="YYYY-MM-DD">
                        <Input
                          className={cn("border-zc-border", validToErr ? "border-red-500" : "")}
                          value={d.valid_to ?? ""}
                          onChange={(e) => {
                            setDocAt(idx, { ...d, valid_to: e.target.value });
                            setErrors((er) => {
                              const next = { ...er };
                              delete next[`docs.${idx}.valid_to`];
                              return next;
                            });
                          }}
                          placeholder="YYYY-MM-DD"
                        />
                      </Field>

                      <Field label="Verification status" required error={errors[`docs.${idx}.verification_status`]}>
                        <Select
                          value={d.verification_status}
                          onValueChange={(v) => {
                            const verification_status = (String(v).toUpperCase() as VerificationStatus) || "PENDING";
                            setDocAt(idx, { ...d, verification_status });
                            setErrors((er) => {
                              const next = { ...er };
                              delete next[`docs.${idx}.verification_status`];
                              return next;
                            });
                          }}
                        >
                          <SelectTrigger className={cn("border-zc-border", errors[`docs.${idx}.verification_status`] ? "border-red-500" : "")}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">PENDING</SelectItem>
                            <SelectItem value="VERIFIED">VERIFIED</SelectItem>
                            <SelectItem value="REJECTED">REJECTED</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field
                        label="Verification notes"
                        error={notesErr}
                        help={d.verification_status === "REJECTED" ? "Required when rejected" : "Optional"}
                      >
                        <Textarea
                          className={cn("border-zc-border", notesErr ? "border-red-500" : "")}
                          value={d.verification_notes ?? ""}
                          onChange={(e) => setDocAt(idx, { ...d, verification_notes: e.target.value })}
                          placeholder={d.verification_status === "REJECTED" ? "Reason for rejection" : "Optional"}
                        />
                      </Field>

                      <Field
                        label="Evidence URLs"
                        help="One per line (optional)"
                        error={errors[`docs.${idx}.evidence_urls`]}
                      >
                        <Textarea
                          className="border-zc-border"
                          value={(d.evidence_urls ?? []).join("\n")}
                          onChange={(e) => updateEvidence(idx, e.target.value)}
                          placeholder="https://... (one per line)"
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
          <div className="font-medium text-zc-foreground">Next step</div>
          <div className="mt-1">
            Professional details: <span className="font-mono">/onboarding/professional</span>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

/* ---------- UI helpers ---------- */

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

/* ---------- validation / normalization ---------- */

function normalizePrimary(list: IdentityDocumentDraft[]): IdentityDocumentDraft[] {
  if (!list.length) return list;

  const primaryCount = list.filter((d) => d.is_primary).length;
  if (primaryCount === 1) return list;

  // If none or multiple, force first as primary
  const firstId = list[0].id;
  return list.map((d) => ({ ...d, is_primary: d.id === firstId }));
}

function validateDocNumber(type: IdentityDocType, raw: string): string | null {
  const v = normalizeDocNumber(type, raw);

  if (type === "AADHAAR") {
    if (!/^\d{12}$/.test(v)) return "Aadhaar must be exactly 12 digits.";
  }

  if (type === "PAN") {
    // PAN: 5 letters + 4 digits + 1 letter
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v)) return "PAN must match pattern ABCDE1234F.";
  }

  if (type === "PASSPORT") {
    // India passports commonly 1 letter + 7 digits. Allow broader to avoid false rejects.
    if (v.length < 6 || v.length > 12) return "Passport number looks invalid (length).";
    if (!/^[A-Z0-9]+$/.test(v)) return "Passport number must be alphanumeric.";
  }

  if (type === "DRIVING_LICENSE") {
    // Highly variable; enforce basic sanity
    if (v.length < 5) return "Driving license number looks too short.";
    if (v.length > 25) return "Driving license number looks too long.";
  }

  if (type === "VOTER_ID") {
    // EPIC often 3 letters + 7 digits, but varies
    if (v.length < 6 || v.length > 20) return "Voter ID looks invalid (length).";
    if (!/^[A-Z0-9]+$/.test(v)) return "Voter ID must be alphanumeric.";
  }

  if (type === "OTHER") {
    if (v.length < 3) return "Document number looks too short.";
  }

  return null;
}

function normalizeDocNumber(type: IdentityDocType, raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";

  if (type === "AADHAAR") {
    return s.replace(/[^\d]/g, "").slice(0, 12);
  }

  // PAN, Passport, DL, Voter: keep alphanum uppercase
  return s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

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

function isEmail(v: string) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function normalizePhone(v: string) {
  return String(v ?? "").replace(/[^\d]/g, "").slice(-10);
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
