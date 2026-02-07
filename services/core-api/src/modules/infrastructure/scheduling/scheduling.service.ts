import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import { INFRA_POLICY, type ProcedurePrecheckPolicyPayload } from "../infrastructure.constants";
import type { CreateProcedureBookingDto } from "./dto";

@Injectable()
export class SchedulingService {
  constructor(private readonly ctx: InfraContextService) {}

  // ---------------------------------------------------------------------------
  // Scheduling: STRICT at scheduling time (Consent/Anesthesia/Checklist)
  // ---------------------------------------------------------------------------
  private async enforcePrechecksStrict(branchId: string, dto: CreateProcedureBookingDto) {
    // Defaults are strict at scheduling time.
    const payload = (await this.ctx.policyEngine.getPayload(INFRA_POLICY.PROCEDURE_PRECHECK, branchId, {
      scheduling: { consent: "BLOCK", anesthesia: "BLOCK", checklist: "BLOCK" },
    })) as ProcedurePrecheckPolicyPayload;

    const mode = payload?.scheduling ?? { consent: "BLOCK", anesthesia: "BLOCK", checklist: "BLOCK" };

    const violations: string[] = [];
    if ((mode.consent ?? "BLOCK") === "BLOCK" && !dto.consentOk) violations.push("Consent is required to schedule.");
    if ((mode.anesthesia ?? "BLOCK") === "BLOCK" && !dto.anesthesiaOk) violations.push("Anesthesia clearance is required to schedule.");
    if ((mode.checklist ?? "BLOCK") === "BLOCK" && !dto.checklistOk) violations.push("Checklist completion is required to schedule.");

    if (violations.length) throw new BadRequestException(violations.join(" "));
  }

  async listBookings(
    principal: Principal,
    q: { branchId?: string | null; unitId?: string; resourceId?: string; from?: string; to?: string },
  ) {
    const branchId = this.ctx.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId };
    if (q.unitId) where.unitId = q.unitId;
    if (q.resourceId) where.resourceId = q.resourceId;
    if (q.from || q.to) {
      where.startAt = { gte: q.from ? new Date(q.from) : undefined };
      where.endAt = { lte: q.to ? new Date(q.to) : undefined };
    }
    return this.ctx.prisma.procedureBooking.findMany({ where, orderBy: [{ startAt: "asc" }] });
  }

  async createBooking(principal: Principal, dto: CreateProcedureBookingDto) {
    // 1) Validate unit (and derive branchId in a GLOBAL-safe way)
    const unit = await this.ctx.prisma.unit.findUnique({
      where: { id: dto.unitId },
      select: { id: true, branchId: true, isActive: true },
    });
    if (!unit || !unit.isActive) throw new BadRequestException("Invalid unitId");

    const branchId = this.ctx.resolveBranchId(principal, unit.branchId);

    // 2) Pre-check blockers/warnings (defaults should be strict at scheduling time)
    await this.enforcePrechecksStrict(branchId, dto);

    // 3) Validate resource belongs to SAME branch + SAME unit, is active, schedulable, and AVAILABLE
    const res = await this.ctx.prisma.unitResource.findFirst({
      where: {
        id: dto.resourceId,
        branchId,
        unitId: dto.unitId,
      },
      select: { id: true, isActive: true, isSchedulable: true, state: true },
    });
    if (!res) {
      throw new BadRequestException("Invalid resourceId (must belong to the selected unit in this branch)");
    }
    if (!res.isActive || !res.isSchedulable) {
      throw new BadRequestException(
        "Invalid resourceId (must be schedulable and active and belong to the selected unit)",
      );
    }
    const state = String(res.state ?? "").toUpperCase();
    if (state !== "AVAILABLE") {
      throw new BadRequestException(
        `Cannot schedule: resource state is '${state || "UNKNOWN"}'. Resource must be AVAILABLE.`,
      );
    }

    // 4) Validate time window
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException("Invalid startAt/endAt");
    }
    if (!(startAt < endAt)) {
      throw new BadRequestException("Invalid time window (startAt must be before endAt)");
    }

    // 5) Conflict detection (strict)
    const conflict = await this.ctx.prisma.procedureBooking.findFirst({
      where: {
        branchId,
        resourceId: dto.resourceId,
        status: "SCHEDULED" as any,
        // overlap condition: existing.start < new.end && existing.end > new.start
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, startAt: true, endAt: true },
    });
    if (conflict) {
      throw new BadRequestException("Scheduling conflict detected for this resource.");
    }

    // 6) Create booking
    const booking = await this.ctx.prisma.procedureBooking.create({
      data: {
        branchId,
        unitId: dto.unitId,
        resourceId: dto.resourceId,
        patientId: dto.patientId ?? null,
        departmentId: dto.departmentId ?? null,
        startAt,
        endAt,
        status: "SCHEDULED" as any,

        // strict defaults: treat undefined as false
        consentOk: !!dto.consentOk,
        anesthesiaOk: !!dto.anesthesiaOk,
        checklistOk: !!dto.checklistOk,

        createdByUserId: principal.userId,
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_SCHED_CREATE",
      entity: "ProcedureBooking",
      entityId: booking.id,
      meta: {
        unitId: dto.unitId,
        resourceId: dto.resourceId,
        startAt: dto.startAt,
        endAt: dto.endAt,
        patientId: dto.patientId ?? null,
        departmentId: dto.departmentId ?? null,
        consentOk: !!dto.consentOk,
        anesthesiaOk: !!dto.anesthesiaOk,
        checklistOk: !!dto.checklistOk,
      },
    });

    return booking;
  }

  async cancelBooking(principal: Principal, id: string, reason: string) {
    const bookingAny = await this.ctx.prisma.procedureBooking.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true },
    });
    if (!bookingAny) throw new NotFoundException("Booking not found");

    const branchId = this.ctx.resolveBranchId(principal, bookingAny.branchId);

    const booking = await this.ctx.prisma.procedureBooking.findFirst({
      where: { id, branchId },
      select: { id: true, status: true },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.status !== ("SCHEDULED" as any)) throw new BadRequestException("Only SCHEDULED bookings can be cancelled");

    const updated = await this.ctx.prisma.procedureBooking.update({
      where: { id },
      data: { status: "CANCELLED" as any },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_SCHED_CANCEL",
      entity: "ProcedureBooking",
      entityId: id,
      meta: { reason },
    });

    return updated;
  }
}
