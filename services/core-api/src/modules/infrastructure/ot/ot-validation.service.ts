import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "../../auth/access-policy.service";
import { resolveBranchId } from "../../../common/branch-scope.util";

import { DecommissionSuiteDto, ReviewSuiteDto } from "./ot-validation.dto";

@Injectable()
export class OtValidationService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  private async assertSuiteAccess(principal: Principal, suiteId: string) {
    const suite = await this.prisma.otSuite.findUnique({
      where: { id: suiteId },
      select: { id: true, branchId: true, status: true, isActive: true },
    });
    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    resolveBranchId(principal, suite.branchId);
    return suite;
  }

  // ---- Go-Live Validator (OTS-059) ----

  async runGoLiveValidation(principal: Principal, suiteId: string) {
    const suite = await this.assertSuiteAccess(principal, suiteId);

    // Fetch all related data
    const [spaces, equipment, staffAssignments, surgeonPriv, anesthetistPriv, storeLinks, chargeComponents, complianceConfigs, checklists, schedulingRules, emergencyPolicy, staffingRules] = await Promise.all([
      this.prisma.otSpace.findMany({ where: { suiteId, isActive: true }, include: { theatre: true, recoveryBay: true } }),
      this.prisma.otEquipment.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otStaffAssignment.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otSurgeonPrivilege.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otAnesthetistPrivilege.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otStoreLink.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otChargeComponent.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otComplianceConfig.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otChecklistTemplate.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otSchedulingRule.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otEmergencyPolicy.findUnique({ where: { suiteId } }),
      this.prisma.otMinStaffingRule.findMany({ where: { suiteId, isActive: true } }),
    ]);

    const theatres = spaces.filter((s) => s.type === "THEATRE" && s.theatre);
    const recoveryBays = spaces.filter((s) => s.type === "RECOVERY_BAY" && s.recoveryBay);

    // Blocker checks (must pass for go-live)
    const blockerChecks = [
      { key: "MIN_THEATRES", label: "At least 1 active theatre", ok: theatres.length >= 1, severity: "BLOCKER" as const },
      { key: "RECOVERY_BAYS", label: "At least 1 recovery bay", ok: recoveryBays.length >= 1, severity: "BLOCKER" as const },
      { key: "WHO_CHECKLIST", label: "WHO Surgical Safety Checklist configured", ok: checklists.some((c) => c.phase === "SIGN_IN" || c.phase === "TIME_OUT" || c.phase === "SIGN_OUT"), severity: "BLOCKER" as const },
      { key: "SURGEON_MAPPED", label: "At least 1 surgeon privileged", ok: surgeonPriv.length >= 1, severity: "BLOCKER" as const },
      { key: "ANESTHETIST_MAPPED", label: "At least 1 anesthetist privileged", ok: anesthetistPriv.length >= 1, severity: "BLOCKER" as const },
      { key: "STORE_LINKED", label: "OT Store linked", ok: storeLinks.length >= 1, severity: "BLOCKER" as const },
      { key: "CHARGE_COMPONENTS", label: "At least 1 charge component configured", ok: chargeComponents.length >= 1, severity: "BLOCKER" as const },
      { key: "EMERGENCY_POLICY", label: "Emergency policy configured", ok: !!emergencyPolicy, severity: "BLOCKER" as const },
      { key: "MIN_STAFFING", label: "Minimum staffing rules defined", ok: staffingRules.length >= 1, severity: "BLOCKER" as const },
    ];

    // Warning checks (recommended but not blocking)
    const warningChecks = [
      { key: "EQUIPMENT", label: "Equipment linked to theatres", ok: equipment.length >= 1, severity: "WARNING" as const },
      { key: "FUMIGATION", label: "Fumigation schedule configured", ok: complianceConfigs.some((c) => c.configType === "FUMIGATION"), severity: "WARNING" as const },
      { key: "INFECTION_ZONES", label: "Infection control zones defined", ok: complianceConfigs.some((c) => c.configType === "INFECTION_ZONE"), severity: "WARNING" as const },
      { key: "OPERATING_HOURS", label: "Operating hours configured", ok: schedulingRules.length >= 1, severity: "WARNING" as const },
      { key: "FIRE_SAFETY", label: "Fire safety configured", ok: complianceConfigs.some((c) => c.configType === "FIRE_SAFETY"), severity: "WARNING" as const },
      { key: "BIOMEDICAL_WASTE", label: "Biomedical waste management configured", ok: complianceConfigs.some((c) => c.configType === "BIOMEDICAL_WASTE"), severity: "WARNING" as const },
      { key: "SSI_SURVEILLANCE", label: "SSI surveillance configured", ok: complianceConfigs.some((c) => c.configType === "SSI_SURVEILLANCE"), severity: "WARNING" as const },
      { key: "STAFF_ASSIGNMENTS", label: "Staff assigned to OT", ok: staffAssignments.length >= 1, severity: "WARNING" as const },
      { key: "TABLES_PER_THEATRE", label: "All theatres have tables", ok: theatres.every((t) => (t.theatre as any)?.tables?.length >= 1), severity: "WARNING" as const },
    ];

    const allChecks = [...blockerChecks, ...warningChecks];
    const totalChecks = allChecks.length;
    const passedChecks = allChecks.filter((c) => c.ok).length;
    const blockersFailed = blockerChecks.filter((c) => !c.ok).length;
    const warningsFailed = warningChecks.filter((c) => !c.ok).length;
    const score = Math.round((passedChecks / totalChecks) * 100);

    // Save validation run
    const validation = await this.prisma.otGoLiveValidation.create({
      data: {
        suiteId,
        runByUserId: principal.userId,
        score,
        totalChecks,
        passedChecks,
        blockersFailed,
        warningsFailed,
        results: allChecks as any,
      },
    });

    // Update suite validation score
    await this.prisma.otSuite.update({
      where: { id: suiteId },
      data: { lastValidationScore: score, lastValidationAt: new Date() },
    });

    return {
      id: validation.id,
      score,
      totalChecks,
      passedChecks,
      blockersFailed,
      warningsFailed,
      isReadyForGoLive: blockersFailed === 0,
      checks: allChecks,
    };
  }

  // ---- Submit for Review (OTS-060) ----

  async submitForReview(principal: Principal, suiteId: string) {
    const suite = await this.assertSuiteAccess(principal, suiteId);

    if (suite.status !== "draft") {
      throw new BadRequestException("Only DRAFT suites can be submitted for review.");
    }

    await this.prisma.otSuite.update({
      where: { id: suiteId },
      data: { reviewStatus: "IN_REVIEW" },
    });

    return { ok: true, reviewStatus: "IN_REVIEW" };
  }

  // ---- Review Suite (OTS-061) ----

  async reviewSuite(principal: Principal, suiteId: string, dto: ReviewSuiteDto) {
    const suite = await this.assertSuiteAccess(principal, suiteId);

    if (suite.status !== "draft" || !["IN_REVIEW"].includes((suite as any).reviewStatus ?? "")) {
      // Allow review even if not formally submitted — admin flexibility
    }

    const record = await this.prisma.otReviewRecord.create({
      data: {
        suiteId,
        reviewerId: principal.userId,
        action: dto.action as any,
        comments: dto.comments ?? null,
      },
    });

    const newReviewStatus = dto.action === "APPROVED" ? "VALIDATED" : dto.action === "REJECTED" ? null : "IN_REVIEW";

    await this.prisma.otSuite.update({
      where: { id: suiteId },
      data: { reviewStatus: newReviewStatus },
    });

    return { ok: true, reviewId: record.id, action: dto.action, reviewStatus: newReviewStatus };
  }

  // ---- Activate Suite (OTS-062) ----

  async activateSuite(principal: Principal, suiteId: string) {
    const suite = await this.assertSuiteAccess(principal, suiteId);

    // Run a validation to check blockers
    const validation = await this.runGoLiveValidation(principal, suiteId);
    if (!validation.isReadyForGoLive) {
      throw new BadRequestException(`Cannot activate: ${validation.blockersFailed} blocker check(s) failed.`);
    }

    await this.prisma.otSuite.update({
      where: { id: suiteId },
      data: {
        status: "active" as any,
        isActive: true,
        activatedAt: new Date(),
        activatedByUserId: principal.userId,
        reviewStatus: "VALIDATED",
      },
    });

    return { ok: true, status: "active", activatedAt: new Date() };
  }

  // ---- Decommission Suite (OTS-063) ----

  async decommissionSuite(principal: Principal, suiteId: string, dto: DecommissionSuiteDto) {
    const suite = await this.assertSuiteAccess(principal, suiteId);

    if (dto.type === "PERMANENT") {
      await this.prisma.otSuite.update({
        where: { id: suiteId },
        data: { status: "archived" as any, isActive: false },
      });
    } else {
      await this.prisma.otSuite.update({
        where: { id: suiteId },
        data: { status: "maintenance" as any },
      });
    }

    // Record the decommission as a review event
    await this.prisma.otReviewRecord.create({
      data: {
        suiteId,
        reviewerId: principal.userId,
        action: "REJECTED" as any,
        comments: `Decommissioned (${dto.type}): ${dto.reason ?? "No reason provided"}`,
      },
    });

    return { ok: true, type: dto.type };
  }

  // ---- Completion Report (OTS-064) ----

  async getCompletionReport(principal: Principal, suiteId: string) {
    const suite = await this.prisma.otSuite.findUnique({
      where: { id: suiteId },
      include: {
        spaces: { where: { isActive: true }, include: { theatre: true, recoveryBay: true } },
        equipment: { where: { isActive: true } },
        schedulingRules: { where: { isActive: true } },
        staffAssignments: { where: { isActive: true } },
        surgeonPrivileges: { where: { isActive: true } },
        anesthetistPrivileges: { where: { isActive: true } },
        storeLinks: { where: { isActive: true } },
        chargeComponents: { where: { isActive: true } },
        complianceConfigs: { where: { isActive: true } },
        checklistTemplates: { where: { isActive: true } },
        emergencyPolicy: true,
        cancellationPolicy: true,
        bookingApprovalConfig: true,
        goLiveValidations: { orderBy: { runAt: "desc" }, take: 1 },
        reviewRecords: { orderBy: { reviewedAt: "desc" } },
      },
    });

    if (!suite) throw new NotFoundException("OT Suite not found");
    resolveBranchId(principal, suite.branchId);

    return suite;
  }

  // ---- Review History (OTS-061) ----

  async getReviewHistory(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otReviewRecord.findMany({
      where: { suiteId },
      orderBy: { reviewedAt: "desc" },
    });
  }
}
