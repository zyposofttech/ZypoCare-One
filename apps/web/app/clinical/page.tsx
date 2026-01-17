import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <AppShell title="Clinical Workspace">
      <Card>
        <CardHeader>
          <CardTitle>Clinical Workspace</CardTitle>
          <CardDescription>Doctor workflows: patients, encounters, orders, prescriptions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zc-muted">Coming next as we build modules.</div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
