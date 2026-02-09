"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";

import { Button } from "@/components/ui/button";

function withDraftId(href: string, draftId: string | null) {
  if (!draftId) return href;
  const u = new URL(href, "http://local");
  u.searchParams.set("draftId", draftId);
  return u.pathname + "?" + u.searchParams.toString();
}

export default function Page() {
  const router = useRouter();
  const sp = useSearchParams();

  // In this step, draftId is actually the created Staff.id (we keep the name for flow consistency).
  const staffId = sp.get("draftId");

  return (
    <OnboardingShell
      stepKey="done"
      title="Post-creation actions"
      description="Optional next steps after onboarding final submit."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId("/infrastructure/staff/onboarding/review", staffId) as any)}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="border-zc-border" disabled={!staffId} title={staffId ? "Open staff profile" : "Missing staff id"}>
              <Link href={(staffId ? `/infrastructure/staff/${encodeURIComponent(staffId)}` : "#") as any}>View Staff Profile</Link>
            </Button>
            <Button className="bg-zc-accent text-white hover:bg-zc-accent/90" onClick={() => router.push("/infrastructure/staff" as any)}>Return to Directory</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-4 text-sm text-zc-muted">
          <div className="font-medium text-zc-foreground">Onboarding finalized.</div>
          <div className="mt-1">You can now verify documents, complete credential checks, and configure assignments/schedules.</div>
          {staffId ? (
            <div className="mt-2 text-xs">Staff ID: <span className="font-mono">{staffId}</span></div>
          ) : (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">Staff ID missing in URL. If you refreshed, go back to Review and click Finalize again.</div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-zc-border bg-zc-panel p-4">
            <div className="text-sm font-medium text-zc-foreground">Next recommended</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zc-muted">
              <li>Verify identity documents and background checks</li>
              <li>Validate medical credentials and set verification status</li>
              <li>Confirm branch assignments, primary branch, and role bindings</li>
              <li>Enable system access and MFA if required</li>
            </ul>
          </div>

          <div className="rounded-md border border-zc-border bg-zc-panel p-4">
            <div className="text-sm font-medium text-zc-foreground">Common actions</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-zc-border" disabled={!staffId}>
                <Link href={(staffId ? `/infrastructure/staff/${encodeURIComponent(staffId)}#documents` : "#") as any}>Documents</Link>
              </Button>
              <Button asChild variant="outline" className="border-zc-border" disabled={!staffId}>
                <Link href={(staffId ? `/infrastructure/staff/${encodeURIComponent(staffId)}#credentials` : "#") as any}>Credentials</Link>
              </Button>
              <Button asChild variant="outline" className="border-zc-border" disabled={!staffId}>
                <Link href={(staffId ? `/infrastructure/staff/${encodeURIComponent(staffId)}#assignments` : "#") as any}>Assignments</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
