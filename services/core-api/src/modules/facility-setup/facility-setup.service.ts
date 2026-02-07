import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@zypocare/db";
import { AuditService } from "../audit/audit.service";
import type { Principal } from "../auth/access-policy.service";
import { resolveBranchId as resolveBranchIdCommon } from "../../common/branch-scope.util";
import type {
  CreateDepartmentDto,
  CreateFacilityDto,
  CreateSpecialtyDto,
  SetDepartmentSpecialtiesDto,
  UpdateDepartmentAssignmentsDto,
  UpdateDepartmentDto,
  UpdateSpecialtyDto,
} from "./facility-setup.dto";
import { validateOperatingHours } from "./operating-hours.validator";

function uniq(ids: string[]) {
  return Array.from(new Set((ids || []).map((x) => String(x)).filter(Boolean)));
}

const LOCATION_KIND_RANK: Record<string, number> = {
  CAMPUS: 1,
  BUILDING: 2,
  FLOOR: 3,
  ZONE: 4,
  AREA: 5,
};

@Injectable()
export class FacilitySetupService {
  constructor(
    @Inject("PRISMA") private prisma: PrismaClient,
    private audit: AuditService,
  ) {}

  private resolveBranchId(principal: Principal, requestedBranchId?: string | null) {
    // Standardized branch resolution for facility setup: GLOBAL must provide branchId (except catalog ops)
    return resolveBranchIdCommon(principal, requestedBranchId ?? null, { requiredForGlobal: true });
  }

  private async getDepartmentMasterFacilityId(): Promise<string> {
    // We keep Department.facilityId in the schema for now, but hide it from the workflow.
    // All departments created via the simplified workflow default to this FacilityCatalog entry.
    const row = await this.prisma.facilityCatalog.findUnique({
      where: { code: "DEPARTMENT_MASTER" },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(
        "Missing FacilityCatalog code=DEPARTMENT_MASTER. Run the seed once (FacilitySetupSeedService) and retry.",
      );
    }
    return row.id;
  }

  // ---------------------------------------------------------------------------
  // Department rule helpers
  // ---------------------------------------------------------------------------

  private async assertDepartmentCodeUnique(branchId: string, code: string, excludeId?: string) {
    const existing = await this.prisma.department.findFirst({
      where: {
        branchId,
        code,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, facilityId: true },
    });
    if (existing) {
      throw new ConflictException(`Department code '${code}' must be unique within branch.`);
    }
  }

  private async computeDepartmentNameWarnings(branchId: string, name: string, excludeId?: string): Promise<string[]> {
    const warnings: string[] = [];
    const dup = await this.prisma.department.findFirst({
      where: {
        branchId,
        name: { equals: name, mode: "insensitive" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, code: true },
    });
    if (dup) {
      warnings.push("Department name should be unique within branch (warning).");
    }
    return warnings;
  }

  private async validateHeadStaffInBranch(branchId: string, headStaffId: string) {
    // Staff is enterprise-scoped; validate via an ACTIVE assignment in this branch.
    const now = new Date();
    const row = await this.prisma.staffAssignment.findFirst({
      where: {
        staffId: headStaffId,
        branchId,
        status: "ACTIVE",
        staff: { status: "ACTIVE" },
        AND: [
          { effectiveFrom: { lte: now } },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      },
      select: { id: true },
    });
    if (!row) throw new BadRequestException("headStaffId must be an ACTIVE staff member of this branch.");
  }

  private async validateLocationNodesInBranch(branchId: string, locationNodeIds: string[]) {
    if (!locationNodeIds.length) return { warnings: [] as string[] };

    const now = new Date();
    const rows = await this.prisma.locationNode.findMany({
      where: {
        id: { in: locationNodeIds },
        branchId,
        revisions: {
          some: {
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
            isActive: true,
          },
        },
      },
      select: { id: true, kind: true },
    });

    const ok = new Map(rows.map((r) => [r.id, r.kind as any]));
    const bad = locationNodeIds.filter((id) => !ok.has(id));
    if (bad.length) throw new BadRequestException(`Invalid locationNodeIds for this branch: ${bad.join(", ")}`);

    // Department location rules:
    // - must not be CAMPUS/BUILDING (blocking)
    // - AREA is recommended (warning if FLOOR/ZONE)
    const warnings: string[] = [];
    for (const id of locationNodeIds) {
      const kind = String(ok.get(id) ?? "");
      if (kind === "CAMPUS" || kind === "BUILDING") {
        throw new BadRequestException("Department location must be FLOOR/ZONE/AREA (not CAMPUS/BUILDING).");
      }
      if (kind !== "AREA") warnings.push("Department location should ideally be at AREA level (warning).");
    }

    return { warnings };
  }

  private async assertLocationExclusivity(
    tx: Prisma.TransactionClient,
    branchId: string,
    departmentId: string,
    locationNodeIds: string[],
  ) {
    if (!locationNodeIds.length) return;

    const conflicts = await tx.departmentLocation.findMany({
      where: {
        isActive: true,
        locationNodeId: { in: locationNodeIds },
        departmentId: { not: departmentId },
        department: {
          branchId,
          isActive: true,
        },
      },
      select: {
        locationNodeId: true,
        department: { select: { id: true, code: true, name: true } },
      },
    });

    if (conflicts.length) {
      const msg = conflicts
        .map((c) => `${c.locationNodeId} → ${c.department.code} (${c.department.name})`)
        .join("; ");
      throw new ConflictException(
        `Location cannot be assigned to multiple active departments. Conflicts: ${msg}`,
      );
    }
  }

  private async syncDepartmentLocations(
    tx: Prisma.TransactionClient,
    branchId: string,
    departmentId: string,
    locationNodeIds: string[],
    primaryLocationNodeId?: string | null,
  ) {
    const ids = uniq(locationNodeIds);

    if (!ids.length) {
      throw new BadRequestException("Department must have at least one physical location assigned.");
    }

    if (primaryLocationNodeId && !ids.includes(primaryLocationNodeId)) {
      throw new BadRequestException("primaryLocationNodeId must be included in locationNodeIds");
    }

    // Exclusivity check BEFORE enabling
    await this.assertLocationExclusivity(tx, branchId, departmentId, ids);

    const current = await tx.departmentLocation.findMany({
      where: { departmentId },
      select: { locationNodeId: true, isActive: true },
    });

    const currentActive = new Set(current.filter((x) => x.isActive).map((x) => x.locationNodeId));
    const desired = new Set(ids);

    const toDisable = Array.from(currentActive).filter((locId) => !desired.has(locId));
    const toEnable = ids.filter((locId) => !currentActive.has(locId));

    if (toDisable.length) {
      await tx.departmentLocation.updateMany({
        where: { departmentId, locationNodeId: { in: toDisable } },
        data: { isActive: false, isPrimary: false },
      });
    }

    for (const locId of toEnable) {
      await tx.departmentLocation.upsert({
        where: { departmentId_locationNodeId: { departmentId, locationNodeId: locId } },
        update: { isActive: true, isPrimary: false },
        create: { departmentId, locationNodeId: locId, isActive: true, isPrimary: false },
      });
    }

    // Ensure exactly one primary if any locations exist.
    const effectivePrimary =
      primaryLocationNodeId === undefined
        ? null
        : (primaryLocationNodeId ?? null);

    if (primaryLocationNodeId === undefined) {
      // If caller didn't specify, keep existing primary if present; else pick the first.
      const existingPrimary = await tx.departmentLocation.findFirst({
        where: { departmentId, isActive: true, isPrimary: true },
        select: { locationNodeId: true },
      });
      const pick = existingPrimary?.locationNodeId ?? ids[0];
      await tx.departmentLocation.updateMany({ where: { departmentId }, data: { isPrimary: false } });
      await tx.departmentLocation.updateMany({
        where: { departmentId, locationNodeId: pick },
        data: { isPrimary: true, isActive: true },
      });
    } else {
      await tx.departmentLocation.updateMany({ where: { departmentId }, data: { isPrimary: false } });
      if (effectivePrimary) {
        await tx.departmentLocation.updateMany({
          where: { departmentId, locationNodeId: effectivePrimary },
          data: { isPrimary: true, isActive: true },
        });
      }
    }

    return { enabled: toEnable, disabled: toDisable, after: ids };
  }

  private async assertDepartmentHierarchy(
    tx: Prisma.TransactionClient,
    branchId: string,
    departmentId: string | null,
    parentDepartmentId: string | null,
  ) {
    if (!parentDepartmentId) return;

    if (departmentId && parentDepartmentId === departmentId) {
      throw new BadRequestException("Parent department cannot be self.");
    }

    // parent must exist + active + same branch
    const parent = await tx.department.findFirst({
      where: { id: parentDepartmentId, branchId, isActive: true },
      select: { id: true, parentDepartmentId: true },
    });
    if (!parent) throw new BadRequestException("Parent department must exist, be active, and belong to same branch.");

    // no cycles + max 3 levels
    const visited = new Set<string>();
    let cur: string | null = parentDepartmentId;
    let depth = 0; // number of nodes from parent up to root
    while (cur) {
      if (visited.has(cur)) throw new BadRequestException("Circular parent-child relationship detected.");
      visited.add(cur);
      if (departmentId && cur === departmentId) throw new BadRequestException("Circular parent-child relationship detected.");

      depth += 1;
      if (depth >= 3) {
        // dept depth would be depth+1, max allowed = 3
        // if parent chain length already 3, adding child exceeds
        throw new BadRequestException("Maximum 3 levels of department nesting allowed.");
      }

      const next: { parentDepartmentId: string | null; branchId: string } | null = await tx.department.findUnique({
        where: { id: cur },
        select: { parentDepartmentId: true, branchId: true },
      });
      if (!next) break;
      if (next.branchId !== branchId) throw new BadRequestException("Parent department must be in same branch.");
      cur = next.parentDepartmentId ?? null;
    }
  }

  private async assertDepartmentSpecialtyRules(
    tx: Prisma.TransactionClient,
    branchId: string,
    departmentId: string,
    facilityType: string,
    whenActive: boolean,
  ) {
    if (!whenActive) return;

    const isClinical = facilityType === "CLINICAL";
    const rows = await tx.departmentSpecialty.findMany({
      where: { departmentId, isActive: true },
      select: { specialtyId: true, isPrimary: true },
    });

    if (isClinical && rows.length === 0) {
      throw new BadRequestException("Clinical departments must have at least one specialty.");
    }

    if (rows.length > 0) {
      const primaries = rows.filter((r) => r.isPrimary);
      if (primaries.length === 0) throw new BadRequestException("At least one specialty must be marked as Primary.");
      if (primaries.length > 1) throw new BadRequestException("Only one specialty can be marked as Primary.");
    }
  }

  private async assertHeadStaffRules(
    tx: Prisma.TransactionClient,
    branchId: string,
    departmentId: string,
    headStaffId: string,
    desiredDoctorIds?: string[],
  ) {
    // active staff in branch
    const now = new Date();
    const activePlacement = await tx.staffAssignment.findFirst({
      where: {
        staffId: headStaffId,
        branchId,
        status: "ACTIVE",
        staff: { status: "ACTIVE" },
        AND: [
          { effectiveFrom: { lte: now } },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      },
      select: { id: true },
    });
    if (!activePlacement) throw new BadRequestException("HOD must be an active staff member in this branch.");

    // unique HOD across active departments
    const other = await tx.department.findFirst({
      where: {
        branchId,
        isActive: true,
        headStaffId,
        id: { not: departmentId },
      },
      select: { id: true, code: true, name: true },
    });
    if (other) {
      throw new ConflictException(`HOD already assigned to another department: ${other.code} (${other.name}).`);
    }

    // must be a doctor (i.e., assigned as DepartmentDoctor)
    if (desiredDoctorIds) {
      if (!desiredDoctorIds.includes(headStaffId)) {
        throw new BadRequestException("HOD must be included in the department doctor list.");
      }
    } else {
      const isDoctor = await tx.departmentDoctor.findFirst({
        where: { departmentId, staffId: headStaffId },
        select: { id: true },
      });
      if (!isDoctor) throw new BadRequestException("HOD must be a doctor assigned to this department.");
    }

    // must have specialty matching one of dept specialties
    const deptSpecs = await tx.departmentSpecialty.findMany({
      where: { departmentId, isActive: true },
      select: { specialtyId: true },
    });
    const specIds = deptSpecs.map((s) => s.specialtyId);

    if (!specIds.length) throw new BadRequestException("Cannot assign HOD without department specialties.");

    const match = await tx.staffAssignment.findFirst({
      where: {
        staffId: headStaffId,
        branchId,
        status: "ACTIVE",
        staff: { status: "ACTIVE" },
        specialtyId: { in: specIds },
        AND: [
          { effectiveFrom: { lte: now } },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      },
      select: { id: true, specialtyId: true },
    });
    if (!match) {
      throw new BadRequestException("HOD must have a specialty matching one of department's specialties.");
    }
  }

  private async syncDepartmentSpecialties(
    tx: Prisma.TransactionClient,
    branchId: string,
    departmentId: string,
    facilityType: string,
    dto: SetDepartmentSpecialtiesDto,
  ): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];

    const specialtyIds = uniq(dto.specialtyIds ?? []);
    let primary = dto.primarySpecialtyId ?? null;

    const isClinical = facilityType === "CLINICAL";

    if (isClinical && specialtyIds.length === 0) {
      throw new BadRequestException("Clinical departments must have at least one specialty.");
    }

    if (specialtyIds.length === 0) {
      if (primary) throw new BadRequestException("primarySpecialtyId must be null when specialtyIds is empty.");
      // disable all
    } else {
      if (!primary) {
        if (specialtyIds.length === 1) {
          primary = specialtyIds[0];
          warnings.push("Primary specialty auto-selected because only one specialty was provided (warning).");
        } else {
          throw new BadRequestException("At least one specialty must be marked as Primary.");
        }
      }
      if (!specialtyIds.includes(primary)) {
        throw new BadRequestException("primarySpecialtyId must be included in specialtyIds");
      }
    }

    // Validate specialties belong to this branch (and are active)
    if (specialtyIds.length) {
      const specs = await tx.specialty.findMany({
        where: { id: { in: specialtyIds }, branchId, isActive: true },
        select: { id: true },
      });
      const ok = new Set(specs.map((s) => s.id));
      const bad = specialtyIds.filter((id) => !ok.has(id));
      if (bad.length) throw new BadRequestException(`Invalid specialtyIds for this branch: ${bad.join(", ")}`);
    }

    const current = await tx.departmentSpecialty.findMany({
      where: { departmentId },
      select: { specialtyId: true, isActive: true },
    });

    const currentActive = new Set(current.filter((x) => x.isActive).map((x) => x.specialtyId));
    const desired = new Set(specialtyIds);

    const toDisable = Array.from(currentActive).filter((id) => !desired.has(id));
    const toEnable = specialtyIds.filter((id) => !currentActive.has(id));

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

    // primary
    await tx.departmentSpecialty.updateMany({
      where: { departmentId },
      data: { isPrimary: false },
    });
    if (primary) {
      await tx.departmentSpecialty.updateMany({
        where: { departmentId, specialtyId: primary },
        data: { isPrimary: true, isActive: true },
      });
    }

    // enforce exactly one primary if any specialties exist
    if (specialtyIds.length) {
      const primaryCount = await tx.departmentSpecialty.count({
        where: { departmentId, isActive: true, isPrimary: true },
      });
      if (primaryCount !== 1) {
        throw new BadRequestException("Exactly one primary specialty is required.");
      }
    }

    return { warnings };
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
      meta: { before: Array.from(currentEnabled), after: facilityIds, enabled: toEnable, disabled: toDisable },
    });

    return this.getBranchFacilities(principal, branchId);
  }

  // ---------------------------------------------------------------------------
  // Departments
  // ---------------------------------------------------------------------------

  async listDepartments(
    principal: Principal,
    q: {
      branchId?: string;
      facilityId?: string;
      facilityType?: string;
      includeInactive?: boolean;
      q?: string;
    },
  ) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);

    const where: any = { branchId };
    if (!q.includeInactive) where.isActive = true;

    if (q.facilityId) where.facilityId = q.facilityId;
    if (q.facilityType) where.facilityType = q.facilityType;

    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: "insensitive" } },
        { code: { contains: q.q, mode: "insensitive" } },
      ];
    }

    const rows = await this.prisma.department.findMany({
      where,
      include: {
        headStaff: { select: { id: true, name: true } },
        doctorAssignments: {
          orderBy: [{ isPrimary: "desc" }, { assignedAt: "desc" }],
          select: {
            staffId: true,
            isPrimary: true,
            assignedAt: true,
            staff: { select: { id: true, name: true } },
          },
        },
        departmentSpecialties: {
          where: { isActive: true },
          orderBy: [{ isPrimary: "desc" }, { specialty: { name: "asc" } }],
          select: {
            specialtyId: true,
            isPrimary: true,
            specialty: { select: { id: true, code: true, name: true, kind: true, isActive: true } },
          },
        },
        locations: {
          where: { isActive: true },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: { locationNodeId: true, isPrimary: true, isActive: true },
        },
      },
      orderBy: [{ facilityType: "asc" }, { name: "asc" }],
    });

    return rows.map((d) => ({
      id: d.id,
      branchId: d.branchId,
      code: d.code,
      name: d.name,
      facilityType: d.facilityType,
      costCenterCode: d.costCenterCode,
      extensions: (d.extensions as any) ?? null,
      operatingHours: (d.operatingHours as any) ?? null,
      isActive: d.isActive,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      parentDepartmentId: d.parentDepartmentId ?? null,
      headStaffId: d.headStaffId,
      headStaff: d.headStaff,
      doctors: d.doctorAssignments.map((a) => ({
        staffId: a.staffId,
        isPrimary: a.isPrimary,
        assignedAt: a.assignedAt,
        staff: a.staff,
      })),
      specialties: d.departmentSpecialties.map((ds) => ({
        specialtyId: ds.specialtyId,
        isPrimary: ds.isPrimary,
        specialty: ds.specialty,
      })),
      locations: d.locations.map((l) => ({
        locationNodeId: l.locationNodeId,
        isPrimary: l.isPrimary,
        isActive: l.isActive,
      })),
    }));
  }

  async createDepartment(principal: Principal, dto: CreateDepartmentDto) {
    const branchId = this.resolveBranchId(principal, dto.branchId ?? null);

    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    if (!code) throw new BadRequestException("Department code is required");
    if (!name) throw new BadRequestException("Department name is required");

    // ✅ enforce code uniqueness within branch (even if DB unique not yet migrated)
    await this.assertDepartmentCodeUnique(branchId, code);

    const facilityId = dto.facilityId ?? (await this.getDepartmentMasterFacilityId());
    const facilityType = (dto.facilityType ?? "CLINICAL") as any;

    const warnings: string[] = [];
    warnings.push(...(await this.computeDepartmentNameWarnings(branchId, name)));

        // operating hours validation
    let operatingHours: any = undefined;
    if (dto.operatingHours !== undefined) {
      try {
        const r = validateOperatingHours(dto.operatingHours, {
          departmentCode: code,
          departmentName: dto.name?.trim() ?? null,
        });
        operatingHours = r.normalized as any;
        warnings.push(...r.warnings);
      } catch (e: any) {
        throw new BadRequestException(e?.message ?? "Invalid operating hours");
      }
    }


    // Location rules (mandatory)
    const locationNodeIds = uniq(dto.locationNodeIds ?? []);
    if (!locationNodeIds.length) throw new BadRequestException("Department must have a physical location assigned.");

    const locValidate = await this.validateLocationNodesInBranch(branchId, locationNodeIds);
    warnings.push(...locValidate.warnings);

    // Specialties create-time mapping (enforced)
    const specialtyIds = uniq((dto as any).specialtyIds ?? []);
    const primarySpecialtyId = (dto as any).primarySpecialtyId ?? null;

    if (facilityType === "CLINICAL" && specialtyIds.length === 0) {
      throw new BadRequestException("Clinical departments must have at least one specialty.");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      // hierarchy rules
      await this.assertDepartmentHierarchy(tx, branchId, null, (dto as any).parentDepartmentId ?? null);

      const dept = await tx.department.create({
        data: {
          branchId,
          facilityId,
          code,
          name,
          facilityType,
          costCenterCode: dto.costCenterCode?.trim() || null,
          extensions: dto.extensions ? (dto.extensions as any) : null,
          operatingHours: operatingHours,
          isActive: dto.isActive ?? true,
          parentDepartmentId: (dto as any).parentDepartmentId ?? null,
        } as any,
      });

      // locations (exclusive + primary)
      await this.syncDepartmentLocations(
        tx,
        branchId,
        dept.id,
        locationNodeIds,
        dto.primaryLocationNodeId ?? null,
      );

      // specialties
      if (specialtyIds.length || primarySpecialtyId !== null) {
        const specWarnings = await this.syncDepartmentSpecialties(tx, branchId, dept.id, facilityType, {
          specialtyIds,
          primarySpecialtyId,
        });
        warnings.push(...specWarnings.warnings);
      }

      // enforce specialty rules if active
      await this.assertDepartmentSpecialtyRules(tx, branchId, dept.id, facilityType, dept.isActive);

      // head staff (HOD) – enforce fully by auto-adding as DepartmentDoctor
      if (dto.headStaffId) {
        await this.validateHeadStaffInBranch(branchId, dto.headStaffId);

        // add as doctor assignment (so HOD is always a doctor)
        await tx.departmentDoctor.upsert({
          where: { departmentId_staffId: { departmentId: dept.id, staffId: dto.headStaffId } },
          update: { isPrimary: true },
          create: { departmentId: dept.id, staffId: dto.headStaffId, isPrimary: true },
        });

        // validate HOD rules now that mapping exists
        await this.assertHeadStaffRules(tx, branchId, dept.id, dto.headStaffId);

        await tx.department.update({
          where: { id: dept.id },
          data: { headStaffId: dto.headStaffId },
        });
      }

      await this.audit.log({
        branchId,
        actorUserId: principal.userId,
        action: "DEPARTMENT_CREATE",
        entity: "Department",
        entityId: dept.id,
        meta: { dto, warnings },
      });

      return dept;
    });

    const [full] = await this.listDepartments(principal, { branchId, includeInactive: true, q: code });
    return full ? { ...full, warnings } : { ...created, warnings };
  }

  async updateDepartment(principal: Principal, id: string, dto: UpdateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true, branchId: true, facilityType: true, isActive: true },
    });
    if (!existing) throw new NotFoundException("Department not found");

    const branchId = this.resolveBranchId(principal, existing.branchId);

    // force deactivation through deactivate endpoint
    if (dto.isActive === false) {
      throw new BadRequestException("Use POST /departments/:id/deactivate to deactivate a department.");
    }

    const warnings: string[] = [];
    if (dto.name) warnings.push(...(await this.computeDepartmentNameWarnings(branchId, dto.name.trim(), id)));

    // validate head staff existence early
    if (dto.headStaffId) await this.validateHeadStaffInBranch(branchId, dto.headStaffId);

    // validate location payload (if provided)
    const locationNodeIds = uniq(dto.locationNodeIds ?? []);
    if (dto.locationNodeIds !== undefined) {
      if (!locationNodeIds.length) throw new BadRequestException("Department must have at least one physical location.");
      const locValidate = await this.validateLocationNodesInBranch(branchId, locationNodeIds);
      warnings.push(...locValidate.warnings);
    }

        // operating hours validation
    let operatingHours: any = undefined;
    if (dto.operatingHours !== undefined) {
      const deptRow = await this.prisma.department.findUnique({ where: { id }, select: { code: true, name: true } });
      try {
        const r = validateOperatingHours(dto.operatingHours, {
          departmentCode: deptRow?.code ?? null,
          departmentName: dto.name?.trim() ?? deptRow?.name ?? null,
        });
        operatingHours = r.normalized as any;
        warnings.push(...r.warnings);
      } catch (e: any) {
        throw new BadRequestException(e?.message ?? "Invalid operating hours");
      }
    }


    await this.prisma.$transaction(async (tx) => {
      const nextFacilityType = (dto.facilityType ?? existing.facilityType) as any;

      // hierarchy rules
      if ((dto as any).parentDepartmentId !== undefined) {
        await this.assertDepartmentHierarchy(tx, branchId, id, (dto as any).parentDepartmentId ?? null);
      }

      await tx.department.update({
        where: { id },
        data: {
          name: dto.name?.trim() || undefined,
          facilityType: dto.facilityType ? (dto.facilityType as any) : undefined,
          costCenterCode: dto.costCenterCode !== undefined ? dto.costCenterCode?.trim() || null : undefined,
          extensions: dto.extensions !== undefined ? (dto.extensions as any) : undefined,
          operatingHours: operatingHours !== undefined ? (operatingHours as any) : undefined,
          headStaffId: dto.headStaffId !== undefined ? dto.headStaffId : undefined,
          // allow reactivation; if reactivated, enforce rules below
          isActive: typeof dto.isActive === "boolean" ? dto.isActive : undefined,
          parentDepartmentId:
            (dto as any).parentDepartmentId !== undefined ? ((dto as any).parentDepartmentId ?? null) : undefined,
        } as any,
      });

      // locations update
      if (dto.locationNodeIds !== undefined || dto.primaryLocationNodeId !== undefined) {
        await this.syncDepartmentLocations(
          tx,
          branchId,
          id,
          locationNodeIds.length ? locationNodeIds : (await tx.departmentLocation.findMany({
            where: { departmentId: id, isActive: true },
            select: { locationNodeId: true },
          })).map((x) => x.locationNodeId),
          dto.primaryLocationNodeId ?? null,
        );
      }

      // ensure dept has at least one active location always
      const activeLocCount = await tx.departmentLocation.count({
        where: { departmentId: id, isActive: true },
      });
      if (!activeLocCount) throw new BadRequestException("Department must have a physical location assigned.");

      // enforce specialty rules if department is active and/or becoming active
      const deptNow = await tx.department.findUnique({
        where: { id },
        select: { isActive: true, facilityType: true, headStaffId: true },
      });
      if (!deptNow) throw new NotFoundException("Department not found");

      await this.assertDepartmentSpecialtyRules(tx, branchId, id, nextFacilityType, deptNow.isActive);

      // if headStaffId is set/changed, validate full HOD rules
      if (dto.headStaffId) {
        await this.assertHeadStaffRules(tx, branchId, id, dto.headStaffId);
      }

      await this.audit.log({
        branchId,
        actorUserId: principal.userId,
        action: "DEPARTMENT_UPDATE",
        entity: "Department",
        entityId: id,
        meta: { dto, warnings },
      });
    });

    const row = await this.prisma.department.findUnique({
      where: { id },
      include: {
        headStaff: { select: { id: true, name: true } },
        doctorAssignments: {
          orderBy: [{ isPrimary: "desc" }, { assignedAt: "desc" }],
          select: { staffId: true, isPrimary: true, assignedAt: true, staff: { select: { id: true, name: true } } },
        },
        departmentSpecialties: {
          where: { isActive: true },
          orderBy: [{ isPrimary: "desc" }, { specialty: { name: "asc" } }],
          select: {
            specialtyId: true,
            isPrimary: true,
            specialty: { select: { id: true, code: true, name: true, kind: true, isActive: true } },
          },
        },
        locations: {
          where: { isActive: true },
          orderBy: [{ isPrimary: "desc" }],
          select: { locationNodeId: true, isPrimary: true, isActive: true },
        },
      },
    });

    if (!row) throw new NotFoundException("Department not found");

    return {
      id: row.id,
      branchId: row.branchId,
      code: row.code,
      name: row.name,
      facilityType: row.facilityType,
      costCenterCode: row.costCenterCode,
      extensions: (row.extensions as any) ?? null,
      operatingHours: (row.operatingHours as any) ?? null,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      parentDepartmentId: row.parentDepartmentId ?? null,
      headStaffId: row.headStaffId,
      headStaff: row.headStaff,
      doctors: row.doctorAssignments.map((a) => ({
        staffId: a.staffId,
        isPrimary: a.isPrimary,
        assignedAt: a.assignedAt,
        staff: a.staff,
      })),
      specialties: row.departmentSpecialties.map((ds) => ({
        specialtyId: ds.specialtyId,
        isPrimary: ds.isPrimary,
        specialty: ds.specialty,
      })),
      locations: row.locations.map((l) => ({ locationNodeId: l.locationNodeId, isPrimary: l.isPrimary, isActive: l.isActive })),
      warnings,
    };
  }

  async updateDepartmentAssignments(principal: Principal, departmentId: string, dto: UpdateDepartmentAssignmentsDto) {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, branchId: true, headStaffId: true, facilityType: true, isActive: true },
    });
    if (!dept) throw new NotFoundException("Department not found");

    const branchId = this.resolveBranchId(principal, dept.branchId);

    const doctorIds = uniq(dto.doctorIds ?? []);

    // Validate staff belong to branch via ACTIVE assignments
    if (doctorIds.length) {
      const now = new Date();
      const rows = await this.prisma.staffAssignment.findMany({
        where: {
          staffId: { in: doctorIds },
          branchId,
          status: "ACTIVE",
          staff: { status: "ACTIVE" },
          AND: [
            { effectiveFrom: { lte: now } },
            { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
          ],
        },
        select: { staffId: true },
      });
      const ok = new Set(rows.map((r) => r.staffId));
      const bad = doctorIds.filter((id) => !ok.has(id));
      if (bad.length) throw new BadRequestException(`Invalid doctorIds for this branch: ${bad.join(", ")}`);
    }

    if (dto.headStaffId) await this.validateHeadStaffInBranch(branchId, dto.headStaffId);

    // If headStaffId provided, it must be in the department doctorIds (HOD must be a doctor)
    if (dto.headStaffId && !doctorIds.includes(dto.headStaffId)) {
      throw new BadRequestException("HOD must be included in the department doctor list.");
    }

    // Current assignments
    const current = await this.prisma.departmentDoctor.findMany({
      where: { departmentId },
      select: { staffId: true },
    });

    const currentSet = new Set(current.map((x) => x.staffId));
    const desiredSet = new Set(doctorIds);

    const toRemove = Array.from(currentSet).filter((id) => !desiredSet.has(id));
    const toAdd = doctorIds.filter((id) => !currentSet.has(id));

    await this.prisma.$transaction(async (tx) => {
      if (toRemove.length) {
        await tx.departmentDoctor.deleteMany({
          where: { departmentId, staffId: { in: toRemove } },
        });
      }

      for (const sid of toAdd) {
        await tx.departmentDoctor.create({
          data: { departmentId, staffId: sid, isPrimary: false },
        });
      }

      if (dto.headStaffId !== undefined) {
        if (dto.headStaffId) {
          // Validate HOD rules with desired doctors set
          await this.assertHeadStaffRules(tx, branchId, departmentId, dto.headStaffId, doctorIds);
        }
        await tx.department.update({
          where: { id: departmentId },
          data: { headStaffId: dto.headStaffId ?? null },
        });
      }
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "DEPARTMENT_ASSIGNMENTS_SET",
      entity: "Department",
      entityId: departmentId,
      meta: {
        before: Array.from(currentSet),
        after: doctorIds,
        added: toAdd,
        removed: toRemove,
        headStaffId: dto.headStaffId,
      },
    });

    return this.updateDepartment(principal, departmentId, {});
  }

  async deactivateDepartment(
    principal: Principal,
    departmentId: string,
    opts: { hard?: boolean; cascade?: boolean; reason?: string } = {},
  ) {
    const row = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, branchId: true, isActive: true },
    });
    if (!row) throw new NotFoundException("Department not found");

    this.resolveBranchId(principal, row.branchId);

    const hard = !!opts.hard;

    if (hard) {
      const staffCount = await this.prisma.staffAssignment.count({ where: { departmentId, status: "ACTIVE" } });
      const unitsCount = await this.prisma.unit.count({ where: { departmentId } });
      const doctorAssignCount = await this.prisma.departmentDoctor.count({ where: { departmentId } });
      const mapCount = await this.prisma.departmentSpecialty.count({ where: { departmentId } });
      const locCount = await this.prisma.departmentLocation.count({ where: { departmentId } });

      const blockers = [
        staffCount ? `${staffCount} staff linked` : null,
        unitsCount ? `${unitsCount} units linked` : null,
        doctorAssignCount ? `${doctorAssignCount} doctor assignments` : null,
        mapCount ? `${mapCount} specialty mappings` : null,
        locCount ? `${locCount} location tags` : null,
      ].filter(Boolean);

      if (blockers.length) {
        throw new ConflictException(`Cannot hard delete department: ${blockers.join(", ")}`);
      }

      await this.prisma.department.delete({ where: { id: departmentId } });

      await this.audit.log({
        branchId: row.branchId,
        actorUserId: principal.userId,
        action: "DEPARTMENT_DELETE_HARD",
        entity: "Department",
        entityId: row.id,
        meta: { hard: true },
      });

      return { ok: true, hardDeleted: true };
    }

    const reason = String(opts.reason ?? "").trim();
    if (!reason) throw new BadRequestException("Deactivation reason is required.");

    const cascade = opts.cascade !== false; // default true
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const unitRows = await tx.unit.findMany({
        where: { departmentId },
        select: { id: true, isActive: true },
      });
      const unitIds = unitRows.map((u) => u.id);

      if (!cascade) {
        const activeUnits = await tx.unit.count({ where: { departmentId, isActive: true } });
        if (activeUnits) {
          throw new ConflictException(
            "Cannot deactivate department while it has active units. Deactivate units first, or call with cascade=true.",
          );
        }
      }

      let resourcesDeactivated = 0;
      let roomsDeactivated = 0;
      let unitsDeactivated = 0;
      let locationsDeactivated = 0;

      if (cascade && unitIds.length) {
        // Block if upcoming scheduled bookings exist
        const scheduledBookings = await tx.procedureBooking.count({
          where: {
            unitId: { in: unitIds },
            status: "SCHEDULED",
            endAt: { gt: now },
          },
        });
        if (scheduledBookings) {
          throw new ConflictException(
            `Cannot deactivate department: ${scheduledBookings} scheduled procedure bookings exist (future/ongoing).`,
          );
        }

        // Block if any resources are RESERVED or OCCUPIED
        const busyResources = await tx.unitResource.count({
          where: {
            unitId: { in: unitIds },
            isActive: true,
            state: { in: ["RESERVED", "OCCUPIED"] as any },
          },
        });
        if (busyResources) {
          throw new ConflictException(
            `Cannot deactivate department: ${busyResources} resources are RESERVED/OCCUPIED.`,
          );
        }

        // Cascade in order: Resource → Room → Unit
        const resUpd = await tx.unitResource.updateMany({
          where: { unitId: { in: unitIds }, isActive: true },
          data: {
            isActive: false,
            state: "INACTIVE" as any,
            reservedReason: null,
            blockedReason: null,
          } as any,
        });
        resourcesDeactivated = resUpd.count;

        const roomUpd = await tx.unitRoom.updateMany({
          where: { unitId: { in: unitIds }, isActive: true },
          data: { isActive: false } as any,
        });
        roomsDeactivated = roomUpd.count;

        const unitUpd = await tx.unit.updateMany({
          where: { departmentId, isActive: true },
          data: { isActive: false } as any,
        });
        unitsDeactivated = unitUpd.count;
      }

      // deactivate dept-location mappings to free exclusivity
      const locUpd = await tx.departmentLocation.updateMany({
        where: { departmentId, isActive: true },
        data: { isActive: false, isPrimary: false } as any,
      });
      locationsDeactivated = locUpd.count;

            // Finally deactivate the department + unassign HOD
      const updated = await tx.department.update({
        where: { id: departmentId },
        data: {
          isActive: false,
          headStaffId: null,
        },
        select: { id: true, branchId: true, isActive: true, name: true, code: true },
      });


      return {
        updated,
        cascade,
        counts: { unitsDeactivated, roomsDeactivated, resourcesDeactivated, locationsDeactivated },
      };
    });

    await this.audit.log({
      branchId: row.branchId,
      actorUserId: principal.userId,
      action: "DEPARTMENT_DEACTIVATE",
      entity: "Department",
      entityId: result.updated.id,
      meta: {
        hard: false,
        cascade: result.cascade,
        reason,
        ...result.counts,
      },
    });

    return {
      ...result.updated,
      cascade: result.cascade ? result.counts : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Specialties
  // ---------------------------------------------------------------------------

  async deactivateSpecialty(principal: Principal, specialtyId: string, opts: { hard?: boolean } = {}) {
    const row = await this.prisma.specialty.findUnique({
      where: { id: specialtyId },
      select: { id: true, branchId: true, isActive: true },
    });
    if (!row) throw new NotFoundException("Specialty not found");

    this.resolveBranchId(principal, row.branchId);

    const hard = !!opts.hard;

    if (hard) {
      const staffCount = await this.prisma.staffAssignment.count({ where: { specialtyId, status: "ACTIVE" } });
      const mapCount = await this.prisma.departmentSpecialty.count({ where: { specialtyId } });

      const blockers = [
        staffCount ? `${staffCount} staff linked` : null,
        mapCount ? `${mapCount} department mappings` : null,
      ].filter(Boolean);

      if (blockers.length) {
        throw new ConflictException(`Cannot hard delete specialty: ${blockers.join(", ")}`);
      }

      await this.prisma.specialty.delete({ where: { id: specialtyId } });

      await this.audit.log({
        branchId: row.branchId,
        actorUserId: principal.userId,
        action: "SPECIALTY_DELETE_HARD",
        entity: "Specialty",
        entityId: row.id,
        meta: { hard: true },
      });

      return { ok: true, hardDeleted: true };
    }

    const updated = await this.prisma.specialty.update({
      where: { id: specialtyId },
      data: { isActive: false },
      select: { id: true, branchId: true, isActive: true, name: true, code: true },
    });

    await this.audit.log({
      branchId: row.branchId,
      actorUserId: principal.userId,
      action: "SPECIALTY_DEACTIVATE",
      entity: "Specialty",
      entityId: updated.id,
      meta: { hard: false },
    });

    return updated;
  }

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

    if (!q.includeMappings) {
      return this.prisma.specialty.findMany({
        where,
        orderBy: [{ kind: "asc" }, { name: "asc" }],
        select: {
          id: true,
          branchId: true,
          code: true,
          name: true,
          kind: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    const rows = await this.prisma.specialty.findMany({
      where,
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      select: {
        id: true,
        branchId: true,
        code: true,
        name: true,
        kind: true,
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
      kind: s.kind,
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
        kind: (dto.kind ?? "SPECIALTY") as any,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        branchId: true,
        code: true,
        name: true,
        kind: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
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
        kind: dto.kind ? (dto.kind as any) : undefined,
        isActive: typeof dto.isActive === "boolean" ? dto.isActive : undefined,
      },
      select: {
        id: true,
        branchId: true,
        code: true,
        name: true,
        kind: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
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
  // Department ↔ Specialty mapping (public method)
  // ---------------------------------------------------------------------------

  async listDepartmentSpecialties(principal: Principal, departmentId: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, branchId: true, code: true, name: true, facilityType: true, isActive: true },
    });
    if (!dept) throw new NotFoundException("Department not found");

    this.resolveBranchId(principal, dept.branchId);

    const rows = await this.prisma.departmentSpecialty.findMany({
      where: { departmentId, isActive: true },
      orderBy: [{ isPrimary: "desc" }, { specialty: { name: "asc" } }],
      include: {
        specialty: { select: { id: true, code: true, name: true, kind: true, isActive: true } },
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

  async setDepartmentSpecialties(principal: Principal, departmentId: string, dto: SetDepartmentSpecialtiesDto) {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, branchId: true, facilityType: true, isActive: true, headStaffId: true },
    });
    if (!dept) throw new NotFoundException("Department not found");

    const branchId = this.resolveBranchId(principal, dept.branchId);

    const warnings: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      const r = await this.syncDepartmentSpecialties(tx, branchId, departmentId, dept.facilityType as any, dto);
      warnings.push(...r.warnings);

      // enforce clinical rules if active
      await this.assertDepartmentSpecialtyRules(tx, branchId, departmentId, dept.facilityType as any, dept.isActive);

      // if HOD exists, ensure specialty still matches
      if (dept.headStaffId) {
        await this.assertHeadStaffRules(tx, branchId, departmentId, dept.headStaffId);
      }
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "DEPARTMENT_SPECIALTIES_SET",
      entity: "Department",
      entityId: departmentId,
      meta: { dto, warnings },
    });

    const res = await this.listDepartmentSpecialties(principal, departmentId);
    return { ...res, warnings };
  }

  // ---------------------------------------------------------------------------
  // Staff directory helper (doctors)
  // ---------------------------------------------------------------------------

  async listDoctors(principal: Principal, q: { branchId?: string; q?: string }) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);
    const now = new Date();

    // Query via StaffAssignment (branch placement), then project to staff.
    const where: any = {
      branchId,
      status: "ACTIVE",
      staff: { status: "ACTIVE" },
      AND: [
        { effectiveFrom: { lte: now } },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        {
          OR: [
            { specialtyId: { not: null } },
            { designation: { contains: "doctor", mode: "insensitive" } },
            { designation: { contains: "consultant", mode: "insensitive" } },
            { designation: { contains: "surgeon", mode: "insensitive" } },
          ],
        },
      ],
    };

    if (q.q) {
      where.AND.push({
        OR: [
          { staff: { name: { contains: q.q, mode: "insensitive" } } },
          { branchEmpCode: { contains: q.q, mode: "insensitive" } },
          { designation: { contains: q.q, mode: "insensitive" } },
        ],
      });
    }

    const rows = await this.prisma.staffAssignment.findMany({
      where,
      orderBy: [{ staff: { name: "asc" } }],
      select: {
        staffId: true,
        branchEmpCode: true,
        designation: true,
        specialty: { select: { id: true, code: true, name: true, kind: true } },
        staff: { select: { name: true } },
      },
      take: 200,
    });

    // Normalize to the legacy shape expected by the UI.
    return rows.map((r) => ({
      id: r.staffId,
      empCode: r.branchEmpCode ?? null,
      name: r.staff.name,
      designation: r.designation ?? null,
      specialty: r.specialty ?? null,
    }));
  }
}
