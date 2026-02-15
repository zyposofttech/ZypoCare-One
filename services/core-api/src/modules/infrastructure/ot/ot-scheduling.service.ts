import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "../../auth/access-policy.service";
import { resolveBranchId } from "../../../common/branch-scope.util";

import {
  CreateBookingApprovalConfigDto,
  CreateCancellationPolicyDto,
  CreateEmergencyPolicyDto,
  CreateNotificationRuleDto,
  CreateRecoveryProtocolDto,
  CreateSchedulingRuleDto,
  CreateSurgeryTypeDefaultDto,
  CreateUtilizationTargetDto,
  UpdateSchedulingRuleDto,
} from "./ot-scheduling.dto";

@Injectable()
export class OtSchedulingService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  private async assertSuiteAccess(principal: Principal, suiteId: string) {
    const suite = await this.prisma.otSuite.findUnique({ where: { id: suiteId }, select: { branchId: true, isActive: true } });
    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    resolveBranchId(principal, suite.branchId);
    return suite;
  }

  // ---- Operating Hours (OTS-017) ----

  async listOperatingHours(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otSchedulingRule.findMany({
      where: { suiteId, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  }

  async createOperatingHours(principal: Principal, suiteId: string, dto: CreateSchedulingRuleDto) {
    await this.assertSuiteAccess(principal, suiteId);
    try {
      return await this.prisma.otSchedulingRule.create({
        data: {
          suiteId,
          theatreSpaceId: dto.theatreSpaceId ?? null,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
          sessionType: dto.sessionType as any,
          lunchStart: dto.lunchStart ?? null,
          lunchEnd: dto.lunchEnd ?? null,
          specialtyCode: dto.specialtyCode ?? null,
          isEffectiveDated: dto.isEffectiveDated ?? false,
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        },
      });
    } catch {
      throw new BadRequestException("Duplicate scheduling rule for this day/time/specialty combination.");
    }
  }

  async updateOperatingHours(principal: Principal, id: string, dto: UpdateSchedulingRuleDto) {
    const rule = await this.prisma.otSchedulingRule.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rule) throw new NotFoundException("Scheduling rule not found");
    resolveBranchId(principal, rule.suite.branchId);

    return this.prisma.otSchedulingRule.update({
      where: { id },
      data: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        sessionType: dto.sessionType as any,
        lunchStart: dto.lunchStart,
        lunchEnd: dto.lunchEnd,
        specialtyCode: dto.specialtyCode,
        isEffectiveDated: dto.isEffectiveDated,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async deleteOperatingHours(principal: Principal, id: string) {
    const rule = await this.prisma.otSchedulingRule.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rule) throw new NotFoundException("Scheduling rule not found");
    resolveBranchId(principal, rule.suite.branchId);

    await this.prisma.otSchedulingRule.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  // ---- Emergency Policy (OTS-019) ----

  async getEmergencyPolicy(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otEmergencyPolicy.findUnique({ where: { suiteId } });
  }

  async upsertEmergencyPolicy(principal: Principal, suiteId: string, dto: CreateEmergencyPolicyDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otEmergencyPolicy.upsert({
      where: { suiteId },
      create: {
        suiteId,
        hasDedicatedEmergencyOt: dto.hasDedicatedEmergencyOt ?? false,
        dedicatedTheatreSpaceId: dto.dedicatedTheatreSpaceId ?? null,
        availability: dto.availability ?? "24x7",
        escalationRule: dto.escalationRule ?? "QUEUE_WITH_ETA",
      },
      update: {
        hasDedicatedEmergencyOt: dto.hasDedicatedEmergencyOt,
        dedicatedTheatreSpaceId: dto.dedicatedTheatreSpaceId,
        availability: dto.availability,
        escalationRule: dto.escalationRule,
      },
    });
  }

  // ---- Surgery Type Defaults (OTS-039) ----

  async listSurgeryDefaults(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otSurgeryTypeDefault.findMany({ where: { suiteId, isActive: true }, orderBy: { category: "asc" } });
  }

  async upsertSurgeryDefault(principal: Principal, suiteId: string, dto: CreateSurgeryTypeDefaultDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otSurgeryTypeDefault.upsert({
      where: { suiteId_category: { suiteId, category: dto.category as any } },
      create: {
        suiteId,
        category: dto.category as any,
        minDurationMin: dto.minDurationMin,
        defaultDurationMin: dto.defaultDurationMin,
        maxDurationMin: dto.maxDurationMin,
        requiresIcuBooking: dto.requiresIcuBooking ?? false,
        requiresBloodReservation: dto.requiresBloodReservation ?? false,
      },
      update: {
        minDurationMin: dto.minDurationMin,
        defaultDurationMin: dto.defaultDurationMin,
        maxDurationMin: dto.maxDurationMin,
        requiresIcuBooking: dto.requiresIcuBooking,
        requiresBloodReservation: dto.requiresBloodReservation,
      },
    });
  }

  // ---- Cancellation Policy (OTS-041) ----

  async getCancellationPolicy(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otCancellationPolicy.findUnique({ where: { suiteId } });
  }

  async upsertCancellationPolicy(principal: Principal, suiteId: string, dto: CreateCancellationPolicyDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otCancellationPolicy.upsert({
      where: { suiteId },
      create: {
        suiteId,
        minNoticeHours: dto.minNoticeHours ?? 24,
        cancellationAuthority: (dto.cancellationAuthority ?? ["SURGEON"]) as any,
        mandatoryReasonRequired: dto.mandatoryReasonRequired ?? true,
        reasons: dto.reasons ?? null,
        maxReschedulesPerCase: dto.maxReschedulesPerCase ?? 3,
        priorityBoostOnReschedule: dto.priorityBoostOnReschedule ?? false,
        autoNotifyPatient: dto.autoNotifyPatient ?? true,
      },
      update: {
        minNoticeHours: dto.minNoticeHours,
        cancellationAuthority: dto.cancellationAuthority as any,
        mandatoryReasonRequired: dto.mandatoryReasonRequired,
        reasons: dto.reasons,
        maxReschedulesPerCase: dto.maxReschedulesPerCase,
        priorityBoostOnReschedule: dto.priorityBoostOnReschedule,
        autoNotifyPatient: dto.autoNotifyPatient,
      },
    });
  }

  // ---- Booking Approval Config (OTS-042) ----

  async getBookingApproval(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otBookingApprovalConfig.findUnique({ where: { suiteId } });
  }

  async upsertBookingApproval(principal: Principal, suiteId: string, dto: CreateBookingApprovalConfigDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otBookingApprovalConfig.upsert({
      where: { suiteId },
      create: {
        suiteId,
        defaultMode: (dto.defaultMode ?? "DIRECT") as any,
        minorMode: (dto.minorMode ?? "DIRECT") as any,
        majorMode: (dto.majorMode ?? "APPROVAL_REQUIRED") as any,
        complexMode: (dto.complexMode ?? "APPROVAL_REQUIRED") as any,
        emergencyMode: (dto.emergencyMode ?? "DIRECT") as any,
        approvalTimeoutHours: dto.approvalTimeoutHours ?? 24,
      },
      update: {
        defaultMode: dto.defaultMode as any,
        minorMode: dto.minorMode as any,
        majorMode: dto.majorMode as any,
        complexMode: dto.complexMode as any,
        emergencyMode: dto.emergencyMode as any,
        approvalTimeoutHours: dto.approvalTimeoutHours,
      },
    });
  }

  // ---- Utilization Targets (OTS-043) ----

  async listUtilizationTargets(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otUtilizationTarget.findMany({ where: { suiteId, isActive: true }, orderBy: { metricCode: "asc" } });
  }

  async upsertUtilizationTarget(principal: Principal, suiteId: string, dto: CreateUtilizationTargetDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otUtilizationTarget.upsert({
      where: { suiteId_metricCode: { suiteId, metricCode: dto.metricCode } },
      create: { suiteId, metricCode: dto.metricCode, targetValue: dto.targetValue, alertThresholdLow: dto.alertThresholdLow ?? null, alertThresholdHigh: dto.alertThresholdHigh ?? null },
      update: { targetValue: dto.targetValue, alertThresholdLow: dto.alertThresholdLow, alertThresholdHigh: dto.alertThresholdHigh },
    });
  }

  // ---- Recovery Protocols (OTS-044) ----

  async listRecoveryProtocols(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otRecoveryProtocol.findMany({ where: { suiteId, isActive: true }, orderBy: { surgeryCategory: "asc" } });
  }

  async upsertRecoveryProtocol(principal: Principal, suiteId: string, dto: CreateRecoveryProtocolDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otRecoveryProtocol.upsert({
      where: { suiteId_surgeryCategory: { suiteId, surgeryCategory: dto.surgeryCategory as any } },
      create: {
        suiteId,
        surgeryCategory: dto.surgeryCategory as any,
        monitoringFrequencyMin: dto.monitoringFrequencyMin ?? 15,
        mandatoryVitals: dto.mandatoryVitals ?? [],
        minRecoveryDurationMin: dto.minRecoveryDurationMin ?? 30,
        dischargeScoreThreshold: dto.dischargeScoreThreshold ?? 9,
        escalationRules: dto.escalationRules ?? null,
        dischargeSignOffRole: dto.dischargeSignOffRole ?? "RECOVERY_NURSE",
      },
      update: {
        monitoringFrequencyMin: dto.monitoringFrequencyMin,
        mandatoryVitals: dto.mandatoryVitals,
        minRecoveryDurationMin: dto.minRecoveryDurationMin,
        dischargeScoreThreshold: dto.dischargeScoreThreshold,
        escalationRules: dto.escalationRules,
        dischargeSignOffRole: dto.dischargeSignOffRole,
      },
    });
  }

  // ---- Notification Rules (OTS-046) ----

  async listNotificationRules(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otNotificationRule.findMany({ where: { suiteId, isActive: true }, orderBy: { eventType: "asc" } });
  }

  async upsertNotificationRule(principal: Principal, suiteId: string, dto: CreateNotificationRuleDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otNotificationRule.upsert({
      where: { suiteId_eventType: { suiteId, eventType: dto.eventType } },
      create: { suiteId, eventType: dto.eventType, recipientRoles: dto.recipientRoles, channels: dto.channels, timing: dto.timing },
      update: { recipientRoles: dto.recipientRoles, channels: dto.channels, timing: dto.timing },
    });
  }
}
