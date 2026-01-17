import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <AppShell title="Nursing Workspace">
      <Card>
        <CardHeader>
          <CardTitle>Nursing Workspace</CardTitle>
          <CardDescription>
            Ward operations: vitals, notes, medication administration, bed status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zc-muted">Coming next as we build modules.</div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
