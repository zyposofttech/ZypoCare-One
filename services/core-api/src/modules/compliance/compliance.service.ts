import { Injectable } from "@nestjs/common";
import type { Principal } from "../auth/access-policy.service";
import { ComplianceContextService } from "./compliance-context.service";

@Injectable()
export class ComplianceService {
  constructor(private readonly ctx: ComplianceContextService) {}

  async getDashboard(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);

    const [workspaces, pendingApprovals, expiringEvidence, auditCycles] = await Promise.all([
      this.ctx.prisma.complianceWorkspace.count({
        where: { branchId: bid, status: "ACTIVE" },
      }),
      this.ctx.prisma.complianceApproval.count({
        where: {
          workspace: { branchId: bid },
          status: "SUBMITTED",
        },
      }),
      this.ctx.prisma.evidenceArtifact.count({
        where: {
          workspace: { branchId: bid },
          status: "ACTIVE",
          expiresAt: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
      this.ctx.prisma.auditCycle.count({
        where: {
          workspace: { branchId: bid },
          status: "IN_PROGRESS",
        },
      }),
    ]);

    return {
      workspaces,
      pendingApprovals,
      expiringEvidence,
      auditCycles,
    };
  }

  async getAuditLogs(
    principal: Principal,
    query: {
      branchId?: string;
      workspaceId?: string;
      entityType?: string;
      entityId?: string;
      action?: string;
      from?: string;
      to?: string;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = {};

    if (query.branchId) where.workspace = { branchId: query.branchId };
    if (query.workspaceId) where.workspaceId = query.workspaceId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.action) where.action = query.action;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const findArgs: any = {
      where,
      orderBy: [{ createdAt: "desc" }],
      take: take + 1,
    };
    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.complianceAuditLog.findMany(findArgs);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }
}
