import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "../../auth/access-policy.service";
import { resolveBranchId } from "../../../common/branch-scope.util";

import {
  CreateConsumableTemplateDto,
  CreateImplantTrackingRuleDto,
  CreateParLevelDto,
  CreateStoreLinkDto,
  UpdateConsumableTemplateDto,
  UpdateParLevelDto,
} from "./ot-store.dto";

@Injectable()
export class OtStoreService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  private async assertSuiteAccess(principal: Principal, suiteId: string) {
    const suite = await this.prisma.otSuite.findUnique({ where: { id: suiteId }, select: { branchId: true, isActive: true } });
    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    resolveBranchId(principal, suite.branchId);
    return suite;
  }

  // ---- Store Links (OTS-034, OTS-038) ----

  async listStoreLinks(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otStoreLink.findMany({ where: { suiteId, isActive: true } });
  }

  async createStoreLink(principal: Principal, suiteId: string, dto: CreateStoreLinkDto) {
    await this.assertSuiteAccess(principal, suiteId);
    try {
      return await this.prisma.otStoreLink.create({
        data: { suiteId, pharmacyStoreId: dto.pharmacyStoreId, linkType: dto.linkType },
      });
    } catch {
      throw new BadRequestException("Store link of this type already exists for this suite.");
    }
  }

  async deleteStoreLink(principal: Principal, id: string) {
    const rec = await this.prisma.otStoreLink.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Store link not found");
    resolveBranchId(principal, rec.suite.branchId);

    await this.prisma.otStoreLink.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  // ---- Consumable Templates (OTS-035) ----

  async listConsumableTemplates(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otConsumableTemplate.findMany({ where: { suiteId, isActive: true }, orderBy: { name: "asc" } });
  }

  async createConsumableTemplate(principal: Principal, suiteId: string, dto: CreateConsumableTemplateDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otConsumableTemplate.create({
      data: {
        suiteId,
        name: dto.name.trim(),
        surgeryCategory: dto.surgeryCategory as any,
        specialtyCode: dto.specialtyCode ?? null,
        items: dto.items,
      },
    });
  }

  async updateConsumableTemplate(principal: Principal, id: string, dto: UpdateConsumableTemplateDto) {
    const rec = await this.prisma.otConsumableTemplate.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Consumable template not found");
    resolveBranchId(principal, rec.suite.branchId);

    return this.prisma.otConsumableTemplate.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        surgeryCategory: dto.surgeryCategory as any,
        specialtyCode: dto.specialtyCode,
        items: dto.items,
        isActive: dto.isActive,
      },
    });
  }

  async deleteConsumableTemplate(principal: Principal, id: string) {
    const rec = await this.prisma.otConsumableTemplate.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Consumable template not found");
    resolveBranchId(principal, rec.suite.branchId);

    await this.prisma.otConsumableTemplate.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  // ---- Implant Tracking Rules (OTS-036) ----

  async listImplantRules(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otImplantTrackingRule.findMany({ where: { suiteId, isActive: true }, orderBy: { category: "asc" } });
  }

  async upsertImplantRule(principal: Principal, suiteId: string, dto: CreateImplantTrackingRuleDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otImplantTrackingRule.upsert({
      where: { suiteId_category: { suiteId, category: dto.category as any } },
      create: {
        suiteId,
        category: dto.category as any,
        mandatoryBarcodeScan: dto.mandatoryBarcodeScan ?? true,
        mandatoryBatchSerial: dto.mandatoryBatchSerial ?? true,
        mandatoryManufacturer: dto.mandatoryManufacturer ?? true,
        mandatoryPatientConsent: dto.mandatoryPatientConsent ?? true,
      },
      update: {
        mandatoryBarcodeScan: dto.mandatoryBarcodeScan,
        mandatoryBatchSerial: dto.mandatoryBatchSerial,
        mandatoryManufacturer: dto.mandatoryManufacturer,
        mandatoryPatientConsent: dto.mandatoryPatientConsent,
      },
    });
  }

  // ---- Par Levels (OTS-037) ----

  async listParLevels(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otParLevel.findMany({ where: { suiteId, isActive: true }, orderBy: { itemName: "asc" } });
  }

  async createParLevel(principal: Principal, suiteId: string, dto: CreateParLevelDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otParLevel.create({
      data: {
        suiteId,
        itemName: dto.itemName.trim(),
        drugMasterId: dto.drugMasterId ?? null,
        minStock: dto.minStock,
        reorderLevel: dto.reorderLevel,
        reorderQty: dto.reorderQty,
        maxStock: dto.maxStock,
        isNeverOutOfStock: dto.isNeverOutOfStock ?? false,
      },
    });
  }

  async updateParLevel(principal: Principal, id: string, dto: UpdateParLevelDto) {
    const rec = await this.prisma.otParLevel.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Par level not found");
    resolveBranchId(principal, rec.suite.branchId);

    return this.prisma.otParLevel.update({
      where: { id },
      data: {
        itemName: dto.itemName?.trim(),
        drugMasterId: dto.drugMasterId,
        minStock: dto.minStock,
        reorderLevel: dto.reorderLevel,
        reorderQty: dto.reorderQty,
        maxStock: dto.maxStock,
        isNeverOutOfStock: dto.isNeverOutOfStock,
        isActive: dto.isActive,
      },
    });
  }
}
