import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { BBContextService } from "../shared/bb-context.service";
import { CreateLookbackDto, UpdateLookbackDto } from "./dto";

function mapTriggerType(
  t:
    | "REACTIVE_TTI"
    | "POST_ISSUE_REVIEW"
    | "MANUAL"
    | "TTI_REACTIVE"
    | "DONOR_SELF_REPORT"
    | "RECIPIENT_REACTION"
    | "OTHER",
): "REACTIVE_TTI" | "POST_ISSUE_REVIEW" | "MANUAL" {
  // canonical values
  if (t === "REACTIVE_TTI" || t === "POST_ISSUE_REVIEW" || t === "MANUAL") return t;
  // legacy mapping
  if (t === "TTI_REACTIVE") return "REACTIVE_TTI";
  if (t === "RECIPIENT_REACTION") return "POST_ISSUE_REVIEW";
  // DONOR_SELF_REPORT / OTHER
  return "MANUAL";
}

@Injectable()
export class LookbackService {
  constructor(
    private readonly ctx: BBContextService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    principal: Principal,
    opts: { branchId?: string | null; status?: string | null; take?: number },
  ) {
    const branchId = this.ctx.resolveBranchId(principal, opts.branchId);
    const take = Math.min(Math.max(opts.take ?? 50, 1), 200);

    return this.ctx.prisma.bloodLookbackCase.findMany({
      where: {
        branchId,
        ...(opts.status ? { status: opts.status as any } : {}),
      },
      include: {
        donor: { select: { id: true, donorNumber: true, name: true, bloodGroup: true, mobile: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        closedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async get(principal: Principal, id: string) {
    const row = await this.ctx.prisma.bloodLookbackCase.findUnique({
      where: { id },
      include: {
        donor: true,
        createdByUser: { select: { id: true, name: true, email: true } },
        closedByUser: { select: { id: true, name: true, email: true } },
      },
    });
    if (!row) throw new NotFoundException("Lookback case not found");

    // branch access check
    this.ctx.resolveBranchId(principal, row.branchId);
    return row;
  }

  private startOfDay(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

  private async nextCaseCode(branchId: string) {
    // Case code is NOT stored in DB schema. We compute a friendly code for display/notifications.
    const today = this.startOfDay(new Date());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const count = await this.ctx.prisma.bloodLookbackCase.count({
      where: { branchId, createdAt: { gte: today, lt: tomorrow } },
    });
    return `LB-${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, "0")}${String(today.getUTCDate()).padStart(2, "0")}-${String(
      count + 1,
    ).padStart(3, "0")}`;
  }

  private async computeCaseData(branchId: string, donorId: string) {
    const donor = await this.ctx.prisma.donor.findUnique({
      where: { id: donorId },
      select: { id: true, donorNumber: true, name: true, bloodGroup: true, mobile: true },
    });

    const units = await this.ctx.prisma.bloodUnit.findMany({
      where: { branchId, donorId },
      select: { id: true, unitNumber: true, bloodGroup: true, componentType: true, status: true, collectionStartAt: true, expiryDate: true },
      orderBy: { collectionStartAt: "desc" },
      take: 200,
    });

    return { donor, units, counts: { totalUnits: units.length } };
  }

  async create(principal: Principal, dto: CreateLookbackDto) {
    const branchId = this.ctx.resolveBranchId(principal, dto.branchId ?? null);
    const donorId = dto.donorId;
    const triggerType = mapTriggerType(dto.triggerType);

    // Basic donor existence check
    const donor = await this.ctx.prisma.donor.findUnique({ where: { id: donorId }, select: { id: true, name: true } });
    if (!donor) throw new BadRequestException("Invalid donorId");

    const caseCode = await this.nextCaseCode(branchId);
    const computed = await this.computeCaseData(branchId, donorId);

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      // Quarantine available units for donor at this branch
      await tx.bloodUnit.updateMany({
        where: { branchId, donorId, status: "AVAILABLE" },
        data: { status: "QUARANTINED" },
      });

      const c = await tx.bloodLookbackCase.create({
        data: {
          branchId,
          donorId,
          triggerType: triggerType as any,
          status: "OPEN" as any,
          notes: dto.notes?.trim() || undefined,
          createdByUserId: principal.userId,
          computedData: { ...(computed as any), caseCode },
        },
      });

      await this.ctx.audit.log(
        {
          branchId,
          actorUserId: principal.userId,
          action: "BB_LOOKBACK_CREATED",
          entity: "BloodLookbackCase",
          entityId: c.id,
          meta: { donorId, triggerType, caseCode },
        },
        tx,
      );

      return c;
    });

    // Notify branch admins (best-effort)
    try {
      await this.notifications.create(principal, {
        branchId,
        title: `Lookback opened (${caseCode})`,
        message: `Lookback case created for donor ${donor.name}. Trigger: ${triggerType}.`,
        severity: "WARNING",
        source: "blood-bank",
        entity: "BloodLookbackCase",
        entityId: created.id,
        tags: ["blood-bank", "lookback"],
      });
    } catch {
      // ignore
    }

    return this.get(principal, created.id);
  }

  async update(principal: Principal, id: string, dto: UpdateLookbackDto) {
    const existing = await this.ctx.prisma.bloodLookbackCase.findUnique({ where: { id }, select: { id: true, branchId: true } });
    if (!existing) throw new NotFoundException("Lookback case not found");
    const branchId = this.ctx.resolveBranchId(principal, existing.branchId);

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const row = await tx.bloodLookbackCase.update({
        where: { id },
        data: { notes: dto.notes?.trim() || undefined },
      });

      await this.ctx.audit.log(
        { branchId, actorUserId: principal.userId, action: "BB_LOOKBACK_UPDATED", entity: "BloodLookbackCase", entityId: id },
        tx,
      );
      return row;
    });

    return this.get(principal, updated.id);
  }

  async refresh(principal: Principal, id: string) {
    const existing = await this.ctx.prisma.bloodLookbackCase.findUnique({
      where: { id },
      select: { id: true, branchId: true, donorId: true, status: true },
    });
    if (!existing) throw new NotFoundException("Lookback case not found");
    const branchId = this.ctx.resolveBranchId(principal, existing.branchId);
    if (!existing.donorId) throw new BadRequestException("Lookback case has no donorId");

    const computed = await this.computeCaseData(branchId, existing.donorId);

    await this.ctx.prisma.$transaction(async (tx) => {
      await tx.bloodLookbackCase.update({ where: { id }, data: { computedData: computed as any } });
      await this.ctx.audit.log(
        { branchId, actorUserId: principal.userId, action: "BB_LOOKBACK_REFRESHED", entity: "BloodLookbackCase", entityId: id },
        tx,
      );
    });

    return this.get(principal, id);
  }

  async close(principal: Principal, id: string) {
    const existing = await this.ctx.prisma.bloodLookbackCase.findUnique({
      where: { id },
      select: { id: true, branchId: true, donorId: true, status: true },
    });
    if (!existing) throw new NotFoundException("Lookback case not found");
    const branchId = this.ctx.resolveBranchId(principal, existing.branchId);
    if (existing.status === "CLOSED") throw new BadRequestException("Lookback case is already closed");
    if (!existing.donorId) throw new BadRequestException("Lookback case has no donorId");
    const donorId = existing.donorId;

    await this.ctx.prisma.$transaction(async (tx) => {
      await tx.bloodLookbackCase.update({
        where: { id },
        data: {
          status: "CLOSED" as any,
          closedAt: new Date(),
          closedByUserId: principal.userId,
        },
      });

      // Optionally release quarantined units back to AVAILABLE.
      // We only release units that were quarantined (operator may still discard/transfer separately).
      await tx.bloodUnit.updateMany({
        where: { branchId, donorId, status: "QUARANTINED" },
        data: { status: "AVAILABLE" },
      });

      await this.ctx.audit.log(
        { branchId, actorUserId: principal.userId, action: "BB_LOOKBACK_CLOSED", entity: "BloodLookbackCase", entityId: id },
        tx,
      );
    });

    return this.get(principal, id);
  }
}
