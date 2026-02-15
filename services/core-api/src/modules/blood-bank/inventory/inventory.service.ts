import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { AssignInventorySlotDto, DiscardUnitDto, TransferUnitDto } from "./dto";

@Injectable()
export class InventoryService {
  constructor(private readonly ctx: BBContextService) {}

  async dashboard(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const bloodGroups = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"];
    const componentTypes = ["WHOLE_BLOOD", "PRBC", "FFP", "PLATELET_RDP", "PLATELET_SDP", "CRYOPRECIPITATE"];

    const units = await this.ctx.prisma.bloodUnit.groupBy({
      by: ["bloodGroup", "componentType"],
      where: { branchId: bid, status: "AVAILABLE" },
      _count: true,
    });

    const grid: Record<string, Record<string, number>> = {};
    for (const bg of bloodGroups) {
      grid[bg] = {};
      for (const ct of componentTypes) {
        grid[bg][ct] = 0;
      }
    }
    for (const row of units) {
      const bg = row.bloodGroup as string;
      const ct = (row.componentType ?? "WHOLE_BLOOD") as string;
      if (grid[bg]) grid[bg][ct] = row._count;
    }

    const totalAvailable = units.reduce((sum, r) => sum + r._count, 0);
    return { grid, totalAvailable, bloodGroups, componentTypes };
  }

  async listUnits(principal: Principal, opts: { branchId?: string | null; status?: string; bloodGroup?: string; componentType?: string; take?: number }) {
    const bid = this.ctx.resolveBranchId(principal, opts.branchId);
    const where: any = { branchId: bid };
    if (opts.status) where.status = opts.status;
    if (opts.bloodGroup) where.bloodGroup = opts.bloodGroup;
    if (opts.componentType) where.componentType = opts.componentType;

    return this.ctx.prisma.bloodUnit.findMany({
      where,
      include: {
        donor: { select: { id: true, donorNumber: true, name: true } },
        inventorySlot: { include: { equipment: { select: { id: true, equipmentType: true, location: true } } } },
      },
      orderBy: { collectionStartAt: "desc" },
      take: Math.min(opts.take ?? 100, 500),
    });
  }

  async unitDetail(principal: Principal, id: string) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({
      where: { id },
      include: {
        donor: true,
        groupingResults: true,
        ttiTests: true,
        crossMatchTests: true,
        bloodIssues: true,
        childUnits: true,
        parentUnit: true,
        inventorySlot: { include: { equipment: true } },
      },
    });
    if (!unit) throw new NotFoundException("Blood unit not found");
    this.ctx.resolveBranchId(principal, unit.branchId);
    return unit;
  }

  async expiringUnits(principal: Principal, branchId: string | null, days: number) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const threshold = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.ctx.prisma.bloodUnit.findMany({
      where: {
        branchId: bid,
        status: "AVAILABLE",
        expiryDate: { lte: threshold, gte: new Date() },
      },
      include: { donor: { select: { id: true, donorNumber: true, bloodGroup: true } } },
      orderBy: { expiryDate: "asc" },
    });
  }

  async discardUnit(principal: Principal, dto: DiscardUnitDto) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({ where: { id: dto.unitId } });
    if (!unit) throw new NotFoundException("Blood unit not found");
    const bid = this.ctx.resolveBranchId(principal, unit.branchId);

    if (unit.status === "TRANSFUSED" || unit.status === "DISCARDED") {
      throw new BadRequestException(`Cannot discard unit with status ${unit.status}`);
    }

    const result = await this.ctx.prisma.bloodUnit.update({
      where: { id: dto.unitId },
      data: { status: "DISCARDED" },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_UNIT_DISCARDED", entity: "BloodUnit", entityId: dto.unitId,
      meta: { reason: dto.reason, notes: dto.notes },
    });
    return result;
  }

  async transferUnit(principal: Principal, dto: TransferUnitDto) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({ where: { id: dto.unitId } });
    if (!unit) throw new NotFoundException("Blood unit not found");
    const bid = this.ctx.resolveBranchId(principal, unit.branchId);

    if (unit.status !== "AVAILABLE") throw new BadRequestException("Only available units can be transferred");

    const result = await this.ctx.prisma.bloodUnit.update({
      where: { id: dto.unitId },
      data: { branchId: dto.targetBranchId },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_UNIT_TRANSFERRED", entity: "BloodUnit", entityId: dto.unitId,
      meta: { fromBranch: bid, toBranch: dto.targetBranchId },
    });
    return result;
  }

  async assignSlot(principal: Principal, dto: AssignInventorySlotDto) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({ where: { id: dto.unitId }, include: { inventorySlot: true } });
    if (!unit) throw new NotFoundException("Blood unit not found");
    const bid = this.ctx.resolveBranchId(principal, unit.branchId);

    const eq = await this.ctx.prisma.bloodBankEquipment.findUnique({ where: { id: dto.equipmentId } });
    if (!eq) throw new NotFoundException("Equipment not found");
    if (eq.branchId !== bid) throw new BadRequestException("Equipment belongs to a different branch");
    if (!eq.isActive) throw new BadRequestException("Equipment is inactive");

    const result = await this.ctx.prisma.bloodInventorySlot.upsert({
      where: { bloodUnitId: dto.unitId },
      create: {
        bloodUnitId: dto.unitId,
        equipmentId: dto.equipmentId,
        shelf: dto.shelf,
        slot: dto.slot,
      },
      update: {
        equipmentId: dto.equipmentId,
        shelf: dto.shelf ?? undefined,
        slot: dto.slot ?? undefined,
        assignedAt: new Date(),
        removedAt: null,
      },
    });

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "BB_STORAGE_ASSIGNED",
      entity: "BloodUnit",
      entityId: dto.unitId,
      meta: { equipmentId: dto.equipmentId, shelf: dto.shelf, slot: dto.slot },
    });

    return result;
  }

  async stockLevels(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const available = await this.ctx.prisma.bloodUnit.groupBy({
      by: ["bloodGroup"],
      where: { branchId: bid, status: "AVAILABLE" },
      _count: true,
    });
    return available.map((r) => ({
      bloodGroup: r.bloodGroup,
      available: r._count,
      isLow: r._count < 5,
    }));
  }

  async storageMap(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const equipment = await this.ctx.prisma.bloodBankEquipment.findMany({
      where: { branchId: bid, isActive: true },
      include: {
        inventorySlots: {
          where: { removedAt: null, bloodUnit: { status: "AVAILABLE" } },
          include: { bloodUnit: { select: { id: true, unitNumber: true, bloodGroup: true, componentType: true, expiryDate: true } } },
        },
      },
    });
    return equipment.map((eq) => ({
      equipmentId: eq.id,
      location: eq.location,
      type: eq.equipmentType,
      capacity: eq.capacityUnits,
      storedCount: eq.inventorySlots.length,
      units: eq.inventorySlots.map((s) => s.bloodUnit),
    }));
  }
}
