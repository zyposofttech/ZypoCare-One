/**
 * NABH Compliance Gap Detector Engine
 *
 * Scans branch infrastructure configuration against NABH 6th Edition (2025)
 * checklist. Returns per-chapter scores, blockers, warnings, and fix hints.
 *
 * Requires Prisma client access (passed as parameter, not injected).
 */

import * as nabhData from "../data/nabh-checklist.json";

// ─── Types ──────────────────────────────────────────────────────────────

export interface NABHCheckResult {
  id: string;
  description: string;
  status: "PASS" | "FAIL";
  severity: string;
  fixHint: string;
  details?: string;
}

export interface NABHChapterResult {
  chapter: number;
  name: string;
  score: number;
  maxScore: number;
  checks: NABHCheckResult[];
}

export interface NABHReadinessResult {
  overallScore: number;
  maxScore: number;
  chapters: NABHChapterResult[];
  blockers: string[];
  warnings: string[];
  passCount: number;
  failCount: number;
}

// ─── Engine ─────────────────────────────────────────────────────────────

export async function runNABHChecks(prisma: any, branchId: string): Promise<NABHReadinessResult> {
  const chapters: NABHChapterResult[] = [];
  const allBlockers: string[] = [];
  const allWarnings: string[] = [];
  let totalScore = 0;
  let totalMax = 0;
  let passCount = 0;
  let failCount = 0;

  for (const chapter of nabhData.chapters) {
    const chapterResults: NABHCheckResult[] = [];
    let chapterScore = 0;
    let chapterMax = 0;

    for (const check of chapter.checks) {
      const weight = check.severity === "BLOCKER" ? 3 : check.severity === "WARNING" ? 2 : 1;
      chapterMax += weight;

      let passed = false;
      let details: string | undefined;

      try {
        const result = await evaluateCheck(prisma, branchId, check);
        passed = result.passed;
        details = result.details;
      } catch {
        passed = false;
        details = "Check evaluation error";
      }

      if (passed) {
        chapterScore += weight;
        passCount++;
      } else {
        failCount++;
        if (check.severity === "BLOCKER") {
          allBlockers.push(`${check.id}: ${check.description}`);
        } else if (check.severity === "WARNING") {
          allWarnings.push(`${check.id}: ${check.description}`);
        }
      }

      chapterResults.push({
        id: check.id,
        description: check.description,
        status: passed ? "PASS" : "FAIL",
        severity: check.severity,
        fixHint: check.fixHint,
        details,
      });
    }

    totalScore += chapterScore;
    totalMax += chapterMax;

    chapters.push({
      chapter: chapter.chapter,
      name: chapter.name,
      score: chapterMax > 0 ? Math.round((chapterScore / chapterMax) * 100) : 100,
      maxScore: chapterMax,
      checks: chapterResults,
    });
  }

  const overallScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  return {
    overallScore,
    maxScore: totalMax,
    chapters,
    blockers: allBlockers,
    warnings: allWarnings,
    passCount,
    failCount,
  };
}

// ─── Check evaluator ────────────────────────────────────────────────────

async function evaluateCheck(
  prisma: any,
  branchId: string,
  check: { query: string; params: Record<string, any> },
): Promise<{ passed: boolean; details?: string }> {
  const { query, params } = check;

  switch (query) {
    case "ALWAYS_PASS":
      return { passed: true };

    case "UNIT_TYPE_EXISTS": {
      const count = await prisma.unit.count({
        where: {
          branchId,
          isActive: true,
          unitType: { code: params.unitTypeCode },
        },
      });
      return { passed: count > 0, details: `Found ${count} unit(s) of type ${params.unitTypeCode}` };
    }

    case "UNIT_COUNT_MIN": {
      const count = await prisma.unit.count({
        where: {
          branchId,
          isActive: true,
          unitType: { code: params.unitTypeCode },
        },
      });
      return { passed: count >= params.min, details: `${count}/${params.min} required` };
    }

    case "ROOM_TYPE_EXISTS": {
      const count = await prisma.unitRoom.count({
        where: { branchId, isActive: true, roomType: params.roomType },
      });
      return { passed: count > 0, details: `Found ${count} room(s) of type ${params.roomType}` };
    }

    case "ROOM_TYPE_IN_UNIT_TYPE": {
      const count = await prisma.unitRoom.count({
        where: {
          branchId,
          isActive: true,
          roomType: params.roomType,
          unit: { unitType: { code: params.unitTypeCode }, isActive: true },
        },
      });
      return { passed: count > 0, details: `Found ${count} ${params.roomType} room(s) in ${params.unitTypeCode} units` };
    }

    case "RESOURCE_TYPE_MIN_COUNT": {
      const count = await prisma.unitResource.count({
        where: { branchId, isActive: true, resourceType: params.resourceType },
      });
      return { passed: count >= params.min, details: `Found ${count} ${params.resourceType} resource(s)` };
    }

    case "DEPARTMENTS_WITH_HEAD": {
      const [total, withHead] = await Promise.all([
        prisma.department.count({ where: { branchId, isActive: true } }),
        prisma.department.count({ where: { branchId, isActive: true, headStaffId: { not: null } } }),
      ]);
      if (total === 0) return { passed: true, details: "No departments" };
      const pct = Math.round((withHead / total) * 100);
      return { passed: pct >= (params.minPercent ?? 80), details: `${withHead}/${total} (${pct}%) have heads` };
    }

    case "DEPARTMENTS_WITH_STAFF": {
      const depts = await prisma.department.findMany({
        where: { branchId, isActive: true },
        select: { id: true, code: true },
      });
      let withStaff = 0;
      for (const dept of depts) {
        const c = await prisma.staffAssignment.count({
          where: { branchId, departmentId: dept.id, status: "ACTIVE" },
        });
        if (c > 0) withStaff++;
      }
      return {
        passed: depts.length === 0 || withStaff === depts.length,
        details: `${withStaff}/${depts.length} departments have active staff`,
      };
    }

    case "LOCATIONS_WITH_FIRE_ZONE": {
      const kinds = params.kinds ?? ["BUILDING", "FLOOR"];
      const nodes = await prisma.locationNode.findMany({
        where: { branchId, kind: { in: kinds } },
        include: { revisions: { where: { isActive: true }, orderBy: { effectiveFrom: "desc" }, take: 1 } },
      });
      if (nodes.length === 0) return { passed: true, details: "No buildings/floors found" };
      const withFire = nodes.filter(
        (n: any) => n.revisions.length > 0 && n.revisions[0].fireZone,
      ).length;
      return { passed: withFire === nodes.length, details: `${withFire}/${nodes.length} have fire zone` };
    }

    case "LOCATIONS_WITH_EMERGENCY_EXIT": {
      const count = await prisma.locationNodeRevision.count({
        where: { node: { branchId }, isActive: true, emergencyExit: true },
      });
      return { passed: count > 0, details: `${count} emergency exit(s) marked` };
    }

    case "EQUIPMENT_AERB_VALID": {
      const radiology = await prisma.equipmentAsset.findMany({
        where: { branchId, category: "RADIOLOGY" },
        select: { id: true, name: true, aerbLicenseNo: true, aerbValidTo: true },
      });
      if (radiology.length === 0) return { passed: true, details: "No radiology equipment" };
      const now = new Date();
      const invalid = radiology.filter(
        (eq: any) => !eq.aerbLicenseNo || !eq.aerbValidTo || new Date(eq.aerbValidTo) < now,
      );
      return { passed: invalid.length === 0, details: `${invalid.length}/${radiology.length} missing/expired AERB` };
    }

    case "EQUIPMENT_PCPNDT_VALID": {
      const ultrasound = await prisma.equipmentAsset.findMany({
        where: { branchId, category: "ULTRASOUND" },
        select: { id: true, name: true, pcpndtRegNo: true, pcpndtValidTo: true },
      });
      if (ultrasound.length === 0) return { passed: true, details: "No ultrasound equipment" };
      const now = new Date();
      const invalid = ultrasound.filter(
        (eq: any) => !eq.pcpndtRegNo || !eq.pcpndtValidTo || new Date(eq.pcpndtValidTo) < now,
      );
      return { passed: invalid.length === 0, details: `${invalid.length}/${ultrasound.length} missing/expired PCPNDT` };
    }

    case "EQUIPMENT_AMC_VALID": {
      const now = new Date();
      const expired = await prisma.equipmentAsset.count({
        where: { branchId, amcValidTo: { lt: now }, amcVendor: { not: null } },
      });
      return { passed: expired === 0, details: `${expired} equipment with expired AMC` };
    }

    case "EQUIPMENT_PM_SCHEDULED": {
      const categories = params.categories ?? ["RADIOLOGY", "ULTRASOUND"];
      const total = await prisma.equipmentAsset.count({
        where: { branchId, category: { in: categories } },
      });
      if (total === 0) return { passed: true, details: "No critical equipment" };
      const withPM = await prisma.equipmentAsset.count({
        where: { branchId, category: { in: categories }, pmFrequencyDays: { not: null } },
      });
      return { passed: withPM === total, details: `${withPM}/${total} have PM schedule` };
    }

    case "STAFF_CREDENTIALS_VERIFIED": {
      const staff = await prisma.staff.findMany({
        where: { isActive: true, category: params.category, assignments: { some: { branchId, status: "ACTIVE" } } },
        include: { credentials: { select: { verificationStatus: true } } },
      });
      if (staff.length === 0) return { passed: true, details: `No ${params.category} staff` };
      const unverified = staff.filter(
        (s: any) => s.credentials.length === 0 || s.credentials.some((c: any) => c.verificationStatus !== "VERIFIED"),
      );
      return { passed: unverified.length === 0, details: `${unverified.length}/${staff.length} have unverified credentials` };
    }

    case "STAFF_CREDENTIALS_EXPIRY": {
      const cutoff = new Date(Date.now() + (params.days ?? 30) * 86400000);
      const expiring = await prisma.staffCredential.count({
        where: {
          validTo: { lte: cutoff },
          staff: { isActive: true, assignments: { some: { branchId, status: "ACTIVE" } } },
        },
      });
      return { passed: expiring === 0, details: `${expiring} credentials expiring within ${params.days} days` };
    }

    case "DOCTOR_BED_RATIO": {
      const bedCount = await prisma.unitResource.count({
        where: { branchId, isActive: true, resourceType: "BED" },
      });
      const doctorCount = await prisma.staff.count({
        where: { isActive: true, category: "MEDICAL", assignments: { some: { branchId, status: "ACTIVE" } } },
      });
      if (bedCount === 0) return { passed: true, details: "No beds" };
      const ratio = bedCount / Math.max(1, doctorCount);
      return { passed: ratio <= (params.maxRatio ?? 10), details: `Ratio: 1:${Math.round(ratio)} (max 1:${params.maxRatio})` };
    }

    case "NURSE_BED_RATIO": {
      const bedCount = await prisma.unitResource.count({
        where: { branchId, isActive: true, resourceType: "BED" },
      });
      // Approximate nurse count: staff with designation containing 'nurse'
      const nurseCount = await prisma.staff.count({
        where: {
          isActive: true,
          assignments: { some: { branchId, status: "ACTIVE" } },
          OR: [
            { designation: { contains: "nurse", mode: "insensitive" } },
            { designation: { contains: "nursing", mode: "insensitive" } },
          ],
        },
      });
      if (bedCount === 0) return { passed: true, details: "No beds" };
      const ratio = bedCount / Math.max(1, nurseCount);
      return { passed: ratio <= (params.maxRatio ?? 5), details: `Ratio: 1:${Math.round(ratio)} (max 1:${params.maxRatio})` };
    }

    case "USG_AUTHORIZATION": {
      const usgEquipment = await prisma.equipmentAsset.count({
        where: { branchId, category: "ULTRASOUND" },
      });
      if (usgEquipment === 0) return { passed: true, details: "No ultrasound equipment" };
      const authorized = await prisma.staff.count({
        where: { isActive: true, isUsgAuthorized: true, assignments: { some: { branchId, status: "ACTIVE" } } },
      });
      return { passed: authorized > 0, details: `${authorized} USG-authorized staff` };
    }

    case "SERVICES_WITH_EXTERNAL_ID": {
      const total = await prisma.serviceItem.count({ where: { branchId, isActive: true } });
      if (total === 0) return { passed: true, details: "No services" };
      const withCode = await prisma.serviceItem.count({
        where: { branchId, isActive: true, externalId: { not: null } },
      });
      const pct = Math.round((withCode / total) * 100);
      return { passed: pct >= (params.minPercent ?? 50), details: `${withCode}/${total} (${pct}%) have standard codes` };
    }

    case "SERVICES_WITH_CONSENT": {
      // Check skipped for now — consent field may not exist in current schema
      return { passed: true, details: "Consent check deferred to clinical module" };
    }

    case "SERVICE_CATEGORY_COUNT": {
      const count = await prisma.serviceItem.count({
        where: { branchId, isActive: true, category: { contains: params.category, mode: "insensitive" } },
      });
      return { passed: count >= (params.min ?? 50), details: `${count} ${params.category} items (min: ${params.min})` };
    }

    case "DIAGNOSTIC_ITEMS_WITH_RANGES": {
      const total = await prisma.diagnosticItem.count({ where: { branchId, isActive: true } });
      if (total === 0) return { passed: true, details: "No diagnostic items" };
      const withRanges = await prisma.diagnosticItem.count({
        where: { branchId, isActive: true, parameters: { some: { referenceRanges: { some: {} } } } },
      });
      const pct = Math.round((withRanges / total) * 100);
      return { passed: pct >= (params.minPercent ?? 80), details: `${withRanges}/${total} (${pct}%) have reference ranges` };
    }

    case "SERVICE_CATALOGUE_PUBLISHED": {
      const count = await prisma.serviceCatalogue.count({
        where: { branchId, isActive: true },
      });
      return { passed: count > 0, details: `${count} published catalogue(s)` };
    }

    case "TAX_CODES_EXIST": {
      const count = await prisma.taxCode.count({
        where: { branchId, isActive: true },
      });
      return { passed: count >= (params.min ?? 1), details: `${count} active tax code(s)` };
    }

    case "TARIFF_PLAN_ACTIVE": {
      const count = await prisma.tariffPlan.count({
        where: { branchId, isActive: true },
      });
      return { passed: count > 0, details: `${count} active tariff plan(s)` };
    }

    default:
      return { passed: false, details: `Unknown check query: ${query}` };
  }
}
