"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/cn";

type PhotoBiometricDraft = {
  photo_url?: string | null;
  signature_url?: string | null;
  stamp_url?: string | null;

  biometric_enrolled?: boolean;
  biometric_enrollment_id?: string | null;
  biometric_device_id?: string | null;
  enrolled_at?: string | null; // YYYY-MM-DD
  attendance_id?: string | null;

  notes?: string | null;
};

function withDraftId(href: string, draftId: string | null) {
  if (!draftId) return href;
  const u = new URL(href, "http://local");
  u.searchParams.set("draftId", draftId);
  return u.pathname + "?" + u.searchParams.toString();
}

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

function writeDraft(draftId: string, draft: any) {
  try {
    localStorage.setItem(storageKey(draftId), JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export default function Page() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);

  const [pb, setPb] = React.useState<PhotoBiometricDraft>({
    photo_url: "",
    signature_url: "",
    stamp_url: "",
    biometric_enrolled: false,
    biometric_enrollment_id: "",
    biometric_device_id: "",
    enrolled_at: "",
    attendance_id: "",
    notes: "",
  });

  React.useEffect(() => {
    if (!draftId) {
      setLoading(false);
      return;
    }

    const d = readDraft(draftId);
    const existing = (d?.personal_details?.photo_biometric ?? {}) as PhotoBiometricDraft;

    setPb({
      photo_url: existing.photo_url ?? "",
      signature_url: existing.signature_url ?? "",
      stamp_url: existing.stamp_url ?? "",
      biometric_enrolled: !!existing.biometric_enrolled,
      biometric_enrollment_id: existing.biometric_enrollment_id ?? "",
      biometric_device_id: existing.biometric_device_id ?? "",
      enrolled_at: existing.enrolled_at ?? "",
      attendance_id: existing.attendance_id ?? "",
      notes: existing.notes ?? "",
    });

    setDirty(false);
    setLoading(false);
  }, [draftId]);

  const update = React.useCallback((k: keyof PhotoBiometricDraft, v: any) => {
    setPb((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  }, []);

  const validate = React.useCallback(() => {
    if (pb.biometric_enrolled) {
      if (!String(pb.biometric_enrollment_id || "").trim()) return "Biometric enrollment ID is required when enrolled.";
      if (!String(pb.enrolled_at || "").trim()) return "Enrollment date is required when enrolled.";
    }
    return null;
  }, [pb.biometric_enrolled, pb.biometric_enrollment_id, pb.enrolled_at]);

  const save = React.useCallback(
    (showToast: boolean) => {
      if (!draftId) return false;
      const err = validate();
      if (err) {
        toast({ title: "Fix required fields", description: err, variant: "destructive" });
        return false;
      }

      const d = readDraft(draftId);
      const next = {
        ...d,
        personal_details: {
          ...(d?.personal_details ?? {}),
          photo_biometric: {
            photo_url: String(pb.photo_url || "").trim() || null,
            signature_url: String(pb.signature_url || "").trim() || null,
            stamp_url: String(pb.stamp_url || "").trim() || null,

            biometric_enrolled: !!pb.biometric_enrolled,
            biometric_enrollment_id: String(pb.biometric_enrollment_id || "").trim() || null,
            biometric_device_id: String(pb.biometric_device_id || "").trim() || null,
            enrolled_at: String(pb.enrolled_at || "").trim() || null,
            attendance_id: String(pb.attendance_id || "").trim() || null,

            notes: String(pb.notes || "").trim() || null,
          },
        },
      };
      writeDraft(draftId, next);
      setDirty(false);
      if (showToast) toast({ title: "Saved", description: "Photo & biometric details saved to draft." });
      return true;
    },
    [draftId, pb, validate]
  );

  const onSaveOnly = React.useCallback(() => {
    save(true);
  }, [save]);

  const onSaveAndNext = React.useCallback(() => {
    if (!save(true)) return;
    router.push(withDraftId("/infrastructure/staff/onboarding/review", draftId) as any);
  }, [draftId, router, save]);

  if (!draftId) {
    return (
      <OnboardingShell
        stepKey="photo-biometric"
        title="Photograph & biometric"
        description="Photo, signature and biometric enrollment (for attendance/access control)."
        footer={
          <div className="flex items-center justify-between">
            <Button variant="outline" className="border-zc-border" onClick={() => router.push("/infrastructure/staff/onboarding/start" as any)}
            >
              Back
            </Button>
          </div>
        }
      >
        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-4 text-sm text-zc-muted">
          Open this step with a draftId. Start onboarding from the Initiate step.
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      stepKey="photo-biometric"
      title="Photograph & biometric"
      description="Photo, signature and biometric enrollment (for attendance/access control)."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/financial", draftId) as any)}
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
            <div className="text-sm font-medium text-zc-foreground">Step: Photo &amp; Biometric</div>
            <div className="mt-1 text-xs text-zc-muted">
              Provide URLs to uploaded files (profile photo/signature). Biometric enrollment is optional.
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        <Card className={cn("border border-zc-border bg-zc-panel", loading ? "opacity-60" : "opacity-100")}>
          <CardHeader>
            <CardTitle className="text-sm">Photo & signature</CardTitle>
            <CardDescription>
              Upload to your file service, then paste the resulting URL here. During final submit we will create StaffDocuments and set pointers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Profile photo URL</Label>
              <Input value={String(pb.photo_url ?? "")} onChange={(e) => update("photo_url", e.target.value)} placeholder="https://files.../photo.jpg" />
              <div className="text-xs text-zc-muted">Recommended but not mandatory for draft.</div>
            </div>

            <div className="grid gap-2">
              <Label>Signature URL</Label>
              <Input value={String(pb.signature_url ?? "")} onChange={(e) => update("signature_url", e.target.value)} placeholder="https://files.../signature.png" />
            </div>

            <div className="grid gap-2">
              <Label>Stamp URL (optional)</Label>
              <Input value={String(pb.stamp_url ?? "")} onChange={(e) => update("stamp_url", e.target.value)} placeholder="https://files.../stamp.png" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("border border-zc-border bg-zc-panel", loading ? "opacity-60" : "opacity-100")}>
          <CardHeader>
            <CardTitle className="text-sm">Biometric enrollment</CardTitle>
            <CardDescription>Track biometric enrollment for attendance/access control systems.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between gap-3 rounded-md border border-zc-border bg-zc-panel/40 p-3">
              <div>
                <div className="text-sm font-medium text-zc-foreground">Enrolled</div>
                <div className="text-xs text-zc-muted">Turn on if the staff has been enrolled on biometric device.</div>
              </div>
              <Switch checked={!!pb.biometric_enrolled} onCheckedChange={(v) => update("biometric_enrolled", v)} />
            </div>

            {pb.biometric_enrolled ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Enrollment ID</Label>
                  <Input value={String(pb.biometric_enrollment_id ?? "")} onChange={(e) => update("biometric_enrollment_id", e.target.value)} placeholder="Device enrollment id" />
                </div>

                <div className="grid gap-2">
                  <Label>Device ID (optional)</Label>
                  <Input value={String(pb.biometric_device_id ?? "")} onChange={(e) => update("biometric_device_id", e.target.value)} placeholder="Device serial / hostname" />
                </div>

                <div className="grid gap-2">
                  <Label>Enrollment date</Label>
                  <Input type="date" value={String(pb.enrolled_at ?? "")} onChange={(e) => update("enrolled_at", e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label>Attendance ID (optional)</Label>
                  <Input value={String(pb.attendance_id ?? "")} onChange={(e) => update("attendance_id", e.target.value)} placeholder="Attendance system id" />
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-sm text-zc-muted">
                Optional: If your branch does not use biometrics yet, keep this off.
              </div>
            )}

            <div className="grid gap-2">
              <Label>Notes (optional)</Label>
              <Textarea value={String(pb.notes ?? "")} onChange={(e) => update("notes", e.target.value)} placeholder="Any notes about biometric/photo capture" />
            </div>
          </CardContent>
        </Card>
      </div>
    </OnboardingShell>
  );
}
