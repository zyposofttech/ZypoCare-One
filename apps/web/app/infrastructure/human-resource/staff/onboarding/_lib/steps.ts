export type StaffOnboardingStepId =
  | "start"
  | "personal"
  | "contact"
  | "employment"
  | "assignments"
  | "system-access"
  | "review"
  | "done";

export type StaffOnboardingStep = {
  id: StaffOnboardingStepId;
  label: string;
  href: string; // no draftId here; shell will append ?draftId=
};

const BASE = "/infrastructure/staff/onboarding";

export const STAFF_ONBOARDING_STEPS: StaffOnboardingStep[] = [
  { id: "start", label: "Start", href: `${BASE}/start` },
  { id: "personal", label: "Personal", href: `${BASE}/personal` },
  { id: "contact", label: "Contact", href: `${BASE}/contact` },
  { id: "employment", label: "Employment", href: `${BASE}/employment` },
  { id: "assignments", label: "Assignments", href: `${BASE}/assignments` },
  { id: "system-access", label: "System Access", href: `${BASE}/system-access` },
  { id: "review", label: "Review", href: `${BASE}/review` },
  { id: "done", label: "Done", href: `${BASE}/done` },
];

/** Look up a step by its id/key. Returns undefined if not found. */
export function getStepByKey(
  key: string
): StaffOnboardingStep | undefined {
  return STAFF_ONBOARDING_STEPS.find((s) => s.id === key);
}
