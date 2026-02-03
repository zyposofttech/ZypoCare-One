"use client";

import * as React from "react";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth/store";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import { useBranchContext } from "@/lib/branch/useBranchContext";

type BranchRow = {
  id: string;
  code: string;
  name: string;
  city?: string;
  isActive?: boolean;
};

function buildLabel(b: BranchRow | null) {
  if (!b) return "";
  const codePart = b.code ? `${b.code} • ` : "";
  const cityPart = b.city ? ` — ${b.city}` : "";
  return `${codePart}${b.name}${cityPart}`;
}

function buildShortLabel(b: BranchRow | null) {
  if (!b) return "";
  // Short label for header (prevents wrap): code + name only
  const codePart = b.code ? `${b.code} • ` : "";
  return `${codePart}${b.name}`;
}

export function BranchSelector({ className }: { className?: string }) {
  const ctx = useBranchContext();
  // Safety: BRANCH-scope principals must not be able to switch branches.
  // AppShell also hides this, but this guard prevents accidental reuse elsewhere.
  if (ctx.scope !== "GLOBAL") return null;

  // Avoid firing /api/branches before permissions are loaded.
  // If the request runs too early (before /iam/me sync), it can 401/403 and get stuck on
  // “Branches unavailable” even though the user (e.g., SUPER_ADMIN) is allowed.
  const perms = useAuthStore((s) => s.user?.permissions);
  const permsReady = Array.isArray(perms);
  const canReadBranches = !permsReady ? false : perms.some((p) => p === "BRANCH_READ" || p.startsWith("BRANCH_"));

  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BranchRow[]>("/api/branches?mode=selector&onlyActive=true", { showLoader: false });
      const sorted = [...(data ?? [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      const activeFirst = sorted.sort((a, b) => Number(Boolean(b.isActive)) - Number(Boolean(a.isActive)));
      setBranches(activeFirst);
    } catch (e: any) {
      setError(e?.message || "Failed to load branches");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!permsReady) return;
    if (!canReadBranches) return;
    void load();
  }, [load, permsReady, canReadBranches]);

  // Ensure there is always a usable active branch once branches are loaded.
  React.useEffect(() => {
    if (!branches.length) return;
    if (activeBranchId && branches.some((b) => b.id === activeBranchId)) return;

    const next = branches.find((b) => b.isActive) ?? branches[0];
    if (next?.id) setActiveBranchId(next.id);
  }, [branches, activeBranchId, setActiveBranchId]);

  const selected = React.useMemo(() => {
    return branches.find((b) => b.id === activeBranchId) ?? null;
  }, [branches, activeBranchId]);

  // If user doesn't have branch read permission, hide the selector completely.
  // (AppShell already tries to hide it too, but this is an extra safety layer.)
  if (permsReady && !canReadBranches) return null;

  const placeholder =
    !permsReady ? "Loading permissions…" : loading ? "Loading branches…" : error ? "Branches unavailable" : "Select branch";
  const disabled = !permsReady || loading || !branches.length;

  const fullLabel = buildLabel(selected);
  const shortLabel = buildShortLabel(selected);

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="hidden lg:block whitespace-nowrap text-xs font-medium text-zc-muted">Active Branch</span>

      <Select value={activeBranchId ?? ""} onValueChange={(v) => setActiveBranchId(v || null)} disabled={disabled}>
        <SelectTrigger
          className={cn(
            "h-9 min-w-0 overflow-hidden",
            "w-[260px] xl:w-[340px]",
            "rounded-lg",
            "bg-zc-card border-zc-border",
            disabled ? "opacity-80" : ""
          )}
        >
          <span
            className={cn("min-w-0 flex-1 truncate whitespace-nowrap", !selected ? "text-zc-muted" : "")}
            title={selected ? fullLabel : ""}
          >
            {selected ? shortLabel : placeholder}
          </span>
        </SelectTrigger>

        <SelectContent className="max-h-[320px]">
          {branches.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {buildLabel(b)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
