import { Injectable, NotFoundException, StreamableFile } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { ComplianceContextService } from "../compliance-context.service";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ValidationGap {
  category: "ABDM" | "SCHEMES" | "NABH" | "EVIDENCE";
  severity: "BLOCKING" | "WARNING";
  code: string;
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
}

export interface CategorySummary {
  score: number;
  blocking: number;
  warnings: number;
}

export interface ValidationResult {
  workspaceId: string;
  score: number;
  scoredAt: string;
  gaps: ValidationGap[];
  summary: {
    abdm: CategorySummary;
    schemes: CategorySummary;
    nabh: CategorySummary;
    evidence: CategorySummary;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

@Injectable()
export class ValidatorService {
  constructor(private readonly ctx: ComplianceContextService) {}

  /* ================================================================ */
  /*  runValidator                                                     */
  /* ================================================================ */

  async runValidator(principal: Principal, workspaceId: string): Promise<ValidationResult> {
    const workspace = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");

    const gaps: ValidationGap[] = [];

    // ── ABDM ────────────────────────────────────────────────────────
    const abdmResult = await this.validateAbdm(workspaceId, gaps);

    // ── SCHEMES ─────────────────────────────────────────────────────
    const schemesResult = await this.validateSchemes(workspaceId, gaps);

    // ── NABH ────────────────────────────────────────────────────────
    const nabhResult = await this.validateNabh(workspaceId, gaps);

    // ── EVIDENCE ────────────────────────────────────────────────────
    const evidenceResult = await this.validateEvidence(workspaceId, gaps);

    // ── Final weighted score ────────────────────────────────────────
    const score = Math.round(
      abdmResult.score * 0.2 +
        schemesResult.score * 0.25 +
        nabhResult.score * 0.4 +
        evidenceResult.score * 0.15,
    );

    const scoredAt = new Date().toISOString();

    // Persist readiness score on the workspace
    await this.ctx.prisma.complianceWorkspace.update({
      where: { id: workspaceId },
      data: { readinessScore: score, lastComputedAt: new Date() },
    });

    // Audit trail
    await this.ctx.logCompliance({
      workspaceId,
      entityType: "COMPLIANCE_WORKSPACE",
      entityId: workspaceId,
      action: "RUN",
      actorStaffId: principal.staffId,
      after: { score, gapCount: gaps.length },
    });

    return {
      workspaceId,
      score,
      scoredAt,
      gaps,
      summary: {
        abdm: abdmResult,
        schemes: schemesResult,
        nabh: nabhResult,
        evidence: evidenceResult,
      },
    };
  }

  /* ================================================================ */
  /*  getDashboardData                                                 */
  /* ================================================================ */

  async getDashboardData(principal: Principal, workspaceId: string) {
    const workspace = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: workspaceId },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        abdmConfigs: true,
        hfrProfile: true,
        _count: {
          select: {
            hprLinks: true,
            empanelments: true,
            rateCards: true,
            schemeMappings: true,
            nabhItems: true,
            evidenceArtifacts: true,
            approvals: true,
            auditCycles: true,
          },
        },
      },
    });

    if (!workspace) throw new NotFoundException("Workspace not found");
    return workspace;
  }

  /* ================================================================ */
  /*  exportPack                                                       */
  /* ================================================================ */

  async exportPack(principal: Principal, workspaceId: string, format: string = "json") {
    const workspace = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");

    const [
      abdmConfig,
      hfrProfile,
      hprLinks,
      empanelments,
      rateCards,
      mappings,
      nabhItems,
      evidence,
      auditCycles,
      auditLogs,
    ] = await Promise.all([
      this.ctx.prisma.abdmConfig.findFirst({ where: { workspaceId } }),
      this.ctx.prisma.hfrFacilityProfile.findUnique({ where: { workspaceId } }),
      this.ctx.prisma.hprProfessionalLink.findMany({ where: { workspaceId } }),
      this.ctx.prisma.schemeEmpanelment.findMany({ where: { workspaceId } }),
      this.ctx.prisma.schemeRateCard.findMany({
        where: { workspaceId },
        include: { items: true },
      }),
      this.ctx.prisma.schemeMapping.findMany({ where: { workspaceId } }),
      this.ctx.prisma.nabhWorkspaceItem.findMany({ where: { workspaceId } }),
      this.ctx.prisma.evidenceArtifact.findMany({
        where: { workspaceId },
        include: { links: true },
      }),
      this.ctx.prisma.auditCycle.findMany({
        where: { workspaceId },
        include: { findings: { include: { capa: true } } },
      }),
      this.ctx.prisma.complianceAuditLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    // Run a fresh validation to include in the pack
    const validationResult = await this.runValidator(principal, workspaceId);

    // Log the export action
    await this.ctx.logCompliance({
      workspaceId,
      entityType: "COMPLIANCE_WORKSPACE",
      entityId: workspaceId,
      action: "EXPORT",
      actorStaffId: principal.staffId,
      after: { format },
    });

    const pack = {
      workspace,
      abdmConfig,
      hfrProfile,
      hprLinks,
      empanelments,
      rateCards,
      mappings,
      nabhItems,
      evidence,
      auditCycles,
      auditLogs,
      validationResult,
      exportedAt: new Date().toISOString(),
    };

    if (format === "csv") {
      return this.packToCsv(pack);
    }

    return pack;
  }

  /* ================================================================ */
  /*  Private: CSV export helper                                       */
  /* ================================================================ */

  private packToCsv(pack: Record<string, any>): { csv: Record<string, string> } {
    const csvSections: Record<string, string> = {};

    // Helper: convert array of objects to CSV string
    const toCsv = (rows: any[]): string => {
      if (!rows || rows.length === 0) return "";
      const headers = Object.keys(rows[0]);
      const escape = (val: any): string => {
        if (val === null || val === undefined) return "";
        const str = typeof val === "object" ? JSON.stringify(val) : String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const lines = [headers.join(",")];
      for (const row of rows) {
        lines.push(headers.map((h) => escape(row[h])).join(","));
      }
      return lines.join("\n");
    };

    // Workspace summary
    if (pack.workspace) {
      const ws = pack.workspace;
      csvSections.workspace = toCsv([
        {
          id: ws.id,
          name: ws.name,
          status: ws.status,
          readinessScore: ws.readinessScore,
          lastComputedAt: ws.lastComputedAt,
          createdAt: ws.createdAt,
        },
      ]);
    }

    // Empanelments
    if (pack.empanelments?.length) {
      csvSections.empanelments = toCsv(
        pack.empanelments.map((e: any) => ({
          id: e.id,
          scheme: e.scheme,
          empanelmentNumber: e.empanelmentNumber,
          status: e.status,
          shaCode: e.shaCode || "",
          cityCategory: e.cityCategory || "",
          state: e.state || "",
          govSchemeConfigId: e.govSchemeConfigId || "",
          lastSyncedAt: e.lastSyncedAt || "",
          createdAt: e.createdAt,
        })),
      );
    }

    // Rate cards (flattened with items)
    if (pack.rateCards?.length) {
      const rateCardRows: any[] = [];
      for (const rc of pack.rateCards) {
        if (rc.items?.length) {
          for (const item of rc.items) {
            rateCardRows.push({
              rateCardId: rc.id,
              scheme: rc.scheme,
              version: rc.version,
              rateCardStatus: rc.status,
              effectiveFrom: rc.effectiveFrom,
              effectiveTo: rc.effectiveTo || "",
              itemId: item.id,
              itemCode: item.code,
              itemName: item.name,
              rate: item.rate,
              inclusions: item.inclusions || "",
              exclusions: item.exclusions || "",
            });
          }
        } else {
          rateCardRows.push({
            rateCardId: rc.id,
            scheme: rc.scheme,
            version: rc.version,
            rateCardStatus: rc.status,
            effectiveFrom: rc.effectiveFrom,
            effectiveTo: rc.effectiveTo || "",
            itemId: "",
            itemCode: "",
            itemName: "",
            rate: "",
            inclusions: "",
            exclusions: "",
          });
        }
      }
      csvSections.rateCards = toCsv(rateCardRows);
    }

    // Scheme Mappings
    if (pack.mappings?.length) {
      csvSections.mappings = toCsv(
        pack.mappings.map((m: any) => ({
          id: m.id,
          scheme: m.scheme,
          externalCode: m.externalCode,
          externalName: m.externalName,
          internalServiceId: m.internalServiceId || "",
          internalTariffItemId: m.internalTariffItemId || "",
          createdAt: m.createdAt,
        })),
      );
    }

    // NABH Items
    if (pack.nabhItems?.length) {
      csvSections.nabhItems = toCsv(
        pack.nabhItems.map((n: any) => ({
          id: n.id,
          chapter: n.chapter,
          standard: n.standard || "",
          objective: n.objective || "",
          criteria: n.criteria || "",
          status: n.status,
          riskLevel: n.riskLevel || "",
          evidenceRequired: n.evidenceRequired,
          assignedToStaffId: n.assignedToStaffId || "",
          verifiedByStaffId: n.verifiedByStaffId || "",
          verifiedAt: n.verifiedAt || "",
          notes: n.notes || "",
        })),
      );
    }

    // HPR Links
    if (pack.hprLinks?.length) {
      csvSections.hprLinks = toCsv(
        pack.hprLinks.map((h: any) => ({
          id: h.id,
          hprId: h.hprId,
          name: h.name,
          designation: h.designation || "",
          verificationStatus: h.verificationStatus,
          staffId: h.staffId || "",
          createdAt: h.createdAt,
        })),
      );
    }

    // Evidence
    if (pack.evidence?.length) {
      csvSections.evidence = toCsv(
        pack.evidence.map((e: any) => ({
          id: e.id,
          title: e.title,
          fileName: e.fileName,
          mimeType: e.mimeType,
          fileSizeBytes: e.fileSizeBytes,
          status: e.status,
          expiresAt: e.expiresAt || "",
          uploadedByStaffId: e.uploadedByStaffId,
          tags: (e.tags || []).join(";"),
          linkedEntities: (e.links || []).map((l: any) => `${l.targetType}:${l.targetId}`).join(";"),
          createdAt: e.createdAt,
        })),
      );
    }

    // Validation Gaps
    if (pack.validationResult?.gaps?.length) {
      csvSections.validationGaps = toCsv(
        pack.validationResult.gaps.map((g: any) => ({
          category: g.category,
          severity: g.severity,
          code: g.code,
          title: g.title,
          description: g.description,
          entityType: g.entityType || "",
          entityId: g.entityId || "",
        })),
      );
    }

    // Audit Logs
    if (pack.auditLogs?.length) {
      csvSections.auditLogs = toCsv(
        pack.auditLogs.map((l: any) => ({
          id: l.id,
          entityType: l.entityType,
          entityId: l.entityId,
          action: l.action,
          actorStaffId: l.actorStaffId,
          createdAt: l.createdAt,
        })),
      );
    }

    return { csv: csvSections };
  }

  /* ================================================================ */
  /*  Private: ABDM validation                                         */
  /* ================================================================ */

  private async validateAbdm(
    workspaceId: string,
    gaps: ValidationGap[],
  ): Promise<CategorySummary> {
    let blocking = 0;
    let warnings = 0;

    // Check AbdmConfig existence
    const abdmConfig = await this.ctx.prisma.abdmConfig.findFirst({
      where: { workspaceId },
    });

    if (!abdmConfig) {
      gaps.push({
        category: "ABDM",
        severity: "BLOCKING",
        code: "ABDM_NO_CONFIG",
        title: "ABDM configuration missing",
        description: "No ABDM configuration has been created for this workspace. Create one to proceed with ABDM compliance.",
      });
      blocking++;
    }

    // Check HFR Facility Profile required fields
    const hfrProfile = await this.ctx.prisma.hfrFacilityProfile.findUnique({
      where: { workspaceId },
    });

    if (hfrProfile) {
      const requiredFields: Array<keyof typeof hfrProfile> = [
        "facilityName",
        "ownershipType",
        "facilityType",
        "addressLine1",
        "city",
        "state",
        "pincode",
      ];
      const missingFields = requiredFields.filter(
        (field) => !hfrProfile[field] || (hfrProfile[field] as string).trim() === "",
      );

      if (missingFields.length > 3) {
        gaps.push({
          category: "ABDM",
          severity: "BLOCKING",
          code: "ABDM_HFR_INCOMPLETE",
          title: "HFR profile critically incomplete",
          description: `HFR Facility Profile is missing ${missingFields.length} required fields: ${missingFields.join(", ")}. More than 3 required fields are empty.`,
          entityType: "HFR_PROFILE",
          entityId: workspaceId,
        });
        blocking++;
      } else if (missingFields.length > 0) {
        gaps.push({
          category: "ABDM",
          severity: "WARNING",
          code: "ABDM_HFR_FIELDS_MISSING",
          title: "HFR profile has missing fields",
          description: `HFR Facility Profile is missing fields: ${missingFields.join(", ")}. Complete these before submission.`,
          entityType: "HFR_PROFILE",
          entityId: workspaceId,
        });
        warnings++;
      }

      // Verification status check
      if (hfrProfile.verificationStatus !== "VERIFIED") {
        gaps.push({
          category: "ABDM",
          severity: "WARNING",
          code: "ABDM_HFR_NOT_VERIFIED",
          title: "HFR profile not verified",
          description: `HFR Facility Profile verification status is "${hfrProfile.verificationStatus}". Verification is recommended for full compliance.`,
          entityType: "HFR_PROFILE",
          entityId: workspaceId,
        });
        warnings++;
      }
    } else {
      // No HFR profile at all — all 7 required fields missing
      gaps.push({
        category: "ABDM",
        severity: "BLOCKING",
        code: "ABDM_HFR_MISSING",
        title: "HFR Facility Profile missing",
        description: "No HFR Facility Profile exists for this workspace. All required fields are missing.",
        entityType: "HFR_PROFILE",
        entityId: workspaceId,
      });
      blocking++;
    }

    // Check HPR Professional Links
    const hprCount = await this.ctx.prisma.hprProfessionalLink.count({
      where: { workspaceId },
    });

    if (hprCount === 0) {
      gaps.push({
        category: "ABDM",
        severity: "WARNING",
        code: "ABDM_NO_HPR_LINKS",
        title: "No HPR professional links",
        description: "No healthcare professionals are linked via HPR. Link at least one professional for ABDM readiness.",
      });
      warnings++;
    }

    const score = clamp(100 - blocking * 25 - warnings * 10, 0, 100);

    return { score, blocking, warnings };
  }

  /* ================================================================ */
  /*  Private: Schemes validation                                      */
  /* ================================================================ */

  private async validateSchemes(
    workspaceId: string,
    gaps: ValidationGap[],
  ): Promise<CategorySummary> {
    let blocking = 0;
    let warnings = 0;

    // Check for active empanelments
    const activeEmpanelments = await this.ctx.prisma.schemeEmpanelment.count({
      where: { workspaceId, status: "ACTIVE" },
    });

    if (activeEmpanelments === 0) {
      gaps.push({
        category: "SCHEMES",
        severity: "BLOCKING",
        code: "SCHEME_NO_ACTIVE_EMPANELMENT",
        title: "No active scheme empanelment",
        description: "No government scheme empanelment is in ACTIVE status. At least one active empanelment is required.",
      });
      blocking++;
    }

    // Check rate cards
    const totalRateCards = await this.ctx.prisma.schemeRateCard.count({
      where: { workspaceId },
    });
    const nonArchivedRateCards = await this.ctx.prisma.schemeRateCard.count({
      where: { workspaceId, status: { not: "ARCHIVED" } },
    });

    if (totalRateCards === 0 || nonArchivedRateCards === 0) {
      gaps.push({
        category: "SCHEMES",
        severity: "BLOCKING",
        code: "SCHEME_NO_ACTIVE_RATE_CARDS",
        title: "No usable rate cards",
        description:
          totalRateCards === 0
            ? "No scheme rate cards exist for this workspace."
            : "All scheme rate cards are ARCHIVED. At least one active or draft rate card is required.",
      });
      blocking++;
    }

    // Check for expired rate cards
    const expiredRateCards = await this.ctx.prisma.schemeRateCard.findMany({
      where: {
        workspaceId,
        effectiveTo: { lt: new Date() },
        status: { not: "ARCHIVED" },
      },
    });

    if (expiredRateCards.length > 0) {
      for (const rc of expiredRateCards) {
        gaps.push({
          category: "SCHEMES",
          severity: "WARNING",
          code: "SCHEME_RATE_CARD_EXPIRED",
          title: `Rate card expired: ${rc.scheme}`,
          description: `Scheme rate card for "${rc.scheme}" (v${rc.version}) has an effectiveTo date in the past. Update or archive it.`,
          entityType: "SCHEME_RATE_CARD",
          entityId: rc.id,
        });
        warnings++;
      }
    }

    // Check unmapped items ratio
    const totalMappings = await this.ctx.prisma.schemeMapping.count({
      where: { workspaceId },
    });

    if (totalMappings > 0) {
      const unmappedCount = await this.ctx.prisma.schemeMapping.count({
        where: {
          workspaceId,
          internalServiceId: null,
          internalTariffItemId: null,
        },
      });

      const unmappedRatio = unmappedCount / totalMappings;
      if (unmappedRatio > 0.2) {
        gaps.push({
          category: "SCHEMES",
          severity: "WARNING",
          code: "SCHEME_HIGH_UNMAPPED_RATIO",
          title: "High proportion of unmapped scheme items",
          description: `${unmappedCount} of ${totalMappings} scheme mappings (${Math.round(unmappedRatio * 100)}%) have no internal service or tariff item linked. Threshold is 20%.`,
        });
        warnings++;
      }
    }

    // Cross-check: Compliance empanelments must be synced to infrastructure GovernmentSchemeConfig
    const empanelments = await this.ctx.prisma.schemeEmpanelment.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true, scheme: true, govSchemeConfigId: true, lastSyncedAt: true },
    });

    for (const emp of empanelments) {
      if (!emp.govSchemeConfigId) {
        gaps.push({
          category: "SCHEMES",
          severity: "WARNING",
          code: "SCHEME_NOT_SYNCED_TO_INFRA",
          title: `${emp.scheme} empanelment not synced to Operations`,
          description: `The ${emp.scheme} empanelment is ACTIVE in compliance but has not been pushed to the infrastructure Gov Schemes config. Use "Push to Operations" to sync.`,
          entityType: "SCHEME_EMPANELMENT",
          entityId: emp.id,
        });
        warnings++;
      } else {
        // Verify the linked GovernmentSchemeConfig still exists and is active
        const infraConfig = await this.ctx.prisma.governmentSchemeConfig.findUnique({
          where: { id: emp.govSchemeConfigId },
          select: { id: true, isActive: true },
        });
        if (!infraConfig) {
          gaps.push({
            category: "SCHEMES",
            severity: "WARNING",
            code: "SCHEME_INFRA_LINK_BROKEN",
            title: `${emp.scheme} infrastructure config missing`,
            description: `The ${emp.scheme} empanelment references an infrastructure config that no longer exists. Re-sync using "Push to Operations".`,
            entityType: "SCHEME_EMPANELMENT",
            entityId: emp.id,
          });
          warnings++;
        } else if (!infraConfig.isActive) {
          gaps.push({
            category: "SCHEMES",
            severity: "WARNING",
            code: "SCHEME_INFRA_INACTIVE",
            title: `${emp.scheme} infrastructure config is inactive`,
            description: `The ${emp.scheme} empanelment is ACTIVE in compliance but the linked infrastructure config is deactivated. Activate it in Infrastructure > Gov Schemes or re-sync.`,
            entityType: "SCHEME_EMPANELMENT",
            entityId: emp.id,
          });
          warnings++;
        }
      }
    }

    const score = clamp(100 - blocking * 30 - warnings * 10, 0, 100);

    return { score, blocking, warnings };
  }

  /* ================================================================ */
  /*  Private: NABH validation                                         */
  /* ================================================================ */

  private async validateNabh(
    workspaceId: string,
    gaps: ValidationGap[],
  ): Promise<CategorySummary> {
    let blocking = 0;
    let warnings = 0;

    const allItems = await this.ctx.prisma.nabhWorkspaceItem.findMany({
      where: { workspaceId },
    });

    if (allItems.length === 0) {
      // No NABH items — score defaults to 0
      return { score: 0, blocking: 0, warnings: 0 };
    }

    // Fetch all NABH-related evidence links in one query for efficiency
    const nabhItemIds = allItems.map((item) => item.id);
    const evidenceLinks = await this.ctx.prisma.evidenceLink.findMany({
      where: {
        targetType: "NABH_ITEM",
        targetId: { in: nabhItemIds },
      },
    });
    const linkedItemIds = new Set(evidenceLinks.map((l) => l.targetId));

    for (const item of allItems) {
      // BLOCKING: Critical items that are NOT_STARTED or NON_COMPLIANT
      if (
        item.riskLevel === "CRITICAL" &&
        (item.status === "NOT_STARTED" || item.status === "NON_COMPLIANT")
      ) {
        gaps.push({
          category: "NABH",
          severity: "BLOCKING",
          code: "NABH_CRITICAL_INCOMPLETE",
          title: `Critical NABH item not addressed: ${item.chapter}`,
          description: `NABH item "${item.chapter}" has risk level CRITICAL and status "${item.status}". This must be resolved before accreditation.`,
          entityType: "NABH_ITEM",
          entityId: item.id,
        });
        blocking++;
      }

      // WARNING: Major items that are NOT_STARTED
      if (item.riskLevel === "MAJOR" && item.status === "NOT_STARTED") {
        gaps.push({
          category: "NABH",
          severity: "WARNING",
          code: "NABH_MAJOR_NOT_STARTED",
          title: `Major NABH item not started: ${item.chapter}`,
          description: `NABH item "${item.chapter}" has risk level MAJOR and has not been started yet.`,
          entityType: "NABH_ITEM",
          entityId: item.id,
        });
        warnings++;
      }

      // WARNING: Evidence required but not linked
      if (item.evidenceRequired && !linkedItemIds.has(item.id)) {
        gaps.push({
          category: "NABH",
          severity: "WARNING",
          code: "NABH_EVIDENCE_MISSING",
          title: `Evidence missing for NABH item: ${item.chapter}`,
          description: `NABH item "${item.chapter}" requires evidence but has no linked evidence artifact.`,
          entityType: "NABH_ITEM",
          entityId: item.id,
        });
        warnings++;
      }
    }

    // Score: % of items in VERIFIED or IMPLEMENTED status
    const compliantCount = allItems.filter(
      (item) => item.status === "VERIFIED" || item.status === "IMPLEMENTED",
    ).length;
    const score = Math.round((compliantCount / allItems.length) * 100);

    return { score, blocking, warnings };
  }

  /* ================================================================ */
  /*  Private: Evidence validation                                     */
  /* ================================================================ */

  private async validateEvidence(
    workspaceId: string,
    gaps: ValidationGap[],
  ): Promise<CategorySummary> {
    let blocking = 0;
    let warnings = 0;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Expired evidence (ACTIVE but expiresAt in the past)
    const expiredEvidence = await this.ctx.prisma.evidenceArtifact.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
        expiresAt: { lt: now },
      },
    });

    for (const ev of expiredEvidence) {
      gaps.push({
        category: "EVIDENCE",
        severity: "BLOCKING",
        code: "EVIDENCE_EXPIRED",
        title: `Evidence expired: ${ev.title}`,
        description: `Evidence artifact "${ev.title}" expired on ${ev.expiresAt!.toISOString().split("T")[0]}. Renew or archive it.`,
        entityType: "EVIDENCE",
        entityId: ev.id,
      });
      blocking++;
    }

    // Evidence expiring within 30 days (not yet expired)
    const expiringEvidence = await this.ctx.prisma.evidenceArtifact.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
        expiresAt: { gte: now, lte: thirtyDaysFromNow },
      },
    });

    for (const ev of expiringEvidence) {
      gaps.push({
        category: "EVIDENCE",
        severity: "WARNING",
        code: "EVIDENCE_EXPIRING_SOON",
        title: `Evidence expiring soon: ${ev.title}`,
        description: `Evidence artifact "${ev.title}" expires on ${ev.expiresAt!.toISOString().split("T")[0]}, which is within 30 days. Plan for renewal.`,
        entityType: "EVIDENCE",
        entityId: ev.id,
      });
      warnings++;
    }

    const score = clamp(100 - expiredEvidence.length * 20 - expiringEvidence.length * 5, 0, 100);

    return { score, blocking, warnings };
  }
}
