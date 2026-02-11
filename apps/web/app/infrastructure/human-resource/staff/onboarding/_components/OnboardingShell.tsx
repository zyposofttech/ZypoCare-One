"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  UserPlus,
  User,
  BadgeCheck,
  Briefcase,
  FileText,
  ShieldCheck,
  ClipboardList,
  ClipboardCheck,
  HeartPulse,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/cn";
import { apiFetch, ApiError } from "@/lib/api";

import { STAFF_ONBOARDING_STEPS, StaffOnboardingStepId } from "../_lib/steps";

/**
 * FIXES INCLUDED (Draft Prefill + Save Stability):
 * 1) URL draftId updates now notify Next router properly (router.replace) so step pages using useSearchParams re-render.
 * 2) When opening a draftId from Staff Queue, if localStorage is empty -> hydrate local draft from server GET /staff/:id.
 * 3) existsOnServer(): non-404 errors are treated as "exists" (prevents accidental duplicate draft creation).
 * 4) Still keeps your existing mandatory validation + category mapping (MEDICAL/NON_MEDICAL).
 */

type Props = {
  title: string;
  description?: string;
  stepId?: StaffOnboardingStepId;
  stepKey?: string;
  draftId?: string;
  onSaveDraft?: () => void | Promise<void>;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

const STEP_ICONS: Partial<Record<StaffOnboardingStepId, React.ComponentType<{ className?: string }>>> = {
  personal: User,
  identity: BadgeCheck,
  employment: Briefcase,
  credentials: FileText,
  privileges: ShieldCheck,
  assignments: ClipboardList,
  background: ClipboardCheck,
  health: HeartPulse,
  "system-access": KeyRound,
  review: CheckCircle2,
  done: CheckCircle2,
};

function deriveRoots(pathname: string | null) {
  const p = pathname ?? "";
  const idx = p.indexOf("/onboarding");
  const staffRoot = idx > 0 ? p.slice(0, idx) : "/infrastructure/human-resource/staff";
  return { staffRoot };
}

function storageKey(draftId: string) {
  return `hrStaffOnboardingDraft:${draftId}`;
}

function readLocalDraft(draftId: string): any {
  try {
    const raw = localStorage.getItem(storageKey(draftId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalDraft(draftId: string, payload: any) {
  try {
    localStorage.setItem(storageKey(draftId), JSON.stringify(payload ?? {}));
  } catch {
    // ignore
  }
}

function migrateLocalDraft(oldId: string, newId: string) {
  try {
    const raw = localStorage.getItem(storageKey(oldId));
    if (!raw) return;
    localStorage.setItem(storageKey(newId), raw);
    localStorage.removeItem(storageKey(oldId));
  } catch {
    // ignore
  }
}

function ensureDob(pd: any) {
  if (!pd || typeof pd !== "object") return {};
  const dob = pd.dob || pd.date_of_birth;
  return dob ? { ...pd, dob } : { ...pd };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function normalizePhoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function newLocalDraftId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type MandatoryResult = { ok: true } | { ok: false; message: string; stepKey?: StaffOnboardingStepId };

function extractStaffTypeAndTrack(local: any) {
  const ed = local?.employment_details ?? {};
  const pd = local?.personal_details ?? {};

  const staffType =
    String(ed?.staff_category ?? ed?.staffCategory ?? ed?.staff_type ?? ed?.staffType ?? "").trim() ||
    String(pd?.staff_category ?? "").trim();

  const rawTrack = String(
    ed?.track ??
      ed?.staff_track ??
      ed?.staffTrack ??
      ed?.professional_details?.track ??
      ed?.professionalDetails?.track ??
      "",
  )
    .trim()
    .toUpperCase();

  const edCategory = String(ed?.category ?? "").trim().toUpperCase(); // might be MEDICAL/NON_MEDICAL
  const track =
    rawTrack === "CLINICAL" || rawTrack === "NON_CLINICAL"
      ? rawTrack
      : edCategory === "MEDICAL"
        ? "CLINICAL"
        : edCategory === "NON_MEDICAL"
          ? "NON_CLINICAL"
          : "";

  return { staffType, track };
}

function mapTrackToBackendCategory(track: string, staffType: string, edCategory: string): "MEDICAL" | "NON_MEDICAL" {
  const t = String(track || "").trim().toUpperCase();
  const st = String(staffType || "").trim().toUpperCase();
  const edc = String(edCategory || "").trim().toUpperCase();

  if (edc === "MEDICAL" || edc === "NON_MEDICAL") return edc as any;

  if (t === "CLINICAL") return "MEDICAL";
  if (t === "NON_CLINICAL" || t === "NON-CLINICAL") return "NON_MEDICAL";

  return ["DOCTOR", "NURSE", "PARAMEDIC", "TECHNICIAN", "PHARMACIST"].includes(st) ? "MEDICAL" : "NON_MEDICAL";
}

/**
 * Mandatory fields for SAVE DRAFT:
 * - employee_id
 * - staff category
 * - track
 * - title + first/last + DOB + gender
 * - primary mobile (10 digits)
 * - official email
 * - current address
 */
function validateMandatoryForSave(local: any): MandatoryResult {
  const pd = ensureDob(local?.personal_details ?? {});
  const cd = local?.contact_details ?? {};
  const ed = local?.employment_details ?? {};

  const employeeId = String(pd?.employee_id ?? local?.employee_id ?? "").trim();
  const title = String(pd?.title ?? "").trim();
  const first = String(pd?.first_name ?? "").trim();
  const last = String(pd?.last_name ?? "").trim();
  const dob = String(pd?.dob ?? "").trim();
  const gender = String(pd?.gender ?? "").trim();

  const email = String(cd?.email_official ?? "").trim();
  const phone = normalizePhoneDigits(String(cd?.mobile_primary ?? "").trim());
  const address = String(cd?.current_address ?? "").trim();

  const { staffType, track } = extractStaffTypeAndTrack(local);

  if (!employeeId) return { ok: false, message: "Employee ID is required to save a draft.", stepKey: "personal" };
  if (!staffType) return { ok: false, message: "Staff Category is required to save a draft.", stepKey: "personal" };
  if (!track) return { ok: false, message: "Track (Clinical/Non-Clinical) is required to save a draft.", stepKey: "personal" };

  if (!title) return { ok: false, message: "Title is required to save a draft.", stepKey: "personal" };
  if (!first) return { ok: false, message: "First name is required to save a draft.", stepKey: "personal" };
  if (!last) return { ok: false, message: "Last name is required to save a draft.", stepKey: "personal" };
  if (!dob) return { ok: false, message: "Date of birth is required to save a draft.", stepKey: "personal" };
  if (!gender) return { ok: false, message: "Gender is required to save a draft.", stepKey: "personal" };

  if (!email || !isValidEmail(email))
    return { ok: false, message: "A valid official email is required to save a draft.", stepKey: "personal" };
  if (!phone || phone.length !== 10)
    return { ok: false, message: "A valid 10-digit primary mobile is required to save a draft.", stepKey: "personal" };
  if (!address) return { ok: false, message: "Current address is required to save a draft.", stepKey: "personal" };

  return { ok: true };
}

async function existsOnServer(id: string): Promise<boolean> {
  try {
    await apiFetch(`/api/infrastructure/staff/${encodeURIComponent(id)}`);
    return true;
  } catch (e: any) {
    // ✅ Only 404 means "does not exist"
    if (e instanceof ApiError && e.status === 404) return false;

    // ✅ Any other error (401/403/400/500) -> treat as exists to avoid creating duplicate drafts
    return true;
  }
}

function hasMeaningfulLocal(local: any) {
  if (!local || typeof local !== "object") return false;
  const keys = [
    "personal_details",
    "contact_details",
    "employment_details",
    "medical_details",
    "system_access",
    "address_details",
    "professional_details",
    "assignments",
  ] as const;

  for (const k of keys) {
    const v = (local as any)[k];
    if (Array.isArray(v) && v.length > 0) return true;
    if (v && typeof v === "object" && Object.keys(v).length > 0) return true;
  }
  return false;
}

export function OnboardingShell({
  title,
  description,
  stepId: stepIdProp,
  stepKey,
  draftId: draftIdProp,
  onSaveDraft,
  footer,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { toast } = useToast();

  const { staffRoot } = React.useMemo(() => deriveRoots(pathname), [pathname]);

  const initialStep = STAFF_ONBOARDING_STEPS[0]?.id ?? "personal";
  const stepId = (stepKey ?? stepIdProp ?? initialStep) as StaffOnboardingStepId;

  const spDraftId = sp.get("draftId") ?? "";
  const [draftId, setDraftId] = React.useState<string>(draftIdProp ?? spDraftId);

  // ✅ Reliable URL update that also updates Next's searchParams listeners
  const replaceDraftIdInUrl = React.useCallback(
    (id: string) => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("draftId", id);

        // Keep state without full reload
        window.history.replaceState(window.history.state, "", url.toString());

        // ✅ make Next update useSearchParams() consumers
        const href = `${url.pathname}?${url.searchParams.toString()}${url.hash ?? ""}`;
        router.replace(href as any);

        // extra nudge for any listeners
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch {
        // ignore
      }
    },
    [router],
  );

  // Keep state synced with URL/prop changes
  React.useEffect(() => {
    const next = draftIdProp ?? (sp.get("draftId") ?? "");
    if (next && next !== draftId) setDraftId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftIdProp, sp]);

  // If missing, generate LOCAL id and inject into URL
  React.useEffect(() => {
    if (draftId) return;
    const id = newLocalDraftId();
    setDraftId(id);
    replaceDraftIdInUrl(id);
  }, [draftId, replaceDraftIdInUrl]);

  // ✅ Hydrate localStorage from server when opening from Staff Queue (draftId is server id)
  const [hydrating, setHydrating] = React.useState(false);
  const hydratedOnceRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!draftId) return;
    if (hydratedOnceRef.current === draftId) return;

    const local = readLocalDraft(draftId);
    if (hasMeaningfulLocal(local)) {
      hydratedOnceRef.current = draftId;
      return;
    }

    let alive = true;
    (async () => {
      setHydrating(true);
      try {
        // If it doesn't exist, apiFetch will throw (404) and we ignore.
        const row: any = await apiFetch(`/api/infrastructure/staff/${encodeURIComponent(draftId)}`);

        // Map server profile -> local draft format used by pages
        const mapped: any = {
          personal_details: ensureDob(row?.personalDetails ?? row?.personal_details ?? {}),
          contact_details: row?.contactDetails ?? row?.contact_details ?? {},
          employment_details: row?.employmentDetails ?? row?.employment_details ?? {},
          medical_details: row?.medicalDetails ?? row?.medical_details ?? {},
          system_access: row?.systemAccess ?? row?.system_access ?? {},
          assignments: Array.isArray(row?.assignments) ? row.assignments : [],
        };

        // only write if meaningful
        if (hasMeaningfulLocal(mapped)) {
          writeLocalDraft(draftId, mapped);
        }

        hydratedOnceRef.current = draftId;
      } catch {
        hydratedOnceRef.current = draftId;
      } finally {
        if (alive) setHydrating(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [draftId]);

  const goTo = React.useCallback(
    (nextStepId: StaffOnboardingStepId) => {
      const step = STAFF_ONBOARDING_STEPS.find((s) => s.id === nextStepId);
      if (!step || !draftId) return;
      router.push(`${step.href}?draftId=${encodeURIComponent(draftId)}` as any);
    },
    [draftId, router],
  );

  const [saving, setSaving] = React.useState(false);

  const handleSaveDraft = async () => {
    if (!draftId || saving || hydrating) return;

    setSaving(true);
    try {
      // 0) ensure a local draftId exists in URL to keep key stable
      if (!draftId) {
        const id = newLocalDraftId();
        setDraftId(id);
        replaceDraftIdInUrl(id);
      }

      // 1) Let the current step persist its latest state into localStorage first
      if (onSaveDraft) await onSaveDraft();

      // IMPORTANT: read draft using *current* state draftId
      const local = readLocalDraft(draftId);

      // 2) Validate mandatory fields BEFORE any server calls
      const v = validateMandatoryForSave(local);
      if (!v.ok) {
        toast({ variant: "destructive", title: "Cannot save draft", description: v.message });
        if (v.stepKey) {
          const step = STAFF_ONBOARDING_STEPS.find((s) => s.id === v.stepKey);
          if (step) router.push(`${step.href}?draftId=${encodeURIComponent(draftId)}` as any);
        }
        return;
      }

      // 3) Determine server id
      let staffId = draftId;
      const isServer = await existsOnServer(draftId);

      // 4) If local draftId, create server draft ONLY NOW
      if (!isServer) {
        const created = await apiFetch<{ staffId: string }>(`/api/infrastructure/staff/drafts`, {
          method: "POST",
          body: {},
        });

        if (!created?.staffId) throw new Error("Draft creation failed (no staffId)");
        staffId = created.staffId;

        // migrate local data to server id key
        migrateLocalDraft(draftId, staffId);

        // update state + URL
        setDraftId(staffId);
        replaceDraftIdInUrl(staffId);
      }

      // 5) Build PATCH payload
      const pd = ensureDob(local?.personal_details ?? {});
      const cd = local?.contact_details ?? {};
      const ed = local?.employment_details ?? {};
      const md = local?.medical_details ?? {};
      const sa = local?.system_access ?? {};

      const { staffType, track } = extractStaffTypeAndTrack(local);
      const backendCategory = mapTrackToBackendCategory(track, staffType, String(ed?.category ?? ""));

      const email = String(cd?.email_official ?? "").trim().toLowerCase() || null;
      const phone = normalizePhoneDigits(String(cd?.mobile_primary ?? "").trim()) || null;

      const name =
        String(pd?.display_name ?? "").trim() ||
        `${String(pd?.first_name ?? "").trim()} ${String(pd?.last_name ?? "").trim()}`.trim() ||
        "Staff";

      const patch: any = {
        onboardingStatus: "DRAFT",
        empCode: String(pd?.employee_id ?? "").trim() || undefined,
        name,
        email,
        phone,
        designation: String(ed?.designation ?? staffType ?? "").trim() || undefined,

        // backend expects MEDICAL | NON_MEDICAL
        category: backendCategory,

        personalDetails: pd,
        contactDetails: cd,

        // keep both for UI compatibility
        employmentDetails: {
          ...ed,
          staff_category: staffType || ed?.staff_category,
          track: track || ed?.track,
          category: backendCategory,
        },

        medicalDetails: md,
        systemAccess: sa,
      };

      await apiFetch(`/api/infrastructure/staff/${encodeURIComponent(staffId)}`, {
        method: "PATCH",
        body: patch,
      });

      toast({ title: "Draft saved", description: "Draft saved to server successfully." });
    } catch (e: any) {
      const msg = e?.message ?? "Could not save draft.";
      toast({ variant: "destructive", title: "Save failed", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const visibleSteps = STAFF_ONBOARDING_STEPS.filter((s) => s.id !== "done");
  const ready = Boolean(draftId) && !hydrating;

  return (
    <AppShell title="Staff Onboarding">
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="grid gap-6 w-full max-w-full">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between w-full max-w-full">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-zc-border bg-zc-card/30">
                <UserPlus className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-3xl font-semibold tracking-tight truncate">{title}</div>
                {description ? <div className="mt-1 text-sm text-zc-muted truncate">{description}</div> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="success"
                className="px-5 gap-2"
                onClick={handleSaveDraft}
                disabled={!ready || saving}
                title={!ready ? "Draft session not ready" : "Save draft to server"}
              >
                {hydrating ? "Loading…" : saving ? "Saving…" : "Save draft"}
              </Button>
              <Button variant="warning" className="px-5 gap-2" onClick={() => router.push(staffRoot as any)}>
                Exit
              </Button>
            </div>
          </div>

          <Card className="border-zc-border bg-zc-card w-full max-w-full">
            <CardHeader className="pb-3 w-full max-w-full">
              <Tabs value={stepId} onValueChange={(v) => goTo(v as StaffOnboardingStepId)}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-card/20 p-1")}>
                  {visibleSteps.map((s) => {
                    const Icon = STEP_ICONS[s.id];
                    return (
                      <TabsTrigger
                        key={s.id}
                        value={s.id}
                        className={cn(
                          "rounded-xl px-3",
                          "data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                        )}
                      >
                        {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                        {s.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="w-full max-w-full">
              {!ready ? (
                <div className="py-8 text-sm text-zc-muted">Preparing…</div>
              ) : (
                <>
                  {children}
                  {footer ? <div className="mt-4 flex justify-end gap-2">{footer}</div> : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
