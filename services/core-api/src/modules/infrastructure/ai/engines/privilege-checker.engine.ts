/**
 * Privilege Gap Detector Engine
 *
 * Checks doctor staff against specialty-privilege mapping to detect
 * missing clinical privileges. For example:
 *   - Surgeon without OT:PERFORM privilege
 *   - Admitting doctor without IPD:DISCHARGE privilege
 *   - Anesthesiologist without ICU:PRESCRIBE privilege
 */

import * as specialtyMap from "../data/specialty-department-map.json";

// ─── Types ──────────────────────────────────────────────────────────────

export interface PrivilegeGap {
  staffId: string;
  staffName: string;
  specialty: string;
  department: string | null;
  currentPrivileges: string[];
  requiredPrivileges: string[];
  missingPrivileges: string[];
  severity: "BLOCKER" | "WARNING";
  suggestion: string;
}

export interface PrivilegeGapResult {
  totalDoctors: number;
  doctorsChecked: number;
  gaps: PrivilegeGap[];
  blockerCount: number;
  warningCount: number;
  score: number; // 0-100
  summary: string;
}

// ─── Engine ─────────────────────────────────────────────────────────────

export async function runPrivilegeGapCheck(
  prisma: any,
  branchId: string,
): Promise<PrivilegeGapResult> {
  const privilegeMap = (specialtyMap as any).specialtyPrivileges ?? {};

  // Fetch all active doctors with their assignments and privileges
  const doctors = await prisma.staff.findMany({
    where: {
      isActive: true,
      category: "MEDICAL",
      assignments: { some: { branchId, status: "ACTIVE" } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      speciality: true,
      privileges: true, // JSON array of privilege strings
      assignments: {
        where: { branchId, status: "ACTIVE" },
        select: {
          department: {
            select: { code: true, name: true },
          },
        },
      },
    },
  });

  const totalDoctors = doctors.length;
  const gaps: PrivilegeGap[] = [];
  let doctorsChecked = 0;

  for (const doc of doctors) {
    const staffName = [doc.firstName, doc.lastName].filter(Boolean).join(" ");
    const specialty = doc.speciality ?? "";

    // Skip if no specialty mapped
    if (!specialty || !privilegeMap[specialty]) continue;

    doctorsChecked++;

    const requiredPrivileges: string[] = privilegeMap[specialty] ?? [];
    const currentPrivileges: string[] = Array.isArray(doc.privileges) ? doc.privileges : [];
    const departmentName = doc.assignments?.[0]?.department?.name ?? null;

    const missing = requiredPrivileges.filter(
      (rp: string) => !currentPrivileges.some((cp) => cp === rp || cp.startsWith(rp.split(":")[0] + ":")),
    );

    if (missing.length > 0) {
      // Surgical privileges are blockers, others are warnings
      const hasSurgicalGap = missing.some((m) => m.includes("OT:PERFORM"));
      const severity: PrivilegeGap["severity"] = hasSurgicalGap ? "BLOCKER" : "WARNING";

      const missingReadable = missing.map((m) => {
        const [area, action] = m.split(":");
        return `${action ?? m} in ${area}`;
      });

      gaps.push({
        staffId: doc.id,
        staffName,
        specialty,
        department: departmentName,
        currentPrivileges,
        requiredPrivileges,
        missingPrivileges: missing,
        severity,
        suggestion: `Grant ${staffName} the following privileges: ${missingReadable.join(", ")}. Navigate to Staff → ${staffName} → Privileges.`,
      });
    }
  }

  // Sort: blockers first
  gaps.sort((a, b) => {
    if (a.severity === "BLOCKER" && b.severity !== "BLOCKER") return -1;
    if (a.severity !== "BLOCKER" && b.severity === "BLOCKER") return 1;
    return a.staffName.localeCompare(b.staffName);
  });

  const blockerCount = gaps.filter((g) => g.severity === "BLOCKER").length;
  const warningCount = gaps.filter((g) => g.severity === "WARNING").length;
  const score = doctorsChecked > 0
    ? Math.round(((doctorsChecked - gaps.length) / doctorsChecked) * 100)
    : 100;

  let summary: string;
  if (gaps.length === 0) {
    summary = `All ${doctorsChecked} doctors have appropriate privileges for their specialty.`;
  } else {
    summary = `${gaps.length} privilege gap(s) found across ${doctorsChecked} doctors (${blockerCount} blockers, ${warningCount} warnings).`;
  }

  return {
    totalDoctors,
    doctorsChecked,
    gaps,
    blockerCount,
    warningCount,
    score,
    summary,
  };
}
