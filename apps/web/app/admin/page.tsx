import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <AppShell title="Branch Admin">
      <Card>
        <CardHeader>
          <CardTitle>Branch Admin</CardTitle>
          <CardDescription>Branch-level setup and daily operations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zc-muted">Coming next as we build modules.</div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
