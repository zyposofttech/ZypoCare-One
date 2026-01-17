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
    <AppShell title="Diagnostics">
      <Card>
        <CardHeader>
          <CardTitle>Diagnostics</CardTitle>
          <CardDescription>
            Lab orders, results, instruments, and reporting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zc-muted">Coming next as we build modules.</div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
