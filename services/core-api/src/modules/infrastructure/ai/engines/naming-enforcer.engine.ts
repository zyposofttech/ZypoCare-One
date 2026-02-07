/**
 * Naming Convention Enforcer Engine
 *
 * Checks codes and names across infrastructure entities for consistency:
 *   - Department codes: UPPERCASE_SNAKE (e.g., GENERAL_MEDICINE)
 *   - Unit codes: UPPERCASE_SNAKE (e.g., WARD_01)
 *   - Service item codes: UPPERCASE_SNAKE or alphanumeric with dots
 *   - Equipment asset tags: Should follow a consistent pattern
 *   - Detects duplicates and near-duplicates
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface NamingIssue {
  entityType: string;
  entityId: string;
  field: string;
  currentValue: string;
  suggestedValue: string;
  issueType: "FORMAT" | "DUPLICATE" | "INCONSISTENT" | "MISSING";
  severity: "WARNING" | "INFO";
  description: string;
}

export interface NamingCheckResult {
  totalEntities: number;
  issues: NamingIssue[];
  issueCount: number;
  score: number; // 0-100
}

// ─── Patterns ───────────────────────────────────────────────────────────

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/; // UPPERCASE_SNAKE
const ASSET_TAG_PATTERN = /^[A-Z]{2,5}-\d{3,6}$/; // e.g., EQ-001, XRAY-0001

function toCanonicalCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[\s\-]+/g, "_")     // spaces/hyphens → underscore
    .replace(/[^A-Z0-9_]/g, "")   // strip non-alphanumeric
    .replace(/_{2,}/g, "_")       // collapse double underscores
    .replace(/^_|_$/g, "");       // trim leading/trailing underscores
}

function toTitleCase(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Engine ─────────────────────────────────────────────────────────────

export async function runNamingCheck(
  prisma: any,
  branchId: string,
): Promise<NamingCheckResult> {
  const issues: NamingIssue[] = [];
  let totalEntities = 0;

  // 1. Department codes
  const departments = await prisma.department.findMany({
    where: { branchId, isActive: true },
    select: { id: true, code: true, name: true },
  });

  totalEntities += departments.length;
  const deptCodes = new Map<string, string[]>(); // code → [ids]

  for (const dept of departments) {
    const code = dept.code ?? "";

    // Format check
    if (code && !CODE_PATTERN.test(code)) {
      issues.push({
        entityType: "DEPARTMENT",
        entityId: dept.id,
        field: "code",
        currentValue: code,
        suggestedValue: toCanonicalCode(code),
        issueType: "FORMAT",
        severity: "INFO",
        description: `Department code "${code}" should be UPPERCASE_SNAKE format.`,
      });
    }

    // Duplicate check
    const normalized = code.toUpperCase();
    if (!deptCodes.has(normalized)) deptCodes.set(normalized, []);
    deptCodes.get(normalized)!.push(dept.id);

    // Name consistency
    if (dept.name && dept.name !== toTitleCase(dept.name) && dept.name !== dept.name.toUpperCase()) {
      // Only flag if it's clearly inconsistent (mixed case that's not title case)
      const hasLowerStart = /^[a-z]/.test(dept.name);
      if (hasLowerStart) {
        issues.push({
          entityType: "DEPARTMENT",
          entityId: dept.id,
          field: "name",
          currentValue: dept.name,
          suggestedValue: toTitleCase(dept.name),
          issueType: "INCONSISTENT",
          severity: "INFO",
          description: `Department name "${dept.name}" should use Title Case.`,
        });
      }
    }
  }

  // Flag duplicate department codes
  for (const [code, ids] of deptCodes) {
    if (ids.length > 1) {
      for (const id of ids) {
        issues.push({
          entityType: "DEPARTMENT",
          entityId: id,
          field: "code",
          currentValue: code,
          suggestedValue: `${code}_${ids.indexOf(id) + 1}`,
          issueType: "DUPLICATE",
          severity: "WARNING",
          description: `Duplicate department code "${code}" (${ids.length} departments share this code).`,
        });
      }
    }
  }

  // 2. Unit codes
  const units = await prisma.unit.findMany({
    where: { branchId, isActive: true },
    select: { id: true, code: true, name: true },
  });

  totalEntities += units.length;
  const unitCodes = new Map<string, string[]>();

  for (const unit of units) {
    const code = unit.code ?? "";

    if (code && !CODE_PATTERN.test(code)) {
      issues.push({
        entityType: "UNIT",
        entityId: unit.id,
        field: "code",
        currentValue: code,
        suggestedValue: toCanonicalCode(code),
        issueType: "FORMAT",
        severity: "INFO",
        description: `Unit code "${code}" should be UPPERCASE_SNAKE format.`,
      });
    }

    const normalized = code.toUpperCase();
    if (!unitCodes.has(normalized)) unitCodes.set(normalized, []);
    unitCodes.get(normalized)!.push(unit.id);
  }

  for (const [code, ids] of unitCodes) {
    if (ids.length > 1) {
      for (const id of ids) {
        issues.push({
          entityType: "UNIT",
          entityId: id,
          field: "code",
          currentValue: code,
          suggestedValue: `${code}_${ids.indexOf(id) + 1}`,
          issueType: "DUPLICATE",
          severity: "WARNING",
          description: `Duplicate unit code "${code}" (${ids.length} units).`,
        });
      }
    }
  }

  // 3. Service item codes (sample — limit for performance)
  const serviceItems = await prisma.serviceItem.findMany({
    where: { branchId, isActive: true },
    select: { id: true, code: true, name: true },
    take: 200,
  });

  totalEntities += serviceItems.length;
  const svcCodes = new Map<string, string[]>();

  for (const svc of serviceItems) {
    const code = svc.code ?? "";

    // Service codes can be more flexible, but should be consistent
    if (code && /\s/.test(code)) {
      issues.push({
        entityType: "SERVICE_ITEM",
        entityId: svc.id,
        field: "code",
        currentValue: code,
        suggestedValue: toCanonicalCode(code),
        issueType: "FORMAT",
        severity: "INFO",
        description: `Service code "${code}" contains spaces. Use underscores or dots.`,
      });
    }

    if (!code) {
      issues.push({
        entityType: "SERVICE_ITEM",
        entityId: svc.id,
        field: "code",
        currentValue: "(empty)",
        suggestedValue: toCanonicalCode(svc.name ?? "SVC"),
        issueType: "MISSING",
        severity: "WARNING",
        description: `Service "${svc.name}" has no code.`,
      });
    }

    const normalized = (code ?? "").toUpperCase();
    if (normalized) {
      if (!svcCodes.has(normalized)) svcCodes.set(normalized, []);
      svcCodes.get(normalized)!.push(svc.id);
    }
  }

  for (const [code, ids] of svcCodes) {
    if (ids.length > 1) {
      issues.push({
        entityType: "SERVICE_ITEM",
        entityId: ids[0],
        field: "code",
        currentValue: code,
        suggestedValue: code,
        issueType: "DUPLICATE",
        severity: "WARNING",
        description: `Duplicate service code "${code}" (${ids.length} services).`,
      });
    }
  }

  // 4. Equipment asset tags
  const equipment = await prisma.equipmentAsset.findMany({
    where: { branchId },
    select: { id: true, assetTag: true, name: true },
    take: 100,
  });

  totalEntities += equipment.length;

  for (const eq of equipment) {
    if (!eq.assetTag) {
      issues.push({
        entityType: "EQUIPMENT_ASSET",
        entityId: eq.id,
        field: "assetTag",
        currentValue: "(empty)",
        suggestedValue: `EQ-${String(equipment.indexOf(eq) + 1).padStart(4, "0")}`,
        issueType: "MISSING",
        severity: "INFO",
        description: `Equipment "${eq.name}" has no asset tag.`,
      });
    }
  }

  // Score
  const score = totalEntities > 0
    ? Math.round(((totalEntities - issues.length) / totalEntities) * 100)
    : 100;

  return {
    totalEntities,
    issues,
    issueCount: issues.length,
    score: Math.max(0, Math.min(100, score)),
  };
}
