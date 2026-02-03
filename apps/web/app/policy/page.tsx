"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { IconShield, IconClipboard, IconUsers } from "@/components/icons";
import { AlertTriangle, RefreshCw, FileText, CheckCircle2, History, Notebook } from "lucide-react";

type Stats = {
  totalPolicies: number;
  pendingApprovals: number;
  recentEvents: number;
};

export default function SuperAdminPolicyLandingPage() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const s = await apiFetch<Stats>("/api/governance/summary");
      setStats(s);
    } catch (e: any) {
      setStats({ totalPolicies: 0, pendingApprovals: 0, recentEvents: 0 });
      // Keep UI stable + show banner
      setErr(e?.message || "Failed to load governance summary");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  return (
    <AppShell title="Policy Governance">
      <RequirePerm perm="GOV_POLICY_READ">
      <div className="grid gap-6">
        {/* ✅ MATCHED HEADER (like attached page.tsx) */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Notebook className="h-5 w-5 text-zc-accent" />
            </span>
            <div>
              <div className="text-3xl font-semibold tracking-tight">Policy Governance</div>
              <div className="mt-1 text-sm text-zc-muted">
                Configure, approve, and audit hospital policies. Super Admin can view effective policy per branch.
              </div>
            </div>
          </div>

          {/* ✅ MATCHED BUTTONS (px-5, no rounded-full) */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void load()} className="px-5">
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button asChild variant="primary" className="px-5">
              <Link href="/policy/policies">
                <FileText className="h-4 w-4" />
                Open Policies
              </Link>
            </Button>
          </div>
        </div>

        {/* Error banner (same as attached) */}
        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* ✅ STATS ROW (keeps your toned KPI cards, but in the attached layout position) */}
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="Policies" value={stats?.totalPolicies ?? "—"} icon={<FileText className="h-4 w-4" />} tone="blue" />
          <KpiCard
            label="Pending approvals"
            value={stats?.pendingApprovals ?? "—"}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="amber"
          />
          <KpiCard
            label="Recent audit events"
            value={stats?.recentEvents ?? "—"}
            icon={<History className="h-4 w-4" />}
            tone="violet"
          />
        </div>

        {/* ✅ WORKBENCH CARD (same structure as attached page.tsx) */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-base font-semibold">
              <span className="grid h-9 w-9 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
                <IconShield className="h-4 w-4 text-zc-accent" />
              </span>
              Governance Workbench
            </div>

            <div className="mt-2 text-sm text-zc-muted">
              Manage policy lifecycle end-to-end: versions, approvals, audit evidence, and branch overrides.
            </div>

            <Separator className="my-6 bg-zc-border" />

            <div className="grid gap-4 lg:grid-cols-3">
              <QuickLink
                title="Policies"
                desc="View policies, install presets, create versions, and check effective policy by branch."
                href="/policy/policies"
                icon={<IconClipboard className="h-5 w-5" />}
                tone="blue"
              />
              <QuickLink
                title="Approvals"
                desc="Approve / reject policy changes and branch override proposals."
                href="/policy/approvals"
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="amber"
              />
              <QuickLink
                title="Audit"
                desc="Full audit trail of policy edits, submissions, and approvals."
                href="/policy/audit"
                icon={<IconUsers className="h-5 w-5" />}
                tone="violet"
              />
            </div>
          </CardContent>
        </Card>
      </div>
          </RequirePerm>
</AppShell>
  );
}

/* ---------- Styles Configuration (your tones kept) ---------- */

const TONES = {
  blue: {
    bg: "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/10 dark:hover:bg-blue-950/20",
    border: "border-blue-200/60 hover:border-blue-300 dark:border-blue-900/50",
    iconBox: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    text: "text-blue-950 dark:text-blue-100",
    kpiBg: "bg-gradient-to-br from-white to-blue-50/80 dark:from-zc-card dark:to-blue-950/20",
  },
  amber: {
    bg: "bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/10 dark:hover:bg-amber-950/20",
    border: "border-amber-200/60 hover:border-amber-300 dark:border-amber-900/50",
    iconBox: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    text: "text-amber-950 dark:text-amber-100",
    kpiBg: "bg-gradient-to-br from-white to-amber-50/80 dark:from-zc-card dark:to-amber-950/20",
  },
  violet: {
    bg: "bg-violet-50/50 hover:bg-violet-50 dark:bg-violet-950/10 dark:hover:bg-violet-950/20",
    border: "border-violet-200/60 hover:border-violet-300 dark:border-violet-900/50",
    iconBox: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    text: "text-violet-950 dark:text-violet-100",
    kpiBg: "bg-gradient-to-br from-white to-violet-50/80 dark:from-zc-card dark:to-violet-950/20",
  },
};

type Tone = keyof typeof TONES;

/* ---------- Sub-components (your KPI + tiles kept) ---------- */

function KpiCard({
  label,
  value,
  icon,
  tone = "blue",
}: {
  label: string;
  value: any;
  icon: React.ReactNode;
  tone?: Tone;
}) {
  const styles = TONES[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:shadow-sm",
        styles.border,
        styles.kpiBg
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-zc-muted/80">{label}</div>
        <div className={cn("rounded-lg p-1.5", styles.iconBox)}>{icon}</div>
      </div>
      <div className={cn("mt-3 text-3xl font-bold tracking-tight", styles.text)}>{value}</div>
    </div>
  );
}

function QuickLink({
  title,
  desc,
  href,
  icon,
  tone = "blue",
}: {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  tone?: Tone;
}) {
  const styles = TONES[tone];

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border p-5 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-md",
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 shadow-sm transition-transform duration-300 group-hover:scale-110",
            styles.iconBox
          )}
        >
          {icon}
        </div>

        <div className={cn("opacity-0 transition-all duration-300 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0", styles.text)}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
      </div>

      <div>
        <div className={cn("text-lg font-bold", styles.text)}>{title}</div>
        <div className="mt-1 text-sm text-zc-muted line-clamp-2">{desc}</div>
      </div>
    </Link>
  );
}
