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

const cardHover =
  "transition-all hover:-translate-y-0.5 hover:shadow-elev-2 hover:brightness-105";

const cardTone = {
  indigo: "border-indigo-200/70 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20",
  sky: "border-sky-200/70 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20",
  emerald:
    "border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
  violet:
    "border-violet-200/70 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20",
  amber: "border-amber-200/70 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20",
  cyan: "border-cyan-200/70 bg-cyan-50/50 dark:border-cyan-900/50 dark:bg-cyan-950/20",
  zinc: "border-zc-border bg-zc-panel/20",
} as const;

const pillTone = {
  indigo:
    "border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-200",
  sky: "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200",
  emerald:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200",
  violet:
    "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-200",
  amber:
    "border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200",
  cyan: "border-cyan-200/70 bg-cyan-50/70 text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-950/25 dark:text-cyan-200",
  zinc: "border-zc-border bg-zc-panel/30 text-zc-muted",
} as const;

function StatCard({
  label,
  value,
  note,
  icon,
  glow,
  tone,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
  glow: string;
  tone: keyof typeof cardTone;
  delta?: string;
  deltaLabel?: string;
}) {
  return (
    <Card className={`${cardHover} ${cardTone[tone]} relative overflow-hidden`}>
      <div
        className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full ${glow} blur-3xl`}
      />
      <CardContent className="p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">
          {label}
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
        <div className="mt-2 flex items-center gap-2 text-sm text-zc-muted">
          <span>{note}</span>
          {delta ? (
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${pillTone[tone]}`}>
              {delta} {deltaLabel ?? ""}
            </span>
          ) : null}
        </div>

        <div className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/40 backdrop-blur">
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
    <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/70 p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] dark:border-indigo-900/50 dark:bg-indigo-950/25">
      <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{n}</div>
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

function LineChart({
  data,
  colorClass,
}: {
  data: number[];
  colorClass: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className={`h-28 w-full ${colorClass}`}>
      <line x1="0" y1="100" x2="100" y2="100" className="stroke-current/10" />
      <line x1="0" y1="50" x2="100" y2="50" className="stroke-current/10" />
      <polyline
        points={points}
        fill="none"
        className="stroke-current"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BarChart({
  data,
  colorClass,
}: {
  data: { label: string; value: number }[];
  colorClass: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="grid grid-cols-6 items-end gap-3">
      {data.map((item) => (
        <div key={item.label} className="text-center">
          <div className="flex h-24 items-end justify-center">
            <div
              className={`w-6 rounded-full ${colorClass}`}
              style={{ height: `${(item.value / max) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] font-semibold text-zc-muted">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  value,
  colorClass,
}: {
  value: number;
  colorClass: string;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 100 100" className={`h-40 w-40 ${colorClass}`}>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-zc-border/60"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-zc-text">{value}%</div>
          <div className="text-xs text-zc-muted">Beds occupied</div>
        </div>
      </div>
    </div>
  );
}

function SparkBars({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-16 items-end gap-1">
      {data.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="w-2 rounded-sm bg-indigo-400/60 dark:bg-indigo-300/60"
          style={{ height: `${(value / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

export default function Page() {
  const facilities = [
    {
      name: "ZypoCare Hospital",
      location: "Bengaluru, Karnataka",
      type: "Multi-specialty",
      beds: 420,
      departments: 18,
      status: "Operational",
      glow: "bg-indigo-200/70 dark:bg-indigo-500/20",
    },
    {
      name: "ZypoCare Women & Child",
      location: "Chennai, Tamil Nadu",
      type: "Mother & child",
      beds: 260,
      departments: 12,
      status: "Operational",
      glow: "bg-emerald-200/70 dark:bg-emerald-500/20",
    },
    {
      name: "ZypoCare City Trauma",
      location: "Hyderabad, Telangana",
      type: "Emergency & trauma",
      beds: 180,
      departments: 9,
      status: "Ramp-up",
      glow: "bg-cyan-200/70 dark:bg-cyan-500/20",
    },
  ];

  const branches = [
    {
      name: "North Campus",
      city: "Bengaluru",
      facilities: 3,
      staff: 420,
      glow: "bg-sky-200/70 dark:bg-sky-500/20",
    },
    {
      name: "South Campus",
      city: "Bengaluru",
      facilities: 2,
      staff: 290,
      glow: "bg-violet-200/70 dark:bg-violet-500/20",
    },
    {
      name: "Central Outreach",
      city: "Chennai",
      facilities: 4,
      staff: 360,
      glow: "bg-amber-200/70 dark:bg-amber-500/20",
    },
  ];

  const departments = [
    { name: "Cardiology", head: "Dr. Kavya N", status: "Stable", beds: 42 },
    { name: "Critical Care", head: "Dr. Riyaz T", status: "High load", beds: 28 },
    { name: "Radiology", head: "Dr. Hari S", status: "On schedule", beds: 12 },
    { name: "Orthopedics", head: "Dr. Asha K", status: "Stable", beds: 36 },
    { name: "Laboratory", head: "Dr. Nikhil R", status: "QA review", beds: 8 },
    { name: "Pediatrics", head: "Dr. Meera P", status: "Stable", beds: 30 },
  ];

  const totalBeds = facilities.reduce((sum, facility) => sum + facility.beds, 0);
  const totalDepartments = facilities.reduce(
    (sum, facility) => sum + facility.departments,
    0,
  );
  const totalBranches = branches.length;
  const totalStaff = branches.reduce((sum, branch) => sum + branch.staff, 0);
  const occupancyRate = 78;

  const kpis = [
    {
      label: "Facilities",
      value: `${facilities.length}`,
      note: `${totalBeds} beds, ${totalDepartments} depts`,
      icon: <IconBuilding className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />,
      glow: "bg-indigo-200/70 dark:bg-indigo-500/20",
      tone: "indigo",
      delta: "+2.4%",
      deltaLabel: "vs last week",
    },
    {
      label: "Departments",
      value: `${departments.length}`,
      note: "Core services tracked today",
      icon: <IconClipboard className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />,
      glow: "bg-emerald-200/70 dark:bg-emerald-500/20",
      tone: "emerald",
      delta: "+1",
      deltaLabel: "new",
    },
    {
      label: "Branches",
      value: `${totalBranches}`,
      note: "Regional campuses",
      icon: <IconShield className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />,
      glow: "bg-cyan-200/70 dark:bg-cyan-500/20",
      tone: "cyan",
      delta: "Stable",
    },
    {
      label: "Staff",
      value: `${totalStaff}`,
      note: "Doctors, nursing, ops",
      icon: <IconUsers className="h-5 w-5 text-violet-600 dark:text-violet-300" />,
      glow: "bg-violet-200/70 dark:bg-violet-500/20",
      tone: "violet",
      delta: "+12",
      deltaLabel: "hires",
    },
    {
      label: "Bed Occupancy",
      value: `${occupancyRate}%`,
      note: "Last 7 days average",
      icon: <IconBuilding className="h-5 w-5 text-amber-600 dark:text-amber-300" />,
      glow: "bg-amber-200/70 dark:bg-amber-500/20",
      tone: "amber",
      delta: "+4.2%",
      deltaLabel: "trend",
    },
    {
      label: "OT Utilization",
      value: "64%",
      note: "Across 12 theaters",
      icon: <IconShield className="h-5 w-5 text-sky-600 dark:text-sky-300" />,
      glow: "bg-sky-200/70 dark:bg-sky-500/20",
      tone: "sky",
      delta: "-1.8%",
      deltaLabel: "trend",
    },
  ];

  const admissionsTrend = [120, 138, 151, 146, 168, 180, 192, 175, 210, 220];
  const billingTrend = [1.2, 1.4, 1.35, 1.5, 1.7, 1.9, 2.1, 2.05, 2.3, 2.45];
  const departmentLoad = [
    { label: "Card", value: 78 },
    { label: "ICU", value: 92 },
    { label: "RAD", value: 64 },
    { label: "ORTH", value: 71 },
    { label: "LAB", value: 56 },
    { label: "PED", value: 69 },
  ];
  const alerts = [
    {
      title: "ICU load exceeds 90%",
      note: "Critical Care - shift review recommended",
      status: "High",
    },
    {
      title: "Lab QA review pending",
      note: "Laboratory - 6 reports awaiting sign-off",
      status: "Medium",
    },
    {
      title: "Inventory reorder threshold hit",
      note: "Pharmacy - 4 items below minimum",
      status: "Low",
    },
  ] as const;
  const alertTone: Record<string, string> = {
    High: pillTone.amber,
    Medium: pillTone.indigo,
    Low: pillTone.emerald,
  } as const;
  const revenueMix = [
    { label: "IPD", value: 42 },
    { label: "OPD", value: 28 },
    { label: "Diagnostics", value: 16 },
    { label: "Pharmacy", value: 14 },
  ];
  const waitTimes = [
    { label: "OPD", value: 28 },
    { label: "ER", value: 14 },
    { label: "Lab", value: 22 },
    { label: "Imaging", value: 18 },
    { label: "Discharge", value: 35 },
  ];
  const topDepartments = [
    { name: "Cardiology", revenue: "1.2 Cr", cases: 182, csat: "4.7" },
    { name: "Orthopedics", revenue: "0.9 Cr", cases: 156, csat: "4.5" },
    { name: "Radiology", revenue: "0.7 Cr", cases: 298, csat: "4.6" },
    { name: "Pediatrics", revenue: "0.6 Cr", cases: 134, csat: "4.8" },
  ];
  const otSchedule = [
    { room: "OT-01", team: "Cardiac", time: "09:30-12:00", status: "Active" },
    { room: "OT-02", team: "Ortho", time: "11:00-13:30", status: "Prep" },
    { room: "OT-03", team: "Neuro", time: "14:00-16:00", status: "Planned" },
  ];
  const liveAdmissions = [
    { name: "Aarav P", dept: "Cardiology", eta: "8 min", status: "ER triage" },
    { name: "Megha S", dept: "Ortho", eta: "14 min", status: "Inbound" },
    { name: "Imran K", dept: "Neuro", eta: "22 min", status: "Critical" },
  ];
  const billingSpark = billingTrend.map((value) => Math.round(value * 10));
  const highAlerts = alerts.filter((alert) => alert.status === "High").length;

  return (
    <AppShell title="Superadmin HQ">
      <div className="relative grid gap-6 overflow-x-hidden">
        <div className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-900/30" />
        <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/30" />
        {/* Command Deck */}
        <Card className={`${cardHover} ${cardTone.indigo} relative overflow-hidden`}>
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-900/30" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/30" />
          <CardContent className="p-8">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full border px-3 py-1 font-semibold ${pillTone.indigo}`}>
                    Live network
                  </span>
                  <span className={`rounded-full border px-3 py-1 ${pillTone.sky}`}>
                    Rolling 7 days
                  </span>
                  <span className={`rounded-full border px-3 py-1 ${pillTone.zinc}`}>
                    All branches
                  </span>
                </div>
                <div className="mt-4 text-4xl font-semibold tracking-tight">
                  Superadmin HQ
                </div>
                <div className="mt-3 max-w-2xl text-sm leading-6 text-zc-muted">
                  A command deck for facilities, branches, staffing, and capacity. Built
                  to scale into a live network brain.
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button asChild variant="primary" className="px-5">
                    <Link href="/admin/facility">Facility / Hospital Profile</Link>
                  </Button>
                  <Button asChild variant="outline" className="px-5">
                    <Link href="/admin/departments">Departments</Link>
                  </Button>
                  <Button
                    asChild
                    className="px-5 border border-amber-200/70 bg-amber-50/70 text-amber-900 hover:bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200"
                  >
                    <Link href="/admin/staff">Hospital Staff</Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={`rounded-2xl border p-4 ${pillTone.indigo}`}>
                  <div className="text-xs font-semibold uppercase">Bed occupancy</div>
                  <div className="mt-3 text-3xl font-semibold text-zc-text">
                    {occupancyRate}%
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-indigo-100/80 dark:bg-indigo-900/40">
                    <div
                      className="h-2 rounded-full bg-indigo-500/70"
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                </div>
                <div className={`rounded-2xl border p-4 ${pillTone.sky}`}>
                  <div className="text-xs font-semibold uppercase">Toal Revenue</div>
                  <div className="mt-3 text-3xl font-semibold text-zc-text">6.1 Cr</div>
                  <div className="mt-3">
                    <SparkBars data={billingSpark} />
                  </div>
                </div>
                <div className={`rounded-2xl border p-4 ${pillTone.amber}`}>
                  <div className="text-xs font-semibold uppercase">Critical Alerts</div>
                  <div className="mt-3 text-3xl font-semibold text-zc-text">
                    {alerts.length}
                  </div>
                  <div className="mt-2 text-xs text-zc-muted">
                    {highAlerts} critical escalations
                  </div>
                </div>
                <div className={`rounded-2xl border p-4 ${pillTone.emerald}`}>
                  <div className="text-xs font-semibold uppercase">Branch coverage</div>
                  <div className="mt-3 text-3xl font-semibold text-zc-text">
                    {totalBranches}
                  </div>
                  <div className="mt-2 text-xs text-zc-muted">
                    {totalStaff} staff live
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Tiles */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              note={kpi.note}
              icon={kpi.icon}
              glow={kpi.glow}
              tone={kpi.tone as keyof typeof cardTone}
              delta={kpi.delta}
              deltaLabel={kpi.deltaLabel}
            />
          ))}
        </div>

        {/* Signal Lab */}
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Card className={`${cardHover} ${cardTone.indigo}`}>
            <CardContent className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-base font-semibold">Signal Lab</div>
                  <div className="mt-1 text-sm text-zc-muted">
                    Admissions, billing, and department utilization signals.
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${pillTone.indigo}`}>
                  Updated 2 min ago
                </span>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className={`rounded-2xl border p-4 ${cardTone.sky}`}>
                  <div className="text-xs font-semibold uppercase text-zc-muted">
                    Admissions
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-zc-text">1,822</div>
                  <LineChart data={admissionsTrend} colorClass="text-indigo-500 dark:text-indigo-300" />
                </div>
                <div className={`rounded-2xl border p-4 ${cardTone.cyan}`}>
                  <div className="text-xs font-semibold uppercase text-zc-muted">
                    Billing (Cr)
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-zc-text">2.45</div>
                  <LineChart data={billingTrend} colorClass="text-sky-500 dark:text-sky-300" />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
                <div className="flex items-center justify-between text-xs text-zc-muted">
                  <span>Department load</span>
                  <span className="font-semibold text-zc-text">Peak 92%</span>
                </div>
                <div className="mt-4">
                  <BarChart data={departmentLoad} colorClass="bg-emerald-400/70 dark:bg-emerald-300/60" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardHover} ${cardTone.violet}`}>
            <CardContent className="p-6">
              <div className="text-base font-semibold">Capacity and Revenue</div>
              <div className="mt-2 text-sm text-zc-muted">
                Live occupancy and revenue mix across service lines.
              </div>
              <div className="mt-6 flex flex-col items-center gap-6">
                <DonutChart value={occupancyRate} colorClass="text-amber-500 dark:text-amber-300" />
                <div className="grid w-full gap-2">
                  {revenueMix.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-violet-200/70 bg-violet-50/70 px-3 py-2 text-xs dark:border-violet-900/50 dark:bg-violet-950/25"
                    >
                      <span className="text-zc-muted">{item.label}</span>
                      <span className="font-semibold text-zc-text">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase text-zc-muted">
                  Wait time pulse
                </div>
                <div className="mt-3 grid gap-3">
                  {waitTimes.map((item) => (
                    <div key={item.label} className="grid gap-2">
                      <div className="flex items-center justify-between text-xs text-zc-muted">
                        <span>{item.label}</span>
                        <span className="font-semibold text-zc-text">
                          {item.value}m
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zc-panel/30">
                        <div
                          className="h-2 rounded-full bg-cyan-400/70 dark:bg-cyan-300/60"
                          style={{ width: `${item.value + 20}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operations */}
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card className={`${cardHover} ${cardTone.zinc}`}>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-base font-semibold">Facilities Snapshot</div>
                  <div className="mt-2 text-sm text-zc-muted">
                    Capacity, departments, and operational status overview.
                  </div>
                </div>
                <Button asChild variant="primary" className="self-start px-5">
                  <Link href="/admin/facility">Manage Facilities</Link>
                </Button>
              </div>
              <div className="mt-6 grid gap-3">
                {facilities.map((facility) => (
                  <div
                    key={facility.name}
                    className="flex flex-col gap-2 rounded-2xl border border-zc-border bg-zc-panel/35 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold">{facility.name}</div>
                      <div className="text-xs text-zc-muted">{facility.location}</div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-zc-muted">
                      <span className={`rounded-full border px-3 py-1 ${pillTone.indigo}`}>
                        {facility.status}
                      </span>
                      <span>{facility.beds} beds</span>
                      <span>{facility.departments} depts</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardHover} ${cardTone.zinc}`}>
            <CardContent className="p-6">
              <div className="text-base font-semibold">Live Alerts</div>
              <div className="mt-2 text-sm text-zc-muted">
                System health and operational blockers.
              </div>
              <div className="mt-5 grid gap-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.title}
                    className="rounded-2xl border border-zc-border bg-zc-panel/35 p-4"
                  >
                    <div className="flex items-center justify-between text-xs text-zc-muted">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${alertTone[alert.status as keyof typeof alertTone]}`}>
                        {alert.status}
                      </span>
                      <span>Now</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold">{alert.title}</div>
                    <div className="mt-2 text-xs text-zc-muted">{alert.note}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/integrations">
                    Open Integrations Console
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Tables */}
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card className={`${cardHover} ${cardTone.violet}`}>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-base font-semibold">Top Departments</div>
                  <div className="mt-2 text-sm text-zc-muted">
                    Revenue, cases, and satisfaction.
                  </div>
                </div>
                <Button asChild variant="outline" className="self-start px-5">
                  <Link href="/admin/departments">View All</Link>
                </Button>
              </div>
              <div className="mt-6 grid gap-3">
                {topDepartments.map((dept) => (
                  <div
                    key={dept.name}
                    className="grid gap-3 rounded-2xl border border-violet-200/70 bg-violet-50/70 p-4 md:grid-cols-4 dark:border-violet-900/50 dark:bg-violet-950/25"
                  >
                    <div>
                      <div className="text-sm font-semibold">{dept.name}</div>
                      <div className="text-xs text-zc-muted">CSAT {dept.csat}</div>
                    </div>
                    <div className="text-xs text-zc-muted">
                      Revenue
                      <div className="mt-1 text-sm font-semibold text-zc-text">
                        {dept.revenue}
                      </div>
                    </div>
                    <div className="text-xs text-zc-muted">
                      Cases
                      <div className="mt-1 text-sm font-semibold text-zc-text">
                        {dept.cases}
                      </div>
                    </div>
                    <div className="text-xs text-zc-muted">
                      Trend
                      <SparkBars data={[6, 9, 7, 10, 8, 12, 11]} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardHover} ${cardTone.cyan}`}>
            <CardContent className="p-6">
              <div className="text-base font-semibold">Live Admissions</div>
              <div className="mt-2 text-sm text-zc-muted">
                Incoming patients in queue.
              </div>
              <div className="mt-5 grid gap-4">
                {liveAdmissions.map((admission) => (
                  <div
                    key={admission.name}
                    className="rounded-2xl border border-cyan-200/70 bg-cyan-50/70 p-4 dark:border-cyan-900/50 dark:bg-cyan-950/25"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{admission.name}</span>
                      <span className="text-xs text-zc-muted">{admission.eta}</span>
                    </div>
                    <div className="mt-2 text-xs text-zc-muted">
                      {admission.dept} - {admission.status}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <Button asChild variant="primary" className="w-full">
                  <Link href="/admin/staff">Assign Staff</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OT Schedule */}
        <Card className={`${cardHover} ${cardTone.emerald}`}>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-base font-semibold">OT Schedule</div>
                <div className="mt-2 text-sm text-zc-muted">
                  Theater utilization and teams on deck.
                </div>
              </div>
              <Button asChild variant="outline" className="self-start px-5">
                <Link href="/admin/facility">Manage OT</Link>
              </Button>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {otSchedule.map((slot) => (
                <div
                  key={slot.room}
                  className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25"
                >
                  <div className="text-sm font-semibold">{slot.room}</div>
                  <div className="mt-1 text-xs text-zc-muted">{slot.time}</div>
                  <div className="mt-3 text-xs text-zc-muted">
                    Team
                    <div className="mt-1 text-sm font-semibold text-zc-text">
                      {slot.team}
                    </div>
                  </div>
                  <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${pillTone.emerald}`}>
                    {slot.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Command Lane */}
        <Card className={`${cardHover} ${cardTone.indigo} overflow-hidden`}>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <span className="grid h-9 w-9 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                    <IconShield className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  </span>
                  Command Lane
                </div>
                <div className="mt-2 text-sm text-zc-muted">
                  Execute the infrastructure rollout in the recommended sequence.
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
                body="Facility, departments, specialties, wards and beds, OT setup, laboratories, instruments, assets."
                href="/admin/facility"
              />
              <StepCard
                n="2"
                title="Set People and Access"
                body="Hospital staff directory, staff assignments, app users, roles and permissions."
                href="/admin/staff"
              />
              <StepCard
                n="3"
                title="Validate Integrations"
                body="Messaging, payments, LIS/PACS - run test actions and track readiness."
                href="/admin/integrations"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
