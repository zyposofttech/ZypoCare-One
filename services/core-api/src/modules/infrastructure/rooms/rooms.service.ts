import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import type { CreateUnitRoomDto, UpdateUnitRoomDto } from "./dto";
import { assertValidRoomCode } from "./room-code";

const PATIENT_ROOM_TYPES = new Set(["PATIENT_ROOM", "ISOLATION", "NEGATIVE_PRESSURE", "POSITIVE_PRESSURE"]);
const ISOLATION_ROOM_TYPES = new Set(["ISOLATION", "NEGATIVE_PRESSURE", "POSITIVE_PRESSURE"]);
const MAINT_NONOP = new Set(["UNDER_MAINTENANCE", "CLEANING_IN_PROGRESS", "BLOCKED", "OUT_OF_SERVICE"]);

function normalizeRoomNumber(input: unknown): string {
  return String(input ?? "").trim().toUpperCase();
}

function assertValidRoomNumber(input: unknown): string {
  const v = normalizeRoomNumber(input);
  if (!v) throw new BadRequestException("Room number is required.");
  if (v.length < 1 || v.length > 32) throw new BadRequestException("Room number must be 1–32 characters.");
  if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(v)) {
    throw new BadRequestException(
      `Invalid Room number "${v}". Allowed: A–Z, 0–9, underscore (_) and hyphen (-).`,
    );
  }
  return v;
}

function parseIsoDateOrThrow(value: unknown, field: string): Date | undefined {
  if (value == null || value === "") return undefined;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid ${field}. Must be ISO datetime string.`);
  return d;
}

function roomRulesForUnitType(unitTypeCode: string | null | undefined): { allowed: Set<string> | null; defaultType: string } {
  const c = String(unitTypeCode ?? "").trim().toUpperCase();

  if (c.startsWith("RAD_")) {
    return {
      allowed: new Set(["EXAMINATION", "PROCEDURE", "WAITING", "UTILITY", "STORAGE", "NURSING_STATION"]),
      defaultType: "EXAMINATION",
    };
  }

  switch (c) {
    case "OPD":
      return {
        allowed: new Set(["CONSULTATION", "EXAMINATION", "PROCEDURE", "WAITING", "NURSING_STATION", "UTILITY", "STORAGE"]),
        defaultType: "CONSULTATION",
      };
    case "ER":
      return {
        allowed: new Set(["CONSULTATION", "EXAMINATION", "PROCEDURE", "WAITING", "NURSING_STATION", "UTILITY", "STORAGE"]),
        defaultType: "EXAMINATION",
      };
    case "TRIAGE":
      return { allowed: new Set(["EXAMINATION", "WAITING", "NURSING_STATION", "UTILITY"]), defaultType: "EXAMINATION" };

    case "OT":
    case "ENDO":
    case "CATH_LAB":
      return { allowed: new Set(["PROCEDURE", "RECOVERY", "UTILITY", "STORAGE"]), defaultType: "PROCEDURE" };

    case "DIALYSIS":
    case "DAYCARE":
    case "CHEMO":
      return {
        allowed: new Set(["PROCEDURE", "EXAMINATION", "PATIENT_ROOM", "RECOVERY", "WAITING", "NURSING_STATION", "UTILITY", "STORAGE"]),
        defaultType: "PROCEDURE",
      };

    case "IPD_GEN":
    case "IPD_SEMI":
    case "IPD_PVT":
      return {
        allowed: new Set([
          "PATIENT_ROOM",
          "ISOLATION",
          "NEGATIVE_PRESSURE",
          "POSITIVE_PRESSURE",
          "NURSING_STATION",
          "UTILITY",
          "STORAGE",
        ]),
        defaultType: "PATIENT_ROOM",
      };

    case "ICU":
    case "ICCU":
    case "HDU":
    case "NICU":
    case "PICU":
      return {
        allowed: new Set([
          "PATIENT_ROOM",
          "ISOLATION",
          "NEGATIVE_PRESSURE",
          "POSITIVE_PRESSURE",
          "NURSING_STATION",
          "UTILITY",
          "STORAGE",
        ]),
        defaultType: "PATIENT_ROOM",
      };

    case "LABOR":
    case "NURSERY":
      return {
        allowed: new Set(["PATIENT_ROOM", "PROCEDURE", "EXAMINATION", "RECOVERY", "NURSING_STATION", "UTILITY", "STORAGE"]),
        defaultType: "PATIENT_ROOM",
      };

    case "LAB":
      return { allowed: new Set(["EXAMINATION", "PROCEDURE", "UTILITY", "STORAGE"]), defaultType: "EXAMINATION" };

    case "PHYSIO":
      return { allowed: new Set(["EXAMINATION", "PROCEDURE", "WAITING", "RECOVERY", "UTILITY", "STORAGE"]), defaultType: "EXAMINATION" };

    case "MORTUARY":
      return { allowed: new Set(["PROCEDURE", "STORAGE", "UTILITY"]), defaultType: "PROCEDURE" };

    default:
      return { allowed: null, defaultType: "CONSULTATION" };
  }
}

function assertRoomTypeAllowed(unitTypeCode: string | null | undefined, roomType: string) {
  const rules = roomRulesForUnitType(unitTypeCode);
  if (rules.allowed && !rules.allowed.has(roomType)) {
    throw new BadRequestException(
      `Room type '${roomType}' is not allowed for unit type '${String(unitTypeCode ?? "UNKNOWN")}'.`,
    );
  }
}

function computeWarnings(input: {
  roomType?: string | null;
  pricingTier?: string | null;
  hasAttachedBathroom?: boolean;
  hasAC?: boolean;
  hasTV?: boolean;
  hasOxygen?: boolean;
  hasSuction?: boolean;
  hasVentilator?: boolean;
  isIsolation?: boolean;
  isolationType?: string | null;
  maxOccupancy?: number | null;
  currentOccupancy?: number | null;
  maintenanceStatus?: string | null;
  isAvailable?: boolean | null;
}): string[] {
  const warnings: string[] = [];
  const rt = String(input.roomType ?? "").toUpperCase();

  if (typeof input.maxOccupancy === "number" && input.maxOccupancy >= 4) {
    warnings.push("High max occupancy set; ensure room areaSqFt and amenities are appropriate (warning).");
  }

  if (typeof input.currentOccupancy === "number" && typeof input.maxOccupancy === "number") {
    if (input.currentOccupancy > input.maxOccupancy) warnings.push("Current occupancy exceeds max occupancy (warning).");
  }

  const tier = String(input.pricingTier ?? "").toUpperCase();
  if (tier === "VIP" || tier === "SUITE") {
    if (!input.hasAC) warnings.push("VIP/SUITE rooms should have AC (warning).");
    if (!input.hasTV) warnings.push("VIP/SUITE rooms should have TV (warning).");
    if (!input.hasAttachedBathroom) warnings.push("VIP/SUITE rooms should have attached bathroom (warning).");
  }

  const iso = !!input.isIsolation || ISOLATION_ROOM_TYPES.has(rt);
  if (iso) {
    if (!input.hasAttachedBathroom) warnings.push("Isolation rooms should have attached bathroom (warning).");
    if (!input.isolationType) warnings.push("Isolation is enabled but isolationType is not set (warning).");
  }

  if (input.hasVentilator && !input.hasOxygen) {
    warnings.push("Ventilator enabled but oxygen is off (warning).");
  }

  const ms = String(input.maintenanceStatus ?? "").toUpperCase();
  if (MAINT_NONOP.has(ms) && input.isAvailable) {
    warnings.push("Room marked available but maintenanceStatus is not OPERATIONAL (warning).");
  }

  return warnings;
}

@Injectable()
export class RoomsService {
  constructor(private readonly ctx: InfraContextService) {}

  async listRooms(
    principal: Principal,
    q: { branchId?: string | null; unitId?: string | null; includeInactive?: boolean },
  ) {
    let branchId = q.branchId ?? null;

    if (!branchId && q.unitId) {
      const unit = await this.ctx.prisma.unit.findUnique({
        where: { id: q.unitId },
        select: { id: true, branchId: true },
      });
      if (!unit) throw new NotFoundException("Unit not found");
      branchId = unit.branchId;
    }

    const resolvedBranchId = this.ctx.resolveBranchId(principal, branchId);

    const where: any = { branchId: resolvedBranchId };
    if (q.unitId) where.unitId = q.unitId;
    if (!q.includeInactive) where.isActive = true;

    return this.ctx.prisma.unitRoom.findMany({
      where,
      orderBy: [{ unitId: "asc" }, { code: "asc" }],
      include: {
        unit: {
          select: {
            id: true,
            code: true,
            name: true,
            usesRooms: true,
            isActive: true,
            unitType: { select: { code: true } },
          },
        },
      },
    });
  }

  async createRoom(principal: Principal, dto: CreateUnitRoomDto) {
    const unit = await this.ctx.prisma.unit.findUnique({
      where: { id: dto.unitId },
      select: {
        id: true,
        branchId: true,
        code: true,
        usesRooms: true,
        isActive: true,
        unitType: { select: { code: true } },
      },
    });
    if (!unit) throw new NotFoundException("Unit not found");
    if (!unit.isActive) throw new BadRequestException("Unit is inactive");

    const branchId = this.ctx.resolveBranchId(principal, unit.branchId);

    if (!unit.usesRooms) {
      throw new BadRequestException("This unit is configured as open-bay (usesRooms=false). Rooms are not allowed.");
    }

    const name = String(dto.name ?? "").trim();
    if (!name) throw new BadRequestException("Room name is required.");

    const code = assertValidRoomCode(dto.code);
    const roomNumber = assertValidRoomNumber(dto.roomNumber);

    const exists = await this.ctx.prisma.unitRoom.findFirst({
      where: { branchId, unitId: dto.unitId, code },
      select: { id: true },
    });
    if (exists) throw new ConflictException(`Room code "${code}" already exists in this unit.`);

    const rnExists = await this.ctx.prisma.unitRoom.findFirst({
      where: { branchId, unitId: dto.unitId, roomNumber },
      select: { id: true },
    });
    if (rnExists) throw new ConflictException(`Room number "${roomNumber}" already exists in this unit.`);

    const rules = roomRulesForUnitType(unit.unitType?.code);
    const roomType = String(dto.roomType ?? rules.defaultType).trim().toUpperCase();
    assertRoomTypeAllowed(unit.unitType?.code, roomType);

    const pricingTier = dto.pricingTier != null ? String(dto.pricingTier).trim().toUpperCase() : null;
    if (PATIENT_ROOM_TYPES.has(roomType) && !pricingTier) {
      throw new BadRequestException("Pricing tier is required for patient rooms / isolation rooms.");
    }

    const maxOccupancy = dto.maxOccupancy ?? 1;
    const currentOccupancy = dto.currentOccupancy ?? 0;
    if (currentOccupancy < 0) throw new BadRequestException("currentOccupancy cannot be negative.");
    if (currentOccupancy > maxOccupancy) {
      throw new BadRequestException("currentOccupancy cannot exceed maxOccupancy.");
    }

    const maintenanceStatus = String(dto.maintenanceStatus ?? "OPERATIONAL").trim().toUpperCase();
    const isAvailable = dto.isAvailable ?? !MAINT_NONOP.has(maintenanceStatus);

    const impliedIsolation = ISOLATION_ROOM_TYPES.has(roomType);
    const isIsolation = dto.isIsolation ?? impliedIsolation;
    const isolationType = dto.isolationType != null ? String(dto.isolationType).trim().toUpperCase() : null;
    if (isIsolation && !isolationType) {
      throw new BadRequestException("isolationType is required when isIsolation=true.");
    }

    const lastCleanedAt = parseIsoDateOrThrow(dto.lastCleanedAt, "lastCleanedAt");

    const warnings = computeWarnings({
      roomType,
      pricingTier,
      hasAttachedBathroom: dto.hasAttachedBathroom,
      hasAC: dto.hasAC,
      hasTV: dto.hasTV,
      hasOxygen: dto.hasOxygen,
      hasSuction: dto.hasSuction,
      hasVentilator: dto.hasVentilator,
      isIsolation,
      isolationType,
      maxOccupancy,
      currentOccupancy,
      maintenanceStatus,
      isAvailable,
    });

    const created = await this.ctx.prisma.unitRoom.create({
      data: {
        branchId,
        unitId: dto.unitId,
        code,
        roomNumber,
        name,
        isActive: dto.isActive ?? true,

        roomType: roomType as any,
        ...(dto.areaSqFt !== undefined ? { areaSqFt: dto.areaSqFt } : {}),

        hasAttachedBathroom: dto.hasAttachedBathroom ?? false,
        hasAC: dto.hasAC ?? false,
        hasTV: dto.hasTV ?? false,
        hasOxygen: dto.hasOxygen ?? false,
        hasSuction: dto.hasSuction ?? false,
        hasVentilator: dto.hasVentilator ?? false,
        hasMonitor: dto.hasMonitor ?? false,
        hasCallButton: dto.hasCallButton ?? false,

        maxOccupancy,
        currentOccupancy,

        ...(dto.pricingTier !== undefined ? { pricingTier: dto.pricingTier as any } : {}),
        ...(dto.baseChargePerDay !== undefined ? { baseChargePerDay: dto.baseChargePerDay as any } : {}),

        isIsolation,
        ...(isolationType ? { isolationType: isolationType as any } : {}),

        isAvailable,
        maintenanceStatus: maintenanceStatus as any,
        ...(lastCleanedAt ? { lastCleanedAt } : {}),
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_ROOM_CREATE",
      entity: "UnitRoom",
      entityId: created.id,
      meta: { ...dto, code, roomNumber, name, enforcedRoomType: roomType, warnings },
    });

    return { ...created, warnings };
  }

  async updateRoom(principal: Principal, id: string, dto: UpdateUnitRoomDto) {
    const room = await this.ctx.prisma.unitRoom.findUnique({
      where: { id },
      include: {
        unit: { select: { id: true, branchId: true, isActive: true, usesRooms: true, unitType: { select: { code: true } } } },
      },
    });
    if (!room) throw new NotFoundException("Room not found");

    const branchId = this.ctx.resolveBranchId(principal, room.branchId);

    let nextCode: string | undefined;
    if (dto.code !== undefined) {
      nextCode = assertValidRoomCode(dto.code);

      const exists = await this.ctx.prisma.unitRoom.findFirst({
        where: { branchId, unitId: room.unitId, code: nextCode, id: { not: room.id } },
        select: { id: true },
      });
      if (exists) throw new ConflictException(`Room code "${nextCode}" already exists in this unit.`);
    }

    let nextRoomNumber: string | undefined;
    if (dto.roomNumber !== undefined) {
      nextRoomNumber = assertValidRoomNumber(dto.roomNumber);

      const exists = await this.ctx.prisma.unitRoom.findFirst({
        where: { branchId, unitId: room.unitId, roomNumber: nextRoomNumber, id: { not: room.id } },
        select: { id: true },
      });
      if (exists) throw new ConflictException(`Room number "${nextRoomNumber}" already exists in this unit.`);
    }

    const rules = roomRulesForUnitType(room.unit?.unitType?.code);
    const requestedRoomType =
      dto.roomType === null
        ? null
        : dto.roomType !== undefined
          ? String(dto.roomType ?? "").trim().toUpperCase()
          : null;

    const nextRoomType = requestedRoomType ?? (room.roomType ? String(room.roomType).toUpperCase() : rules.defaultType);
    assertRoomTypeAllowed(room.unit?.unitType?.code, nextRoomType);

    const nextPricingTier =
      dto.pricingTier === undefined
        ? room.pricingTier
          ? String(room.pricingTier).toUpperCase()
          : null
        : dto.pricingTier === null
          ? null
          : String(dto.pricingTier).toUpperCase();

    if (PATIENT_ROOM_TYPES.has(nextRoomType) && !nextPricingTier) {
      throw new BadRequestException("Pricing tier is required for patient rooms / isolation rooms.");
    }

    if (dto.isActive === false) {
      throw new BadRequestException("Use POST /infra/rooms/:id/deactivate (or DELETE with reason) to deactivate a room.");
    }

    const nextMaxOcc = dto.maxOccupancy ?? room.maxOccupancy ?? 1;
    const nextCurOcc = dto.currentOccupancy ?? (room as any).currentOccupancy ?? 0;
    if (nextCurOcc < 0) throw new BadRequestException("currentOccupancy cannot be negative.");
    if (nextCurOcc > nextMaxOcc) throw new BadRequestException("currentOccupancy cannot exceed maxOccupancy.");

    const nextMaintenanceStatus =
      dto.maintenanceStatus === undefined
        ? String((room as any).maintenanceStatus ?? "OPERATIONAL").toUpperCase()
        : String(dto.maintenanceStatus ?? "OPERATIONAL").toUpperCase();

    const nextIsAvailable =
      dto.isAvailable === undefined
        ? ((room as any).isAvailable ?? true)
        : !!dto.isAvailable;

    const impliedIsolation = ISOLATION_ROOM_TYPES.has(nextRoomType);
    const nextIsIsolation =
      dto.isIsolation === undefined ? (((room as any).isIsolation ?? false) || impliedIsolation) : !!dto.isIsolation;

    const nextIsolationType =
      dto.isolationType === undefined
        ? ((room as any).isolationType ? String((room as any).isolationType).toUpperCase() : null)
        : dto.isolationType === null
          ? null
          : String(dto.isolationType).toUpperCase();

    if (nextIsIsolation && !nextIsolationType) {
      throw new BadRequestException("isolationType is required when isIsolation=true.");
    }

    const nextLastCleanedAt =
      dto.lastCleanedAt === undefined
        ? undefined
        : dto.lastCleanedAt === null
          ? null
          : parseIsoDateOrThrow(dto.lastCleanedAt, "lastCleanedAt") ?? null;

    const warnings = computeWarnings({
      roomType: nextRoomType,
      pricingTier: nextPricingTier,
      hasAttachedBathroom: dto.hasAttachedBathroom ?? room.hasAttachedBathroom,
      hasAC: dto.hasAC ?? room.hasAC,
      hasTV: dto.hasTV ?? room.hasTV,
      hasOxygen: dto.hasOxygen ?? room.hasOxygen,
      hasSuction: dto.hasSuction ?? room.hasSuction,
      hasVentilator: dto.hasVentilator ?? (room as any).hasVentilator,
      isIsolation: nextIsIsolation,
      isolationType: nextIsolationType,
      maxOccupancy: nextMaxOcc,
      currentOccupancy: nextCurOcc,
      maintenanceStatus: nextMaintenanceStatus,
      isAvailable: nextIsAvailable,
    });

    const activating = dto.isActive === true && room.isActive === false;

    const updated = await this.ctx.prisma.unitRoom.update({
      where: { id },
      data: {
        ...(nextCode !== undefined ? { code: nextCode } : {}),
        ...(nextRoomNumber !== undefined ? { roomNumber: nextRoomNumber } : {}),
        ...(dto.name !== undefined ? { name: String(dto.name ?? "").trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),

        ...(dto.roomType !== undefined ? { roomType: dto.roomType === null ? null : (nextRoomType as any) } : {}),
        ...(dto.areaSqFt !== undefined ? { areaSqFt: dto.areaSqFt as any } : {}),

        ...(dto.hasAttachedBathroom !== undefined ? { hasAttachedBathroom: dto.hasAttachedBathroom } : {}),
        ...(dto.hasAC !== undefined ? { hasAC: dto.hasAC } : {}),
        ...(dto.hasTV !== undefined ? { hasTV: dto.hasTV } : {}),
        ...(dto.hasOxygen !== undefined ? { hasOxygen: dto.hasOxygen } : {}),
        ...(dto.hasSuction !== undefined ? { hasSuction: dto.hasSuction } : {}),
        ...(dto.hasVentilator !== undefined ? { hasVentilator: dto.hasVentilator } : {}),
        ...(dto.hasMonitor !== undefined ? { hasMonitor: dto.hasMonitor } : {}),
        ...(dto.hasCallButton !== undefined ? { hasCallButton: dto.hasCallButton } : {}),

        ...(dto.maxOccupancy !== undefined ? { maxOccupancy: dto.maxOccupancy } : {}),
        ...(dto.currentOccupancy !== undefined ? { currentOccupancy: dto.currentOccupancy } : {}),

        ...(dto.pricingTier !== undefined ? { pricingTier: dto.pricingTier as any } : {}),
        ...(dto.baseChargePerDay !== undefined ? { baseChargePerDay: dto.baseChargePerDay as any } : {}),

        ...(dto.isIsolation !== undefined ? { isIsolation: dto.isIsolation } : {}),
        ...(dto.isolationType !== undefined ? { isolationType: dto.isolationType as any } : {}),

        ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
        ...(dto.maintenanceStatus !== undefined ? { maintenanceStatus: dto.maintenanceStatus as any } : {}),
        ...(dto.lastCleanedAt !== undefined ? { lastCleanedAt: nextLastCleanedAt as any } : {}),

        ...(activating
          ? {
              deactivatedAt: null,
              deactivationReason: null,
              deactivatedByUserId: null,
              maintenanceStatus: "OPERATIONAL" as any,
              isAvailable: true,
            }
          : {}),
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_ROOM_UPDATE",
      entity: "UnitRoom",
      entityId: id,
      meta: { ...dto, ...(nextCode ? { code: nextCode } : {}), ...(nextRoomNumber ? { roomNumber: nextRoomNumber } : {}), enforcedRoomType: nextRoomType, warnings },
    });

    return { ...updated, warnings };
  }

  async deactivateRoom(
    principal: Principal,
    roomId: string,
    opts: { hard?: boolean; cascade?: boolean; reason?: string } = {},
  ) {
    const room = await this.ctx.prisma.unitRoom.findUnique({
      where: { id: roomId },
      select: { id: true, branchId: true, unitId: true, isActive: true },
    });
    if (!room) throw new NotFoundException("Room not found");

    const branchId = this.ctx.resolveBranchId(principal, room.branchId);

    const hard = !!opts.hard;
    const cascade = opts.cascade !== false;

    if (hard) {
      const resCount = await this.ctx.prisma.unitResource.count({ where: { roomId } });
      if (resCount) {
        throw new ConflictException(
          `Cannot hard delete room: ${resCount} resources exist. Deactivate (soft) or remove dependencies first.`,
        );
      }

      await this.ctx.prisma.unitRoom.delete({ where: { id: roomId } });

      await this.ctx.audit.log({
        branchId,
        actorUserId: principal.userId,
        action: "ROOM_DELETE_HARD",
        entity: "UnitRoom",
        entityId: room.id,
        meta: { hard: true },
      });

      return { ok: true, hardDeleted: true };
    }

    const reason = String(opts.reason ?? "").trim();
    if (!reason) throw new BadRequestException("Deactivation reason is required.");

    const resources = await this.ctx.prisma.unitResource.findMany({
      where: { roomId, isActive: true },
      select: { id: true, state: true },
    });

    const busy = resources.filter(
      (r) => String(r.state).toUpperCase() === "RESERVED" || String(r.state).toUpperCase() === "OCCUPIED",
    );
    if (busy.length) {
      throw new ConflictException(`Cannot deactivate room: ${busy.length} resource(s) are RESERVED/OCCUPIED in this room.`);
    }

    const resourceIds = resources.map((r) => r.id);
    if (resourceIds.length) {
      const now = new Date();
      const scheduled = await this.ctx.prisma.procedureBooking.count({
        where: {
          resourceId: { in: resourceIds },
          status: "SCHEDULED",
          endAt: { gt: now },
        },
      });
      if (scheduled > 0) {
        throw new ConflictException(
          `Cannot deactivate room: ${scheduled} scheduled procedure booking(s) exist for resources in this room.`,
        );
      }
    }

    const updated = await this.ctx.prisma.unitRoom.update({
      where: { id: roomId },
      data: {
        isActive: false,
        isAvailable: false,
        maintenanceStatus: "OUT_OF_SERVICE" as any,
        deactivatedAt: new Date(),
        deactivationReason: reason,
        deactivatedByUserId: principal.userId,
      },
      select: { id: true, branchId: true, isActive: true, code: true, name: true, unitId: true },
    });

    if (cascade) {
      await this.ctx.prisma.unitResource.updateMany({
        where: { roomId },
        data: {
          isActive: false,
          state: "INACTIVE",
          reservedReason: null,
          blockedReason: null,
        },
      });
    }

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "ROOM_DEACTIVATE",
      entity: "UnitRoom",
      entityId: updated.id,
      meta: { hard: false, cascade, reason },
    });

    return updated;
  }
  async getRoom(principal: Principal, id: string) {
  const room = await this.ctx.prisma.unitRoom.findUnique({
    where: { id },
    include: { unit: { select: { id: true, code: true, name: true } } },
  });
  if (!room) throw new NotFoundException("Room not found");
  this.ctx.resolveBranchId(principal, room.branchId);
  return room;
}

}
