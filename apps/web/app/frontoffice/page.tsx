import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <AppShell title="Front Office">
      <Card>
        <CardHeader>
          <CardTitle>Front Office</CardTitle>
          <CardDescription>Registrations, appointments, and counter workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zc-muted">Coming next as we build modules.</div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
