import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { ComplianceContextService } from "../compliance-context.service";
import { canonicalizeCode } from "../../../common/naming.util";

/**
 * SchemeSyncService — Bridges compliance SchemeEmpanelment with infrastructure GovernmentSchemeConfig.
 *
 * Flow:
 *   Compliance (empanelment/rate-cards)  ──push──▶  Infrastructure (gov-scheme-config)
 *   Infrastructure (gov-scheme-config)   ──pull──▶  Compliance (empanelment)
 *
 * The compliance side is the "source of truth" for empanelment data and rate cards.
 * The infrastructure side is the "operational runtime" for billing/claims.
 */
@Injectable()
export class SchemeSyncService {
  constructor(private readonly ctx: ComplianceContextService) {}

  // ================================================================
  // Push: Compliance → Infrastructure
  // ================================================================

  /**
   * Push empanelment + frozen rate-card data from compliance to an
   * infrastructure GovernmentSchemeConfig record.
   *
   * If no GovernmentSchemeConfig exists for this branch+schemeType,
   * one is created. Otherwise the existing one is updated.
   */
  async pushToInfra(principal: Principal, empanelmentId: string) {
    const empanelment = await this.ctx.prisma.schemeEmpanelment.findUnique({
      where: { id: empanelmentId },
      include: {
        workspace: { select: { id: true, branchId: true, orgId: true } },
        govSchemeConfig: { select: { id: true } },
      },
    });
    if (!empanelment) throw new NotFoundException("Empanelment not found");

    const branchId = empanelment.workspace.branchId;
    if (!branchId) {
      throw new BadRequestException(
        "Compliance workspace is not linked to a branch. Assign a branch first.",
      );
    }

    // Get the latest FROZEN rate card for this scheme + workspace
    const frozenRateCard = await this.ctx.prisma.schemeRateCard.findFirst({
      where: {
        workspaceId: empanelment.workspaceId,
        scheme: empanelment.scheme,
        status: "FROZEN",
      },
      orderBy: { effectiveFrom: "desc" },
      include: {
        items: { orderBy: { code: "asc" } },
      },
    });

    // Build package mapping from frozen rate-card items
    const packageMapping = frozenRateCard
      ? this.buildPackageMapping(frozenRateCard.items)
      : undefined;

    // Determine scheme code and name
    const schemeCode = canonicalizeCode(empanelment.scheme);
    const schemeName = this.schemeDisplayName(empanelment.scheme);

    // Check if GovernmentSchemeConfig already exists for this branch + scheme type
    const existingConfig = empanelment.govSchemeConfig
      ? await this.ctx.prisma.governmentSchemeConfig.findUnique({
          where: { id: empanelment.govSchemeConfig.id },
        })
      : await this.ctx.prisma.governmentSchemeConfig.findFirst({
          where: { branchId, schemeType: empanelment.scheme },
        });

    const now = new Date();

    const syncData: Record<string, unknown> = {
      schemeType: empanelment.scheme,
      schemeName,
      schemeCode,
      registrationNumber: empanelment.empanelmentNumber,
      shaCode: empanelment.shaCode ?? null,
      isActive: empanelment.status === "ACTIVE",
    };

    if (packageMapping !== undefined) {
      syncData.packageMapping = packageMapping;
    }

    let govSchemeConfigId: string;

    if (existingConfig) {
      // Update existing
      await this.ctx.prisma.governmentSchemeConfig.update({
        where: { id: existingConfig.id },
        data: syncData as any,
      });
      govSchemeConfigId = existingConfig.id;
    } else {
      // Create new
      const created = await this.ctx.prisma.governmentSchemeConfig.create({
        data: {
          branchId,
          ...syncData,
        } as any,
      });
      govSchemeConfigId = created.id;
    }

    // Update the empanelment with the link and sync timestamp
    await this.ctx.prisma.schemeEmpanelment.update({
      where: { id: empanelmentId },
      data: {
        govSchemeConfigId,
        lastSyncedAt: now,
      },
    });

    // Audit log
    await this.ctx.logCompliance({
      workspaceId: empanelment.workspaceId,
      entityType: "SCHEME_SYNC",
      entityId: empanelmentId,
      action: "PUSH_TO_INFRA",
      actorStaffId: principal.staffId,
      after: {
        empanelmentId,
        govSchemeConfigId,
        fieldsSync: Object.keys(syncData),
        rateCardId: frozenRateCard?.id ?? null,
        rateCardItemCount: frozenRateCard?.items.length ?? 0,
      },
    });

    return {
      empanelmentId,
      govSchemeConfigId,
      created: !existingConfig,
      syncedFields: Object.keys(syncData),
      rateCardSynced: !!frozenRateCard,
      rateCardItemCount: frozenRateCard?.items.length ?? 0,
      syncedAt: now.toISOString(),
    };
  }

  // ================================================================
  // Pull: Infrastructure → Compliance
  // ================================================================

  /**
   * Pull operational data from GovernmentSchemeConfig into a compliance
   * empanelment. This is useful when the infrastructure record has been
   * updated directly (e.g. registration date, NHA codes) and compliance
   * wants to stay informed.
   */
  async pullFromInfra(principal: Principal, empanelmentId: string) {
    const empanelment = await this.ctx.prisma.schemeEmpanelment.findUnique({
      where: { id: empanelmentId },
      include: {
        workspace: { select: { id: true, branchId: true } },
        govSchemeConfig: true,
      },
    });
    if (!empanelment) throw new NotFoundException("Empanelment not found");

    if (!empanelment.govSchemeConfig) {
      throw new BadRequestException(
        "This empanelment is not linked to an infrastructure scheme config. Push first.",
      );
    }

    const config = empanelment.govSchemeConfig;
    const now = new Date();

    // Pull registration number and SHA code back if infra has them
    const pullData: Record<string, unknown> = {};
    if (config.registrationNumber && config.registrationNumber !== empanelment.empanelmentNumber) {
      pullData.empanelmentNumber = config.registrationNumber;
    }
    if (config.shaCode && config.shaCode !== empanelment.shaCode) {
      pullData.shaCode = config.shaCode;
    }

    if (Object.keys(pullData).length > 0) {
      await this.ctx.prisma.schemeEmpanelment.update({
        where: { id: empanelmentId },
        data: {
          ...pullData,
          lastSyncedAt: now,
        } as any,
      });
    } else {
      // Still update sync timestamp
      await this.ctx.prisma.schemeEmpanelment.update({
        where: { id: empanelmentId },
        data: { lastSyncedAt: now },
      });
    }

    // Audit log
    await this.ctx.logCompliance({
      workspaceId: empanelment.workspaceId,
      entityType: "SCHEME_SYNC",
      entityId: empanelmentId,
      action: "PULL_FROM_INFRA",
      actorStaffId: principal.staffId,
      before: { empanelmentNumber: empanelment.empanelmentNumber, shaCode: empanelment.shaCode },
      after: pullData,
    });

    return {
      empanelmentId,
      govSchemeConfigId: config.id,
      fieldsPulled: Object.keys(pullData),
      syncedAt: now.toISOString(),
    };
  }

  // ================================================================
  // Sync Status
  // ================================================================

  /**
   * Returns sync status for each scheme in a workspace, showing
   * whether the compliance empanelment is linked to an infra config
   * and when the last sync happened.
   */
  async getSyncStatus(workspaceId: string) {
    const workspace = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, branchId: true },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");

    const empanelments = await this.ctx.prisma.schemeEmpanelment.findMany({
      where: { workspaceId },
      include: {
        govSchemeConfig: {
          select: {
            id: true,
            schemeType: true,
            schemeName: true,
            isActive: true,
            updatedAt: true,
          },
        },
      },
    });

    // Also find infra configs for this branch that are NOT linked
    const unlinkedInfraConfigs = workspace.branchId
      ? await this.ctx.prisma.governmentSchemeConfig.findMany({
          where: {
            branchId: workspace.branchId,
            empanelment: null, // no linked empanelment
          },
          select: {
            id: true,
            schemeType: true,
            schemeName: true,
            schemeCode: true,
            isActive: true,
          },
        })
      : [];

    return {
      workspaceId,
      branchId: workspace.branchId,
      empanelments: empanelments.map((e) => ({
        id: e.id,
        scheme: e.scheme,
        empanelmentNumber: e.empanelmentNumber,
        status: e.status,
        linked: !!e.govSchemeConfigId,
        govSchemeConfigId: e.govSchemeConfigId,
        lastSyncedAt: e.lastSyncedAt?.toISOString() ?? null,
        infraConfig: e.govSchemeConfig
          ? {
              id: e.govSchemeConfig.id,
              isActive: e.govSchemeConfig.isActive,
              updatedAt: e.govSchemeConfig.updatedAt.toISOString(),
            }
          : null,
      })),
      unlinkedInfraConfigs,
    };
  }

  /**
   * Manually link an empanelment to an existing GovernmentSchemeConfig
   * without syncing data. Useful when both were created independently.
   */
  async linkManually(principal: Principal, empanelmentId: string, govSchemeConfigId: string) {
    const empanelment = await this.ctx.prisma.schemeEmpanelment.findUnique({
      where: { id: empanelmentId },
      include: { workspace: { select: { id: true, branchId: true } } },
    });
    if (!empanelment) throw new NotFoundException("Empanelment not found");

    const govConfig = await this.ctx.prisma.governmentSchemeConfig.findUnique({
      where: { id: govSchemeConfigId },
    });
    if (!govConfig) throw new NotFoundException("Government scheme config not found");

    if (empanelment.workspace.branchId !== govConfig.branchId) {
      throw new BadRequestException(
        "Cannot link: workspace branch and gov scheme config branch do not match.",
      );
    }

    if (empanelment.scheme !== govConfig.schemeType) {
      throw new BadRequestException(
        `Cannot link: empanelment scheme (${empanelment.scheme}) does not match config scheme type (${govConfig.schemeType}).`,
      );
    }

    // Check if the gov config is already linked to another empanelment
    const alreadyLinked = await this.ctx.prisma.schemeEmpanelment.findFirst({
      where: { govSchemeConfigId, id: { not: empanelmentId } },
    });
    if (alreadyLinked) {
      throw new BadRequestException(
        "This infrastructure scheme config is already linked to another empanelment.",
      );
    }

    await this.ctx.prisma.schemeEmpanelment.update({
      where: { id: empanelmentId },
      data: { govSchemeConfigId, lastSyncedAt: new Date() },
    });

    await this.ctx.logCompliance({
      workspaceId: empanelment.workspaceId,
      entityType: "SCHEME_SYNC",
      entityId: empanelmentId,
      action: "MANUAL_LINK",
      actorStaffId: principal.staffId,
      after: { empanelmentId, govSchemeConfigId },
    });

    return { empanelmentId, govSchemeConfigId, linked: true };
  }

  /**
   * Unlink an empanelment from its GovernmentSchemeConfig without
   * deleting either record.
   */
  async unlink(principal: Principal, empanelmentId: string) {
    const empanelment = await this.ctx.prisma.schemeEmpanelment.findUnique({
      where: { id: empanelmentId },
      select: { id: true, workspaceId: true, govSchemeConfigId: true },
    });
    if (!empanelment) throw new NotFoundException("Empanelment not found");

    if (!empanelment.govSchemeConfigId) {
      return { empanelmentId, unlinked: false, reason: "Not linked" };
    }

    const prevConfigId = empanelment.govSchemeConfigId;

    await this.ctx.prisma.schemeEmpanelment.update({
      where: { id: empanelmentId },
      data: { govSchemeConfigId: null, lastSyncedAt: null },
    });

    await this.ctx.logCompliance({
      workspaceId: empanelment.workspaceId,
      entityType: "SCHEME_SYNC",
      entityId: empanelmentId,
      action: "UNLINK",
      actorStaffId: principal.staffId,
      before: { govSchemeConfigId: prevConfigId },
      after: { govSchemeConfigId: null },
    });

    return { empanelmentId, unlinked: true, previousGovSchemeConfigId: prevConfigId };
  }

  // ================================================================
  // Helpers
  // ================================================================

  /**
   * Transform rate-card items into the packageMapping JSON format
   * expected by GovernmentSchemeConfig.
   *
   * Output: { schemeCodes: string[], hospitalCodes: string[], rates: number[] }
   */
  private buildPackageMapping(
    items: Array<{ code: string; name: string; rate: any }>,
  ): Record<string, unknown> {
    if (!items.length) return {};

    return {
      schemeCodes: items.map((i) => i.code),
      hospitalCodes: items.map((i) => i.code), // same code used as hospital code initially
      rates: items.map((i) => Number(i.rate)),
      items: items.map((i) => ({
        schemeCode: i.code,
        name: i.name,
        rate: Number(i.rate),
      })),
      syncedFromRateCard: true,
    };
  }

  private schemeDisplayName(scheme: string): string {
    const names: Record<string, string> = {
      PMJAY: "Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
      CGHS: "Central Government Health Scheme (CGHS)",
      ECHS: "Ex-Servicemen Contributory Health Scheme (ECHS)",
      STATE_SCHEME: "State Government Scheme",
      OTHER: "Other Government Scheme",
    };
    return names[scheme] ?? scheme;
  }
}
