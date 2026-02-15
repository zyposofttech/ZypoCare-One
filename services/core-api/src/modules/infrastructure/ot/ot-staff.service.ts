import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "../../auth/access-policy.service";
import { resolveBranchId } from "../../../common/branch-scope.util";

import {
  CreateAnesthetistPrivilegeDto,
  CreateMinStaffingRuleDto,
  CreateStaffAssignmentDto,
  CreateSurgeonPrivilegeDto,
  CreateZoneAccessRuleDto,
  UpdateStaffAssignmentDto,
} from "./ot-staff.dto";

@Injectable()
export class OtStaffService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  private async assertSuiteAccess(principal: Principal, suiteId: string) {
    const suite = await this.prisma.otSuite.findUnique({ where: { id: suiteId }, select: { branchId: true, isActive: true } });
    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    resolveBranchId(principal, suite.branchId);
    return suite;
  }

  // ---- Staff Assignments (OTS-027) ----

  async listAssignments(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otStaffAssignment.findMany({ where: { suiteId, isActive: true }, orderBy: { role: "asc" } });
  }

  async createAssignment(principal: Principal, suiteId: string, dto: CreateStaffAssignmentDto) {
    await this.assertSuiteAccess(principal, suiteId);
    try {
      return await this.prisma.otStaffAssignment.create({
        data: { suiteId, staffId: dto.staffId, role: dto.role as any, defaultShift: dto.defaultShift ?? null },
      });
    } catch {
      throw new BadRequestException("Duplicate staff assignment for this role.");
    }
  }

  async updateAssignment(principal: Principal, id: string, dto: UpdateStaffAssignmentDto) {
    const rec = await this.prisma.otStaffAssignment.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Staff assignment not found");
    resolveBranchId(principal, rec.suite.branchId);

    return this.prisma.otStaffAssignment.update({
      where: { id },
      data: { role: dto.role as any, defaultShift: dto.defaultShift, isActive: dto.isActive },
    });
  }

  async deleteAssignment(principal: Principal, id: string) {
    const rec = await this.prisma.otStaffAssignment.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Staff assignment not found");
    resolveBranchId(principal, rec.suite.branchId);

    await this.prisma.otStaffAssignment.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  // ---- Surgeon Privileges (OTS-028) ----

  async listSurgeonPrivileges(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otSurgeonPrivilege.findMany({ where: { suiteId, isActive: true }, orderBy: { staffId: "asc" } });
  }

  async createSurgeonPrivilege(principal: Principal, suiteId: string, dto: CreateSurgeonPrivilegeDto) {
    await this.assertSuiteAccess(principal, suiteId);
    try {
      return await this.prisma.otSurgeonPrivilege.create({
        data: {
          suiteId,
          theatreSpaceId: dto.theatreSpaceId ?? null,
          staffId: dto.staffId,
          specialtyCode: dto.specialtyCode,
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        },
      });
    } catch {
      throw new BadRequestException("Duplicate surgeon privilege for this theatre/staff combination.");
    }
  }

  async deleteSurgeonPrivilege(principal: Principal, id: string) {
    const rec = await this.prisma.otSurgeonPrivilege.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Surgeon privilege not found");
    resolveBranchId(principal, rec.suite.branchId);

    await this.prisma.otSurgeonPrivilege.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  // ---- Anesthetist Privileges (OTS-029) ----

  async listAnesthetistPrivileges(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otAnesthetistPrivilege.findMany({ where: { suiteId, isActive: true }, orderBy: { staffId: "asc" } });
  }

  async createAnesthetistPrivilege(principal: Principal, suiteId: string, dto: CreateAnesthetistPrivilegeDto) {
    await this.assertSuiteAccess(principal, suiteId);
    try {
      return await this.prisma.otAnesthetistPrivilege.create({
        data: {
          suiteId,
          theatreSpaceId: dto.theatreSpaceId ?? null,
          staffId: dto.staffId,
          concurrentCaseLimit: dto.concurrentCaseLimit ?? 1,
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        },
      });
    } catch {
      throw new BadRequestException("Duplicate anesthetist privilege for this theatre/staff combination.");
    }
  }

  async deleteAnesthetistPrivilege(principal: Principal, id: string) {
    const rec = await this.prisma.otAnesthetistPrivilege.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!rec) throw new NotFoundException("Anesthetist privilege not found");
    resolveBranchId(principal, rec.suite.branchId);

    await this.prisma.otAnesthetistPrivilege.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  // ---- Zone Access Rules (OTS-030) ----

  async listZoneAccess(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otZoneAccessRule.findMany({ where: { suiteId, isActive: true }, orderBy: { zone: "asc" } });
  }

  async upsertZoneAccess(principal: Principal, suiteId: string, dto: CreateZoneAccessRuleDto) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otZoneAccessRule.upsert({
      where: { spaceId: dto.spaceId },
      create: { suiteId, spaceId: dto.spaceId, zone: dto.zone as any, allowedRoles: dto.allowedRoles },
      update: { zone: dto.zone as any, allowedRoles: dto.allowedRoles },
    });
  }

  // ---- Min Staffing Rules (OTS-031) ----

  async listMinStaffingRules(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);
    return this.prisma.otMinStaffingRule.findMany({ where: { suiteId, isActive: true }, orderBy: { surgeryCategory: "asc" } });
  }

  async upsertMinStaffingRule(principal: Principal, suiteId: string, dto: CreateMinStaffingRuleDto) {
    await this.assertSuiteAccess(principal, suiteId);
    const theatreSpaceId = dto.theatreSpaceId ?? null;
    return this.prisma.otMinStaffingRule.upsert({
      where: { suiteId_theatreSpaceId_surgeryCategory: { suiteId, theatreSpaceId: theatreSpaceId as string, surgeryCategory: dto.surgeryCategory as any } },
      create: {
        suiteId,
        theatreSpaceId,
        surgeryCategory: dto.surgeryCategory as any,
        minSurgeons: dto.minSurgeons ?? 1,
        minAnesthetists: dto.minAnesthetists ?? 1,
        minScrubNurses: dto.minScrubNurses ?? 1,
        minCirculatingNurses: dto.minCirculatingNurses ?? 1,
        minOtTechnicians: dto.minOtTechnicians ?? 0,
        minAnesthesiaTechnicians: dto.minAnesthesiaTechnicians ?? 0,
      },
      update: {
        minSurgeons: dto.minSurgeons,
        minAnesthetists: dto.minAnesthetists,
        minScrubNurses: dto.minScrubNurses,
        minCirculatingNurses: dto.minCirculatingNurses,
        minOtTechnicians: dto.minOtTechnicians,
        minAnesthesiaTechnicians: dto.minAnesthesiaTechnicians,
      },
    });
  }

  // ---- Privilege Gaps (OTS-032) ----

  async getPrivilegeGaps(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);

    const theatres = await this.prisma.otSpace.findMany({
      where: { suiteId, type: "THEATRE" as any, isActive: true },
      include: { theatre: { select: { specialtyCodes: true } } },
    });

    const surgeonPrivileges = await this.prisma.otSurgeonPrivilege.findMany({ where: { suiteId, isActive: true } });
    const anesthetistPrivileges = await this.prisma.otAnesthetistPrivilege.findMany({ where: { suiteId, isActive: true } });

    const gaps: any[] = [];
    for (const space of theatres) {
      const hasSurgeon = surgeonPrivileges.some((p) => !p.theatreSpaceId || p.theatreSpaceId === space.id);
      const hasAnesthetist = anesthetistPrivileges.some((p) => !p.theatreSpaceId || p.theatreSpaceId === space.id);

      if (!hasSurgeon) gaps.push({ spaceId: space.id, spaceName: space.name, type: "NO_SURGEON" });
      if (!hasAnesthetist) gaps.push({ spaceId: space.id, spaceName: space.name, type: "NO_ANESTHETIST" });
    }

    return { gaps, hasGaps: gaps.length > 0 };
  }

  // ---- Contact Directory (OTS-033) ----

  async getContactDirectory(principal: Principal, suiteId: string) {
    await this.assertSuiteAccess(principal, suiteId);

    const assignments = await this.prisma.otStaffAssignment.findMany({ where: { suiteId, isActive: true } });
    const surgeonPrivileges = await this.prisma.otSurgeonPrivilege.findMany({ where: { suiteId, isActive: true } });
    const anesthetistPrivileges = await this.prisma.otAnesthetistPrivilege.findMany({ where: { suiteId, isActive: true } });

    return {
      staffAssignments: assignments,
      surgeons: surgeonPrivileges,
      anesthetists: anesthetistPrivileges,
    };
  }
}
