import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { StartCollectionDto, EndCollectionDto, RecordAdverseEventDto, RecordPilotTubesDto, RecordSeparationDto } from "./dto";

@Injectable()
export class CollectionService {
  constructor(private readonly ctx: BBContextService) {}

  async worklist(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    // Return donors with eligible status who have a recent approved screening
    const recentScreenings = await this.ctx.prisma.donorScreening.findMany({
      where: {
        eligibilityDecision: "ELIGIBLE",
        consentGiven: true,
        screeningDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        donor: { branchId: bid, donorStatus: "ELIGIBLE" },
      },
      include: { donor: true },
      orderBy: { screeningDate: "desc" },
    });
    return recentScreenings;
  }

  async startCollection(principal: Principal, dto: StartCollectionDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    const donor = await this.ctx.prisma.donor.findUnique({ where: { id: dto.donorId } });
    if (!donor) throw new NotFoundException("Donor not found");
    if (donor.donorStatus !== "ELIGIBLE") throw new BadRequestException("Donor is not eligible for donation");

    const unitNumber = `BU-${Date.now().toString(36).toUpperCase()}`;
    const result = await this.ctx.prisma.bloodUnit.create({
      data: {
        branchId: bid,
        unitNumber,
        barcode: unitNumber,
        donorId: dto.donorId!,
        bagType: (dto.bagType as any) ?? "SINGLE",
        collectionType: (dto.collectionType as any) ?? "WHOLE_BLOOD_450",
        collectionStartAt: new Date(),
        bloodGroup: donor.bloodGroup as any,
        status: "COLLECTED",
        collectedByStaffId: principal.userId,
        volumeCollectedMl: dto.volumeMl,
      },
    });

    // Increment donation count
    await this.ctx.prisma.donor.update({
      where: { id: dto.donorId },
      data: { donationCount: { increment: 1 }, lastDonationDate: new Date() },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_COLLECTION_START", entity: "BloodUnit", entityId: result.id, meta: { unitNumber, donorId: dto.donorId },
    });
    return result;
  }

  async endCollection(principal: Principal, unitId: string, dto: EndCollectionDto) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException("Blood unit not found");
    const bid = this.ctx.resolveBranchId(principal, unit.branchId);

    const result = await this.ctx.prisma.bloodUnit.update({
      where: { id: unitId },
      data: {
        collectionEndAt: new Date(),
        volumeCollectedMl: dto.volumeMl ?? unit.volumeCollectedMl,
        status: "TESTING",
      },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_COLLECTION_END", entity: "BloodUnit", entityId: unitId, meta: { volumeMl: dto.volumeMl },
    });
    return result;
  }

  async recordAdverseEvent(principal: Principal, unitId: string, dto: RecordAdverseEventDto) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException("Blood unit not found");
    const bid = this.ctx.resolveBranchId(principal, unit.branchId);

    const result = await this.ctx.prisma.bloodUnit.update({
      where: { id: unitId },
      data: { donorAdverseEvent: dto.eventDescription, donorAdverseSeverity: dto.notes },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_DONOR_ADVERSE_EVENT", entity: "BloodUnit", entityId: unitId, meta: { event: dto.eventDescription },
    });
    return result;
  }

  async recordPilotTubes(principal: Principal, unitId: string, dto: RecordPilotTubesDto) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException("Blood unit not found");
    const bid = this.ctx.resolveBranchId(principal, unit.branchId);

    const result = await this.ctx.prisma.bloodUnit.update({
      where: { id: unitId },
      data: { pilotTubeLabels: dto.labels },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_PILOT_TUBES_RECORDED", entity: "BloodUnit", entityId: unitId, meta: { labels: dto.labels },
    });
    return result;
  }

  async separationWorklist(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    return this.ctx.prisma.bloodUnit.findMany({
      where: {
        branchId: bid,
        status: { in: ["TESTING", "COLLECTED"] },
        bagType: { not: "SINGLE" },
        childUnits: { none: {} },
      },
      include: { donor: { select: { id: true, donorNumber: true, name: true, bloodGroup: true } } },
      orderBy: { collectionStartAt: "asc" },
    });
  }

  async recordSeparation(principal: Principal, dto: RecordSeparationDto) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({ where: { id: dto.parentUnitId } });
    if (!unit) throw new NotFoundException("Blood unit not found");
    const bid = this.ctx.resolveBranchId(principal, unit.branchId);

    const components = await this.ctx.prisma.$transaction(
      dto.components.map((comp: any) =>
        this.ctx.prisma.bloodUnit.create({
          data: {
            branchId: bid,
            unitNumber: `${unit.unitNumber}-${comp.componentType}`,
            barcode: `${unit.barcode}-${comp.componentType}`,
            donorId: unit.donorId,
            parentUnitId: unit.id,
            bagType: unit.bagType,
            collectionType: unit.collectionType,
            collectionStartAt: unit.collectionStartAt,
            bloodGroup: unit.bloodGroup,
            componentType: comp.componentType,
            status: "TESTING",
            volumeCollectedMl: comp.volumeMl,
            expiryDate: comp.expiryDate ? new Date(comp.expiryDate) : undefined,
            collectedByStaffId: unit.collectedByStaffId,
          },
        }),
      ),
    );

    await this.ctx.prisma.bloodUnit.update({
      where: { id: dto.parentUnitId },
      data: { status: "SEPARATED" },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_SEPARATION_COMPLETE", entity: "BloodUnit", entityId: dto.parentUnitId,
      meta: { childCount: components.length, componentTypes: dto.components.map((c: any) => c.componentType) },
    });
    return components;
  }

  async separationAlerts(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    return this.ctx.prisma.bloodUnit.findMany({
      where: {
        branchId: bid,
        status: { in: ["TESTING", "COLLECTED"] },
        bagType: { not: "SINGLE" },
        childUnits: { none: {} },
        collectionStartAt: { lte: sixHoursAgo },
      },
      orderBy: { collectionStartAt: "asc" },
    });
  }
}
