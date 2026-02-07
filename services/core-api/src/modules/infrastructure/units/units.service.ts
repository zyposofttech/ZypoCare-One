import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import { LocationService } from "../location/location.service";
import type { CreateUnitDto, UpdateUnitDto } from "./dto";
import { assertUnitCode } from "../../../common/naming.util";

const LOCATION_KIND_RANK: Record<string, number> = {
  CAMPUS: 1,
  BUILDING: 2,
  FLOOR: 3,
  ZONE: 4,
  AREA: 5,
};

function kindRank(kind?: string | null) {
  if (!kind) return 0;
  return LOCATION_KIND_RANK[kind] ?? 0;
}

type DeptLocNode = {
  locationNodeId: string;
  kind: string;
  isPrimary: boolean;
};

@Injectable()
export class UnitsService {
  constructor(private readonly ctx: InfraContextService, private readonly locationSvc: LocationService) {}

  async getUnit(principal: Principal, id: string) {
  const unit = await this.ctx.prisma.unit.findFirst({
    where: { id },
    include: {
      rooms: { orderBy: [{ code: "asc" }] },
      resources: { orderBy: [{ code: "asc" }] },
      department: true,
      unitType: true,
      locationNode: {
        include: {
          revisions: {
            orderBy: [{ effectiveFrom: "desc" }],
            take: 1,
          },
        },
      },
    },
  });
  if (!unit) throw new NotFoundException("Unit not found");

  // ✅ Works for GLOBAL principals because we pass unit.branchId
  this.ctx.resolveBranchId(principal, unit.branchId);

  // ✅ Derived capability fields at TOP-LEVEL Unit JSON (explicit API shape)
  const hasRooms = (unit as any).unitType?.usesRoomsDefault ?? (unit as any).usesRooms ?? false;
  const canScheduleAppointments = (unit as any).unitType?.schedulableByDefault ?? false;
  const requiresBedAssignment = (unit as any).unitType?.bedBasedDefault ?? false;

  return {
    ...unit,
    hasRooms,
    canScheduleAppointments,
    requiresBedAssignment,
  } as any;
}


  private async resolveBranchIdForGlobal(principal: Principal, branchIdParam?: string | null, opts?: { departmentId?: string | null }) {
    // Primary: explicit branchId
    if (branchIdParam) return this.ctx.resolveBranchId(principal, branchIdParam);

    // Fallback: infer from departmentId (useful for GLOBAL calls where UI didn’t pass branchId)
    if (opts?.departmentId) {
      const dept = await this.ctx.prisma.department.findUnique({
        where: { id: opts.departmentId },
        select: { id: true, branchId: true },
      });
      if (!dept) throw new BadRequestException("Invalid departmentId");
      return this.ctx.resolveBranchId(principal, dept.branchId);
    }

    // No inference possible
    return this.ctx.resolveBranchId(principal, null);
  }

  private async assertUnitNameUniqueWithinDepartment(departmentId: string, name: string, excludeId?: string) {
    const found = await this.ctx.prisma.unit.findFirst({
      where: {
        departmentId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        name: { equals: name, mode: "insensitive" },
      },
      select: { id: true, code: true, name: true },
    });
    if (found) {
      throw new ConflictException(`Unit name must be unique within department. Already exists: ${found.code} — ${found.name}`);
    }
  }

  private async getActiveDepartmentLocationNodes(branchId: string, departmentId: string): Promise<DeptLocNode[]> {
    const at = new Date();
    const rows = await this.ctx.prisma.departmentLocation.findMany({
      where: { departmentId, isActive: true, locationNode: { branchId } },
      select: {
        isPrimary: true,
        locationNodeId: true,
        locationNode: {
          select: {
            id: true,
            kind: true,
            revisions: {
              where: { effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] },
              orderBy: [{ effectiveFrom: "desc" }],
              take: 1,
              select: { isActive: true },
            },
          },
        },
      },
    });

    if (!rows.length) return [];

    for (const r of rows) {
      const rev = r.locationNode.revisions?.[0];
      if (!rev) throw new BadRequestException("Department location has no current effective revision");
      if (!rev.isActive) throw new BadRequestException("Department location is inactive; fix department location before adding units.");
    }

    return rows.map((r) => ({
      locationNodeId: r.locationNodeId,
      kind: r.locationNode.kind as any,
      isPrimary: r.isPrimary,
    }));
  }

  private async getLocationAncestrySet(branchId: string, startNodeId: string): Promise<Set<string>> {
    const out = new Set<string>();
    let currentId: string | null = startNodeId;
    const visited = new Set<string>();
    let hops = 0;

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      out.add(currentId);

      hops += 1;
      if (hops > 64) break;

      const node: { parentId: string | null } | null = await this.ctx.prisma.locationNode.findFirst({
        where: { id: currentId, branchId },
        select: { parentId: true },
      });
      if (!node) break;

      currentId = node.parentId ?? null;
    }

    return out;
  }

  private async assertUnitLocationWithinDepartment(branchId: string, departmentId: string, unitLocationNodeId: string) {
    const deptLocs = await this.getActiveDepartmentLocationNodes(branchId, departmentId);
    if (!deptLocs.length) {
      throw new BadRequestException("Department must have an active physical location assigned before units can be created.");
    }

    const ancestry = await this.getLocationAncestrySet(branchId, unitLocationNodeId);

    // Prefer primary dept location when present (better UX/error messages)
    const primary = deptLocs.find((d) => d.isPrimary);
    if (primary && ancestry.has(primary.locationNodeId)) return;

    for (const d of deptLocs) {
      if (ancestry.has(d.locationNodeId)) return;
    }

    throw new BadRequestException("Unit location must be within the department's location (or deeper in the location hierarchy).");
  }

 async listUnits(principal: Principal, q: any) {
  const branchId = await this.resolveBranchIdForGlobal(principal, q.branchId ?? null, {
    departmentId: q.departmentId ?? null,
  });

  const where: any = { branchId };
  if (q.departmentId) where.departmentId = q.departmentId;
  if (q.unitTypeId) where.unitTypeId = q.unitTypeId;
  if (q.locationNodeId) where.locationNodeId = q.locationNodeId;
  if (!q.includeInactive) where.isActive = true;
  if (q.q)
    where.OR = [
      { name: { contains: q.q, mode: "insensitive" } },
      { code: { contains: q.q, mode: "insensitive" } },
    ];

  const at = new Date();

  const rows = await this.ctx.prisma.unit.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      department: { select: { id: true, name: true, code: true } },
      unitType: {
        // ✅ include flags so we can compute derived booleans
        select: {
          id: true,
          code: true,
          name: true,
          usesRoomsDefault: true,
          schedulableByDefault: true,
          bedBasedDefault: true,
        },
      },
      locationNode: {
        select: {
          id: true,
          kind: true,
          parentId: true,
          revisions: {
            where: {
              effectiveFrom: { lte: at },
              OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
            },
            orderBy: [{ effectiveFrom: "desc" }],
            take: 1,
            select: { code: true, name: true, isActive: true, effectiveFrom: true, effectiveTo: true },
          },
        },
      },
    },
  });

  const unitIds = rows.map((u) => u.id);
  const roomCounts = unitIds.length
    ? await this.ctx.prisma.unitRoom.groupBy({
        by: ["unitId"],
        where: { unitId: { in: unitIds }, isActive: true },
        _count: { _all: true },
      })
    : [];
  const roomCountByUnit = new Map(roomCounts.map((r) => [r.unitId, r._count._all]));

  // ✅ Add derived booleans + room counts at TOP-LEVEL Unit JSON
  return rows.map((u) => {
    const hasRooms = u.unitType?.usesRoomsDefault ?? u.usesRooms ?? false;
    const canScheduleAppointments = u.unitType?.schedulableByDefault ?? false;
    const requiresBedAssignment = u.unitType?.bedBasedDefault ?? false;

    return {
      ...u,
      roomsCount: roomCountByUnit.get(u.id) ?? 0,
      hasRooms,
      canScheduleAppointments,
      requiresBedAssignment,
    };
  });
}


  // ✅ Updated: can infer branchId from unitId (perfect for Unit Details screens)
  async listDepartments(principal: Principal, args: { branchId: string | null; unitId: string | null }) {
    let branchId = args.branchId;

    if (!branchId && args.unitId) {
      const unit = await this.ctx.prisma.unit.findUnique({
        where: { id: args.unitId },
        select: { id: true, branchId: true },
      });
      if (!unit) throw new NotFoundException("Unit not found");
      branchId = unit.branchId;
    }

    const resolved = this.ctx.resolveBranchId(principal, branchId ?? null);

    return this.ctx.prisma.department.findMany({
      where: { branchId: resolved, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async createUnit(principal: Principal, dto: CreateUnitDto, branchIdParam?: string | null) {
    // ✅ If branchId isn’t provided, infer from departmentId (GLOBAL safe)
    const branchId = await this.resolveBranchIdForGlobal(principal, branchIdParam ?? null, { departmentId: dto.departmentId });

    const code = assertUnitCode(dto.code);
    const name = dto.name.trim();

    // Department must be ACTIVE and in-branch
    const dept = await this.ctx.prisma.department.findFirst({
      where: { id: dto.departmentId, branchId },
      select: { id: true, isActive: true },
    });
    if (!dept) throw new BadRequestException("Invalid departmentId (must belong to your branch)");
    if (!dept.isActive) throw new BadRequestException("Cannot create unit under an inactive department");

    // Unit name uniqueness within department (blocking)
    await this.assertUnitNameUniqueWithinDepartment(dto.departmentId, name);

    // Friendly code uniqueness error
    const codeDupe = await this.ctx.prisma.unit.findFirst({ where: { branchId, code }, select: { id: true, code: true } });
    if (codeDupe) throw new ConflictException(`Unit code '${code}' already exists in this branch.`);

    const ut = await this.ctx.prisma.unitTypeCatalog.findUnique({
      where: { id: dto.unitTypeId },
      select: { id: true, usesRoomsDefault: true, schedulableByDefault: true, bedBasedDefault: true, isActive: true },
    });
    if (!ut) throw new BadRequestException("Invalid unitTypeId");
    if (!ut.isActive) throw new BadRequestException("Unit type is inactive");

    // Spec: Unit inherits hasRooms flag from unit type (do not allow overrides at create time)
    if (dto.usesRooms != null && dto.usesRooms !== ut.usesRoomsDefault) {
      throw new BadRequestException("usesRooms is derived from the Unit Type Catalog and cannot be overridden.");
    }

    // Validate location node exists + current revision active
    const loc = await this.locationSvc.assertValidLocationNode(branchId, dto.locationNodeId);

    // Spec: unit must be mapped at FLOOR or deeper (not CAMPUS/BUILDING)
    if (kindRank(loc.kind) < LOCATION_KIND_RANK.FLOOR) {
      throw new BadRequestException("Unit location must be at FLOOR/ZONE/AREA level (not CAMPUS/BUILDING).");
    }

    // Spec: unit location must be within the department's location (or deeper)
    await this.assertUnitLocationWithinDepartment(branchId, dto.departmentId, loc.id);

    const usesRooms = ut.usesRoomsDefault;

    // Capacity + onboarding metadata (optional; validated against Unit Type)
    const totalRoomCount = usesRooms ? Math.max(0, Math.floor(dto.totalRoomCount ?? 0)) : 0;
    if (usesRooms && totalRoomCount < 1) {
      throw new BadRequestException("totalRoomCount must be at least 1 for room-based units.");
    }

    const bedBased = !!ut.bedBasedDefault;
    const totalBedCapacity = bedBased ? Math.max(0, Math.floor(dto.totalBedCapacity ?? 0)) : null;
    if (bedBased && (totalBedCapacity ?? 0) < 1) {
      throw new BadRequestException("totalBedCapacity must be at least 1 for bed-based unit types.");
    }

    const created = await this.ctx.prisma.unit.create({
      data: {
        branchId,
        locationNodeId: loc.id,
        departmentId: dto.departmentId,
        unitTypeId: dto.unitTypeId,
        code,
        name,
        usesRooms,
        totalRoomCount,
        totalBedCapacity,
        commissioningDate: dto.commissioningDate ? new Date(dto.commissioningDate) : null,
        floorNumber: dto.floorNumber ?? null,
        wingZone: dto.wingZone?.trim() ? dto.wingZone.trim() : null,
        inchargeStaffId: dto.inchargeStaffId?.trim() ? dto.inchargeStaffId.trim() : null,
        nursingStation: dto.nursingStation?.trim() ? dto.nursingStation.trim() : null,
        isActive: dto.isActive ?? true,
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_UNIT_CREATE",
      entity: "Unit",
      entityId: created.id,
      meta: dto,
    });

    return this.getUnit(principal, created.id);
  }

  async updateUnit(principal: Principal, id: string, dto: UpdateUnitDto) {
    const unit = await this.ctx.prisma.unit.findUnique({
      where: { id },
      select: { id: true, branchId: true, departmentId: true, unitTypeId: true, usesRooms: true },
    });
    if (!unit) throw new NotFoundException("Unit not found");

    const branchId = this.ctx.resolveBranchId(principal, unit.branchId);

    const ut = await this.ctx.prisma.unitTypeCatalog.findUnique({
      where: { id: unit.unitTypeId },
      select: { id: true, bedBasedDefault: true },
    });
    if (!ut) throw new BadRequestException("Unit type is missing (cannot validate capacity)");

    // Keep deactivation flow consistent (reason + blockers live in deactivateUnit)
    if (dto.isActive === false) {
      throw new BadRequestException("Use DELETE /infra/units/:id?cascade=true&reason=... to deactivate a unit.");
    }

    // Spec: usesRooms is derived and immutable after creation
    if (dto.usesRooms != null && dto.usesRooms !== unit.usesRooms) {
      throw new BadRequestException("usesRooms cannot be changed after creation.");
    }

    if (dto.name != null) {
      const name = dto.name.trim();
      await this.assertUnitNameUniqueWithinDepartment(unit.departmentId, name, unit.id);
    }

    if (dto.locationNodeId) {
      const loc = await this.locationSvc.assertValidLocationNode(branchId, dto.locationNodeId);

      if (kindRank(loc.kind) < LOCATION_KIND_RANK.FLOOR) {
        throw new BadRequestException("Unit location must be at FLOOR/ZONE/AREA level (not CAMPUS/BUILDING).");
      }

      await this.assertUnitLocationWithinDepartment(branchId, unit.departmentId, loc.id);
    }

    // Capacity validations (only when provided)
    if (dto.totalRoomCount !== undefined) {
      const v = Math.max(0, Math.floor(dto.totalRoomCount ?? 0));
      if (unit.usesRooms && v < 1) {
        throw new BadRequestException("totalRoomCount must be at least 1 for room-based units.");
      }
    }

    if (dto.totalBedCapacity !== undefined) {
      const v = Math.max(0, Math.floor(dto.totalBedCapacity ?? 0));
      if (ut.bedBasedDefault && v < 1) {
        throw new BadRequestException("totalBedCapacity must be at least 1 for bed-based unit types.");
      }
    }

    await this.ctx.prisma.unit.update({
      where: { id },
      data: {
        ...(dto.locationNodeId ? { locationNodeId: dto.locationNodeId } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.totalRoomCount !== undefined
          ? { totalRoomCount: unit.usesRooms ? Math.max(0, Math.floor(dto.totalRoomCount ?? 0)) : 0 }
          : {}),
        ...(dto.totalBedCapacity !== undefined
          ? { totalBedCapacity: dto.totalBedCapacity == null ? null : Math.max(0, Math.floor(dto.totalBedCapacity)) }
          : {}),
        ...(dto.commissioningDate !== undefined
          ? { commissioningDate: dto.commissioningDate ? new Date(dto.commissioningDate) : null }
          : {}),
        ...(dto.floorNumber !== undefined ? { floorNumber: dto.floorNumber ?? null } : {}),
        ...(dto.wingZone !== undefined ? { wingZone: dto.wingZone?.trim() ? dto.wingZone.trim() : null } : {}),
        ...(dto.inchargeStaffId !== undefined
          ? { inchargeStaffId: dto.inchargeStaffId?.trim() ? dto.inchargeStaffId.trim() : null }
          : {}),
        ...(dto.nursingStation !== undefined
          ? { nursingStation: dto.nursingStation?.trim() ? dto.nursingStation.trim() : null }
          : {}),
        // usesRooms intentionally immutable here
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_UNIT_UPDATE",
      entity: "Unit",
      entityId: id,
      meta: dto,
    });

    return this.getUnit(principal, id);
  }

  async deactivateUnit(principal: Principal, unitId: string, opts: { hard?: boolean; cascade?: boolean; reason?: string } = {}) {
    const unit = await this.ctx.prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true, branchId: true, isActive: true },
    });
    if (!unit) throw new NotFoundException("Unit not found");

    const branchId = this.ctx.resolveBranchId(principal, unit.branchId);

    const hard = !!opts.hard;
    const cascade = opts.cascade !== false;

    if (hard) {
      const roomCount = await this.ctx.prisma.unitRoom.count({ where: { unitId } });
      const resCount = await this.ctx.prisma.unitResource.count({ where: { unitId } });

      if (roomCount || resCount) {
        throw new ConflictException(
          `Cannot hard delete unit: ${roomCount} rooms and ${resCount} resources exist. Deactivate (soft) or remove dependencies first.`,
        );
      }

      await this.ctx.prisma.unit.delete({ where: { id: unitId } });

      await this.ctx.audit.log({
        branchId,
        actorUserId: principal.userId,
        action: "UNIT_DELETE_HARD",
        entity: "Unit",
        entityId: unit.id,
        meta: { hard: true },
      });

      return { ok: true, hardDeleted: true };
    }

    const reason = (opts.reason ?? "").trim();
    if (!reason) throw new BadRequestException("Deactivation reason is required.");

    // Block deactivation if there are future scheduled procedures in this unit
    const now = new Date();
    const scheduled = await this.ctx.prisma.procedureBooking.count({
      where: {
        unitId,
        status: "SCHEDULED",
        endAt: { gt: now },
      },
    });
    if (scheduled > 0) {
      throw new ConflictException(`Cannot deactivate unit: ${scheduled} scheduled procedure booking(s) exist.`);
    }

    // Block if any active resources are RESERVED/OCCUPIED
    const busyResources = await this.ctx.prisma.unitResource.count({
      where: { unitId, isActive: true, state: { in: ["RESERVED", "OCCUPIED"] } },
    });
    if (busyResources > 0) {
      throw new ConflictException(`Cannot deactivate unit: ${busyResources} resource(s) are RESERVED/OCCUPIED.`);
    }

    const updated = await this.ctx.prisma.unit.update({
      where: { id: unitId },
      data: { isActive: false },
      select: { id: true, branchId: true, isActive: true, code: true, name: true },
    });

    if (cascade) {
      await this.ctx.prisma.unitRoom.updateMany({ where: { unitId }, data: { isActive: false } });
      await this.ctx.prisma.unitResource.updateMany({ where: { unitId }, data: { isActive: false, state: "INACTIVE" } });
    }

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "UNIT_DEACTIVATE",
      entity: "Unit",
      entityId: updated.id,
      meta: { hard: false, cascade, reason },
    });

    return updated;
  }
}
