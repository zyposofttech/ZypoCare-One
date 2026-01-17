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
    <AppShell title="Operations">
      <Card>
        <CardHeader>
          <CardTitle>Operations</CardTitle>
          <CardDescription>
            Facility ops, maintenance, and general workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zc-muted">Coming next as we build modules.</div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
