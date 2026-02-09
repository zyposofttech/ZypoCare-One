"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";
import { STAFF_ONBOARDING_STEPS, getStepByKey } from "../_lib/steps";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";

import { cn } from "@/lib/cn";
import { apiFetch, ApiError } from "@/lib/api";

const STAFF_API_BASE = "/api/infrastructure/staff";

type Severity = "error" | "warn";

type Issue = {
  key: string;
  severity: Severity;
  message: string;
  stepKey?: string;
};

function storageKey(draftId: string) {
  return `hrStaffOnboardingDraft:${draftId}`;
}

function readDraft(draftId: string): any {
  try {
    const raw = localStorage.getItem(storageKey(draftId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function clearDraft(draftId: string) {
  try {
    localStorage.removeItem(storageKey(draftId));
  } catch {
    // ignore
  }
}

function normalizeDateLike(input: any): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  // Accept ISO or YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function mapCredentialTypeToBackend(v: string): "MEDICAL_REG" | "NURSING_REG" | "PHARMACY_REG" | "TECH_CERT" | "OTHER" {
  const raw = String(v || "").trim().toUpperCase();
  if (raw === "MEDICAL_REG" || raw === "MEDICAL_REGISTRATION") return "MEDICAL_REG";
  if (raw === "NURSING_REG" || raw === "NURSING_REGISTRATION") return "NURSING_REG";
  if (raw === "PHARMACY_REG" || raw === "PHARMACY_REGISTRATION") return "PHARMACY_REG";
  if (raw === "TECH_CERT" || raw === "TRAINING_CERTIFICATE" || raw === "PARAMEDICAL_REGISTRATION") return "TECH_CERT";
  return "OTHER";
}

function mapVerificationStatusToBackend(v: string): "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" {
  const raw = String(v || "").trim().toUpperCase();
  if (raw === "PENDING") return "PENDING";
  if (raw === "VERIFIED") return "VERIFIED";
  if (raw === "REJECTED") return "REJECTED";
  return "UNVERIFIED";
}

function mapAssignmentTypeToBackend(v: string):
  | "PERMANENT"
  | "TEMPORARY"
  | "ROTATION"
  | "VISITING"
  | "LOCUM"
  | "CONTRACTOR"
  | "DEPUTATION"
  | "TRANSFER" {
  const raw = String(v || "").trim().toUpperCase();
  // Common onboarding wizard synonyms
  if (raw === "EMPLOYEE" || raw === "PERMANENT") return "PERMANENT";
  if (raw === "TEMP" || raw === "TEMPORARY") return "TEMPORARY";
  if (raw === "ROTATION") return "ROTATION";
  if (raw === "VISITING") return "VISITING";
  if (raw === "LOCUM") return "LOCUM";
  if (raw === "CONTRACT" || raw === "CONTRACTOR") return "CONTRACTOR";
  if (raw === "DEPUTATION") return "DEPUTATION";
  if (raw === "TRANSFER") return "TRANSFER";
  return "PERMANENT";
}

function mapAssignmentStatusToBackend(v: string): "ACTIVE" | "PLANNED" | "SUSPENDED" {
  const raw = String(v || "").trim().toUpperCase();
  if (raw === "ACTIVE" || raw === "APPROVED") return "ACTIVE";
  if (raw === "SUSPENDED") return "SUSPENDED";
  // REQUESTED, DRAFT, PLANNED -> PLANNED
  return "PLANNED";
}

function mapCredentialDraft(c: any) {
  const credentialType = mapCredentialTypeToBackend(c?.credential_type ?? c?.type ?? "OTHER");
  const registrationNumber = String(c?.credential_number ?? c?.registration_number ?? c?.registrationNumber ?? "").trim();
  const authority = String(c?.issuing_authority ?? c?.authority ?? "").trim() || null;
  const title = String(c?.credential_name ?? c?.title ?? "").trim() || null;
  const validFrom = normalizeDateLike(c?.valid_from ?? c?.validFrom) ?? null;
  const validTo = normalizeDateLike(c?.valid_to ?? c?.validTo) ?? null;
  const verificationStatus = mapVerificationStatusToBackend(c?.verification_status ?? c?.verificationStatus);

  const evidenceUrl = Array.isArray(c?.evidence_urls) ? String(c.evidence_urls[0] ?? "").trim() : String(c?.document_url ?? c?.documentUrl ?? "").trim();
  const documentUrl = evidenceUrl ? evidenceUrl : null;

  return {
    type: credentialType,
    title,
    authority,
    registrationNumber: registrationNumber || null,
    validFrom,
    validTo,
    verificationStatus,
    documentUrl,
  };
}

function mapAssignmentDraft(a: any, fallbackBranchId: string | null) {
  const branchId = String(a?.branch_id ?? a?.branchId ?? fallbackBranchId ?? "").trim();
  const departmentId = String(a?.department_id ?? a?.departmentId ?? "").trim() || null;
  const unitId = String(a?.unit_id ?? a?.unitId ?? "").trim() || null;
  const facilityId = String(a?.facility_id ?? a?.facilityId ?? "").trim() || null;
  const specialtyId = String(a?.specialty_id ?? a?.specialtyId ?? "").trim() || null;

  const designation = String(a?.role_name ?? a?.designation ?? a?.role_code ?? "").trim() || null;
  const branchEmpCode = String(a?.branch_emp_code ?? a?.branchEmpCode ?? "").trim() || null;

  const effectiveFrom = normalizeDateLike(a?.effective_from ?? a?.start_date ?? a?.start_date ?? a?.effectiveFrom ?? a?.startDate) ?? normalizeDateLike(new Date().toISOString())!;
  const effectiveTo = normalizeDateLike(a?.effective_to ?? a?.end_date ?? a?.effectiveTo ?? a?.endDate);

  const assignmentType = mapAssignmentTypeToBackend(a?.assignment_type ?? a?.assignmentType);
  const status = mapAssignmentStatusToBackend(a?.status);
  const isPrimary = !!(a?.is_primary ?? a?.isPrimary);

  const notes = String(a?.remarks ?? a?.notes ?? a?.request_reason ?? "").trim() || null;

  return {
    branchId,
    facilityId,
    departmentId,
    unitId,
    specialtyId,
    designation,
    branchEmpCode,
    assignmentType,
    effectiveFrom,
    effectiveTo: effectiveTo ?? null,
    isPrimary,
    status,
    notes,
  };
}

async function lookupUserIdByEmail(email: string): Promise<string | null> {
  const q = String(email || "").trim().toLowerCase();
  if (!q) return null;
  try {
    const res = await apiFetch<any>(`/api/iam/users?q=${encodeURIComponent(q)}`);
    const rows = Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    const hit = rows.find((u: any) => String(u?.email ?? "").toLowerCase() === q) ?? rows[0];
    return hit?.id ? String(hit.id) : null;
  } catch {
    return null;
  }
}

async function finalizeSystemAccess(staffId: string, draft: any, profile: any) {
  const sa = draft?.system_access ?? {};
  const enabled = !!sa?.enabled;
  const mode = String(sa?.mode ?? "NONE").toUpperCase();

  if (!enabled || mode === "NONE") return;

  // If already linked, do not try to link/provision again.
  if (profile?.user?.id) return;

  const roleCode =
    String(sa?.primary_role_code ?? "").trim() ||
    (Array.isArray(sa?.role_template_codes) ? String(sa?.role_template_codes[0] ?? "").trim() : "") ||
    "";

  if (mode === "CREATE_NEW") {
    const email = String(sa?.user_email ?? draft?.contact_details?.email_official ?? "").trim();
    if (!email) throw new Error("System access: email is required to provision a user.");

    const name =
      String(sa?.user_name ?? "").trim() ||
      `${String(draft?.personal_details?.first_name ?? "").trim()} ${String(draft?.personal_details?.last_name ?? "").trim()}`.trim();

    const phone = String(sa?.user_phone ?? draft?.contact_details?.mobile_primary ?? "").trim() || undefined;

    if (!roleCode) throw new Error("System access: role template code is required to provision a user.");

    await apiFetch<any>(`${STAFF_API_BASE}/${encodeURIComponent(staffId)}/provision-user`, {
      method: "POST",
      body: {
        email,
        name: name || undefined,
        phone,
        roleCode,
      },
    });
    return;
  }

  if (mode === "LINK_EXISTING") {
    const explicitUserId = String(sa?.linked_user_id ?? "").trim();
    const email = String(sa?.linked_user_email ?? "").trim();
    const userId = explicitUserId || (email ? await lookupUserIdByEmail(email) : null);
    if (!userId) throw new Error("System access: could not resolve userId for linking (provide linked_user_id or a valid email).");

    await apiFetch<any>(`${STAFF_API_BASE}/${encodeURIComponent(staffId)}/link-user`, {
      method: "POST",
      body: {
        userId,
        ...(roleCode ? { roleCode } : {}),
      },
    });
  }
}

async function ensureStaffDocument(staffId: string, profile: any, type: string, fileUrl: string, pointer: boolean) {
  const url = String(fileUrl || "").trim();
  if (!url) return;

  // Dedupe: if any existing doc has same type+fileUrl, skip.
  const existing = Array.isArray(profile?.documents) ? profile.documents : [];
  const already = existing.some((d: any) => String(d?.type ?? "") === type && String(d?.fileUrl ?? "") === url);
  if (already) return;

  await apiFetch<any>(`${STAFF_API_BASE}/${encodeURIComponent(staffId)}/documents`, {
    method: "POST",
    body: {
      type,
      fileUrl: url,
      isRequired: false,
      setAsStaffPointer: pointer,
      verificationStatus: "UNVERIFIED",
    },
  });
}

function credentialKey(c: any) {
  return [c?.type, c?.registrationNumber, c?.authority, c?.title, c?.validFrom, c?.validTo].map((x) => String(x ?? "").trim()).join("|");
}

function assignmentKey(a: any) {
  return [a?.branchId, a?.facilityId, a?.departmentId, a?.unitId, a?.specialtyId, a?.designation, a?.assignmentType, a?.effectiveFrom, a?.effectiveTo]
    .map((x) => String(x ?? "").trim())
    .join("|");
}

export default function Page() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const [draft, setDraft] = React.useState<any>({});
  const [profile, setProfile] = React.useState<any>(null);

  React.useEffect(() => {
    if (!draftId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const local = readDraft(draftId);
    setDraft(local);

    // Load server draft (staff master) for guard + idempotency.
    apiFetch<any>(`${STAFF_API_BASE}/${encodeURIComponent(draftId)}`)
      .then((p) => setProfile(p))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [draftId]);

  const issues = React.useMemo((): Issue[] => {
    if (!draftId) return [{ key: "no_draft", severity: "error", message: "Missing draftId in URL." }];

    const out: Issue[] = [];
    const pd = draft?.personal_details ?? {};
    const cd = draft?.contact_details ?? {};
    const ed = draft?.employment_details ?? {};
    const md = draft?.medical_details ?? {};

    const employeeId = String(pd?.employee_id ?? draft?.employee_id ?? "").trim();
    if (!employeeId) out.push({ key: "employee_id", severity: "error", message: "Employee ID missing.", stepKey: "start" });

    if (!String(pd?.first_name ?? "").trim()) out.push({ key: "first_name", severity: "error", message: "First name missing.", stepKey: "personal" });
    if (!String(pd?.last_name ?? "").trim()) out.push({ key: "last_name", severity: "error", message: "Last name missing.", stepKey: "personal" });
    if (!String(pd?.dob ?? "").trim()) out.push({ key: "dob", severity: "error", message: "Date of birth missing.", stepKey: "personal" });

    if (!String(cd?.mobile_primary ?? "").trim()) out.push({ key: "mobile_primary", severity: "error", message: "Primary mobile missing.", stepKey: "contact" });
    if (!String(cd?.email_official ?? "").trim()) out.push({ key: "email_official", severity: "error", message: "Official email missing.", stepKey: "contact" });
    if (!String(cd?.current_address ?? "").trim()) out.push({ key: "current_address", severity: "error", message: "Current address missing.", stepKey: "address" });

    const staffCategory = String(ed?.staff_category ?? "").toUpperCase();
    const isClinical = staffCategory === "DOCTOR" || staffCategory === "NURSE" || staffCategory === "PARAMEDIC";

    if (!staffCategory) out.push({ key: "staff_category", severity: "error", message: "Staff category missing.", stepKey: "employment" });
    if (!String(ed?.department ?? "").trim()) out.push({ key: "department", severity: "error", message: "Department missing.", stepKey: "employment" });
    if (!String(ed?.date_of_joining ?? "").trim()) out.push({ key: "date_of_joining", severity: "error", message: "Date of joining missing.", stepKey: "employment" });

    const assignments = Array.isArray(draft?.assignments) ? draft.assignments : [];
    if (assignments.length === 0) out.push({ key: "assignments", severity: "warn", message: "No assignments added yet (recommended).", stepKey: "assignments" });
    const primaryCount = assignments.filter((a: any) => !!(a?.is_primary ?? a?.isPrimary)).length;
    if (assignments.length > 0 && primaryCount === 0) out.push({ key: "primary_assignment", severity: "warn", message: "No primary assignment selected.", stepKey: "assignments" });

    if (isClinical) {
      const creds = Array.isArray(draft?.credentials) ? draft.credentials : Array.isArray(md?.credentials) ? md.credentials : [];
      const hasAny = creds.some((c: any) => !!String(c?.credential_number ?? c?.registrationNumber ?? "").trim());
      if (!hasAny) out.push({ key: "credentials", severity: "error", message: "Clinical staff must have at least one credential/registration.", stepKey: "credentials" });
    }

    const pb = pd?.photo_biometric ?? {};
    if (!String(pb?.photo_url ?? "").trim()) out.push({ key: "photo", severity: "warn", message: "Profile photo not provided.", stepKey: "photo-biometric" });
    if (!String(pb?.signature_url ?? "").trim()) out.push({ key: "signature", severity: "warn", message: "Signature not provided.", stepKey: "photo-biometric" });

    return out;
  }, [draft, draftId]);

  const blocking = issues.some((i) => i.severity === "error");

  const onFinalize = React.useCallback(async () => {
    if (!draftId) return;

    setSubmitting(true);
    try {
      // 1) Guard: ensure server draft exists
      const currentProfile = await apiFetch<any>(`${STAFF_API_BASE}/${encodeURIComponent(draftId)}`);

      // 2) Patch staff core JSON blocks (this is the authoritative sync of wizard → backend)
      const patch: any = {
        onboardingStatus: "ACTIVE",
        personalDetails: draft?.personal_details ?? undefined,
        contactDetails: draft?.contact_details ?? undefined,
        employmentDetails: draft?.employment_details ?? undefined,
        medicalDetails: draft?.medical_details ?? undefined,
      };

      await apiFetch<any>(`${STAFF_API_BASE}/${encodeURIComponent(draftId)}`, {
        method: "PATCH",
        body: patch,
      });

      // 3) Reload profile for idempotent “child record” creation
      const after = await apiFetch<any>(`${STAFF_API_BASE}/${encodeURIComponent(draftId)}`);

      // 4) Photo/signature documents
      const pb = draft?.personal_details?.photo_biometric ?? {};
      await ensureStaffDocument(draftId, after, "PROFILE_PHOTO", pb?.photo_url ?? "", true);
      await ensureStaffDocument(draftId, after, "SIGNATURE", pb?.signature_url ?? "", true);
      await ensureStaffDocument(draftId, after, "STAMP", pb?.stamp_url ?? "", true);

      // 5) Credentials
      const draftCreds = Array.isArray(draft?.credentials)
        ? draft.credentials
        : Array.isArray(draft?.medical_details?.credentials)
          ? draft.medical_details.credentials
          : [];

      const existingCreds = Array.isArray(after?.credentials) ? after.credentials : [];
      const existingKeys = new Set(existingCreds.map((c: any) => credentialKey({
        type: c?.type,
        registrationNumber: c?.registrationNumber,
        authority: c?.authority,
        title: c?.title,
        validFrom: c?.validFrom ? String(c.validFrom).slice(0, 10) : null,
        validTo: c?.validTo ? String(c.validTo).slice(0, 10) : null,
      })));

      for (const c of draftCreds) {
        const mapped = mapCredentialDraft(c);
        // Skip empty shells
        if (!mapped.registrationNumber && !mapped.documentUrl) continue;

        const key = credentialKey(mapped);
        if (existingKeys.has(key)) continue;

        await apiFetch<any>(`${STAFF_API_BASE}/${encodeURIComponent(draftId)}/credentials`, {
          method: "POST",
          body: mapped,
        });

        existingKeys.add(key);
      }

      // 6) Assignments
      const draftAssignments = Array.isArray(draft?.assignments) ? draft.assignments : [];
      const existingAssignments = Array.isArray(after?.assignments) ? after.assignments : [];
      const existingAKeys = new Set(existingAssignments.map((a: any) => assignmentKey({
        branchId: a?.branchId,
        facilityId: a?.facilityId,
        departmentId: a?.departmentId,
        unitId: a?.unitId,
        specialtyId: a?.specialtyId,
        designation: a?.designation,
        assignmentType: a?.assignmentType,
        effectiveFrom: a?.effectiveFrom ? String(a.effectiveFrom).slice(0, 10) : null,
        effectiveTo: a?.effectiveTo ? String(a.effectiveTo).slice(0, 10) : null,
      })));

      const fallbackBranchId = String(draft?.employment_details?.home_branch_id ?? "").trim() || null;

      for (const a of draftAssignments) {
        const mapped = mapAssignmentDraft(a, fallbackBranchId);
        if (!mapped.branchId) continue;

        const key = assignmentKey(mapped);
        if (existingAKeys.has(key)) continue;

        await apiFetch<any>(`${STAFF_API_BASE}/${encodeURIComponent(draftId)}/assignments`, {
          method: "POST",
          body: mapped,
        });

        existingAKeys.add(key);
      }

      // 7) System access
      const profileAfterChildren = await apiFetch<any>(`${STAFF_API_BASE}/${encodeURIComponent(draftId)}`);
      await finalizeSystemAccess(draftId, draft, profileAfterChildren);

      // 8) Cleanup local cache and go to Done
      clearDraft(draftId);

      toast({ title: "Onboarding finalized", description: "Staff updated and onboarding child records created." });
      router.push(`/infrastructure/staff/onboarding/done?draftId=${encodeURIComponent(draftId)}` as any);
    } catch (e: any) {
      const apiErr = e as ApiError<any>;
      const msg = apiErr?.message || e?.message || "Unexpected error";
      toast({ title: "Finalize failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [draft, draftId, router]);

  if (!draftId) {
    return (
      <OnboardingShell
        stepKey="review"
        title="Review & Submit"
        description="Finalize onboarding and persist all details to backend."
      >
        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-4 text-sm text-zc-muted">
          Missing draftId in URL. Start from the Initiate step.
          <div className="mt-3">
            <Button className="bg-zc-accent text-white hover:bg-zc-accent/90" onClick={() => router.push("/infrastructure/staff/onboarding/start" as any)}>Go to Start</Button>
          </div>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      stepKey="review"
      title="Review & Submit"
      description="Validate the draft and finalize onboarding."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(`/infrastructure/staff/onboarding/photo-biometric?draftId=${encodeURIComponent(draftId)}` as any)}
            disabled={loading || submitting}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button
              className="bg-zc-accent text-white hover:bg-zc-accent/90"
              onClick={onFinalize}
              disabled={loading || submitting || blocking}
              title={blocking ? "Fix blocking errors before finalize" : "Finalize onboarding"}
            >
              {submitting ? "Finalizing…" : "Finalize onboarding"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zc-foreground">Draft summary</div>
            <div className="mt-1 text-xs text-zc-muted">
              DraftId: <span className="font-mono">{draftId}</span>
              {profile ? (
                <span className="ml-2">• Server draft: <span className="font-medium">OK</span></span>
              ) : (
                <span className="ml-2 text-amber-600 dark:text-amber-400">• Server draft not found</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="border border-zc-border">
              Blocking errors: {issues.filter((i) => i.severity === "error").length}
            </Badge>
            <Badge variant="secondary" className="border border-zc-border">
              Warnings: {issues.filter((i) => i.severity === "warn").length}
            </Badge>
          </div>
        </div>

        <Separator className="bg-zc-border" />

        <Card className="border-zc-border bg-zc-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Issues</CardTitle>
            <CardDescription>Fix errors before final submit. Warnings are optional.</CardDescription>
          </CardHeader>
          <CardContent className={cn("grid gap-2", loading ? "opacity-60" : "opacity-100")}>
            {issues.length === 0 ? (
              <div className="text-sm text-zc-muted">No issues detected.</div>
            ) : (
              <div className="space-y-2">
                {issues.map((i) => {
                  const step = i.stepKey ? getStepByKey(i.stepKey) : null;
                  const href = step ? `${step.href}?draftId=${encodeURIComponent(draftId)}` : null;
                  return (
                    <div key={i.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zc-border bg-zc-panel/40 p-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "border",
                            i.severity === "error" ? "border-red-500 text-red-600 dark:text-red-400" : "border-amber-500 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {i.severity.toUpperCase()}
                        </Badge>
                        <div className="text-sm text-zc-foreground">{i.message}</div>
                      </div>

                      {href ? (
                        <Button asChild variant="outline" className="border-zc-border">
                          <Link href={href as any}>Open step</Link>
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {blocking ? (
              <div className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                Finalize is blocked until you fix all <span className="font-medium">ERROR</span> items.
              </div>
            ) : (
              <div className="mt-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                Ready to finalize. You may still review warnings.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zc-border bg-zc-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Steps</CardTitle>
            <CardDescription>Open any step to edit the local draft.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {STAFF_ONBOARDING_STEPS.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                className="justify-between border-zc-border"
                onClick={() => router.push(`${s.href}?draftId=${encodeURIComponent(draftId)}` as any)}
              >
                <span className="truncate">{s.label}</span>
                <span className="text-xs text-zc-muted">{s.id}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </OnboardingShell>
  );
}
