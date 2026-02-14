import { Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { CreateCampDto, UpdateCampDto } from "./dto";

@Injectable()
export class CampService {
  constructor(private readonly ctx: BBContextService) {}

  async list(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    return this.ctx.prisma.bloodDonationCamp.findMany({
      where: { branchId: bid },
      orderBy: { campDate: "desc" },
    });
  }

  async create(principal: Principal, dto: CreateCampDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    const result = await this.ctx.prisma.bloodDonationCamp.create({
      data: {
        branchId: bid,
        campCode: dto.campName!,
        campDate: new Date(dto.campDate!),
        location: dto.location!,
        organizer: dto.organizer ?? "",
        estimatedDonors: dto.estimatedDonors ?? 0,
        status: "PLANNED",
        equipmentChecklist: dto.equipmentChecklist,
      },
    });
    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_CAMP_CREATE", entity: "BloodDonationCamp", entityId: result.id, meta: { campCode: dto.campName },
    });
    return result;
  }

  async update(principal: Principal, id: string, dto: UpdateCampDto) {
    const existing = await this.ctx.prisma.bloodDonationCamp.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Camp not found");
    const bid = this.ctx.resolveBranchId(principal, existing.branchId);
    const result = await this.ctx.prisma.bloodDonationCamp.update({
      where: { id },
      data: {
        campCode: dto.campName, location: dto.location, organizer: dto.organizer,
        estimatedDonors: dto.estimatedDonors,
        actualDonors: dto.actualDonors, unitsCollected: dto.unitsCollected,
        status: dto.status, summary: dto.summary,
      },
    });
    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_CAMP_UPDATE", entity: "BloodDonationCamp", entityId: id, meta: { dto },
    });
    return result;
  }

  async getChecklist(principal: Principal, id: string) {
    const camp = await this.ctx.prisma.bloodDonationCamp.findUnique({ where: { id } });
    if (!camp) throw new NotFoundException("Camp not found");
    this.ctx.resolveBranchId(principal, camp.branchId);
    return {
      campId: id,
      campCode: camp.campCode,
      equipmentChecklist: camp.equipmentChecklist ?? [],
      defaultChecklist: [
        "Blood collection bags (single/double/triple)",
        "Pilot tubes and labels",
        "Hemoglobin testing equipment",
        "BP apparatus and stethoscope",
        "Weighing scale",
        "Thermometer",
        "Donor registration forms",
        "Consent forms",
        "Refreshments for donors",
        "Emergency kit",
        "Cooler boxes with ice packs",
        "Tourniquet and swabs",
      ],
    };
  }

  async syncCamp(principal: Principal, id: string) {
    const camp = await this.ctx.prisma.bloodDonationCamp.findUnique({ where: { id } });
    if (!camp) throw new NotFoundException("Camp not found");
    const bid = this.ctx.resolveBranchId(principal, camp.branchId);

    // Count units collected on the camp date at this branch
    const campStart = new Date(camp.campDate);
    campStart.setHours(0, 0, 0, 0);
    const campEnd = new Date(camp.campDate);
    campEnd.setHours(23, 59, 59, 999);
    const unitsCollected = await this.ctx.prisma.bloodUnit.count({
      where: { branchId: bid, collectionStartAt: { gte: campStart, lte: campEnd } },
    });

    const result = await this.ctx.prisma.bloodDonationCamp.update({
      where: { id },
      data: { unitsCollected, status: "COMPLETED", syncedAt: new Date() },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_CAMP_SYNC", entity: "BloodDonationCamp", entityId: id, meta: { unitsCollected },
    });
    return result;
  }
}
