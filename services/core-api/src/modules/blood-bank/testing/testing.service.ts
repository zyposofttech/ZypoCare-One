import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { RecordGroupingDto, RecordTTIDto, VerifyResultsDto, ConfirmLabelDto } from "./dto";

@Injectable()
export class TestingService {
  constructor(private readonly ctx: BBContextService) {}

  async worklist(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    return this.ctx.prisma.bloodUnit.findMany({
      where: { branchId: bid, status: "TESTING" },
      include: {
        donor: { select: { id: true, donorNumber: true, name: true, bloodGroup: true } },
        groupingResults: true,
        ttiTests: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async recordGrouping(principal: Principal, dto: RecordGroupingDto) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({ where: { id: dto.unitId } });
    if (!unit) throw new NotFoundException("Blood unit not found");
    const bid = this.ctx.resolveBranchId(principal, unit.branchId);

    const result = await this.ctx.prisma.bloodGroupingResult.create({
      data: {
        bloodUnitId: dto.unitId!,
        forwardGrouping: dto.aboForward ?? {},
        reverseGrouping: dto.aboReverse ?? {},
        rhType: dto.rhTyping ? String(dto.rhTyping) : undefined,
        antibodyScreenResult: dto.antibodyScreen,
        confirmedGroup: dto.confirmedBloodGroup as any,
        hasDiscrepancy: dto.hasDiscrepancy ?? false,
        discrepancyNotes: dto.discrepancyNotes,
        testedByStaffId: principal.userId,
      },
    });

    if (dto.confirmedBloodGroup) {
      await this.ctx.prisma.bloodUnit.update({
        where: { id: dto.unitId },
        data: { bloodGroup: dto.confirmedBloodGroup as any },
      });
    }

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_GROUPING_RECORDED", entity: "BloodGroupingResult", entityId: result.id,
      meta: { unitId: dto.unitId, confirmedGroup: dto.confirmedBloodGroup, hasDiscrepancy: dto.hasDiscrepancy },
    });
    return result;
  }

  async recordTTI(principal: Principal, dto: RecordTTIDto) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({ where: { id: dto.unitId } });
    if (!unit) throw new NotFoundException("Blood unit not found");
    const bid = this.ctx.resolveBranchId(principal, unit.branchId);

    const result = await this.ctx.prisma.tTITestRecord.create({
      data: {
        bloodUnitId: dto.unitId!,
        testName: dto.testName!,
        method: dto.method,
        kitLotNo: dto.kitLotNumber,
        result: (dto.result as any) ?? "PENDING",
        testedByStaffId: principal.userId,
      },
    });

    // If reactive, quarantine the unit and trigger look-back
    if (dto.result === "REACTIVE") {
      await this.ctx.prisma.bloodUnit.update({
        where: { id: dto.unitId },
        data: { status: "QUARANTINED" },
      });

      // Look-back: find prior donations from same donor
      const priorUnits = await this.ctx.prisma.bloodUnit.findMany({
        where: { donorId: unit.donorId, id: { not: unit.id }, status: { in: ["AVAILABLE", "ISSUED"] } },
      });

      if (priorUnits.length > 0) {
        await this.ctx.audit.log({
          branchId: bid, actorUserId: principal.userId,
          action: "BB_TTI_LOOKBACK_TRIGGERED", entity: "BloodUnit", entityId: dto.unitId,
          meta: { testName: dto.testName, affectedUnits: priorUnits.map((u) => u.id) },
        });
      }
    }

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_TTI_RECORDED", entity: "TTITestRecord", entityId: result.id,
      meta: { unitId: dto.unitId, testName: dto.testName, result: dto.result },
    });
    return result;
  }

  async verifyResults(principal: Principal, dto: VerifyResultsDto) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({
      where: { id: dto.unitId },
      include: { groupingResults: true, ttiTests: true },
    });
    if (!unit) throw new NotFoundException("Blood unit not found");
    const bid = this.ctx.resolveBranchId(principal, unit.branchId);

    // Verify grouping
    const latestGrouping = unit.groupingResults[0];
    if (latestGrouping) {
      await this.ctx.prisma.bloodGroupingResult.update({
        where: { id: latestGrouping.id },
        data: { verifiedByStaffId: principal.userId, verifiedAt: new Date() },
      });
    }

    // Verify TTI tests
    if (unit.ttiTests.length > 0) {
      await this.ctx.prisma.tTITestRecord.updateMany({
        where: { bloodUnitId: dto.unitId, verifiedByStaffId: null },
        data: { verifiedByStaffId: principal.userId, verifiedAt: new Date() },
      });
    }

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_RESULTS_VERIFIED", entity: "BloodUnit", entityId: dto.unitId,
      meta: { verifierNotes: dto.notes },
    });
    return { unitId: dto.unitId, verified: true, verifiedBy: principal.userId };
  }

  async confirmLabel(principal: Principal, dto: ConfirmLabelDto) {
    const unit = await this.ctx.prisma.bloodUnit.findUnique({
      where: { id: dto.unitId },
      include: { ttiTests: true, groupingResults: true, inventorySlot: true },
    });
    if (!unit) throw new NotFoundException("Blood unit not found");
    const bid = this.ctx.resolveBranchId(principal, unit.branchId);

    // Safety: block release if any TTI is reactive
    const reactiveTest = unit.ttiTests.find((t) => t.result === "REACTIVE");
    if (reactiveTest) throw new BadRequestException("Cannot confirm label: TTI reactive result found");

    // Safety: block release if grouping not verified
    const latestGrouping = unit.groupingResults[0];
    if (!latestGrouping?.verifiedByStaffId) throw new BadRequestException("Cannot confirm label: grouping not verified");

    // Safety: block release if any TTI pending
    const pendingTest = unit.ttiTests.find((t) => t.result === "PENDING");
    if (pendingTest) throw new BadRequestException("Cannot confirm label: TTI tests still pending");

    const result = await this.ctx.prisma.bloodUnit.update({
      where: { id: dto.unitId },
      data: { status: "AVAILABLE" },
    });

    // Storage placement: auto-place into default storage equipment (best UX)
    // - If facility has defaultStorageEquipmentId: use it
    // - Else fallback to first active refrigerator/freezer/agitator
    // - If none found: create a WARN notification so operations can assign manually
    if (!unit.inventorySlot) {
      const facility = await this.ctx.prisma.bloodBankFacility.findUnique({
        where: { branchId: bid },
        select: { defaultStorageEquipmentId: true },
      });
      const fallbackEq = await this.ctx.prisma.bloodBankEquipment.findFirst({
        where: {
          branchId: bid,
          isActive: true,
          equipmentType: { in: ["REFRIGERATOR", "DEEP_FREEZER", "PLATELET_AGITATOR"] },
        },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      const equipmentId = facility?.defaultStorageEquipmentId ?? fallbackEq?.id ?? null;
      if (equipmentId) {
        await this.ctx.prisma.bloodInventorySlot.upsert({
          where: { bloodUnitId: dto.unitId },
          create: { bloodUnitId: dto.unitId, equipmentId },
          update: { equipmentId, assignedAt: new Date(), removedAt: null },
        });
        await this.ctx.audit.log({
          branchId: bid,
          actorUserId: principal.userId,
          action: "BB_STORAGE_AUTO_PLACED",
          entity: "BloodUnit",
          entityId: dto.unitId,
          meta: { equipmentId },
        });
      } else {
        await this.ctx.prisma.notification.create({
          data: {
            branchId: bid,
            title: "Storage placement pending",
            message: `Unit ${unit.unitNumber} released as AVAILABLE but no storage equipment is configured. Please assign a storage location.`,
            severity: "WARNING",
            status: "OPEN",
            source: "BLOOD_BANK",
            entity: "BloodUnit",
            entityId: dto.unitId,
            meta: { unitId: dto.unitId, unitNumber: unit.unitNumber },
          },
        });
      }
    }

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_LABEL_CONFIRMED", entity: "BloodUnit", entityId: dto.unitId,
      meta: { status: "AVAILABLE" },
    });
    return result;
  }

  async dailyQCStatus(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const qcRecords = await this.ctx.prisma.qualityControlRecord.findMany({
      where: { branchId: bid, performedAt: { gte: today, lt: tomorrow } },
    });

    return {
      date: today.toISOString().slice(0, 10),
      totalRecords: qcRecords.length,
      passed: qcRecords.filter((r) => r.westgardResult === "PASS").length,
      failed: qcRecords.filter((r) => r.westgardResult === "FAIL").length,
      records: qcRecords,
    };
  }
}
