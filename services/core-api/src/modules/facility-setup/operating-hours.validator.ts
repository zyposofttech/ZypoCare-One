export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export type TimeRange = { start: string; end: string };

export type Shift = {
  start: string; // HH:MM (24h)
  end: string; // HH:MM (24h)
  breaks?: TimeRange[];
};

export type OperatingHours = {
  is24x7?: boolean;
  timezone?: string;
  days?: Partial<Record<Weekday, Shift[]>>;
  mode?: "24X7" | "WEEKLY";
};

const DAY_ORDER: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function parseHHMM(s: string): number | null {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function overlaps(a: TimeRange, b: TimeRange): boolean {
  const as = parseHHMM(a.start);
  const ae = parseHHMM(a.end);
  const bs = parseHHMM(b.start);
  const be = parseHHMM(b.end);
  if (as == null || ae == null || bs == null || be == null) return true;
  return as < be && bs < ae;
}

function normalize(input: any): OperatingHours {
  if (!input || typeof input !== "object") return {};
  const out: OperatingHours = {};
  out.is24x7 = input.is24x7 === true || input.mode === "24X7";
  if (typeof input.timezone === "string") out.timezone = input.timezone;

  const days = input.days ?? input.week ?? input.weekly ?? null;
  if (days && typeof days === "object") {
    out.days = {};
    for (const d of DAY_ORDER) {
      const raw = days[d] ?? days[d.toLowerCase()] ?? null;
      if (!raw) continue;
      const arr = Array.isArray(raw) ? raw : [raw];
      out.days[d] = arr
        .filter(Boolean)
        .map((x: any) => ({
          start: String(x.start ?? "").trim(),
          end: String(x.end ?? "").trim(),
          breaks: Array.isArray(x.breaks)
            ? x.breaks
                .filter(Boolean)
                .map((b: any) => ({
                  start: String(b.start ?? "").trim(),
                  end: String(b.end ?? "").trim(),
                }))
            : undefined,
        }));
    }
  }
  return out;
}

export function validateOperatingHours(
  input: any,
  opts?: { departmentCode?: string | null; departmentName?: string | null },
): { normalized: OperatingHours; warnings: string[] } {
  const warnings: string[] = [];
  const oh = normalize(input);

  if (!oh.is24x7) {
    const anyShift = DAY_ORDER.some((d) => (oh.days?.[d]?.length ?? 0) > 0);
    if (!anyShift) throw new Error("If not 24x7, at least one day must have operating hours.");
  }

  for (const d of DAY_ORDER) {
    const shifts = oh.days?.[d] ?? [];
    for (const [i, s] of shifts.entries()) {
      const start = parseHHMM(s.start);
      const end = parseHHMM(s.end);
      if (start == null || end == null) throw new Error(`Invalid time format for ${d} shift #${i + 1}. Use HH:MM.`);
      if (start >= end) throw new Error(`${d} shift #${i + 1}: start time must be before end time.`);

      for (const [j, b] of (s.breaks ?? []).entries()) {
        const bs = parseHHMM(b.start);
        const be = parseHHMM(b.end);
        if (bs == null || be == null) throw new Error(`Invalid break time format for ${d} shift #${i + 1}, break #${j + 1}.`);
        if (!(start <= bs && bs < be && be <= end)) throw new Error(`${d} shift #${i + 1}, break #${j + 1}: break must be within operating hours.`);
      }
    }

    const ranges = shifts.map((s) => ({ start: s.start, end: s.end }));
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        if (overlaps(ranges[i], ranges[j])) throw new Error(`${d}: multiple shifts cannot overlap.`);
      }
    }
  }

  const code = (opts?.departmentCode ?? "").toUpperCase();
  const name = (opts?.departmentName ?? "").toUpperCase();
  const looksEmergency = code === "ER" || code.includes("EMERG") || name.includes("EMERGENCY") || name.includes("CASUALTY");
  if (looksEmergency && !oh.is24x7) warnings.push("Emergency departments are typically 24x7 (warning).");

  return { normalized: oh, warnings };
}
