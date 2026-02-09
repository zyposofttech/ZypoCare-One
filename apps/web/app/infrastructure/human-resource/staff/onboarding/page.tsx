import { redirect } from "next/navigation";

export default function Page() {
  redirect("/infrastructure/staff/onboarding/start" as any);
}
