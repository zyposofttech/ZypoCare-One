import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PrismaClient } from "@excelcare/db";
import type { Principal } from "../auth/access-policy.service";
import { AuditService } from "../audit/audit.service";
import { PolicyEngineService } from "../policy-engine/policy-engine.service";
import { INFRA_POLICY, ProcedurePrecheckPolicyPayload } from "./infrastructure.constants";

import {
  assertLocationCode,
  assertResourceCode,
  assertRoomCode,
  assertUnitCode,
  canonicalizeCode,
} from "../../common/naming.util";

import type {
  CreateChargeMasterItemDto,
  CreateDowntimeDto,
  CreateEquipmentAssetDto,
  CreateLocationNodeDto,
  CreateProcedureBookingDto,
  CreateServiceItemDto,
  CreateUnitDto,
  CreateUnitResourceDto,
  CreateUnitRoomDto,
  RunGoLiveDto,
  UpdateEquipmentAssetDto,
  UpdateLocationNodeDto,
  UpdateUnitDto,
  UpdateUnitResourceDto,
  UpdateUnitRoomDto,
  UpsertServiceChargeMappingDto,
  ValidateImportDto,
  UpdateFixItDto,
} from "./infrastructure.dto";

function uniq(ids: string[]) {
  return Array.from(new Set((ids || []).map((x) => String(x)).filter(Boolean)));
}

function overlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

@Injectable()
export class InfrastructureService {
  constructor(
    @Inject("PRISMA") private prisma: PrismaClient,
    private audit: AuditService,
    private policyEngine: PolicyEngineService,
  ) { }

  private resolveBranchId(principal: Principal, requestedBranchId?: string | null) {
    if (principal.roleScope === "BRANCH") {
      if (!principal.branchId) throw new ForbiddenException("Branch-scoped principal missing branchId");
      if (requestedBranchId && requestedBranchId !== principal.branchId) throw new ForbiddenException("Cannot access another branch");
      return principal.branchId;
    }
    if (!requestedBranchId) throw new BadRequestException("branchId is required for global operations");
    return requestedBranchId;
  }

  // ---------------------------------------------------------------------------
  // Locations (effective-dated via revisions)
  // ---------------------------------------------------------------------------

  async listLocations(principal: Principal, q: { branchId?: string; kind?: string; at?: string }) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);
    const at = q.at ? new Date(q.at) : new Date();

    const nodes = await this.prisma.locationNode.findMany({
      where: {
        branchId,
        ...(q.kind ? { kind: q.kind as any } : {}),
      },
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      include: {
        revisions: {
          where: {
            effectiveFrom: { lte: at },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
          },
          orderBy: [{ effectiveFrom: "desc" }],
          take: 1,
        },
      },
    });

    return nodes.map((n) => ({
      id: n.id,
      branchId: n.branchId,
      kind: n.kind,
      parentId: n.parentId,
      current: n.revisions[0] ?? null,
    }));
  }

  async getLocationTree(principal: Principal, branchIdParam: string, at?: string) {
    const branchId = this.resolveBranchId(principal, branchIdParam ?? null);
    const when = at ? new Date(at) : new Date();

    const nodes = await this.prisma.locationNode.findMany({
      where: { branchId },
      select: {
        id: true,
        kind: true,
        parentId: true,
        revisions: {
          where: {
            effectiveFrom: { lte: when },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: when } }],
          },
          orderBy: [{ effectiveFrom: "desc" }],
          take: 1,
          select: { code: true, name: true, isActive: true, effectiveFrom: true, effectiveTo: true },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    type TreeNode = {
      id: string;
      kind: any;
      parentId: string | null;
      code: string;
      name: string;
      isActive: boolean;
      effectiveFrom: Date;
      effectiveTo: Date | null;
      children: TreeNode[];
    };

    const byId = new Map<string, TreeNode>();

    for (const n of nodes) {
      const cur = n.revisions?.[0];
      if (!cur) continue;
      byId.set(n.id, {
        id: n.id,
        kind: n.kind,
        parentId: n.parentId ?? null,
        code: cur.code,
        name: cur.name,
        isActive: cur.isActive,
        effectiveFrom: cur.effectiveFrom,
        effectiveTo: cur.effectiveTo,
        children: [],
      });
    }

    const roots: TreeNode[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortRec = (arr: TreeNode[]) => {
      arr.sort((a, b) => a.code.localeCompare(b.code));
      for (const x of arr) sortRec(x.children);
    };
    sortRec(roots);

    return roots;
  }
  private async assertLocationCodeUnique(branchId: string, code: string, effectiveFrom: Date, effectiveTo: Date | null, excludeNodeId?: string) {
    // Ensure no OTHER node has an overlapping effective revision with the same code.
    const overlaps = await this.prisma.locationNodeRevision.findMany({
      where: {
        code,
        node: {
          branchId,
          ...(excludeNodeId ? { id: { not: excludeNodeId } } : {}),
        },
        // overlap with (effectiveFrom, effectiveTo)
        effectiveFrom: { lt: effectiveTo ?? new Date("9999-12-31T00:00:00.000Z") },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
      },
      select: { id: true, nodeId: true, effectiveFrom: true, effectiveTo: true },
      take: 1,
    });

    if (overlaps.length) {
      throw new BadRequestException(`Location code "${code}" already exists for an overlapping effective period.`);
    }
  }

  async createLocation(principal: Principal, dto: CreateLocationNodeDto, branchIdParam: string) {
    const branchId = this.resolveBranchId(principal, branchIdParam ?? null);

    const parent = dto.parentId
      ? await this.prisma.locationNode.findFirst({ where: { id: dto.parentId, branchId }, select: { id: true, kind: true } })
      : null;

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    const rawCode = canonicalizeCode(dto.code);
    // Strict numeric zone enforcement is inside assertLocationCode() (ZONE => Z##).
    const code = assertLocationCode(dto.kind as any, rawCode, parent ? (await this.getCurrentLocationCode(parent.id, new Date())) : undefined);

    // Enforce code uniqueness (effective-dated)
    await this.assertLocationCodeUnique(branchId, code, effectiveFrom, effectiveTo, undefined);

    const node = await this.prisma.locationNode.create({
      data: {
        branchId,
        kind: dto.kind as any,
        parentId: dto.parentId ?? null,
        revisions: {
          create: {
            code,
            name: dto.name.trim(),
            isActive: dto.isActive ?? true,
            effectiveFrom,
            effectiveTo,
            createdByUserId: principal.userId,
          },
        },
      },
      include: { revisions: { orderBy: [{ effectiveFrom: "desc" }], take: 1 } },
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_LOCATION_CREATE",
      entity: "LocationNode",
      entityId: node.id,
      meta: dto,
    });

    return { id: node.id, kind: node.kind, parentId: node.parentId, current: node.revisions[0] };
  }

  private async getCurrentLocationCode(nodeId: string, at: Date): Promise<string> {
    const rev = await this.prisma.locationNodeRevision.findFirst({
      where: {
        nodeId,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
      },
      orderBy: [{ effectiveFrom: "desc" }],
      select: { code: true },
    });
    if (!rev) throw new BadRequestException("Parent location has no effective revision");
    return rev.code;
  }

  async updateLocation(principal: Principal, id: string, dto: UpdateLocationNodeDto) {
    const node = await this.prisma.locationNode.findUnique({ where: { id }, select: { id: true, branchId: true, kind: true, parentId: true } });
    if (!node) throw new NotFoundException("Location not found");

    const branchId = this.resolveBranchId(principal, node.branchId);

    const now = new Date();
    const current = await this.prisma.locationNodeRevision.findFirst({
      where: { nodeId: id, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
      orderBy: [{ effectiveFrom: "desc" }],
    });
    if (!current) throw new BadRequestException("No current effective revision found");

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : now;
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    let nextCode = current.code;
    if (dto.code) {
      // effective-dated code change (allowed)
      const parentCode = node.parentId ? await this.getCurrentLocationCode(node.parentId, effectiveFrom) : undefined;
      nextCode = assertLocationCode(node.kind as any, canonicalizeCode(dto.code), parentCode);
    }

    // Ensure unique code for overlapping period
    await this.assertLocationCodeUnique(branchId, nextCode, effectiveFrom, effectiveTo, node.id);

    // Close current revision if needed and create a new revision
    const newRev = await this.prisma.$transaction(async (tx) => {
      // Close current effective range at effectiveFrom (only if current overlaps)
      if (current.effectiveTo == null || current.effectiveTo > effectiveFrom) {
        await tx.locationNodeRevision.update({
          where: { id: current.id },
          data: { effectiveTo: effectiveFrom },
        });
      }

      return tx.locationNodeRevision.create({
        data: {
          nodeId: node.id,
          code: nextCode,
          name: (dto.name ?? current.name).trim(),
          isActive: dto.isActive ?? current.isActive,
          effectiveFrom,
          effectiveTo,
          createdByUserId: principal.userId,
        },
      });
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_LOCATION_UPDATE",
      entity: "LocationNode",
      entityId: node.id,
      meta: dto,
    });

    return { id: node.id, kind: node.kind, parentId: node.parentId, current: newRev };
  }



  // ---------------------------------------------------------------------------
  // Unit Type catalog + enablement
  // ---------------------------------------------------------------------------

  async listUnitTypeCatalog(_principal: Principal) {
    return this.prisma.unitTypeCatalog.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, usesRoomsDefault: true, schedulableByDefault: true },
    });
  }

  async getBranchUnitTypes(principal: Principal, branchIdParam?: string) {
    const branchId = this.resolveBranchId(principal, branchIdParam ?? null);

    const links = await this.prisma.branchUnitType.findMany({
      where: { branchId },
      include: { unitType: true },
      orderBy: [{ unitType: { sortOrder: "asc" } }, { unitType: { name: "asc" } }],
    });

    return links.map((l) => ({
      id: l.id,
      unitTypeId: l.unitTypeId,
      isEnabled: l.isEnabled,
      enabledAt: l.enabledAt,
      unitType: {
        id: l.unitType.id,
        code: l.unitType.code,
        name: l.unitType.name,
        usesRoomsDefault: l.unitType.usesRoomsDefault,
        schedulableByDefault: l.unitType.schedulableByDefault,
      },
    }));
  }

  async setBranchUnitTypes(principal: Principal, unitTypeIdsRaw: string[], branchIdParam?: string) {
    const branchId = this.resolveBranchId(principal, branchIdParam ?? null);
    const unitTypeIds = uniq(unitTypeIdsRaw);

    if (!unitTypeIds.length) throw new BadRequestException("unitTypeIds cannot be empty (you want all unit types day-1)");

    const valid = await this.prisma.unitTypeCatalog.findMany({ where: { id: { in: unitTypeIds }, isActive: true }, select: { id: true } });
    const ok = new Set(valid.map((v) => v.id));
    const bad = unitTypeIds.filter((x) => !ok.has(x));
    if (bad.length) throw new BadRequestException(`Unknown/inactive unitTypeIds: ${bad.join(", ")}`);

    const current = await this.prisma.branchUnitType.findMany({
      where: { branchId },
      select: { unitTypeId: true, isEnabled: true },
    });

    const enabledNow = new Set(current.filter((x) => x.isEnabled).map((x) => x.unitTypeId));
    const desired = new Set(unitTypeIds);

    const toDisable = Array.from(enabledNow).filter((id) => !desired.has(id));
    const toEnable = unitTypeIds.filter((id) => !enabledNow.has(id));

    await this.prisma.$transaction(async (tx) => {
      if (toDisable.length) {
        await tx.branchUnitType.updateMany({
          where: { branchId, unitTypeId: { in: toDisable } },
          data: { isEnabled: false },
        });
      }

      for (const id of toEnable) {
        await tx.branchUnitType.upsert({
          where: { branchId_unitTypeId: { branchId, unitTypeId: id } },
          update: { isEnabled: true, enabledAt: new Date() },
          create: { branchId, unitTypeId: id, isEnabled: true, enabledAt: new Date() },
        });
      }
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_UNITTYPE_SET",
      entity: "Branch",
      entityId: branchId,
      meta: { enabled: unitTypeIds },
    });

    return this.getBranchUnitTypes(principal, branchId);
  }

  // ---------------------------------------------------------------------------
  // Units / Rooms / Resources (naming convention enforced)
  // ---------------------------------------------------------------------------

  async listUnits(principal: Principal, q: any) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId };
    if (q.departmentId) where.departmentId = q.departmentId;
    if (q.unitTypeId) where.unitTypeId = q.unitTypeId;
    if (!q.includeInactive) where.isActive = true;
    if (q.q) where.OR = [{ name: { contains: q.q, mode: "insensitive" } }, { code: { contains: q.q, mode: "insensitive" } }];

    return this.prisma.unit.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: { department: { select: { id: true, name: true, code: true } }, unitType: { select: { id: true, code: true, name: true } } },
    });
  }

  async createUnit(principal: Principal, dto: CreateUnitDto) {
    const branchId = this.resolveBranchId(principal, null);

    const code = assertUnitCode(dto.code);
    const dept = await this.prisma.department.findFirst({ where: { id: dto.departmentId, branchId }, select: { id: true } });
    if (!dept) throw new BadRequestException("Invalid departmentId (must belong to your branch)");

    const ut = await this.prisma.unitTypeCatalog.findUnique({ where: { id: dto.unitTypeId }, select: { id: true, usesRoomsDefault: true } });
    if (!ut) throw new BadRequestException("Invalid unitTypeId");

    const created = await this.prisma.unit.create({
      data: {
        branchId,
        departmentId: dto.departmentId,
        unitTypeId: dto.unitTypeId,
        code,
        name: dto.name.trim(),
        usesRooms: dto.usesRooms ?? ut.usesRoomsDefault,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_UNIT_CREATE", entity: "Unit", entityId: created.id, meta: dto });
    return created;
  }

  async updateUnit(principal: Principal, id: string, dto: UpdateUnitDto) {
    const unit = await this.prisma.unit.findUnique({ where: { id }, select: { id: true, branchId: true } });
    if (!unit) throw new NotFoundException("Unit not found");

    const branchId = this.resolveBranchId(principal, unit.branchId);

    const updated = await this.prisma.unit.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        usesRooms: dto.usesRooms,
        isActive: dto.isActive,
      },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_UNIT_UPDATE", entity: "Unit", entityId: id, meta: dto });
    return updated;
  }

  async listRooms(principal: Principal, unitId: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId }, select: { id: true, branchId: true } });
    if (!unit) throw new NotFoundException("Unit not found");
    this.resolveBranchId(principal, unit.branchId);

    return this.prisma.unitRoom.findMany({ where: { unitId }, orderBy: [{ code: "asc" }] });
  }

  async createRoom(principal: Principal, dto: CreateUnitRoomDto) {
    const unit = await this.prisma.unit.findUnique({ where: { id: dto.unitId }, select: { id: true, branchId: true, code: true, usesRooms: true } });
    if (!unit) throw new NotFoundException("Unit not found");
    const branchId = this.resolveBranchId(principal, unit.branchId);
    if (!unit.usesRooms) throw new BadRequestException("This unit is configured as open-bay (usesRooms=false). Rooms are not allowed.");

    const code = assertRoomCode(unit.code, dto.code);

    const created = await this.prisma.unitRoom.create({
      data: {
        unitId: unit.id,
        branchId,
        code,
        name: dto.name.trim(),
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_ROOM_CREATE", entity: "UnitRoom", entityId: created.id, meta: dto });
    return created;
  }

  async updateRoom(principal: Principal, id: string, dto: UpdateUnitRoomDto) {
    const room = await this.prisma.unitRoom.findUnique({ where: { id }, select: { id: true, branchId: true } });
    if (!room) throw new NotFoundException("Room not found");
    const branchId = this.resolveBranchId(principal, room.branchId);

    const updated = await this.prisma.unitRoom.update({
      where: { id },
      data: { name: dto.name?.trim(), isActive: dto.isActive },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_ROOM_UPDATE", entity: "UnitRoom", entityId: id, meta: dto });
    return updated;
  }

  async listResources(principal: Principal, q: { unitId: string; roomId: string | null }) {
    const unit = await this.prisma.unit.findUnique({ where: { id: q.unitId }, select: { id: true, branchId: true } });
    if (!unit) throw new NotFoundException("Unit not found");
    this.resolveBranchId(principal, unit.branchId);

    return this.prisma.unitResource.findMany({
      where: { unitId: q.unitId, ...(q.roomId ? { roomId: q.roomId } : {}) },
      orderBy: [{ code: "asc" }],
    });
  }

  async createResource(principal: Principal, dto: CreateUnitResourceDto) {
    const unit = await this.prisma.unit.findUnique({ where: { id: dto.unitId }, select: { id: true, branchId: true, code: true, usesRooms: true } });
    if (!unit) throw new NotFoundException("Unit not found");
    const branchId = this.resolveBranchId(principal, unit.branchId);

    const room = dto.roomId
      ? await this.prisma.unitRoom.findUnique({ where: { id: dto.roomId }, select: { id: true, unitId: true, code: true } })
      : null;

    if (dto.roomId && (!room || room.unitId !== unit.id)) throw new BadRequestException("Invalid roomId for this unit");

    if (unit.usesRooms && !room) throw new BadRequestException("This unit uses rooms; roomId is required for resources.");
    if (!unit.usesRooms && room) throw new BadRequestException("This unit is open-bay; roomId must be null.");

    const code = assertResourceCode({
      unitCode: unit.code,
      roomCode: room?.code ?? null,
      resourceType: dto.resourceType as any,
      resourceCode: dto.code,
    });

    const created = await this.prisma.unitResource.create({
      data: {
        branchId,
        unitId: unit.id,
        roomId: room?.id ?? null,
        resourceType: dto.resourceType as any,
        code,
        name: dto.name.trim(),
        state: "AVAILABLE",
        isActive: dto.isActive ?? true,
        isSchedulable: dto.isSchedulable ?? (dto.resourceType !== "BED"),
      },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_RESOURCE_CREATE", entity: "UnitResource", entityId: created.id, meta: dto });
    return created;
  }

  async updateResource(principal: Principal, id: string, dto: UpdateUnitResourceDto) {
    const res = await this.prisma.unitResource.findUnique({ where: { id }, select: { id: true, branchId: true } });
    if (!res) throw new NotFoundException("Resource not found");
    const branchId = this.resolveBranchId(principal, res.branchId);

    const updated = await this.prisma.unitResource.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        isActive: dto.isActive,
        isSchedulable: dto.isSchedulable,
      },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_RESOURCE_UPDATE", entity: "UnitResource", entityId: id, meta: dto });
    return updated;
  }

  async setResourceState(principal: Principal, id: string, nextState: any) {
    const res = await this.prisma.unitResource.findUnique({
      where: { id },
      select: { id: true, branchId: true, resourceType: true, state: true },
    });
    if (!res) throw new NotFoundException("Resource not found");
    const branchId = this.resolveBranchId(principal, res.branchId);

    // Enforce discharge/housekeeping gating for beds (policy-configurable later)
    if (res.resourceType === "BED") {
      const allowed = new Set(["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE", "INACTIVE"]);
      if (!allowed.has(nextState)) throw new BadRequestException("Invalid state");

      // Strict gating: OCCUPIED cannot jump to AVAILABLE directly
      if (res.state === "OCCUPIED" && nextState === "AVAILABLE") {
        throw new BadRequestException("Bed cannot move from OCCUPIED to AVAILABLE directly. Must go through CLEANING (housekeeping gate).");
      }
    }

    const updated = await this.prisma.unitResource.update({ where: { id }, data: { state: nextState } });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_RESOURCE_STATE_UPDATE",
      entity: "UnitResource",
      entityId: id,
      meta: { from: res.state, to: nextState },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Equipment (AERB/PCPNDT hard blockers before schedulable)
  // ---------------------------------------------------------------------------

  private enforceEquipmentSchedulable(dto: { category: string; isSchedulable?: boolean; aerbLicenseNo?: string | null; aerbValidTo?: string | null; pcpndtRegNo?: string | null; pcpndtValidTo?: string | null; }) {
    if (!dto.isSchedulable) return; // if not schedulable, no blocker required

    if (dto.category === "RADIOLOGY") {
      if (!dto.aerbLicenseNo || !dto.aerbValidTo) {
        throw new BadRequestException("AERB compliance is required before RADIOLOGY equipment can be schedulable.");
      }
    }
    if (dto.category === "ULTRASOUND") {
      if (!dto.pcpndtRegNo || !dto.pcpndtValidTo) {
        throw new BadRequestException("PCPNDT compliance is required before ULTRASOUND equipment can be schedulable.");
      }
    }
  }

  async listEquipment(principal: Principal, q: { branchId?: string; q?: string }) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId };
    if (q.q) where.OR = [{ name: { contains: q.q, mode: "insensitive" } }, { code: { contains: q.q, mode: "insensitive" } }];

    return this.prisma.equipmentAsset.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: { downtimeTickets: { orderBy: [{ openedAt: "desc" }], take: 5 } },
    });
  }

  async createEquipment(principal: Principal, dto: CreateEquipmentAssetDto, branchIdParam?: string) {
    const branchId = this.resolveBranchId(principal, branchIdParam ?? null);
    const code = canonicalizeCode(dto.code);

    this.enforceEquipmentSchedulable(dto);

    const created = await this.prisma.equipmentAsset.create({
      data: {
        branchId,
      code: dto.code,
      name: dto.name,
      category: dto.category,
      make: dto.make,
      model: dto.model,
      serial: dto.serial,
      ownerDepartmentId: dto.ownerDepartmentId,
      locationNodeId: dto.locationNodeId ?? null,
      unitId: dto.unitId ?? null,
      roomId: dto.roomId ?? null,
      operationalStatus: dto.operationalStatus,
      amcVendor: dto.amcVendor ?? null,
      amcValidFrom: dto.amcValidFrom ? new Date(dto.amcValidFrom) : null,
      amcValidTo: dto.amcValidTo ? new Date(dto.amcValidTo) : null,
      warrantyValidTo: dto.warrantyValidTo ? new Date(dto.warrantyValidTo) : null,
      pmFrequencyDays: dto.pmFrequencyDays ?? null,
      nextPmDueAt: dto.nextPmDueAt ? new Date(dto.nextPmDueAt) : null,
      aerbLicenseNo: dto.aerbLicenseNo ?? null,
      aerbValidTo: dto.aerbValidTo ? new Date(dto.aerbValidTo) : null,
      pcpndtRegNo: dto.pcpndtRegNo ?? null,
      pcpndtValidTo: dto.pcpndtValidTo ? new Date(dto.pcpndtValidTo) : null,
      isSchedulable: dto.isSchedulable ?? false,
      },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_EQUIPMENT_CREATE", entity: "EquipmentAsset", entityId: created.id, meta: dto });
    return created;
  }

  async updateEquipment(principal: Principal, id: string, dto: UpdateEquipmentAssetDto) {
    const asset = await this.prisma.equipmentAsset.findUnique({ where: { id }, select: { id: true, branchId: true, category: true } });
    if (!asset) throw new NotFoundException("Equipment not found");

    const branchId = this.resolveBranchId(principal, asset.branchId);

    // combine category for enforcement
    const category = (dto.category ?? asset.category) as any;
    this.enforceEquipmentSchedulable({
      category,
      isSchedulable: dto.isSchedulable,
      aerbLicenseNo: dto.aerbLicenseNo,
      aerbValidTo: dto.aerbValidTo ?? null,
      pcpndtRegNo: dto.pcpndtRegNo,
      pcpndtValidTo: dto.pcpndtValidTo ?? null,
    });

    const updated = await this.prisma.equipmentAsset.update({
      where: { id },
      data: {
        // code changes discouraged; allow only if you want (keeping here optional)
        code: dto.code ? canonicalizeCode(dto.code) : undefined,
        name: dto.name?.trim(),
        category: dto.category as any,
        make: dto.make ?? undefined,
        model: dto.model ?? undefined,
        serial: dto.serial ?? undefined,
        ownerDepartmentId: dto.ownerDepartmentId ?? undefined,
        unitId: dto.unitId ?? undefined,
        roomId: dto.roomId ?? undefined,
        locationNodeId: dto.locationNodeId ?? undefined,
        operationalStatus: dto.operationalStatus as any,
        amcVendor: dto.amcVendor ?? undefined,
        amcValidFrom: dto.amcValidFrom ? new Date(dto.amcValidFrom) : (dto.amcValidFrom === null ? null : undefined),
        amcValidTo: dto.amcValidTo ? new Date(dto.amcValidTo) : (dto.amcValidTo === null ? null : undefined),
        warrantyValidTo: dto.warrantyValidTo ? new Date(dto.warrantyValidTo) : (dto.warrantyValidTo === null ? null : undefined),
        pmFrequencyDays: dto.pmFrequencyDays ?? undefined,
        nextPmDueAt: dto.nextPmDueAt ? new Date(dto.nextPmDueAt) : (dto.nextPmDueAt === null ? null : undefined),
        aerbLicenseNo: dto.aerbLicenseNo ?? undefined,
        aerbValidTo: dto.aerbValidTo ? new Date(dto.aerbValidTo) : (dto.aerbValidTo === null ? null : undefined),
        pcpndtRegNo: dto.pcpndtRegNo ?? undefined,
        pcpndtValidTo: dto.pcpndtValidTo ? new Date(dto.pcpndtValidTo) : (dto.pcpndtValidTo === null ? null : undefined),
        isSchedulable: dto.isSchedulable ?? undefined,
      },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_EQUIPMENT_UPDATE", entity: "EquipmentAsset", entityId: id, meta: dto });
    return updated;
  }

  async openDowntime(principal: Principal, dto: CreateDowntimeDto) {
    const asset = await this.prisma.equipmentAsset.findUnique({ where: { id: dto.assetId }, select: { id: true, branchId: true } });
    if (!asset) throw new NotFoundException("Equipment not found");
    const branchId = this.resolveBranchId(principal, asset.branchId);

    const ticket = await this.prisma.downtimeTicket.create({
      data: { assetId: dto.assetId, reason: dto.reason.trim(), notes: dto.notes ?? null },
    });

    await this.prisma.equipmentAsset.update({ where: { id: dto.assetId }, data: { operationalStatus: "DOWN" as any } });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_EQUIPMENT_DOWNTIME_OPEN", entity: "DowntimeTicket", entityId: ticket.id, meta: dto });
    return ticket;
  }

  async closeDowntime(principal: Principal, dto: { ticketId: string; notes?: string }) {
    const ticket = await this.prisma.downtimeTicket.findUnique({
      where: { id: dto.ticketId },
      include: { asset: { select: { id: true, branchId: true } } },
    });
    if (!ticket) throw new NotFoundException("Downtime ticket not found");
    const branchId = this.resolveBranchId(principal, ticket.asset.branchId);

    const updated = await this.prisma.downtimeTicket.update({
      where: { id: dto.ticketId },
      data: { status: "CLOSED" as any, notes: dto.notes ?? undefined, closedAt: new Date() },
    });

    await this.prisma.equipmentAsset.update({ where: { id: ticket.assetId }, data: { operationalStatus: "OPERATIONAL" as any } });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_EQUIPMENT_DOWNTIME_CLOSE", entity: "DowntimeTicket", entityId: updated.id, meta: dto });
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Charge Master + Service Items + Fix-It (unmapped => Fix-It queue)
  // ---------------------------------------------------------------------------

  async createChargeMasterItem(principal: Principal, dto: CreateChargeMasterItemDto, branchIdParam: string) {
    const branchId = this.resolveBranchId(principal, branchIdParam ?? null);
    const code = canonicalizeCode(dto.code);

    const created = await this.prisma.chargeMasterItem.create({
      data: { branchId, code, name: dto.name.trim(), category: dto.category ?? null, unit: dto.unit ?? null, isActive: dto.isActive ?? true },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_CHARGE_MASTER_CREATE", entity: "ChargeMasterItem", entityId: created.id, meta: dto });
    return created;
  }

  async listChargeMasterItems(principal: Principal, q: { branchId: string; q?: string }) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId, isActive: true };
    if (q.q) where.OR = [{ name: { contains: q.q, mode: "insensitive" } }, { code: { contains: q.q, mode: "insensitive" } }];
    return this.prisma.chargeMasterItem.findMany({ where, orderBy: [{ name: "asc" }] });
  }

  async createServiceItem(principal: Principal, dto: CreateServiceItemDto, branchIdParam: string) {
    const branchId = this.resolveBranchId(principal, branchIdParam ?? null);
    const code = canonicalizeCode(dto.code);

    const created = await this.prisma.serviceItem.create({
      data: {
        branchId,
        code,
        name: dto.name.trim(),
        category: dto.category.trim(),
        unit: dto.unit ?? null,
        isOrderable: dto.isOrderable ?? true,
        isActive: dto.isActive ?? true,
      },
    });

    // If no mapping, open Fix-It (as per your requirement)
    if (!dto.chargeMasterCode) {
      await this.prisma.fixItTask.create({
        data: {
          branchId,
          type: "SERVICE_CHARGE_MAPPING_MISSING" as any,
          status: "OPEN" as any,
          title: `Charge mapping missing for service ${created.code}`,
          details: { serviceItemId: created.id, serviceCode: created.code },
          serviceItemId: created.id,
        },
      });
    } else {
      const cm = await this.prisma.chargeMasterItem.findFirst({
        where: { branchId, code: canonicalizeCode(dto.chargeMasterCode), isActive: true },
        select: { id: true },
      });
      if (!cm) {
        // still create fix-it
        await this.prisma.fixItTask.create({
          data: {
            branchId,
            type: "SERVICE_CHARGE_MAPPING_MISSING" as any,
            status: "OPEN" as any,
            title: `Charge master code not found for service ${created.code}`,
            details: { serviceItemId: created.id, serviceCode: created.code, chargeMasterCode: dto.chargeMasterCode },
            serviceItemId: created.id,
          },
        });
      } else {
        await this.upsertServiceChargeMapping(principal, {
          serviceItemId: created.id,
          chargeMasterItemId: cm.id,
          effectiveFrom: new Date().toISOString(),
          effectiveTo: null,
        });
      }
    }

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_SERVICE_CREATE", entity: "ServiceItem", entityId: created.id, meta: dto });
    return created;
  }

  async listServiceItems(principal: Principal, q: { branchId: string; q?: string; includeInactive?: boolean }) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId };
    if (!q.includeInactive) where.isActive = true;
    if (q.q) where.OR = [{ name: { contains: q.q, mode: "insensitive" } }, { code: { contains: q.q, mode: "insensitive" } }];

    return this.prisma.serviceItem.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        mappings: { orderBy: [{ effectiveFrom: "desc" }], take: 3, include: { chargeMasterItem: true } },
      },
    });
  }

  async updateServiceItem(principal: Principal, id: string, dto: Partial<CreateServiceItemDto>) {
    const svc = await this.prisma.serviceItem.findUnique({ where: { id }, select: { id: true, branchId: true } });
    if (!svc) throw new NotFoundException("Service not found");
    const branchId = this.resolveBranchId(principal, svc.branchId);

    const updated = await this.prisma.serviceItem.update({
      where: { id },
      data: {
        code: dto.code ? canonicalizeCode(dto.code) : undefined,
        name: dto.name?.trim(),
        category: dto.category?.trim(),
        unit: dto.unit ?? undefined,
        isOrderable: dto.isOrderable ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_SERVICE_UPDATE", entity: "ServiceItem", entityId: id, meta: dto });
    return updated;
  }

  async upsertServiceChargeMapping(principal: Principal, dto: UpsertServiceChargeMappingDto) {
    const svc = await this.prisma.serviceItem.findUnique({
      where: { id: dto.serviceItemId },
      select: { id: true, branchId: true },
    });
    if (!svc) throw new BadRequestException("Invalid serviceItemId");

    const branchId = this.resolveBranchId(principal, svc.branchId);

    const cm = await this.prisma.chargeMasterItem.findFirst({
      where: { id: dto.chargeMasterItemId, branchId },
      select: { id: true },
    });
    if (!cm) throw new BadRequestException("Invalid chargeMasterItemId for this branch");

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    // version increment
    const last = await this.prisma.serviceChargeMapping.findFirst({
      where: { branchId, serviceItemId: dto.serviceItemId },
      orderBy: [{ version: "desc" }],
      select: { version: true },
    });
    const nextVersion = (last?.version ?? 0) + 1;

    // Ensure no overlapping mappings for this service
    const existingOverlap = await this.prisma.serviceChargeMapping.findFirst({
      where: {
        branchId,
        serviceItemId: dto.serviceItemId,
        effectiveFrom: { lt: effectiveTo ?? new Date("9999-12-31T00:00:00.000Z") },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
      },
      select: { id: true },
    });

    if (existingOverlap) {
      throw new BadRequestException("Overlapping service-charge mapping exists. Close existing effectiveTo before creating new mapping.");
    }

    const created = await this.prisma.serviceChargeMapping.create({
      data: {
        branchId,
        serviceItemId: dto.serviceItemId,
        chargeMasterItemId: dto.chargeMasterItemId,
        effectiveFrom,
        effectiveTo,
        version: 1,
      },
    });

    // Resolve fix-it tasks for this service if any
    await this.prisma.fixItTask.updateMany({
      where: {
        branchId,
        serviceItemId: dto.serviceItemId,
        type: "SERVICE_CHARGE_MAPPING_MISSING" as any,
        status: { in: ["OPEN", "IN_PROGRESS"] as any },
      },
      data: { status: "RESOLVED" as any, resolvedAt: new Date() },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_SERVICE_MAPPING_UPDATE", entity: "ServiceChargeMapping", entityId: created.id, meta: dto });
    return created;
  }

  async listFixIts(principal: Principal, q: { branchId: string; status?: string }) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId };
    if (q.status) where.status = q.status as any;

    return this.prisma.fixItTask.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: { serviceItem: true, assignedToUser: { select: { id: true, name: true, email: true } } },
    });
  }

  async updateFixIt(principal: Principal, id: string, dto: UpdateFixItDto) {
    const branchId = this.resolveBranchId(principal, null);

    const task = await this.prisma.fixItTask.findFirst({ where: { id, branchId }, select: { id: true } });
    if (!task) throw new NotFoundException("FixIt task not found");

    const updated = await this.prisma.fixItTask.update({
      where: { id },
      data: {
        status: dto.status as any,
        assignedToUserId: dto.assignedToUserId ?? undefined,
        resolvedAt: dto.status === "RESOLVED" ? new Date() : undefined,
      },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_FIXIT_UPDATE", entity: "FixItTask", entityId: id, meta: dto });
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Scheduling: STRICT at scheduling time (Consent/Anesthesia/Checklist)
  // ---------------------------------------------------------------------------

  private async enforcePrechecksStrict(branchId: string, dto: CreateProcedureBookingDto) {
    // Default strict per your instruction.
    // If you later relax via policy, PolicyEngine can return WARN modes.
    const payload = (await this.policyEngine.getPayload(INFRA_POLICY.PROCEDURE_PRECHECK, branchId, {
      scheduling: { consent: "BLOCK", anesthesia: "BLOCK", checklist: "BLOCK" },
    })) as ProcedurePrecheckPolicyPayload;

    const mode = payload?.scheduling ?? { consent: "BLOCK", anesthesia: "BLOCK", checklist: "BLOCK" };

    const violations: string[] = [];
    if ((mode.consent ?? "BLOCK") === "BLOCK" && !dto.consentOk) violations.push("Consent is required to schedule.");
    if ((mode.anesthesia ?? "BLOCK") === "BLOCK" && !dto.anesthesiaOk) violations.push("Anesthesia clearance is required to schedule.");
    if ((mode.checklist ?? "BLOCK") === "BLOCK" && !dto.checklistOk) violations.push("Checklist completion is required to schedule.");

    if (violations.length) throw new BadRequestException(violations.join(" "));
  }

  async listBookings(principal: Principal, q: { branchId: string; unitId?: string; resourceId?: string; from?: string; to?: string }) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId };
    if (q.unitId) where.unitId = q.unitId;
    if (q.resourceId) where.resourceId = q.resourceId;
    if (q.from || q.to) {
      where.startAt = { gte: q.from ? new Date(q.from) : undefined };
      where.endAt = { lte: q.to ? new Date(q.to) : undefined };
    }
    return this.prisma.procedureBooking.findMany({ where, orderBy: [{ startAt: "asc" }] });
  }

 async createBooking(principal: Principal, dto: CreateProcedureBookingDto) {
  // 1) Validate unit (and derive branchId in a GLOBAL-safe way)
  const unit = await this.prisma.unit.findUnique({
    where: { id: dto.unitId },
    select: { id: true, branchId: true, isActive: true },
  });
  if (!unit || !unit.isActive) throw new BadRequestException("Invalid unitId");

  const branchId = this.resolveBranchId(principal, unit.branchId);

  // 2) Pre-check blockers/warnings (you said defaults should be strict at scheduling time)
  await this.enforcePrechecksStrict(branchId, dto);

  // 3) Validate resource belongs to SAME branch + SAME unit, is active and schedulable
  const res = await this.prisma.unitResource.findFirst({
    where: {
      id: dto.resourceId,
      branchId,
      unitId: dto.unitId, // important: prevents scheduling a resource from another unit
      isActive: true,
      isSchedulable: true,
    },
    select: { id: true },
  });
  if (!res) throw new BadRequestException("Invalid resourceId (must be schedulable, active, and belong to the selected unit)");

  // 4) Validate time window
  const startAt = new Date(dto.startAt);
  const endAt = new Date(dto.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new BadRequestException("Invalid startAt/endAt");
  }
  if (!(startAt < endAt)) {
    throw new BadRequestException("Invalid time window (startAt must be before endAt)");
  }

  // 5) Conflict detection (strict)
  const conflict = await this.prisma.procedureBooking.findFirst({
    where: {
      branchId,
      resourceId: dto.resourceId,
      status: "SCHEDULED" as any,
      // overlap condition: existing.start < new.end && existing.end > new.start
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, startAt: true, endAt: true },
  });
  if (conflict) {
    throw new BadRequestException("Scheduling conflict detected for this resource.");
  }

  // 6) Create booking
  const booking = await this.prisma.procedureBooking.create({
    data: {
      branchId,
      unitId: dto.unitId,
      resourceId: dto.resourceId,
      patientId: dto.patientId ?? null,
      departmentId: dto.departmentId ?? null,
      startAt,
      endAt,
      status: "SCHEDULED" as any,

      // strict defaults: treat undefined as false
      consentOk: !!dto.consentOk,
      anesthesiaOk: !!dto.anesthesiaOk,
      checklistOk: !!dto.checklistOk,

      createdByUserId: principal.userId,
    },
  });

  await this.audit.log({
    branchId,
    actorUserId: principal.userId,
    action: "INFRA_SCHED_CREATE",
    entity: "ProcedureBooking",
    entityId: booking.id,
    meta: {
      unitId: dto.unitId,
      resourceId: dto.resourceId,
      startAt: dto.startAt,
      endAt: dto.endAt,
      patientId: dto.patientId ?? null,
      departmentId: dto.departmentId ?? null,
      consentOk: !!dto.consentOk,
      anesthesiaOk: !!dto.anesthesiaOk,
      checklistOk: !!dto.checklistOk,
    },
  });

  return booking;
}


  async cancelBooking(principal: Principal, id: string, reason: string) {
    const bookingAny = await this.prisma.procedureBooking.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true },
    });
    if (!bookingAny) throw new NotFoundException("Booking not found");

    const branchId = this.resolveBranchId(principal, bookingAny.branchId);


    const booking = await this.prisma.procedureBooking.findFirst({ where: { id, branchId }, select: { id: true, status: true } });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.status !== ("SCHEDULED" as any)) throw new BadRequestException("Only SCHEDULED bookings can be cancelled");

    const updated = await this.prisma.procedureBooking.update({
      where: { id },
      data: { status: "CANCELLED" as any },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_SCHED_CANCEL", entity: "ProcedureBooking", entityId: id, meta: { reason } });
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Imports (validate + commit): backend validates; UI parses CSV/XLS to JSON rows.
  // ---------------------------------------------------------------------------

  async validateImport(principal: Principal, dto: ValidateImportDto, branchIdParam: string) {
    const branchId = this.resolveBranchId(principal, branchIdParam ?? null);

    const rows = Array.isArray(dto.rows) ? dto.rows : [];
    if (!rows.length) throw new BadRequestException("No rows provided");

    const errors: Array<{ row: number; field?: string; message: string }> = [];

    // Minimal validation per entity type (expand as UI matures)
    if (dto.entityType === "LOCATIONS") {
      rows.forEach((r, idx) => {
        try {
          if (!r.kind || !r.code || !r.name) throw new Error("kind, code, name required");
          // parent is optional; contextual validation done on commit (since parent may be created in same file)
          assertLocationCode(r.kind, canonicalizeCode(r.code), r.parentCode ? canonicalizeCode(r.parentCode) : undefined);
        } catch (e: any) {
          errors.push({ row: idx + 1, message: e?.message ?? "Invalid row" });
        }
      });
    }

    if (dto.entityType === "UNITS") {
      rows.forEach((r, idx) => {
        try {
          if (!r.departmentId || !r.unitTypeId || !r.code || !r.name) throw new Error("departmentId, unitTypeId, code, name required");
          assertUnitCode(r.code);
        } catch (e: any) {
          errors.push({ row: idx + 1, message: e?.message ?? "Invalid row" });
        }
      });
    }

    const validRows = rows.length - errors.length;

    const job = await this.prisma.bulkImportJob.create({
      data: {
        branchId,
        entityType: dto.entityType,
        status: "VALIDATED" as any,
        fileName: dto.fileName ?? null,
        payload: rows,
        errors,
        totalRows: rows.length,
        validRows,
        invalidRows: errors.length,
        createdByUserId: principal.userId,
      },
    });

    await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_IMPORT_VALIDATE", entity: "BulkImportJob", entityId: job.id, meta: { entityType: dto.entityType, totalRows: rows.length, errors: errors.length } });

    return { jobId: job.id, totalRows: rows.length, validRows, invalidRows: errors.length, errors };
  }

  async commitImport(principal: Principal, jobId: string) {
  const jobAny = await this.prisma.bulkImportJob.findUnique({
    where: { id: jobId },
    select: { id: true, branchId: true, status: true, entityType: true, payload: true, errors: true },
  });
  if (!jobAny) throw new NotFoundException("Import job not found");

  const branchId = this.resolveBranchId(principal, jobAny.branchId);

  if (jobAny.status !== ("VALIDATED" as any)) {
    throw new BadRequestException("Import job must be VALIDATED before COMMIT");
  }

  const rows = (jobAny.payload as any[]) || [];
  const errors = (jobAny.errors as any[]) || [];
  if (errors.length) throw new BadRequestException("Fix validation errors before committing");

  const entityType = jobAny.entityType as any;

  await this.prisma.$transaction(async (tx) => {
    if (entityType === "UNITS") {
      for (const r of rows) {
        await tx.unit.create({
          data: {
            branchId,
            departmentId: r.departmentId,
            unitTypeId: r.unitTypeId,
            code: assertUnitCode(r.code),
            name: String(r.name).trim(),
            usesRooms: r.usesRooms ?? true,
            isActive: r.isActive ?? true,
          },
        });
      }
    } else if (entityType === "CHARGE_MASTER") {
      for (const r of rows) {
        await tx.chargeMasterItem.upsert({
          where: { branchId_code: { branchId, code: canonicalizeCode(r.code) } } as any,
          update: {
            name: String(r.name).trim(),
            category: r.category ?? null,
            unit: r.unit ?? null,
            isActive: r.isActive ?? true,
          },
          create: {
            branchId,
            code: canonicalizeCode(r.code),
            name: String(r.name).trim(),
            category: r.category ?? null,
            unit: r.unit ?? null,
            isActive: r.isActive ?? true,
          },
        });
      }
    } else {
      throw new BadRequestException(`Unsupported import entityType: ${entityType}`);
    }

    await tx.bulkImportJob.update({
      where: { id: jobId },
      data: { status: "COMMITTED" as any, committedAt: new Date() },
    });
  });

  await this.audit.log({
    branchId,
    actorUserId: principal.userId,
    action: "INFRA_IMPORT_COMMIT",
    entity: "BulkImportJob",
    entityId: jobId,
    meta: { jobId, entityType },
  });

  return { jobId, status: "COMMITTED" };
}


  // ---------------------------------------------------------------------------
  // Go-Live Validator (preview + snapshot)
  // ---------------------------------------------------------------------------

  async runGoLive(principal: Principal, dto: RunGoLiveDto, branchIdParam: string) {
    const branchId = this.resolveBranchId(principal, branchIdParam ?? null);

    const [
      enabledUnitTypes,
      units,
      rooms,
      resources,
      beds,
      schedulableOts,
      equipmentCount,
      fixItsOpen,
    ] = await Promise.all([
      this.prisma.branchUnitType.count({ where: { branchId, isEnabled: true } }),
      this.prisma.unit.count({ where: { branchId, isActive: true } }),
      this.prisma.unitRoom.count({ where: { branchId, isActive: true } }),
      this.prisma.unitResource.count({ where: { branchId, isActive: true } }),
      this.prisma.unitResource.count({ where: { branchId, isActive: true, resourceType: "BED" as any } }),
      this.prisma.unitResource.count({ where: { branchId, isActive: true, resourceType: "OT_TABLE" as any, isSchedulable: true } }),
      this.prisma.equipmentAsset.count({ where: { branchId } }),
      this.prisma.fixItTask.count({ where: { branchId, status: { in: ["OPEN", "IN_PROGRESS"] as any } } }),
    ]);

    const blockers: string[] = [];
    const warnings: string[] = [];

    if (enabledUnitTypes === 0) blockers.push("No unit types enabled for this branch.");
    if (units === 0) blockers.push("No units created.");
    if (beds === 0) blockers.push("No beds (UnitResourceType=BED) created.");
    if (schedulableOts === 0) blockers.push("No schedulable OT tables configured (required for OT scheduling).");

    if (rooms === 0) warnings.push("No rooms configured. If your branch uses open bays only, you can ignore this warning.");
    if (equipmentCount === 0) warnings.push("No equipment assets registered yet.");
    if (fixItsOpen > 0) warnings.push(`${fixItsOpen} Fix-It tasks are pending (service-to-charge mapping).`);

    const score =
      (enabledUnitTypes > 0 ? 15 : 0) +
      (units > 0 ? 20 : 0) +
      (beds > 0 ? 20 : 0) +
      (schedulableOts > 0 ? 20 : 0) +
      (equipmentCount > 0 ? 10 : 0) +
      (fixItsOpen === 0 ? 15 : 0);

    const snapshot = {
      enabledUnitTypes,
      units,
      rooms,
      resources,
      beds,
      schedulableOts,
      equipmentCount,
      fixItsOpen,
      generatedAt: new Date().toISOString(),
    };

    const out = { branchId, score, blockers, warnings, snapshot };

    if (dto.persist !== false) {
      const report = await this.prisma.goLiveReport.create({
        data: {
          branchId,
          score,
          blockers,
          warnings,
          snapshot,
          createdByUserId: principal.userId,
        },
      });

      await this.audit.log({ branchId, actorUserId: principal.userId, action: "INFRA_GOLIVE_RUN", entity: "GoLiveReport", entityId: report.id, meta: out });
      return { ...out, reportId: report.id };
    }

    return out;
  }


}
