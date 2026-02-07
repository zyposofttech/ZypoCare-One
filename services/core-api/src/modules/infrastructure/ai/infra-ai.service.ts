import { Injectable } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import { GoLiveService } from "../golive/golive.service";

// Engines (pure functions — no framework deps)
import { generateSmartDefaults, type HospitalProfile } from "./engines/smart-defaults.engine";
import { recommendTemplate } from "./engines/template-recommender.engine";
import { runNABHChecks } from "./engines/nabh-checker.engine";
import { runConsistencyChecks } from "./engines/consistency-checker.engine";
import { validateGSTIN, validatePAN, runEquipmentCompliance } from "./engines/compliance-validator.engine";
import { runCredentialAlerts } from "./engines/credential-alerter.engine";
import { runPrivilegeGapCheck } from "./engines/privilege-checker.engine";
import { generateFixSuggestions } from "./engines/fix-suggester.engine";
import { computeGoLiveScore } from "./engines/go-live-scorer.engine";
import { runNamingCheck } from "./engines/naming-enforcer.engine";

// Static data
import * as specialtyMap from "./data/specialty-department-map.json";

/**
 * InfraAiService
 *
 * Orchestrator for all 18 infrastructure AI features.
 * Delegates to pure engine functions for testability.
 */
@Injectable()
export class InfraAiService {
  constructor(
    private readonly ctx: InfraContextService,
    private readonly goLiveService: GoLiveService,
  ) {}

  private resolve(principal: Principal, branchId?: string | null): string {
    return this.ctx.resolveBranchId(principal, branchId ?? null);
  }

  // ─── A1: Smart Defaults ─────────────────────────────────────────────

  async getSmartDefaults(profile: HospitalProfile) {
    return generateSmartDefaults(profile);
  }

  // ─── A2: Template Recommender ───────────────────────────────────────

  async getTemplateRecommendation(input: { bedCount: number; specialtyCount?: number; hospitalType?: string }) {
    return recommendTemplate(input);
  }

  // ─── A3: Department Suggestions ─────────────────────────────────────

  async getDepartmentSuggestions(input: { specialties: string[]; hospitalType?: string }) {
    const departments: Array<{
      code: string;
      name: string;
      specialtyCode: string;
      unitTypes: string[];
      diagnosticPacks: string[];
    }> = [];

    const specMap = (specialtyMap as any).specialtyDepartments;

    for (const specCode of input.specialties) {
      const mapping = specMap[specCode];
      if (mapping) {
        departments.push({
          code: specCode,
          name: mapping.department,
          specialtyCode: specCode,
          unitTypes: mapping.unitTypes,
          diagnosticPacks: mapping.diagnosticPacks,
        });
      }
    }

    // Add mandatory support departments
    const support = (specialtyMap as any).supportDepartments
      .filter((sd: any) => sd.code === "PHARMACY" || sd.code === "ADMIN")
      .map((sd: any) => ({
        code: sd.code,
        name: sd.name,
        specialtyCode: null,
        unitTypes: sd.requiredUnitTypes,
        diagnosticPacks: [],
      }));

    return {
      clinical: departments,
      support,
      total: departments.length + support.length,
      unmapped: input.specialties.filter((s) => !specMap[s]),
    };
  }

  // ─── A6: Diagnostic Pack Suggestions ────────────────────────────────

  async getDiagnosticPackSuggestions(input: { specialties: string[] }) {
    const packs = new Set<string>();
    const specMap = (specialtyMap as any).specialtyDepartments;
    const reasoning: string[] = [];

    for (const specCode of input.specialties) {
      const mapping = specMap[specCode];
      if (mapping) {
        for (const dp of mapping.diagnosticPacks) {
          packs.add(dp);
        }
        if (mapping.diagnosticPacks.length > 0) {
          reasoning.push(`${specCode} → ${mapping.diagnosticPacks.join(", ")}`);
        }
      }
    }

    return {
      packs: Array.from(packs),
      count: packs.size,
      reasoning,
    };
  }

  // ─── B8: NABH Readiness ─────────────────────────────────────────────

  async getNABHReadiness(principal: Principal, branchId?: string) {
    const bid = this.resolve(principal, branchId);
    return runNABHChecks(this.ctx.prisma, bid);
  }

  // ─── B9: Consistency Check ──────────────────────────────────────────

  async getConsistencyCheck(principal: Principal, branchId?: string) {
    const bid = this.resolve(principal, branchId);
    return runConsistencyChecks(this.ctx.prisma, bid);
  }

  // ─── B10: Equipment Compliance ──────────────────────────────────────

  async getEquipmentCompliance(principal: Principal, branchId?: string) {
    const bid = this.resolve(principal, branchId);
    return runEquipmentCompliance(this.ctx.prisma, bid);
  }

  // ─── B11: Credential Alerts ─────────────────────────────────────────

  async getCredentialAlerts(principal: Principal, branchId?: string, days?: number) {
    const bid = this.resolve(principal, branchId);
    return runCredentialAlerts(this.ctx.prisma, bid, days ?? 90);
  }

  // ─── B12: Privilege Gaps ────────────────────────────────────────────

  async getPrivilegeGaps(principal: Principal, branchId?: string) {
    const bid = this.resolve(principal, branchId);
    return runPrivilegeGapCheck(this.ctx.prisma, bid);
  }

  // ─── B13: GSTIN Validation ──────────────────────────────────────────

  validateGSTIN(gstin: string) {
    return validateGSTIN(gstin);
  }

  // ─── B13: PAN Validation ────────────────────────────────────────────

  validatePAN(pan: string) {
    return validatePAN(pan);
  }

  // ─── C15: Enhanced Go-Live Score ────────────────────────────────────

  async getGoLiveScore(principal: Principal, branchId?: string) {
    const bid = this.resolve(principal, branchId);

    // Run existing go-live (billing checks)
    const billingResult = await this.goLiveService.runGoLive(principal, { persist: false }, bid);

    // Run AI checks in parallel
    const [nabhResult, consistencyResult, credentialResult] = await Promise.all([
      runNABHChecks(this.ctx.prisma, bid),
      runConsistencyChecks(this.ctx.prisma, bid),
      runCredentialAlerts(this.ctx.prisma, bid, 30),
    ]);

    return computeGoLiveScore(billingResult, nabhResult, consistencyResult, credentialResult);
  }

  // ─── C16: Fix Suggestions ──────────────────────────────────────────

  async getFixSuggestions(principal: Principal, branchId?: string) {
    const bid = this.resolve(principal, branchId);
    return generateFixSuggestions(this.ctx.prisma, bid);
  }

  // ─── C18: Naming Check ─────────────────────────────────────────────

  async getNamingCheck(principal: Principal, branchId?: string) {
    const bid = this.resolve(principal, branchId);
    return runNamingCheck(this.ctx.prisma, bid);
  }
}
