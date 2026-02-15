import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "../../auth/access-policy.service";

/**
 * OT Copilot Service — AI-assisted analysis for OT suite configuration.
 *
 * Provides intelligent analysis for:
 * - Configuration readiness scoring (10 categories)
 * - Gap analysis across theatres, equipment, staff, compliance
 * - Equipment suggestions based on theatre type
 * - Staffing level recommendations
 * - Scheduling optimisation suggestions
 * - Compliance readiness assessment (NABH)
 */

// ── Mandatory equipment per theatre type ────────────────────────────────

const BASE_MANDATORY_EQUIPMENT = [
  { name: "Anesthesia machine", category: "ANESTHESIA" },
  { name: "Patient monitor", category: "MONITORING" },
  { name: "Suction machine", category: "SUCTION" },
  { name: "Defibrillator", category: "EMERGENCY" },
  { name: "OT Light", category: "LIGHTING" },
  { name: "OT Table", category: "FURNITURE" },
  { name: "Crash cart", category: "EMERGENCY" },
];

const THEATRE_TYPE_EQUIPMENT: Record<string, { name: string; category: string; reason: string }[]> = {
  LAMINAR_FLOW: [
    { name: "Particle counter", category: "MONITORING", reason: "Required for laminar airflow validation" },
    { name: "HEPA filter system", category: "HVAC", reason: "Mandatory for laminar flow class environment" },
  ],
  HYBRID: [
    { name: "C-Arm", category: "IMAGING", reason: "Required for intra-operative imaging in hybrid OT" },
    { name: "Image processing system", category: "IMAGING", reason: "Supports real-time image guidance" },
  ],
  LAPAROSCOPIC: [
    { name: "Laparoscopy tower", category: "ENDOSCOPY", reason: "Core equipment for minimally invasive procedures" },
    { name: "Insufflator", category: "ENDOSCOPY", reason: "Required for pneumoperitoneum creation" },
  ],
};

// ── Required space types ────────────────────────────────────────────────

const REQUIRED_SPACE_TYPES = ["THEATRE", "RECOVERY_BAY", "SCRUB_ROOM", "STERILE_STORE"];

// ── Compliance config types ─────────────────────────────────────────────

const COMPLIANCE_CONFIG_TYPES = [
  { configType: "WHO_CHECKLIST", label: "WHO Surgical Safety Checklist" },
  { configType: "INFECTION_ZONE", label: "Infection Control Zones" },
  { configType: "FUMIGATION", label: "Fumigation Schedule" },
  { configType: "BIOMEDICAL_WASTE", label: "Biomedical Waste Management" },
  { configType: "FIRE_SAFETY", label: "Fire Safety Protocols" },
  { configType: "SSI_SURVEILLANCE", label: "SSI Surveillance" },
];

// ── All weekdays ────────────────────────────────────────────────────────

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]; // Sun–Sat

@Injectable()
export class OtCopilotService {
  constructor(@Inject("PRISMA") private readonly prisma: PrismaClient) {}

  private async assertSuiteAccess(_principal: Principal, suiteId: string) {
    const suite = await this.prisma.otSuite.findUnique({
      where: { id: suiteId },
      select: { id: true, branchId: true, isActive: true, lastValidationScore: true, config: true },
    });
    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    return suite;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 1. Readiness Score
  // ══════════════════════════════════════════════════════════════════════

  async readinessScore(
    principal: Principal,
    branchId: string,
    suiteId: string,
  ): Promise<{
    score: number;
    maxScore: number;
    percentage: number;
    breakdown: { category: string; points: number; maxPoints: number; detail: string }[];
  }> {
    const suite = await this.assertSuiteAccess(principal, suiteId);

    const [
      spaces,
      theatres,
      equipment,
      staffAssignments,
      surgeonPrivileges,
      anesthetistPrivileges,
      minStaffingRules,
      storeLinks,
      parLevels,
      schedulingRules,
      surgeryDefaults,
      serviceLinks,
      chargeComponents,
      complianceConfigs,
      checklistTemplates,
      recoveryProtocols,
    ] = await Promise.all([
      this.prisma.otSpace.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otTheatre.findMany({ where: { space: { suiteId, isActive: true } }, include: { space: true } }),
      this.prisma.otEquipment.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otStaffAssignment.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otSurgeonPrivilege.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otAnesthetistPrivilege.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otMinStaffingRule.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otStoreLink.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otParLevel.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otSchedulingRule.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otSurgeryTypeDefault.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otServiceLink.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otChargeComponent.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otComplianceConfig.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otChecklistTemplate.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otRecoveryProtocol.findMany({ where: { suiteId, isActive: true } }),
    ]);

    const breakdown: { category: string; points: number; maxPoints: number; detail: string }[] = [];

    // 1. Spaces (10 pts)
    let spacePts = 0;
    if (spaces.length >= 1) spacePts += 4;
    const spaceTypes = new Set(spaces.map((s) => s.type));
    const coveredRequired = REQUIRED_SPACE_TYPES.filter((t) => spaceTypes.has(t as any));
    spacePts += Math.round((coveredRequired.length / REQUIRED_SPACE_TYPES.length) * 6);
    breakdown.push({
      category: "Spaces",
      points: Math.min(10, spacePts),
      maxPoints: 10,
      detail: `${spaces.length} space(s); types covered: ${coveredRequired.join(", ") || "none"}`,
    });

    // 2. Theatres (15 pts)
    let theatrePts = 0;
    if (theatres.length >= 1) theatrePts += 3;
    const withEngineering = theatres.filter((t) => t.area != null && (t.gasO2 || t.gasN2O || t.gasAir));
    theatrePts += withEngineering.length > 0 ? Math.min(4, withEngineering.length * 2) : 0;
    const withSpecialties = theatres.filter((t) => (t.specialtyCodes as string[])?.length > 0);
    theatrePts += withSpecialties.length > 0 ? Math.min(4, withSpecialties.length * 2) : 0;
    const withScheduling = theatres.filter((t) => t.turnaroundTimeMin != null || t.maxCasesPerDay != null);
    theatrePts += withScheduling.length > 0 ? Math.min(4, withScheduling.length * 2) : 0;
    breakdown.push({
      category: "Theatres",
      points: Math.min(15, theatrePts),
      maxPoints: 15,
      detail: `${theatres.length} theatre(s); ${withEngineering.length} with engineering specs, ${withSpecialties.length} with specialties, ${withScheduling.length} with scheduling params`,
    });

    // 3. Equipment (10 pts)
    const mandatoryNames = BASE_MANDATORY_EQUIPMENT.map((e) => e.name.toLowerCase());
    const equipNames = equipment.map((e) => e.name.toLowerCase());
    const mandatoryCovered = mandatoryNames.filter((m) => equipNames.some((e) => e.includes(m) || m.includes(e)));
    const equipPts = equipment.length > 0
      ? Math.min(10, 3 + Math.round((mandatoryCovered.length / mandatoryNames.length) * 7))
      : 0;
    const overdueEquip = equipment.filter((e) => {
      const meta = e.meta as any;
      return meta?.nextMaintenanceDue && new Date(meta.nextMaintenanceDue) < new Date();
    });
    const equipDetail = overdueEquip.length > 0
      ? `${equipment.length} item(s), ${mandatoryCovered.length}/${mandatoryNames.length} mandatory covered; WARNING: ${overdueEquip.length} maintenance overdue`
      : `${equipment.length} item(s), ${mandatoryCovered.length}/${mandatoryNames.length} mandatory covered`;
    breakdown.push({ category: "Equipment", points: equipPts, maxPoints: 10, detail: equipDetail });

    // 4. Staff (10 pts)
    let staffPts = 0;
    const hasInCharge = staffAssignments.some((s) => (s.role as string) === "OT_IN_CHARGE");
    if (hasInCharge) staffPts += 4;
    if (surgeonPrivileges.length > 0) staffPts += 3;
    if (anesthetistPrivileges.length > 0) staffPts += 3;
    breakdown.push({
      category: "Staff",
      points: Math.min(10, staffPts),
      maxPoints: 10,
      detail: `OT In-Charge: ${hasInCharge ? "Yes" : "No"}, ${surgeonPrivileges.length} surgeon(s), ${anesthetistPrivileges.length} anesthetist(s)`,
    });

    // 5. Store (5 pts)
    let storePts = 0;
    if (storeLinks.length > 0) storePts += 3;
    if (parLevels.length > 0) storePts += 2;
    breakdown.push({
      category: "Store",
      points: Math.min(5, storePts),
      maxPoints: 5,
      detail: `${storeLinks.length} store link(s), ${parLevels.length} par level(s)`,
    });

    // 6. Scheduling (10 pts)
    let schedPts = 0;
    if (schedulingRules.length > 0) schedPts += 5;
    if (surgeryDefaults.length > 0) schedPts += 5;
    breakdown.push({
      category: "Scheduling",
      points: Math.min(10, schedPts),
      maxPoints: 10,
      detail: `${schedulingRules.length} operating hour rule(s), ${surgeryDefaults.length} surgery default(s)`,
    });

    // 7. Billing (10 pts)
    let billPts = 0;
    if (serviceLinks.length > 0) billPts += 5;
    if (chargeComponents.length > 0) billPts += 5;
    breakdown.push({
      category: "Billing",
      points: Math.min(10, billPts),
      maxPoints: 10,
      detail: `${serviceLinks.length} service link(s), ${chargeComponents.length} charge component(s)`,
    });

    // 8. Compliance (15 pts)
    let compPts = 0;
    const hasWho = checklistTemplates.some((c) => c.phase === "SIGN_IN" || c.phase === "TIME_OUT" || c.phase === "SIGN_OUT");
    if (hasWho) compPts += 5;
    const infectionZone = complianceConfigs.some((c) => c.configType === "INFECTION_ZONE");
    if (infectionZone) compPts += 2;
    const fumigation = complianceConfigs.some((c) => c.configType === "FUMIGATION");
    if (fumigation) compPts += 2;
    const bioWaste = complianceConfigs.some((c) => c.configType === "BIOMEDICAL_WASTE");
    if (bioWaste) compPts += 2;
    const fireSafety = complianceConfigs.some((c) => c.configType === "FIRE_SAFETY");
    if (fireSafety) compPts += 2;
    const ssi = complianceConfigs.some((c) => c.configType === "SSI_SURVEILLANCE");
    if (ssi) compPts += 2;
    breakdown.push({
      category: "Compliance",
      points: Math.min(15, compPts),
      maxPoints: 15,
      detail: `WHO checklist: ${hasWho ? "Yes" : "No"}, ${complianceConfigs.length} compliance config(s)`,
    });

    // 9. Validation / Go-Live (10 pts)
    const validationScore = suite.lastValidationScore ?? 0;
    const valPts = Math.round((validationScore / 100) * 10);
    breakdown.push({
      category: "Validation",
      points: Math.min(10, valPts),
      maxPoints: 10,
      detail: `Last validation score: ${validationScore}%`,
    });

    // 10. Staff Readiness (5 pts)
    const staffReadPts = minStaffingRules.length > 0 ? 5 : 0;
    breakdown.push({
      category: "Staff Readiness",
      points: staffReadPts,
      maxPoints: 5,
      detail: `${minStaffingRules.length} min staffing rule(s) defined`,
    });

    const score = breakdown.reduce((s, b) => s + b.points, 0);
    const maxScore = breakdown.reduce((s, b) => s + b.maxPoints, 0);

    return {
      score,
      maxScore,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      breakdown,
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. Analyze Gaps
  // ══════════════════════════════════════════════════════════════════════

  async analyzeGaps(
    principal: Principal,
    branchId: string,
    suiteId: string,
  ): Promise<{
    gaps: { category: string; title: string; detail: string; severity: "high" | "medium" | "low"; fixRoute?: string }[];
    stats: { totalSpaces: number; totalTheatres: number; totalEquipment: number; totalStaff: number; validationScore: number };
  }> {
    const suite = await this.assertSuiteAccess(principal, suiteId);

    const [
      spaces,
      theatres,
      equipment,
      staffAssignments,
      surgeonPrivileges,
      anesthetistPrivileges,
      schedulingRules,
      complianceConfigs,
      checklistTemplates,
      storeLinks,
      chargeComponents,
      cancellationPolicy,
      recoveryProtocols,
    ] = await Promise.all([
      this.prisma.otSpace.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otTheatre.findMany({ where: { space: { suiteId, isActive: true } }, include: { space: true } }),
      this.prisma.otEquipment.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otStaffAssignment.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otSurgeonPrivilege.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otAnesthetistPrivilege.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otSchedulingRule.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otComplianceConfig.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otChecklistTemplate.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otStoreLink.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otChargeComponent.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otCancellationPolicy.findUnique({ where: { suiteId } }),
      this.prisma.otRecoveryProtocol.findMany({ where: { suiteId, isActive: true } }),
    ]);

    const gaps: { category: string; title: string; detail: string; severity: "high" | "medium" | "low"; fixRoute?: string }[] = [];

    // Theatres without engineering specs
    const noEngineering = theatres.filter((t) => t.area == null && !t.gasO2 && !t.gasN2O);
    if (noEngineering.length > 0) {
      gaps.push({
        category: "Theatres",
        title: `${noEngineering.length} theatre(s) without engineering specs`,
        detail: noEngineering.map((t) => t.space.name).join(", "),
        severity: "medium",
        fixRoute: `/infrastructure/ot/${suiteId}/theatres`,
      });
    }

    // Theatres without specialties
    const noSpecialties = theatres.filter((t) => !(t.specialtyCodes as string[])?.length);
    if (noSpecialties.length > 0) {
      gaps.push({
        category: "Theatres",
        title: `${noSpecialties.length} theatre(s) without specialties assigned`,
        detail: noSpecialties.map((t) => t.space.name).join(", "),
        severity: "medium",
        fixRoute: `/infrastructure/ot/${suiteId}/theatres`,
      });
    }

    // Missing mandatory equipment
    if (theatres.length > 0) {
      const equipNames = equipment.map((e) => e.name.toLowerCase());
      const missingMandatory = BASE_MANDATORY_EQUIPMENT.filter(
        (m) => !equipNames.some((e) => e.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(e)),
      );
      if (missingMandatory.length > 0) {
        gaps.push({
          category: "Equipment",
          title: `${missingMandatory.length} mandatory equipment item(s) missing`,
          detail: missingMandatory.map((m) => m.name).join(", "),
          severity: "high",
          fixRoute: `/infrastructure/ot/${suiteId}/equipment`,
        });
      }
    }

    // No OT In-Charge
    const hasInCharge = staffAssignments.some((s) => (s.role as string) === "OT_IN_CHARGE");
    if (!hasInCharge) {
      gaps.push({
        category: "Staff",
        title: "No OT In-Charge assigned",
        detail: "An OT In-Charge must be assigned for suite management and accountability.",
        severity: "high",
        fixRoute: `/infrastructure/ot/${suiteId}/staff`,
      });
    }

    // No operating hours
    if (schedulingRules.length === 0) {
      gaps.push({
        category: "Scheduling",
        title: "No operating hours defined",
        detail: "Operating hours must be configured for each weekday to enable OT scheduling.",
        severity: "high",
        fixRoute: `/infrastructure/ot/${suiteId}/scheduling`,
      });
    }

    // No WHO checklist
    const hasWhoChecklist = checklistTemplates.some(
      (c) => c.phase === "SIGN_IN" || c.phase === "TIME_OUT" || c.phase === "SIGN_OUT",
    );
    if (!hasWhoChecklist) {
      gaps.push({
        category: "Compliance",
        title: "No WHO Surgical Safety Checklist configured",
        detail: "WHO checklist (Sign-In, Time-Out, Sign-Out) is mandatory for NABH compliance.",
        severity: "high",
        fixRoute: `/infrastructure/ot/${suiteId}/compliance`,
      });
    }

    // No store linked
    if (storeLinks.length === 0) {
      gaps.push({
        category: "Store",
        title: "No pharmacy store linked",
        detail: "A store link is required for consumable and drug management during surgery.",
        severity: "high",
        fixRoute: `/infrastructure/ot/${suiteId}/store`,
      });
    }

    // Billing charge components missing
    const requiredChargeTypes = ["THEATRE_CHARGE", "ANESTHESIA_CHARGE", "SURGEON_FEE", "MATERIAL_CHARGE"];
    const configuredTypes = chargeComponents.map((c) => c.componentType as string);
    const missingCharges = requiredChargeTypes.filter((t) => !configuredTypes.includes(t));
    if (missingCharges.length > 0) {
      gaps.push({
        category: "Billing",
        title: `${missingCharges.length} billing charge component(s) missing`,
        detail: `Missing: ${missingCharges.join(", ")}`,
        severity: "medium",
        fixRoute: `/infrastructure/ot/${suiteId}/billing`,
      });
    }

    // No cancellation policy
    if (!cancellationPolicy) {
      gaps.push({
        category: "Scheduling",
        title: "No cancellation policy configured",
        detail: "A cancellation policy helps manage surgery rescheduling and slot utilization.",
        severity: "low",
        fixRoute: `/infrastructure/ot/${suiteId}/scheduling`,
      });
    }

    // Recovery protocol gaps
    const surgeryCategories = ["MINOR", "MAJOR", "COMPLEX"];
    const coveredCategories = recoveryProtocols.map((r) => r.surgeryCategory as string);
    const missingRecovery = surgeryCategories.filter((c) => !coveredCategories.includes(c));
    if (missingRecovery.length > 0) {
      gaps.push({
        category: "Recovery",
        title: `Recovery protocols missing for ${missingRecovery.length} surgery category(ies)`,
        detail: `Missing: ${missingRecovery.join(", ")}`,
        severity: "medium",
        fixRoute: `/infrastructure/ot/${suiteId}/scheduling`,
      });
    }

    return {
      gaps,
      stats: {
        totalSpaces: spaces.length,
        totalTheatres: theatres.length,
        totalEquipment: equipment.length,
        totalStaff: staffAssignments.length,
        validationScore: suite.lastValidationScore ?? 0,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. Suggest Equipment
  // ══════════════════════════════════════════════════════════════════════

  async suggestEquipment(
    principal: Principal,
    branchId: string,
    suiteId: string,
  ): Promise<{
    suggestions: {
      theatreName: string;
      theatreType: string | null;
      mandatory: { name: string; category: string; present: boolean }[];
      recommended: { name: string; category: string; reason: string }[];
    }[];
  }> {
    await this.assertSuiteAccess(principal, suiteId);

    const theatres = await this.prisma.otTheatre.findMany({
      where: { space: { suiteId, isActive: true } },
      include: { space: true },
    });

    const equipment = await this.prisma.otEquipment.findMany({ where: { suiteId, isActive: true } });
    const equipNames = equipment.map((e) => e.name.toLowerCase());

    const suggestions = theatres.map((theatre) => {
      const theatreType = theatre.theatreType as string | null;
      const theatreName = theatre.space.name;

      // Mandatory equipment check
      const mandatory = BASE_MANDATORY_EQUIPMENT.map((m) => ({
        name: m.name,
        category: m.category,
        present: equipNames.some(
          (e) => e.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(e),
        ),
      }));

      // Recommended equipment based on theatre type
      const recommended: { name: string; category: string; reason: string }[] = [];
      if (theatreType && THEATRE_TYPE_EQUIPMENT[theatreType]) {
        for (const rec of THEATRE_TYPE_EQUIPMENT[theatreType]) {
          const alreadyPresent = equipNames.some(
            (e) => e.includes(rec.name.toLowerCase()) || rec.name.toLowerCase().includes(e),
          );
          if (!alreadyPresent) {
            recommended.push({ name: rec.name, category: rec.category, reason: rec.reason });
          }
        }
      }

      return { theatreName, theatreType, mandatory, recommended };
    });

    return { suggestions };
  }

  // ══════════════════════════════════════════════════════════════════════
  // 4. Suggest Staffing
  // ══════════════════════════════════════════════════════════════════════

  async suggestStaffing(
    principal: Principal,
    branchId: string,
    suiteId: string,
  ): Promise<{
    recommendations: { role: string; currentCount: number; recommendedMin: number; gap: number; detail: string }[];
    totalGap: number;
  }> {
    await this.assertSuiteAccess(principal, suiteId);

    const [theatres, staffAssignments, surgeonPrivileges, anesthetistPrivileges, surgeryDefaults] = await Promise.all([
      this.prisma.otTheatre.findMany({ where: { space: { suiteId, isActive: true } } }),
      this.prisma.otStaffAssignment.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otSurgeonPrivilege.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otAnesthetistPrivilege.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otSurgeryTypeDefault.findMany({ where: { suiteId, isActive: true } }),
    ]);

    const activeTheatreCount = theatres.length;
    const hasComplex = surgeryDefaults.some((d) => (d.category as string) === "COMPLEX");

    // Base staffing: per active theatre
    const staffingSpec: { role: string; perTheatre: number; complexExtra: number }[] = [
      { role: "Surgeon", perTheatre: 1, complexExtra: 1 },
      { role: "Anesthetist", perTheatre: 1, complexExtra: 0 },
      { role: "Scrub Nurse", perTheatre: 2, complexExtra: 1 },
      { role: "Circulating Nurse", perTheatre: 1, complexExtra: 1 },
      { role: "Anesthesia Technician", perTheatre: 1, complexExtra: 0 },
    ];

    // Count current staff by role
    const roleCounts: Record<string, number> = {};
    for (const a of staffAssignments) {
      const role = a.role as string;
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }

    // Add surgeon and anesthetist privileges as separate counts
    const surgeonCount = new Set(surgeonPrivileges.map((p) => p.staffId)).size;
    const anesthetistCount = new Set(anesthetistPrivileges.map((p) => p.staffId)).size;

    const recommendations = staffingSpec.map((spec) => {
      let currentCount: number;
      if (spec.role === "Surgeon") {
        currentCount = surgeonCount;
      } else if (spec.role === "Anesthetist") {
        currentCount = anesthetistCount;
      } else {
        // Map spec role to assignment roles
        const roleKey = spec.role.toUpperCase().replace(/ /g, "_");
        currentCount = roleCounts[roleKey] || 0;
      }

      const base = spec.perTheatre * activeTheatreCount;
      const extra = hasComplex ? spec.complexExtra : 0;
      const recommendedMin = base + extra;
      const gap = Math.max(0, recommendedMin - currentCount);

      return {
        role: spec.role,
        currentCount,
        recommendedMin,
        gap,
        detail: gap > 0
          ? `Need ${gap} more ${spec.role.toLowerCase()}(s) for ${activeTheatreCount} theatre(s)${hasComplex ? " (includes complex surgery buffer)" : ""}`
          : `Adequate staffing for ${activeTheatreCount} theatre(s)`,
      };
    });

    const totalGap = recommendations.reduce((sum, r) => sum + r.gap, 0);

    return { recommendations, totalGap };
  }

  // ══════════════════════════════════════════════════════════════════════
  // 5. Suggest Scheduling
  // ══════════════════════════════════════════════════════════════════════

  async suggestScheduling(
    principal: Principal,
    branchId: string,
    suiteId: string,
  ): Promise<{
    suggestions: { category: string; title: string; detail: string; severity: "high" | "medium" | "low" }[];
  }> {
    await this.assertSuiteAccess(principal, suiteId);

    const [schedulingRules, emergencyPolicy, theatres, surgeryDefaults] = await Promise.all([
      this.prisma.otSchedulingRule.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otEmergencyPolicy.findUnique({ where: { suiteId } }),
      this.prisma.otTheatre.findMany({ where: { space: { suiteId, isActive: true } } }),
      this.prisma.otSurgeryTypeDefault.findMany({ where: { suiteId, isActive: true } }),
    ]);

    const suggestions: { category: string; title: string; detail: string; severity: "high" | "medium" | "low" }[] = [];

    // Check if all weekdays have operating hours
    const coveredDays = new Set(schedulingRules.map((r) => r.dayOfWeek));
    const missingDays = ALL_WEEKDAYS.filter((d) => !coveredDays.has(d));
    if (missingDays.length > 0 && schedulingRules.length > 0) {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      suggestions.push({
        category: "Coverage",
        title: "Operating hours not configured for all weekdays",
        detail: `Missing: ${missingDays.map((d) => dayNames[d]).join(", ")}. Consider adding hours or explicitly marking days as closed.`,
        severity: "medium",
      });
    } else if (schedulingRules.length === 0) {
      suggestions.push({
        category: "Coverage",
        title: "No operating hours configured",
        detail: "Define operating hours for each day of the week to enable OT scheduling.",
        severity: "high",
      });
    }

    // Check emergency coverage
    if (!emergencyPolicy) {
      suggestions.push({
        category: "Emergency",
        title: "No emergency policy configured",
        detail: "Configure an emergency policy with 24x7 availability or a dedicated emergency theatre.",
        severity: "high",
      });
    } else {
      const hasEmergencyTheatre = emergencyPolicy.hasDedicatedEmergencyOt;
      const is24x7 = emergencyPolicy.availability === "24x7";
      if (!hasEmergencyTheatre && !is24x7) {
        suggestions.push({
          category: "Emergency",
          title: "Limited emergency OT coverage",
          detail: "Consider designating a dedicated emergency theatre or enabling 24x7 availability for emergency cases.",
          severity: "medium",
        });
      }
    }

    // Suggest optimal slot durations if surgery defaults exist
    if (surgeryDefaults.length === 0) {
      suggestions.push({
        category: "Slot Duration",
        title: "No surgery type defaults configured",
        detail: "Define default durations for MINOR, MAJOR, and COMPLEX surgery categories to optimize scheduling.",
        severity: "medium",
      });
    }

    // Check turnaround times on theatres
    for (const theatre of theatres) {
      if (theatre.turnaroundTimeMin != null) {
        if (theatre.turnaroundTimeMin < 15) {
          suggestions.push({
            category: "Turnaround",
            title: `Short turnaround time on theatre`,
            detail: `Theatre has ${theatre.turnaroundTimeMin} min turnaround. Recommended minimum is 15 minutes for proper cleaning and preparation.`,
            severity: "medium",
          });
        }
        if (theatre.turnaroundTimeMin > 60) {
          suggestions.push({
            category: "Turnaround",
            title: `Long turnaround time on theatre`,
            detail: `Theatre has ${theatre.turnaroundTimeMin} min turnaround. Consider if this can be optimised (typical: 15-45 minutes).`,
            severity: "low",
          });
        }
      }
    }

    return { suggestions };
  }

  // ══════════════════════════════════════════════════════════════════════
  // 6. Compliance Checkup
  // ══════════════════════════════════════════════════════════════════════

  async complianceCheckup(
    principal: Principal,
    branchId: string,
    suiteId: string,
  ): Promise<{
    checks: { configType: string; label: string; configured: boolean; detail: string; severity: "high" | "medium" | "low" }[];
    overallStatus: "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT";
  }> {
    await this.assertSuiteAccess(principal, suiteId);

    const [complianceConfigs, checklistTemplates] = await Promise.all([
      this.prisma.otComplianceConfig.findMany({ where: { suiteId, isActive: true } }),
      this.prisma.otChecklistTemplate.findMany({ where: { suiteId, isActive: true } }),
    ]);

    const configsByType = new Map(complianceConfigs.map((c) => [c.configType, c]));

    const checks: { configType: string; label: string; configured: boolean; detail: string; severity: "high" | "medium" | "low" }[] = [];

    for (const ct of COMPLIANCE_CONFIG_TYPES) {
      const config = configsByType.get(ct.configType as any);
      const configured = !!config;

      let detail: string;
      let severity: "high" | "medium" | "low";

      if (configured) {
        const hasAudit = config!.lastAuditAt != null;
        const auditOverdue = config!.nextAuditDue ? new Date(config!.nextAuditDue) < new Date() : false;
        detail = hasAudit
          ? auditOverdue
            ? `Configured. Last audit: ${new Date(config!.lastAuditAt!).toISOString().slice(0, 10)}. AUDIT OVERDUE.`
            : `Configured. Last audit: ${new Date(config!.lastAuditAt!).toISOString().slice(0, 10)}.`
          : "Configured but no audit recorded yet.";
        severity = auditOverdue ? "medium" : "low";
      } else {
        detail = `${ct.label} is not configured. Required for NABH compliance.`;
        severity = ct.configType === "WHO_CHECKLIST" ? "high" : "medium";
      }

      checks.push({ configType: ct.configType, label: ct.label, configured, detail, severity });
    }

    // Also check for WHO checklist templates
    const whoPhases = ["SIGN_IN", "TIME_OUT", "SIGN_OUT"];
    const coveredPhases = whoPhases.filter((p) => checklistTemplates.some((c) => c.phase === p));
    const missingPhases = whoPhases.filter((p) => !coveredPhases.includes(p));

    if (missingPhases.length > 0) {
      checks.push({
        configType: "WHO_CHECKLIST_TEMPLATES",
        label: "WHO Checklist Templates",
        configured: coveredPhases.length > 0,
        detail: missingPhases.length === 3
          ? "No WHO checklist templates created. All 3 phases (Sign-In, Time-Out, Sign-Out) are required."
          : `Missing phases: ${missingPhases.join(", ")}. All 3 phases are required for compliance.`,
        severity: "high",
      });
    } else {
      checks.push({
        configType: "WHO_CHECKLIST_TEMPLATES",
        label: "WHO Checklist Templates",
        configured: true,
        detail: "All 3 WHO checklist phases (Sign-In, Time-Out, Sign-Out) are configured.",
        severity: "low",
      });
    }

    const configuredCount = checks.filter((c) => c.configured).length;
    const totalChecks = checks.length;
    let overallStatus: "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT";
    if (configuredCount === totalChecks) {
      overallStatus = "COMPLIANT";
    } else if (configuredCount > 0) {
      overallStatus = "PARTIAL";
    } else {
      overallStatus = "NON_COMPLIANT";
    }

    return { checks, overallStatus };
  }
}
