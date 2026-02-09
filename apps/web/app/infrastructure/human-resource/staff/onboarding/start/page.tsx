"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { OnboardingShell } from "../_components/OnboardingShell";

type StaffCategory = "MEDICAL" | "NON_MEDICAL";

type PersonalDraft = {
  employee_id?: string;
  full_name?: string;
  staff_category?: StaffCategory;
  // other personal fields are filled in Personal step
};

type StaffOnboardingDraft = {
  personal_details?: PersonalDraft;
  contact_details?: Record<string, any>;
  employment_details?: Record<string, any>;
  assignments?: any[];
  system_access?: Record<string, any>;
};

const STORAGE_PREFIX = "staff_onboarding_draft_";
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
    personal_details: { ...(prev.personal_details ?? {}), ...(patch.personal_details ?? {}) },
  };
  localStorage.setItem(storageKey(draftId), JSON.stringify(next));
}

function newDraftId(): string {
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function StaffOnboardingStartPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId") || "";

  // Ensure draftId exists
  React.useEffect(() => {
    if (!draftId) {
      const id = newDraftId();
      router.replace(`/infrastructure/staff/onboarding/start?draftId=${encodeURIComponent(id)}` as any);
    }
  }, [draftId, router]);

  const [employeeId, setEmployeeId] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [staffCategory, setStaffCategory] = React.useState<StaffCategory | "">("");

  // Load existing draft (if any)
  React.useEffect(() => {
    if (!draftId) return;
    const d = readDraft(draftId);
    const p = d.personal_details ?? {};
    setEmployeeId(p.employee_id ?? "");
    setFullName(p.full_name ?? "");
    setStaffCategory((p.staff_category as StaffCategory) ?? "");
  }, [draftId]);

  // Auto-save
  React.useEffect(() => {
    if (!draftId) return;
    writeDraft(draftId, {
      personal_details: {
        employee_id: employeeId || undefined,
        full_name: fullName || undefined,
        staff_category: (staffCategory as StaffCategory) || undefined,
      },
    });
  }, [draftId, employeeId, fullName, staffCategory]);

  const canContinue = Boolean(employeeId.trim() && fullName.trim() && staffCategory);

  return (
    <OnboardingShell
      title="Start onboarding"
      description="Enter the minimum details to begin. The rest can be filled step-by-step."
      stepId="start"
      draftId={draftId}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <Label className="text-xs">Employee ID</Label>
          <Input
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="e.g. EMP-1024"
          />
        </div>

        <div className="grid gap-2 lg:col-span-1">
          <Label className="text-xs">Full Name</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Dr. Sandeep Kumar"
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">Staff Category</Label>
          <Select value={staffCategory} onValueChange={(v) => setStaffCategory(v as StaffCategory)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEDICAL">Medical</SelectItem>
              <SelectItem value="NON_MEDICAL">Non-medical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-3 flex items-center justify-end gap-2 pt-2">
          <Button
            disabled={!canContinue}
            onClick={() =>
              router.push(`/infrastructure/staff/onboarding/personal?draftId=${encodeURIComponent(draftId)}` as any)
            }
          >
            Continue
          </Button>
        </div>
      </div>
    </OnboardingShell>
  );
}
