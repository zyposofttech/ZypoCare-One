import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "../auth/access-policy.service";
import { resolveBranchId as resolveBranchIdCommon } from "../../common/branch-scope.util";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class ComplianceContextService {
  constructor(
    @Inject("PRISMA") public prisma: PrismaClient,
    public audit: AuditService,
  ) {}

  /**
   * Returns staffId if already linked for the current user. Does NOT auto-create.
   */
  async getActorStaffIdOrNull(principal: Principal, tx?: any): Promise<string | null> {
    const db = (tx ?? this.prisma) as any;
    const user = await db.user.findUnique({ where: { id: principal.userId }, select: { staffId: true } });
    return user?.staffId ?? null;
  }

  /**
   * Ensures a Staff record exists for the current user (needed for approvals).
   * If missing, creates a minimal Staff entry and links it back to user.staffId.
   */
  async requireActorStaffId(principal: Principal, tx?: any): Promise<string> {
    const db = (tx ?? this.prisma) as any;
    const user = await db.user.findUnique({
      where: { id: principal.userId },
      select: { id: true, staffId: true, name: true, email: true, branchId: true },
    });
    if (!user) throw new NotFoundException("User not found");
    if (user.staffId) return user.staffId;

    const baseCode = `SYS-${user.id.slice(0, 8).toUpperCase()}`;
    const name = (user.name || user.email || "System User").toString();

    let created: any | null = null;
    for (let i = 0; i < 5; i++) {
      const empCode = i === 0 ? baseCode : `${baseCode}-${i}`;
      try {
        created = await db.staff.create({
          data: {
            empCode,
            name,
            designation: "System User",
            officialEmail: user.email ?? null,
            primaryBranchId: user.branchId ?? null,
            homeBranchId: user.branchId ?? null,
            hasSystemAccess: true,
          },
        });
        break;
      } catch {
        // retry with a different empCode
      }
    }
    if (!created) throw new BadRequestException("Failed to auto-create staff for user");

    await db.user.update({ where: { id: user.id }, data: { staffId: created.id } });
    return created.id;
  }

  resolveBranchId(principal: Principal, requestedBranchId?: string | null): string {
    return resolveBranchIdCommon(principal, requestedBranchId ?? null, { requiredForGlobal: true });
  }

  /**
   * Enforce that a principal can access a workspace.
   * - ORG_TEMPLATE: GLOBAL only
   * - BRANCH: branch principals must match; GLOBAL can access any
   */
  async assertWorkspaceAccess(principal: Principal, workspaceId: string) {
    const ws = await (this.prisma as any).complianceWorkspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, type: true, branchId: true, status: true },
    });
    if (!ws) throw new NotFoundException("Workspace not found");

    if (ws.type === "ORG_TEMPLATE") {
      if (principal.roleScope !== "GLOBAL") throw new ForbiddenException("ORG_TEMPLATE workspace requires GLOBAL scope");
      return ws;
    }

    if (!ws.branchId) throw new BadRequestException("BRANCH workspace missing branchId");
    this.resolveBranchId(principal, ws.branchId);
    return ws;
  }

  /** Resolve the active branch workspaceId for a given branchId. */
  async resolveBranchWorkspaceId(principal: Principal, branchId: string) {
    const bid = this.resolveBranchId(principal, branchId);
    const active = await (this.prisma as any).complianceWorkspace.findFirst({
      where: { branchId: bid, type: "BRANCH", status: "ACTIVE" },
      select: { id: true },
    });
    if (active) return active.id;

    const anyWs = await (this.prisma as any).complianceWorkspace.findFirst({
      where: { branchId: bid, type: "BRANCH" },
      orderBy: [{ createdAt: "desc" }],
      select: { id: true },
    });
    if (!anyWs) throw new NotFoundException("No compliance workspace found for branch");
    return anyWs.id;
  }

  /**
   * Maker-checker gate: creates an approval request instead of applying
   * a sensitive change directly. Callers should return the result to the
   * controller so the HTTP response signals "pending approval".
   */
  async requireApproval(opts: {
    workspaceId: string;
    changeType: string;
    entityType: string;
    entityId: string;
    payloadDraft: Record<string, unknown>;
    actorStaffId: string;
    notes?: string;
  }): Promise<{ requiresApproval: true; approvalId: string }> {
    const approval = await this.prisma.complianceApproval.create({
      data: {
        workspaceId: opts.workspaceId,
        changeType: opts.changeType,
        entityType: opts.entityType as any,
        entityId: opts.entityId,
        payloadDraft: opts.payloadDraft as any,
        notes: opts.notes,
        requestedByStaffId: opts.actorStaffId,
        status: 'SUBMITTED',
      },
    });

    await this.logCompliance({
      workspaceId: opts.workspaceId,
      entityType: 'APPROVAL',
      entityId: approval.id,
      action: 'APPROVAL_REQUESTED',
      actorStaffId: opts.actorStaffId,
      after: approval,
    });

    return { requiresApproval: true, approvalId: approval.id };
  }

  /**
   * Write an immutable compliance audit log entry.
   * Always call inside a transaction when doing multi-model writes.
   */
  async logCompliance(
    opts: {
      workspaceId: string;
      entityType: string;
      entityId: string;
      action: string;
      actorStaffId?: string | null;
      actorIp?: string | null;
      userAgent?: string | null;
      before?: any;
      after?: any;
    },
    tx?: any,
  ) {
    const db = tx ?? this.prisma;
    await db.complianceAuditLog.create({
      data: {
        workspaceId: opts.workspaceId,
        entityType: opts.entityType,
        entityId: opts.entityId,
        action: opts.action,
        actorStaffId: opts.actorStaffId ?? null,
        actorIp: opts.actorIp ?? null,
        userAgent: opts.userAgent ?? null,
        before: opts.before ?? undefined,
        after: opts.after ?? undefined,
      },
    });
  }
}
