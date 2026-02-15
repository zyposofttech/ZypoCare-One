import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "../../auth/access-policy.service";
import { resolveBranchId } from "../../../common/branch-scope.util";

import {
  CreateChargeComponentDto,
  CreateServiceLinkDto,
  UpdateChargeComponentDto,
} from "./ot-billing.dto";

@Injectable()
export class OtBillingService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  private async assertSuiteAccess(principal: Principal, suiteId: string) {
    const suite = await this.prisma.otSuite.findUnique({ where: { id: suiteId }, select: { branchId: true, isActive: true } });
    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    resolveBranchId(principal, suite.branchId);
    return suite;
  }

  // ---- Service Links (OTS-047) ----

  async listServiceLinks(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otServiceLink.findMany({ where: { suiteId, isActive: true }, orderBy: { specialtyCode: "asc" } });
  }

  async createServiceLink(principal: Principal, suiteId: string, dto: CreateServiceLinkDto) {
    await this.assertSuiteAccess(principal, suiteId);
    try {
      return await this.prisma.otServiceLink.create({
        data: {
          suiteId,
          serviceItemId: dto.serviceItemId,
          specialtyCode: dto.specialtyCode,
          surgeryCategory: dto.surgeryCategory as any,
          defaultTheatreType: dto.defaultTheatreType as any,
          requiredEquipmentCategories: dto.requiredEquipmentCategories ?? [],
          snomedCode: dto.snomedCode ?? null,
          icd10PcsCode: dto.icd10PcsCode ?? null,
        },
      });
    } catch {
      throw new BadRequestException("Service link already exists for this service item.");
    }
  }

  async deleteServiceLink(principal: Principal, id: string) {
    const rec = await this.prisma.otServiceLink.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Service link not found");
    resolveBranchId(principal, rec.suite.branchId);

    await this.prisma.otServiceLink.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  // ---- Charge Components (OTS-048) ----

  async listChargeComponents(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otChargeComponent.findMany({ where: { suiteId, isActive: true }, orderBy: { componentType: "asc" } });
  }

  async upsertChargeComponent(principal: Principal, suiteId: string, dto: CreateChargeComponentDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otChargeComponent.upsert({
      where: { suiteId_componentType: { suiteId, componentType: dto.componentType as any } },
      create: {
        suiteId,
        componentType: dto.componentType as any,
        chargeModel: dto.chargeModel as any,
        serviceItemId: dto.serviceItemId ?? null,
        glCode: dto.glCode ?? null,
        gstApplicable: dto.gstApplicable ?? false,
        defaultRate: dto.defaultRate ?? null,
      },
      update: {
        chargeModel: dto.chargeModel as any,
        serviceItemId: dto.serviceItemId,
        glCode: dto.glCode,
        gstApplicable: dto.gstApplicable,
        defaultRate: dto.defaultRate,
      },
    });
  }

  async updateChargeComponent(principal: Principal, id: string, dto: UpdateChargeComponentDto) {
    const rec = await this.prisma.otChargeComponent.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Charge component not found");
    resolveBranchId(principal, rec.suite.branchId);

    return this.prisma.otChargeComponent.update({
      where: { id },
      data: {
        chargeModel: dto.chargeModel as any,
        serviceItemId: dto.serviceItemId,
        glCode: dto.glCode,
        gstApplicable: dto.gstApplicable,
        defaultRate: dto.defaultRate,
        isActive: dto.isActive,
      },
    });
  }

  // ---- Billing Completeness (OTS-051) ----

  async getBillingCompleteness(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);

    const components = await this.prisma.otChargeComponent.findMany({ where: { suiteId, isActive: true } });
    const serviceLinks = await this.prisma.otServiceLink.findMany({ where: { suiteId, isActive: true } });

    const requiredTypes = ["THEATRE_CHARGE", "ANESTHESIA_CHARGE", "SURGEON_FEE", "MATERIAL_CHARGE"];
    const configuredTypes = components.map((c) => c.componentType);
    const missingTypes = requiredTypes.filter((t) => !configuredTypes.includes(t as any));

    return {
      totalComponents: components.length,
      totalServiceLinks: serviceLinks.length,
      requiredComponentTypes: requiredTypes,
      configuredComponentTypes: configuredTypes,
      missingComponentTypes: missingTypes,
      isComplete: missingTypes.length === 0 && serviceLinks.length > 0,
    };
  }
}
