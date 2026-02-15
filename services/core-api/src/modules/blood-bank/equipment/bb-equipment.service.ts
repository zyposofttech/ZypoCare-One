import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { CreateEquipmentDto, UpdateEquipmentDto, RecordTempLogDto, ReviewTempBreachDto } from "./dto";

@Injectable()
export class BBEquipmentService {
  constructor(private readonly ctx: BBContextService) {}

  private toNum(v: any): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    try {
      const s = typeof v === "string" ? v : v?.toString?.() ?? String(v);
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }

  private actorStaffId(principal: Principal): string {
    const p: any = principal as any;
    return String(p?.staffId ?? p?.userId ?? "SYSTEM");
  }

  async list(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    return this.ctx.prisma.bloodBankEquipment.findMany({
      where: { branchId: bid },
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
        alarmThresholdMinC: dto.alarmMinTemp,
        alarmThresholdMaxC: dto.alarmMaxTemp,

        iotSensorId: dto.iotSensorId,
        pollingIntervalSec: dto.pollingIntervalSec,

        location: dto.location,

        lastCalibratedAt: dto.lastCalibrationDate ? new Date(dto.lastCalibrationDate) : undefined,
        calibrationDueDate: dto.nextCalibrationDate ? new Date(dto.nextCalibrationDate) : undefined,
        calibrationInterval: dto.calibrationIntervalDays,
        calibratedByStaffId: dto.lastCalibrationDate ? this.actorStaffId(principal) : undefined,
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
        equipmentType: dto.equipmentType as any,

        make: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        capacityUnits: dto.capacity,

        tempRangeMinC: dto.minTemp,
        tempRangeMaxC: dto.maxTemp,
        alarmThresholdMinC: dto.alarmMinTemp,
        alarmThresholdMaxC: dto.alarmMaxTemp,

        iotSensorId: dto.iotSensorId,
        pollingIntervalSec: dto.pollingIntervalSec,

        location: dto.location,

        lastCalibratedAt: dto.lastCalibrationDate ? new Date(dto.lastCalibrationDate) : undefined,
        calibrationDueDate: dto.nextCalibrationDate ? new Date(dto.nextCalibrationDate) : undefined,
        calibrationInterval: dto.calibrationIntervalDays,
        calibratedByStaffId: dto.lastCalibrationDate ? this.actorStaffId(principal) : undefined,

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

  async getTempLogs(principal: Principal, equipmentId: string, opts: { from?: Date; to?: Date; take?: number }) {
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

    // Prefer alarm thresholds when configured; else fall back to storage range
    const min = this.toNum(equipment.alarmThresholdMinC) ?? this.toNum(equipment.tempRangeMinC);
    const max = this.toNum(equipment.alarmThresholdMaxC) ?? this.toNum(equipment.tempRangeMaxC);
    const isBreaching = min != null && max != null ? dto.temperature < min || dto.temperature > max : false;

    const result = await this.ctx.prisma.equipmentTempLog.create({
      data: {
        equipmentId,
        temperatureC: dto.temperature,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        isBreaching,
      },
    });

    // On breach: quarantine stored units + notification + audit
    if (isBreaching) {
      await this.ctx.audit.log({
        branchId: bid,
        actorUserId: principal.userId,
        action: "BB_TEMP_BREACH",
        entity: "EquipmentTempLog",
        entityId: result.id,
        meta: {
          equipmentId,
          temperature: dto.temperature,
          alarmThresholdMinC: equipment.alarmThresholdMinC,
          alarmThresholdMaxC: equipment.alarmThresholdMaxC,
          tempRangeMinC: equipment.tempRangeMinC,
          tempRangeMaxC: equipment.tempRangeMaxC,
        },
      });

      const slots = await this.ctx.prisma.bloodInventorySlot.findMany({
        where: { equipmentId, removedAt: null },
        select: { bloodUnitId: true },
      });

      const unitIds = slots.map((s) => s.bloodUnitId);
      if (unitIds.length) {
        const updated = await this.ctx.prisma.bloodUnit.updateMany({
          where: { id: { in: unitIds }, status: { in: ["AVAILABLE", "RESERVED", "CROSS_MATCHED"] } },
          data: { status: "QUARANTINED" },
        });

        if (updated.count > 0) {
          const dedupeKey = `BB_TEMP_BREACH:${equipmentId}`;
          const existing = await this.ctx.prisma.notification.findFirst({
            where: { branchId: bid, dedupeKey, status: "OPEN" },
            select: { id: true },
          });

          const data = {
            branchId: bid,
            title: "Temperature breach: units quarantined",
            message:
              `Temperature breach detected for equipment ${equipment.equipmentId}. ` +
              `Affected units have been quarantined for review (count: ${updated.count}).`,
            severity: "CRITICAL" as any,
            status: "OPEN" as any,
            source: "BLOOD_BANK",
            entity: "BloodBankEquipment",
            entityId: equipmentId,
            dedupeKey,
            meta: { equipmentId, tempLogId: result.id, unitIds, temperatureC: dto.temperature, recordedAt: result.recordedAt },
            tags: ["TEMP_BREACH", "COLD_CHAIN"],
          };

          if (existing?.id) await this.ctx.prisma.notification.update({ where: { id: existing.id }, data });
          else await this.ctx.prisma.notification.create({ data });

          await this.ctx.audit.log({
            branchId: bid,
            actorUserId: principal.userId,
            action: "BB_UNITS_TEMP_QUARANTINED",
            entity: "BloodBankEquipment",
            entityId: equipmentId,
            meta: { tempLogId: result.id, unitCount: updated.count },
          });
        }
      }
    }

    return result;
  }

  // IMPORTANT: return OPEN (unacknowledged) breaches so UI never misses safety-gate blocks
  async getTempAlerts(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return this.ctx.prisma.equipmentTempLog.findMany({
      where: {
        isBreaching: true,
        acknowledged: false,
        recordedAt: { gte: windowStart },
        equipment: { branchId: bid },
      },
      include: { equipment: { select: { id: true, equipmentId: true, equipmentType: true, location: true } } },
      orderBy: { recordedAt: "desc" },
    });
  }

  async recordTempLogBySensor(principal: Principal, sensorId: string, dto: RecordTempLogDto) {
    const equipment = await this.ctx.prisma.bloodBankEquipment.findFirst({ where: { iotSensorId: sensorId } });
    if (!equipment) throw new NotFoundException("No equipment is mapped to this sensorId");
    return this.recordTempLog(principal, equipment.id, dto);
  }

  async acknowledgeTempBreach(principal: Principal, tempLogId: string) {
    const log = await this.ctx.prisma.equipmentTempLog.findUnique({
      where: { id: tempLogId },
      include: { equipment: { select: { id: true, branchId: true, equipmentId: true } } },
    });
    if (!log) throw new NotFoundException("Temperature log not found");

    const bid = this.ctx.resolveBranchId(principal, log.equipment.branchId);

    if (!log.isBreaching) throw new BadRequestException("This temperature log is not marked as a breach");
    if (log.acknowledged) return log;

    const result = await this.ctx.prisma.equipmentTempLog.update({
      where: { id: tempLogId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedByStaffId: this.actorStaffId(principal),
      },
    });

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "BB_TEMP_BREACH_ACK",
      entity: "EquipmentTempLog",
      entityId: tempLogId,
      meta: { equipmentId: log.equipment.equipmentId },
    });

    return result;
  }

  // P10: breach review workflow (ack + release/discard quarantined units)
  async reviewTempBreach(principal: Principal, tempLogId: string, dto: ReviewTempBreachDto) {
    const log = await this.ctx.prisma.equipmentTempLog.findUnique({
      where: { id: tempLogId },
      include: { equipment: true },
    });
    if (!log) throw new NotFoundException("Temperature log not found");
    if (!log.isBreaching) throw new BadRequestException("Only breach logs can be reviewed");

    const bid = this.ctx.resolveBranchId(principal, log.equipment.branchId);
    const acknowledgeIfNeeded = dto.acknowledgeIfNeeded !== false;
    const requireRecoveryLog = dto.requireRecoveryLog !== false;

    if (requireRecoveryLog) {
      const recovered = await this.ctx.prisma.equipmentTempLog.findFirst({
        where: {
          equipmentId: log.equipmentId,
          recordedAt: { gt: log.recordedAt },
          isBreaching: false,
        },
        orderBy: { recordedAt: "asc" },
        select: { id: true, recordedAt: true, temperatureC: true },
      });
      if (!recovered) {
        throw new BadRequestException(
          "No recovery temperature reading recorded after this breach. Record a normal reading before resolving.",
        );
      }
    }

    if (acknowledgeIfNeeded && !log.acknowledged) {
      await this.ctx.prisma.equipmentTempLog.update({
        where: { id: tempLogId },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedByStaffId: this.actorStaffId(principal),
        },
      });
    }

    const slots = await this.ctx.prisma.bloodInventorySlot.findMany({
      where: { equipmentId: log.equipmentId, removedAt: null },
      select: { bloodUnitId: true },
    });
    const slotUnitIds = slots.map((s) => s.bloodUnitId);
    if (slotUnitIds.length === 0) {
      return { action: dto.action, affectedUnits: 0, message: "No units are currently stored in this equipment." };
    }

    const quarantined = await this.ctx.prisma.bloodUnit.findMany({
      where: { id: { in: slotUnitIds }, status: "QUARANTINED" },
      select: { id: true },
    });
    const quarantinedIds = quarantined.map((u) => u.id);

    let targetIds = quarantinedIds;
    if (dto.unitIds?.length) {
      const wanted = new Set(dto.unitIds);
      const allowed = new Set(quarantinedIds);
      const invalid = dto.unitIds.filter((id) => !allowed.has(id));
      if (invalid.length) throw new BadRequestException("Some unitIds are not quarantined in this equipment");
      targetIds = [...wanted];
    }

    if (targetIds.length === 0) {
      return { action: dto.action, affectedUnits: 0, message: "No quarantined units found to act on." };
    }

    const action = dto.action;
    let updatedCount = 0;

    if (action === "RELEASE") {
      const res = await this.ctx.prisma.bloodUnit.updateMany({
        where: { id: { in: targetIds }, status: "QUARANTINED" },
        data: { status: "AVAILABLE" },
      });
      updatedCount = res.count;
    } else {
      const res = await this.ctx.prisma.bloodUnit.updateMany({
        where: { id: { in: targetIds }, status: "QUARANTINED" },
        data: { status: "DISCARDED" },
      });
      updatedCount = res.count;

      await this.ctx.prisma.bloodInventorySlot.updateMany({
        where: { bloodUnitId: { in: targetIds } },
        data: { removedAt: new Date() },
      });
    }

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "BB_TEMP_BREACH_REVIEW",
      entity: "EquipmentTempLog",
      entityId: tempLogId,
      meta: {
        equipmentId: log.equipmentId,
        equipmentLabel: log.equipment.equipmentId,
        reviewAction: action,
        affectedUnits: updatedCount,
        note: dto.note ?? null,
      },
    });

    await this.ctx.prisma.notification.create({
      data: {
        branchId: bid,
        title: `Temperature breach reviewed: ${action === "RELEASE" ? "units released" : "units discarded"}`,
        message:
          `Equipment ${log.equipment.equipmentId}: ${updatedCount} unit(s) ${action === "RELEASE" ? "released" : "discarded"}.` +
          (dto.note ? ` Note: ${dto.note}` : ""),
        severity: action === "DISCARD" ? ("CRITICAL" as any) : ("WARNING" as any),
        status: "OPEN" as any,
        source: "BLOOD_BANK",
        entity: "EquipmentTempLog",
        entityId: tempLogId,
        meta: { equipmentId: log.equipmentId, reviewAction: action, affectedUnits: updatedCount },
        tags: ["TEMP_BREACH", "COLD_CHAIN", action],
      },
    });

    return { action, affectedUnits: updatedCount, acknowledged: acknowledgeIfNeeded ? true : log.acknowledged };
  }
}
