import { AppLink as Link } from "@/components/app-link";
import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  IconBuilding,
  IconClipboard,
  IconChevronRight,
  IconShield,
  IconUsers,
} from "@/components/icons";

function StatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
          {label}
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
        <div className="mt-2 text-sm text-zc-muted">{note}</div>

        <div className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function StepCard({
  n,
  title,
  body,
  href,
}: {
  n: string;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
      <div className="text-sm font-semibold text-zc-accent">{n}</div>
      <div className="mt-3 text-base font-semibold tracking-tight text-zc-text">
        {title}
      </div>
      <div className="mt-3 text-sm leading-6 text-zc-muted">{body}</div>
      <div className="mt-5">
        <Button asChild variant="ghost" className="px-0 text-zc-text hover:bg-transparent">
          <Link href={href}>
            Continue <IconChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell title="Admin Dashboard">
      <div className="grid gap-6">
        {/* Page header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-4xl font-semibold tracking-tight">Admin Dashboard</div>
            <div className="mt-3 max-w-2xl text-sm leading-6 text-zc-muted">
              A comfort-first command center for hospital operations, integrations, and
              enterprise-grade governance.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="info" className="px-5">
              <Link href="/admin/facility">Facility / Hospital Profile</Link>
            </Button>
            <Button asChild variant="warning" className="px-5">
              <Link href="/admin/departments">Departments</Link>
            </Button>
            <Button
              asChild
              variant="success"
            >
              <Link href="/admin/staff">Hospital Staff</Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Facility"
            value="ZypoCare Hosp…"
            note="Bengaluru, Karnataka"
            icon={<IconBuilding className="h-5 w-5 text-zc-accent" />}
          />
          <StatCard
            label="Departments"
            value="32"
            note="Clinical + diagnostics + allied"
            icon={<IconClipboard className="h-5 w-5 text-zc-accent" />}
          />
          <StatCard
            label="Specialties"
            value="12"
            note="Assigned to departments"
            icon={<IconShield className="h-5 w-5 text-zc-accent" />}
          />
          <StatCard
            label="Staff"
            value="28"
            note="Doctors + nursing + operations"
            icon={<IconUsers className="h-5 w-5 text-zc-accent" />}
          />
        </div>

        {/* Tour */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <span className="grid h-9 w-9 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                    <IconShield className="h-4 w-4 text-zc-accent" />
                  </span>
                  Admin Tour
                </div>
                <div className="mt-2 text-sm text-zc-muted">
                  Set up foundations, access control, and integrations in the right order.
                </div>
              </div>

              <Button asChild variant="primary" className="self-start px-5">
                <Link href="/admin/integrations">Open Integrations</Link>
              </Button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <StepCard
                n="1"
                title="Configure Infrastructure"
                body="Facility, departments, specialties, wards & beds, OT setup, laboratories, instruments & assets."
                href="/admin/facility"
              />
              <StepCard
                n="2"
                title="Set People & Access"
                body="Hospital staff directory, staff assignments, app users, roles & permissions (enterprise IAM grid)."
                href="/admin/staff"
              />
              <StepCard
                n="3"
                title="Validate Integrations"
                body="Messaging, payments, LIS/PACS — run test actions and track readiness from the dashboard."
                href="/admin/integrations"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}