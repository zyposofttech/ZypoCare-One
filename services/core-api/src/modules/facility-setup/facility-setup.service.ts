import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import { AuditService } from "../audit/audit.service";
import type { Principal } from "../auth/access-policy.service";
import type { CreateFacilityDto, CreateSpecialtyDto, UpdateSpecialtyDto, SetDepartmentSpecialtiesDto } from "./facility-setup.dto";

function uniq(ids: string[]) {
  return Array.from(new Set((ids || []).map((x) => String(x)).filter(Boolean)));
}

@Injectable()
export class FacilitySetupService {
  constructor(
    @Inject("PRISMA") private prisma: PrismaClient,
    private audit: AuditService,
  ) { }

  private resolveBranchId(principal: Principal, requestedBranchId?: string | null) {
    if (principal.roleScope === "BRANCH") {
      if (!principal.branchId) throw new ForbiddenException("Branch-scoped principal missing branchId");
      if (requestedBranchId && requestedBranchId !== principal.branchId) throw new ForbiddenException("Cannot access another branch");
      return principal.branchId;
    }

    // GLOBAL scope
    if (!requestedBranchId) throw new BadRequestException("branchId is required for global operations");
    return requestedBranchId;
  }

  // ---------------------------------------------------------------------------
  // Facility catalog (master)
  // ---------------------------------------------------------------------------

  async listFacilityCatalog(_principal: Principal, q?: { category?: string; includeInactive?: boolean }) {
    const where: any = {};
    if (q?.category) where.category = q.category;
    if (!q?.includeInactive) where.isActive = true;

    return this.prisma.facilityCatalog.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, category: true, isActive: true, sortOrder: true },
    });
  }

  async createFacility(principal: Principal, dto: CreateFacilityDto) {
    if (principal.roleScope !== "GLOBAL") throw new ForbiddenException("Only Super Admin can create facilities.");

    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    if (!code || !name) throw new BadRequestException("Code and name are required.");

    const existing = await this.prisma.facilityCatalog.findUnique({ where: { code } });
    if (existing) throw new BadRequestException(`Facility code '${code}' already exists.`);

    const created = await this.prisma.facilityCatalog.create({
      data: {
        code,
        name,
        category: dto.category as any,
        sortOrder: dto.sortOrder ?? 999,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      branchId: null,
      actorUserId: principal.userId,
      action: "FACILITY_CATALOG_CREATE",
      entity: "FacilityCatalog",
      entityId: created.id,
      meta: dto,
    });

    return created;
  }

  // ---------------------------------------------------------------------------
  // Branch facilities enablement (multi-select)
  // ---------------------------------------------------------------------------

  async getBranchFacilities(principal: Principal, branchIdParam?: string) {
    const branchId = this.resolveBranchId(principal, branchIdParam ?? null);

    const rows = await this.prisma.branchFacility.findMany({
      where: { branchId, isEnabled: true },
      include: { facility: true },
      orderBy: [{ facility: { sortOrder: "asc" } }, { facility: { name: "asc" } }],
    });

    return rows.map((r) => ({
      id: r.id,
      branchId: r.branchId,
      facilityId: r.facilityId,
      enabledAt: r.enabledAt,
      facility: {
        id: r.facility.id,
        code: r.facility.code,
        name: r.facility.name,
        category: r.facility.category,
      },
    }));
  }

  /**
   * Branch scope: setBranchFacilities(principal, facilityIds)
   * Global scope: setBranchFacilities(principal, facilityIds, branchId)
   */
  async setBranchFacilities(principal: Principal, facilityIdsRaw: string[], branchIdParam?: string) {
    const branchId = this.resolveBranchId(principal, branchIdParam ?? null);
    const facilityIds = uniq(facilityIdsRaw);

    const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    if (!branch) throw new NotFoundException("Branch not found");

    // Validate facility IDs only if non-empty
    if (facilityIds.length) {
      const facilities = await this.prisma.facilityCatalog.findMany({
        where: { id: { in: facilityIds }, isActive: true },
        select: { id: true },
      });
      const ok = new Set(facilities.map((f) => f.id));
      const bad = facilityIds.filter((id) => !ok.has(id));
      if (bad.length) throw new BadRequestException(`Unknown/inactive facilityIds: ${bad.join(", ")}`);
    }

    const current = await this.prisma.branchFacility.findMany({
      where: { branchId },
      select: { facilityId: true, isEnabled: true },
    });
    const currentEnabled = new Set(current.filter((x) => x.isEnabled).map((x) => x.facilityId));

    const desired = new Set(facilityIds);
    const toDisable = Array.from(currentEnabled).filter((id) => !desired.has(id));
    const toEnable = facilityIds.filter((id) => !currentEnabled.has(id));

    await this.prisma.$transaction(async (tx) => {
      if (toDisable.length) {
        await tx.branchFacility.updateMany({
          where: { branchId, facilityId: { in: toDisable } },
          data: { isEnabled: false },
        });
      }

      for (const fid of toEnable) {
        await tx.branchFacility.upsert({
          where: { branchId_facilityId: { branchId, facilityId: fid } },
          update: { isEnabled: true, enabledAt: new Date() },
          create: { branchId, facilityId: fid, isEnabled: true, enabledAt: new Date() },
        });
      }
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "BRANCH_FACILITIES_SET",
      entity: "Branch",
      entityId: branchId,
      meta: {
        before: Array.from(currentEnabled),
        after: facilityIds,
        disabled: toDisable,
        enabled: toEnable,
      },
    });

    return this.getBranchFacilities(principal, branchId);
  }

  // ---------------------------------------------------------------------------
  // Readiness (uses only delegates that exist in your Prisma schema)
  // ---------------------------------------------------------------------------

 async getBranchReadiness(principal: Principal, branchIdParam?: string) {
  const branchId = this.resolveBranchId(principal, branchIdParam ?? null);

  // IMPORTANT: Infrastructure single source of truth
  // Legacy Ward/Room/Bed/OT tables are treated as read-only projections.
  // Readiness must derive only from LocationNode/Unit/UnitRoom/UnitResource.

  const [enabledFacilities, departments, specialties, doctors, otRooms, otTables, beds] = await Promise.all([
    this.prisma.branchFacility.count({ where: { branchId, isEnabled: true } }),
    this.prisma.department.count({ where: { branchId, isActive: true } }),
    this.prisma.specialty.count({ where: { branchId, isActive: true } }),

    // Staff has NO "role" field in your schema; heuristic via designation
    this.prisma.staff.count({
      where: {
        branchId,
        isActive: true,
        OR: [
          { designation: { contains: "doctor", mode: "insensitive" } },
          { designation: { contains: "consultant", mode: "insensitive" } },
          { designation: { contains: "surgeon", mode: "insensitive" } },
        ],
      },
    }),

    // OT readiness: either explicit OT rooms under an OT unit, OR OT tables as resources
    this.prisma.unitRoom.count({
      where: {
        branchId,
        isActive: true,
        unit: { isActive: true, unitType: { code: "OT" } },
      },
    }),

    this.prisma.unitResource.count({
      where: {
        branchId,
        isActive: true,
        resourceType: "OT_TABLE" as any,
      },
    }),

    // Beds must be represented as UnitResourceType=BED
    this.prisma.unitResource.count({
      where: {
        branchId,
        isActive: true,
        resourceType: "BED" as any,
      },
    }),
  ]);

  const otSetup = Math.max(otRooms, otTables);
  const summary = { enabledFacilities, departments, specialties, doctors, otRooms: otSetup, beds };

  const score =
    (enabledFacilities > 0 ? 20 : 0) +
    (departments > 0 ? 20 : 0) +
    (specialties > 0 ? 20 : 0) +
    (doctors > 0 ? 20 : 0) +
    (beds > 0 ? 10 : 0) +
    (otSetup > 0 ? 10 : 0);

  const blockers: string[] = [];
  if (enabledFacilities === 0) blockers.push("No facilities enabled.");
  if (departments === 0) blockers.push("No departments created.");
  if (doctors === 0) blockers.push("No doctors detected (designation missing 'Doctor/Consultant/Surgeon').");

  const warnings: string[] = [];
  if (beds === 0) warnings.push("No beds configured.");
  if (otSetup === 0) warnings.push("No OT setup configured (no OT rooms or OT tables found).");

  return { score, blockers, warnings, summary };
}


  // ---------------------------------------------------------------------------
  // Departments under facilities + doctor assignment + HOD
  // ---------------------------------------------------------------------------

  async listDepartments(principal: Principal, q: { branchId?: string; facilityId?: string; includeInactive?: boolean; q?: string }) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);

    const where: any = { branchId };
    if (q.facilityId) where.facilityId = q.facilityId;
    if (!q.includeInactive) where.isActive = true;
    if (q.q) where.OR = [{ name: { contains: q.q, mode: "insensitive" } }, { code: { contains: q.q, mode: "insensitive" } }];

    const rows = await this.prisma.department.findMany({
      where,
      orderBy: [{ facility: { sortOrder: "asc" } }, { name: "asc" }],
      include: {
        facility: true,
        headStaff: { select: { id: true, name: true, designation: true } },
        doctorAssignments: {
          include: {
            staff: {
              select: {
                id: true,
                name: true,
                designation: true,
                specialty: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
        departmentSpecialties: {
          where: { isActive: true },
          include: { specialty: { select: { id: true, code: true, name: true, isActive: true } } },
          orderBy: { specialty: { name: "asc" } },
        },
      },
    });

    return rows.map((d) => ({
      id: d.id,
      branchId: d.branchId,
      facilityId: d.facilityId,
      facility: { id: d.facility.id, code: d.facility.code, name: d.facility.name, category: d.facility.category },
      code: d.code,
      name: d.name,
      isActive: d.isActive,
      headStaff: d.headStaff,
      doctors: d.doctorAssignments.map((a) => ({
        staffId: a.staffId,
        isPrimary: a.isPrimary,
        staff: a.staff,
      })),
      specialties: d.departmentSpecialties.map((ds) => ({
        specialtyId: ds.specialtyId,
        isPrimary: ds.isPrimary,
        specialty: ds.specialty,
      })),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  private async assertFacilityEnabledForBranch(branchId: string, facilityId: string) {
    const bf = await this.prisma.branchFacility.findFirst({
      where: { branchId, facilityId, isEnabled: true },
      select: { id: true },
    });
    if (!bf) throw new BadRequestException("This facility is not enabled for the branch. Please enable it first.");
  }

  async createDepartment(principal: Principal, dto: { branchId?: string; facilityId: string; code: string; name: string; isActive?: boolean }) {
    const branchId = this.resolveBranchId(principal, dto.branchId ?? null);

    await this.assertFacilityEnabledForBranch(branchId, dto.facilityId);

    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    if (!code) throw new BadRequestException("Department code is required");
    if (!name) throw new BadRequestException("Department name is required");

    const created = await this.prisma.department.create({
      data: {
        branchId,
        facilityId: dto.facilityId,
        code,
        name,
        isActive: dto.isActive ?? true,
      },
      include: { facility: true },
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "DEPARTMENT_CREATE",
      entity: "Department",
      entityId: created.id,
      meta: { facilityId: dto.facilityId, code, name },
    });

    return created;
  }

  async updateDepartment(principal: Principal, id: string, dto: { name?: string; isActive?: boolean }) {
    const existing = await this.prisma.department.findUnique({ where: { id }, select: { id: true, branchId: true } });
    if (!existing) throw new NotFoundException("Department not found");
    this.resolveBranchId(principal, existing.branchId);

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name?.trim() || undefined,
        isActive: typeof dto.isActive === "boolean" ? dto.isActive : undefined,
      },
    });

    await this.audit.log({
      branchId: existing.branchId,
      actorUserId: principal.userId,
      action: "DEPARTMENT_UPDATE",
      entity: "Department",
      entityId: id,
      meta: dto,
    });

    return updated;
  }

  async updateDepartmentAssignments(principal: Principal, departmentId: string, dto: { doctorIds: string[]; headStaffId?: string | null }) {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: { doctorAssignments: true },
    });
    if (!dept) throw new NotFoundException("Department not found");

    const branchId = this.resolveBranchId(principal, dept.branchId);
    await this.assertFacilityEnabledForBranch(branchId, dept.facilityId);

    const doctorIds = uniq(dto.doctorIds);

    if (dto.headStaffId && dto.headStaffId !== null && !doctorIds.includes(dto.headStaffId)) {
      throw new BadRequestException("headStaffId must be included in doctorIds");
    }

    // Validate staff IDs belong to this branch
    if (doctorIds.length) {
      const staff = await this.prisma.staff.findMany({
        where: { id: { in: doctorIds }, branchId, isActive: true },
        select: { id: true },
      });
      const ok = new Set(staff.map((s) => s.id));
      const bad = doctorIds.filter((id) => !ok.has(id));
      if (bad.length) throw new BadRequestException(`Invalid doctorIds for this branch: ${bad.join(", ")}`);
    }

    const current = new Set(dept.doctorAssignments.map((a) => a.staffId));
    const desired = new Set(doctorIds);
    const toDelete = Array.from(current).filter((id) => !desired.has(id));
    const toCreate = doctorIds.filter((id) => !current.has(id));

    await this.prisma.$transaction(async (tx) => {
      if (toDelete.length) {
        await tx.departmentDoctor.deleteMany({
          where: { departmentId, staffId: { in: toDelete } },
        });
      }

      if (toCreate.length) {
        await tx.departmentDoctor.createMany({
          data: toCreate.map((staffId) => ({
            departmentId,
            staffId,
            isPrimary: dto.headStaffId ? staffId === dto.headStaffId : false,
          })),
          skipDuplicates: true,
        });
      }

      // Align primary flags with head selection
      if (dto.headStaffId !== undefined) {
        await tx.departmentDoctor.updateMany({
          where: { departmentId },
          data: { isPrimary: false },
        });
        if (dto.headStaffId) {
          await tx.departmentDoctor.updateMany({
            where: { departmentId, staffId: dto.headStaffId },
            data: { isPrimary: true },
          });
        }
      }

      await tx.department.update({
        where: { id: departmentId },
        data: { headStaffId: dto.headStaffId === undefined ? undefined : dto.headStaffId },
      });
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "DEPARTMENT_ASSIGN_DOCTORS",
      entity: "Department",
      entityId: departmentId,
      meta: {
        before: Array.from(current),
        after: doctorIds,
        headStaffId: dto.headStaffId,
        added: toCreate,
        removed: toDelete,
      },
    });

    return this.prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        facility: true,
        headStaff: { select: { id: true, name: true, designation: true } },
        doctorAssignments: {
          include: {
            staff: {
              select: {
                id: true,
                name: true,
                designation: true,
                specialty: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
        departmentSpecialties: {
          where: { isActive: true },
          include: { specialty: { select: { id: true, code: true, name: true, isActive: true } } },
          orderBy: { specialty: { name: "asc" } },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Specialties (branch-scoped catalog)
  // ---------------------------------------------------------------------------

  async listSpecialties(
    principal: Principal,
    q: { branchId?: string; includeInactive?: boolean; includeMappings?: boolean; q?: string },
  ) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);

    const where: any = { branchId };
    if (!q.includeInactive) where.isActive = true;
    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: "insensitive" } },
        { code: { contains: q.q, mode: "insensitive" } },
      ];
    }

    // Default: lightweight listing
    if (!q.includeMappings) {
      return this.prisma.specialty.findMany({
        where,
        orderBy: [{ name: "asc" }],
        select: { id: true, branchId: true, code: true, name: true, isActive: true, createdAt: true, updatedAt: true },
      });
    }

    // With mappings: include departments and isPrimary flags (from DepartmentSpecialty)
    const rows = await this.prisma.specialty.findMany({
      where,
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        branchId: true,
        code: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        departmentLinks: {
          where: { isActive: true },
          orderBy: [{ isPrimary: "desc" }, { department: { name: "asc" } }],
          select: {
            departmentId: true,
            isPrimary: true,
            department: { select: { id: true, code: true, name: true, isActive: true } },
          },
        },
      },
    });

    return rows.map((s) => ({
      id: s.id,
      branchId: s.branchId,
      code: s.code,
      name: s.name,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      departments: s.departmentLinks.map((dl) => ({
        departmentId: dl.departmentId,
        isPrimary: dl.isPrimary,
        department: dl.department,
      })),
    }));
  }


  async createSpecialty(principal: Principal, dto: CreateSpecialtyDto) {
    const branchId = this.resolveBranchId(principal, dto.branchId ?? null);

    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    if (!code) throw new BadRequestException("Specialty code is required");
    if (!name) throw new BadRequestException("Specialty name is required");

    const created = await this.prisma.specialty.create({
      data: {
        branchId,
        code,
        name,
        isActive: dto.isActive ?? true,
      },
      select: { id: true, branchId: true, code: true, name: true, isActive: true, createdAt: true, updatedAt: true },
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "SPECIALTY_CREATE",
      entity: "Specialty",
      entityId: created.id,
      meta: dto,
    });

    return created;
  }

  async updateSpecialty(principal: Principal, id: string, dto: UpdateSpecialtyDto) {
    const existing = await this.prisma.specialty.findUnique({ where: { id }, select: { id: true, branchId: true } });
    if (!existing) throw new NotFoundException("Specialty not found");

    const branchId = this.resolveBranchId(principal, existing.branchId);

    const updated = await this.prisma.specialty.update({
      where: { id },
      data: {
        name: dto.name?.trim() || undefined,
        isActive: typeof dto.isActive === "boolean" ? dto.isActive : undefined,
      },
      select: { id: true, branchId: true, code: true, name: true, isActive: true, createdAt: true, updatedAt: true },
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "SPECIALTY_UPDATE",
      entity: "Specialty",
      entityId: id,
      meta: dto,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Department ↔ Specialty mapping (many-to-many)
  // ---------------------------------------------------------------------------

  async listDepartmentSpecialties(principal: Principal, departmentId: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, branchId: true, facilityId: true, code: true, name: true },
    });
    if (!dept) throw new NotFoundException("Department not found");

    const branchId = this.resolveBranchId(principal, dept.branchId);
    await this.assertFacilityEnabledForBranch(branchId, dept.facilityId);

    const rows = await this.prisma.departmentSpecialty.findMany({
      where: { departmentId, isActive: true },
      orderBy: [{ isPrimary: "desc" }, { specialty: { name: "asc" } }],
      include: {
        specialty: { select: { id: true, code: true, name: true, isActive: true } },
      },
    });


    return {
      department: dept,
      items: rows.map((r) => ({
        id: r.id,
        departmentId: r.departmentId,
        specialtyId: r.specialtyId,
        isPrimary: r.isPrimary,
        isActive: r.isActive,
        specialty: r.specialty,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
  }

  async setDepartmentSpecialties(
    principal: Principal,
    departmentId: string,
    dto: SetDepartmentSpecialtiesDto,
  ) {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: { doctorAssignments: false },
    });
    if (!dept) throw new NotFoundException("Department not found");

    const branchId = this.resolveBranchId(principal, dept.branchId);
    await this.assertFacilityEnabledForBranch(branchId, dept.facilityId);

    const specialtyIds = uniq(dto.specialtyIds);

    if (dto.primarySpecialtyId && dto.primarySpecialtyId !== null && !specialtyIds.includes(dto.primarySpecialtyId)) {
      throw new BadRequestException("primarySpecialtyId must be included in specialtyIds");
    }

    // Validate specialties belong to this branch (and are active)
    if (specialtyIds.length) {
      const specs = await this.prisma.specialty.findMany({
        where: { id: { in: specialtyIds }, branchId, isActive: true },
        select: { id: true },
      });
      const ok = new Set(specs.map((s) => s.id));
      const bad = specialtyIds.filter((id) => !ok.has(id));
      if (bad.length) throw new BadRequestException(`Invalid specialtyIds for this branch: ${bad.join(", ")}`);
    }

    const current = await this.prisma.departmentSpecialty.findMany({
      where: { departmentId },
      select: { specialtyId: true, isActive: true },
    });

    const currentActive = new Set(current.filter((x) => x.isActive).map((x) => x.specialtyId));
    const desired = new Set(specialtyIds);

    const toDisable = Array.from(currentActive).filter((id) => !desired.has(id));
    const toEnable = specialtyIds.filter((id) => !currentActive.has(id));

    await this.prisma.$transaction(async (tx) => {
      if (toDisable.length) {
        await tx.departmentSpecialty.updateMany({
          where: { departmentId, specialtyId: { in: toDisable } },
          data: { isActive: false, isPrimary: false },
        });
      }

      for (const sid of toEnable) {
        await tx.departmentSpecialty.upsert({
          where: { departmentId_specialtyId: { departmentId, specialtyId: sid } },
          update: { isActive: true, isPrimary: false },
          create: { departmentId, specialtyId: sid, isActive: true, isPrimary: false },
        });
      }

      // Apply primary selection
      if (dto.primarySpecialtyId !== undefined) {
        await tx.departmentSpecialty.updateMany({
          where: { departmentId },
          data: { isPrimary: false },
        });
        if (dto.primarySpecialtyId) {
          await tx.departmentSpecialty.updateMany({
            where: { departmentId, specialtyId: dto.primarySpecialtyId },
            data: { isPrimary: true, isActive: true },
          });
        }
      }
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "DEPARTMENT_SPECIALTIES_SET",
      entity: "Department",
      entityId: departmentId,
      meta: {
        before: Array.from(currentActive),
        after: specialtyIds,
        enabled: toEnable,
        disabled: toDisable,
        primarySpecialtyId: dto.primarySpecialtyId,
      },
    });

    return this.listDepartmentSpecialties(principal, departmentId);
  }

  // ---------------------------------------------------------------------------
  // Staff directory helper (doctors)
  // ---------------------------------------------------------------------------

  async listDoctors(principal: Principal, q: { branchId?: string; q?: string }) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);

    const where: any = {
      branchId,
      isActive: true,
      OR: [
        { specialtyId: { not: null } },
        { designation: { contains: "doctor", mode: "insensitive" } },
        { designation: { contains: "consultant", mode: "insensitive" } },
        { designation: { contains: "surgeon", mode: "insensitive" } },
      ],
    };

    if (q.q) {
      where.AND = [
        {
          OR: [
            { name: { contains: q.q, mode: "insensitive" } },
            { empCode: { contains: q.q, mode: "insensitive" } },
            { designation: { contains: q.q, mode: "insensitive" } },
          ],
        },
      ];
    }

    return this.prisma.staff.findMany({
      where,
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        empCode: true,
        name: true,
        designation: true,
        specialty: { select: { id: true, code: true, name: true } },
      },
      take: 200,
    });
  }
}
