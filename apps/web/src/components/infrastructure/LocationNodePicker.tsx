"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type LocationNodeType = "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE";

export type LocationNode = {
  id: string;
  type: LocationNodeType;
  parentId?: string | null;
  code: string;
  name: string;
  isActive: boolean;
  buildings?: LocationNode[];
  floors?: LocationNode[];
  zones?: LocationNode[];
};

export type LocationTree = { campuses: LocationNode[] };

type LocationFlat = {
  id: string;
  type: LocationNodeType;
  code: string;
  name: string;
  isActive: boolean;
  pathLabel: string; // Campus / Building / Floor / Zone
  pathCode: string; // code path (can be long)
};

function nodeLabel(n: LocationNode) {
  return `${n.name} (${n.code})`;
}

function walk(
  n: LocationNode,
  path: LocationNode[],
  out: LocationFlat[],
  allow: Set<LocationNodeType>,
  includeInactive: boolean
) {
  const next = [...path, n];
  if (allow.has(n.type) && (includeInactive || n.isActive)) {
    out.push({
      id: n.id,
      type: n.type,
      code: n.code,
      name: n.name,
      isActive: n.isActive,
      pathLabel: next.map(nodeLabel).join(" / "),
      pathCode: next.map((x) => x.code).join("/"),
    });
  }
  for (const b of n.buildings || []) walk(b, next, out, allow, includeInactive);
  for (const f of n.floors || []) walk(f, next, out, allow, includeInactive);
  for (const z of n.zones || []) walk(z, next, out, allow, includeInactive);
}

function flattenLocationTree(
  tree: LocationTree | null,
  allowTypes: LocationNodeType[],
  includeInactive: boolean
): LocationFlat[] {
  if (!tree?.campuses?.length) return [];
  const allow = new Set<LocationNodeType>(allowTypes);
  const out: LocationFlat[] = [];
  for (const c of tree.campuses) walk(c, [], out, allow, includeInactive);
  return out.sort((a, b) => a.pathLabel.localeCompare(b.pathLabel));
}

function TypePill({ t }: { t: LocationNodeType }) {
  const cls =
    t === "ZONE"
      ? "border-emerald-200/60 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
      : "border-sky-200/60 bg-sky-50/60 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200";
  return (
    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", cls)}>
      {t}
    </span>
  );
}

export function LocationNodePicker({
  branchId,
  value,
  onValueChange,
  placeholder,
  allowTypes = ["ZONE", "FLOOR"],
  includeInactive = false,
  showHelp = true,
  disabled,
  className,
}: {
  branchId?: string | null;
  value?: string;
  onValueChange: (id: string | undefined) => void;
  placeholder?: string;
  allowTypes?: LocationNodeType[];
  includeInactive?: boolean;
  showHelp?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [tree, setTree] = React.useState<LocationTree | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const items = React.useMemo(
    () => flattenLocationTree(tree, allowTypes, includeInactive),
    [tree, allowTypes, includeInactive]
  );

  React.useEffect(() => {
    let alive = true;
    if (!branchId) {
      setTree(null);
      setErr(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    void (async () => {
      try {
        const t = await apiFetch<LocationTree>(
          `/api/infrastructure/locations/tree?branchId=${encodeURIComponent(branchId)}`
        );
        if (!alive) return;
        setTree(t);
      } catch (e: any) {
        if (!alive) return;
        setTree(null);
        setErr(e?.message || "Unable to load location tree.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [branchId]);

  // If current value no longer exists in options, clear it.
  React.useEffect(() => {
    if (!value) return;
    if (!items.some((x) => x.id === value)) onValueChange(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const isDisabled = disabled || !branchId || loading;

  return (
    <div className={cn("grid gap-2 min-w-0", className)}>
      <Select value={value} onValueChange={(v) => onValueChange(v)} disabled={isDisabled}>
        {/* ✅ Key fix: allow wrapping, grow height, prevent horizontal overflow */}
        <SelectTrigger
          className={cn(
            "w-full min-w-0 overflow-hidden rounded-xl border-zc-border bg-zc-card",
            "min-h-11 h-auto py-2",
            // apply wrapping to the value container inside trigger
            "[&>span]:whitespace-normal [&>span]:break-words [&>span]:leading-snug",
            isDisabled ? "opacity-75" : ""
          )}
        >
          <SelectValue placeholder={placeholder || (loading ? "Loading locations…" : "Select location (Zone/Floor)…")} />
        </SelectTrigger>

        {/* ✅ Constrain dropdown width and kill horizontal overflow */}
        <SelectContent
          align="start"
          sideOffset={8}
          className="z-[60] max-h-[320px] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] overflow-y-auto overflow-x-hidden"
        >
          {items.length === 0 ? (
            <SelectItem value="__none__" disabled>
              <span className="text-sm text-zc-muted">
                {err ? err : "No locations found. Create Campus → Building → Floor → Zone first."}
              </span>
            </SelectItem>
          ) : (
            items.map((it) => (
              <SelectItem key={it.id} value={it.id} className="py-2">
                {/* ✅ Wrap both label and code-path; code-path uses break-all to avoid horizontal scroll */}
                <div className="flex w-full max-w-full items-start justify-between gap-3">
                  <div className="flex w-full max-w-full flex-col">
                    <span className="whitespace-normal break-words leading-snug" title={it.pathLabel}>
                      {it.pathLabel}
                    </span>

                    <span
                      className="mt-0.5 whitespace-normal break-all font-mono text-[11px] leading-snug text-zc-muted"
                      title={it.pathCode}
                    >
                      {it.pathCode}
                    </span>
                  </div>

                  <TypePill t={it.type} />
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {showHelp ? (
        <div className="text-xs text-zc-muted">
          Tag the Unit to a <span className="font-semibold">Zone</span> (recommended) or a Floor. Rooms and resources inherit this via Unit.
        </div>
      ) : null}
    </div>
  );
}
