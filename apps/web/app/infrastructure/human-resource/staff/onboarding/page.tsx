import { redirect } from "next/navigation";
import crypto from "crypto";

export default function OnboardingIndexPage({
  searchParams,
}: {
  searchParams?: { draftId?: string };
}) {
  const draftId = searchParams?.draftId || crypto.randomUUID();
  redirect(
    `/infrastructure/human-resource/staff/onboarding/personal?draftId=${encodeURIComponent(draftId)}`
  );
}
