"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { IconChevronRight, IconUsers } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { cn } from "@/lib/cn";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Plus,
  ShieldCheck,
  Users2,
} from "lucide-react";

type TileBadge = "Core" | "Planned";

type Tile = {
  title: string;
  desc: string;
  href: string;
  badge: TileBadge;
  icon: React.ReactNode;
};

const badgeTone: Record<TileBadge, string> = {
  Core: "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
  Planned: "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-200",
};

const tiles: Tile[] = [
  {
    title: "Staff Directory",
    desc: "Create staff profiles, manage assignments, credentials, and system access.",
    href: "/infrastructure/human-resource/staff",
    badge: "Core",
    icon: <Users2 className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Roster",
    desc: "Shift schedules, duty rosters, and coverage planning.",
    href: "/infrastructure/human-resource/roster",
    badge: "Planned",
    icon: <CalendarClock className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Attendance",
    desc: "Attendance events, exceptions, and integrations with biometric devices.",
    href: "/infrastructure/human-resource/attendance",
    badge: "Planned",
    icon: <ClipboardCheck className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Leaves",
    desc: "Leave requests, approvals, balances, and policy enforcement.",
    href: "/infrastructure/human-resource/leaves",
    badge: "Planned",
    icon: <ClipboardList className="h-4 w-4 text-zc-accent" />,
  },
  {
    title: "Separation",
    desc: "Offboarding processes and access revocation.",
    href: "/infrastructure/human-resource/separation",
    badge: "Planned",
    icon: <ShieldCheck className="h-4 w-4 text-zc-accent" />,
  },
];

function StatusPill({ status }: { status: TileBadge }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]", badgeTone[status])}>
      {status}
    </span>
  );
}

function ModuleCard({ title, desc, href, badge, icon }: Tile) {
  return (
    <Link href={href as any} className="block">
      <div className="group rounded-2xl border border-zc-border bg-zc-panel/20 p-4 transition-all hover:-translate-y-0.5 hover:bg-zc-panel/35 hover:shadow-elev-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-zc-border bg-zc-panel/25">
                {icon}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zc-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {title}
                </div>
                <div className="mt-1 text-sm text-zc-muted">{desc}</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill status={badge} />
            </div>
          </div>

          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition-colors group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50">
            <IconChevronRight className="h-4 w-4 text-zc-muted transition-all group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HumanResourceOverviewPage() {
  return (
    <AppShell title="Infrastructure - Human Resource">
      <RequirePerm perm="STAFF_READ">
        <div className="grid gap-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <IconUsers className="h-5 w-5 text-zc-accent" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-3xl font-semibold tracking-tight">Human Resource</div>
                 
                </div>
                <div className="mt-1 text-sm text-zc-muted">
                 Manage Etire Hospital staff, onboarding, roster, attendance, leaves and separation processes.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild className="bg-zc-accent text-white hover:bg-zc-accent/90 px-5 gap-2">
                <Link href="/infrastructure/human-resource/staff/onboarding/start">
                  <Plus className="h-4 w-4" />
                  Start Onboarding
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-zc-border px-5 gap-2">
                <Link href="/infrastructure/human-resource/staff">
                  <Users2 className="h-4 w-4" />
                  Open Directory
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tiles.map((t) => (
              <ModuleCard key={t.href} {...t} />
            ))}
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">How It Works</CardTitle>
              <CardDescription className="text-sm">
                The Human Resource module provides a comprehensive suite of tools to manage hospital staff effectively. Start with the Staff Directory to create profiles, manage assignments, credentials, and system access. Then, utilize the Roster for shift scheduling and coverage planning, track Attendance with event logging and biometric integrations, handle Leaves with requests and approvals, and ensure compliance with Training requirements. 
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 text-sm text-zc-muted">
              <ul className="list-disc space-y-2 pl-5">
                <li>Staff Directory list (filters, statuses, quick actions)</li>
                <li>Onboarding Wizard with Save-as-draft</li>
                <li>Staff Profile (Overview, Assignments, Credentials, System Access, Roles, Audit)</li>
                <li>Then: roster, attendance, leaves, training, appraisals, separation</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </RequirePerm>
    </AppShell>
  );
}
