import { Inject, Injectable } from "@nestjs/common";
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

  resolveBranchId(principal: Principal, requestedBranchId?: string | null): string {
    return resolveBranchIdCommon(principal, requestedBranchId ?? null, { requiredForGlobal: true });
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
    actorId: string;
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
        requestedByStaffId: opts.actorId,
        status: 'SUBMITTED',
      },
    });

    await this.logCompliance({
      workspaceId: opts.workspaceId,
      entityType: 'APPROVAL',
      entityId: approval.id,
      action: 'APPROVAL_REQUESTED',
      actorStaffId: opts.actorId,
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
