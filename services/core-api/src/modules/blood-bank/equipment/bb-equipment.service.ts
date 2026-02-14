import { Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { CreateEquipmentDto, UpdateEquipmentDto, RecordTempLogDto } from "./dto";

@Injectable()
export class BBEquipmentService {
  constructor(private readonly ctx: BBContextService) {}

  async list(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    return this.ctx.prisma.bloodBankEquipment.findMany({
      where: { branchId: bid, isActive: true },
      orderBy: { equipmentId: "asc" },
    });
  }

  async create(principal: Principal, dto: CreateEquipmentDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    const result = await this.ctx.prisma.bloodBankEquipment.create({
      data: {
        branchId: bid,
        equipmentId: dto.name!,
        equipmentType: dto.equipmentType as any,
        make: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        capacityUnits: dto.capacity,
        tempRangeMinC: dto.minTemp,
        tempRangeMaxC: dto.maxTemp,
        location: dto.location,
        lastCalibratedAt: dto.lastCalibrationDate ? new Date(dto.lastCalibrationDate) : undefined,
        calibrationDueDate: dto.nextCalibrationDate ? new Date(dto.nextCalibrationDate) : undefined,
      },
    });
    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "BB_EQUIPMENT_CREATE",
      entity: "BloodBankEquipment",
      entityId: result.id,
      meta: { dto },
    });
    return result;
  }

  async update(principal: Principal, id: string, dto: UpdateEquipmentDto) {
    const existing = await this.ctx.prisma.bloodBankEquipment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Equipment not found");
    const bid = this.ctx.resolveBranchId(principal, existing.branchId);
    const result = await this.ctx.prisma.bloodBankEquipment.update({
      where: { id },
      data: {
        equipmentId: dto.name,
        make: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        capacityUnits: dto.capacity,
        tempRangeMinC: dto.minTemp,
        tempRangeMaxC: dto.maxTemp,
        location: dto.location,
        lastCalibratedAt: dto.lastCalibrationDate ? new Date(dto.lastCalibrationDate) : undefined,
        calibrationDueDate: dto.nextCalibrationDate ? new Date(dto.nextCalibrationDate) : undefined,
        isActive: dto.isActive,
      },
    });
    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "BB_EQUIPMENT_UPDATE",
      entity: "BloodBankEquipment",
      entityId: id,
      meta: { dto },
    });
    return result;
  }

  async getTempLogs(
    principal: Principal,
    equipmentId: string,
    opts: { from?: Date; to?: Date; take?: number },
  ) {
    const equipment = await this.ctx.prisma.bloodBankEquipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException("Equipment not found");
    this.ctx.resolveBranchId(principal, equipment.branchId);

    const where: any = { equipmentId };
    if (opts.from || opts.to) {
      where.recordedAt = {};
      if (opts.from) where.recordedAt.gte = opts.from;
      if (opts.to) where.recordedAt.lte = opts.to;
    }
    return this.ctx.prisma.equipmentTempLog.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      take: Math.min(opts.take ?? 200, 1000),
    });
  }

  async recordTempLog(principal: Principal, equipmentId: string, dto: RecordTempLogDto) {
    const equipment = await this.ctx.prisma.bloodBankEquipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new NotFoundException("Equipment not found");
    const bid = this.ctx.resolveBranchId(principal, equipment.branchId);

    const isBreaching =
      equipment.tempRangeMinC != null && equipment.tempRangeMaxC != null
        ? dto.temperature < Number(equipment.tempRangeMinC) || dto.temperature > Number(equipment.tempRangeMaxC)
        : false;

    const result = await this.ctx.prisma.equipmentTempLog.create({
      data: {
        equipmentId,
        temperatureC: dto.temperature,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        isBreaching,
      },
    });

    if (isBreaching) {
      await this.ctx.audit.log({
        branchId: bid,
        actorUserId: principal.userId,
        action: "BB_TEMP_BREACH",
        entity: "EquipmentTempLog",
        entityId: result.id,
        meta: { equipmentId, temperature: dto.temperature, tempRangeMinC: equipment.tempRangeMinC, tempRangeMaxC: equipment.tempRangeMaxC },
      });
    }
    return result;
  }

  async getTempAlerts(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.ctx.prisma.equipmentTempLog.findMany({
      where: {
        isBreaching: true,
        recordedAt: { gte: oneHourAgo },
        equipment: { branchId: bid },
      },
      include: { equipment: { select: { id: true, equipmentId: true, equipmentType: true, location: true } } },
      orderBy: { recordedAt: "desc" },
    });
  }
}
