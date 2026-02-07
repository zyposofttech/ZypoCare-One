/**
 * Fix Suggestion Engine
 *
 * For every open FixIt task, generates a specific actionable fix
 * with a deep-link route and optional auto-fix payload.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface FixSuggestion {
  fixItId: string;
  fixItType: string;
  fixItTitle: string;
  severity: string;
  entityType: string | null;
  entityId: string | null;
  suggestedAction: string;
  actionType: "NAVIGATE" | "AUTO_FIX" | "MANUAL";
  navigateTo: string | null;
  autoFixPayload?: Record<string, any>;
}

export interface FixSuggestionsResult {
  total: number;
  suggestions: FixSuggestion[];
  navigable: number;
  autoFixable: number;
  manual: number;
}

// ─── Route Templates ────────────────────────────────────────────────────

const ROUTE_MAP: Record<string, {
  route: (entityId: string, details?: any) => string;
  action: string;
  type: "NAVIGATE" | "AUTO_FIX" | "MANUAL";
}> = {
  SERVICE_CHARGE_MAPPING_MISSING: {
    route: (id) => `/infra/service-items/${id}/billing`,
    action: "Map this service to a charge master item to enable billing.",
    type: "NAVIGATE",
  },
  TARIFF_RATE_MISSING: {
    route: (id, d) => `/infra/tariff-plans/${d?.tariffPlanId ?? ""}?highlight=${id}`,
    action: "Add a tariff rate for this charge master item in the active price list.",
    type: "NAVIGATE",
  },
  TAX_CODE_MISSING: {
    route: (id) => `/infra/charge-master/${id}`,
    action: "Assign a tax code to this charge master item (use GST_EXEMPT for most clinical services).",
    type: "NAVIGATE",
  },
  TAX_CODE_INACTIVE: {
    route: (id) => `/infra/tax-codes/${id}`,
    action: "Reactivate this tax code or reassign the charge master item to an active tax code.",
    type: "NAVIGATE",
  },
  CHARGE_UNIT_MISMATCH: {
    route: (id) => `/infra/service-items/${id}/billing`,
    action: "The charge unit on the service item doesn't match the charge master item. Review and align them.",
    type: "NAVIGATE",
  },
  PACKAGE_PRICING_MISSING: {
    route: (id) => `/infra/service-packages/${id}`,
    action: "Set the pricing value for this package based on its pricing mode.",
    type: "NAVIGATE",
  },
  // NABH-originated FixIts
  NABH_GAP: {
    route: () => `/infra/ai/nabh-readiness`,
    action: "Review the NABH readiness report and follow fix hints for each failing check.",
    type: "NAVIGATE",
  },
  // Infrastructure consistency
  UNIT_NO_BEDS: {
    route: (id) => `/infra/units/${id}/resources`,
    action: "Add bed resources to this IPD unit.",
    type: "NAVIGATE",
  },
  UNIT_NO_ROOMS: {
    route: (id) => `/infra/units/${id}/rooms`,
    action: "Add consultation rooms to this OPD unit.",
    type: "NAVIGATE",
  },
  DEPARTMENT_NO_HEAD: {
    route: (id) => `/infra/departments/${id}`,
    action: "Assign a department head to this department.",
    type: "NAVIGATE",
  },
  CREDENTIAL_EXPIRED: {
    route: (id) => `/infra/staff/${id}/credentials`,
    action: "Renew the expired credential for this staff member.",
    type: "NAVIGATE",
  },
  EQUIPMENT_COMPLIANCE: {
    route: (id) => `/infra/equipment/${id}`,
    action: "Upload the required AERB/PCPNDT compliance documents for this equipment.",
    type: "NAVIGATE",
  },
};

// ─── Engine ─────────────────────────────────────────────────────────────

export async function generateFixSuggestions(
  prisma: any,
  branchId: string,
): Promise<FixSuggestionsResult> {
  const openFixIts = await prisma.fixItTask.findMany({
    where: {
      branchId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    select: {
      id: true,
      type: true,
      title: true,
      severity: true,
      entityType: true,
      entityId: true,
      details: true,
    },
    orderBy: [
      { severity: "asc" }, // BLOCKER first
      { createdAt: "asc" },
    ],
  });

  const suggestions: FixSuggestion[] = [];

  for (const fix of openFixIts) {
    const typeStr = String(fix.type);
    const mapping = ROUTE_MAP[typeStr];

    if (mapping) {
      const entityId = fix.entityId ?? "";
      const details = fix.details && typeof fix.details === "object" ? fix.details : {};

      suggestions.push({
        fixItId: fix.id,
        fixItType: typeStr,
        fixItTitle: fix.title,
        severity: fix.severity,
        entityType: fix.entityType,
        entityId: fix.entityId,
        suggestedAction: mapping.action,
        actionType: mapping.type,
        navigateTo: mapping.route(entityId, details),
      });
    } else {
      // Fallback: generic suggestion based on entity type
      let navigateTo: string | null = null;
      let suggestedAction = `Review and resolve this issue manually: ${fix.title}`;

      if (fix.entityType === "SERVICE_ITEM" && fix.entityId) {
        navigateTo = `/infra/service-items/${fix.entityId}`;
        suggestedAction = `Review service item configuration and fix: ${fix.title}`;
      } else if (fix.entityType === "CHARGE_MASTER_ITEM" && fix.entityId) {
        navigateTo = `/infra/charge-master/${fix.entityId}`;
        suggestedAction = `Review charge master item and fix: ${fix.title}`;
      } else if (fix.entityType === "SERVICE_PACKAGE" && fix.entityId) {
        navigateTo = `/infra/service-packages/${fix.entityId}`;
        suggestedAction = `Review package configuration and fix: ${fix.title}`;
      } else if (fix.entityType === "TAX_CODE" && fix.entityId) {
        navigateTo = `/infra/tax-codes/${fix.entityId}`;
        suggestedAction = `Review tax code and fix: ${fix.title}`;
      }

      suggestions.push({
        fixItId: fix.id,
        fixItType: typeStr,
        fixItTitle: fix.title,
        severity: fix.severity,
        entityType: fix.entityType,
        entityId: fix.entityId,
        suggestedAction,
        actionType: navigateTo ? "NAVIGATE" : "MANUAL",
        navigateTo,
      });
    }
  }

  const navigable = suggestions.filter((s) => s.actionType === "NAVIGATE").length;
  const autoFixable = suggestions.filter((s) => s.actionType === "AUTO_FIX").length;
  const manual = suggestions.filter((s) => s.actionType === "MANUAL").length;

  return {
    total: suggestions.length,
    suggestions,
    navigable,
    autoFixable,
    manual,
  };
}
