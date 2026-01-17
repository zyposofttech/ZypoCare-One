import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <AppShell title="Billing & TPA">
      <Card>
        <CardHeader>
          <CardTitle>Billing & TPA</CardTitle>
          <CardDescription>
            Services catalog, invoices, payments, and insurance workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zc-muted">Coming next as we build modules.</div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
