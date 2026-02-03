"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import {
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Wrench,
  Trash2,
  CheckCircle2,
  Eye,
  Clock,
  Ban,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type ServiceItemRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  kind?: string | null;
  isActive: boolean;
  _count?: { availabilityRules?: number; availabilityExceptions?: number };
};

type AvailabilityRuleRow = {
  // IMPORTANT: In Option-B this row represents a *Calendar* (not a single rule-window)
  id: string; // calendarId
  branchId: string;
  serviceItemId: string;

  isActive: boolean;

  mode?: "WALKIN" | "APPOINTMENT" | string | null;
  timezone?: string | null;

  slotMinutes?: number | null;
  leadTimeMinutes?: number | null;
  bookingWindowDays?: number | null;
  maxPerDay?: number | null;
  maxPerSlot?: number | null;

  windows?: any[] | null; // derived from rules
  rulesJson?: any | null; // stored (optional) as metadata in name

  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  version?: number | null;
  notes?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type AvailabilityExceptionRow = {
  id: string; // blackoutId
  branchId: string;
  serviceItemId: string;

  date: string; // YYYY-MM-DD (local)
  startTime?: string | null; // HH:mm (local)
  endTime?: string | null; // HH:mm (local)
  reason?: string | null;

  isClosed?: boolean | null;
  capacityOverride?: number | null;

  createdAt?: string;
  updatedAt?: string;
};

// Option-B backend API shapes
type ServiceAvailabilityCalendarApi = {
  id: string;
  branchId: string;
  serviceItemId: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  rules?: Array<{
    id: string;
    calendarId: string;
    dayOfWeek: number; // 0..6
    startMinute: number; // 0..1439
    endMinute: number; // 1..1440
    capacity?: number | null;
    isActive: boolean;
  }>;
  blackouts?: Array<{
    id: string;
    calendarId: string;
    from: string; // ISO UTC
    to: string; // ISO UTC
    reason?: string | null;
  }>;
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

function buildQS(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (!s || s === "all") return;
    usp.set(k, s);
  });
  return usp.toString();
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[980px] translate-x-0 translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

function activeBadge(isActive: boolean) {
  return isActive ? <Badge variant="ok">ACTIVE</Badge> : <Badge variant="secondary">INACTIVE</Badge>;
}

async function apiTryMany<T>(urls: { url: string; init?: RequestInit }[]) {
  let lastErr: any = null;
  for (const u of urls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await apiFetch<T>(u.url, u.init as any);
    } catch (e: any) {
      lastErr = e;
      if (!(e instanceof ApiError && e.status === 404)) break;
    }
  }
  throw lastErr || new Error("Request failed");
}

function first<T>(arr: T[] | undefined | null) {
  return arr && arr.length ? arr[0] : null;
}

// -------------------- Calendar policy metadata helpers --------------------
// Since schema currently stores only calendar.name/isActive, we persist UI knobs in name metadata.
// Example:
//   "Availability {mode=APPOINTMENT;tz=Asia/Kolkata;slot=15;lead=60;win=30;maxDay=;maxSlot=;from=2026-01-31;note=OPD}"
// This keeps all options working without changing schema again.

type CalendarPolicy = {
  mode: string;
  timezone: string;
  slotMinutes: number;
  leadTimeMinutes: number;
  bookingWindowDays: number;
  maxPerDay: number | null;
  maxPerSlot: number | null;
  effectiveFrom: string; // YYYY-MM-DD
  notes: string;
  rulesJsonText: string; // optional (stored trimmed)
};

const DAY_TO_DOW: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
const DOW_TO_DAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minutesToHHMM(mins: number) {
  const m = clamp(Math.floor(mins), 0, 1440);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(h)}:${pad2(mm)}`;
}

function hhmmToMinutes(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  if (h < 0 || h > 24) return null;
  if (mm < 0 || mm > 59) return null;
  const total = h * 60 + mm;
  if (total < 0 || total > 1440) return null;
  return total;
}

function localTzOffsetMins() {
  // JS returns minutes behind UTC (India: -330). We need +330.
  return -new Date().getTimezoneOffset();
}

function localDateStartUtc(dateStr: string, tzOffsetMins = localTzOffsetMins()) {
  // dateStr: YYYY-MM-DD interpreted as LOCAL date; convert to UTC instant of local midnight
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;

  const offsetMs = tzOffsetMins * 60 * 1000;
  const utcMidnight = new Date(Date.UTC(y, mo, d, 0, 0, 0));
  return new Date(utcMidnight.getTime() - offsetMs);
}

function localDateTimeToUtcIso(dateStr: string, timeStr: string, tzOffsetMins = localTzOffsetMins()) {
  const base = localDateStartUtc(dateStr, tzOffsetMins);
  const mins = hhmmToMinutes(timeStr);
  if (!base || mins == null) return null;
  return new Date(base.getTime() + mins * 60 * 1000).toISOString();
}

function utcIsoToLocalParts(iso: string, tzOffsetMins = localTzOffsetMins()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const offsetMs = tzOffsetMins * 60 * 1000;
  const local = new Date(d.getTime() + offsetMs);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth() + 1;
  const day = local.getUTCDate();
  const hh = local.getUTCHours();
  const mm = local.getUTCMinutes();
  return {
    date: `${y}-${pad2(m)}-${pad2(day)}`,
    time: `${pad2(hh)}:${pad2(mm)}`,
  };
}

function safeMeta(v: string) {
  return String(v || "").replace(/[;{}]/g, " ").replace(/\s+/g, " ").trim();
}

function buildCalendarName(policy: CalendarPolicy) {
  const mode = safeMeta(policy.mode || "APPOINTMENT") || "APPOINTMENT";
  const tz = safeMeta(policy.timezone || "Asia/Kolkata") || "Asia/Kolkata";

  const slot = clamp(Number(policy.slotMinutes ?? 15), 5, 240);
  const lead = clamp(Number(policy.leadTimeMinutes ?? 60), 0, 60 * 24 * 30);
  const win = clamp(Number(policy.bookingWindowDays ?? 30), 1, 365);

  const maxDay = policy.maxPerDay == null ? "" : String(Math.max(0, Number(policy.maxPerDay)));
  const maxSlot = policy.maxPerSlot == null ? "" : String(Math.max(0, Number(policy.maxPerSlot)));

  const from = safeMeta(policy.effectiveFrom || "");
  const note = safeMeta(policy.notes || "").slice(0, 40);

  // optional advanced json stored trimmed (small only)
  const adv = safeMeta(policy.rulesJsonText || "").slice(0, 60);

  const meta = [
    `mode=${mode}`,
    `tz=${tz}`,
    `slot=${slot}`,
    `lead=${lead}`,
    `win=${win}`,
    `maxDay=${maxDay}`,
    `maxSlot=${maxSlot}`,
    `from=${from}`,
    `note=${note}`,
    adv ? `adv=${adv}` : "",
  ]
    .filter(Boolean)
    .join(";");

  let name = `Availability {${meta}}`;
  if (name.length > 160) name = name.slice(0, 160);
  return name;
}

function parseCalendarName(name: string): CalendarPolicy {
  const defaults: CalendarPolicy = {
    mode: "APPOINTMENT",
    timezone: "Asia/Kolkata",
    slotMinutes: 15,
    leadTimeMinutes: 60,
    bookingWindowDays: 30,
    maxPerDay: null,
    maxPerSlot: null,
    effectiveFrom: "",
    notes: "",
    rulesJsonText: "",
  };

  const m = /\{(.+)\}$/.exec(String(name || "").trim());
  if (!m) return defaults;

  const map: Record<string, string> = {};
  m[1]
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean)
    .forEach((kv) => {
      const i = kv.indexOf("=");
      if (i <= 0) return;
      const k = kv.slice(0, i).trim();
      const v = kv.slice(i + 1).trim();
      map[k] = v;
    });

  const slot = map.slot ? Number(map.slot) : defaults.slotMinutes;
  const lead = map.lead ? Number(map.lead) : defaults.leadTimeMinutes;
  const win = map.win ? Number(map.win) : defaults.bookingWindowDays;

  const maxDay = map.maxDay ? Number(map.maxDay) : NaN;
  const maxSlot = map.maxSlot ? Number(map.maxSlot) : NaN;

  return {
    mode: map.mode || defaults.mode,
    timezone: map.tz || defaults.timezone,
    slotMinutes: Number.isFinite(slot) ? slot : defaults.slotMinutes,
    leadTimeMinutes: Number.isFinite(lead) ? lead : defaults.leadTimeMinutes,
    bookingWindowDays: Number.isFinite(win) ? win : defaults.bookingWindowDays,
    maxPerDay: Number.isFinite(maxDay) ? maxDay : null,
    maxPerSlot: Number.isFinite(maxSlot) ? maxSlot : null,
    effectiveFrom: map.from || "",
    notes: map.note || "",
    rulesJsonText: map.adv || "",
  };
}

function rulesToWindows(rules: ServiceAvailabilityCalendarApi["rules"] | undefined | null) {
  const list = (rules || []).filter((r) => r && r.isActive);
  return list.map((r) => ({
    day: DOW_TO_DAY[r.dayOfWeek] ?? String(r.dayOfWeek),
    start: minutesToHHMM(r.startMinute),
    end: minutesToHHMM(r.endMinute),
    capacity: r.capacity ?? 0,
  }));
}

function calendarToRuleRow(cal: ServiceAvailabilityCalendarApi): AvailabilityRuleRow {
  const p = parseCalendarName(cal.name);
  return {
    id: cal.id,
    branchId: cal.branchId,
    serviceItemId: cal.serviceItemId,
    isActive: cal.isActive,

    mode: p.mode,
    timezone: p.timezone,
    slotMinutes: p.slotMinutes,
    leadTimeMinutes: p.leadTimeMinutes,
    bookingWindowDays: p.bookingWindowDays,
    maxPerDay: p.maxPerDay,
    maxPerSlot: p.maxPerSlot,
    effectiveFrom: p.effectiveFrom ? new Date(`${p.effectiveFrom}T00:00:00Z`).toISOString() : null,
    notes: p.notes || null,

    windows: rulesToWindows(cal.rules),
    rulesJson: p.rulesJsonText ? { adv: p.rulesJsonText } : null,

    createdAt: cal.createdAt,
    updatedAt: cal.updatedAt,
  };
}

function blackoutsToExceptions(
  blackouts: ServiceAvailabilityCalendarApi["blackouts"] | undefined | null,
  branchId: string,
  serviceItemId: string,
): AvailabilityExceptionRow[] {
  const tzOff = localTzOffsetMins();
  return (blackouts || []).map((b) => {
    const from = utcIsoToLocalParts(b.from, tzOff);
    const to = utcIsoToLocalParts(b.to, tzOff);

    const isClosed = from.time === "00:00" && to.time === "00:00" && from.date !== "" && to.date !== "";

    return {
      id: b.id,
      branchId,
      serviceItemId,
      date: from.date,
      startTime: isClosed ? null : from.time,
      endTime: isClosed ? null : to.time,
      reason: b.reason ?? null,
      isClosed,
      capacityOverride: null,
    };
  });
}

function ensureWindowsJson(text: string) {
  const wText = String(text || "").trim();
  if (!wText) return { windows: [] as any[], error: null as string | null };

  let arr: any;
  try {
    arr = JSON.parse(wText);
  } catch {
    return { windows: [] as any[], error: "Weekly windows must be valid JSON array." };
  }
  if (!Array.isArray(arr)) return { windows: [] as any[], error: "Weekly windows JSON must be an array." };

  // normalize minimal validation
  const norm: any[] = [];
  for (const x of arr) {
    if (!x) continue;
    const day = String(x.day || x.dow || "").toUpperCase().trim();
    const start = String(x.start || "").trim();
    const end = String(x.end || "").trim();
    if (!day || !start || !end) continue;

    if (!(day in DAY_TO_DOW)) continue;
    const sM = hhmmToMinutes(start);
    const eM = hhmmToMinutes(end);
    if (sM == null || eM == null) continue;
    if (eM <= sM) continue;

    const cap = x.capacity == null ? undefined : Number(x.capacity);
    norm.push({
      day,
      start,
      end,
      capacity: typeof cap === "number" && Number.isFinite(cap) ? Math.max(0, cap) : undefined,
    });
  }

  return { windows: norm, error: null };
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function SuperAdminServiceAvailabilityPage() {
  const { toast } = useToast();
  // ✅ Unified branch context
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";


  const [activeTab, setActiveTab] = React.useState<"workspace" | "guide">("workspace");
  const [showHelp, setShowHelp] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [serviceItems, setServiceItems] = React.useState<ServiceItemRow[]>([]);
  const [selectedItemId, setSelectedItemId] = React.useState<string>("");
  const [selectedItem, setSelectedItem] = React.useState<ServiceItemRow | null>(null);

  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [q, setQ] = React.useState("");

  // availability data (selected item)
  const [rulesLoading, setRulesLoading] = React.useState(false);
  const [rulesErr, setRulesErr] = React.useState<string | null>(null);
  const [rules, setRules] = React.useState<AvailabilityRuleRow[]>([]); // calendars mapped
  const [exceptions, setExceptions] = React.useState<AvailabilityExceptionRow[]>([]);
  const [activeCalendarId, setActiveCalendarId] = React.useState<string>("");

  // modals
  const [ruleOpen, setRuleOpen] = React.useState(false);
  const [ruleMode, setRuleMode] = React.useState<"create" | "edit">("create");
  const [ruleEditing, setRuleEditing] = React.useState<AvailabilityRuleRow | null>(null);

  const [exOpen, setExOpen] = React.useState(false);
  const [exMode, setExMode] = React.useState<"create" | "edit">("create");
  const [exEditing, setExEditing] = React.useState<AvailabilityExceptionRow | null>(null);

  const mustSelectBranch = !branchId;

  async function loadBranches(): Promise<string | null> {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = (effectiveBranchId || null);
    const firstId = list[0]?.id || null;
    const next = (stored && list.some((b) => b.id === stored) ? stored : null) || firstId;

    if (next) if (isGlobalScope) setActiveBranchId(next || null);
setBranchId(next || "");
    return next;
  }

  async function loadServiceItems(bid: string, showToast = false): Promise<{ list: ServiceItemRow[]; selectedId: string }> {
    setErr(null);
    setLoading(true);
    try {
      const qs = buildQS({
        branchId: bid,
        q: q.trim() || undefined,
        includeInactive: includeInactive ? "true" : undefined,
        includeCounts: "true",
      });

      const res = await apiTryMany<any>([
        { url: `/api/infrastructure/service-items?${qs}` },
        { url: `/api/infra/service-items?${qs}` },
      ]);

      const list: ServiceItemRow[] = Array.isArray(res) ? res : (res?.rows || []);
      setServiceItems(list);

      const nextSelected =
        selectedItemId && list.some((x) => x.id === selectedItemId) ? selectedItemId : list[0]?.id || "";
      setSelectedItemId(nextSelected);
      setSelectedItem(nextSelected ? list.find((x) => x.id === nextSelected) || null : null);

      if (showToast) toast({ title: "Service items refreshed", description: "Loaded latest items for this branch." });
      return { list, selectedId: nextSelected };
    } catch (e: any) {
      const msg = e?.message || "Failed to load service items";
      setErr(msg);
      setServiceItems([]);
      setSelectedItemId("");
      setSelectedItem(null);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
      return { list: [], selectedId: "" };
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailabilityForItem(itemId: string, showToast = false, branchIdOverride?: string) {
    if (!itemId) return;
    setRulesErr(null);
    setRulesLoading(true);

    try {
      const effectiveBranchId =
        branchIdOverride || branchId || serviceItems.find((x) => x.id === itemId)?.branchId || "";
      const qs = buildQS({
        branchId: effectiveBranchId,
        serviceItemId: itemId,
        includeRules: "true",
        includeBlackouts: "true",
      });

      const calendars = await apiTryMany<ServiceAvailabilityCalendarApi[]>([
        { url: `/api/infrastructure/service-availability/calendars?${qs}` },
        { url: `/api/infra/service-availability/calendars?${qs}` },
      ]);

      const mapped = (calendars || []).map(calendarToRuleRow);
      setRules(mapped);

      const activeCal =
        (calendars || []).find((c) => c.isActive) || (calendars || [])[0] || null;
      setActiveCalendarId(activeCal?.id || "");

      const ex = activeCal ? blackoutsToExceptions(activeCal.blackouts, activeCal.branchId, activeCal.serviceItemId) : [];
      setExceptions(ex);

      if (showToast) toast({ title: "Availability refreshed", description: "Loaded calendars, rules, and blackouts." });
    } catch (e: any) {
      const msg = e?.message || "Failed to load availability";
      setRulesErr(msg);
      setRules([]);
      setExceptions([]);
      setActiveCalendarId("");
      if (showToast) toast({ title: "Load failed", description: msg, variant: "destructive" as any });
    } finally {
      setRulesLoading(false);
    }
  }

  async function refreshAll(showToast = false) {
    setLoading(true);
    setErr(null);
    try {
      const bid = branchId || (await loadBranches());
      if (!bid) {
        setLoading(false);
        return;
      }

      const { list, selectedId } = await loadServiceItems(bid, false);
      const itemId = selectedId || list[0]?.id || "";
      if (itemId) await loadAvailabilityForItem(itemId, false, bid);

      if (showToast) toast({ title: "Ready", description: "Service availability workspace is up to date." });
    } catch (e: any) {
      const msg = e?.message || "Refresh failed";
      setErr(msg);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refreshAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;

    setSelectedItemId("");
    setSelectedItem(null);
    setRules([]);
    setExceptions([]);
    setActiveCalendarId("");

    void loadServiceItems(branchId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, includeInactive]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadServiceItems(branchId, false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  React.useEffect(() => {
    if (!selectedItemId) {
      setSelectedItem(null);
      setRules([]);
      setExceptions([]);
      setActiveCalendarId("");
      return;
    }
    const it = serviceItems.find((x) => x.id === selectedItemId) || null;
    setSelectedItem(it);
    if (it) void loadAvailabilityForItem(it.id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId]);

  async function onBranchChange(nextId: string) {
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
setQ("");
    setIncludeInactive(false);
    setSelectedItemId("");
    setSelectedItem(null);
    setRules([]);
    setExceptions([]);
    setActiveCalendarId("");

    setErr(null);
    setLoading(true);
    try {
      await loadServiceItems(nextId, false);
      toast({ title: "Branch scope changed", description: "Loaded service items for selected branch." });
    } catch (e: any) {
      toast({ title: "Load failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  const stats = React.useMemo(() => {
    const total = serviceItems.length;
    const active = serviceItems.filter((s) => s.isActive).length;
    const inactive = total - active;

    const configured = serviceItems.filter((s) => (s._count?.availabilityRules ?? 0) > 0).length;
    const missing = total - configured;

    const ruleCount = rules.length; // calendars count
    const activeRules = rules.filter((r) => r.isActive).length; // active calendars

    return { total, active, inactive, configured, missing, ruleCount, activeRules };
  }, [serviceItems, rules]);

  function openCreateRule() {
    if (!selectedItem) return;
    setRuleMode("create");
    setRuleEditing(null);
    setRuleOpen(true);
  }

  function openEditRule(r: AvailabilityRuleRow) {
    setRuleMode("edit");
    setRuleEditing(r);
    setRuleOpen(true);
  }

  function openCreateException() {
    if (!selectedItem) return;
    setExMode("create");
    setExEditing(null);
    setExOpen(true);
  }

  function openEditException(x: AvailabilityExceptionRow) {
    setExMode("edit");
    setExEditing(x);
    setExOpen(true);
  }

  async function deleteRule(r: AvailabilityRuleRow) {
    const ok = window.confirm("Delete this calendar? (Recommended: deactivate instead if you want history.)");
    if (!ok) return;

    setBusy(true);
    try {
      await apiTryMany([
        { url: `/api/infrastructure/service-availability/calendars/${encodeURIComponent(r.id)}?${buildQS({ branchId })}`, init: { method: "DELETE" } },
        { url: `/api/infra/service-availability/calendars/${encodeURIComponent(r.id)}?${buildQS({ branchId })}`, init: { method: "DELETE" } },
      ]);
      toast({ title: "Deleted", description: "Availability calendar deleted." });
      if (selectedItem) await loadAvailabilityForItem(selectedItem.id, false);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function closeRule(r: AvailabilityRuleRow) {
    const ok = window.confirm("Deactivate this calendar (stop using it for slot generation)?");
    if (!ok) return;

    setBusy(true);
    try {
      await apiTryMany([
        { url: `/api/infrastructure/service-availability/calendars/${encodeURIComponent(r.id)}?${buildQS({ branchId })}`, init: { method: "DELETE" } },
        { url: `/api/infra/service-availability/calendars/${encodeURIComponent(r.id)}?${buildQS({ branchId })}`, init: { method: "DELETE" } },
      ]);
      toast({ title: "Deactivated", description: "Calendar is now inactive." });
      if (selectedItem) await loadAvailabilityForItem(selectedItem.id, false);
    } catch (e: any) {
      toast({ title: "Deactivate failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  async function deleteException(x: AvailabilityExceptionRow) {
    const ok = window.confirm("Delete this exception (blackout)?");
    if (!ok) return;

    setBusy(true);
    try {
      await apiTryMany([
        { url: `/api/infrastructure/service-availability/blackouts/${encodeURIComponent(x.id)}`, init: { method: "DELETE" } },
        { url: `/api/infra/service-availability/blackouts/${encodeURIComponent(x.id)}`, init: { method: "DELETE" } },
      ]);
      toast({ title: "Deleted", description: "Exception deleted." });
      if (selectedItem) await loadAvailabilityForItem(selectedItem.id, false);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Infrastructure • Service Availability">
      <RequirePerm perm="INFRA_SERVICE_AVAILABILITY_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <CalendarClock className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Service Availability</div>
              <div className="mt-1 text-sm text-zc-muted">
                Define booking rules per Service Item: weekly windows and blackout exceptions.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
            <Button
              variant="outline"
              className="px-5 gap-2 whitespace-nowrap shrink-0"
              onClick={() => refreshAll(true)}
              disabled={loading || busy}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button variant="outline" asChild className="px-5 gap-2 whitespace-nowrap shrink-0">
              <Link href="/infrastructure/fixit">
                <Wrench className="h-4 w-4" />
                FixIt Inbox
              </Link>
            </Button>

            <Button
              variant="primary"
              className="px-5 gap-2 whitespace-nowrap shrink-0"
              onClick={openCreateRule}
              disabled={!selectedItem}
            >
              <Plus className="h-4 w-4" />
              New Calendar
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load Service Availability</CardTitle>
                  <CardDescription className="mt-1">{err}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Configure availability for services that require scheduling (OPD consults, radiology slots, OT procedures).
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branchId || ""} onValueChange={onBranchChange}>
                <SelectTrigger className="h-11 rounded-2xl bg-zc-panel/10">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} — {b.name} ({b.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="grid gap-2">
                <Label>Search Service Items</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zc-muted" />
                  <Input
                    className="h-11 rounded-2xl pl-10 bg-zc-panel/10"
                    placeholder="Search by code or name..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    disabled={mustSelectBranch}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-zc-border bg-zc-panel/10 px-4 py-2">
                  <Filter className="h-4 w-4 text-zc-muted" />
                  <div className="text-sm">Include inactive</div>
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 w-11"
                  onClick={() => {
                    if (selectedItem) void loadAvailabilityForItem(selectedItem.id, true);
                  }}
                  disabled={!selectedItem || rulesLoading}
                >
                  <RefreshCw className={rulesLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                </Button>

                <Button variant="outline" size="sm" className="h-11 w-11" onClick={() => setShowHelp(true)}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
              {/* Left: service items */}
              <Card className="border-zc-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Service Items</CardTitle>
                  <CardDescription className="text-xs">
                    Total: {stats.total} · Active: {stats.active} · Inactive: {stats.inactive}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[520px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-zc-card z-10">
                        <TableRow>
                          <TableHead className="w-[120px]">Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[90px] text-right">State</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {loading ? (
                          <>
                            {Array.from({ length: 8 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell>
                                  <Skeleton className="h-4 w-16" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-44" />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Skeleton className="h-4 w-16 ml-auto" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        ) : serviceItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-10 text-center text-sm text-zc-muted">
                              No service items found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          serviceItems.map((s) => {
                            const selected = s.id === selectedItemId;
                            return (
                              <TableRow
                                key={s.id}
                                className={cn(
                                  "cursor-pointer",
                                  selected && "bg-zc-primary/10 hover:bg-zc-primary/10",
                                )}
                                onClick={() => setSelectedItemId(s.id)}
                              >
                                <TableCell className="font-medium">{s.code}</TableCell>
                                <TableCell className="truncate">{s.name}</TableCell>
                                <TableCell className="text-right">
                                  {s.isActive ? (
                                    <Badge variant="ok" className="text-[11px]">
                                      ACTIVE
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[11px]">
                                      INACTIVE
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Right: detail */}
              {selectedItem ? (
                <AvailabilityDetail
                  item={selectedItem}
                  busy={busy}
                  rulesLoading={rulesLoading}
                  rulesErr={rulesErr}
                  rules={rules}
                  exceptions={exceptions}
                  onRefresh={() => void loadAvailabilityForItem(selectedItem.id, true)}
                  onAddRule={openCreateRule}
                  onEditRule={openEditRule}
                  onCloseRule={closeRule}
                  onDeleteRule={deleteRule}
                  onAddException={openCreateException}
                  onEditException={openEditException}
                  onDeleteException={deleteException}
                />
              ) : (
                <Card className="border-dashed border-zc-border/70">
                  <CardContent className="py-16 text-center text-sm text-zc-muted">
                    Select a service item to configure availability.
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rule/Calendar modal */}
      <AvailabilityRuleModal
        open={ruleOpen}
        onOpenChange={setRuleOpen}
        mode={ruleMode}
        branchId={branchId}
        serviceItem={selectedItem}
        editing={ruleEditing}
        onSaved={async () => {
          toast({ title: "Saved", description: "Availability calendar saved successfully." });
          if (selectedItem) await loadAvailabilityForItem(selectedItem.id, false);
        }}
      />

      {/* Exception/Blackout modal */}
      <AvailabilityExceptionModal
        open={exOpen}
        onOpenChange={setExOpen}
        mode={exMode}
        branchId={branchId}
        serviceItem={selectedItem}
        calendarId={activeCalendarId}
        editing={exEditing}
        onSaved={async () => {
          toast({ title: "Saved", description: "Availability exception saved successfully." });
          if (selectedItem) await loadAvailabilityForItem(selectedItem.id, false);
        }}
      />

      {/* Help dialog (simple) */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-[720px]">
          <DialogHeader>
            <DialogTitle>How Service Availability works</DialogTitle>
            <DialogDescription>
              Calendars contain weekly rules (windows) and blackouts (exceptions). Slot generation uses active calendars.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-zc-muted grid gap-2">
            <div>• Create a Calendar → add weekly windows (Mon–Sat etc).</div>
            <div>• Add Exceptions → blackouts for holidays/maintenance.</div>
            <div>• Deactivate a Calendar to stop using it.</div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelp(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </RequirePerm>
</AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Detail Panel                                 */
/* -------------------------------------------------------------------------- */

function AvailabilityDetail(props: {
  item: ServiceItemRow;
  busy: boolean;

  rulesLoading: boolean;
  rulesErr: string | null;
  rules: AvailabilityRuleRow[];
  exceptions: AvailabilityExceptionRow[];

  onRefresh: () => void;
  onAddRule: () => void;
  onEditRule: (r: AvailabilityRuleRow) => void;
  onCloseRule: (r: AvailabilityRuleRow) => void;
  onDeleteRule: (r: AvailabilityRuleRow) => void;

  onAddException: () => void;
  onEditException: (x: AvailabilityExceptionRow) => void;
  onDeleteException: (x: AvailabilityExceptionRow) => void;
}) {
  const {
    item,
    busy,
    rulesLoading,
    rulesErr,
    rules,
    exceptions,
    onRefresh,
    onAddRule,
    onEditRule,
    onCloseRule,
    onDeleteRule,
    onAddException,
    onEditException,
    onDeleteException,
  } = props;

  return (
    <Card className="border-zc-border/70">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">
              {item.code} — {item.name}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              Configure calendars (weekly windows) and blackout exceptions for this service item.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9" onClick={onRefresh} disabled={rulesLoading || busy}>
              <RefreshCw className={rulesLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
            <Button variant="primary" size="sm" className="gap-2" onClick={onAddRule} disabled={busy}>
              <Plus className="h-4 w-4" />
              Calendar
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={onAddException} disabled={busy}>
              <Ban className="h-4 w-4" />
              Exception
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        {rulesErr ? (
          <div className="rounded-2xl border border-zc-danger/40 bg-zc-danger/10 p-3 text-sm text-zc-danger flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div>{rulesErr}</div>
          </div>
        ) : null}

        <Tabs defaultValue="calendars">
          <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
            <TabsTrigger
              value="calendars"
              className={cn(
                "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
              )}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Calendars
            </TabsTrigger>
            <TabsTrigger
              value="exceptions"
              className={cn(
                "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
              )}
            >
              <Ban className="mr-2 h-4 w-4" />
              Exceptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendars" className="mt-4">
            <div className="rounded-2xl border border-zc-border/70 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[120px]">Mode</TableHead>
                    <TableHead className="w-[110px]">Slot</TableHead>
                    <TableHead className="w-[110px]">Lead</TableHead>
                    <TableHead className="w-[110px]">Window</TableHead>
                    <TableHead>Windows</TableHead>
                    <TableHead className="w-[70px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rulesLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10">
                        <div className="grid gap-2">
                          <Skeleton className="h-4 w-64" />
                          <Skeleton className="h-4 w-72" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-sm text-zc-muted">
                        No calendars yet. Create one using “Calendar”.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map((r) => {
                      const windows = Array.isArray(r.windows) ? r.windows : [];
                      const windowsSummary =
                        windows.length === 0
                          ? "—"
                          : windows
                              .slice(0, 3)
                              .map((w: any) => `${w.day} ${w.start}-${w.end}`)
                              .join(", ") + (windows.length > 3 ? "…" : "");

                      return (
                        <TableRow key={r.id}>
                          <TableCell>{activeBadge(Boolean(r.isActive))}</TableCell>
                          <TableCell className="text-sm">{r.mode || "APPOINTMENT"}</TableCell>
                          <TableCell className="text-sm">{r.slotMinutes ?? 15}m</TableCell>
                          <TableCell className="text-sm">{r.leadTimeMinutes ?? 60}m</TableCell>
                          <TableCell className="text-sm">{r.bookingWindowDays ?? 30}d</TableCell>
                          <TableCell className="text-sm text-zc-muted">{windowsSummary}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={busy}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Calendar</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => onEditRule(r)}>
                                  <Wrench className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const payload = {
                                      calendarId: r.id,
                                      mode: r.mode,
                                      timezone: r.timezone,
                                      slotMinutes: r.slotMinutes,
                                      leadTimeMinutes: r.leadTimeMinutes,
                                      bookingWindowDays: r.bookingWindowDays,
                                      maxPerDay: r.maxPerDay,
                                      maxPerSlot: r.maxPerSlot,
                                      effectiveFrom: r.effectiveFrom,
                                      notes: r.notes,
                                      windows: r.windows,
                                      rulesJson: r.rulesJson,
                                    };
                                    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Copy JSON
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onCloseRule(r)}>
                                  <Ban className="h-4 w-4 mr-2" />
                                  Deactivate
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-zc-danger" onClick={() => onDeleteRule(r)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 text-xs text-zc-muted">
              Note: “Windows” are persisted as calendar rules. Extra knobs (slot/lead/window/limits/notes) are persisted in calendar name metadata.
            </div>
          </TabsContent>

          <TabsContent value="exceptions" className="mt-4">
            <div className="rounded-2xl border border-zc-border/70 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[170px]">Time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-[70px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rulesLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10">
                        <Skeleton className="h-4 w-64" />
                      </TableCell>
                    </TableRow>
                  ) : exceptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-sm text-zc-muted">
                        No exceptions (blackouts).
                      </TableCell>
                    </TableRow>
                  ) : (
                    exceptions.map((x) => (
                      <TableRow key={x.id}>
                        <TableCell className="text-sm">{x.date || "—"}</TableCell>
                        <TableCell className="text-sm text-zc-muted">
                          {x.isClosed ? "Closed (full day)" : `${x.startTime || "—"} - ${x.endTime || "—"}`}
                        </TableCell>
                        <TableCell className="text-sm">{x.reason || "—"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" disabled={busy}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Exception</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => onEditException(x)}>
                                <Wrench className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-zc-danger" onClick={() => onDeleteException(x)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 text-xs text-zc-muted">
              Exceptions are stored as blackouts (time ranges) in the active calendar.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Calendar Modal                                */
/* -------------------------------------------------------------------------- */

function AvailabilityRuleModal(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  branchId: string;
  serviceItem: ServiceItemRow | null;
  editing: AvailabilityRuleRow | null; // calendar row
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { open, onOpenChange, mode, branchId, serviceItem, editing, onSaved } = props;

  const [tab, setTab] = React.useState<"basic" | "windows" | "advanced">("basic");
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState<CalendarPolicy & { isActive: boolean; windowsJsonText: string }>({
    mode: "APPOINTMENT",
    timezone: "Asia/Kolkata",
    slotMinutes: 15,
    leadTimeMinutes: 60,
    bookingWindowDays: 30,
    maxPerDay: null,
    maxPerSlot: null,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    notes: "",
    rulesJsonText: "",
    isActive: true,
    windowsJsonText: JSON.stringify(
      [
        { day: "MON", start: "09:00", end: "17:00", capacity: 1 },
        { day: "TUE", start: "09:00", end: "17:00", capacity: 1 },
        { day: "WED", start: "09:00", end: "17:00", capacity: 1 },
        { day: "THU", start: "09:00", end: "17:00", capacity: 1 },
        { day: "FRI", start: "09:00", end: "17:00", capacity: 1 },
        { day: "SAT", start: "09:00", end: "17:00", capacity: 1 },
      ],
      null,
      2,
    ),
  });

  React.useEffect(() => {
    if (!open) return;
    setTab("basic");

    if (mode === "edit" && editing) {
      // editing is a calendar row already mapped
      setForm((prev) => ({
        ...prev,
        mode: String(editing.mode || "APPOINTMENT"),
        timezone: String(editing.timezone || "Asia/Kolkata"),
        slotMinutes: editing.slotMinutes ?? 15,
        leadTimeMinutes: editing.leadTimeMinutes ?? 60,
        bookingWindowDays: editing.bookingWindowDays ?? 30,
        maxPerDay: editing.maxPerDay ?? null,
        maxPerSlot: editing.maxPerSlot ?? null,
        effectiveFrom: editing.effectiveFrom ? new Date(editing.effectiveFrom).toISOString().slice(0, 10) : "",
        notes: editing.notes || "",
        rulesJsonText: editing.rulesJson?.adv ? String(editing.rulesJson.adv) : "",
        isActive: Boolean(editing.isActive),
        windowsJsonText:
          editing.windows != null ? JSON.stringify(editing.windows, null, 2) : prev.windowsJsonText,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        isActive: true,
        notes: "",
        rulesJsonText: "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, editing]);

  function patch(p: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    if (!branchId || !serviceItem?.id) return;

    const { windows, error } = ensureWindowsJson(form.windowsJsonText);
    if (error) {
      toast({ title: "Invalid windows JSON", description: error, variant: "destructive" as any });
      return;
    }
    if (windows.length === 0) {
      const ok = window.confirm("No valid windows parsed. Save calendar without any weekly rules?");
      if (!ok) return;
    }

    const policy: CalendarPolicy = {
      mode: String(form.mode || "APPOINTMENT").trim(),
      timezone: String(form.timezone || "Asia/Kolkata").trim() || "Asia/Kolkata",
      slotMinutes: Number(form.slotMinutes ?? 15),
      leadTimeMinutes: Number(form.leadTimeMinutes ?? 60),
      bookingWindowDays: Number(form.bookingWindowDays ?? 30),
      maxPerDay: form.maxPerDay == null || form.maxPerDay === ("" as any) ? null : Number(form.maxPerDay),
      maxPerSlot: form.maxPerSlot == null || form.maxPerSlot === ("" as any) ? null : Number(form.maxPerSlot),
      effectiveFrom: String(form.effectiveFrom || "").trim(),
      notes: String(form.notes || "").trim(),
      rulesJsonText: String(form.rulesJsonText || "").trim(),
    };

    const name = buildCalendarName(policy);

    setSaving(true);
    try {
      // CREATE or UPDATE calendar
      let calendarId = editing?.id || "";
      if (mode === "create") {
        const created = await apiTryMany<ServiceAvailabilityCalendarApi>([
          {
            url: `/api/infrastructure/service-availability/calendars?${buildQS({ branchId })}`,
            init: {
              method: "POST",
              body: JSON.stringify({ serviceItemId: serviceItem.id, name, isActive: Boolean(form.isActive) }),
            },
          },
          {
            url: `/api/infra/service-availability/calendars?${buildQS({ branchId })}`,
            init: {
              method: "POST",
              body: JSON.stringify({ serviceItemId: serviceItem.id, name, isActive: Boolean(form.isActive) }),
            },
          },
        ]);
        calendarId = created.id;
      } else {
        if (!calendarId) throw new Error("Invalid calendar id");
        await apiTryMany([
          {
            url: `/api/infrastructure/service-availability/calendars/${encodeURIComponent(calendarId)}?${buildQS({
              branchId,
            })}`,
            init: { method: "PATCH", body: JSON.stringify({ name, isActive: Boolean(form.isActive) }) },
          },
          {
            url: `/api/infra/service-availability/calendars/${encodeURIComponent(calendarId)}?${buildQS({ branchId })}`,
            init: { method: "PATCH", body: JSON.stringify({ name, isActive: Boolean(form.isActive) }) },
          },
        ]);

        // wipe existing rules (deactivate all) then recreate from windows
        const existing = await apiTryMany<any>([
          { url: `/api/infrastructure/service-availability/calendars/${encodeURIComponent(calendarId)}/rules` },
          { url: `/api/infra/service-availability/calendars/${encodeURIComponent(calendarId)}/rules` },
        ]);
        const list = Array.isArray(existing) ? existing : (existing?.rows || []);
        for (const r of list) {
          if (!r?.id) continue;
          // eslint-disable-next-line no-await-in-loop
          await apiTryMany([
            {
              url: `/api/infrastructure/service-availability/rules/${encodeURIComponent(r.id)}`,
              init: { method: "DELETE" },
            },
            { url: `/api/infra/service-availability/rules/${encodeURIComponent(r.id)}`, init: { method: "DELETE" } },
          ]);
        }
      }

      // If calendar isActive true, best practice: deactivate other active calendars for same service item
      if (Boolean(form.isActive)) {
        const qs = buildQS({ branchId, serviceItemId: serviceItem.id });
        const cals = await apiTryMany<ServiceAvailabilityCalendarApi[]>([
          { url: `/api/infrastructure/service-availability/calendars?${qs}` },
          { url: `/api/infra/service-availability/calendars?${qs}` },
        ]);
        for (const c of cals) {
          if (c.id === calendarId) continue;
          if (!c.isActive) continue;
          // eslint-disable-next-line no-await-in-loop
          await apiTryMany([
            {
              url: `/api/infrastructure/service-availability/calendars/${encodeURIComponent(c.id)}?${buildQS({ branchId })}`,
              init: { method: "PATCH", body: JSON.stringify({ isActive: false }) },
            },
            {
              url: `/api/infra/service-availability/calendars/${encodeURIComponent(c.id)}?${buildQS({ branchId })}`,
              init: { method: "PATCH", body: JSON.stringify({ isActive: false }) },
            },
          ]);
        }
      }

      // Create rule windows
      for (const w of windows) {
        const dayOfWeek = DAY_TO_DOW[String(w.day).toUpperCase()];
        const startMinute = hhmmToMinutes(w.start)!;
        const endMinute = hhmmToMinutes(w.end)!;

        const capFromWindow = w.capacity == null ? undefined : Number(w.capacity);
        const capacity =
          typeof capFromWindow === "number" && Number.isFinite(capFromWindow)
            ? Math.max(0, capFromWindow)
            : (policy.maxPerSlot ?? 1);

        // eslint-disable-next-line no-await-in-loop
        await apiTryMany([
          {
            url: `/api/infrastructure/service-availability/calendars/${encodeURIComponent(calendarId)}/rules`,
            init: {
              method: "POST",
              body: JSON.stringify({ dayOfWeek, startMinute, endMinute, capacity, isActive: true }),
            },
          },
          {
            url: `/api/infra/service-availability/calendars/${encodeURIComponent(calendarId)}/rules`,
            init: {
              method: "POST",
              body: JSON.stringify({ dayOfWeek, startMinute, endMinute, capacity, isActive: true }),
            },
          },
        ]);
      }

      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <CalendarClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "New Availability Calendar" : "Edit Availability Calendar"}
          </DialogTitle>
          <DialogDescription>
            {serviceItem ? (
              <>
                For <span className="font-semibold text-zc-text">{serviceItem.code}</span> — {serviceItem.name}
              </>
            ) : (
              "Select a service item first."
            )}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="px-6 pb-6 grid gap-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
              <TabsTrigger
                value="basic"
                className={cn(
                  "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                )}
              >
                Basic
              </TabsTrigger>
              <TabsTrigger
                value="windows"
                className={cn(
                  "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                )}
              >
                Weekly Windows
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className={cn(
                  "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                )}
              >
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-4">
              <div className="grid gap-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Mode</Label>
                    <Select value={String(form.mode)} onValueChange={(v) => patch({ mode: v })}>
                      <SelectTrigger className="h-11 rounded-2xl bg-zc-panel/10">
                        <SelectValue placeholder="Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPOINTMENT">APPOINTMENT</SelectItem>
                        <SelectItem value="WALKIN">WALKIN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Timezone</Label>
                    <Input
                      className="h-11 rounded-2xl bg-zc-panel/10"
                      value={form.timezone}
                      onChange={(e) => patch({ timezone: e.target.value })}
                      placeholder="Asia/Kolkata"
                    />
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Slot Minutes</Label>
                    <Input
                      type="number"
                      className="h-11 rounded-2xl bg-zc-panel/10"
                      value={String(form.slotMinutes ?? 15)}
                      onChange={(e) => patch({ slotMinutes: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Lead Time (mins)</Label>
                    <Input
                      type="number"
                      className="h-11 rounded-2xl bg-zc-panel/10"
                      value={String(form.leadTimeMinutes ?? 60)}
                      onChange={(e) => patch({ leadTimeMinutes: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Booking Window (days)</Label>
                    <Input
                      type="number"
                      className="h-11 rounded-2xl bg-zc-panel/10"
                      value={String(form.bookingWindowDays ?? 30)}
                      onChange={(e) => patch({ bookingWindowDays: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Max per Day (optional)</Label>
                    <Input
                      type="number"
                      className="h-11 rounded-2xl bg-zc-panel/10"
                      value={form.maxPerDay == null ? "" : String(form.maxPerDay)}
                      onChange={(e) => patch({ maxPerDay: e.target.value === "" ? null : Number(e.target.value) })}
                      placeholder="(no limit)"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Max per Slot (optional)</Label>
                    <Input
                      type="number"
                      className="h-11 rounded-2xl bg-zc-panel/10"
                      value={form.maxPerSlot == null ? "" : String(form.maxPerSlot)}
                      onChange={(e) => patch({ maxPerSlot: e.target.value === "" ? null : Number(e.target.value) })}
                      placeholder="(no limit)"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Effective From</Label>
                    <Input
                      type="date"
                      className="h-11 rounded-2xl bg-zc-panel/10"
                      value={form.effectiveFrom || ""}
                      onChange={(e) => patch({ effectiveFrom: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    className="rounded-2xl bg-zc-panel/10 min-h-[90px]"
                    value={form.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                    placeholder="Optional notes for admins..."
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
                  <div>
                    <div className="text-sm font-medium">Active</div>
                    <div className="text-xs text-zc-muted">Active calendars are used to generate slots.</div>
                  </div>
                  <Switch checked={Boolean(form.isActive)} onCheckedChange={(v) => patch({ isActive: v })} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="windows" className="mt-4">
              <div className="grid gap-2">
                <Label>Weekly Windows JSON</Label>
                <Textarea
                  className="rounded-2xl bg-zc-panel/10 min-h-[240px] font-mono text-xs"
                  value={form.windowsJsonText}
                  onChange={(e) => patch({ windowsJsonText: e.target.value })}
                />
                <div className="text-xs text-zc-muted">
                  Format: <code>[{"{day:\"MON\",start:\"09:00\",end:\"17:00\",capacity:1}"}, ...]</code>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-4">
              <div className="grid gap-2">
                <Label>Advanced Rules JSON (optional)</Label>
                <Textarea
                  className="rounded-2xl bg-zc-panel/10 min-h-[180px] font-mono text-xs"
                  value={form.rulesJsonText}
                  onChange={(e) => patch({ rulesJsonText: e.target.value })}
                  placeholder="Optional advanced JSON (stored trimmed in calendar name metadata)."
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={saving || !serviceItem}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Blackout Modal                                 */
/* -------------------------------------------------------------------------- */

function AvailabilityExceptionModal(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  branchId: string;
  serviceItem: ServiceItemRow | null;
  calendarId: string | null;
  editing: AvailabilityExceptionRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { open, onOpenChange, mode, branchId, serviceItem, calendarId, editing, onSaved } = props;

  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState<{
    date: string;
    isClosed: boolean;
    startTime: string;
    endTime: string;
    reason: string;
    capacityOverride: string;
  }>({
    date: new Date().toISOString().slice(0, 10),
    isClosed: true,
    startTime: "09:00",
    endTime: "17:00",
    reason: "",
    capacityOverride: "",
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editing) {
      setForm({
        date: editing.date || new Date().toISOString().slice(0, 10),
        isClosed: Boolean(editing.isClosed),
        startTime: editing.startTime || "09:00",
        endTime: editing.endTime || "17:00",
        reason: editing.reason || "",
        capacityOverride: editing.capacityOverride == null ? "" : String(editing.capacityOverride),
      });
    } else {
      setForm((prev) => ({
        ...prev,
        date: new Date().toISOString().slice(0, 10),
        isClosed: true,
        reason: "",
        capacityOverride: "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, editing]);

  function patch(p: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  async function ensureCalendarId(): Promise<string> {
    if (calendarId) return calendarId;
    if (!serviceItem?.id) throw new Error("No service item selected");

    // bootstrap default calendar (also deactivates other actives)
    const qs = buildQS({ branchId, serviceItemId: serviceItem.id });
    const created = await apiTryMany<ServiceAvailabilityCalendarApi>([
      { url: `/api/infrastructure/service-availability/bootstrap?${qs}`, init: { method: "POST" } },
      { url: `/api/infra/service-availability/bootstrap?${qs}`, init: { method: "POST" } },
    ]);
    return created.id;
  }

  async function save() {
    if (!serviceItem?.id) return;

    const date = String(form.date || "").trim();
    if (!date) {
      toast({ title: "Date required", description: "Please pick a date.", variant: "destructive" as any });
      return;
    }

    const tzOff = localTzOffsetMins();
    let fromIso: string | null = null;
    let toIso: string | null = null;

    if (form.isClosed) {
      const startUtc = localDateStartUtc(date, tzOff);
      if (!startUtc) {
        toast({ title: "Invalid date", description: "Date format must be YYYY-MM-DD.", variant: "destructive" as any });
        return;
      }
      fromIso = startUtc.toISOString();
      toIso = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000).toISOString();
    } else {
      const s = String(form.startTime || "").trim();
      const e = String(form.endTime || "").trim();
      const sM = hhmmToMinutes(s);
      const eM = hhmmToMinutes(e);
      if (sM == null || eM == null || eM <= sM) {
        toast({
          title: "Invalid time",
          description: "Start/end time must be HH:mm and end must be after start.",
          variant: "destructive" as any,
        });
        return;
      }
      fromIso = localDateTimeToUtcIso(date, s, tzOff);
      toIso = localDateTimeToUtcIso(date, e, tzOff);
      if (!fromIso || !toIso) {
        toast({ title: "Invalid time", description: "Could not parse time.", variant: "destructive" as any });
        return;
      }
    }

    let reason = String(form.reason || "").trim();
    const cap = form.capacityOverride === "" ? null : Number(form.capacityOverride);
    if (Number.isFinite(cap as any)) {
      reason = `${reason ? reason + " " : ""}(capacity override: ${cap})`;
    }

    setSaving(true);
    try {
      const calId = await ensureCalendarId();

      if (mode === "create") {
        await apiTryMany([
          {
            url: `/api/infrastructure/service-availability/calendars/${encodeURIComponent(calId)}/blackouts`,
            init: { method: "POST", body: JSON.stringify({ from: fromIso, to: toIso, reason: reason || undefined }) },
          },
          {
            url: `/api/infra/service-availability/calendars/${encodeURIComponent(calId)}/blackouts`,
            init: { method: "POST", body: JSON.stringify({ from: fromIso, to: toIso, reason: reason || undefined }) },
          },
        ]);
      } else {
        if (!editing?.id) throw new Error("Invalid blackout id");
        await apiTryMany([
          {
            url: `/api/infrastructure/service-availability/blackouts/${encodeURIComponent(editing.id)}`,
            init: { method: "PATCH", body: JSON.stringify({ from: fromIso, to: toIso, reason: reason || undefined }) },
          },
          {
            url: `/api/infra/service-availability/blackouts/${encodeURIComponent(editing.id)}`,
            init: { method: "PATCH", body: JSON.stringify({ from: fromIso, to: toIso, reason: reason || undefined }) },
          },
        ]);
      }

      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Request failed", variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={drawerClassName("max-w-[760px]")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Ban className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === "create" ? "New Exception (Blackout)" : "Edit Exception (Blackout)"}
          </DialogTitle>
          <DialogDescription>
            {serviceItem ? (
              <>
                For <span className="font-semibold text-zc-text">{serviceItem.code}</span> — {serviceItem.name}
              </>
            ) : (
              "Select a service item first."
            )}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="px-6 pb-6 grid gap-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                className="h-11 rounded-2xl bg-zc-panel/10"
                value={form.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-zc-border bg-zc-panel/10 p-4">
              <div>
                <div className="text-sm font-medium">Closed Day</div>
                <div className="text-xs text-zc-muted">If enabled, blocks entire day.</div>
              </div>
              <Switch checked={form.isClosed} onCheckedChange={(v) => patch({ isClosed: v })} />
            </div>
          </div>

          {!form.isClosed ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid gap-2">
                <Label>Start Time</Label>
                <Input
                  className="h-11 rounded-2xl bg-zc-panel/10"
                  value={form.startTime}
                  onChange={(e) => patch({ startTime: e.target.value })}
                  placeholder="HH:mm"
                />
              </div>
              <div className="grid gap-2">
                <Label>End Time</Label>
                <Input
                  className="h-11 rounded-2xl bg-zc-panel/10"
                  value={form.endTime}
                  onChange={(e) => patch({ endTime: e.target.value })}
                  placeholder="HH:mm"
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label>Reason</Label>
            <Input
              className="h-11 rounded-2xl bg-zc-panel/10"
              value={form.reason}
              onChange={(e) => patch({ reason: e.target.value })}
              placeholder="Holiday / Maintenance / Staff unavailable..."
            />
          </div>

          <div className="grid gap-2">
            <Label>Capacity Override (optional)</Label>
            <Input
              type="number"
              className="h-11 rounded-2xl bg-zc-panel/10"
              value={form.capacityOverride}
              onChange={(e) => patch({ capacityOverride: e.target.value })}
              placeholder="Stored in reason for now"
            />
          </div>

          <div className="text-xs text-zc-muted">
            Note: Backend stores exceptions as blackouts. Capacity override will be appended to reason until booking module uses it.
          </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={saving || !serviceItem}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
