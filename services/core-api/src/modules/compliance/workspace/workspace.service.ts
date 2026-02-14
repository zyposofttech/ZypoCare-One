import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { ComplianceContextService } from "../compliance-context.service";
import type { CreateWorkspaceDto, UpdateWorkspaceDto, CloneWorkspaceDto } from "./dto/create-workspace.dto";

@Injectable()
export class WorkspaceService {
  constructor(private readonly ctx: ComplianceContextService) {}

  async list(
    principal: Principal,
    query: {
      branchId?: string;
      orgId?: string;
      type?: string;
      status?: string;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = {};

    if (query.branchId) where.branchId = query.branchId;
    if (query.orgId) where.orgId = query.orgId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const findArgs: any = {
      where,
      orderBy: [{ createdAt: "desc" }],
      take: take + 1,
      include: { branch: { select: { id: true, name: true, code: true } } },
    };
    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.complianceWorkspace.findMany(findArgs);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }

  async create(principal: Principal, dto: CreateWorkspaceDto) {
    if (dto.type === "BRANCH" && !dto.branchId) {
      throw new BadRequestException("branchId is required for BRANCH workspace");
    }

    // Resolve orgId from branch if not explicitly provided
    let orgId = dto.orgId;
    if (!orgId && dto.branchId) {
      const branch = await this.ctx.prisma.branch.findUnique({
        where: { id: dto.branchId },
        select: { id: true, name: true, code: true, organizationId: true },
      });
      if (!branch) throw new BadRequestException("Branch not found");

      if (!branch.organizationId) {
        // Auto-provision a default Organization for this branch
        const org = await this.ctx.prisma.organization.upsert({
          where: { code: "DEFAULT" },
          create: { code: "DEFAULT", name: branch.name.split("–")[0].trim() || "Default Organization" },
          update: {},
        });
        await this.ctx.prisma.branch.update({
          where: { id: branch.id },
          data: { organizationId: org.id },
        });
        orgId = org.id;
      } else {
        orgId = branch.organizationId;
      }
    }
    if (!orgId) {
      throw new BadRequestException("orgId is required (either directly or via branchId)");
    }

    const workspace = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.complianceWorkspace.create({
        data: {
          orgId,
          branchId: dto.type === "BRANCH" ? dto.branchId : null,
          type: dto.type,
          name: dto.name,
          status: "DRAFT",
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: created.id,
          entityType: "COMPLIANCE_WORKSPACE",
          entityId: created.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: created,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: dto.branchId ?? null,
          actorUserId: principal.userId,
          action: "COMPLIANCE_WORKSPACE_CREATE",
          entity: "ComplianceWorkspace",
          entityId: created.id,
          meta: dto,
        },
        tx,
      );

      return created;
    });

    return workspace;
  }

  async get(principal: Principal, workspaceId: string) {
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

  async update(principal: Principal, workspaceId: string, dto: UpdateWorkspaceDto) {
    const existing = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: workspaceId },
    });
    if (!existing) throw new NotFoundException("Workspace not found");

    if (dto.status === "ACTIVE") {
      // Activation gating — check for blocking gaps before allowing activation
      const gaps: string[] = [];

      // Check ABDM config
      const abdmConfig = await this.ctx.prisma.abdmConfig.findFirst({
        where: { workspaceId },
      });
      if (!abdmConfig || abdmConfig.status === "NOT_CONFIGURED") {
        gaps.push("ABDM configuration is not set up");
      }

      // Check HFR profile
      const hfr = await this.ctx.prisma.hfrFacilityProfile.findFirst({
        where: { workspaceId },
      });
      if (!hfr) {
        gaps.push("HFR Facility Profile is missing");
      } else if (hfr.verificationStatus === "NOT_SUBMITTED") {
        gaps.push("HFR Facility Profile has not been submitted for verification");
      }

      // Check scheme empanelments
      const empanelments = await this.ctx.prisma.schemeEmpanelment.count({
        where: { workspaceId },
      });
      if (empanelments === 0) {
        gaps.push("No government scheme empanelments configured");
      }

      // Check NABH items — any critical non-compliant items
      const criticalNonCompliant = await this.ctx.prisma.nabhWorkspaceItem.count({
        where: {
          workspaceId,
          riskLevel: "CRITICAL",
          status: { in: ["NOT_STARTED", "NON_COMPLIANT"] },
        },
      });
      if (criticalNonCompliant > 0) {
        gaps.push(`${criticalNonCompliant} critical NABH items are not compliant`);
      }

      // Check for expired evidence
      const expiredEvidence = await this.ctx.prisma.evidenceArtifact.count({
        where: {
          workspaceId,
          status: "ACTIVE",
          expiresAt: { lt: new Date() },
        },
      });
      if (expiredEvidence > 0) {
        gaps.push(`${expiredEvidence} evidence artifacts have expired`);
      }

      if (gaps.length > 0) {
        throw new BadRequestException({
          message: "Cannot activate workspace: blocking gaps found",
          gaps,
        });
      }
    }

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.complianceWorkspace.update({
        where: { id: workspaceId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.status !== undefined && { status: dto.status }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId,
          entityType: "COMPLIANCE_WORKSPACE",
          entityId: workspaceId,
          action: "UPDATE",
          actorStaffId: principal.staffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: existing.branchId,
          actorUserId: principal.userId,
          action: "COMPLIANCE_WORKSPACE_UPDATE",
          entity: "ComplianceWorkspace",
          entityId: workspaceId,
          meta: dto,
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  async cloneToBranch(principal: Principal, workspaceId: string, dto: CloneWorkspaceDto) {
    const template = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: workspaceId },
      include: { nabhItems: true },
    });

    if (!template) throw new NotFoundException("Template workspace not found");
    if (template.type !== "ORG_TEMPLATE") {
      throw new BadRequestException("Can only clone from ORG_TEMPLATE workspaces");
    }

    // Check if branch already has a workspace
    const existingBranch = await this.ctx.prisma.complianceWorkspace.findFirst({
      where: { branchId: dto.branchId, type: "BRANCH" },
    });
    if (existingBranch) {
      throw new BadRequestException("Branch already has a compliance workspace");
    }

    const cloned = await this.ctx.prisma.$transaction(async (tx) => {
      const newWorkspace = await tx.complianceWorkspace.create({
        data: {
          orgId: template.orgId,
          branchId: dto.branchId,
          type: "BRANCH",
          name: dto.name || `${template.name} — Branch Copy`,
          status: "DRAFT",
        },
      });

      // Clone NABH items from template
      if (template.nabhItems.length > 0) {
        await tx.nabhWorkspaceItem.createMany({
          data: template.nabhItems.map((item) => ({
            workspaceId: newWorkspace.id,
            chapter: item.chapter,
            standardCode: item.standardCode,
            meCode: item.meCode,
            title: item.title,
            description: item.description,
            status: "NOT_STARTED",
            riskLevel: item.riskLevel,
            evidenceRequired: item.evidenceRequired,
          })),
        });
      }

      await this.ctx.logCompliance(
        {
          workspaceId: newWorkspace.id,
          entityType: "COMPLIANCE_WORKSPACE",
          entityId: newWorkspace.id,
          action: "CLONE",
          actorStaffId: principal.staffId,
          after: { sourceId: workspaceId, branchId: dto.branchId },
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: dto.branchId,
          actorUserId: principal.userId,
          action: "COMPLIANCE_WORKSPACE_CLONE",
          entity: "ComplianceWorkspace",
          entityId: newWorkspace.id,
          meta: { sourceWorkspaceId: workspaceId, branchId: dto.branchId },
        },
        tx,
      );

      return newWorkspace;
    });

    return cloned;
  }
}
