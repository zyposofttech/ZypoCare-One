"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { AppLink as Link } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { AlertTriangle, ArrowLeft, ExternalLink, Package } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type PackageStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "RETIRED";

type ChargeMasterItemRow = {
  id: string;
  code: string;
  name: string;
  chargeUnit?: string | null;
  isActive?: boolean;
};

type ServicePackageItemRow = {
  id: string;
  packageId: string;
  chargeMasterItemId: string;
  chargeMasterItem?: ChargeMasterItemRow | null;
  qty: number;
  isIncluded: boolean;
  isOptional: boolean;
  sortOrder: number;
  overrides?: any;
  createdAt?: string;
  updatedAt?: string;
};

type ServicePackageRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  description?: string | null;
  status: PackageStatus;
  version: number;
  pricingModel?: "INCLUSIVE" | "EXCLUSIVE" | null;
  capAmount?: number | null;
  discountPercent?: number | null;
  taxTreatment?: "PACKAGE_LEVEL" | "ITEM_LEVEL" | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
  items?: ServicePackageItemRow[];
  createdAt?: string;
  updatedAt?: string;
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function statusBadge(status: PackageStatus) {
  switch (status) {
    case "PUBLISHED":
      return <Badge variant="ok">PUBLISHED</Badge>;
    case "APPROVED":
      return <Badge variant="secondary">APPROVED</Badge>;
    case "IN_REVIEW":
      return <Badge variant="warning">IN REVIEW</Badge>;
    case "RETIRED":
      return <Badge variant="destructive">RETIRED</Badge>;
    default:
      return <Badge variant="secondary">DRAFT</Badge>;
  }
}

export default function ServicePackageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const [loading, setLoading] = React.useState(true);
  const [row, setRow] = React.useState<ServicePackageRow | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setErr(null);
    apiFetch<ServicePackageRow>(
      `/api/infrastructure/service-packages/${encodeURIComponent(id)}?includeItems=true`,
    )
      .then((res) => {
        if (!mounted) return;
        setRow(res || null);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setErr(e?.message || "Failed to load package");
        setRow(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const items = row?.items || [];
  const included = items.filter((i) => i.isIncluded).length;
  const optional = items.filter((i) => i.isOptional).length;

  return (
    <AppShell title="Infrastructure • Service Packages • Details">
      <RequirePerm perm="INFRA_SERVICE_PACKAGE_READ">
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push("/infrastructure/service-packages")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Packages
          </Button>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load package</CardTitle>
                  <CardDescription className="mt-1">{err}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        {loading ? (
          <Card className="border-zc-border">
            <CardHeader className="py-4">
              <CardTitle className="text-base">Loading package…</CardTitle>
              <CardDescription>Fetching details and items.</CardDescription>
            </CardHeader>
          </Card>
        ) : row ? (
          <Card className="border-zc-border">
            <CardHeader className="py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="text-base">
                    <span className="font-mono">{row.code}</span> • {row.name}
                  </CardTitle>
                  <CardDescription>
                    {statusBadge(row.status)} <span className="mx-2 text-zc-muted">•</span>
                    Version: <span className="font-semibold text-zc-text">v{row.version ?? 1}</span>{" "}
                    <span className="mx-2 text-zc-muted">•</span>
                    Model: <span className="font-semibold text-zc-text">{row.pricingModel || "—"}</span>{" "}
                    <span className="mx-2 text-zc-muted">•</span>
                    Tax: <span className="font-semibold text-zc-text">{row.taxTreatment || "—"}</span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-zc-muted">
                  <Package className="h-4 w-4 text-zc-accent" />
                  Package details
                </div>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4">
              {row.description ? (
                <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4 text-sm text-zc-muted">{row.description}</div>
              ) : (
                <div className="rounded-xl border border-dashed border-zc-border bg-zc-panel/5 p-4 text-sm text-zc-muted">
                  No description. Add one so admins know what the bundle covers.
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="text-xs font-semibold text-zc-muted">Effective window</div>
                  <div className="mt-1 text-sm text-zc-muted">
                    {fmtDateTime(row.effectiveFrom)} → {fmtDateTime(row.effectiveTo || null)}
                  </div>
                  <div className="mt-2 text-xs text-zc-muted">Active: {row.isActive === false ? "No" : "Yes"}</div>
                </div>

                <div className="rounded-xl border border-zc-border bg-zc-panel/10 p-4">
                  <div className="text-xs font-semibold text-zc-muted">Pricing rules</div>
                  <div className="mt-1 text-sm text-zc-muted">
                    Cap: <span className="font-semibold text-zc-text">{row.capAmount ?? "—"}</span>{" "}
                    <span className="mx-2 text-zc-muted">•</span>
                    Discount%: <span className="font-semibold text-zc-text">{row.discountPercent ?? "—"}</span>
                  </div>
                  <div className="mt-2 text-xs text-zc-muted">
                    Note: enforcement happens in billing + GoLive checks (tax active, charge unit aligned, tariff coverage).
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-zc-text">Items</div>
                  <div className="text-sm text-zc-muted">
                    Total: {items.length} • Included: {included} • Optional: {optional}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <Link href="/infrastructure/charge-master">
                      Charge Master <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <Link href="/infrastructure/tariff-plans">
                      Tariff Plans <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-zc-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Charge Master</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[90px]">Qty</TableHead>
                      <TableHead className="w-[110px]">Included</TableHead>
                      <TableHead className="w-[110px]">Optional</TableHead>
                      <TableHead className="w-[90px]">Sort</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <div className="flex items-center justify-center gap-2 py-10 text-sm text-zc-muted">
                            <AlertTriangle className="h-4 w-4 text-zc-warn" />
                            No items yet. Use Manage Items in the workspace.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {it.chargeMasterItem?.code || it.chargeMasterItemId}
                          </TableCell>
                          <TableCell className="text-sm text-zc-muted">{it.chargeMasterItem?.name || "—"}</TableCell>
                          <TableCell className="text-sm text-zc-muted">{it.qty ?? 1}</TableCell>
                          <TableCell>{it.isIncluded ? <Badge variant="ok">YES</Badge> : <Badge variant="secondary">NO</Badge>}</TableCell>
                          <TableCell>{it.isOptional ? <Badge variant="warning">YES</Badge> : <Badge variant="secondary">NO</Badge>}</TableCell>
                          <TableCell className="text-sm text-zc-muted">{it.sortOrder ?? 0}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
          </RequirePerm>
</AppShell>
  );
}
