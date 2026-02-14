import { Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { RecordIQCDto, RecordEQASDto, RecordCalibrationDto } from "./dto";

@Injectable()
export class QCService {
  constructor(private readonly ctx: BBContextService) {}

  async listIQC(principal: Principal, opts: { branchId?: string | null; from?: string; to?: string }) {
    const bid = this.ctx.resolveBranchId(principal, opts.branchId);
    const where: any = { branchId: bid, recordType: "IQC" };
    if (opts.from || opts.to) {
      where.performedAt = {};
      if (opts.from) where.performedAt.gte = new Date(opts.from);
      if (opts.to) where.performedAt.lte = new Date(opts.to);
    }
    return this.ctx.prisma.qualityControlRecord.findMany({
      where,
      orderBy: { performedAt: "desc" },
    });
  }

  async recordIQC(principal: Principal, dto: RecordIQCDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    const result = await this.ctx.prisma.qualityControlRecord.create({
      data: {
        branchId: bid,
        recordType: "IQC",
        testSystem: dto.testSystem!,
        qcLevel: dto.qcLevel,
        observedValue: dto.observedValue != null ? String(dto.observedValue) : undefined,
        expectedValue: dto.expectedValue != null ? String(dto.expectedValue) : undefined,
        westgardResult: dto.westgardPass == null ? "PASS" : dto.westgardPass ? "PASS" : "FAIL",
        westgardRule: dto.westgardViolation,
        performedAt: dto.recordDate ? new Date(dto.recordDate) : new Date(),
        performedByStaffId: principal.userId,
        correctiveAction: dto.notes,
      },
    });
    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_IQC_RECORDED", entity: "QualityControlRecord", entityId: result.id,
      meta: { testSystem: dto.testSystem, westgardResult: dto.westgardPass ? "PASS" : "FAIL" },
    });
    return result;
  }

  async listEQAS(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    return this.ctx.prisma.qualityControlRecord.findMany({
      where: { branchId: bid, recordType: "EQAS" },
      orderBy: { performedAt: "desc" },
    });
  }

  async recordEQAS(principal: Principal, dto: RecordEQASDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    const result = await this.ctx.prisma.qualityControlRecord.create({
      data: {
        branchId: bid,
        recordType: "EQAS",
        testSystem: dto.testSystem!,
        qcLevel: dto.qcLevel,
        observedValue: dto.observedValue != null ? String(dto.observedValue) : undefined,
        expectedValue: dto.expectedValue != null ? String(dto.expectedValue) : undefined,
        westgardResult: dto.westgardPass != null ? (dto.westgardPass ? "PASS" : "FAIL") : undefined,
        eqasProvider: dto.eqasProvider,
        eqasCycleId: dto.eqasCycleId,
        performedAt: dto.recordDate ? new Date(dto.recordDate) : new Date(),
        performedByStaffId: principal.userId,
        correctiveAction: dto.notes,
      },
    });
    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_EQAS_RECORDED", entity: "QualityControlRecord", entityId: result.id,
      meta: { testSystem: dto.testSystem, eqasProvider: dto.eqasProvider },
    });
    return result;
  }

  async calibrationSchedule(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const equipment = await this.ctx.prisma.bloodBankEquipment.findMany({
      where: { branchId: bid, isActive: true },
      select: {
        id: true, equipmentId: true, equipmentType: true,
        lastCalibratedAt: true, calibrationDueDate: true,
      },
      orderBy: { calibrationDueDate: "asc" },
    });
    return equipment.map((eq) => ({
      ...eq,
      isOverdue: eq.calibrationDueDate ? eq.calibrationDueDate < new Date() : false,
      isDueSoon: eq.calibrationDueDate
        ? eq.calibrationDueDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && eq.calibrationDueDate >= new Date()
        : false,
    }));
  }

  async recordCalibration(principal: Principal, dto: RecordCalibrationDto) {
    const equipment = await this.ctx.prisma.bloodBankEquipment.findUnique({ where: { id: dto.equipmentId } });
    if (!equipment) throw new NotFoundException("Equipment not found");
    const bid = this.ctx.resolveBranchId(principal, equipment.branchId);

    const result = await this.ctx.prisma.bloodBankEquipment.update({
      where: { id: dto.equipmentId },
      data: {
        lastCalibratedAt: new Date(),
        calibrationDueDate: dto.nextCalibrationDate ? new Date(dto.nextCalibrationDate) : undefined,
        calibratedByStaffId: principal.userId,
      },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_CALIBRATION_RECORDED", entity: "BloodBankEquipment", entityId: dto.equipmentId,
      meta: { calibratedBy: principal.userId, nextCalibration: dto.nextCalibrationDate },
    });
    return result;
  }
}
