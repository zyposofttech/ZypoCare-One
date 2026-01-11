"use client";

import * as React from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";

import { cn } from "@/lib/cn";
import { IconShield, IconSearch, IconChevronRight } from "@/components/icons";
import { AlertTriangle, Sparkles } from "lucide-react";

import { POLICY_PACKS, type PolicyPack } from "@/modules/governance/policy-packs";
import { getTemplateById } from "@/modules/governance/policy-templates";
import { PolicyPackWizard } from "@/modules/governance/PolicyPackWizard";

function pillTone(label: string) {
  const l = (label || "").toLowerCase();
  if (l.includes("recommended"))
    return "border-emerald-200/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200";
  if (l.includes("strict"))
    return "border-rose-200/70 bg-rose-50/70 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200";
  if (l.includes("operational"))
    return "border-sky-200/70 bg-sky-50/70 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200";
  return "border-xc-border bg-xc-panel/20 text-xc-muted";
}

function TagChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs transition",
        active
          ? "border-[rgb(var(--xc-accent-rgb)/0.45)] bg-[rgb(var(--xc-accent-rgb)/0.10)] text-xc-text"
          : "border-xc-border bg-xc-panel/10 text-xc-muted hover:bg-xc-panel/20"
      )}
    >
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-xc-muted/80">
          {label}
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-xc-text tabular-nums">
          {value}
        </div>
        {sub ? <div className="mt-1 text-sm text-xc-muted">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

export default function SuperAdminPolicyPresetsPage() {
  const [q, setQ] = React.useState("");
  const [tag, setTag] = React.useState<string>("All");

  const [err, setErr] = React.useState<string | null>(null);

  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [selectedPack, setSelectedPack] = React.useState<PolicyPack | null>(null);

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const tags = React.useMemo(() => {
    const unique = Array.from(new Set(POLICY_PACKS.map((p) => p.tag).filter(Boolean)));
    return ["All", ...unique];
  }, []);

  const recommended = React.useMemo(() => {
    return POLICY_PACKS.find((p) => (p.tag || "").toLowerCase().includes("recommended")) ?? null;
  }, []);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    return POLICY_PACKS.filter((p) => {
      if (tag !== "All" && p.tag !== tag) return false;

      if (!s) return true;

      const policyNames = p.items
        .map((it) => getTemplateById(it.templateId)?.name || it.templateId)
        .join(" ");

      const hay = `${p.name} ${p.tag} ${p.description} ${policyNames}`.toLowerCase();
      return hay.includes(s);
    });
  }, [q, tag]);

  const totalPacks = POLICY_PACKS.length;
  const totalPoliciesInCatalog = POLICY_PACKS.reduce((a, p) => a + p.items.length, 0);

  function openWizard(pack: PolicyPack) {
    setErr(null);
    setSelectedPack(pack);
    setWizardOpen(true);
  }

  return (
    <AppShell title="Policy Presets">
      <div className="grid gap-6">
        {/* ✅ Standard App header layout */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-xc-border bg-xc-panel/30">
              <IconShield className="h-5 w-5 text-xc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Policy Presets</div>
              <div className="mt-1 text-sm text-xc-muted">
                Install a ready policy pack as Drafts. Review and submit for approvals when you’re ready.
              </div>
            </div>
          </div>

          {/* ✅ Buttons aligned to your app standard (px-5) */}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="px-5">
              <Link href="/superadmin/policy">
                Governance <IconChevronRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button asChild variant="primary" className="px-5">
              <Link href="/superadmin/policy/policies">
                Go to Policies <IconChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {err ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgb(var(--xc-danger-rgb)/0.35)] bg-[rgb(var(--xc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--xc-danger))]">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        ) : null}

        {/* ✅ Stat row (more scannable than pills) */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Packs" value={totalPacks} sub="Curated baseline bundles" />
          <StatCard label="Policies in Catalog" value={totalPoliciesInCatalog} sub="Templates included across packs" />
          <StatCard label="Showing" value={filtered.length} sub="Matches your search / filters" />
        </div>

        {/* ✅ Recommended spotlight (user-friendly entry point) */}
        {recommended ? (
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-xc-text">
                    <span className="grid h-9 w-9 place-items-center rounded-2xl border border-xc-border bg-xc-panel/30">
                      <Sparkles className="h-4 w-4 text-xc-accent" />
                    </span>
                    Recommended Baseline
                  </div>

                  <div className="mt-2 text-lg font-semibold text-xc-text">
                    {recommended.name}
                  </div>

                  <div className="mt-1 text-sm text-xc-muted">
                    {recommended.description}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs", pillTone(recommended.tag))}>
                      {recommended.tag}
                    </span>
                    <span className="text-xs text-xc-muted">
                      Includes <span className="font-semibold text-xc-text tabular-nums">{recommended.items.length}</span> policies (Draft install)
                    </span>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                  <Button
                    variant="outline"
                    className="px-5 md:w-auto"
                    onClick={() => openWizard(recommended)}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="primary"
                    className="px-5 md:w-auto"
                    onClick={() => openWizard(recommended)}
                  >
                    Install Baseline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* ✅ Catalog */}
        <Card className="p-0">
          <CardContent className="p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-xc-text">Catalog</div>
                <div className="mt-1 text-sm text-xc-muted">
                  Install packs to quickly set up governance without manual configuration.
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            {/* Search + tags row */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-xc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search packs or policy names…"
                  className="pl-10 pr-10"
                />
                {q ? (
                  <button
                    type="button"
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md border border-xc-border bg-xc-panel/20 text-xs text-xc-muted hover:bg-xc-panel/30"
                    onClick={() => setQ("")}
                    aria-label="Clear search"
                    title="Clear"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <TagChip
                    key={t}
                    label={t}
                    active={t === tag}
                    onClick={() => setTag(t)}
                  />
                ))}
                {(q || tag !== "All") ? (
                  <Button
                    variant="outline"
                    className="h-8 px-3"
                    onClick={() => {
                      setQ("");
                      setTag("All");
                    }}
                  >
                    Reset
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Pack grid */}
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {filtered.map((p) => {
                const showAll = !!expanded[p.id];
                const visibleItems = showAll ? p.items : p.items.slice(0, 4);
                const remaining = p.items.length - visibleItems.length;

                return (
                  <Card key={p.id} className="p-0">
                    <CardContent className="p-6">
                      {/* Pack header */}
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs", pillTone(p.tag))}>
                            {p.tag}
                          </div>
                          <div className="mt-2 text-lg font-semibold text-xc-text">{p.name}</div>
                          <div className="mt-1 text-sm text-xc-muted">{p.description}</div>

                          <div className="mt-2 text-xs text-xc-muted">
                            Includes{" "}
                            <span className="font-semibold text-xc-text tabular-nums">{p.items.length}</span>{" "}
                            policies • Installs as Drafts
                          </div>
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                          <Button variant="outline" className="w-full px-5 sm:w-auto" onClick={() => openWizard(p)}>
                            Preview
                          </Button>
                          <Button className="w-full px-5 sm:w-auto" onClick={() => openWizard(p)}>
                            Install
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {/* Includes (collapsed by default) */}
                      <div className="text-sm font-semibold text-xc-text">Includes</div>
                      <div className="mt-2 grid gap-2">
                        {visibleItems.map((it) => {
                          const tpl = getTemplateById(it.templateId);
                          return (
                            <div
                              key={it.templateId}
                              className="rounded-xl border border-xc-border bg-xc-panel/10 p-3"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-xc-text">
                                    {tpl?.name || it.templateId}
                                  </div>
                                  <div className="mt-0.5 text-xs text-xc-muted line-clamp-2">
                                    {tpl?.description || ""}
                                  </div>
                                  <div className="mt-1 font-mono text-xs text-xc-muted break-all">
                                    Code: {tpl?.code || "—"}
                                  </div>
                                  {it.note ? (
                                    <div className="mt-1 text-xs text-xc-muted">Preset: {it.note}</div>
                                  ) : null}
                                </div>
                                <span className="shrink-0 self-start rounded-full border border-xc-border bg-xc-panel/20 px-3 py-1 text-xs text-xc-muted">
                                  Draft
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {p.items.length > 4 ? (
                        <div className="mt-3">
                          <button
                            type="button"
                            className="text-sm font-medium text-xc-text hover:underline"
                            onClick={() => setExpanded((s) => ({ ...s, [p.id]: !showAll }))}
                          >
                            {showAll ? "Show less" : `Show ${remaining} more`}
                          </button>
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-2xl border border-xc-border bg-xc-panel/20 p-5">
                        <div className="text-sm font-semibold text-xc-text">After install</div>
                        <div className="mt-1 text-sm text-xc-muted">
                          Policies are created (if missing) and saved as Drafts. Review them in Policies and submit for approval when ready.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {!filtered.length ? (
                <div className="col-span-full rounded-2xl border border-xc-border bg-xc-panel/10 p-10 text-center text-sm text-xc-muted">
                  No matching packs found. Try a different keyword or clear filters.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <PolicyPackWizard
          open={wizardOpen}
          pack={selectedPack}
          onClose={() => {
            setWizardOpen(false);
            setSelectedPack(null);
          }}
          onInstalled={async () => {
            toast({ title: "Installed", description: "Drafts are ready. Review them in Policies." });
          }}
        />
      </div>
    </AppShell>
  );
}
