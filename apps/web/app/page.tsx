import { redirect } from "next/navigation";

export default function RootPage() {
  // Requirement: application entry must be login.
  redirect("/login" as any);
}
