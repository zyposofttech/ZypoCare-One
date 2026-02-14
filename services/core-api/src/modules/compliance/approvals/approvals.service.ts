import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { ComplianceContextService } from "../compliance-context.service";
import type { CreateApprovalDto, DecideApprovalDto } from "./dto/approvals.dto";

@Injectable()
export class ApprovalsService {
  constructor(private readonly ctx: ComplianceContextService) {}

  async list(
    principal: Principal,
    query: {
      workspaceId?: string;
      status?: string;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = {};

    if (query.workspaceId) where.workspaceId = query.workspaceId;
    if (query.status) where.status = query.status;

    const findArgs: any = {
      where,
      orderBy: [{ createdAt: "desc" }],
      take: take + 1,
      include: {
        requestedBy: { select: { id: true, name: true } },
        decidedBy: { select: { id: true, name: true } },
      },
    };
    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.complianceApproval.findMany(findArgs);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }

  async create(principal: Principal, dto: CreateApprovalDto) {
    if (!principal.staffId) throw new BadRequestException("Staff context required for approval requests");

    const approval = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.complianceApproval.create({
        data: {
          workspaceId: dto.workspaceId,
          changeType: dto.changeType,
          entityType: dto.entityType as any,
          entityId: dto.entityId,
          payloadDraft: dto.payloadDraft,
          notes: dto.notes ?? null,
          requestedByStaffId: principal.staffId!,
          status: "DRAFT",
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: dto.workspaceId,
          entityType: "APPROVAL",
          entityId: created.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: { changeType: dto.changeType, entityType: dto.entityType, entityId: dto.entityId },
        },
        tx,
      );

      return created;
    });

    return approval;
  }

  async submit(principal: Principal, approvalId: string) {
    const existing = await this.ctx.prisma.complianceApproval.findUnique({ where: { id: approvalId } });
    if (!existing) throw new NotFoundException("Approval not found");
    if (existing.status !== "DRAFT") throw new BadRequestException("Only DRAFT approvals can be submitted");

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.complianceApproval.update({
        where: { id: approvalId },
        data: { status: "SUBMITTED" },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "APPROVAL",
          entityId: approvalId,
          action: "SUBMIT",
          actorStaffId: principal.staffId,
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  async decide(principal: Principal, approvalId: string, dto: DecideApprovalDto) {
    if (!principal.staffId) throw new BadRequestException("Staff context required for approval decisions");

    const existing = await this.ctx.prisma.complianceApproval.findUnique({ where: { id: approvalId } });
    if (!existing) throw new NotFoundException("Approval not found");
    if (existing.status !== "SUBMITTED") throw new BadRequestException("Only SUBMITTED approvals can be decided");
    if (existing.requestedByStaffId === principal.staffId) {
      throw new BadRequestException("Cannot approve/reject your own request");
    }

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.complianceApproval.update({
        where: { id: approvalId },
        data: {
          status: dto.decision,
          decidedByStaffId: principal.staffId!,
          decidedAt: new Date(),
          decisionNotes: dto.decisionNotes ?? null,
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "APPROVAL",
          entityId: approvalId,
          action: dto.decision,
          actorStaffId: principal.staffId,
          before: { status: existing.status },
          after: { status: dto.decision, decisionNotes: dto.decisionNotes },
        },
        tx,
      );

      return result;
    });

    // Execute the approved change after the approval decision is persisted
    if (dto.decision === 'APPROVED') {
      try {
        await this.executeApprovedChange(updated);
      } catch (err) {
        // Log but don't fail the approval decision
        console.error('Failed to execute approved change:', err);
      }
    }

    return updated;
  }

  private async executeApprovedChange(approval: any) {
    const payload = approval.payloadDraft as Record<string, unknown>;

    switch (approval.changeType) {
      case 'ABDM_SECRET_UPDATE': {
        await this.ctx.prisma.abdmConfig.update({
          where: { id: approval.entityId },
          data: { clientSecretEnc: payload.clientSecretEnc as string },
        });
        break;
      }
      case 'RATE_CARD_FREEZE': {
        await this.ctx.prisma.schemeRateCard.update({
          where: { id: approval.entityId },
          data: { status: 'FROZEN' },
        });
        break;
      }
      case 'NABH_CRITICAL_VERIFY': {
        await this.ctx.prisma.nabhWorkspaceItem.update({
          where: { id: approval.entityId },
          data: {
            status: 'VERIFIED',
            verifiedAt: new Date(),
            verifiedByStaffId: approval.decidedByStaffId,
          },
        });
        break;
      }
      default:
        break;
    }
  }
}
