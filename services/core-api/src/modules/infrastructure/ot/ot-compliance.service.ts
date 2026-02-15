import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "../../auth/access-policy.service";
import { resolveBranchId } from "../../../common/branch-scope.util";

import {
  CreateChecklistTemplateDto,
  CreateComplianceConfigDto,
  UpdateChecklistTemplateDto,
  UpdateComplianceConfigDto,
} from "./ot-compliance.dto";

@Injectable()
export class OtComplianceService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  private async assertSuiteAccess(principal: Principal, suiteId: string) {
    const suite = await this.prisma.otSuite.findUnique({ where: { id: suiteId }, select: { branchId: true, isActive: true } });
    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    resolveBranchId(principal, suite.branchId);
    return suite;
  }

  // ---- Checklist Templates (OTS-040, OTS-045, OTS-052) ----

  async listChecklistTemplates(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otChecklistTemplate.findMany({ where: { suiteId, isActive: true }, orderBy: [{ phase: "asc" }, { name: "asc" }] });
  }

  async createChecklistTemplate(principal: Principal, suiteId: string, dto: CreateChecklistTemplateDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otChecklistTemplate.create({
      data: {
        suiteId,
        name: dto.name.trim(),
        phase: dto.phase as any,
        templateType: dto.templateType,
        items: dto.items,
        version: dto.version ?? 1,
        isSystem: dto.isSystem ?? false,
      },
    });
  }

  async updateChecklistTemplate(principal: Principal, id: string, dto: UpdateChecklistTemplateDto) {
    const rec = await this.prisma.otChecklistTemplate.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Checklist template not found");
    resolveBranchId(principal, rec.suite.branchId);

    return this.prisma.otChecklistTemplate.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        phase: dto.phase as any,
        templateType: dto.templateType,
        items: dto.items,
        version: dto.version,
        isActive: dto.isActive,
      },
    });
  }

  async deleteChecklistTemplate(principal: Principal, id: string) {
    const rec = await this.prisma.otChecklistTemplate.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Checklist template not found");
    resolveBranchId(principal, rec.suite.branchId);

    await this.prisma.otChecklistTemplate.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  // ---- Compliance Configs (OTS-053 to OTS-058) ----

  async listComplianceConfigs(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otComplianceConfig.findMany({ where: { suiteId, isActive: true }, orderBy: { configType: "asc" } });
  }

  async upsertComplianceConfig(principal: Principal, suiteId: string, dto: CreateComplianceConfigDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otComplianceConfig.upsert({
      where: { suiteId_configType: { suiteId, configType: dto.configType as any } },
      create: {
        suiteId,
        configType: dto.configType as any,
        config: dto.config,
        lastAuditAt: dto.lastAuditAt ? new Date(dto.lastAuditAt) : null,
        nextAuditDue: dto.nextAuditDue ? new Date(dto.nextAuditDue) : null,
      },
      update: {
        config: dto.config,
        lastAuditAt: dto.lastAuditAt ? new Date(dto.lastAuditAt) : undefined,
        nextAuditDue: dto.nextAuditDue ? new Date(dto.nextAuditDue) : undefined,
      },
    });
  }

  async updateComplianceConfig(principal: Principal, id: string, dto: UpdateComplianceConfigDto) {
    const rec = await this.prisma.otComplianceConfig.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Compliance config not found");
    resolveBranchId(principal, rec.suite.branchId);

    return this.prisma.otComplianceConfig.update({
      where: { id },
      data: {
        config: dto.config,
        lastAuditAt: dto.lastAuditAt ? new Date(dto.lastAuditAt) : undefined,
        nextAuditDue: dto.nextAuditDue ? new Date(dto.nextAuditDue) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  // ---- NABH Validation (OTS-057) ----

  async getNabhValidation(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);

    const configs = await this.prisma.otComplianceConfig.findMany({ where: { suiteId, isActive: true } });
    const checklists = await this.prisma.otChecklistTemplate.findMany({ where: { suiteId, isActive: true } });

    const checks = [
      { key: "WHO_CHECKLIST", label: "WHO Surgical Safety Checklist configured", ok: configs.some((c) => c.configType === "WHO_CHECKLIST") },
      { key: "INFECTION_ZONE", label: "Infection control zones defined", ok: configs.some((c) => c.configType === "INFECTION_ZONE") },
      { key: "FUMIGATION", label: "Fumigation schedule configured", ok: configs.some((c) => c.configType === "FUMIGATION") },
      { key: "BIOMEDICAL_WASTE", label: "Biomedical waste management configured", ok: configs.some((c) => c.configType === "BIOMEDICAL_WASTE") },
      { key: "FIRE_SAFETY", label: "Fire safety protocols configured", ok: configs.some((c) => c.configType === "FIRE_SAFETY") },
      { key: "SSI_SURVEILLANCE", label: "SSI surveillance configured", ok: configs.some((c) => c.configType === "SSI_SURVEILLANCE") },
      { key: "SIGN_IN_CHECKLIST", label: "Sign-In checklist template exists", ok: checklists.some((c) => c.phase === "SIGN_IN") },
      { key: "TIME_OUT_CHECKLIST", label: "Time-Out checklist template exists", ok: checklists.some((c) => c.phase === "TIME_OUT") },
      { key: "SIGN_OUT_CHECKLIST", label: "Sign-Out checklist template exists", ok: checklists.some((c) => c.phase === "SIGN_OUT") },
    ];

    const passed = checks.filter((c) => c.ok).length;
    return { checks, passed, total: checks.length, isCompliant: passed === checks.length };
  }
}
